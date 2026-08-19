import {
  ipAllowed,
  izinRute,
  PERMISSION_LABELS,
  PRESET_PERMISSIONS,
  ROLE_LEVEL,
  type PermissionKey,
  type Plan,
  type Role,
} from "@erpindo/shared";
import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { sha256Hex } from "../lib/crypto";
import { ensureTenantMigrated, TENANT_SCHEMA_VERSION } from "../lib/tenantDb";

export const SESSION_COOKIE = "erpindo_sid";

/** Muat sesi dari cookie; 401 bila tidak ada/kedaluwarsa. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const raw = getCookie(c, SESSION_COOKIE);
  if (!raw) return c.json({ error: "Belum masuk. Silakan login." }, 401);

  const sessionId = await sha256Hex(raw);
  const row = await c.env.DB.prepare(
    `SELECT s.id AS session_id, s.expires_at, u.id, u.name, u.email, u.email_verified
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
  )
    .bind(sessionId)
    .first<{
      session_id: string;
      expires_at: string;
      id: string;
      name: string;
      email: string;
      email_verified: number;
    }>();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return c.json({ error: "Sesi berakhir. Silakan login kembali." }, 401);
  }

  c.set("user", {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.email_verified === 1,
    sessionId: row.session_id,
  });
  await next();
};

/**
 * Admin platform (Fase 10e): hanya email pada PLATFORM_ADMIN_EMAILS (pola
 * COMPED_EMAILS — dipisah koma, case-insensitive). Dipasang setelah
 * requireAuth. Tanpa var ini SEMUA orang 403.
 */
export function isPlatformAdmin(env: AppEnv["Bindings"], email: string): boolean {
  return (env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export const requirePlatformAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!isPlatformAdmin(c.env, c.get("user").email)) {
    return c.json({ error: "Halaman ini khusus admin platform." }, 403);
  }
  await next();
};

/**
 * Muat konteks tenant dari parameter :tenantId dan pastikan user adalah
 * anggota dengan peran minimal tertentu. Dipasang setelah requireAuth.
 */
