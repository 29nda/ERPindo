import type { Env } from "../env";

/**
 * Monitor kuota Cloudflare (Fase 30f).
 *
 * ## Masalah yang dijawabnya
 *
 * Pemilik memilih "mulai gratis, naik paket saat tumbuh". Keputusan itu hanya
 * bisa diambil tepat waktu bila angkanya terlihat — dan sampai fase ini tidak
 * ada satu pun tempat yang menampilkannya. Tanpa monitor, cara pemilik
 * mengetahui kuotanya habis adalah **pelanggan menelepon karena aplikasinya
 * mati** (Error 1027), yaitu titik ketika menaikkan paket sudah terlambat.
 *
 * ## Batas yang dipantau, dan mana yang sebenarnya mengikat
 *
 * Yang paling sering disangka mengikat adalah 100.000 request/hari. Bukan.
 * Tembok pertama paket gratis adalah **1.000 tulis KV/hari** — dan sejak
 * Fase 30e rate limiter tidak lagi memakainya, sehingga tembok itu mundur jauh.
 * Urutan berikutnya adalah 100.000 baris D1 ditulis/hari.
 */

/** Batas harian paket gratis Workers. Sumber: dokumentasi pricing Cloudflare. */
export const BATAS_GRATIS = {
  requestPerHari: 100_000,
  kvTulisPerHari: 1_000,
  d1BarisDitulisPerHari: 100_000,
  d1BarisDibacaPerHari: 5_000_000,
  d1PenyimpananGb: 5,
} as const;

/** Ambang peringatan: beri tahu pemilik SEBELUM pelanggan melihat Error 1027. */
export const AMBANG_PERINGATAN = 0.7;

export type PemakaianKuota = {
  nama: string;
  terpakai: number;
  batas: number;
  persen: number;
  /** `true` bila sudah melewati ambang peringatan. */
  waspada: boolean;
};

export type StatusKuota =
  | {
      configured: false;
      /** Kenapa monitor mati, dan apa yang harus dipasang untuk menyalakannya. */
      pesan: string;
      batas: typeof BATAS_GRATIS;
    }
  | {
      configured: true;
      ok: false;
      /** Monitor menyala tetapi pengambilan datanya gagal. */
      pesan: string;
      batas: typeof BATAS_GRATIS;
    }
  | {
      configured: true;
      ok: true;
      sejak: string;
      pemakaian: PemakaianKuota[];
      adaPeringatan: boolean;
      batas: typeof BATAS_GRATIS;
    };

const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

/**
 * Kueri pemakaian 24 jam terakhir — **satu kueri per dataset, disengaja.**
 *
 * Versi pertama menggabungkan kedua dataset dalam satu kueri. Itu keliru:
 * GraphQL menolak seluruh permintaan bila SATU nama field salah, sehingga
 * dataset yang benar ikut hilang gara-gara tetangganya. Dipisah, kesalahan
 * pada satu dataset hanya menghilangkan satu baris di kartu — bukan semuanya.
 *
 * **`*AdaptiveGroups`, bukan `*Adaptive`.** Ini koreksi terhadap versi pertama
 * yang menulis `workersInvocationsAdaptive { sum { requests } }`. Pola
 * Cloudflare konsisten di seluruh produk (R2, Workflows, D1): dataset ber-akhiran
 * `Groups` yang menyediakan agregasi `sum {}`, sedangkan varian tanpa `Groups`
 * mengembalikan **event mentah** berisi field per-baris dan tidak punya `sum`
 * sama sekali. Kombinasi lama karena itu tidak akan pernah mengembalikan angka.
 *
 * KV sengaja TIDAK diikutkan: ia tidak punya dataset analitik per-namespace yang
 * setara. Lebih baik satu baris hilang daripada satu baris yang salah dipakai
 * memutuskan naik paket. Sejak Fase 30e rate limiter juga tidak lagi menulis KV,
 * jadi baris itu kehilangan sebagian besar maknanya.
 */
const KUERI_WORKER = `query PemakaianWorker($akun: String!, $sejak: Time!) {
  viewer {
    accounts(filter: { accountTag: $akun }) {
      workersInvocationsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $sejak }) {
        sum { requests }
      }
    }
  }
}`;

const KUERI_D1 = `query PemakaianD1($akun: String!, $sejak: Time!) {
  viewer {
    accounts(filter: { accountTag: $akun }) {
      d1AnalyticsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $sejak }) {
        sum { rowsRead rowsWritten }
      }
    }
  }
}`;

function ukur(nama: string, terpakai: number, batas: number): PemakaianKuota {
  const persen = batas > 0 ? Math.round((terpakai / batas) * 1000) / 10 : 0;
  return { nama, terpakai, batas, persen, waspada: terpakai >= batas * AMBANG_PERINGATAN };
}

