import {
  webhookUrlAman,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_SIGNATURE_HEADER,
  webhookBackoffSeconds,
  type WebhookEvent,
} from "@erpindo/shared";
import type { Env } from "../env";
import { hmacSha256Hex } from "./crypto";

/**
 * Webhook keluar (Fase 13h). `emitWebhook` mengantre satu pengiriman per
 * webhook aktif yang melanggan peristiwa; `runWebhookDeliveries` (dipanggil cron)
 * mengirim antrean dengan tanda tangan HMAC + retry berjenjang. Kegagalan
 * mengantre TIDAK boleh menggagalkan transaksi bisnis — dibungkus try/catch.
 */

function nowIso(): string {
  return new Date().toISOString();
}

/** Antre pengiriman webhook untuk sebuah peristiwa tenant. Best-effort. */
export async function emitWebhook(
  env: Env,
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, events FROM webhooks WHERE tenant_id = ? AND active = 1`,
    )
      .bind(tenantId)
      .all<{ id: string; events: string }>();
    if (results.length === 0) return;

    const payload = JSON.stringify({ event, tenantId, occurredAt: nowIso(), data });
    const stmts = [];
    for (const wh of results) {
      let events: string[] = [];
      try {
        events = JSON.parse(wh.events) as string[];
      } catch {
        events = [];
      }
      if (!events.includes(event)) continue;
      stmts.push(
        env.DB.prepare(
          `INSERT INTO webhook_deliveries (id, webhook_id, tenant_id, event, payload, status, attempts, next_attempt_at, created_at)
           VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
        ).bind(crypto.randomUUID(), wh.id, tenantId, event, payload, nowIso(), nowIso()),
      );
    }
    if (stmts.length > 0) await env.DB.batch(stmts);
  } catch (err) {
    console.error(`[webhook] gagal mengantre ${event} untuk tenant ${tenantId}:`, err);
  }
}

/**
 * Kirim satu payload ke URL webhook dengan tanda tangan HMAC. Mengembalikan
 * status HTTP (atau 0 bila galat jaringan). Timeout 10 detik.
 */
async function deliverOne(url: string, secret: string, payload: string): Promise<{ ok: boolean; status: number; error?: string }> {
  /**
   * Kebijakan tujuan ditegakkan ULANG di sini, bukan hanya di skema (Fase 26d,
   * temuan audit E).
   *
   * Alasannya bukan kehati-hatian berlebih: baris webhook yang tersimpan
   * SEBELUM kebijakan ini ada tidak pernah melewati skema barunya, dan
   * `runWebhookDeliveries` membaca URL langsung dari database. Validasi yang
   * hanya berdiri di pintu masuk tidak menjaga apa pun bagi data yang sudah
   * berada di dalam.
   */
  if (!webhookUrlAman(url)) {
    return { ok: false, status: 0, error: "tujuan-ditolak-kebijakan" };
  }
  const signature = await hmacSha256Hex(secret, payload);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [WEBHOOK_SIGNATURE_HEADER]: `sha256=${signature}`,
      },
      body: payload,
      signal: ctrl.signal,
      // Redirect TIDAK diikuti: tujuan publik yang sah bisa membalas 302 ke
      // alamat internal, dan pemeriksaan di atas hanya melihat URL pertama.
      // Membiarkannya berarti kebijakan tujuan hanya berlaku satu lompatan.
      redirect: "manual",
    });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "network-error" };
  }
}

/**
 * Susun ulang batch supaya satu pelanggan tidak menghabiskan gilirannya sendiri
 * (Fase 57b).
 *
 * Batch diambil `ORDER BY next_attempt_at ASC LIMIT 100`. Satu tenant yang
 * ramai — impor besar, penutupan kasir, apa pun yang memancarkan ratusan
 * peristiwa sekaligus — mengisi seluruh seratus itu, dan pelanggan lain
 * menunggu di belakangnya. Setiap batch. Ini kelas yang sama dengan ekor tenant
 * pada Fase 57a: giliran yang tidak digilir bukan antrean, melainkan tembok.
 *
 * Yang dikerjakan di sini bukan mengubah siapa yang masuk batch, melainkan
 * URUTAN di dalamnya: satu pengiriman per webhook secara bergiliran, lalu
 * putaran berikutnya. Kalau anggarannya habis di tengah, yang sudah terlayani
 * tersebar rata alih-alih menumpuk pada satu pelanggan.
 */
export function giliranAdil<T extends { webhook_id: string }>(baris: T[]): T[] {
  const perWebhook = new Map<string, T[]>();
  for (const b of baris) {
    const daftar = perWebhook.get(b.webhook_id);
    if (daftar) daftar.push(b);
    else perWebhook.set(b.webhook_id, [b]);
  }
  const hasil: T[] = [];
  // Map mempertahankan urutan sisip, jadi webhook yang antriannya paling lama
  // menunggu tetap mendapat giliran pertama di tiap putaran.
  for (let putaran = 0; hasil.length < baris.length; putaran++) {
    for (const daftar of perWebhook.values()) {
      const item = daftar[putaran];
      if (item) hasil.push(item);
    }
  }
  return hasil;
}

