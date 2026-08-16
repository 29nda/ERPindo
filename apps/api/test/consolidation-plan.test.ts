import { applyMigrations, CONTROL_PLANE_MIGRATIONS } from "@erpindo/db";
import { Hono } from "hono";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppEnv, Env } from "../src/env";
import { sha256Hex } from "../src/lib/crypto";
import { consolidationRoutes } from "../src/routes/consolidation";
import { SESSION_COOKIE } from "../src/middleware/auth";
import { wrapSqlite } from "./helpers/memdb";

/**
 * Gerbang paket konsolidasi (Fase 26a temuan J1, dikoreksi Fase 26e).
 *
 * Tiga cabang, dan cabang PERTAMA-lah yang menjadi alasan berkas ini ada:
 * gerbang versi pertama menjawab 403 "tingkatkan paket" untuk pengguna yang
 * tidak memiliki perusahaan sama sekali. Itu keadaan akun demo publik — viewer
 * di perusahaan demo, pemilik nol tenant — sehingga pengunjung demo yang
 * mengeklik menu Konsolidasi disuguhi tawaran naik paket di dalam demo yang
 * paketnya sudah Enterprise.
 *
 * Cacat itu lolos seluruh gerbang mutu karena setiap fixture uji **memiliki**
 * tenant: smoke menguji paywall dengan menurunkan paket tenant milik user, dan
 * tidak ada satu pun uji yang memakai akun tanpa perusahaan. Uji ini menutup
 * lubang fixture itu, bukan sekadar mengunci perilakunya.
 */

const SESI = "sesi-uji-konsolidasi";

let env: Env;
let app: Hono<AppEnv>;

async function siapkan(tenants: { slug: string; plan: string; role: "owner" | "viewer" }[]) {
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
         VALUES (?, ?, ?, 'binding:TENANT_DB_1', 'active', ?, datetime('now'))`,
      )
      .bind(`t${i}`, `PT ${t.slug}`, t.slug, t.plan)
      .run();
    await db
      .prepare(`INSERT INTO memberships (id, user_id, tenant_id, role, created_at) VALUES (?, 'u1', ?, ?, datetime('now'))`)
      .bind(`m${i}`, `t${i}`, t.role)
      .run();
  }

  env = { DB: db } as unknown as Env;
  app = new Hono<AppEnv>();
  app.route("/api/consolidation", consolidationRoutes);
}

const companies = () =>
  app.request(
    "/api/consolidation/companies",
    { headers: { cookie: `${SESSION_COOKIE}=${SESI}` } },
    env as Env,
  );

beforeEach(async () => {
  await siapkan([]);
});

describe("gerbang paket konsolidasi", () => {
  it("TANPA perusahaan (keadaan akun demo) → 200 daftar kosong, BUKAN tawaran naik paket", async () => {
    // Akun demo publik adalah viewer di perusahaan demo dan tidak memiliki
    // tenant apa pun. Menawarinya "tingkatkan ke Enterprise" di dalam demo
    // berpaket Enterprise adalah pesan yang salah di layar yang paling terlihat.
    await siapkan([{ slug: "pt-demo", plan: "enterprise", role: "viewer" }]);
    const res = await companies();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ companies: [] });
  });

  it("benar-benar tanpa keanggotaan apa pun → tetap 200 kosong", async () => {
    const res = await companies();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ companies: [] });
  });

  it("pemilik perusahaan STARTER saja → 403 plan-upgrade-required (paywall J1 tetap)", async () => {
    await siapkan([{ slug: "pt-starter", plan: "starter", role: "owner" }]);
    const res = await companies();
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ detail: "plan-upgrade-required", requiredPlan: "enterprise" });
  });

  it("pemilik perusahaan ENTERPRISE → 200 berisi perusahaannya", async () => {
    await siapkan([{ slug: "pt-ent", plan: "enterprise", role: "owner" }]);
    const res = await companies();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { companies: { tenantId: string }[] };
    expect(body.companies).toHaveLength(1);
  });

  it("campuran: satu Enterprise di antara Starter → tetap berhak", async () => {
    await siapkan([
      { slug: "pt-starter", plan: "starter", role: "owner" },
      { slug: "pt-ent", plan: "enterprise", role: "owner" },
    ]);
    expect((await companies()).status).toBe(200);
  });

  it("laporan ikut aturan yang sama — bukan hanya daftar perusahaan", async () => {
    await siapkan([{ slug: "pt-starter", plan: "starter", role: "owner" }]);
    const res = await app.request(
      "/api/consolidation/income-statement?from=2026-01-01&to=2026-01-31",
      { headers: { cookie: `${SESSION_COOKIE}=${SESI}` } },
      env as Env,
    );
    expect(res.status).toBe(403);
  });
});
