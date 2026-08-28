import { describe, expect, it } from "vitest";
import { executeInvoice, executePurchase } from "../src/lib/commercePosting";
import { journalTotals, newTenantDb, seedContact, seedProduct, stockLevel, WH_UTAMA } from "./helpers/memdb";
import type { SqlExecutor } from "@erpindo/db";

/**
 * Konsinyasi & dropship (Fase 48b).
 *
 * Dropship punya satu sifat yang tidak dimiliki penjualan lain: barangnya tidak
 * pernah masuk gudang kita. Karena itu dua hal harus benar sekaligus — stok
 * TIDAK boleh bergerak, dan HPP TETAP harus diakui dengan lawan Utang Usaha,
 * bukan Persediaan.
 */
async function siapkan(db: SqlExecutor) {
  const pelanggan = await seedContact(db, { name: "PT Pembeli" });
  const pemasok = await seedContact(db, { type: "supplier", name: "PT Pemasok" });
  const prod = await seedProduct(db, { sellPrice: 1_000_000, buyPrice: 600_000 });
  return { pelanggan, pemasok, prod };
}

const saldoAkun = async (db: SqlExecutor, code: string) => {
  const r = await db
    .prepare(
      `SELECT COALESCE(SUM(l.debit) - SUM(l.credit), 0) AS saldo
       FROM journal_lines l JOIN accounts a ON a.id = l.account_id WHERE a.code = ?`,
    )
    .bind(code)
    .first<{ saldo: number }>();
  return r?.saldo ?? 0;
};

describe("dropship", () => {
  it("TIDAK menggerakkan stok — barangnya tak pernah lewat gudang kita", async () => {
    const db = await newTenantDb();
    const { pelanggan, prod } = await siapkan(db);
    // Sengaja TANPA pembelian lebih dulu: stok nol. Faktur biasa akan ditolak
    // di sini, dan itulah bedanya.
    const res = await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 0,
        isDropship: true,
        lines: [{ productId: prod, qty: 10, unitPrice: 1_000_000, unitCost: 600_000 }],
      },
      "u1",
    );
    expect(res).not.toHaveProperty("error");
    const stok = await stockLevel(db, prod);
    expect(stok.qty).toBe(0);
    const mutasi = await db.prepare(`SELECT COUNT(*) AS n FROM stock_movements`).first<{ n: number }>();
    expect(mutasi?.n).toBe(0);
  });

  it("faktur BIASA tanpa stok tetap ditolak — dropship bukan jalan pintas", async () => {
    // Kalau uji di atas lulus hanya karena penjaga stok sedang mati, uji ini
    // akan ikut lulus. Keduanya harus diperiksa bersama.
    const db = await newTenantDb();
    const { pelanggan, prod } = await siapkan(db);
    const res = await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 0,
        lines: [{ productId: prod, qty: 10, unitPrice: 1_000_000 }],
      },
      "u1",
    );
    expect(res).toHaveProperty("error");
  });

  it("HPP tetap diakui, dan lawannya Utang Usaha — BUKAN Persediaan", async () => {
    const db = await newTenantDb();
    const { pelanggan, prod } = await siapkan(db);
    await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 0,
        isDropship: true,
        lines: [{ productId: prod, qty: 10, unitPrice: 1_000_000, unitCost: 600_000 }],
      },
      "u1",
    );
    // HPP 6 juta didebit.
    expect(await saldoAkun(db, "5-1000")).toBe(6_000_000);
    // Utang Usaha bertambah 6 juta (saldo kredit → negatif dalam debit-kredit).
    expect(await saldoAkun(db, "2-1000")).toBe(-6_000_000);
    // Persediaan TIDAK tersentuh. Mengkreditnya akan membuatnya minus atas
    // barang yang tidak pernah kita simpan.
    expect(await saldoAkun(db, "1-1300")).toBe(0);
  });

  it("jurnalnya tetap seimbang", async () => {
    const db = await newTenantDb();
    const { pelanggan, prod } = await siapkan(db);
    await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 11,
        isDropship: true,
        lines: [{ productId: prod, qty: 10, unitPrice: 1_000_000, unitCost: 600_000 }],
      },
      "u1",
    );
    const inv = await db
      .prepare(`SELECT journal_entry_id FROM invoices`)
      .first<{ journal_entry_id: string }>();
    const t = await journalTotals(db, inv!.journal_entry_id);
    expect(t.debit).toBe(t.credit);
    expect(t.debit).toBeGreaterThan(0);
  });

  it("tanpa unitCost, HPP nol dan jurnalnya tetap seimbang", async () => {
    // Bukan keadaan yang dianjurkan, tetapi tidak boleh melempar maupun
    // menghasilkan jurnal timpang.
    const db = await newTenantDb();
    const { pelanggan, prod } = await siapkan(db);
    const res = await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 0,
        isDropship: true,
        lines: [{ productId: prod, qty: 1, unitPrice: 1_000_000 }],
      },
      "u1",
    );
    expect(res).not.toHaveProperty("error");
    expect(await saldoAkun(db, "5-1000")).toBe(0);
  });

  it("faktur dropship ditandai di basis data", async () => {
    const db = await newTenantDb();
    const { pelanggan, prod } = await siapkan(db);
    await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 0,
        isDropship: true,
        lines: [{ productId: prod, qty: 1, unitPrice: 1_000_000, unitCost: 600_000 }],
      },
      "u1",
    );
    const inv = await db
      .prepare(`SELECT is_dropship, cogs_amount FROM invoices`)
      .first<{ is_dropship: number; cogs_amount: number }>();
    expect(inv?.is_dropship).toBe(1);
    expect(inv?.cogs_amount).toBe(600_000);
    const baris = await db.prepare(`SELECT unit_cost FROM invoice_lines`).first<{ unit_cost: number }>();
    expect(baris?.unit_cost).toBe(600_000);
  });
});

