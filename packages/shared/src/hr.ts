import { z } from "zod";
import { JENIS_HARI_LEMBUR, PTKP_STATUSES, type JenisHariLembur, type PtkpStatus } from "./payroll";
import { amountSchema } from "./accounting";

// ---------------------------------------------------------------------------
// HR & Payroll (Fase 2o): karyawan, penggajian bulanan (PPh 21 TER + BPJS)
// ---------------------------------------------------------------------------

export const employeeSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
  position: z.string().trim().max(100).optional(),
  ptkpStatus: z.enum(PTKP_STATUSES),
  baseSalary: amountSchema.default(0),
  allowances: amountSchema.default(0),
  bankAccount: z.string().trim().max(50).optional(),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Struktur organisasi (Fase 8c) — opsional, kompatibel mundur. */
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

/** Departemen (Fase 8c) — hierarki via parentId. */
export const departmentSchema = z.object({
  code: z.string().trim().min(1, "Kode wajib diisi").max(20),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  parentId: z.string().optional(),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export type ApiDepartment = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  employeeCount: number;
};

/** Simpul bagan organisasi: departemen + karyawan di dalamnya + sub-departemen. */
export type ApiOrgNode = {
  id: string;
  code: string;
  name: string;
  employees: { id: string; name: string; position: string | null; managerName: string | null }[];
  children: ApiOrgNode[];
};

/** Jalankan penggajian: satu bulan + akun kas pembayar. */
export const runPayrollSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode harus berformat YYYY-MM"),
  cashAccountId: z.string().min(1, "Pilih akun kas atau bank lebih dulu."),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
});
export type RunPayrollInput = z.infer<typeof runPayrollSchema>;

export type ApiEmployee = {
  id: string;
  name: string;
  position: string | null;
  ptkpStatus: PtkpStatus;
  baseSalary: number;
  allowances: number;
  bankAccount: string | null;
  joinDate: string | null;
  isActive: boolean;
  /** Sisa cuti tahunan (hari) — dipotong saat cuti tahunan disetujui. */
  leaveBalance: number;
  /** Struktur organisasi (Fase 8c). */
  departmentId: string | null;
  departmentName: string | null;
  managerId: string | null;
  managerName: string | null;
};

export type ApiPayslip = {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string | null;
  baseSalary: number;
  allowances: number;
  gross: number;
  bpjsHealthEmployee: number;
  bpjsJhtEmployee: number;
  bpjsJpEmployee: number;
  terCategory: string;
  terRate: number;
  pph21: number;
  totalDeductions: number;
  net: number;
  /** Total komponen ad-hoc periode ini (bonus/lembur positif, potongan negatif) — sudah termasuk bruto. */
  adjustmentsTotal: number;
  /** Cicilan kasbon yang dipotong dari netto (di luar pajak). */
  loanDeduction: number;
};

/**
 * Hari raya keagamaan yang diakui untuk THR.
 *
 * Daftarnya tertutup dan mengikuti enam agama yang diakui negara, karena
 * kuncinya ikut menentukan keunikan run: satu tahun boleh punya beberapa run
 * THR, tetapi tidak boleh dua kali untuk hari raya yang sama.
 */
export const HARI_RAYA = ["idulfitri", "natal", "nyepi", "waisak", "imlek"] as const;
export type HariRaya = (typeof HARI_RAYA)[number];

/** Jalankan pembayaran THR: satu hari raya dalam satu tahun + akun kas pembayar. */
export const runThrSchema = z.object({
  tahun: z.number().int().min(2020).max(2100),
  hariRaya: z.enum(HARI_RAYA),
  cashAccountId: z.string().min(1, "Pilih akun kas atau bank lebih dulu."),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
});
export type RunThrInput = z.infer<typeof runThrSchema>;

export type ApiThrSlip = {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string | null;
  masaKerjaBulan: number;
  proporsional: boolean;
  upahSebulan: number;
  thr: number;
  pph21: number;
  net: number;
};

export type ApiThrRun = {
  id: string;
  runNo: string;
  tahun: number;
  hariRaya: HariRaya;
  payDate: string;
  status: "posted";
  totalThr: number;
  totalPph21: number;
  totalNet: number;
  journalNo: string | null;
  createdAt: string;
  slips: ApiThrSlip[];
  voidedAt?: string | null;
  voidJournalNo?: string | null;
};

