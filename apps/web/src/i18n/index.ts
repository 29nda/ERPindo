import type { HariRaya } from "@erpindo/shared";
import { useSyncExternalStore } from "react";

/**
 * i18n ringan tanpa pustaka (Fase 13d). Bahasa default Indonesia; Inggris opsional.
 * Store level-modul + useSyncExternalStore agar semua komponen ikut ter-render
 * saat bahasa diganti — tanpa perlu Provider di root (pola serupa useDarkMode,
 * tapi reaktif lintas komponen).
 *
 * Menambah bahasa baru = menambah kolom pada tiap entri kamus.
 */
export const LANGS = ["id", "en"] as const;
export type Lang = (typeof LANGS)[number];

const STORAGE_KEY = "erpindo-lang";

function detect(): Lang {
  if (typeof window === "undefined") return "id";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "id" || stored === "en") return stored;
  } catch {
    /* localStorage tak tersedia */
  }
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "id";
}

let current: Lang = detect();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* abaikan */
  }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Bahasa aktif (reaktif). */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => "id" as Lang);
}

/** Nilai dwibahasa. */
export type Dual = { id: string; en: string };
export function pick(v: Dual, lang: Lang): string {
  return v[lang];
}

// ---------------------------------------------------------------------------
// Fase 19q — `DICT`/`TKey`/`useT()` DIHAPUS.
//
// Kamus itu berisi delapan istilah navigasi landing plus sembilan kunci auth
// (`authMasukJudul`, `authPerusahaan`, …) yang ditulis pada Fase 13d — lalu
// `useT()` tidak pernah dipanggil satu berkas pun. Terjemahannya ada, tapi
// tidak tersambung ke halamannya; halaman masuk/daftar tetap satu bahasa
// sampai Fase 19q.
//
// Menyimpannya justru berbahaya: kunci auth yang tampak "sudah ada" membuat
// pembaca berikutnya menyangka halaman auth sudah dwibahasa. Kamus yang
// berlaku sekarang hanya satu: `UI` di `./ui`, dipakai lewat `useUi()`.
// Landing memakai `pick()` + `sections.ts`, keduanya masih hidup di bawah ini.
// ---------------------------------------------------------------------------

/**
 * Isi lubang `{0}`, `{1}`, … pada kalimat dwibahasa (Fase 33h).
 *
 * Ada karena pola yang digantikannya salah secara struktural, bukan sekadar
 * berantakan. Toast bernilai dinamis dulu dirakit dari potongan:
 *
 * ```
 * toast("success", `${u("toastPermintaanPrefix")} ${res.reqNo} ${u("toastDiajukan")}`)
 * ```
 *
 * Potongan itu **mengunci urutan kata Indonesia ke dalam kode**. Bahasa Inggris
 * yang menaruh nomornya di tempat lain tidak punya cara mengubahnya — kamus
 * hanya boleh mengisi potongan, tidak boleh menyusun ulang. Hasilnya kalimat
 * Inggris berpola Indonesia, dan tidak ada gerbang yang bisa melihatnya karena
 * tiap potongnya memang sudah diterjemahkan.
 *
 * Dengan `{0}` di dalam kalimat utuh, tiap bahasa menaruh nilainya di tempat
 * yang benar menurut tata bahasanya sendiri.
 */
export function isi(kalimat: string, ...nilai: (string | number)[]): string {
  return kalimat.replace(/\{(\d+)\}/g, (utuh, i) => {
    const v = nilai[Number(i)];
    return v === undefined ? utuh : String(v);
  });
}

/**
 * Nama hari raya keagamaan untuk layar (Fase 43a).
 *
 * Nilai enumnya (`idulfitri`, `natal`, …) adalah bagian kontrak API dan
 * karenanya dikecualikan dari penyapu istilah — tetapi yang DIBACA pengguna
 * bukan nilai itu. Pemetaan ini yang menjaga keduanya tetap terpisah: kontrak
 * boleh tetap ASCII kecil, layar tetap mengeja "Idulfitri" sebagaimana mestinya.
 *
 * Tinggal di lapisan i18n, bukan di halaman penggajian, karena isinya naskah
 * yang dibaca pengguna — dan naskah semacam itu punya satu tempat di repo ini.
 */
export const NAMA_HARI_RAYA: Record<HariRaya, Dual> = {
  idulfitri: { id: "Idulfitri", en: "Eid al-Fitr" },
  natal: { id: "Natal", en: "Christmas" },
  nyepi: { id: "Nyepi", en: "Nyepi" },
  waisak: { id: "Waisak", en: "Vesak" },
  imlek: { id: "Imlek", en: "Lunar New Year" },
};

/** Nama hari raya dalam bahasa yang sedang aktif. */
export function namaHariRaya(raya: HariRaya, lang: Lang): string {
  return NAMA_HARI_RAYA[raya][lang];
}
