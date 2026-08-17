import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { penghitungDurableObject, type PenghitungBatas } from "../lib/rateLimiter";

/**
 * Rate limiting: N request per jendela waktu.
 *
 * **Backend-nya Durable Object sejak Fase 30e** (dulu KV). Alasan lengkapnya
 * ada di `lib/rateLimiter.ts`; ringkasnya dua hal:
 *
 * 1. KV ditulis pada SETIAP request terjaga, sedangkan kuota tulis KV paket
 *    gratis hanya **1.000/hari** — tembok yang datang jauh sebelum batas
 *    100.000 request/hari, dan tetap mahal di paket berbayar pada skala 1.000
 *    perusahaan.
 * 2. KV eventually-consistent, jadi dua request bersamaan bisa sama-sama lolos.
 *    Durable Object single-threaded per kunci, jadi hitungannya tepat.
 *
 * Bentuk kunci dan perilaku penolakannya TIDAK berubah, dan itu disengaja:
 * `test/rateLimit.test.ts` menguji perilaku yang sama persis sebelum dan
 * sesudah pergantian backend. Yang berpindah adalah tempat menyimpan angkanya,
 * bukan aturannya.
 */

/**
 * Ambil penghitung dari env.
 *
 * Bila binding `RATE_LIMITER` absen, pembatasan **dilewati** — mengikuti pola
 * degradasi anggun yang sudah baku di repo ini (Workers AI absen → 503;
 * Resend/Xendit/Google absen → fitur nonaktif dengan pesan jelas). Menggagalkan
 * seluruh request karena pembatas tidak terpasang akan mengubah fitur pelindung
 * menjadi titik kegagalan tunggal.
 *
 * Uji menyuntikkan penghitungnya lewat `env.__penghitungBatas` — seam yang
 * dipakai `test/rateLimit.test.ts` supaya perilaku bisa diuji tanpa runtime DO.
 */
function ambilPenghitung(env: AppEnv["Bindings"]): PenghitungBatas | null {
  const suntikan = (env as unknown as { __penghitungBatas?: PenghitungBatas }).__penghitungBatas;
  if (suntikan) return suntikan;
  const ns = (env as unknown as { RATE_LIMITER?: DurableObjectNamespace }).RATE_LIMITER;
  return ns ? penghitungDurableObject(ns) : null;
}

/** Nomor jendela tetap (fixed window) — sama seperti sebelum Fase 30e. */
function nomorJendela(windowSeconds: number): number {
  return Math.floor(Date.now() / (windowSeconds * 1000));
}

/** Varian per-IP untuk endpoint publik (auth). Tanpa header IP (hanya terjadi
 *  di luar Cloudflare, mis. dev/uji lokal) pembatasan dilewati — sebelumnya
 *  semua klien tanpa IP berbagi satu bucket "unknown" dan saling menjegal. */
export function rateLimit(opts: { key: string; limit: number; windowSeconds: number }): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for");
    const penghitung = ambilPenghitung(c.env);
    if (ip && penghitung) {
      const kunci = `rl:${opts.key}:${ip}:${nomorJendela(opts.windowSeconds)}`;
      const ok = await penghitung.bolehLanjut(kunci, opts.limit, opts.windowSeconds);
      if (!ok) return c.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa saat lagi." }, 429);
    }
    await next();
  };
}

/** Varian per-pengguna untuk endpoint mahal (laporan/ekspor/AI). Dipasang
 *  SETELAH requireAuth sehingga kunci = user id (fallback IP bila belum ada
 *  konteks user). Limit dibuat longgar — tujuannya menahan loop tak sengaja
 *  atau scraping, bukan pemakaian normal. */
export function rateLimitUser(opts: { key: string; limit: number; windowSeconds: number }): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get("user") as { id: string } | undefined;
    const subject = user?.id ?? c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for");
    const penghitung = ambilPenghitung(c.env);
    if (subject && penghitung) {
      const kunci = `rlu:${opts.key}:${subject}:${nomorJendela(opts.windowSeconds)}`;
      const ok = await penghitung.bolehLanjut(kunci, opts.limit, opts.windowSeconds);
      if (!ok) return c.json({ error: "Terlalu banyak permintaan. Coba lagi beberapa saat lagi." }, 429);
    }
    await next();
  };
}
