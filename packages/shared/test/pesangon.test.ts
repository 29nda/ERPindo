import { describe, expect, it } from "vitest";
import {
  ALASAN_PHK,
  bulanPenghargaan,
  bulanPesangon,
  hakCutiTahunan,
  hitungPesangon,
  kompensasiPkwt,
  PEMBAGI_UPAH_HARIAN,
} from "../src/payroll";

/**
 * Pesangon & kompensasi PKWT — PP 35/2021 (Fase 47).
 *
 * Yang diuji adalah batas-batas tabelnya dan pengali per alasan. Keduanya
 * bukan detail: memakai satu pengali untuk semua alasan membuat perusahaan
 * membayar terlalu banyak pada sebagian orang dan terlalu sedikit pada sebagian
 * lain — dan yang kedua berujung perselisihan hubungan industrial.
 */
const UPAH = 10_000_000;

describe("tabel uang pesangon (pasal 40 ayat 2)", () => {
  it("naik satu bulan tiap tahun sampai mentok 9 bulan", () => {
    expect(bulanPesangon(0)).toBe(1);
    expect(bulanPesangon(1)).toBe(2);
    expect(bulanPesangon(4)).toBe(5);
    expect(bulanPesangon(8)).toBe(9);
    expect(bulanPesangon(30)).toBe(9);
  });

  it("batasnya tepat di pergantian tahun, bukan setelahnya", () => {
    expect(bulanPesangon(0.99)).toBe(1);
    expect(bulanPesangon(1.0)).toBe(2);
  });
});

describe("tabel penghargaan masa kerja (pasal 40 ayat 3)", () => {
  it("di bawah 3 tahun TIDAK berhak UPMK", () => {
    // Ini batas yang ditulis peraturannya, bukan pembulatan ke bawah.
    expect(bulanPenghargaan(0)).toBe(0);
    expect(bulanPenghargaan(2.9)).toBe(0);
    expect(bulanPenghargaan(3)).toBe(2);
  });

  it("melompat pada tiap kelipatan tiga tahun", () => {
    expect(bulanPenghargaan(6)).toBe(3);
    expect(bulanPenghargaan(9)).toBe(4);
    expect(bulanPenghargaan(21)).toBe(8);
  });

  it("mentok di 10 bulan pada 24 tahun ke atas", () => {
    expect(bulanPenghargaan(24)).toBe(10);
    expect(bulanPenghargaan(40)).toBe(10);
  });
});

describe("pengali per alasan PHK", () => {
  it("kodenya unik", () => {
    const kode = ALASAN_PHK.map((a) => a.code);
    expect(kode.length).toBe(new Set(kode).size);
  });

  it("pensiun 1,75x dan meninggal 2x — bukan 1x seperti alasan biasa", () => {
    const pensiun = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 10, alasan: "pensiun" });
    const efisiensi = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 10, alasan: "efisiensi" });
    const meninggal = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 10, alasan: "meninggal" });
    expect(pensiun.up).toBe(Math.round(9 * 1.75 * UPAH));
    expect(pensiun.up).toBeGreaterThan(efisiensi.up);
    expect(meninggal.up).toBeGreaterThan(pensiun.up);
  });

  it("efisiensi KARENA RUGI hanya setengah UP", () => {
    const rugi = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 5, alasan: "efisiensi-rugi" });
    const tanpaRugi = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 5, alasan: "efisiensi" });
    expect(rugi.up).toBe(Math.round(tanpaRugi.up / 2));
    // UPMK-nya TIDAK ikut dipotong — pengalinya tetap 1.
    expect(rugi.upmk).toBe(tanpaRugi.upmk);
  });

  it("sakit berkepanjangan menggandakan UP DAN UPMK", () => {
    const r = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 10, alasan: "sakit-lama" });
    expect(r.pengaliUp).toBe(2);
    expect(r.pengaliUpmk).toBe(2);
    expect(r.upmk).toBe(4 * 2 * UPAH);
  });

  it("mengundurkan diri: tidak ada UP maupun UPMK", () => {
    const r = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 10, alasan: "mengundurkan-diri" });
    expect(r.up).toBe(0);
    expect(r.upmk).toBe(0);
    expect(r.tanpaPesangon).toBe(true);
  });

  it("uang pisah TIDAK dikarang sistem — hanya dipakai bila diisi", () => {
    // Besarnya diatur perjanjian kerja, bukan peraturan. Menebaknya berarti
    // mengarang kewajiban yang mungkin tidak ada.
    const tanpa = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 10, alasan: "mengundurkan-diri" });
    expect(tanpa.uangPisah).toBe(0);
    const dengan = hitungPesangon({
      upahSebulan: UPAH,
      masaKerjaTahun: 10,
      alasan: "mengundurkan-diri",
      uangPisah: 5_000_000,
    });
    expect(dengan.total).toBe(5_000_000);
  });
});

