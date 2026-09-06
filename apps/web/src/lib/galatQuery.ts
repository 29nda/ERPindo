import { ApiRequestError } from "../api/client";

/**
 * Keputusan "apakah kegagalan memuat ini perlu diberitahukan" (Fase 51b).
 *
 * Dipisahkan dari `main.tsx` supaya bisa diuji: mengimpor `main.tsx` akan
 * menjalankan `createRoot()` dan memasang seluruh aplikasi.
 */

/**
 * Status yang TIDAK ditoast, masing-masing dengan alasannya.
 *
 * - `401` sesi habis → `AppShell` sudah memindahkan pengguna ke halaman masuk.
 * - `403` tanpa izin → panelnya memang tidak boleh tampil, dan layar sudah
 *   menjelaskannya di tempatnya sendiri.
 * - `503` binding absen (Workers AI, Resend, Xendit) → degradasi anggun adalah
 *   perilaku yang DIRANCANG di repo ini. Menoastnya berarti menyebut fitur
 *   yang memang belum dipasang sebagai kerusakan, di setiap halaman yang
 *   menyentuhnya.
 */
export const STATUS_TANPA_TOAST = new Set([401, 403, 503]);

/**
 * Keadaan 402 yang layarnya SUDAH menjelaskan sendiri (Fase 54f).
 *
 * Perusahaan yang belum berlangganan menerima 402 pada setiap query, dan
 * kerangka aplikasi sudah menggantikan seluruh isi halaman dengan satu layar
 * yang menerangkannya beserta tombolnya. Toast di atas layar itu mengulang
 * kalimat yang sama sambil menyembunyikan tombolnya.
 *
 * Yang TIDAK didaftarkan di sini juga disengaja: 402 tanpa `detail` — mis.
 * langganan ditangguhkan — tetap ditoast, karena tak ada layar lain yang
 * mengatakannya. Membungkam seluruh 402 akan membuat penangguhan menjadi
 * kegagalan senyap.
 */
export const DETAIL_402_TANPA_TOAST = new Set(["belum-berlangganan", "sedang-disiapkan"]);

export function perluDitoast(err: unknown): boolean {
  if (!(err instanceof ApiRequestError)) return true;
  if (STATUS_TANPA_TOAST.has(err.status)) return false;
  if (err.status === 402 && err.detail && DETAIL_402_TANPA_TOAST.has(err.detail)) return false;
  return true;
}

/** Pesan yang ditampilkan; galat non-Error tetap punya kalimat yang bisa dibaca. */
export function pesanGalat(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Gagal memuat data.";
}

/**
 * Peredam pengulangan: satu halaman bisa menembakkan delapan query sekaligus,
 * dan delapan toast identik menutupi layar justru ketika pengguna perlu
 * membacanya. Menyimpan waktu terakhir per PESAN, bukan per query — dua query
 * berbeda yang gagal karena sebab yang sama tetap satu pesan.
 */
export function buatPeredam(jedaMs = 5_000) {
  const terakhir = new Map<string, number>();
  return (pesan: string, sekarang = Date.now()): boolean => {
    const lalu = terakhir.get(pesan);
    if (lalu !== undefined && sekarang - lalu < jedaMs) return false;
    terakhir.set(pesan, sekarang);
    return true;
  };
}
