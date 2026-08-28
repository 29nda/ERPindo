import { z } from "zod";

// ---------------------------------------------------------------------------
// Peran & status — konstanta lintas frontend/backend
// ---------------------------------------------------------------------------

export const ROLES = ["owner", "admin", "viewer"] as const;
export type Role = (typeof ROLES)[number];

/** Urutan kekuatan peran; angka lebih besar = hak lebih tinggi. */
export const ROLE_LEVEL: Record<Role, number> = {
  viewer: 1,
  admin: 2,
  owner: 3,
};

// ---------------------------------------------------------------------------
// RBAC granular (Fase 7e): izin per modul. ADDITIVE — Owner/Admin/Viewer tetap
// preset yang memetakan ke set izin; requireTenantRole lama tetap menegakkan
// baca/tulis per level, izin modul mengatur AKSES modul (visibilitas + gate).
// ---------------------------------------------------------------------------
export const PERMISSIONS = [
  { key: "penjualan", label: "Penjualan & Pesanan" },
  { key: "pembelian", label: "Pembelian & Pengadaan" },
  { key: "kasir", label: "Kasir (POS)" },
  { key: "stok", label: "Stok & Produk" },
  { key: "keuangan", label: "Keuangan & Akuntansi" },
  { key: "pajak", label: "Pajak" },
  { key: "laporan", label: "Laporan" },
  { key: "hr", label: "HR & Penggajian" },
  { key: "proyek", label: "Proyek & operasi" },
  { key: "crm", label: "CRM & Penawaran" },
  { key: "persetujuan", label: "Persetujuan" },
  { key: "pengaturan", label: "Pengaturan perusahaan" },
  { key: "pengguna", label: "Kelola pengguna & peran" },
] as const;
export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as PermissionKey[];
export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.label]));

/** Peta preset peran → izin modul. Owner = semua; Admin = semua kecuali kelola pengguna;
 *  Viewer = semua modul terlihat (baca-saja ditegakkan oleh requireTenantRole). */
export const PRESET_PERMISSIONS: Record<Role, PermissionKey[]> = {
  owner: [...PERMISSION_KEYS],
  admin: PERMISSION_KEYS.filter((k) => k !== "pengguna"),
  viewer: [...PERMISSION_KEYS],
};

/** Peran kustom: nama + preset dasar (untuk kompatibilitas requireTenantRole) + izin modul. */
export const customRoleSchema = z.object({
  name: z.string().trim().min(2, "Nama peran minimal 2 karakter").max(40),
  baseRole: z.enum(["admin", "viewer"]),
  permissions: z.array(z.enum(PERMISSION_KEYS as [PermissionKey, ...PermissionKey[]])).min(1, "Pilih minimal satu modul"),
  /** RBAC berdimensi (Fase 8d): batasi data ke cost center tertentu. Kosong/absen = semua. */
  scopeCostCenterIds: z.array(z.string()).max(20, "Maksimal 20 cost center").optional(),
});
export type CustomRoleInput = z.infer<typeof customRoleSchema>;
export type ApiCustomRole = {
  id: string;
  name: string;
  baseRole: "admin" | "viewer";
  permissions: PermissionKey[];
  /** null = tanpa batasan dimensi (perilaku lama). */
  scopeCostCenterIds: string[] | null;
  memberCount: number;
  createdAt: string;
};
/** Penetapan peran anggota: preset (owner/admin/viewer) ATAU peran kustom. */
export const assignRoleSchema = z
  .object({
    preset: z.enum(ROLES).optional(),
    customRoleId: z.string().optional(),
  })
  .refine((v) => Boolean(v.preset) !== Boolean(v.customRoleId), "Pilih preset ATAU peran kustom (salah satu).");
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type ApiMyPermissions = {
  role: Role;
  roleName: string;
  permissions: PermissionKey[];
  /** RBAC berdimensi (Fase 8d): null = akses semua cost center. */
  scopeCostCenterIds?: string[] | null;
};

// --- Akuntansi dimensi + rekonsiliasi v2 (Fase 7f) --------------------------
export const costCenterSchema = z.object({
  code: z.string().trim().min(1, "Kode wajib diisi").max(20),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
});
export type CostCenterInput = z.infer<typeof costCenterSchema>;
export type ApiCostCenter = { id: string; code: string; name: string; createdAt: string };
/** Ringkasan laba/rugi per dimensi (cost center) suatu periode. */
export type ApiDimensionRow = { costCenterId: string | null; code: string; name: string; income: number; expense: number; net: number };
export type ApiDimensionReport = { from: string; to: string; rows: ApiDimensionRow[] };

