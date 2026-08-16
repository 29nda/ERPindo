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
  accountId: z.string().min(1, "Pilih akun bank"),
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
 * Fase 24: tiga paket, semuanya berbayar. Paket `trial` Rp0 dihapus — ia bukan
 * paket melainkan keadaan, dan keadaan itu kini diwakili status tenant
 * `provisioning`. Menyimpan "paket" yang tidak dijual di dalam daftar paket
 * yang dijual adalah sumber kebingungan yang sudah beberapa kali menjalar
 * (lencana, harga, penegakan modul).
 */
export const PLANS = ["starter", "business", "enterprise"] as const;
export type Plan = (typeof PLANS)[number];

/**
 * Fase 13a: pemaketan bertingkat. Harga per bulan per perusahaan; pengguna
 * SELALU tak terbatas di semua paket (pembeda utama vs ERP per-user). Tier
 * dibedakan oleh kedalaman operasional, jumlah entitas, dan kuota AI — TIDAK
 * PERNAH oleh jumlah user, dan TIDAK memotong akuntansi inti.
 *
 * SEMUA nilai keputusan bisnis terpusat di sini — menggeser modul antar paket
 * cukup mengubah satu baris di MODULE_MIN_PLAN.
 */
export const PLAN_LIMITS: Record<
  Plan,
  { label: string; pricePerMonth: number; aiDailyLimit: number; maxEntities: number; maxUsers: number }
> = {
  starter: { label: "Starter", pricePerMonth: 499_000, aiDailyLimit: 25, maxEntities: 1, maxUsers: Number.MAX_SAFE_INTEGER },
  business: { label: "Business", pricePerMonth: 999_000, aiDailyLimit: 100, maxEntities: 1, maxUsers: Number.MAX_SAFE_INTEGER },
  enterprise: { label: "Enterprise", pricePerMonth: 2_499_000, aiDailyLimit: 250, maxEntities: 3, maxUsers: Number.MAX_SAFE_INTEGER },
};

/** Biaya per entitas tambahan di atas kuota paket Enterprise (Fase 13a). */
export const EXTRA_ENTITY_PRICE = 750_000;

/**
 * Masa tenggang (Fase 20c): hari akun MASIH BISA MENULIS setelah masa
 * berlakunya habis, sebelum jatuh ke baca-saja. Keputusan pemilik: 3 hari.
 *
 * Diletakkan di `shared` karena dipakai TIGA sisi: cron (menurunkan status),
 * web (spanduk), dan uji. Satu angka, satu tempat.
 */
export const GRACE_DAYS = 3;

export const PLAN_LABELS: Record<Plan, string> = {
  starter: PLAN_LIMITS.starter.label,
  business: PLAN_LIMITS.business.label,
  enterprise: PLAN_LIMITS.enterprise.label,
};

/**
 * Paket yang bisa dibeli. Sejak Fase 24 **identik** dengan `PLANS` — seluruh
 * paket dijual. Alias ini dipertahankan karena dipakai luas di checkout &
 * halaman harga, dan namanya menyatakan maksud ("yang bisa dibeli") yang tetap
 * berguna dibaca meski isinya kini sama.
 */
export const PAID_PLANS = PLANS;
export type PaidPlan = Plan;

// --- Ganti paket dengan prorata (Fase 20k) ----------------------------------

/** Panjang satu siklus tagihan, dalam hari. Langganan ditagih bulanan. */
export const BILLING_CYCLE_DAYS = 30;

export type ProrataArah = "naik" | "turun" | "sama";

export type ProrataInput = {
  planSekarang: Plan;
  planBaru: Plan;
  /** `subscription_ends_at` tenant; `null` bila belum pernah berlangganan. */
  berakhirPada: string | null;
  nowMs?: number;
  siklusHari?: number;
};

export type ProrataResult = {
  arah: ProrataArah;
  /** Sisa hari pada siklus berjalan; 0 bila tidak ada langganan aktif. */
  sisaHari: number;
  /** Yang harus dibayar SEKARANG. Nol untuk turun & sama. */
  bayarSekarang: number;
  /** Kapan paket barunya berlaku. */
  berlakuMulai: "sekarang" | "akhir-periode";
  hargaLama: number;
  hargaBaru: number;
  /** Prorata hanya berlaku bila ada siklus berjalan yang tersisa. */
  bisaProrata: boolean;
};

