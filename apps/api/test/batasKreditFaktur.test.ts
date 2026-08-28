import type { CreateInvoiceInput } from "@erpindo/shared";
import { describe, expect, it } from "vitest";
import { executeInvoice, executePurchase } from "../src/lib/commercePosting";
import { newTenantDb, seedContact, seedProduct, WH_UTAMA } from "./helpers/memdb";

/**
 * Batas kredit & termin pembayaran saat memposting faktur (Fase 42a).
 *
 * Rumusnya sendiri diuji sebagai fungsi murni di
 * `packages/shared/test/batasKredit.test.ts`. Berkas ini menguji hal yang
 * hanya terlihat di basis data: piutang berjalan dibaca dari faktur terposting,
 * dan faktur yang ditolak TIDAK meninggalkan jejak.
 */
async function siapkan(opts: { creditLimit?: number; paymentTermDays?: number } = {}) {
  const db = await newTenantDb();
  const customer = await seedContact(db, { ...opts, name: "Pelanggan" });
  const prod = await seedProduct(db, { sellPrice: 1_000_000, buyPrice: 400_000 });
  // Stok datang dari pembelian sungguhan, mengikuti pola `withStock` di
  // `commercePosting.test.ts` — tidak ada jalan pintas menyuntik stok langsung.
  const pemasok = await seedContact(db, { type: "supplier", name: "Pemasok" });
  await executePurchase(
    db,
    { contactId: pemasok, warehouseId: WH_UTAMA, invoiceDate: "2026-07-01", taxRate: 0, lines: [{ productId: prod, qty: 1000, unitPrice: 400_000 }] },
    "u1",
  );
  return { db, customer, prod };
}

const faktur = (
  customer: string,
  prod: string,
  qty: number,
  tanggal = "2026-07-02",
  dueDate?: string,
): CreateInvoiceInput => ({
  contactId: customer,
  warehouseId: WH_UTAMA,
  invoiceDate: tanggal,
  dueDate,
  taxRate: 0,
  lines: [{ productId: prod, qty, unitPrice: 1_000_000 }],
});

