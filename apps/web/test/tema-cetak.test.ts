import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Halaman cetak wajib memaksa tema terang (Fase 38i).
 *
 * ## Cacat yang ditemukan
 *
 * Halaman `/cetak/*` menggambar di atas `bg-white` tetap — karena kertas memang
 * putih — tetapi tintanya memakai token yang ikut tema aplikasi. Pengguna yang
 * memasang tema gelap lalu mencetak faktur mendapat **teks krem terang di atas
 * kertas putih**: nyaris kosong.
 *
 * Cacat ini ada sejak token semantik masuk pada Fase 31a dan tidak pernah
 * dilaporkan — kemungkinan besar karena yang mencetak dan yang memakai tema
 * gelap jarang orang yang sama, dan yang mengalaminya menyimpulkan printernya
 * bermasalah.
 *
 * ## Kenapa diuji begini
 *
 * Yang berbahaya bukan kejadiannya, melainkan KELASNYA: tiap token baru yang
 * ditambahkan ke `:root.dark` di kemudian hari akan mengulang cacat yang sama
 * bila lupa ditambahkan ke `.tema-cetak`. Uji ini membandingkan kedua daftar,
 * jadi token yang terlupa menggagalkan build alih-alih menunggu seseorang
 * mencetak dalam tema gelap.
 */

const CSS = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

function tokenDi(selector: string): Set<string> {
  const i = CSS.indexOf(`${selector} {`);
  expect(i, `blok "${selector}" tidak ditemukan`).toBeGreaterThan(-1);
  const blok = CSS.slice(i, CSS.indexOf("\n}", i));
  return new Set([...blok.matchAll(/--erp-([a-z-]+):/g)].map((m) => m[1]!));
}

describe("tema cetak", () => {
  const gelap = tokenDi(":root.dark");
  const cetak = tokenDi(".tema-cetak");

  it("mendefinisikan ulang SETIAP token yang ikut tema gelap", () => {
    const terlupa = [...gelap].filter((t) => !cetak.has(t)).sort();
    expect(terlupa, "token ini akan ikut menggelap saat dicetak").toEqual([]);
  });

  it("nilainya sama dengan tema terang, bukan nilai lain", () => {
    const terang = CSS.slice(CSS.indexOf(":root {"), CSS.indexOf("\n}", CSS.indexOf(":root {")));
    const blokCetak = CSS.slice(
      CSS.indexOf(".tema-cetak {"),
      CSS.indexOf("\n}", CSS.indexOf(".tema-cetak {")),
    );
    const baca = (blok: string) =>
      Object.fromEntries(
        [...blok.matchAll(/--erp-([a-z-]+):\s*(#[0-9a-fA-F]{3,8})/g)].map((m) => [
          m[1]!,
          m[2]!.toLowerCase(),
        ]),
      );
    const t = baca(terang);
    const c = baca(blokCetak);
    for (const [nama, nilai] of Object.entries(c)) {
      expect(nilai, `--erp-${nama} pada .tema-cetak`).toBe(t[nama]);
    }
  });

  it("dipasang pada setiap wadah halaman cetak", () => {
    const print = readFileSync(new URL("../src/pages/print.tsx", import.meta.url), "utf8");
    // Tiap wadah halaman cetak dikenali dari `bg-white` — itulah yang membuat
    // tintanya harus dipaksa terang.
    const wadah = [...print.matchAll(/className="([^"]*bg-white[^"]*)"/g)].map((m) => m[1]!);
    expect(wadah.length, "tidak ada wadah cetak ditemukan").toBeGreaterThan(0);
    for (const k of wadah) {
      expect(k, `wadah cetak tanpa .tema-cetak: "${k.slice(0, 60)}"`).toContain("tema-cetak");
    }
  });
});
