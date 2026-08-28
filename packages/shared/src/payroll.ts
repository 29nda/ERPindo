/**
 * Mesin perhitungan gaji Indonesia (PPh 21 metode TER + BPJS).
 *
 * ⚠️ PENTING — VERIFIKASI TARIF PAJAK: Tabel TER mengikuti PMK 168/2023
 * (berlaku sejak 2024, masih berlaku 2026). Batas upah Jaminan Pensiun BPJS
 * diperbarui per Maret 2026 (Rp11.086.300; naik tiap Maret mengikuti
 * pertumbuhan PDB). Peraturan bisa berubah; **verifikasi angka dengan
 * konsultan pajak / peraturan terbaru sebelum dipakai untuk penggajian
 * resmi.** Semua parameter terkumpul di satu berkas ini agar mudah diperbarui.
 */

/** Status PTKP (K = kawin, TK = tidak kawin; angka = jumlah tanggungan). */
export const PTKP_STATUSES = ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"] as const;
export type PtkpStatus = (typeof PTKP_STATUSES)[number];

export type TerCategory = "A" | "B" | "C";

/** Pemetaan status PTKP → kategori TER (PMK 168/2023). */
export function terCategory(status: PtkpStatus): TerCategory {
  // A: PTKP 54jt & 58,5jt → TK/0, TK/1, K/0
  // B: PTKP 63jt & 67,5jt → TK/2, TK/3, K/1, K/2
  // C: PTKP 72jt → K/3
  if (status === "TK/0" || status === "TK/1" || status === "K/0") return "A";
  if (status === "K/3") return "C";
  return "B";
}

type TerBracket = { upTo: number; rate: number }; // upTo inklusif (rupiah/bulan); rate persen

/**
 * Tarif Efektif Rata-rata (TER) bulanan per kategori. Tarif dipakai ke
 * penghasilan bruto bulanan. Bracket terakhir upTo = Infinity.
 */
