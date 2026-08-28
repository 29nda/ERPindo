import { z } from "zod";
import { emailSchema } from "./core";

// ---------------------------------------------------------------------------
// Modul Keuangan & Master Data (Fase 1)
// ---------------------------------------------------------------------------

export const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: "Aset",
  liability: "Kewajiban",
  equity: "Ekuitas",
  income: "Pendapatan",
  expense: "Beban",
};

/** Saldo normal debit? (aset & beban bertambah di sisi debit) */
export const DEBIT_NORMAL: Record<AccountType, boolean> = {
  asset: true,
  expense: true,
  liability: false,
  equity: false,
  income: false,
};

export const createAccountSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode wajib diisi")
    .max(20)
    .regex(/^[0-9][0-9-]*$/, "Kode akun berupa angka dan tanda hubung, mis. 1-1600"),
  name: z.string().trim().min(2, "Nama akun minimal 2 karakter").max(100),
  type: z.enum(ACCOUNT_TYPES),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/** Ganti nama akun saja — kode & tipe terkunci demi integritas laporan historis. */
export const renameAccountSchema = z.object({
  name: z.string().trim().min(2, "Nama akun minimal 2 karakter").max(100),
});

/** Tandai/lepas tanda akun antar-perusahaan (Fase 20f). */
export const intercompanySchema = z.object({ isIntercompany: z.boolean() });
export type IntercompanyInput = z.infer<typeof intercompanySchema>;

// --- Asisten AI (Workers AI) -------------------------------------------------

export const aiChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2_000),
      }),
    )
    .min(1)
    .max(20),
});
export type AiChatInput = z.infer<typeof aiChatSchema>;

export const aiJurnalSchema = z.object({
  prompt: z.string().trim().min(5, "Tulis deskripsi transaksi, mis. 'bayar listrik 500 ribu dari kas'").max(500),
});
export type AiJurnalInput = z.infer<typeof aiJurnalSchema>;

/** Tanya-jawab laporan bahasa natural (Fase 11c) — dijawab dari data buku nyata (read-only). */
export const aiReportSchema = z.object({
  question: z.string().trim().min(3, "Tulis pertanyaan, mis. 'berapa laba bulan ini?'").max(500),
});
export type AiReportInput = z.infer<typeof aiReportSchema>;

/** Ringkasan bisnis mingguan AI di dashboard (Fase 12f) — cache KV per minggu. */
export type ApiAiWeeklySummary = {
  summary: string;
  generatedAt: string;
  cached: boolean;
  quotaRemaining?: number;
};

/** Draf jurnal usulan AI — hanya usulan; manusia yang memposting lewat form Jurnal Umum. */
export type ApiAiJournalDraft = {
  entryDate: string;
  memo: string;
  lines: { accountId: string; accountCode: string; accountName: string; debit: number; credit: number }[];
};

/** Nominal rupiah bulat non-negatif (IDR tanpa sen), maksimal 1 triliun. */
export const amountSchema = z.number().int("Nominal harus bilangan bulat").min(0).max(1_000_000_000_000);

export const journalLineSchema = z.object({
  accountId: z.string().min(1, "Akun wajib dipilih"),
  description: z.string().trim().max(200).optional(),
  debit: amountSchema.default(0),
  credit: amountSchema.default(0),
  /** Dimensi opsional (Fase 7f): cost center / departemen per baris. */
  costCenterId: z.string().optional(),
});

export const createJournalEntrySchema = z
  .object({
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid (YYYY-MM-DD)"),
    memo: z.string().trim().max(500).optional(),
    projectId: z.string().optional(),
    lines: z.array(journalLineSchema).min(2, "Jurnal minimal 2 baris"),
  })
  .superRefine((val, ctx) => {
    let debit = 0;
    let credit = 0;
    for (const [i, line] of val.lines.entries()) {
      if (line.debit === 0 && line.credit === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines", i],
          message: "Baris harus punya nilai debit atau kredit",
        });
      }
      if (line.debit > 0 && line.credit > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines", i],
          message: "Satu baris tidak boleh debit dan kredit sekaligus",
        });
      }
      debit += line.debit;
      credit += line.credit;
    }
    if (debit !== credit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lines"],
        message: `Jurnal tidak seimbang: total debit ${debit} ≠ total kredit ${credit}`,
      });
    }
    if (debit === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lines"], message: "Total jurnal tidak boleh nol" });
    }
  });
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

// --- Template jurnal berulang & rekonsiliasi bank (Fase 5d) -----------------

export const journalTemplateSchema = z.object({
  name: z.string().trim().min(2, "Nama template minimal 2 karakter").max(100),
  memo: z.string().trim().max(500).optional(),
  lines: z.array(journalLineSchema).min(2, "Template minimal 2 baris"),
  /** 'monthly' = cron memposting otomatis tiap next_run_date; null = manual saja. */
  schedule: z.enum(["monthly"]).nullable().optional(),
  nextRunDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid (YYYY-MM-DD)")
    .optional(),
});
export type JournalTemplateInput = z.infer<typeof journalTemplateSchema>;

export type ApiJournalTemplate = {
  id: string;
  name: string;
  memo: string | null;
  lines: { accountId: string; accountCode: string; accountName: string; debit: number; credit: number }[];
  schedule: "monthly" | null;
  nextRunDate: string | null;
  isActive: boolean;
};

export const bankImportSchema = z.object({
  accountId: z.string().min(1, "Akun wajib dipilih"),
  items: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid (YYYY-MM-DD)"),
        description: z.string().trim().min(1).max(300),
        /** Rupiah bulat bertanda: + uang masuk, − uang keluar. */
        amount: z
          .number()
          .int()
          .refine((v) => v !== 0, "Jumlah tidak boleh 0"),
      }),
    )
    .min(1, "Tidak ada baris mutasi")
    .max(500, "Maksimal 500 baris per impor"),
});
export type BankImportInput = z.infer<typeof bankImportSchema>;

export type ApiBankStatementItem = {
  id: string;
  stmtDate: string;
  description: string;
  amount: number;
  matchedJournalLineId: string | null;
  matchedEntryNo: string | null;
};

