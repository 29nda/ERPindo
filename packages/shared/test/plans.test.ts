import { describe, expect, it } from "vitest";
import {
  ASSUMED_PER_USER_PRICE,
  PAID_PLANS,
  perUserMonthlyCost,
  PLAN_LABELS,
  PLAN_LIMITS,
  PLANS,
} from "../src/index";

describe("PLAN_LIMITS (Fase 30 — satu paket, satu harga)", () => {
  it("hanya ADA satu paket", () => {
    expect(PLANS).toEqual(["lengkap"]);
    expect(Object.keys(PLAN_LIMITS)).toEqual(["lengkap"]);
  });

  it("harga Rp499.000/perusahaan/bulan sesuai keputusan pemilik", () => {
    expect(PLAN_LIMITS.lengkap.pricePerMonth).toBe(499_000);
  });

  it("pengguna tak terbatas — janji inti produk, bukan detail", () => {
    // Pembeda utama melawan ERP yang menagih per kepala. Bila angka ini pernah
    // menjadi berhingga, halaman harga berbohong dan `routes/tenants.ts` mulai
    // menolak undangan anggota.
    expect(PLAN_LIMITS.lengkap.maxUsers).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("kuota AI harian terbatas — pagar keadilan antar tenant", () => {
    // Alokasi Workers AI (10.000 neuron/hari) berlaku untuk SELURUH akun, jadi
    // kuota per tenant harus berhingga; tak terbatas di sini berarti satu
    // tenant bisa mematikan asisten AI milik semua tenant lain.
    expect(PLAN_LIMITS.lengkap.aiDailyLimit).toBe(100);
    expect(Number.isFinite(PLAN_LIMITS.lengkap.aiDailyLimit)).toBe(true);
  });

  it("paket dijual — tidak ada paket Rp0", () => {
    // Fase 24 sudah menghapus paket `trial` Rp0: "belum berlangganan" adalah
    // STATUS tenant (`provisioning`), bukan paket. Uji ini menjaga agar paket
    // gratis tidak diam-diam masuk lagi lewat pintu belakang.
    for (const plan of PLANS) {
      expect(PLAN_LIMITS[plan].pricePerMonth).toBeGreaterThan(0);
    }
    expect(PLANS).not.toContain("trial");
  });

  it("PAID_PLANS identik dengan PLANS — seluruh paket dijual", () => {
    expect(PAID_PLANS).toEqual(PLANS);
  });

  it("setiap paket punya label yang bisa ditampilkan", () => {
    for (const plan of PLANS) {
      expect(PLAN_LABELS[plan]).toBe(PLAN_LIMITS[plan].label);
      expect(PLAN_LABELS[plan].length).toBeGreaterThan(0);
    }
  });

  it("tidak ada sisa batas entitas — batas yang tak pernah ditegakkan", () => {
    // `maxEntities` dulu dicetak di landing ("Enterprise mencakup 3 entitas")
    // tetapi TIDAK pernah diperiksa satu baris pun. Yang membatasi penambahan
    // perusahaan adalah pagar `belumBayar` di routes/auth.ts. Menyisakan angka
    // yang tidak membatasi apa pun adalah janji yang bisa dibantah pelanggan.
    expect(PLAN_LIMITS.lengkap).not.toHaveProperty("maxEntities");
  });
});

describe("perUserMonthlyCost (kalkulator perbandingan implisit, Fase 13c)", () => {
  it("mengalikan jumlah pengguna dengan harga per-pengguna", () => {
    expect(perUserMonthlyCost(1)).toBe(ASSUMED_PER_USER_PRICE);
    expect(perUserMonthlyCost(30)).toBe(30 * ASSUMED_PER_USER_PRICE);
  });

  it("membulatkan ke bawah & menolak negatif", () => {
    expect(perUserMonthlyCost(2.9)).toBe(2 * ASSUMED_PER_USER_PRICE);
    expect(perUserMonthlyCost(-5)).toBe(0);
  });

  it("titik impas turun setengah setelah harga tunggal", () => {
    // Kalkulator landing dulu membandingkan terhadap harga Business
    // (Rp999.000); kini terhadap Rp499.000. Efeknya bukan kosmetik — jumlah
    // pengguna yang membuat ERPindo lebih murah TURUN drastis, dan itulah
    // argumen penjualan terkuat dari keputusan harga tunggal.
    const impas = (batas: number) => {
      for (let n = 1; n <= 100; n++) if (perUserMonthlyCost(n) > batas) return n;
      return 0;
    };
    const impasBaru = impas(PLAN_LIMITS.lengkap.pricePerMonth);
    expect(impasBaru).toBe(2);
    expect(impasBaru).toBeLessThan(impas(999_000));
  });
});