export const TER_TABLES: Record<TerCategory, TerBracket[]> = {
  A: [
    { upTo: 5_400_000, rate: 0 }, { upTo: 5_650_000, rate: 0.25 }, { upTo: 5_950_000, rate: 0.5 },
    { upTo: 6_300_000, rate: 0.75 }, { upTo: 6_750_000, rate: 1 }, { upTo: 7_500_000, rate: 1.25 },
    { upTo: 8_550_000, rate: 1.5 }, { upTo: 9_650_000, rate: 1.75 }, { upTo: 10_050_000, rate: 2 },
    { upTo: 10_350_000, rate: 2.25 }, { upTo: 10_700_000, rate: 2.5 }, { upTo: 11_050_000, rate: 3 },
    { upTo: 11_600_000, rate: 3.5 }, { upTo: 12_500_000, rate: 4 }, { upTo: 13_750_000, rate: 5 },
    { upTo: 15_100_000, rate: 6 }, { upTo: 16_950_000, rate: 7 }, { upTo: 19_750_000, rate: 8 },
    { upTo: 24_150_000, rate: 9 }, { upTo: 26_450_000, rate: 10 }, { upTo: 28_000_000, rate: 11 },
    { upTo: 30_050_000, rate: 12 }, { upTo: 32_400_000, rate: 13 }, { upTo: 35_400_000, rate: 14 },
    { upTo: 39_100_000, rate: 15 }, { upTo: 43_850_000, rate: 16 }, { upTo: 47_800_000, rate: 17 },
    { upTo: 51_400_000, rate: 18 }, { upTo: 56_300_000, rate: 19 }, { upTo: 62_200_000, rate: 20 },
    { upTo: 68_600_000, rate: 21 }, { upTo: 77_500_000, rate: 22 }, { upTo: 89_000_000, rate: 23 },
    { upTo: 103_000_000, rate: 24 }, { upTo: 125_000_000, rate: 25 }, { upTo: 157_000_000, rate: 26 },
    { upTo: 206_000_000, rate: 27 }, { upTo: 337_000_000, rate: 28 }, { upTo: 454_000_000, rate: 29 },
    { upTo: 550_000_000, rate: 30 }, { upTo: 695_000_000, rate: 31 }, { upTo: 910_000_000, rate: 32 },
    { upTo: 1_400_000_000, rate: 33 }, { upTo: Infinity, rate: 34 },
  ],
  B: [
    { upTo: 6_200_000, rate: 0 }, { upTo: 6_500_000, rate: 0.25 }, { upTo: 6_850_000, rate: 0.5 },
    { upTo: 7_300_000, rate: 0.75 }, { upTo: 9_200_000, rate: 1 }, { upTo: 10_750_000, rate: 1.5 },
    { upTo: 11_250_000, rate: 2 }, { upTo: 11_600_000, rate: 2.5 }, { upTo: 12_600_000, rate: 3 },
    { upTo: 13_600_000, rate: 4 }, { upTo: 14_950_000, rate: 5 }, { upTo: 16_400_000, rate: 6 },
    { upTo: 18_450_000, rate: 7 }, { upTo: 21_850_000, rate: 8 }, { upTo: 26_000_000, rate: 9 },
    { upTo: 27_700_000, rate: 10 }, { upTo: 29_350_000, rate: 11 }, { upTo: 31_450_000, rate: 12 },
    { upTo: 33_950_000, rate: 13 }, { upTo: 37_100_000, rate: 14 }, { upTo: 41_100_000, rate: 15 },
    { upTo: 45_800_000, rate: 16 }, { upTo: 49_500_000, rate: 17 }, { upTo: 53_800_000, rate: 18 },
    { upTo: 58_500_000, rate: 19 }, { upTo: 64_000_000, rate: 20 }, { upTo: 71_000_000, rate: 21 },
    { upTo: 80_000_000, rate: 22 }, { upTo: 93_000_000, rate: 23 }, { upTo: 109_000_000, rate: 24 },
    { upTo: 129_000_000, rate: 25 }, { upTo: 163_000_000, rate: 26 }, { upTo: 211_000_000, rate: 27 },
    { upTo: 374_000_000, rate: 28 }, { upTo: 459_000_000, rate: 29 }, { upTo: 555_000_000, rate: 30 },
    { upTo: 704_000_000, rate: 31 }, { upTo: 957_000_000, rate: 32 }, { upTo: 1_405_000_000, rate: 33 },
    { upTo: Infinity, rate: 34 },
  ],
  C: [
    { upTo: 6_600_000, rate: 0 }, { upTo: 6_950_000, rate: 0.25 }, { upTo: 7_350_000, rate: 0.5 },
    { upTo: 7_800_000, rate: 0.75 }, { upTo: 8_850_000, rate: 1 }, { upTo: 9_800_000, rate: 1.25 },
    { upTo: 10_950_000, rate: 1.5 }, { upTo: 11_200_000, rate: 1.75 }, { upTo: 12_050_000, rate: 2 },
    { upTo: 12_950_000, rate: 3 }, { upTo: 14_150_000, rate: 4 }, { upTo: 15_550_000, rate: 5 },
    { upTo: 17_050_000, rate: 6 }, { upTo: 19_500_000, rate: 7 }, { upTo: 22_700_000, rate: 8 },
    { upTo: 26_600_000, rate: 9 }, { upTo: 28_100_000, rate: 10 }, { upTo: 30_100_000, rate: 11 },
    { upTo: 32_600_000, rate: 12 }, { upTo: 35_400_000, rate: 13 }, { upTo: 38_900_000, rate: 14 },
    { upTo: 43_000_000, rate: 15 }, { upTo: 47_400_000, rate: 16 }, { upTo: 51_200_000, rate: 17 },
    { upTo: 55_800_000, rate: 18 }, { upTo: 60_400_000, rate: 19 }, { upTo: 66_700_000, rate: 20 },
    { upTo: 74_500_000, rate: 21 }, { upTo: 83_200_000, rate: 22 }, { upTo: 95_000_000, rate: 23 },
    { upTo: 110_000_000, rate: 24 }, { upTo: 134_000_000, rate: 25 }, { upTo: 169_000_000, rate: 26 },
    { upTo: 221_000_000, rate: 27 }, { upTo: 390_000_000, rate: 28 }, { upTo: 463_000_000, rate: 29 },
    { upTo: 561_000_000, rate: 30 }, { upTo: 709_000_000, rate: 31 }, { upTo: 965_000_000, rate: 32 },
    { upTo: 1_419_000_000, rate: 33 }, { upTo: Infinity, rate: 34 },
  ],
};

