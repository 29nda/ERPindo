// Sapuan sisa teks Indonesia di halaman web — versi terpercaya.
//
// Menyapu SEMUA literal string, template literal, dan potongan teks JSX, lalu
// membuang kelas positif-palsu yang sudah terbukti:
//   - komentar kode (// dan /* */)
//   - sisi `id:` dari pasangan Dual { id: "…", en: "…" } — memang harus Indonesia
//   - argumen kunci kamus: u("namaKunci")
//   - nama kelas Tailwind
// Sisanya dikelompokkan: [LAYAR] teks layar (utang nyata), [TOAST] pesan toast
// (di luar lingkup program 16b–16k), [BERKAS] header kolom / nama sheet berkas
// ekspor CSV-Excel (format berkas, bukan teks layar).
//
// Pakai: node scripts/sapu-i18n.mjs apps/web/src/pages/*.tsx
import { readFileSync } from "node:fs";

/**
 * Ambang utang — lihat catatan di akhir berkas. Hanya boleh turun.
 *
 * `layar: 1` adalah `dashboard.tsx` yang membedah judul notifikasi buatan
 * server (`n.title.replace("Faktur ", "")`) untuk mengambil nomor fakturnya.
 * Itu bukan sekadar utang naskah melainkan utang bentuk data, dan diperbaiki
 * tersendiri di Fase 56c bersama seluruh lonceng notifikasi.
 */
const AMBANG = { layar: 1, atribut: 0 };

const KUNCI = new Set(
  [...readFileSync("apps/web/src/i18n/ui.ts", "utf8").matchAll(/^ {2}([a-zA-Z0-9]+):/gm)].map(
    (m) => m[1],
  ),
);

const KATA_ID = [
  "dan","atau","yang","untuk","dari","dengan","tidak","belum","sudah","akan","bisa","boleh",
  "tiap","bila","saat","agar","jadi","mis","dll","juga","ini","itu","per","ke","di","pada",
  "nama","tanggal","nilai","jumlah","daftar","daftarkan","tambah","simpan","batal","batalkan",
  "hapus","ubah","buat","dibuat","pilih","cari","aset","akun","kas","bank","jurnal","saldo",
  "masa","hasil","biaya","periode","catatan","keterangan","mutasi","setoran","setor","tarik",
  "penarikan","transfer","rekening","penyusutan","susut","tersusut","perolehan","kategori",
  "residu","manfaat","pelepasan","lepas","dilepas","dibayar","diterima","sejak","bln","bulan",
  "ya","aktif","jalankan","penjualan","pembelian","sumber","tujuan","berhasil","gagal","cocok",
  "manual","otomatis","neraca","laba","rugi","kredit","debit","dobel","diulang","aman","seimbang",
  "dipicu","awal","dibuang","urungkan","peralatan","kendaraan","melacak","mulai","tetap","barang",
  "lunas","menampilkan","kurs","faktur","dokumen","produk","gudang","pelanggan","pemasok","stok",
  "kedaluwarsa","wajib","diisi","refund","retur","pembalik","posting","diposting","terkunci",
  "template","dimuat","periksa","lalu","koreksi","terjadi","berjalan","ditukar","saling","akhir",
  "kosong","header","terbaka","perubahan","memengaruhi","transaksi","lama","memakai","sekaligus",
  "satu","karakter","minimal","modal","sewa","ruko","bulanan","penawaran","prospek","dijurnal",
  "selisih","tagihan","melebihi","sisa","pencarian","mencocokkan","nomor","kontak","muncul",
  "sini","beserta","status","pembayaran","pembayarannya","kata","kunci","lain","coba","anda",
];
const RE_ID = new RegExp(`(^|[^a-z])(${KATA_ID.join("|")})([^a-z]|$)`, "i");
/**
 * Teks tampilan yang SAMA di kedua bahasa, jadi bukan utang meski berbentuk
 * literal (Fase 19u). Daftar eksplisit, bukan tebakan pola: tiap butir sudah
 * diputuskan satu per satu — istilah resmi Indonesia yang memang tidak
 * diterjemahkan (aturan sejak Fase 16), singkatan lintas-bahasa, atau contoh
 * kode. Menambah butir ke sini adalah keputusan sadar, dan itulah gunanya
 * daftar: kalau suatu saat salah, kesalahannya terbaca di sini.
 */
const NETRAL = new Set([
  "No.", "QC", "SKU", "DPP", "PPN", "PPh 21", "PPh 23", "PPh Final", "NPWP",
  "TER", "PTKP", "HPP", "BEP", "BoM", "FEFO", "CRM", "POS", "e-Faktur",
  "Work center", "WC-CUT", "CAB-BDG", "PRJ-01", "PRD-001",
  "00.000.000.0-000.000", "LGN-01", "BRG-001", "CAB-01", "USD", "0%",
  "1721-A1", "BPJS", "PPh 21 (TER)", "Qty", "Lot", "Menu", "Harga",
  // Nama resmi formulir DJP (Fase 56b): dipakai apa adanya di dokumen pajak
  // berbahasa apa pun, dan menerjemahkannya justru membuat pemakai tidak
  // menemukan formulirnya di Coretax.
  "SPT Masa PPN", "SPT Tahunan",
  // Nama & perusahaan contoh sengaja tetap Indonesia (keputusan 19q): pasar
  // produk ini UKM Indonesia, dan contoh yang realistis lebih menolong.
  "PT Maju Jaya", "Budi Santoso",
  "Email", "Password",
]);

