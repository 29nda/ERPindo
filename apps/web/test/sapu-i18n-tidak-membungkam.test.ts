import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pengecualian penyapu i18n TIDAK boleh menelan naskah (Fase 56b).
 *
 * ## Cacat yang ditutup uji ini
 *
 * `scripts/sapu-i18n.mjs` melaporkan utang teks satu bahasa, dan sejak fase ini
 * angkanya berambang: ia tidak boleh naik. Ambang membuat satu godaan menjadi
 * jalan keluar termudah — ketika angkanya naik, memperluas pengecualian penyapu
 * lebih cepat daripada memperbaiki naskahnya. Pengecualian yang terlalu lebar
 * menurunkan angka tanpa menurunkan utang, dan sesudah itu tidak ada lagi yang
 * bisa membedakan keduanya.
 *
 * Itu bukan kekhawatiran teoretis. Versi pertama pengecualian "potongan markup"
 * di fase ini melewati SELURUH potongan yang memuat pasangan `atribut="`, dan
 * dengan begitu menyembunyikan
 *
 *   `</div> <table><thead><tr><th>Barang</th><th class="r">Jumlah</th>…`
 *
 * — naskah surat jalan yang betul-betul dicetak dan dibaca pelanggan. Cacatnya
 * baru ketahuan karena penyapu baru dijalankan atas kode LAMA dan hasilnya
 * dibandingkan butir demi butir. Uji ini membuat pembandingan itu permanen.
 *
 * ## Caranya
 *
 * Sebuah berkas contoh berisi dua belas kasus yang sudah diputuskan: enam yang
 * memang bukan naskah (nilai enum, kunci cache, nama berkas, pesan pengembang,
 * contoh isi CSV, sisi Inggris pasangan) dan enam yang naskah betulan — termasuk
 * naskah yang BERSEMBUNYI DI DALAM markup, yaitu bentuk yang paling mudah
 * tertelan. Penyapu dijalankan atas berkas itu, lalu keluarannya diperiksa.
 */

const AKAR = path.join(__dirname, "..", "..", "..");
const CONTOH = "apps/web/test/fixtures/sapu-i18n-contoh.tsx.txt";

const hasil = spawnSync("node", ["scripts/sapu-i18n.mjs", CONTOH], {
  cwd: AKAR,
  encoding: "utf8",
});
const keluaran = `${hasil.stdout}${hasil.stderr}`;

describe("penyapu i18n: yang bukan naskah dilewati", () => {
  it.each([
    ["nilai enum kontrak API", "pembelian"],
    ["nilai enum metode penyusutan", "saldo_menurun"],
    ["kunci cache TanStack Query", "bank-recon"],
    ["nama berkas unduhan", "produk.csv"],
    ["pesan galat untuk pengembang", "WorkspaceContext"],
    ["contoh isi berkas CSV", "kode,debit,kredit"],
    ["sisi Inggris pasangan dwibahasa", "final income tax"],
    ["nama resmi formulir DJP", "SPT Masa PPN"],
    ["wilayah kerja yang padanan Inggrisnya ada", "Beli & Stok"],
  ])("%s tidak dilaporkan", (_nama, potongan) => {
    expect(keluaran).not.toContain(potongan);
  });
});

describe("penyapu i18n: naskah tetap tertagih", () => {
  it("kalimat layar biasa dilaporkan", () => {
    expect(keluaran).toContain("Faktur ini belum dibayar");
  });

  /**
   * Inti uji ini. Kerangka markup dibuang, ISINYA dinilai ulang — jadi naskah
   * yang duduk di dalam tag tetap tertagih meski potongannya penuh atribut.
   */
  it("naskah di dalam markup cetak tetap dilaporkan", () => {
    expect(keluaran).toContain("Barang");
    expect(keluaran).toContain("Jumlah");
  });

  it("prosa berbaris banyak tidak disalahkira sebagai berkas CSV", () => {
    expect(keluaran).toContain("Simpan dulu, lalu periksa");
  });

  it("wilayah kerja tanpa padanan Inggris dilaporkan sebagai bolong", () => {
    expect(keluaran).toContain("Uang & Pajak — wilayah tanpa padanan Inggris");
  });
});

describe("penyapu i18n: ambang menahan kenaikan", () => {
  const skrip = readFileSync(path.join(AKAR, "scripts/sapu-i18n.mjs"), "utf8");

  it("ambang tertulis di skrip, bukan diturunkan dari hitungan saat itu", () => {
    expect(skrip).toMatch(/const AMBANG = \{ layar: \d+, atribut: \d+ \}/);
  });

  it("hitungan yang melebihi ambang membuat penyapu gagal", () => {
    // Berkas contoh memuat lima temuan — jauh di atas ambang repo.
    expect(hasil.status).toBe(1);
    expect(keluaran).toContain("Utang dwibahasa NAIK");
  });
});
