import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Janji "data tetap bisa diunduh setelah langganan berakhir" (Fase 55b).
 *
 * ## Kenapa janji ini butuh penjaga struktural
 *
 * Perilakunya sendiri sudah ada dan sudah diuji smoke: `past_due` memblokir
 * setiap method selain GET, ekspor penuh adalah GET, dan smoke membuktikan
 * keduanya di dua pintu masuk sekaligus.
 *
 * Yang tidak dijaga siapa pun adalah **sebabnya** — dan sebab itu tipis.
 * Ekspor lolos mode baca-saja bukan karena ada pengecualian yang menyebutnya,
 * melainkan karena kebetulan ia GET. Mengubahnya menjadi POST adalah perubahan
 * yang wajar sekali diusulkan (badan permintaan untuk memilih tabel, misalnya)
 * dan **tidak akan tampak salah dari berkas yang disunting**: rutenya tetap
 * bekerja sempurna bagi setiap pelanggan yang berlangganan. Yang patah hanya
 * pelanggan yang langganannya sudah berakhir — orang yang, menurut definisinya,
 * tidak lagi membuka aplikasi setiap hari untuk melaporkannya.
 *
 * Ini kelas yang berulang di sepuluh bagian audit: satu janji dipikul dua
 * tempat yang tidak saling memeriksa. Di sini janjinya ada di surel penagihan
 * dan di halaman publik; yang menepatinya adalah satu huruf di berkas rute.
 */

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const baca = (jalur: string) => readFileSync(join(AKAR, jalur), "utf8");

describe("ekspor selamat dari mode baca-saja (Fase 55b)", () => {
  it("mode baca-saja memblokir tulis dan HANYA tulis", () => {
    const gerbang = baca("apps/api/src/lib/gerbangTenant.ts");
    // Bila syaratnya kehilangan `metode !== "GET"`, seluruh pembacaan ikut
    // terblokir — termasuk ekspornya, dan termasuk melihat data sendiri.
    expect(gerbang).toMatch(/row\.status === "past_due" && metode !== "GET"/);
  });

  it("ekspor penuh dilayani lewat GET, jadi mode baca-saja tidak menyentuhnya", () => {
    const rute = baca("apps/api/src/routes/export.ts");
    expect(rute).toMatch(/\.get\("\/:tenantId\/export\/full"/);
    // Bentuk lain untuk jalur yang sama berarti janji unduhnya patah senyap.
    for (const metode of ["post", "put", "patch", "delete"]) {
      expect(rute, `export/full tidak boleh ${metode.toUpperCase()}`).not.toMatch(
        new RegExp(`\\.${metode}\\("/:tenantId/export/full"`),
      );
    }
  });

  it("layar baca-saja menyebutkan unduh datanya, bukan hanya cara membayar", () => {
    // Surel penagihan sudah menjanjikan "data tetap aman dan bisa diekspor"
    // sejak Fase 20b. Layarnya tidak — padahal justru di layar itulah pemilik
    // berada saat ia paling mungkin mengira datanya tersandera.
    const kamus = baca("apps/web/src/i18n/ui.ts");
    const cocok = /shBacaSajaKalimat:\s*\{([\s\S]*?)\},/.exec(kamus);
    expect(cocok, "kunci spanduk baca-saja tidak ditemukan lagi").not.toBeNull();
    const kalimat = cocok![1]!;
    expect(kalimat).toMatch(/diunduh/);
    expect(kalimat).toMatch(/downloaded/);
    // Dua lubang: tautan unduh data dan tautan langganan. Kalimat yang
    // kehilangan lubangnya berarti kembali dirakit dari potongan.
    for (const bahasa of ["id", "en"]) {
      const baris = new RegExp(`${bahasa}: "([^"]*)"`).exec(kalimat);
      expect(baris, `naskah ${bahasa} tidak ditemukan`).not.toBeNull();
      expect(baris![1]).toContain("{0}");
      expect(baris![1]).toContain("{1}");
    }
  });

  it("spanduknya memakai kalimat utuh, bukan potongan kamus", () => {
    const layar = baca("apps/web/src/pages/app.tsx");
    expect(layar).toMatch(/isiNode\(\s*u\("shBacaSajaKalimat"\)/);
    // Potongan lama tidak boleh hidup kembali di berkas mana pun.
    const kamus = baca("apps/web/src/i18n/ui.ts");
    for (const kunci of ["shLanggananBerakhir", "shModeBacaSaja", "shAktifkanDi"]) {
      expect(kamus, `${kunci} adalah potongan yang sudah digantikan`).not.toContain(`${kunci}:`);
    }
  });
});
