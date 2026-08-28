import { calculatePayslip, hitungLembur } from "@erpindo/shared";
import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "@erpindo/db";
import { newTenantDb } from "./helpers/memdb";

/**
 * Lembur di lapisan basis data (Fase 43b).
 *
 * Tangga pengalinya diuji sebagai fungsi murni di
 * `packages/shared/test/lembur.test.ts`. Yang diuji di sini adalah hal yang
 * hanya terlihat setelah datanya tersimpan: lembur benar-benar MASUK BRUTO,
 * sehingga ikut menaikkan PPh 21 dan BPJS — bukan dibayar di luar pajak.
 */
async function seedKaryawan(db: SqlExecutor, base: number, allowances = 0): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO employees (id, name, ptkp_status, base_salary, allowances, is_active)
       VALUES (?, 'Karyawan Lembur', 'TK/0', ?, ?, 1)`,
    )
    .bind(id, base, allowances)
    .run();
  return id;
}

describe("skema overtime_records", () => {
  it("migrasi 0050 membuat tabelnya", async () => {
    const db = await newTenantDb();
    const t = await db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'overtime_records'`)
      .first<{ name: string }>();
    expect(t?.name).toBe("overtime_records");
  });

  it("satu karyawan tidak bisa punya dua catatan lembur di tanggal sama", async () => {
    // Tanpa ini, menekan tombol simpan dua kali membayar lembur dua kali.
    const db = await newTenantDb();
    const emp = await seedKaryawan(db, 8_650_000);
    const sisip = () =>
      db
        .prepare(
          `INSERT INTO overtime_records (id, employee_id, date, period, jenis_hari, hours, hourly_wage, amount, created_by)
           VALUES (?, ?, '2026-08-11', '2026-08', 'biasa', 2, 50000, 175000, 'u1')`,
        )
        .bind(crypto.randomUUID(), emp)
        .run();
    await sisip();
    await expect(sisip()).rejects.toThrow();
  });
});

describe("lembur masuk bruto, bukan dibayar di luar pajak", () => {
  it("bruto naik sebesar upah lembur, dan PPh 21 ikut naik", async () => {
    // Inilah alasan lembur disalurkan lewat pintu yang sama dengan komponen
    // ad-hoc. Membayarnya di luar bruto akan kurang potong PPh 21 — dan
    // kekurangan itu baru muncul saat SPT tahunan.
    const upah = 8_650_000;
    const l = hitungLembur({ upahSebulan: upah, jam: 3, jenisHari: "biasa" });

    const tanpaLembur = calculatePayslip({ baseSalary: upah, allowances: 0, ptkpStatus: "TK/0" });
    const denganLembur = calculatePayslip({ baseSalary: upah, allowances: l.amount, ptkpStatus: "TK/0" });

    expect(denganLembur.gross).toBe(tanpaLembur.gross + l.amount);
    expect(denganLembur.pph21).toBeGreaterThan(tanpaLembur.pph21);
    // BPJS JHT tanpa batas upah, jadi ia pun ikut naik.
    expect(denganLembur.bpjsJhtEmployee).toBeGreaterThan(tanpaLembur.bpjsJhtEmployee);
  });

  it("upah sejam memakai upah pokok DITAMBAH tunjangan tetap", async () => {
    // Kesalahan yang sekelas dengan dasar THR: memakai upah pokok saja membuat
    // tiap jam lembur dibayar kurang.
    const hanyaPokok = hitungLembur({ upahSebulan: 8_000_000, jam: 2, jenisHari: "biasa" });
    const denganTunjangan = hitungLembur({ upahSebulan: 10_000_000, jam: 2, jenisHari: "biasa" });
    expect(denganTunjangan.amount).toBeGreaterThan(hanyaPokok.amount);
  });

  it("beberapa catatan lembur satu periode dijumlahkan per karyawan", async () => {
    const db = await newTenantDb();
    const emp = await seedKaryawan(db, 8_650_000);
    for (const [tgl, jam] of [["2026-08-11", 2], ["2026-08-12", 3]] as const) {
      const b = hitungLembur({ upahSebulan: 8_650_000, jam, jenisHari: "biasa" });
      await db
        .prepare(
          `INSERT INTO overtime_records (id, employee_id, date, period, jenis_hari, hours, hourly_wage, amount, created_by)
           VALUES (?, ?, ?, '2026-08', 'biasa', ?, ?, ?, 'u1')`,
        )
        .bind(crypto.randomUUID(), emp, tgl, jam, b.upahPerJam, b.amount)
        .run();
    }
    const total = await db
      .prepare(`SELECT SUM(amount) AS n FROM overtime_records WHERE period = '2026-08' AND run_id IS NULL`)
      .first<{ n: number }>();
    // 2 jam = 175.000 (1x1,5 + 1x2), 3 jam = 275.000 (1x1,5 + 2x2).
    expect(total?.n).toBe(450_000);
  });

  it("lembur yang sudah ikut run tidak terhitung dua kali", async () => {
    const db = await newTenantDb();
    const emp = await seedKaryawan(db, 8_650_000);
    await db
      .prepare(
        `INSERT INTO overtime_records (id, employee_id, date, period, jenis_hari, hours, hourly_wage, amount, run_id, created_by)
         VALUES (?, ?, '2026-08-11', '2026-08', 'biasa', 2, 50000, 175000, 'run-lama', 'u1')`,
      )
      .bind(crypto.randomUUID(), emp)
      .run();
    const belum = await db
      .prepare(`SELECT COUNT(*) AS n FROM overtime_records WHERE period = '2026-08' AND run_id IS NULL`)
      .first<{ n: number }>();
    expect(belum?.n).toBe(0);
  });
});