/** Aturan auto-match rekonsiliasi bank v2: kata kunci deskripsi + toleransi hari. */
export const bankMatchRuleSchema = z.object({
  accountId: z.string().min(1, "Pilih akun kas atau bank lebih dulu."),
  keyword: z.string().trim().min(1, "Kata kunci wajib diisi").max(60),
  dateTolerance: z.number().int().min(0).max(14).default(3),
});
export type BankMatchRuleInput = z.infer<typeof bankMatchRuleSchema>;
export type ApiBankMatchRule = { id: string; accountId: string; keyword: string; dateTolerance: number; active: boolean; createdAt: string };

/** Preset pemetaan kolom CSV rekening koran bank besar (Fase 7f). */
export const BANK_CSV_PRESETS = [
  { code: "generic", label: "Umum (tanggal, keterangan, jumlah)", dateCol: "tanggal", descCol: "keterangan", debitCol: "", creditCol: "", amountCol: "jumlah", dateFormat: "YYYY-MM-DD" },
  { code: "bca", label: "BCA (mutasi rekening)", dateCol: "Tanggal", descCol: "Keterangan", debitCol: "Mutasi DB", creditCol: "Mutasi CR", amountCol: "", dateFormat: "DD/MM" },
  { code: "mandiri", label: "Mandiri (rekening koran)", dateCol: "Tanggal Transaksi", descCol: "Uraian", debitCol: "Debet", creditCol: "Kredit", amountCol: "", dateFormat: "DD/MM/YYYY" },
  { code: "bri", label: "BRI (mutasi)", dateCol: "Tanggal", descCol: "Uraian Transaksi", debitCol: "Debet", creditCol: "Kredit", amountCol: "", dateFormat: "DD-MM-YYYY" },
] as const;

/**
 * Siklus hidup tenant.
 *
 * **`provisioning` = terdaftar, belum berlangganan** (Fase 24). Status ini sudah
 * ada di daftar sejak awal tetapi tidak pernah dipakai; Fase 24 memberinya arti
 * yang memang diantisipasi desainnya: tenant yang **belum punya database sama
 * sekali**. Databasenya baru dibuat saat pembayaran pertama terkonfirmasi.
 *
 * `trial` DIHAPUS pada Fase 24 — tidak ada lagi masa coba gratis. Calon
 * pelanggan menilai produk lewat demo publik berisi 6 bulan data nyata.
 */
export const TENANT_STATUSES = [
  "provisioning",
  "active",
  "past_due",
  "suspended",
] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Paket langganan & batasnya (Fase 2b).
// ---------------------------------------------------------------------------

/**
 * Fase 30: **SATU paket saja.** Pemaketan bertingkat (Starter/Business/
 * Enterprise, Fase 13a) dibubarkan atas keputusan pemilik.
 *
 * Alasannya bukan penyederhanaan kode, melainkan penjualan: pembedanya dulu
 * adalah "kedalaman operasional", dan calon pelanggan tidak bisa menilai
 * kedalaman yang belum pernah dipakainya. Yang benar-benar terjadi adalah UKM
 * membeli Starter, menemukan penggajian terkunci di bulan kedua, lalu merasa
 * dijebak. Satu harga menghapus seluruh kelas kekecewaan itu.
 *
 * Daftar ini tetap berbentuk array meski isinya satu: `plan` adalah kolom
 * control-plane yang sudah terisi di baris tenant yang ada, dan bentuk jamak
 * membuat migrasi nilai lama (`starter`/`business`/`enterprise` → `lengkap`)
 * bisa dinyatakan tanpa mengubah tipe di seluruh repo sekaligus.
 */
export const PLANS = ["lengkap"] as const;
export type Plan = (typeof PLANS)[number];

