import { describe, expect, it } from "vitest";
import { hitungPengisianKasKecil, hitungSelisihKas } from "../src/accounting";

/**
 * Fase 22c — kas kecil sistem dana tetap.
 *
 * Dua fungsi murni, dua kelas kesalahan yang berbeda sifatnya:
 *
 * - `hitungPengisianKasKecil` salah → kotak terisi terlalu banyak/sedikit;
 *   ketahuan cepat karena uangnya nyata.
 * - `hitungSelisihKas` salah ARAH → jurnalnya tetap seimbang, neraca saldo
 *   tetap hijau, dan bebannya menunjuk arah yang keliru selamanya. Karena itu
 *   arahnya diuji dari kedua sisi, bukan cuma "ada selisih".
 */

describe("hitungPengisianKasKecil", () => {
  it("kekurangan = dana tetap - saldo buku", () => {
    const s = hitungPengisianKasKecil(2_000_000, 350_000);
    expect(s.kekurangan).toBe(1_650_000);
    expect(s.danaTetap).toBe(2_000_000);
    expect(s.saldoBuku).toBe(350_000);
  });

  it("kotak masih penuh → tidak ada yang perlu diisi (bukan jurnal nol)", () => {
    expect(hitungPengisianKasKecil(2_000_000, 2_000_000).kekurangan).toBe(0);
  });

  it("saldo MELEBIHI dana tetap tidak dirapikan diam-diam jadi pengisian negatif", () => {
    const s = hitungPengisianKasKecil(2_000_000, 2_500_000);
    expect(s.kekurangan).toBe(0);
    expect(s.saldoBuku).toBe(2_500_000);
  });

  it("kotak kosong → terpakai 100%", () => {
    const s = hitungPengisianKasKecil(1_000_000, 0);
    expect(s.kekurangan).toBe(1_000_000);
    expect(s.terpakaiPersen).toBe(100);
  });

  it("saldo minus (kotak dipakai melebihi isinya) tetap dibatasi 100%", () => {
    const s = hitungPengisianKasKecil(1_000_000, -250_000);
    expect(s.kekurangan).toBe(1_250_000);
    expect(s.terpakaiPersen).toBe(100);
  });

  it("dana tetap belum disetel → persennya 0, bukan pembagian nol", () => {
    const s = hitungPengisianKasKecil(0, 0);
    expect(s.terpakaiPersen).toBe(0);
    expect(s.kekurangan).toBe(0);
    expect(Number.isNaN(s.terpakaiPersen)).toBe(false);
  });

  it("dana tetap negatif diperlakukan sebagai belum disetel", () => {
    expect(hitungPengisianKasKecil(-500_000, 0).danaTetap).toBe(0);
  });

  it("persen terpakai dibulatkan, bukan pecahan", () => {
    expect(hitungPengisianKasKecil(3_000_000, 2_000_000).terpakaiPersen).toBe(33);
  });
});

describe("hitungSelisihKas", () => {
  it("uang fisik lebih SEDIKIT daripada catatan → kurang", () => {
    const h = hitungSelisihKas(500_000, 480_000);
    expect(h.selisih).toBe(-20_000);
    expect(h.arah).toBe("kurang");
  });

  it("uang fisik lebih BANYAK daripada catatan → lebih", () => {
    const h = hitungSelisihKas(500_000, 515_000);
    expect(h.selisih).toBe(15_000);
    expect(h.arah).toBe("lebih");
  });

  it("cocok → pas, dan selisih nol (tidak boleh jadi jurnal)", () => {
    const h = hitungSelisihKas(500_000, 500_000);
    expect(h.selisih).toBe(0);
    expect(h.arah).toBe("pas");
  });

  it("arahnya tidak simetris — menukar argumen membalik tandanya", () => {
    expect(hitungSelisihKas(500_000, 480_000).selisih).toBe(-hitungSelisihKas(480_000, 500_000).selisih);
  });

  it("pecahan rupiah dibulatkan supaya jurnalnya tetap bilangan bulat", () => {
    expect(hitungSelisihKas(500_000.4, 480_000.6)).toEqual({ selisih: -19_999, arah: "kurang" });
  });
});
