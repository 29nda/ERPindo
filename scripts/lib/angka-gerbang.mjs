// Penjaga angka gerbang (Fase 50a).
//
// ## Kenapa gerbang ini ada
//
// `docs/05-runbook-go-live.md` dan `docs/STATUS.md` menyebut jumlah pemeriksaan
// otomatis sebagai angka: "1.157 smoke · 917 unit", "424 cek browser". Keduanya
// dokumen yang dibaca PEMILIK — yang pertama dipakai pada hari peluncuran, yang
// kedua adalah laporan keadaan produk.
//
// Angka itu ditulis tangan, dan sejak Fase 38r sampai Fase 49 jumlah cek naik
// dari 2.498 menjadi 2.890 tanpa satu pun dokumen ikut berubah. Tidak ada yang
// bisa melihatnya: Markdown tidak dikompilasi, jadi angka basi tidak pernah
// memunculkan galat. Persis kelas cacat yang melahirkan
// `periksa-tautan-dokumen.mjs` — dokumen yang sama, sebab yang sama.
//
// Ironinya khas: repo ini menegakkan "jumlah cek hanya boleh naik", lalu
// menerbitkan angka yang tidak pernah naik. Yang salah bukan angkanya, tapi
// tidak adanya gerbang. Ini gerbangnya.
//
// ## Cara kerjanya
//
// Yang tahu jumlah cek sebenarnya adalah gerbang yang MENGHASILKANNYA —
// smoke tahu jumlah smoke, ui-sim tahu jumlah browser, pembungkus `pnpm test`
// tahu jumlah unit. Jadi pemeriksaan ditaruh di sana, bukan di skrip terpisah
// yang harus menjalankan ulang semuanya. Tiap pemanggil menyetor angka yang
// baru saja ia buktikan; helper ini mencocokkannya dengan yang tertulis.
//
// Totalnya diperiksa secara aritmetika terhadap ketiga angka yang TERTULIS,
// sehingga pemanggil mana pun bisa menangkap total yang tidak konsisten —
// bahkan untuk angka yang bukan miliknya.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Jalur dokumen dihitung dari letak berkas ini, bukan dari cwd: pemanggilnya
// berjalan dari direktori berbeda-beda (smoke dari `apps/api`, ui-sim dari
// akar), dan gerbang yang lulus hanya karena berkasnya "tidak ketemu" adalah
// gerbang yang mati diam-diam.
const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Blok kutipan angka di dokumen tayang.
 *
 *  `docs/log/` sengaja TIDAK masuk: log fase adalah catatan sejarah — angkanya
 *  memang harus beku pada tanggal itu. Begitu juga kolom "Sebelum" di tabel
 *  STATUS: itu potret fase sebelumnya, bukan klaim tentang keadaan sekarang.
 *  Yang dijaga hanya angka yang mengaku menggambarkan KEADAAN SAAT INI. */
const BLOK = [
  {
    id: "runbook",
    berkas: "docs/05-runbook-go-live.md",
    kutipan: [
      // - [ ] `pnpm typecheck && ...` (**1.299 smoke · 1.117 unit**)
      { gerbang: "smoke", pola: /\*\*([\d.]+) smoke · [\d.]+ unit\*\*/ },
      { gerbang: "unit", pola: /\*\*[\d.]+ smoke · ([\d.]+) unit\*\*/ },
      { gerbang: "browser", pola: /\*\*([\d.]+) cek browser\*\*/ },
    ],
  },
  {
    // Kalimat penutup laporan pemilik — satu-satunya tempat totalnya disebut.
    id: "status-kalimat",
    berkas: "docs/STATUS.md",
    total: true,
    kutipan: [
      { gerbang: "smoke", pola: /\*\*([\d.]+) skenario ujian end-to-end/ },
      { gerbang: "unit", pola: /end-to-end \+ ([\d.]+) unit test/ },
      { gerbang: "browser", pola: /\+ ([\d.]+) cek simulasi UI browser nyata/ },
      { gerbang: "total", pola: /totalnya \*\*([\d.]+) pemeriksaan\*\*/ },
    ],
  },
  {
    // Tabel "Angka pemeriksaan" — hanya kolom "Sekarang" yang dijaga.
    id: "status-tabel",
    berkas: "docs/STATUS.md",
    kutipan: [
      { gerbang: "unit", pola: /\| Uji unit \| [\d.]+ \| \*\*([\d.]+)\*\* \|/ },
      {
        gerbang: "smoke",
        pola: /\| Uji ujung-ke-ujung \(smoke\) \| [\d.]+ \| \*\*([\d.]+)\*\* \|/,
      },
      {
        gerbang: "browser",
        pola: /\| Simulasi klik di peramban nyata \| [\d.]+ \| \*\*([\d.]+)\*\* \|/,
      },
    ],
  },
];

