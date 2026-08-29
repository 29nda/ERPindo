import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FITUR_UTAMA } from "@erpindo/shared";

/**
 * Penjaga "produk berjalan, situsnya tertinggal" (Fase 49).
 *
 * ## Kelas cacat yang ditutup uji ini
 *
 * Fase 42b menutup arah yang satu: halaman menjanjikan yang tidak ada di
 * produk. Sepuluh fase sesudahnya memperlihatkan arah SEBALIKNYA, dan tidak
 * ada satu pun gerbang yang melihatnya: THR, lembur, pesangon, komisi, target,
 * eskalasi kontrak, PPh 22, e-Bupot, konsinyasi, dan dropship semuanya
 * dikirim ke produksi tanpa satu kata pun muncul di situs yang menjualnya.
 *
 * Kerugiannya nyata meski sunyi: pembeli membandingkan ERPindo dengan pesaing
 * memakai daftar yang salah, dan modul yang paling sulit dibangun justru yang
 * paling tidak terlihat.
 *
 * `FITUR_UTAMA` adalah satu-satunya sumber yang memberi makan tiga permukaan
 * sekaligus — halaman landing, `featureList` JSON-LD, dan bagian Modul di
 * `/llms.txt`. Karena itu ia tempat yang tepat untuk dijaga.
 *
 * Yang diperiksa: tiap istilah di bawah adalah nama modul yang BENAR-BENAR ada
 * di produk (dibuktikan oleh migrasinya), jadi ia wajib disebut di situs.
 * Menambah fitur besar tanpa menyebutnya akan memerahkan uji ini.
 */
const AKAR = path.join(__dirname, "../../..");

/**
 * Istilah yang wajib muncul di daftar fitur, beserta bukti keberadaannya di
 * produk. Bukti berupa nama tabel/kolom yang dicari di migrasi — bukan sekadar
 * keyakinan penulis uji.
 */
const WAJIB_DISEBUT: { istilah: RegExp; bukti: string; fase: string }[] = [
  { istilah: /\bTHR\b/, bukti: "thr_runs", fase: "43a" },
  { istilah: /lembur/i, bukti: "overtime_records", fase: "43b" },
  { istilah: /komisi/i, bukti: "commission_schemes", fase: "44a" },
  { istilah: /target penjualan/i, bukti: "sales_targets", fase: "44b" },
  { istilah: /adendum|kenaikan harga tahunan/i, bukti: "contract_amendments", fase: "45" },
  { istilah: /PPh 22/, bukti: "tax_pph22", fase: "46" },
  { istilah: /e-Bupot/i, bukti: "e-bupot", fase: "46" },
  { istilah: /pesangon/i, bukti: "severance_records", fase: "47" },
  { istilah: /PKWT/, bukti: "employment_type", fase: "47" },
  { istilah: /konsinyasi/i, bukti: "is_consignment", fase: "48b" },
  { istilah: /dropship/i, bukti: "is_dropship", fase: "48b" },
];

const migrasi = readFileSync(path.join(AKAR, "packages/db/src/migrations.ts"), "utf8");
const rute = readFileSync(path.join(AKAR, "apps/api/src/routes/tax.ts"), "utf8");
const semuaFitur = FITUR_UTAMA.join("\n");

describe("daftar fitur situs tidak tertinggal dari produk", () => {
  it("uji ini benar-benar memeriksa sesuatu — daftar kosong bukan kelulusan", () => {
    expect(WAJIB_DISEBUT.length).toBeGreaterThan(8);
    expect(FITUR_UTAMA.length).toBeGreaterThan(10);
  });

  it("setiap istilah yang diwajibkan memang ADA di produk", () => {
    // Penjaga bagi penjaganya sendiri: kalau buktinya lenyap dari migrasi,
    // uji di bawah akan menuntut situs menyebut fitur yang sudah tidak ada.
    const tanpaBukti = WAJIB_DISEBUT.filter(
      (w) => !migrasi.includes(w.bukti) && !rute.includes(w.bukti),
    ).map((w) => `${w.bukti} (Fase ${w.fase})`);
    expect(tanpaBukti).toEqual([]);
  });

  it("setiap fitur yang ada di produk disebut di daftar fitur situs", () => {
    const tidakDisebut = WAJIB_DISEBUT.filter((w) => !w.istilah.test(semuaFitur)).map(
      (w) => `Fase ${w.fase}: ${w.istilah.source}`,
    );
    expect(tidakDisebut).toEqual([]);
  });

  it("tiap butir daftar fitur adalah kalimat, bukan potongan", () => {
    // Butir sepotong dua kata tidak memberi tahu pembaca apa pun, dan di
    // `featureList` JSON-LD ia menjadi klaim yang tak bisa ditafsirkan mesin.
    const terlaluPendek = FITUR_UTAMA.filter((f) => f.split(" ").length < 4);
    expect(terlaluPendek).toEqual([]);
  });
});
