import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { AppEnv, Env } from "../src/env";
import { billingConfigured, billingModeUji, billingWebhookRoutes, buatInvoiceXendit, tokenCallbackXenditValid } from "../src/routes/billing";

/**
 * Fase 11b — webhook billing; Fase 25a — providernya Xendit, bukan Midtrans.
 * Jalur aktivasi diuji lewat control-plane DB tiruan; pemanggilan API Xendit
 * diuji dengan `fetch` tiruan. Yang teruji di sini adalah REAKSI kami terhadap
 * jawaban Xendit — bukan Xendit-nya.
 */

const SECRET_KEY = "xnd_development_UJI";
const CALLBACK_TOKEN = "token-verifikasi-webhook-uji";

describe("tokenCallbackXenditValid", () => {
  it("terima token yang sama persis; tolak yang berbeda, kosong, atau tak terpasang", () => {
    expect(tokenCallbackXenditValid(CALLBACK_TOKEN, CALLBACK_TOKEN)).toBe(true);
    expect(tokenCallbackXenditValid(CALLBACK_TOKEN, "token-salah-panjang-sama!")).toBe(false);
    // Panjang berbeda: keluar lebih awal, dan itu memang tidak membocorkan apa pun.
    expect(tokenCallbackXenditValid(CALLBACK_TOKEN, "pendek")).toBe(false);
    expect(tokenCallbackXenditValid(CALLBACK_TOKEN, null)).toBe(false);
    // Token belum dipasang di secret → TIDAK boleh menjadi "terima apa saja".
    expect(tokenCallbackXenditValid(undefined, CALLBACK_TOKEN)).toBe(false);
  });
});

/**
 * Checkout tidak boleh menyala tanpa token webhook.
 *
 * Dengan secret key saja, pelanggan BISA membayar sungguhan tetapi setiap
 * webhook ditolak 403 — uang masuk, langganan tak pernah aktif, database tenant
 * tak pernah dibuat. Uji ini mengunci sebabnya (kedua kunci wajib), bukan
 * gejalanya.
 */
describe("billingConfigured", () => {
  it("butuh SECRET_KEY *dan* CALLBACK_TOKEN", () => {
    expect(billingConfigured({ XENDIT_SECRET_KEY: SECRET_KEY, XENDIT_CALLBACK_TOKEN: CALLBACK_TOKEN } as Env)).toBe(true);
    expect(billingConfigured({ XENDIT_SECRET_KEY: SECRET_KEY } as Env)).toBe(false);
    expect(billingConfigured({ XENDIT_CALLBACK_TOKEN: CALLBACK_TOKEN } as Env)).toBe(false);
    expect(billingConfigured({} as Env)).toBe(false);
  });
});

describe("billingModeUji", () => {
  it("kunci xnd_development → mode uji; kunci produksi → bukan", () => {
    expect(billingModeUji({ XENDIT_SECRET_KEY: "xnd_development_abc" } as Env)).toBe(true);
    expect(billingModeUji({ XENDIT_SECRET_KEY: "xnd_production_abc" } as Env)).toBe(false);
    expect(billingModeUji({} as Env)).toBe(false);
  });
});

/**
 * Bentuk permintaan ke Xendit. Diuji karena satu nama field yang salah membuat
 * checkout gagal 100% di produksi sementara seluruh gerbang lokal tetap hijau —
 * tidak ada satu pun uji lain di repo ini yang menyentuh api.xendit.co.
 */
