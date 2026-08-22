import type { Naskah, Nada, Sasaran } from "./tipe";

/**
 * Mesin peragaan — fungsi MURNI, tanpa React (Fase 38a).
 *
 * ## Kenapa dipisah dari komponennya
 *
 * Seluruh keputusan "apa yang terlihat pada langkah ke-n" ada di sini, dan
 * tidak satu pun menyentuh DOM, timer, atau state React. Itu yang membuatnya
 * bisa diuji sebagai tabel kebenaran biasa: `bingkaiPada(naskah, i)` untuk tiap
 * `i` adalah pertanyaan yang punya satu jawaban benar.
 *
 * Peragaan hero yang lama (`pertunjukan.tsx`) menyatukan ketiganya dalam satu
 * komponen. Untuk satu peragaan itu wajar; untuk 57 peragaan, artinya tidak ada
 * satu pun perilaku animasi yang bisa diuji tanpa merender Chromium.
 */

/** Berapa lama satu langkah bertahan bila naskahnya tidak menyebut sendiri. */
export const DURASI_BAKU = 900;

/** Jeda tambahan sebelum peragaan berulang dari awal. */
export const DURASI_ULANG = 2600;

/** Keadaan layar pada satu titik waktu. */
export type Bingkai = {
  /** Indeks langkah yang sedang berjalan. `-1` berarti belum ada yang jalan. */
  indeks: number;
  /** Id panel yang sudah menyala terisi. */
  terisi: ReadonlySet<string>;
  /** Sasaran yang sedang disorot, bila ada. */
  sorotan: Sasaran | null;
  /** Posisi kursor peraga, bila langkah ini menggerakkannya. */
  kursor: Sasaran | null;
  /** `true` tepat saat klik terjadi — dipakai untuk riak dan tekanan tombol. */
  menekan: boolean;
  /** `"panel.medan"` → bagian ketikan yang sudah tampil, 0…1. */
  ketikan: ReadonlyMap<string, number>;
  /** Id panel → nada status yang sudah ditandaikan padanya. */
  ditandai: ReadonlyMap<string, Nada>;
  /** Jalur yang tampil di bilah alamat. */
  jalur: string;
};

/** Kunci gabungan untuk peta ketikan. */
function kunciMedan(s: Sasaran): string {
  return `${s.panel}.${s.medan ?? ""}`;
}

/**
 * Panel yang menyala hanya lewat langkah `isi`.
 *
 * Panel yang TIDAK pernah menjadi sasaran `isi` dianggap sudah terisi sejak
 * bingkai pertama. Ini menjaga aturan warisan `pertunjukan.tsx`: seluruh isi
 * selalu ada, animasi hanya menyingkap yang memang disingkap dengan sengaja.
 */
function panelDisingkap(naskah: Naskah): Set<string> {
  const keluar = new Set<string>();
  for (const l of naskah.langkah) if (l.aksi === "isi") keluar.add(l.sasaran.panel);
  return keluar;
}

/** Medan yang diketik — sebelum langkahnya, ketikannya belum ada. */
function medanDiketik(naskah: Naskah): Set<string> {
  const keluar = new Set<string>();
  for (const l of naskah.langkah) {
    if ((l.aksi === "ketik" || l.aksi === "pilih") && l.sasaran.medan) {
      keluar.add(kunciMedan(l.sasaran));
    }
  }
  return keluar;
}

/**
 * Keadaan layar pada langkah `indeks`.
 *
 * @param maju Kemajuan di DALAM langkah itu, 0…1. Dipakai animasi ketikan;
 *   pemanggil yang tidak peduli boleh membiarkannya `1`.
 */
export function bingkaiPada(naskah: Naskah, indeks: number, maju = 1): Bingkai {
  const disingkap = panelDisingkap(naskah);
  const diketik = medanDiketik(naskah);

  const terisi = new Set<string>();
  for (const p of naskah.panel) if (!disingkap.has(p.id)) terisi.add(p.id);

  const ketikan = new Map<string, number>();
  for (const k of diketik) ketikan.set(k, 0);

  const ditandai = new Map<string, Nada>();
  let jalur = naskah.jalur;

  // Langkah yang sudah LEWAT: efeknya penuh dan menetap.
  const batas = Math.min(indeks, naskah.langkah.length - 1);
  for (let i = 0; i < batas; i++) {
    const l = naskah.langkah[i]!;
    if (l.aksi === "isi") terisi.add(l.sasaran.panel);
    else if (l.aksi === "ketik" || l.aksi === "pilih") ketikan.set(kunciMedan(l.sasaran), 1);
    else if (l.aksi === "tandai") ditandai.set(l.sasaran.panel, l.nada);
    else if (l.aksi === "pindah") jalur = l.jalur;
  }

  let sorotan: Sasaran | null = null;
  let kursor: Sasaran | null = null;
  let menekan = false;

  // Langkah yang SEDANG berjalan.
  if (batas >= 0 && indeks >= 0) {
    const l = naskah.langkah[batas]!;
    if (l.aksi === "pindah") {
      jalur = l.jalur;
    } else if (l.aksi === "jeda") {
      // Tidak melakukan apa-apa dengan sengaja.
    } else {
      sorotan = l.sasaran;
      if (l.aksi === "isi") terisi.add(l.sasaran.panel);
      else if (l.aksi === "ketik") ketikan.set(kunciMedan(l.sasaran), maju);
      else if (l.aksi === "pilih") ketikan.set(kunciMedan(l.sasaran), 1);
      else if (l.aksi === "tandai") ditandai.set(l.sasaran.panel, l.nada);
      else if (l.aksi === "klik") {
        kursor = l.sasaran;
        // Tekanan hanya di paruh pertama langkah, supaya riaknya sempat pudar.
        menekan = maju < 0.5;
      }
    }
  }

  return { indeks, terisi, sorotan, kursor, menekan, ketikan, ditandai, jalur };
}

/** Indeks langkah terakhir. `-1` bila naskahnya kosong. */
export function indeksAkhir(naskah: Naskah): number {
  return naskah.langkah.length - 1;
}

/** Bingkai akhir — dipakai `prefers-reduced-motion` dan render awal server. */
export function bingkaiAkhir(naskah: Naskah): Bingkai {
  return bingkaiPada(naskah, indeksAkhir(naskah), 1);
}

/** Lama satu langkah dalam milidetik. */
export function durasiLangkah(naskah: Naskah, indeks: number): number {
  return naskah.langkah[indeks]?.durasi ?? DURASI_BAKU;
}

/** Total lama satu putaran penuh, tanpa jeda ulang. */
export function durasiTotal(naskah: Naskah): number {
  return naskah.langkah.reduce((j, l) => j + (l.durasi ?? DURASI_BAKU), 0);
}

/**
 * Jumlah debit dan kredit tiap panel jurnal.
 *
 * Ada di mesin, bukan di uji, karena komponen juga memakainya untuk menuliskan
 * baris "Seimbang · 2.565.000" — angka yang sama dihitung sekali, bukan dua
 * kali dengan risiko berbeda.
 */
export function neracaJurnal(baris: { debit?: number; kredit?: number }[]): {
  debit: number;
  kredit: number;
  seimbang: boolean;
} {
  const debit = baris.reduce((j, b) => j + (b.debit ?? 0), 0);
  const kredit = baris.reduce((j, b) => j + (b.kredit ?? 0), 0);
  return { debit, kredit, seimbang: debit === kredit };
}
