import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Fase 52c — tenant tanpa database tidak boleh diperlakukan sebagai tenant biasa.
 *
 * ## Kenapa gerbang ini ada
 *
 * `db_ref = ''` (`TANPA_DB`) adalah keadaan SAH: perusahaan sudah mendaftar,
 * belum membayar, jadi databasenya memang belum dibuat. Ia juga bisa terjadi
 * pada tenant ber-status `active` — "sudah membayar, provisioning tertunda",
 * keadaan yang dicatat sendiri oleh webhook billing.
 *
 * `getTenantDb(env, "")` melempar. Jadi setiap kueri yang mengambil `db_ref`
 * lalu menyerahkannya ke `getTenantDb` HARUS menyaring keadaan itu lebih dulu,
 * atau memeriksanya sendiri.
 *
 * Kelas ini sudah muncul **enam kali** di tempat berbeda:
 *
 * | Fase | Tempat | Akibatnya |
 * | --- | --- | --- |
 * | 50e | cron migrasi skema | tercatat GAGAL tiap jalannya, selamanya |
 * | 50e | kartu kapasitas Admin | dihitung "tertinggal" tanpa bisa disusul |
 * | 52b | konsolidasi (3 endpoint) | 500 pada SELURUH laporan |
 * | 52c | formulir lead publik | 500 yang dilihat PENGUNJUNG |
 * | 52c | link pembayaran | 500 alih-alih penjelasan |
 * | 52c | tiga cron harian/bulanan | galat tercatat tiap jalannya |
 *
 * `middleware/auth.ts` sudah lebih dulu memetik pelajarannya — komentarnya
 * berbunyi "Penjaganya sengaja menguji `db_ref`, BUKAN status" — tetapi
 * pelajaran yang hanya hidup di satu berkas akan dilanggar di berkas lain.
 * Enam kemunculan adalah bukti bahwa menambal satu per satu tidak cukup.
 *
 * ## Yang diperiksa
 *
 * Setiap kueri SQL di `apps/api/src` yang menyebut `db_ref` harus salah satu:
 * menyaring `db_ref <> ''`, atau terdaftar di {@link DIKECUALIKAN} beserta
 * alasannya. Pengecualiannya nyata dan perlu — menghitung sisa slot pool justru
 * WAJIB melihat semua baris, termasuk yang kosong.
 */

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Kueri yang memang harus melihat `db_ref` kosong, dengan sebabnya.
 *
 * Kuncinya cuplikan unik dari kuerinya sendiri, bukan nomor baris: nomor baris
 * bergeser tiap kali berkasnya disunting, dan pengecualian yang menunjuk baris
 * salah adalah pengecualian yang diam-diam melindungi kueri yang keliru.
 */
const DIKECUALIKAN = new Map([
  [
    "SELECT db_ref FROM tenants",
    "menghitung slot pool yang terpakai — justru WAJIB melihat semua baris, " +
      "termasuk yang kosong, supaya kapasitasnya benar",
  ],
  [
    "SELECT id, name, slug, db_ref FROM tenants WHERE id = ?",
    "`pastikanTenantTerprovisi` — inilah yang MEMBUAT databasenya; ia harus " +
      "bisa melihat tenant yang belum punya",
  ],
  [
    "t.legacy_full_access, t.db_ref, t.trial_ends_at",
    "halaman Langganan — memulihkan diri untuk tenant yang sudah membayar " +
      "tetapi provisioningnya tertunda; harus melihat `db_ref` kosong",
  ],
  [
    "SELECT t.id, t.name, t.slug, t.db_ref, t.status",
    "`middleware/auth.ts` — sudah memeriksa `db_ref` kosong sendiri dan " +
      "menjawabnya dengan penjelasan, bukan 500 (lihat komentarnya)",
  ],
  [
    "SELECT k.id AS key_id, k.scope",
    "kunci API publik — memeriksa `db_ref` di jalurnya sendiri",
  ],
  [
    "SELECT t.id, t.name, t.db_ref, m.role",
    "`collections.ts` — rutenya memeriksa `m.dbRef` sendiri dan menjawab 409",
  ],
  [
    "SELECT CASE WHEN db_ref = ''",
    "sebaran jenis referensi di Admin → Infra — ember `tanpa-db` justru ADA " +
      "supaya tenant tanpa database terlihat, bukan tersembunyi (Fase 50e)",
  ],
]);