/**
 * Hitung biaya pindah paket di TENGAH siklus (Fase 20k).
 *
 * Aturannya sengaja tidak simetris, dan itu keputusan yang disadari:
 *
 * - **Naik paket berlaku SEKARANG**, ditagih selisih harga untuk sisa hari saja.
 *   Orang menaikkan paket karena butuh kapasitasnya hari itu juga; menundanya
 *   ke akhir periode membuat pembayaran terasa seperti hukuman.
 * - **Turun paket berlaku di AKHIR PERIODE**, tanpa tagihan dan tanpa refund.
 *   Mereka sudah membayar sisa periode ini, jadi mereka berhak memakainya.
 *   Refund tunai tidak dilakukan: uang keluar menuntut jalur persetujuan,
 *   rekonsiliasi, dan penanganan sengketa yang belum ada di sistem ini —
 *   membangunnya setengah jadi lebih berbahaya daripada tidak sama sekali.
 *
 * Fungsi murni: tidak menyentuh DB maupun gerbang pembayaran, sehingga bisa dipakai
 * pratinjau di layar dan penagihan di server dari SATU rumus yang sama.
 */
export function hitungProrata(input: ProrataInput): ProrataResult {
  const siklusHari = input.siklusHari ?? BILLING_CYCLE_DAYS;
  const nowMs = input.nowMs ?? Date.now();
  const hargaLama = PLAN_LIMITS[input.planSekarang].pricePerMonth;
  const hargaBaru = PLAN_LIMITS[input.planBaru].pricePerMonth;
  const arah: ProrataArah =
    hargaBaru > hargaLama ? "naik" : hargaBaru < hargaLama ? "turun" : "sama";

  const akhirMs = input.berakhirPada ? Date.parse(input.berakhirPada) : NaN;
  const sisaHari = Number.isFinite(akhirMs)
    ? Math.max(Math.ceil((akhirMs - nowMs) / 86_400_000), 0)
    : 0;
  const bisaProrata = sisaHari > 0;

  // Dibatasi satu siklus: bila suatu hari ada langganan prabayar lebih dari
  // sebulan, tenant tidak boleh ditagih berkali-kali lipat selisihnya dalam
  // satu transaksi tanpa keputusan harga yang eksplisit.
  const hariDitagih = Math.min(sisaHari, siklusHari);
  const bayarSekarang =
    arah === "naik" && bisaProrata
      ? Math.max(Math.ceil(((hargaBaru - hargaLama) * hariDitagih) / siklusHari), 1)
      : 0;

  return {
    arah,
    sisaHari,
    bayarSekarang,
    berlakuMulai: arah === "naik" ? "sekarang" : "akhir-periode",
    hargaLama,
    hargaBaru,
    bisaProrata,
  };
}

/**
 * Alias kompatibilitas (deprecated): billing lama memakai satu harga Rp389rb.
 * Dipertahankan agar billing.ts belum berubah di Fase 13a; billing 4 paket
 * (Fase 13b) mengganti pemakaiannya dengan harga per-paket dari PLAN_LIMITS.
 */
export const SINGLE_PLAN = { label: "Lengkap", pricePerMonth: 389_000 } as const;