/** Tarif efektif TER (persen) untuk penghasilan bruto bulanan tertentu. */
export function terRate(category: TerCategory, monthlyGross: number): number {
  for (const b of TER_TABLES[category]) {
    if (monthlyGross <= b.upTo) return b.rate;
  }
  return 34;
}

/**
 * Parameter BPJS (sisi pekerja). Tarif employer disertakan sebagai informasi.
 * Batas atas upah = dasar maksimal perhitungan iuran.
 */
export const BPJS_PARAMS = {
  /** Kesehatan: pekerja 1%, batas upah 12.000.000. */
  healthEmployeeRate: 1,
  healthEmployerRate: 4,
  healthCap: 12_000_000,
  /** JHT (Jaminan Hari Tua): pekerja 2%, tanpa batas upah. */
  jhtEmployeeRate: 2,
  jhtEmployerRate: 3.7,
  /** JP (Jaminan Pensiun): pekerja 1%, batas upah 11.086.300 (per Maret 2026). */
  jpEmployeeRate: 1,
  jpEmployerRate: 2,
  jpCap: 11_086_300,
} as const;

export type PayslipInput = {
  baseSalary: number;
  allowances: number;
  ptkpStatus: PtkpStatus;
};

export type PayslipBreakdown = {
  gross: number;
  bpjsHealthEmployee: number;
  bpjsJhtEmployee: number;
  bpjsJpEmployee: number;
  terCategory: TerCategory;
  terRate: number;
  pph21: number;
  totalDeductions: number;
  net: number;
};

const pct = (base: number, rate: number) => Math.round((base * rate) / 100);

/**
 * Hitung rincian slip gaji satu pekerja untuk satu bulan.
 * Bruto = gaji pokok + tunjangan. PPh 21 = tarif TER × bruto. BPJS pekerja
 * dipotong dari bruto dengan batas upah masing-masing.
 */
export function calculatePayslip(input: PayslipInput): PayslipBreakdown {
  const gross = input.baseSalary + input.allowances;
  const cat = terCategory(input.ptkpStatus);
  const rate = terRate(cat, gross);

  const bpjsHealthEmployee = pct(Math.min(gross, BPJS_PARAMS.healthCap), BPJS_PARAMS.healthEmployeeRate);
  const bpjsJhtEmployee = pct(gross, BPJS_PARAMS.jhtEmployeeRate);
  const bpjsJpEmployee = pct(Math.min(gross, BPJS_PARAMS.jpCap), BPJS_PARAMS.jpEmployeeRate);
  const pph21 = pct(gross, rate);

  const totalDeductions = bpjsHealthEmployee + bpjsJhtEmployee + bpjsJpEmployee + pph21;
  return {
    gross,
    bpjsHealthEmployee,
    bpjsJhtEmployee,
    bpjsJpEmployee,
    terCategory: cat,
    terRate: rate,
    pph21,
    totalDeductions,
    net: gross - totalDeductions,
  };
}

/* ------------------------------------------------------------------ *
 * THR — Tunjangan Hari Raya Keagamaan (Fase 43a)
 * ------------------------------------------------------------------ */

/**
 * THR bukan kebijakan perusahaan, melainkan **kewajiban hukum**:
 * Permenaker 6/2016 pasal 2–3. Perusahaan yang tidak membayarnya kena denda 5%
 * dari total THR (PP 36/2021 pasal 62), dan denda itu tidak menggugurkan
 * kewajiban membayarnya.
 *
 * Aturannya sendiri singkat:
 *
 * - masa kerja **12 bulan atau lebih** → satu bulan upah penuh;
 * - masa kerja **1 sampai kurang dari 12 bulan** → proporsional,
 *   `masa kerja ÷ 12 × satu bulan upah`;
 * - masa kerja **kurang dari 1 bulan** → belum berhak.
 *
 * "Upah" di sini adalah upah pokok **ditambah tunjangan tetap** — bukan gaji
 * bersih, dan bukan upah pokok saja. Perusahaan yang menghitungnya dari upah
 * pokok saja membayar kurang, dan itu tetap pelanggaran meski selisihnya kecil.
 */

/** Ambang masa kerja (bulan) untuk THR penuh, menurut Permenaker 6/2016. */
export const THR_BULAN_PENUH = 12;

