import { describe, expect, it } from "vitest";
import { COMPARISON, INTEGRATIONS, SECURITY_POINTS, SHOWCASE, SINGLE_PLAN_MODULES, TRUST_POINTS } from "../src/pages/landing/sections";

/**
 * Ikon halaman depan (Fase 27a).
 *
 * Audit halaman depan menemukan tiga seksi yang ikonnya bermasalah, dan yang
 * paling mencolok bukan "kurang ikon" melainkan ikon yang **sama persis**:
 * `Security()` menggambar `ShieldCheck` untuk kelima butirnya, sehingga seksi
 * jaminan keamanan tampil sebagai lima perisai identik — tidak satu pun
 * ikonnya menjelaskan butir yang didampinginya.
 *
 * Dikunci di sini, bukan di ui-sim, karena ini sifat DATA: ikon berasal dari
 * `sections.ts`, dan uji struktural tidak bisa lolos hanya karena kebetulan
 * halamannya terender rapi. Uji piksel juga tidak akan menangkapnya — lima
 * perisai identik terlihat "benar" bagi mesin.
 */

describe("ikon seksi landing", () => {
  it("tiap butir keamanan punya ikon, dan semuanya BERBEDA", () => {
    for (const s of SECURITY_POINTS) expect(s.icon, s.title.id).toBeTruthy();
    const unik = new Set(SECURITY_POINTS.map((s) => s.icon));
    expect(unik.size, "lima butir keamanan tidak boleh berbagi satu ikon").toBe(SECURITY_POINTS.length);
  });

  it("tiap bukti di bilah kepercayaan punya ikon", () => {
    expect(TRUST_POINTS.length).toBeGreaterThan(0);
    for (const t of TRUST_POINTS) expect(t.icon, t.label.id).toBeTruthy();
  });

  it("tiap badge integrasi punya ikon", () => {
    expect(INTEGRATIONS.length).toBeGreaterThan(0);
    for (const i of INTEGRATIONS) expect(i.icon, i.label.id).toBeTruthy();
  });

  it("seksi yang sudah berikon sejak awal tetap utuh", () => {
    // Penjaga regresi: `SHOWCASE` sudah memakai pola ini sebelum Fase 27a —
    // pola barunya meniru dia, bukan menciptakan yang lain.
    //
    // Fase 32c: `FEATURE_GROUPS` dihapus bersama seksinya. Grid 11 kartu fitur
    // mengulang isi `/fitur` yang memuat 22 modul dengan penjelasan penuh.
    for (const s of SHOWCASE) expect(s.icon, s.id).toBeTruthy();
  });

  it("tiap butir showcase membawa bukti, bukan sekadar kata sifat", () => {
    // Setelah grid fitur dibuang, SHOWCASE menjadi satu-satunya tempat halaman
    // depan menunjukkan produknya. Bila entrinya kehilangan gambar atau daftar
    // manfaat, halaman kehilangan buktinya tanpa ada yang menyadarinya.
    for (const s of SHOWCASE) {
      expect(s.image, `${s.id} tanpa tangkapan layar`).toMatch(/^\/landing\/.+\.webp$/);
      expect(s.benefits.length, `${s.id} tanpa daftar manfaat`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("teks landing", () => {
  it("tidak ada seksi yang menjanjikan masa coba gratis", () => {
    // Trial dihapus Fase 24a. Penjaga ini melengkapi cek smoke atas kerangka
    // HTML: yang ini menjaga sumber teksnya, yang itu menjaga hasil render.
    const semua = JSON.stringify({ TRUST_POINTS, SHOWCASE, SECURITY_POINTS, INTEGRATIONS });
    expect(/gratis\s*30\s*hari/i.test(semua)).toBe(false);
  });

  it("nama merek ditulis konsisten 'ERPindo' di teks seksi", () => {
    // Audit menemukan "erpindo" dan "ERPindo" bercampur dalam satu halaman —
    // terbaca seperti ditulis dua orang yang tidak saling bicara.
    // Fase 32c: yang diperiksa NILAI string saja, bukan hasil `JSON.stringify`
    // mentah. `COMPARISON` punya field bernama `erpindo`, dan memeriksa JSON
    // mentah membuat NAMA KUNCI terhitung sebagai salah tulis — uji memerah
    // untuk teks yang tidak pernah dilihat siapa pun.
    const nilai: string[] = [];
    const telusuri = (v: unknown): void => {
      if (typeof v === "string") nilai.push(v);
      else if (Array.isArray(v)) v.forEach(telusuri);
      else if (v && typeof v === "object") Object.values(v).forEach(telusuri);
    };
    telusuri([TRUST_POINTS, SHOWCASE, COMPARISON, SECURITY_POINTS, INTEGRATIONS]);
    const salahTulis = nilai.join(" ").match(/(?<![A-Za-z])erpindo/g) ?? [];
    expect(salahTulis, `ditemukan ${salahTulis.length} penulisan huruf kecil`).toEqual([]);
  });
});

describe("register naskah halaman depan (Fase 33i)", () => {
  /**
   * Istilah akuntan yang Fase 32e putuskan TIDAK dipakai di halaman depan.
   *
   * Bukan daftar kata terlarang di seluruh repo: `/fitur` boleh memakainya —
   * pembaca yang sudah menelusuri 22 modul memang sedang membandingkan produk,
   * dan di sana pun polanya sudah benar (hal biasanya dulu, istilahnya di dalam
   * kurung: "lot yang paling dekat kedaluwarsa lebih dulu (FEFO)").
   *
   * Yang dijaga di sini hanya HALAMAN DEPAN, tempat pengunjung memutuskan
   * apakah akan membaca lebih jauh.
   */
  const ISTILAH_AKUNTAN = ["double-entry", "FEFO", "BoM", "HPP", "moving average", "SO →"];

  it("daftar modul di seksi Harga tidak memakai istilah akuntan", () => {
    // Letaknya yang membuat ini penting: seksi Harga adalah layar terakhir
    // sebelum orang memutuskan membayar, dan satu-satunya tempat di halaman
    // depan yang menjanjikan "seluruh modul terbuka". Daftar yang tidak bisa
    // dibaca tidak membuktikan apa pun.
    const ditemukan: string[] = [];
    for (const m of SINGLE_PLAN_MODULES) {
      for (const istilah of ISTILAH_AKUNTAN) {
        if (m.id.includes(istilah) || m.en.includes(istilah)) ditemukan.push(`${m.id} → ${istilah}`);
      }
    }
    expect(ditemukan, `istilah akuntan di seksi Harga: ${ditemukan.join(" · ")}`).toEqual([]);
  });

  it("bilah bukti, showcase, dan perbandingan juga bebas istilah akuntan", () => {
    const nilai: string[] = [];
    const telusuri = (v: unknown): void => {
      if (typeof v === "string") nilai.push(v);
      else if (Array.isArray(v)) v.forEach(telusuri);
      else if (v && typeof v === "object") Object.values(v).forEach(telusuri);
    };
    telusuri([TRUST_POINTS, SHOWCASE, COMPARISON, SECURITY_POINTS]);
    const gabung = nilai.join(" ");
    const ditemukan = ISTILAH_AKUNTAN.filter((t) => gabung.includes(t));
    expect(ditemukan, `istilah akuntan di halaman depan: ${ditemukan.join(" · ")}`).toEqual([]);
  });
});