const RE_TAILWIND = /(^|\s)(text|bg|border|flex|grid|gap|rounded|dark|hover|sm|md|lg|p[xytblr]?|m[xytblr]?|w|h)[-:]/;

const isID = (s) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length < 3 || !/[a-zA-Z]/.test(t)) return false;
  if (KUNCI.has(t)) return false;                       // argumen u("kunci")
  // NETRAL berarti "sama di kedua bahasa". Sejak Fase 19u daftar itu hanya
  // dipakai saringan ATRIBUT, jadi teks yang sama persis tetap terhitung utang
  // ketika muncul sebagai untai biasa — dua jawaban berbeda untuk satu
  // keputusan yang sudah diambil (Fase 56b).
  if (NETRAL.has(t)) return false;
  if (/^(https?:|\/|#)/.test(t)) return false;
  if (RE_TAILWIND.test(t) && /^[\w\s:/[\]().↔·—–-]+$/.test(t)) return false;
  return RE_ID.test(t);
};

/**
 * Pecah isi template literal menjadi potongan STATIS saja, membuang tiap
 * `${…}` (dengan pencocokan kurung, supaya interpolasi bersarang ikut terbuang).
 *
 * Ditambahkan Fase 17c. Sebelumnya isi template diuji utuh, jadi className
 * berkondisi seperti
 *   `flex gap-2 ${aktif ? "bg-brand-600" : "text-slate-400"}`
 * lolos dari saringan Tailwind — saringan itu menuntut SELURUH string hanya
 * berisi karakter kelas, sementara `$`, `{`, `?`, dan tanda kutip di dalam
 * interpolasi membuatnya gagal, lalu string itu dilaporkan sebagai utang teks.
 * Positif palsu ini akan muncul di hampir tiap berkas yang dirombak pada Fase
 * 17, jadi sekarang tiap potongan statis dinilai sendiri-sendiri.
 */
const potonganStatis = (body) => {
  const out = [];
  let buf = "";
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "$" && body[i + 1] === "{") {
      out.push(buf);
      buf = "";
      let d = 0;
      for (i += 1; i < body.length; i++) {
        if (body[i] === "{") d++;
        else if (body[i] === "}" && --d === 0) break;
      }
    } else buf += body[i];
  }
  out.push(buf);
  return out;
};

// buang komentar + sisi id: dari pasangan Dual, ganti dengan spasi agar
// nomor baris tetap benar
const bersihkan = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + m.slice(p1.length).replace(/./g, " "))
    .replace(/\bid:\s*"(?:[^"\\]|\\.)*"(\s*,\s*\n?\s*en:)/g, (m, tail) =>
      m.slice(0, m.length - tail.length).replace(/[^\n]/g, " ") + tail,
    );

/**
 * Kelas bug tersendiri (ditemukan Fase 16t): `{u("kunci")}` yang berada di
 * dalam TEMPLATE LITERAL. Di sana ia bukan JSX — teksnya keluar harfiah, jadi
 * pemakai melihat tulisan `{u("subtotal")}`. Bentuk yang sah adalah
 * `${u("subtotal")}` (interpolasi). Bug ini tak terlihat mata dan tak
 * terjangkau asersi innerText, jadi harus dijaga di sini.
 */
