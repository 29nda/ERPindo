import { describe, expect, it } from "vitest";
import {
  ALASAN_PHK,
  bulanPenghargaan,
  bulanPesangon,
  hakCutiTahunan,
  hitungLembur,
  hitungPesangon,
  hitungThr,
  JENIS_HARI_LEMBUR,
  kompensasiPkwt,
  masaKerjaBulan,
  PEMBAGI_UPAH_JAM,
  upahPerJam,
  type JenisHariLembur,
} from "../src/index";

/**
 * Audit invarian penggajian (Fase 54c).
 *
 * Sama seperti audit TER di Fase 54b: yang diuji BUKAN apakah setiap angka
 * cocok dengan bunyi peraturannya — itu menuntut dokumen resmi di tangan —
 * melainkan properti yang harus selalu berlaku apa pun tarifnya.
 *
 * Invarian semacam ini menangkap kelas kesalahan yang tidak terlihat dari
 * membaca tabelnya: tangga yang tumpang tindih, ambang yang bocor, dan
 * pembayaran yang justru turun saat haknya bertambah.
 */

const UPAH = 8_650_000; // habis dibagi 173 → upah sejam bulat, memisahkan
                        // kesalahan tangga dari kebisingan pembulatan.

describe("lembur — tangga pengali", () => {
  it.each([...JENIS_HARI_LEMBUR])("%s: pengali tidak pernah turun & ditutup Infinity", (hari) => {
    // Dibaca lewat perilaku, bukan tabel internalnya: `TANGGA` sengaja tidak
    // diekspor, dan mengujinya lewat hasil justru lebih dekat ke yang dialami
    // pengguna.
    const kali: number[] = [];
    for (let jam = 1; jam <= 14; jam++) {
      const b = hitungLembur({ upahSebulan: UPAH, jam, jenisHari: hari as JenisHariLembur });
      const terakhir = b.segmen[b.segmen.length - 1];
      if (terakhir) kali.push(terakhir.kali);
    }
    for (let i = 1; i < kali.length; i++) expect(kali[i]!).toBeGreaterThanOrEqual(kali[i - 1]!);
  });

  it.each([...JENIS_HARI_LEMBUR])("%s: jam segmen berjumlah PERSIS jam yang dimasukkan", (hari) => {
    /**
     * Invarian terkuat di berkas ini.
     *
     * Tangga yang tumpang tindih membuat satu jam dibayar dua kali; tangga
     * berlubang membuat satu jam tidak dibayar sama sekali. Keduanya tidak
     * terlihat dari membaca tabelnya, dan keduanya langsung melanggar cek ini.
     */
    for (const jam of [0.5, 1, 1.5, 2, 3.25, 7, 7.5, 8, 8.5, 9, 12, 24]) {
      const b = hitungLembur({ upahSebulan: UPAH, jam, jenisHari: hari as JenisHariLembur });
      const total = b.segmen.reduce((s, x) => s + x.jam, 0);
      expect(total, `${hari} pada ${jam} jam`).toBeCloseTo(jam, 9);
    }
  });

  it.each([...JENIS_HARI_LEMBUR])("%s: upah tidak pernah turun saat jam bertambah", (hari) => {
    let sebelumnya = -1;
    for (let jam = 0; jam <= 14; jam += 0.5) {
      const b = hitungLembur({ upahSebulan: UPAH, jam, jenisHari: hari as JenisHariLembur });
      expect(b.amount, `${hari} pada ${jam} jam`).toBeGreaterThanOrEqual(sebelumnya);
      sebelumnya = b.amount;
    }
  });

  it("jam nol atau negatif tidak menghasilkan upah", () => {
    for (const hari of JENIS_HARI_LEMBUR) {
      expect(hitungLembur({ upahSebulan: UPAH, jam: 0, jenisHari: hari }).amount).toBe(0);
      expect(hitungLembur({ upahSebulan: UPAH, jam: -3, jenisHari: hari }).amount).toBe(0);
    }
  });

  it("penanda melampaui batas mengikuti batasnya, bukan menebak", () => {
    for (const hari of JENIS_HARI_LEMBUR) {
      const batas = hitungLembur({ upahSebulan: UPAH, jam: 1, jenisHari: hari }).batasJam;
      expect(hitungLembur({ upahSebulan: UPAH, jam: batas, jenisHari: hari }).melampauiBatas).toBe(false);
      expect(hitungLembur({ upahSebulan: UPAH, jam: batas + 0.5, jenisHari: hari }).melampauiBatas).toBe(true);
    }
  });

  it("upah sejam memakai pembagi peraturan, bukan angka lain", () => {
    expect(PEMBAGI_UPAH_JAM).toBe(173);
    expect(upahPerJam(1_730_000)).toBe(10_000);
  });
});

