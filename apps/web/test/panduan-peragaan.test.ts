import { GUIDE_MODULES } from "@erpindo/shared";
import { describe, expect, it } from "vitest";
import { PERAGAAN } from "../src/peragaan";

/**
 * Pengganti pemeriksaan tipe yang dilepas saat isi panduan pindah (Fase 55d).
 *
 * `GuideSection.peragaan` dulu bertipe `PeragaanId` — union kunci `PERAGAAN` —
 * sehingga rujukan ke peragaan yang tidak ada gagal saat kompilasi. Isi panduan
 * kini hidup di `@erpindo/shared` supaya Worker bisa menyajikannya kepada
 * perayap, dan paket itu tidak boleh bergantung pada `apps/web`, jadi tipenya
 * melemah menjadi `string`.
 *
 * Uji ini mengembalikan jaminannya — dan sebenarnya lebih kuat daripada union
 * yang digantikannya. Union hanya memeriksa nilai pada saat ditulis; ia tidak
 * pernah melihat peragaan yang DIHAPUS belakangan, karena berkas panduan yang
 * merujuknya tidak ikut disunting dan karenanya tidak ikut diperiksa ulang
 * sampai ada yang menyentuhnya.
 */
describe("rujukan peragaan di panduan (Fase 55d)", () => {
  const dipakai = GUIDE_MODULES.flatMap((m) =>
    m.sections.flatMap((s) => (s.peragaan ? [{ modul: m.slug, id: s.peragaan }] : [])),
  );

  it("ada rujukan yang diperiksa — daftar kosong bukan kelulusan", () => {
    expect(dipakai.length).toBeGreaterThan(5);
  });

  it("setiap peragaan yang dirujuk panduan benar-benar ada", () => {
    const hilang = dipakai.filter((d) => !(d.id in PERAGAAN)).map((d) => `${d.modul} → ${d.id}`);
    expect(hilang).toEqual([]);
  });

  it("setiap modul punya slug & judul yang bisa dijadikan halaman sendiri", () => {
    // Worker menerbitkan satu URL per modul sejak fase ini; slug kosong atau
    // ganda berarti halaman yang saling menimpa di sitemap.
    const slug = GUIDE_MODULES.map((m) => m.slug);
    expect(slug.filter((s) => !/^[a-z0-9-]+$/.test(s))).toEqual([]);
    expect(new Set(slug).size).toBe(slug.length);
    expect(GUIDE_MODULES.filter((m) => !m.title.trim() || !m.intro.trim())).toEqual([]);
  });
});