const NAMA = {
  smoke: "skenario smoke",
  unit: "unit test",
  browser: "cek browser",
  total: "total pemeriksaan",
};

/** "1.299" → 1299. Pemisah ribuan Indonesia adalah titik. */
function keAngka(teks) {
  return Number(teks.replace(/\./g, ""));
}

/** 1299 → "1.299". Dipakai untuk pesan galat yang bisa langsung disalin. */
export function keTeks(n) {
  return new Intl.NumberFormat("id-ID").format(n);
}

/**
 * Membaca semua angka yang tertulis di dokumen tayang.
 * Kutipan yang TIDAK ketemu dianggap galat, bukan diabaikan diam-diam:
 * gerbang yang berhenti menemukan apa yang dijaganya adalah gerbang mati.
 */
function bacaKutipan() {
  const hasil = [];
  const galat = [];
  for (const blok of BLOK) {
    let isi;
    try {
      isi = readFileSync(join(AKAR, blok.berkas), "utf8");
    } catch {
      galat.push(`${blok.berkas} tidak terbaca — dokumen tayang hilang atau berpindah`);
      continue;
    }
    for (const k of blok.kutipan) {
      const cocok = isi.match(k.pola);
      if (!cocok) {
        galat.push(
          `${blok.berkas} (${blok.id}): kutipan ${NAMA[k.gerbang]} tidak ditemukan ` +
            `lagi — kalimatnya diubah tanpa memperbarui penjaganya`,
        );
        continue;
      }
      hasil.push({
        berkas: blok.berkas,
        blok: blok.id,
        total: blok.total === true,
        gerbang: k.gerbang,
        nilai: keAngka(cocok[1]),
      });
    }
  }
  return { hasil, galat };
}

/**
 * Mencocokkan angka nyata dengan yang tertulis.
 *
 * @param {Record<string, number>} nyata  Angka yang BARU SAJA dibuktikan
 *   pemanggil, mis. `{ smoke: 1299 }`. Gerbang yang tidak disetor tidak
 *   diperiksa nilainya — tapi tetap ikut dalam pemeriksaan total.
 * @returns {{ ok: boolean, pesan: string[] }}
 */
export function periksaAngkaGerbang(nyata) {
  const { hasil, galat } = bacaKutipan();
  const pesan = [...galat];

  for (const { berkas, blok, gerbang, nilai } of hasil) {
    const benar = nyata[gerbang];
    if (benar === undefined) continue;
    if (nilai !== benar) {
      pesan.push(
        `${berkas} (${blok}): ${NAMA[gerbang]} tertulis ${keTeks(nilai)}, ` +
          `nyatanya ${keTeks(benar)} — perbarui angkanya`,
      );
    }
  }

  // Total diperiksa terhadap angka yang TERTULIS, bukan yang nyata: kalau ada
  // bagian yang basi, barisnya sendiri sudah memerah di atas. Yang dijaga di
  // sini adalah aritmetikanya — total yang tidak menjumlah bagian-bagiannya
  // adalah salah bahkan ketika semua bagiannya benar.
  const tertulis = Object.fromEntries(
    hasil.filter((h) => h.total).map((h) => [h.gerbang, h.nilai]),
  );
  if (["smoke", "unit", "browser", "total"].every((g) => tertulis[g] !== undefined)) {
    const jumlah = tertulis.smoke + tertulis.unit + tertulis.browser;
    if (jumlah !== tertulis.total) {
      pesan.push(
        `docs/STATUS.md (status-kalimat): total tertulis ${keTeks(tertulis.total)}, ` +
          `tapi ${keTeks(tertulis.smoke)} + ${keTeks(tertulis.unit)} + ` +
          `${keTeks(tertulis.browser)} = ${keTeks(jumlah)}`,
      );
    }
  }

  return { ok: pesan.length === 0, pesan };
}

/**
 * Bentuk siap-pakai untuk dipanggil di ujung sebuah gerbang: mencetak
 * kegagalannya sendiri dan mengembalikan jumlah kegagalan, agar pemanggil
 * bisa menambahkannya ke penghitungnya.
 */
export function laporAngkaGerbang(nyata) {
  const { ok, pesan } = periksaAngkaGerbang(nyata);
  if (ok) return 0;
  console.error("\nANGKA GERBANG DI DOKUMEN TAYANG SUDAH BASI:");
  for (const p of pesan) console.error(`  ✗ ${p}`);
  return pesan.length;
}
