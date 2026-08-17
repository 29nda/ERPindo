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
 * Tautan bilah atas. Diberikan per halaman karena jangkarnya berbeda: di
 * halaman depan `#harga` menggulir, di halaman lain ia harus `/#harga`.
 */
export const TAUTAN_BERANDA: TautanPublik[] = [
  ["/fitur", { id: "Fitur", en: "Features" }],
  ["#harga", { id: "Harga", en: "Pricing" }],
  ["/panduan", { id: "Panduan", en: "Guide" }],
  ["#faq", { id: "FAQ", en: "FAQ" }],
];

export const TAUTAN_HALAMAN_LAIN: TautanPublik[] = [
  ["/", { id: "Beranda", en: "Home" }],
  ["/fitur", { id: "Fitur", en: "Features" }],
  ["/#harga", { id: "Harga", en: "Pricing" }],
  ["/panduan", { id: "Panduan", en: "Guide" }],
  ["/#faq", { id: "FAQ", en: "FAQ" }],
];

export function PublicHeader({
  tautan = TAUTAN_HALAMAN_LAIN,
  /** Halaman depan: wordmark bukan tautan, karena sudah di sana. */
  beranda = false,
}: {
  tautan?: TautanPublik[];
  beranda?: boolean;
}) {
  const { dark, toggle } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const lang = useLang();
  const judulTema = L(lang, "Ganti tema terang/gelap", "Toggle light/dark theme");

  const merek = <BrandWordmark className="h-7" />;

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
