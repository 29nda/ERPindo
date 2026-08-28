import { hitungPesangon, kompensasiPkwt, masaKerjaBulan } from "@erpindo/shared";
import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "@erpindo/db";
import { newTenantDb } from "./helpers/memdb";

/**
 * Pesangon & PKWT di lapisan basis data (Fase 47).
 *
 * Tabel dan pengalinya diuji murni di `packages/shared/test/pesangon.test.ts`.
 * Yang diuji di sini adalah hal yang hanya terlihat di skema: karyawan lama
 * tetap berstatus PKWTT setelah migrasi, dan angka pesangon TERSIMPAN sehingga
 * kenaikan gaji sesudahnya tidak mengubah berkas lama.
 */
async function seedKaryawan(
  db: SqlExecutor,
  opts: { name: string; joinDate: string | null; base: number; tipe?: "pkwt" | "pkwtt" },
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO employees (id, name, ptkp_status, base_salary, allowances, join_date, is_active, employment_type)
       VALUES (?, ?, 'TK/0', ?, 0, ?, 1, ?)`,
    )
    .bind(id, opts.name, opts.base, opts.joinDate, opts.tipe ?? "pkwtt")
    .run();
  return id;
}

describe("skema SDM lanjutan", () => {
  it("migrasi 0055 membuat tabel pesangon", async () => {
    const db = await newTenantDb();
    const t = await db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'severance_records'`)
      .first<{ name: string }>();
    expect(t?.name).toBe("severance_records");
  });

  it("karyawan lama tetap PKWTT setelah migrasi, bukan berubah arti", async () => {
    // Kalau bakunya 'pkwt', seluruh karyawan tetap tiba-tiba terlihat berhak
    // uang kompensasi kontrak — kewajiban yang tidak pernah ada.
    const db = await newTenantDb();
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO employees (id, name, ptkp_status, base_salary, allowances, is_active)
         VALUES (?, 'Karyawan Lama', 'TK/0', 5000000, 0, 1)`,
      )
      .bind(id)
      .run();
    const e = await db
      .prepare(`SELECT employment_type FROM employees WHERE id = ?`)
      .bind(id)
      .first<{ employment_type: string }>();
    expect(e?.employment_type).toBe("pkwtt");
  });

  it("nomor dokumen pesangon unik", async () => {
    const db = await newTenantDb();
    const emp = await seedKaryawan(db, { name: "A", joinDate: "2020-01-01", base: 10_000_000 });
    const sisip = (docNo: string) =>
      db
        .prepare(
          `INSERT INTO severance_records (id, doc_no, employee_id, end_date, alasan, upah_sebulan, masa_kerja_tahun,
                                          bulan_up, pengali_up, up, bulan_upmk, pengali_upmk, upmk, total, created_by)
           VALUES (?, ?, ?, '2026-08-01', 'efisiensi', 10000000, 6, 7, 1, 70000000, 3, 1, 30000000, 100000000, 'u1')`,
        )
        .bind(crypto.randomUUID(), docNo, emp)
        .run();
    await sisip("PSG-0001");
    await expect(sisip("PSG-0001")).rejects.toThrow();
  });
});

describe("pesangon memakai masa kerja dari tanggal masuk sungguhan", () => {
  it("masa kerja 6 tahun menghasilkan UP 7 bulan dan UPMK 3 bulan", async () => {
    const db = await newTenantDb();
    await seedKaryawan(db, { name: "Budi", joinDate: "2020-08-01", base: 10_000_000 });
    const e = await db
      .prepare(`SELECT join_date, base_salary, allowances FROM employees WHERE name = 'Budi'`)
      .first<{ join_date: string; base_salary: number; allowances: number }>();
    const bulan = masaKerjaBulan(e!.join_date, "2026-08-01");
    const b = hitungPesangon({
      upahSebulan: e!.base_salary + e!.allowances,
      masaKerjaTahun: bulan / 12,
      alasan: "efisiensi",
    });
    expect(bulan).toBe(72);
    expect(b.bulanUp).toBe(7);
    expect(b.bulanUpmk).toBe(3);
  });

  it("angka yang tersimpan tidak berubah meski gaji naik sesudahnya", async () => {
    // Alasan yang sama seperti slip THR dan lembur: berkas lama harus tetap
    // menunjukkan angka yang benar-benar dibayarkan waktu itu.
    const db = await newTenantDb();
    const emp = await seedKaryawan(db, { name: "Citra", joinDate: "2020-01-01", base: 10_000_000 });
    await db
      .prepare(
        `INSERT INTO severance_records (id, doc_no, employee_id, end_date, alasan, upah_sebulan, masa_kerja_tahun,
                                        bulan_up, pengali_up, up, bulan_upmk, pengali_upmk, upmk, total, created_by)
         VALUES (?, 'PSG-0001', ?, '2026-08-01', 'efisiensi', 10000000, 6, 7, 1, 70000000, 3, 1, 30000000, 100000000, 'u1')`,
      )
      .bind(crypto.randomUUID(), emp)
      .run();
    await db.prepare(`UPDATE employees SET base_salary = 20000000 WHERE id = ?`).bind(emp).run();
    const rec = await db
      .prepare(`SELECT upah_sebulan, total FROM severance_records WHERE doc_no = 'PSG-0001'`)
      .first<{ upah_sebulan: number; total: number }>();
    expect(rec?.upah_sebulan).toBe(10_000_000);
    expect(rec?.total).toBe(100_000_000);
  });
});

describe("kompensasi PKWT hanya untuk karyawan kontrak", () => {
  it("karyawan tetap tidak mendapat kompensasi kontrak", async () => {
    const db = await newTenantDb();
    await seedKaryawan(db, { name: "Tetap", joinDate: "2025-08-01", base: 10_000_000, tipe: "pkwtt" });
    const e = await db
      .prepare(`SELECT employment_type FROM employees WHERE name = 'Tetap'`)
      .first<{ employment_type: string }>();
    const kompensasi = e!.employment_type === "pkwt" ? kompensasiPkwt(10_000_000, 12) : 0;
    expect(kompensasi).toBe(0);
  });

  it("karyawan kontrak mendapatkannya sebesar masa kerja dibagi 12", async () => {
    const db = await newTenantDb();
    await seedKaryawan(db, { name: "Kontrak", joinDate: "2025-08-01", base: 10_000_000, tipe: "pkwt" });
    const e = await db
      .prepare(`SELECT employment_type, join_date, base_salary FROM employees WHERE name = 'Kontrak'`)
      .first<{ employment_type: string; join_date: string; base_salary: number }>();
    const bulan = masaKerjaBulan(e!.join_date, "2026-08-01");
    const kompensasi = e!.employment_type === "pkwt" ? kompensasiPkwt(e!.base_salary, bulan) : 0;
    expect(bulan).toBe(12);
    expect(kompensasi).toBe(10_000_000);
  });
});
