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
import {
  BAGAN_AKUN,
  KONTAK_INDUK,
  KURS_SELISIH,
  NERACA_SEIMBANG,
  PENAWARAN_CETAK,
  PRODUK_INDUK,
} from "./naskah/panduan";
import type { Naskah } from "./tipe";

/**
 * Registri peragaan — DATA saja, tanpa React (Fase 38a, dipisah di 38f).
 *
 * Pemisahan ini dituntut oleh `scripts/export-panduan-md.mjs`: ia berjalan di
 * Node untuk memancarkan `docs/panduan/*.md`, dan kini perlu membaca narasi
 * tiap peragaan. Bila registrinya juga mengekspor komponen `Peragaan`, esbuild
 * ikut menarik React ke dalam bundel skrip yang seharusnya tidak
 * membutuhkannya.
 *
 * `index.ts` tetap menjadi satu-satunya pintu bagi kode web.
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

  // Fase 38f — enam naskah untuk seksi panduan yang tidak punya padanan di
  // `/fitur`: data induk, bagan akun, neraca, mata uang, dan penawaran. Dua
  // puluh slot panduan lainnya memakai ulang naskah di atas, dan itu bukan
  // penghematan melainkan yang benar — panduan modul Kasir menerangkan alur
  // yang sama persis dengan yang diperagakan `kasir-shift`.
  "produk-induk": PRODUK_INDUK,
  "kontak-induk": KONTAK_INDUK,
  "bagan-akun": BAGAN_AKUN,
  "neraca-seimbang": NERACA_SEIMBANG,
  "kurs-selisih": KURS_SELISIH,
  "penawaran-cetak": PENAWARAN_CETAK,
} as const satisfies Record<string, Naskah>;

export type PeragaanId = keyof typeof PERAGAAN;

/** Semua naskah sebagai larik — dipakai uji dan penghitungan. */
export const SEMUA_PERAGAAN: Naskah[] = Object.values(PERAGAAN);