describe("buatInvoiceXendit", () => {
  it("mengirim external_id/amount/redirect + mengembalikan invoice_url", async () => {
    let dikirim: { url: string; init: RequestInit } | null = null;
    const aslinya = globalThis.fetch;
    globalThis.fetch = ((url: string, init: RequestInit) => {
      dikirim = { url, init };
      return Promise.resolve(new Response(JSON.stringify({ invoice_url: "https://checkout.xendit.co/web/abc" }), { status: 200 }));
    }) as typeof fetch;
    try {
      const hasil = await buatInvoiceXendit({ XENDIT_SECRET_KEY: SECRET_KEY } as Env, {
        orderId: "sub-abc-1",
        amount: 499000,
        itemName: "Langganan ERPindo Starter (1 bulan)",
        customerEmail: "pemilik@contoh.com",
        finishUrl: "https://app.contoh.com/app/pengaturan",
      });
      expect(hasil).toEqual({ ok: true, redirectUrl: "https://checkout.xendit.co/web/abc" });
      const kirim = dikirim as unknown as { url: string; init: RequestInit };
      expect(kirim.url).toBe("https://api.xendit.co/v2/invoices");
      expect((kirim.init.headers as Record<string, string>).authorization).toBe(`Basic ${btoa(`${SECRET_KEY}:`)}`);
      const body = JSON.parse(String(kirim.init.body)) as Record<string, unknown>;
      expect(body.external_id).toBe("sub-abc-1");
      expect(body.amount).toBe(499000);
      expect(body.currency).toBe("IDR");
      expect(body.success_redirect_url).toBe("https://app.contoh.com/app/pengaturan");
    } finally {
      globalThis.fetch = aslinya;
    }
  });

  it("respons tanpa invoice_url → gagal anggun (pesan untuk pengguna, bukan lemparan)", async () => {
    const aslinya = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(new Response(JSON.stringify({ message: "INVALID_API_KEY" }), { status: 401 }))) as typeof fetch;
    try {
      const hasil = await buatInvoiceXendit({ XENDIT_SECRET_KEY: SECRET_KEY } as Env, {
        orderId: "sub-abc-2",
        amount: 499000,
        itemName: "Langganan",
        finishUrl: "https://app.contoh.com/app/pengaturan",
      });
      expect(hasil.ok).toBe(false);
    } finally {
      globalThis.fetch = aslinya;
    }
  });
});

/**
 * Control-plane DB tiruan untuk jalur webhook (1 invoice + 1 tenant).
 *
 * Fase 24: tenant kini punya `db_ref`, dan webhook memakainya untuk memutuskan
 * apakah database perlu dibuat. Tiruan ini menyajikan barisnya lewat
 * `SELECT … FROM tenants WHERE id = ?` supaya jalur provisioning benar-benar
 * terlewati — tanpa itu, helper-nya menyimpulkan "tenant hilang" dan ujinya
 * hijau atas alasan yang salah.
 */
function fakeDb(state: {
  invoice: { id: string; order_id: string; tenant_id: string; status: string; period_months: number; plan?: string; amount?: number } | null;
  tenant: { status: string; plan: string; subscription_ends_at: string | null; db_ref?: string };
  audits: unknown[];
}) {
  return {
    prepare(sql: string) {
      // Fase 26c: `run()` kini mengembalikan `meta.changes` seperti D1, karena
      // transisi status pembayaran ditegakkan lewat compare-and-set —
      // `UPDATE … WHERE status != 'paid'` — dan efek hilirnya hanya berjalan
      // bila baris benar-benar berubah. Tiruan yang selalu menjawab `{}`
      // akan membuat webhook menyimpulkan "sudah diproses" untuk semua orang.
      const run = (params: unknown[]) => {
        if (/UPDATE subscription_invoices SET status = 'paid'/.test(sql)) {
          // Meniru `WHERE id = ? AND status != 'paid'`.
          if (state.invoice && state.invoice.status !== "paid") {
            state.invoice.status = "paid";
            return Promise.resolve({ meta: { changes: 1 } });
          }
          return Promise.resolve({ meta: { changes: 0 } });
        } else if (/UPDATE subscription_invoices SET status = 'expired'/.test(sql)) {
          // Meniru `WHERE … AND status = 'pending'` — invoice yang sudah lunas
          // tidak boleh berubah jadi kedaluwarsa oleh webhook susulan.
          if (state.invoice && state.invoice.status === "pending") state.invoice.status = "expired";
        } else if (/UPDATE tenants SET status = 'active'/.test(sql)) {
          state.tenant.status = "active";
          state.tenant.plan = String(params[0]);
          state.tenant.subscription_ends_at = String(params[1]);
        } else if (/UPDATE tenants SET db_ref = \?/.test(sql)) {
          // Idempotensi ditegakkan SQL: `WHERE … AND db_ref = ''`. Tiruan ini
          // meniru syarat itu, bukan mengabaikannya — kalau diabaikan, uji
          // webhook-kedua akan hijau tanpa membuktikan apa pun.
          if (state.tenant.db_ref === "") state.tenant.db_ref = String(params[0]);
        } else if (/UPDATE payment_links SET status = 'paid'/.test(sql)) {
          return Promise.resolve({ meta: { changes: 1 } });
        } else if (/INSERT INTO audit_logs/.test(sql)) {
          state.audits.push(params);
        }
        return Promise.resolve({});
      };
      const first = () => {
        if (/FROM subscription_invoices si JOIN tenants/.test(sql)) {
          if (!state.invoice) return Promise.resolve(null);
          return Promise.resolve({
            id: state.invoice.id,
            tenant_id: state.invoice.tenant_id,
            status: state.invoice.status,
            // Fase 26c: dibandingkan dengan `paid_amount` dari Xendit.
            amount: state.invoice.amount ?? 499_000,
            period_months: state.invoice.period_months,
            subscription_ends_at: state.tenant.subscription_ends_at,
            // Fase 13b: paket yang diaktifkan = paket yang dibeli (tersimpan di invoice).
            plan: state.invoice.plan ?? "business",
          });
        }
        if (/SELECT id, name, slug, db_ref FROM tenants WHERE id = \?/.test(sql)) {
          return Promise.resolve({
            id: "t1",
            name: "PT Uji",
            slug: "pt-uji",
            // Bawaan: tenant lama yang SUDAH punya database, sehingga webhook
            // tidak mencoba membuatnya lagi.
            db_ref: state.tenant.db_ref ?? "binding:TENANT_DB_1",
          });
        }
        return Promise.resolve(null);
      };
      const handle = (params: unknown[]) => ({ run: () => run(params), first, all: () => Promise.resolve({ results: [] }) });
      return { bind: (...p: unknown[]) => handle(p), run: () => run([]), first, all: () => Promise.resolve({ results: [] }) };
    },
  };
}

