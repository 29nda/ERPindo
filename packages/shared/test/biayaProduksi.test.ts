import { describe, expect, it } from "vitest";
import { hitungBiayaProduksi } from "../src/index";

/**
 * Biaya produksi = bahan + tenaga kerja + overhead (Fase 21f).
 *
 * Yang diuji terutama pemisahan `biayaDiserap` dari `totalBiaya`: hanya bagian
 * itu yang boleh dijurnal, karena bahan sudah berpindah lewat pergerakan stok.
 */
describe("hitungBiayaProduksi (Fase 21f)", () => {
  it("tanpa biaya konversi: perilaku sama persis dengan sebelum fase ini", () => {
    const r = hitungBiayaProduksi({ biayaBahan: 400_000, qty: 100 });
    expect(r.totalBiaya).toBe(400_000);
    expect(r.biayaPerUnit).toBe(4_000);
    // Nol berarti TIDAK ada jurnal penyerapan yang dibuat.
    expect(r.biayaDiserap).toBe(0);
  });

  it("tenaga kerja & overhead ikut menaikkan biaya per unit", () => {
    // 200 bungkus: bahan 1jt + upah 300rb + overhead 100rb = 1,4jt → 7.000/unit.
    const r = hitungBiayaProduksi({
      biayaBahan: 1_000_000,
      biayaTenagaKerja: 300_000,
      biayaOverhead: 100_000,
      qty: 200,
    });
    expect(r.totalBiaya).toBe(1_400_000);
    expect(r.biayaPerUnit).toBe(7_000);
  });

  // Hanya bagian konversi yang dijurnal. Menjurnal bahan lagi = menghitungnya
  // dua kali, karena bahan sudah berpindah antar-akun lewat pergerakan stok.
  it("biayaDiserap HANYA tenaga kerja + overhead, bukan bahan", () => {
    const r = hitungBiayaProduksi({
      biayaBahan: 9_000_000,
      biayaTenagaKerja: 300_000,
      biayaOverhead: 100_000,
      qty: 10,
    });
    expect(r.biayaDiserap).toBe(400_000);
    expect(r.totalBiaya).toBe(9_400_000);
  });

  it("sisa pembulatan per unit terhitung, bukan hilang diam-diam", () => {
    // 1.000.000 ÷ 3 = 333.333,33 → 333.333/unit → 3 × 333.333 = 999.999.
    const r = hitungBiayaProduksi({ biayaBahan: 1_000_000, qty: 3 });
    expect(r.biayaPerUnit).toBe(333_333);
    expect(r.sisaPembulatan).toBe(1);
    expect(Math.abs(r.sisaPembulatan)).toBeLessThanOrEqual(r.totalBiaya === 0 ? 0 : 3 / 2 + 1);
  });

  it("biaya konversi negatif diperlakukan nol, tidak mengurangi nilai persediaan", () => {
    const r = hitungBiayaProduksi({
      biayaBahan: 100_000,
      biayaTenagaKerja: -50_000,
      biayaOverhead: -1,
      qty: 10,
    });
    expect(r.biayaDiserap).toBe(0);
    expect(r.totalBiaya).toBe(100_000);
  });

  it("qty nol tidak meledak (dipakai juga oleh kalkulator layar)", () => {
    const r = hitungBiayaProduksi({ biayaBahan: 50_000, biayaOverhead: 10_000, qty: 0 });
    expect(r.biayaPerUnit).toBe(0);
    expect(r.totalBiaya).toBe(60_000);
  });
});