describe("pesangon — tabel UP & UPMK", () => {
  it("UP tidak pernah turun saat masa kerja bertambah", () => {
    let sebelumnya = -1;
    for (let th = 0; th <= 40; th++) {
      const b = bulanPesangon(th);
      expect(b, `${th} tahun`).toBeGreaterThanOrEqual(sebelumnya);
      sebelumnya = b;
    }
  });

  it("UPMK tidak pernah turun saat masa kerja bertambah", () => {
    let sebelumnya = -1;
    for (let th = 0; th <= 40; th++) {
      const b = bulanPenghargaan(th);
      expect(b, `${th} tahun`).toBeGreaterThanOrEqual(sebelumnya);
      sebelumnya = b;
    }
  });

  it("UPMK belum lahir sebelum 3 tahun — batas peraturan, bukan pembulatan", () => {
    expect(bulanPenghargaan(2)).toBe(0);
    expect(bulanPenghargaan(2.99)).toBe(0);
    expect(bulanPenghargaan(3)).toBe(2);
  });

  it("mengundurkan diri tidak berhak UP maupun UPMK", () => {
    const resign = ALASAN_PHK.find((a) => a.up === 0 && a.upmk === 0);
    expect(resign, "harus ada alasan tanpa pesangon di daftar").toBeTruthy();
    const b = hitungPesangon({
      alasan: resign!.code,
      masaKerjaTahun: 10,
      upahSebulan: UPAH,
      sisaCutiHari: 0,
    });
    expect(b.up).toBe(0);
    expect(b.upmk).toBe(0);
    expect(b.tanpaPesangon).toBe(true);
  });

  it("seluruh komponen pesangon tidak pernah negatif", () => {
    for (const a of ALASAN_PHK) {
      for (const th of [0, 1, 3, 8, 24, 40]) {
        const b = hitungPesangon({ alasan: a.code, masaKerjaTahun: th, upahSebulan: UPAH, sisaCutiHari: 5 });
        for (const [nama, nilai] of [["up", b.up], ["upmk", b.upmk], ["uphCuti", b.uphCuti], ["total", b.total]] as const) {
          expect(nilai, `${a.code} ${th}th ${nama}`).toBeGreaterThanOrEqual(0);
        }
        expect(b.total).toBe(b.up + b.upmk + b.uphCuti + b.uangPisah);
      }
    }
  });

  it("masa kerja negatif diperlakukan sebagai nol, bukan dibiarkan", () => {
    const b = hitungPesangon({ alasan: ALASAN_PHK[0]!.code, masaKerjaTahun: -5, upahSebulan: UPAH });
    expect(b.bulanUp).toBe(bulanPesangon(0));
  });
});

describe("masaKerjaBulan — batas bulan kalender", () => {
  it("tanggal bayar mendahului tanggal masuk memberi nol, bukan negatif", () => {
    expect(masaKerjaBulan("2026-06-01", "2026-01-01")).toBe(0);
  });

  it("hari yang sama belum genap sebulan", () => {
    expect(masaKerjaBulan("2026-01-15", "2026-01-15")).toBe(0);
    expect(masaKerjaBulan("2026-01-15", "2026-02-14")).toBe(0);
    expect(masaKerjaBulan("2026-01-15", "2026-02-15")).toBe(1);
  });

  it("tanggal masuk kosong atau tidak sah memberi nol", () => {
    expect(masaKerjaBulan(null, "2026-05-01")).toBe(0);
    expect(masaKerjaBulan(undefined, "2026-05-01")).toBe(0);
    expect(masaKerjaBulan("bukan-tanggal", "2026-05-01")).toBe(0);
  });

  it("tidak pernah negatif untuk kombinasi tanggal apa pun", () => {
    const tanggal = ["2024-01-31", "2025-02-28", "2026-03-01", "2026-12-31"];
    for (const a of tanggal) for (const b of tanggal) expect(masaKerjaBulan(a, b)).toBeGreaterThanOrEqual(0);
  });
});