export function requireTenantRole(minRole: Role): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const tenantId = c.req.param("tenantId");
    if (!tenantId) return c.json({ error: "Tenant tidak ditemukan. Muat ulang halaman, lalu pilih dari daftar terbaru." }, 404);

    const user = c.get("user");
    const row = await c.env.DB.prepare(
      `SELECT t.id, t.name, t.slug, t.db_ref, t.status, t.plan, t.legacy_full_access,
              t.require_2fa, t.allowed_ips, t.schema_version, m.role, u.totp_enabled
       FROM memberships m
       JOIN tenants t ON t.id = m.tenant_id
       JOIN users u ON u.id = m.user_id
       WHERE m.user_id = ? AND m.tenant_id = ?`,
    )
      .bind(user.id, tenantId)
      .first<{
        id: string;
        name: string;
        slug: string;
        db_ref: string;
        status: string;
        plan: Plan;
        legacy_full_access: number;
        require_2fa: number;
        allowed_ips: string | null;
        schema_version: number;
        role: Role;
        totp_enabled: number;
      }>();

    if (!row) return c.json({ error: "Anda bukan anggota perusahaan ini." }, 403);
    if (row.status === "suspended") {
      return c.json({ error: "Langganan perusahaan ini sedang ditangguhkan." }, 402);
    }

    /**
     * Fase 24 — perusahaan yang belum berlangganan belum punya database.
     *
     * Penjaganya sengaja menguji `db_ref`, BUKAN status. Status bisa sudah
     * `active` sementara databasenya belum sempat dibuat (webhook tiba saat
     * pool penuh), dan justru keadaan itulah yang paling berbahaya: blok
     * auto-migrasi di bawah memanggil `ensureTenantMigrated` yang akan meledak
     * pada `db_ref` kosong, sehingga pelanggan melihat 500 alih-alih penjelasan.
     *
     * Karena itu penjaga ini WAJIB berada di atas blok migrasi, dan menolak
     * SEMUA method termasuk GET — tidak ada data untuk dibaca. Endpoint billing
     * tidak terpengaruh: ia memakai `requireAuth` + cek keanggotaan sendiri,
     * jadi jalur pembayarannya tetap terbuka. Tanpa itu, penjaga ini akan
     * mengunci pelanggan di luar halaman pembayarannya sendiri.
     */
    if (row.db_ref === "") {
      const belumBayar = row.status === "provisioning";
      return c.json(
        {
          error: belumBayar
            ? "Perusahaan ini belum berlangganan. Aktifkan langganan untuk mulai mencatat transaksi."
            : "Perusahaan ini sedang disiapkan. Buka halaman Langganan sebentar lagi.",
          detail: belumBayar ? "belum-berlangganan" : "sedang-disiapkan",
        },
        402,
      );
    }

    // Keamanan enterprise (Fase 13g). Endpoint pengaturan keamanan sendiri
    // (…/security) SELALU dikecualikan dari pembatasan IP DAN dari kewajiban 2FA
    // — katup pengaman agar Owner yang salah mengetik CIDR atau mengaktifkan 2FA
    // tanpa TOTP tetap bisa membukanya kembali. Ekspor audit (…/security/audit.csv)
    // BUKAN katup ini (tidak berakhir "/security") sehingga tetap ditegakkan.
    const isSecurityConfig = c.req.path.endsWith("/security");
    if (!isSecurityConfig && row.allowed_ips) {
      let list: string[] = [];
      try {
        list = JSON.parse(row.allowed_ips) as string[];
      } catch {
        list = [];
      }
      const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
      if (!ipAllowed(ip, list)) {
        return c.json(
          { error: "Akses dari alamat IP ini diblokir oleh kebijakan keamanan perusahaan.", detail: "ip-not-allowed" },
          403,
        );
      }
    }
    // 2FA wajib: anggota tanpa TOTP aktif harus menyiapkannya lebih dulu
    // (endpoint /api/auth/totp/* berada di luar cakupan tenant, tetap terjangkau).
    if (!isSecurityConfig && row.require_2fa === 1 && row.totp_enabled !== 1) {
      return c.json(
        { error: "Perusahaan ini mewajibkan verifikasi 2 langkah (2FA). Aktifkan 2FA di Profil untuk melanjutkan.", detail: "2fa-required" },
        403,
      );
    }

    // Auto-migrasi malas: bila database tenant ini tertinggal skema (mis. baru
    // saja rilis migrasi baru), terapkan sebelum modul menyentuhnya. Idempoten &
    // hanya bekerja saat versi tertinggal. Kegagalan migrasi tidak boleh memutus
    // akses total — dicatat lalu request lanjut (versi tetap tertinggal → dicoba
    // ulang pada request berikutnya), sehingga bersifat swasembuh.
    if (row.schema_version < TENANT_SCHEMA_VERSION) {
      try {
        await ensureTenantMigrated(c.env, { id: row.id, dbRef: row.db_ref, schemaVersion: row.schema_version });
      } catch (err) {
        console.error(`[db] auto-migrasi tenant ${row.id} gagal:`, err);
      }
    }
    // Menunggak (trial berakhir / tagihan lewat jatuh tempo): data tetap bisa
    // dibaca, tetapi semua perubahan diblokir sampai langganan aktif kembali.
    if (row.status === "past_due" && c.req.method !== "GET") {
      return c.json(
        { error: "Masa trial/langganan telah berakhir — akun dalam mode baca-saja. Silakan aktifkan langganan." },
        402,
      );
    }
    if (ROLE_LEVEL[row.role] < ROLE_LEVEL[minRole]) {
      return c.json({ error: "Anda tidak memiliki hak akses untuk aksi ini." }, 403);
    }

    c.set("tenant", {
      id: row.id,
      name: row.name,
      slug: row.slug,
      dbRef: row.db_ref,
      status: row.status,
      role: row.role,
      plan: row.plan,
      legacyFullAccess: row.legacy_full_access === 1,
    });
    await next();
  };
}

/**
 * Penegakan izin RBAC berbasis registri (Fase 26a; penegakan paket dicabut
 * Fase 30).
 *
 * SATU middleware global di `/api/tenants/:tenantId/*`. Peta segmen → modul yang
 * dulu tinggal di berkas ini dipindahkan ke `TENANT_ROUTE_ACCESS`
 * (`packages/shared/src/core.ts`) karena kini ia juga menentukan izin RBAC, dan
 * karena hanya dengan satu daftar terpusat sebuah **uji kelengkapan** bisa
 * membuktikan tidak ada segmen route yang terlewat (`test/rbac-registry.test.ts`).
 *
 * Yang diperbaiki (temuan audit A): sebelum ini `requirePermission` hanya
 * terpasang di `routes/tax.ts`, sehingga peran kustom
 * `{ baseRole: "admin", permissions: ["penjualan","kasir"] }` tetap bisa
 * memanggil akuntansi/penggajian/pengadaan langsung lewat API — pembatasnya
 * hanya menu di layar, dan menu bukan penjaga keamanan.
 *
 * Fase 30 mencabut lapis paketnya (`requirePlanModule`) karena hanya ada satu
 * paket dan seluruh modul terbuka. Yang tersisa — dan yang sejak awal menjadi
 * batas keamanan sesungguhnya — adalah izin RBAC di bawah ini.
 *
 * Segmen yang tidak dikenal dilewatkan begitu saja — sama seperti perilaku lama.
 * Yang menjaga agar itu tidak menjadi lubang adalah uji kelengkapan tadi, bukan
 * middleware ini.
 */