/**
 * Satu paket, satu harga, per perusahaan per bulan.
 *
 * Yang SENGAJA tidak ada di sini lagi:
 *
 * - `maxEntities` — dihapus karena **tidak pernah ditegakkan satu baris pun**.
 *   Ia hanya dicetak di landing ("Enterprise mencakup 3 entitas") dan di kartu
 *   langganan. Yang benar-benar membatasi penambahan perusahaan adalah pagar
 *   anti-abuse `belumBayar` di `routes/auth.ts`, dan itu tetap ada. Menyisakan
 *   "batas" yang tidak membatasi apa pun adalah jebakan bagi pembaca
 *   berikutnya — dan lebih buruk lagi, janji yang bisa dibantah pelanggan.
 * - Penguncian modul — lihat catatan pencabutan `MODULE_MIN_PLAN` di bawah.
 *
 * `maxUsers` DIPERTAHANKAN meski nilainya tak terhingga: penjaganya nyata di
 * `routes/tenants.ts` dan angka inilah yang menyatakan janji inti produk —
 * pengguna tak terbatas, pembeda utama melawan ERP yang menagih per kepala.
 */
export const PLAN_LIMITS: Record<
  Plan,
  { label: string; pricePerMonth: number; aiDailyLimit: number; maxUsers: number }
> = {
  lengkap: {
    label: "Lengkap",
    pricePerMonth: 499_000,
    // Kuota harian asisten AI per perusahaan. Angka Business lama (100) dipakai
    // sebagai nilai tunggal: cukup longgar untuk pemakaian nyata, tetapi tetap
    // menjadi pagar keadilan agar satu tenant tidak menghabiskan alokasi
    // Workers AI (10.000 neuron/hari) milik seluruh akun.
    aiDailyLimit: 100,
    maxUsers: Number.MAX_SAFE_INTEGER,
  },
};

/**
 * Masa tenggang (Fase 20c): hari akun MASIH BISA MENULIS setelah masa
 * berlakunya habis, sebelum jatuh ke baca-saja. Keputusan pemilik: 3 hari.
 *
 * Diletakkan di `shared` karena dipakai TIGA sisi: cron (menurunkan status),
 * web (spanduk), dan uji. Satu angka, satu tempat.
 */
export const GRACE_DAYS = 3;

const HARI_MS = 86_400_000;

/**
 * Kapan tenant benar-benar menjadi baca-saja, dihitung dari tanggal habisnya.
 *
 * ## Kenapa rumusnya di sini, bukan di dua tempat (Fase 38q)
 *
 * Sampai fase ini `GRACE_DAYS` dibagi lewat berkas ini, tetapi **rumus yang
 * memakainya digandakan**: `apps/web/src/lib/tenggang.ts` dan
 * `apps/api/src/lib/dunning.ts` masing-masing menghitungnya sendiri. Komentar
 * di berkas web menjelaskan alasannya — "web tidak bisa mengimpor dari
 * apps/api" — dan alasan itu benar.
 *
 * Tetapi ia hanya menuntut rumusnya berada di tempat KETIGA yang bisa diimpor
 * keduanya, dan tempat itu adalah berkas ini. Keduanya sudah mengimpor
 * `GRACE_DAYS` dari sini; yang kurang hanya rumus empat barisnya.
 *
 * Yang membuatnya layak dibereskan: kedua salinan menghitung batas yang sama
 * dengan cara yang sedikit berbeda (satu lewat `Date.parse` atas ISO string,
 * satu lewat aritmetika milidetik langsung). Selama keduanya benar, tidak ada
 * yang menyadarinya; begitu salah satu diperbaiki, yang lain diam-diam
 * berbeda.
 */
export function batasBacaSaja(habisPada: string): string {
  return new Date(Date.parse(habisPada) + GRACE_DAYS * HARI_MS).toISOString();
}

/** Sedang dalam masa tenggang: jatuh tempo lewat, belum baca-saja. */
export function dalamTenggang(habisPada: string, nowMs: number = Date.now()): boolean {
  const mulai = Date.parse(habisPada);
  return nowMs >= mulai && nowMs < mulai + GRACE_DAYS * HARI_MS;
}

/** Sisa hari tenggang (0 bila sudah lewat). */
export function sisaTenggang(habisPada: string, nowMs: number = Date.now()): number {
  return Math.max(Math.ceil((Date.parse(habisPada) + GRACE_DAYS * HARI_MS - nowMs) / HARI_MS), 0);
}

export const PLAN_LABELS: Record<Plan, string> = {
  lengkap: PLAN_LIMITS.lengkap.label,
};