/** Catat lembur satu karyawan pada satu tanggal (Fase 43b). */
export const overtimeSchema = z.object({
  employeeId: z.string().min(1, "Pilih karyawan lebih dulu."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  jenisHari: z.enum(JENIS_HARI_LEMBUR),
  // Setengah jam adalah satuan lembur yang lazim; 24 jam adalah batas fisik
  // sehari, bukan batas hukum — batas hukumnya ditandai, bukan ditolak.
  hours: z.number().min(0.5, "Lembur minimal setengah jam").max(24),
  note: z.string().trim().max(200).optional(),
});
export type OvertimeInput = z.infer<typeof overtimeSchema>;

export type ApiOvertime = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  period: string;
  jenisHari: JenisHariLembur;
  hours: number;
  hourlyWage: number;
  amount: number;
  /** Melampaui batas jam PP 35/2021 — ditandai, bukan ditolak. */
  exceedsLimit: boolean;
  note: string | null;
  /** Terisi bila periodenya sudah digaji; saat itu barisnya terkunci. */
  runId: string | null;
};

export type ApiPayrollRun = {
  id: string;
  runNo: string;
  period: string;
  status: "posted";
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  journalNo: string | null;
  createdAt: string;
  payslips: ApiPayslip[];
  /** Fase 10c: terisi bila run sudah dibatalkan (jurnal terbalik, kasbon pulih). */
  voidedAt?: string | null;
  voidJournalNo?: string | null;
};

/** Komponen gaji ad-hoc satu periode (bonus/lembur positif, potongan negatif) — ikut PPh 21 & BPJS. */
export const payrollAdjustmentSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode harus berformat YYYY-MM"),
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  name: z.string().trim().min(2, "Nama komponen minimal 2 karakter").max(100),
  amount: z
    .number()
    .int("Nominal harus bilangan bulat")
    .refine((v) => v !== 0, "Nominal tidak boleh 0")
    .refine((v) => Math.abs(v) <= 1_000_000_000_000, "Nominal terlalu besar"),
});
export type PayrollAdjustmentInput = z.infer<typeof payrollAdjustmentSchema>;

export type ApiPayrollAdjustment = {
  id: string;
  period: string;
  employeeId: string;
  employeeName: string;
  name: string;
  amount: number;
  /** Terisi setelah periode itu digaji — komponen sudah terpakai. */
  runId: string | null;
  createdAt: string;
};

/** Kasbon/pinjaman karyawan: dicairkan dari kas, cicilan otomatis memotong gaji tiap run. */
export const employeeLoanSchema = z
  .object({
    employeeId: z.string().min(1, "Karyawan wajib dipilih"),
    name: z.string().trim().min(2, "Keterangan minimal 2 karakter").max(100),
    principal: amountSchema.refine((v) => v > 0, "Pokok pinjaman harus lebih dari 0"),
    monthlyDeduction: amountSchema.refine((v) => v > 0, "Cicilan per bulan harus lebih dari 0"),
    cashAccountId: z.string().min(1, "Pilih akun kas atau bank lebih dulu."),
    loanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  })
  .refine((v) => v.monthlyDeduction <= v.principal, {
    message: "Cicilan per bulan tidak boleh melebihi pokok pinjaman",
    path: ["monthlyDeduction"],
  });
export type EmployeeLoanInput = z.infer<typeof employeeLoanSchema>;

export type ApiEmployeeLoan = {
  id: string;
  employeeId: string;
  employeeName: string;
  name: string;
  principal: number;
  monthlyDeduction: number;
  balance: number;
  status: "active" | "paid";
  journalNo: string | null;
  createdAt: string;
};

export const LEAVE_TYPES = ["annual", "sick", "permit"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const leaveRequestSchema = z
  .object({
    employeeId: z.string().min(1, "Karyawan wajib dipilih"),
    type: z.enum(LEAVE_TYPES),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
    note: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["endDate"],
  });
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const decideLeaveSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});
export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>;

export type ApiLeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  createdAt: string;
};

// --- Absensi/kehadiran (Fase 6b) ---------------------------------------------

export const ATTENDANCE_STATUSES = ["hadir", "izin", "sakit", "alfa", "cuti"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alfa: "Alfa",
  cuti: "Cuti",
};

/** Catat/koreksi kehadiran satu karyawan pada satu tanggal (upsert). */
export const attendanceSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  status: z.enum(ATTENDANCE_STATUSES),
  clockIn: z.string().regex(/^\d{2}:\d{2}$/, "Jam tidak valid").optional().or(z.literal("")),
  clockOut: z.string().regex(/^\d{2}:\d{2}$/, "Jam tidak valid").optional().or(z.literal("")),
  note: z.string().trim().max(200).optional(),
});
export type AttendanceInput = z.infer<typeof attendanceSchema>;

