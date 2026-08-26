import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TANGKAPAN } from "../src/pages/publik/teks";

/**
 * Penjaga halaman `/tampilan` (Fase 39d).
 *
 * Halaman tangkapan layar punya satu mode kegagalan yang sangat sunyi: berkas
 * gambarnya hilang atau namanya salah ketik, dan halaman jualan menayangkan
 * sepuluh kotak kosong tanpa satu pun galat. TypeScript tidak bisa melihatnya
 * (jalur gambar hanyalah string), begitu pula eslint dan build — Vite menyalin
 * `public/` apa adanya tanpa memeriksa siapa yang menunjuk ke mana.
 *
 * Uji ini menjadikan gambar yang hilang sebagai kegagalan build.
 */
const DIR = path.join(__dirname, "../public/tampilan");

describe("halaman /tampilan — tangkapan layar", () => {
  it("setiap tangkapan yang disebut naskah benar-benar ada berkasnya", () => {
    const hilang = TANGKAPAN.filter((t) => !existsSync(path.join(DIR, `${t.berkas}.webp`))).map((t) => t.berkas);
    expect(hilang).toEqual([]);
  });

  it("tidak ada berkas kosong atau rusak (nol byte)", () => {
    const kosong = TANGKAPAN.filter((t) => {
      const f = path.join(DIR, `${t.berkas}.webp`);
      return existsSync(f) && statSync(f).size === 0;
    }).map((t) => t.berkas);
    expect(kosong).toEqual([]);
  });

  it("nama berkas unik — dua entri menunjuk gambar sama adalah salah salin", () => {
    const nama = TANGKAPAN.map((t) => t.berkas);
    expect(nama.length).toBe(new Set(nama).size);
  });

  it("setiap tangkapan punya keterangan dwibahasa yang terisi", () => {
    for (const t of TANGKAPAN) {
      expect(t.judul.id.length, `judul id: ${t.berkas}`).toBeGreaterThan(0);
      expect(t.judul.en.length, `judul en: ${t.berkas}`).toBeGreaterThan(0);
      expect(t.isi.id.length, `isi id: ${t.berkas}`).toBeGreaterThan(0);
      expect(t.isi.en.length, `isi en: ${t.berkas}`).toBeGreaterThan(0);
    }
  });

  it("sisi Inggris bukan salinan sisi Indonesia", () => {
    // Cacat yang pernah terjadi di tempat lain: kolom `en` diisi dengan
    // menyalin `id` supaya tipe terpenuhi, dan halaman tampak dwibahasa
    // padahal tidak. Tipe tidak bisa melihatnya; uji ini bisa.
    const disalin = TANGKAPAN.filter((t) => t.judul.id === t.judul.en || t.isi.id === t.isi.en).map((t) => t.berkas);
    expect(disalin).toEqual([]);
  });

  it("berat tiap gambar wajar untuk halaman jualan (< 400 KB)", () => {
    // Fase 38 membuang 3,9 MB gambar produk. Halaman ini boleh membawa gambar
    // kembali, tetapi tidak boleh membawa kembali beratnya.
    const berat = TANGKAPAN.map((t) => ({
      berkas: t.berkas,
      kb: Math.round(statSync(path.join(DIR, `${t.berkas}.webp`)).size / 1024),
    })).filter((x) => x.kb > 400);
    expect(berat).toEqual([]);
  });
});
