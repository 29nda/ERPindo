import { applyMigrations, CONTROL_PLANE_MIGRATIONS } from "@erpindo/db";
import { Hono } from "hono";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppEnv, Env } from "../src/env";
import { billingWebhookRoutes } from "../src/routes/billing";
import { wrapSqlite, wrapSqliteLambat } from "./helpers/memdb";

/**
 * Atomicity webhook pembayaran (Fase 26c, temuan audit C & F).
 *
 * Uji ini sengaja memakai **SQLite sungguhan**, bukan DB tiruan seperti
 * `billing.test.ts`. Alasannya langsung: yang diuji di sini adalah semantik
 * `UPDATE ... WHERE status != 'paid'` dan nilai `changes` yang dikembalikannya.
 * DB tiruan akan menjawab apa pun yang kita programkan, jadi ia bisa "lulus"
 * untuk kode yang sebetulnya rusak — persis kelas kebohongan yang membuat cacat
 * ini lolos sampai audit.
 *
 * Yang dikunci:
 *
 * - **Balapan.** Xendit mengirim `PAID` *dan* `SETTLED` untuk satu invoice, plus
 *   hingga 6× percobaan ulang saat balasan non-2xx. Pola lama (baca status →
 *   UPDATE tanpa syarat) membiarkan dua webhook bersamaan sama-sama lolos, dan
 *   `addMonths` berjalan dua kali: pelanggan mendapat sebulan gratis yang tidak
 *   muncul di laporan mana pun.
 * - **Jumlah bayar.** `paid_amount` dulu di-destructure lalu tidak pernah
 *   dipakai — langganan aktif semata-mata karena statusnya berbunyi PAID.
 */

const SECRET_KEY = "xnd_development_UJI";
const CALLBACK_TOKEN = "token-verifikasi-webhook-uji";
const ORDER_ID = "sub-uji-1";
const HARGA = 499_000;

let env: Env;
let kirim: (body: unknown) => Promise<Response>;

async function siapkan(opts: { amount?: number; endsAt?: string | null; lambat?: boolean } = {}) {
  const raw = new DatabaseSync(":memory:");
  const db = opts.lambat ? wrapSqliteLambat(raw) : wrapSqlite(raw);
  await applyMigrations(db, CONTROL_PLANE_MIGRATIONS);

  await db
    .prepare(
      `INSERT INTO tenants (id, name, slug, db_ref, status, plan, subscription_ends_at, created_at)
       VALUES ('t1', 'PT Uji', 'pt-uji', 'binding:TENANT_DB_1', 'provisioning', 'starter', ?, datetime('now'))`,
    )
    .bind(opts.endsAt ?? null)
    .run();
  await db
    .prepare(
      `INSERT INTO subscription_invoices (id, tenant_id, order_id, amount, period_months, status, plan, created_at)
       VALUES ('inv1', 't1', ?, ?, 1, 'pending', 'business', datetime('now'))`,
    )
    .bind(ORDER_ID, opts.amount ?? HARGA)
    .run();

  env = { DB: db, XENDIT_SECRET_KEY: SECRET_KEY, XENDIT_CALLBACK_TOKEN: CALLBACK_TOKEN } as unknown as Env;
  const app = new Hono<AppEnv>();
  app.route("/api/billing", billingWebhookRoutes);
  kirim = async (body: unknown) =>
    app.request(
      "/api/billing/notification",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-callback-token": CALLBACK_TOKEN },
        body: JSON.stringify(body),
      },
      env as Env,
    );
}

const tenant = () =>
  env.DB.prepare(`SELECT status, plan, subscription_ends_at FROM tenants WHERE id = 't1'`).first<{
    status: string;
    plan: string;
    subscription_ends_at: string | null;
  }>();