export type ApiAttendance = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  note: string | null;
};

/** Rekap bulanan per karyawan: jumlah hari per status. */
export type ApiAttendanceRecap = {
  employeeId: string;
  employeeName: string;
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
  cuti: number;
  total: number;
};

// ---------------------------------------------------------------------------
// Aset Tetap (Fase 2p): register aset, penyusutan garis lurus, pelepasan
// ---------------------------------------------------------------------------

// Konstanta Fase 22d diletakkan DI ATAS skema aset karena dipakai sebagai NILAI
// (z.enum) di dalamnya — tipe boleh dipakai sebelum dideklarasikan, nilai tidak.
/** Metode penyusutan yang didukung. */
export const METODE_PENYUSUTAN = ["garis_lurus", "saldo_menurun"] as const;
export type MetodePenyusutan = (typeof METODE_PENYUSUTAN)[number];

/**
 * Kelompok harta berwujud UU PPh Pasal 11.
 *
 * `saldoMenurunBoleh: false` untuk bangunan bukan pembatasan yang dikarang —
 * Pasal 11 ayat (6) memang hanya mengizinkan garis lurus untuk bangunan. Aturan
 * ini ditegakkan saat penyimpanan, bukan cuma disembunyikan di layar, supaya
 * data yang masuk lewat API tetap sah.
 */
export const KELOMPOK_HARTA = [
  { kode: "kel1", label: "Kelompok 1 (4 tahun)", umurBulan: 48, saldoMenurunBoleh: true },
  { kode: "kel2", label: "Kelompok 2 (8 tahun)", umurBulan: 96, saldoMenurunBoleh: true },
  { kode: "kel3", label: "Kelompok 3 (16 tahun)", umurBulan: 192, saldoMenurunBoleh: true },
  { kode: "kel4", label: "Kelompok 4 (20 tahun)", umurBulan: 240, saldoMenurunBoleh: true },
  { kode: "bangunan_permanen", label: "Bangunan permanen (20 tahun)", umurBulan: 240, saldoMenurunBoleh: false },
  { kode: "bangunan_non_permanen", label: "Bangunan tidak permanen (10 tahun)", umurBulan: 120, saldoMenurunBoleh: false },
] as const;
export type KodeKelompokHarta = (typeof KELOMPOK_HARTA)[number]["kode"];
export const KELOMPOK_HARTA_BY_KODE: Record<string, (typeof KELOMPOK_HARTA)[number]> = Object.fromEntries(
  KELOMPOK_HARTA.map((k) => [k.kode, k]),
);


export const fixedAssetSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
    category: z.string().trim().max(100).optional(),
    acquisitionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
    acquisitionCost: z.number().int().min(1, "Nilai perolehan minimal Rp 1").max(1_000_000_000_000),
    usefulLifeMonths: z.number().int().min(1, "Masa manfaat minimal 1 bulan").max(600),
    residualValue: amountSchema.default(0),
    cashAccountId: z.string().min(1, "Pilih akun kas atau bank lebih dulu."),
    // Fase 22d. Bawaannya `garis_lurus` supaya bentuk permintaan lama tetap sah
    // dan perilakunya persis seperti sebelum fase ini.
    depreciationMethod: z.enum(METODE_PENYUSUTAN).default("garis_lurus"),
    taxGroup: z.enum(KELOMPOK_HARTA.map((k) => k.kode) as [string, ...string[]]).nullish(),
    taxMethod: z.enum(METODE_PENYUSUTAN).nullish(),
  })
  .refine((v) => v.residualValue < v.acquisitionCost, {
    message: "Nilai residu harus lebih kecil dari nilai perolehan",
    path: ["residualValue"],
  })
  // UU PPh Pasal 11 ayat (6): bangunan hanya boleh garis lurus. Ditegakkan di
  // skema, bukan cuma disembunyikan dari layar, supaya data yang masuk lewat
  // API publik tetap sah.
  .refine((v) => !(v.taxMethod === "saldo_menurun" && v.taxGroup && !KELOMPOK_HARTA_BY_KODE[v.taxGroup]?.saldoMenurunBoleh), {
    message: "Bangunan hanya boleh disusutkan garis lurus (UU PPh Ps. 11 ayat 6)",
    path: ["taxMethod"],
  });
export type FixedAssetInput = z.infer<typeof fixedAssetSchema>;

