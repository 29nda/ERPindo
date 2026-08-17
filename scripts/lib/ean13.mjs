/**
 * Pembangkit barcode EAN-13 untuk kebutuhan PENGUJIAN (Fase 21g).
 *
 * Ada di `scripts/lib` dan bukan di `packages/shared` karena ini bukan kode
 * produk: satu-satunya pemakainya adalah gerbang. Dua gerbang memerlukannya,
 * dan keduanya butuh bentuk berkas yang berbeda — karena itu satu berkas ini
 * jadi sumber tunggalnya, bukan dua tabel sandi yang bisa menyimpang:
 *
 * - `pngEan13()` → gambar diam untuk uji unit pengurai (`apps/web/test`).
 * - `y4mEan13()` → umpan kamera palsu Chromium (`--use-file-for-fake-video-
 *   capture`) sehingga ui-sim bisa memindai barcode sungguhan tanpa kamera.
 *
 * Dijalankan langsung untuk membuat ulang fixture:
 *   node scripts/lib/ean13.mjs 8990011112224 apps/web/test/fixtures/ean13.png
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

// Sandi kiri-ganjil (L), kiri-genap (G), dan kanan (R = kebalikan bit L).
const L = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011",
];
const G = [
  "0100111", "0110011", "0011011", "0100001", "0011101",
  "0111001", "0000101", "0010001", "0001001", "0010111",
];
const R = L.map((s) => [...s].map((c) => (c === "0" ? "1" : "0")).join(""));

// Digit pertama EAN-13 tidak digambar sebagai bar; ia dikodekan lewat POLA
// PARITAS enam digit kiri. Inilah bagian yang paling mudah salah, dan yang
// membuat "gambar bergaris apa saja" tidak akan pernah terbaca pemindai.
const PARITAS = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
];

/** Digit cek EAN-13 (modulo 10, bobot 1-3 dari kanan). */
export function cekDigitEan13(dua_belas) {
  const d = [...dua_belas].map(Number);
  const jumlah = d.reduce((t, n, i) => t + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (jumlah % 10)) % 10;
}

/** Deret 95 modul (1 = bar hitam) untuk satu kode EAN-13 13 digit. */
export function modulEan13(kode) {
  if (!/^\d{13}$/.test(kode)) throw new Error(`EAN-13 harus 13 digit: ${kode}`);
  if (Number(kode[12]) !== cekDigitEan13(kode.slice(0, 12))) {
    // Sengaja menolak: barcode dengan digit cek salah TIDAK akan pernah dibaca
    // pemindai mana pun, jadi memakainya sebagai fixture berarti menguji
    // kegagalan sambil mengira sedang menguji keberhasilan.
    throw new Error(`digit cek EAN-13 salah untuk ${kode}, seharusnya ${cekDigitEan13(kode.slice(0, 12))}`);
  }
  const d = [...kode].map(Number);
  const p = PARITAS[d[0]];
  let s = "101";
  for (let i = 1; i <= 6; i++) s += (p[i - 1] === "L" ? L : G)[d[i]];
  s += "01010";
  for (let i = 7; i <= 12; i++) s += R[d[i]];
  return s + "101";
}

// --- PNG 8-bit skala abu-abu, tanpa dependensi -----------------------------

function crc32(buf) {
  const tabel = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabel[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = tabel[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipe, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const isi = Buffer.concat([Buffer.from(tipe, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(isi));
  return Buffer.concat([len, isi, crc]);
}

/** Gambar diam PNG berisi barcode, dengan zona sunyi di kiri-kanan. */
export function pngEan13(kode, { skala = 3, tinggi = 70, quiet = 12 } = {}) {
  const modul = modulEan13(kode);
  const lebar = (modul.length + quiet * 2) * skala;
  const baris = Buffer.alloc(lebar, 255);
  for (let i = 0; i < modul.length; i++) {
    if (modul[i] === "1") baris.fill(0, (i + quiet) * skala, (i + quiet + 1) * skala);
  }
  const putih = Buffer.alloc(lebar, 255);
  const margin = 10;
  const total = tinggi + margin * 2;
  const mentah = Buffer.concat(
    Array.from({ length: total }, (_, y) =>
      Buffer.concat([Buffer.from([0]), y < margin || y >= margin + tinggi ? putih : baris]),
    ),
  );
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lebar, 0);
  ihdr.writeUInt32BE(total, 4);
  ihdr[8] = 8; // kedalaman bit
  ihdr[9] = 0; // skala abu-abu
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(mentah, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Satu bingkai YUV4MPEG2 (I420) berisi barcode — format yang diterima
 * `--use-file-for-fake-video-capture`. Chromium memutar berkasnya berulang,
 * jadi satu bingkai sudah cukup untuk kamera yang "selalu menyorot barcode".
 *
 * Nilai terang 235 / gelap 16 dipakai, bukan 255/0: umpan kamera diperlakukan
 * sebagai video rentang terbatas (limited range), dan memakai 255/0 membuat
 * nilainya terpotong saat dikonversi ke RGB.
 */
export function y4mEan13(kode, { lebar = 640, tinggi = 480, skala = 5, tinggiBar = 220 } = {}) {
  const modul = modulEan13(kode);
  const lebarBar = modul.length * skala;
  if (lebarBar > lebar) throw new Error("barcode lebih lebar dari bingkai");
  const x0 = Math.floor((lebar - lebarBar) / 2);
  const y0 = Math.floor((tinggi - tinggiBar) / 2);
  const Y = Buffer.alloc(lebar * tinggi, 235);
  for (let i = 0; i < modul.length; i++) {
    if (modul[i] !== "1") continue;
    for (let y = y0; y < y0 + tinggiBar; y++) {
      Y.fill(16, y * lebar + x0 + i * skala, y * lebar + x0 + (i + 1) * skala);
    }
  }
  const kroma = Buffer.alloc((lebar / 2) * (tinggi / 2), 128);
  return Buffer.concat([
    Buffer.from(`YUV4MPEG2 W${lebar} H${tinggi} F30:1 Ip A1:1 C420mpeg2\n`, "ascii"),
    Buffer.from("FRAME\n", "ascii"),
    Y,
    kroma,
    kroma,
  ]);
}

if (process.argv[1]?.endsWith("ean13.mjs") && process.argv[2] && process.argv[3]) {
  const tujuan = process.argv[3];
  writeFileSync(tujuan, tujuan.endsWith(".y4m") ? y4mEan13(process.argv[2]) : pngEan13(process.argv[2]));
  console.log(`ditulis ${tujuan} untuk ${process.argv[2]}`);
}