function appWithDb(env: Partial<Env>, token: string | null = CALLBACK_TOKEN) {
  const app = new Hono<AppEnv>();
  app.route("/api/billing", billingWebhookRoutes);
  return (body: unknown) =>
    app.request(
      "/api/billing/notification",
      {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { "x-callback-token": token } : {}) },
        body: JSON.stringify(body),
      },
      env as Env,
    );
}

/**
 * Database tenant tiruan untuk satu slot pool. `sqlite_master` dijawab kosong
 * supaya penjaga slot-bekas (Fase 23c) menganggapnya benar-benar baru.
 */
function fakePoolDb(onMigrate?: () => void) {
  return {
    prepare(sql: string) {
      if (/CREATE TABLE|INSERT INTO/.test(sql)) onMigrate?.();
      const hasil = { results: [] as unknown[] };
      const stmt = {
        all: () => Promise.resolve(hasil),
        run: () => Promise.resolve({}),
        first: () => Promise.resolve(null),
      };
      return { bind: () => stmt, ...stmt };
    },
  };
}

/** Payload webhook invoice Xendit. */
function notif(over: Record<string, unknown> = {}) {
  return { id: "xnd-inv-1", external_id: "sub-abc-1", status: "PAID", paid_amount: 499000, ...over };
}

/** Env berkunci Xendit — dipakai hampir semua uji webhook di bawah. */
function envXendit(over: Partial<Env>): Partial<Env> {
  return { XENDIT_SECRET_KEY: SECRET_KEY, XENDIT_CALLBACK_TOKEN: CALLBACK_TOKEN, ...over };
}

