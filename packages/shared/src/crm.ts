import { z } from "zod";
import { emailSchema } from "./core";
import { amountSchema } from "./accounting";
import { commerceLineSchema, TAX_RATES } from "./commerce";
import type { ApiCommerceLine } from "./approvals";

// ---------------------------------------------------------------------------
// CRM Pipeline (Fase 2l): lead, funnel, aktivitas, penawaran (quotation)
// ---------------------------------------------------------------------------

/** Tahap funnel penjualan, berurutan dari awal ke penutupan. */
export const LEAD_STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "Baru",
  contacted: "Dihubungi",
  qualified: "Terkualifikasi",
  proposal: "Penawaran",
  won: "Menang",
  lost: "Kalah",
};

export const LEAD_ACTIVITY_TYPES = ["call", "email", "meeting", "whatsapp", "note"] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export const LEAD_ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  call: "Telepon",
  email: "Email",
  meeting: "Pertemuan",
  whatsapp: "WhatsApp",
  note: "Catatan",
};

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
  contactPerson: z.string().trim().max(150).optional(),
  email: z.union([emailSchema, z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  source: z.string().trim().max(100).optional(),
  estValue: amountSchema.default(0),
  notes: z.string().trim().max(1000).optional(),
});
export type LeadInput = z.infer<typeof leadSchema>;

/**
 * Kiriman form lead publik (Fase 21e) — dipakai form yang ditempel pemilik di
 * landing/bio media sosialnya sendiri.
 *
 * Sengaja lebih sempit daripada `leadSchema`: pengunjung tak boleh menentukan
 * `estValue` atau `source`. Keduanya diisi server, karena nilai perkiraan yang
 * datang dari orang luar akan mengotori pipeline penjualan pemiliknya.
 */
