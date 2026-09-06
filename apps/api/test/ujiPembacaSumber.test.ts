import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Uji yang MEMBACA BERKAS SUMBER harus dikecualikan dari `tsconfig.json`
 * (Fase 54e).
 *
 * `apps/api/tsconfig.json` memakai `types: ["@cloudflare/workers-types"]`, dan
 * tipe itu bentrok dengan tipe Node. Uji struktural yang membuka berkas lewat
 * `node:fs` karena itu didaftarkan di `exclude` — vitest tetap menjalankannya
 * penuh; yang dilewati hanya pemeriksaan tipenya.
 *
 * Daftar itu harus diperbarui pada commit yang sama dengan berkas ujinya, dan
 * **dua kali sudah tidak**:
 *
 * - Fase 38g menulis `token-publik.test.ts`, memvalidasinya dengan vitest saja,
 *   dan menyatakan typecheck hijau padahal tidak. Baru ketahuan di Fase 38q.
 * - Fase 54e menulis `gerbangTenant.test.ts` dan mengulang persis kelalaian
 *   itu — kali ini ketahuan di CI, sesudah PR dibuka.
 *
 * Keduanya punya bentuk yang sama: kesalahannya tidak terlihat dari berkas yang
 * ditulis, hanya dari berkas LAIN yang lupa disentuh. Komentar di
 * `tsconfig.json` sudah memperingatkannya sejak 38q, dan peringatan itu tidak
 * cukup — karena yang menulis uji baru tidak membaca tsconfig.
 *
 * Uji ini yang membacanya.
 */

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const TSCONFIG = join(TEST_DIR, "../tsconfig.json");

/** Impor Node yang membuat sebuah uji tidak bisa ikut typecheck Workers. */
const IMPOR_NODE = /from "node:(fs|path|url|os|child_process)"/;

function dikecualikan(): string[] {
  // tsconfig.json memuat komentar, jadi JSON.parse tidak bisa dipakai apa
  // adanya; yang dibutuhkan hanya isi larik `exclude`.
  const isi = readFileSync(TSCONFIG, "utf8");
  const blok = /"exclude"\s*:\s*\[([^\]]*)\]/.exec(isi);
  if (!blok) return [];
  return [...blok[1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
}

function ujiPembacaBerkas(): string[] {
  return readdirSync(TEST_DIR)
    .filter((n) => n.endsWith(".test.ts"))
    .filter((n) => IMPOR_NODE.test(readFileSync(join(TEST_DIR, n), "utf8")));
}

describe("uji yang membaca berkas sumber terdaftar di exclude tsconfig", () => {
  const exclude = dikecualikan();

  it("tidak ada uji pembaca berkas yang belum terdaftar", () => {
    const belumTerdaftar = ujiPembacaBerkas()
      .map((n) => `test/${n}`)
      .filter((jalur) => !exclude.includes(jalur));
    expect(
      belumTerdaftar,
      "Uji berikut membuka berkas lewat node:* tetapi belum ada di `exclude` " +
        "apps/api/tsconfig.json — `pnpm typecheck` akan memerah di CI. " +
        "Tambahkan pada commit yang sama.",
    ).toEqual([]);
  });

  it("tidak ada entri exclude yang basi", () => {
    const ada = new Set(ujiPembacaBerkas().map((n) => `test/${n}`));
    const basi = exclude.filter((jalur) => !ada.has(jalur));
    expect(
      basi,
      "Entri berikut tidak cocok dengan uji pembaca berkas mana pun — berkasnya " +
        "sudah hilang atau berhenti memakai node:*, jadi pengecualiannya kini " +
        "menyembunyikan pemeriksaan tipe tanpa alasan.",
    ).toEqual([]);
  });
});
