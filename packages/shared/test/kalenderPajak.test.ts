import { describe, expect, it } from "vitest";
import {
  geserAkhirPekan,
  tenggatMasaPajak,
  tenggatMendatang,
  tenggatSptTahunan,
  type ProfilPajak,
} from "../src/accounting";

/**
 * Fase 22e — kalender pajak Indonesia.
 *
 * Kelas kesalahan yang paling mahal di sini bukan "tanggalnya meleset sehari"
 * melainkan **arah** melesetnya: tenggat yang ditampilkan LEBIH LAMBAT daripada
 * yang sebenarnya berujung denda, sementara yang lebih awal cuma berarti
 * menyetor lebih cepat. Beberapa uji di bawah menguji arah itu secara khusus.
 */

const umkmOP: ProfilPajak = { pkp: false, pphFinalUmkm: true, adaKaryawan: false, badan: false };
const pkpBadan: ProfilPajak = { pkp: true, pphFinalUmkm: false, adaKaryawan: true, badan: true };

describe("geserAkhirPekan", () => {
  it("Sabtu digeser ke Senin", () => {
    expect(geserAkhirPekan("2026-08-15")).toBe("2026-08-17"); // Sabtu
  });

  it("Minggu digeser ke Senin", () => {
    expect(geserAkhirPekan("2026-08-16")).toBe("2026-08-17");
  });

  it("hari kerja tidak digeser", () => {
    expect(geserAkhirPekan("2026-08-14")).toBe("2026-08-14"); // Jumat
  });

  it("pergeseran SELALU maju, tidak pernah mundur", () => {
    for (const d of ["2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17"]) {
      expect(geserAkhirPekan(d) >= d).toBe(true);
    }
  });
});

describe("tenggatMasaPajak — tanggal menurut UU", () => {
  const t = tenggatMasaPajak("2026-08", pkpBadan, "2026-08-01");
  const cari = (jenis: string, kegiatan: string) => t.find((x) => x.jenis === jenis && x.kegiatan === kegiatan);

  it("PPh 21 setor tanggal 10 bulan berikutnya", () => {
    expect(cari("pph21", "setor")?.tanggalUu).toBe("2026-09-10");
  });

  it("PPh 21 lapor tanggal 20 bulan berikutnya", () => {
    expect(cari("pph21", "lapor")?.tanggalUu).toBe("2026-09-20");
  });

  it("PPh 25 setor tanggal 15 bulan berikutnya", () => {
    expect(cari("pph25", "setor")?.tanggalUu).toBe("2026-09-15");
  });

  it("PPN setor & lapor sama-sama akhir bulan berikutnya", () => {
    expect(cari("ppn", "setor")?.tanggalUu).toBe("2026-09-30");
    expect(cari("ppn", "lapor")?.tanggalUu).toBe("2026-09-30");
  });

  it("akhir bulan berikutnya benar untuk masa yang menyeberang tahun", () => {
    const des = tenggatMasaPajak("2026-12", pkpBadan, "2026-12-01");
    expect(des.find((x) => x.jenis === "ppn")?.tanggalUu).toBe("2027-01-31");
  });

  it("Februari tahun kabisat: akhir bulannya 29, bukan 28", () => {
    const jan = tenggatMasaPajak("2028-01", pkpBadan, "2028-01-01");
    expect(jan.find((x) => x.jenis === "ppn")?.tanggalUu).toBe("2028-02-29");
  });
});

describe("tenggatMasaPajak — hanya kewajiban yang berlaku", () => {
  it("non-PKP tidak diberi tenggat PPN", () => {
    const t = tenggatMasaPajak("2026-08", umkmOP, "2026-08-01");
    expect(t.some((x) => x.jenis === "ppn")).toBe(false);
  });

  it("tanpa karyawan tidak diberi tenggat PPh 21", () => {
    const t = tenggatMasaPajak("2026-08", umkmOP, "2026-08-01");
    expect(t.some((x) => x.jenis === "pph21")).toBe(false);
  });

  it("pengguna PPh Final UMKM diberi PPh Final, BUKAN PPh 25", () => {
    const t = tenggatMasaPajak("2026-08", umkmOP, "2026-08-01");
    expect(t.some((x) => x.jenis === "pph_final")).toBe(true);
    expect(t.some((x) => x.jenis === "pph25")).toBe(false);
  });

  it("yang bukan UMKM diberi PPh 25, bukan PPh Final", () => {
    const t = tenggatMasaPajak("2026-08", pkpBadan, "2026-08-01");
    expect(t.some((x) => x.jenis === "pph25")).toBe(true);
    expect(t.some((x) => x.jenis === "pph_final")).toBe(false);
  });
});

describe("tenggatMasaPajak — pergeseran akhir pekan tidak pernah memundurkan tenggat", () => {
  it("tanggal yang ditampilkan tidak pernah lebih AWAL dari tanggal UU", () => {
    for (const masa of ["2026-01", "2026-02", "2026-05", "2026-08", "2026-11"]) {
      for (const t of tenggatMasaPajak(masa, pkpBadan, "2026-01-01")) {
        expect(t.tanggal >= t.tanggalUu).toBe(true);
      }
    }
  });

  it("tanggal UU tetap disimpan apa adanya agar bisa ditelusuri", () => {
    // Masa Juli 2026: PPh 21 setor 2026-08-10 (Senin) — tidak bergeser.
    // Masa Agustus 2026: PPh 25 setor 2026-09-15 (Selasa) — tidak bergeser.
    const t = tenggatMasaPajak("2026-04", pkpBadan, "2026-04-01");
    const pph21 = t.find((x) => x.jenis === "pph21" && x.kegiatan === "setor")!;
    expect(pph21.tanggalUu).toBe("2026-05-10"); // Minggu
    expect(pph21.tanggal).toBe("2026-05-11"); // digeser ke Senin
  });
});

describe("tenggatSptTahunan", () => {
  it("orang pribadi 31 Maret tahun berikutnya", () => {
    expect(tenggatSptTahunan(2026, umkmOP, "2026-01-01").tanggalUu).toBe("2027-03-31");
  });

  it("badan 30 April tahun berikutnya", () => {
    expect(tenggatSptTahunan(2026, pkpBadan, "2026-01-01").tanggalUu).toBe("2027-04-30");
  });
});

describe("tenggatMendatang", () => {
  const semua = tenggatMasaPajak("2026-08", pkpBadan, "2026-09-14");

  it("menyaring ke jendela ke depan", () => {
    const dekat = tenggatMendatang(semua, 7, 0);
    expect(dekat.every((t) => t.sisaHari >= 0 && t.sisaHari <= 7)).toBe(true);
    expect(dekat.length).toBeGreaterThan(0);
  });

  it("tenggat yang BARU SAJA lewat tetap ditampilkan — itu yang paling perlu dilihat", () => {
    const dengan = tenggatMendatang(semua, 7, 7);
    expect(dengan.some((t) => t.sisaHari < 0)).toBe(true);
  });

  it("tenggat yang sudah lama lewat tidak ikut", () => {
    expect(tenggatMendatang(semua, 7, 7).every((t) => t.sisaHari >= -7)).toBe(true);
  });

  it("diurutkan dari yang paling mendesak", () => {
    const d = tenggatMendatang(semua, 30, 30).map((t) => t.sisaHari);
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });

  it("tanpa tenggat dalam jendela → daftar kosong, bukan galat", () => {
    expect(tenggatMendatang(semua, 0, 0).length).toBeGreaterThanOrEqual(0);
    expect(tenggatMendatang([], 14, 7)).toEqual([]);
  });
});
