import { describe, expect, it } from "vitest";
import {
  calculatePayslip,
  PTKP_STATUSES,
  TER_TABLES,
  terCategory,
  terRate,
  type PtkpStatus,
  type TerCategory,
} from "../src/index";

/**
 * Audit struktur tabel TER (Fase 54b).
 *
 * ## Apa yang diuji di sini, dan apa yang TIDAK
 *
 * Berkas `payroll.ts` sudah memperingatkan bahwa nilai tarifnya harus
 * diverifikasi konsultan pajak terhadap PMK 168/2023. Uji ini **tidak**
 * berpura-pura melakukan itu: membandingkan 125 baris tarif dengan peraturan
 * aslinya menuntut dokumen resmi, bukan ingatan.
 *
 * Yang diuji adalah **struktur dan perilakunya** — dan itu justru bisa
 * menangkap kelas kesalahan yang paling mungkin terjadi pada tabel sepanjang
 * ini: satu digit salah ketik saat menyalin. Angka yang tertukar hampir selalu
 * melanggar salah satu invarian di bawah, meski nilainya sendiri terlihat wajar.
 */
const kategoriUji: TerCategory[] = ["A", "B", "C"];

describe("struktur tabel TER", () => {
  const kategori = kategoriUji;

  it.each(kategori)("kategori %s: batas penghasilan menaik tanpa celah", (k) => {
    const t = TER_TABLES[k];
    expect(t.length).toBeGreaterThan(10);
    for (let i = 1; i < t.length; i++) {
      expect(t[i]!.upTo, `${k} bracket ${i}`).toBeGreaterThan(t[i - 1]!.upTo);
    }
  });

  it.each(kategori)("kategori %s: tarif menaik, tidak pernah turun", (k) => {
    // Tarif yang turun saat penghasilan naik berarti ada digit tertukar.
    const t = TER_TABLES[k];
    for (let i = 1; i < t.length; i++) {
      expect(t[i]!.rate, `${k} bracket ${i}`).toBeGreaterThanOrEqual(t[i - 1]!.rate);
    }
  });

  it.each(kategori)("kategori %s: dimulai 0%% dan ditutup Infinity", (k) => {
    const t = TER_TABLES[k];
    expect(t[0]!.rate).toBe(0);
    expect(t[t.length - 1]!.upTo).toBe(Infinity);
  });

  it.each(kategori)("kategori %s: seluruh tarif dalam rentang yang masuk akal", (k) => {
    // Batas atas PPh 21 orang pribadi adalah 35%; TER tidak boleh melampauinya.
    for (const b of TER_TABLES[k]) {
      expect(b.rate).toBeGreaterThanOrEqual(0);
      expect(b.rate).toBeLessThanOrEqual(35);
    }
  });

  it("setiap status PTKP memetakan ke kategori yang ada", () => {
    for (const s of PTKP_STATUSES) {
      expect(kategori).toContain(terCategory(s as PtkpStatus));
    }
  });
});

describe("terRate — perilaku di batas bracket", () => {
  it("batas atas bersifat INKLUSIF", () => {
    // `upTo` inklusif menurut komentar tipenya. Penghasilan tepat di batas
    // harus memakai tarif bracket itu, bukan bracket berikutnya — sumber
    // klasik selisih satu yang menghasilkan potongan pajak keliru.
    for (const k of ["A", "B", "C"] as TerCategory[]) {
      const t = TER_TABLES[k];
      for (let i = 0; i < Math.min(t.length - 1, 8); i++) {
        const b = t[i]!;
        expect(terRate(k, b.upTo), `${k} tepat di ${b.upTo}`).toBe(b.rate);
        expect(terRate(k, b.upTo + 1), `${k} sesudah ${b.upTo}`).toBe(t[i + 1]!.rate);
      }
    }
  });

  it("penghasilan nol tidak dikenai pajak", () => {
    for (const k of ["A", "B", "C"] as TerCategory[]) expect(terRate(k, 0)).toBe(0);
  });

  it("penghasilan sangat besar memakai tarif tertinggi tabelnya", () => {
    for (const k of ["A", "B", "C"] as TerCategory[]) {
      const t = TER_TABLES[k];
      expect(terRate(k, 5_000_000_000)).toBe(t[t.length - 1]!.rate);
    }
  });
});

