import type { Dual } from "../../i18n";

/**
 * Naskah Syarat Layanan dan Kebijakan Privasi (Fase 38d).
 *
 * ## Kenapa berbahasa Indonesia saja
 *
 * Seluruh situs ini dwibahasa, dan dua halaman ini sengaja tidak. Naskah hukum
 * yang diterjemahkan tanpa peninjau hukum menghasilkan dua dokumen yang
 * berbeda maknanya sambil sama-sama tampak resmi — dan yang dirugikan adalah
 * pihak yang membaca versi yang salah. Satu naskah berbahasa Indonesia yang
 * dinyatakan sebagai satu-satunya yang berlaku lebih jujur daripada dua naskah
 * yang salah satunya diam-diam keliru.
 *
 * Keterangan tentang hal itu sendiri tetap dwibahasa, supaya pembaca berbahasa
 * Inggris mengerti mengapa halamannya tidak ikut berganti bahasa.
 *
 * ## Kenapa ada penampung yang mencolok
 *
 * Identitas penyelenggara belum ditetapkan pemiliknya. Menuliskan nama karangan
 * di dokumen yang akan dibaca bagian hukum calon pelanggan jauh lebih berbahaya
 * daripada meninggalkan penampung yang tidak mungkin terlewat. Keputusan
 * pemilik: penampung mencolok plus spanduk draf.
 *
 * Kedua halaman TIDAK mengklaim kepatuhan terhadap UU Perlindungan Data
 * Pribadi. Yang dinyatakan hanya fakta yang memang benar di produk, dan tiap
 * satunya bisa ditunjuk barisnya.
 */

/** Penampung yang wajib diganti sebelum halaman ini dianggap final. */
export const PENYELENGGARA = "[NAMA BADAN USAHA]";
export const ALAMAT_PENYELENGGARA = "[ALAMAT LENGKAP]";

/** Tanggal berlaku, disebut di kedua halaman. */
export const BERLAKU_SEJAK = "21 Agustus 2026";

export const T_LEGAL = {
  spandukJudul: { id: "Draf menunggu tinjauan", en: "Draft pending review" },
  spandukIsi: {
    id: "Halaman ini belum ditinjau penasihat hukum dan masih memuat penampung identitas penyelenggara. Jangan dipakai sebagai dasar perjanjian sampai penampung itu diganti.",
    en: "This page has not been reviewed by legal counsel and still contains placeholders for the operator's identity. Do not rely on it as a basis for agreement until those are replaced.",
  },
  bahasaCatatan: {
    id: "Naskah hukum di halaman ini hanya tersedia dalam bahasa Indonesia, dan versi itulah yang berlaku.",
    en: "The legal text on this page is available in Indonesian only, and that version is the one that applies.",
  },
  berlakuLabel: { id: "Berlaku sejak", en: "Effective from" },
} satisfies Record<string, Dual>;

/** Satu bagian naskah hukum: judul dan paragraf-paragrafnya. */
export type BagianLegal = { judul: string; paragraf: string[] };

