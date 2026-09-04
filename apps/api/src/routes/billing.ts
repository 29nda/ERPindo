import type { ApiSubscriptionInvoice, BillingStatus, Plan, Role, TenantStatus } from "@erpindo/shared";
import { biayaKaryawanTambahan, checkoutSchema, hargaPaket, PLAN_LABELS, PLAN_LIMITS } from "@erpindo/shared";
import { hitungKaryawanDiAtasJatah } from "../lib/kapasitas";
import { Hono } from "hono";
import type { AppEnv, Env } from "../env";
import { audit } from "../lib/audit";
import { samaAman } from "../lib/crypto";
import { getTenantDb, pastikanTenantTerprovisi, TANPA_DB } from "../lib/tenantDb";
import { requireAuth } from "../middleware/auth";
import { appOrigin, clientIp } from "./auth";

/**
 * Billing langganan via Xendit Invoice API (Fase 25a; sebelumnya Midtrans Snap,
 * Fase 11b) — pemblokir launching #1.
 *
 * Alur: Owner menekan "Berlangganan" → `POST /checkout` membuat
 * subscription_invoice + invoice Xendit → mengembalikan `invoice_url` (dipakai
 * redirect ke halaman bayar Xendit — aman terhadap CSP `script-src 'self'`
 * karena tidak menyuntikkan skrip pihak ketiga). Setelah bayar, Xendit memanggil
 * `POST /api/billing/notification`; header `x-callback-token` diverifikasi lalu
 * invoice ditandai lunas + tenant.status jadi 'active' dengan
 * subscription_ends_at diperpanjang 1 bulan.
 *
 * Pemetaan istilah (sengaja TIDAK mengubah skema DB):
 *   subscription_invoices.order_id      → `external_id` Xendit
 *   subscription_invoices.redirect_url  → `invoice_url` Xendit
 *   transaction_status                  → status Xendit (PAID/SETTLED/EXPIRED)
 *
 * Tanpa XENDIT_SECRET_KEY seluruh fitur degradasi anggun: status tetap bisa
 * dilihat, checkout membalas 503, webhook membalas 200 (diabaikan).
 * Semua data billing di control-plane (c.env.DB — punya .first()).
 */

const XENDIT_INVOICE_ENDPOINT = "https://api.xendit.co/v2/invoices";

/**
 * Checkout menyala hanya bila **kedua** kunci terpasang.
 *
 * Token webhook ikut dihitung, dan itu bukan kehati-hatian berlebihan: dengan
 * secret key saja, checkout aktif dan pelanggan **benar-benar bisa membayar** —
 * tetapi setiap webhook Xendit ditolak 403, diulang 6× lalu menyerah. Hasil
 * akhirnya uang diterima sementara langganan tidak pernah aktif dan database
 * tenant tidak pernah dibuat (sejak Fase 24a pembayaran pertama itulah yang
 * membuatnya). Itu kegagalan terburuk yang bisa dihasilkan alur ini, dan tidak
 * ada gerbang yang bisa melihatnya: seluruh uji berjalan dengan kedua kunci
 * terpasang.
 *
 * Aturannya: **jangan menjual apa yang tidak bisa kita konfirmasi.** Tanpa
 * token, checkout membalas 503 berpesan — degradasi anggun yang sudah ada.
 */
export function billingConfigured(env: Env): boolean {
  return Boolean(env.XENDIT_SECRET_KEY && env.XENDIT_CALLBACK_TOKEN);
}

/**
 * Apakah kunci yang terpasang kunci UJI?
 *
 * Xendit memakai host yang sama untuk uji dan produksi — yang membedakan hanya
 * kuncinya (`xnd_development_…` vs `xnd_production_…`). Tanpa penanda ini,
 * produksi yang tak sengaja memakai kunci uji akan menerima "pembayaran" yang
 * tidak pernah menjadi uang, dan **tidak ada satu pun tanda di layar**. Midtrans
 * dulu memisahkannya lewat host + `MIDTRANS_IS_PRODUCTION`; penggantinya adalah
 * lencana yang dihitung di sini dan ditampilkan di Pengaturan → Langganan.
 */
