import { applyMigrations, CONTROL_PLANE_MIGRATIONS } from "@erpindo/db";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../src/env";
import { buatState, pakaiState } from "../src/lib/oauthState";
import { wrapSqlite } from "./helpers/memdb";

/**
 * State OAuth sekali-pakai (Fase 26b, temuan audit B).
 *
 * Yang diuji di sini adalah empat sifat yang membuat sebuah state OAuth berguna,
 * dan implementasi lama **tidak memenuhi satu pun** darinya: ia menghitung state
 * dari `sha256(tenantId + client_secret)`, sehingga nilainya tetap selamanya,
 * bisa dipakai ulang tanpa batas, dan tidak terikat sesi siapa pun.
 *
 * Uji "sesi lain ditolak" adalah yang paling penting: itulah yang menghentikan
 * skenario penautan akun — penyerang menyelesaikan izin Google atas akun MILIK
 * DIA, lalu membuat korban membuka URL callback-nya. Cookie sesi ERPindo
 * ber-`SameSite=Lax` tetap terkirim pada navigasi GET tingkat-atas, jadi korban
 * yang sekadar mengeklik tautan sudah cukup untuk menyelesaikan alur itu — dan
 * refresh token penyerang tersimpan sebagai integrasi Drive tenant korban.
 */
function envUji(): Env {
  const raw = new DatabaseSync(":memory:");
  const db = wrapSqlite(raw);
  return { DB: db } as unknown as Env;
}

let env: Env;

beforeEach(async () => {
  env = envUji();
  await applyMigrations(env.DB, CONTROL_PLANE_MIGRATIONS);
});

describe("buatState / pakaiState", () => {
  it("state sah dari sesi yang sama → diterima, dan isinya kembali utuh", async () => {
    const state = await buatState(env, { purpose: "drive", tenantId: "tenant-1", sessionId: "sesi-a" });
    const hasil = await pakaiState(env, state, { purpose: "drive", sessionId: "sesi-a" });
    expect(hasil?.tenantId).toBe("tenant-1");
    expect(hasil?.purpose).toBe("drive");
  });

  it("SEKALI PAKAI: penukaran kedua ditolak", async () => {
    const state = await buatState(env, { purpose: "drive", tenantId: "tenant-1", sessionId: "sesi-a" });
    expect(await pakaiState(env, state, { purpose: "drive", sessionId: "sesi-a" })).not.toBeNull();
    expect(await pakaiState(env, state, { purpose: "drive", sessionId: "sesi-a" })).toBeNull();
  });

  it("SESI LAIN ditolak — inti penambal penautan akun", async () => {
    // Penyerang memulai alur dari sesinya sendiri…
    const state = await buatState(env, { purpose: "drive", tenantId: "tenant-korban", sessionId: "sesi-penyerang" });
    // …lalu korban yang membuka callback-nya.
    expect(await pakaiState(env, state, { purpose: "drive", sessionId: "sesi-korban" })).toBeNull();
  });

  it("state yang gagal dipakai ikut habis — tidak bisa dicoba ulang sampai cocok", async () => {
    const state = await buatState(env, { purpose: "drive", tenantId: "t", sessionId: "sesi-a" });
    expect(await pakaiState(env, state, { purpose: "drive", sessionId: "sesi-salah" })).toBeNull();
    // Sesi yang BENAR pun tidak lagi bisa memakainya: percobaan gagal tetap
    // menghabiskan state, sehingga tidak ada jendela untuk menebak berulang.
    expect(await pakaiState(env, state, { purpose: "drive", sessionId: "sesi-a" })).toBeNull();
  });

  it("KEDALUWARSA ditolak", async () => {
    const state = await buatState(env, { purpose: "drive", tenantId: "t", sessionId: "sesi-a" });
    // Majukan waktu dengan memundurkan expires_at langsung di baris.
    await env.DB.prepare(`UPDATE oauth_states SET expires_at = ?`).bind("2000-01-01T00:00:00.000Z").run();
    expect(await pakaiState(env, state, { purpose: "drive", sessionId: "sesi-a" })).toBeNull();
  });

  it("TUJUAN silang ditolak — state login tidak bisa dipakai menyambungkan Drive", async () => {
    const state = await buatState(env, { purpose: "login-google" });
    expect(await pakaiState(env, state, { purpose: "drive", sessionId: null })).toBeNull();
  });

  it("state karangan / kosong ditolak", async () => {
    expect(await pakaiState(env, "", { purpose: "drive", sessionId: "sesi-a" })).toBeNull();
    expect(await pakaiState(env, "state-karangan", { purpose: "drive", sessionId: "sesi-a" })).toBeNull();
  });

  it("TIDAK TERTEBAK: state tidak diturunkan dari tenant — dua penerbitan berbeda", async () => {
    // Implementasi lama menghasilkan nilai yang SAMA untuk tenant yang sama,
    // selamanya. Ini yang membuat kebocoran satu kali berlaku permanen.
    const a = await buatState(env, { purpose: "drive", tenantId: "tenant-1", sessionId: "sesi-a" });
    const b = await buatState(env, { purpose: "drive", tenantId: "tenant-1", sessionId: "sesi-a" });
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("nilai mentah TIDAK disimpan — hanya hash-nya", async () => {
    const state = await buatState(env, { purpose: "drive", tenantId: "t", sessionId: "sesi-a" });
    const baris = await env.DB.prepare(`SELECT id FROM oauth_states`).first<{ id: string }>();
    expect(baris?.id).toBeTruthy();
    expect(baris?.id).not.toBe(state);
  });

  it("state alur login (tanpa sesi) tetap bisa ditukar", async () => {
    // Ikatan peramban untuk alur ini ada di cookie nonce, bukan session_id —
    // lihat `LOGIN_STATE_COOKIE` di routes/authGoogle.ts.
    const state = await buatState(env, { purpose: "login-google" });
    expect(await pakaiState(env, state, { purpose: "login-google" })).not.toBeNull();
  });
});
