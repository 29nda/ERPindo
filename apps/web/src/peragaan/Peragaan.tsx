import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandWordmark, cx } from "../components/ui";
import { pick, useLang } from "../i18n";
import { useKurangiGerak } from "../lib/gerak";
import { usePemutar } from "./pemutar";
import { RenderPanel } from "./panel";
import type { Naskah } from "./tipe";

/**
 * Komponen peragaan (Fase 38a) — pengganti tangkapan layar produk.
 *
 * ## Bentuknya
 *
 * Sebuah `<figure>` berisi bingkai jendela aplikasi dan `<figcaption>`. Bingkai
 * digambar dengan bahasa desain yang sama dengan aplikasinya sendiri — garis
 * rambut, tanpa bayangan melayang, tanpa bingkai peramban macOS bertitik tiga.
 * Yang diperagakan adalah ERPindo, bukan sebuah laptop.
 *
 * ## Kenapa `<figcaption>` memuat SELURUH narasi
 *
 * Peragaan yang hanya bisa dipahami dengan menontonnya adalah peragaan yang
 * hilang bagi tiga kelompok sekaligus: pembaca layar, perayap mesin pencari,
 * dan siapa pun yang menyetel `prefers-reduced-motion`. Karena itu tiap langkah
 * wajib punya `narasi`, dan seluruh narasi dirender sebagai `<ol>` — di layar
 * untuk panduan, tersembunyi-bagi-mata untuk halaman jualan.
 *
 * Bingkainya sendiri TIDAK `aria-hidden`: isinya teks sungguhan, dan angka di
 * dalamnya justru bukti yang ingin diperiksa pembaca. Yang disembunyikan dari
 * pembaca layar hanya yang memang hiasan — kursor, riak klik, rel ikon, dan
 * tombol peraga.
 */

const TINGGI = {
  rendah: "min-h-[15rem]",
  sedang: "min-h-[19rem]",
  tinggi: "min-h-[23rem]",
} as const;

