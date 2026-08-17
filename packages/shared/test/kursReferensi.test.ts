import { describe, expect, it } from "vitest";
import { bacaKursReferensi } from "../src/accounting";

/**
 * Pembacaan kurs referensi dari sumber luar (Fase 22b).
 *
 * Kurs mengalikan SELURUH saldo valas, jadi satu nilai sampah yang lolos akan
 * menggeser neraca tanpa ada yang mengetik apa pun. Uji di bawah karena itu
 * lebih banyak tentang penolakan daripada tentang perhitungan.
 */

describe("bacaKursReferensi (Fase 22b)", () => {
  it("membalik rates (valas per IDR) jadi Rupiah per valas", () => {
    // 1 IDR = 0,0000625 USD → 1 USD = 16.000 IDR.
    const r = bacaKursReferensi({ base: "IDR", rates: { USD: 0.0000625, SGD: 0.0000833 } });
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.kurs.USD).toBe(16_000);
    expect(r.kurs.SGD).toBe(12_005); // 1/0,0000833 dibulatkan
    expect(r.diabaikan).toEqual([]);
  });

  it("basis selain IDR ditolak SELURUHNYA, bukan diambil sebagian", () => {
    // Memakai payload berbasis USD seolah berbasis IDR akan mengubah kurs
    // ribuan kali lipat — persis kelas kesalahan yang tidak boleh separuh jalan.
    const r = bacaKursReferensi({ base: "USD", rates: { IDR: 16000 } });
    expect(r).toEqual({ ok: false, alasan: "Sumber kurs memakai basis 'USD', bukan IDR." });
  });

  it("payload bukan objek ditolak", () => {
    expect(bacaKursReferensi("kosong").ok).toBe(false);
    expect(bacaKursReferensi(null).ok).toBe(false);
    expect(bacaKursReferensi(42).ok).toBe(false);
  });

  it("tanpa objek rates ditolak", () => {
    expect(bacaKursReferensi({ base: "IDR" })).toEqual({
      ok: false,
      alasan: "Sumber kurs tidak memuat objek 'rates'.",
    });
  });

  it("nilai rusak dibuang SATU PER SATU — mata uang lain tetap terpakai", () => {
    const r = bacaKursReferensi({
      base: "IDR",
      rates: { USD: 0.0000625, EUR: "banyak", JPY: 0, GBP: -1, CHF: Number.NaN },
    });
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.kurs).toEqual({ USD: 16_000 });
    expect(r.diabaikan.sort()).toEqual(["CHF", "EUR", "GBP", "JPY"]);
  });

  it("IDR di dalam rates dilewati, bukan dianggap valas", () => {
    const r = bacaKursReferensi({ base: "IDR", rates: { IDR: 1, USD: 0.0000625 } });
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.kurs).toEqual({ USD: 16_000 });
  });

  it("semua nilai rusak → GAGAL, bukan sukses yang kebetulan tak mengubah apa pun", () => {
    const r = bacaKursReferensi({ base: "IDR", rates: { EUR: 0, JPY: -3 } });
    expect(r).toEqual({
      ok: false,
      alasan: "Sumber kurs tidak memuat satu pun kurs yang bisa dipakai.",
    });
  });

  it("kode mata uang huruf kecil dinormalkan jadi huruf besar", () => {
    const r = bacaKursReferensi({ base: "idr", rates: { usd: 0.0000625 } });
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.kurs).toEqual({ USD: 16_000 });
  });
});