/**
 * Paket yang bisa dibeli. Identik dengan `PLANS` — seluruh paket dijual.
 * Alias dipertahankan karena dipakai luas di checkout & halaman harga, dan
 * namanya menyatakan maksud ("yang bisa dibeli") yang tetap berguna dibaca.
 */
export const PAID_PLANS = PLANS;
export type PaidPlan = Plan;

/**
 * PENCABUTAN prorata ganti paket (Fase 30, dulu Fase 20k).
 *
 * `hitungProrata()`, `BILLING_CYCLE_DAYS`, `ProrataInput/Result/Arah`, dan
 * `changePlanSchema` dihapus seluruhnya. Dengan satu paket tidak ada paket lain
 * untuk dituju, jadi "naik/turun paket" bukan lagi fitur yang disederhanakan —
 * ia tidak punya arti sama sekali.
 *
 * Menyisakannya "untuk berjaga-jaga" akan mengulang persis kesalahan yang
 * dicatat Fase 24 tentang paket `trial`: sebuah konsep yang tidak dijual tetap
 * tinggal di dalam kode yang menjual, lalu menjalar diam-diam ke lencana,
 * harga, dan penegakan modul.
 *
 * `SINGLE_PLAN` (Rp389.000, sudah bertanda deprecated) ikut dihapus. Namanya
 * justru baru sekarang menjadi benar sementara angkanya salah — bentuk jebakan
 * yang paling mudah termakan.
 */

// ---------------------------------------------------------------------------
// PENCABUTAN penguncian modul per paket (Fase 30, dulu Fase 13a).
//
// Dihapus seluruhnya: MODULE_KEYS, MODULE_LABELS, MODULE_MIN_PLAN,
// PLAN_ACCESS_RANK, planIncludesModule, minPlanForModule, modulesForPlan —
// beserta field `modul` pada TENANT_ROUTE_ACCESS dan middleware
// `requirePlanModule` yang menegakkannya. Respons 403 `plan-upgrade-required`
// tidak ada lagi di seluruh API.
//
// Yang TETAP ada, dan perbedaannya penting: **izin RBAC** (`baca`/`tulis` pada
// TENANT_ROUTE_ACCESS). Modul kini terbuka untuk semua *paket*, TIDAK untuk
// semua *peran*. Kasir tetap tidak bisa membuka penggajian; yang berubah hanya
// bahwa perusahaan tidak perlu membayar lebih untuk memilikinya. Mencampur
// keduanya akan mengubah pembongkaran paywall menjadi pembongkaran keamanan.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Skema validasi bersama (dipakai form web & endpoint API)
// ---------------------------------------------------------------------------

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Alamat email tidak valid");

export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(128, "Password maksimal 128 karakter");

export const slugSchema = z
  .string()
  .min(3, "Minimal 3 karakter")
  .max(40, "Maksimal 40 karakter")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Hanya huruf kecil, angka, dan tanda hubung");

export const registerSchema = z.object({
  companyName: z.string().trim().min(2, "Nama perusahaan minimal 2 karakter").max(100),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Buat perusahaan tambahan untuk pengguna yang sudah login (multi-perusahaan). */
export const createCompanySchema = z.object({
  companyName: z.string().trim().min(2, "Nama perusahaan minimal 2 karakter").max(100),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password wajib diisi"),
  /** Kode authenticator 6 digit — wajib bila akun mengaktifkan 2FA. */
  totpCode: z.string().trim().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "viewer"]),
});
export type InviteInput = z.infer<typeof inviteSchema>;

