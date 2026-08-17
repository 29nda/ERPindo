import { z } from "zod";

/**
 * API publik + webhook (Fase 13h) — pembeda paket Enterprise (modul `apiAccess`).
 * Integrator memakai API key per perusahaan (Bearer) untuk membaca/menulis
 * subset data terkurasi, dan webhook untuk menerima notifikasi peristiwa.
 */

/** Skop akses API key: baca-saja atau baca-tulis. */
export const API_SCOPES = ["read", "write"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

/** Prefix kunci publik agar mudah dikenali & dicabut bila bocor. */
export const API_KEY_PREFIX = "erpk_";

/** Peristiwa webhook yang bisa dilanggan integrator. */
export const WEBHOOK_EVENTS = ["invoice.created", "payment.received", "stock.low"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  "invoice.created": "Faktur penjualan dibuat",
  "payment.received": "Pembayaran diterima",
  "stock.low": "Stok menipis (di bawah minimum)",
};

/** Header tanda tangan HMAC-SHA256 pada setiap pengiriman webhook. */
export const WEBHOOK_SIGNATURE_HEADER = "X-Erpindo-Signature";

export const apiKeySchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(60),
  scope: z.enum(API_SCOPES).default("read"),
});
export type ApiKeyInput = z.infer<typeof apiKeySchema>;

/**
 * Kebijakan tujuan webhook keluar (Fase 26d, temuan audit E).
 *
 * `z.string().url()` hanya memeriksa BENTUK — ia meloloskan `http://localhost`,
 * `http://10.0.0.1`, `http://[::1]`, dan `http://169.254.169.254`. Sintaks URL
 * yang sah bukan validasi jaringan.
 *
 * Batas kejujurannya dinyatakan di muka: runtime-nya Cloudflare Workers, yang
 * tidak punya jaringan internal maupun endpoint metadata, sehingga pivot SSRF
 * klasik ala VM memang tidak berlaku di sini. Yang ditutup fungsi ini nyata dan
 * lebih membumi:
 *
 * 1. **`http://` polos** — payload webhook membawa data bisnis pelanggan dan
 *    ditandatangani HMAC; mengirimnya tanpa TLS membocorkan isinya ke jaringan
 *    mana pun yang dilewatinya.
 * 2. **Alamat loopback/privat/link-local** — tidak berguna sebagai tujuan nyata,
 *    dan menerimanya berarti menyimpan konfigurasi yang pasti gagal sekaligus
 *    membuka permukaan bila kelak kode ini berjalan di runtime lain.
 * 3. **Kredensial di dalam URL** (`https://user:sandi@…`) — tersimpan apa adanya
 *    di database dan ikut tercetak di log kegagalan.
 *
 * Yang TIDAK bisa dicegah di sini: DNS rebinding — nama yang sah saat disimpan
 * bisa menunjuk alamat lain saat dikirim. Mencegahnya butuh penyematan DNS yang
 * tidak tersedia di Workers. Dicatat, bukan diklaim tertutup.
 */
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function ipv4Terlarang(host: string): boolean {
  const m = IPV4_RE.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some((n) => Number.isNaN(n) || n > 255)) return true;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // privat
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + endpoint metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // privat
  if (a === 192 && b === 168) return true; // privat
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function ipv6Terlarang(host: string): boolean {
  // Hono/URL menyisakan kurung siku pada hostname IPv6.
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h.includes(":")) return false;
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (h.startsWith("fe80")) return true; // link-local
  if (/^f[cd]/.test(h)) return true; // unique-local fc00::/7
  /**
   * IPv4-mapped (`::ffff:127.0.0.1`) — bentuk penyamaran yang paling sering
   * dipakai. Dua bentuk harus ditangani, dan yang kedua nyaris tidak terlihat:
   * parser URL **menormalkan** `::ffff:127.0.0.1` menjadi `::ffff:7f00:1`.
   * Memeriksa bentuk bertitik saja karena itu lolos total di runtime.
   */
  const bertitik = /::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(h);
  if (bertitik) return ipv4Terlarang(bertitik[1]!);
  const heksa = /::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(h);
  if (heksa) {
    const tinggi = parseInt(heksa[1]!, 16);
    const rendah = parseInt(heksa[2]!, 16);
    const ipv4 = `${(tinggi >> 8) & 0xff}.${tinggi & 0xff}.${(rendah >> 8) & 0xff}.${rendah & 0xff}`;
    return ipv4Terlarang(ipv4);
  }
  return false;
}

/**
 * Paket `shared` sengaja tidak memuat lib DOM (`tsconfig.base.json` → ES2022),
 * jadi tipe `URL` global tidak tersedia di sini. Dideklarasikan seperlunya
 * alih-alih menulis parser URL sendiri: parser buatan sendiri berisiko
 * menyimpulkan host yang BERBEDA dari yang kelak benar-benar dihubungi `fetch`,
 * dan selisih itu persis tempat bypass tumbuh (mis. `https://baik.id\@10.0.0.1`).
 * Satu parser untuk memeriksa dan untuk memanggil.
 */
type UrlTerurai = { protocol: string; username: string; password: string; hostname: string };
const UrlCtor = (globalThis as unknown as { URL: new (input: string) => UrlTerurai }).URL;

export type AlasanUrlDitolak = "bentuk" | "skema" | "kredensial" | "host-internal";

/** `null` = boleh; selain itu alasan penolakan. */
export function alasanTolakUrlWebhook(raw: string): AlasanUrlDitolak | null {
  let u: UrlTerurai;
  try {
    u = new UrlCtor(raw.trim());
  } catch {
    return "bentuk";
  }
  if (u.protocol !== "https:") return "skema";
  if (u.username || u.password) return "kredensial";
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return "host-internal";
  if (ipv4Terlarang(host) || ipv6Terlarang(host)) return "host-internal";
  return null;
}

export function webhookUrlAman(raw: string): boolean {
  return alasanTolakUrlWebhook(raw) === null;
}

const PESAN_TOLAK: Record<AlasanUrlDitolak, string> = {
  bentuk: "URL webhook tidak valid",
  skema: "URL webhook harus memakai https://",
  kredensial: "URL webhook tidak boleh memuat nama pengguna/sandi",
  "host-internal": "URL webhook tidak boleh menunjuk alamat internal (localhost / IP privat)",
};

export const webhookSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .superRefine((val, ctx) => {
      const alasan = alasanTolakUrlWebhook(val);
      if (alasan) ctx.addIssue({ code: z.ZodIssueCode.custom, message: PESAN_TOLAK[alasan] });
    }),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, "Pilih minimal satu peristiwa")
    .max(WEBHOOK_EVENTS.length),
});
export type WebhookInput = z.infer<typeof webhookSchema>;

/** Metadata API key untuk UI (kunci penuh HANYA ditampilkan sekali saat dibuat). */
export type ApiApiKey = {
  id: string;
  name: string;
  scope: ApiScope;
  /** Prefix + beberapa karakter awal (mis. "erpk_ab12…") untuk identifikasi. */
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type ApiWebhook = {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  lastStatus: string | null;
  lastAttemptAt: string | null;
};

/** Hitung jeda percobaan ulang webhook (detik) — backoff eksponensial sederhana. */
export function webhookBackoffSeconds(attempt: number): number {
  // attempt 1→60s, 2→300s, 3→1500s, dst. (×5), dibatasi 6 jam.
  return Math.min(60 * Math.pow(5, Math.max(0, attempt - 1)), 6 * 3600);
}

/** Batas percobaan pengiriman webhook sebelum dianggap gagal permanen. */
export const WEBHOOK_MAX_ATTEMPTS = 5;
