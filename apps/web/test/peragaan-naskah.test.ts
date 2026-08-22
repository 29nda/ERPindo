import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { neracaJurnal } from "../src/peragaan/mesin";
import { PERAGAAN, SEMUA_PERAGAAN } from "../src/peragaan";
import type { Dual } from "../src/i18n";
import type { Naskah } from "../src/peragaan/tipe";

/**
 * Naskah peragaan (Fase 38a).
 *
 * ## Kenapa uji ini yang paling penting di seluruh kerangka peragaan
 *
 * Peragaan bergaya punya satu kelemahan yang tidak dimiliki tangkapan layar:
 * ia **tidak bisa rusak** saat produk berubah, jadi ia berbohong tanpa suara.
 * Tangkapan layar setidaknya terlihat usang oleh mata manusia; peragaan yang
 * menyebut halaman yang sudah dihapus akan tetap tampil rapi selamanya.
 *
 * Itu bukan kekhawatiran karangan — persis begitulah `screenshots.mjs` rusak
 * dan tidak berbunyi selama berbelas fase. Uji "jalur" di bawah adalah
 * penangkalnya: tiap peragaan menyebut jalur yang harus benar-benar terdaftar
 * di `main.tsx`, dan menghapus rute akan memecahkan uji ini lebih dulu.
 */

/** Kumpulkan seluruh objek `Dual` di dalam sebuah nilai, serapa pun dalamnya. */
function semuaDual(nilai: unknown, keluar: Dual[] = []): Dual[] {
  if (!nilai || typeof nilai !== "object") return keluar;
  if (Array.isArray(nilai)) {
    for (const v of nilai) semuaDual(v, keluar);
    return keluar;
  }
  const o = nilai as Record<string, unknown>;
  if (typeof o.id === "string" && typeof o.en === "string" && Object.keys(o).length === 2) {
    keluar.push(o as unknown as Dual);
    return keluar;
  }
  for (const v of Object.values(o)) semuaDual(v, keluar);
  return keluar;
}

/** Jalur rute yang benar-benar terdaftar di `main.tsx`. */
function jalurTerdaftar(): Set<string> {
  const sumber = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
  const potong = sumber.indexOf("const appRoute");
  const publik = sumber.slice(0, potong);
  const aplikasi = sumber.slice(potong);
  const ambil = (s: string) => [...s.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]!);
  const keluar = new Set<string>(ambil(publik));
  for (const p of ambil(aplikasi)) {
    if (p === "/app") continue;
    keluar.add(p === "/" ? "/app" : `/app${p}`);
  }
  return keluar;
}

/** Id panel yang dikenal sebuah naskah. */
function idPanel(n: Naskah): Set<string> {
  return new Set(n.panel.map((p) => p.id));
}

describe("registri peragaan", () => {
  it("kunci registri sama dengan id naskahnya", () => {
    for (const [kunci, naskah] of Object.entries(PERAGAAN)) {
      expect(naskah.id, `kunci "${kunci}"`).toBe(kunci);
    }
  });

  it("tidak ada naskah kembar", () => {
    const id = SEMUA_PERAGAAN.map((n) => n.id);
    expect(new Set(id).size).toBe(id.length);
  });

  it("registrinya tidak kosong", () => {
    expect(SEMUA_PERAGAAN.length).toBeGreaterThan(0);
  });
});

describe.each(SEMUA_PERAGAAN.map((n) => [n.id, n] as const))("naskah %s", (_id, naskah) => {
  it("punya judul dan ringkasan dalam dua bahasa", () => {
    for (const d of [naskah.judul, naskah.ringkas]) {
      expect(d.id.trim().length).toBeGreaterThan(0);
      expect(d.en.trim().length).toBeGreaterThan(0);
    }
  });

  it("punya minimal tiga langkah", () => {
    // Kurang dari tiga bukan peragaan, melainkan gambar yang berkedip.
    expect(naskah.langkah.length).toBeGreaterThanOrEqual(3);
  });

  it("id panelnya unik", () => {
    const id = naskah.panel.map((p) => p.id);
    expect(new Set(id).size).toBe(id.length);
  });

  it("tiap langkah menunjuk panel yang benar-benar ada", () => {
    const dikenal = idPanel(naskah);
    for (const [i, l] of naskah.langkah.entries()) {
      if (l.aksi === "pindah" || l.aksi === "jeda") continue;
      expect(dikenal.has(l.sasaran.panel), `langkah ${i} → panel "${l.sasaran.panel}"`).toBe(true);
    }
  });

  it("tiap `sasaran.medan` benar-benar ada di panel formulirnya", () => {
    for (const [i, l] of naskah.langkah.entries()) {
      if (l.aksi === "pindah" || l.aksi === "jeda" || !l.sasaran.medan) continue;
      const panel = naskah.panel.find((p) => p.id === l.sasaran.panel);
      expect(panel?.jenis, `langkah ${i}`).toBe("formulir");
      if (panel?.jenis !== "formulir") return;
      const ada = panel.medan.some((m) => m.id === l.sasaran.medan);
      expect(ada, `langkah ${i} → medan "${l.sasaran.medan}"`).toBe(true);
    }
  });

  it("tiap langkah punya narasi dua bahasa", () => {
    // Narasi wajib karena ia SATU-SATUNYA jalan masuk bagi pembaca layar,
    // perayap, dan pengguna `prefers-reduced-motion`.
    for (const [i, l] of naskah.langkah.entries()) {
      expect(l.narasi.id.trim().length, `langkah ${i} (id)`).toBeGreaterThan(0);
      expect(l.narasi.en.trim().length, `langkah ${i} (en)`).toBeGreaterThan(0);
    }
  });

  it("jalurnya terdaftar di main.tsx", () => {
    const terdaftar = jalurTerdaftar();
    const jalur = [naskah.jalur];
    for (const l of naskah.langkah) if (l.aksi === "pindah") jalur.push(l.jalur);
    for (const j of jalur) expect(terdaftar.has(j), `jalur "${j}"`).toBe(true);
  });

  it("tiap jurnal SEIMBANG — debit sama dengan kredit", () => {
    // Seluruh sudut jualan halaman depan bertumpu pada "angkanya bisa Anda
    // periksa". Jurnal peraga yang tidak seimbang membatalkan klaim itu di
    // tempat yang paling mahal, di depan pembaca yang paling teliti.
    for (const p of naskah.panel) {
      if (p.jenis !== "jurnal") continue;
      const n = neracaJurnal(p.baris);
      expect(n.debit, `panel "${p.id}" debit vs kredit`).toBe(n.kredit);
      expect(n.debit).toBeGreaterThan(0);
    }
  });

  it("seluruh teksnya dwibahasa dan tidak sekadar disalin", () => {
    const dual = semuaDual(naskah);
    expect(dual.length).toBeGreaterThan(0);
    for (const d of dual) {
      expect(d.id.trim().length).toBeGreaterThan(0);
      expect(d.en.trim().length).toBeGreaterThan(0);
    }
    // Sebagian teks memang sah identik: nama perusahaan, satuan, angka. Yang
    // dijaga di sini adalah kasus yang berbeda — sisi Inggris yang disalin
    // borongan dari sisi Indonesia, yang membuat naskah TAMPAK diterjemahkan.
    const sama = dual.filter((d) => d.id === d.en).length;
    expect(sama / dual.length, "terlalu banyak teks yang sisi Inggrisnya sama").toBeLessThan(0.5);
  });
});
