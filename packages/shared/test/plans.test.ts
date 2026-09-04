import { describe, expect, it } from "vitest";
import {
  ASSUMED_PER_USER_PRICE,
  BULAN_DIBAYAR_TAHUNAN,
  biayaKaryawanTambahan,
  hargaPaket,
  hematTahunan,
  HARGA_KARYAWAN_TAMBAHAN_PER_TAHUN,
  PAID_PLANS,
  PAKET_DISARANKAN,
  PAKET_MASUK,
  paketTerkecilUntuk,
  PERIODE_TAGIHAN,
  perUserMonthlyCost,
  PLAN_LABELS,
  PLAN_LIMITS,
  PLANS,
} from "../src/index";

describe("PLAN_LIMITS (Fase 53a — tiga paket, dibedakan kapasitas)", () => {
  it("tiga paket, urut dari termurah", () => {
    expect(PLANS).toEqual(["starter", "business", "enterprise"]);
    expect(Object.keys(PLAN_LIMITS)).toEqual([...PLANS]);
  });

  it("harga sesuai keputusan pemilik", () => {
    expect(PLAN_LIMITS.starter.pricePerMonth).toBe(750_000);
    expect(PLAN_LIMITS.business.pricePerMonth).toBe(1_500_000);
    expect(PLAN_LIMITS.enterprise.pricePerMonth).toBe(3_000_000);
  });

  it("PENGGUNA TAK TERBATAS DI SEMUA PAKET — janji inti produk", () => {
    // Uji ini menjaga satu keputusan yang diambil setelah menelusuri repo:
    // batas pengguna per paket akan membatalkan klaim "tanpa lisensi per
    // kepala" yang tertulis di landing, JSON-LD, llms.txt, blog, dan
    // kalkulator perbandingan — 30-an tempat sekaligus. Bila angka ini pernah
    // menjadi berhingga di paket mana pun, naskah publik langsung berbohong.
    for (const plan of PLANS) {
      expect(PLAN_LIMITS[plan].maxUsers, plan).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  it("kuota AI harian berhingga di semua paket — pagar keadilan antar tenant", () => {
    // Alokasi Workers AI berlaku untuk SELURUH akun, jadi kuota per tenant
    // harus berhingga; tak terbatas di sini berarti satu tenant bisa
    // mematikan asisten AI milik semua tenant lain.
    for (const plan of PLANS) {
      expect(Number.isFinite(PLAN_LIMITS[plan].aiDailyLimit), plan).toBe(true);
      expect(PLAN_LIMITS[plan].aiDailyLimit).toBeGreaterThan(0);
    }
  });

  it("kapasitas tidak pernah turun saat paket naik", () => {
    // Menjaring salah ketik yang membuat paket lebih mahal memberi LEBIH
    // SEDIKIT — kelas kesalahan yang tidak terlihat sampai ada pelanggan
    // yang membayar lebih lalu ditolak sistem.
    const naik = ["aiDailyLimit", "maxBadanUsaha", "maxLokasi", "karyawanTermasuk", "lampiranGb"] as const;
    const urut = [...PLANS];
    for (let i = 1; i < urut.length; i++) {
      const namaBawah = urut[i - 1]!;
      const namaAtas = urut[i]!;
      const bawah = PLAN_LIMITS[namaBawah];
      const atas = PLAN_LIMITS[namaAtas];
      expect(atas.pricePerMonth).toBeGreaterThan(bawah.pricePerMonth);
      for (const field of naik) {
        expect(atas[field], `${namaAtas}.${field}`).toBeGreaterThanOrEqual(bawah[field]);
      }
      // Dukungan justru harus makin CEPAT, jadi arahnya terbalik.
      expect(atas.responsJamKerja).toBeLessThanOrEqual(bawah.responsJamKerja);
      expect(atas.pendampinganJamPerTahun).toBeGreaterThanOrEqual(bawah.pendampinganJamPerTahun);
    }
  });

  it("seluruh modul terbuka — Fase 30 tidak dibatalkan", () => {
    // Pembedanya kapasitas, bukan modul. Tidak boleh ada satu pun field yang
    // menyebut modul, fitur, atau penguncian di dalam definisi paket.
    for (const plan of PLANS) {
      const kunci = Object.keys(PLAN_LIMITS[plan]).join(" ").toLowerCase();
      expect(kunci, plan).not.toMatch(/modul|module|fitur|feature|kunci|lock/);
    }
  });

  it("paket dijual — tidak ada paket Rp0", () => {
    for (const plan of PLANS) expect(PLAN_LIMITS[plan].pricePerMonth).toBeGreaterThan(0);
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

  it("paket masuk & paket disarankan menunjuk paket yang ada", () => {
    expect(PLANS).toContain(PAKET_MASUK);
    expect(PLANS).toContain(PAKET_DISARANKAN);
    // "Mulai dari" harus menunjuk yang TERMURAH, kalau tidak naskahnya salah.
    expect(PLAN_LIMITS[PAKET_MASUK].pricePerMonth).toBe(
      Math.min(...PLANS.map((p) => PLAN_LIMITS[p].pricePerMonth)),
    );
  });

  it("tidak ada sisa batas yang tak pernah ditegakkan", () => {
    // Pelajaran Fase 30: `maxEntities` diumumkan di landing tetapi tidak
    // pernah diperiksa satu baris pun. Nama itu tidak boleh kembali.
    expect(PLAN_LIMITS.starter).not.toHaveProperty("maxEntities");
  });
});

describe("hargaPaket & hematTahunan", () => {
  it("tahunan dibayar sepuluh bulan", () => {
    expect(BULAN_DIBAYAR_TAHUNAN).toBe(10);
    for (const plan of PLANS) {
      expect(hargaPaket(plan, "bulanan")).toBe(PLAN_LIMITS[plan].pricePerMonth);
      expect(hargaPaket(plan, "tahunan")).toBe(PLAN_LIMITS[plan].pricePerMonth * 10);
    }
  });

  it("angka tahunan sesuai yang diumumkan pemilik", () => {
    expect(hargaPaket("starter", "tahunan")).toBe(7_500_000);
    expect(hargaPaket("business", "tahunan")).toBe(15_000_000);
    expect(hargaPaket("enterprise", "tahunan")).toBe(30_000_000);
  });

  it("hemat tahunan tepat dua bulan", () => {
    for (const plan of PLANS) {
      expect(hematTahunan(plan)).toBe(PLAN_LIMITS[plan].pricePerMonth * 2);
      expect(hargaPaket(plan, "tahunan") + hematTahunan(plan)).toBe(
        PLAN_LIMITS[plan].pricePerMonth * 12,
      );
    }
  });

  it("hanya dua periode tagihan", () => {
    expect(PERIODE_TAGIHAN).toEqual(["bulanan", "tahunan"]);
  });
});

describe("biayaKaryawanTambahan — tanpa jurang", () => {
  it("nol selama masih di dalam jatah", () => {
    expect(biayaKaryawanTambahan("business", 0)).toBe(0);
    expect(biayaKaryawanTambahan("business", 50)).toBe(0);
  });

  it("kelebihan ditagih per kepala, bukan melompat", () => {
    // Inti keputusannya: karyawan ke-51 menambah SATU tarif, bukan memicu
    // tagihan untuk seluruh 51 orang. Ambang berbentuk jurang akan mendorong
    // perusahaan menahan daftarnya di 50 dan menggaji sisanya di luar sistem,
    // dan sejak saat itu laporan PPh 21 yang dihasilkan ERPindo salah.
    expect(biayaKaryawanTambahan("business", 51)).toBe(HARGA_KARYAWAN_TAMBAHAN_PER_TAHUN);
    expect(biayaKaryawanTambahan("business", 60)).toBe(10 * HARGA_KARYAWAN_TAMBAHAN_PER_TAHUN);
    const selisih =
      biayaKaryawanTambahan("business", 61) - biayaKaryawanTambahan("business", 60);
    expect(selisih).toBe(HARGA_KARYAWAN_TAMBAHAN_PER_TAHUN);
  });

  it("jatah berbeda per paket", () => {
    expect(biayaKaryawanTambahan("starter", 20)).toBe(10 * HARGA_KARYAWAN_TAMBAHAN_PER_TAHUN);
    expect(biayaKaryawanTambahan("enterprise", 20)).toBe(0);
  });

  it("pecahan dibulatkan ke bawah & negatif aman", () => {
    expect(biayaKaryawanTambahan("starter", 10.9)).toBe(0);
    expect(biayaKaryawanTambahan("starter", -5)).toBe(0);
  });
});

describe("paketTerkecilUntuk", () => {
  it("memilih paket termurah yang memuat profilnya", () => {
    expect(paketTerkecilUntuk({ badanUsaha: 1, lokasi: 1, karyawan: 5 })).toBe("starter");
    expect(paketTerkecilUntuk({ badanUsaha: 1, lokasi: 6, karyawan: 30 })).toBe("business");
    expect(paketTerkecilUntuk({ badanUsaha: 3, lokasi: 4, karyawan: 80 })).toBe("enterprise");
  });

  it("karyawan tidak pernah memaksa naik paket", () => {
    // Kelebihannya ditagih per kepala di paket mana pun, jadi perusahaan
    // satu lokasi dengan 300 karyawan tetap Starter — dan itu benar.
    expect(paketTerkecilUntuk({ badanUsaha: 1, lokasi: 2, karyawan: 300 })).toBe("starter");
  });

  it("mengembalikan null bila melampaui paket terbesar", () => {
    expect(paketTerkecilUntuk({ badanUsaha: 9, lokasi: 1, karyawan: 1 })).toBeNull();
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

  it("titik impas dihitung terhadap paket masuk", () => {
    const impas = (batas: number) => {
      for (let n = 1; n <= 100; n++) if (perUserMonthlyCost(n) > batas) return n;
      return 0;
    };
    expect(impas(PLAN_LIMITS[PAKET_MASUK].pricePerMonth)).toBe(3);
  });
});
