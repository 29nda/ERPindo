import { applyMigrations, CONTROL_PLANE_MIGRATIONS } from "@erpindo/db";
import { Hono } from "hono";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppEnv, Env } from "../src/env";
import { sha256Hex } from "../src/lib/crypto";
import { consolidationRoutes } from "../src/routes/consolidation";
import { SESSION_COOKIE } from "../src/middleware/auth";
import { newTenantDb, wrapSqlite } from "./helpers/memdb";

/**
 * Akses konsolidasi (Fase 26a temuan J1 → 26e → **paywall dicabut Fase 30**).
 *
 * ## Apa yang berubah, dan apa yang TIDAK
 *
 * Berkas ini dulu mengunci sebuah **paywall**: konsolidasi dijual sebagai
 * pembeda paket Enterprise, jadi pemilik perusahaan Starter dijawab 403
 * `plan-upgrade-required`. Paket bertingkat dibubarkan, jadi asersi itu hilang.
 *
 * Yang TIDAK boleh ikut hilang — dan karena itulah berkas ini tetap ada — adalah
 * batas yang sesungguhnya: **kepemilikan**. Endpoint ini di-mount di
 * `/api/consolidation`, DI LUAR `/api/tenants/:tenantId/`, sehingga
 * `enforceTenantAccessByPath` tidak menjangkaunya sama sekali. Satu-satunya
 * yang menahannya adalah klausa `m.role = 'owner'` di kueri.
 *
 * Mencabut paywall tanpa membuktikan batas itu masih berdiri akan mengubah
 * pembongkaran harga menjadi kebocoran data lintas perusahaan — persis kelas
 * kesalahan yang paling mudah dibuat saat menghapus gerbang.
 *
 * Cabang "nol perusahaan" (Fase 26e) tetap diuji: gerbang versi pertama
 * menjawab 403 "tingkatkan paket" kepada akun demo publik — viewer di
 * perusahaan demo, pemilik nol tenant — sehingga pengunjung demo yang mengeklik
 * Konsolidasi disuguhi tawaran naik paket di dalam demo. Cacat itu lolos
 * seluruh gerbang mutu karena setiap fixture uji lain **memiliki** tenant.
 */

const SESI = "sesi-uji-konsolidasi";

let env: Env;
let app: Hono<AppEnv>;

async function siapkan(tenants: { slug: string; role: "owner" | "viewer" }[]) {
  const raw = new DatabaseSync(":memory:");
  const db = wrapSqlite(raw);
  await applyMigrations(db, CONTROL_PLANE_MIGRATIONS);

  await db
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, email_verified, created_at)
       VALUES ('u1', 'uji@contoh.id', 'Uji', 'hash', 1, datetime('now'))`,
    )
    .run();
  await db
    .prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, 'u1', datetime('now'), ?)`)
    .bind(await sha256Hex(SESI), new Date(Date.now() + 86_400_000).toISOString())
    .run();

  for (const [i, t] of tenants.entries()) {
    await db
      .prepare(
        `INSERT INTO tenants (id, name, slug, db_ref, status, plan, created_at)
         VALUES (?, ?, ?, 'binding:TENANT_DB_1', 'active', 'lengkap', datetime('now'))`,
      )
      .bind(`t${i}`, `PT ${t.slug}`, t.slug)
      .run();
    await db
      .prepare(`INSERT INTO memberships (id, user_id, tenant_id, role, created_at) VALUES (?, 'u1', ?, ?, datetime('now'))`)
      .bind(`m${i}`, `t${i}`, t.role)
      .run();
  }

  // Binding DB tenant nyata (skema penuh dari TENANT_MIGRATIONS). Sebelum
  // Fase 30 ini tak pernah dibutuhkan: uji laporan selalu ditolak paywall
  // SEBELUM menyentuh database tenant. Tanpa paywall, jalur laporannya kini
  // benar-benar dijalankan — dan itu justru menjadikan ujinya lebih kuat,
  // karena ia membuktikan laporan sungguh terbit, bukan sekadar tidak 403.
  env = { DB: db, TENANT_DB_1: await newTenantDb() } as unknown as Env;
  app = new Hono<AppEnv>();
  app.route("/api/consolidation", consolidationRoutes);
}