/**
 * Masa kerja dalam bulan penuh antara dua tanggal `YYYY-MM-DD`.
 *
 * Menghitung bulan **penuh**, bukan selisih bulan kalender: karyawan yang masuk
 * 15 Maret belum genap sebulan pada 1 April, meski nomor bulannya sudah
 * berganti. Selisih kalender akan memberinya THR yang belum menjadi haknya —
 * dan pada karyawan lain, mengurangi hak yang sudah ada.
 *
 * Mengembalikan 0 bila tanggalnya tak sah atau tanggal bayar mendahului tanggal
 * masuk, bukan angka negatif: pemanggilnya membandingkan dengan ambang, dan
 * angka negatif akan lolos sebagai "belum berhak" secara kebetulan saja.
 */
export function masaKerjaBulan(tanggalMasuk: string | null | undefined, tanggalBayar: string): number {
  if (!tanggalMasuk) return 0;
  const masuk = new Date(`${tanggalMasuk}T00:00:00Z`);
  const bayar = new Date(`${tanggalBayar}T00:00:00Z`);
  if (Number.isNaN(masuk.getTime()) || Number.isNaN(bayar.getTime())) return 0;
  if (bayar < masuk) return 0;

  let bulan =
    (bayar.getUTCFullYear() - masuk.getUTCFullYear()) * 12 + (bayar.getUTCMonth() - masuk.getUTCMonth());
  // Belum sampai tanggal yang sama di bulan berjalan → bulan terakhir belum genap.
  if (bayar.getUTCDate() < masuk.getUTCDate()) bulan -= 1;
  return Math.max(0, bulan);
}

export type ThrInput = {
  /** Upah pokok sebulan. */
  baseSalary: number;
  /** Tunjangan tetap sebulan. Ikut dasar THR — bukan tunjangan tidak tetap. */
  allowances: number;
  /** Tanggal masuk kerja, `YYYY-MM-DD`. Kosong → dianggap belum berhak. */
  joinDate: string | null | undefined;
  /** Tanggal pembayaran THR, `YYYY-MM-DD`. */
  payDate: string;
};

export type ThrBreakdown = {
  berhak: boolean;
  masaKerjaBulan: number;
  /** Benar bila THR dihitung proporsional, bukan satu bulan upah penuh. */
  proporsional: boolean;
  /** Dasar perhitungan: upah pokok + tunjangan tetap. */
  upahSebulan: number;
  amount: number;
};

/** Hitung hak THR satu karyawan menurut Permenaker 6/2016. */
export function hitungThr(input: ThrInput): ThrBreakdown {
  const upahSebulan = input.baseSalary + input.allowances;
  const bulan = masaKerjaBulan(input.joinDate, input.payDate);

  if (bulan < 1) {
    return { berhak: false, masaKerjaBulan: bulan, proporsional: false, upahSebulan, amount: 0 };
  }
  if (bulan >= THR_BULAN_PENUH) {
    return { berhak: true, masaKerjaBulan: bulan, proporsional: false, upahSebulan, amount: upahSebulan };
  }
  return {
    berhak: true,
    masaKerjaBulan: bulan,
    proporsional: true,
    upahSebulan,
    // Dibulatkan ke rupiah terdekat. Pembulatan ke bawah menghemat perusahaan
    // dengan mengorbankan hak karyawan, dan itu keputusan yang tidak boleh
    // diambil diam-diam oleh pembulatan.
    amount: Math.round((bulan / THR_BULAN_PENUH) * upahSebulan),
  };
}

export type Pph21ThrBreakdown = {
  /** Tarif TER atas bruto gabungan (upah bulan itu + THR), dalam persen. */
  terRateGabungan: number;
  /** Pajak atas bruto gabungan. */
  pph21Gabungan: number;
  /** Pajak yang sudah/akan dipotong dari upah bulanannya sendiri. */
  pph21Reguler: number;
  /** Selisihnya — inilah pajak yang melekat pada THR. */
  pph21Thr: number;
};

