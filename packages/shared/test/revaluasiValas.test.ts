import { describe, expect, it } from "vitest";
import { revaluasiBarisValas, ringkasRevaluasiValas } from "../src/accounting";

/**
 * Revaluasi saldo valas akhir periode (Fase 22a).
 *
 * Yang paling mudah salah di sini bukan aritmetikanya melainkan TANDA-nya:
 * kenaikan kurs membuat piutang lebih berharga (laba) tetapi hutang lebih
 * memberatkan (rugi). Karena itu tanda diuji dari kedua sisi.
 */

describe("revaluasiBarisValas (Fase 22a)", () => {
  it("kurs naik → nilai piutang naik, selisihnya positif", () => {
    // USD 1.000 diposting pada kurs 15.000 → sisa Rp 15.000.000.
    const r = revaluasiBarisValas({ docNo: "INV-1", sisaIdr: 15_000_000, kursFaktur: 15_000 }, 16_200);
    expect(r.sisaValas).toBe(1000);
    expect(r.nilaiPenutup).toBe(16_200_000);
    expect(r.selisih).toBe(1_200_000);
  });

  it("kurs turun → selisihnya negatif", () => {
    const r = revaluasiBarisValas({ docNo: "INV-2", sisaIdr: 15_000_000, kursFaktur: 15_000 }, 14_500);
    expect(r.selisih).toBe(-500_000);
  });

  it("kurs penutup sama dengan kurs faktur → tidak ada selisih sama sekali", () => {
    const r = revaluasiBarisValas({ docNo: "INV-3", sisaIdr: 15_000_000, kursFaktur: 15_000 }, 15_000);
    expect(r.selisih).toBe(0);
  });

  it("faktur yang sudah dicicil: sisa valas dipulihkan dari sisa IDR", () => {
    // USD 1.000 @15.000, sudah dibayar USD 400 → sisa Rp 9.000.000.
    const r = revaluasiBarisValas({ docNo: "INV-4", sisaIdr: 9_000_000, kursFaktur: 15_000 }, 16_000);
    expect(r.sisaValas).toBe(600);
    expect(r.selisih).toBe(600_000);
  });

  it("kurs tidak masuk akal (nol/negatif) tidak melempar dan tidak membuat selisih", () => {
    expect(revaluasiBarisValas({ docNo: "X", sisaIdr: 1_000, kursFaktur: 0 }, 16_000).selisih).toBe(0);
    expect(revaluasiBarisValas({ docNo: "X", sisaIdr: 1_000, kursFaktur: 15_000 }, 0).selisih).toBe(0);
  });
});

describe("ringkasRevaluasiValas (Fase 22a)", () => {
  it("kenaikan piutang laba, kenaikan hutang RUGI — tandanya berlawanan", () => {
    const r = ringkasRevaluasiValas({
      piutang: [{ selisih: 1_200_000 }],
      hutang: [{ selisih: 800_000 }],
    });
    expect(r.selisihPiutang).toBe(1_200_000);
    expect(r.selisihHutang).toBe(800_000);
    // Piutang naik 1,2jt (laba) tetapi hutang juga naik 800rb (rugi) → bersih 400rb laba.
    expect(r.labaBersih).toBe(400_000);
  });

  it("tanpa dokumen valas sama sekali → nol, bukan NaN", () => {
    expect(ringkasRevaluasiValas({ piutang: [], hutang: [] })).toEqual({
      selisihPiutang: 0,
      selisihHutang: 0,
      labaBersih: 0,
    });
  });

  it("hanya hutang yang naik → laba bersih negatif (rugi)", () => {
    expect(ringkasRevaluasiValas({ piutang: [], hutang: [{ selisih: 500_000 }] }).labaBersih).toBe(-500_000);
  });
});