// ---------------------------------------------------------------------------
// Peta modul → paket minimum (Fase 13a). Modul yang TIDAK terdaftar di sini
// termasuk INTI dan tersedia di semua paket (akuntansi, penjualan/pembelian,
// POS, stok, kas & bank, laporan, pajak, master data). Yang terdaftar butuh
// paket minimal tertentu; di bawahnya API menolak 403 `plan-upgrade-required`.
// ---------------------------------------------------------------------------
export const MODULE_KEYS = [
  // Operasional — minimal Business
  "payroll",
  "attendance",
  "manufacturing",
  "projects",
  "procurement",
  "approvals",
  "customRoles",
  "crm",
  "maintenance",
  "helpdesk",
  "salesStaged",
  "currency",
  "contracts",
  "scheduledReports",
  "driveBackup",
  "orgStructure",
  // Skala — minimal Enterprise
  "consolidation",
  "dimensions",
  "apiAccess",
  "advancedSecurity",
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_MIN_PLAN: Record<ModuleKey, Plan> = {
  payroll: "business",
  attendance: "business",
  manufacturing: "business",
  projects: "business",
  procurement: "business",
  approvals: "business",
  customRoles: "business",
  crm: "business",
  maintenance: "business",
  helpdesk: "business",
  salesStaged: "business",
  currency: "business",
  contracts: "business",
  scheduledReports: "business",
  driveBackup: "business",
  orgStructure: "business",
  consolidation: "enterprise",
  dimensions: "enterprise",
  apiAccess: "enterprise",
  advancedSecurity: "enterprise",
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  payroll: "HR & Penggajian",
  attendance: "Absensi",
  manufacturing: "Manufaktur",
  projects: "Proyek",
  procurement: "Pengadaan",
  approvals: "Persetujuan berjenjang",
  customRoles: "Peran kustom (RBAC)",
  crm: "CRM",
  maintenance: "Pemeliharaan aset",
  helpdesk: "Helpdesk",
  salesStaged: "Penjualan bertahap (SO/DO)",
  currency: "Multi mata uang",
  contracts: "Kontrak berulang",
  scheduledReports: "Laporan terjadwal",
  driveBackup: "Backup Google Drive",
  orgStructure: "Struktur organisasi",
  consolidation: "Konsolidasi multi-perusahaan",
  dimensions: "Dimensi / cost center",
  apiAccess: "API publik & webhook",
  advancedSecurity: "Keamanan lanjutan (2FA wajib, IP)",
};

/**
 * Peringkat akses paket. Bukan urutan harga — melainkan urutan cakupan fitur.
 */
const PLAN_ACCESS_RANK: Record<Plan, number> = { starter: 1, business: 2, enterprise: 3 };

/** Apakah paket mencakup modul tertentu. Modul inti (tak terdaftar) selalu true. */
export function planIncludesModule(plan: Plan, module: ModuleKey): boolean {
  const min = MODULE_MIN_PLAN[module];
  if (!min) return true;
  return PLAN_ACCESS_RANK[plan] >= PLAN_ACCESS_RANK[min];
}

/** Paket berbayar minimum yang membuka modul (untuk pesan upsell). */
export function minPlanForModule(module: ModuleKey): Plan {
  return MODULE_MIN_PLAN[module] ?? "starter";
}

/** Daftar modul yang tersedia pada suatu paket (dipakai UI untuk badge/upsell). */
export function modulesForPlan(plan: Plan): ModuleKey[] {
  return MODULE_KEYS.filter((m) => planIncludesModule(plan, m));
}

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
  /** Penurunan paket yang menunggu akhir periode (Fase 20k); `null` bila tidak ada. */
  pendingPlan: Plan | null;
  invoices: ApiSubscriptionInvoice[];
};

