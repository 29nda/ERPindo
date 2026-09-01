import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Fase 51d — setiap rute aplikasi benar-benar pernah dibuka peramban.
 *
 * ## Kenapa gerbang ini ada
 *
 * `scripts/audit-routes.mjs` menyatakan dirinya "satu sumber kebenaran: rute
 * baru cukup ditambah di sini". Komentar di berkas itu sendiri lalu mencatat
 * bahwa klaim itu pernah tidak benar: **tujuh rute publik tidak pernah
 * ditambahkan**, termasuk dua halaman hukum yang justru paling perlu diperiksa
 * sebelum tayang. Tidak ada apa pun yang memaksa daftar itu tetap lengkap.
 *
 * Audit Fase 51 menemukan sisa yang sama masih ada: **empat halaman cetak**
 * (`/cetak/faktur`, `/cetak/penawaran`, `/cetak/slip-gaji`, `/cetak/1721a1`)
 * tidak ada di daftar itu DAN tidak disebut di `ui-sim.mjs` — padahal justru
 * itulah yang diserahkan ke pelanggan dan karyawan. Keempatnya kini punya cek
 * sendiri (F51d), dan uji ini memastikan yang berikutnya tidak lolos lagi.
 *
 * ## Yang diperiksa
 *
 * Bukan "ada di AUDIT_ROUTES", melainkan sifat yang sebenarnya penting:
 * **rute itu dibuka oleh ui-sim**, entah lewat daftar sapuan atau lewat
 * `goto` tersendiri. Memeriksa keanggotaan daftar saja akan memaksa halaman
 * yang butuh parameter query masuk ke sapuan buta, dan sapuan buta atas
 * halaman semacam itu hanya menghasilkan "tidak ditemukan" yang hijau.
 */

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const main = readFileSync(join(AKAR, "apps/web/src/main.tsx"), "utf8");
const auditRoutes = readFileSync(join(AKAR, "scripts/audit-routes.mjs"), "utf8");
const uiSim = readFileSync(join(AKAR, "scripts/ui-sim.mjs"), "utf8");

/**
 * Rute yang sengaja TIDAK dibuka ui-sim, masing-masing dengan sebabnya.
 *
 * Ketiganya hanya bermakna dengan token sah di query string; membukanya buta
 * hanya memunculkan layar "tautan tidak berlaku", yang hijau tanpa
 * membuktikan apa pun. Alurnya diuji di tingkat API oleh smoke.
 */
const DIKECUALIKAN = new Map([
  ["/verifikasi", "butuh token verifikasi email — alurnya diuji smoke"],
  ["/reset-password", "butuh token reset — alurnya diuji smoke"],
  ["/undangan", "butuh token undangan — alurnya diuji smoke"],
]);

/** Rute statis yang dideklarasikan router, dengan prefiks induknya. */
function ruteRouter(): string[] {
  const prefiks: Record<string, string> = { rootRoute: "" };
  const app = main.match(/const appRoute = createRoute\(\{\s*getParentRoute: \(\) => (\w+), path: "([^"]+)"/);
  if (app) prefiks.appRoute = (prefiks[app[1]!] ?? "") + app[2]!;

  const keluar = new Set<string>();
  for (const m of main.matchAll(/getParentRoute: \(\) => (\w+),\s*\n?\s*path: "([^"]+)"/g)) {
    const pref = prefiks[m[1]!];
    if (pref === undefined) continue;
    const p = m[2]!;
    if (p.includes("$")) continue; // rute dinamis: tak bisa dikunjungi tanpa data
    keluar.add((pref + (p === "/" ? "" : p)) || "/");
  }
  return [...keluar].sort();
}

describe("cakupan rute — tidak ada halaman yang tak pernah dibuka peramban", () => {
  it("setiap rute statis disapu AUDIT_ROUTES atau dibuka langsung ui-sim", () => {
    const belum = ruteRouter().filter((r) => {
      if (DIKECUALIKAN.has(r)) return false;
      if (auditRoutes.includes(`["${r}"`)) return false;
      return !uiSim.includes(r);
    });
    expect(
      belum,
      "Rute berikut tidak pernah dibuka peramban. Tambahkan ke AUDIT_ROUTES " +
        "(bila bisa disapu buta) atau beri cek sendiri di ui-sim.mjs.",
    ).toEqual([]);
  });

  it("penjaga bagi penjaganya: ketiga berkas terbaca dan rutenya terurai", () => {
    // Tanpa ini, satu salah ketik jalur membuat uji di atas lulus selamanya
    // dengan memeriksa nol rute — persis cara gerbang mati tanpa ada yang sadar.
    expect(ruteRouter().length).toBeGreaterThan(50);
    expect(auditRoutes).toContain("AUDIT_ROUTES");
    expect(uiSim.length).toBeGreaterThan(10_000);
  });

  it("daftar pengecualian tetap kecil dan seluruhnya masih ada di router", () => {
    // Pengecualian yang menumpuk adalah cara gerbang ini kehilangan arti.
    expect(DIKECUALIKAN.size).toBeLessThanOrEqual(5);
    const semua = new Set(ruteRouter());
    for (const r of DIKECUALIKAN.keys()) expect(semua.has(r), `${r} tidak ada lagi di router`).toBe(true);
  });
});
