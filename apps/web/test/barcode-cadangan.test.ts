import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Pengurai barcode cadangan (Fase 21g) — WebAssembly untuk peramban tanpa
 * `BarcodeDetector` bawaan, yaitu Safari/WebKit di iOS.
 *
 * Fase 20i menolak cadangan ini dengan alasan "tidak bisa dijalankan gerbang
 * mana pun". Alasan itu ternyata tidak utuh: `detect()` menerima gambar DIAM,
 * jadi pengurainya bisa diuji tanpa kamera sama sekali. Berkas inilah
 * pembuktiannya, dan syarat sebelum fitur ini boleh dibangun.
 *
 * Batas ujinya dinyatakan supaya tidak disalahartikan: yang diuji di sini
 * hanyalah PENGURAI-nya. Perkabelan `?url` khusus Vite dan pembacaan dari
 * bingkai kamera diuji end-to-end di ui-sim (`F38*`) memakai kamera palsu
 * Chromium — bukan di sini.
 */

const dir = fileURLToPath(new URL(".", import.meta.url));
const req = createRequire(import.meta.url);

/** Fixture 259 byte; dibuat ulang dengan `node scripts/lib/ean13.mjs <kode> <png>`. */
const KODE = "8990011112224";
const pngBarcode = readFileSync(`${dir}fixtures/ean13-${KODE}.png`);

type Ponyfill = typeof import("barcode-detector/ponyfill");
let pony: Ponyfill;

beforeAll(async () => {
  pony = await import("barcode-detector/ponyfill");

  // `boundingBox` dibungkus `DOMRectReadOnly`, yang tidak ada di Node. Uji ini
  // tentang digit yang terbaca, bukan tentang geometri — jadi kelas itu cukup
  // dipenuhi seadanya alih-alih menyeret seluruh jsdom ke dalam suite.
  (globalThis as unknown as Record<string, unknown>).DOMRectReadOnly ??= class {
    constructor(
      public x: number,
      public y: number,
      public width: number,
      public height: number,
    ) {}
  };

  // Di peramban berkas wasm-nya dimuat lewat URL aset Vite. Di Node URL itu
  // tidak ada, jadi binernya diberikan langsung dari node_modules.
  const reqPony = createRequire(req.resolve("barcode-detector/ponyfill"));
  const wasm = readFileSync(reqPony.resolve("zxing-wasm/reader/zxing_reader.wasm"));
  pony.prepareZXingModule({
    overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) },
    fireImmediately: true,
  });
}, 60_000);

describe("pengurai barcode cadangan (Fase 21g)", () => {
  it("membaca digit EAN-13 dari gambar diam, tanpa kamera", async () => {
    const detektor = new pony.BarcodeDetector({ formats: ["ean_13"] });
    const hasil = await detektor.detect(new Blob([pngBarcode], { type: "image/png" }));
    expect(hasil.map((h) => h.rawValue)).toEqual([KODE]);
    expect(hasil[0]?.format).toBe("ean_13");
  });

  it("gambar tanpa barcode mengembalikan daftar kosong, bukan melempar", async () => {
    const detektor = new pony.BarcodeDetector({ formats: ["ean_13"] });
    // Logo aplikasi: gambar sah, tanpa barcode. Melempar di sini akan
    // menghentikan putaran pemindaian pada bingkai pertama yang kosong —
    // yaitu hampir setiap bingkai saat kasir masih mengarahkan kameranya.
    const hasil = await detektor.detect(
      new Blob([readFileSync(`${dir}../public/favicon.png`)], { type: "image/png" }),
    );
    expect(hasil).toEqual([]);
  });

  it("satu-satunya salinan zxing-wasm dipakai bersama ponyfill dan bundel web", () => {
    // `apps/web` menyebut `zxing-wasm` langsung (untuk impor `?url` berkas
    // wasm-nya), sementara `barcode-detector` menyebutnya sebagai dependensi
    // sendiri. Bila keduanya menunjuk versi berbeda, bundel akan memuat biner
    // wasm dari satu versi dengan kode perekat JavaScript dari versi lain —
    // gagalnya baru terlihat di perangkat, bukan di build.
    const reqPony = createRequire(req.resolve("barcode-detector/ponyfill"));
    expect(reqPony.resolve("zxing-wasm/reader/zxing_reader.wasm")).toBe(
      req.resolve("zxing-wasm/reader/zxing_reader.wasm"),
    );
  });
});
