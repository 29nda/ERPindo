import { describe, expect, it } from "vitest";
import { hargaTereskalasi, rencanaPerpanjangan, tahunBerjalan } from "../src/projects";

/**
 * Kontrak: eskalasi harga & perpanjangan (Fase 45).
 *
 * Yang diuji adalah dua hal yang menentukan siapa membayar berapa: eskalasinya
 * berbunga majemuk (bukan sederhana), dan tahunnya dihitung dari ulang-tahun
 * kontrak (bukan tahun kalender).
 */
describe("tahunBerjalan", () => {
  it("memakai ulang-tahun kontrak, bukan tahun kalender", () => {
    // Kontrak mulai 1 Juli 2026. Pada 1 Januari 2027 nomor tahunnya sudah
    // berganti, tetapi setahun belum lewat — menaikkan harga di sini berarti
    // menaikkannya enam bulan setelah diteken.
    expect(tahunBerjalan("2026-07-01", "2027-01-01")).toBe(0);
    expect(tahunBerjalan("2026-07-01", "2027-06-30")).toBe(0);
    expect(tahunBerjalan("2026-07-01", "2027-07-01")).toBe(1);
  });

  it("menghitung beberapa tahun", () => {
    expect(tahunBerjalan("2020-03-15", "2026-03-15")).toBe(6);
    expect(tahunBerjalan("2020-03-15", "2026-03-14")).toBe(5);
  });

  it("tanggal sebelum jangkar dan tanggal tak sah menghasilkan 0", () => {
    expect(tahunBerjalan("2026-07-01", "2025-01-01")).toBe(0);
    expect(tahunBerjalan("bukan-tanggal", "2026-07-01")).toBe(0);
  });
});

describe("hargaTereskalasi", () => {
  it("tahun pertama belum naik", () => {
    expect(hargaTereskalasi(10_000_000, 500, 0)).toBe(10_000_000);
  });

  it("naik 5% pada tahun kedua", () => {
    expect(hargaTereskalasi(10_000_000, 500, 1)).toBe(10_500_000);
  });

  it("BERBUNGA MAJEMUK, bukan sederhana", () => {
    // 5% per tahun selama 5 tahun: majemuk 12.762.816, sederhana 12.500.000.
    // Selisih 262.816 dibayar salah satu pihak, dan kontraknya menyebut
    // "naik 5% per tahun" — yang berarti dari harga tahun sebelumnya.
    const majemuk = hargaTereskalasi(10_000_000, 500, 5);
    const sederhana = 10_000_000 + 10_000_000 * 0.05 * 5;
    expect(majemuk).toBe(12_762_816);
    expect(majemuk).toBeGreaterThan(sederhana);
  });

  it("eskalasi nol berarti harga tetap selamanya", () => {
    expect(hargaTereskalasi(10_000_000, 0, 10)).toBe(10_000_000);
  });

  it("hasilnya selalu bilangan bulat rupiah", () => {
    for (const tahun of [1, 2, 3, 7]) {
      expect(Number.isInteger(hargaTereskalasi(3_333_333, 375, tahun))).toBe(true);
    }
  });

  it("harga dasar tidak pernah berubah — eskalasi selalu dihitung ulang darinya", () => {
    // Inilah alasan fungsi ini murni dan tidak menyentuh basis data. Harga yang
    // disepakati awal harus tetap terbaca selamanya supaya kenaikannya bisa
    // diperiksa pelanggan.
    const dasar = 10_000_000;
    hargaTereskalasi(dasar, 500, 3);
    expect(dasar).toBe(10_000_000);
  });
});

describe("rencanaPerpanjangan", () => {
  it("memperingatkan jauh sebelum berakhir, bukan pada hari terakhirnya", () => {
    const r = rencanaPerpanjangan("2026-12-31", "2026-11-15");
    expect(r?.jatuhTempo).toBe(true);
    expect(r?.sisaHari).toBe(46);
  });

  it("masih jauh: belum jatuh tempo", () => {
    const r = rencanaPerpanjangan("2026-12-31", "2026-06-01");
    expect(r?.jatuhTempo).toBe(false);
    expect(r?.sisaHari).toBe(213);
  });

  it("sudah lewat: sisa hari negatif dan tetap jatuh tempo", () => {
    const r = rencanaPerpanjangan("2026-01-31", "2026-03-01");
    expect(r?.sisaHari).toBeLessThan(0);
    expect(r?.jatuhTempo).toBe(true);
  });

  it("kontrak tanpa tanggal berakhir tidak pernah jatuh tempo perpanjangan", () => {
    expect(rencanaPerpanjangan(null, "2026-03-01")).toBeNull();
    expect(rencanaPerpanjangan(undefined, "2026-03-01")).toBeNull();
  });

  it("ambang bisa disetel", () => {
    expect(rencanaPerpanjangan("2026-12-31", "2026-11-15", 30)?.jatuhTempo).toBe(false);
    expect(rencanaPerpanjangan("2026-12-31", "2026-11-15", 90)?.jatuhTempo).toBe(true);
  });
});
