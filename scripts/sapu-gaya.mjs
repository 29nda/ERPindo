// Penyapu gaya naskah (Fase 33k) — kelas cacat yang tidak terlihat oleh gerbang lain.
//
// ## Kenapa terpisah dari `sapu-istilah.mjs`
//
// Penyapu istilah menjaga KATA MANA yang dipakai; jawabannya selalu ya/tidak
// dan boleh langsung memerah. Penyapu ini menjaga BENTUK KALIMAT, dan sebagian
// kelasnya masih menyimpan sisa yang sah. Jadi ia bekerja seperti
// `sapu-warna.mjs`: berambang, dan ambangnya hanya boleh TURUN.
//
// ## Tiga kelas, masing-masing lahir dari cacat nyata
//
// 1. `inggris-dalam-kurung` — "Pengadaan (Procurement)". Ditemukan di Fase 33e
//    dan diperbaiki dengan tangan, karena penjaga judul-vs-menu saat itu
//    MELOLOSKANNYA: judul itu memang diawali label menunya. Tidak ada satu pun
//    gerbang yang melihat terjemahan Inggris di dalam kurung.
//
// 2. `empty-state-buntu` — "Belum ada tiket." tanpa langkah berikutnya. Fase 33f
//    memperbaiki 49; sisanya sah (kabar baik, potongan kalimat) dan ada di
//    ambang.
//
// 3. `angka-tanpa-pemisah` — placeholder "mis. 5000000" mengajarkan bentuk input
//    yang salah, karena begitu tersimpan aplikasi menampilkannya bertitik.
//
// Pakai:
//   node scripts/sapu-gaya.mjs           # periksa terhadap ambang
//   node scripts/sapu-gaya.mjs --rinci   # tampilkan lokasinya
import { readFileSync } from "node:fs";

const RINCI = process.argv.includes("--rinci");

/** Ambang. Turunkan setiap kali sisanya berkurang — JANGAN dinaikkan. */
const AMBANG = {
  "inggris-dalam-kurung": 0,
  "empty-state-buntu": 9,
  "angka-tanpa-pemisah": 0,
  "klaim-tanpa-bukti": 0,
};

/**
 * Berkas yang naskahnya disapu.
 *
 * Fase 38d — sampai fase ini penyapu ini HANYA membaca dua kamus aplikasi.
 * Seluruh naskah halaman publik luput, dan itu bukan kelalaian melainkan
 * akibat bentuk: naskah publik ditulis sebagai `L(lang, "…", "…")` di tengah
 * JSX, dan parser di bawah — yang mengenali `kunci: { id, en }` — tidak akan
 * pernah bisa melihatnya.
 *
 * Berkas naskah publik yang baru ditulis sebagai data `Dual`, jadi ia bisa
 * disapu sejak lahir. Naskah publik LAMA menyusul di Fase 38p, saat `L()`
 * dibubarkan.
 */
const BERKAS = [
  "apps/web/src/i18n/ui.ts",
  "apps/web/src/i18n/pageHeadings.ts",
  "apps/web/src/pages/publik/teks.ts",
  "apps/web/src/pages/landing/sections.ts",
  "apps/web/src/pages/landing/fiturDetail.ts",
  "apps/web/src/peragaan/naskah/beranda.ts",
  "apps/web/src/peragaan/naskah/fitur.ts",
];

/**
 * Kamus antarmuka aplikasi — SATU-SATUNYA tempat keadaan kosong hidup.
 *
 * Kaidah `empty-state-buntu` dibatasi ke dua berkas ini, bukan ke seluruh
 * `BERKAS`. Alasannya ditemukan saat memperluas cakupan pada Fase 38d: kaidah
 * itu mencari kalimat yang diawali "Belum ada"/"Tidak ada" tanpa langkah
 * lanjut — bentuk yang di kamus aplikasi memang selalu berarti keadaan kosong
 * buntu, tetapi di naskah jualan berarti sesuatu yang sama sekali berbeda.
 *
 * "Tidak ada rekapitulasi manual di akhir hari." bukan keadaan kosong. Ia
 * justru kalimat terkuat di peragaannya.
 *
 * Menaikkan ambang akan menyembunyikan empat positif palsu ini beserta setiap
 * keadaan kosong buntu yang sungguhan yang ditambahkan sesudahnya. Membatasi
 * kaidahnya menjaga keduanya tetap terlihat.
 */
const BERKAS_KAMUS = new Set(["apps/web/src/i18n/ui.ts", "apps/web/src/i18n/pageHeadings.ts"]);