describe("UPH cuti", () => {
  it("sisa cuti diganti dengan upah harian", () => {
    const r = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 5, alasan: "efisiensi", sisaCutiHari: 5 });
    expect(r.uphCuti).toBe(Math.round((5 * UPAH) / PEMBAGI_UPAH_HARIAN));
    expect(r.uphCuti).toBe(2_000_000);
  });

  it("tanpa sisa cuti tidak menambah apa pun", () => {
    expect(hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: 5, alasan: "efisiensi" }).uphCuti).toBe(0);
  });

  it("UPH tetap dibayar meski alasannya tanpa pesangon", () => {
    // Cuti yang belum diambil sudah menjadi hak karyawan; ia tidak hangus
    // karena orangnya mengundurkan diri.
    const r = hitungPesangon({
      upahSebulan: UPAH,
      masaKerjaTahun: 10,
      alasan: "mengundurkan-diri",
      sisaCutiHari: 4,
    });
    expect(r.uphCuti).toBeGreaterThan(0);
    expect(r.total).toBe(r.uphCuti);
  });
});

describe("total pesangon", () => {
  it("total adalah jumlah seluruh komponennya", () => {
    const r = hitungPesangon({
      upahSebulan: UPAH,
      masaKerjaTahun: 10,
      alasan: "pensiun",
      sisaCutiHari: 6,
      uangPisah: 1_000_000,
    });
    expect(r.total).toBe(r.up + r.upmk + r.uphCuti + r.uangPisah);
  });

  it("masa kerja negatif diperlakukan nol, bukan melempar", () => {
    const r = hitungPesangon({ upahSebulan: UPAH, masaKerjaTahun: -5, alasan: "efisiensi" });
    expect(r.bulanUp).toBe(1);
    expect(r.bulanUpmk).toBe(0);
  });
});

describe("kompensasi PKWT (pasal 15-17)", () => {
  it("masa kerja 12 bulan = satu bulan upah penuh", () => {
    expect(kompensasiPkwt(UPAH, 12)).toBe(UPAH);
  });

  it("proporsional di bawah setahun", () => {
    expect(kompensasiPkwt(UPAH, 6)).toBe(5_000_000);
  });

  it("kontrak lebih dari setahun melampaui satu bulan upah", () => {
    // Berbeda dari THR yang mentok di satu bulan: kompensasi PKWT terus
    // bertambah mengikuti lamanya kontrak.
    expect(kompensasiPkwt(UPAH, 24)).toBe(2 * UPAH);
  });

  it("di bawah satu bulan belum berhak", () => {
    expect(kompensasiPkwt(UPAH, 0)).toBe(0);
    expect(kompensasiPkwt(UPAH, 0.9)).toBe(0);
  });
});

describe("hak cuti tahunan", () => {
  it("belum setahun: belum wajib, tetapi proporsionalnya dilaporkan", () => {
    const r = hakCutiTahunan(6);
    expect(r.sudahSetahun).toBe(false);
    expect(r.wajib).toBe(0);
    expect(r.proporsional).toBe(6);
  });

  it("genap setahun: 12 hari, wajib menurut UU 13/2003", () => {
    const r = hakCutiTahunan(12);
    expect(r.sudahSetahun).toBe(true);
    expect(r.wajib).toBe(12);
  });

  it("lebih dari setahun tidak melampaui 12 hari dari rumus ini", () => {
    // Tambahan di atas 12 hari adalah kebijakan perusahaan, bukan hasil rumus
    // undang-undang — jadi rumus ini tidak boleh mengarangnya.
    expect(hakCutiTahunan(60).proporsional).toBe(12);
  });
});
