import {
  API_KEY_PREFIX,
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_SIGNATURE_HEADER,
  type WebhookEvent,
} from "@erpindo/shared";
import { Hono } from "hono";
import { kerangkaHtml } from "../lib/kerangkaPublik";
import type { AppEnv, Env } from "../env";

/**
 * Halaman dokumentasi API publik (Fase 13h) — server-side rendered oleh Worker
 * (masuk `run_worker_first` di wrangler.jsonc) sehingga terindeks mesin pencari,
 * seperti blog. Statis: menjelaskan autentikasi Bearer, endpoint terkurasi,
 * dan verifikasi tanda tangan webhook. Tanpa aset eksternal.
 */

function origin(env: Env, reqUrl: string): string {
  return (env.APP_URL ?? new URL(reqUrl).origin).replace(/\/$/, "");
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] ?? ch);
}

function docsHtml(base: string): string {
  const eventsRows = WEBHOOK_EVENTS.map(
    (e: WebhookEvent) => `<tr><td><code>${esc(e)}</code></td><td>${esc(WEBHOOK_EVENT_LABELS[e])}</td></tr>`,
  ).join("\n");

  // Fase 38g — kerangka HTML sendiri diganti kerangka publik bersama. Yang
  // lama menampilkan `/logo.svg`, berkas yang TIDAK PERNAH ADA di repo ini,
  // disembunyikan `onerror` sehingga tidak seorang pun menyadarinya.
  return kerangkaHtml({
    title: "Dokumentasi API — ERPindo",
    description:
      "API publik ERPindo: autentikasi Bearer API key, endpoint kontak/produk/faktur/pembayaran/ringkasan, dan webhook peristiwa dengan tanda tangan HMAC.",
    canonical: `${base}/api-docs`,
    body: `
  <h1>Dokumentasi API ERPindo</h1>
  <p class="lead">Integrasikan toko online, aplikasi kasir, atau sistem internal Anda dengan ERPindo.
  API publik &amp; webhook <strong>termasuk dalam langganan</strong>, seperti seluruh modul lain.</p>

  <h2>1. Autentikasi</h2>
  <p>Buat <strong>API key</strong> di <em>Pengaturan → API &amp; Integrasi</em> (khusus Pemilik).
  Sertakan pada setiap permintaan lewat header <code>Authorization</code>:</p>
  <pre><code>Authorization: Bearer ${esc(API_KEY_PREFIX)}xxxxxxxxxxxxxxxx</code></pre>
  <p>Kunci punya skop <code>read</code> (baca-saja) atau <code>write</code> (baca &amp; tulis).
  Simpan kunci dengan aman — nilai penuh hanya ditampilkan sekali saat dibuat, dan bisa dicabut kapan saja.</p>
  <p>Semua endpoint bekerja pada data <strong>perusahaan pemilik kunci</strong> — tidak perlu ID perusahaan di URL.
  Basis URL: <code>${esc(base)}/api/v1</code></p>

  <h2>2. Endpoint</h2>
  <table>
    <tr><th>Metode</th><th>Jalur</th><th>Skop</th><th>Keterangan</th></tr>
    <tr><td><span class="method">GET</span></td><td><code>/contacts</code></td><td>read</td><td>Daftar kontak (pelanggan/pemasok)</td></tr>
    <tr><td><span class="method post">POST</span></td><td><code>/contacts</code></td><td>write</td><td>Buat kontak baru</td></tr>
    <tr><td><span class="method">GET</span></td><td><code>/products</code></td><td>read</td><td>Daftar produk</td></tr>
    <tr><td><span class="method post">POST</span></td><td><code>/products</code></td><td>write</td><td>Buat produk baru</td></tr>
    <tr><td><span class="method">GET</span></td><td><code>/invoices</code></td><td>read</td><td>Daftar faktur penjualan</td></tr>
    <tr><td><span class="method">GET</span></td><td><code>/payments</code></td><td>read</td><td>Daftar pembayaran</td></tr>
    <tr><td><span class="method">GET</span></td><td><code>/reports/summary</code></td><td>read</td><td>Ringkasan penjualan &amp; piutang bulan berjalan</td></tr>
  </table>
  <p>Parameter <code>?limit=</code> (maks 200) dan <code>?offset=</code> tersedia pada endpoint daftar.</p>

  <h3>Contoh: ambil daftar produk</h3>
  <pre><code>curl ${esc(base)}/api/v1/products \\
  -H "Authorization: Bearer ${esc(API_KEY_PREFIX)}xxxxxxxx"</code></pre>
  <pre><code>{
  "data": [
    { "id": "…", "sku": "BRG-001", "name": "Kopi 250g",
      "unit": "pcs", "sellPrice": 45000, "buyPrice": 30000, "minStock": 10 }
  ]
}</code></pre>

  <h3>Contoh: buat kontak (butuh skop write)</h3>
  <pre><code>curl -X POST ${esc(base)}/api/v1/contacts \\
  -H "Authorization: Bearer ${esc(API_KEY_PREFIX)}xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "type": "customer", "name": "PT Pelanggan Baru", "email": "po@pelanggan.co.id" }'</code></pre>

  <h2>3. Webhook</h2>
  <p>Daftarkan URL penerima di <em>Pengaturan → API &amp; Integrasi</em>. ERPindo mengirim
  <code>POST</code> JSON setiap kali peristiwa terjadi. Peristiwa yang tersedia:</p>
  <table>
    <tr><th>Peristiwa</th><th>Keterangan</th></tr>
    ${eventsRows}
  </table>
  <p>Contoh muatan (body):</p>
  <pre><code>{
  "event": "invoice.created",
  "tenantId": "…",
  "occurredAt": "2026-07-21T10:00:00.000Z",
  "data": { "id": "…", "invoiceNo": "INV-2026-07-0001", "total": 550000 }
}</code></pre>

  <h3>Verifikasi tanda tangan</h3>
  <p>Setiap pengiriman menyertakan header <code>${esc(WEBHOOK_SIGNATURE_HEADER)}</code> berisi
  <code>sha256=&lt;hex&gt;</code> — HMAC-SHA256 dari <strong>body mentah</strong> memakai
  <em>secret</em> webhook Anda. Hitung ulang dan bandingkan untuk memastikan keaslian:</p>
  <pre><code>// Node.js
import { createHmac } from "node:crypto";
const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
if (expected !== req.headers["${esc(WEBHOOK_SIGNATURE_HEADER.toLowerCase())}"]) {
  throw new Error("Tanda tangan webhook tidak valid");
}</code></pre>
  <p>Pengiriman yang gagal dicoba ulang otomatis dengan jeda bertambah (hingga 5 kali).
  Balas <code>2xx</code> secepatnya untuk menandai sukses.</p>

`,
  });
}

export const apiDocsRoutes = new Hono<AppEnv>().get("/api-docs", (c) => {
  const base = origin(c.env, c.req.url);
  return c.html(docsHtml(base));
});