/**
 * Proses antrean pengiriman webhook yang jatuh tempo. Dipanggil cron (dan bisa
 * dipicu manual di uji). `limit` menjaga anggaran waktu cron.
 */
export async function runWebhookDeliveries(
  env: Env,
  limit = 50,
  budgetMs = 20_000,
): Promise<{ delivered: number; failed: number; retried: number; ditunda: number }> {
  const mulai = Date.now();
  const now = nowIso();
  const { results } = await env.DB.prepare(
    `SELECT d.id, d.webhook_id, d.payload, d.attempts, w.url, w.secret
     FROM webhook_deliveries d JOIN webhooks w ON w.id = d.webhook_id
     WHERE d.status = 'pending' AND d.next_attempt_at <= ?
     ORDER BY d.next_attempt_at ASC, d.id ASC LIMIT ?`,
  )
    .bind(now, limit)
    .all<{ id: string; webhook_id: string; payload: string; attempts: number; url: string; secret: string }>();

  let delivered = 0;
  let failed = 0;
  let retried = 0;
  let ditunda = 0;

  for (const d of giliranAdil(results)) {
    /*
     * ANGGARAN WAKTU (Fase 57b).
     *
     * Tiap pengiriman boleh menghabiskan sampai 10 detik (batas waktu di
     * `deliverOne`). Satu batch berisi seratus, jadi tanpa anggaran, batch yang
     * seluruh tujuannya menggantung menuntut hampir tiga jam — dan penangan
     * cron akan dimatikan jauh sebelum itu.
     *
     * Yang membuatnya buruk bukan pekerjaan yang tertunda, melainkan apa yang
     * TIDAK tercatat: baris yang penangannya mati sebelum sempat di-UPDATE
     * tetap `pending` dengan `next_attempt_at` yang sama DAN `attempts` yang
     * sama. Ia jatuh tempo lagi seketika, terurut paling depan lagi, lalu
     * menggantung lagi. Percobaannya tidak pernah bertambah, jadi
     * `WEBHOOK_MAX_ATTEMPTS` tidak pernah tercapai: satu tujuan yang menggantung
     * memblokir antrean SELURUH platform, selamanya, tanpa satu baris log pun.
     *
     * Berhenti rapi menyisakan sisanya untuk jalan berikutnya — dengan keadaan
     * yang tercatat, bukan terulang.
     */
    if (Date.now() - mulai > budgetMs) {
      ditunda++;
      continue;
    }
    const attempt = d.attempts + 1;
    /*
     * Tiap pengiriman dibungkus sendiri (Fase 57b, kelas Fase 54g).
     *
     * Aturan "kegagalan satu tidak boleh membatalkan sisanya" sudah diputuskan
     * pada Fase 54g dan dijaga `cronKetahanan.test.ts` — tetapi penjaganya hanya
     * membaca `scheduled()` di `index.ts`. Kerja blok webhook ada DI SINI, satu
     * panggilan fungsi di seberang batas berkas itu, jadi gelung ini tidak
     * pernah tersentuh aturannya. Kelas yang sama dengan glob `pages/*.tsx`
     * (Fase 20m): aturan yang benar, ditegakkan di tempat ia ditulis, bukan di
     * tempat ia berlaku.
     */
    try {
    const result = await deliverOne(d.url, d.secret, d.payload);
    const lastStatus = result.ok ? `ok ${result.status}` : result.error ? `error ${result.error}` : `http ${result.status}`;

    if (result.ok) {
      await env.DB.prepare(`UPDATE webhook_deliveries SET status = 'delivered', attempts = ?, last_error = NULL WHERE id = ?`)
        .bind(attempt, d.id)
        .run();
      delivered++;
    } else if (attempt >= WEBHOOK_MAX_ATTEMPTS) {
      await env.DB.prepare(`UPDATE webhook_deliveries SET status = 'failed', attempts = ?, last_error = ? WHERE id = ?`)
        .bind(attempt, lastStatus, d.id)
        .run();
      failed++;
    } else {
      const next = new Date(Date.now() + webhookBackoffSeconds(attempt) * 1000).toISOString();
      await env.DB.prepare(`UPDATE webhook_deliveries SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?`)
        .bind(attempt, next, lastStatus, d.id)
        .run();
      retried++;
    }

    // Ringkasan status terakhir di webhook (untuk UI). Waktunya diambil saat
    // percobaan, bukan saat batch dimulai: pada batch yang panjang keduanya
    // bisa berselisih menit, dan yang ditampilkan ke pemilik adalah "kapan
    // terakhir dicoba".
    await env.DB.prepare(`UPDATE webhooks SET last_status = ?, last_attempt_at = ? WHERE id = ?`)
      .bind(lastStatus, nowIso(), d.webhook_id)
      .run();
    } catch (err) {
      // Baris ini tetap `pending`; jalan berikutnya mengambilnya lagi.
      console.error(`[webhook] pengiriman ${d.id} galat:`, err);
    }
  }

  if (ditunda > 0) {
    console.log(`[webhook] anggaran waktu habis — ${ditunda} pengiriman ditunda ke jalan berikutnya`);
  }
  return { delivered, failed, retried, ditunda };
}
