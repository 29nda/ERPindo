import { describe, expect, it } from "vitest";
import { runBilling } from "../src/routes/contracts";
import { newTenantDb, seedContact, seedProduct, WH_UTAMA } from "./helpers/memdb";
import type { SqlExecutor } from "@erpindo/db";

/**
 * Eskalasi harga & perpanjangan kontrak lewat loop penagihan sungguhan
 * (Fase 45).
 *
 * Rumusnya diuji murni di `packages/shared/test/kontrakEskalasi.test.ts`. Yang
 * diuji di sini adalah bahwa `runBilling` benar-benar MEMAKAI rumus itu — dan
 * bahwa harga dasar di kontrak tidak ikut berubah, sehingga kesepakatan awal
 * tetap terbaca selamanya.
 */
async function siapkanKontrak(
  db: SqlExecutor,
  opts: {
    startDate: string;
    nextInvoiceDate: string;
    escalationBp?: number;
    endDate?: string | null;
    autoRenew?: boolean;
    renewMonths?: number;
    unitPrice?: number;
  },
) {
  const pelanggan = await seedContact(db, { name: "PT Langganan" });
  // Produk jasa: kontrak berulang tidak boleh gagal karena stok habis.
  const jasa = await seedProduct(db, { sellPrice: 10_000_000, buyPrice: 0, isService: true });
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO contracts (id, code, contact_id, name, frequency, tax_rate, warehouse_id,
                              next_invoice_date, end_date, created_by, start_date, escalation_bp,
                              auto_renew, renew_months)
       VALUES (?, 'KTR-001', ?, 'Langganan Tahunan', 'yearly', 0, ?, ?, ?, 'u1', ?, ?, ?, ?)`,
    )
    .bind(
      id,
      pelanggan,
      WH_UTAMA,
      opts.nextInvoiceDate,
      opts.endDate ?? null,
      opts.startDate,
      opts.escalationBp ?? 0,
      opts.autoRenew ? 1 : 0,
      opts.renewMonths ?? 12,
    )
    .run();
  await db
    .prepare(
      `INSERT INTO contract_lines (id, contract_id, product_id, description, qty, unit_price)
       VALUES (?, ?, ?, 'Langganan', 1, ?)`,
    )
    .bind(crypto.randomUUID(), id, jasa, opts.unitPrice ?? 10_000_000)
    .run();
  return { id, pelanggan, jasa };
}

const hargaFakturTerakhir = async (db: SqlExecutor) =>
  (
    await db
      .prepare(`SELECT unit_price FROM invoice_lines ORDER BY rowid DESC LIMIT 1`)
      .first<{ unit_price: number }>()
  )?.unit_price;

describe("eskalasi harga saat menagih", () => {
  it("tahun pertama menagih harga dasar", async () => {
    const db = await newTenantDb();
    await siapkanKontrak(db, { startDate: "2026-01-01", nextInvoiceDate: "2026-01-01", escalationBp: 500 });
    const hasil = await runBilling(db, "2026-01-01", "u1");
    expect(hasil.issued).toBe(1);
    expect(await hargaFakturTerakhir(db)).toBe(10_000_000);
  });

  it("tahun ketiga menagih harga yang sudah naik majemuk", async () => {
    const db = await newTenantDb();
    await siapkanKontrak(db, { startDate: "2026-01-01", nextInvoiceDate: "2028-01-01", escalationBp: 500 });
    await runBilling(db, "2028-01-01", "u1");
    // 2 tahun berjalan: 10jt x 1,05^2 = 11.025.000.
    expect(await hargaFakturTerakhir(db)).toBe(11_025_000);
  });

  it("HARGA DASAR di kontrak tidak ikut berubah", async () => {
    // Inilah yang membuat kenaikan bisa diperiksa pelanggan: yang disepakati
    // awal tetap terbaca, dan kenaikannya dihitung ulang tiap kali menagih.
    const db = await newTenantDb();
    const { id } = await siapkanKontrak(db, {
      startDate: "2026-01-01",
      nextInvoiceDate: "2028-01-01",
      escalationBp: 500,
    });
    await runBilling(db, "2028-01-01", "u1");
    const baris = await db
      .prepare(`SELECT unit_price FROM contract_lines WHERE contract_id = ?`)
      .bind(id)
      .first<{ unit_price: number }>();
    expect(baris?.unit_price).toBe(10_000_000);
  });

  it("tanpa eskalasi, harga tetap meski bertahun-tahun berjalan", async () => {
    const db = await newTenantDb();
    await siapkanKontrak(db, { startDate: "2020-01-01", nextInvoiceDate: "2028-01-01", escalationBp: 0 });
    await runBilling(db, "2028-01-01", "u1");
    expect(await hargaFakturTerakhir(db)).toBe(10_000_000);
  });
});

describe("perpanjangan otomatis", () => {
  it("kontrak habis masa berlaku BERHENTI bila tidak diperpanjang otomatis", async () => {
    const db = await newTenantDb();
    const { id } = await siapkanKontrak(db, {
      startDate: "2026-01-01",
      nextInvoiceDate: "2026-01-01",
      endDate: "2026-06-30",
      autoRenew: false,
    });
    await runBilling(db, "2026-01-01", "u1");
    const k = await db
      .prepare(`SELECT status, end_date FROM contracts WHERE id = ?`)
      .bind(id)
      .first<{ status: string; end_date: string | null }>();
    expect(k?.status).toBe("ended");
    expect(k?.end_date).toBe("2026-06-30");
  });

  it("perpanjangan otomatis memajukan masa berlaku DAN mencatat adendum", async () => {
    // Perpanjangan senyap sama buruknya dengan penghentian senyap: keduanya
    // mengubah kewajiban perusahaan tanpa seorang pun memutuskannya.
    const db = await newTenantDb();
    const { id } = await siapkanKontrak(db, {
      startDate: "2026-01-01",
      nextInvoiceDate: "2026-01-01",
      endDate: "2026-06-30",
      autoRenew: true,
      renewMonths: 12,
    });
    await runBilling(db, "2026-01-01", "u1");
    const k = await db
      .prepare(`SELECT status, end_date FROM contracts WHERE id = ?`)
      .bind(id)
      .first<{ status: string; end_date: string | null }>();
    expect(k?.status).toBe("active");
    expect(k?.end_date).toBe("2027-06-30");

    const adendum = await db
      .prepare(`SELECT jenis, sebelum, sesudah FROM contract_amendments WHERE contract_id = ?`)
      .bind(id)
      .first<{ jenis: string; sebelum: string; sesudah: string }>();
    expect(adendum?.jenis).toBe("perpanjangan");
    expect(adendum?.sebelum).toBe("2026-06-30");
    expect(adendum?.sesudah).toBe("2027-06-30");
  });

  it("kontrak yang masih jauh dari berakhir tidak diperpanjang lebih dulu", async () => {
    const db = await newTenantDb();
    const { id } = await siapkanKontrak(db, {
      startDate: "2026-01-01",
      nextInvoiceDate: "2026-01-01",
      endDate: "2030-12-31",
      autoRenew: true,
    });
    await runBilling(db, "2026-01-01", "u1");
    const n = await db
      .prepare(`SELECT COUNT(*) AS n FROM contract_amendments WHERE contract_id = ?`)
      .bind(id)
      .first<{ n: number }>();
    expect(n?.n).toBe(0);
  });
});

describe("kontrak lama tanpa jangkar tetap aman", () => {
  it("start_date kosong tidak melempar dan tidak menaikkan harga", async () => {
    // Migrasi mengisi `start_date` untuk kontrak lama, tetapi kode tetap harus
    // bertahan bila nilainya kosong — jangan sampai satu kolom kosong
    // menghentikan seluruh penagihan berulang tenant.
    const db = await newTenantDb();
    const { id } = await siapkanKontrak(db, {
      startDate: "2026-01-01",
      nextInvoiceDate: "2026-01-01",
      escalationBp: 500,
    });
    await db.prepare(`UPDATE contracts SET start_date = NULL WHERE id = ?`).bind(id).run();
    const hasil = await runBilling(db, "2026-01-01", "u1");
    expect(hasil.issued).toBe(1);
    expect(await hargaFakturTerakhir(db)).toBe(10_000_000);
  });
});
