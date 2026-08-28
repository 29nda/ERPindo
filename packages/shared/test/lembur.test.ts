import { describe, expect, it } from "vitest";
import { BATAS_JAM_LEMBUR, hitungLembur, PEMBAGI_UPAH_JAM, upahPerJam } from "../src/payroll";

/**
 * Lembur berumus — PP 35/2021 (Fase 43b).
 *
 * Pengalinya berjenjang, dan justru jenjang itulah yang paling sering salah
 * dihitung: mengalikan seluruh jam dengan satu angka selalu keliru. Uji ini
 * menyasar tiap batas jenjangnya, bukan satu contoh yang kebetulan benar.
 */
const UPAH = 8_650_000; // 8.650.000 / 173 = 50.000 pas — memudahkan membaca angkanya.

describe("upahPerJam", () => {
  it("membagi upah sebulan dengan 173, sesuai pasal 32", () => {
    expect(PEMBAGI_UPAH_JAM).toBe(173);
    expect(upahPerJam(UPAH)).toBe(50_000);
  });

  it("membulatkan ke rupiah terdekat", () => {
    expect(upahPerJam(5_000_000)).toBe(Math.round(5_000_000 / 173));
  });
});

describe("lembur hari kerja biasa", () => {
  it("jam pertama 1,5x", () => {
    const r = hitungLembur({ upahSebulan: UPAH, jam: 1, jenisHari: "biasa" });
    expect(r.amount).toBe(75_000);
    expect(r.segmen).toEqual([{ jam: 1, kali: 1.5, amount: 75_000 }]);
  });

  it("jam kedua dan seterusnya 2x — bukan seluruhnya 1,5x", () => {
    // Kesalahan lazim: mengalikan 3 jam dengan 1,5 (225.000). Yang benar
    // 1 jam x 1,5 + 2 jam x 2 = 275.000.
    const r = hitungLembur({ upahSebulan: UPAH, jam: 3, jenisHari: "biasa" });
    expect(r.amount).toBe(275_000);
    expect(r.amount).not.toBe(225_000);
  });

  it("jam pecahan dipotong pada batas segmen", () => {
    // 1,5 jam = 1 jam x 1,5 + 0,5 jam x 2 = 75.000 + 50.000.
    const r = hitungLembur({ upahSebulan: UPAH, jam: 1.5, jenisHari: "biasa" });
    expect(r.segmen).toHaveLength(2);
    expect(r.amount).toBe(125_000);
  });

  it("batas 4 jam ditandai, bukan dipotong diam-diam", () => {
    // Jam yang sudah dikerjakan tetap hak karyawan. Yang dilanggar perusahaan
    // adalah batas waktu kerjanya, dan itu harus terlihat — bukan ditutup
    // dengan membayar kurang.
    const r = hitungLembur({ upahSebulan: UPAH, jam: 6, jenisHari: "biasa" });
    expect(r.melampauiBatas).toBe(true);
    expect(r.batasJam).toBe(4);
    // 1 x 1,5 + 5 x 2 = 11,5 jam-upah.
    expect(r.amount).toBe(575_000);
  });

  it("tepat di batas tidak ditandai", () => {
    expect(hitungLembur({ upahSebulan: UPAH, jam: 4, jenisHari: "biasa" }).melampauiBatas).toBe(false);
  });
});

describe("lembur hari libur — pekan 6 hari kerja", () => {
  it("jam 1-7 seluruhnya 2x", () => {
    const r = hitungLembur({ upahSebulan: UPAH, jam: 7, jenisHari: "libur6" });
    expect(r.amount).toBe(7 * 2 * 50_000);
    expect(r.segmen).toHaveLength(1);
  });

  it("jam ke-8 melompat ke 3x", () => {
    const r = hitungLembur({ upahSebulan: UPAH, jam: 8, jenisHari: "libur6" });
    expect(r.amount).toBe(7 * 2 * 50_000 + 1 * 3 * 50_000);
    expect(r.segmen.at(-1)).toEqual({ jam: 1, kali: 3, amount: 150_000 });
  });

  it("jam 9-10 melompat lagi ke 4x", () => {
    const r = hitungLembur({ upahSebulan: UPAH, jam: 10, jenisHari: "libur6" });
    expect(r.amount).toBe(7 * 2 * 50_000 + 1 * 3 * 50_000 + 2 * 4 * 50_000);
    expect(r.segmen).toHaveLength(3);
    expect(r.melampauiBatas).toBe(false);
  });
});

describe("lembur hari libur — pekan 5 hari kerja", () => {
  it("jenjangnya bergeser satu jam dibanding pekan 6 hari", () => {
    // Inilah bedanya, dan bedanya nyata: pada jam ke-8, pekan 5 hari masih 2x
    // sedangkan pekan 6 hari sudah 3x. Memakai tangga yang salah membayar
    // karyawan terlalu banyak atau terlalu sedikit, keduanya bermasalah.
    const lima = hitungLembur({ upahSebulan: UPAH, jam: 8, jenisHari: "libur5" });
    const enam = hitungLembur({ upahSebulan: UPAH, jam: 8, jenisHari: "libur6" });
    expect(lima.amount).toBe(8 * 2 * 50_000);
    expect(enam.amount).toBeGreaterThan(lima.amount);
  });

  it("jam ke-9 3x, jam 10-11 4x", () => {
    const r = hitungLembur({ upahSebulan: UPAH, jam: 11, jenisHari: "libur5" });
    expect(r.amount).toBe(8 * 2 * 50_000 + 1 * 3 * 50_000 + 2 * 4 * 50_000);
    expect(BATAS_JAM_LEMBUR.libur5).toBe(11);
  });
});

describe("hal-hal yang tidak boleh melempar", () => {
  it("nol jam menghasilkan nol dan tanpa segmen", () => {
    const r = hitungLembur({ upahSebulan: UPAH, jam: 0, jenisHari: "biasa" });
    expect(r.amount).toBe(0);
    expect(r.segmen).toEqual([]);
  });

  it("jam negatif diperlakukan nol, bukan pengurang gaji", () => {
    const r = hitungLembur({ upahSebulan: UPAH, jam: -3, jenisHari: "biasa" });
    expect(r.amount).toBe(0);
  });

  it("jumlah segmen selalu sama dengan totalnya", () => {
    for (const jenisHari of ["biasa", "libur6", "libur5"] as const) {
      for (const jam of [0.5, 1, 2.5, 7, 8, 9.5, 11, 13]) {
        const r = hitungLembur({ upahSebulan: 7_123_456, jam, jenisHari });
        expect(r.segmen.reduce((a, s) => a + s.amount, 0), `${jenisHari} ${jam}`).toBe(r.amount);
        expect(r.segmen.reduce((a, s) => a + s.jam, 0), `jam ${jenisHari} ${jam}`).toBeCloseTo(jam, 6);
      }
    }
  });
});
