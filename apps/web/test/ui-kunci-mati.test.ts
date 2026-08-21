import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Kunci kamus yang tidak dirujuk siapa pun (Fase 38q).
 *
 * ## Kenapa uji ini ada
 *
 * Audit menemukan 25 kunci mati di `i18n/ui.ts`, dan **lima belas di antaranya
 * berasal dari satu keputusan**: paket bertingkat Starter/Business/Enterprise
 * yang dibubarkan pada Fase 30. Naskahnya tetap tinggal delapan fase.
 *
 * Yang membuatnya lebih dari sekadar bobot mati: kunci seperti
 * `tingkatkanEnterprise` masih **bisa dipanggil**, dan siapa pun yang mencari
 * "bagaimana menawarkan peningkatan paket" akan menemukannya lalu memakainya —
 * tanpa tahu bahwa paket yang ditawarkannya sudah tidak ada.
 *
 * ## Kenapa ambang, bukan nol
 *
 * Nol akan menggagalkan build pada kunci yang sengaja ditulis mendahului
 * pemakainya dalam satu rangkaian commit. Ambang menahan angkanya agar tidak
 * naik, dan diturunkan tiap kali sisanya berkurang — pola yang sama dengan
 * `sapu-warna` dan `sapu-gaya`.
 */

/** Ambang. Turunkan setiap kali sisanya berkurang — JANGAN dinaikkan. */
const AMBANG = 0;

const AKAR = new URL("../../..", import.meta.url).pathname;

function berkasSumber(dir: string, keluar: string[] = []): string[] {
  for (const nama of readdirSync(dir)) {
    if (nama === "node_modules" || nama === "dist" || nama === ".git") continue;
    const penuh = path.join(dir, nama);
    if (statSync(penuh).isDirectory()) berkasSumber(penuh, keluar);
    else if (/\.(ts|tsx|mjs)$/.test(nama) && !penuh.endsWith(path.join("i18n", "ui.ts"))) {
      keluar.push(penuh);
    }
  }
  return keluar;
}

describe("kamus antarmuka tidak menumpuk kunci mati", () => {
  it(`kunci tanpa satu pun perujuk tidak melebihi ${AMBANG}`, () => {
    const ui = readFileSync(path.join(AKAR, "apps/web/src/i18n/ui.ts"), "utf8");
    const kunci = [...ui.matchAll(/^ {2}(\w+): \{/gm)].map((m) => m[1]!);
    expect(kunci.length).toBeGreaterThan(1_000);

    const blob = [
      ...berkasSumber(path.join(AKAR, "apps/web/src")),
      ...berkasSumber(path.join(AKAR, "apps/api/src")),
      ...berkasSumber(path.join(AKAR, "packages")),
    ]
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");

    const mati = kunci.filter((k) => !blob.includes(`"${k}"`) && !blob.includes(`'${k}'`));
    expect(mati, `kunci mati: ${mati.join(", ")}`).toHaveLength(AMBANG);
  });
});
