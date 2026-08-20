import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "../components/ui";
import { pick, useLang } from "../i18n";
import { L, PublicFooter, PublicHeader, PublicShell } from "../components/publik";
import { MODUL_DETAIL } from "./landing/fiturDetail";
import { INTEGRATIONS } from "./landing/sections";

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

export function FiturPage() {
  const lang = useLang();
  return (
    <PublicShell>
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-24 lg:pt-32">
          <h1 className="judul-hero max-w-4xl text-[2.75rem] sm:text-[4.25rem]">
            {L(lang, "Apa saja yang", "Everything ERPindo")}{" "}
            <span className="text-brand-ink">
              {L(lang, "dikerjakan ERPindo", "actually does for you")}
            </span>
          </h1>
          <p className="mt-7 max-w-[34rem] text-lg leading-[1.7] text-ink-soft">
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
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:border-brand-300 hover:text-brand-ink"
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
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24 lg:py-32">
              <div className={`grid items-start gap-10 ${m.gambar ? "lg:grid-cols-2" : ""}`}>
                <div>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-surface text-brand-ink">
                    <m.icon className="size-5" aria-hidden />
                  </span>
                  <h2 className="judul mt-4 text-[1.75rem] sm:text-[2rem]">
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
                          className="mt-0.5 size-4 shrink-0 text-ok-ink"
                          aria-hidden
                        />
                        {pick(c, lang)}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 rounded-card border border-brand-line bg-brand-surface p-4 text-sm font-medium leading-relaxed text-brand-ink">
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

        {/* Pita kompatibilitas — DIPINDAHKAN dari halaman depan (Fase 32c).

            Di landing ia hanya satu baris ikon di antara sebelas seksi lain,
            dan ikut membentuk urutan yang membuat halaman itu terbaca seperti
            template SaaS mana pun. Di sini ia justru pada tempatnya: pembaca
            yang sudah menelusuri 22 modul persis sedang bertanya "apakah ini
            nyambung dengan yang sudah saya pakai".

            Percobaan pertama membuang pita ini dari landing TANPA memindahkan
            isinya lebih dulu, dan itu keliru: klaim kompatibilitas **Xendit
            hanya ada di sini** — `/fitur` sama sekali tidak menyebutnya. Satu
            klaim nyata nyaris hilang dari seluruh situs tanpa ada yang
            menyadarinya. Asersi ui-sim yang menjaganya ikut pindah ke halaman
            ini, bukan dihapus. */}
        <section className="border-t border-line px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="judul text-[1.75rem] sm:text-[2rem]">
              {L(lang, "Nyambung dengan yang sudah Anda pakai", "Works with what you already use")}
            </h2>
            <ul data-kisi="integrasi" className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {INTEGRATIONS.map((it) => (
                <li key={it.label.id} className="flex items-center gap-3 text-ink-soft">
                  <it.icon className="size-4 shrink-0 text-brand-ink" aria-hidden />
                  <span className="text-[15px]">{pick(it.label, lang)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 pb-20 pt-4 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-card bg-brand-600 px-8 py-12 text-white shadow-lg sm:flex-row sm:items-center">
            <div>
              <h2 className="judul text-[1.75rem] sm:text-[2rem]">
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

      <PublicFooter />
    </PublicShell>
  );
}
