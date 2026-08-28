import { hitungKomisi } from "@erpindo/shared";
import { describe, expect, it } from "vitest";
import { executeInvoice, executePurchase } from "../src/lib/commercePosting";
import { newTenantDb, seedContact, seedProduct, WH_UTAMA } from "./helpers/memdb";

/**
 * Komisi sales di lapisan basis data (Fase 44a).
 *
 * Rumusnya diuji sebagai fungsi murni di `packages/shared/test/komisi.test.ts`.
 * Yang diuji di sini adalah hal yang hanya terlihat setelah faktur benar-benar
 * diposting: pemilik penjualan tersimpan, dan HPP-nya ikut melekat pada faktur
 * — tanpa keduanya, skema komisi berdasar laba tidak punya angka untuk dihitung.
 */
async function siapkan() {
  const db = await newTenantDb();
  const pelanggan = await seedContact(db, { name: "PT Pembeli" });
  const pemasok = await seedContact(db, { type: "supplier", name: "PT Pemasok" });
  const prod = await seedProduct(db, { sellPrice: 1_000_000, buyPrice: 600_000 });
  await executePurchase(
    db,
    {
      contactId: pemasok,
      warehouseId: WH_UTAMA,
      invoiceDate: "2026-07-01",
      taxRate: 0,
      lines: [{ productId: prod, qty: 100, unitPrice: 600_000 }],
    },
    "u1",
  );
  const sales = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO employees (id, name, ptkp_status, base_salary, allowances, is_active)
       VALUES (?, 'Sari Sales', 'TK/0', 5000000, 0, 1)`,
    )
    .bind(sales)
    .run();
  return { db, pelanggan, prod, sales };
}

describe("faktur menyimpan pemilik penjualan & HPP-nya", () => {
  it("salesperson_id tersimpan saat faktur diposting", async () => {
    const { db, pelanggan, prod, sales } = await siapkan();
    await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 0,
        salespersonId: sales,
        lines: [{ productId: prod, qty: 10, unitPrice: 1_000_000 }],
      },
      "u1",
    );
    const inv = await db
      .prepare(`SELECT salesperson_id, subtotal, cogs_amount FROM invoices`)
      .first<{ salesperson_id: string | null; subtotal: number; cogs_amount: number }>();
    expect(inv?.salesperson_id).toBe(sales);
    expect(inv?.subtotal).toBe(10_000_000);
    // HPP 10 x 600.000 — inilah angka yang dibutuhkan skema berdasar laba, dan
    // sebelum fase ini ia hanya ada sebagai baris jurnal.
    expect(inv?.cogs_amount).toBe(6_000_000);
  });

  it("faktur tanpa sales tetap sah — kasir dan faktur lama tidak punya pemilik", async () => {
    const { db, pelanggan, prod } = await siapkan();
    const res = await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 0,
        lines: [{ productId: prod, qty: 1, unitPrice: 1_000_000 }],
      },
      "u1",
    );
    expect(res).not.toHaveProperty("error");
    const inv = await db.prepare(`SELECT salesperson_id FROM invoices`).first<{ salesperson_id: string | null }>();
    expect(inv?.salesperson_id).toBeNull();
  });

  it("penjualan jasa berHPP nol, jadi komisi laba = komisi omzet", async () => {
    const db = await newTenantDb();
    const pelanggan = await seedContact(db, { name: "PT Jasa" });
    const jasa = await seedProduct(db, { sellPrice: 5_000_000, buyPrice: 0, isService: true });
    await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 0,
        lines: [{ productId: jasa, qty: 1, unitPrice: 5_000_000 }],
      },
      "u1",
    );
    const inv = await db
      .prepare(`SELECT subtotal, cogs_amount FROM invoices`)
      .first<{ subtotal: number; cogs_amount: number }>();
    expect(inv?.cogs_amount).toBe(0);
  });
});

describe("komisi dihitung dari angka faktur yang tersimpan", () => {
  it("PPN tidak ikut menjadi dasar komisi", async () => {
    // Faktur berPPN 11%: total 11,1 juta, subtotal 10 juta. Komisi 2,5% harus
    // 250.000 (dari subtotal), bukan 277.500 (dari total).
    const { db, pelanggan, prod, sales } = await siapkan();
    await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 11,
        salespersonId: sales,
        lines: [{ productId: prod, qty: 10, unitPrice: 1_000_000 }],
      },
      "u1",
    );
    const inv = await db
      .prepare(
        `SELECT subtotal, cogs_amount, total, paid_amount, returned_amount, voided_at FROM invoices`,
      )
      .first<{
        subtotal: number;
        cogs_amount: number;
        total: number;
        paid_amount: number;
        returned_amount: number;
        voided_at: string | null;
      }>();
    const k = hitungKomisi(
      {
        subtotal: inv!.subtotal,
        cogs: inv!.cogs_amount,
        paidAmount: inv!.paid_amount,
        total: inv!.total,
        returnedAmount: inv!.returned_amount,
        voidedAt: inv!.voided_at,
      },
      { dasar: "omzet", pemicu: "faktur", tarifBp: 250 },
    );
    expect(inv!.total).toBe(11_100_000);
    expect(k.amount).toBe(250_000);
    expect(k.amount).not.toBe(277_500);
  });

  it("pemicu pelunasan: faktur baru diposting belum berkomisi", async () => {
    const { db, pelanggan, prod, sales } = await siapkan();
    await executeInvoice(
      db,
      {
        contactId: pelanggan,
        warehouseId: WH_UTAMA,
        invoiceDate: "2026-07-05",
        taxRate: 0,
        salespersonId: sales,
        lines: [{ productId: prod, qty: 10, unitPrice: 1_000_000 }],
      },
      "u1",
    );
    const inv = await db
      .prepare(`SELECT subtotal, cogs_amount, total, paid_amount, returned_amount FROM invoices`)
      .first<{ subtotal: number; cogs_amount: number; total: number; paid_amount: number; returned_amount: number }>();
    expect(inv?.paid_amount).toBe(0);
    const k = hitungKomisi(
      { ...inv!, cogs: inv!.cogs_amount, paidAmount: inv!.paid_amount, returnedAmount: inv!.returned_amount },
      { dasar: "omzet", pemicu: "pelunasan", tarifBp: 250 },
    );
    expect(k.amount).toBe(0);
  });
});