const hitungAudit = async (action: string) =>
  (
    await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_logs WHERE action = ?`).bind(action).first<{ n: number }>()
  )?.n ?? 0;

beforeEach(async () => {
  await siapkan();
});

describe("webhook langganan — transisi status atomik", () => {
  it("satu webhook PAID → langganan aktif, satu audit", async () => {
    const res = await kirim({ external_id: ORDER_ID, status: "PAID", paid_amount: HARGA });
    expect(res.status).toBe(200);
    const t = await tenant();
    expect(t?.status).toBe("active");
    expect(t?.plan).toBe("business");
    expect(await hitungAudit("billing.paid")).toBe(1);
  });

  /**
   * DB-nya sengaja yang MENUNDA tiap operasi (`wrapSqliteLambat`) — meniru D1
   * yang melintasi jaringan. Dengan SQLite sinkron biasa, dua webhook
   * "bersamaan" sebenarnya berjalan berurutan, dan uji ini akan lulus bahkan
   * untuk pola baca-lalu-tulis yang rusak.
   */
  it("DUA webhook PAID beriringan → tepat SATU perpanjangan dan SATU audit", async () => {
    await siapkan({ lambat: true });
    const [a, b] = await Promise.all([
      kirim({ external_id: ORDER_ID, status: "PAID", paid_amount: HARGA }),
      kirim({ external_id: ORDER_ID, status: "PAID", paid_amount: HARGA }),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(await hitungAudit("billing.paid")).toBe(1);

    // Bukti yang paling penting: tanggal akhir langganan hanya maju SEKALI.
    const t = await tenant();
    const akhir = new Date(t!.subscription_ends_at!);
    const sebulan = new Date();
    sebulan.setMonth(sebulan.getMonth() + 1);
    const selisihHari = Math.abs((akhir.getTime() - sebulan.getTime()) / 86_400_000);
    expect(selisihHari).toBeLessThan(2);
  });

  it("PAID lalu SETTLED (perilaku normal Xendit) → efeknya tetap satu kali", async () => {
    await kirim({ external_id: ORDER_ID, status: "PAID", paid_amount: HARGA });
    const kedua = await kirim({ external_id: ORDER_ID, status: "SETTLED", paid_amount: HARGA });
    expect(kedua.status).toBe(200);
    expect(await kedua.json()).toMatchObject({ ignored: "sudah-diproses" });
    expect(await hitungAudit("billing.paid")).toBe(1);
  });

  it("ulangan webhook yang sama persis → no-op aman, tetap 2xx", async () => {
    const payload = { external_id: ORDER_ID, status: "PAID", paid_amount: HARGA };
    await kirim(payload);
    for (let i = 0; i < 5; i++) expect((await kirim(payload)).status).toBe(200);
    expect(await hitungAudit("billing.paid")).toBe(1);
  });
});

describe("webhook langganan — invarian jumlah bayar", () => {
  it("KURANG bayar → langganan TIDAK aktif, invoice tetap pending, dicatat", async () => {
    const res = await kirim({ external_id: ORDER_ID, status: "PAID", paid_amount: HARGA - 1 });
    expect(res.status).toBe(200); // 2xx disengaja: mengulang tidak memperbaiki apa pun
    const t = await tenant();
    expect(t?.status).toBe("provisioning");
    expect(t?.plan).toBe("starter");
    expect(await hitungAudit("billing.jumlah_kurang")).toBe(1);
    expect(await hitungAudit("billing.paid")).toBe(0);

    const inv = await env.DB.prepare(`SELECT status FROM subscription_invoices WHERE id = 'inv1'`).first<{ status: string }>();
    expect(inv?.status).toBe("pending");
  });

  it("LEBIH bayar → tetap aktif (keputusan bisnis) tetapi ikut dicatat", async () => {
    const res = await kirim({ external_id: ORDER_ID, status: "PAID", paid_amount: HARGA + 50_000 });
    expect(res.status).toBe(200);
    expect((await tenant())?.status).toBe("active");
    expect(await hitungAudit("billing.jumlah_lebih")).toBe(1);
    expect(await hitungAudit("billing.paid")).toBe(1);
  });

  it("payload TANPA paid_amount tetap diterima — tidak semua peristiwa membawanya", async () => {
    const res = await kirim({ external_id: ORDER_ID, status: "PAID" });
    expect(res.status).toBe(200);
    expect((await tenant())?.status).toBe("active");
  });

  it("EXPIRED tidak mengaktifkan apa pun", async () => {
    await kirim({ external_id: ORDER_ID, status: "EXPIRED" });
    expect((await tenant())?.status).toBe("provisioning");
    const inv = await env.DB.prepare(`SELECT status FROM subscription_invoices WHERE id = 'inv1'`).first<{ status: string }>();
    expect(inv?.status).toBe("expired");
  });
});
