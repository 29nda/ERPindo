import { dasarKomisi, forecastTertimbang, pencapaianTarget } from "@erpindo/shared";
import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "@erpindo/db";
import { newTenantDb } from "./helpers/memdb";

/**
 * Target & prakiraan penjualan di lapisan basis data (Fase 44b).
 *
 * Rumusnya diuji murni di `packages/shared/test/targetForecast.test.ts`. Yang
 * diuji di sini adalah dua hal yang hanya terlihat di skema: satu sales tidak
 * bisa punya dua target untuk bulan yang sama, dan realisasinya memakai dasar
 * yang PERSIS SAMA dengan komisi.
 */
async function seedSales(db: SqlExecutor, name: string): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO employees (id, name, ptkp_status, base_salary, allowances, is_active)
       VALUES (?, ?, 'TK/0', 5000000, 0, 1)`,
    )
    .bind(id, name)
    .run();
  return id;
}

const setTarget = (db: SqlExecutor, sales: string, period: string, amount: number) =>
  db
    .prepare(
      `INSERT INTO sales_targets (id, salesperson_id, period, target_amount, created_by)
       VALUES (?, ?, ?, ?, 'u1')
       ON CONFLICT (salesperson_id, period) DO UPDATE SET target_amount = excluded.target_amount`,
    )
    .bind(crypto.randomUUID(), sales, period, amount)
    .run();

describe("skema sales_targets", () => {
  it("migrasi 0052 membuat tabelnya", async () => {
    const db = await newTenantDb();
    const t = await db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sales_targets'`)
      .first<{ name: string }>();
    expect(t?.name).toBe("sales_targets");
  });

  it("satu sales hanya boleh punya satu target per bulan", async () => {
    // Dua baris akan membuat pencapaian bergantung pada baris mana yang
    // kebetulan terbaca lebih dulu.
    const db = await newTenantDb();
    const sales = await seedSales(db, "Rina");
    await setTarget(db, sales, "2026-10", 100_000_000);
    await setTarget(db, sales, "2026-10", 150_000_000);
    const rows = await db
      .prepare(`SELECT target_amount FROM sales_targets WHERE salesperson_id = ? AND period = '2026-10'`)
      .bind(sales)
      .all<{ target_amount: number }>();
    expect(rows.results).toHaveLength(1);
    // Revisi target di tengah jalan adalah hal wajar — yang terbaru menang.
    expect(rows.results[0]?.target_amount).toBe(150_000_000);
  });

  it("bulan berbeda untuk sales yang sama tetap boleh", async () => {
    const db = await newTenantDb();
    const sales = await seedSales(db, "Rina");
    await setTarget(db, sales, "2026-10", 100_000_000);
    await setTarget(db, sales, "2026-11", 120_000_000);
    const n = await db.prepare(`SELECT COUNT(*) AS n FROM sales_targets`).first<{ n: number }>();
    expect(n?.n).toBe(2);
  });

  it("target negatif ditolak skema tabelnya", async () => {
    const db = await newTenantDb();
    const sales = await seedSales(db, "Rina");
    await expect(setTarget(db, sales, "2026-10", -1)).rejects.toThrow();
  });
});

describe("realisasi memakai dasar yang sama dengan komisi", () => {
  it("faktur batal dan retur diperlakukan persis seperti pada komisi", () => {
    // Inilah alasan `dasarKomisi` dipakai ulang alih-alih menulis SUM sendiri.
    // Kalau target memakai total berPPN sedangkan komisi memakai subtotal, dua
    // angka di layar yang sama akan mengukur hal berbeda.
    const biasa = { subtotal: 10_000_000, cogs: 0, paidAmount: 0, total: 11_100_000, returnedAmount: 0 };
    expect(dasarKomisi(biasa, "omzet")).toBe(10_000_000);
    expect(dasarKomisi({ ...biasa, returnedAmount: 4_000_000 }, "omzet")).toBe(6_000_000);
    expect(dasarKomisi({ ...biasa, voidedAt: "2026-10-02" }, "omzet")).toBe(0);
  });

  it("pencapaian dihitung dari realisasi bersih itu", () => {
    const realisasi = dasarKomisi(
      { subtotal: 80_000_000, cogs: 0, paidAmount: 0, total: 0, returnedAmount: 5_000_000 },
      "omzet",
    );
    const p = pencapaianTarget(100_000_000, realisasi);
    expect(realisasi).toBe(75_000_000);
    expect(p.persen).toBe(75);
  });
});

describe("prakiraan dibaca dari pipeline yang masih berjalan", () => {
  it("hanya prospek berstatus open yang terbaca", async () => {
    const db = await newTenantDb();
    const sisip = (stage: string, nilai: number, status: string) =>
      db
        .prepare(
          `INSERT INTO leads (id, name, stage, est_value, status, created_by)
           VALUES (?, ?, ?, ?, ?, 'u1')`,
        )
        .bind(crypto.randomUUID(), `Prospek ${stage}`, stage, nilai, status)
        .run();
    await sisip("proposal", 100_000_000, "open");
    await sisip("new", 50_000_000, "open");
    await sisip("won", 900_000_000, "won");

    const { results } = await db
      .prepare(`SELECT stage, est_value FROM leads WHERE status = 'open'`)
      .all<{ stage: string; est_value: number }>();
    const f = forecastTertimbang(
      results.map((l) => ({ stage: l.stage as "new" | "proposal", estValue: l.est_value })),
    );
    // 60% x 100jt + 10% x 50jt = 65 juta. Yang sudah menang tidak ikut.
    expect(f.tertimbang).toBe(65_000_000);
    expect(f.kotor).toBe(150_000_000);
  });
});
