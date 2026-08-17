import { describe, expect, it } from "vitest";
import {
  KELOMPOK_HARTA,
  KELOMPOK_HARTA_BY_KODE,
  penyusutanBulanan,
  ringkasPenyusutanFiskal,
  type MetodePenyusutan,
} from "../src/hr";

/**
 * Fase 22d — saldo menurun & penyusutan fiskal.
 *
 * Yang diuji paling keras adalah **terminasi**: saldo menurun secara rumus
 * tidak pernah mencapai nol, jadi uji "satu bulan hasilnya sekian" sama sekali
 * tidak membuktikan asetnya pernah selesai disusutkan. Karena itu ada uji yang
 * menjalankan SELURUH masa manfaat dan menuntut akumulasinya berhenti persis.
 */

/** Jalankan penyusutan sebulan-sebulan sampai akhir masa manfaat. */
function jalankanPenuh(harga: number, residu: number, umurBulan: number, metode: MetodePenyusutan) {
  let akumulasi = 0;
  const angsuran: number[] = [];
  for (let bulanKe = 1; bulanKe <= umurBulan; bulanKe++) {
    const n = penyusutanBulanan({ harga, residu, umurBulan, akumulasi, bulanKe, metode });
    angsuran.push(n);
    akumulasi += n;
  }
  return { akumulasi, angsuran };
}

describe("penyusutanBulanan — garis lurus", () => {
  it("angsuran rata sepanjang masa manfaat", () => {
    expect(penyusutanBulanan({ harga: 12_000_000, residu: 0, umurBulan: 24, akumulasi: 0, bulanKe: 1, metode: "garis_lurus" })).toBe(500_000);
  });

  it("residu ikut mengurangi dasar penyusutan", () => {
    expect(penyusutanBulanan({ harga: 12_000_000, residu: 2_400_000, umurBulan: 24, akumulasi: 0, bulanKe: 1, metode: "garis_lurus" })).toBe(400_000);
  });

  it("berhenti tepat di (harga - residu) sesudah masa manfaat penuh", () => {
    const { akumulasi } = jalankanPenuh(12_000_000, 2_400_000, 24, "garis_lurus");
    expect(akumulasi).toBe(9_600_000);
  });

  it("sisa pembulatan tertinggal sebagai angsuran kecil TAMBAHAN, tidak pernah melampaui harga", () => {
    // 10.000.000 / 7 = 1.428.571,43 → dibulatkan ke bawah, jadi sesudah 7 bulan
    // masih tersisa 3 rupiah. Ini perilaku garis lurus SEJAK SEBELUM Fase 22d
    // dan sengaja tidak diubah: menutupnya lewat aturan kalender akan menggeser
    // angka aset yang penyusutannya sempat tertunda.
    const { akumulasi } = jalankanPenuh(10_000_000, 0, 7, "garis_lurus");
    expect(akumulasi).toBe(9_999_997);
    expect(akumulasi).toBeLessThanOrEqual(10_000_000);
    // Angsuran ke-8 menutup sisanya; tidak ada rupiah yang hilang diam-diam.
    expect(penyusutanBulanan({ harga: 10_000_000, residu: 0, umurBulan: 7, akumulasi, bulanKe: 8, metode: "garis_lurus" })).toBe(3);
  });

  it("garis lurus TIDAK terpengaruh posisi bulan — angsuran yang tertunda tetap mengangsur", () => {
    // Aset 6 bulan yang baru disusutkan pada bulan ke-7 (penyusutan tertunda):
    // tetap satu angsuran biasa, bukan menyapu seluruh sisanya sekaligus.
    // Inilah yang menjaga perilaku aset lama tidak bergeser oleh Fase 22d.
    expect(penyusutanBulanan({ harga: 6_000_000, residu: 0, umurBulan: 6, akumulasi: 0, bulanKe: 7, metode: "garis_lurus" })).toBe(1_000_000);
  });
});

