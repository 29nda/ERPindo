import { pick, type Dual, type Lang } from "../i18n";
import { cx } from "../components/ui";
import { neracaJurnal } from "./mesin";
import type { Bingkai } from "./mesin";
import type { Nada, Panel, Sasaran } from "./tipe";

/**
 * Perender panel peragaan (Fase 38a).
 *
 * Delapan jenis panel, dan tidak ada yang kesembilan tanpa menyunting berkas
 * ini. Kosakata tertutup itulah yang membedakan kerangka peragaan dari sebuah
 * bahasa mini — dan bahasa mini adalah tempat proyek mati.
 *
 * ## Aturan yang berlaku untuk seluruh berkas
 *
 * 1. **Tidak ada elemen yang bisa difokus.** Tombol digambar sebagai `<span>`,
 *    medan sebagai `<div>`. Peragaan adalah gambar yang bergerak, bukan
 *    antarmuka; kontrol palsu yang bisa ditekan Tab tetapi tidak melakukan
 *    apa pun adalah jebakan bagi pengguna papan tik. Asersi ui-sim menegakkan
 *    ini, dan pelajarannya sudah tertulis di `pertunjukan.tsx:168`.
 * 2. **Seluruh isi selalu ada di DOM.** Panel yang belum menyala hanya
 *    diredupkan `opacity`, tidak pernah dilepas. Perayap dan pembaca layar
 *    mendapat naskah utuh tanpa menunggu animasi.
 * 3. **Nol warna literal.** Status memakai token `ok`/`awas`/`galat` yang
 *    ditambahkan ke `styles.css` pada fase yang sama.
 */

/** Angka gaya Indonesia — pemisah ribuan titik (glosarium §6). */
export function angka(n: number): string {
  return n.toLocaleString("id-ID");
}

const KELAS_NADA: Record<Nada, string> = {
  netral: "border-line text-ink-muted",
  ok: "border-ok-line bg-ok-surface text-ok-ink",
  awas: "border-awas-line bg-awas-surface text-awas-ink",
  galat: "border-galat-line bg-galat-surface text-galat-ink",
};

const TINTA_NADA: Record<Nada, string> = {
  netral: "text-ink",
  ok: "text-ok-ink",
  awas: "text-awas-ink",
  galat: "text-galat-ink",
};

/** `true` bila sasaran langkah menunjuk panel ini. */
function menyorot(sorotan: Sasaran | null, id: string): boolean {
  return sorotan?.panel === id;
}

/**
 * Bingkai satu panel: menyala/redup, tersorot, dan bernada.
 *
 * Bentuknya sengaja meniru `Kartu` di `pertunjukan.tsx` — bahasa "garis &
 * permukaan" yang sama dengan seluruh aplikasi, tanpa bayangan melayang.
 */