/** Ubah peran anggota tim (Owner). "owner" = alih kepemilikan. */
export const updateMemberRoleSchema = z.object({
  role: z.enum(ROLES),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const acceptInviteSchema = z.object({ token: z.string().min(1) });

export const updateTenantSettingsSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  address: z.string().trim().max(500).optional(),
  npwp: z.string().trim().max(30).optional(),
  /**
   * Logo kop faktur/struk: data URL PNG/JPEG/SVG ≤64KB (base64, disimpan di
   * settings DB tenant — tanpa butuh object storage). String kosong = hapus.
   */
  logoDataUrl: z
    .string()
    .max(90_000, "Logo terlalu besar — maksimal ±64KB")
    .refine((v) => v === "" || /^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(v), "Format logo tidak dikenal")
    .optional(),
  /**
   * Jurnal penutup tahunan otomatis (Fase 21d). Default mati, dan hanya Pemilik
   * yang boleh mengubahnya — endpoint ini sendiri terbuka untuk admin, jadi
   * penjaganya ada di route.
   */
  autoClosingEntry: z.boolean().optional(),
  /**
   * Profil pajak (Fase 22e) — menentukan kewajiban mana yang muncul di kalender.
   *
   * Ketiganya disetel manual karena tak satu pun bisa disimpulkan dari data
   * dengan aman: menebak PKP dari adanya NPWP, atau menebak badan usaha dari
   * nama perusahaan, akan menampilkan tenggat yang tidak berlaku. Kalender yang
   * memuat kewajiban asing melatih orang mengabaikannya, dan pengingat yang
   * diabaikan sama saja tidak ada.
   *
   * "Punya karyawan" TIDAK ada di sini — itu satu-satunya yang memang bisa
   * dibaca dari data (jumlah karyawan aktif), jadi tidak perlu ditanyakan.
   */
  pkp: z.boolean().optional(),
  pphFinalUmkm: z.boolean().optional(),
  badanUsaha: z.boolean().optional(),
});
export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;

// ---------------------------------------------------------------------------
// Bentuk respons API (kontrak untuk frontend)
// ---------------------------------------------------------------------------

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  /** true hanya pada sesi akun demo publik baca-saja (Fase 10b). */
  isDemo?: boolean;
  /** true bila email ada di PLATFORM_ADMIN_EMAILS (Fase 10e) — menampilkan menu Admin. */
  isPlatformAdmin?: boolean;
  /**
   * true bila email ada di COMPED_EMAILS (Fase 25c) — perusahaan yang dibuat
   * akun ini lahir `active` + paket `enterprise`, bukan `provisioning` +
   * `starter`. Dipantulkan agar keadaan ini bisa diperiksa tanpa membuat
   * perusahaan lebih dulu; tidak dipakai untuk menentukan izin apa pun.
   */
  comped: boolean;
};

export type ApiMembership = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: TenantStatus;
  role: Role;
  plan: Plan;
  /** Tanggal langganan berakhir (Fase 11b); NULL untuk akun comped. */
  subscriptionEndsAt?: string | null;
};

