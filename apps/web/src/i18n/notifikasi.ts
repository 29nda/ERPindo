import type { ApiNotification, JenisPajak } from "@erpindo/shared";
import { formatDate, formatIDR } from "../api/client";
import { isi } from ".";
import type { UiKey } from "./ui";

/**
 * Penyusun kalimat lonceng notifikasi (Fase 56c).
 *
 * ## Kenapa ada
 *
 * Ketujuh jenis notifikasi dulu dikirim Worker sebagai kalimat Indonesia jadi.
 * Aplikasi ini dwibahasa, tetapi loncengnya tidak — dan dasbor terpaksa
 * MEMBEDAH kalimat itu (`n.title.replace("Faktur ", "")`) untuk mendapatkan
 * nomor fakturnya kembali. Sekarang Worker mengirim jenis + data, dan
 * kalimatnya disusun di sini, dalam bahasa yang sedang dipakai pembacanya.
 *
 * ## Kenapa `switch` yang lengkap
 *
 * `ApiNotification` adalah union berdiskriminan, dan cabang `default` di bawah
 * menugaskan nilainya ke `never`. Menambah jenis notifikasi di Worker tanpa
 * menuliskan kalimatnya di sini TIDAK AKAN DIKOMPILASI — gerbangnya tsc, bukan
 * uji yang bisa lupa ditulis. Itu sengaja: kelas cacat yang ditutup fase ini
 * justru "satu kebenaran di dua tempat, tanpa ada yang memeriksa keduanya".
 */
type Penerjemah = (key: UiKey) => string;

/** Nama jenis pajak. Satu-satunya pemetaannya di repo (lihat catatan di ui.ts). */
export const KUNCI_LABEL_PAJAK: Record<JenisPajak, UiKey> = {
  ppn: "pajakPpn",
  pph21: "pajakPph21",
  pph23: "pajakPph23",
  pph25: "pajakPph25",
  pph_final: "pajakPphFinal",
  spt_tahunan: "pajakSptTahunan",
};

export function judulNotifikasi(n: ApiNotification, u: Penerjemah): string {
  switch (n.type) {
    case "low_stock":
      return isi(u("notifStokMenipis"), n.data.name);
    case "overdue_invoice":
      return isi(u("notifFakturJatuhTempo"), n.data.invoiceNo);
    case "open_ticket":
      return isi(u("notifTiketTerbuka"), n.data.count);
    case "pending_approval":
      return isi(u("notifPersetujuan"), n.data.count);
    case "crm_followup_due":
      return isi(u("notifTindakLanjutLead"), n.data.leadName);
    case "crm_stale_lead":
      return isi(u("notifLeadDingin"), n.data.count, n.data.hari);
    case "tenggat_pajak": {
      const kegiatan = u(n.data.kegiatan === "setor" ? "kpSetor" : "kpLapor");
      const label = u(KUNCI_LABEL_PAJAK[n.data.jenis]);
      return n.data.sisaHari < 0
        ? isi(u("notifPajakTerlambat"), kegiatan, label, n.data.masa, -n.data.sisaHari)
        : isi(u("notifPajakMendatang"), kegiatan, label, n.data.masa, n.data.sisaHari);
    }
    default: {
      const takTerduga: never = n;
      return String((takTerduga as { type: string }).type);
    }
  }
}

export function rincianNotifikasi(n: ApiNotification, u: Penerjemah): string {
  switch (n.type) {
    case "low_stock":
      return isi(u("notifStokMenipisRinci"), n.data.sku, n.data.qty, n.data.minStock);
    case "overdue_invoice":
      return isi(
        u("notifFakturJatuhTempoRinci"),
        n.data.contactName,
        formatIDR(n.data.outstanding),
        formatDate(n.data.dueDate),
      );
    case "open_ticket":
      return u("notifTiketTerbukaRinci");
    case "pending_approval":
      return u("notifPersetujuanRinci");
    case "crm_followup_due":
      return isi(u("notifTindakLanjutLeadRinci"), n.data.note, formatDate(n.data.dueAt));
    case "crm_stale_lead":
      return u("notifLeadDinginRinci");
    case "tenggat_pajak":
      return isi(u("notifPajakRinci"), formatDate(n.data.tanggal));
    default: {
      const takTerduga: never = n;
      return String((takTerduga as { type: string }).type);
    }
  }
}

/**
 * Pesan pengingat siap-kirim WhatsApp. Hanya faktur jatuh tempo yang punya —
 * `null` untuk sisanya, dan itulah yang menentukan tombol "Tagih (WA)" muncul
 * atau tidak.
 *
 * Sebelumnya Worker yang merakitnya (`waText`), dalam bahasa Indonesia, untuk
 * dikirim ke pelanggan yang belum diketahui bahasanya. Sekarang ia mengikuti
 * bahasa yang dipilih penggunanya — orang yang membaca dan menekan tombolnya.
 */
export function waNotifikasi(n: ApiNotification, u: Penerjemah): string | null {
  if (n.type !== "overdue_invoice") return null;
  return isi(
    u("waPengingatJatuhTempo"),
    n.data.contactName,
    n.data.invoiceNo,
    formatIDR(n.data.outstanding),
    formatDate(n.data.dueDate),
  );
}
