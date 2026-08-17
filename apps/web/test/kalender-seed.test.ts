import { describe, expect, it } from "vitest";
// @ts-expect-error — helper skrip (.mjs polos), sengaja tanpa tipe: bukan kode produk.
import { akhirBulan, bulanRiwayat, jumlahHari, periodeBulan, tanggalDalamBulan } from "../../../scripts/lib/kalender.mjs";

/**
 * Aritmetika bulan untuk penyemaian demo (Fase 28).
 *
 * Ini menguji AKAR cacat yang membuat demo produksi tampil rugi Rp 20,7 juta di
 * bulan lalu. Blok riwayat Fase 24c menempatkan enam bulan data dengan
 * `daysAgo(m * 30)`; karena bulan kalender bukan 30 hari, jendelanya melenceng
 * makin jauh tiap bulan mundur sampai satu bulan penuh nyaris kosong sementara
 * bulan itulah yang menanggung gaji pertama.
 *
 * Skrip semai tidak ikut CI, jadi inilah satu-satunya tempat keputusan itu bisa
 * dikunci. Yang diuji: enam bulan riwayat harus BENAR-BENAR enam bulan kalender
 * berbeda dan berurutan, dan tiap tanggal harus jatuh di dalam bulan yang
 * diklaimnya.
 *
 * Tanggal jangkarnya dipilih yang menjebak, bukan yang nyaman.
 */

/** Jangkar yang menjebak — masing-masing pernah/berpotensi memecahkan aritmetika tangan. */
const JANGKAR = [
  { nama: "31 Maret (mundur ke Februari yang pendek)", kini: new Date(Date.UTC(2026, 2, 31)) },
  { nama: "1 Januari (lintas tahun)", kini: new Date(Date.UTC(2026, 0, 1)) },
  { nama: "29 Februari kabisat", kini: new Date(Date.UTC(2024, 1, 29)) },
  { nama: "31 Agustus (hari terakhir bulan panjang)", kini: new Date(Date.UTC(2026, 7, 31)) },
  { nama: "15 Agustus (hari biasa — pembanding)", kini: new Date(Date.UTC(2026, 7, 15)) },
];

describe("kalender semai demo", () => {
  for (const { nama, kini } of JANGKAR) {
    describe(nama, () => {
      it("enam bulan riwayat = enam bulan kalender berbeda, berurutan, tanpa bulan berjalan", () => {
        const bulan = bulanRiwayat(6, kini);
        const periode = bulan.map((b: { periode: string }) => b.periode);

        expect(periode).toHaveLength(6);
        expect(new Set(periode).size, `ada bulan yang DOBEL: ${periode.join(", ")}`).toBe(6);

        // Menaik: bulan paling lama lebih dulu (stok dihitung dari pergerakan
        // terposting, jadi urutan kirimnya wajib begini).
        expect([...periode].sort(), `urutan tidak menaik: ${periode.join(", ")}`).toEqual(periode);

        // Tidak ada bulan yang TERLEWAT — inilah yang gagal pada aritmetika 30 hari.
        for (let i = 1; i < periode.length; i++) {
          const [ySeb, mSeb] = periode[i - 1].split("-").map(Number);
          const [y, m] = periode[i].split("-").map(Number);
          expect(y * 12 + m, `lompatan bulan antara ${periode[i - 1]} dan ${periode[i]}`).toBe(ySeb * 12 + mSeb + 1);
        }

        // Bulan berjalan TIDAK boleh ikut: ia punya bloknya sendiri di skrip semai,
        // dan menumpuknya di sini akan menghitung penjualan bulan ini dua kali.
        expect(periode).not.toContain(periodeBulan(0, kini));
      });

      it("tiap tanggal faktur jatuh DI DALAM bulan yang diklaimnya", () => {
        for (const b of bulanRiwayat(6, kini) as { periode: string; hari: (h: number) => string }[]) {
          // Hari-hari yang dipakai skrip semai: belanja awal bulan, empat faktur menyebar.
          for (const h of [3, 6, 12, 19, 26]) {
            expect(b.hari(h).slice(0, 7), `tanggal ${b.hari(h)} bocor keluar dari ${b.periode}`).toBe(b.periode);
          }
        }
      });

      it("hari gajian adalah hari TERAKHIR bulan itu", () => {
        for (const b of bulanRiwayat(6, kini) as { periode: string; akhir: string }[]) {
          const [y, m] = b.periode.split("-").map(Number);
          expect(b.akhir).toBe(`${b.periode}-${String(jumlahHari(y, m - 1)).padStart(2, "0")}`);
          expect(b.akhir.slice(0, 7)).toBe(b.periode);
        }
      });
    });
  }

  it("tanggal 31 dijepit ke panjang bulan, bukan melimpah ke bulan berikutnya", () => {
    // 31 Maret 2026 → mundur 1 bulan = Februari (28 hari). Meminta tanggal 31
    // harus memberi 28 Februari, BUKAN 3 Maret.
    const kini = new Date(Date.UTC(2026, 2, 31));
    expect(tanggalDalamBulan(1, 31, kini)).toBe("2026-02-28");
    expect(tanggalDalamBulan(1, 30, kini)).toBe("2026-02-28");
    expect(tanggalDalamBulan(1, 1, kini)).toBe("2026-02-01");
    // Februari kabisat tetap dapat 29.
    expect(tanggalDalamBulan(0, 31, new Date(Date.UTC(2024, 1, 10)))).toBe("2024-02-29");
  });

  it("mundur melewati batas tahun tetap benar", () => {
    const kini = new Date(Date.UTC(2026, 0, 15)); // 15 Januari 2026
    expect(periodeBulan(1, kini)).toBe("2025-12");
    expect(periodeBulan(13, kini)).toBe("2024-12");
    expect(akhirBulan(1, kini)).toBe("2025-12-31");
  });
});