export const CONTACT_TYPES = ["customer", "supplier", "both"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const contactSchema = z.object({
  type: z.enum(CONTACT_TYPES),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
  email: z.union([emailSchema, z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
  npwp: z.string().trim().max(30).optional(),
  /**
   * Grup harga pelanggan (Fase 23a). String kosong dari `<select>` diperlakukan
   * sama dengan tidak bergrup — layar HTML tidak bisa mengirim `null`, dan
   * membedakan keduanya hanya akan menghasilkan dua cara menulis "tanpa grup".
   */
  priceGroupId: z.string().trim().max(64).optional(),
  /**
   * Batas kredit pelanggan dalam rupiah penuh (Fase 42a).
   *
   * `undefined` berarti TANPA BATAS; `0` berarti pelanggan tidak boleh
   * berutang sama sekali. Keduanya keadaan yang sah dan berbeda, jadi bidang
   * ini sengaja opsional alih-alih berdefault nol — default nol akan diam-diam
   * memblokir setiap pelanggan lama yang belum pernah disetel.
   */
  creditLimit: z.number().int().min(0).max(1_000_000_000_000).optional(),
  /**
   * Termin pembayaran dalam hari (mis. 30 untuk TOP 30 hari).
   *
   * Dipakai menurunkan tanggal jatuh tempo faktur bila penggunanya tidak
   * mengisinya sendiri. `undefined` berarti tidak ada termin baku, dan jatuh
   * tempo tetap diisi manual seperti sebelum fase ini.
   */
  paymentTermDays: z.number().int().min(0).max(365).optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Tanggal jatuh tempo faktur dari tanggal dokumen + termin pelanggan.
 *
 * Dipisah menjadi fungsi murni supaya bisa diuji tanpa basis data, dan supaya
 * sisi server maupun sisi layar memakai perhitungan yang sama persis.
 *
 * Mengembalikan `undefined` bila tidak ada termin — pemanggil lalu memakai
 * tanggal yang diketik pengguna, atau membiarkannya kosong.
 */
export function jatuhTempoDariTermin(tanggalDokumen: string, terminHari: number | null | undefined): string | undefined {
  if (terminHari === null || terminHari === undefined) return undefined;
  const d = new Date(`${tanggalDokumen}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setUTCDate(d.getUTCDate() + terminHari);
  return d.toISOString().slice(0, 10);
}

/**
 * Apakah faktur baru membuat piutang pelanggan melampaui batas kreditnya.
 *
 * Fungsi murni: pemanggil yang mengambil angka piutang berjalan dari basis
 * data, supaya aturannya bisa diuji tanpa menyiapkan tenant.
 *
 * `batas` `null`/`undefined` berarti tanpa batas, jadi selalu lolos.
 */
export function melampauiBatasKredit(
  piutangBerjalan: number,
  nilaiFakturBaru: number,
  batas: number | null | undefined,
): boolean {
  if (batas === null || batas === undefined) return false;
  return piutangBerjalan + nilaiFakturBaru > batas;
}

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU wajib diisi").max(50),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
  unit: z.string().trim().min(1).max(20).default("pcs"),
  sellPrice: amountSchema.default(0),
  buyPrice: amountSchema.default(0),
  /** Wajib mencatat lot & tanggal kedaluwarsa saat pembelian (F&B/farmasi). */
  trackExpiry: z.boolean().default(false),
  /** Jasa: tidak melacak stok — faktur tak menggerakkan stok/HPP. */
  isService: z.boolean().default(false),
  /** Ambang stok menipis (0 = tanpa peringatan): total stok ≤ nilai ini memicu notifikasi. */
  minStock: z.number().int().min(0).max(1_000_000).default(0),
  /** Kode batang (barcode/EAN) untuk pindai di kasir & pencarian cepat. */
  barcode: z.string().trim().max(60).optional().or(z.literal("")),
  /** Satuan besar opsional (mis. "dus") untuk konversi tampilan. */
  uomSecondary: z.string().trim().max(20).optional().or(z.literal("")),
  /** 1 satuan besar = uomFactor satuan dasar (mis. 1 dus = 24 pcs). */
  uomFactor: z.number().int().min(1).max(100_000).default(1),
  /** Produk melacak nomor seri (barang bernilai tinggi/garansi). */
  trackSerial: z.boolean().default(false),
});
export type ProductInput = z.infer<typeof productSchema>;

/** Nomor seri unit (Fase 7c). */
export const serialSchema = z.object({
  serialNo: z.string().trim().min(1, "Nomor seri wajib diisi").max(80),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});
export type SerialInput = z.infer<typeof serialSchema>;
export const SERIAL_STATUSES = ["in_stock", "sold"] as const;
export type SerialStatus = (typeof SERIAL_STATUSES)[number];
export const SERIAL_STATUS_LABELS: Record<SerialStatus, string> = {
  in_stock: "Tersedia",
  sold: "Terjual",
};
export type ApiProductSerial = {
  id: string;
  productId: string;
  serialNo: string;
  status: SerialStatus;
  note: string | null;
  createdAt: string;
};
export const serialStatusSchema = z.object({ status: z.enum(SERIAL_STATUSES) });

/** Usulan pembelian dari titik pesan otomatis (Fase 7c). */
export type ApiReorderSuggestion = {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  minStock: number;
  qty: number;
  shortfall: number;
  suggestedQty: number;
  buyPrice: number;
};

// --- Peramalan stok (Fase 20h) ----------------------------------------------

/**
 * Seberapa jauh angka ramalan boleh dipercaya. Sengaja jadi bagian dari hasil,
 * bukan catatan kaki di layar: rata-rata bergerak atas data tipis menghasilkan
 * angka yang kelihatan sama meyakinkannya dengan angka atas data tebal, dan
 * itulah cara ramalan menyesatkan orang.
 */
export const FORECAST_CONFIDENCE = ["tinggi", "sedang", "rendah"] as const;
export type ForecastConfidence = (typeof FORECAST_CONFIDENCE)[number];

export const FORECAST_TRENDS = ["naik", "turun", "stabil"] as const;
export type ForecastTrend = (typeof FORECAST_TRENDS)[number];

/** Parameter peramalan yang bisa disetel pemakai (semuanya dalam hari). */
export const FORECAST_DEFAULTS = {
  /** Panjang jendela riwayat yang dibaca. */
  periodeHari: 90,
  /** Jeda dari memesan sampai barang datang. */
  leadTimeHari: 7,
  /** Cadangan pengaman di atas lead time. */
  cadanganHari: 7,
  /** Satu siklus pemesanan — berapa lama sekali pemilik belanja. */
  siklusHari: 30,
} as const;

export type ForecastInput = {
  /** Sisa stok saat ini (seluruh gudang). */
  stok: number;
  /** Total qty terjual sepanjang jendela. */
  terjual: number;
  /** Qty terjual pada PARUH AWAL jendela — dipakai menghitung tren. */
  terjualParuhAwal: number;
  /** Qty terjual pada PARUH AKHIR jendela. */
  terjualParuhAkhir: number;
  /** Berapa hari berbeda yang benar-benar ada penjualannya. */
  hariAdaPenjualan: number;
  periodeHari?: number;
  leadTimeHari?: number;
  cadanganHari?: number;
  siklusHari?: number;
};

export type ForecastResult = {
  rataHarian: number;
  /** Perkiraan sisa hari sampai stok habis; `null` bila tidak pernah terjual. */
  hariHabis: number | null;
  /** Ambang pemesanan = rata-rata harian × (lead time + cadangan). */
  titikPesan: number;
  perluPesan: boolean;
  /** Qty usulan beli; 0 bila belum perlu. */
  qtyDisarankan: number;
  tren: ForecastTrend;
  keyakinan: ForecastConfidence;
};

/**
 * Peramalan kebutuhan stok — **deterministik**, rata-rata bergerak sederhana.
 * Bukan AI, sejalan dengan pilihan yang sudah diambil untuk deteksi anomali:
 * angka yang bisa ditelusuri pemilik dengan kalkulator lebih berguna daripada
 * angka yang lebih pintar tetapi tak bisa dibantah.
 *
 * Keyakinan diturunkan dari **ketebalan data**, bukan dari besarnya angka:
 * produk yang terjual di 2 hari dari 90 tidak punya "rata-rata harian" yang
 * berarti, betapapun rapi hasil pembagiannya.
 */
export function ramalStok(input: ForecastInput): ForecastResult {
  const periodeHari = input.periodeHari ?? FORECAST_DEFAULTS.periodeHari;
  const leadTimeHari = input.leadTimeHari ?? FORECAST_DEFAULTS.leadTimeHari;
  const cadanganHari = input.cadanganHari ?? FORECAST_DEFAULTS.cadanganHari;
  const siklusHari = input.siklusHari ?? FORECAST_DEFAULTS.siklusHari;

  const rataHarian = periodeHari > 0 ? input.terjual / periodeHari : 0;

  // Tren dari perbandingan dua paruh jendela. Ambang ±20% supaya riak kecil
  // tidak dilaporkan sebagai perubahan arah.
  let tren: ForecastTrend = "stabil";
  if (input.terjualParuhAwal > 0) {
    const rasio = input.terjualParuhAkhir / input.terjualParuhAwal;
    if (rasio >= 1.2) tren = "naik";
    else if (rasio <= 0.8) tren = "turun";
  } else if (input.terjualParuhAkhir > 0) {
    tren = "naik";
  }

  // Data tipis → keyakinan rendah, apa pun angkanya.
  const cakupan = periodeHari > 0 ? input.hariAdaPenjualan / periodeHari : 0;
  const keyakinan: ForecastConfidence =
    input.hariAdaPenjualan < 5 || cakupan < 0.05
      ? "rendah"
      : cakupan < 0.2
        ? "sedang"
        : "tinggi";

  if (rataHarian <= 0) {
    return {
      rataHarian: 0,
      hariHabis: null,
      titikPesan: 0,
      perluPesan: false,
      qtyDisarankan: 0,
      tren,
      keyakinan: "rendah",
    };
  }

  const hariHabis = Math.floor(input.stok / rataHarian);
  const titikPesan = Math.ceil(rataHarian * (leadTimeHari + cadanganHari));
  const perluPesan = input.stok <= titikPesan;
  const target = rataHarian * (leadTimeHari + cadanganHari + siklusHari);
  const qtyDisarankan = perluPesan ? Math.max(Math.ceil(target - input.stok), 1) : 0;

  return { rataHarian, hariHabis, titikPesan, perluPesan, qtyDisarankan, tren, keyakinan };
}

/** Satu baris ramalan stok yang dikirim ke web (Fase 20h). */
export type ApiStockForecast = {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  stok: number;
  terjual: number;
  rataHarian: number;
  hariHabis: number | null;
  titikPesan: number;
  perluPesan: boolean;
  qtyDisarankan: number;
  tren: ForecastTrend;
  keyakinan: ForecastConfidence;
  buyPrice: number;
};

// --- Pajak UMKM (Fase 7d) ---------------------------------------------------
const TAX_PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** PPh Final UMKM 0,5% (PP 55/2022): setoran per masa (bulan). */
export const pphFinalSchema = z.object({
  period: z.string().regex(TAX_PERIOD_RE, "Masa pajak harus format YYYY-MM"),
  accountId: z.string().min(1, "Pilih akun kas atau bank lebih dulu."),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal setor wajib diisi"),
});
export type PphFinalInput = z.infer<typeof pphFinalSchema>;
export type ApiPphFinal = {
  id: string;
  period: string;
  omzet: number;
  rate: number;
  amount: number;
  accountId: string;
  paidDate: string;
  createdAt: string;
};
export type ApiPphFinalPreview = { period: string; omzet: number; rate: number; amount: number; alreadyRecorded: boolean };

/** Objek pemotongan PPh 23 + tarif lazim (%). */
export const PPH23_OBJECTS = [
  { code: "jasa", label: "Jasa (teknik/manajemen/konsultan/lainnya)", rate: 2 },
  { code: "sewa", label: "Sewa & penghasilan lain terkait harta", rate: 2 },
  { code: "royalti", label: "Royalti", rate: 15 },
  { code: "bunga", label: "Bunga", rate: 15 },
  { code: "dividen", label: "Dividen", rate: 15 },
] as const;
export type Pph23ObjectCode = (typeof PPH23_OBJECTS)[number]["code"];
export const PPH23_OBJECT_LABELS: Record<string, string> = Object.fromEntries(PPH23_OBJECTS.map((o) => [o.code, o.label]));

export const pph23Schema = z.object({
  contactId: z.string().min(1, "Pilih rekanan"),
  taxDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
  objectType: z.enum(PPH23_OBJECTS.map((o) => o.code) as [string, ...string[]]),
  gross: amountSchema.refine((n) => n >= 1, "Dasar pengenaan minimal 1"),
  rate: z.number().min(0).max(100),
  sourceAccountId: z.string().min(1, "Pilih akun sumber lebih dulu — bisa utang, kas, atau bank."),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});
export type Pph23Input = z.infer<typeof pph23Schema>;
export const pph23DepositSchema = z.object({
  accountId: z.string().min(1, "Pilih akun kas atau bank lebih dulu."),
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal setor wajib diisi"),
});
export type Pph23DepositInput = z.infer<typeof pph23DepositSchema>;
export type ApiPph23 = {
  id: string;
  docNo: string;
  contactId: string;
  contactName: string;
  contactNpwp: string | null;
  taxDate: string;
  objectType: string;
  gross: number;
  rate: number;
  amount: number;
  deposited: boolean;
  note: string | null;
  createdAt: string;
};

/** SPT Masa PPN 1111: rekap keluaran (A) & masukan (B). */
export type ApiSptPpnRow = { docNo: string; date: string; partnerName: string; partnerNpwp: string | null; dpp: number; ppn: number };
export type ApiSptPpn = {
  period: string;
  output: ApiSptPpnRow[];
  input: ApiSptPpnRow[];
  totalOutputDpp: number;
  totalOutputPpn: number;
  totalInputDpp: number;
  totalInputPpn: number;
  net: number;
};

/**
 * PPh unifikasi (Fase 20d): rekap SEMUA PPh yang dipotong/disetor dalam satu
 * masa — PPh 21 (dari penggajian), PPh 23 (bukti potong), dan PPh Final 4(2).
 *
 * Murni agregasi dari tabel yang sudah ada; tidak ada tabel baru. Ini yang
 * dibutuhkan saat mengisi SPT Masa unifikasi: satu halaman, satu masa, semua
 * jenis, plus penanda mana yang belum disetor.
 */
export type PphJenis = "pph21" | "pph23" | "pphFinal";
export type ApiPphUnifikasiRow = {
  jenis: PphJenis;
  docNo: string;
  date: string;
  /** Lawan transaksi. PPh 21 direkap per masa, jadi tidak per-karyawan. */
  partnerName: string | null;
  partnerNpwp: string | null;
  gross: number;
  rate: number;
  amount: number;
  /** PPh 23 punya status setor; PPh 21 & Final dianggap disetor saat diposting. */
  deposited: boolean;
};
export type ApiPphUnifikasi = {
  period: string;
  rows: ApiPphUnifikasiRow[];
  totalPph21: number;
  totalPph23: number;
  totalPphFinal: number;
  total: number;
  /** Total PPh 23 yang bukti potongnya belum disetor — yang perlu ditindaklanjuti. */
  belumDisetor: number;
};

/** Notifikasi operasional (lonceng di topbar) — dihitung on-demand dari data nyata. */
export type ApiNotification = {
  type:
    | "low_stock"
    | "overdue_invoice"
    | "open_ticket"
    | "pending_approval"
    | "crm_followup_due"
    | "crm_stale_lead"
    /** Tenggat lapor/setor pajak yang mendekat atau baru saja lewat (Fase 22e). */
    | "tenggat_pajak";
  title: string;
  detail: string;
  /** Rute SPA yang dituju saat notifikasi diklik. */
  href: string;
  /**
   * Pesan pengingat siap-kirim WhatsApp (mis. faktur jatuh tempo) — bila ada,
   * UI menampilkan tombol "Tagih (WA)" yang membuka wa.me dengan teks ini.
   * Pengguna memilih kontak tujuan di WhatsApp (tanpa menyimpan nomor).
   */
  waText?: string;
};

export const warehouseSchema = z.object({
  code: z.string().trim().min(1, "Kode wajib diisi").max(20).toUpperCase(),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  address: z.string().trim().max(500).optional(),
  /**
   * Gudang konsinyasi (Fase 48b): lokasi mitra tempat barang kita dititipkan.
   * Stoknya tetap milik kita sampai terjual, jadi ia gudang biasa yang diberi
   * tanda — bukan mekanisme tersendiri.
   */
  isConsignment: z.boolean().optional(),
  /** Mitra tempat menitipkan. Hanya bermakna bila `isConsignment`. */
  partnerContactId: z.string().optional(),
});
export type WarehouseInput = z.infer<typeof warehouseSchema>;

// Bentuk respons API modul (kontrak frontend)
export type ApiAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isSystem: boolean;
  isArchived: boolean;
  /** Akun antar-perusahaan — dieliminasi dari laporan gabungan (Fase 20f). */
  isIntercompany: boolean;
};

export type ApiJournalLine = {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string | null;
  debit: number;
  credit: number;
};

export type ApiJournalEntry = {
  id: string;
  entryNo: string;
  entryDate: string;
  memo: string | null;
  status: "posted" | "void";
  lines: ApiJournalLine[];
  /** Fase 10c: nomor jurnal pembalik bila jurnal ini sudah dibalik. */
  reversedByEntryNo?: string | null;
  /** Fase 10c: nomor jurnal asal bila jurnal ini adalah pembalik. */
  reversesEntryNo?: string | null;
};

/** Fase 10c: balik jurnal / void pembayaran — tanggal opsional (default tanggal asal). */
export const reverseJournalSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid (YYYY-MM-DD)")
    .optional(),
});
export type ReverseJournalInput = z.infer<typeof reverseJournalSchema>;

export type ApiTrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
};


// --- Revaluasi saldo valas akhir periode (Fase 22a) -------------------------

/** Satu dokumen valas yang masih punya sisa pada tanggal revaluasi. */
export type BarisRevaluasiValas = {
  /** Nomor dokumen, untuk keterangan jurnal. */
  docNo: string;
  /** Sisa tagihan dalam IDR **pada kurs faktur** (total − dibayar − diretur). */
  sisaIdr: number;
  /** Kurs yang dipakai saat faktur diposting. */
  kursFaktur: number;
};

export type HasilRevaluasiValas = {
  /** Selisih IDR; positif = saldo naik, negatif = saldo turun. */
  selisih: number;
  /** Sisa valas yang dipulihkan dari `sisaIdr / kursFaktur`, dibulatkan 2 desimal. */
  sisaValas: number;
  /** Nilai IDR pada kurs penutup. */
  nilaiPenutup: number;
};

/**
 * Revaluasi satu dokumen valas ke kurs penutup (Fase 22a).
 *
 * Piutang/utang disimpan dalam **IDR pada kurs faktur**, jadi sisa valasnya
 * harus dipulihkan lewat pembagian. Itu menyisakan pembulatan sub-rupiah pada
 * faktur yang sudah dicicil sebagian — dikembalikan lewat `sisaValas` supaya
 * bisa diperiksa, bukan hilang diam-diam.
 *
 * Fungsi ini TIDAK tahu arah (piutang/utang): pemanggilnya yang memutuskan
 * sisi debit/kredit, karena kenaikan nilai piutang adalah laba sedangkan
 * kenaikan nilai utang adalah rugi.
 */
export function revaluasiBarisValas(
  baris: BarisRevaluasiValas,
  kursPenutup: number,
): HasilRevaluasiValas {
  if (baris.kursFaktur <= 0 || kursPenutup <= 0) {
    return { selisih: 0, sisaValas: 0, nilaiPenutup: baris.sisaIdr };
  }
  const sisaValas = Math.round((baris.sisaIdr / baris.kursFaktur) * 100) / 100;
  const nilaiPenutup = Math.round(sisaValas * kursPenutup);
  return { selisih: nilaiPenutup - baris.sisaIdr, sisaValas, nilaiPenutup };
}

/**
 * Jumlahkan revaluasi seluruh dokumen jadi angka jurnal.
 *
 * `selisihPiutang` dan `selisihHutang` dipisah karena akun lawannya berbeda,
 * tetapi keduanya bermuara ke satu pasangan akun laba/rugi selisih kurs.
 * Kenaikan piutang = laba; kenaikan utang = **rugi** (kita berutang lebih
 * banyak rupiah) — inilah tanda yang paling mudah terbalik.
 */
export function ringkasRevaluasiValas(input: {
  piutang: { selisih: number }[];
  hutang: { selisih: number }[];
}): { selisihPiutang: number; selisihHutang: number; labaBersih: number } {
  const selisihPiutang = input.piutang.reduce((s, b) => s + b.selisih, 0);
  const selisihHutang = input.hutang.reduce((s, b) => s + b.selisih, 0);
  return { selisihPiutang, selisihHutang, labaBersih: selisihPiutang - selisihHutang };
}

// --- Kurs referensi harian dari sumber luar (Fase 22b) ----------------------

export type HasilBacaKurs =
  | { ok: true; kurs: Record<string, number>; diabaikan: string[] }
  | { ok: false; alasan: string };

/**
 * Urai payload kurs dari sumber luar menjadi peta `KODE → kurs IDR` (Fase 22b).
 *
 * Bentuk yang diterima adalah bentuk yang dipakai hampir semua penyedia kurs
 * gratis: `{ base: "IDR", rates: { USD: 0.0000617, ... } }` — yaitu **berapa
 * unit valas per 1 IDR**. Aplikasi ini menyimpan kebalikannya (berapa Rupiah
 * per 1 unit valas), jadi angkanya dibalik di sini.
 *
 * Fungsi ini SENGAJA rewel. Kurs adalah angka yang mengalikan seluruh saldo
 * valas; satu nilai sampah yang lolos akan menggeser neraca tanpa ada yang
 * mengetik apa pun. Karena itu:
 *
 * - payload yang bukan objek, atau `base` bukan IDR, ditolak **seluruhnya** —
 *   bukan diambil sebagian;
 * - kurs per mata uang yang bukan angka berhingga positif **dibuang satu per
 *   satu** dan dilaporkan lewat `diabaikan`, sehingga mata uang lain tetap
 *   bisa diperbarui tanpa menelan yang rusak;
 * - hasil akhir kosong dianggap gagal, bukan sukses yang kebetulan tak
 *   mengubah apa-apa.
 */
export function bacaKursReferensi(payload: unknown): HasilBacaKurs {
  if (typeof payload !== "object" || payload === null) return { ok: false, alasan: "Balasan sumber kurs bukan objek JSON." };
  const p = payload as { base?: unknown; rates?: unknown };
  if (typeof p.base !== "string" || p.base.toUpperCase() !== "IDR") {
    return { ok: false, alasan: `Sumber kurs memakai basis '${String(p.base)}', bukan IDR.` };
  }
  if (typeof p.rates !== "object" || p.rates === null) return { ok: false, alasan: "Sumber kurs tidak memuat objek 'rates'." };

  const kurs: Record<string, number> = {};
  const diabaikan: string[] = [];
  for (const [kode, nilai] of Object.entries(p.rates as Record<string, unknown>)) {
    const k = kode.toUpperCase();
    if (k === "IDR") continue; // basis, bukan valas
    if (typeof nilai !== "number" || !Number.isFinite(nilai) || nilai <= 0) {
      diabaikan.push(k);
      continue;
    }
    // `rates` = valas per 1 IDR → dibalik jadi Rupiah per 1 valas.
    const perValas = Math.round(1 / nilai);
    if (!Number.isFinite(perValas) || perValas <= 0) {
      diabaikan.push(k);
      continue;
    }
    kurs[k] = perValas;
  }
  if (Object.keys(kurs).length === 0) return { ok: false, alasan: "Sumber kurs tidak memuat satu pun kurs yang bisa dipakai." };
  return { ok: true, kurs, diabaikan };
}

// --- Kas kecil sistem dana tetap (Fase 22c) ---------------------------------

/**
 * Keadaan kas kecil pada satu saat (Fase 22c).
 *
 * `saldoBuku` adalah saldo buku besar akun kas kecil — bukan angka yang
 * disimpan tersendiri. Menyimpan saldo di kolomnya sendiri berarti ada dua
 * kebenaran yang bisa menyimpang diam-diam; di sini buku besar tetap
 * satu-satunya sumber.
 */
export type StatusKasKecil = {
  /** Dana tetap (imprest) yang disepakati untuk kotak kas kecil. */
  danaTetap: number;
  /** Saldo buku besar akun kas kecil saat ini. */
  saldoBuku: number;
  /** Yang perlu diisikan supaya kembali penuh; 0 bila sudah penuh atau lebih. */
  kekurangan: number;
  /** Porsi dana yang sudah terpakai, 0–100, untuk bilah kemajuan di layar. */
  terpakaiPersen: number;
};

/**
 * Hitung kekurangan kas kecil terhadap dana tetapnya (Fase 22c).
 *
 * Angka pengisian **dihitung**, tidak diketik. Itu inti fase ini: pemegang kas
 * kecil menyerahkan setumpuk bon, dan yang menentukan besar pengisian adalah
 * selisih terhadap dana tetap — bukan jumlah bon. Keduanya kebetulan sama
 * SELAMA setiap bon sudah dijurnal; kalau tidak, mengetik jumlah bon akan
 * mengisi kotak melebihi dana tetapnya tanpa ada yang sadar.
 *
 * Saldo yang MELEBIHI dana tetap mengembalikan `kekurangan: 0`. Jurnal bernilai
 * nol tidak boleh dibuat (pola yang sama dengan Fase 21f) — dan saldo berlebih
 * adalah tanda ada yang salah, bukan sesuatu yang dirapikan diam-diam.
 */
export function hitungPengisianKasKecil(danaTetap: number, saldoBuku: number): StatusKasKecil {
  const tetap = Math.max(0, Math.round(danaTetap));
  const buku = Math.round(saldoBuku);
  const kekurangan = Math.max(0, tetap - buku);
  const terpakaiPersen = tetap <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((kekurangan / tetap) * 100)));
  return { danaTetap: tetap, saldoBuku: buku, kekurangan, terpakaiPersen };
}

/** Arah selisih opname kas kecil. */
export type ArahSelisihKas = "kurang" | "lebih" | "pas";

export type HasilSelisihKas = {
  /** `hitunganFisik - saldoBuku`: negatif berarti uang di kotak kurang. */
  selisih: number;
  arah: ArahSelisihKas;
};

/**
 * Bandingkan hitungan fisik kotak kas kecil dengan saldo bukunya (Fase 22c).
 *
 * ⚠️ Arahnya adalah bagian yang paling mudah terbalik, dan yang paling mahal
 * bila terbalik: jurnal selisih tetap SEIMBANG pada arah yang salah, jadi
 * neraca saldo tidak akan pernah menangkapnya. Yang menangkapnya hanya invarian
 * "saldo buku besar kas kecil sesudah opname == hitungan fisik" — dan itulah
 * yang dijaga cek smoke fase ini.
 *
 * `kurang` → uang fisik lebih sedikit daripada catatan → akun kas kecil
 * dikreditkan (aset berkurang) dan Selisih Kas didebet sebagai beban.
 */
export function hitungSelisihKas(saldoBuku: number, hitunganFisik: number): HasilSelisihKas {
  const selisih = Math.round(hitunganFisik) - Math.round(saldoBuku);
  return { selisih, arah: selisih === 0 ? "pas" : selisih < 0 ? "kurang" : "lebih" };
}

/** Setel dana tetap kas kecil (Fase 22c). */
export const kasKecilDanaTetapSchema = z.object({
  danaTetap: z.number().int("Dana tetap harus bilangan bulat rupiah").min(0, "Dana tetap tidak boleh negatif"),
});
export type KasKecilDanaTetapInput = z.infer<typeof kasKecilDanaTetapSchema>;

/** Pengisian ulang kas kecil (Fase 22c). Jumlahnya DIHITUNG, tidak diketik. */
export const kasKecilPengisianSchema = z.object({
  sourceAccountId: z.string().min(1, "Pilih akun kas atau bank sumber lebih dulu."),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
});
export type KasKecilPengisianInput = z.infer<typeof kasKecilPengisianSchema>;

/** Opname (hitung fisik) kotak kas kecil (Fase 22c). */
export const kasKecilOpnameSchema = z.object({
  hitunganFisik: z.number().int("Hitungan fisik harus bilangan bulat rupiah").min(0, "Hitungan fisik tidak boleh negatif"),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});
export type KasKecilOpnameInput = z.infer<typeof kasKecilOpnameSchema>;

export type ApiKasKecil = StatusKasKecil & {
  /** Tanggal pengisian ulang terakhir; `null` bila belum pernah diisi. */
  terakhirDiisi: string | null;
};

// --- Kalender pajak Indonesia (Fase 22e) ------------------------------------

/** Jenis kewajiban pajak yang dikalenderkan. */
export const JENIS_PAJAK = ["ppn", "pph21", "pph23", "pph25", "pph_final", "spt_tahunan"] as const;
export type JenisPajak = (typeof JENIS_PAJAK)[number];

export type TenggatPajak = {
  jenis: JenisPajak;
  /** Kegiatannya: menyetor uangnya, atau melaporkan SPT-nya. */
  kegiatan: "setor" | "lapor";
  /** Masa pajak yang bersangkutan: `YYYY-MM` untuk masa, `YYYY` untuk tahunan. */
  masa: string;
  /** Tenggat menurut undang-undang, SEBELUM digeser hari libur. */
  tanggalUu: string;
  /** Tenggat sesudah digeser lewat akhir pekan; lihat catatan di bawah. */
  tanggal: string;
  /** Sisa hari dari tanggal acuan; negatif berarti sudah lewat. */
  sisaHari: number;
};

function tambahHari(tanggal: string, n: number): string {
  const t = new Date(`${tanggal}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

function selisihHari(dari: string, sampai: string): number {
  const a = Date.parse(`${dari}T00:00:00Z`);
  const b = Date.parse(`${sampai}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Geser tenggat yang jatuh pada Sabtu/Minggu ke hari kerja berikutnya (Fase 22e).
 *
 * ⚠️ **Hari libur nasional & cuti bersama TIDAK ikut dihitung.** Daftarnya
 * terbit tiap tahun lewat SKB 3 Menteri dan berubah-ubah, jadi menanamkannya di
 * kode berarti angka yang diam-diam usang tiap Januari.
 *
 * Arah kesalahannya disengaja dan aman: aturan KUP juga menggeser tenggat MAJU
 * bila jatuh pada hari libur, sehingga tenggat yang ditampilkan di sini tidak
 * pernah LEBIH LAMBAT daripada tenggat sesungguhnya. Paling buruk pemilik
 * menyetor beberapa hari lebih awal. Kebalikannya — menampilkan tenggat yang
 * lebih lambat daripada yang sebenarnya — adalah denda, dan itu yang tidak
 * boleh terjadi.
 */
export function geserAkhirPekan(tanggal: string): string {
  const hari = new Date(`${tanggal}T00:00:00Z`).getUTCDay();
  if (hari === 6) return tambahHari(tanggal, 2); // Sabtu → Senin
  if (hari === 0) return tambahHari(tanggal, 1); // Minggu → Senin
  return tanggal;
}

/** Hari terakhir bulan `YYYY-MM`. */
function akhirBulan(masa: string): string {
  const [y, m] = masa.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
}

/** Tanggal ke-`hari` pada bulan SESUDAH `masa`. */
function tanggalBulanBerikut(masa: string, hari: number): string {
  const [y, m] = masa.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, hari)).toISOString().slice(0, 10);
}

export type ProfilPajak = {
  /** Pengusaha Kena Pajak → wajib SPT Masa PPN. */
  pkp: boolean;
  /** Memakai PPh Final UMKM 0,5% (PP 55/2022) alih-alih PPh 25. */
  pphFinalUmkm: boolean;
  /** Punya karyawan → wajib PPh 21. */
  adaKaryawan: boolean;
  /** Berbentuk badan (PT/CV) → SPT Tahunan 30 April; orang pribadi 31 Maret. */
  badan: boolean;
};

/**
 * Tenggat pajak untuk satu masa (Fase 22e).
 *
 * Tenggatnya mengikuti UU KUP & PMK: PPh 21/23 setor tgl 10 & lapor tgl 20
 * bulan berikutnya; PPh 25 dan PPh Final UMKM setor tgl 15; SPT Masa PPN setor
 * & lapor paling lambat AKHIR bulan berikutnya.
 *
 * Hanya kewajiban yang benar-benar berlaku bagi tenant yang dikembalikan —
 * kalender yang menampilkan PPN kepada non-PKP melatih orang mengabaikannya,
 * dan pengingat yang diabaikan sama saja tidak ada.
 */
export function tenggatMasaPajak(masa: string, profil: ProfilPajak, hariIni: string): TenggatPajak[] {
  const buat = (jenis: JenisPajak, kegiatan: "setor" | "lapor", tanggalUu: string): TenggatPajak => {
    const tanggal = geserAkhirPekan(tanggalUu);
    return { jenis, kegiatan, masa, tanggalUu, tanggal, sisaHari: selisihHari(hariIni, tanggal) };
  };

  const hasil: TenggatPajak[] = [];
  if (profil.adaKaryawan) {
    hasil.push(buat("pph21", "setor", tanggalBulanBerikut(masa, 10)));
    hasil.push(buat("pph21", "lapor", tanggalBulanBerikut(masa, 20)));
  }
  hasil.push(buat("pph23", "setor", tanggalBulanBerikut(masa, 10)));
  hasil.push(buat("pph23", "lapor", tanggalBulanBerikut(masa, 20)));
  if (profil.pphFinalUmkm) hasil.push(buat("pph_final", "setor", tanggalBulanBerikut(masa, 15)));
  else hasil.push(buat("pph25", "setor", tanggalBulanBerikut(masa, 15)));
  if (profil.pkp) {
    // PPN: satu tanggal untuk setor DAN lapor — akhir bulan berikutnya.
    const akhir = akhirBulan(tanggalBulanBerikut(masa, 1).slice(0, 7));
    hasil.push(buat("ppn", "setor", akhir));
    hasil.push(buat("ppn", "lapor", akhir));
  }
  return hasil;
}

/**
 * Tenggat SPT Tahunan untuk tahun buku `tahun` (Fase 22e).
 *
 * Orang pribadi 31 Maret, badan 30 April tahun berikutnya.
 */
export function tenggatSptTahunan(tahun: number, profil: ProfilPajak, hariIni: string): TenggatPajak {
  const tanggalUu = profil.badan ? `${tahun + 1}-04-30` : `${tahun + 1}-03-31`;
  const tanggal = geserAkhirPekan(tanggalUu);
  return {
    jenis: "spt_tahunan",
    kegiatan: "lapor",
    masa: String(tahun),
    tanggalUu,
    tanggal,
    sisaHari: selisihHari(hariIni, tanggal),
  };
}

/**
 * Tenggat yang layak diingatkan hari ini (Fase 22e).
 *
 * Jendelanya `hariKeDepan` ke depan DAN yang sudah lewat tetapi belum lama —
 * tenggat yang baru saja terlewat justru yang paling perlu dilihat, karena
 * dendanya masih bisa diperkecil dengan segera menyetor. Menyembunyikannya
 * begitu lewat tengah malam adalah kesalahan yang mahal.
 */
export function tenggatMendatang(semua: TenggatPajak[], hariKeDepan = 14, hariKeBelakang = 7): TenggatPajak[] {
  return semua
    .filter((t) => t.sisaHari <= hariKeDepan && t.sisaHari >= -hariKeBelakang)
    .sort((a, b) => a.sisaHari - b.sisaHari || a.jenis.localeCompare(b.jenis));
}

// --- Proyeksi arus kas 30–90 hari (Fase 22f) --------------------------------

/** Satu arus kas yang diperkirakan masuk/keluar pada tanggal tertentu. */
export type ArusDiproyeksikan = {
  /** `YYYY-MM-DD` perkiraan uangnya bergerak. */
  tanggal: string;
  /** Positif = masuk (piutang, kontrak); negatif = keluar (utang). */
  jumlah: number;
  sumber: "piutang" | "hutang" | "kontrak";
  keterangan: string;
  /** Sudah lewat jatuh tempo pada tanggal acuan. */
  terlambat: boolean;
};

export type EmberProyeksi = {
  /** Batas atas ember dalam hari sejak tanggal acuan (30, 60, 90). */
  hari: number;
  masuk: number;
  keluar: number;
  /** `masuk - keluar` pada ember ini saja. */
  bersih: number;
  /** Saldo kas perkiraan pada AKHIR ember ini. */
  saldoAkhir: number;
};

export type ProyeksiArusKas = {
  saldoAwal: number;
  ember: EmberProyeksi[];
  /**
   * Ember pertama yang saldo akhirnya negatif — peringatan yang sebenarnya
   * dicari pemilik. `null` bila kasnya tidak pernah minus dalam jendela ini.
   */
  emberDefisit: number | null;
  /** Jumlah arus yang tenggatnya SUDAH lewat tapi belum lunas. */
  jumlahTerlambat: number;
};

/**
 * Proyeksikan saldo kas ke 30/60/90 hari ke depan (Fase 22f).
 *
 * ⚠️ **Yang sudah jatuh tempo tapi belum dibayar dimasukkan ke ember PERTAMA,
 * bukan dibuang.** Piutang yang telat sebulan tetap uang yang diharapkan masuk;
 * membuangnya membuat proyeksi terlihat lebih buruk daripada kenyataan,
 * sementara menaruhnya di embernya sendiri (yang sudah lewat) membuat proyeksi
 * ini bukan proyeksi lagi. Jumlahnya dilaporkan terpisah lewat
 * `jumlahTerlambat` supaya pemilik tahu berapa banyak angka ini bersandar pada
 * tagihan yang sudah macet.
 *
 * Ini juga batas kejujuran terbesar fungsi ini: ia mengasumsikan setiap tagihan
 * dibayar **tepat pada tanggal jatuh temponya**. Pelanggan yang biasa telat
 * tidak dimodelkan.
 */
export function proyeksikanArusKas(
  saldoAwal: number,
  arus: ArusDiproyeksikan[],
  hariIni: string,
  batas: number[] = [30, 60, 90],
): ProyeksiArusKas {
  const hari = (t: string) => Math.round((Date.parse(`${t}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) / 86_400_000);
  const urutBatas = [...batas].sort((a, b) => a - b);

  let saldo = saldoAwal;
  const ember: EmberProyeksi[] = [];
  let sebelumnya = -Infinity;
  for (const b of urutBatas) {
    let masuk = 0;
    let keluar = 0;
    for (const a of arus) {
      const d = hari(a.tanggal);
      // Yang sudah lewat masuk ke ember PERTAMA (sebelumnya === -Infinity),
      // bukan dibuang dan bukan dibuatkan ember sendiri.
      const dalamEmber = d <= b && (sebelumnya === -Infinity || d > sebelumnya);
      if (!dalamEmber) continue;
      if (a.jumlah >= 0) masuk += a.jumlah;
      else keluar += -a.jumlah;
    }
    saldo += masuk - keluar;
    ember.push({ hari: b, masuk, keluar, bersih: masuk - keluar, saldoAkhir: saldo });
    sebelumnya = b;
  }

  const defisit = ember.find((e) => e.saldoAkhir < 0);
  return {
    saldoAwal,
    ember,
    emberDefisit: defisit ? defisit.hari : null,
    jumlahTerlambat: arus.filter((a) => a.terlambat).length,
  };
}

/* ------------------------------------------------------------------ *
 * Komisi sales (Fase 44a)
 * ------------------------------------------------------------------ */

/**
 * Komisi penjualan.
 *
 * Tiga keputusan di bawah menentukan benar-salahnya angka yang dibayarkan, dan
 * ketiganya lebih sering salah daripada benar di sistem buatan sendiri:
 *
 * 1. **Dasar omzet adalah subtotal, bukan total.** Total memuat PPN — uang yang
 *    dititipkan negara, bukan hasil penjualan. Membayar komisi atasnya berarti
 *    membayar sales dari kas pajak.
 * 2. **Tarif disimpan sebagai basis poin bilangan bulat**, bukan persen pecahan.
 *    2,5% menjadi 250. Persen pecahan menyeret aritmetika uang ke `Number`
 *    pecahan, dan selisih satu rupiah pada komisi adalah selisih yang
 *    diperdebatkan orang.
 * 3. **Pemicunya bisa pelunasan, bukan hanya faktur.** Membayar komisi atas
 *    faktur yang belum tentu tertagih adalah cara klasik kehilangan uang: sales
 *    sudah dibayar, pelanggannya kabur.
 */

/** Dasar perhitungan komisi. */
export const KOMISI_DASAR = ["omzet", "laba"] as const;
export type KomisiDasar = (typeof KOMISI_DASAR)[number];

/** Kapan komisi lahir. */
export const KOMISI_PEMICU = ["faktur", "pelunasan"] as const;
export type KomisiPemicu = (typeof KOMISI_PEMICU)[number];

/** Satu basis poin = 0,01%. 250 bp = 2,5%. */
export const BASIS_POIN_PENUH = 10_000;

export type FakturKomisi = {
  /** Nilai barang/jasa sebelum PPN. */
  subtotal: number;
  /** Harga pokok penjualan faktur ini. Nol untuk penjualan jasa murni. */
  cogs: number;
  /** Yang benar-benar sudah dibayar pelanggan. */
  paidAmount: number;
  /** Nilai faktur termasuk PPN — pembanding `paidAmount`. */
  total: number;
  /** Nilai retur yang sudah dikembalikan. */
  returnedAmount: number;
  /** Terisi bila fakturnya dibatalkan. */
  voidedAt?: string | null;
};

/**
 * Dasar komisi sebuah faktur, sebelum tarif dikenakan.
 *
 * Retur dikurangkan lebih dulu: barang yang kembali bukan penjualan, dan
 * membiarkannya menghasilkan komisi berarti membayar sales atas transaksi yang
 * dibatalkan pelanggannya sendiri.
 */
export function dasarKomisi(faktur: FakturKomisi, dasar: KomisiDasar): number {
  if (faktur.voidedAt) return 0;
  const bersih = Math.max(0, faktur.subtotal - faktur.returnedAmount);
  if (dasar === "omzet") return bersih;
  // Laba kotor tidak boleh negatif menjadi komisi negatif: menjual rugi adalah
  // persoalan harga, dan memotong gaji sales lewat komisi minus bukan
  // penyelesaiannya — itu keputusan yang harus diambil orang, bukan rumus.
  return Math.max(0, bersih - faktur.cogs);
}

/**
 * Bagian faktur yang sudah menghasilkan komisi menurut pemicunya.
 *
 * Untuk pemicu `pelunasan`, pembayaran sebagian menghasilkan komisi sebagian —
 * proporsional terhadap yang sudah masuk. Membayar penuh atas pelunasan
 * pertama akan menyamakan cicilan pertama dengan lunas.
 */
export function porsiTerpicu(faktur: FakturKomisi, pemicu: KomisiPemicu): number {
  if (faktur.voidedAt) return 0;
  if (pemicu === "faktur") return 1;
  if (faktur.total <= 0) return 0;
  return Math.min(1, Math.max(0, faktur.paidAmount / faktur.total));
}

export type KomisiBreakdown = {
  dasarNilai: number;
  porsi: number;
  tarifBp: number;
  amount: number;
};

/** Hitung komisi satu faktur. */
export function hitungKomisi(
  faktur: FakturKomisi,
  opts: { dasar: KomisiDasar; pemicu: KomisiPemicu; tarifBp: number },
): KomisiBreakdown {
  const dasarNilai = dasarKomisi(faktur, opts.dasar);
  const porsi = porsiTerpicu(faktur, opts.pemicu);
  return {
    dasarNilai,
    porsi,
    tarifBp: opts.tarifBp,
    amount: Math.round((dasarNilai * porsi * opts.tarifBp) / BASIS_POIN_PENUH),
  };
}

/** Tampilkan basis poin sebagai persen untuk layar: 250 → "2,5". */
export function bpKePersen(bp: number): string {
  return (bp / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

/* ------------------------------------------------------------------ *
 * PPh 22 & bahan pengisian e-Bupot (Fase 46)
 * ------------------------------------------------------------------ */

/**
 * PPh Pasal 22 yang **dipungut pihak lain dari kita** saat membeli.
 *
 * Ini kasus yang sebenarnya dialami UKM: membeli semen, baja, kertas, atau
 * otomotif dari distributor berstatus pemungut, lalu dipungut PPh 22 di atas
 * harga barangnya. Uang itu **bukan beban** — ia kredit pajak yang mengurangi
 * PPh badan akhir tahun. Mencatatnya sebagai beban adalah kesalahan yang
 * mahal: perusahaan membayar pajaknya dua kali, sekali saat dipungut dan
 * sekali lagi saat menghitung PPh badan tanpa mengurangkannya.
 *
 * Karena itu ia diposting ke akun **aset** (Uang Muka PPh 22), bukan akun
 * beban.
 *
 * Tarifnya bergantung objeknya dan diatur PMK 34/2017 beserta perubahannya.
 * Angka di bawah adalah tarif lazim; medannya tetap bisa disunting karena
 * tarif dapat berubah dan sebagian bergantung status lawan transaksi
 * (mis. tanpa NPWP dikenai 100% lebih tinggi).
 */
export const PPH22_OBJECTS = [
  { code: "impor-api", label: "Impor (punya API)", rate: 2.5 },
  { code: "impor-nonapi", label: "Impor (tanpa API)", rate: 7.5 },
  { code: "semen", label: "Pembelian semen", rate: 0.25 },
  { code: "kertas", label: "Pembelian kertas", rate: 0.1 },
  { code: "baja", label: "Pembelian baja", rate: 0.3 },
  { code: "otomotif", label: "Pembelian otomotif", rate: 0.45 },
  { code: "lainnya", label: "Objek lain", rate: 1.5 },
] as const;
export type Pph22ObjectCode = (typeof PPH22_OBJECTS)[number]["code"];
export const PPH22_OBJECT_LABELS: Record<string, string> = Object.fromEntries(
  PPH22_OBJECTS.map((o) => [o.code, o.label]),
);

export const pph22Schema = z.object({
  contactId: z.string().min(1, "Pilih pemungut"),
  taxDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
  objectType: z.enum(PPH22_OBJECTS.map((o) => o.code) as [string, ...string[]]),
  gross: amountSchema.refine((n) => n >= 1, "Dasar pengenaan minimal 1"),
  rate: z.number().min(0).max(100),
  /** Akun lawan: utang ke pemasok, atau kas/bank bila dibayar tunai. */
  sourceAccountId: z.string().min(1, "Pilih akun sumber lebih dulu — bisa utang, kas, atau bank."),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});
export type Pph22Input = z.infer<typeof pph22Schema>;

export type ApiPph22 = {
  id: string;
  docNo: string;
  contactId: string;
  contactName: string;
  contactNpwp: string | null;
  taxDate: string;
  objectType: string;
  gross: number;
  rate: number;
  amount: number;
  note: string | null;
  createdAt: string;
};

/**
 * Hitung nilai pungutan dari dasar dan tarif.
 *
 * Dibulatkan ke rupiah terdekat. Tarif pecahan seperti 0,25% memang lazim di
 * PPh 22, jadi `rate` sengaja `number` dan bukan basis poin bilangan bulat
 * seperti komisi — di sini yang dipakai orang adalah persen sebagaimana
 * tertulis di peraturannya, dan memaksanya ke basis poin justru menjauhkan
 * angka di layar dari angka di PMK.
 */
export function nilaiPungutan(gross: number, rate: number): number {
  return Math.round((gross * rate) / 100);
}

/**
 * Satu baris bahan pengisian e-Bupot Unifikasi (Fase 46).
 *
 * **Ini bahan pengisian, bukan berkas impor resmi DJP.** Format impor e-Bupot
 * berubah mengikuti aturan DJP dan tidak dijanjikan cocok di sini; yang
 * dijamin berkas ini adalah bahwa seluruh angka yang diminta e-Bupot sudah
 * terkumpul di satu tempat, lengkap dengan NPWP lawan transaksinya. Menjanjikan
 * lebih dari itu akan menjadi janji yang tidak bisa ditunjuk buktinya.
 */
export type BarisEBupot = {
  masa: string;
  jenis: PphJenis | "pph22";
  noBukti: string;
  tanggal: string;
  npwp: string;
  nama: string;
  objek: string;
  dpp: number;
  tarif: number;
  pph: number;
};

/** Kolom berkas bahan e-Bupot, berurutan. */
export const KOLOM_EBUPOT = [
  "masa",
  "jenis",
  "no_bukti",
  "tanggal",
  "npwp",
  "nama",
  "objek",
  "dpp",
  "tarif",
  "pph",
] as const;

/**
 * Susun berkas CSV bahan e-Bupot.
 *
 * NPWP yang kosong ditulis apa adanya sebagai kosong, **tidak** diisi
 * `00.000.000.0-000.000`. Menuliskan NPWP palsu supaya kolomnya terisi akan
 * membuat berkasnya terlihat lengkap padahal datanya belum ada — dan yang
 * memeriksanya baru tahu setelah ditolak DJP.
 */
export function csvEBupot(baris: BarisEBupot[]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = baris.map((b) =>
    [b.masa, b.jenis, b.noBukti, b.tanggal, b.npwp, b.nama, b.objek, b.dpp, b.tarif, b.pph]
      .map(escape)
      .join(","),
  );
  return [KOLOM_EBUPOT.join(","), ...rows].join("\n");
}
