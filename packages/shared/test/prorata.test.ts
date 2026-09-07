import { describe, expect, it } from "vitest";
import {
  hargaPaket,
  HARI_SIKLUS,
  hitungProrata,
  PLAN_LIMITS,
  PLANS,
} from "../src/index";

/**
 * Prorata naik paket (Fase 55c).
 *
 * Fase 30 mencabut seluruh mesin prorata karena dengan satu paket tidak ada
 * paket lain untuk dituju. Fase 53a mengembalikan tiga paket dan 54i membuat
 * ketiganya bisa dibeli — tetapi naik paket masih berarti membeli periode BARU
 * penuh, sehingga sisa periode yang sudah dibayar hangus. Untuk pelanggan
 * tahunan yang naik di bulan kedua, itu membuang sepuluh bulan yang sudah lunas.
 */

const AKHIR = "2026-10-01T00:00:00.000Z";

describe("hitungProrata", () => {
  it("menagih selisih harga per hari × sisa hari", () => {
    // 30 hari penuh tersisa dari siklus bulanan = tepat selisih harga sebulan.
    const h = hitungProrata({
      dari: "starter",
      ke: "business",
      periode: "bulanan",
      berakhirIso: AKHIR,
      sekarangIso: "2026-09-01T00:00:00.000Z",
    });
    expect(h.berlaku).toBe(true);
    expect(h.sisaHari).toBe(30);
    expect(h.jumlah).toBe(
      PLAN_LIMITS.business.pricePerMonth - PLAN_LIMITS.starter.pricePerMonth,
    );
  });

  it("separuh siklus menagih kira-kira separuh selisihnya", () => {
    const h = hitungProrata({
      dari: "starter",
      ke: "enterprise",
      periode: "bulanan",
      berakhirIso: AKHIR,
      sekarangIso: "2026-09-16T00:00:00.000Z",
    });
    const penuh = PLAN_LIMITS.enterprise.pricePerMonth - PLAN_LIMITS.starter.pricePerMonth;
    expect(h.sisaHari).toBe(15);
    expect(h.jumlah).toBe(Math.ceil((penuh / HARI_SIKLUS.bulanan) * 15));
    expect(h.jumlah).toBeLessThan(penuh);
  });

  it("siklus tahunan dibagi 365, bukan 30", () => {
    const h = hitungProrata({
      dari: "starter",
      ke: "business",
      periode: "tahunan",
      berakhirIso: "2027-09-01T00:00:00.000Z",
      sekarangIso: "2026-09-01T00:00:00.000Z",
    });
    const selisihTahunan = hargaPaket("business", "tahunan") - hargaPaket("starter", "tahunan");
    // 365 hari tersisa dari siklus 365 hari = seluruh selisih tahunannya.
    expect(h.sisaHari).toBe(365);
    expect(h.jumlah).toBe(selisihTahunan);
  });

  it("PENURUNAN paket tidak menghasilkan tagihan, dan menyebut sebabnya", () => {
    // Bukan nol yang diam: layar perlu tahu ini "bukan kenaikan", bukan
    // "sistem gagal menghitung".
    const h = hitungProrata({
      dari: "enterprise",
      ke: "starter",
      periode: "bulanan",
      berakhirIso: AKHIR,
      sekarangIso: "2026-09-10T00:00:00.000Z",
    });
    expect(h.berlaku).toBe(false);
    expect(h.alasan).toBe("bukan-kenaikan");
    expect(h.jumlah).toBe(0);
  });

  it("paket yang sama juga bukan kenaikan", () => {
    const h = hitungProrata({
      dari: "business",
      ke: "business",
      periode: "bulanan",
      berakhirIso: AKHIR,
      sekarangIso: "2026-09-10T00:00:00.000Z",
    });
    expect(h.alasan).toBe("bukan-kenaikan");
  });

  it("tanpa siklus berjalan tidak ada yang bisa diprorata", () => {
    // Akun comped: aktif tanpa tanggal berakhir. Menagih prorata di sini akan
    // memberi kenaikan paket seharga nyaris nol — cacat yang dijaga ui-sim
    // sejak Fase 20k.
    for (const berakhirIso of [null, "2026-08-01T00:00:00.000Z"]) {
      const h = hitungProrata({
        dari: "starter",
        ke: "enterprise",
        periode: "bulanan",
        berakhirIso,
        sekarangIso: "2026-09-10T00:00:00.000Z",
      });
      expect(h.berlaku, String(berakhirIso)).toBe(false);
      expect(h.alasan).toBe("tanpa-siklus");
    }
  });

  it("sisa satu hari pun menghasilkan tagihan yang wajar, bukan angka receh", () => {
    /*
     * Ini yang membuat ambang "tagihan terlalu kecil" TIDAK ditulis (lihat
     * `core.ts`). Selisih per hari terkecil pada daftar harga sekarang adalah
     * Starter → Business: Rp 25.000 sehari. Bila kelak ada paket berselisih di
     * bawah Rp 300.000 sebulan, uji ini memerah — dan ambangnya bisa ditulis
     * saat ia benar-benar dibutuhkan, bukan sebagai cabang yang tak pernah
     * dijalani.
     */
    const h = hitungProrata({
      dari: "starter",
      ke: "business",
      periode: "bulanan",
      berakhirIso: "2026-09-10T01:00:00.000Z",
      sekarangIso: "2026-09-10T00:00:00.000Z",
    });
    expect(h.sisaHari).toBe(1);
    expect(h.berlaku).toBe(true);
    expect(h.jumlah).toBeGreaterThanOrEqual(25_000);

    const selisihTerkecil = Math.min(
      ...PLANS.slice(1).map((p, i) => PLAN_LIMITS[p].pricePerMonth - PLAN_LIMITS[PLANS[i]!].pricePerMonth),
    );
    expect(selisihTerkecil / HARI_SIKLUS.bulanan).toBeGreaterThanOrEqual(25_000);
  });

  it("hari berjalan ikut dibayar — pembulatan ke ATAS", () => {
    // Naik paket sore hari tidak boleh terasa "gratis sehari".
    const h = hitungProrata({
      dari: "starter",
      ke: "business",
      periode: "bulanan",
      berakhirIso: AKHIR,
      sekarangIso: "2026-09-30T18:00:00.000Z",
    });
    expect(h.sisaHari).toBe(1);
  });

  it("tanggal rusak diperlakukan sebagai tanpa siklus, bukan melempar", () => {
    const h = hitungProrata({
      dari: "starter",
      ke: "business",
      periode: "bulanan",
      berakhirIso: "bukan-tanggal",
      sekarangIso: "2026-09-10T00:00:00.000Z",
    });
    expect(h.alasan).toBe("tanpa-siklus");
  });
});
