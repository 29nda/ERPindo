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
const AMBANG = { "inggris-dalam-kurung": 0, "empty-state-buntu": 9, "angka-tanpa-pemisah": 0 };

const UI = readFileSync("apps/web/src/i18n/ui.ts", "utf8");
const HEADINGS = readFileSync("apps/web/src/i18n/pageHeadings.ts", "utf8");

/** Entri `kunci: { id: "…", en: "…" }`, termasuk yang ditulis banyak baris. */
function entri(sumber) {
  const re = /(\w+):\s*\{\s*\n?\s*id:\s*"((?:[^"\\]|\\.)*)"\s*,\s*\n?\s*en:\s*"((?:[^"\\]|\\.)*)"/g;
  return [...sumber.matchAll(re)].map((m) => ({ kunci: m[1], id: m[2], en: m[3] }));
}

const SEMUA = [...entri(UI), ...entri(HEADINGS)];

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

const temuan = [];
const catat = (kelas, e, teks) => temuan.push({ kelas, kunci: e.kunci, teks });

for (const e of SEMUA) {
  if (TERJEMAHAN.test(e.id)) catat("inggris-dalam-kurung", e, e.id);

  if (AWALAN_KOSONG.test(e.id) && !ADA_LANGKAH.test(e.id) && !KABAR_BAIK.test(e.id) && !POTONGAN(e.id)) {
    catat("empty-state-buntu", e, e.id);
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
