import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bacaKursReferensi } from "@erpindo/shared";

/**
 * Kurs referensi: ketelitiannya dijaga, sumbernya diambil sekali (Fase 57c).
 *
 * ## Cacat pertama: penyegaran otomatis lebih kasar daripada isian tangan
 *
 * `bacaKursReferensi` membalik "valas per 1 IDR" menjadi "Rupiah per 1 valas",
 * lalu — sampai fase ini — MEMBULATKANNYA ke bilangan bulat:
 *
 *   const perValas = Math.round(1 / nilai);
 *
 * Pembulatan itu membuang ketelitian yang justru disediakan skemanya (kolom
 * `rate` bertipe REAL) dan yang diterima formulir manualnya
 * (`rate: z.number().positive()`, pecahan apa pun). Jadi pekerjaan latar yang
 * berjalan tiap malam MENIMPA angka pemilik dengan angka yang lebih kasar:
 *
 *   VND — 1 IDR ≈ 1,57 VND. Seharusnya 0,637 Rupiah per VND; dibulatkan jadi
 *         1, yaitu kelebihan nilai 57% pada tiap faktur dong Vietnam.
 *   IRR — 1 IDR ≈ 2.600 IRR. Seharusnya 0,000385; dibulatkan jadi 0, ditolak
 *         penjaga `<= 0`, jadi mata uangnya tak pernah tersegarkan sama sekali.
 *
 * Sepele bagi USD (~16.000), fatal bagi mata uang yang satu satuannya bernilai
 * kurang dari satu rupiah — dan Indonesia berdagang dengan negara-negara itu.
 *
 * ## Cacat kedua: sumber global diambil sekali PER TENANT
 *
 * Ini kurs REFERENSI: isinya sama untuk semua orang. Pengambilannya dulu duduk
 * di dalam gelung harian, jadi seribu perusahaan berarti seribu permintaan
 * identik ke penyedia yang sama setiap hari — cukup untuk dianggap
 * penyalahgunaan dan diblokir — dan seribu kesempatan menggantung di dalam
 * gelung yang anggarannya terbatas. Tanpa batas waktu pula, sementara
 * pemeriksaan anggaran cron ada DI ANTARA iterasi, bukan di tengah permintaan.
 */

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..");
const CURRENCIES = readFileSync(join(AKAR, "src/routes/currencies.ts"), "utf8");
const INDEX = readFileSync(join(AKAR, "src/index.ts"), "utf8");

/** `rates` sumber = valas per 1 IDR. */
const payload = (rates: Record<string, number>) => ({ base: "IDR", rates });

describe("ketelitian kurs tidak dibuang", () => {
  it("mata uang yang satu satuannya < 1 rupiah tidak dibulatkan jadi 1", () => {
    const h = bacaKursReferensi(payload({ VND: 1.57 }));
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    // Nilai benarnya 0,6369…; pembulatan lama menghasilkan 1 (kelebihan 57%).
    expect(h.kurs.VND).toBeCloseTo(0.636943, 6);
    expect(h.kurs.VND).not.toBe(1);
  });

  it("mata uang yang satu satuannya < 0,5 rupiah tidak lagi hilang", () => {
    const h = bacaKursReferensi(payload({ IRR: 2600 }));
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    // Pembulatan lama: Math.round(0,000384…) = 0 → ditolak → tak pernah segar.
    expect(h.kurs.IRR).toBeGreaterThan(0);
    expect(h.kurs.IRR).toBeCloseTo(0.000384615, 9);
    expect(h.diabaikan).not.toContain("IRR");
  });

  it("mata uang besar tetap wajar dan tetap berketelitian nisbi", () => {
    const h = bacaKursReferensi(payload({ USD: 0.0000616, JPY: 0.00934 }));
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.kurs.USD).toBeGreaterThan(15_000);
    expect(h.kurs.USD).toBeLessThan(18_000);
    expect(h.kurs.JPY).toBeCloseTo(107.066, 3);
  });

  /** Enam angka penting: ketelitian NISBI, bukan jumlah desimal tetap. */
  it("enam angka penting dipertahankan di kedua ujung skala", () => {
    const h = bacaKursReferensi(payload({ BESAR: 0.00000001, KECIL: 1000 }));
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(String(h.kurs.BESAR).replace(/[.\-+e0]/gi, "").length).toBeLessThanOrEqual(6);
    expect(h.kurs.KECIL).toBeCloseTo(0.001, 6);
  });

  it("nilai tak masuk akal tetap ditolak, bukan disimpan", () => {
    const h = bacaKursReferensi(payload({ USD: 0.0000616, RUSAK: -3, NAN: Number.NaN }));
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.diabaikan).toContain("RUSAK");
    expect(h.diabaikan).toContain("NAN");
    expect(h.kurs.RUSAK).toBeUndefined();
  });

  it("basis selain IDR ditolak seluruhnya, bukan sebagian dipakai", () => {
    const h = bacaKursReferensi({ base: "USD", rates: { IDR: 16000 } });
    expect(h.ok).toBe(false);
  });
});

describe("sumber kurs diambil sekali per jalan, bukan sekali per tenant", () => {
  it("pengambilan dan penerapan terpisah", () => {
    expect(CURRENCIES).toMatch(/export async function ambilKursReferensi\(env: Env\)/);
    expect(CURRENCIES).toMatch(/export async function terapkanKursReferensi\(/);
  });

  /**
   * Inti perbaikannya: pengambilannya HARUS di luar gelung harian, dan yang di
   * dalam gelung hanya penulisan ke master tenant.
   */
  it("cron mengambil sebelum gelung harian, dan hanya menerapkan di dalamnya", () => {
    const posAmbil = INDEX.indexOf("const kursRef = await ambilKursReferensi(env)");
    const posGelung = INDEX.indexOf("for (const t of antreanHarian)");
    const posTerap = INDEX.indexOf("await terapkanKursReferensi(db, kursRef)");
    expect(posAmbil).toBeGreaterThan(-1);
    expect(posGelung).toBeGreaterThan(-1);
    expect(posTerap).toBeGreaterThan(-1);
    expect(posAmbil, "pengambilan harus SEBELUM gelung").toBeLessThan(posGelung);
    expect(posTerap, "penerapan ada di DALAM gelung").toBeGreaterThan(posGelung);
  });

  it("cron tidak lagi memanggil pengambilan per tenant", () => {
    const gelung = INDEX.slice(INDEX.indexOf("for (const t of antreanHarian)"));
    expect(gelung).not.toContain("ambilKursReferensi");
    expect(gelung).not.toContain("segarkanKursReferensi");
  });

  /**
   * Tanpa batas waktu, satu sumber yang menggantung menahan gelung harian tanpa
   * batas — dan pemeriksaan anggaran cron ada DI ANTARA iterasi, bukan di
   * tengah satu permintaan, jadi ia tidak bisa menolong.
   */
  it("pengambilannya berbatas waktu", () => {
    expect(CURRENCIES).toMatch(/new AbortController\(\)/);
    expect(CURRENCIES).toMatch(/signal: ctrl\.signal/);
    expect(CURRENCIES).toMatch(/BATAS_AMBIL_MS = 10_000/);
    expect(CURRENCIES).toMatch(/clearTimeout\(timer\)/);
  });

  it("sumber yang gagal tidak menghentikan tugas harian", () => {
    expect(INDEX).toMatch(/kursRef\.status === "gagal"/);
    expect(INDEX).toMatch(/kurs referensi dilewati/);
  });
});
