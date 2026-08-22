import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * Preferensi gerak pengguna (Fase 35a).
 *
 * Dipisah ke `lib/` karena dua alasan, dan keduanya nyata:
 *
 * 1. Ia memang milik bersama. Peragaan hero adalah animasi pertama di repo ini,
 *    tetapi tidak akan menjadi yang terakhir — dan setiap animasi berikutnya
 *    wajib menghormati preferensi yang sama.
 *
 * 2. `scripts/sapu-i18n.mjs` memindai `pages/**\/*.tsx` dan salah mengenali
 *    string kueri media di dalam berkas komponen sebagai utang teks layar.
 *    Memindahkannya ke `.ts` membuat penyapu melihat yang sebenarnya — tanpa
 *    melonggarkan polanya, dan tanpa memelintir kode hanya demi alat.
 */

/** Kueri media baku untuk "kurangi gerak". */
const KUERI = "(prefers-reduced-motion: reduce)";

/**
 * `true` bila pengguna meminta lebih sedikit gerak.
 *
 * Aman dipanggil saat render server / uji tanpa `window`: tanpa `matchMedia`
 * jawabannya `false`, artinya animasi berjalan seperti biasa di lingkungan yang
 * memang tidak punya preferensi untuk dibaca.
 */
export function kurangiGerak(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(KUERI).matches;
}

/**
 * Versi REAKTIF dari `kurangiGerak()` (Fase 38a).
 *
 * `kurangiGerak()` membaca preferensi sekali saat render. Itu cukup untuk satu
 * peragaan yang dipasang sekali, tetapi tidak menangkap pengguna yang mengubah
 * preferensinya selagi halaman terbuka — dan halaman `/fitur` yang memuat 22
 * peragaan adalah halaman yang lama dibuka.
 */
export function useKurangiGerak(): boolean {
  return useSyncExternalStore(
    (p) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
      const mq = window.matchMedia(KUERI);
      mq.addEventListener("change", p);
      return () => mq.removeEventListener("change", p);
    },
    () => kurangiGerak(),
    () => false,
  );
}

/**
 * `true` selagi `ref` berada di dalam (atau dekat) layar.
 *
 * Dipakai gerbang keterlihatan peragaan: timer hanya berjalan untuk yang
 * terlihat. `rootMargin` 200px membuat peragaan sudah mulai berjalan tepat
 * sebelum masuk layar, sehingga pengunjung tidak mendapati bingkai pertama yang
 * diam saat ia berhenti menggulir.
 *
 * Tanpa `IntersectionObserver` (uji Node, peramban lama) jawabannya `true`:
 * lebih baik peragaan berjalan daripada tidak pernah tampil sama sekali.
 */
export function useTerlihat(ref: RefObject<Element | null>): boolean {
  const [terlihat, setTerlihat] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== "function") {
      setTerlihat(true);
      return;
    }
    const obs = new IntersectionObserver(
      (masuk) => {
        for (const e of masuk) setTerlihat(e.isIntersecting);
      },
      { rootMargin: "200px", threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);

  return terlihat;
}

/**
 * `true` selagi tab benar-benar terlihat.
 *
 * Tanpa ini, peragaan tetap berdetak di tab latar — pekerjaan yang tidak pernah
 * dilihat siapa pun, dan pada ponsel itu berarti baterai.
 */
export function useTabTerlihat(): boolean {
  return useSyncExternalStore(
    (p) => {
      if (typeof document === "undefined") return () => {};
      document.addEventListener("visibilitychange", p);
      return () => document.removeEventListener("visibilitychange", p);
    },
    () => (typeof document === "undefined" ? true : document.visibilityState === "visible"),
    () => true,
  );
}
