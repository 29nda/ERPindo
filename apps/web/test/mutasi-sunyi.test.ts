import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Fase 51a — mutasi yang gagal tanpa memberi tahu siapa pun.
 *
 * ## Kenapa gerbang ini ada
 *
 * `request()` di `api/client.ts` MELEMPAR pada status non-2xx maupun jaringan
 * mati, dan `QueryClient` aplikasi ini **tidak punya penangan galat global**
 * (`main.tsx` hanya menyetel opsi `queries`). Jadi sebuah `useMutation` tanpa
 * `onError` dan tanpa ada yang merender `.isError`/`.error` akan gagal dalam
 * diam sempurna: spinner berhenti, layar tidak berubah, pengguna menyimpulkan
 * tombolnya tidak berfungsi — atau lebih buruk, menyimpulkan aksinya berhasil.
 *
 * Empat tempat seperti itu ditemukan saat audit, dan tiga di antaranya duduk
 * TEPAT DI SEBELAH saudara yang menangani galat — jadi ini kelalaian yang
 * berulang, bukan keputusan:
 *
 * | Tempat | Akibatnya |
 * | --- | --- |
 * | `ForgotPasswordPage` | satu-satunya jalan pulih akun; dibatasi 5×/5 menit, jadi 429 nyata |
 * | `kasbank` batal-cocok | entri tetap tercocok sementara rekonsiliasi dilanjutkan |
 * | `finance` hapus template | barisnya tetap ada, tanpa sebab yang terlihat |
 * | `AppShell` keluar | sesi TETAP HIDUP padahal pengguna mengira sudah keluar |
 *
 * Tidak ada gerbang yang bisa melihatnya: TypeScript senang, ESLint senang,
 * dan ui-sim hanya menempuh jalur yang BERHASIL — kegagalan sunyi justru tak
 * pernah dilewati. Uji ini gerbangnya.
 *
 * Lingkupnya sengaja per-KOMPONEN, bukan per-berkas. Versi pertama pemindai
 * ini mencari `.isError` di seluruh berkas, sehingga `ForgotPasswordPage`
 * tertutup oleh `ResetPasswordPage` yang kebetulan tinggal di berkas yang
 * sama — dan cacat yang paling berbahaya justru luput.
 */

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Potong `{ ... }` seimbang mulai dari kurung buka di `i`. */
function blokSeimbang(s: string, i: number): string {
  let dalam = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") dalam++;
    else if (s[j] === "}") {
      dalam--;
      if (dalam === 0) return s.slice(i, j + 1);
    }
  }
  return s.slice(i);
}

type Temuan = { berkas: string; baris: number; komponen: string; nama: string };

function pindai(): Temuan[] {
  const berkas = globSync("src/**/*.tsx", { cwd: AKAR });
  const temuan: Temuan[] = [];

  for (const rel of berkas) {
    const src = readFileSync(join(AKAR, rel), "utf8");

    // Batas komponen: deklarasi fungsi tingkat atas.
    const batas: { pos: number; nama: string }[] = [
      ...src.matchAll(/^(?:export\s+)?function\s+(\w+)/gm),
    ].map((m) => ({ pos: m.index!, nama: m[1]! }));
    batas.push({ pos: src.length, nama: "<akhir>" });

    for (let k = 0; k < batas.length - 1; k++) {
      const { pos: awal, nama: komponen } = batas[k]!;
      const potong = src.slice(awal, batas[k + 1]!.pos);

      for (const m of potong.matchAll(/(?:const\s+(\w+)\s*=\s*)?useMutation\s*\(\s*\{/g)) {
        const varNama = m[1];
        const buka = potong.indexOf("{", m.index! + m[0].length - 1);
        const opsi = blokSeimbang(potong, buka);
        if (opsi.includes("onError")) continue;
        if (varNama && new RegExp(`\\b${varNama}\\.(isError|error)\\b`).test(potong)) continue;
        temuan.push({
          berkas: relative(AKAR, join(AKAR, rel)),
          baris: src.slice(0, awal + m.index!).split("\n").length,
          komponen,
          nama: varNama ?? "(anonim)",
        });
      }
    }
  }
  return temuan;
}

describe("mutasi sunyi — kegagalan yang tidak sampai ke pengguna", () => {
  it("tidak ada useMutation tanpa onError dan tanpa render galat", () => {
    const temuan = pindai();
    const daftar = temuan.map((t) => `${t.berkas}:${t.baris} ${t.komponen}() → ${t.nama}`);
    expect(
      daftar,
      "Mutasi berikut gagal tanpa jejak apa pun di layar. Tambahkan `onError` " +
        "(toast, mengikuti berkas sekitarnya) atau render `.isError` di komponennya.",
    ).toEqual([]);
  });

  it("penjaga bagi penjaganya: pemindainya benar-benar melihat sesuatu", () => {
    // Tanpa ini, satu salah ketik pada glob atau pola membuat uji di atas
    // lulus selamanya dengan memindai nol berkas — persis cara gerbang mati
    // tanpa ada yang sadar.
    const berkas = globSync("src/**/*.tsx", { cwd: AKAR });
    expect(berkas.length).toBeGreaterThan(30);
    const semuaMutasi = berkas
      .map((r) => readFileSync(join(AKAR, r), "utf8"))
      .join("\n")
      .match(/useMutation\s*\(\s*\{/g);
    expect(semuaMutasi?.length ?? 0).toBeGreaterThan(50);
  });
});
