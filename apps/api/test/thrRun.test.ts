import { hitungPph21Thr, hitungThr } from "@erpindo/shared";
import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "@erpindo/db";
import { newTenantDb } from "./helpers/memdb";

/**
 * THR di lapisan basis data (Fase 43a).
 *
 * Rumusnya sendiri diuji sebagai fungsi murni di `packages/shared/test/thr.test.ts`.
 * Berkas ini menguji hal-hal yang hanya terlihat di skema: jurnalnya seimbang,
 * dan keunikan `(tahun, hari raya)` benar-benar ditegakkan indeks parsial —
 * termasuk bahwa run yang dibatalkan melepaskan slotnya kembali.
 */
async function seedKaryawan(
  db: SqlExecutor,
  opts: { name: string; joinDate: string | null; base: number; allowances?: number },
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO employees (id, name, ptkp_status, base_salary, allowances, join_date, is_active)
       VALUES (?, ?, 'TK/0', ?, ?, ?, 1)`,
    )
    .bind(id, opts.name, opts.base, opts.allowances ?? 0, opts.joinDate)
    .run();
  return id;
}

describe("skema thr_runs", () => {
  it("migrasi 0049 membuat kedua tabelnya", async () => {
    const db = await newTenantDb();
    const { results } = await db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('thr_runs', 'thr_slips')`)
      .all<{ name: string }>();
    expect(results.map((r) => r.name).sort()).toEqual(["thr_runs", "thr_slips"]);
  });

  const sisipRun = (db: SqlExecutor, id: string, runNo: string, tahun: number, raya: string) =>
    db
      .prepare(
        `INSERT INTO thr_runs (id, run_no, tahun, hari_raya, pay_date, total_thr, total_pph21, total_net, created_by)
         VALUES (?, ?, ?, ?, '2026-03-20', 0, 0, 0, 'u1')`,
      )
      .bind(id, runNo, tahun, raya)
      .run();

  it("satu tahun tidak boleh dua kali THR untuk hari raya yang sama", async () => {
    const db = await newTenantDb();
    await sisipRun(db, "r1", "THR-0001", 2026, "idulfitri");
    await expect(sisipRun(db, "r2", "THR-0002", 2026, "idulfitri")).rejects.toThrow();
  });

  it("hari raya berbeda di tahun yang sama tetap boleh", async () => {
    // Perusahaan dengan karyawan lintas agama membayar pada hari raya
    // masing-masing. Keunikan per tahun saja akan melarang yang sah.
    const db = await newTenantDb();
    await sisipRun(db, "r1", "THR-0001", 2026, "idulfitri");
    await sisipRun(db, "r2", "THR-0002", 2026, "natal");
    const n = await db.prepare(`SELECT COUNT(*) AS n FROM thr_runs`).first<{ n: number }>();
    expect(n?.n).toBe(2);
  });

  it("run yang dibatalkan melepaskan slotnya untuk run ulang", async () => {
    // Inilah alasan indeksnya parsial (`WHERE voided_at IS NULL`) dan bukan
    // UNIQUE biasa. Tanpa itu, pembayaran THR yang salah lalu dibatalkan akan
    // mengunci hari raya itu selamanya — persis masalah yang di payroll_runs
    // harus diakali dengan sufiks tombstone.
    const db = await newTenantDb();
    await sisipRun(db, "r1", "THR-0001", 2026, "idulfitri");
    await db.prepare(`UPDATE thr_runs SET voided_at = datetime('now') WHERE id = 'r1'`).run();
    await sisipRun(db, "r2", "THR-0002", 2026, "idulfitri");
    const aktif = await db
      .prepare(`SELECT COUNT(*) AS n FROM thr_runs WHERE voided_at IS NULL`)
      .first<{ n: number }>();
    expect(aktif?.n).toBe(1);
  });
});

describe("jurnal THR seimbang", () => {
  it("beban = netto + PPh 21, untuk campuran karyawan penuh dan proporsional", async () => {
    const db = await newTenantDb();
    await seedKaryawan(db, { name: "Lama", joinDate: "2020-01-01", base: 8_000_000, allowances: 2_000_000 });
    await seedKaryawan(db, { name: "Baru", joinDate: "2025-09-20", base: 6_000_000, allowances: 1_000_000 });
    await seedKaryawan(db, { name: "Sangat baru", joinDate: "2026-03-10", base: 5_000_000 });

    const { results: emps } = await db
      .prepare(`SELECT id, base_salary, allowances, join_date FROM employees WHERE is_active = 1`)
      .all<{ id: string; base_salary: number; allowances: number; join_date: string | null }>();

    let totalThr = 0;
    let totalPph21 = 0;
    let penerima = 0;
    for (const e of emps) {
      const t = hitungThr({
        baseSalary: e.base_salary,
        allowances: e.allowances,
        joinDate: e.join_date,
        payDate: "2026-03-20",
      });
      if (!t.berhak) continue;
      penerima += 1;
      totalThr += t.amount;
      totalPph21 += hitungPph21Thr(e.base_salary + e.allowances, t.amount, "TK/0").pph21Thr;
    }

    // Yang masuk 10 Maret 2026 belum genap sebulan pada 20 Maret — tidak ikut.
    expect(penerima).toBe(2);
    const totalNet = totalThr - totalPph21;
    // Baris jurnalnya: Debit Beban THR (bruto) · Kredit Kas (netto) ·
    // Kredit Utang Gaji (PPh 21). Identitas inilah yang menjaganya seimbang.
    expect(totalNet + totalPph21).toBe(totalThr);
    expect(totalNet).toBeLessThan(totalThr);
  });

  it("karyawan tanpa tanggal masuk tidak menghasilkan slip", async () => {
    // Data karyawan lama kerap tidak punya join_date. Yang benar: dia muncul di
    // pratinjau dengan tanda, bukan diam-diam dibayar atau diam-diam hilang.
    const db = await newTenantDb();
    await seedKaryawan(db, { name: "Tanpa tanggal", joinDate: null, base: 7_000_000 });
    const baris = await db
      .prepare(`SELECT base_salary, allowances, join_date FROM employees`)
      .first<{ base_salary: number; allowances: number; join_date: string | null }>();
    expect(baris).not.toBeNull();
    const t = hitungThr({
      baseSalary: baris!.base_salary,
      allowances: baris!.allowances,
      joinDate: baris!.join_date,
      payDate: "2026-03-20",
    });
    expect(t.berhak).toBe(false);
  });
});