describe("webhook notifikasi billing", () => {
  it("tanpa kunci → diabaikan sopan (200)", async () => {
    const call = appWithDb({});
    const res = await call(notif());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ignored: true });
  });

  it("token callback salah → 403", async () => {
    const state = { invoice: { id: "i1", order_id: "sub-abc-1", tenant_id: "t1", status: "pending", period_months: 1 }, tenant: { status: "past_due", plan: "starter", subscription_ends_at: null }, audits: [] };
    const call = appWithDb(envXendit({ DB: fakeDb(state) as unknown as Env["DB"] }), "token-palsu");
    const res = await call(notif());
    expect(res.status).toBe(403);
    expect(state.tenant.status).toBe("past_due"); // tak berubah
  });

  it("tanpa header x-callback-token → 403", async () => {
    const state = { invoice: { id: "i1", order_id: "sub-abc-1", tenant_id: "t1", status: "pending", period_months: 1 }, tenant: { status: "past_due", plan: "starter", subscription_ends_at: null }, audits: [] };
    const call = appWithDb(envXendit({ DB: fakeDb(state) as unknown as Env["DB"] }), null);
    const res = await call(notif());
    expect(res.status).toBe(403);
    expect(state.tenant.status).toBe("past_due");
  });

  it("PAID + token sah → invoice lunas + tenant aktif + langganan diperpanjang", async () => {
    const state = { invoice: { id: "i1", order_id: "sub-abc-1", tenant_id: "t1", status: "pending", period_months: 1, plan: "business" }, tenant: { status: "provisioning", plan: "starter", subscription_ends_at: null as string | null }, audits: [] as unknown[] };
    const call = appWithDb(envXendit({ DB: fakeDb(state) as unknown as Env["DB"] }));
    const res = await call(notif());
    expect(res.status).toBe(200);
    expect(state.invoice.status).toBe("paid");
    expect(state.tenant.status).toBe("active");
    expect(state.tenant.plan).toBe("business"); // paket yang dibeli diaktifkan
    expect(state.tenant.subscription_ends_at).toBeTruthy();
    expect(Date.parse(state.tenant.subscription_ends_at as string)).toBeGreaterThan(Date.now());
    expect(state.audits.length).toBe(1);
  });

  // --- Fase 24: pembayaran pertama itulah yang membuatkan database ----------
  //
  // Sejak registrasi berhenti membuat database, webhook inilah satu-satunya
  // jalur normal yang mengubah "akun terdaftar" jadi "perusahaan yang bisa
  // dipakai". Kalau ia diam-diam berhenti melakukannya, pelanggan membayar dan
  // tetap tidak bisa masuk — dan tidak ada gerbang lain yang akan melihatnya.

  it("tenant tanpa database → webhook membuatkan database & mengisi db_ref", async () => {
    const state = {
      invoice: { id: "i1", order_id: "sub-abc-1", tenant_id: "t1", status: "pending", period_months: 1, plan: "starter" },
      tenant: { status: "provisioning", plan: "starter", subscription_ends_at: null as string | null, db_ref: "" },
      audits: [] as unknown[],
    };
    const db = fakeDb(state);
    const call = appWithDb(
      envXendit({
        DB: db as unknown as Env["DB"],
        TENANT_DB_MODE: "local",
        TENANT_DB_1: fakePoolDb() as unknown as D1Database,
      }),
    );
    const res = await call(notif());
    expect(res.status).toBe(200);
    expect(state.tenant.db_ref).toBe("binding:TENANT_DB_1");
    // Tidak ada catatan kegagalan provisioning.
    expect(state.audits.map((a) => (a as unknown[])[3])).not.toContain("billing.provisioning_tertunda");
  });

  // CATATAN: uji ini menjaga penjaga `invoice.status !== 'paid'` — BUKAN
  // idempotensi provisioning. Versi pertamanya diberi nama seolah menguji yang
  // kedua dan tetap hijau ketika penjaga `db_ref` dilumpuhkan, karena webhook
  // kedua tidak pernah sampai ke sana. Idempotensi `db_ref` diuji di tempat
  // penjaganya benar-benar tinggal: test/tenantDb.test.ts.
  it("webhook KEDUA untuk order yang sama tidak memperpanjang langganan dua kali", async () => {
    const state = {
      invoice: { id: "i1", order_id: "sub-abc-1", tenant_id: "t1", status: "pending", period_months: 1, plan: "starter" },
      tenant: { status: "provisioning", plan: "starter", subscription_ends_at: null as string | null, db_ref: "binding:TENANT_DB_1" },
      audits: [] as unknown[],
    };
    const call = appWithDb(
      envXendit({
        DB: fakeDb(state) as unknown as Env["DB"],
        TENANT_DB_MODE: "local",
        TENANT_DB_1: fakePoolDb() as unknown as D1Database,
      }),
    );
    const pesan = notif();
    await call(pesan);
    const setelahPertama = state.tenant.subscription_ends_at;
    const auditPertama = state.audits.length;

    await call(pesan);
    expect(state.tenant.subscription_ends_at).toBe(setelahPertama);
    expect(state.audits.length).toBe(auditPertama);
  });

  it("order tak dikenal → diabaikan (200) tanpa efek", async () => {
    const state = { invoice: null, tenant: { status: "provisioning", plan: "starter", subscription_ends_at: null }, audits: [] };
    const call = appWithDb(envXendit({ DB: fakeDb(state) as unknown as Env["DB"] }));
    const res = await call(notif({ external_id: "sub-tak-dikenal" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ignored: true });
    expect(state.tenant.status).toBe("provisioning");
  });

  // SETTLED bisa menjadi webhook PERTAMA yang kita lihat untuk sebagian metode
  // pembayaran. Menunggu PAID yang tidak akan datang berarti pelanggan yang
  // sudah membayar tetap tertahan — dan tidak ada yang akan melaporkannya.
  it("SETTLED (tanpa PAID mendahului) juga mengaktifkan langganan", async () => {
    const state = { invoice: { id: "i1", order_id: "sub-abc-1", tenant_id: "t1", status: "pending", period_months: 1, plan: "starter" }, tenant: { status: "provisioning", plan: "starter", subscription_ends_at: null as string | null }, audits: [] as unknown[] };
    const call = appWithDb(envXendit({ DB: fakeDb(state) as unknown as Env["DB"] }));
    const res = await call(notif({ status: "SETTLED" }));
    expect(res.status).toBe(200);
    expect(state.invoice.status).toBe("paid");
    expect(state.tenant.status).toBe("active");
  });

  it("EXPIRED → invoice ditandai kedaluwarsa, tenant TIDAK diaktifkan", async () => {
    const state = { invoice: { id: "i1", order_id: "sub-abc-1", tenant_id: "t1", status: "pending", period_months: 1, plan: "starter" }, tenant: { status: "provisioning", plan: "starter", subscription_ends_at: null as string | null }, audits: [] as unknown[] };
    const call = appWithDb(envXendit({ DB: fakeDb(state) as unknown as Env["DB"] }));
    const res = await call(notif({ status: "EXPIRED" }));
    expect(res.status).toBe(200);
    expect(state.invoice.status).toBe("expired");
    expect(state.tenant.status).toBe("provisioning");
  });
});

