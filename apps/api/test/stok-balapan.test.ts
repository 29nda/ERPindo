import { DatabaseSync } from "node:sqlite";
import { applyMigrations, TENANT_MIGRATIONS } from "@erpindo/db";
import { describe, expect, it } from "vitest";
import { InsufficientStockError, stockIn, stockOut } from "../src/lib/accounting";
import { wrapSqlite, wrapSqliteLambat } from "./helpers/memdb";

/**
 * Stok tidak boleh bisa menembus angka MINUS (Fase 29a).
 *
 * `stockOut()` memeriksa lalu mengurangi dalam dua langkah terpisah:
 *
 *     SELECT qty FROM stock_levels …        → tersedia 1
 *     if (level.qty < input.qty) throw      → lolos
 *     UPDATE stock_levels SET qty = qty - ? → tanpa syarat apa pun
 *
 * Dua permintaan yang datang bersamaan atas barang TERAKHIR sama-sama lolos
 * pemeriksaan, lalu sama-sama mengurangi. Bukan skenario langka: kasir yang
 * menjual barang terakhir bersamaan dengan admin yang membuat faktur sudah
 * cukup.
 *
 * Akibatnya senyap dan berlipat. Stok tercatat minus, NILAI PERSEDIAAN di
 * neraca ikut salah, dan HPP dihitung dari `avg_cost` yang sudah basi — jadi
 * laba kotornya pun meleset. Tidak ada satu pun layar yang menyalak.
 *
 * Uji ini memakai `wrapSqliteLambat()` (Fase 26c), bukan harness biasa.
 * `node:sqlite` bersifat sinkron: tanpa penundaan di tiap operasi, dua
 * permintaan "bersamaan" tetap berjalan berurutan dan uji balapan LULUS untuk
 * kode yang sebenarnya rusak.
 */

/** Database tenant nyata di memori — skema dari migrasi produksi. */
async function buatDb() {
  const raw = new DatabaseSync(":memory:");
  await applyMigrations(wrapSqlite(raw), TENANT_MIGRATIONS);
  return raw;
}

async function siapkanStok(raw: DatabaseSync, qty: number) {
  const db = wrapSqlite(raw);
  await db
    .prepare(`INSERT INTO products (id, sku, name, sell_price, buy_price) VALUES (?, ?, ?, ?, ?)`)
    .bind("p-1", "BRG-1", "Barang Terakhir", 100_000, 60_000)
    .run();
  await stockIn(db, {
    productId: "p-1",
    warehouseId: "wh-utama",
    qty,
    unitCost: 60_000,
    refType: "purchase",
    refId: "seed",
  });
}

function sisaStok(raw: DatabaseSync): number {
  return (raw.prepare(`SELECT qty FROM stock_levels WHERE product_id = 'p-1'`).get() as { qty: number }).qty;
}

describe("balapan stok", () => {
  it("dua penjualan bersamaan atas barang TERAKHIR: hanya satu yang boleh lolos", async () => {
    const raw = await buatDb();
    await siapkanStok(raw, 1);

    // Lambat = tiap operasi menyerahkan kendali, sehingga keduanya benar-benar
    // berselang-seling seperti dua permintaan HTTP di D1.
    const db = wrapSqliteLambat(raw);
    const jual = (ref: string) =>
      stockOut(db, { productId: "p-1", warehouseId: "wh-utama", qty: 1, refType: "sale", refId: ref });

    const hasil = await Promise.allSettled([jual("inv-A"), jual("inv-B")]);
    const sukses = hasil.filter((h) => h.status === "fulfilled");
    const gagal = hasil.filter((h) => h.status === "rejected");

    expect(sisaStok(raw), "stok menembus angka minus — barang terjual dua kali").toBe(0);
    expect(sukses, "hanya satu penjualan yang boleh lolos atas satu unit terakhir").toHaveLength(1);
    expect(gagal).toHaveLength(1);
    expect((gagal[0] as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientStockError);
  });

  it("lima penjualan bersamaan atas dua unit: tepat dua yang lolos", async () => {
    // Bukan pengulangan uji di atas: yang ini menangkap perbaikan yang hanya
    // benar untuk kasus satu-lawan-satu, misalnya penjaga yang membandingkan
    // dengan angka nol alih-alih dengan jumlah yang diminta.
    const raw = await buatDb();
    await siapkanStok(raw, 2);
    const db = wrapSqliteLambat(raw);

    const hasil = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        stockOut(db, { productId: "p-1", warehouseId: "wh-utama", qty: 1, refType: "sale", refId: `inv-${i}` }),
      ),
    );

    expect(sisaStok(raw)).toBe(0);
    expect(hasil.filter((h) => h.status === "fulfilled")).toHaveLength(2);
    expect(hasil.filter((h) => h.status === "rejected")).toHaveLength(3);
  });

  it("mutasi stok tidak boleh tercatat untuk penjualan yang ditolak", async () => {
    // Kalau baris `stock_movements` tetap ditulis padahal pengurangannya gagal,
    // kartu stok akan menunjukkan barang keluar yang tidak pernah terjadi —
    // dan laporan mutasi tidak lagi cocok dengan saldonya.
    const raw = await buatDb();
    await siapkanStok(raw, 1);
    const db = wrapSqliteLambat(raw);

    await Promise.allSettled([
      stockOut(db, { productId: "p-1", warehouseId: "wh-utama", qty: 1, refType: "sale", refId: "inv-A" }),
      stockOut(db, { productId: "p-1", warehouseId: "wh-utama", qty: 1, refType: "sale", refId: "inv-B" }),
    ]);

    const keluar = raw
      .prepare(`SELECT COUNT(*) AS n FROM stock_movements WHERE qty < 0`)
      .get() as { n: number };
    expect(keluar.n, "ada mutasi keluar tercatat untuk penjualan yang ditolak").toBe(1);
  });

  it("penjualan berurutan (tanpa balapan) tetap berperilaku sama", async () => {
    // Penjaga regresi: perbaikan balapan tidak boleh mengubah jalur normal.
    const raw = await buatDb();
    await siapkanStok(raw, 3);
    const db = wrapSqlite(raw);

    const hpp = await stockOut(db, {
      productId: "p-1",
      warehouseId: "wh-utama",
      qty: 2,
      refType: "sale",
      refId: "inv-1",
    });
    expect(hpp).toBe(2 * 60_000);
    expect(sisaStok(raw)).toBe(1);

    await expect(
      stockOut(db, { productId: "p-1", warehouseId: "wh-utama", qty: 2, refType: "sale", refId: "inv-2" }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
    expect(sisaStok(raw), "penolakan tidak boleh mengubah stok").toBe(1);
  });
});
