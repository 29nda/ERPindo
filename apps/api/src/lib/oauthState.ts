import type { Env } from "../env";
import { generateToken, sha256Hex } from "./crypto";

/**
 * State OAuth sekali-pakai yang terikat pemulainya (Fase 26b, temuan audit B).
 *
 * Yang menggantikan apa: sebelumnya state **dihitung** dari rahasia klien —
 * `sha256("drive-state|<tenantId>|<secret>")` untuk Drive dan
 * `sha256("google-login|<secret>")` untuk login. Keduanya punya cacat yang sama
 * dan cacat itu tidak kelihatan dari bentuknya: nilainya **tetap**. Tanpa
 * kedaluwarsa, bisa dipakai ulang berkali-kali, dan tidak terikat pada sesi
 * siapa pun. Untuk login bahkan konstan untuk semua orang sekaligus, sementara
 * endpoint yang menerbitkannya publik — artinya siapa pun bisa mengambil state
 * yang "sah" hanya dengan memulai alur sendiri.
 *
 * Empat sifat yang harus dipenuhi state OAuth, dan bagaimana ia dipenuhi di sini:
 *
 * 1. **Tak tertebak** — 32 byte acak (`generateToken`), bukan turunan rahasia.
 * 2. **Berumur pendek** — 10 menit; cukup untuk layar izin Google, terlalu
 *    singkat untuk tautan yang disimpan lalu dikirim ke korban belakangan.
 * 3. **Sekali pakai** — ditukar lewat `DELETE ... WHERE id = ?` dan yang menjadi
 *    buktinya adalah `changes === 1` dari penghapusan itu sendiri. Bukan
 *    baca-lalu-tandai, yang bisa dibalap dua permintaan bersamaan.
 * 4. **Terikat pemulainya** — `session_id` untuk alur yang sudah punya sesi
 *    (Drive), dan cookie nonce untuk alur yang belum (login Google).
 *
 * Yang disimpan di database adalah **hash** state-nya, bukan nilainya: baris
 * tabel ini bisa terbaca oleh siapa pun yang bisa membaca database, dan state
 * yang bocor dari sana sama saja dengan tidak punya state.
 */

/** Umur state: cukup untuk menyelesaikan layar izin Google, tidak lebih. */
const TTL_DETIK = 600;

export type TujuanState = "drive" | "login-google";

export type StateTerpakai = {
  purpose: TujuanState;
  tenantId: string | null;
  sessionId: string | null;
};

/**
 * Terbitkan state baru. Mengembalikan nilai mentah yang dikirim ke Google —
 * hanya hash-nya yang disimpan.
 */
export async function buatState(
  env: Env,
  input: { purpose: TujuanState; tenantId?: string | null; sessionId?: string | null },
): Promise<string> {
  const raw = generateToken();
  const expiresAt = new Date(Date.now() + TTL_DETIK * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO oauth_states (id, purpose, tenant_id, session_id, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      await sha256Hex(raw),
      input.purpose,
      input.tenantId ?? null,
      input.sessionId ?? null,
      expiresAt,
      new Date().toISOString(),
    )
    .run();

  // Sapu state kedaluwarsa sekalian — murah, dan menjaga tabel tetap kecil tanpa
  // perlu satu cron sendiri untuk sesuatu sesederhana ini.
  await env.DB.prepare(`DELETE FROM oauth_states WHERE expires_at < ?`).bind(new Date().toISOString()).run();
  return raw;
}

/**
 * Tukar state. Mengembalikan isinya bila sah, `null` bila tidak ada, sudah
 * dipakai, atau kedaluwarsa.
 *
 * Penghapusan dilakukan LEBIH DULU dan hasilnya (`changes`) yang menjadi
 * pemeriksaan: dua permintaan bersamaan dengan state yang sama hanya membuat
 * satu di antaranya mendapat `changes === 1`. Membaca dulu lalu menghapus akan
 * membuat keduanya lolos — bentuk cacat yang sama dengan temuan audit D.
 */
export async function pakaiState(
  env: Env,
  raw: string,
  syarat: { purpose: TujuanState; sessionId?: string | null },
): Promise<StateTerpakai | null> {
  if (!raw) return null;
  const id = await sha256Hex(raw);

  const baris = await env.DB.prepare(
    `SELECT purpose, tenant_id, session_id, expires_at FROM oauth_states WHERE id = ?`,
  )
    .bind(id)
    .first<{ purpose: string; tenant_id: string | null; session_id: string | null; expires_at: string }>();
  if (!baris) return null;

  // Hapus apa pun hasilnya: state yang gagal dipakai tetap habis. Kalau tidak,
  // state yang ditolak karena salah sesi bisa dicoba ulang tanpa batas sampai
  // sesi yang cocok kebetulan membukanya.
  const hapus = await env.DB.prepare(`DELETE FROM oauth_states WHERE id = ?`).bind(id).run();
  if ((hapus as { meta?: { changes?: number } }).meta?.changes !== 1) return null; // dibalap request lain

  if (baris.purpose !== syarat.purpose) return null;
  if (new Date(baris.expires_at).getTime() < Date.now()) return null;
  // Ikatan sesi: state hanya boleh ditukar oleh sesi yang menerbitkannya.
  if (baris.session_id && baris.session_id !== (syarat.sessionId ?? null)) return null;

  return {
    purpose: baris.purpose as TujuanState,
    tenantId: baris.tenant_id,
    sessionId: baris.session_id,
  };
}