describe("penyusutanBulanan — saldo menurun", () => {
  it("tarifnya dua kali garis lurus, atas nilai buku berjalan", () => {
    // 2/24 × 12.000.000 = 1.000.000 pada bulan pertama.
    expect(penyusutanBulanan({ harga: 12_000_000, residu: 0, umurBulan: 24, akumulasi: 0, bulanKe: 1, metode: "saldo_menurun" })).toBe(1_000_000);
  });

  it("angsurannya MENURUN karena dasarnya nilai buku, bukan harga perolehan", () => {
    const b1 = penyusutanBulanan({ harga: 12_000_000, residu: 0, umurBulan: 24, akumulasi: 0, bulanKe: 1, metode: "saldo_menurun" });
    const b2 = penyusutanBulanan({ harga: 12_000_000, residu: 0, umurBulan: 24, akumulasi: b1, bulanKe: 2, metode: "saldo_menurun" });
    expect(b2).toBeLessThan(b1);
    expect(b2).toBe(Math.round((12_000_000 - b1) * (2 / 24)));
  });

  it("TERMINASI: bulan terakhir menghabiskan sisa nilai buku", () => {
    const { akumulasi } = jalankanPenuh(12_000_000, 0, 24, "saldo_menurun");
    expect(akumulasi).toBe(12_000_000);
  });

  it("TERMINASI dengan residu: berhenti persis di (harga - residu), tidak menembusnya", () => {
    const { akumulasi } = jalankanPenuh(12_000_000, 2_400_000, 24, "saldo_menurun");
    expect(akumulasi).toBe(9_600_000);
  });

  it("bulan terakhir memang lebih besar dari bulan sebelumnya — itu aturan penutupnya", () => {
    const { angsuran } = jalankanPenuh(12_000_000, 0, 24, "saldo_menurun");
    expect(angsuran[23]!).toBeGreaterThan(angsuran[22]!);
  });

  it("menyusut lebih cepat daripada garis lurus di paruh awal", () => {
    const sm = jalankanPenuh(12_000_000, 0, 24, "saldo_menurun").angsuran.slice(0, 12).reduce((a, b) => a + b, 0);
    const gl = jalankanPenuh(12_000_000, 0, 24, "garis_lurus").angsuran.slice(0, 12).reduce((a, b) => a + b, 0);
    expect(sm).toBeGreaterThan(gl);
  });
});

describe("penyusutanBulanan — penjaga", () => {
  it("aset yang sudah tersusut penuh tidak menghasilkan angsuran lagi", () => {
    expect(penyusutanBulanan({ harga: 12_000_000, residu: 0, umurBulan: 24, akumulasi: 12_000_000, bulanKe: 25, metode: "saldo_menurun" })).toBe(0);
  });

  it("umur nol tidak membagi dengan nol", () => {
    const n = penyusutanBulanan({ harga: 1_000_000, residu: 0, umurBulan: 0, akumulasi: 0, bulanKe: 1, metode: "garis_lurus" });
    expect(n).toBe(0);
    expect(Number.isNaN(n)).toBe(false);
  });

  it("residu melebihi harga tidak menghasilkan angsuran negatif", () => {
    expect(penyusutanBulanan({ harga: 1_000_000, residu: 5_000_000, umurBulan: 12, akumulasi: 0, bulanKe: 1, metode: "garis_lurus" })).toBe(0);
  });

  it("lewat masa manfaat pun tidak menembus batas", () => {
    expect(penyusutanBulanan({ harga: 12_000_000, residu: 0, umurBulan: 24, akumulasi: 11_900_000, bulanKe: 40, metode: "saldo_menurun" })).toBe(100_000);
  });
});

describe("KELOMPOK_HARTA", () => {
  it("bangunan TIDAK boleh saldo menurun (UU PPh Ps. 11 ayat 6)", () => {
    expect(KELOMPOK_HARTA_BY_KODE["bangunan_permanen"]!.saldoMenurunBoleh).toBe(false);
    expect(KELOMPOK_HARTA_BY_KODE["bangunan_non_permanen"]!.saldoMenurunBoleh).toBe(false);
  });

  it("kelompok 1–4 boleh saldo menurun", () => {
    for (const kode of ["kel1", "kel2", "kel3", "kel4"]) {
      expect(KELOMPOK_HARTA_BY_KODE[kode]!.saldoMenurunBoleh).toBe(true);
    }
  });

  it("umur tiap kelompok sesuai UU PPh (4/8/16/20 tahun)", () => {
    expect(KELOMPOK_HARTA.map((k) => k.umurBulan)).toEqual([48, 96, 192, 240, 240, 120]);
  });
});

describe("ringkasPenyusutanFiskal", () => {
  const baris = [
    { asetId: "a", nama: "Mesin", komersial: 10_000_000, fiskal: 15_000_000, koreksi: 5_000_000, kelompok: "kel1" },
    { asetId: "b", nama: "Ruko", komersial: 8_000_000, fiskal: 6_000_000, koreksi: -2_000_000, kelompok: "bangunan_permanen" },
  ];

  it("menjumlahkan kedua sisi dan koreksinya", () => {
    const r = ringkasPenyusutanFiskal(baris, 0);
    expect(r.totalKomersial).toBe(18_000_000);
    expect(r.totalFiskal).toBe(21_000_000);
    expect(r.totalKoreksi).toBe(3_000_000);
  });

  it("koreksi = fiskal - komersial, bukan sebaliknya", () => {
    expect(ringkasPenyusutanFiskal([baris[0]!], 0).totalKoreksi).toBe(5_000_000);
  });

  it("aset tanpa kelompok dilaporkan terpisah, bukan dianggap fiskalnya nol", () => {
    expect(ringkasPenyusutanFiskal(baris, 3).tanpaKelompok).toBe(3);
  });

  it("tanpa aset sama sekali → nol, bukan NaN", () => {
    const r = ringkasPenyusutanFiskal([], 0);
    expect(r.totalKoreksi).toBe(0);
    expect(Number.isNaN(r.totalKoreksi)).toBe(false);
  });
});
