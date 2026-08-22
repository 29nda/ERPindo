import type { Dual } from "../i18n";

/**
 * Tipe naskah peragaan (Fase 38a).
 *
 * ## Kenapa berkas ini ada
 *
 * Sampai Fase 37, halaman publik memperlihatkan produknya lewat 57 tangkapan
 * layar `.webp` seberat 3,9 MB. Gambar semacam itu punya tiga cacat yang tidak
 * bisa diperbaiki dengan mengganti gambarnya:
 *
 * 1. **Ia basi diam-diam.** Begitu satu tombol dipindah, gambarnya salah — dan
 *    tidak ada satu pun gerbang validasi yang bisa melihatnya. `screenshots.mjs`
 *    ada justru untuk meregenerasi 35 gambar tiap kali tampilan berubah, dan ia
 *    sendiri pernah rusak berbelas fase tanpa berbunyi.
 * 2. **Ia tidak membuktikan apa pun.** Tangkapan layar adalah klaim, sama
 *    seperti kalimat di sebelahnya. Pembeli perusahaan yang paham pembukuan
 *    tidak bisa memeriksanya.
 * 3. **Ia buta tema dan bahasa.** Satu berkas hanya punya satu tema dan satu
 *    bahasa; repo ini punya dua-duanya.
 *
 * Penggantinya bukan gambar yang lebih baik, melainkan **naskah data** yang
 * dimainkan mesin di `mesin.ts` memakai primitif UI yang sama persis dipakai
 * aplikasi. Konsekuensinya: peragaan tidak bisa basi, ikut tema dan bahasa
 * sendiri, dan berbobot nol kilobita gambar.
 *
 * Teladannya `pages/landing/pertunjukan.tsx` (Fase 35a) — satu peragaan tulisan
 * tangan yang terbukti bekerja. Berkas ini menggeneralisasikannya menjadi satu
 * mesin dengan banyak naskah, karena 57 komponen animasi tulisan tangan bukan
 * pekerjaan yang bisa dirawat siapa pun.
 *
 * ## Kosakatanya sengaja TERTUTUP
 *
 * "Mesin yang bisa menggambar apa saja" adalah bahasa mini, dan bahasa mini
 * adalah tempat proyek mati. Mesin ini hanya mengenal delapan jenis panel dan
 * delapan jenis langkah. Panel baru adalah keputusan sadar yang ditulis di
 * sini, bukan improvisasi di dalam sebuah naskah.
 *
 * ## Kenapa data, bukan komponen
 *
 * Naskah berupa data membuat empat hal mungkin yang tidak mungkin bila tiap
 * peragaan adalah komponennya sendiri: naskahnya bisa diuji (`sasaran` yang
 * menunjuk panel tak ada ditangkap uji unit), bisa disapu `sapu-istilah` dan
 * `sapu-gaya`, bisa dihitung, dan dimainkan mesin yang sama — sehingga satu
 * perbaikan aksesibilitas berlaku untuk 57 peragaan sekaligus.
 */

/** Nada semantik, dipetakan ke token status di `styles.css`. */
export type Nada = "netral" | "ok" | "awas" | "galat";

/**
 * Apa yang ditunjuk sebuah langkah.
 *
 * Menyebut **id panel**, bukan selektor CSS. Ini disengaja: `PageTour` memakai
 * `selector?: string`, dan selektor yang menunjuk elemen tak ada gagal
 * diam-diam. `Sasaran` bisa diuji — satu asersi "tiap `sasaran.panel` ada di
 * `naskah.panel`" menutup kelasnya sekaligus untuk seluruh naskah.
 */
export type Sasaran = { panel: string; baris?: number; medan?: string };

/** Baris jurnal. Angka, bukan string — supaya keseimbangannya bisa DIUJI. */
export type BarisJurnal = { akun: Dual; debit?: number; kredit?: number };

/**
 * Delapan jenis panel yang bisa dirender mesin.
 *
 * Tiap panel wajib punya `id` unik dalam naskahnya, karena `id` itulah yang
 * ditunjuk `Sasaran.panel`.
 */