export function billingModeUji(env: Env): boolean {
  return (env.XENDIT_SECRET_KEY ?? "").startsWith("xnd_development");
}

/**
 * Verifikasi webhook Xendit: header `x-callback-token` harus sama persis dengan
 * token verifikasi dari dashboard.
 *
 * Perbandingannya constant-time. Xendit mengulang webhook hingga 6× dengan
 * backoff, jadi endpoint ini menerima percobaan berkali-kali untuk order yang
 * sama — persis kondisi yang membuat kebocoran waktu bisa dikumpulkan.
 */
export function tokenCallbackXenditValid(expected: string | undefined, diterima: string | null): boolean {
  if (!expected || !diterima) return false;
  return samaAman(expected, diterima);
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

export type HasilPembayaran = { ok: true; redirectUrl: string } | { ok: false; error: string };

/**
 * Buat invoice Xendit (dipakai billing langganan & payment link faktur, Fase 11d).
 * Mengembalikan `invoice_url` untuk alur redirect (CSP-safe: halaman bayar milik
 * Xendit, tidak ada skrip pihak ketiga yang disuntikkan ke halaman kita).
 * Pemanggil bertanggung jawab memeriksa {@link billingConfigured} lebih dulu.
 *
 * Bentuk hasilnya sengaja sama dengan pendahulunya (Midtrans Snap) supaya
 * pemanggil — termasuk `collections.ts` — tidak ikut berubah saat provider
 * ditukar.
 */
export async function buatInvoiceXendit(
  env: Env,
  opts: { orderId: string; amount: number; itemName: string; customerEmail?: string; customerName?: string; finishUrl: string },
): Promise<HasilPembayaran> {
  try {
    const res = await fetch(XENDIT_INVOICE_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Basic ${btoa(`${env.XENDIT_SECRET_KEY}:`)}`,
      },
      body: JSON.stringify({
        external_id: opts.orderId,
        amount: opts.amount,
        currency: "IDR",
        description: opts.itemName,
        ...(opts.customerEmail ? { payer_email: opts.customerEmail } : {}),
        ...(opts.customerName ? { customer: { given_names: opts.customerName, email: opts.customerEmail } } : {}),
        items: [{ name: opts.itemName, quantity: 1, price: opts.amount }],
        success_redirect_url: opts.finishUrl,
        failure_redirect_url: opts.finishUrl,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { invoice_url?: string; message?: string; error_code?: string };
    if (!res.ok || !data.invoice_url) {
      const detail = data.message || data.error_code || `HTTP ${res.status}`;
      console.error(`[billing] Xendit gagal untuk ${opts.orderId}: ${detail}`);
      return { ok: false, error: "Gagal memulai pembayaran. Coba lagi sebentar." };
    }
    return { ok: true, redirectUrl: data.invoice_url };
  } catch (err) {
    console.error(`[billing] Xendit error untuk ${opts.orderId}:`, err);
    return { ok: false, error: "Gagal menghubungi gerbang pembayaran." };
  }
}

type InvoiceRow = {
  id: string;
  order_id: string;
  amount: number;
  period_months: number;
  status: ApiSubscriptionInvoice["status"];
  transaction_status: string | null;
  paid_at: string | null;
  created_at: string;
};

function toApiInvoice(r: InvoiceRow): ApiSubscriptionInvoice {
  return {
    id: r.id,
    orderId: r.order_id,
    amount: r.amount,
    periodMonths: r.period_months,
    status: r.status,
    transactionStatus: r.transaction_status,
    paidAt: r.paid_at,
    createdAt: r.created_at,
  };
}

/**
 * Muat tenant + peran anggota untuk endpoint billing. Sengaja TIDAK memakai
 * requireTenantRole karena billing adalah jalan keluar dari status past_due —
 * pemilik yang menunggak HARUS tetap bisa membayar (requireTenantRole memblokir
 * tulis saat past_due dengan 402).
 */
async function loadMembership(
  c: { env: Env; get: (k: "user") => { id: string }; req: { param: (k: string) => string | undefined } },
): Promise<{
  tenantId: string;
  row: {
    id: string;
    status: TenantStatus;
    plan: Plan;
    legacy_full_access: number;
    db_ref: string;
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    pending_plan: Plan | null;
    role: Role;
  };
} | null> {
  const tenantId = c.req.param("tenantId");
  if (!tenantId) return null;
  const row = await c.env.DB.prepare(
    `SELECT t.id, t.status, t.plan, t.legacy_full_access, t.db_ref, t.trial_ends_at, t.subscription_ends_at,
            t.pending_plan, m.role
     FROM memberships m JOIN tenants t ON t.id = m.tenant_id
     WHERE m.user_id = ? AND m.tenant_id = ?`,
  )
    .bind(c.get("user").id, tenantId)
    .first<{
      id: string;
      status: TenantStatus;
      plan: Plan;
      legacy_full_access: number;
      db_ref: string;
      trial_ends_at: string | null;
      subscription_ends_at: string | null;
      pending_plan: Plan | null;
      role: Role;
    }>();
  return row ? { tenantId, row } : null;
}

// Endpoint tenant (di-mount di /api/tenants) — pola requireAuth + cek keanggotaan
// manual (bukan requireTenantRole) agar tenant past_due tetap bisa membayar.
export const billingRoutes = new Hono<AppEnv>()
  .get("/:tenantId/billing", requireAuth, async (c) => {
    const m = await loadMembership(c);
    if (!m) return c.json({ error: "Anda bukan anggota perusahaan ini." }, 403);

    // Pemulihan-diri (Fase 24). Webhook Xendit-lah yang biasanya membuatkan
    // database setelah pembayaran, tetapi ia bisa tiba saat pool sedang penuh —
    // dan pelanggan yang sudah MEMBAYAR lalu tidak mendapat apa pun adalah
    // kegagalan terburuk yang bisa dihasilkan alur ini. Halaman langganan
    // memanggil endpoint ini, jadi tiap kali pelanggan membukanya percobaannya
    // diulang. Idempoten & tidak melakukan apa pun bila databasenya sudah ada.
    if (m.row.status === "active" && m.row.db_ref === TANPA_DB) {
      const hasil = await pastikanTenantTerprovisi(c.env, m.tenantId);
      if (!hasil.ok) {
        await audit(c.env, {
          action: "billing.provisioning_tertunda",
          tenantId: m.tenantId,
          detail: { alasan: hasil.alasan },
        });
      }
    }

    const { results } = await c.env.DB.prepare(
      `SELECT id, order_id, amount, period_months, status, transaction_status, paid_at, created_at
       FROM subscription_invoices WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 24`,
    )
      .bind(m.tenantId)
      .all<InvoiceRow>();
    const body: BillingStatus = {
      configured: billingConfigured(c.env),
      modeUji: billingModeUji(c.env),
      plan: m.row.plan,
      status: m.row.status,
      subscriptionEndsAt: m.row.subscription_ends_at,
      pricePerMonth: PLAN_LIMITS[m.row.plan].pricePerMonth,
      legacyFullAccess: m.row.legacy_full_access === 1,
      invoices: results.map(toApiInvoice),
    };
    return c.json(body);
  })

  .post("/:tenantId/billing/checkout", requireAuth, async (c) => {
    const m = await loadMembership(c);
    if (!m) return c.json({ error: "Anda bukan anggota perusahaan ini." }, 403);
    if (m.row.role !== "owner") return c.json({ error: "Hanya Pemilik yang dapat mengatur langganan." }, 403);
    // Paket yang dibeli (Fase 13b). Sejak Fase 30 hanya ada satu — "lengkap" —
    // dan harganya tetap dibaca dari PLAN_LIMITS, bukan ditulis ulang di sini.
    const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "Paket tidak valid." }, 400);
    const plan = parsed.data.plan;
    const periode = parsed.data.periode;
    if (!billingConfigured(c.env)) {
      return c.json({ error: "Pembayaran online belum dikonfigurasi. Hubungi kami untuk aktivasi." }, 503);
    }

    const user = c.get("user");
    const bulan = periode === "tahunan" ? 12 : 1;

    /**
     * Kelebihan karyawan penggajian ikut ditagih (Fase 53e).
     *
     * Tanpa ini, "termasuk N karyawan, selebihnya Rp 150.000 per orang per
     * tahun" akan menjadi angka di halaman harga yang tidak punya satu pun
     * mekanisme di belakangnya — persis kesalahan `maxEntities` yang dihapus
     * Fase 30. Dihitung dari jumlah karyawan AKTIF saat checkout, bukan saat
     * langganan dibuat: yang ditagih adalah keadaan sekarang.
     *
     * Untuk periode bulanan, tarif tahunan dibagi dua belas dan dibulatkan ke
     * atas — pembulatan ke bawah membuat dua belas tagihan bulanan lebih murah
     * daripada satu tagihan tahunan, dan selisih diam-diam itu akan menjadi
     * pertanyaan yang tidak enak dijawab.
     */
    // Tenant `provisioning` BELUM punya database — dan checkout pertama justru
    // terjadi tepat saat itu. `getTenantDb(env, TANPA_DB)` melempar, jadi
    // memanggilnya tanpa syarat akan mematikan satu-satunya jalur uang yang
    // ada, untuk pelanggan yang baru pertama kali membayar. Kelas cacat yang
    // sama dengan enam yang dijaring Fase 52c.
    const karyawan =
      m.row.db_ref === TANPA_DB
        ? { terpakai: 0, termasuk: 0, kelebihan: 0 }
        : await hitungKaryawanDiAtasJatah(c.env, m.tenantId, getTenantDb(c.env, m.row.db_ref));
    const tambahanTahunan = biayaKaryawanTambahan(plan, karyawan.terpakai);
    const tambahan = periode === "tahunan" ? tambahanTahunan : Math.ceil(tambahanTahunan / 12);
    const amount = hargaPaket(plan, periode) + tambahan;
    const orderId = `sub-${m.tenantId.slice(0, 8)}-${Date.now()}`;
    const invoiceId = crypto.randomUUID();

    const bayar = await buatInvoiceXendit(c.env, {
      orderId,
      amount,
      itemName:
        `Langganan ERPindo ${PLAN_LABELS[plan]} (${periode === "tahunan" ? "1 tahun" : "1 bulan"})` +
        (karyawan.kelebihan > 0 ? ` + ${karyawan.kelebihan} karyawan tambahan` : ""),
      customerEmail: user.email,
      customerName: user.name,
      finishUrl: `${appOrigin(c)}/app/pengaturan`,
    });
    if (!bayar.ok) return c.json({ error: bayar.error }, 502);
    const redirectUrl = bayar.redirectUrl;

    await c.env.DB.prepare(
      `INSERT INTO subscription_invoices (id, tenant_id, order_id, amount, period_months, status, plan, redirect_url, created_by)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    )
      .bind(invoiceId, m.tenantId, orderId, amount, bulan, plan, redirectUrl, user.id)
      .run();
    // Periode disimpan di tenant supaya perpanjangan tidak perlu menyimpulkan
    // "ini tahunan atau bulanan" dari nominal invoice — cara yang pasti salah
    // setelah harga berubah.
    await c.env.DB.prepare(`UPDATE tenants SET billing_period = ? WHERE id = ?`)
      .bind(periode, m.tenantId)
      .run();
    await audit(c.env, {
      action: "billing.checkout",
      userId: user.id,
      tenantId: m.tenantId,
      detail: { orderId, amount, plan, periode, karyawanTambahan: karyawan.kelebihan },
      ip: clientIp(c),
    });
    return c.json({ orderId, redirectUrl, amount, periode }, 201);
  })

  // --- PENCABUTAN ganti paket (Fase 30) -------------------------------------
  //
  // `GET /billing/prorata` (pratinjau) dan `POST /billing/change-plan` (eksekusi)
  // dihapus bersama seluruh mesin prorata. Dengan satu paket tidak ada paket
  // lain untuk dituju: pratinjau selalu "sama", dan eksekusinya selalu ditolak.
  //
  // Yang TETAP: `POST /billing/checkout` di atas — jalur beli/perpanjang
  // langganan. Itulah satu-satunya jalur uang yang tersisa, dan ia sengaja
  // tidak disentuh perubahan ini.
  ;

/**
 * Status invoice Xendit yang berarti "uangnya sudah masuk".
 *
 * `PAID` = pelanggan membayar; `SETTLED` = dananya sudah diteruskan ke saldo
 * merchant. Keduanya diperlakukan lunas: untuk sebagian metode pembayaran,
 * SETTLED bisa tiba sebagai webhook pertama yang kita lihat, dan menunggu PAID
 * yang tidak akan datang berarti pelanggan yang sudah membayar tetap tertahan.
 */
const XENDIT_LUNAS = new Set(["PAID", "SETTLED"]);

// Webhook Xendit (publik) — di-mount di /api/billing.
//
// Path `/notification` sengaja dipertahankan dari era Midtrans: namanya
// netral-provider, dan mengubahnya berarti URL webhook yang sudah didaftarkan
// di dashboard menjadi 404 tanpa satu pun gerbang yang melihatnya.
export const billingWebhookRoutes = new Hono<AppEnv>().post("/notification", async (c) => {
  // Tanpa kunci, abaikan dengan sopan (Xendit mengharapkan 2xx).
  if (!billingConfigured(c.env)) return c.json({ ignored: true });
  const n = (await c.req.json().catch(() => ({}))) as {
    external_id?: string;
    status?: string;
    paid_amount?: number;
    id?: string;
  };
  if (!tokenCallbackXenditValid(c.env.XENDIT_CALLBACK_TOKEN, c.req.header("x-callback-token") ?? null)) {
    return c.json({ error: "Token callback tidak sah." }, 403);
  }

  const invoice = await c.env.DB.prepare(
    `SELECT si.id, si.tenant_id, si.status, si.amount, si.period_months, si.plan, si.is_prorata, t.subscription_ends_at
     FROM subscription_invoices si JOIN tenants t ON t.id = si.tenant_id
     WHERE si.order_id = ?`,
  )
    .bind(n.external_id)
    .first<{ id: string; tenant_id: string; status: string; amount: number; period_months: number; plan: Plan; is_prorata: number; subscription_ends_at: string | null }>();
  if (!invoice) {
    // Order langganan tak dikenal → coba payment link faktur (Fase 11d).
    const link = await c.env.DB.prepare(
      `SELECT id, tenant_id, invoice_no, status FROM payment_links WHERE order_id = ?`,
    )
      .bind(n.external_id)
      .first<{ id: string; tenant_id: string; invoice_no: string; status: string }>();
    if (!link) return c.json({ ignored: true }); // benar-benar tak dikenal / ping
    const lts = n.status;
    const lSettled = XENDIT_LUNAS.has(lts ?? "");
    if (lSettled) {
      const now = new Date().toISOString();
      // Fase 26c: transisi status dijadikan compare-and-set. Pola lama
      // (baca `link.status` lalu UPDATE tanpa syarat) membiarkan dua webhook
      // yang tiba bersamaan sama-sama lolos pemeriksaan sebelum salah satunya
      // menulis — dan Xendit memang mengirim PAID lalu SETTLED, ditambah
      // hingga 6 kali percobaan ulang. Yang menentukan sekarang adalah baris
      // yang BERHASIL diubah, bukan baris yang sempat terbaca.
      const ubah = await c.env.DB.prepare(
        `UPDATE payment_links SET status = 'paid', paid_at = ? WHERE id = ? AND status != 'paid'`,
      )
        .bind(now, link.id)
        .run();
      if ((ubah as { meta?: { changes?: number } }).meta?.changes === 1) {
        await c.env.DB.prepare(
          `INSERT INTO audit_logs (id, tenant_id, user_id, action, detail, ip, created_at)
           VALUES (?, ?, NULL, 'collection.paid', ?, NULL, ?)`,
        )
          .bind(crypto.randomUUID(), link.tenant_id, JSON.stringify({ orderId: n.external_id, invoiceNo: link.invoice_no }), now)
          .run();
      }
    } else if (lts === "EXPIRED") {
      await c.env.DB.prepare(`UPDATE payment_links SET status = 'expired' WHERE id = ? AND status = 'pending'`)
        .bind(link.id)
        .run();
    }
    return c.json({ ok: true });
  }

  const ts = n.status;
  const settled = XENDIT_LUNAS.has(ts ?? "");

  if (settled) {
    const now = new Date().toISOString();

    /**
     * Invarian jumlah bayar (Fase 26c, temuan audit F).
     *
     * Sebelum ini `paid_amount` di-destructure dari payload lalu **tidak pernah
     * dipakai**: langganan aktif semata-mata karena statusnya berbunyi PAID.
     * Nilai yang seharusnya dibandingkan sudah tersimpan sejak checkout
     * (`subscription_invoices.amount`), jadi yang hilang hanyalah
     * perbandingannya.
     *
     * Keputusan bisnis, dinyatakan terbuka: **kurang bayar TIDAK mengaktifkan
     * langganan** — ia dicatat lalu ditinggalkan dalam keadaan pending, supaya
     * bisa dilihat manusia. **Lebih bayar TETAP mengaktifkan** dan ikut dicatat:
     * menahan pelanggan yang membayar lebih banyak hanya memindahkan masalah ke
     * dukungan pelanggan, dan kelebihannya urusan penyelesaian di sisi Xendit.
     *
     * Balasan tetap 2xx: non-2xx hanya memanen 6× percobaan ulang Xendit untuk
     * keadaan yang tidak akan membaik dengan diulang.
     */
    if (typeof n.paid_amount === "number" && n.paid_amount < invoice.amount) {
      await c.env.DB.prepare(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, detail, ip, created_at)
         VALUES (?, ?, NULL, 'billing.jumlah_kurang', ?, NULL, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          invoice.tenant_id,
          JSON.stringify({ orderId: n.external_id, diminta: invoice.amount, dibayar: n.paid_amount }),
          now,
        )
        .run();
      console.error(
        `[billing] pembayaran kurang untuk ${n.external_id}: diminta ${invoice.amount}, dibayar ${n.paid_amount} — langganan TIDAK diaktifkan.`,
      );
      return c.json({ ok: true, ignored: "jumlah-kurang" });
    }

    /**
     * Transisi status sebagai compare-and-set (Fase 26c, temuan audit C).
     *
     * Pola lama membaca `invoice.status` lalu meng-UPDATE tanpa syarat. Dua
     * webhook yang tiba bersamaan karena itu sama-sama lolos pemeriksaan
     * sebelum salah satunya menulis — dan ini bukan skenario karangan: Xendit
     * mengirim `PAID` **dan** `SETTLED` untuk satu invoice, ditambah hingga 6×
     * percobaan ulang. Akibatnya `addMonths` berjalan dua kali dan pelanggan
     * mendapat sebulan gratis yang tidak muncul di laporan mana pun.
     *
     * Sekarang yang menentukan adalah baris yang BERHASIL diubah. Seluruh efek
     * hilir — perpanjangan langganan, audit, pembuatan database tenant — hanya
     * berjalan untuk pemenang balapan itu.
     */
    const transisi = await c.env.DB.prepare(
      `UPDATE subscription_invoices SET status = 'paid', transaction_status = ?, paid_at = ?
       WHERE id = ? AND status != 'paid'`,
    )
      .bind(ts ?? "PAID", now, invoice.id)
      .run();
    if ((transisi as { meta?: { changes?: number } }).meta?.changes !== 1) {
      // Sudah diproses (ulangan webhook, atau PAID+SETTLED beriringan).
      return c.json({ ok: true, ignored: "sudah-diproses" });
    }

    if (typeof n.paid_amount === "number" && n.paid_amount > invoice.amount) {
      await c.env.DB.prepare(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, detail, ip, created_at)
         VALUES (?, ?, NULL, 'billing.jumlah_lebih', ?, NULL, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          invoice.tenant_id,
          JSON.stringify({ orderId: n.external_id, diminta: invoice.amount, dibayar: n.paid_amount }),
          now,
        )
        .run();
    }

    const base = invoice.subscription_ends_at && invoice.subscription_ends_at > now ? invoice.subscription_ends_at : now;
    // Fase 20k: invoice prorata membeli KENAIKAN PAKET untuk sisa periode yang
    // sudah berjalan — bukan satu bulan tambahan. Memperpanjang tanggal akhir
    // di sini akan memberi tenant sebulan gratis setiap kali ia naik paket,
    // dan tidak ada laporan yang akan menunjukkannya.
    const newEnd =
      invoice.is_prorata === 1 ? (invoice.subscription_ends_at ?? base) : addMonths(base, invoice.period_months);
    // Paket yang diaktifkan = paket yang dibeli di checkout (Fase 13b).
    const newPlan: Plan = invoice.plan;
    // Pembayaran apa pun membatalkan penurunan paket yang terjadwal: pemilik
    // yang menjadwalkan turun lalu berubah pikiran dan membayar naik tidak
    // boleh tetap diturunkan diam-diam di akhir periode.
    await c.env.DB.prepare(
      `UPDATE tenants SET status = 'active', plan = ?, subscription_ends_at = ?, pending_plan = NULL WHERE id = ?`,
    )
      .bind(newPlan, newEnd, invoice.tenant_id)
      .run();
    await c.env.DB.prepare(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, detail, ip, created_at)
       VALUES (?, ?, NULL, 'billing.paid', ?, NULL, ?)`,
    )
      .bind(crypto.randomUUID(), invoice.tenant_id, JSON.stringify({ orderId: n.external_id, until: newEnd }), now)
      .run();

    // Fase 24 — INILAH tempat database tenant benar-benar dibuat.
    //
    // Pendaftaran tidak lagi membuatnya, jadi pembayaran pertama inilah yang
    // mengubah "akun terdaftar" menjadi "perusahaan yang bisa dipakai".
    // Idempoten: webhook Xendit bisa tiba lebih dari sekali untuk order yang
    // sama, dan pemeriksaan `db_ref` kosong di dalam helper memastikan tidak
    // ada database kedua yang terbuat.
    //
    // Kegagalannya TIDAK membalas non-2xx: Xendit mengulang webhook hingga 6×
    // dengan backoff, dan itu tidak memperbaiki apa pun bila sebabnya pool penuh.
    // Sebagai gantinya kegagalan dicatat, dan `GET /billing` mencobanya lagi
    // tiap kali pelanggan membuka halaman langganan.
    const prov = await pastikanTenantTerprovisi(c.env, invoice.tenant_id);
    if (!prov.ok) {
      await c.env.DB.prepare(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, detail, ip, created_at)
         VALUES (?, ?, NULL, 'billing.provisioning_tertunda', ?, NULL, ?)`,
      )
        .bind(crypto.randomUUID(), invoice.tenant_id, JSON.stringify({ alasan: prov.alasan, orderId: n.external_id }), now)
        .run();
      console.error(
        `[billing] tenant ${invoice.tenant_id} SUDAH MEMBAYAR tetapi belum dapat database (${prov.alasan}).`,
      );
    }
    return c.json({ ok: true });
  }

  // Invoice Xendit hanya punya satu jalur gagal: kedaluwarsa. Tidak ada padanan
  // `cancel`/`deny` Midtrans — kartu yang ditolak membuat invoice tetap PENDING
  // sampai pelanggan mencoba metode lain atau invoice-nya kedaluwarsa sendiri.
  if (ts === "EXPIRED") {
    await c.env.DB.prepare(
      `UPDATE subscription_invoices SET status = 'expired', transaction_status = ? WHERE id = ? AND status = 'pending'`,
    )
      .bind(ts, invoice.id)
      .run();
  }
  return c.json({ ok: true });
});