describe("THR — proporsional lalu penuh", () => {
  const dasar = { baseSalary: 6_000_000, allowances: 1_000_000, payDate: "2026-03-01" };

  it("belum sebulan belum berhak", () => {
    expect(hitungThr({ ...dasar, joinDate: "2026-02-20" }).berhak).toBe(false);
  });

  it("tidak pernah melampaui satu bulan upah", () => {
    for (const masuk of ["2010-01-01", "2025-01-01", "2025-09-01", "2026-01-01", "2026-02-01"]) {
      const b = hitungThr({ ...dasar, joinDate: masuk });
      expect(b.amount, masuk).toBeLessThanOrEqual(b.upahSebulan);
      expect(b.amount).toBeGreaterThanOrEqual(0);
    }
  });

  it("tidak pernah turun saat masa kerja bertambah", () => {
    // Tanggal masuk makin lama = masa kerja makin panjang = THR tidak boleh
    // lebih kecil.
    const masukMundur = ["2026-02-01", "2025-12-01", "2025-09-01", "2025-03-01", "2020-01-01"];
    let sebelumnya = -1;
    for (const masuk of masukMundur) {
      const b = hitungThr({ ...dasar, joinDate: masuk });
      expect(b.amount, masuk).toBeGreaterThanOrEqual(sebelumnya);
      sebelumnya = b.amount;
    }
  });

  it("genap setahun berarti penuh, bukan proporsional", () => {
    const b = hitungThr({ ...dasar, joinDate: "2025-03-01" });
    expect(b.proporsional).toBe(false);
    expect(b.amount).toBe(b.upahSebulan);
  });
});

describe("kompensasi PKWT & cuti tahunan", () => {
  it("PKWT belum lahir di bawah satu bulan", () => {
    expect(kompensasiPkwt(UPAH, 0)).toBe(0);
    expect(kompensasiPkwt(UPAH, 0.9)).toBe(0);
  });

  it("PKWT tidak pernah turun saat masa kerja bertambah", () => {
    let sebelumnya = -1;
    for (let bln = 0; bln <= 60; bln++) {
      const v = kompensasiPkwt(UPAH, bln);
      expect(v, `${bln} bulan`).toBeGreaterThanOrEqual(sebelumnya);
      sebelumnya = v;
    }
  });

  it("PKWT setahun penuh = satu bulan upah", () => {
    expect(kompensasiPkwt(UPAH, 12)).toBe(UPAH);
  });

  it("cuti wajib lahir tepat di bulan ke-12", () => {
    expect(hakCutiTahunan(11).wajib).toBe(0);
    expect(hakCutiTahunan(11).sudahSetahun).toBe(false);
    expect(hakCutiTahunan(12).wajib).toBe(12);
    expect(hakCutiTahunan(12).sudahSetahun).toBe(true);
  });

  it("cuti proporsional tidak pernah melampaui hak penuh", () => {
    for (let bln = 0; bln <= 40; bln++) {
      const h = hakCutiTahunan(bln);
      expect(h.proporsional, `${bln} bulan`).toBeLessThanOrEqual(12);
      expect(h.proporsional).toBeGreaterThanOrEqual(0);
    }
  });

  it("masa kerja negatif tidak menghasilkan hak negatif", () => {
    expect(hakCutiTahunan(-6).proporsional).toBe(0);
    expect(hakCutiTahunan(-6).wajib).toBe(0);
  });
});