/** Pilih paket berbayar yang akan di-checkout (Fase 13b). */
export const checkoutSchema = z.object({
  plan: z.enum(PAID_PLANS),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Pindah paket di tengah siklus (Fase 20k) — naik ditagih prorata, turun dijadwalkan. */
export const changePlanSchema = z.object({
  plan: z.enum(PAID_PLANS),
});
export type ChangePlanInput = z.infer<typeof changePlanSchema>;

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
  /** Modul berpaket; absen = modul inti (tersedia di semua paket). */
  modul?: ModuleKey;
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
  roles: { baca: null, tulis: null, modul: "customRoles" },

  // --- Penjualan -------------------------------------------------------------
  invoices: { baca: "penjualan", tulis: "penjualan" },
  payments: { baca: "penjualan", tulis: "penjualan" },
  returns: { baca: "penjualan", tulis: "penjualan" },
  marketplace: { baca: "penjualan", tulis: "penjualan" },
  "price-groups": { baca: "penjualan", tulis: "penjualan" },
  "sales-orders": { baca: "penjualan", tulis: "penjualan", modul: "salesStaged" },

  // --- Kasir -----------------------------------------------------------------
  pos: { baca: "kasir", tulis: "kasir" },

  // --- Pembelian & pengadaan -------------------------------------------------
  purchases: { baca: "pembelian", tulis: "pembelian" },
  requisitions: { baca: "pembelian", tulis: "pembelian", modul: "procurement" },
  "purchase-orders": { baca: "pembelian", tulis: "pembelian", modul: "procurement" },
  "goods-receipts": { baca: "pembelian", tulis: "pembelian", modul: "procurement" },

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
  currencies: { baca: "keuangan", tulis: "keuangan", modul: "currency" },
  "cost-centers": { baca: "keuangan", tulis: "keuangan", modul: "dimensions" },
  "bank-match-rules": { baca: "keuangan", tulis: "keuangan", modul: "dimensions" },

  // --- Pajak & laporan -------------------------------------------------------
  tax: { baca: "pajak", tulis: "pajak" },
  reports: { baca: "laporan", tulis: "laporan" },
  export: { baca: "laporan", tulis: "laporan" },
  "report-snapshots": { baca: "laporan", tulis: "laporan", modul: "scheduledReports" },

  // --- HR --------------------------------------------------------------------
  employees: { baca: "hr", tulis: "hr", modul: "payroll" },
  "employee-loans": { baca: "hr", tulis: "hr", modul: "payroll" },
  "payroll-runs": { baca: "hr", tulis: "hr", modul: "payroll" },
  "payroll-adjustments": { baca: "hr", tulis: "hr", modul: "payroll" },
  "leave-requests": { baca: "hr", tulis: "hr", modul: "payroll" },
  attendance: { baca: "hr", tulis: "hr", modul: "attendance" },

  // --- CRM & helpdesk --------------------------------------------------------
  crm: { baca: "crm", tulis: "crm", modul: "crm" },
  leads: { baca: "crm", tulis: "crm", modul: "crm" },
  quotations: { baca: "crm", tulis: "crm", modul: "crm" },
  "lead-form": { baca: "crm", tulis: "crm", modul: "crm" },
  tickets: { baca: "crm", tulis: "crm", modul: "helpdesk" },

  // --- Proyek & operasi ------------------------------------------------------
  projects: { baca: "proyek", tulis: "proyek", modul: "projects" },
  contracts: { baca: "proyek", tulis: "proyek", modul: "contracts" },
  maintenance: { baca: "proyek", tulis: "proyek", modul: "maintenance" },
  boms: { baca: "proyek", tulis: "proyek", modul: "manufacturing" },
  "production-orders": { baca: "proyek", tulis: "proyek", modul: "manufacturing" },
  "work-centers": { baca: "proyek", tulis: "proyek", modul: "manufacturing" },

  // --- Persetujuan -----------------------------------------------------------
  // `approvals` + `approval-threshold` adalah ambang persetujuan pembelian yang
  // sudah ada sejak jauh sebelum modul berpaket `approvals` (mesin alur
  // berjenjang). Sengaja TIDAK diberi `modul`: menggerbanginya berarti mencabut
  // fitur dari pelanggan Starter yang sudah memakainya — keputusan produk, bukan
  // kelalaian. Izinnya tetap ditegakkan.
  approvals: { baca: "persetujuan", tulis: "persetujuan" },
  "approval-threshold": { baca: "persetujuan", tulis: "persetujuan" },
  "approval-flows": { baca: "persetujuan", tulis: "persetujuan", modul: "approvals" },
  "approval-rules": { baca: "persetujuan", tulis: "persetujuan", modul: "approvals" },

  // --- Pengaturan perusahaan -------------------------------------------------
  // `settings` dibaca POS (footer struk), cetak faktur, dan dasbor → baca
  // terbuka, tulis dijaga izin `pengaturan`.
  settings: { baca: null, tulis: "pengaturan" },
  setup: { baca: null, tulis: "pengaturan" },
  "doc-numbering": { baca: null, tulis: "pengaturan" },
  "custom-fields": { baca: null, tulis: "pengaturan" },
  "audit-logs": { baca: "pengaturan", tulis: "pengaturan" },
  migration: { baca: "pengaturan", tulis: "pengaturan" },
  departments: { baca: "pengaturan", tulis: "pengaturan", modul: "orgStructure" },
  "org-chart": { baca: "pengaturan", tulis: "pengaturan", modul: "orgStructure" },
  drive: { baca: "pengaturan", tulis: "pengaturan", modul: "driveBackup" },
  security: { baca: "pengaturan", tulis: "pengaturan", modul: "advancedSecurity" },
  "api-keys": { baca: "pengaturan", tulis: "pengaturan", modul: "apiAccess" },
  webhooks: { baca: "pengaturan", tulis: "pengaturan", modul: "apiAccess" },
};

/** Izin yang berlaku untuk sebuah segmen + method HTTP. */
export function izinRute(segmen: string, method: string): { akses: AksesRute; izin: PermissionKey | null } | null {
  const akses = TENANT_ROUTE_ACCESS[segmen];
  if (!akses) return null;
  const baca = method === "GET" || method === "HEAD";
  return { akses, izin: baca ? akses.baca : akses.tulis };
}