// --- Billing langganan (Fase 11b) ------------------------------------------
export type ApiSubscriptionInvoice = {
  id: string;
  orderId: string;
  amount: number;
  periodMonths: number;
  status: "pending" | "paid" | "failed" | "expired";
  transactionStatus: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type BillingStatus = {
  /** true bila kunci Xendit terpasang → checkout aktif. */
  configured: boolean;
  /**
   * true bila kunci yang terpasang kunci UJI Xendit (Fase 25a). Xendit memakai
   * host yang sama untuk uji & produksi, jadi tanpa penanda ini pembayaran uji
   * di produksi tak bisa dibedakan dari pembayaran sungguhan.
   */
  modeUji: boolean;
  plan: Plan;
  status: TenantStatus;
  subscriptionEndsAt: string | null;
  /** Harga paket saat ini. Katalog paket dibaca UI dari PLAN_LIMITS. */
  pricePerMonth: number;
  /** Grandfather: pelanggan lama harga tunggal → akses penuh walau paketnya starter/business. */
  legacyFullAccess: boolean;
  invoices: ApiSubscriptionInvoice[];
};

/** Pilih paket berbayar yang akan di-checkout (Fase 13b). */
export const checkoutSchema = z.object({
  plan: z.enum(PAID_PLANS),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Set paket tenant manual oleh platform admin (Fase 13b). */
export const setTenantPlanSchema = z.object({
  plan: z.enum(PLANS),
  status: z.enum(TENANT_STATUSES).optional(),
  legacyFullAccess: z.boolean().optional(),
  /**
   * Akhir periode berlangganan (Fase 20k). Admin platform mengaktifkan
   * pelanggan yang membayar di luar Xendit — transfer manual masih cara
   * paling umum di segmen ini, dan tanpa ini tenant semacam itu tidak punya
   * siklus berjalan sehingga tidak bisa pindah paket dengan prorata.
   */
  subscriptionEndsAt: z.string().datetime().nullable().optional(),
});
export type SetTenantPlanInput = z.infer<typeof setTenantPlanSchema>;

/**
 * Kalkulator perbandingan implisit (Fase 13c): asumsi biaya ERP per-pengguna
 * (kategori, tanpa menyebut merek) untuk menonjolkan bahwa ERPindo TIDAK
 * menagih per user. Nilai konservatif Rp350rb/pengguna/bulan.
 */
export const ASSUMED_PER_USER_PRICE = 350_000;

/** Estimasi biaya bulanan sistem ERP per-pengguna untuk N pengguna. */
export function perUserMonthlyCost(users: number, pricePerUser = ASSUMED_PER_USER_PRICE): number {
  const n = Math.max(0, Math.floor(users));
  return n * pricePerUser;
}

// --- Payment collection + WhatsApp share (Fase 11d) ------------------------
export type ApiPaymentLink = {
  orderId: string;
  amount: number;
  status: "pending" | "paid" | "expired" | "failed";
  redirectUrl: string | null;
  paidAt: string | null;
  createdAt: string;
};

/**
 * Bangun tautan WhatsApp klik-untuk-kirim (wa.me) — TANPA API/kunci, langsung
 * bekerja. Menormalkan nomor Indonesia (0812… → 62812…). Mengembalikan null
 * bila nomor tidak memadai (pemanggil bisa fallback ke wa.me tanpa nomor).
 */
export function waLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  let p = phone.replace(/[^0-9]/g, "");
  if (p.startsWith("620")) p = "62" + p.slice(3);
  else if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (!p.startsWith("62")) p = "62" + p;
  if (p.length < 9) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export type MeResponse = {
  user: ApiUser;
  memberships: ApiMembership[];
};

export type ApiMember = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  customRoleId: string | null;
  roleName: string | null;
  joinedAt: string;
};

export type ApiError = { error: string; issues?: Record<string, string[]> };


// ---------------------------------------------------------------------------
// Registri akses rute tenant (Fase 26a)
// ---------------------------------------------------------------------------

/**
 * Satu tabel yang menentukan, untuk tiap segmen path pertama setelah
 * `/api/tenants/:tenantId/`, **dua** hal sekaligus: modul berpaket yang
 * mencakupnya dan izin RBAC yang dibutuhkan.
 *
 * Kenapa satu tabel, bukan middleware per-endpoint (Fase 26a):
 *
 * Sebelum ini `requirePermission` hanya terpasang di `routes/tax.ts` — 39 berkas
 * route lain tidak memakainya sama sekali. Akibatnya peran kustom
 * `{ baseRole: "admin", permissions: ["penjualan", "kasir"] }` tetap bisa
 * memanggil akuntansi, penggajian, dan pengadaan lewat API; yang membatasinya
 * hanya menu di layar. Akar masalahnya bukan "satu route lupa dipasangi
 * penjaga", melainkan **tidak ada satu pun tempat yang tahu daftar lengkap
 * segmen route** — jadi kelalaian tidak mungkin terlihat.
 *
 * Tabel ini menjadi tempat itu, dan `test/rbac-registry.test.ts` menegakkannya:
 * uji itu membaca router Hono sungguhan dan **gagal bila ada segmen tanpa
 * entri**. Route baru karena itu tidak bisa diam-diam lolos — penulisnya
 * dipaksa menyatakan izinnya, termasuk bila jawabannya "tidak dijaga izin".
 *
 * Baca vs tulis dipisah karena beberapa segmen dibaca sebagai konfigurasi
 * bersama tetapi hanya boleh diubah pemegang izin: kasir perlu MEMBACA
 * `settings` (footer struk) dan `products` (pindai barcode), tetapi tidak boleh
 * mengubah keduanya. Menyamakan baca & tulis akan mematikan POS bagi kasir —
 * persis peran yang contoh keamanannya ingin izinkan.
 */
export type AksesRute = {
  /** Izin untuk GET/HEAD. `null` = tidak dijaga izin (peran saja). */
  baca: PermissionKey | null;
  /** Izin untuk POST/PATCH/PUT/DELETE. `null` = tidak dijaga izin (peran saja). */
  tulis: PermissionKey | null;
};

export const TENANT_ROUTE_ACCESS: Record<string, AksesRute> = {
  // --- Inti: tidak dijaga izin sama sekali -----------------------------------
  // Cangkang aplikasi. `my-permissions` HARUS terbuka: dari sinilah UI belajar
  // izinnya sendiri, jadi menjaganya dengan izin berarti melingkar.
  dashboard: { baca: null, tulis: null },
  notifications: { baca: null, tulis: null },
  "my-permissions": { baca: null, tulis: null },
  ai: { baca: null, tulis: null },
  // Langganan: sengaja TIDAK dijaga izin. Menjaganya berisiko mengunci pemilik
  // di luar halaman pembayarannya sendiri — jalur uang harus selalu terbuka.
  billing: { baca: null, tulis: null },
  // Kelola pengguna (Fase 26a, keputusan pemilik): tetap dijaga PERAN saja
  // (owner/admin) seperti sebelumnya, tidak ikut dijaga izin `pengguna`.
  // Menjaganya dengan izin akan mencabut hak yang sudah dipakai Admin preset.
  members: { baca: null, tulis: null },
  invites: { baca: null, tulis: null },
  roles: { baca: null, tulis: null },

  // --- Penjualan -------------------------------------------------------------
  invoices: { baca: "penjualan", tulis: "penjualan" },
  payments: { baca: "penjualan", tulis: "penjualan" },
  returns: { baca: "penjualan", tulis: "penjualan" },
  marketplace: { baca: "penjualan", tulis: "penjualan" },
  "price-groups": { baca: "penjualan", tulis: "penjualan" },
  "sales-orders": { baca: "penjualan", tulis: "penjualan" },

  // --- Kasir -----------------------------------------------------------------
  pos: { baca: "kasir", tulis: "kasir" },

  // --- Pembelian & pengadaan -------------------------------------------------
  purchases: { baca: "pembelian", tulis: "pembelian" },
  requisitions: { baca: "pembelian", tulis: "pembelian" },
  "purchase-orders": { baca: "pembelian", tulis: "pembelian" },
  "goods-receipts": { baca: "pembelian", tulis: "pembelian" },

  // --- Master data bersama ---------------------------------------------------
  // Tiga segmen ini dibaca hampir semua modul: kasir memindai barcode
  // (`products`), penjualan & pembelian sama-sama memilih `contacts`
  // (pelanggan DAN pemasok), dan stok mana pun perlu `warehouses`. Izin baca
  // apa pun yang dipilih akan mematahkan salah satu peran yang justru ingin
  // diizinkan — jadi bacanya dijaga PERAN saja, penulisannya dijaga izin.
  products: { baca: null, tulis: "stok" },
  contacts: { baca: null, tulis: "penjualan" },
  warehouses: { baca: null, tulis: "stok" },

  // --- Stok ------------------------------------------------------------------
  stock: { baca: "stok", tulis: "stok" },
  "stock-adjustments": { baca: "stok", tulis: "stok" },
  "stock-card": { baca: "stok", tulis: "stok" },
  "stock-forecast": { baca: "stok", tulis: "stok" },
  "stock-lots": { baca: "stok", tulis: "stok" },
  "stock-transfers": { baca: "stok", tulis: "stok" },
  "reorder-suggestions": { baca: "stok", tulis: "stok" },

  // --- Keuangan & akuntansi --------------------------------------------------
  accounts: { baca: "keuangan", tulis: "keuangan" },
  "journal-entries": { baca: "keuangan", tulis: "keuangan" },
  "journal-templates": { baca: "keuangan", tulis: "keuangan" },
  ledger: { baca: "keuangan", tulis: "keuangan" },
  "trial-balance": { baca: "keuangan", tulis: "keuangan" },
  budgets: { baca: "keuangan", tulis: "keuangan" },
  "petty-cash": { baca: "keuangan", tulis: "keuangan" },
  "bank-recon": { baca: "keuangan", tulis: "keuangan" },
  "close-books": { baca: "keuangan", tulis: "keuangan" },
  "closing-entry": { baca: "keuangan", tulis: "keuangan" },
  "forex-revaluation": { baca: "keuangan", tulis: "keuangan" },
  assets: { baca: "keuangan", tulis: "keuangan" },
  currencies: { baca: "keuangan", tulis: "keuangan" },
  "cost-centers": { baca: "keuangan", tulis: "keuangan" },
  "bank-match-rules": { baca: "keuangan", tulis: "keuangan" },

  // --- Pajak & laporan -------------------------------------------------------
  tax: { baca: "pajak", tulis: "pajak" },
  reports: { baca: "laporan", tulis: "laporan" },
  export: { baca: "laporan", tulis: "laporan" },
  "report-snapshots": { baca: "laporan", tulis: "laporan" },

  // --- HR --------------------------------------------------------------------
  employees: { baca: "hr", tulis: "hr" },
  "employee-loans": { baca: "hr", tulis: "hr" },
  "payroll-runs": { baca: "hr", tulis: "hr" },
  // THR (Fase 43a) — modul yang sama dengan penggajian: siapa boleh melihat
  // gaji orang, boleh melihat THR-nya juga; dan sebaliknya.
  "thr-runs": { baca: "hr", tulis: "hr" },
  "thr-preview": { baca: "hr", tulis: "hr" },
  // Lembur (Fase 43b) — modul yang sama dengan penggajian.
  "overtime": { baca: "hr", tulis: "hr" },
  // Komisi sales (Fase 44a) — angkanya gaji, jadi tunduk pada modul yang sama.
  "commission-schemes": { baca: "hr", tulis: "hr" },
  "commission-report": { baca: "hr", tulis: "hr" },
  // Target penjualan (Fase 44b) — modul CRM, bukan HR: yang dinilai penjualan.
  "sales-targets": { baca: "crm", tulis: "crm" },
  "payroll-adjustments": { baca: "hr", tulis: "hr" },
  "leave-requests": { baca: "hr", tulis: "hr" },
  attendance: { baca: "hr", tulis: "hr" },

  // --- CRM & helpdesk --------------------------------------------------------
  crm: { baca: "crm", tulis: "crm" },
  leads: { baca: "crm", tulis: "crm" },
  quotations: { baca: "crm", tulis: "crm" },
  "lead-form": { baca: "crm", tulis: "crm" },
  tickets: { baca: "crm", tulis: "crm" },

  // --- Proyek & operasi ------------------------------------------------------
  projects: { baca: "proyek", tulis: "proyek" },
  contracts: { baca: "proyek", tulis: "proyek" },
  maintenance: { baca: "proyek", tulis: "proyek" },
  boms: { baca: "proyek", tulis: "proyek" },
  "production-orders": { baca: "proyek", tulis: "proyek" },
  "work-centers": { baca: "proyek", tulis: "proyek" },

  // --- Persetujuan -----------------------------------------------------------
  // `approvals` + `approval-threshold` adalah ambang persetujuan pembelian yang
  // sudah ada sejak jauh sebelum modul berpaket `approvals` (mesin alur
  // berjenjang). Sengaja TIDAK diberi `modul`: menggerbanginya berarti mencabut
  // fitur dari pelanggan Starter yang sudah memakainya — keputusan produk, bukan
  // kelalaian. Izinnya tetap ditegakkan.
  approvals: { baca: "persetujuan", tulis: "persetujuan" },
  "approval-threshold": { baca: "persetujuan", tulis: "persetujuan" },
  "approval-flows": { baca: "persetujuan", tulis: "persetujuan" },
  "approval-rules": { baca: "persetujuan", tulis: "persetujuan" },

  // --- Pengaturan perusahaan -------------------------------------------------
  // `settings` dibaca POS (footer struk), cetak faktur, dan dasbor → baca
  // terbuka, tulis dijaga izin `pengaturan`.
  settings: { baca: null, tulis: "pengaturan" },
  setup: { baca: null, tulis: "pengaturan" },
  "doc-numbering": { baca: null, tulis: "pengaturan" },
  "custom-fields": { baca: null, tulis: "pengaturan" },
  "audit-logs": { baca: "pengaturan", tulis: "pengaturan" },
  migration: { baca: "pengaturan", tulis: "pengaturan" },
  departments: { baca: "pengaturan", tulis: "pengaturan" },
  "org-chart": { baca: "pengaturan", tulis: "pengaturan" },
  drive: { baca: "pengaturan", tulis: "pengaturan" },
  security: { baca: "pengaturan", tulis: "pengaturan" },
  "api-keys": { baca: "pengaturan", tulis: "pengaturan" },
  webhooks: { baca: "pengaturan", tulis: "pengaturan" },
};

/** Izin yang berlaku untuk sebuah segmen + method HTTP. */
export function izinRute(segmen: string, method: string): { akses: AksesRute; izin: PermissionKey | null } | null {
  const akses = TENANT_ROUTE_ACCESS[segmen];
  if (!akses) return null;
  const baca = method === "GET" || method === "HEAD";
  return { akses, izin: baca ? akses.baca : akses.tulis };
}
