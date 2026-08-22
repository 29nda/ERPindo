import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOKEN_GELAP, TOKEN_TERANG, wordmarkHtml } from "../src/lib/kerangkaPublik";

/**
 * Warna kerangka Worker tidak boleh berpisah dari `styles.css` (Fase 38g).
 *
 * ## Kenapa uji ini ada
 *
 * Worker tidak bisa membaca `apps/web/src/styles.css` saat menyajikan
 * permintaan, jadi nilai warnanya disalin ke `lib/kerangkaPublik.ts`. Salinan
 * berpisah diam-diam — dan kegagalannya persis jenis yang tidak berbunyi di
 * gerbang mana pun: halaman blog akan tetap tampil rapi, hanya dengan warna
 * yang perlahan tidak lagi sama dengan produknya.
 *
 * Itu bukan kekhawatiran karangan. Sebelum fase ini, ketiga kerangka Worker
 * masih memakai biru `#2563eb` di atas `#f8fafc` — palet yang diganti Fase 32a,
 * enam fase sebelumnya, tanpa ada yang menyadarinya.
 *
 * Pola yang dipakai sama dengan `FAQ_LANDING`: satu sumber, plus uji yang
 * mengunci agar tidak berpisah lagi.
 */

const CSS = readFileSync(new URL("../../web/src/styles.css", import.meta.url), "utf8");

/** Ambil nilai `--erp-*` dari sebuah blok selector di `styles.css`. */
function nilaiDari(selector: string): Record<string, string> {
  const i = CSS.indexOf(`${selector} {`);
  expect(i, `blok "${selector}" tidak ditemukan di styles.css`).toBeGreaterThan(-1);
  const blok = CSS.slice(i, CSS.indexOf("\n}", i));
  const keluar: Record<string, string> = {};
  for (const m of blok.matchAll(/--erp-([a-z-]+):\s*(#[0-9a-fA-F]{3,8})/g)) {
    keluar[m[1]!] = m[2]!.toLowerCase();
  }
  return keluar;
}

/** Nama token di kerangka Worker → nama variabel di styles.css. */
const PETA: [keyof typeof TOKEN_TERANG, string][] = [
  ["surface", "surface"],
  ["surfaceSunken", "surface-sunken"],
  ["surfaceMuted", "surface-muted"],
  ["ink", "ink"],
  ["inkSoft", "ink-soft"],
  ["inkMuted", "ink-muted"],
  ["line", "line"],
  ["brandInk", "brand-ink"],
  ["brandSurface", "brand-surface"],
];

describe("token kerangka publik selaras dengan styles.css", () => {
  const terang = nilaiDari(":root");
  const gelap = nilaiDari(":root.dark");

  it.each(PETA)("tema terang: %s sama dengan --erp-%s", (kunci, varCss) => {
    expect(TOKEN_TERANG[kunci].toLowerCase()).toBe(terang[varCss]);
  });

  it.each(PETA)("tema gelap: %s sama dengan --erp-%s", (kunci, varCss) => {
    expect(TOKEN_GELAP[kunci].toLowerCase()).toBe(gelap[varCss]);
  });

  it("tiap token yang dipetakan benar-benar ada di styles.css", () => {
    for (const [, varCss] of PETA) {
      expect(terang[varCss], `--erp-${varCss} (terang)`).toBeTruthy();
      expect(gelap[varCss], `--erp-${varCss} (gelap)`).toBeTruthy();
    }
  });
});

describe("wordmark SSR", () => {
  it("murni teks — tanpa <img>, <svg>, maupun url()", () => {
    const html = wordmarkHtml();
    expect(html).not.toMatch(/<img|<svg|url\(/i);
    expect(html).toContain("ERP");
    expect(html).toContain("indo");
  });

  it("mempertahankan kait uji `data-wordmark` seperti sisi React", () => {
    // Asersi ui-sim F1a mencari `[data-wordmark]`. Kedua sisi harus
    // menyediakannya, kalau tidak kaitnya hanya berlaku separuh.
    expect(wordmarkHtml()).toContain("data-wordmark");
  });
});