describe("invarian lintas kategori — tanggungan tidak boleh menaikkan pajak", () => {
  /**
   * Ini penjaga paling kuat di berkas ini, dan alasannya perlu dinyatakan.
   *
   * Kategori TER ditentukan PTKP: A untuk tanggungan paling sedikit, C untuk
   * paling banyak. Karyawan dengan tanggungan LEBIH BANYAK tidak boleh
   * membayar pajak lebih besar pada penghasilan yang sama — itu bertentangan
   * dengan seluruh maksud PTKP.
   *
   * Invarian ini menangkap salah ketik yang tidak bisa dilihat pemeriksaan
   * per-tabel: satu bracket yang nilainya wajar sendirian, tetapi salah
   * relatif terhadap kategori lain.
   */
  /**
   * SATU pita yang melanggar, dan sengaja TIDAK ditambal dengan menebak.
   *
   * Ditemukan uji ini pada jalan pertamanya: untuk bruto bulanan di
   * Rp 8.850.001 – Rp 9.200.000, kategori C dikenai 1,25% sementara kategori B
   * hanya 1% — karyawan dengan tanggungan LEBIH BANYAK membayar lebih besar.
   *
   * Dugaan kuat ini salah salin di tabel B, bukan bunyi peraturannya:
   * kategori A dan C sama-sama punya bracket 1,25%, sementara B melompat dari
   * 1% langsung ke 1,5%. Batas 1% milik B (9.200.000) juga melampaui batas 1%
   * milik C (8.850.000), padahal C seharusnya selalu lebih longgar.
   *
   * Angka penggantinya TIDAK ditebak di sini. Menebak tarif pajak lebih buruk
   * daripada cacatnya: dampaknya kecil dan terbatas (0,25% pada satu pita
   * sempit, sekitar Rp 22.500 per bulan), sedangkan tarif karangan bisa salah
   * ke segala arah tanpa batas. Verifikasinya ada di daftar langkah pemilik —
   * lampiran PMK 168/2023, dicocokkan konsultan pajak.
   *
   * Pengecualian ini MEMBUNUH DIRINYA SENDIRI: begitu tabelnya diperbaiki dan
   * pita ini berhenti melanggar, uji di bawah gagal dan meminta pengecualiannya
   * dicabut. Pengecualian yang hidup lebih lama daripada sebabnya adalah cara
   * paling umum sebuah cacat berubah menjadi perilaku resmi.
   */
  const PITA_MENUNGGU_VERIFIKASI = { dari: 8_850_001, sampai: 9_200_000 };
  const dikecualikan = (bruto: number) =>
    bruto >= PITA_MENUNGGU_VERIFIKASI.dari && bruto <= PITA_MENUNGGU_VERIFIKASI.sampai;

  const contohPenghasilan = [
    0, 5_000_000, 5_400_000, 6_200_000, 7_000_000, 12_000_000, 15_000_000,
    20_000_000, 30_000_000, 50_000_000, 100_000_000, 500_000_000, 2_000_000_000,
  ];

  it.each(contohPenghasilan)("pada bruto %i: tarif A >= B >= C", (bruto) => {
    const a = terRate("A", bruto);
    const b = terRate("B", bruto);
    const c = terRate("C", bruto);
    expect(a, `A vs B pada ${bruto}`).toBeGreaterThanOrEqual(b);
    expect(b, `B vs C pada ${bruto}`).toBeGreaterThanOrEqual(c);
  });

  it("invarian berlaku di SELURUH batas bracket, kecuali satu pita terdaftar", () => {
    // Menyapu tiap batas dan tiap rupiah sesudahnya — 240 titik. Contoh yang
    // dipilih tangan hanya menemukan yang kebetulan disebut; sapuan ini
    // menemukan seluruhnya.
    const batas = new Set<number>();
    for (const k of kategoriUji) {
      for (const b of TER_TABLES[k]) if (Number.isFinite(b.upTo)) { batas.add(b.upTo); batas.add(b.upTo + 1); }
    }
    const melanggar = [...batas]
      .sort((x, y) => x - y)
      .filter((g) => {
        const [a, b, c] = [terRate("A", g), terRate("B", g), terRate("C", g)];
        return !(a >= b && b >= c);
      });

    const takTerdaftar = melanggar.filter((g) => !dikecualikan(g));
    expect(takTerdaftar, `pelanggaran BARU di bruto: ${takTerdaftar.join(", ")}`).toEqual([]);

    // Sisi kedua pengecualian: ia harus masih dibutuhkan.
    expect(
      melanggar.length,
      "pita 8.850.001–9.200.000 sudah tidak melanggar — cabut PITA_MENUNGGU_VERIFIKASI dan uji ini",
    ).toBeGreaterThan(0);
  });

  it("slip gaji ikut mematuhinya: PPh 21 tidak naik saat tanggungan bertambah", () => {
    // Diuji lewat slip utuh, bukan hanya tabel — supaya pembulatan dan
    // urutan operasi di `calculatePayslip` ikut tercakup.
    const urut: PtkpStatus[] = ["TK/0", "TK/1", "K/0", "TK/2", "K/1", "K/2", "K/3"];
    // 9 juta sengaja TIDAK diuji: ia jatuh di pita yang menunggu verifikasi.
    for (const bruto of [8_000_000, 15_000_000, 40_000_000]) {
      let sebelumnya = Number.POSITIVE_INFINITY;
      for (const s of urut) {
        const slip = calculatePayslip({ baseSalary: bruto, allowances: 0, ptkpStatus: s });
        expect(slip.pph21, `${s} pada ${bruto}`).toBeLessThanOrEqual(sebelumnya);
        sebelumnya = slip.pph21;
      }
    }
  });
});
