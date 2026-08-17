// Penyapu kelas warna literal (Fase 31a).
//
// ## Kenapa gerbang ini ada
//
// Repo dua kali menjalankan "perombakan desain" (17a, 18a) yang hanya mengganti
// NILAI ramp `slate-*` di `styles.css`. Halaman tetap menulis warna secara
// literal — 1.634 kelas `slate-*` dan 1.084 varian `dark:` tersebar di 50
// berkas. Akibatnya bentuk aplikasi tidak pernah benar-benar berubah, dan
// pemilik menilainya masih mirip aplikasi lama.
//
// Fase 31a menggantinya dengan token semantik (`surface`, `ink`, `line`).
// Skrip ini menjaga hasil itu: kelas warna literal boleh TURUN, tidak boleh
// naik. Polanya sama dengan `sapu-i18n.mjs` yang sudah dipakai repo untuk
// utang teks sejak Fase 16.
//
// Pakai:
//   node scripts/sapu-warna.mjs           # periksa terhadap ambang
//   node scripts/sapu-warna.mjs --rinci   # tampilkan lokasinya
import { readFileSync, globSync } from "node:fs";

/**
 * Ambang. Diturunkan setiap kali sisa literal berkurang — JANGAN dinaikkan.
 *
 * `landing/index.tsx` dan `fitur.tsx` menyumbang sebagian besar sisa: keduanya
 * memakai pita gelap yang memang harus gelap di kedua tema, dan keduanya
 * ditulis ulang total di Fase 31c. Ambangnya turun lagi di sana.
 */
const AMBANG = { slate: 106, dark: 344 };

const RINCI = process.argv.includes("--rinci");
const files = globSync("apps/web/src/**/*.tsx").sort();

let slate = 0;
let dark = 0;
const per = new Map();

for (const f of files) {
  const src = readFileSync(f, "utf8");
  // Komentar dibuang lebih dulu: `styles.css` dan beberapa komponen menjelaskan
  // kelas lama di dalam komentar, dan menghitungnya membuat angka ini berbohong.
  const kode = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const s = (kode.match(/\bslate-\d{2,3}\b/g) ?? []).length;
  const d = (kode.match(/\bdark:/g) ?? []).length;
  slate += s;
  dark += d;
  if (s || d) per.set(f.replace("apps/web/src/", ""), { s, d });
}

if (RINCI) {
  console.log("berkas".padEnd(38), "slate-*".padStart(8), "dark:".padStart(7));
  for (const [f, v] of [...per].sort((a, b) => b[1].s + b[1].d - (a[1].s + a[1].d))) {
    console.log(f.padEnd(38), String(v.s).padStart(8), String(v.d).padStart(7));
  }
  console.log();
}

console.log(`kelas warna literal  : ${slate}  (ambang ${AMBANG.slate})`);
console.log(`varian dark: literal : ${dark}  (ambang ${AMBANG.dark})`);

const naik = [];
if (slate > AMBANG.slate) naik.push(`slate-* ${slate} > ${AMBANG.slate}`);
if (dark > AMBANG.dark) naik.push(`dark: ${dark} > ${AMBANG.dark}`);

if (naik.length) {
  console.error(
    `\n✗ Utang warna NAIK: ${naik.join(", ")}.\n` +
      `  Pakai token semantik (bg-surface, text-ink-muted, border-line) alih-alih\n` +
      `  kelas literal. Jalankan dengan --rinci untuk melihat berkasnya.`
  );
  process.exit(1);
}

if (slate < AMBANG.slate || dark < AMBANG.dark) {
  console.log(
    `\n↓ Utang berkurang. Turunkan AMBANG di scripts/sapu-warna.mjs menjadi ` +
      `{ slate: ${slate}, dark: ${dark} } agar tidak bisa naik lagi.`
  );
}
console.log("\n✓ Utang warna tidak naik.");
