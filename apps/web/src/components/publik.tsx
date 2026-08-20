import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { useLang, type Lang } from "../i18n";
import { LangSwitcher } from "../i18n/LangSwitcher";
import { BrandWordmark, Button, cx, useDarkMode } from "./ui";

/**
 * Kerangka halaman publik — Fase 31c.
 *
 * ## Kenapa berkas ini ada
 *
 * `Header()` ditulis DUA kali: `pages/landing/index.tsx:40` dan
 * `pages/fitur.tsx:30`. Keduanya hampir identik — bilah lengket, wordmark,
 * tautan nav, pemilih bahasa, tombol tema, tombol daftar, drawer mobile —
 * dengan perbedaan yang seluruhnya tak disengaja:
 *
 * | | landing | /fitur |
 * | --- | --- | --- |
 * | Daftar tautan | `NAV_LINKS` (modul) | array literal di dalam fungsi |
 * | Tombol "Masuk" | ada | **hilang** |
 * | Padding tombol tema | `p-1.5` | `p-2` |
 * | Sasaran sentuh tombol menu | `p-1.5` (±32px) | `size-11` (44px) |
 * | Pemilih bahasa di drawer | ada | **hilang** |
 *
 * Tiga di antaranya cacat nyata, bukan sekadar beda gaya: pengunjung `/fitur`
 * tidak punya jalan ke halaman masuk dari bilah atas, tidak bisa mengganti
 * bahasa dari drawer, dan tombol menunya di landing lebih kecil daripada
 * ambang sentuh 44px yang sudah ditetapkan repo sejak Fase 18c.
 *
 * Menyatukannya memperbaiki ketiganya sekaligus, dan menutup kelasnya: halaman
 * publik berikutnya tidak akan menyalin bilah keempat.
 */

/** Pilih string sesuai bahasa aktif. */
export function L(lang: Lang, id: string, en: string): string {
  return lang === "en" ? en : id;
}

export type TautanPublik = [href: string, label: { id: string; en: string }];

/**
 * Tautan bilah atas dan kaki halaman — SATU daftar (Fase 38c).
 *
 * Sebelumnya dua: `TAUTAN_BERANDA` memakai jangkar telanjang (`#harga`) dan
 * `TAUTAN_HALAMAN_LAIN` memakai jangkar berjalur (`/#harga`), dengan alasan
 * yang masuk akal — `#harga` di `/fitur` akan menunjuk `/fitur#harga`, yang
 * tidak ada.
 *
 * Tetapi alasan itu hanya menuntut bentuk BERJALUR, bukan dua daftar. Dari
 * `/`, tautan `/#harga` adalah navigasi fragmen sedokumen: peramban
 * membandingkan seluruh bagian sebelum `#`, mendapatinya sama, dan menggulir
 * tanpa memuat ulang. Jadi bentuk berjalur benar di kedua tempat, dan daftar
 * keduanya bisa menyatu.
 *
 * "Beranda" ikut dibuang: pada halaman selain beranda, wordmark di sebelah
 * kirinya sudah menjadi tautan ke `/`; pada beranda, pengunjung memang sudah
 * di sana. Ia satu-satunya baris yang membedakan kedua daftar itu selain
 * bentuk jangkarnya.
 */
export const TAUTAN_PUBLIK: TautanPublik[] = [
  ["/fitur", { id: "Fitur", en: "Features" }],
  ["/#harga", { id: "Harga", en: "Pricing" }],
  ["/panduan", { id: "Panduan", en: "Guide" }],
  ["/#faq", { id: "FAQ", en: "FAQ" }],
];

