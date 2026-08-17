/**
 * Penghitung rate limit berbasis Durable Object (Fase 30e).
 *
 * ## Kenapa pindah dari KV
 *
 * Versi sebelumnya menulis satu entri KV pada **setiap** request terjaga —
 * login, daftar, demo, ekspor, feedback, laporan berat. Kuota tulis KV paket
 * gratis Cloudflare adalah **1.000 per hari**, dan itu tembok yang datang jauh
 * sebelum batas 100.000 request/hari: aplikasi berhenti membatasi (atau
 * berhenti melayani) pada ±1.000 request terjaga, bukan pada 100.000.
 *
 * Durable Object tersedia di paket gratis maupun berbayar, **tidak memakan
 * kuota tulis KV sama sekali**, dan statusnya disimpan di penyimpanan DO
 * miliknya sendiri.
 *
 * ## Kenapa bukan binding `ratelimit` bawaan Cloudflare
 *
 * Binding native sudah GA, tetapi periodenya hanya menerima 10 atau 60 detik.
 * Repo ini memakai jendela 300 detik pada seluruh endpoint auth (`register`,
 * `login`, `demo`, ekspor). Memaksakannya ke 60 detik akan **mengubah perilaku
 * pembatasan yang sudah diuji** — 5 percobaan per 5 menit tidak sama dengan
 * 5 percobaan per menit, dan bedanya justru pada brute-force yang lambat.
 *
 * ## Ketepatan yang ikut naik
 *
 * Komentar KV lama mengakui sendiri: "KV bersifat eventually-consistent; untuk
 * pembatasan kasar ini cukup." Artinya dua request bersamaan bisa sama-sama
 * membaca hitungan lama dan sama-sama lolos. Durable Object bersifat
 * **single-threaded per kunci**, jadi hitungannya tepat — pembatasnya menjadi
 * benar, bukan sekadar lebih murah.
 */

/**
 * Satu instance per kunci pembatas (mis. `rl:login:1.2.3.4:9312`).
 *
 * Penyimpanannya sengaja hanya menyimpan `{ n, kedaluwarsa }`: seluruh
 * kepintaran jendela waktu ada di pemanggil, yang sudah menghitung nomor
 * jendela ke dalam nama kunci. DO ini tidak perlu tahu apa pun tentang waktu
 * selain kapan barisnya boleh dilupakan.
 */
export class RateLimiter {
  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "0");
    const windowSeconds = Number(url.searchParams.get("window") ?? "60");

    return await this.state.blockConcurrencyWhile(async () => {
      const now = Date.now();
      const tersimpan = await this.state.storage.get<{ n: number; kedaluwarsa: number }>("c");

      // Baris yang sudah lewat jendelanya diperlakukan sebagai nol, bukan
      // dihapus lebih dulu: satu tulis lebih murah daripada hapus + tulis, dan
      // `alarm` di bawah yang membereskan sisa-sisanya.
      const n = tersimpan && tersimpan.kedaluwarsa > now ? tersimpan.n : 0;

      if (n >= limit) {
        return Response.json({ ok: false, n });
      }

      const kedaluwarsa = tersimpan && tersimpan.kedaluwarsa > now ? tersimpan.kedaluwarsa : now + windowSeconds * 1000;
      await this.state.storage.put("c", { n: n + 1, kedaluwarsa });
      // Alarm membersihkan penyimpanan DO setelah jendelanya lewat, sehingga
      // instance bekas tidak menumpuk selamanya. Dipasang sekali per jendela.
      if (!tersimpan || tersimpan.kedaluwarsa <= now) {
        await this.state.storage.setAlarm(kedaluwarsa + 1000);
      }
      return Response.json({ ok: true, n: n + 1 });
    });
  }

  /** Jendela sudah lewat → buang seluruh isi instance ini. */
  async alarm(): Promise<void> {
    await this.state.storage.deleteAll();
  }
}

/** Antarmuka minimal yang dipakai middleware — memudahkan tiruan di uji. */
export type PenghitungBatas = {
  /** `true` bila request BOLEH lanjut; `false` bila sudah melewati batas. */
  bolehLanjut(kunci: string, limit: number, windowSeconds: number): Promise<boolean>;
};

/** Penghitung nyata: satu instance Durable Object per kunci. */
export function penghitungDurableObject(ns: DurableObjectNamespace): PenghitungBatas {
  return {
    async bolehLanjut(kunci, limit, windowSeconds) {
      const stub = ns.get(ns.idFromName(kunci));
      const res = await stub.fetch(
        `https://batas.internal/?limit=${limit}&window=${windowSeconds}`,
      );
      const body = (await res.json()) as { ok: boolean };
      return body.ok;
    },
  };
}