/** Control-plane tiruan untuk jalur payment link faktur (Fase 11d). */
function fakeLinkDb(state: { link: { id: string; tenant_id: string; invoice_no: string; status: string } | null; audits: unknown[] }) {
  return {
    prepare(sql: string) {
      const run = () => {
        if (/UPDATE payment_links SET status = 'paid'/.test(sql)) {
          // Fase 26c: transisinya compare-and-set (`WHERE … AND status != 'paid'`),
          // dan audit `collection.paid` hanya ditulis untuk baris yang benar-benar
          // berubah. Tiruan meniru syarat itu, bukan mengabaikannya.
          if (state.link && state.link.status !== "paid") {
            state.link.status = "paid";
            return Promise.resolve({ meta: { changes: 1 } });
          }
          return Promise.resolve({ meta: { changes: 0 } });
        } else if (/UPDATE payment_links SET status = \?/.test(sql)) {
          if (state.link && state.link.status === "pending") state.link.status = "expired";
        } else if (/INSERT INTO audit_logs/.test(sql)) {
          state.audits.push(sql);
        }
        return Promise.resolve({});
      };
      const first = () => {
        if (/FROM subscription_invoices si JOIN tenants/.test(sql)) return Promise.resolve(null);
        if (/FROM payment_links WHERE order_id/.test(sql)) return Promise.resolve(state.link);
        return Promise.resolve(null);
      };
      const handle = () => ({ run, first, all: () => Promise.resolve({ results: [] }) });
      return { bind: () => handle(), run, first, all: () => Promise.resolve({ results: [] }) };
    },
  };
}

describe("webhook payment link faktur (Fase 11d)", () => {
  it("PAID pada order faktur → link ditandai lunas + audit collection.paid", async () => {
    const state = { link: { id: "l1", tenant_id: "t1", invoice_no: "INV-1", status: "pending" }, audits: [] as unknown[] };
    const app = new Hono<AppEnv>();
    app.route("/api/billing", billingWebhookRoutes);
    const env = { XENDIT_SECRET_KEY: SECRET_KEY, XENDIT_CALLBACK_TOKEN: CALLBACK_TOKEN, DB: fakeLinkDb(state) as unknown as Env["DB"] } as unknown as Env;
    const body = notif({ external_id: "inv-abcd1234-99" });
    const res = await app.request(
      "/api/billing/notification",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-callback-token": CALLBACK_TOKEN },
        body: JSON.stringify(body),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(state.link.status).toBe("paid");
    expect(state.audits.length).toBe(1);
  });

});
