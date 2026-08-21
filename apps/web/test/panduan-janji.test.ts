import { describe, expect, it } from "vitest";
import { GUIDE_MODULES } from "../src/pages/panduan/content";

/**
 * Panduan tidak boleh menjanjikan hal yang sudah dibatalkan (Fase 38f).
 *
 * ## Kenapa uji ini ada
 *
 * Masa coba gratis dihapus pada Fase 24a, dan sejak itu cek smoke menjaga
 * beranda, blok SEO, dan blog agar tidak menjanjikannya. Panduan tidak pernah
 * masuk sapuan itu — sehingga kalimat "Uji coba 30 hari mencakup SEMUA fitur,
 * tanpa kartu kredit" bertahan di `content/dasar.ts` selama empat belas fase.
 *
 * Yang membuatnya mahal bukan panjangnya waktu, melainkan tempatnya: panduan
 * dibaca orang yang **sudah** serius memakai produknya, dan janji yang meleset
 * di sana ditemukan tepat saat kepercayaan sedang dibangun.
 *
 * Sama seperti Fase 30 menutup kelas "paket bertingkat" dengan cek smoke, uji
 * ini menutup kelasnya untuk panduan — supaya keputusan berikutnya yang
 * membatalkan sesuatu tidak perlu mengingat ada satu tempat lagi yang harus
 * diperiksa manual.
 */

/** Frasa yang menjanjikan hal-hal yang sudah dibatalkan. */
const JANJI_BATAL: [pola: RegExp, sebab: string][] = [
  [/uji coba|masa coba|free trial/i, "masa coba gratis dihapus pada Fase 24a"],
  [/\b(starter|business|enterprise)\b/i, "paket bertingkat dibubarkan pada Fase 30"],
  [/tanpa kartu kredit/i, "menyiratkan masa coba yang sudah tidak ada"],
];

function semuaTeks(): { modul: string; teks: string }[] {
  const keluar: { modul: string; teks: string }[] = [];
  for (const m of GUIDE_MODULES) {
    keluar.push({ modul: m.slug, teks: m.intro });
    for (const s of m.sections) {
      keluar.push({ modul: m.slug, teks: s.heading });
      for (const t of [...(s.body ?? []), ...(s.steps ?? []), ...(s.tips ?? [])]) {
        keluar.push({ modul: m.slug, teks: t });
      }
    }
  }
  return keluar;
}

describe("panduan tidak menjanjikan yang sudah dibatalkan", () => {
  it.each(JANJI_BATAL)("tidak menyebut %s — %s", (pola, sebab) => {
    const kena = semuaTeks().filter((t) => pola.test(t.teks));
    expect(kena.map((k) => `${k.modul}: ${k.teks.slice(0, 80)}`), sebab).toEqual([]);
  });

  it("tiap modul panduan punya intro dan minimal satu seksi", () => {
    for (const m of GUIDE_MODULES) {
      expect(m.intro.trim().length, m.slug).toBeGreaterThan(0);
      expect(m.sections.length, m.slug).toBeGreaterThan(0);
    }
  });
});
