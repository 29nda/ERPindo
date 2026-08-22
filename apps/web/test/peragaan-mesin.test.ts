import { describe, expect, it } from "vitest";
import {
  bingkaiAkhir,
  bingkaiPada,
  durasiTotal,
  indeksAkhir,
  neracaJurnal,
  DURASI_BAKU,
} from "../src/peragaan/mesin";
import type { Naskah } from "../src/peragaan/tipe";

/**
 * Mesin peragaan (Fase 38a).
 *
 * Diuji di sini, bukan di ui-sim, karena seluruh perilakunya adalah fungsi
 * murni: "apa yang terlihat pada langkah ke-n" punya satu jawaban benar dan
 * tidak memerlukan peramban untuk ditanyakan. Peragaan hero yang lama
 * menyatukan mesin, komponen, dan timer dalam satu berkas — untuk satu
 * peragaan itu wajar, untuk 57 peragaan artinya tidak ada satu pun perilaku
 * animasi yang bisa diperiksa tanpa merender Chromium.
 */

const CONTOH: Naskah = {
  id: "contoh",
  jalur: "/app/penjualan",
  judul: { id: "Contoh", en: "Example" },
  ringkas: { id: "Naskah untuk menguji mesin.", en: "A script for testing the engine." },
  panel: [
    {
      jenis: "formulir",
      id: "form",
      judul: { id: "Formulir", en: "Form" },
      medan: [{ id: "nama", label: { id: "Nama", en: "Name" }, nilai: { id: "Halo", en: "Hello" } }],
    },
    { jenis: "catatan", id: "hasil", teks: { id: "Hasilnya.", en: "The result." }, nada: "ok" },
  ],
  langkah: [
    { aksi: "ketik", sasaran: { panel: "form", medan: "nama" }, narasi: { id: "Ketik.", en: "Type." } },
    { aksi: "klik", sasaran: { panel: "form" }, narasi: { id: "Klik.", en: "Click." } },
    { aksi: "isi", sasaran: { panel: "hasil" }, narasi: { id: "Terisi.", en: "Filled." } },
    { aksi: "pindah", jalur: "/app/keuangan/jurnal", narasi: { id: "Pindah.", en: "Move." } },
  ],
};

describe("mesin peragaan", () => {
  it("panel yang tidak pernah jadi sasaran `isi` menyala sejak bingkai pertama", () => {
    // Aturan warisan `pertunjukan.tsx`: seluruh isi selalu ada, animasi hanya
    // menyingkap yang memang disingkap dengan sengaja.
    const b = bingkaiPada(CONTOH, -1);
    expect(b.terisi.has("form")).toBe(true);
    expect(b.terisi.has("hasil")).toBe(false);
  });

  it("bingkai akhir menyalakan SEMUA panel", () => {
    const b = bingkaiAkhir(CONTOH);
    for (const p of CONTOH.panel) expect(b.terisi.has(p.id), p.id).toBe(true);
  });

  it("ketikan bertahap: 0 sebelum langkahnya, sebagian saat berjalan, penuh sesudahnya", () => {
    expect(bingkaiPada(CONTOH, -1).ketikan.get("form.nama")).toBe(0);
    expect(bingkaiPada(CONTOH, 0, 0.5).ketikan.get("form.nama")).toBe(0.5);
    expect(bingkaiPada(CONTOH, 1).ketikan.get("form.nama")).toBe(1);
  });

  it("klik menekan hanya di paruh pertama langkah", () => {
    expect(bingkaiPada(CONTOH, 1, 0.2).menekan).toBe(true);
    expect(bingkaiPada(CONTOH, 1, 0.8).menekan).toBe(false);
  });

  it("`pindah` mengubah jalur dan jalur itu menetap", () => {
    expect(bingkaiPada(CONTOH, 0).jalur).toBe("/app/penjualan");
    expect(bingkaiPada(CONTOH, 3).jalur).toBe("/app/keuangan/jurnal");
  });

  it("deterministik — bingkai yang sama dipanggil dua kali menghasilkan isi sama", () => {
    const a = bingkaiPada(CONTOH, 2);
    const b = bingkaiPada(CONTOH, 2);
    expect([...a.terisi].sort()).toEqual([...b.terisi].sort());
    expect(a.jalur).toBe(b.jalur);
  });

  it("indeks di luar batas dijepit ke langkah terakhir, bukan melempar", () => {
    expect(() => bingkaiPada(CONTOH, 999)).not.toThrow();
    expect(bingkaiPada(CONTOH, 999).jalur).toBe("/app/keuangan/jurnal");
  });

  it("`durasiTotal` menjumlahkan durasi tiap langkah", () => {
    expect(indeksAkhir(CONTOH)).toBe(3);
    expect(durasiTotal(CONTOH)).toBe(4 * DURASI_BAKU);
  });

  it("`neracaJurnal` menghitung debit, kredit, dan keseimbangannya", () => {
    expect(neracaJurnal([{ debit: 100 }, { kredit: 100 }])).toEqual({
      debit: 100,
      kredit: 100,
      seimbang: true,
    });
    expect(neracaJurnal([{ debit: 100 }, { kredit: 90 }]).seimbang).toBe(false);
  });
});
