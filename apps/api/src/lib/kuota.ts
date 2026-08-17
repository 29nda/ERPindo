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
 * Kueri pemakaian 24 jam terakhir.
 *
 * Dua dataset dipakai karena Cloudflare memisahkannya: invocation Worker dan
 * analitik D1. KV tidak punya dataset analitik per-namespace yang setara, jadi
 * angkanya TIDAK dilaporkan palsu di sini — lebih baik satu baris hilang
 * daripada satu baris yang salah dipakai memutuskan naik paket.
 */
const KUERI = `query Pemakaian($akun: String!, $sejak: Time!) {
  viewer {
    accounts(filter: { accountTag: $akun }) {
      workersInvocationsAdaptive(limit: 10000, filter: { datetime_geq: $sejak }) {
        sum { requests }
      }
      d1AnalyticsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $sejak }) {
        sum { readQueries writeQueries rowsRead rowsWritten }
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
 * CATATAN JUJUR: bentuk respons GraphQL ini **belum pernah diverifikasi
 * terhadap akun Cloudflare sungguhan** — token analitiknya milik pemilik dan
 * tidak tersedia di lingkungan pengembangan. Karena itu seluruh pembacaan
 * memakai optional chaining dan dibungkus try/catch: bila bentuknya ternyata
 * berbeda, hasilnya adalah kartu "tidak bisa membaca kuota", bukan dasbor yang
 * meledak. Verifikasinya ada di daftar langkah pemilik.
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
  try {
    const res = await fetch(GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: KUERI, variables: { akun: env.CLOUDFLARE_ACCOUNT_ID, sejak } }),
    });
    const body = (await res.json().catch(() => null)) as {
      data?: {
        viewer?: {
          accounts?: {
            workersInvocationsAdaptive?: { sum?: { requests?: number } }[];
            d1AnalyticsAdaptiveGroups?: { sum?: { rowsRead?: number; rowsWritten?: number } }[];
          }[];
        };
      };
      errors?: { message: string }[];
    } | null;

    if (!res.ok || body?.errors?.length) {
      const detail = body?.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
      return {
        configured: true,
        ok: false,
        pesan: `Cloudflare menolak permintaan analitik: ${detail}. Periksa izin token (Account Analytics: Read).`,
        batas: BATAS_GRATIS,
      };
    }

    const akun = body?.data?.viewer?.accounts?.[0];
    if (!akun) {
      return {
        configured: true,
        ok: false,
        pesan: "Cloudflare tidak mengembalikan data untuk akun ini. Periksa CLOUDFLARE_ACCOUNT_ID.",
        batas: BATAS_GRATIS,
      };
    }

    const jumlah = <T extends Record<string, number | undefined>>(
      baris: { sum?: T }[] | undefined,
      kunci: keyof T,
    ): number => (baris ?? []).reduce((s, b) => s + Number(b.sum?.[kunci] ?? 0), 0);

    const pemakaian = [
      ukur("Request Worker / hari", jumlah(akun.workersInvocationsAdaptive, "requests"), BATAS_GRATIS.requestPerHari),
      ukur("Baris D1 ditulis / hari", jumlah(akun.d1AnalyticsAdaptiveGroups, "rowsWritten"), BATAS_GRATIS.d1BarisDitulisPerHari),
      ukur("Baris D1 dibaca / hari", jumlah(akun.d1AnalyticsAdaptiveGroups, "rowsRead"), BATAS_GRATIS.d1BarisDibacaPerHari),
    ];

    return {
      configured: true,
      ok: true,
      sejak,
      pemakaian,
      adaPeringatan: pemakaian.some((p) => p.waspada),
      batas: BATAS_GRATIS,
    };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      pesan: `Gagal menghubungi API analitik Cloudflare: ${(err as Error).message}`,
      batas: BATAS_GRATIS,
    };
  }
}
