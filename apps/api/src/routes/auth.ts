import {
  changePasswordSchema,
  createCompanySchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  toSlug,
  type MeResponse,
  type Plan,
  type Role,
  type TenantStatus,
} from "@erpindo/shared";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import type { AppEnv, Env } from "../env";
import { audit } from "../lib/audit";
import { generateToken, hashPassword, sha256Hex, verifyPassword } from "../lib/crypto";
import { kirimEmail } from "../lib/mailer";
import { KapasitasTenantPenuhError, provisionTenantDb, TANPA_DB, TENANT_SCHEMA_VERSION } from "../lib/tenantDb";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "../lib/totp";
import { isPlatformAdmin, requireAuth, SESSION_COOKIE } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";

const SESSION_DAYS = 30;

/**
 * Paket bawaan tenant baru (Fase 30). **Bertipe `Plan` dengan sengaja.**
 *
 * Sebelumnya kedua `INSERT INTO tenants` di berkas ini menyematkan string
 * telanjang (`comped ? "enterprise" : "starter"`) langsung di dalam `.bind()`.
 * Karena `.bind()` menerima `unknown[]`, TypeScript **tidak pernah
 * memeriksanya**: saat paket bertingkat dibubarkan, `pnpm typecheck` tetap
 * hijau sementara SETIAP pendaftaran baru menulis paket yang sudah tidak ada,
 * lalu `PLAN_LIMITS[plan]` memberi `undefined` dan pembacaan `.maxUsers` di
 * atasnya melempar. Yang menemukannya adalah smoke, bukan typecheck.
 *
 * Konstanta beranotasi ini memindahkan nilai itu kembali ke dalam jangkauan
 * pemeriksa tipe: nama paket yang tidak ada lagi kini gagal di `pnpm typecheck`,
 * bukan di layar pendaftar.
 */
const PAKET_BAWAAN: Plan = "lengkap";
const TOKEN_HOURS = 24;