/**
 * PPh 21 atas THR di bawah skema TER bulanan (PMK 168/2023).
 *
 * THR adalah penghasilan **tidak teratur**, tetapi TER tidak mengenal
 * pemisahan itu: yang dikenai tarif adalah **seluruh bruto bulan** tempat THR
 * dibayarkan. Karena itu pajak THR bukan `tarif × THR`, melainkan selisih
 * antara pajak bruto gabungan dan pajak upah regulernya. Menghitungnya sebagai
 * `tarif × THR` memakai tarif lapisan yang salah, dan selalu kurang potong —
 * kekurangan yang baru muncul saat SPT tahunan, saat uangnya sudah lama pergi.
 *
 * BPJS **tidak** dipotong dari THR: iuran dihitung dari upah sebulan, dan THR
 * bukan upah sebulan. Karena itu fungsi ini tidak mengembalikan komponen BPJS
 * sama sekali — bukan lupa, melainkan memang tidak ada.
 */
export function hitungPph21Thr(brutoReguler: number, thr: number, ptkpStatus: PtkpStatus): Pph21ThrBreakdown {
  const cat = terCategory(ptkpStatus);
  const gabungan = brutoReguler + thr;
  const rateGabungan = terRate(cat, gabungan);
  const pph21Gabungan = pct(gabungan, rateGabungan);
  const pph21Reguler = pct(brutoReguler, terRate(cat, brutoReguler));
  return {
    terRateGabungan: rateGabungan,
    pph21Gabungan,
    pph21Reguler,
    // Tidak pernah negatif: tarif TER naik monoton terhadap bruto, tetapi
    // pembulatan pada dua bruto berbeda secara teori bisa membalik urutannya.
    pph21Thr: Math.max(0, pph21Gabungan - pph21Reguler),
  };
}

/* ------------------------------------------------------------------ *
 * Lembur berumus — PP 35/2021 (Fase 43b)
 * ------------------------------------------------------------------ */

/**
 * Sampai fase ini lembur hanyalah angka yang diketik tangan ke dalam komponen
 * gaji ad-hoc. Artinya rumusnya hidup di kepala orang yang mengetik, dan
 * kesalahannya tidak bisa dilihat siapa pun — termasuk oleh karyawan yang
 * dirugikan.
 *
 * PP 35/2021 pasal 31 menetapkan pengalinya, dan pengali itu tidak rata:
 *
 * - **Hari kerja biasa** — jam pertama 1,5×, jam berikutnya 2×.
 * - **Hari libur, 6 hari kerja seminggu** — jam 1–7 = 2×, jam ke-8 = 3×,
 *   jam 9–10 = 4×.
 * - **Hari libur, 5 hari kerja seminggu** — jam 1–8 = 2×, jam ke-9 = 3×,
 *   jam 10–11 = 4×.
 *
 * Karena berjenjang, mengalikan seluruh jam dengan satu pengali selalu salah:
 * terlalu kecil pada jam-jam awal hari libur, terlalu besar pada jam pertama
 * hari biasa. Itulah alasan fungsi di bawah mengembalikan **rincian per
 * segmen**, bukan satu angka — supaya slipnya bisa menunjukkan cara hitungnya,
 * dan karyawan bisa memeriksanya.
 */

/**
 * Pembagi upah sebulan menjadi upah sejam, PP 35/2021 pasal 32 ayat (2).
 *
 * Angka 173 bukan perkiraan: ia berasal dari 40 jam seminggu × 52 minggu ÷ 12
 * bulan ≈ 173,33, yang dibakukan menjadi 173 di peraturannya. Menuliskannya
 * sebagai konstanta bernama, bukan angka telanjang di tengah rumus, supaya
 * yang membacanya tahu ini ketentuan hukum dan bukan pilihan yang boleh diubah.
 */
export const PEMBAGI_UPAH_JAM = 173;

/** Jenis hari lembur. Menentukan tangga pengalinya. */
export const JENIS_HARI_LEMBUR = ["biasa", "libur6", "libur5"] as const;
export type JenisHariLembur = (typeof JENIS_HARI_LEMBUR)[number];

type Tangga = { hingga: number; kali: number }[];

/**
 * Tangga pengali per jenis hari. `hingga` bersifat kumulatif: jam ke-n memakai
 * baris pertama yang `n <= hingga`.
 */