function panggilanHarfiah(src) {
  const out = [];
  for (const m of src.matchAll(/`(?:[^`\\]|\\.)*`/gs)) {
    for (const t of m[0].matchAll(/(?<!\$)\{u\("([^"]+)"\)\}/g)) {
      out.push({ baris: src.slice(0, m.index + t.index).split("\n").length, kunci: t[1] });
    }
  }
  return out;
}

/**
 * Pola tabel-lookup dwibahasa (Fase 19s).
 *
 * `app.tsx` menerjemahkan menu bukan lewat `u("kunci")` melainkan lewat dua
 * tabel: `NAV_ITEMS` (label Indonesia + rute) dipasangkan dengan
 * `NAV_LABEL_EN` (rute → label Inggris), dan nama seksi dengan `SECTION_EN`.
 * Alat ini tidak mengenalinya, jadi 64 temuan dilaporkan di berkas yang
 * sebenarnya sudah dwibahasa sejak Fase 13e — dan angka palsu sebesar itu
 * MENUTUPI belasan utang nyata di berkas yang sama. Itulah alasan pola ini
 * diajarkan sekarang, bukan sekadar demi angka yang rapi.
 *
 * Yang penting: ini BUKAN pembungkaman. Pasangan diperiksa betulan —
 * label yang rutenya tidak ada di tabel EN tetap dilaporkan, jadi menu baru
 * yang lupa diberi label Inggris tetap ketahuan.
 */
function zonaTabelDwibahasa(src) {
  const sah = [];
  const bolong = [];

  const blok = (re, buka, tutup) => {
    const out = [];
    for (const m of src.matchAll(re)) {
      const awal = m.index + m[0].length - 1;
      let d = 0;
      for (let i = awal; i < src.length; i++) {
        if (src[i] === buka) d++;
        else if (src[i] === tutup && --d === 0) {
          out.push({ a: m.index, b: i, isi: src.slice(awal, i + 1), nama: m[1] });
          break;
        }
      }
    }
    return out;
  };

  // 1. Deklarasi `const X_EN … = { … }`: seluruh isinya sisi Inggris plus
  //    kunci pencarian (rute atau nama seksi Indonesia). Bukan teks layar.
  const tabelEn = blok(/\bconst\s+([A-Z0-9_]*_EN)\b[^=]*=\s*\{/g, "{", "}");
  sah.push(...tabelEn.map((t) => ({ a: t.a, b: t.b })));

  const kunciEn = new Set();
  for (const t of tabelEn)
    for (const k of t.isi.matchAll(/(?:^|[{,]\s*)"?([^":,{}\n]+?)"?\s*:/g)) kunciEn.add(k[1].trim());

  // 2. Tabel item bernavigasi: entri `{ to: "…", label: "…" , section: "…" }`.
  //    Label & seksinya sah HANYA bila padanan Inggrisnya benar-benar ada.
  if (tabelEn.length > 0) {
    for (const t of blok(/\bconst\s+([A-Z0-9_]+)\b[^=]*=\s*\[/g, "[", "]")) {
      // 2b. Larik wilayah kerja `const AREAS = [{ nama: "Beli & Stok", … }]`
      //     (Fase 56b). Namanya BUKAN teks mentah: ia dipakai sebagai kunci
      //     pencarian ke `SECTION_EN` saat bahasa Inggris aktif, persis seperti
      //     rute pada aturan 2 di bawah. Yang diperiksa tetap CAKUPANNYA —
      //     wilayah baru yang lupa diberi padanan Inggris tetap dilaporkan
      //     bolong, jadi ini pemeriksaan pasangan, bukan pembungkaman.
      for (const e of t.isi.matchAll(/\{[^{}]*\bnama:\s*"([^"]+)"[^{}]*\}/g)) {
        const a = t.a + e.index;
        const b = a + e[0].length;
        if (kunciEn.has(e[1])) sah.push({ a, b });
        else
          bolong.push({
            baris: src.slice(0, a).split("\n").length,
            pesan: `${e[1]} — wilayah tanpa padanan Inggris`,
          });
      }
      for (const e of t.isi.matchAll(/\{[^{}]*\bto:\s*"([^"]+)"[^{}]*\}/g)) {
        const label = e[0].match(/\blabel:\s*"([^"]+)"/)?.[1];
        const seksi = e[0].match(/\bsection:\s*"([^"]+)"/)?.[1];
        const a = t.a + e.index;
        const b = a + e[0].length;
        const kurang = [];
        if (label && !kunciEn.has(e[1])) kurang.push(`rute ${e[1]}`);
        if (seksi && !kunciEn.has(seksi)) kurang.push(`seksi "${seksi}"`);
        if (kurang.length === 0) sah.push({ a, b });
        else
          bolong.push({
            baris: src.slice(0, a).split("\n").length,
            pesan: `${label ?? e[1]} — tanpa padanan Inggris (${kurang.join(", ")})`,
          });
      }
    }
  }
  // 3. Peta label berpasangan `const X = { … }` + `const X_EN = { … }`
  //    (Fase 20m). Peta semacam ini berisi KODE → label, bukan kalimat layar,
  //    dan sudah dwibahasa. Yang diperiksa bukan keberadaan pasangannya saja
  //    melainkan CAKUPANNYA: kunci yang ada di sisi Indonesia tetapi hilang di
  //    sisi Inggris dilaporkan sebagai bug, karena pengguna Inggris akan
  //    melihat kode mentah tanpa ada yang tahu.
  const petaEn = new Map();
  for (const t of tabelEn) {
    const kunci = new Set();
    for (const k of t.isi.matchAll(/(?:^|[{,]\s*)"?([A-Za-z0-9_.]+)"?\s*:/g)) kunci.add(k[1].trim());
    petaEn.set(t.nama, kunci);
  }
  for (const t of blok(/\bconst\s+([A-Z0-9_]+)\b[^=]*=\s*\{/g, "{", "}")) {
    const pasangan = petaEn.get(`${t.nama}_EN`);
    if (!pasangan) continue;
    const kurang = [];
    for (const k of t.isi.matchAll(/(?:^|[{,]\s*)"?([A-Za-z0-9_.]+)"?\s*:/g)) {
      if (!pasangan.has(k[1].trim())) kurang.push(k[1].trim());
    }
    if (kurang.length === 0) sah.push({ a: t.a, b: t.b });
    else
      bolong.push({
        baris: src.slice(0, t.a).split("\n").length,
        pesan: `${t.nama} — ${kurang.length} kunci tanpa padanan di ${t.nama}_EN (${kurang.slice(0, 4).join(", ")})`,
      });
  }

  return { sah, bolong };
}

let totalLayar = 0;
let totalHarfiah = 0;
let totalBolong = 0;
let totalAtribut = 0;
for (const file of process.argv.slice(2)) {
  const asli = readFileSync(file, "utf8");
  const src = bersihkan(asli);

  for (const h of panggilanHarfiah(src)) {
    totalHarfiah++;
    console.log(
      `  ⚠️  ${file}:${h.baris}  {u("${h.kunci}")} di dalam template literal — ` +
        `keluar harfiah, seharusnya \${u("${h.kunci}")}`,
    );
  }
  const hits = new Map();
  const add = (jenis, teks, idx) => {
    const baris = src.slice(0, idx).split("\n").length;
    const k = `${baris}|${teks.replace(/\s+/g, " ").trim()}`;
    if (!hits.has(k)) hits.set(k, { jenis, baris, teks: teks.replace(/\s+/g, " ").trim() });
  };
  // Rentang [awal, akhir) dari tiap panggilan yang isinya bukan teks layar,
  // dihitung dengan mencocokkan kurung — jauh lebih tepat daripada menebak
  // dari konteks beberapa ratus karakter sebelumnya.
  const rentang = (nama, jenis) => {
    const out = [];
    for (const m of src.matchAll(new RegExp(`\\b${nama}\\(`, "g"))) {
      let d = 0;
      for (let i = m.index + m[0].length - 1; i < src.length; i++) {
        if (src[i] === "(") d++;
        else if (src[i] === ")" && --d === 0) {
          out.push({ a: m.index, b: i, jenis });
          break;
        }
      }
    }
    return out;
  };
  // downloadCsv/downloadXlsx = isi BERKAS ekspor (nama sheet, header kolom),
  // bukan teks layar — sama seperti header template CSV impor (Fase 16m).
  // Menerjemahkannya berarti mengubah format berkas, bukan bahasa antarmuka.
  const zona = [
    ...rentang("toast", "TOAST"),
    ...rentang("downloadXlsx", "BERKAS"),
    ...rentang("downloadCsv", "BERKAS"),
  ];

  // Ternary dwibahasa yang memang sah. Dua bentuk dipakai di repo ini:
  //   lang === "en" ? "…" : "…"
  //   en ? "…" : "…"          (setelah `const en = lang === "en"`)
  // Sisi Indonesianya memang harus ada, jadi jangan dihitung utang.
  const zonaSah = [];
  const punyaAliasEn = /\bconst\s+en\s*=\s*lang\s*===\s*"en"/.test(src);
  const polaTernary = punyaAliasEn
    ? /(?:lang\s*===\s*"en"|\ben)\s*\?/g
    : /lang\s*===\s*"en"\s*\?/g;
  for (const m of src.matchAll(polaTernary)) {
    const titikDua = src.indexOf(":", m.index + m[0].length);
    const akhir = src.indexOf("\n", titikDua < 0 ? m.index : titikDua);
    zonaSah.push({ a: m.index, b: akhir < 0 ? src.length : akhir });
  }

  // Bentuk ketiga (ditambahkan Fase 17d): pembantu `L(lang, "id", "en")` yang
  // dipakai landing page. Sama sahnya dengan ternary di atas — sisi Indonesia
  // memang harus ada — tetapi selama ini tak dikenali, sehingga SELURUH teks
  // landing (69 potong) terhitung utang padahal halaman itu sudah dwibahasa
  // sejak Fase 13d. Angka utang yang salah lebih berbahaya daripada tidak ada
  // angka: ia membuat halaman yang sudah selesai terlihat belum digarap.
  // `\bL\(` aman: pada `HTML(` huruf L didahului M, jadi tak ada batas kata.
  zonaSah.push(...rentang("L", "SAH"));

  // Tabel-lookup dwibahasa (Fase 19s) — lihat komentar zonaTabelDwibahasa.
  const tabel = zonaTabelDwibahasa(src);
  zonaSah.push(...tabel.sah);
  for (const b of tabel.bolong) {
    totalBolong++;
    console.log(`  ⚠️  ${file}:${b.baris}  ${b.pesan}`);
  }

  // Pakai TUMPANG-TINDIH rentang, bukan sekadar posisi awal: potongan teks JSX
  // sering dimulai tepat SEBELUM `downloadCsv(` sehingga awalnya di luar zona
  // padahal isinya jelas milik panggilan itu.
  const jenisDari = (a, b = a) => {
    const tumpang = (z) => a <= z.b && b >= z.a;
    if (zonaSah.some(tumpang)) return "SAH";
    const z = zona.find(tumpang);
    return z ? z.jenis : "LAYAR";
  };

  /**
   * KUNCI objek, bukan teks layar (Fase 21g).
   *
   * `{ "pengurai-gagal": "pindaiPenguraiGagal" }` — sisi kirinya nama varian
   * tipe, tak pernah sampai ke layar, tetapi mengandung kata "gagal" sehingga
   * terhitung utang. Memperbaiki nama sebuah varian jadi MENAIKKAN utang, dan
   * penyapu berhenti berguna sebagai penanda kemajuan — kelas persoalan yang
   * sama dengan atribut `${…}` di Fase 21e.
   *
   * Yang membedakan kunci dari cabang ternary (`x ? "Aktif" : "Mati"`, yang
   * JUSTRU teks layar dan wajib tetap terhitung) adalah karakter sebelumnya:
   * kunci didahului `{` atau `,`, cabang ternary didahului `?`. Karena itu
   * keduanya diperiksa, bukan sekadar tanda titik dua sesudahnya.
   */
  const kunciObjek = (awal, akhir) => {
    if (!/^\s*:/.test(src.slice(akhir))) return false;
    let i = awal - 1;
    while (i >= 0 && /\s/.test(src[i])) i--;
    return i < 0 || src[i] === "{" || src[i] === ",";
  };

  /**
   * Nilai atribut `data-*` (Fase 22a) — penanda untuk gerbang, bukan teks
   * layar. `data-testid="reval-hasil"` terhitung utang hanya karena "hasil"
   * ada di kosakata penanda; menerjemahkannya justru akan MERUSAK ceknya.
   *
   * Sengaja hanya `data-*`: `aria-label` memang teks tampilan (dibacakan
   * pembaca layar) dan tetap dijaga lewat ATRIBUT_TAMPILAN di bawah.
   */
  // `{?` (Fase 54i): nilainya bisa untai langsung (`data-testid="a"`) atau
  // ekspresi JSX (``data-testid={`a-${x}`}``). Keduanya penanda yang sama.
  const nilaiDataAttr = (awal) => /\bdata-[a-z-]+=\{?$/.test(src.slice(Math.max(0, awal - 40), awal));

  /**
   * Nilai `id=` / `htmlFor=` (Fase 22c) — PENGENAL elemen, bukan teks layar.
   *
   * `htmlFor="kk-dana-tetap-input"` terhitung utang karena "dana" ada di
   * kosakata penanda, padahal string itu tak pernah dibaca siapa pun: ia hanya
   * menyambungkan <label> ke <input>. Menerjemahkannya JUSTRU memutus sambungan
   * itu — utang yang, kalau "dibayar", merusak aksesibilitas halaman.
   *
   * Ini kelas yang sama dengan `data-*` di Fase 22a, dan sudah lama ada di
   * angkanya: `csv-mutasi` dan `bank-recon` sudah terhitung sejak sebelum fase
   * ini. Sengaja TIDAK mencakup `aria-*` maupun `placeholder`/`title` — ketiganya
   * memang sampai ke pengguna dan tetap wajib terhitung.
   *
   * `testId` ikut sejak Fase 50c, dan bukan kelas baru: prop itu diteruskan
   * apa adanya menjadi `data-testid={testId}` di `components/ui.tsx`, jadi ia
   * PERSIS kelas `data-*` di atas — hanya ejaannya yang berbeda karena lewat
   * prop React, bukan atribut DOM langsung. Penanda gerbang yang "diterjemahkan"
   * akan mematahkan ui-sim yang mencarinya.
   */
  const nilaiPengenal = (awal) =>
    /\b(?:id|htmlFor|testId)\s*=\s*\{?$/.test(src.slice(Math.max(0, awal - 40), awal));

  /**
   * Pesan `throw new Error(...)` — dibaca PENGEMBANG, bukan pengguna (Fase 56b).
   *
   * `throw new Error("WorkspaceContext belum tersedia")` menandai kesalahan
   * pemasangan komponen: ia meledak saat pengembangan dan tidak pernah sampai
   * ke layar pelanggan. Menerjemahkannya berarti menaruh naskah dwibahasa di
   * tempat yang tidak pernah dibaca siapa pun, sambil membuat pesan galat lebih
   * sulit dicari di dalam kode.
   */
  const pesanPengembang = (awal) => /\bnew Error\($/.test(src.slice(Math.max(0, awal - 20), awal));

  /**
   * PENGENAL berhuruf kecil, bukan kalimat layar (Fase 56b).
   *
   * `"pembelian"`, `"saldo_menurun"`, `"bank-recon"`, `"produk.csv"`,
   * `"./stok"`, `"__manual__"` — nilai enum kontrak API, kunci cache
   * TanStack Query, nama berkas unduhan, jalur impor, dan nilai sentinel.
   * Semuanya ikut terhitung utang hanya karena kata Indonesianya ada di
   * kosakata penanda, padahal tak satu pun pernah sampai ke layar; beberapa
   * (nilai enum, kunci cache) JUSTRU rusak kalau diterjemahkan — versi Inggris
   * dan Indonesia akan memakai cache berbeda untuk data yang sama, dan filter
   * yang mengirim `"purchase"` ke API tidak akan cocok dengan apa pun.
   *
   * Keputusannya sendiri bukan hal baru: saringan ATRIBUT_TAMPILAN sudah
   * membuang `/^[a-z0-9-]+$/` sejak Fase 19t dengan alasan yang sama. Yang baru
   * hanyalah menerapkan keputusan itu di tempat kedua ia berlaku —
   * kelas yang sama dengan glob `pages/*.tsx` di Fase 20m: aturan yang benar,
   * dipasang di sebagian tempat saja.
   *
   * Sengaja menuntut SELURUH untai berhuruf kecil tanpa spasi. Naskah layar
   * Indonesia berbentuk kalimat: ia punya spasi, atau diawali huruf besar.
   */
  const nilaiPengenalKecil = (teks) =>
    /^[.a-z0-9_][a-z0-9._/-]*$/.test(teks) && /[a-z]/.test(teks);

  /**
   * Isi template CSV: tajuk kolom dan baris contohnya (Fase 56b).
   *
   * `templateHeaders={["jenis","nama","satuan"]}` dan `templateExample={[…]}`
   * adalah KONTRAK BERKAS, bukan naskah. Tajuknya dipakai pengurai impor untuk
   * memetakan kolom, dan nilai contohnya ("tidak" pada kolom lacak_exp) memang
   * diurai kembali oleh importirnya. Menerjemahkannya mematahkan impor CSV
   * pelanggan yang memakai bahasa Inggris — persis kebalikan dari yang
   * dimaksudkan.
   */
  const isiTemplateCsv = (awal) => {
    const sebelum = src.slice(Math.max(0, awal - 300), awal);
    const buka = Math.max(sebelum.lastIndexOf("templateHeaders"), sebelum.lastIndexOf("templateExample"));
    if (buka === -1) return false;
    const sisa = sebelum.slice(buka);
    return (sisa.match(/\[/g)?.length ?? 0) > (sisa.match(/\]/g)?.length ?? 0);
  };

  /**
   * Sisi INGGRIS sebuah pasangan dwibahasa (Fase 56b).
   *
   * `{ id: "Pajak: PPN, PPh final", en: "Tax: VAT, final income tax" }` —
   * nilai `en:` sudah berbahasa Inggris menurut definisinya. Ia terhitung utang
   * hanya karena memuat istilah yang juga ada di kosakata Indonesia
   * ("e-Faktur", "Coretax", "BPJS") — nama yang memang tidak diterjemahkan di
   * bahasa mana pun.
   *
   * Menghitungnya berarti penyapu menagih terjemahan atas terjemahan, dan
   * pasangan yang SUDAH lengkap justru menaikkan utangnya.
   */
  const sisiInggris = (awal) => /\ben\s*:\s*$/.test(src.slice(Math.max(0, awal - 12), awal));

  /**
   * KERANGKA MARKUP dibuang, ISINYA tetap ditagih (Fase 56b).
   *
   * Dua sumbernya. Template literal yang merakit HTML jendela cetak, dan —
   * lebih sering — pola teks JSX `[>}]…[<{]` yang ikut menangkap ATRIBUT yang
   * duduk di antara dua ekspresi:
   *
   *   className={`… ${x}`}
   *   role="dialog" aria-modal="true" aria-label={u("shMenuNavigasi")}
   *
   * Potongan di tengah itu sumber JSX, bukan sesuatu yang dibaca pemakai.
   *
   * Yang penting: potongan semacam ini TIDAK dilewati begitu saja. Kerangkanya
   * dibuang lalu SISANYA dinilai ulang — karena satu potongan bisa memuat
   * keduanya sekaligus, dan halaman cetak surat jalan adalah contohnya:
   *
   *   `</div> <table><thead><tr><th>Barang</th><th class="r">Jumlah</th>…`
   *
   * Melewati potongan itu hanya karena ia memuat `class="` akan menyembunyikan
   * "Barang" dan "Jumlah" — naskah cetak yang betul-betul dibaca pelanggan.
   * Sesudah kerangkanya dibuang, keduanya tetap tertagih.
   */
  const sisaTanpaMarkup = (teks) =>
    teks
      .replace(/<[^>]*>/g, " ")                        // tag utuh
      .replace(/[A-Za-z][\w-]*=\\?"[^"]*\\?"/g, " ")   // pasangan atribut
      .replace(/[A-Za-z][\w-]*=\s*$/, " ")             // atribut bernilai ekspresi
      .replace(/^[^<>]*>/, " ")                        // ekor tag yang terpotong
      .replace(/<[^<>]*$/, " ");                       // kepala tag yang terpotong

  /**
   * CONTOH ISI BERKAS CSV yang ditempelkan pemakai (Fase 56b).
   *
   * `"kode,debit,kredit\n1-1000,5000000,0\n…"` di halaman migrasi dan
   * `"2026-07-01;TRSF DARI PT MAJU;5000000\n…"` di kas & bank memang tampil di
   * layar — sebagai contoh dan placeholder — tetapi isinya KONTRAK BERKAS:
   * tajuk kolomnya dipetakan oleh pengurai impor. Menerjemahkan `kode,debit,
   * kredit` berarti menunjukkan contoh yang akan DITOLAK saat ditempel. Kelas
   * yang sama dengan `isiTemplateCsv` di atas, hanya berbentuk satu untai.
   *
   * Dikenali dari bentuknya, bukan dari lokasinya: beberapa baris yang tiap
   * barisnya punya jumlah pemisah `,`/`;` yang sama dan bukan nol. Prosa tidak
   * berperilaku begitu.
   */
  const contohBerkasCsv = (teks) => {
    const baris = teks.split("\n").filter((b) => b.trim() !== "");
    if (baris.length < 2) return false;
    for (const pemisah of [",", ";"]) {
      const n = baris[0].split(pemisah).length - 1;
      if (n > 0 && baris.every((b) => b.split(pemisah).length - 1 === n)) return true;
    }
    return false;
  };

  for (const m of src.matchAll(/(?:^|[^\w])"((?:[^"\\]|\\.)*)"/gm)) {
    const akhir = m.index + m[0].length;
    const awalKutip = akhir - m[1].length - 2;
    if (kunciObjek(awalKutip, akhir)) continue;
    if (nilaiDataAttr(awalKutip)) continue;
    if (nilaiPengenal(awalKutip)) continue;
    if (pesanPengembang(awalKutip)) continue;
    if (isiTemplateCsv(awalKutip)) continue;
    if (sisiInggris(awalKutip)) continue;
    if (nilaiPengenalKecil(m[1])) continue;
    if (contohBerkasCsv(m[1].replace(/\\n/g, "\n"))) continue;
    if (isID(m[1])) add(jenisDari(m.index, akhir), m[1], m.index);
  }
  /*
   * Fase 54i — pengecualian `data-*` dan pengenal berlaku juga di sini.
   *
   * Kedua pengecualian di atas hanya diterapkan pada untai berkutip ganda,
   * sehingga `data-testid="kartu-a"` dikecualikan tetapi
   * ``data-testid={`kartu-${x}`}`` tidak — penanda gerbang yang sama, hanya
   * ditulis dengan sintaks lain. Kelas yang sama dengan glob `pages/*.tsx`
   * yang tidak turun ke subfolder (Fase 20m): aturan yang benar, diterapkan
   * pada sebagian tempat saja, dan selisihnya tidak terlihat siapa pun.
   */
  for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/gs)) {
    if (nilaiDataAttr(m.index) || nilaiPengenal(m.index)) continue;
    for (const seg of potonganStatis(m[1]))
      if (isID(seg) && isID(sisaTanpaMarkup(seg)) && !nilaiPengenalKecil(seg.trim()))
        add(jenisDari(m.index, m.index + m[0].length), seg, m.index);
  }
  /**
   * Potongan yang jelas KODE, bukan teks JSX (Fase 43a).
   *
   * Pola `[>}]…[<{]` di bawah menangkap teks JSX di antara dua tag — tetapi ia
   * juga menangkap pernyataan JavaScript biasa yang kebetulan duduk di antara
   * `}` penutup dan `{` pembuka, misalnya:
   *
   *   });
   *   const akun = cashAccountId || cashAccounts[0]?.id;
   *   const bayar = useMutation({
   *
   * Karena repo ini menamai variabel dalam bahasa Indonesia (dan memang harus),
   * potongan semacam itu mengandung kata penanda — `akun` — lalu terhitung
   * sebagai utang teks layar. Akibatnya sama persis dengan yang sudah dicatat
   * di Fase 21g: MENAMAI variabel dengan benar justru MENAIKKAN angka utang,
   * dan angka yang bergerak ke arah salah berhenti berguna sebagai penanda
   * kemajuan.
   *
   * Penandanya sintaksis, bukan kosakata: teks yang dibaca pengguna tidak
   * pernah memuat titik koma yang disusul kata kunci deklarasi, panah fungsi,
   * `?.`, maupun pembanding ketat `===` / `!==`. Sengaja sesempit itu — kalimat
   * layar yang memuat titik koma saja TETAP terhitung.
   */
  const jelasKode = (t) =>
    /;\s*(const|let|var|return|await|if|for|function)\b/.test(t) ||
    /=>/.test(t) ||
    /\?\./.test(t) ||
    /[=!]==/.test(t) ||
    // Fase 56b — dua bentuk kode lain yang lolos dari pola di atas karena
    // pemisahnya bukan titik koma melainkan kurung penutup atau baris kosong:
    //   `}\n\nconst INVOICE_STATUS_KEY: Record<…`  → deklarasi di awal potongan
    //   `}],\n  ["/kontak", {`                      → sisa larik yang terpotong
    // Teks yang dibaca pemakai tidak pernah dibuka oleh kurung penutup, dan
    // tidak pernah dibuka oleh kata kunci deklarasi. Sengaja TIDAK mencakup
    // koma: `, berikut tagihan faktur` justru naskah layar dan wajib terhitung.
    /^\s*[\])}]/.test(t) ||
    /^\s*(const|let|var|function|export|import|type|interface|return)\b/.test(t);

  for (const m of src.matchAll(/[>}]([^<>{}]+)[<{]/gs))
    if (!jelasKode(m[1]) && isID(m[1]) && isID(sisaTanpaMarkup(m[1])))
      add(jenisDari(m.index, m.index + m[0].length), m[1], m.index);

  /**
   * Kelas buta tersendiri (ditemukan Fase 19t): teks tampilan yang duduk di
   * ATRIBUT — `label="Akun"`, `title="Pendapatan"`, `confirmLabel="Arsipkan"`.
   *
   * Saringan `isID` di atas menuntut ada kata penanda Indonesia, jadi label
   * satu kata seperti "Kode", "Akun", atau "Aksi" lolos begitu saja — padahal
   * `label=` pada <Td> adalah judul kartu yang dibaca pemakai di layar HP, dan
   * `title=` pada <Card> adalah judul kartu yang selalu terlihat.
   *
   * Di sini penandanya bukan kosakata melainkan POSISI: atribut-atribut ini
   * memang berisi teks tampilan, titik. Yang sah hanyalah bentuk `={u("…")}`,
   * dan bentuk itu bukan literal sehingga tidak tertangkap pola ini.
   */
  // `\s*=\s*` (bukan `=` polos) sejak Fase 21b: bentuk NILAI BAWAAN PARAMETER
  // — `label = "Ekspor CSV"` di tanda tangan komponen — luput dari pola lama
  // yang menuntut `=` tanpa spasi. Satu default semacam itu membuat SEBELAS
  // tombol ekspor tetap berbahasa Indonesia di mode Inggris tanpa terlihat.
  const ATRIBUT_TAMPILAN = /\b(label|title|confirmLabel|cancelLabel|placeholder|aria-label)\s*=\s*"([^"]{2,60})"/g;
  for (const m of src.matchAll(ATRIBUT_TAMPILAN)) {
    const teks = m[2];
    // Buang yang jelas bukan kalimat tampilan: kode/slug (huruf kecil berstrip),
    // dan nilai satu kata berbahasa Inggris yang sama di kedua bahasa.
    if (/^[a-z0-9-]+$/.test(teks)) continue;
    if (NETRAL.has(teks)) continue;
    // Nilai yang SELURUHNYA interpolasi (`placeholder="${u("x")}"`) sudah lewat
    // kamus — itu justru bentuk yang benar. Tanpa pengecualian ini, memperbaiki
    // sebuah atribut malah MENAIKKAN utangnya, dan penyapu berhenti berguna
    // sebagai penanda kemajuan (Fase 21e: cuplikan HTML di halaman CRM).
    if (teks.trim().startsWith("${")) continue;
    if (jenisDari(m.index, m.index + m[0].length) !== "LAYAR") continue;
    add("ATRIBUT", `${m[1]}="${teks}"`, m.index);
  }

  const rows = [...hits.values()].sort((a, b) => a.baris - b.baris);
  const layar = rows.filter((r) => r.jenis === "LAYAR");
  const atribut = rows.filter((r) => r.jenis === "ATRIBUT");
  totalLayar += layar.length;
  totalAtribut += atribut.length;
  const ringkas = `${file}: LAYAR=${layar.length} ATRIBUT=${atribut.length} TOAST=${rows.filter((r) => r.jenis === "TOAST").length} BERKAS=${rows.filter((r) => r.jenis === "BERKAS").length}`;
  console.log(layar.length === 0 && atribut.length === 0 ? `BERSIH ✅ ${ringkas}` : ringkas);
  for (const r of layar) console.log(`  ${String(r.baris).padStart(4)}  ${JSON.stringify(r.teks.slice(0, 95))}`);
  for (const r of atribut) console.log(`  ${String(r.baris).padStart(4)}  [atribut] ${r.teks.slice(0, 95)}`);
}
console.log(`\nTOTAL utang teks layar: ${totalLayar}  (ambang ${AMBANG.layar})`);
console.log(`TOTAL teks tampilan di atribut: ${totalAtribut}  (ambang ${AMBANG.atribut})`);