/**
 * Setel metode & kelompok pajak aset yang SUDAH ada (Fase 22d).
 *
 * Terpisah dari `fixedAssetSchema` karena tidak menyentuh nilai perolehan
 * maupun jurnalnya: mengubah kelompok harta tidak boleh jadi alasan menulis
 * ulang jurnal perolehan yang sudah diposting.
 */
export const setAssetTaxSchema = z
  .object({
    depreciationMethod: z.enum(METODE_PENYUSUTAN).optional(),
    taxGroup: z.enum(KELOMPOK_HARTA.map((k) => k.kode) as [string, ...string[]]).nullish(),
    taxMethod: z.enum(METODE_PENYUSUTAN).nullish(),
  })
  .refine((v) => !(v.taxMethod === "saldo_menurun" && v.taxGroup && !KELOMPOK_HARTA_BY_KODE[v.taxGroup]?.saldoMenurunBoleh), {
    message: "Bangunan hanya boleh disusutkan garis lurus (UU PPh Ps. 11 ayat 6)",
    path: ["taxMethod"],
  });
export type SetAssetTaxInput = z.infer<typeof setAssetTaxSchema>;

export const runDepreciationSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode harus berformat YYYY-MM"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
});
export type RunDepreciationInput = z.infer<typeof runDepreciationSchema>;

export const disposeAssetSchema = z.object({
  disposalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  proceeds: amountSchema.default(0),
  cashAccountId: z.string().min(1, "Pilih akun kas atau bank lebih dulu."),
});
export type DisposeAssetInput = z.infer<typeof disposeAssetSchema>;

/**
 * Revaluasi aset tetap (Fase 20e) — model revaluasi PSAK 16.
 *
 * `fairValue` boleh 0 (aset dinilai habis) tetapi tidak boleh negatif; itu
 * sebabnya `amountSchema` dipakai, bukan angka bebas.
 */
export const revalueAssetSchema = z.object({
  revalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  fairValue: amountSchema,
  note: z.string().max(200).optional(),
});
export type RevalueAssetInput = z.infer<typeof revalueAssetSchema>;

export type ApiAssetRevaluation = {
  id: string;
  revalDate: string;
  costBefore: number;
  accumulatedBefore: number;
  bookValueBefore: number;
  fairValue: number;
  /** Positif = surplus (ekuitas); negatif = rugi penurunan nilai (beban). */
  difference: number;
  note: string | null;
};

export type ApiFixedAsset = {
  id: string;
  name: string;
  category: string | null;
  acquisitionDate: string;
  acquisitionCost: number;
  usefulLifeMonths: number;
  residualValue: number;
  accumulatedDepreciation: number;
  bookValue: number;
  /**
   * Fase 22d: pada saldo menurun angka ini BUKAN tetap — ia angsuran bulan
   * berikutnya, bukan rata-rata. Dinyatakan di sini supaya pemanggilnya tidak
   * mengalikannya dengan sisa bulan untuk menebak nilai buku akhir.
   */
  monthlyDepreciation: number;
  depreciationMethod: MetodePenyusutan;
  /** Kelompok harta pajak; `null` = belum diatur (BUKAN "fiskalnya nol"). */
  taxGroup: string | null;
  /** Metode fiskal; `null` = ikut metode komersial. */
  taxMethod: MetodePenyusutan | null;
  status: "active" | "disposed";
  disposedDate: string | null;
};


// ---------------------------------------------------------------------------
// Penyusutan saldo menurun & fiskal vs komersial (Fase 22d)
// ---------------------------------------------------------------------------

export type InputPenyusutanBulan = {
  /** Harga perolehan. */
  harga: number;
  /** Nilai residu; penyusutan berhenti di sini. */
  residu: number;
  /** Masa manfaat dalam bulan. */
  umurBulan: number;
  /** Akumulasi penyusutan SEBELUM bulan ini. */
  akumulasi: number;
  /** Bulan keberapa sejak perolehan, mulai 1. */
  bulanKe: number;
  metode: MetodePenyusutan;
};

