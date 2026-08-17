import { describe, expect, it } from "vitest";
import { hargaUntukGrup, konversiSatuanBaris } from "../src/index";

/**
 * Harga bertingkat per grup pelanggan (Fase 23a).
 *
 * Yang diuji di sini adalah dua hal yang tidak akan terlihat salah di layar
 * kalau keliru: perlakuan harga Rp 0, dan ARAH konversi satuan besar.
 */
describe("hargaUntukGrup (Fase 23a)", () => {
  it("tanpa harga grup memakai harga dasar produk", () => {
    expect(hargaUntukGrup({ hargaDasar: 12_000 })).toEqual({ harga: 12_000, sumber: "dasar" });
  });

  // `null` dan `undefined` sama-sama berarti "baris daftar harganya tidak ada".
  // Keduanya diuji karena keduanya benar-benar muncul: `undefined` dari Map yang
  // tak punya kuncinya, `null` dari kolom SQL.
  it("hargaGrup null maupun undefined mundur ke harga dasar", () => {
    expect(hargaUntukGrup({ hargaDasar: 12_000, hargaGrup: null }).sumber).toBe("dasar");
    expect(hargaUntukGrup({ hargaDasar: 12_000, hargaGrup: undefined }).sumber).toBe("dasar");
  });

  it("harga grup dipakai dan ditandai sumbernya", () => {
    expect(hargaUntukGrup({ hargaDasar: 12_000, hargaGrup: 9_500 })).toEqual({
      harga: 9_500,
      sumber: "grup",
    });
  });

  // INI penjaga barang bonus. Kalau 0 diperlakukan sebagai "belum diatur",
  // barang gratis akan tertagih Rp 12.000 dan fakturnya terlihat wajar.
  it("harga grup Rp 0 SAH (barang bonus), bukan dianggap kosong", () => {
    expect(hargaUntukGrup({ hargaDasar: 12_000, hargaGrup: 0 })).toEqual({
      harga: 0,
      sumber: "grup",
    });
  });

  it("satuan dasar tidak mengalikan apa pun meski produknya punya faktor", () => {
    const r = hargaUntukGrup({ hargaDasar: 12_000, hargaGrup: 9_500, satuan: "dasar", faktor: 24 });
    expect(r.harga).toBe(9_500);
  });

  it("satuan besar MENGALIKAN harga dengan faktor", () => {
    // Daftar harga menyimpan Rp 9.500/pcs; 1 dus = 24 pcs → Rp 228.000/dus.
    const r = hargaUntukGrup({ hargaDasar: 12_000, hargaGrup: 9_500, satuan: "besar", faktor: 24 });
    expect(r).toEqual({ harga: 228_000, sumber: "grup" });
  });

  it("harga dasar pun ikut dikali saat satuannya besar", () => {
    const r = hargaUntukGrup({ hargaDasar: 12_000, satuan: "besar", faktor: 24 });
    expect(r).toEqual({ harga: 288_000, sumber: "dasar" });
  });

  // Faktor cacat harus diperlakukan sama seperti di `konversiSatuanBaris()`,
  // supaya kedua sisi konversi tidak pernah memakai faktor berbeda.
  it("faktor cacat (0, negatif, pecahan, NaN) diperlakukan 1", () => {
    for (const faktor of [0, -5, 0.5, Number.NaN]) {
      expect(hargaUntukGrup({ hargaDasar: 7_000, satuan: "besar", faktor }).harga).toBe(7_000);
    }
  });

  /**
   * Penjaga arah konversi, dan inilah uji yang paling berharga di berkas ini.
   *
   * Uji-uji di atas masih bisa hijau kalau arahnya dibalik DAN angka harapannya
   * ikut dibalik. Yang tidak bisa dipalsukan adalah perjalanan bolak-balik:
   * harga daftar (per pcs) → harga baris (per dus) → kembali ke per pcs lewat
   * `konversiSatuanBaris()`, fungsi yang dipakai mesin posting sungguhan.
   * Kalau `hargaUntukGrup` membagi alih-alih mengali, angka akhirnya meleset
   * 24 × 24 dan uji ini merah.
   */
  it("bolak-balik dengan konversiSatuanBaris kembali ke harga daftar", () => {
    const HARGA_DAFTAR_PER_PCS = 9_500;
    const FAKTOR = 24;

    const baris = hargaUntukGrup({
      hargaDasar: 12_000,
      hargaGrup: HARGA_DAFTAR_PER_PCS,
      satuan: "besar",
      faktor: FAKTOR,
    });

    const posting = konversiSatuanBaris({
      qty: 2,
      satuan: "besar",
      faktor: FAKTOR,
      hargaSatuan: baris.harga,
      nilaiBaris: 2 * baris.harga,
    });

    expect(posting.hargaSatuanDasar).toBe(HARGA_DAFTAR_PER_PCS);
    expect(posting.qtyDasar).toBe(48);
    expect(posting.sisaPembulatan).toBe(0);
  });
});
