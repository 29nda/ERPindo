import type { Plan, Role } from "@erpindo/shared";

/** Antarmuka minimal Workers AI — binding opsional (hanya terpasang di produksi). */
export type WorkersAi = {
  run(model: string, options: Record<string, unknown>): Promise<unknown>;
};

export type Env = {
  DB: D1Database;
  RATE_KV: KVNamespace;
  ASSETS: Fetcher;

  /** Workers AI (Asisten erpindo). Opsional: absen di dev/CI → endpoint AI membalas 503. */
  AI?: WorkersAi;

  // Pool database tenant untuk mode lokal (lihat wrangler.jsonc).
  TENANT_DB_1?: D1Database;
  TENANT_DB_2?: D1Database;
  TENANT_DB_3?: D1Database;
  TENANT_DB_4?: D1Database;
  TENANT_DB_5?: D1Database;
  TENANT_DB_6?: D1Database;

  TENANT_DB_MODE: "local" | "cloudflare";
  /** Opsional: override URL publik aplikasi; default origin request. */
  APP_URL?: string;

  /**
   * Paksa blok tugas bulanan (penyusutan, rekap, backup) berjalan di hari apa
   * pun. Hanya untuk suite pengujian: tanpa ini jalur email rekap bulanan cuma
   * bisa diuji pada tanggal 1–3 tiap bulan, yang berarti hampir tak pernah.
   */
  MONTHLY_JOBS_OVERRIDE?: string;
  /**
   * Fase 21d: memaksa blok jurnal penutup tahunan berjalan dengan `asOf` ini.
   * Tanpa itu jalurnya hanya hidup 1–3 Januari — tiga hari SETAHUN.
   */
  YEARLY_JOBS_OVERRIDE?: string;
  /**
   * Fase 21d: memaku tanggal transaksi POS. POS satu-satunya modul yang memakai
   * jam server, sehingga tanpa ini asersi bertanggal tetap di smoke berubah
   * hasil mengikuti kalender nyata.
   */
  POS_DATE_OVERRIDE?: string;

  /**
   * Fase 22b: URL sumber kurs referensi harian. **Absen = fitur mati** —
   * pola degradasi anggun yang sama dengan binding opsional lain, bukan
   * kegagalan keras. Bentuk yang diharapkan: `{ base: "IDR", rates: {…} }`.
   */
  KURS_SOURCE_URL?: string;
  /**
   * Fase 22b: payload kurs siap pakai yang MENGGANTIKAN pengambilan lewat
   * jaringan. Hanya untuk suite pengujian — gerbang tidak boleh bergantung
   * pada layanan pihak ketiga yang bisa mati, berubah bentuk, atau membatasi
   * laju. Jalur `fetch()` sungguhannya karena itu TIDAK teruji; dinyatakan
   * apa adanya di log fase, bukan ditutup cek yang seolah menguji.
   */
  KURS_PAYLOAD_OVERRIDE?: string;

  /**
   * Daftar email (dipisah koma, case-insensitive) yang mendapat tenant
   * aktif permanen tanpa batasan langganan — dipakai untuk akun pemilik.
   * Disimpan sebagai secret di produksi agar email tidak masuk repo.
   */
  COMPED_EMAILS?: string;

  /**
   * Override slug perusahaan demo publik (Fase 10b). Default
   * "pt-demo-sejahtera"; suite uji menunjuk tenant lain karena pool DB
   * tenant lokal terbatas.
   */
  DEMO_TENANT_SLUG?: string;

  /**
   * Daftar email (dipisah koma, case-insensitive) yang boleh membuka
   * dashboard admin platform /app/admin (Fase 10e). Disimpan sebagai secret
   * di produksi — tanpa var ini endpoint /api/admin selalu 403.
   */
  PLATFORM_ADMIN_EMAILS?: string;

  // Secret opsional (produksi).
  /** OAuth Google (backup Drive, Fase 8b). Tanpa keduanya fitur Drive nonaktif anggun. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;

  /**
   * Billing langganan Xendit (Fase 25a; menggantikan Midtrans dari Fase 11b).
   * Tanpa kunci, seluruh fitur billing degradasi anggun (UI menampilkan
   * instruksi, checkout 503).
   *
   * `XENDIT_SECRET_KEY` — Secret Key dashboard Xendit. Uji vs produksi
   * ditentukan **prefiks kuncinya** (`xnd_development_…` / `xnd_production_…`),
   * bukan host: keduanya memakai api.xendit.co yang sama.
   * `XENDIT_CALLBACK_TOKEN` — Webhook Verification Token; dibandingkan dengan
   * header `x-callback-token` tiap webhook masuk.
   */
  XENDIT_SECRET_KEY?: string;
  XENDIT_CALLBACK_TOKEN?: string;
};

/** Data yang disematkan middleware auth ke konteks Hono. */
export type AuthedUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  sessionId: string;
};

export type TenantContext = {
  id: string;
  name: string;
  slug: string;
  dbRef: string;
  status: string;
  role: Role;
  plan: Plan;
  legacyFullAccess: boolean;
};

export type AppVariables = {
  user: AuthedUser;
  tenant: TenantContext;
};

export type AppEnv = { Bindings: Env; Variables: AppVariables };