export const SYARAT: BagianLegal[] = [
  {
    judul: "1. Penyelenggara layanan",
    paragraf: [
      `ERPindo adalah layanan perangkat lunak berbasis langganan yang diselenggarakan oleh ${PENYELENGGARA}, berkedudukan di ${ALAMAT_PENYELENGGARA} ("Penyelenggara").`,
      "Dengan membuat akun atau memakai layanan ini, Anda menyatakan telah membaca dan menyetujui syarat berikut.",
    ],
  },
  {
    judul: "2. Layanan yang diberikan",
    paragraf: [
      "Penyelenggara memberikan akses ke aplikasi perencanaan sumber daya perusahaan yang mencakup pencatatan penjualan, pembelian, persediaan, kas dan bank, jurnal akuntansi, penggajian, perpajakan, serta pelaporan keuangan.",
      "Seluruh modul terbuka untuk setiap pelanggan berlangganan. Tidak ada kemampuan yang dikunci berdasarkan tingkat paket.",
      "Jumlah pengguna dalam satu perusahaan tidak dibatasi. Asisten kecerdasan buatan dibatasi 100 permintaan per hari per perusahaan.",
    ],
  },
  {
    judul: "3. Akun dan tanggung jawab pengguna",
    paragraf: [
      "Anda bertanggung jawab menjaga kerahasiaan kata sandi dan membatasi akses ke akun Anda. Penyelenggara menyediakan verifikasi dua langkah, dan penggunaannya sangat disarankan untuk akun dengan peran Owner atau Admin.",
      "Anda bertanggung jawab atas kebenaran data yang dimasukkan, termasuk data akuntansi dan perpajakan. Layanan ini menghitung berdasarkan data yang Anda masukkan; ia tidak memeriksa kebenaran data sumbernya.",
      "Anda tidak diperkenankan memakai layanan untuk kegiatan yang melanggar hukum yang berlaku di Republik Indonesia.",
    ],
  },
  {
    judul: "4. Biaya berlangganan",
    paragraf: [
      "Biaya berlangganan adalah Rp 499.000 per bulan per perusahaan, ditagih di muka untuk masa satu bulan.",
      "Tidak ada biaya implementasi, biaya lisensi per pengguna, maupun biaya peningkatan versi.",
      "Berhenti berlangganan dapat dilakukan kapan saja. Masa berlangganan yang sudah dibayar tetap berjalan sampai habis, dan tidak ada pengembalian dana untuk masa yang belum terpakai.",
      "Penyelenggara dapat mengubah biaya berlangganan dengan pemberitahuan sekurang-kurangnya 30 hari sebelum berlaku bagi pelanggan yang sudah berjalan.",
    ],
  },
  {
    judul: "5. Keterlambatan pembayaran",
    paragraf: [
      "Setelah masa berlaku berakhir, akun memasuki masa tenggang selama 3 hari dan tetap dapat dipakai seperti biasa.",
      "Setelah masa tenggang berakhir, akun berubah menjadi baca-saja. Data tidak dihapus, dan ekspor data tetap dapat diunduh.",
    ],
  },
  {
    judul: "6. Kepemilikan dan pengambilan data",
    paragraf: [
      "Seluruh data yang Anda masukkan tetap menjadi milik Anda. Penyelenggara tidak memperoleh hak kepemilikan atasnya.",
      "Anda dapat mengunduh seluruh isi basis data perusahaan Anda sebagai berkas ZIP berisi satu berkas CSV per tabel, kapan saja, termasuk setelah berhenti berlangganan selama akun belum dihapus.",
      "Permintaan penghapusan data secara permanen dapat diajukan lewat jalur kontak yang tercantum di halaman Kontak.",
    ],
  },
  {
    judul: "7. Ketersediaan layanan",
    paragraf: [
      "Penyelenggara berupaya menjaga layanan tetap tersedia, tetapi tidak menjanjikan tingkat ketersediaan tertentu dalam bentuk perjanjian tingkat layanan.",
      "Layanan dapat dihentikan sementara untuk pemeliharaan. Bila pemeliharaan direncanakan, pemberitahuan diberikan sebelumnya.",
    ],
  },
  {
    judul: "8. Batasan tanggung jawab",
    paragraf: [
      "Layanan ini bukan pengganti nasihat akuntansi maupun perpajakan. Perhitungan pajak mengikuti aturan yang berlaku sepanjang pengetahuan Penyelenggara pada saat pembaruan terakhir, dan Anda tetap bertanggung jawab memastikan kesesuaiannya dengan kewajiban perusahaan Anda.",
      "Sepanjang diizinkan hukum yang berlaku, tanggung jawab Penyelenggara atas kerugian yang timbul dari penggunaan layanan dibatasi setinggi-tingginya sebesar biaya berlangganan yang telah Anda bayarkan dalam 12 bulan terakhir.",
    ],
  },
  {
    judul: "9. Perubahan syarat",
    paragraf: [
      "Penyelenggara dapat mengubah syarat ini. Perubahan yang berdampak material diberitahukan sekurang-kurangnya 30 hari sebelum berlaku.",
      "Melanjutkan penggunaan layanan setelah perubahan berlaku berarti Anda menyetujui syarat yang telah diubah.",
    ],
  },
  {
    judul: "10. Hukum yang berlaku",
    paragraf: [
      "Syarat ini tunduk pada hukum Republik Indonesia.",
      "Perselisihan yang timbul diupayakan diselesaikan secara musyawarah terlebih dahulu.",
    ],
  },
];