function Bungkus({
  id,
  bingkai,
  judul,
  lang,
  children,
}: {
  id: string;
  bingkai: Bingkai;
  judul?: Dual;
  lang: Lang;
  children: React.ReactNode;
}) {
  const menyala = bingkai.terisi.has(id);
  const disorot = menyorot(bingkai.sorotan, id);
  const nada = bingkai.ditandai.get(id);

  return (
    <div
      data-panel={id}
      data-menyala={menyala ? "1" : "0"}
      className={cx(
        "rounded-card border bg-surface p-3.5 transition-all duration-500",
        menyala ? "opacity-100" : "opacity-40",
        disorot ? "border-brand-line" : "border-line",
        nada ? KELAS_NADA[nada] : "",
      )}
      style={{ transform: menyala ? "none" : "translateY(6px)" }}
    >
      {judul ? (
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          {pick(judul, lang)}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Teks ketikan yang tampil sebagian, dengan kursor batang saat sedang diketik. */
function Ketikan({ teks, bagian }: { teks: string; bagian: number }) {
  if (bagian >= 1) return <>{teks}</>;
  const n = Math.ceil(teks.length * Math.max(bagian, 0));
  return (
    <>
      {teks.slice(0, n)}
      <span
        aria-hidden
        className="caret ml-px inline-block h-[1.05em] w-px translate-y-[0.15em] bg-brand-600"
      />
    </>
  );
}

function Formulir({
  panel,
  bingkai,
  lang,
}: {
  panel: Extract<Panel, { jenis: "formulir" }>;
  bingkai: Bingkai;
  lang: Lang;
}) {
  return (
    <Bungkus id={panel.id} bingkai={bingkai} judul={panel.judul} lang={lang}>
      <dl className="space-y-2.5">
        {panel.medan.map((m) => {
          const bagian = bingkai.ketikan.get(`${panel.id}.${m.id}`) ?? 1;
          const sorot = bingkai.sorotan?.panel === panel.id && bingkai.sorotan.medan === m.id;
          return (
            <div key={m.id}>
              <dt className="text-[10px] uppercase tracking-wide text-ink-faint">
                {pick(m.label, lang)}
              </dt>
              <dd
                className={cx(
                  "mt-0.5 min-h-[1.25rem] rounded-control text-[13px] font-medium text-ink transition-colors",
                  m.num && "num",
                  sorot && "bg-surface-muted px-1",
                )}
              >
                <Ketikan teks={pick(m.nilai, lang)} bagian={bagian} />
              </dd>
            </div>
          );
        })}
      </dl>
      {panel.tombol ? (
        /* `<span>`, bukan `<button>` — lihat aturan 1 di kepala berkas. */
        <span
          aria-hidden
          className={cx(
            "mt-3.5 flex items-center justify-center rounded-control px-3 py-2 text-[13px] font-semibold transition-all duration-300",
            bingkai.terisi.has(panel.id)
              ? "bg-brand-600 text-white"
              : "bg-surface-muted text-ink-faint",
          )}
          style={{
            transform:
              bingkai.menekan && bingkai.kursor?.panel === panel.id ? "scale(0.97)" : "scale(1)",
          }}
        >
          {pick(panel.tombol, lang)}
        </span>
      ) : null}
    </Bungkus>
  );
}

function Tabel({
  panel,
  bingkai,
  lang,
}: {
  panel: Extract<Panel, { jenis: "tabel" }>;
  bingkai: Bingkai;
  lang: Lang;
}) {
  return (
    <Bungkus id={panel.id} bingkai={bingkai} judul={panel.judul} lang={lang}>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-line text-left">
            {panel.kolom.map((k, i) => (
              <th
                key={i}
                className={cx("pb-1.5 font-medium text-ink-muted", k.num && "text-right")}
              >
                {pick(k.label, lang)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {panel.baris.map((b, i) => (
            <tr
              key={i}
              className={cx(
                "border-b border-line last:border-0 transition-colors",
                bingkai.sorotan?.panel === panel.id && bingkai.sorotan.baris === i
                  ? "bg-surface-muted"
                  : "",
              )}
            >
              {b.map((sel, j) => (
                <td
                  key={j}
                  className={cx("py-1.5 text-ink", panel.kolom[j]?.num && "num text-right")}
                >
                  {pick(sel, lang)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Bungkus>
  );
}

function Jurnal({
  panel,
  bingkai,
  lang,
}: {
  panel: Extract<Panel, { jenis: "jurnal" }>;
  bingkai: Bingkai;
  lang: Lang;
}) {
  const neraca = neracaJurnal(panel.baris);
  return (
    <Bungkus id={panel.id} bingkai={bingkai} judul={panel.judul} lang={lang}>
      <table className="w-full text-[12px]">
        <tbody>
          {panel.baris.map((b, i) => (
            <tr key={i}>
              <td className="py-0.5 pr-2 text-ink-muted">{pick(b.akun, lang)}</td>
              <td className="num py-0.5 text-right text-ink">{b.debit ? angka(b.debit) : ""}</td>
              <td className="num py-0.5 pl-2 text-right text-ink">
                {b.kredit ? angka(b.kredit) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Angka ini dihitung mesin dari baris jurnalnya, bukan diketik naskah —
          jadi ia tidak bisa berbeda dari isinya. Uji akuntansi menuntut
          `seimbang` benar untuk setiap panel jenis ini. */}
      <p
        className={cx(
          "mt-2 border-t border-line pt-1.5 text-[11px] font-medium",
          neraca.seimbang ? "text-ok-ink" : "text-galat-ink",
        )}
      >
        {pick(
          neraca.seimbang
            ? { id: "Seimbang", en: "Balanced" }
            : { id: "Tidak seimbang", en: "Out of balance" },
          lang,
        )}{" "}
        · <span className="num">{angka(neraca.debit)}</span>
      </p>
    </Bungkus>
  );
}

function Angka({
  panel,
  bingkai,
  lang,
}: {
  panel: Extract<Panel, { jenis: "angka" }>;
  bingkai: Bingkai;
  lang: Lang;
}) {
  const nada = bingkai.ditandai.get(panel.id) ?? panel.nada ?? "netral";
  return (
    <Bungkus id={panel.id} bingkai={bingkai} judul={panel.judul} lang={lang}>
      <p className={cx("num text-xl font-bold leading-tight", TINTA_NADA[nada])}>
        {angka(panel.nilai)}
        {panel.satuan ? (
          <span className="ml-1 text-[11px] font-medium text-ink-muted">
            {pick(panel.satuan, lang)}
          </span>
        ) : null}
      </p>
      {panel.delta ? (
        <p className="mt-1 text-[11px] text-ink-muted">{pick(panel.delta, lang)}</p>
      ) : null}
    </Bungkus>
  );
}

function Daftar({
  panel,
  bingkai,
  lang,
}: {
  panel: Extract<Panel, { jenis: "daftar" }>;
  bingkai: Bingkai;
  lang: Lang;
}) {
  return (
    <Bungkus id={panel.id} bingkai={bingkai} judul={panel.judul} lang={lang}>
      <ul className="divide-y divide-line">
        {panel.butir.map((b, i) => (
          <li
            key={i}
            className={cx(
              "flex items-center justify-between gap-2 py-1.5 text-[12px] text-ink transition-colors",
              bingkai.sorotan?.panel === panel.id && bingkai.sorotan.baris === i
                ? "bg-surface-muted"
                : "",
            )}
          >
            <span className="min-w-0">{pick(b.teks, lang)}</span>
            {b.lencana ? (
              <span
                className={cx(
                  "shrink-0 rounded-control border px-1.5 py-0.5 text-[10px] font-medium",
                  KELAS_NADA[b.nada ?? "netral"],
                )}
              >
                {pick(b.lencana, lang)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </Bungkus>
  );
}

function Papan({
  panel,
  bingkai,
  lang,
}: {
  panel: Extract<Panel, { jenis: "papan" }>;
  bingkai: Bingkai;
  lang: Lang;
}) {
  return (
    <Bungkus id={panel.id} bingkai={bingkai} judul={panel.judul} lang={lang}>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${panel.kolom.length}, minmax(0, 1fr))` }}>
        {panel.kolom.map((k, i) => (
          <div key={i}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              {pick(k.judul, lang)}
            </p>
            <div className="space-y-1.5">
              {k.kartu.map((c, j) => (
                <div
                  key={j}
                  className="rounded-control border border-line bg-surface-sunken px-2 py-1.5 text-[11px] text-ink"
                >
                  {pick(c, lang)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Bungkus>
  );
}

function Bagan({
  panel,
  bingkai,
  lang,
}: {
  panel: Extract<Panel, { jenis: "bagan" }>;
  bingkai: Bingkai;
  lang: Lang;
}) {
  const puncak = Math.max(...panel.seri, 1);
  const menyala = bingkai.terisi.has(panel.id);
  return (
    <Bungkus id={panel.id} bingkai={bingkai} judul={panel.judul} lang={lang}>
      <div className="flex h-24 items-end gap-1.5">
        {panel.seri.map((n, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-[2px] bg-brand-400 transition-all duration-700"
              style={{ height: menyala ? `${Math.max((n / puncak) * 100, 4)}%` : "4%" }}
            />
            <span className="truncate text-[9px] text-ink-faint">
              {pick(panel.label[i] ?? { id: "", en: "" }, lang)}
            </span>
          </div>
        ))}
      </div>
    </Bungkus>
  );
}

function Catatan({
  panel,
  bingkai,
  lang,
}: {
  panel: Extract<Panel, { jenis: "catatan" }>;
  bingkai: Bingkai;
  lang: Lang;
}) {
  const menyala = bingkai.terisi.has(panel.id);
  return (
    <div
      data-panel={panel.id}
      data-menyala={menyala ? "1" : "0"}
      className={cx(
        "rounded-card border px-3 py-2 text-[12px] leading-relaxed transition-all duration-500",
        KELAS_NADA[panel.nada],
        menyala ? "opacity-100" : "opacity-40",
      )}
    >
      {pick(panel.teks, lang)}
    </div>
  );
}

/** Satu panel apa pun jenisnya. */
export function RenderPanel({
  panel,
  bingkai,
  lang,
}: {
  panel: Panel;
  bingkai: Bingkai;
  lang: Lang;
}) {
  switch (panel.jenis) {
    case "formulir":
      return <Formulir panel={panel} bingkai={bingkai} lang={lang} />;
    case "tabel":
      return <Tabel panel={panel} bingkai={bingkai} lang={lang} />;
    case "jurnal":
      return <Jurnal panel={panel} bingkai={bingkai} lang={lang} />;
    case "angka":
      return <Angka panel={panel} bingkai={bingkai} lang={lang} />;
    case "daftar":
      return <Daftar panel={panel} bingkai={bingkai} lang={lang} />;
    case "papan":
      return <Papan panel={panel} bingkai={bingkai} lang={lang} />;
    case "bagan":
      return <Bagan panel={panel} bingkai={bingkai} lang={lang} />;
    case "catatan":
      return <Catatan panel={panel} bingkai={bingkai} lang={lang} />;
  }
}
