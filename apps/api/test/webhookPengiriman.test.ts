import { applyMigrations, CONTROL_PLANE_MIGRATIONS } from "@erpindo/db";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../src/env";
import { runWebhookDeliveries } from "../src/lib/webhooks";
import { wrapSqlite } from "./helpers/memdb";

/**
 * Kebijakan tujuan ditegakkan juga saat PENGIRIMAN (Fase 26d, temuan audit E).
 *
 * Menjaga hanya di pintu masuk (skema zod) tidak cukup, dan alasannya konkret:
 * baris webhook yang tersimpan **sebelum** kebijakan ini ada tidak pernah
 * melewati skema barunya, sementara `runWebhookDeliveries` membaca URL langsung
 * dari database. Validasi yang hanya berdiri di depan pintu tidak menjaga
 * apa pun bagi yang sudah berada di dalam.
 *
 * Uji ini mengganti cakupan yang hilang dari smoke: sejak kebijakan berlaku,
 * smoke tidak bisa lagi membuktikan pengiriman yang benar-benar sampai (sandbox
 * tidak punya egress, dan tujuan loopback kini ditolak). Yang justru lebih
 * penting tetap bisa dibuktikan di sini — bahwa `fetch` **tidak pernah
 * dipanggil** untuk tujuan terlarang.
 */

let env: Env;
let dipanggil: string[];
const fetchAsli = globalThis.fetch;

async function seedPengiriman(url: string) {
  const raw = new DatabaseSync(":memory:");
  const db = wrapSqlite(raw);
  await applyMigrations(db, CONTROL_PLANE_MIGRATIONS);
  await db
    .prepare(
      `INSERT INTO webhooks (id, tenant_id, url, secret, events, active, created_at)
       VALUES ('wh1', 't1', ?, 'whsec_uji', '["invoice.created"]', 1, datetime('now'))`,
    )
    .bind(url)
    .run();
  await db
    .prepare(
      `INSERT INTO webhook_deliveries (id, webhook_id, tenant_id, event, payload, status, attempts, next_attempt_at, created_at)
       VALUES ('d1', 'wh1', 't1', 'invoice.created', '{"event":"invoice.created"}', 'pending', 0, ?, datetime('now'))`,
    )
    .bind(new Date(Date.now() - 1000).toISOString())
    .run();
  env = { DB: db } as unknown as Env;
}

const pengiriman = () =>
  env.DB.prepare(`SELECT status, attempts, last_error FROM webhook_deliveries WHERE id = 'd1'`).first<{
    status: string;
    attempts: number;
    last_error: string | null;
  }>();

beforeEach(() => {
  dipanggil = [];
  globalThis.fetch = ((input: RequestInfo | URL) => {
    dipanggil.push(String(input));
    return Promise.resolve(new Response("ok", { status: 200 }));
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = fetchAsli;
});

describe("runWebhookDeliveries — kebijakan tujuan", () => {
  it("tujuan https publik DIKIRIM", async () => {
    await seedPengiriman("https://webhook.contoh.id/erpindo");
    const hasil = await runWebhookDeliveries(env, 10);
    expect(hasil.delivered).toBe(1);
    expect(dipanggil).toEqual(["https://webhook.contoh.id/erpindo"]);
    expect((await pengiriman())?.status).toBe("delivered");
  });

  for (const [nama, url] of [
    ["loopback", "http://127.0.0.1/hook"],
    ["http polos", "http://contoh.id/hook"],
    ["IP privat", "https://192.168.1.10/hook"],
    ["metadata link-local", "https://169.254.169.254/latest/meta-data"],
  ] as const) {
    it(`baris lama bertujuan ${nama} TIDAK pernah dihubungi`, async () => {
      await seedPengiriman(url);
      await runWebhookDeliveries(env, 10);
      // Inti uji: bukan sekadar "gagal", melainkan `fetch` tidak dipanggil sama
      // sekali. Gagal setelah menghubungi tetap berarti permintaan terkirim.
      expect(dipanggil).toEqual([]);
      const d = await pengiriman();
      expect(d?.attempts).toBe(1);
      expect(d?.last_error).toContain("tujuan-ditolak-kebijakan");
    });
  }
});