const TANGGA: Record<JenisHariLembur, Tangga> = {
  biasa: [
    { hingga: 1, kali: 1.5 },
    { hingga: Number.POSITIVE_INFINITY, kali: 2 },
  ],
  libur6: [
    { hingga: 7, kali: 2 },
    { hingga: 8, kali: 3 },
    { hingga: Number.POSITIVE_INFINITY, kali: 4 },
  ],
  libur5: [
    { hingga: 8, kali: 2 },
    { hingga: 9, kali: 3 },
    { hingga: Number.POSITIVE_INFINITY, kali: 4 },
  ],
};

/**
 * Batas jam lembur yang dibolehkan per hari.
 *
 * Hari biasa dibatasi 4 jam (PP 35/2021 pasal 26 ayat 1). Hari libur dibatasi
 * oleh tangga pengalinya sendiri — peraturannya tidak menyebut pengali untuk
 * jam ke-11 pada pekan 6 hari, maupun jam ke-12 pada pekan 5 hari.
 */
export const BATAS_JAM_LEMBUR: Record<JenisHariLembur, number> = {
  biasa: 4,
  libur6: 10,
  libur5: 11,
};

export type SegmenLembur = {
  /** Jumlah jam pada segmen ini. */
  jam: number;
  /** Pengali upah sejam yang berlaku pada segmen ini. */
  kali: number;
  amount: number;
};

export type LemburBreakdown = {
  upahPerJam: number;
  jam: number;
  jenisHari: JenisHariLembur;
  segmen: SegmenLembur[];
  amount: number;
  /** Benar bila jamnya melampaui batas yang dibolehkan peraturan. */
  melampauiBatas: boolean;
  batasJam: number;
};

/** Upah sejam menurut PP 35/2021: 1/173 dari upah sebulan. */
export function upahPerJam(upahSebulan: number): number {
  return Math.round(upahSebulan / PEMBAGI_UPAH_JAM);
}

/**
 * Hitung upah lembur berikut rinciannya.
 *
 * Jam pecahan didukung (0,5 jam adalah hal biasa) dan dipotong pada batas tiap
 * segmen, sehingga lembur 1,5 jam di hari biasa menghasilkan dua segmen:
 * 1 jam × 1,5 dan 0,5 jam × 2.
 *
 * Jam yang melampaui batas peraturan TETAP dihitung dan ditandai
 * `melampauiBatas`, bukan dipotong diam-diam. Memotongnya akan menghilangkan
 * upah yang secara perdata sudah menjadi hak karyawan atas jam yang benar-benar
 * ia kerjakan; yang dilanggar perusahaan adalah batas waktu kerjanya, dan itu
 * persoalan yang harus terlihat, bukan ditutup oleh pembayaran yang dikurangi.
 */
export function hitungLembur(input: {
  upahSebulan: number;
  jam: number;
  jenisHari: JenisHariLembur;
}): LemburBreakdown {
  const perJam = upahPerJam(input.upahSebulan);
  const batasJam = BATAS_JAM_LEMBUR[input.jenisHari];
  const jam = Math.max(0, input.jam);

  const segmen: SegmenLembur[] = [];
  let sudah = 0;
  for (const baris of TANGGA[input.jenisHari]) {
    if (sudah >= jam) break;
    const sampai = Math.min(jam, baris.hingga);
    const jamSegmen = sampai - sudah;
    if (jamSegmen <= 0) continue;
    segmen.push({ jam: jamSegmen, kali: baris.kali, amount: Math.round(jamSegmen * baris.kali * perJam) });
    sudah = sampai;
  }

  return {
    upahPerJam: perJam,
    jam,
    jenisHari: input.jenisHari,
    segmen,
    amount: segmen.reduce((a, s) => a + s.amount, 0),
    melampauiBatas: jam > batasJam,
    batasJam,
  };
}

/* ------------------------------------------------------------------ *
 * Pesangon & kompensasi PKWT — PP 35/2021 (Fase 47)
 * ------------------------------------------------------------------ */