/** Entri `kunci: { id: "…", en: "…" }`, termasuk yang ditulis banyak baris. */
function entri(sumber) {
  const re = /(\w+):\s*\{\s*\n?\s*id:\s*"((?:[^"\\]|\\.)*)"\s*,\s*\n?\s*en:\s*"((?:[^"\\]|\\.)*)"/g;
  return [...sumber.matchAll(re)].map((m) => ({ kunci: m[1], id: m[2], en: m[3] }));
}

const SEMUA = BERKAS.flatMap((f) =>
  entri(readFileSync(f, "utf8")).map((e) => ({ ...e, berkas: f, kamus: BERKAS_KAMUS.has(f) })),
);

/**
 * Kata Inggris yang, bila muncul dalam kurung di sisi Indonesia, berarti
 * terjemahan — bukan istilah yang memang dipakai sehari-hari di Indonesia.
 *
 * `(BEP)`, `(BoM)`, `(POS)`, `(aging)`, `(quotation)` justru DIPERTAHANKAN:
 * ketiganya singkatan atau istilah yang pemilik usaha Indonesia memang
 * memakainya, dan membuangnya membuat naskah terasa mengambang (keputusan
 * Fase 32e, dicatat ulang di glosarium §2).
 */
const TERJEMAHAN = /\((Procurement|Inventory|Payables|Receivables|Manufacturing|Maintenance|Approval|Reconciliation|Consolidation|Depreciation)\)/i;

/** Empty state yang tidak mengatakan apa pun setelah menyatakan kosong. */
const AWALAN_KOSONG = /^(Belum ada|Tidak ada)/i;
const ADA_LANGKAH =
  /(Klik|Tambah|Buat|Mulai|Pilih|Gunakan|Impor|Atur|Jalankan|Daftar|Isi|Simpan|Tekan|Catat|Coba|Lebarkan|Susun|Unggah|Bagi|Ajukan|Terima|Tutup|Buka|Jadwalkan|Tulis|Pastikan|Setel|Aktifkan|Masukkan|Muat|lewat|muncul|terisi|terbentuk|tersimpan|otomatis|butuh|memang|dihitung|deducted)/i;
/** Kabar baik tidak butuh langkah lanjut — menambahkannya justru merusak. */
const KABAR_BAIK = /🎉|👍/;
/** Potongan kalimat yang di layar disambung dengan angka. */
const POTONGAN = (t) => !/[.!?]$/.test(t) && t.split(" ").length <= 5;

/**
 * Kata sifat yang menjual tanpa bisa dibuktikan.
 *
 * "Termurah" bisa diperiksa dan karena itu TIDAK dilarang — ia klaim faktual
 * yang salah atau benar. Yang dilarang adalah kata yang tidak punya cara untuk
 * salah: tidak ada satu baris pun di produk mana pun yang bisa ditunjuk untuk
 * membuktikan "canggih".
 */
const KLAIM_HAMPA =
  /\b(terbaik|tercanggih|canggih|revolusioner|paling lengkap|serba bisa|tanpa cela|sempurna|luar biasa|mutakhir)\b/i;
const KLAIM_HAMPA_EN =
  /\b(best[- ]in[- ]class|cutting[- ]edge|state[- ]of[- ]the[- ]art|revolutionary|world[- ]class|seamless(ly)?|effortless(ly)?|game[- ]chang)/i;

const temuan = [];
const catat = (kelas, e, teks) => temuan.push({ kelas, kunci: e.kunci, teks });

for (const e of SEMUA) {
  if (TERJEMAHAN.test(e.id)) catat("inggris-dalam-kurung", e, e.id);

  // Hanya kamus aplikasi — lihat catatan di `BERKAS_KAMUS`.
  if (e.kamus && AWALAN_KOSONG.test(e.id) && !ADA_LANGKAH.test(e.id) && !KABAR_BAIK.test(e.id) && !POTONGAN(e.id)) {
    catat("empty-state-buntu", e, e.id);
  }

  // Fase 38d — menegakkan aturan yang SUDAH tertulis tetapi tidak dijaga apa pun.
  //
  // `docs/posisi-produk.md` §3 menyatakan aturan keras: "tidak ada klaim di
  // halaman depan yang tidak bisa ditunjuk barisnya di produk". Sampai fase ini
  // aturan itu hanya hidup di dokumen — dan aturan yang hanya hidup di dokumen
  // akan dilanggar oleh orang yang tidak membaca dokumen itu.
  //
  // Kata-kata di bawah adalah kata sifat yang TIDAK BISA ditunjuk barisnya di
  // produk mana pun. Ambangnya nol sejak hari pertama karena tidak ada satu pun
  // yang sudah telanjur dipakai — jadi tidak ada utang yang perlu diampuni.
  if (KLAIM_HAMPA.test(e.id) || KLAIM_HAMPA_EN.test(e.en)) {
    catat("klaim-tanpa-bukti", e, e.id);
  }

  // Hanya contoh isian (`mis.` / `e.g.`) — angka di dalam kalimat biasa
  // (tahun, nomor peraturan, kode) memang tidak berpemisah ribuan.
  if (/\b(mis\.|e\.g\.)/i.test(e.id) && /\b\d{4,}\b/.test(e.id)) {
    catat("angka-tanpa-pemisah", e, e.id);
  }
}

const hitung = {};
for (const k of Object.keys(AMBANG)) hitung[k] = temuan.filter((t) => t.kelas === k).length;

console.log(`Penyapu gaya — ${SEMUA.length} entri kamus diperiksa.`);
let gagal = false;
for (const [kelas, ambang] of Object.entries(AMBANG)) {
  const n = hitung[kelas];
  const ok = n <= ambang;
  if (!ok) gagal = true;
  console.log(`  ${ok ? "✓" : "✗"} ${kelas.padEnd(22)} ${n} (ambang ${ambang})`);
}

if (RINCI) {
  for (const t of temuan) console.log(`\n  [${t.kelas}] ${t.kunci}\n     ${JSON.stringify(t.teks.slice(0, 110))}`);
}

if (gagal) {
  console.log("\n✗ Utang gaya naskah NAIK. Jalankan --rinci untuk lokasinya.");
  process.exit(1);
}
console.log("\n✓ Utang gaya naskah tidak naik.");