// Ambang (Fase 56b) — angkanya hanya boleh TURUN.
//
// Sampai fase ini penyapu ini hanya MENGHITUNG. CI menjalankannya dengan
// `> /dev/null` dan hanya peduli pada dua kelas BUG (u() harfiah, menu tanpa
// padanan Inggris), jadi utang teks layar bisa naik tanpa ada yang tahu — dan
// selama Fase 38 memang begitu: angkanya tercatat "tidak naik" di roadmap
// karena kebetulan, bukan karena dijaga. Pola ambangnya menyalin
// `sapu-warna.mjs` (Fase 31a), yang sudah membuktikan bentuk ini bekerja.
const naik = [];
if (totalLayar > AMBANG.layar) naik.push(`teks layar ${totalLayar} > ${AMBANG.layar}`);
if (totalAtribut > AMBANG.atribut) naik.push(`atribut ${totalAtribut} > ${AMBANG.atribut}`);
if (naik.length) {
  console.error(
    `\n✗ Utang dwibahasa NAIK: ${naik.join(", ")}.\n` +
      `  Pakai kalimat utuh dari kamus (apps/web/src/i18n/ui.ts) lewat u("kunci"),\n` +
      `  dan isi() untuk kalimat berlubang {0}. Kalau temuannya BUKAN teks layar\n` +
      `  (nilai enum, kunci cache, nama berkas, penanda gerbang), perluas\n` +
      `  pengecualian di skrip ini dengan alasan tertulis — jangan longgarkan\n` +
      `  polanya.`,
  );
  process.exitCode = 1;
} else if (totalLayar < AMBANG.layar || totalAtribut < AMBANG.atribut) {
  console.log(
    `\n↓ Utang berkurang. Turunkan AMBANG di scripts/sapu-i18n.mjs menjadi ` +
      `{ layar: ${totalLayar}, atribut: ${totalAtribut} } agar tidak bisa naik lagi.`,
  );
}
if (totalHarfiah > 0) {
  console.log(`TOTAL panggilan u() harfiah (BUG, bukan sekadar utang): ${totalHarfiah}`);
  process.exitCode = 1;
}
if (totalBolong > 0) {
  console.log(`TOTAL item menu tanpa padanan Inggris (BUG, bukan sekadar utang): ${totalBolong}`);
  process.exitCode = 1;
}
