import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Demo harus terlihat sama pada tanggal berapa pun ia disemai (Fase 55a).
 *
 * ## Cacat yang ditutup uji ini, dan kenapa ia kembali empat kali
 *
 * `scripts/seed-demo.mjs` menanggalkan pos-posnya dengan `daysAgo(n)` — `n`
 * hari sebelum HARI INI. Untuk pos yang menentukan bulan sebuah angka
 * laba-rugi, itu berarti bulannya berpindah menurut tanggal berapa demo
 * disemai: `daysAgo(6)` masuk bulan berjalan mulai tanggal 7, `daysAgo(10)`
 * baru mulai tanggal 11.
 *
 * Bebannya kebetulan berselang lebih pendek daripada pendapatannya, jadi ada
 * jendela beberapa hari tiap bulan ketika bulan berjalan sudah menanggung
 * Rp 3 juta beban tanpa Rp 17,8 juta pendapatan yang menyertainya. Pada
 * 7 September 2026 marginnya jatuh ke 2,8% — di bawah ambang rupiah DAN di
 * bawah penjaga berskala yang ditulis Fase 53a.
 *
 * Ini kali KEEMPAT bentuk cacat yang sama diperbaiki di berkas itu:
 *
 * | Fase | Yang dilakukan |
 * |---|---|
 * | 19b | `dalamBulanIni()` dibuat, dipakai blok grosir saja |
 * | 21d | faktur keempat ditambah — "dasbor demo merah di hari pertama" |
 * | 51c | faktur kelima + ambang rupiah di ui-sim |
 * | 53a | omzet dinaikkan + penjaga berskala, "menambal saja tidak cukup" |
 *
 * Ketiga perbaikan terakhir menambah UANG. Tidak satu pun menyentuh sebabnya,
 * yaitu tanggal yang tidak dikunci — sehingga cacatnya menunggu sampai
 * pertumbuhan berikutnya menipiskan marginnya lagi.
 *
 * Uji ini menutup sebabnya: pos yang menentukan bulan sebuah angka laba-rugi
 * WAJIB memakai `dalamBulanIni()`, dan yang sengaja berada di bulan lalu wajib
 * berjarak minimal 30 hari sehingga maksudnya terbaca dari angkanya sendiri.
 */

const SEED = path.join(__dirname, "..", "..", "..", "scripts", "seed-demo.mjs");
const isi = readFileSync(SEED, "utf8");

/**
 * Medan tanggal yang MENENTUKAN bulan sebuah pos laba-rugi atau masa pajak.
 *
 * Sengaja bukan "semua medan tanggal": `dueDate`, `validUntil`, `expectedDate`,
 * dan `paymentDate` menggerakkan umur piutang dan antrean, bukan bulan sebuah
 * angka laba-rugi. Menguncinya ke bulan berjalan justru akan merusak demo umur
 * piutang yang memang harus menyeberang bulan.
 */
const MEDAN_PENENTU_BULAN = ["invoiceDate", "entryDate", "disposalDate", "receiptDate"];

/**
 * Batas "sengaja di bulan lalu".
 *
 * 30 hari menjamin tanggalnya berada di luar bulan berjalan pada tanggal
 * berapa pun — termasuk Februari. Offset di bawahnya menyeberang pada sebagian
 * hari saja, dan itulah bentuk cacat yang tidak pernah terlihat di hari biasa.
 */
const AMBANG_BULAN_LALU = 30;

describe("seed demo tidak berubah menurut tanggal penyemaian (Fase 55a)", () => {
  it("berkas semai terbaca — berkas hilang bukan kelulusan", () => {
    expect(isi.length).toBeGreaterThan(10_000);
    expect(isi).toContain("dalamBulanIni");
  });

  it("tidak ada pos penentu bulan yang memakai daysAgo berselang pendek", () => {
    const pola = new RegExp(`\\b(${MEDAN_PENENTU_BULAN.join("|")}): daysAgo\\((\\d{1,2})\\)`, "g");
    const pelanggaran: string[] = [];
    for (const m of isi.matchAll(pola)) {
      const n = Number(m[2]);
      // `daysAgo(0)` adalah hari ini — selalu di dalam bulan berjalan.
      if (n === 0 || n >= AMBANG_BULAN_LALU) continue;
      pelanggaran.push(`${m[1]}: daysAgo(${n}) — pakai dalamBulanIni(${n})`);
    }
    expect(pelanggaran).toEqual([]);
  });

  it("helper penguncinya masih benar-benar mengunci", () => {
    // Uji di atas hanya berarti bila `dalamBulanIni` memang menahan tanggalnya
    // di dalam bulan. Gerbang yang menuntut pemakaian fungsi yang sudah tidak
    // melakukan apa-apa adalah gerbang yang mati tanpa suara.
    expect(isi).toMatch(/const dalamBulanIni = \(n\) => \{[\s\S]*?awalBulanIni[\s\S]*?\}/);
    expect(isi).toMatch(/return d < awalBulanIni \? awalBulanIni : d;/);
  });

  it("pos yang sengaja di bulan lalu berjarak cukup untuk terbaca maksudnya", () => {
    // Kebalikannya juga dijaga: offset 25 hari "kelihatan seperti bulan lalu"
    // tetapi mendarat di bulan berjalan pada tanggal 26 ke atas.
    const pola = new RegExp(`\\b(${MEDAN_PENENTU_BULAN.join("|")}): daysAgo\\((\\d{1,2})\\)`, "g");
    const abu: string[] = [];
    for (const m of isi.matchAll(pola)) {
      const n = Number(m[2]);
      if (n > 0 && n < AMBANG_BULAN_LALU) abu.push(`${m[1]}: daysAgo(${n})`);
    }
    expect(abu).toEqual([]);
  });
});
