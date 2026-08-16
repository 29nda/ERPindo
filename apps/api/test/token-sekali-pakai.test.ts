import { applyMigrations, CONTROL_PLANE_MIGRATIONS } from "@erpindo/db";
import { Hono } from "hono";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppEnv, Env } from "../src/env";
import { sha256Hex } from "../src/lib/crypto";
import { authRoutes } from "../src/routes/auth";
import { wrapSqlite, wrapSqliteLambat } from "./helpers/memdb";

/**
 * Token sekali-pakai (Fase 26c, temuan audit D).
 *
 * `consumeToken` dulu berjalan tiga langkah: SELECT baris → periksa `used_at` →
 * UPDATE. Dua permintaan yang tiba bersamaan karena itu sama-sama melihat token
 * "belum dipakai" sebelum salah satunya menandainya. Dampaknya paling nyata pada
 * reset sandi: satu tautan yang bocor (riwayat peramban, email yang diteruskan)
 * bisa dipakai lebih dari sekali, dan pemakaian kedua tidak meninggalkan jejak
 * yang berbeda dari yang pertama.
 *
 * Diuji lewat endpoint reset sandi SUNGGUHAN terhadap SQLite asli, bukan lewat
 * pemanggilan langsung fungsi internal: yang ingin dibuktikan adalah bahwa
 * seorang penyerang yang mengirim dua permintaan HTTP bersamaan hanya berhasil
 * sekali.
 */

const TOKEN = "token-reset-uji-1234567890";

let env: Env;
let app: Hono<AppEnv>;

async function siapkan(opts: { expiresAt?: string; usedAt?: string | null; lambat?: boolean } = {}) {
  const raw = new DatabaseSync(":memory:");
  const db = opts.lambat ? wrapSqliteLambat(raw) : wrapSqlite(raw);
  await applyMigrations(db, CONTROL_PLANE_MIGRATIONS);

  await db
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, email_verified, created_at)
       VALUES ('u1', 'budi@contoh.id', 'Budi', 'hash-lama', 1, datetime('now'))`,
    )
    .run();
  await db
    .prepare(
      `INSERT INTO tokens (id, token_hash, type, email, user_id, expires_at, used_at, created_at)
       VALUES ('tok1', ?, 'reset', 'budi@contoh.id', 'u1', ?, ?, datetime('now'))`,
    )
    .bind(
      await sha256Hex(TOKEN),
      opts.expiresAt ?? new Date(Date.now() + 3_600_000).toISOString(),
      opts.usedAt ?? null,
    )
    .run();

  env = { DB: db } as unknown as Env;
  app = new Hono<AppEnv>();
  app.route("/api/auth", authRoutes);
}

const reset = (sandi: string) =>
  app.request(
    "/api/auth/reset-password",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: TOKEN, password: sandi }),
    },
    env as Env,
  );

const sandiTersimpan = async () =>
  (await env.DB.prepare(`SELECT password_hash FROM users WHERE id = 'u1'`).first<{ password_hash: string }>())
    ?.password_hash;

beforeEach(async () => {
  await siapkan();
});

describe("token reset sandi — sekali pakai", () => {
  it("pemakaian pertama berhasil", async () => {
    const res = await reset("sandi-baru-pertama");
    expect(res.status).toBe(200);
    expect(await sandiTersimpan()).not.toBe("hash-lama");
  });

  it("pemakaian KEDUA ditolak", async () => {
    expect((await reset("sandi-baru-pertama")).status).toBe(200);
    const kedua = await reset("sandi-penyerang");
    expect(kedua.status).toBe(400);
  });

  /**
   * Dua uji balapan di bawah memakai DB yang MENUNDA setiap operasi satu putaran
   * event-loop (`wrapSqliteLambat`), meniru D1 yang setiap panggilannya
   * melintasi jaringan.
   *
   * Tanpa penundaan itu keduanya LULUS bahkan untuk kode yang rusak: `node:sqlite`
   * sinkron, jadi SELECT→periksa→UPDATE tidak pernah berselang-seling dan dua
   * permintaan "bersamaan" sebenarnya berurutan. Itu ditemukan dengan menyabotase
   * perbaikannya dan melihat uji ini tetap hijau — uji yang tidak bisa gagal
   * tidak menjaga apa pun.
   */
  it("DUA permintaan bersamaan → tepat SATU yang berhasil", async () => {
    await siapkan({ lambat: true });
    const hasil = await Promise.all([reset("sandi-paralel-a"), reset("sandi-paralel-b")]);
    const sukses = hasil.filter((r) => r.status === 200);
    expect(sukses.length).toBe(1);
  });

  it("LIMA permintaan bersamaan → tetap tepat satu", async () => {
    await siapkan({ lambat: true });
    const hasil = await Promise.all([1, 2, 3, 4, 5].map((i) => reset(`sandi-paralel-${i}`)));
    expect(hasil.filter((r) => r.status === 200).length).toBe(1);
  });

  it("token KEDALUWARSA ditolak, dan sandi tidak berubah", async () => {
    await siapkan({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect((await reset("sandi-baru")).status).toBe(400);
    expect(await sandiTersimpan()).toBe("hash-lama");
  });

  it("token yang SUDAH ditandai terpakai ditolak", async () => {
    await siapkan({ usedAt: new Date().toISOString() });
    expect((await reset("sandi-baru")).status).toBe(400);
    expect(await sandiTersimpan()).toBe("hash-lama");
  });
});
