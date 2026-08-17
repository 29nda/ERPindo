import { describe, expect, it } from "vitest";
import { FEATURE_GROUPS, INTEGRATIONS, SECURITY_POINTS, SHOWCASE, TRUST_POINTS } from "../src/pages/landing/sections";

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
    // Penjaga regresi: `FEATURE_GROUPS` dan `SHOWCASE` sudah memakai pola ini
    // sebelum Fase 27a — pola barunya meniru mereka, bukan menciptakan yang lain.
    for (const f of FEATURE_GROUPS) expect(f.icon, f.title.id).toBeTruthy();
    for (const s of SHOWCASE) expect(s.icon, s.id).toBeTruthy();
  });
});

describe("teks landing", () => {
  it("tidak ada seksi yang menjanjikan masa coba gratis", () => {
    // Trial dihapus Fase 24a. Penjaga ini melengkapi cek smoke atas kerangka
    // HTML: yang ini menjaga sumber teksnya, yang itu menjaga hasil render.
    const semua = JSON.stringify({ TRUST_POINTS, SHOWCASE, FEATURE_GROUPS, SECURITY_POINTS, INTEGRATIONS });
    expect(/gratis\s*30\s*hari/i.test(semua)).toBe(false);
  });

  it("nama merek ditulis konsisten 'ERPindo' di teks seksi", () => {
    // Audit menemukan "erpindo" dan "ERPindo" bercampur dalam satu halaman —
    // terbaca seperti ditulis dua orang yang tidak saling bicara.
    const semua = JSON.stringify({ TRUST_POINTS, SHOWCASE, FEATURE_GROUPS, SECURITY_POINTS, INTEGRATIONS });
    const salahTulis = semua.match(/(?<![A-Za-z])erpindo/g) ?? [];
    expect(salahTulis, `ditemukan ${salahTulis.length} penulisan huruf kecil`).toEqual([]);
  });
});