describe("konsinyasi sebagai gudang bertanda", () => {
  it("gudang konsinyasi menyimpan mitra penitipannya", async () => {
    const db = await newTenantDb();
    const { pemasok } = await siapkan(db);
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO warehouses (id, code, name, is_consignment, partner_contact_id)
         VALUES (?, 'KONS-01', 'Titipan Toko Mitra', 1, ?)`,
      )
      .bind(id, pemasok)
      .run();
    const w = await db
      .prepare(`SELECT is_consignment, partner_contact_id FROM warehouses WHERE id = ?`)
      .bind(id)
      .first<{ is_consignment: number; partner_contact_id: string }>();
    expect(w?.is_consignment).toBe(1);
    expect(w?.partner_contact_id).toBe(pemasok);
  });

  it("gudang biasa tetap bukan konsinyasi setelah migrasi", async () => {
    const db = await newTenantDb();
    const w = await db
      .prepare(`SELECT is_consignment FROM warehouses WHERE id = ?`)
      .bind(WH_UTAMA)
      .first<{ is_consignment: number }>();
    expect(w?.is_consignment).toBe(0);
  });

  it("menjual DARI gudang konsinyasi berjalan seperti penjualan biasa", async () => {
    // Inilah alasan konsinyasi dimodelkan sebagai gudang, bukan mekanisme
    // tersendiri: seluruh mesin yang sudah ada langsung berlaku. Barang yang
    // dititipkan masih milik kita, dan penjualannya mengeluarkan stok serta
    // mengakui HPP persis seperti penjualan dari gudang mana pun.
    const db = await newTenantDb();
    const { pelanggan, pemasok, prod } = await siapkan(db);
    const kons = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO warehouses (id, code, name, is_consignment, partner_contact_id)
         VALUES (?, 'KONS-01', 'Titipan Toko Mitra', 1, ?)`,
      )
      .bind(kons, pemasok)
      .run();
    // Barang dibeli LANGSUNG ke gudang konsinyasi — itu sah: pembelian yang
    // dikirim pemasok ke lokasi mitra tidak perlu singgah di gudang sendiri.
    await executePurchase(
      db,
      {
        contactId: pemasok,
        warehouseId: kons,
        invoiceDate: "2026-07-01",
        taxRate: 0,
        lines: [{ productId: prod, qty: 20, unitPrice: 600_000 }],
      },
      "u1",
    );
    expect((await stockLevel(db, prod, kons)).qty).toBe(20);
    // Gudang sendiri tetap kosong: barangnya memang tidak pernah ke sini.
    expect((await stockLevel(db, prod, WH_UTAMA)).qty).toBe(0);

    const res = await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: kons,
        invoiceDate: "2026-07-10",
        taxRate: 0,
        lines: [{ productId: prod, qty: 5, unitPrice: 1_000_000 }],
      },
      "u1",
    );
    expect(res).not.toHaveProperty("error");
    expect((await stockLevel(db, prod, kons)).qty).toBe(15);
    // HPP diakui 5 x 600.000, dan lawannya Persediaan — berbeda dari dropship.
    expect(await saldoAkun(db, "5-1000")).toBe(3_000_000);
  });
});