function now(): string {
  return new Date().toISOString();
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function inHours(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function clientIp(c: { req: { header(name: string): string | undefined } }): string {
  return c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
}

/** URL publik aplikasi: var APP_URL bila diset, selain itu origin request. */
function appOrigin(c: { env: Env; req: { url: string } }): string {
  return c.env.APP_URL ?? new URL(c.req.url).origin;
}

async function createSession(env: Env, userId: string): Promise<string> {
  const raw = generateToken();
  await env.DB.prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
    .bind(await sha256Hex(raw), userId, now(), inDays(SESSION_DAYS))
    .run();
  return raw;
}

function setSessionCookie(c: Parameters<typeof setCookie>[0], raw: string, appUrl: string): void {
  setCookie(c, SESSION_COOKIE, raw, {
    httpOnly: true,
    secure: appUrl.startsWith("https://"),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

async function createEmailToken(
  env: Env,
  input: { type: "verify" | "reset" | "invite"; email: string; userId?: string; tenantId?: string; role?: Role },
): Promise<string> {
  const raw = generateToken();
  await env.DB.prepare(
    `INSERT INTO tokens (id, token_hash, type, email, user_id, tenant_id, role, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      await sha256Hex(raw),
      input.type,
      input.email,
      input.userId ?? null,
      input.tenantId ?? null,
      input.role ?? null,
      inHours(TOKEN_HOURS),
      now(),
    )
    .run();
  return raw;
}

type TokenRow = {
  id: string;
  type: string;
  email: string;
  user_id: string | null;
  tenant_id: string | null;
  role: string | null;
  expires_at: string;
  used_at: string | null;
};

/**
 * Pakai token sekali-pakai (verifikasi email · reset sandi · undangan).
 *
 * Fase 26c (temuan audit D): versi sebelumnya membaca baris, memeriksa
 * `used_at`, lalu menulisnya — tiga langkah terpisah. Dua permintaan yang tiba
 * bersamaan karena itu sama-sama melihat token "belum dipakai" sebelum salah
 * satunya menandainya, sehingga satu tautan reset sandi bisa dipakai dua kali.
 *
 * Sekarang penandaannya sendiri yang menjadi pemeriksaannya:
 * `WHERE used_at IS NULL AND expires_at > ?` dijalankan sebagai satu pernyataan,
 * dan hanya penulis yang mendapat `changes === 1` yang boleh melanjutkan. Baris
 * dibaca SESUDAH klaim berhasil — bukan sebelum — supaya tidak ada celah di
 * antara keduanya.
 */
async function consumeToken(env: Env, raw: string, type: string): Promise<TokenRow | null> {
  const hash = await sha256Hex(raw);
  const klaim = await env.DB.prepare(
    `UPDATE tokens SET used_at = ?
     WHERE token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > ?`,
  )
    .bind(now(), hash, type, now())
    .run();
  if ((klaim as { meta?: { changes?: number } }).meta?.changes !== 1) return null;

  return await env.DB.prepare(`SELECT * FROM tokens WHERE token_hash = ? AND type = ?`)
    .bind(hash, type)
    .first<TokenRow>();
}

/**
 * Email pada COMPED_EMAILS mendapat tenant `active` tanpa `subscription_ends_at`
 * — cron langganan tidak pernah menurunkannya, karena seluruh kueri dunning
 * mensyaratkan tanggal akhir yang tidak NULL.
 *
 * Sejak Fase 30 comped TIDAK lagi berarti paket berbeda (hanya ada satu paket);
 * yang membedakannya adalah status aktif tanpa tanggal akhir, ditambah
 * `legacy_full_access`.
 */
export function isComped(env: Env, email: string): boolean {
  return (env.COMPED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/**
 * Akun demo publik baca-saja (Fase 10b): satu user tetap ber-peran viewer di
 * perusahaan demo. Endpoint /demo membuat user & keanggotaannya sendiri saat
 * pertama dipakai (perusahaan demo harus sudah di-seed). Password-nya acak dan
 * tidak pernah keluar dari proses, jadi jalur login biasa selalu gagal —
 * satu-satunya pintu masuk adalah /demo.
 */
const DEMO_EMAIL = "demo-viewer@erpindo.id";
// Slug perusahaan demo; var DEMO_TENANT_SLUG meng-override untuk suite uji
// (pool DB tenant lokal terbatas — smoke menunjuk tenant yang sudah ada).
const DEMO_TENANT_SLUG_DEFAULT = "pt-demo-sejahtera";

function isDemoUser(email: string): boolean {
  return email.toLowerCase() === DEMO_EMAIL;
}

const DEMO_FORBIDDEN = { error: "Akun demo hanya untuk melihat-lihat. Daftar dan berlangganan untuk mengelola data Anda sendiri." };

export const authRoutes = new Hono<AppEnv>()

  // -------------------------------------------------------------------------
  // Registrasi: buat user + tenant. Database tenant TIDAK dibuat di sini sejak
  // Fase 24 — lihat komentar panjang di dalam.
  // -------------------------------------------------------------------------
  .post("/register", rateLimit({ key: "register", limit: 5, windowSeconds: 300 }), async (c) => {
    const parsed = registerSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const { companyName, name, email, password } = parsed.data;

    const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
    if (existing) return c.json({ error: "Email sudah terdaftar. Silakan login." }, 409);

    // Slug unik untuk subdomain tenant.
    const base = toSlug(companyName);
    let slug = base;
    for (let i = 2; ; i++) {
      const taken = await c.env.DB.prepare(`SELECT id FROM tenants WHERE slug = ?`).bind(slug).first();
      if (!taken) break;
      slug = `${base}-${i}`;
    }

    const userId = crypto.randomUUID();
    const tenantId = crypto.randomUUID();
    const comped = isComped(c.env, email);

    /**
     * Fase 24 — pendaftar biasa TIDAK diberi database.
     *
     * Sebelumnya registrasi memanggil `provisionTenantDb()` di sini, sehingga
     * setiap pendaftar membakar satu binding `TENANT_DB_*` PERMANEN entah ia
     * membayar atau tidak. Dengan trial 30 hari itu berarti pool bisa penuh
     * tanpa satu pun pelanggan membayar — dan memang begitulah produksi
     * ditemukan penuh 6/6 pada Fase 23c.
     *
     * Sekarang tenant lahir berstatus `provisioning` dengan `db_ref` kosong;
     * databasenya dibuat oleh `pastikanTenantTerprovisi()` saat pembayaran
     * pertama terkonfirmasi. Konsekuensi yang disengaja: pendaftar yang belum
     * bayar tidak bisa membaca maupun menulis apa pun (ditegakkan
     * `requireTenantRole`) — ia menilai produk lewat demo publik.
     *
     * Akun comped (COMPED_EMAILS, milik pemilik) dikecualikan: ia tidak pernah
     * melewati checkout, jadi databasenya dibuat sekarang atau tidak sama sekali.
     */
    let dbRef = TANPA_DB;
    if (comped) {
      const { results: refRows } = await c.env.DB.prepare(`SELECT db_ref FROM tenants`).all<{ db_ref: string }>();
      try {
        dbRef = await provisionTenantDb(
          c.env,
          slug,
          refRows.map((r) => r.db_ref),
        );
      } catch (err) {
        if (err instanceof KapasitasTenantPenuhError) {
          return c.json(
            {
              error:
                "Kapasitas pendaftaran perusahaan baru sedang penuh. Hubungi kami — kapasitasnya bisa dinaikkan tanpa memengaruhi data yang sudah ada.",
              code: "kapasitas-penuh",
            },
            503,
          );
        }
        throw err;
      }
    }
    const status: TenantStatus = comped ? "active" : "provisioning";

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO users (id, email, name, password_hash, email_verified, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
      ).bind(userId, email, name, await hashPassword(password), now()),
      c.env.DB.prepare(
        `INSERT INTO tenants (id, name, slug, db_ref, status, plan, schema_version, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        tenantId,
        companyName,
        slug,
        dbRef,
        status,
        // Paket hanya berarti setelah aktif; sebelum bayar ia sekadar nilai
        // bawaan kolom NOT NULL. Yang dilihat pengguna adalah STATUS-nya.
        // Sejak Fase 30 hanya ada satu paket, jadi comped & non-comped sama —
        // yang membedakan comped adalah `legacy_full_access`, bukan paketnya.
        PAKET_BAWAAN,
        comped ? TENANT_SCHEMA_VERSION : 0,
        now(),
      ),
      c.env.DB.prepare(
        `INSERT INTO memberships (id, user_id, tenant_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)`,
      ).bind(crypto.randomUUID(), userId, tenantId, now()),
    ]);

    if (comped) {
      // Nama tampilan awal. Untuk tenant biasa ini ditulis oleh
      // `pastikanTenantTerprovisi()` — saat registrasi belum ada database.
      const { getTenantDb } = await import("../lib/tenantDb");
      await getTenantDb(c.env, dbRef)
        .prepare(`INSERT INTO settings (key, value, updated_at) VALUES ('display_name', ?, ?)`)
        .bind(companyName, now())
        .run();
    }

    const verifyToken = await createEmailToken(c.env, { type: "verify", email, userId });
    await kirimEmail(c.env, {
      to: email,
      subject: "Verifikasi email erpindo Anda",
      text: `Halo ${name},\n\nSelamat datang di erpindo! Klik tautan berikut untuk memverifikasi email Anda:\n${appOrigin(c)}/verifikasi?token=${verifyToken}\n\nTautan berlaku ${TOKEN_HOURS} jam.\n\n— Tim erpindo`,
    }, "auth.verifikasi_email");

    await audit(c.env, {
      action: "auth.register",
      userId,
      tenantId,
      detail: { email, slug, ...(comped ? { comped: true } : {}) },
      ip: clientIp(c),
    });

    const session = await createSession(c.env, userId);
    setSessionCookie(c, session, appOrigin(c));
    return c.json({ ok: true, tenantId, slug }, 201);
  })

  // -------------------------------------------------------------------------
  // Perusahaan tambahan untuk pengguna yang sudah login (multi-perusahaan).
  // Fondasi bagi pengalih workspace & laporan konsolidasi lintas perusahaan.
  // -------------------------------------------------------------------------
  .post("/companies", requireAuth, async (c) => {
    if (isDemoUser(c.get("user").email)) return c.json(DEMO_FORBIDDEN, 403);
    const parsed = createCompanySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const user = c.get("user");
    const { companyName } = parsed.data;

    // Pagar anti-abuse (Fase 13b, disesuaikan Fase 24): akun yang belum
    // berlangganan TIDAK boleh menambah perusahaan. Dulu pagarnya "satu
    // perusahaan trial per akun"; sejak trial dihapus, bentuk penyalahgunaannya
    // berubah — perusahaan tambahan di sini diprovisi SEKARANG (pemiliknya
    // sudah membayar), jadi tanpa pagar ini seorang pendaftar yang belum bayar
    // bisa memanen slot database tanpa batas lewat endpoint ini, persis
    // menghindari paywall yang baru saja dipasang di registrasi.
    if (!isComped(c.env, user.email)) {
      const belumBayar = await c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM memberships m JOIN tenants t ON t.id = m.tenant_id
         WHERE m.user_id = ? AND m.role = 'owner' AND t.status = 'provisioning'`,
      )
        .bind(user.id)
        .first<{ n: number }>();
      if ((belumBayar?.n ?? 0) >= 1) {
        return c.json(
          {
            error:
              "Aktifkan langganan perusahaan Anda yang pertama dulu sebelum menambah perusahaan baru.",
            detail: "belum-berlangganan",
          },
          402,
        );
      }
    }

    const base = toSlug(companyName);
    let slug = base;
    for (let i = 2; ; i++) {
      const taken = await c.env.DB.prepare(`SELECT id FROM tenants WHERE slug = ?`).bind(slug).first();
      if (!taken) break;
      slug = `${base}-${i}`;
    }

    const { results: refRows } = await c.env.DB.prepare(`SELECT db_ref FROM tenants`).all<{ db_ref: string }>();
    let dbRef: string;
    try {
      dbRef = await provisionTenantDb(
        c.env,
        slug,
        refRows.map((r) => r.db_ref),
      );
    } catch (err) {
      // Kapasitas penuh BUKAN kerusakan — dijawab 503 dengan pesan yang bisa
      // ditindaklanjuti, bukan 500 generik dari penangan galat global yang
      // membuat pendaftar menyangka aplikasinya rusak.
      if (err instanceof KapasitasTenantPenuhError) {
        return c.json(
          {
            error:
              "Kapasitas pendaftaran perusahaan baru sedang penuh. Hubungi kami — kapasitasnya bisa dinaikkan tanpa memengaruhi data yang sudah ada.",
            code: "kapasitas-penuh",
          },
          503,
        );
      }
      throw err;
    }

    const tenantId = crypto.randomUUID();
    // Perusahaan tambahan hanya bisa dibuat oleh akun yang sudah berlangganan
    // (dijaga di atas), jadi ia lahir langsung aktif — pemiliknya sudah membayar.
    const comped = isComped(c.env, user.email);
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO tenants (id, name, slug, db_ref, status, plan, schema_version, created_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
      ).bind(
        tenantId,
        companyName,
        slug,
        dbRef,
        PAKET_BAWAAN,
        TENANT_SCHEMA_VERSION,
        now(),
      ),
      c.env.DB.prepare(
        `INSERT INTO memberships (id, user_id, tenant_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)`,
      ).bind(crypto.randomUUID(), user.id, tenantId, now()),
    ]);

    const { getTenantDb } = await import("../lib/tenantDb");
    await getTenantDb(c.env, dbRef)
      .prepare(`INSERT INTO settings (key, value, updated_at) VALUES ('display_name', ?, ?)`)
      .bind(companyName, now())
      .run();

    await audit(c.env, {
      action: "tenant.company_created",
      userId: user.id,
      tenantId,
      detail: { slug, ...(comped ? { comped: true } : {}) },
      ip: clientIp(c),
    });
    return c.json({ ok: true, tenantId, slug }, 201);
  })

  // -------------------------------------------------------------------------
  // Login / logout / sesi
  // -------------------------------------------------------------------------
  .post("/login", rateLimit({ key: "login", limit: 10, windowSeconds: 300 }), async (c) => {
    const parsed = loginSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const { email, password, totpCode } = parsed.data;

    const user = await c.env.DB.prepare(
      `SELECT id, password_hash, totp_enabled, totp_secret FROM users WHERE email = ?`,
    )
      .bind(email)
      .first<{ id: string; password_hash: string; totp_enabled: number; totp_secret: string | null }>();

    // Pesan sengaja sama untuk email tak terdaftar vs password salah.
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await audit(c.env, { action: "auth.login_failed", detail: { email }, ip: clientIp(c) });
      return c.json({ error: "Email atau password salah." }, 401);
    }

    // Faktor kedua (TOTP) bila diaktifkan — password benar tidak cukup.
    if (user.totp_enabled === 1 && user.totp_secret) {
      if (!totpCode) {
        return c.json({ error: "Masukkan kode dari aplikasi authenticator Anda.", twoFactorRequired: true }, 401);
      }
      if (!(await verifyTotp(user.totp_secret, totpCode))) {
        await audit(c.env, { action: "auth.totp_failed", userId: user.id, ip: clientIp(c) });
        return c.json({ error: "Kode authenticator salah.", twoFactorRequired: true }, 401);
      }
    }

    const session = await createSession(c.env, user.id);
    setSessionCookie(c, session, appOrigin(c));
    await audit(c.env, { action: "auth.login", userId: user.id, ip: clientIp(c) });
    return c.json({ ok: true });
  })

  // -------------------------------------------------------------------------
  // Sesi demo publik (Fase 10b): tombol "Lihat Demo" di landing — tanpa
  // daftar, langsung masuk sebagai viewer di perusahaan demo. Server-side
  // read-only murni: peran viewer ditolak oleh requireTenantRole di semua
  // endpoint tulis tenant, dan endpoint mutasi akun memblokir email demo.
  // -------------------------------------------------------------------------
  .post("/demo", rateLimit({ key: "demo", limit: 10, windowSeconds: 300 }), async (c) => {
    const tenant = await c.env.DB.prepare(
      `SELECT id FROM tenants WHERE slug LIKE ? AND status != 'suspended' ORDER BY created_at LIMIT 1`,
    )
      .bind(`${c.env.DEMO_TENANT_SLUG ?? DEMO_TENANT_SLUG_DEFAULT}%`)
      .first<{ id: string }>();
    if (!tenant) return c.json({ error: "Akun demo belum disiapkan." }, 404);

    let user = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`)
      .bind(DEMO_EMAIL)
      .first<{ id: string }>();
    if (!user) {
      const userId = crypto.randomUUID();
      // Password acak yang tidak pernah dicetak — login password mustahil.
      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO users (id, email, name, password_hash, email_verified, created_at) VALUES (?, ?, 'Pengunjung Demo', ?, 1, ?)`,
      )
        .bind(userId, DEMO_EMAIL, await hashPassword(generateToken()), now())
        .run();
      user = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(DEMO_EMAIL).first<{ id: string }>();
    }
    if (!user) return c.json({ error: "Akun demo belum disiapkan." }, 404);

    const membership = await c.env.DB.prepare(`SELECT id FROM memberships WHERE user_id = ? AND tenant_id = ?`)
      .bind(user.id, tenant.id)
      .first<{ id: string }>();
    if (!membership) {
      await c.env.DB.prepare(
        `INSERT INTO memberships (id, user_id, tenant_id, role, created_at) VALUES (?, ?, ?, 'viewer', ?)`,
      )
        .bind(crypto.randomUUID(), user.id, tenant.id, now())
        .run();
    }

    const session = await createSession(c.env, user.id);
    setSessionCookie(c, session, appOrigin(c));
    await audit(c.env, { action: "auth.demo_login", userId: user.id, tenantId: tenant.id, ip: clientIp(c) });
    return c.json({ ok: true });
  })

  .post("/logout", requireAuth, async (c) => {
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(c.get("user").sessionId).run();
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  })

  .get("/me", requireAuth, async (c) => {
    const user = c.get("user");
    const { results } = await c.env.DB.prepare(
      `SELECT t.id AS tenant_id, t.name, t.slug, t.status, t.plan, t.trial_ends_at, t.subscription_ends_at, m.role
       FROM memberships m JOIN tenants t ON t.id = m.tenant_id
       WHERE m.user_id = ? ORDER BY m.created_at`,
    )
      .bind(user.id)
      .all<{
        tenant_id: string;
        name: string;
        slug: string;
        status: TenantStatus;
        plan: Plan;
        trial_ends_at: string | null;
        subscription_ends_at: string | null;
        role: Role;
      }>();

    const totpRow = await c.env.DB.prepare(`SELECT totp_enabled FROM users WHERE id = ?`)
      .bind(user.id)
      .first<{ totp_enabled: number }>();

    const body: MeResponse = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        totpEnabled: totpRow?.totp_enabled === 1,
        ...(isDemoUser(user.email) ? { isDemo: true } : {}),
        ...(isPlatformAdmin(c.env, user.email) ? { isPlatformAdmin: true } : {}),
        // Fase 25c: status comped sebelumnya TIDAK terlihat dari mana pun —
        // `isComped` hanya dipanggil saat MEMBUAT tenant, jadi satu-satunya cara
        // membuktikannya adalah membuat perusahaan lalu melihat paketnya. Itulah
        // sebabnya penyemaian demo 14 Agustus baru ketahuan salah paket setelah
        // mati di menit ke-9. Satu boolean di sini membuatnya bisa diperiksa
        // kapan saja tanpa menulis apa pun.
        comped: isComped(c.env, user.email),
      },
      memberships: results.map((r) => ({
        tenantId: r.tenant_id,
        tenantName: r.name,
        tenantSlug: r.slug,
        tenantStatus: r.status,
        role: r.role,
        plan: r.plan,
        trialEndsAt: r.trial_ends_at,
        subscriptionEndsAt: r.subscription_ends_at,
      })),
    };
    return c.json(body);
  })

  // -------------------------------------------------------------------------
  // Profil pengguna
  // -------------------------------------------------------------------------
  .patch("/profile", requireAuth, async (c) => {
    if (isDemoUser(c.get("user").email)) return c.json(DEMO_FORBIDDEN, 403);
    const parsed = updateProfileSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const user = c.get("user");
    await c.env.DB.prepare(`UPDATE users SET name = ? WHERE id = ?`).bind(parsed.data.name, user.id).run();
    await audit(c.env, { action: "auth.profile_updated", userId: user.id, ip: clientIp(c) });
    return c.json({ ok: true });
  })

  .post("/change-password", requireAuth, async (c) => {
    if (isDemoUser(c.get("user").email)) return c.json(DEMO_FORBIDDEN, 403);
    const parsed = changePasswordSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const user = c.get("user");
    const row = await c.env.DB.prepare(`SELECT password_hash FROM users WHERE id = ?`)
      .bind(user.id)
      .first<{ password_hash: string }>();
    if (!row || !(await verifyPassword(parsed.data.currentPassword, row.password_hash))) {
      return c.json({ error: "Password saat ini salah." }, 400);
    }

    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).bind(
        await hashPassword(parsed.data.newPassword),
        user.id,
      ),
      // Semua sesi LAIN dicabut; sesi ini tetap hidup.
      c.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ? AND id != ?`).bind(user.id, user.sessionId),
    ]);
    await audit(c.env, { action: "auth.password_changed", userId: user.id, ip: clientIp(c) });
    return c.json({ ok: true });
  })

  // -------------------------------------------------------------------------
  // 2FA TOTP: setup → scan/masukkan rahasia di aplikasi authenticator →
  // konfirmasi kode → aktif. Menonaktifkan juga butuh kode yang valid.
  // -------------------------------------------------------------------------
  .post("/2fa/setup", requireAuth, async (c) => {
    const user = c.get("user");
    if (isDemoUser(user.email)) return c.json(DEMO_FORBIDDEN, 403);
    const row = await c.env.DB.prepare(`SELECT totp_enabled FROM users WHERE id = ?`)
      .bind(user.id)
      .first<{ totp_enabled: number }>();
    if (row?.totp_enabled === 1) return c.json({ error: "2FA sudah aktif." }, 400);

    const secret = generateTotpSecret();
    await c.env.DB.prepare(`UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?`)
      .bind(secret, user.id)
      .run();
    return c.json({ secret, otpauthUrl: otpauthUrl(secret, user.email) });
  })

  .post("/2fa/enable", requireAuth, async (c) => {
    const user = c.get("user");
    if (isDemoUser(user.email)) return c.json(DEMO_FORBIDDEN, 403);
    const code = String((await c.req.json().catch(() => ({}))).code ?? "");
    const row = await c.env.DB.prepare(`SELECT totp_secret FROM users WHERE id = ?`)
      .bind(user.id)
      .first<{ totp_secret: string | null }>();
    if (!row?.totp_secret) return c.json({ error: "Jalankan setup 2FA terlebih dahulu." }, 400);
    if (!(await verifyTotp(row.totp_secret, code))) {
      return c.json({ error: "Kode salah — periksa aplikasi authenticator Anda." }, 400);
    }
    await c.env.DB.prepare(`UPDATE users SET totp_enabled = 1 WHERE id = ?`).bind(user.id).run();
    await audit(c.env, { action: "auth.totp_enabled", userId: user.id, ip: clientIp(c) });
    return c.json({ ok: true });
  })

  .post("/2fa/disable", requireAuth, async (c) => {
    const user = c.get("user");
    const code = String((await c.req.json().catch(() => ({}))).code ?? "");
    const row = await c.env.DB.prepare(`SELECT totp_secret, totp_enabled FROM users WHERE id = ?`)
      .bind(user.id)
      .first<{ totp_secret: string | null; totp_enabled: number }>();
    if (row?.totp_enabled !== 1 || !row.totp_secret) return c.json({ error: "2FA tidak aktif." }, 400);
    if (!(await verifyTotp(row.totp_secret, code))) {
      return c.json({ error: "Kode salah — 2FA tetap aktif." }, 400);
    }
    await c.env.DB.prepare(`UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?`)
      .bind(user.id)
      .run();
    await audit(c.env, { action: "auth.totp_disabled", userId: user.id, ip: clientIp(c) });
    return c.json({ ok: true });
  })

  // -------------------------------------------------------------------------
  // Verifikasi email & reset password
  // -------------------------------------------------------------------------
  .post("/verify", async (c) => {
    const token = (await c.req.json().catch(() => ({}))).token;
    if (typeof token !== "string" || !token) return c.json({ error: "Token tidak valid." }, 400);

    const row = await consumeToken(c.env, token, "verify");
    if (!row || !row.user_id) return c.json({ error: "Token tidak valid atau sudah kedaluwarsa." }, 400);

    await c.env.DB.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).bind(row.user_id).run();
    await audit(c.env, { action: "auth.email_verified", userId: row.user_id, ip: clientIp(c) });
    return c.json({ ok: true });
  })

  .post("/forgot-password", rateLimit({ key: "forgot", limit: 5, windowSeconds: 300 }), async (c) => {
    const parsed = forgotPasswordSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "Email tidak valid." }, 400);

    const user = await c.env.DB.prepare(`SELECT id, name FROM users WHERE email = ?`)
      .bind(parsed.data.email)
      .first<{ id: string; name: string }>();

    // Respons selalu sama agar tidak membocorkan keberadaan akun.
    if (user) {
      const token = await createEmailToken(c.env, { type: "reset", email: parsed.data.email, userId: user.id });
      await kirimEmail(c.env, {
        to: parsed.data.email,
        subject: "Reset password erpindo",
        text: `Halo ${user.name},\n\nKlik tautan berikut untuk mengatur ulang password Anda:\n${appOrigin(c)}/reset-password?token=${token}\n\nAbaikan email ini bila Anda tidak meminta reset.\n\n— Tim erpindo`,
      }, "auth.reset_password");
    }
    return c.json({ ok: true });
  })

  .post("/reset-password", async (c) => {
    const parsed = resetPasswordSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }

    const row = await consumeToken(c.env, parsed.data.token, "reset");
    if (!row || !row.user_id) return c.json({ error: "Token tidak valid atau sudah kedaluwarsa." }, 400);

    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).bind(
        await hashPassword(parsed.data.password),
        row.user_id,
      ),
      // Semua sesi lama dicabut setelah password berubah.
      c.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(row.user_id),
    ]);
    await audit(c.env, { action: "auth.password_reset", userId: row.user_id, ip: clientIp(c) });
    return c.json({ ok: true });
  });

export { createEmailToken, consumeToken, clientIp, appOrigin, createSession, setSessionCookie };
