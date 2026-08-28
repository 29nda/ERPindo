import { describe, expect, it } from "vitest";
import { hitungPph21Thr, hitungThr, masaKerjaBulan, terRate, terCategory } from "../src/payroll";

/**
 * THR — Tunjangan Hari Raya (Fase 43a).
 *
 * Ini kewajiban hukum (Permenaker 6/2016), bukan kebijakan perusahaan, dan
 * salah hitung berujung denda 5% yang tidak menggugurkan kewajiban pokoknya.
 * Karena itu ujinya menyasar batas-batas aturannya, bukan sekadar satu contoh
 * yang berhasil.
 */
describe("masaKerjaBulan", () => {
  it("menghitung bulan penuh, bukan selisih bulan kalender", () => {
    // Masuk 15 Maret, dibayar 1 April: nomor bulannya sudah berganti, tetapi
    // sebulan penuh belum lewat. Selisih kalender akan menjawab 1.
    expect(masaKerjaBulan("2026-03-15", "2026-04-01")).toBe(0);
    expect(masaKerjaBulan("2026-03-15", "2026-04-15")).toBe(1);
    expect(masaKerjaBulan("2026-03-15", "2026-04-14")).toBe(0);
  });

  it("menyeberang tahun", () => {
    expect(masaKerjaBulan("2025-06-10", "2026-03-10")).toBe(9);
    expect(masaKerjaBulan("2024-03-01", "2026-03-01")).toBe(24);
  });

  it("tanggal masuk kosong atau tak sah → 0, bukan galat", () => {
    expect(masaKerjaBulan(null, "2026-03-20")).toBe(0);
    expect(masaKerjaBulan(undefined, "2026-03-20")).toBe(0);
    expect(masaKerjaBulan("bukan-tanggal", "2026-03-20")).toBe(0);
  });

  it("tanggal bayar mendahului tanggal masuk → 0, bukan bilangan negatif", () => {
    // Angka negatif akan lolos perbandingan "< 1" secara kebetulan, dan
    // kebetulan bukan dasar yang bisa dipercaya.
    expect(masaKerjaBulan("2026-06-01", "2026-03-01")).toBe(0);
  });
});

describe("hitungThr", () => {
  const upah = { baseSalary: 8_000_000, allowances: 2_000_000 };

  it("masa kerja 12 bulan atau lebih → satu bulan upah penuh", () => {
    const r = hitungThr({ ...upah, joinDate: "2024-01-01", payDate: "2026-03-20" });
    expect(r.berhak).toBe(true);
    expect(r.proporsional).toBe(false);
    expect(r.amount).toBe(10_000_000);
  });

  it("dasarnya upah pokok DITAMBAH tunjangan tetap, bukan upah pokok saja", () => {
    // Kesalahan paling lazim, dan selisihnya selalu merugikan karyawan.
    const r = hitungThr({ ...upah, joinDate: "2020-01-01", payDate: "2026-03-20" });
    expect(r.amount).not.toBe(8_000_000);
    expect(r.upahSebulan).toBe(10_000_000);
  });

  it("masa kerja 6 bulan → proporsional setengah", () => {
    const r = hitungThr({ ...upah, joinDate: "2025-09-20", payDate: "2026-03-20" });
    expect(r.masaKerjaBulan).toBe(6);
    expect(r.proporsional).toBe(true);
    expect(r.amount).toBe(5_000_000);
  });

  it("tepat 1 bulan sudah berhak; kurang sedikit belum", () => {
    expect(hitungThr({ ...upah, joinDate: "2026-02-20", payDate: "2026-03-20" }).berhak).toBe(true);
    expect(hitungThr({ ...upah, joinDate: "2026-02-21", payDate: "2026-03-20" }).berhak).toBe(false);
  });

  it("tepat 11 bulan masih proporsional, 12 bulan sudah penuh", () => {
    const sebelas = hitungThr({ ...upah, joinDate: "2025-04-20", payDate: "2026-03-20" });
    expect(sebelas.masaKerjaBulan).toBe(11);
    expect(sebelas.amount).toBe(Math.round((11 / 12) * 10_000_000));
    const duabelas = hitungThr({ ...upah, joinDate: "2025-03-20", payDate: "2026-03-20" });
    expect(duabelas.amount).toBe(10_000_000);
  });

  it("belum berhak → nol, dan tetap melaporkan masa kerjanya", () => {
    const r = hitungThr({ ...upah, joinDate: "2026-03-10", payDate: "2026-03-20" });
    expect(r.berhak).toBe(false);
    expect(r.amount).toBe(0);
    expect(r.masaKerjaBulan).toBe(0);
  });

  it("karyawan tanpa tanggal masuk tidak diam-diam diberi THR penuh", () => {
    // Data karyawan lama kerap tidak punya `join_date`. Menganggapnya nol tahun
    // salah, tetapi menganggapnya berhak penuh membelanjakan uang perusahaan
    // atas dasar data yang tidak ada. Yang benar: tandai, jangan tebak.
    const r = hitungThr({ ...upah, joinDate: null, payDate: "2026-03-20" });
    expect(r.berhak).toBe(false);
    expect(r.amount).toBe(0);
  });

  it("pembulatan proporsional tidak memotong hak karyawan ke bawah", () => {
    // 7/12 × 9.999.999 = 5.833.332,75 → 5.833.333, bukan 5.833.332.
    const r = hitungThr({ baseSalary: 9_999_999, allowances: 0, joinDate: "2025-08-20", payDate: "2026-03-20" });
    expect(r.masaKerjaBulan).toBe(7);
    expect(r.amount).toBe(5_833_333);
  });
});

describe("hitungPph21Thr", () => {
  it("pajak THR adalah SELISIH, bukan tarif dikali THR", () => {
    // Inti aturannya. Di bawah TER, yang dikenai tarif adalah seluruh bruto
    // bulan itu — jadi THR mendorong seluruh penghasilan ke lapisan tarif yang
    // lebih tinggi, dan pajak tambahannya lebih besar daripada tarif THR-nya
    // sendiri.
    const reguler = 10_000_000;
    const thr = 10_000_000;
    const r = hitungPph21Thr(reguler, thr, "TK/0");
    const cat = terCategory("TK/0");
    const naif = Math.round((thr * terRate(cat, thr)) / 100);
    expect(r.pph21Thr).toBe(r.pph21Gabungan - r.pph21Reguler);
    expect(r.pph21Thr).toBeGreaterThan(naif);
  });

  it("tarif yang dipakai adalah tarif bruto GABUNGAN", () => {
    const r = hitungPph21Thr(10_000_000, 10_000_000, "TK/0");
    expect(r.terRateGabungan).toBe(terRate(terCategory("TK/0"), 20_000_000));
  });

  it("THR nol tidak menambah pajak apa pun", () => {
    const r = hitungPph21Thr(10_000_000, 0, "K/2");
    expect(r.pph21Thr).toBe(0);
  });

  it("tidak pernah negatif", () => {
    for (const bruto of [1_000_000, 5_000_000, 12_500_000, 60_000_000]) {
      expect(hitungPph21Thr(bruto, 1, "TK/0").pph21Thr).toBeGreaterThanOrEqual(0);
    }
  });

  it("status PTKP menentukan kategori TER, jadi hasilnya ikut berbeda", () => {
    const lajang = hitungPph21Thr(10_000_000, 10_000_000, "TK/0");
    const berkeluarga = hitungPph21Thr(10_000_000, 10_000_000, "K/3");
    expect(berkeluarga.pph21Thr).toBeLessThanOrEqual(lajang.pph21Thr);
  });
});
