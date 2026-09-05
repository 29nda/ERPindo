import { DatabaseSync } from "node:sqlite";
import { applyMigrations, TENANT_MIGRATIONS } from "@erpindo/db";
import { beforeEach, describe, expect, it } from "vitest";
import { pindahStokAntarGudang, stockIn, stockOut } from "../src/lib/accounting";
import { wrapSqlite } from "./helpers/memdb";

/**
 * Lot & kedaluwarsa tidak boleh menguap (Fase 54d).
 *
 * Pelacakan lot hanya dinyalakan oleh satu jenis pelanggan: yang menjual barang
 * yang bisa kedaluwarsa — apotek, distributor makanan, bahan kimia. Untuk
 * mereka, tanggal kedaluwarsa BUKAN keterangan tambahan; itu satu-satunya
 * alasan modul stoknya dipakai.
 *
 * Yang membuat cacat di sini sulit terlihat: kuantitas, nilai persediaan, dan
 * jurnalnya semua tetap benar. Yang hilang cuma tanggalnya. Neraca seimbang,
 * neraca saldo hijau, laporan stok cocok — sementara halaman Kedaluwarsa
 * berhenti menyebut barang yang sebenarnya ada di rak.
 */

let raw: DatabaseSync;

async function db() {
  return wrapSqlite(raw);
}