/**
 * Penyusutan satu bulan untuk satu aset (Fase 22d).
 *
 * ⚠️ **Saldo menurun tidak pernah mencapai nol.** Sifatnya asimtotik: berapa
 * pun lamanya, selalu tersisa sebagian nilai buku. Tanpa aturan penutup, daftar
 * aset akan menumpuk jurnal receh selamanya dan aset yang jelas-jelas sudah
 * habis tidak pernah tutup buku. Itu bukan kesalahan pembulatan melainkan sifat
 * rumusnya, jadi harus ditangani rumusnya — bukan ditambal belakangan.
 *
 * Aturan penutupnya mengikuti praktik fiskal Indonesia: **pada bulan TERAKHIR
 * masa manfaat, seluruh sisa nilai buku disusutkan sekaligus.**
 *
 * Tarif bulanannya `2 / umurBulan` atas nilai buku berjalan — padanan bulanan
 * dari tarif saldo menurun UU PPh yang memang dua kali tarif garis lurus
 * (Kelompok 1: 50% vs 25%, Kelompok 2: 25% vs 12,5%, dst.).
 */
export function penyusutanBulanan(input: InputPenyusutanBulan): number {
  const { harga, residu, umurBulan, akumulasi, bulanKe, metode } = input;
  if (umurBulan <= 0) return 0;
  const dapatDisusutkan = Math.max(0, harga - residu);
  const sisa = Math.max(0, dapatDisusutkan - akumulasi);
  if (sisa === 0) return 0;

  // Garis lurus TIDAK memakai aturan penutup berbasis kalender, dan itu
  // disengaja: `Math.min(..., sisa)` sudah menyerap sisa pembulatan pada
  // angsuran terakhir dengan sendirinya. Menambahkan aturan kalender di sini
  // akan mengubah perilaku aset yang penyusutannya SEMPAT TERTUNDA — sekali
  // jalan menyapu seluruh sisanya alih-alih mengangsur — padahal fase ini
  // tidak boleh menggeser satu angka pun pada aset garis lurus yang sudah ada.
  if (metode === "garis_lurus") return Math.min(Math.round(dapatDisusutkan / umurBulan), sisa);

  // Saldo menurun WAJIB punya aturan penutup: rumusnya asimtotik, jadi tanpa
  // ini nilai bukunya tidak pernah habis dan asetnya menumpuk jurnal receh
  // selamanya. Pada bulan terakhir masa manfaat, seluruh sisanya disusutkan.
  if (bulanKe >= umurBulan) return sisa;

  // Saldo menurun: tarif atas NILAI BUKU berjalan, bukan atas harga perolehan.
  const nilaiBuku = harga - akumulasi;
  return Math.min(Math.round(nilaiBuku * (2 / umurBulan)), sisa);
}

export type BarisPenyusutanFiskal = {
  asetId: string;
  nama: string;
  /** Penyusutan komersial setahun — yang benar-benar masuk buku besar. */
  komersial: number;
  /** Penyusutan fiskal setahun — angka memo, TIDAK dijurnal. */
  fiskal: number;
  /** `fiskal - komersial`: positif = koreksi negatif (fiskal lebih besar). */
  koreksi: number;
  kelompok: string | null;
};

export type RingkasPenyusutanFiskal = {
  baris: BarisPenyusutanFiskal[];
  totalKomersial: number;
  totalFiskal: number;
  /** Total koreksi fiskal atas penyusutan untuk rekonsiliasi SPT. */
  totalKoreksi: number;
  /** Aset yang belum diberi kelompok harta — fiskalnya belum bisa dihitung. */
  tanpaKelompok: number;
};

/**
 * Rangkum penyusutan komersial vs fiskal setahun (Fase 22d).
 *
 * ⚠️ **Angka fiskal tidak pernah dijurnal.** Buku besar memuat penyusutan
 * KOMERSIAL; yang fiskal hanya dipakai merekonsiliasi laba komersial ke laba
 * fiskal di SPT. Menjurnalnya berarti menyusutkan aset dua kali — dan karena
 * jurnalnya tetap seimbang, neraca saldo tidak akan menangkapnya sama sekali.
 *
 * Aset tanpa kelompok harta dihitung terpisah lewat `tanpaKelompok`, bukan
 * dianggap fiskalnya nol: "belum diatur" dan "memang nol" adalah dua keadaan
 * berbeda, dan menyamakannya membuat koreksi fiskalnya diam-diam salah.
 */
export function ringkasPenyusutanFiskal(baris: BarisPenyusutanFiskal[], tanpaKelompok: number): RingkasPenyusutanFiskal {
  const totalKomersial = baris.reduce((t, b) => t + b.komersial, 0);
  const totalFiskal = baris.reduce((t, b) => t + b.fiskal, 0);
  return { baris, totalKomersial, totalFiskal, totalKoreksi: totalFiskal - totalKomersial, tanpaKelompok };
}