const companies = () =>
  app.request(
    "/api/consolidation/companies",
    { headers: { cookie: `${SESSION_COOKIE}=${SESI}` } },
    env as Env,
  );

const labaRugi = () =>
  app.request(
    "/api/consolidation/income-statement?from=2026-01-01&to=2026-01-31",
    { headers: { cookie: `${SESSION_COOKIE}=${SESI}` } },
    env as Env,
  );

beforeEach(async () => {
  await siapkan([]);
});

describe("akses konsolidasi (paywall dicabut Fase 30)", () => {
  it("TANPA perusahaan (keadaan akun demo) → 200 daftar kosong, BUKAN tawaran naik paket", async () => {
    await siapkan([{ slug: "pt-demo", role: "viewer" }]);
    const res = await companies();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ companies: [] });
  });

  it("benar-benar tanpa keanggotaan apa pun → tetap 200 kosong", async () => {
    const res = await companies();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ companies: [] });
  });

  it("pemilik satu perusahaan → 200 berisi perusahaannya (tanpa syarat paket)", async () => {
    await siapkan([{ slug: "pt-satu", role: "owner" }]);
    const res = await companies();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { companies: { tenantId: string }[] };
    expect(body.companies).toHaveLength(1);
  });

  it("pemilik beberapa perusahaan → semuanya ikut terkonsolidasi", async () => {
    await siapkan([
      { slug: "pt-satu", role: "owner" },
      { slug: "pt-dua", role: "owner" },
    ]);
    const res = await companies();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { companies: { tenantId: string }[] };
    expect(body.companies).toHaveLength(2);
  });

  it("TIDAK ADA lagi respons plan-upgrade-required di jalur mana pun", async () => {
    // Penegak pencabutan: bila seseorang memasang kembali gerbang paket di
    // sini, ujinya gagal — bukan diam-diam lolos karena kebetulan tak ada
    // fixture berpaket rendah lagi.
    await siapkan([{ slug: "pt-satu", role: "owner" }]);
    for (const res of [await companies(), await labaRugi()]) {
      expect(res.status).not.toBe(403);
      expect(JSON.stringify(await res.json())).not.toContain("plan-upgrade-required");
    }
  });

  it("VIEWER tetap tidak ikut mengkonsolidasi — batas kepemilikan masih berdiri", async () => {
    // Inti pembedaan Fase 30: yang dicabut adalah paywall, BUKAN keamanan.
    // Rute ini di luar `/api/tenants/:tenantId/`, jadi `enforceTenantAccessByPath`
    // tidak menjaganya; satu-satunya penahan adalah `m.role = 'owner'`.
    await siapkan([
      { slug: "pt-milik-orang-lain", role: "viewer" },
      { slug: "pt-milik-saya", role: "owner" },
    ]);
    const { companies: daftar } = (await (await companies()).json()) as {
      companies: { tenantId: string; name: string }[];
    };
    expect(daftar).toHaveLength(1);
    expect(daftar[0]!.name).toBe("PT pt-milik-saya");
  });

  it("laporan konsolidasi benar-benar terbit untuk pemilik", async () => {
    await siapkan([{ slug: "pt-satu", role: "owner" }]);
    const res = await labaRugi();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      companies: unknown[];
      income: unknown[];
      expense: unknown[];
      totalIncome: number;
    };
    expect(body.companies).toHaveLength(1);
    expect(Array.isArray(body.income)).toBe(true);
    expect(Array.isArray(body.expense)).toBe(true);
    // Perusahaan baru tanpa transaksi → laporan terbit dengan angka nol,
    // bukan galat. Itulah bedanya "tidak ada data" dengan "tidak boleh akses".
    expect(body.totalIncome).toBe(0);
  });
});