/**
 * Pesangon adalah kewajiban hukum yang paling mahal bila salah hitung, dan
 * paling sering salah karena bentuknya berlapis: uang pesangon (UP), uang
 * penghargaan masa kerja (UPMK), dan uang penggantian hak (UPH) — masing-masing
 * punya tabel sendiri, lalu UP dan UPMK **dikalikan pengali yang bergantung
 * ALASAN berakhirnya hubungan kerja**.
 *
 * Pengali itulah yang paling sering diabaikan. Karyawan yang pensiun berhak
 * 1,75 kali UP; yang meninggal dunia 2 kali; yang mengundurkan diri tidak
 * berhak UP sama sekali. Memakai satu angka untuk semuanya membuat perusahaan
 * membayar terlalu banyak pada sebagian orang dan terlalu sedikit pada sebagian
 * yang lain — dan yang kedua berujung perselisihan hubungan industrial.
 *
 * Dasar: PP 35/2021 pasal 40 (tabel UP & UPMK) dan pasal 41–57 (pengali per
 * alasan). Daftar alasan di bawah memuat hal-hal yang lazim ditemui perusahaan
 * kecil dan menengah; ia **tertutup**, bukan lengkap — alasan di luar daftar
 * harus dihitung manual dengan mengacu peraturannya, bukan ditebak sistem.
 */

/** Tabel uang pesangon (UP), PP 35/2021 pasal 40 ayat (2). Nilai = bulan upah. */
export function bulanPesangon(masaKerjaTahun: number): number {
  if (masaKerjaTahun < 1) return 1;
  if (masaKerjaTahun < 2) return 2;
  if (masaKerjaTahun < 3) return 3;
  if (masaKerjaTahun < 4) return 4;
  if (masaKerjaTahun < 5) return 5;
  if (masaKerjaTahun < 6) return 6;
  if (masaKerjaTahun < 7) return 7;
  if (masaKerjaTahun < 8) return 8;
  return 9;
}

/**
 * Tabel uang penghargaan masa kerja (UPMK), PP 35/2021 pasal 40 ayat (3).
 *
 * Masa kerja di bawah 3 tahun **tidak** berhak UPMK. Ini bukan pembulatan ke
 * bawah, melainkan batas yang ditulis peraturannya.
 */
export function bulanPenghargaan(masaKerjaTahun: number): number {
  if (masaKerjaTahun < 3) return 0;
  if (masaKerjaTahun < 6) return 2;
  if (masaKerjaTahun < 9) return 3;
  if (masaKerjaTahun < 12) return 4;
  if (masaKerjaTahun < 15) return 5;
  if (masaKerjaTahun < 18) return 6;
  if (masaKerjaTahun < 21) return 7;
  if (masaKerjaTahun < 24) return 8;
  return 10;
}

/**
 * Alasan berakhirnya hubungan kerja beserta pengali UP dan UPMK.
 *
 * Angkanya langsung dari PP 35/2021. `up` dan `upmk` adalah pengali terhadap
 * tabel di atas; `uangPisah` menandai alasan yang tidak berhak UP/UPMK tetapi
 * berhak uang pisah — besarnya diatur perjanjian kerja, bukan peraturan, jadi
 * sistem TIDAK mengarangnya dan menyerahkannya sebagai isian.
 */
export const ALASAN_PHK = [
  { code: "efisiensi-rugi", label: "Efisiensi karena perusahaan rugi", up: 0.5, upmk: 1, uangPisah: false },
  { code: "efisiensi", label: "Efisiensi tanpa kerugian", up: 1, upmk: 1, uangPisah: false },
  { code: "tutup-rugi", label: "Perusahaan tutup karena rugi", up: 0.5, upmk: 1, uangPisah: false },
  { code: "tutup", label: "Perusahaan tutup bukan karena rugi", up: 1, upmk: 1, uangPisah: false },
  { code: "pailit", label: "Perusahaan pailit", up: 0.5, upmk: 1, uangPisah: false },
  { code: "pensiun", label: "Memasuki usia pensiun", up: 1.75, upmk: 1, uangPisah: false },
  { code: "meninggal", label: "Karyawan meninggal dunia", up: 2, upmk: 1, uangPisah: false },
  { code: "sakit-lama", label: "Sakit berkepanjangan atau cacat kerja", up: 2, upmk: 2, uangPisah: false },
  { code: "mengundurkan-diri", label: "Mengundurkan diri", up: 0, upmk: 0, uangPisah: true },
] as const;
export type AlasanPhkCode = (typeof ALASAN_PHK)[number]["code"];

