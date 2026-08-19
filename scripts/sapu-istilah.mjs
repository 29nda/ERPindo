// Penyapu istilah (Fase 33k) — memaksa keputusan di `docs/glosarium.md`.
//
// ## Kenapa gerbang ini ada
//
// Glosarium ditulis di Fase 33a dan diterapkan di 33b–33j. Tanpa penjaga, ia
// berumur persis sampai halaman berikutnya ditulis: keputusan yang hanya hidup
// di dokumen akan dilanggar oleh orang yang tidak membaca dokumen itu — dan
// tidak ada satu pun gerbang lain yang bisa melihatnya, karena string apa pun
// tetap sah bagi tsc, eslint, dan smoke.
//
// Itu bukan dugaan. Repo ini sudah dua kali kehilangan keputusan dengan cara
// yang sama: warna literal (dijaga sejak 31a oleh `sapu-warna.mjs`) dan teks
// satu bahasa (dijaga sejak Fase 16 oleh `sapu-i18n.mjs`).
//
// ## Apa yang TIDAK diperiksa, dan kenapa
//
// Hanya string yang bisa **dilihat pengguna**. Pengenal teknis, nama kolom
// database, nilai enum kontrak API, dan kunci kamus sengaja dilewati — semuanya
// terdaftar di `docs/glosarium.md` §1(d) dan §5. Memaksa ejaan ke sana memecah
// API tanpa satu pun pengguna melihat bedanya.
//
// Pakai:
//   node scripts/sapu-istilah.mjs           # periksa
//   node scripts/sapu-istilah.mjs --rinci   # tampilkan tiap lokasinya
import { readFileSync, globSync } from "node:fs";

const RINCI = process.argv.includes("--rinci");

/**
 * Aturan. `pola` dicocokkan ke ISI STRING, bukan ke seluruh baris — supaya
 * nama variabel `selisihHutang` dan kunci kamus `umurHutang` tidak ikut kena.
 */
const ATURAN = [
  {
    nama: "ejaan-utang",
    pola: /\bhutang\b/i,
    pesan: 'ejaan baku KBBI adalah "utang" (glosarium §5)',
    // Nama akun tersimpan di database tiap tenant; migrasi 0047 yang
    // menyeragamkannya, bukan penyapu ini. Benihnya sengaja tetap.
    lewatiBerkas: [/packages\/db\/src\/migrations\.ts$/],
  },
  {
    nama: "merek-erpindo",
    pola: /(?<![A-Za-z@/\-.])erpindo(?![A-Za-z0-9_\-.@/])/,
    pesan: 'merek ditulis "ERPindo" (glosarium §1d)',
  },
  {
    nama: "rupiah-tanpa-spasi",
    pola: /\bRp\d/,
    pesan: 'rupiah ditulis "Rp 499.000" dengan spasi (glosarium §6)',
  },
  {
    // Fase 34a — pemilik menegaskan yang diminta adalah TATA BAHASA YANG BENAR,
    // bukan sekadar bahasa yang mudah dipahami. Keduanya bukan hal yang sama,
    // dan Fase 32e mengejar yang kedua: naskah landing jadi jernih tetapi
    // ragamnya turun ke bahasa percakapan.
    //
    // Diaudit dengan aturan PUEBI/KBBI. Ejaannya ternyata bersih; yang meleset
    // justru RAGAM — kata percakapan dan verba yang kehilangan awalannya.
    //
    // Hanya kata yang padanan bakunya tidak berubah makna yang masuk sini.
    // "bisa" TIDAK didaftarkan: ia baku menurut KBBI, hanya lebih santai
    // daripada "dapat", dan memaksanya di 78 tempat adalah churn tanpa nilai.
    nama: "ragam-percakapan",
    pola: /\b(cuma|gampang|telat|bikin|kayak|banget|nggak|udah|aja|ribet|kelar|doang|kalo|emang|gitu|gini|sampe|dikit|bareng)\b/i,
    pesan: "pakai padanan baku (hanya, mudah, terlambat, membuat, seperti, …)",
  },
  {
    // Verba yang kehilangan awalannya di kalimat deskriptif: "Kasir tetap
    // jalan" (seharusnya "berjalan"), "slip gaji langsung jadi" (seharusnya
    // "terbentuk"). Kalimat perintah pada tombol TIDAK kena — polanya menuntut
    // kata keterangan di depannya.
    nama: "awalan-verba-hilang",
    pola: /\b(tetap|masih|sudah|bisa|dapat|akan|langsung)\s+(jalan|kerja|jadi)\b/i,
    pesan: "verba deskriptif perlu awalannya (berjalan, bekerja, terbentuk)",
  },
  {
    nama: "istilah-pegawai",
    pola: /\bnama pegawai\b/i,
    pesan: '"karyawan", bukan "pegawai" (glosarium §5b)',
  },
];

/** Berkas yang naskahnya dilihat pengguna. */
const BERKAS = [
  "apps/web/src/i18n/*.ts",
  "apps/web/src/pages/**/*.{ts,tsx}",
  "apps/web/src/components/**/*.tsx",
  "packages/shared/src/*.ts",
  "apps/api/src/routes/*.ts",
  "apps/api/src/lib/*.ts",
  "apps/api/src/index.ts",
];

/**
 * Ambil isi literal string dari sebuah berkas beserta nomor barisnya.
 *
 * Sengaja TIDAK memakai parser: yang dibutuhkan hanya isi kutipan, dan sebuah
 * parser penuh akan menyeret ketergantungan baru ke dalam gerbang yang harus
 * bisa jalan di CI mana pun. Komentar ikut dilewati karena penjelasan boleh —
 * bahkan harus — menyebut bentuk lama saat menerangkan kenapa ia ditinggalkan.
 */
