import {
  FAKTUR_BERANTAI,
  GAJI_SEKALI_JALAN,
  KASIR_SHIFT,
  LAPORAN_TERSUSUN,
  STOK_TEPERCAYA,
} from "./naskah/beranda";
import {
  ANGGARAN_REALISASI,
  ASET_PENYUSUTAN,
  ASISTEN_TANYA,
  DASBOR_HARIAN,
  HELPDESK_TIKET,
  JURNAL_PEMBALIK,
  KAS_REKONSILIASI,
  KONSOLIDASI_ENTITAS,
  KONTRAK_BERULANG,
  MANUFAKTUR_BOM,
  PEMBELIAN_UTANG,
  PEMELIHARAAN_JADWAL,
  PERAN_AUDIT,
  PERSETUJUAN_BERJENJANG,
  PIPELINE_PENAWARAN,
  PPN_CORETAX,
  PROYEK_BIAYA,
} from "./naskah/fitur";
import type { Naskah } from "./tipe";

/**
 * Registri peragaan (Fase 38a).
 *
 * Satu-satunya tempat naskah didaftarkan. Halaman menyebut peragaan lewat
 * `PeragaanId`, bukan lewat impor langsung — sehingga rujukan ke peragaan yang
 * tidak ada adalah galat kompilasi, bukan bingkai kosong yang baru ketahuan
 * saat seseorang membuka halamannya.
 *
 * Itu persis kelas bug yang ditinggalkan pendahulunya: `image: "/landing/…webp"`
 * adalah `string`, jadi salah ketik pada nama berkas lolos typecheck, lolos
 * lint, lolos uji, dan muncul sebagai gambar rusak di halaman jualan.
 */
export const PERAGAAN = {
  "faktur-berantai": FAKTUR_BERANTAI,
  "kasir-shift": KASIR_SHIFT,
  "laporan-tersusun": LAPORAN_TERSUSUN,
  "gaji-sekali-jalan": GAJI_SEKALI_JALAN,
  "stok-tepercaya": STOK_TEPERCAYA,

  // Fase 38e — tujuh belas naskah untuk `/fitur`. Lima modul terberat (faktur,
  // kasir, stok, penggajian, laporan) memakai ulang naskah beranda di atas:
  // versi kedua untuk modul yang sama bukan hanya pekerjaan ganda, ia juga
  // membuat dua peragaan yang bisa saling bertentangan angkanya.
  "jurnal-pembalik": JURNAL_PEMBALIK,
  "ppn-coretax": PPN_CORETAX,
  "konsolidasi-entitas": KONSOLIDASI_ENTITAS,
  "peran-audit": PERAN_AUDIT,
  "dasbor-harian": DASBOR_HARIAN,
  "pembelian-utang": PEMBELIAN_UTANG,
  "persetujuan-berjenjang": PERSETUJUAN_BERJENJANG,
  "kas-rekonsiliasi": KAS_REKONSILIASI,
  "aset-penyusutan": ASET_PENYUSUTAN,
  "pipeline-penawaran": PIPELINE_PENAWARAN,
  "anggaran-realisasi": ANGGARAN_REALISASI,
  "proyek-biaya": PROYEK_BIAYA,
  "kontrak-berulang": KONTRAK_BERULANG,
  "manufaktur-bom": MANUFAKTUR_BOM,
  "pemeliharaan-jadwal": PEMELIHARAAN_JADWAL,
  "helpdesk-tiket": HELPDESK_TIKET,
  "asisten-tanya": ASISTEN_TANYA,
} as const satisfies Record<string, Naskah>;

export type PeragaanId = keyof typeof PERAGAAN;

/** Semua naskah sebagai larik — dipakai uji dan penghitungan. */
export const SEMUA_PERAGAAN: Naskah[] = Object.values(PERAGAAN);

export { Peragaan } from "./Peragaan";
export type { Naskah, Panel, Langkah, Sasaran, Nada } from "./tipe";
