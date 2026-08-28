import { describe, expect, it } from "vitest";
import {
  forecastTertimbang,
  pencapaianTarget,
  PELUANG_TAHAP,
  TAHAP_BERJALAN,
  type LeadForecast,
} from "../src/crm";

/**
 * Target & prakiraan penjualan (Fase 44b).
 *
 * Yang diuji adalah sifat-sifat yang membuat prakiraan bisa dipercaya:
 * pipeline yang sudah selesai tidak dihitung dua kali, prakiraan tidak pernah
 * melampaui nilai kotornya, dan target yang belum diisi tidak berpura-pura
 * sudah tercapai.
 */
const lead = (stage: LeadForecast["stage"], estValue: number): LeadForecast => ({ stage, estValue });

describe("forecastTertimbang", () => {
  it("membobot tiap tahap dengan peluangnya, bukan menjumlah apa adanya", () => {
    const f = forecastTertimbang([lead("new", 100_000_000), lead("proposal", 100_000_000)]);
    expect(f.kotor).toBe(200_000_000);
    // 10% + 60% = 70 juta.
    expect(f.tertimbang).toBe(70_000_000);
  });

  it("prospek yang sudah menang TIDAK ikut — nilainya sudah jadi penjualan", () => {
    // Kalau ikut, omzet yang sama terhitung dua kali: sekali sebagai faktur,
    // sekali lagi sebagai prakiraan.
    const f = forecastTertimbang([lead("won", 500_000_000), lead("qualified", 100_000_000)]);
    expect(f.kotor).toBe(100_000_000);
    expect(f.tertimbang).toBe(40_000_000);
  });

  it("prospek yang kalah tidak ikut", () => {
    const f = forecastTertimbang([lead("lost", 500_000_000)]);
    expect(f.kotor).toBe(0);
    expect(f.tertimbang).toBe(0);
  });

  it("tertimbang tidak pernah melampaui kotor", () => {
    const acak: LeadForecast[] = [
      lead("new", 33_333_333),
      lead("contacted", 12_500_000),
      lead("qualified", 87_000_000),
      lead("proposal", 4_250_000),
    ];
    const f = forecastTertimbang(acak);
    expect(f.tertimbang).toBeLessThanOrEqual(f.kotor);
    expect(f.tertimbang).toBeGreaterThan(0);
  });

  it("rincian per tahap menjumlah persis ke totalnya", () => {
    const f = forecastTertimbang([
      lead("new", 10_000_000),
      lead("new", 20_000_000),
      lead("proposal", 50_000_000),
    ]);
    expect(f.perTahap.reduce((a, t) => a + t.tertimbang, 0)).toBe(f.tertimbang);
    expect(f.perTahap.reduce((a, t) => a + t.kotor, 0)).toBe(f.kotor);
    expect(f.perTahap.find((t) => t.stage === "new")?.jumlah).toBe(2);
  });

  it("pipeline kosong menghasilkan nol, bukan galat", () => {
    const f = forecastTertimbang([]);
    expect(f.tertimbang).toBe(0);
    expect(f.perTahap).toHaveLength(TAHAP_BERJALAN.length);
  });

  it("peluang naik searah dengan kemajuan tahapnya", () => {
    // Bukan sekadar mencocokkan angka: yang dijaga adalah URUTANNYA. Tahap yang
    // lebih maju harus berpeluang lebih besar, kalau tidak seluruh gagasan
    // pembobotan kehilangan arti.
    const urut = TAHAP_BERJALAN.map((s) => PELUANG_TAHAP[s]);
    for (let i = 1; i < urut.length; i++) {
      expect(urut[i]!).toBeGreaterThan(urut[i - 1]!);
    }
  });
});

describe("pencapaianTarget", () => {
  it("menghitung persen dan sisa kekurangannya", () => {
    const p = pencapaianTarget(100_000_000, 75_000_000);
    expect(p.persen).toBe(75);
    expect(p.kurang).toBe(25_000_000);
    expect(p.tercapai).toBe(false);
  });

  it("melampaui target: persen di atas 100, kurang nol", () => {
    const p = pencapaianTarget(100_000_000, 130_000_000);
    expect(p.persen).toBe(130);
    expect(p.kurang).toBe(0);
    expect(p.tercapai).toBe(true);
  });

  it("tepat di target sudah terhitung tercapai", () => {
    expect(pencapaianTarget(100_000_000, 100_000_000).tercapai).toBe(true);
  });

  it("target nol tidak membagi dengan nol DAN tidak berpura-pura tercapai", () => {
    // Sales yang belum diberi target belum bisa dinilai. Menampilkannya sebagai
    // tercapai 100% adalah kebohongan yang menyenangkan.
    const p = pencapaianTarget(0, 50_000_000);
    expect(Number.isFinite(p.persen)).toBe(true);
    expect(p.persen).toBe(0);
    expect(p.tercapai).toBe(false);
  });

  it("realisasi nol tidak melempar", () => {
    const p = pencapaianTarget(100_000_000, 0);
    expect(p.persen).toBe(0);
    expect(p.kurang).toBe(100_000_000);
  });
});