/**
 * Pembagi upah sebulan menjadi upah sehari untuk komponen UPH cuti.
 *
 * 25 adalah pembagi yang lazim dipakai untuk pekan 6 hari kerja. Peraturannya
 * tidak mematoknya, jadi angkanya ditulis sebagai konstanta bernama dan
 * ditampilkan di layar — bukan disembunyikan di tengah rumus, supaya yang
 * memakainya tahu asumsi apa yang sedang dipakai atas namanya.
 */
export const PEMBAGI_UPAH_HARIAN = 25;

export type PesangonInput = {
  /** Upah sebulan: upah pokok + tunjangan tetap. */
  upahSebulan: number;
  masaKerjaTahun: number;
  alasan: AlasanPhkCode;
  /** Sisa cuti tahunan yang belum diambil, dalam hari. */
  sisaCutiHari?: number;
  /** Uang pisah, bila diatur perjanjian kerja. Sistem tidak mengarangnya. */
  uangPisah?: number;
};

export type PesangonBreakdown = {
  bulanUp: number;
  pengaliUp: number;
  up: number;
  bulanUpmk: number;
  pengaliUpmk: number;
  upmk: number;
  /** UPH: penggantian cuti tahunan yang belum diambil. */
  uphCuti: number;
  uangPisah: number;
  total: number;
  /** Benar bila alasannya tidak berhak UP/UPMK. */
  tanpaPesangon: boolean;
};

/** Hitung pesangon menurut PP 35/2021. */
export function hitungPesangon(input: PesangonInput): PesangonBreakdown {
  const alasan = ALASAN_PHK.find((a) => a.code === input.alasan) ?? ALASAN_PHK[0];
  const tahun = Math.max(0, input.masaKerjaTahun);

  const bulanUp = bulanPesangon(tahun);
  const bulanUpmk = bulanPenghargaan(tahun);
  const up = Math.round(bulanUp * alasan.up * input.upahSebulan);
  const upmk = Math.round(bulanUpmk * alasan.upmk * input.upahSebulan);
  const uphCuti = Math.round(
    ((input.sisaCutiHari ?? 0) * input.upahSebulan) / PEMBAGI_UPAH_HARIAN,
  );
  const uangPisah = input.uangPisah ?? 0;

  return {
    bulanUp,
    pengaliUp: alasan.up,
    up,
    bulanUpmk,
    pengaliUpmk: alasan.upmk,
    upmk,
    uphCuti,
    uangPisah,
    total: up + upmk + uphCuti + uangPisah,
    tanpaPesangon: alasan.up === 0 && alasan.upmk === 0,
  };
}

/**
 * Uang kompensasi PKWT, PP 35/2021 pasal 15–17.
 *
 * Kewajiban yang paling sering terlewat: karyawan kontrak berhak uang
 * kompensasi saat kontraknya berakhir, sebesar `masa kerja ÷ 12 × satu bulan
 * upah`. Berlaku untuk masa kerja **paling singkat satu bulan** secara terus
 * menerus; di bawah itu belum lahir haknya.
 *
 * Berbeda dari pesangon, kompensasi ini tidak bergantung alasan berakhirnya —
 * ia melekat pada berakhirnya kontrak itu sendiri.
 */
export function kompensasiPkwt(upahSebulan: number, masaKerjaBulanKerja: number): number {
  if (masaKerjaBulanKerja < 1) return 0;
  return Math.round((masaKerjaBulanKerja / 12) * upahSebulan);
}

/**
 * Hak cuti tahunan menurut masa kerja.
 *
 * UU 13/2003 pasal 79: 12 hari kerja setelah bekerja 12 bulan terus menerus.
 * Karyawan yang belum genap setahun **belum berhak** menurut undang-undang;
 * banyak perusahaan memberikannya proporsional sebagai kebijakan, dan itu
 * dibolehkan karena lebih menguntungkan karyawan. Fungsi ini mengembalikan
 * keduanya supaya perusahaan tahu mana yang wajib dan mana yang kebijakan.
 */
export function hakCutiTahunan(masaKerjaBulanKerja: number): {
  wajib: number;
  proporsional: number;
  sudahSetahun: boolean;
} {
  const sudahSetahun = masaKerjaBulanKerja >= 12;
  return {
    wajib: sudahSetahun ? 12 : 0,
    proporsional: Math.min(12, Math.floor((Math.max(0, masaKerjaBulanKerja) / 12) * 12)),
    sudahSetahun,
  };
}
