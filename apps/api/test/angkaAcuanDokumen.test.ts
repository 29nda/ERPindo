import { CONTROL_PLANE_MIGRATIONS, TENANT_MIGRATIONS } from "@erpindo/db";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Fase 50d — angka acuan struktur di `docs/08-referensi-teknis-repo.md`.
 *
 * ## Kenapa uji ini ada
 *
 * Dokumen itu menyebut jumlah modul route, halaman, tabel, dan migrasi. Angka
 * itu sudah salah DUA KALI: Fase 26b mengoreksi tiga angka, lalu Fase 50d
 * menemukan tiga angka yang sama basi lagi (16 → 17 migrasi control-plane,
 * 81 → 89 tabel tenant, 46 → 57 migrasi tenant) setelah Fase 43–48 menambah
 * sebelas migrasi.
 *
 * Koreksi Fase 26b menyimpulkan bahwa menghitung dari **modul yang dimuat**
 * adalah caranya, dan itu benar — tetapi tidak cukup. Menghitung sekali lalu
 * menyalin hasilnya ke Markdown tetap menghasilkan angka beku, karena tidak
 * ada yang menagihnya lagi sesudah itu. Perintah hitung ulang yang diterbitkan
 * dokumen itu bahkan sudah tidak bisa dijalankan.
 *
 * Jadi yang dibutuhkan bukan cara menghitung yang lebih baik, melainkan
 * gerbang. Uji ini gerbangnya, dan sengaja diletakkan di suite yang memang
 * sudah berjalan (`pnpm test`) supaya tidak ada langkah baru untuk dilupakan.
 *
 * Sepupu dari `scripts/lib/angka-gerbang.mjs` (Fase 50a): kelas cacat yang
 * sama — angka tayang yang ditulis tangan — hanya di dokumen yang berbeda.
 */

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DOK = "docs/08-referensi-teknis-repo.md";
const isi = readFileSync(join(AKAR, DOK), "utf8");

/** Jumlah pernyataan `CREATE TABLE` — cara hitung yang dipakai dokumen itu. */
const tabel = (m: { statements: string[] }[]) =>
  m.flatMap((x) => x.statements).filter((s) => /CREATE TABLE/.test(s)).length;

const berkasTs = (rel: string) => readdirSync(join(AKAR, rel)).filter((f) => f.endsWith(".ts"));
const berkasTsx = (rel: string) => readdirSync(join(AKAR, rel)).filter((f) => f.endsWith(".tsx"));

/**
 * Mengambil satu angka dari dokumen lewat pola bertanda kurung tangkap.
 *
 * Pola yang TIDAK ketemu adalah kegagalan, bukan hal yang dilewati: kalimatnya
 * boleh diubah, tapi penjaganya harus ikut diubah pada commit yang sama.
 * Gerbang yang berhenti menemukan apa yang dijaganya adalah gerbang mati —
 * pelajaran yang sudah dibayar dua kali oleh dokumen ini sendiri.
 */
function angkaDok(pola: RegExp, apa: string): number {
  const m = isi.match(pola);
  expect(m, `${DOK}: kutipan "${apa}" tidak ditemukan lagi — kalimatnya diubah tanpa memperbarui penjaganya`).toBeTruthy();
  return Number(m![1]);
}

describe("angka acuan docs/08 — struktur repo tidak boleh dikutip dari ingatan", () => {
  it("jumlah migrasi & tabel control-plane sesuai modul yang dimuat", () => {
    expect(angkaDok(/erpindo-control-plane`\): \*\*(\d+) tabel\*\*/, "tabel control-plane")).toBe(
      tabel(CONTROL_PLANE_MIGRATIONS),
    );
    expect(angkaDok(/erpindo-control-plane`\): \*\*\d+ tabel\*\*,\s*\n\*\*(\d+) migrasi\*\*/, "migrasi control-plane")).toBe(
      CONTROL_PLANE_MIGRATIONS.length,
    );
  });

  it("jumlah migrasi & tabel tenant sesuai modul yang dimuat", () => {
    expect(angkaDok(/\*\*Per tenant\*\*: \*\*(\d+) tabel\*\*/, "tabel tenant")).toBe(tabel(TENANT_MIGRATIONS));
    expect(angkaDok(/\*\*Per tenant\*\*: \*\*\d+ tabel\*\*, \*\*(\d+) migrasi\*\*/, "migrasi tenant")).toBe(
      TENANT_MIGRATIONS.length,
    );
  });

  it("jumlah modul route sesuai isi apps/api/src/routes/ — di dua tempat dokumen menyebutnya", () => {
    const nyata = berkasTs("apps/api/src/routes").length;
    expect(angkaDok(/Angka acuan: \*\*(\d+) modul route\*\*/, "modul route (angka acuan)")).toBe(nyata);
    // Disebut dua kali; yang kedua pernah tertulis "~48" sementara yang pertama
    // "48" — dua angka untuk satu hal, keduanya salah. Dijaga terpisah supaya
    // memperbaiki satu tidak menutupi yang lain.
    expect(angkaDok(/Pemasangan (\d+) modul route di bawah/, "modul route (siklus permintaan)")).toBe(nyata);
  });

  it("jumlah halaman aplikasi sesuai isi apps/web/src/pages/", () => {
    // Halaman APLIKASI = akar `pages/` + `pages/settings/`. Landing, panduan,
    // dan publik dihitung terpisah oleh dokumen ("+ halaman landing/panduan/
    // publik"), jadi tidak ikut.
    const nyata = berkasTsx("apps/web/src/pages").length + berkasTsx("apps/web/src/pages/settings").length;
    expect(angkaDok(/\*\*(\d+) halaman\s*\naplikasi\*\*/, "halaman aplikasi")).toBe(nyata);
  });

  it("jumlah modul packages/shared sesuai isinya, tanpa barrel index.ts", () => {
    const nyata = berkasTs("packages/shared/src").filter((f) => f !== "index.ts").length;
    expect(angkaDok(/\| `packages\/shared` \| (\d+) modul skema zod/, "modul shared")).toBe(nyata);
  });

  it("penjaga bagi penjaganya: dokumennya benar-benar terbaca dan berisi", () => {
    // Tanpa ini, dokumen yang terhapus atau berpindah akan membuat SEMUA pola di
    // atas gagal dengan pesan "kutipan tidak ditemukan" — menyesatkan, karena
    // sebabnya bukan kalimat yang diubah.
    expect(isi.length).toBeGreaterThan(2000);
    expect(isi).toContain("Angka acuan:");
  });
});
