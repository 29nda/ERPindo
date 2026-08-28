import { describe, expect, it } from "vitest";
import { bpKePersen, dasarKomisi, hitungKomisi, porsiTerpicu, type FakturKomisi } from "../src/accounting";

/**
 * Komisi sales (Fase 44a).
 *
 * Yang diuji di sini bukan "apakah perkaliannya benar" — itu bagian mudahnya.
 * Yang diuji adalah keputusan yang menentukan apakah perusahaan membayar uang
 * yang seharusnya tidak dibayar: PPN yang ikut terhitung, faktur yang tidak
 * pernah tertagih, retur yang tetap berkomisi, dan faktur yang dibatalkan.
 */
const faktur = (o: Partial<FakturKomisi> = {}): FakturKomisi => ({
  subtotal: 100_000_000,
  cogs: 60_000_000,
  paidAmount: 0,
  total: 111_000_000,
  returnedAmount: 0,
  ...o,
});

describe("dasarKomisi", () => {
  it("omzet memakai subtotal, BUKAN total — PPN bukan hasil penjualan", () => {
    // Total 111 juta memuat PPN 11 juta yang dititipkan negara. Memakainya
    // sebagai dasar berarti membayar sales dari kas pajak.
    expect(dasarKomisi(faktur(), "omzet")).toBe(100_000_000);
    expect(dasarKomisi(faktur(), "omzet")).not.toBe(111_000_000);
  });

  it("laba mengurangkan HPP", () => {
    expect(dasarKomisi(faktur(), "laba")).toBe(40_000_000);
  });

  it("retur dikurangkan lebih dulu, pada kedua dasar", () => {
    const r = faktur({ returnedAmount: 30_000_000 });
    expect(dasarKomisi(r, "omzet")).toBe(70_000_000);
    expect(dasarKomisi(r, "laba")).toBe(10_000_000);
  });

  it("faktur yang dibatalkan tidak berdasar apa pun", () => {
    expect(dasarKomisi(faktur({ voidedAt: "2026-08-01" }), "omzet")).toBe(0);
    expect(dasarKomisi(faktur({ voidedAt: "2026-08-01" }), "laba")).toBe(0);
  });

  it("jual rugi tidak menghasilkan komisi negatif", () => {
    // Memotong gaji sales lewat komisi minus adalah keputusan yang harus
    // diambil orang, bukan diam-diam oleh rumus.
    expect(dasarKomisi(faktur({ cogs: 150_000_000 }), "laba")).toBe(0);
  });

  it("retur melebihi subtotal tidak membalik tanda", () => {
    expect(dasarKomisi(faktur({ returnedAmount: 500_000_000 }), "omzet")).toBe(0);
  });
});

describe("porsiTerpicu", () => {
  it("pemicu faktur: penuh sejak diposting, belum dibayar pun", () => {
    expect(porsiTerpicu(faktur({ paidAmount: 0 }), "faktur")).toBe(1);
  });

  it("pemicu pelunasan: belum dibayar berarti belum ada komisi", () => {
    // Inilah gunanya pemicu ini ada. Membayar komisi atas faktur yang belum
    // tentu tertagih adalah cara klasik kehilangan uang.
    expect(porsiTerpicu(faktur({ paidAmount: 0 }), "pelunasan")).toBe(0);
  });

  it("pembayaran sebagian menghasilkan komisi sebagian", () => {
    expect(porsiTerpicu(faktur({ paidAmount: 55_500_000 }), "pelunasan")).toBeCloseTo(0.5, 6);
  });

  it("lunas berarti porsi penuh", () => {
    expect(porsiTerpicu(faktur({ paidAmount: 111_000_000 }), "pelunasan")).toBe(1);
  });

  it("lebih bayar tidak melampaui porsi penuh", () => {
    expect(porsiTerpicu(faktur({ paidAmount: 200_000_000 }), "pelunasan")).toBe(1);
  });

  it("faktur bernilai nol tidak membagi dengan nol", () => {
    expect(porsiTerpicu(faktur({ total: 0, paidAmount: 0 }), "pelunasan")).toBe(0);
  });
});

describe("hitungKomisi", () => {
  it("2,5% atas omzet 100 juta = 2,5 juta", () => {
    const r = hitungKomisi(faktur(), { dasar: "omzet", pemicu: "faktur", tarifBp: 250 });
    expect(r.amount).toBe(2_500_000);
  });

  it("tarif basis poin bilangan bulat menghindari hanyutnya pecahan", () => {
    // 0,07% dari 33.333.333. Disimpan sebagai 7 bp, bukan 0.07 persen pecahan.
    const r = hitungKomisi(faktur({ subtotal: 33_333_333 }), { dasar: "omzet", pemicu: "faktur", tarifBp: 7 });
    expect(Number.isInteger(r.amount)).toBe(true);
    expect(r.amount).toBe(Math.round((33_333_333 * 7) / 10_000));
  });

  it("pemicu pelunasan dengan bayar separuh menghasilkan komisi separuh", () => {
    const penuh = hitungKomisi(faktur({ paidAmount: 111_000_000 }), { dasar: "omzet", pemicu: "pelunasan", tarifBp: 250 });
    const separuh = hitungKomisi(faktur({ paidAmount: 55_500_000 }), { dasar: "omzet", pemicu: "pelunasan", tarifBp: 250 });
    expect(separuh.amount).toBe(Math.round(penuh.amount / 2));
  });

  it("faktur batal tidak berkomisi apa pun pemicunya", () => {
    for (const pemicu of ["faktur", "pelunasan"] as const) {
      const r = hitungKomisi(faktur({ voidedAt: "2026-08-01", paidAmount: 111_000_000 }), {
        dasar: "omzet",
        pemicu,
        tarifBp: 250,
      });
      expect(r.amount, pemicu).toBe(0);
    }
  });

  it("tarif nol berarti tanpa komisi, bukan galat", () => {
    expect(hitungKomisi(faktur(), { dasar: "omzet", pemicu: "faktur", tarifBp: 0 }).amount).toBe(0);
  });
});

describe("bpKePersen", () => {
  it("menampilkan basis poin sebagai persen bergaya Indonesia", () => {
    expect(bpKePersen(250)).toBe("2,5");
    expect(bpKePersen(1_000)).toBe("10");
    expect(bpKePersen(7)).toBe("0,07");
  });
});