export function PublicHeader({
  tautan = TAUTAN_PUBLIK,
  /** Halaman depan: wordmark bukan tautan, karena sudah di sana. */
  beranda = false,
  /**
   * Keterangan di samping wordmark, mis. "/ Panduan" (Fase 38c).
   *
   * Ada supaya `/panduan` tidak perlu header keempat. `GuideHeader` yang
   * digantikannya punya empat cacat sekaligus, dan tiga di antaranya bukan
   * soal gaya: tombol "Masuk"/"Daftar"-nya ditulis harfiah dalam bahasa
   * Indonesia sehingga tidak pernah ikut berbahasa Inggris, tidak ada pemilih
   * bahasa, tidak ada satu pun tautan nav, dan warnanya literal
   * (`bg-slate-50/80 dark:bg-slate-950/80`).
   */
  sub,
}: {
  tautan?: TautanPublik[];
  beranda?: boolean;
  sub?: { id: string; en: string };
}) {
  const { dark, toggle } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const lang = useLang();
  const judulTema = L(lang, "Ganti tema terang/gelap", "Toggle light/dark theme");

  const merek = (
    <span className="flex items-baseline gap-1.5">
      <BrandWordmark className="h-7" />
      {sub ? <span className="text-sm font-normal text-ink-muted">/ {sub[lang]}</span> : null}
    </span>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        {beranda ? (
          <span className="flex h-14 items-center">{merek}</span>
        ) : (
          <a href="/" className="flex h-14 items-center">
            {merek}
          </a>
        )}
        <nav className="flex items-center gap-1">
          {tautan.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="hidden rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink md:block"
            >
              {label[lang]}
            </a>
          ))}
          <LangSwitcher className="hidden sm:inline-flex" />
          <button
            onClick={toggle}
            className="rounded-control p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label={judulTema}
            title={judulTema}
          >
            {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          </button>
          <Link to="/masuk" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              {L(lang, "Masuk", "Sign in")}
            </Button>
          </Link>
          <Link to="/daftar">
            {/* Fase 24d: trial dihapus di 24a — bilah atas tak menjanjikan gratis. */}
            <Button size="sm">{L(lang, "Daftar", "Sign up")}</Button>
          </Link>
          {/* Sasaran sentuh 44px (Fase 18c). Versi landing memakai `p-1.5`
              (±32px) — di bawah ambang, dan ini satu-satunya jalan ke menu di
              layar kecil. Penyatuan ini yang memperbaikinya. */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex size-11 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted md:hidden"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </nav>
      </div>
      {menuOpen ? (
        <nav className="border-t border-line bg-surface-sunken px-4 py-2 md:hidden">
          {tautan.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-control px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted"
            >
              {label[lang]}
            </a>
          ))}
          <Link
            to="/masuk"
            onClick={() => setMenuOpen(false)}
            className="block rounded-control px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted sm:hidden"
          >
            {L(lang, "Masuk", "Sign in")}
          </Link>
          <div className="px-3 py-2 sm:hidden">
            <LangSwitcher />
          </div>
        </nav>
      ) : null}
    </header>
  );
}

/**
 * Footer publik — Fase 38c.
 *
 * ## Kenapa berkas ini akhirnya memuatnya juga
 *
 * `Footer()` ditulis TIGA kali: `pages/landing/index.tsx:673`,
 * `pages/fitur.tsx:184`, dan sekali lagi sebagai HTML di
 * `apps/api/src/routes/blog.ts:90`. Persis pola yang sudah diselesaikan untuk
 * header pada Fase 31c — dan perbedaannya, seperti dulu, seluruhnya tak
 * disengaja:
 *
 * | | landing | /fitur |
 * | --- | --- | --- |
 * | Tagline | ada | **hilang** |
 * | Tautan Blog | ada | **hilang** |
 * | Tautan FAQ | ada | **hilang** |
 * | Tautan Daftar | ada | **hilang** |
 * | Baris hak cipta | ada | **hilang** |
 * | Warna | `text-slate-400` | token |
 *
 * Empat di antaranya cacat nyata: pengunjung `/fitur` — halaman yang justru
 * dibaca orang yang sedang menilai produk — tidak punya jalan ke blog, ke FAQ,
 * maupun ke pendaftaran dari kaki halaman.
 *
 * Menyatukannya juga menutup kelasnya: enam halaman publik baru yang menyusul
 * di 38d akan menjadi footer keempat sampai kesembilan bila ini dibiarkan.
 */
export function PublicFooter() {
  const lang = useLang();
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-7 text-[13px] text-ink-muted sm:flex-row sm:items-start sm:px-6">
        <div>
          <BrandWordmark className="h-7" />
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed">
            {L(
              lang,
              "ERP untuk perusahaan Indonesia. Tanpa proyek implementasi, tanpa lisensi per pengguna.",
              "ERP for Indonesian companies. No implementation project, no per-seat licence.",
            )}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {TAUTAN_PUBLIK.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-ink">
              {label[lang]}
            </a>
          ))}
          {/* Blog dilayani Worker (SEO), jadi navigasinya keras — bukan rute SPA. */}
          <a href="/blog" className="hover:text-ink">
            Blog
          </a>
          <Link to="/masuk" className="hover:text-ink">
            {L(lang, "Masuk", "Sign in")}
          </Link>
          <Link to="/daftar" className="hover:text-ink">
            {L(lang, "Daftar", "Sign up")}
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-6 text-xs text-ink-faint sm:px-6">
        © {new Date().getFullYear()} ERPindo
      </div>
    </footer>
  );
}

/** Pembungkus halaman publik: latar, warna teks, dan tinggi penuh. */
export function PublicShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex min-h-full flex-col bg-surface-sunken text-ink", className)}>
      {children}
    </div>
  );
}