function stringDi(isi) {
  const keluar = [];
  const baris = isi.split("\n");
  let dalamBlok = false;
  for (let i = 0; i < baris.length; i++) {
    let b = baris[i];
    if (dalamBlok) {
      const tutup = b.indexOf("*/");
      if (tutup < 0) continue;
      b = b.slice(tutup + 2);
      dalamBlok = false;
    }
    const buka = b.indexOf("/*");
    if (buka >= 0) {
      const tutup = b.indexOf("*/", buka + 2);
      if (tutup < 0) {
        b = b.slice(0, buka);
        dalamBlok = true;
      } else {
        b = b.slice(0, buka) + b.slice(tutup + 2);
      }
    }
    const komentar = b.indexOf("//");
    if (komentar >= 0 && !/https?:$/.test(b.slice(0, komentar))) b = b.slice(0, komentar);
    for (const m of b.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
      keluar.push({ baris: i + 1, teks: m[1] ?? m[2] ?? m[3] ?? "" });
    }
    // Teks JSX di antara dua tanda kurung sudut — `<div>Nama karyawan</div>`.
    //
    // Ditambahkan setelah sabotase membuktikan aturan `istilah-pegawai` TIDAK
    // BISA GAGAL tanpa ini: seluruh isi `pages/print.tsx` — faktur, struk, slip
    // gaji, ringkasan 1721-A1 — adalah teks JSX, bukan string berkutip. Penyapu
    // yang hanya membaca kutipan buta terhadap semua dokumen cetak.
    //
    // Heuristik, bukan parser: hanya potongan satu baris tanpa `{}`, yang berarti
    // teks statis murni. Teks JSX bernilai dinamis lolos — dan itu memang batasan
    // yang diterima, karena alternatifnya menyeret parser JSX ke dalam gerbang.
    for (const m of b.matchAll(/>([^<>{}]{3,})</g)) {
      keluar.push({ baris: i + 1, teks: m[1].trim() });
    }
  }
  return keluar;
}

/**
 * Apakah sebuah string adalah NASKAH (dilihat pengguna), atau PENGENAL?
 *
 * Percobaan pertama penyapu ini melaporkan tujuh pelanggaran, dan ketujuhnya
 * benar-benar boleh: kunci kamus `u("hutang")`, nilai enum kontrak API
 * `sumber: "hutang"`, kunci localStorage `erpindo:dashboard-widgets:…`, batas
 * multipart `erpindo${uuid}`, dan `app: "erpindo"` di manifes ekspor.
 *
 * Melonggarkan polanya akan membuat penyapu ini berhenti menjaga apa pun.
 * Yang membedakan keduanya bukan isinya, melainkan BENTUKNYA: pengenal ditulis
 * satu token tanpa spasi, seluruhnya huruf kecil, dan sering memuat `:`, `-`,
 * `_`, atau interpolasi. Naskah punya spasi, atau diawali huruf besar.
 *
 * Karena itu `"hutang"` (kunci) lolos sementara `"Hutang"` (label) dan
 * `"Hutang Usaha"` (nama akun) tetap tertangkap — pembedaan yang dibuktikan
 * lewat sabotase, bukan diasumsikan.
 */
function pengenal(teks) {
  // Isi `${…}` dibuang lebih dulu: ia KODE, dan spasi di dalamnya
  // (`replace(/-/g, "")`) tidak menjadikan string pembungkusnya sebuah kalimat.
  // Tanpa langkah ini, batas multipart `erpindo${uuid…}` salah dikenali sebagai
  // naskah — satu-satunya sisa pelanggaran palsu setelah aturan bentuk dipasang.
  const rangka = teks.replace(/\$\{[^}]*\}/g, "");
  if (/\s/.test(rangka)) return false;
  return /^[a-z0-9_.:$/{}-]*$/.test(rangka);
}

const temuan = [];
const berkas = [...new Set(BERKAS.flatMap((g) => globSync(g)))].sort();

for (const f of berkas) {
  const isi = readFileSync(f, "utf8");
  const strings = stringDi(isi);
  for (const aturan of ATURAN) {
    if (aturan.lewatiBerkas?.some((re) => re.test(f))) continue;
    for (const s of strings) {
      if (pengenal(s.teks)) continue;
      if (aturan.pola.test(s.teks)) {
        temuan.push({ f, baris: s.baris, aturan: aturan.nama, pesan: aturan.pesan, teks: s.teks });
      }
    }
  }
}

const perAturan = new Map();
for (const t of temuan) perAturan.set(t.aturan, (perAturan.get(t.aturan) ?? 0) + 1);

console.log(`Penyapu istilah — ${berkas.length} berkas diperiksa.`);
for (const aturan of ATURAN) {
  const n = perAturan.get(aturan.nama) ?? 0;
  console.log(`  ${n === 0 ? "✓" : "✗"} ${aturan.nama.padEnd(22)} ${n} pelanggaran — ${aturan.pesan}`);
}

if (RINCI) {
  for (const t of temuan) {
    console.log(`\n  ${t.f}:${t.baris}  [${t.aturan}]`);
    console.log(`     ${JSON.stringify(t.teks.slice(0, 110))}`);
  }
}

if (temuan.length > 0) {
  console.log(`\n✗ ${temuan.length} pelanggaran glosarium. Jalankan --rinci untuk lokasinya.`);
  process.exit(1);
}
console.log("\n✓ Seluruh naskah mengikuti docs/glosarium.md.");