export const leadFormSchema = z.object({
  token: z.string().trim().min(16, "Token form tidak valid").max(200),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
  email: z.union([emailSchema, z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().max(1000).optional(),
});
export type LeadFormInput = z.infer<typeof leadFormSchema>;

/** Penanda `source` untuk lead yang masuk lewat form publik (Fase 21e). */
export const SUMBER_LEAD_FORM = "form-publik";

/** Perubahan lead: geser tahap funnel dan/atau sunting field. Semua opsional. */
export const updateLeadSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  contactPerson: z.string().trim().max(150).optional(),
  email: z.union([emailSchema, z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  source: z.string().trim().max(100).optional(),
  estValue: amountSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
  stage: z.enum(LEAD_STAGES).optional(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const leadActivitySchema = z.object({
  type: z.enum(LEAD_ACTIVITY_TYPES),
  note: z.string().trim().min(1, "Catatan wajib diisi").max(1000),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  /** Tenggat tindak lanjut (opsional) — masuk lonceng notifikasi saat jatuh tempo. */
  dueAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
    .optional(),
});
export type LeadActivityInput = z.infer<typeof leadActivitySchema>;

/** Laporan konversi CRM per sumber lead (Fase 5e). */
export type ApiCrmSourceRow = {
  source: string;
  total: number;
  won: number;
  lost: number;
  conversionPct: number;
};

export const createQuotationSchema = z.object({
  contactId: z.string().min(1, "Pelanggan wajib dipilih"),
  leadId: z.string().optional(),
  quoteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  taxRate: z
    .number()
    .int()
    .refine((v): v is (typeof TAX_RATES)[number] => (TAX_RATES as readonly number[]).includes(v), "Tarif pajak tidak dikenal")
    .default(0),
  notes: z.string().trim().max(500).optional(),
  lines: z.array(commerceLineSchema).min(1, "Minimal 1 baris barang"),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const QUOTATION_STATUSES = ["draft", "sent", "accepted", "rejected", "converted"] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

/** Transisi status penawaran yang boleh dilakukan manual (converted dikelola sistem). */
export const quotationStatusSchema = z.object({
  status: z.enum(["sent", "accepted", "rejected", "draft"]),
});
export type QuotationStatusInput = z.infer<typeof quotationStatusSchema>;

/** Konversi penawaran → faktur penjualan: butuh gudang untuk pergerakan stok. */
export const convertQuotationSchema = z.object({
  warehouseId: z.string().min(1, "Gudang wajib dipilih"),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type ConvertQuotationInput = z.infer<typeof convertQuotationSchema>;

export type ApiLead = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: LeadStage;
  estValue: number;
  notes: string | null;
  status: "open" | "won" | "lost";
  convertedContactId: string | null;
  activityCount: number;
  createdAt: string;
};

export type ApiLeadActivity = {
  id: string;
  type: LeadActivityType;
  note: string;
  activityDate: string;
  dueAt: string | null;
  userName: string | null;
  createdAt: string;
};

export type ApiQuotation = {
  id: string;
  quoteNo: string;
  contactId: string;
  contactName: string;
  leadId: string | null;
  quoteDate: string;
  validUntil: string | null;
  status: QuotationStatus;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  resultInvoiceId: string | null;
  lines: ApiCommerceLine[];
};

// ---------------------------------------------------------------------------
// Anggaran (Fase 2n): target pendapatan/beban per akun per bulan
// ---------------------------------------------------------------------------

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const setBudgetSchema = z.object({
  accountId: z.string().min(1, "Akun wajib dipilih"),
  period: z.string().regex(PERIOD_RE, "Periode harus berformat YYYY-MM"),
  amount: amountSchema.default(0),
});
export type SetBudgetInput = z.infer<typeof setBudgetSchema>;

export type ApiBudgetRow = {
  accountId: string;
  code: string;
  name: string;
  type: "income" | "expense";
  budget: number;
  actual: number;
  /** Selisih favorable: pendapatan actual>budget atau beban actual<budget. */
  variance: number;
};

export type ApiBudgetReport = {
  period: string;
  rows: ApiBudgetRow[];
  totalBudgetIncome: number;
  totalActualIncome: number;
  totalBudgetExpense: number;
  totalActualExpense: number;
};


/* ------------------------------------------------------------------ *
 * Target & prakiraan penjualan (Fase 44b)
 * ------------------------------------------------------------------ */

/**
 * Peluang penutupan per tahap pipeline, dalam persen.
 *
 * Prakiraan penjualan yang menjumlahkan seluruh nilai pipeline apa adanya
 * selalu terlalu besar, dan besarnya justru meyakinkan — itulah yang membuatnya
 * berbahaya. Prospek yang baru masuk dan penawaran yang tinggal diteken tidak
 * sama nilainya, dan menganggapnya sama membuat perusahaan berbelanja atas uang
 * yang belum tentu datang.
 *
 * Angka di bawah adalah **nilai baku yang lazim**, bukan hasil pengukuran atas
 * data perusahaan mana pun. Karena itu layarnya menampilkan peluang tiap tahap
 * apa adanya — pemiliknya harus bisa melihat dasar prakiraannya, lalu menilai
 * sendiri apakah angka itu cocok dengan pengalamannya.
 *
 * `won` bernilai 100 dan `lost` bernilai 0 bukan sebagai peluang, melainkan
 * sebagai kepastian: keduanya sudah selesai. Prakiraan hanya menghitung yang
 * masih berjalan, jadi keduanya dikeluarkan dari perhitungan — lihat
 * `forecastTertimbang`.
 */
export const PELUANG_TAHAP: Record<LeadStage, number> = {
  new: 10,
  contacted: 20,
  qualified: 40,
  proposal: 60,
  won: 100,
  lost: 0,
};

/** Tahap yang masih berjalan — hanya ini yang masuk prakiraan. */
export const TAHAP_BERJALAN: LeadStage[] = ["new", "contacted", "qualified", "proposal"];

export type LeadForecast = { stage: LeadStage; estValue: number };

export type ForecastBreakdown = {
  /** Nilai pipeline apa adanya, tanpa pembobotan. Selalu >= tertimbang. */
  kotor: number;
  /** Jumlah setelah tiap nilai dikalikan peluang tahapnya. */
  tertimbang: number;
  perTahap: { stage: LeadStage; jumlah: number; kotor: number; tertimbang: number }[];
};

/**
 * Prakiraan penjualan tertimbang dari pipeline yang masih berjalan.
 *
 * Prospek yang sudah `won` tidak ikut: nilainya sudah menjadi penjualan
 * sungguhan dan akan terhitung dua kali bila dijumlahkan lagi di sini. Yang
 * `lost` juga tidak ikut, dengan alasan yang jelas.
 */
export function forecastTertimbang(leads: LeadForecast[]): ForecastBreakdown {
  const perTahap = TAHAP_BERJALAN.map((stage) => {
    const milik = leads.filter((l) => l.stage === stage);
    const kotor = milik.reduce((a, l) => a + l.estValue, 0);
    return {
      stage,
      jumlah: milik.length,
      kotor,
      tertimbang: Math.round((kotor * PELUANG_TAHAP[stage]) / 100),
    };
  });
  return {
    kotor: perTahap.reduce((a, t) => a + t.kotor, 0),
    tertimbang: perTahap.reduce((a, t) => a + t.tertimbang, 0),
    perTahap,
  };
}

export type PencapaianTarget = {
  target: number;
  realisasi: number;
  /** Persentase pencapaian, dibulatkan. Tanpa target → 0. */
  persen: number;
  /** Kurang berapa lagi. Nol bila sudah tercapai atau terlampaui. */
  kurang: number;
  tercapai: boolean;
};

/**
 * Pencapaian terhadap target.
 *
 * Target nol tidak menghasilkan pembagian dengan nol maupun "tercapai 100%":
 * sales yang belum diberi target belum bisa dinilai, dan menampilkannya sebagai
 * sudah tercapai adalah kebohongan yang menyenangkan.
 */
export function pencapaianTarget(target: number, realisasi: number): PencapaianTarget {
  if (target <= 0) {
    return { target: 0, realisasi, persen: 0, kurang: 0, tercapai: false };
  }
  return {
    target,
    realisasi,
    persen: Math.round((realisasi / target) * 100),
    kurang: Math.max(0, target - realisasi),
    tercapai: realisasi >= target,
  };
}

/** Tetapkan target penjualan satu sales untuk satu bulan (Fase 44b). */
export const salesTargetSchema = z.object({
  salespersonId: z.string().min(1, "Pilih sales lebih dulu."),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode harus berformat YYYY-MM"),
  targetAmount: z.number().int().min(0).max(1_000_000_000_000),
});
export type SalesTargetInput = z.infer<typeof salesTargetSchema>;

export type ApiSalesTargetRow = {
  salespersonId: string;
  salespersonName: string;
  target: number;
  realisasi: number;
  persen: number;
  kurang: number;
  tercapai: boolean;
  /** Jumlah faktur yang membentuk realisasinya. */
  faktur: number;
};

export type ApiSalesTargetReport = {
  period: string;
  rows: ApiSalesTargetRow[];
  totalTarget: number;
  totalRealisasi: number;
  forecast: ForecastBreakdown;
};
