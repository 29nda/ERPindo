/**
 * Tanggal berbasis BULAN KALENDER untuk penyemaian demo (Fase 28).
 *
 * Ada di `scripts/lib` dan bukan di `packages/shared` dengan alasan yang sama
 * seperti `ean13.mjs`: ini bukan kode produk. Satu-satunya pemakainya
 * `scripts/seed-demo.mjs`, dan ia ditaruh di berkas tersendiri supaya bisa
 * diuji — karena justru di sinilah cacatnya berada.
 *
 * ## Cacat yang membuat berkas ini ada
 *
 * Blok riwayat Fase 24c menempatkan enam bulan data dengan aritmetika 30 hari
 * (`daysAgo(m * 30)`). Bulan kalender bukan 30 hari, jadi jendelanya melenceng
 * makin jauh tiap bulan mundur. Akibatnya di demo produksi 15 Agustus 2026:
 *
 * - Februari hanya terisi separuh (Rp 11,3 jt, setengah bulan lain), dan
 * - **Juli nyaris tidak kebagian penjualan grosir sama sekali** — sementara
 *   Juli-lah bulan pertama yang menanggung gaji, sehingga laba-rugi "bulan
 *   lalu" tampil **rugi Rp 20,7 juta** kepada calon pelanggan yang membukanya.
 *
 * Ini bentuk bug yang sama persis dengan dua yang sudah pernah ditambal di
 * `seed-demo.mjs` (`lastMonth` dan `dalamBulanIni`, keduanya Fase 19b): salah
 * hanya pada sebagian tanggal, jadi tidak pernah terlihat di hari biasa.
 *
 * Seluruh fungsi di sini memakai `Date.UTC` supaya lompatan tahun dan bulan
 * pendek ditangani oleh `Date`, bukan oleh aritmetika tangan.
 */

/** `YYYY-MM-DD` dari komponen UTC. */
function iso(y, m, d) {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

/** Banyaknya hari pada bulan ke-`m` (0-indeks) tahun `y`. */
export function jumlahHari(y, m) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/**
 * Periode `YYYY-MM` sejumlah `mundur` bulan ke belakang dari `kini`.
 * `mundur = 0` berarti bulan berjalan.
 */
export function periodeBulan(mundur, kini = new Date()) {
  return new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth() - mundur, 1))
    .toISOString()
    .slice(0, 7);
}

/**
 * Tanggal ke-`hari` di dalam bulan sejumlah `mundur` bulan ke belakang.
 *
 * `hari` DIJEPIT ke panjang bulannya: meminta tanggal 31 di bulan Februari
 * memberi 28 (atau 29), bukan melimpah ke bulan berikutnya. Tanpa penjepitan
 * ini, satu faktur bisa mendarat di bulan yang salah — persis kelas cacat yang
 * berkas ini ada untuk mencegahnya.
 */
export function tanggalDalamBulan(mundur, hari, kini = new Date()) {
  const dasar = new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth() - mundur, 1));
  const y = dasar.getUTCFullYear();
  const m = dasar.getUTCMonth();
  return iso(y, m, Math.min(Math.max(hari, 1), jumlahHari(y, m)));
}

/** Hari terakhir bulan sejumlah `mundur` bulan ke belakang — hari gajian. */
export function akhirBulan(mundur, kini = new Date()) {
  const dasar = new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth() - mundur, 1));
  return iso(dasar.getUTCFullYear(), dasar.getUTCMonth() + 1, 0);
}

/**
 * Rangkaian bulan riwayat, dari yang PALING LAMA ke yang paling baru.
 *
 * Urutannya sengaja menaik karena penyemaian harus mengirim bulan lama lebih
 * dulu: stok dihitung dari pergerakan yang sudah terposting, jadi menjual di
 * bulan lama setelah menjual di bulan baru akan ditolak "stok tidak cukup".
 *
 * `jumlah = 6` berarti enam bulan penuh SEBELUM bulan berjalan (mundur 6..1).
 * Bulan berjalan tidak ikut: ia punya bloknya sendiri di skrip semai.
 */
export function bulanRiwayat(jumlah, kini = new Date()) {
  const keluar = [];
  for (let mundur = jumlah; mundur >= 1; mundur--) {
    keluar.push({
      mundur,
      periode: periodeBulan(mundur, kini),
      akhir: akhirBulan(mundur, kini),
      hari: (h) => tanggalDalamBulan(mundur, h, kini),
    });
  }
  return keluar;
}