export function Peragaan({
  naskah,
  tinggi = "sedang",
  langkahTampak = false,
  sekaliJalan,
  className,
}: {
  naskah: Naskah;
  tinggi?: keyof typeof TINGGI;
  /** Tampilkan daftar langkah bernomor di layar — dipakai halaman panduan. */
  langkahTampak?: boolean;
  /** Berhenti di keadaan akhir dan tawarkan tombol ulang — lihat `pemutar.ts`. */
  sekaliJalan?: boolean;
  className?: string;
}) {
  const lang = useLang();
  const kurangi = useKurangiGerak();
  const bingkaiRef = useRef<HTMLDivElement | null>(null);
  const bingkai = usePemutar(naskah, bingkaiRef, { sekaliJalan });
  const [posKursor, setPosKursor] = useState<{ x: number; y: number } | null>(null);

  // Posisi kursor diukur dari panel sasaran yang sesungguhnya, bukan
  // dikarang-karang di naskah. Satu pengukuran per langkah, dan hanya untuk
  // peragaan yang memang sedang berjalan.
  const sasaranKursor = bingkai.kursor?.panel ?? null;
  useEffect(() => {
    if (!sasaranKursor || kurangi) {
      setPosKursor(null);
      return;
    }
    const wadah = bingkaiRef.current;
    const el = wadah?.querySelector<HTMLElement>(`[data-panel="${sasaranKursor}"]`);
    if (!wadah || !el) return;
    const w = wadah.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    setPosKursor({ x: t.left - w.left + t.width / 2, y: t.top - w.top + t.height / 2 });
  }, [sasaranKursor, kurangi]);

  const langkahKini = bingkai.indeks >= 0 ? naskah.langkah[bingkai.indeks] : undefined;

  return (
    <figure data-peragaan={naskah.id} className={cx("not-prose", className)}>
      <div
        ref={bingkaiRef}
        data-bingkai=""
        className={cx(
          "relative overflow-hidden rounded-card border border-line bg-surface shadow-card",
          TINGGI[tinggi],
        )}
      >
        {/* --- Bilah atas: merek, jalur, pintasan ---------------------------- */}
        <div className="flex items-center gap-2 border-b border-line bg-surface-sunken px-3 py-2">
          {/* Font induk disetel kecil supaya wordmark (1em) tetap sepadan
              dengan jalur text-[11px] di sebelahnya — bilah ini meniru
              peramban, dan merek sebesar header sungguhan akan merusak ilusinya. */}
          <span className="text-[11.5px] leading-none">
            <BrandWordmark className="h-3.5" />
          </span>
          <span className="text-ink-faint" aria-hidden>
            /
          </span>
          <span className="num truncate text-[11px] text-ink-muted">{bingkai.jalur}</span>
          <span
            aria-hidden
            className="ml-auto hidden shrink-0 rounded-control border border-line px-1.5 py-0.5 text-[10px] text-ink-faint sm:block"
          >
            Ctrl K
          </span>
        </div>

        {/* --- Isi: panel-panel naskah -------------------------------------- */}
        <div className="grid gap-2.5 p-3 sm:grid-cols-2">
          {naskah.panel.map((p) => (
            <div key={p.id} className={p.jenis === "catatan" ? "sm:col-span-2" : undefined}>
              <RenderPanel panel={p} bingkai={bingkai} lang={lang} />
            </div>
          ))}
        </div>

        {/* --- Kursor peraga ------------------------------------------------ */}
        {posKursor ? (
          <span
            aria-hidden
            data-kursor=""
            className="pointer-events-none absolute left-0 top-0 z-10 transition-transform duration-[420ms] ease-out"
            style={{ transform: `translate(${posKursor.x}px, ${posKursor.y}px)` }}
          >
            {/* Panah digambar dari dua garis miring — tanpa satu berkas pun. */}
            <span className="absolute block size-2.5 -rotate-45 border-b-2 border-r-2 border-ink" />
            {bingkai.menekan ? (
              <span className="riak absolute -left-3 -top-3 block size-8 rounded-full border-2 border-brand-500" />
            ) : null}
          </span>
        ) : null}
      </div>

      <figcaption className="mt-3">
        <p className="text-sm font-semibold text-ink">{pick(naskah.judul, lang)}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
          {pick(naskah.ringkas, lang)}
        </p>

        {/* Narasi langkah yang sedang berjalan — hanya bila daftarnya tidak
            ditampilkan penuh, supaya keduanya tidak mengatakan hal sama. */}
        {!langkahTampak && langkahKini ? (
          <p className="mt-2 text-[13px] font-medium text-brand-ink">
            {pick(langkahKini.narasi, lang)}
          </p>
        ) : null}

        {/* Tombol ulang — kontrol SUNGGUHAN, dan satu-satunya di seluruh
            peragaan. Ia berada di luar `[data-bingkai]` dengan sengaja:
            asersi ui-sim melarang elemen yang bisa difokus di dalam bingkai
            peraga (kontrol palsu yang bisa ditekan Tab tetapi tidak melakukan
            apa pun adalah jebakan), dan tombol ini bukan kontrol palsu. */}
        {sekaliJalan && bingkai.selesai ? (
          <button
            type="button"
            onClick={bingkai.ulangi}
            className="mt-2 inline-flex items-center gap-1.5 rounded-control border border-line px-2.5 py-1 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink focus-visible:fokus"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {pick({ id: "Putar ulang", en: "Play again" }, lang)}
          </button>
        ) : null}

        <ol
          className={cx(
            "mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink-soft",
            !langkahTampak && "sr-only",
          )}
        >
          {naskah.langkah.map((l, i) => (
            <li
              key={i}
              className={cx(
                "flex gap-2.5 transition-colors",
                langkahTampak && i === bingkai.indeks && "text-ink",
              )}
            >
              <span
                className={cx(
                  "num mt-px flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]",
                  langkahTampak && i === bingkai.indeks
                    ? "border-brand-line bg-brand-50 text-brand-ink"
                    : "border-line text-ink-faint",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0">{pick(l.narasi, lang)}</span>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
