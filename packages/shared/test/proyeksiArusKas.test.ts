import { describe, expect, it } from "vitest";
import { proyeksikanArusKas, type ArusDiproyeksikan } from "../src/accounting";

/**
 * Fase 22f — proyeksi arus kas 30/60/90 hari.
 *
 * Yang paling mudah salah di sini bukan penjumlahannya melainkan **penempatan
 * ember**: arus yang jatuh persis di batas ember, dan arus yang tenggatnya
 * sudah lewat. Keduanya menggeser saldo akhir tanpa satu angka pun terlihat
 * aneh, jadi diuji secara khusus.
 */

const hariIni = "2026-08-11";

const arus = (tanggal: string, jumlah: number, sumber: ArusDiproyeksikan["sumber"] = "piutang"): ArusDiproyeksikan => ({
  tanggal,
  jumlah,
  sumber,
  keterangan: "uji",
  terlambat: tanggal < hariIni,
});

describe("proyeksikanArusKas — penempatan ember", () => {
  it("arus dikelompokkan ke ember 30/60/90 sesuai tanggalnya", () => {
    const p = proyeksikanArusKas(
      1_000_000,
      [arus("2026-08-20", 500_000), arus("2026-09-20", 300_000), arus("2026-10-20", 200_000)],
      hariIni,
    );
    expect(p.ember.map((e) => e.masuk)).toEqual([500_000, 300_000, 200_000]);
  });

  it("saldo akhir tiap ember BERANTAI, bukan dihitung ulang dari saldo awal", () => {
    const p = proyeksikanArusKas(
      1_000_000,
      [arus("2026-08-20", 500_000), arus("2026-09-20", 300_000), arus("2026-10-20", 200_000)],
      hariIni,
    );
    expect(p.ember.map((e) => e.saldoAkhir)).toEqual([1_500_000, 1_800_000, 2_000_000]);
  });

  it("arus tepat DI batas ember masuk ke ember itu, bukan ke berikutnya", () => {
    // 2026-09-10 = tepat 30 hari dari 2026-08-11.
    const p = proyeksikanArusKas(0, [arus("2026-09-10", 100_000)], hariIni);
    expect(p.ember[0]!.masuk).toBe(100_000);
    expect(p.ember[1]!.masuk).toBe(0);
  });

  it("arus sehari SESUDAH batas masuk ke ember berikutnya", () => {
    const p = proyeksikanArusKas(0, [arus("2026-09-11", 100_000)], hariIni);
    expect(p.ember[0]!.masuk).toBe(0);
    expect(p.ember[1]!.masuk).toBe(100_000);
  });

  it("arus di luar 90 hari TIDAK ikut sama sekali", () => {
    const p = proyeksikanArusKas(0, [arus("2027-01-01", 999_000_000)], hariIni);
    expect(p.ember.every((e) => e.masuk === 0)).toBe(true);
    expect(p.ember[2]!.saldoAkhir).toBe(0);
  });
});

describe("proyeksikanArusKas — yang sudah jatuh tempo", () => {
  const telat = [arus("2026-07-01", 400_000), arus("2026-08-20", 100_000)];

  it("piutang yang sudah lewat tempo masuk ember PERTAMA, tidak dibuang", () => {
    const p = proyeksikanArusKas(0, telat, hariIni);
    expect(p.ember[0]!.masuk).toBe(500_000);
  });

  it("jumlah arus terlambat dilaporkan terpisah supaya bisa dinilai", () => {
    expect(proyeksikanArusKas(0, telat, hariIni).jumlahTerlambat).toBe(1);
  });

  it("tanpa arus terlambat, angkanya nol — bukan undefined", () => {
    expect(proyeksikanArusKas(0, [arus("2026-08-20", 100_000)], hariIni).jumlahTerlambat).toBe(0);
  });
});

describe("proyeksikanArusKas — peringatan defisit", () => {
  it("menemukan ember pertama yang saldonya minus", () => {
    const p = proyeksikanArusKas(
      1_000_000,
      [arus("2026-08-20", -2_000_000, "hutang"), arus("2026-09-20", 5_000_000)],
      hariIni,
    );
    expect(p.emberDefisit).toBe(30);
    expect(p.ember[0]!.saldoAkhir).toBe(-1_000_000);
  });

  it("defisit yang pulih di ember berikutnya TETAP dilaporkan — kasnya tetap pernah minus", () => {
    const p = proyeksikanArusKas(
      1_000_000,
      [arus("2026-08-20", -2_000_000, "hutang"), arus("2026-09-20", 5_000_000)],
      hariIni,
    );
    expect(p.ember[1]!.saldoAkhir).toBeGreaterThan(0);
    expect(p.emberDefisit).toBe(30);
  });

  it("kas yang tidak pernah minus → null, bukan 0 (0 adalah nomor ember yang sah)", () => {
    const p = proyeksikanArusKas(1_000_000, [arus("2026-08-20", 100_000)], hariIni);
    expect(p.emberDefisit).toBeNull();
  });
});

describe("proyeksikanArusKas — penjaga", () => {
  it("tanpa arus sama sekali: saldo awal bertahan di ketiga ember", () => {
    const p = proyeksikanArusKas(750_000, [], hariIni);
    expect(p.ember.map((e) => e.saldoAkhir)).toEqual([750_000, 750_000, 750_000]);
    expect(p.emberDefisit).toBeNull();
  });

  it("masuk & keluar dipisah, bukan dijumlahkan jadi satu angka bersih", () => {
    const p = proyeksikanArusKas(0, [arus("2026-08-20", 500_000), arus("2026-08-21", -200_000, "hutang")], hariIni);
    expect(p.ember[0]).toMatchObject({ masuk: 500_000, keluar: 200_000, bersih: 300_000 });
  });

  it("batas ember bisa disetel dan tetap terurut", () => {
    const p = proyeksikanArusKas(0, [arus("2026-08-20", 100_000)], hariIni, [90, 30, 60]);
    expect(p.ember.map((e) => e.hari)).toEqual([30, 60, 90]);
  });
});