/**
 * Kueri yang menyebut `db_ref`, diambil dari argumen `prepare(...)`.
 *
 * Versi pertama pemindai ini mencocokkan pasangan backtick (`` /`[^`]*db_ref[^`]*`/ ``)
 * dan karena itu MELEWATKAN kueri di `routes/billing.ts`: ada 37 backtick
 * sebelum kueri itu — ganjil — sehingga pasangannya bergeser dan blok yang
 * dibaca bukan blok yang benar.
 *
 * Dicatat karena bentuk kegagalannya persis yang sedang dijaga berkas ini:
 * gerbang yang diam-diam memeriksa lebih sedikit daripada yang ia klaim.
 * Pencocokan kurung pada `prepare(` tidak bergantung pada jumlah backtick,
 * jadi template bersarang pun tidak menggesernya.
 */
function kueriDbRef(): { berkas: string; sql: string }[] {
  const keluar: { berkas: string; sql: string }[] = [];
  for (const rel of globSync("apps/api/src/**/*.ts", { cwd: AKAR })) {
    const src = readFileSync(join(AKAR, rel), "utf8");
    for (const m of src.matchAll(/\bprepare\s*\(/g)) {
      const buka = src.indexOf("(", m.index! + m[0].length - 1);
      let dalam = 0;
      let tutup = -1;
      for (let j = buka; j < src.length; j++) {
        if (src[j] === "(") dalam++;
        else if (src[j] === ")") {
          dalam--;
          if (dalam === 0) {
            tutup = j;
            break;
          }
        }
      }
      if (tutup < 0) continue;
      const arg = src.slice(buka + 1, tutup);
      if (!/\bdb_ref\b/.test(arg) || !/\bSELECT\b/i.test(arg)) continue;
      keluar.push({ berkas: rel, sql: arg.replace(/\s+/g, " ").trim() });
    }
  }
  return keluar;
}

describe("tenant tanpa database — kelas cacat yang sudah muncul enam kali", () => {
  it("setiap kueri db_ref menyaringnya, atau terdaftar dengan alasan", () => {
    const pelanggar = kueriDbRef().filter(({ sql }) => {
      if (/db_ref\s*<>\s*''/.test(sql)) return false;
      for (const kunci of DIKECUALIKAN.keys()) {
        if (sql.replace(/\s+/g, " ").includes(kunci.replace(/\s+/g, " "))) return false;
      }
      return true;
    });
    expect(
      pelanggar.map((p) => `${p.berkas}: ${p.sql.slice(0, 90)}`),
      "Kueri berikut mengambil `db_ref` tanpa menyaring tenant yang belum punya " +
        "database. Tambahkan `AND db_ref <> ''`, atau daftarkan di DIKECUALIKAN " +
        "beserta alasan mengapa kueri ini justru perlu melihatnya.",
    ).toEqual([]);
  });

  it("penjaga bagi penjaganya: pemindainya benar-benar menemukan kueri", () => {
    // Tanpa ini, satu salah ketik pada glob atau pola membuat uji di atas lulus
    // selamanya dengan memindai nol kueri.
    expect(kueriDbRef().length).toBeGreaterThan(8);
  });

  it("daftar pengecualian tetap kecil dan setiap entrinya masih terpakai", () => {
    expect(DIKECUALIKAN.size).toBeLessThanOrEqual(8);
    const semua = kueriDbRef().map((q) => q.sql.replace(/\s+/g, " "));
    for (const kunci of DIKECUALIKAN.keys()) {
      const norm = kunci.replace(/\s+/g, " ");
      expect(
        semua.some((s) => s.includes(norm)),
        `Pengecualian "${kunci.slice(0, 50)}" tidak cocok dengan kueri mana pun — ` +
          `kuerinya sudah berubah atau hilang, jadi pengecualiannya kini melindungi apa pun`,
      ).toBe(true);
    }
  });
});
