import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { BrandWordmark, Button, useDarkMode } from "../components/ui";
import { pick, useLang, type Lang } from "../i18n";
import { LangSwitcher } from "../i18n/LangSwitcher";
import { useUi } from "../i18n/ui";
import { MODUL_DETAIL } from "./landing/fiturDetail";

/**
 * Halaman `/fitur` (Fase 18f) — penjelasan mendalam per modul.
 *
 * Alasan halaman ini berdiri sendiri, bukan ditambahkan ke halaman depan:
 * kedalaman yang dibutuhkan calon pembeli yang sedang membandingkan produk
 * akan membuat halaman depan kepanjangan bagi pengunjung yang baru mampir.
 * Halaman terpisah juga memberi satu alamat sendiri untuk mesin pencari.
 *
 * Isinya datang dari `landing/fiturDetail.ts` — satu sumber, supaya halaman
 * depan dan halaman ini tidak pernah saling bertentangan.
 *
 * SEO: `/fitur` disisipi JSON-LD + <noscript> oleh Worker
 * (`apps/api/src/routes/landingSeo.ts`) dan masuk `sitemap.xml`, sama seperti
 * halaman depan. Karena itu ia juga terdaftar di `run_worker_first`.
 */

function L(lang: Lang, id: string, en: string): string {
  return lang === "en" ? en : id;
}

function Header() {
  const u = useUi();
  const { dark, toggle } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const lang = useLang();
  const tautan: [string, { id: string; en: string }][] = [
    ["/", { id: "Beranda", en: "Home" }],
    ["/#harga", { id: "Harga", en: "Pricing" }],
    ["/panduan", { id: "Panduan", en: "Guide" }],
    ["/#faq", { id: "FAQ", en: "FAQ" }],
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-slate-50/90 backdrop-blur dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <a href="/" className="flex h-16 items-center gap-2">
          <BrandWordmark className="h-8" />
        </a>
        <nav className="flex items-center gap-1">
          {tautan.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink md:block"
            >
              {label[lang]}
            </a>
          ))}
          <LangSwitcher className="hidden sm:inline-flex" />
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-ink-muted hover:bg-slate-200/60 dark:hover:bg-slate-800"
            aria-label={u("ftGantiTema")}
            title={u("ftGantiTema")}
          >
            {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          </button>
          <Link to="/daftar">
            {/* Fase 24d: trial dihapus di 24a — bilah atas tak lagi menjanjikan gratis. */}
            <Button size="sm">{L(lang, "Daftar", "Sign up")}</Button>
          </Link>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-slate-200/60 md:hidden dark:hover:bg-slate-800"
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
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-slate-200/60 dark:hover:bg-slate-800"
            >
              {label[lang]}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function FiturPage() {
  const lang = useLang();
  return (
    <div className="flex min-h-full flex-col bg-surface-sunken text-ink">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            {L(lang, "Apa saja yang", "Everything ERPindo")}{" "}
            <span className="text-brand-600 dark:text-brand-400">
              {L(lang, "dikerjakan ERPindo", "actually does for you")}
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {L(
              lang,
              "Bukan daftar kemampuan, tapi penjelasan tiap modul: masalah apa yang dipecahkan, bagaimana cara kerjanya di dalam aplikasi, dan hasil apa yang Anda dapat.",
              "Not a list of capabilities, but an explanation of each module: what problem it solves, how it works inside the app, and what you get out of it.",
            )}
          </p>

          {/* Daftar isi — halaman ini panjang, jadi pembaca perlu bisa melompat
              langsung ke modul yang ia pedulikan. */}
          <nav className="mt-10 flex flex-wrap gap-2" aria-label={L(lang, "Daftar modul", "Module list")}>
            {MODUL_DETAIL.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-300"
              >
                <m.icon className="size-4" aria-hidden />
                {pick(m.nama, lang)}
              </a>
            ))}
          </nav>
        </section>

        {MODUL_DETAIL.map((m, i) => (
          <section
            key={m.id}
            id={m.id}
            className={`scroll-mt-20 ${i % 2 === 1 ? "bg-surface" : ""}`}
          >
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
              <div className={`grid items-start gap-10 ${m.gambar ? "lg:grid-cols-2" : ""}`}>
                <div>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/60 dark:text-brand-300">
                    <m.icon className="size-5" aria-hidden />
                  </span>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                    {pick(m.nama, lang)}
                  </h2>

                  <p className="mt-5 border-l-2 border-line-strong pl-4 text-base italic leading-relaxed text-ink-soft">
                    {pick(m.masalah, lang)}
                  </p>

                  <h3 className="mt-8 text-sm font-semibold text-ink-muted">
                    {L(lang, "Bagaimana ERPindo mengerjakannya", "How ERPindo does it")}
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {m.cara.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start gap-3 text-sm leading-relaxed text-ink-soft"
                      >
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-hidden
                        />
                        {pick(c, lang)}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 rounded-card border border-brand-200 bg-brand-50 p-4 text-sm font-medium leading-relaxed text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100">
                    {pick(m.hasil, lang)}
                  </p>
                </div>

                {/* Modul tanpa tangkapan layar sengaja dirender TANPA gambar
                    (Fase 24c). Meminjam tangkapan layar modul lain akan
                    menampilkan layar yang bukan miliknya — memberi kesan keliru
                    tentang apa yang akan dilihat pembeli. */}
                {m.gambar ? (
                <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card lg:sticky lg:top-24">
                  <img
                    src={m.gambar}
                    alt={`${L(lang, "Tampilan", "View of")} ${pick(m.nama, lang)} — ${pick(m.hasil, lang)}`}
                    width={1280}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    className="w-full"
                  />
                </div>
                ) : null}
              </div>
            </div>
          </section>
        ))}

        <section className="px-4 pb-20 pt-4 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-card bg-brand-600 px-8 py-12 text-white shadow-lg sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {L(lang, "Lihat sendiri dengan data contoh", "See it yourself with sample data")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-50">
                {L(
                  lang,
                  "Masuk ke perusahaan demo berisi data nyata lintas seluruh modul — tanpa daftar, tanpa kartu kredit. Lihat seluruhnya sebelum memutuskan.",
                  "Enter a demo company holding real data across every module — no signup, no credit card. See everything before you decide.",
                )}
              </p>
            </div>
            <Link to="/daftar" className="shrink-0">
              <Button variant="secondary" size="lg">
                {L(lang, "Mulai Gratis", "Start Free")} <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <BrandWordmark className="h-7" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href="/" className="hover:text-ink">
              {L(lang, "Beranda", "Home")}
            </a>
            <a href="/#harga" className="hover:text-ink">
              {L(lang, "Harga", "Pricing")}
            </a>
            <a href="/panduan" className="hover:text-ink">
              {L(lang, "Panduan", "Guide")}
            </a>
            <Link to="/masuk" className="hover:text-ink">
              {L(lang, "Masuk", "Sign in")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
