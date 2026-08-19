import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { galatAkunKasBank } from "../src/lib/accounting";

/**
 * Penjaga naskah pesan galat (Fase 33g).
 *
 * Aturan "akun pembayaran harus kas/bank" sebelumnya diucapkan dengan sembilan
 * bunyi berbeda di sebelas tempat — bukan karena aturannya berbeda, melainkan
 * karena tiap penulis memilih katanya sendiri. Pengguna yang menabraknya di dua
 * layar tidak punya cara tahu bahwa itu aturan yang sama.
 *
 * `galatAkunKasBank()` menjadikannya satu kalimat. Uji ini menjaga agar tidak
 * ada yang menuliskannya ulang dengan tangan — kesalahan yang tidak akan
 * ditangkap tsc, lint, maupun smoke, karena string apa pun tetap sah.
 */

function berkasTs(dir: string): string[] {
  const keluar: string[] = [];
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) keluar.push(...berkasTs(p));
    else if (nama.endsWith(".ts")) keluar.push(p);
  }
  return keluar;
}

const DIR = dirname(fileURLToPath(import.meta.url));
const SUMBER = [...berkasTs(join(DIR, "../src")), ...berkasTs(join(DIR, "../../../packages/shared/src"))];

describe("pesan galat berbicara dengan satu suara (Fase 33g)", () => {
  it("aturan akun kas/bank hanya diucapkan lewat galatAkunKasBank()", () => {
    // Hanya posisi yang benar-benar MENGELUARKAN pesan yang diperiksa —
    // `error:`, `message:`, `min(1, …)`. Percobaan pertama memindai seluruh isi
    // berkas dan memerah pada komentar dokumentasi `galatAkunKasBank()` sendiri,
    // yang memang mengutip bunyi-bunyi lama sebagai contoh. Uji yang melarang
    // sebuah aturan disebutkan dalam penjelasannya sendiri menjaga hal yang salah.
    const polaLama = /(?:error|message):\s*"[^"]*harus akun (?:kas\/bank|aset \(kas\/bank\))[^"]*"|min\(1,\s*"[^"]*harus akun[^"]*"\)/;
    const pelanggar: string[] = [];
    for (const f of SUMBER) {
      const isi = readFileSync(f, "utf8");
      if (polaLama.test(isi)) pelanggar.push(f.split("/").slice(-2).join("/"));
    }
    expect(pelanggar, `ditulis ulang dengan tangan di: ${pelanggar.join(", ")}`).toEqual([]);
  });

  it("galatAkunKasBank menyebut perannya dan langkah lanjutnya", () => {
    const pesan = galatAkunKasBank("pembayar");
    // Peran disebut: di layar dengan beberapa kolom akun, itu satu-satunya
    // petunjuk kolom mana yang salah.
    expect(pesan).toContain("pembayar");
    // Langkah lanjut ada: pesan yang hanya menyatakan larangan meninggalkan
    // pengguna di tempat yang sama.
    expect(pesan).toContain("Pilih");
    expect(pesan.endsWith(".")).toBe(true);
  });

  it('pesan "… tidak ditemukan." selalu memberi langkah lanjut', () => {
    // Acuan yang hilang hampir selalu berarti data itu dihapus/diarsipkan dari
    // tab lain, atau halaman ini sudah usang. Langkahnya sama untuk semuanya.
    const buntu: string[] = [];
    for (const f of SUMBER) {
      const isi = readFileSync(f, "utf8");
      for (const m of isi.matchAll(/error:\s*"([^"\\]*?tidak ditemukan\.)"/g)) {
        buntu.push(`${f.split("/").slice(-1)[0]}: ${m[1]}`);
      }
    }
    expect(buntu, `tanpa langkah lanjut: ${buntu.join(" · ")}`).toEqual([]);
  });
});
