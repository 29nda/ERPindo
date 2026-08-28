import { describe, expect, it } from "vitest";
import { jatuhTempoDariTermin, melampauiBatasKredit } from "../src/accounting";

/**
 * Batas kredit & termin pembayaran (Fase 42a).
 *
 * Keduanya sempat dijanjikan peragaan selama beberapa fase padahal kolomnya
 * tidak pernah ada (lihat Fase 41a). Uji ini menjaga agar yang sekarang
 * dijanjikan benar-benar berperilaku seperti yang dijanjikan.
 */
describe("melampauiBatasKredit", () => {
  it("tanpa batas: berapa pun nilainya tetap lolos", () => {
    expect(melampauiBatasKredit(999_000_000, 500_000_000, undefined)).toBe(false);
    expect(melampauiBatasKredit(999_000_000, 500_000_000, null)).toBe(false);
  });

  it("batas nol berarti tidak boleh berutang sama sekali", () => {
    // Nol BUKAN sama dengan "tanpa batas". Inilah alasan kolomnya nullable
    // alih-alih berdefault 0 — default nol akan memblokir seluruh pelanggan
    // lama yang belum pernah disetel.
    expect(melampauiBatasKredit(0, 1, 0)).toBe(true);
    expect(melampauiBatasKredit(0, 0, 0)).toBe(false);
  });

  it("piutang berjalan ikut dihitung, bukan hanya faktur barunya", () => {
    // Faktur 30 juta sendiri masih di bawah batas 50 juta, tetapi pelanggan
    // sudah berutang 30 juta — dan justru penjumlahannya yang menentukan.
    expect(melampauiBatasKredit(30_000_000, 30_000_000, 50_000_000)).toBe(true);
    expect(melampauiBatasKredit(10_000_000, 30_000_000, 50_000_000)).toBe(false);
  });

  it("tepat di batas masih lolos, satu rupiah di atasnya tidak", () => {
    expect(melampauiBatasKredit(49_999_999, 1, 50_000_000)).toBe(false);
    expect(melampauiBatasKredit(50_000_000, 1, 50_000_000)).toBe(true);
  });
});

describe("jatuhTempoDariTermin", () => {
  it("tanpa termin mengembalikan undefined, bukan tanggal dokumen", () => {
    // Penting: pemanggil membedakan "tidak ada termin" dari "jatuh tempo hari
    // ini". Mengembalikan tanggal dokumen akan diam-diam menjadikan seluruh
    // faktur pelanggan tanpa termin jatuh tempo seketika.
    expect(jatuhTempoDariTermin("2026-03-10", undefined)).toBeUndefined();
    expect(jatuhTempoDariTermin("2026-03-10", null)).toBeUndefined();
  });

  it("termin 30 hari", () => {
    expect(jatuhTempoDariTermin("2026-03-10", 30)).toBe("2026-04-09");
  });

  it("termin 0 hari berarti jatuh tempo hari itu juga (tunai)", () => {
    expect(jatuhTempoDariTermin("2026-03-10", 0)).toBe("2026-03-10");
  });

  it("menyeberang pergantian bulan dan tahun", () => {
    expect(jatuhTempoDariTermin("2026-12-20", 30)).toBe("2027-01-19");
  });

  it("tahun kabisat dihitung benar", () => {
    // 2028 kabisat: 29 Februari ada, jadi 14 Feb + 30 hari = 15 Maret.
    expect(jatuhTempoDariTermin("2028-02-14", 30)).toBe("2028-03-15");
    // 2027 bukan kabisat: 14 Feb + 30 hari = 16 Maret.
    expect(jatuhTempoDariTermin("2027-02-14", 30)).toBe("2027-03-16");
  });

  it("tanggal tak sah tidak melempar, hanya mengembalikan undefined", () => {
    expect(jatuhTempoDariTermin("bukan-tanggal", 30)).toBeUndefined();
  });
});