export type Panel =
  /** Formulir: baris `label → nilai`, dengan tombol kirim opsional. */
  | {
      jenis: "formulir";
      id: string;
      judul: Dual;
      medan: { id: string; label: Dual; nilai: Dual; num?: boolean }[];
      tombol?: Dual;
    }
  /** Tabel data. */
  | {
      jenis: "tabel";
      id: string;
      judul: Dual;
      kolom: { label: Dual; num?: boolean }[];
      baris: Dual[][];
    }
  /**
   * Jurnal double-entry. Dipisahkan dari `tabel` justru supaya angkanya bisa
   * diperiksa mesin: `test/peragaan-akuntansi.test.ts` menuntut Σdebit = Σkredit
   * pada tiap panel jenis ini. Angka karangan akan langsung terlihat oleh
   * pembeli yang paham pembukuan — dan merekalah yang menentukan keputusan
   * membeli.
   */
  | { jenis: "jurnal"; id: string; judul: Dual; baris: BarisJurnal[] }
  /** Kartu angka tunggal: nilai besar + label + perubahan. */
  | {
      jenis: "angka";
      id: string;
      judul: Dual;
      nilai: number;
      satuan?: Dual;
      delta?: Dual;
      nada?: Nada;
    }
  /** Daftar butir berlencana. */
  | {
      jenis: "daftar";
      id: string;
      judul: Dual;
      butir: { teks: Dual; lencana?: Dual; nada?: Nada }[];
    }
  /** Papan kanban: kolom berisi kartu. */
  | { jenis: "papan"; id: string; judul: Dual; kolom: { judul: Dual; kartu: Dual[] }[] }
  /** Bagan batang sederhana. */
  | { jenis: "bagan"; id: string; judul: Dual; seri: number[]; label: Dual[] }
  /** Catatan berwarna — dipakai untuk menerangkan akibat sebuah langkah. */
  | { jenis: "catatan"; id: string; teks: Dual; nada: Nada };

/**
 * Satu langkah peragaan.
 *
 * `narasi` muncul di bawah bingkai saat langkah berjalan, DAN menjadi butir
 * daftar bernomor di `<figcaption>` — sehingga peragaan tetap terbaca sebagai
 * instruksi berurutan oleh pembaca layar, perayap, dan siapa pun yang meminta
 * lebih sedikit gerak. Karena itu `narasi` wajib, bukan opsional.
 */
export type Langkah = { narasi: Dual; durasi?: number } & (
  /** Ketikan muncul huruf demi huruf pada sebuah medan formulir. */
  | { aksi: "ketik"; sasaran: Sasaran }
  /**
   * Nilai muncul sekaligus, bukan huruf demi huruf — entah karena dipilih
   * dari daftar, entah karena dihitung sendiri oleh aplikasi. Perbedaannya
   * dengan `ketik` bukan kosmetik: yang diketik dikerjakan manusia, yang
   * muncul sekaligus dikerjakan mesin, dan itulah yang diperagakan.
   */
  | { aksi: "pilih"; sasaran: Sasaran }
  /** Kursor bergerak ke sasaran lalu riak klik memudar. */
  | { aksi: "klik"; sasaran: Sasaran }
  /** Sasaran disorot tanpa diklik. */
  | { aksi: "sorot"; sasaran: Sasaran }
  /** Panel menyala terisi — inilah yang memperagakan "sisanya otomatis". */
  | { aksi: "isi"; sasaran: Sasaran }
  /** Sasaran diberi nada status (lunas, terlambat, seimbang). */
  | { aksi: "tandai"; sasaran: Sasaran; nada: Nada }
  /** Jalur di bilah alamat berganti — pengguna berpindah halaman. */
  | { aksi: "pindah"; jalur: string }
  /** Diam sejenak, supaya mata sempat menyusul. */
  | { aksi: "jeda" }
);

/** Naskah lengkap: apa yang ada di layar, dan apa yang terjadi padanya. */
export type Naskah = {
  id: string;
  /**
   * Jalur awal di bilah alamat bingkai. WAJIB jalur yang benar-benar terdaftar
   * di `main.tsx` — diuji `test/peragaan-jalur.test.ts`. Bilah alamat yang
   * menyebut halaman fiktif adalah kebohongan kecil yang gratis dihindari, dan
   * uji itulah penangkal utama pembusukan diam-diam.
   */
  jalur: string;
  /** Dipakai sebagai `<figcaption>`. */
  judul: Dual;
  /** Satu kalimat: apa yang diperagakan dan kenapa itu berarti. Pengganti alt. */
  ringkas: Dual;
  panel: Panel[];
  langkah: Langkah[];
  /**
   * Berhenti di keadaan akhir alih-alih mengulang dari awal.
   *
   * Dipakai naskah panduan: di sana pembaca sedang mencocokkan layarnya sendiri
   * dengan yang di dokumen, dan animasi yang terus berulang mengganggu
   * pekerjaan itu. Di halaman jualan sebaliknya — pengulangan justru yang
   * membuat pengunjung yang baru menggulir sampai situ ikut melihatnya.
   */
  sekaliJalan?: boolean;
};