export const PRIVASI: BagianLegal[] = [
  {
    judul: "1. Ruang lingkup",
    paragraf: [
      `Kebijakan ini menjelaskan bagaimana ${PENYELENGGARA} memperlakukan data yang diproses dalam layanan ERPindo.`,
      "Kebijakan ini belum ditinjau penasihat hukum, dan tidak menyatakan klaim kepatuhan terhadap peraturan perlindungan data mana pun. Yang tertulis di bawah adalah fakta teknis dan operasional yang memang berlaku di produk.",
    ],
  },
  {
    judul: "2. Data yang diproses",
    paragraf: [
      "Data akun: nama, alamat surel, kata sandi dalam bentuk hash, dan rahasia verifikasi dua langkah dalam bentuk terenkripsi.",
      "Data perusahaan yang Anda masukkan: pelanggan, pemasok, produk, transaksi, jurnal, dan sejenisnya.",
      "Data karyawan yang Anda masukkan pada modul penggajian: nama, nomor pokok wajib pajak, komponen gaji, dan potongan. Data ini adalah data pribadi milik karyawan Anda, dan Anda bertindak sebagai pihak yang menentukan tujuan pemrosesannya.",
      "Catatan teknis: waktu dan jenis permintaan ke layanan, dipakai untuk pembatasan laju dan penelusuran gangguan.",
    ],
  },
  {
    judul: "3. Tempat penyimpanan dan pemisahan",
    paragraf: [
      "Data tiap perusahaan disimpan dalam basis data tersendiri, bukan dalam tabel bersama yang dibedakan penanda. Data dua perusahaan tidak pernah berada dalam satu tabel yang sama.",
      "Layanan berjalan di atas infrastruktur komputasi tepi Cloudflare. Data dapat tersimpan di pusat data di luar wilayah Indonesia sesuai penempatan penyedia tersebut.",
    ],
  },
  {
    judul: "4. Tujuan pemrosesan",
    paragraf: [
      "Data diproses semata-mata untuk menjalankan layanan yang Anda langgan: menyimpan catatan, menghitung, dan menyajikan laporan.",
      "Penyelenggara tidak menjual data Anda, tidak memakainya untuk periklanan, dan tidak membagikannya kepada pihak ketiga selain penyedia infrastruktur dan layanan pendukung yang diperlukan agar layanan berjalan.",
    ],
  },
  {
    judul: "5. Layanan pihak ketiga",
    paragraf: [
      "Pengiriman surel transaksional memakai penyedia surel pihak ketiga, terbatas pada alamat surel penerima dan isi pesannya.",
      "Pembayaran langganan diproses penyedia pembayaran pihak ketiga. Penyelenggara tidak menyimpan nomor kartu.",
      "Asisten kecerdasan buatan memproses pertanyaan yang Anda ketik pada model yang dijalankan di infrastruktur Cloudflare. Fitur ini dapat dinonaktifkan.",
      "Pencadangan ke Google Drive hanya berjalan bila Anda sendiri menghubungkan akun Google perusahaan Anda.",
    ],
  },
  {
    judul: "6. Retensi dan penghapusan",
    paragraf: [
      "Data disimpan selama akun masih ada. Berhenti berlangganan mengubah akun menjadi baca-saja; ia tidak menghapus data.",
      "Permintaan penghapusan permanen dapat diajukan lewat jalur kontak. Setelah dijalankan, basis data perusahaan yang bersangkutan dihapus dan tidak dapat dipulihkan.",
      "Anda dapat mengunduh seluruh data Anda dalam format CSV kapan saja sebelum penghapusan.",
    ],
  },
  {
    judul: "7. Keamanan",
    paragraf: [
      "Kata sandi disimpan dalam bentuk hash. Rahasia verifikasi dua langkah disimpan terenkripsi.",
      "Akses antar-perusahaan dicegah oleh pemisahan basis data. Hak akses di dalam satu perusahaan ditegakkan di sisi server pada tiap permintaan.",
      "Rincian teknis lain dijelaskan di halaman Keamanan.",
    ],
  },
  {
    judul: "8. Hak Anda",
    paragraf: [
      "Anda dapat mengakses, mengoreksi, dan mengekspor data Anda kapan saja langsung dari dalam aplikasi.",
      "Anda dapat meminta penghapusan data lewat jalur kontak yang tercantum di halaman Kontak.",
      "Untuk data karyawan yang Anda masukkan, permintaan dari karyawan yang bersangkutan diteruskan kepada Anda sebagai perusahaan yang memasukkannya.",
    ],
  },
];
