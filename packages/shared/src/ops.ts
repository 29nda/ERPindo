import { z } from "zod";

// ---------------------------------------------------------------------------
// Manufaktur + QC (Fase 2u)
// ---------------------------------------------------------------------------

/** Simpan/perbarui Bill of Materials (resep) satu produk jadi. */
export const setBomSchema = z.object({
  productId: z.string().min(1),
  outputQty: z.number().int().positive().default(1),
  notes: z.string().trim().max(500).optional(),
  lines: z
    .array(
      z.object({
        componentId: z.string().min(1),
        qty: z.number().int().positive(),
      }),
    )
    .min(1, "Minimal 1 komponen"),
});
export type SetBomInput = z.infer<typeof setBomSchema>;

export const createProductionOrderSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  qty: z.number().int().positive(),
  /**
   * Biaya konversi untuk SATU perintah produksi (Fase 21f) — total sebatch,
   * bukan per unit. Keduanya opsional; nol = perilaku sebelum fase ini.
   */
  labourCost: z.number().int().min(0).max(1_000_000_000_000).default(0),
  overheadCost: z.number().int().min(0).max(1_000_000_000_000).default(0),
});
export type CreateProductionOrderInput = z.infer<typeof createProductionOrderSchema>;

export type BiayaProduksi = {
  /** Bahan + tenaga kerja + overhead. */
  totalBiaya: number;
  /** Bagian yang perlu DISERAP ke persediaan lewat jurnal (tenaga + overhead). */
  biayaDiserap: number;
  /** Biaya per unit, dibulatkan ke rupiah. */
  biayaPerUnit: number;
  /** Selisih `totalBiaya − qty × biayaPerUnit` akibat pembulatan per unit. */
  sisaPembulatan: number;
};

/**
 * Biaya produksi = bahan + tenaga kerja + overhead (Fase 21f).
 *
 * Dipisah sebagai fungsi murni supaya kalkulator HPP di layar Alat Bantu dan
 * jurnal produksi tidak pernah memberi jawaban berbeda untuk pertanyaan yang
 * sama.
 *
 * `biayaDiserap` sengaja dipisahkan dari `totalBiaya`: hanya tenaga kerja dan
 * overhead yang butuh jurnal penyerapan. Bahan sudah berpindah antar-akun
 * persediaan lewat pergerakan stok, jadi menjurnalnya lagi akan menghitungnya
 * dua kali.
 */
export function hitungBiayaProduksi(input: {
  biayaBahan: number;
  biayaTenagaKerja?: number;
  biayaOverhead?: number;
  qty: number;
}): BiayaProduksi {
  const tenaga = Math.max(0, Math.trunc(input.biayaTenagaKerja ?? 0));
  const overhead = Math.max(0, Math.trunc(input.biayaOverhead ?? 0));
  const biayaDiserap = tenaga + overhead;
  const totalBiaya = input.biayaBahan + biayaDiserap;
  // qty selalu > 0 di jalur produksi (dijaga skema), tapi pembagi nol tetap
  // dijinakkan supaya fungsi ini aman dipakai kalkulator layar juga.
  const biayaPerUnit = input.qty > 0 ? Math.round(totalBiaya / input.qty) : 0;
  return {
    totalBiaya,
    biayaDiserap,
    biayaPerUnit,
    sisaPembulatan: totalBiaya - input.qty * biayaPerUnit,
  };
}

export const QC_RESULTS = ["passed", "quarantined"] as const;
export type QcResult = (typeof QC_RESULTS)[number];
/** Inspeksi QC: lulus, atau karantina (butuh gudang karantina tujuan). */
export const qcInspectSchema = z.object({
  result: z.enum(QC_RESULTS),
  warehouseId: z.string().min(1).optional(),
});
export type QcInspectInput = z.infer<typeof qcInspectSchema>;

export type ApiBomLine = {
  componentId: string;
  sku: string;
  name: string;
  unit: string;
  qty: number;
};

export type ApiBom = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  outputQty: number;
  notes: string | null;
  lines: ApiBomLine[];
};

export const PRODUCTION_STATUSES = ["draft", "produced"] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];
export const QC_STATUSES = ["none", "pending", "passed", "quarantined"] as const;
export type QcStatus = (typeof QC_STATUSES)[number];

export type ApiProductionOrder = {
  id: string;
  orderNo: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  qty: number;
  status: ProductionStatus;
  qcStatus: QcStatus;
  unitCost: number;
  totalCost: number;
  /** Rincian biaya konversi (Fase 21f); 0 untuk perintah sebelum fase ini. */
  labourCost: number;
  overheadCost: number;
  qcWarehouseName: string | null;
  createdAt: string;
  producedAt: string | null;
};

// ---------------------------------------------------------------------------
// Maintenance / servis aset (Fase 2v)
// ---------------------------------------------------------------------------

export const createMaintenanceScheduleSchema = z.object({
  assetId: z.string().min(1),
  name: z.string().trim().min(2, "Nama servis minimal 2 karakter").max(120),
  intervalMonths: z.number().int().min(1).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus YYYY-MM-DD"),
});
export type CreateMaintenanceScheduleInput = z.infer<typeof createMaintenanceScheduleSchema>;

export const maintenanceScheduleStatusSchema = z.object({ active: z.boolean() });

export const createWorkOrderSchema = z.object({
  assetId: z.string().min(1),
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(200),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus YYYY-MM-DD"),
});
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

export const completeWorkOrderSchema = z.object({
  completedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus YYYY-MM-DD"),
  cost: z.number().int().min(0),
  cashAccountId: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});
export type CompleteWorkOrderInput = z.infer<typeof completeWorkOrderSchema>;

export type ApiMaintenanceSchedule = {
  id: string;
  assetId: string;
  assetName: string;
  name: string;
  intervalMonths: number;
  nextDueDate: string;
  active: boolean;
};

export const WORK_ORDER_STATUSES = ["open", "done"] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export type ApiWorkOrder = {
  id: string;
  orderNo: string;
  assetId: string;
  assetName: string;
  scheduleId: string | null;
  title: string;
  status: WorkOrderStatus;
  scheduledDate: string;
  completedDate: string | null;
  cost: number;
  notes: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Helpdesk / tiket dukungan (Fase 2w)
// ---------------------------------------------------------------------------

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Terbuka",
  in_progress: "Diproses",
  resolved: "Selesai",
  closed: "Ditutup",
};

export const createTicketSchema = z.object({
  contactId: z.string().min(1, "Kontak wajib dipilih"),
  subject: z.string().trim().min(3, "Subjek minimal 3 karakter").max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(TICKET_PRIORITIES).default("medium"),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    assignedTo: z.string().nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.assignedTo !== undefined, {
    message: "Tidak ada perubahan",
  });
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const ticketReplySchema = z.object({
  body: z.string().trim().min(1, "Balasan tidak boleh kosong").max(5000),
  internal: z.boolean().default(false),
});
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;

export type ApiTicket = {
  id: string;
  ticketNo: string;
  contactId: string;
  contactName: string;
  subject: string;
  description: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  assignedName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  replyCount: number;
};

export type ApiTicketReply = {
  id: string;
  body: string;
  authorName: string;
  internal: boolean;
  createdAt: string;
};

export type ApiTicketDetail = ApiTicket & { replies: ApiTicketReply[] };