beforeEach(async () => {
  raw = new DatabaseSync(":memory:");
  await applyMigrations(wrapSqlite(raw), TENANT_MIGRATIONS);
  const d = wrapSqlite(raw);
  await d
    .prepare(`INSERT INTO warehouses (id, code, name) VALUES ('wh-cabang', 'CABANG', 'Gudang Cabang')`)
    .run();
  await d
    .prepare(
      `INSERT INTO products (id, sku, name, sell_price, buy_price, track_expiry) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind("p-obat", "OBT-1", "Obat Batuk", 25_000, 15_000, 1)
    .run();
  await d
    .prepare(
      `INSERT INTO products (id, sku, name, sell_price, buy_price, track_expiry) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind("p-baut", "BAUT-1", "Baut 10mm", 2_000, 1_000, 0)
    .run();
});

type BarisLot = { lot_no: string | null; expiry_date: string | null; qty: number; warehouse_id: string };

async function lots(productId: string): Promise<BarisLot[]> {
  const d = await db();
  const { results } = await d
    .prepare(
      `SELECT lot_no, expiry_date, qty, warehouse_id FROM stock_lots
       WHERE product_id = ? AND qty > 0 ORDER BY warehouse_id, expiry_date IS NULL, expiry_date`,
    )
    .bind(productId)
    .all<BarisLot>();
  return results;
}

async function saldo(productId: string, warehouseId: string): Promise<number> {
  const d = await db();
  const row = await d
    .prepare(`SELECT qty FROM stock_levels WHERE product_id = ? AND warehouse_id = ?`)
    .bind(productId, warehouseId)
    .first<{ qty: number }>();
  return row?.qty ?? 0;
}

describe("pemindahan antar gudang membawa serta lot", () => {
  it("tanggal kedaluwarsa ikut pindah ke gudang tujuan", async () => {
    const d = await db();
    await stockIn(d, {
      productId: "p-obat",
      warehouseId: "wh-utama",
      qty: 100,
      unitCost: 15_000,
      refType: "purchase",
      refId: "po-1",
      lot: { lotNo: "L-2027A", expiryDate: "2027-03-31" },
    });

    await pindahStokAntarGudang(d, {
      productId: "p-obat",
      dariGudangId: "wh-utama",
      keGudangId: "wh-cabang",
      qty: 40,
      refType: "adjustment",
      refId: "trf-1",
    });

    expect(await saldo("p-obat", "wh-utama")).toBe(60);
    expect(await saldo("p-obat", "wh-cabang")).toBe(40);

    const cabang = (await lots("p-obat")).filter((l) => l.warehouse_id === "wh-cabang");
    expect(cabang, "cabang menerima barang tanpa satu pun baris lot").toHaveLength(1);
    expect(cabang[0]!.lot_no).toBe("L-2027A");
    expect(cabang[0]!.expiry_date).toBe("2027-03-31");
    expect(cabang[0]!.qty).toBe(40);
  });

  it("mengambil lot terdekat kedaluwarsa lebih dulu, dan yang terbawa ikut yang itu", async () => {
    const d = await db();
    for (const [lotNo, exp] of [
      ["L-JAUH", "2028-12-31"],
      ["L-DEKAT", "2026-10-01"],
    ] as const) {
      await stockIn(d, {
        productId: "p-obat",
        warehouseId: "wh-utama",
        qty: 30,
        unitCost: 15_000,
        refType: "purchase",
        refId: `po-${lotNo}`,
        lot: { lotNo, expiryDate: exp },
      });
    }

    await pindahStokAntarGudang(d, {
      productId: "p-obat",
      dariGudangId: "wh-utama",
      keGudangId: "wh-cabang",
      qty: 40,
      refType: "adjustment",
      refId: "trf-2",
    });

    const cabang = (await lots("p-obat")).filter((l) => l.warehouse_id === "wh-cabang");
    // 30 dari lot terdekat kedaluwarsa, sisanya 10 dari lot berikutnya.
    expect(cabang.map((l) => [l.lot_no, l.qty])).toEqual([
      ["L-DEKAT", 30],
      ["L-JAUH", 10],
    ]);
    const utama = (await lots("p-obat")).filter((l) => l.warehouse_id === "wh-utama");
    expect(utama.map((l) => [l.lot_no, l.qty])).toEqual([["L-JAUH", 20]]);
  });

  it("produk tanpa pelacakan tidak menumbuhkan baris lot sama sekali", async () => {
    const d = await db();
    await stockIn(d, {
      productId: "p-baut",
      warehouseId: "wh-utama",
      qty: 500,
      unitCost: 1_000,
      refType: "purchase",
      refId: "po-baut",
    });
    await pindahStokAntarGudang(d, {
      productId: "p-baut",
      dariGudangId: "wh-utama",
      keGudangId: "wh-cabang",
      qty: 200,
      refType: "adjustment",
      refId: "trf-baut",
    });

    expect(await lots("p-baut")).toEqual([]);
    expect(await saldo("p-baut", "wh-cabang")).toBe(200);
  });
});

describe("barang kembali tanpa keterangan lot", () => {
  it("tetap masuk buku lot sebagai lot tanpa tanggal, bukan hilang darinya", async () => {
    const d = await db();
    await stockIn(d, {
      productId: "p-obat",
      warehouseId: "wh-utama",
      qty: 10,
      unitCost: 15_000,
      refType: "purchase",
      refId: "po-1",
      lot: { lotNo: "L-1", expiryDate: "2027-01-31" },
    });
    await stockOut(d, { productId: "p-obat", warehouseId: "wh-utama", qty: 4, refType: "sale", refId: "inv-1" });

    // Retur penjualan: barang balik, tetapi tidak ada yang tahu lot mana.
    await stockIn(d, {
      productId: "p-obat",
      warehouseId: "wh-utama",
      qty: 4,
      unitCost: 15_000,
      refType: "sale",
      refId: "rtn-1",
    });

    const baris = await lots("p-obat");
    expect(baris.map((l) => [l.lot_no, l.expiry_date, l.qty])).toEqual([
      ["L-1", "2027-01-31", 6],
      [null, null, 4],
    ]);
    // Invarian yang dijaga Rekonsiliasi Persediaan: buku lot menjelaskan
    // SELURUH saldo produk berpelacakan, bukan sebagiannya.
    const totalLot = baris.reduce((t, l) => t + l.qty, 0);
    expect(totalLot).toBe(await saldo("p-obat", "wh-utama"));
  });

  it("lot tanpa tanggal dikonsumsi paling akhir, sesudah semua yang bertanggal", async () => {
    const d = await db();
    await stockIn(d, {
      productId: "p-obat",
      warehouseId: "wh-utama",
      qty: 5,
      unitCost: 15_000,
      refType: "sale",
      refId: "rtn-1",
    });
    await stockIn(d, {
      productId: "p-obat",
      warehouseId: "wh-utama",
      qty: 5,
      unitCost: 15_000,
      refType: "purchase",
      refId: "po-1",
      lot: { lotNo: "L-1", expiryDate: "2027-01-31" },
    });

    await stockOut(d, { productId: "p-obat", warehouseId: "wh-utama", qty: 5, refType: "sale", refId: "inv-1" });

    expect((await lots("p-obat")).map((l) => [l.lot_no, l.qty])).toEqual([[null, 5]]);
  });
});

describe("invarian kuantitas yang dijaga Rekonsiliasi Persediaan", () => {
  it("saldo selalu sama dengan jumlah kartu stoknya, sesudah rangkaian mutasi", async () => {
    const d = await db();
    await stockIn(d, {
      productId: "p-obat",
      warehouseId: "wh-utama",
      qty: 100,
      unitCost: 15_000,
      refType: "purchase",
      refId: "po-1",
      lot: { lotNo: "L-1", expiryDate: "2027-06-30" },
    });
    await stockOut(d, { productId: "p-obat", warehouseId: "wh-utama", qty: 25, refType: "sale", refId: "inv-1" });
    await pindahStokAntarGudang(d, {
      productId: "p-obat",
      dariGudangId: "wh-utama",
      keGudangId: "wh-cabang",
      qty: 30,
      refType: "adjustment",
      refId: "trf-1",
    });
    await stockIn(d, {
      productId: "p-obat",
      warehouseId: "wh-cabang",
      qty: 5,
      unitCost: 15_000,
      refType: "sale",
      refId: "rtn-1",
    });

    const { results } = await d
      .prepare(
        `SELECT s.warehouse_id, s.qty AS saldo, COALESCE(m.total, 0) AS kartu
         FROM stock_levels s
         LEFT JOIN (SELECT product_id, warehouse_id, SUM(qty) AS total
                    FROM stock_movements GROUP BY product_id, warehouse_id) m
           ON m.product_id = s.product_id AND m.warehouse_id = s.warehouse_id
         WHERE s.product_id = 'p-obat'`,
      )
      .all<{ warehouse_id: string; saldo: number; kartu: number }>();

    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.saldo, `saldo ${r.warehouse_id} berpisah dari kartu stoknya`).toBe(r.kartu);
    }
  });

  it("buku lot tidak pernah mengaku menyimpan lebih banyak daripada saldonya", async () => {
    const d = await db();
    await stockIn(d, {
      productId: "p-obat",
      warehouseId: "wh-utama",
      qty: 40,
      unitCost: 15_000,
      refType: "purchase",
      refId: "po-1",
      lot: { lotNo: "L-1", expiryDate: "2027-06-30" },
    });
    await pindahStokAntarGudang(d, {
      productId: "p-obat",
      dariGudangId: "wh-utama",
      keGudangId: "wh-cabang",
      qty: 40,
      refType: "adjustment",
      refId: "trf-1",
    });
    await stockOut(d, { productId: "p-obat", warehouseId: "wh-cabang", qty: 15, refType: "sale", refId: "inv-1" });

    const { results } = await d
      .prepare(
        `SELECT s.warehouse_id, s.qty AS saldo, COALESCE(l.total, 0) AS lot
         FROM stock_levels s
         LEFT JOIN (SELECT product_id, warehouse_id, SUM(qty) AS total
                    FROM stock_lots GROUP BY product_id, warehouse_id) l
           ON l.product_id = s.product_id AND l.warehouse_id = s.warehouse_id
         WHERE s.product_id = 'p-obat'`,
      )
      .all<{ warehouse_id: string; saldo: number; lot: number }>();

    for (const r of results) {
      expect(r.lot, `lot hantu di ${r.warehouse_id}`).toBe(r.saldo);
    }
  });
});