export const enforceTenantAccessByPath: MiddlewareHandler<AppEnv> = async (c, next) => {
  const segment = c.req.path.split("/")[4] ?? ""; // ["", "api", "tenants", id, segment, ...]
  const aturan = izinRute(segment, c.req.method);
  if (!aturan) return next();

  const tolakIzin = await periksaIzin(c, aturan.izin);
  if (tolakIzin) return tolakIzin;
  return next();
};

/**
 * Kembalikan 403 bila peran efektif tidak memuat izin yang diminta; `null` bila
 * boleh lanjut.
 *
 * Sesi tidak valid / bukan anggota sengaja TIDAK dijawab di sini: dibiarkan
 * jatuh ke `requireTenantRole` di route agar pesannya tetap yang lama, dan agar
 * pesan izin tidak membocorkan keberadaan tenant kepada orang luar.
 */
async function periksaIzin(
  c: Parameters<MiddlewareHandler<AppEnv>>[0],
  izin: PermissionKey | null,
): Promise<Response | null> {
  if (!izin) return null;
  const tenantId = c.req.param("tenantId");
  const raw = getCookie(c, SESSION_COOKIE);
  if (!tenantId || !raw) return null;

  const sessionId = await sha256Hex(raw);
  const sesi = await c.env.DB.prepare(
    `SELECT s.user_id, s.expires_at FROM sessions s WHERE s.id = ?`,
  )
    .bind(sessionId)
    .first<{ user_id: string; expires_at: string }>();
  if (!sesi || new Date(sesi.expires_at).getTime() < Date.now()) return null;

  const resolved = await resolvePermissions(c.env, sesi.user_id, tenantId);
  if (!resolved) return null; // bukan anggota → requireTenantRole yang menjawab
  if (!resolved.permissions.includes(izin)) {
    return c.json(
      {
        error: `Peran Anda tidak memiliki akses ke modul ${PERMISSION_LABELS[izin] ?? izin}.`,
        detail: "permission-denied",
        permission: izin,
      },
      403,
    );
  }
  return null;
}

/**
 * Izin modul efektif seorang anggota (Fase 7e). Owner selalu penuh; anggota
 * dengan peran kustom memakai izin peran itu; selain itu memakai preset base role.
 */
export async function resolvePermissions(
  env: AppEnv["Bindings"],
  userId: string,
  tenantId: string,
): Promise<{ role: Role; roleName: string; permissions: PermissionKey[]; scopeCostCenterIds: string[] | null } | null> {
  const row = await env.DB.prepare(
    `SELECT m.role, m.custom_role_id, r.name AS role_name, r.permissions, r.scope_cost_center_ids
     FROM memberships m LEFT JOIN custom_roles r ON r.id = m.custom_role_id
     WHERE m.user_id = ? AND m.tenant_id = ?`,
  )
    .bind(userId, tenantId)
    .first<{
      role: Role;
      custom_role_id: string | null;
      role_name: string | null;
      permissions: string | null;
      scope_cost_center_ids: string | null;
    }>();
  if (!row) return null;
  if (row.role === "owner") {
    return { role: "owner", roleName: "Pemilik", permissions: [...PRESET_PERMISSIONS.owner], scopeCostCenterIds: null };
  }
  if (row.custom_role_id && row.permissions) {
    let perms: PermissionKey[] = [];
    try {
      perms = JSON.parse(row.permissions) as PermissionKey[];
    } catch {
      perms = [];
    }
    // Scope dimensi (Fase 8d): NULL / array kosong = tanpa batasan.
    let scope: string[] | null = null;
    try {
      const parsed = row.scope_cost_center_ids ? (JSON.parse(row.scope_cost_center_ids) as string[]) : null;
      scope = parsed && parsed.length > 0 ? parsed : null;
    } catch {
      scope = null;
    }
    return { role: row.role, roleName: row.role_name ?? "Peran kustom", permissions: perms, scopeCostCenterIds: scope };
  }
  return {
    role: row.role,
    roleName: row.role === "admin" ? "Admin" : "Viewer",
    permissions: [...PRESET_PERMISSIONS[row.role]],
    scopeCostCenterIds: null,
  };
}

/**
 * Pastikan anggota punya izin modul tertentu (Fase 7e). Dipasang BERDAMPINGAN
 * setelah requireTenantRole — preset Owner/Admin/Viewer memberi semua modul
 * (kecuali admin tanpa "pengguna"), jadi jalur lama tetap lolos; peran kustom
 * bisa membatasi ke sebagian modul.
 */
export function requirePermission(module: PermissionKey): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const tenantId = c.req.param("tenantId");
    const user = c.get("user");
    if (!tenantId || !user) return c.json({ error: "Tidak diizinkan." }, 403);
    const resolved = await resolvePermissions(c.env, user.id, tenantId);
    if (!resolved || !resolved.permissions.includes(module)) {
      return c.json({ error: "Peran Anda tidak memiliki akses ke modul ini." }, 403);
    }
    await next();
  };
}
