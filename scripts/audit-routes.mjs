/**
 * Daftar rute untuk audit visual dan simulasi UI penuh (`ui-sim.mjs`).
 * Satu sumber kebenaran: rute baru cukup ditambah di sini. Format:
 * `[path, nama-berkas]`.
 *
 * Fase 38s — dua koreksi.
 *
 * 1. Komentar ini dulu menyebut `screenshots.mjs`, yang dihapus pada Fase 38f
 *    bersama 57 gambar produk yang menjadi satu-satunya alasan keberadaannya.
 *
 * 2. **Tujuh rute publik tidak pernah ditambahkan ke sini** meski berkas ini
 *    menyatakan dirinya sumber tunggal: `/fitur` sejak Fase 18f, dan keenam
 *    halaman Fase 38d. Akibatnya audit visual dan sapuan rute melewatkan
 *    seluruh sisi publik selain beranda — termasuk dua halaman hukum yang
 *    justru paling perlu diperiksa sebelum tayang.
 *
 *    Ini kelas kegagalan yang sama dengan `sapu-istilah` yang tidak menyapu
 *    direktori naskah baru: daftar yang mengaku lengkap, tetapi tidak ada
 *    yang memaksanya tetap lengkap.
 */
export const AUDIT_ROUTES = [
  ["/", "landing"],
  ["/fitur", "fitur"],
  ["/harga", "harga"],
  ["/keamanan", "keamanan"],
  ["/tentang", "tentang"],
  ["/kontak", "kontak"],
  ["/syarat", "syarat"],
  ["/privasi", "privasi"],
  ["/masuk", "masuk"],
  ["/daftar", "daftar"],
  ["/panduan", "panduan-indeks"],
  ["/panduan/pos", "panduan-modul"],
  ["/app", "dashboard"],
  ["/app/pos", "pos"],
  ["/app/penjualan", "penjualan"],
  ["/app/pesanan-penjualan", "pesanan-penjualan"],
  ["/app/pembelian", "pembelian"],
  ["/app/pengadaan", "pengadaan"],
  ["/app/persetujuan", "persetujuan"],
  ["/app/stok", "stok"],
  ["/app/master/produk", "produk"],
  ["/app/master/kontak", "kontak"],
  ["/app/master/gudang", "gudang"],
  ["/app/crm/leads", "crm-leads"],
  ["/app/crm/penawaran", "crm-penawaran"],
  ["/app/helpdesk", "helpdesk"],
  ["/app/keuangan/catat", "catat"],
  ["/app/keuangan/kas-bank", "kas-bank"],
  ["/app/keuangan/akun", "akun"],
  ["/app/keuangan/jurnal", "jurnal"],
  ["/app/keuangan/buku-besar", "buku-besar"],
  ["/app/keuangan/neraca-saldo", "neraca-saldo"],
  ["/app/keuangan/laba-rugi", "laba-rugi"],
  ["/app/keuangan/neraca", "neraca"],
  ["/app/keuangan/umur-tagihan", "umur-tagihan"],
  ["/app/keuangan/arus-kas", "arus-kas"],
  ["/app/keuangan/e-faktur", "e-faktur"],
  ["/app/keuangan/pajak", "pajak"],
  ["/app/keuangan/anggaran", "anggaran"],
  ["/app/keuangan/dimensi", "dimensi"],
  ["/app/keuangan/aset", "aset"],
  ["/app/keuangan/kurs", "kurs"],
  ["/app/laporan/penjualan", "laporan-penjualan"],
  ["/app/hr/penggajian", "penggajian"],
  ["/app/hr/absensi", "absensi"],
  ["/app/proyek", "proyek"],
  ["/app/kontrak", "kontrak"],
  ["/app/konsolidasi", "konsolidasi"],
  ["/app/manufaktur", "manufaktur"],
  ["/app/maintenance", "maintenance"],
  ["/app/migrasi", "migrasi"],
  ["/app/pengaturan", "pengaturan"],
];