describe("batas kredit saat posting faktur", () => {
  it("pelanggan tanpa batas: faktur sebesar apa pun tetap lolos", async () => {
    const { db, customer, prod } = await siapkan();
    const res = await executeInvoice(db, faktur(customer, prod, 500), "u1");
    expect(res).not.toHaveProperty("error");
  });

  it("faktur yang melampaui batas ditolak dengan pesan bernominal", async () => {
    const { db, customer, prod } = await siapkan({ creditLimit: 5_000_000 });
    const res = await executeInvoice(db, faktur(customer, prod, 6), "u1");
    expect(res).toHaveProperty("error");
    const pesan = (res as { error: string }).error;
    expect(pesan).toContain("batas kredit");
    // Pesannya menyebut ketiga angkanya, supaya penggunanya tahu harus berbuat
    // apa — bukan sekadar "ditolak".
    expect(pesan).toContain("Rp 6.000.000");
    expect(pesan).toContain("Rp 5.000.000");
  });

  it("faktur yang ditolak tidak meninggalkan jurnal maupun mutasi stok", async () => {
    // Inilah alasan pemeriksaannya diletakkan sebelum stok bergerak. Kalau
    // urutannya terbalik, faktur yang ditolak tetap mengurangi stok.
    const { db, customer, prod } = await siapkan({ creditLimit: 1_000_000 });
    // Pembelian penyiapan sudah meninggalkan satu jurnal dan satu mutasi, jadi
    // yang diperiksa adalah TIDAK ADA TAMBAHAN, bukan nol mutlak.
    const hitung = async () => ({
      jurnal: (await db.prepare(`SELECT COUNT(*) AS n FROM journal_entries`).first<{ n: number }>())?.n ?? 0,
      mutasi: (await db.prepare(`SELECT COUNT(*) AS n FROM stock_movements`).first<{ n: number }>())?.n ?? 0,
      faktur: (await db.prepare(`SELECT COUNT(*) AS n FROM invoices`).first<{ n: number }>())?.n ?? 0,
    });
    const sebelum = await hitung();
    await executeInvoice(db, faktur(customer, prod, 5), "u1");
    expect(await hitung()).toEqual(sebelum);
  });

  it("piutang berjalan ikut dihitung, bukan hanya faktur yang sedang dibuat", async () => {
    const { db, customer, prod } = await siapkan({ creditLimit: 10_000_000 });
    // Faktur pertama 6 juta — lolos.
    expect(await executeInvoice(db, faktur(customer, prod, 6), "u1")).not.toHaveProperty("error");
    // Faktur kedua 6 juta sendiri di bawah batas, tetapi totalnya 12 juta.
    expect(await executeInvoice(db, faktur(customer, prod, 6), "u1")).toHaveProperty("error");
  });

  it("batas nol memblokir faktur apa pun, dan itu memang bedanya dengan tanpa batas", async () => {
    const { db, customer, prod } = await siapkan({ creditLimit: 0 });
    expect(await executeInvoice(db, faktur(customer, prod, 1), "u1")).toHaveProperty("error");
  });

  it("batas kredit TIDAK berlaku pada pembelian — itu utang kita, bukan piutang", async () => {
    const db = await newTenantDb();
    const pemasok = await seedContact(db, { type: "supplier", creditLimit: 1_000 });
    const prod = await seedProduct(db, { sellPrice: 1_000_000, buyPrice: 400_000 });
    const res = await executePurchase(
      db,
      { contactId: pemasok, warehouseId: WH_UTAMA, invoiceDate: "2026-07-02", taxRate: 0, lines: [{ productId: prod, qty: 10, unitPrice: 500_000 }] },
      "u1",
    );
    expect(res).not.toHaveProperty("error");
  });
});

describe("termin pembayaran menurunkan jatuh tempo", () => {
  it("tanpa termin dan tanpa isian: jatuh tempo tetap kosong", async () => {
    const { db, customer, prod } = await siapkan();
    await executeInvoice(db, faktur(customer, prod, 1), "u1");
    const inv = await db.prepare(`SELECT due_date FROM invoices`).first<{ due_date: string | null }>();
    expect(inv?.due_date).toBeNull();
  });

  it("termin 30 hari mengisi jatuh tempo sendiri", async () => {
    const { db, customer, prod } = await siapkan({ paymentTermDays: 30 });
    await executeInvoice(db, faktur(customer, prod, 1, "2026-07-02"), "u1");
    const inv = await db.prepare(`SELECT due_date FROM invoices`).first<{ due_date: string | null }>();
    expect(inv?.due_date).toBe("2026-08-01");
  });

  it("tanggal yang diketik pengguna MENANG atas termin", async () => {
    // Termin adalah nilai baku, bukan aturan yang memaksa. Kasir yang menyepakati
    // tanggal lain dengan pelanggannya harus bisa menuliskannya.
    const { db, customer, prod } = await siapkan({ paymentTermDays: 30 });
    await executeInvoice(db, faktur(customer, prod, 1, "2026-07-02", "2026-07-10"), "u1");
    const inv = await db.prepare(`SELECT due_date FROM invoices`).first<{ due_date: string | null }>();
    expect(inv?.due_date).toBe("2026-07-10");
  });

  it("termin 0 hari berarti jatuh tempo hari itu juga", async () => {
    const { db, customer, prod } = await siapkan({ paymentTermDays: 0 });
    await executeInvoice(db, faktur(customer, prod, 1, "2026-07-02"), "u1");
    const inv = await db.prepare(`SELECT due_date FROM invoices`).first<{ due_date: string | null }>();
    expect(inv?.due_date).toBe("2026-07-02");
  });
});