/**
 * Ambil pemakaian kuota 24 jam terakhir.
 *
 * **Degradasi anggun berlapis**, mengikuti pola yang sudah baku di repo ini:
 *
 * - Tanpa `CLOUDFLARE_API_TOKEN`/`ACCOUNT_ID` → `configured: false` disertai
 *   petunjuk memasangnya. Bukan galat: monitor mati adalah keadaan yang sah.
 * - Token ada tetapi API menolak/berubah bentuk → `ok: false` dengan alasannya.
 *   Layar admin tetap terbuka; hanya kartu kuotanya yang menyatakan kenapa
 *   kosong. Dasbor yang mati total gara-gara satu panggilan hulu adalah harga
 *   yang jauh lebih mahal daripada satu kartu yang menjelaskan dirinya.
 *
 * CATATAN JUJUR — apa yang sudah & belum diverifikasi:
 *
 * - **Sudah**: bentuk kueri (`viewer → accounts(accountTag) → dataset → sum`)
 *   dan pemakaian varian `*AdaptiveGroups` untuk agregasi, dicocokkan terhadap
 *   contoh resmi Cloudflare untuk R2, Workflows, dan D1. Koreksi yang lahir
 *   dari pencocokan itu tercatat di komentar kueri di atas.
 * - **Belum**: pemanggilan sungguhan terhadap akun berikut tokennya — token
 *   analitik milik pemilik dan tidak tersedia di lingkungan pengembangan.
 *
 * Karena itu setiap dataset dikueri TERPISAH dan seluruh pembacaan memakai
 * optional chaining di dalam try/catch: bila satu nama field ternyata masih
 * meleset, yang hilang hanya barisnya sendiri — bukan kartunya, apalagi
 * dasbornya. Verifikasi akhirnya ada di daftar langkah pemilik.
 */
export async function ambilKuota(env: Env): Promise<StatusKuota> {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    return {
      configured: false,
      pesan:
        "Monitor kuota belum aktif. Pasang secret CLOUDFLARE_API_TOKEN (izin Account Analytics: Read) " +
        "dan CLOUDFLARE_ACCOUNT_ID di Workers → Settings → Variables, lalu muat ulang halaman ini.",
      batas: BATAS_GRATIS,
    };
  }

  const sejak = new Date(Date.now() - 86_400_000).toISOString();

  /** Jalankan satu kueri; kembalikan baris dataset atau alasan kegagalannya. */
  async function tanya(
    kueri: string,
    dataset: string,
  ): Promise<{ ok: true; baris: { sum?: Record<string, number | undefined> }[] } | { ok: false; alasan: string }> {
    try {
      const res = await fetch(GRAPHQL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: kueri, variables: { akun: env.CLOUDFLARE_ACCOUNT_ID, sejak } }),
      });
      const body = (await res.json().catch(() => null)) as {
        data?: { viewer?: { accounts?: Record<string, unknown>[] } };
        errors?: { message: string }[];
      } | null;

      if (!res.ok || body?.errors?.length) {
        return { ok: false, alasan: body?.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}` };
      }
      const akun = body?.data?.viewer?.accounts?.[0];
      if (!akun) return { ok: false, alasan: "akun tidak ditemukan — periksa CLOUDFLARE_ACCOUNT_ID" };
      const baris = akun[dataset];
      if (!Array.isArray(baris)) return { ok: false, alasan: `dataset ${dataset} tidak dikembalikan` };
      return { ok: true, baris: baris as { sum?: Record<string, number | undefined> }[] };
    } catch (err) {
      return { ok: false, alasan: (err as Error).message };
    }
  }

  const [worker, d1] = await Promise.all([
    tanya(KUERI_WORKER, "workersInvocationsAdaptiveGroups"),
    tanya(KUERI_D1, "d1AnalyticsAdaptiveGroups"),
  ]);

  // Kedua-duanya gagal → monitor memang tidak bisa membaca apa pun. Satu gagal
  // saja tetap berguna: pemilik masih melihat kuota yang lain.
  if (!worker.ok && !d1.ok) {
    return {
      configured: true,
      ok: false,
      pesan:
        `Cloudflare menolak permintaan analitik: ${worker.alasan}. ` +
        "Periksa izin token (Account Analytics: Read) dan CLOUDFLARE_ACCOUNT_ID.",
      batas: BATAS_GRATIS,
    };
  }

  const jumlah = (
    hasil: typeof worker,
    kunci: string,
  ): number => (hasil.ok ? hasil.baris.reduce((s, b) => s + Number(b.sum?.[kunci] ?? 0), 0) : 0);

  const pemakaian: PemakaianKuota[] = [];
  if (worker.ok) {
    pemakaian.push(ukur("Request Worker / hari", jumlah(worker, "requests"), BATAS_GRATIS.requestPerHari));
  }
  if (d1.ok) {
    pemakaian.push(
      ukur("Baris D1 ditulis / hari", jumlah(d1, "rowsWritten"), BATAS_GRATIS.d1BarisDitulisPerHari),
      ukur("Baris D1 dibaca / hari", jumlah(d1, "rowsRead"), BATAS_GRATIS.d1BarisDibacaPerHari),
    );
  }

  return {
    configured: true,
    ok: true,
    sejak,
    pemakaian,
    adaPeringatan: pemakaian.some((p) => p.waspada),
    batas: BATAS_GRATIS,
  };
}
