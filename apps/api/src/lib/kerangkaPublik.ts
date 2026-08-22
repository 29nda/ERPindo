/**
 * Kerangka HTML bersama untuk halaman yang dilayani Worker (Fase 38g).
 *
 * ## Kenapa berkas ini ada
 *
 * Tiga halaman disajikan Worker sebagai HTML penuh — `/blog`, `/blog/:slug`,
 * dan `/api-docs` — dan masing-masing menulis kerangkanya sendiri: `<head>`,
 * CSS, header, dan footer. Ketiganya berwarna biru `#2563eb` di atas abu-abu
 * `#f8fafc` dengan `system-ui`, yaitu palet yang **sudah tidak ada di produk
 * ini** sejak Fase 32a menggantinya dengan krem dan tanah liat.
 *
 * Akibatnya bukan sekadar tidak seragam. Pengunjung yang membuka artikel blog
 * dari hasil pencarian mendarat di halaman yang tampak milik perusahaan lain,
 * lalu mengeklik "Daftar" dan tiba di produk yang tampak berbeda lagi.
 *
 * Dua rujukan mati ikut ditemukan saat menyatukannya:
 * - `blog.ts` menampilkan `/brand/logo-erpindo.png`, satu-satunya logo raster
 *   yang masih tayang setelah wordmark menjadi teks pada Fase 32a.
 * - `apiDocs.ts` menampilkan `/logo.svg` — berkas yang **tidak pernah ada**,
 *   disembunyikan oleh `onerror` sehingga tidak seorang pun menyadarinya.
 *
 * ## Kenapa nilai warnanya disalin, bukan diimpor
 *
 * Worker tidak bisa membaca `apps/web/src/styles.css` saat menyajikan
 * permintaan. Nilai di bawah adalah salinan, dan salinan berpisah diam-diam —
 * karena itu `apps/api/test/token-publik.test.ts` mengurai `styles.css` dan
 * menuntut tiap nilainya identik. Pola yang sama sudah dipakai untuk
 * `FAQ_LANDING`: satu sumber, plus uji yang mengunci agar tidak berpisah.
 */

/** Nilai token tema terang, disalin dari `:root` di `apps/web/src/styles.css`. */
export const TOKEN_TERANG = {
  surface: "#fffefb",
  surfaceSunken: "#f5f2ea",
  surfaceMuted: "#ece7db",
  ink: "#1f1d19",
  inkSoft: "#55504a",
  inkMuted: "#6e675e",
  line: "#e3ddd0",
  brandInk: "#a8492a",
  brandSurface: "#fbf4f0",
} as const;

/** Nilai token tema gelap, disalin dari `:root.dark`. */
export const TOKEN_GELAP = {
  surface: "#211f1b",
  surfaceSunken: "#171512",
  surfaceMuted: "#322f29",
  ink: "#f5f2ea",
  inkSoft: "#cec5b3",
  inkMuted: "#a49b8d",
  line: "#332f29",
  brandInk: "#c87d57",
  brandSurface: "#2f1310",
} as const;

/**
 * Wordmark ERPindo sebagai TEKS.
 *
 * Bentuknya meniru `BrandWordmark` di `apps/web/src/components/ui.tsx`: serif
 * untuk "ERP", sans tipis berwarna merek untuk "indo". Ditulis ulang sebagai
 * HTML+CSS karena SSR tidak bisa merender komponen React — tetapi hasilnya
 * harus terbaca sama, dan atribut `data-wordmark` dipertahankan supaya kait
 * ujinya berlaku di kedua sisi.
 */
export function wordmarkHtml(): string {
  return `<span class="merek" data-wordmark><span class="merek-serif">ERP</span><span class="merek-tipis">indo</span></span>`;
}

/**
 * Tema gelap disajikan lewat `prefers-color-scheme`, BUKAN kelas `.dark`.
 *
 * Batasan yang dicatat terbuka: SPA menyimpan pilihan tema pengguna di
 * `localStorage` dan memasang kelas `.dark`. Worker tidak bisa membacanya saat
 * menyajikan permintaan, jadi halaman SSR mengikuti setelan sistem. Pengguna
 * yang memilih tema gelap di aplikasi tetapi memakai sistem bertema terang akan
 * melihat blog bertema terang. Itu selisih yang diterima; alternatifnya adalah
 * mengirim tema lewat cookie, dan cookie tema pada halaman publik yang
 * di-cache 5 menit akan menyajikan tema orang lain.
 */
function css(): string {
  const t = TOKEN_TERANG;
  const g = TOKEN_GELAP;
  return `
@font-face { font-family: "Inter Var"; src: url("/font/inter.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Source Serif Var"; src: url("/font/source-serif.woff2") format("woff2"); font-weight: 200 900; font-display: swap; }
:root {
  color-scheme: light dark;
  --surface: ${t.surface}; --sunken: ${t.surfaceSunken}; --muted: ${t.surfaceMuted};
  --ink: ${t.ink}; --ink-soft: ${t.inkSoft}; --ink-muted: ${t.inkMuted};
  --line: ${t.line}; --brand: ${t.brandInk}; --brand-surface: ${t.brandSurface};
}
@media (prefers-color-scheme: dark) {
  :root {
    --surface: ${g.surface}; --sunken: ${g.surfaceSunken}; --muted: ${g.surfaceMuted};
    --ink: ${g.ink}; --ink-soft: ${g.inkSoft}; --ink-muted: ${g.inkMuted};
    --line: ${g.line}; --brand: ${g.brandInk}; --brand-surface: ${g.brandSurface};
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--sunken); color: var(--ink); line-height: 1.7;
  font-family: "Inter Var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { max-width: 46rem; margin: 0 auto; padding: 0 1.25rem; }
header { border-bottom: 1px solid var(--line); background: var(--surface); position: sticky; top: 0; }
header .wrap { display: flex; align-items: center; justify-content: space-between; padding: .8rem 1.25rem; }
header nav a { color: var(--ink-soft); text-decoration: none; font-size: .9rem; margin-left: 1rem; }
header nav a:hover { color: var(--ink); }
header nav a.cta { background: var(--brand); color: #fff; padding: .45rem .9rem; border-radius: .375rem; font-weight: 600; }
.merek { display: inline-flex; align-items: baseline; line-height: 1; user-select: none; }
.merek-serif { font-family: "Source Serif Var", ui-serif, Georgia, serif; font-size: 1.35rem; letter-spacing: -.015em; color: var(--ink); }
.merek-tipis { font-size: 1.28rem; font-weight: 300; letter-spacing: -.015em; color: var(--brand); }
main { padding: 2.5rem 0 4rem; }
h1, h2, h3 { font-family: "Source Serif Var", ui-serif, Georgia, serif; font-weight: 500; letter-spacing: -.015em; line-height: 1.15; }
h1 { font-size: 2.1rem; margin: 0 0 .5rem; }
h2 { font-size: 1.45rem; margin-top: 2.2rem; }
h3 { font-size: 1.15rem; margin-top: 1.6rem; }
.meta { color: var(--ink-muted); font-size: .9rem; margin-bottom: 2rem; }
a { color: var(--brand); }
code { background: var(--muted); border-radius: .3rem; padding: .1rem .35rem; font-size: .9em;
  font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, monospace; }
pre { background: var(--muted); border: 1px solid var(--line); border-radius: .5rem; padding: .9rem 1rem; overflow-x: auto; }
pre code { background: none; padding: 0; }
table { width: 100%; border-collapse: collapse; font-size: .92rem; }
th, td { text-align: left; padding: .5rem .6rem; border-bottom: 1px solid var(--line); }
th { color: var(--ink-muted); font-weight: 600; }
.card { display: block; background: var(--surface); border: 1px solid var(--line); border-radius: .5rem;
  padding: 1.25rem 1.5rem; margin-bottom: 1rem; text-decoration: none; color: inherit; }
.card:hover { border-color: var(--brand); }
.card h2 { margin: 0 0 .3rem; font-size: 1.2rem; color: var(--ink); }
.card p { margin: .25rem 0 0; color: var(--ink-muted); font-size: .95rem; }
.cover { width: 100%; border-radius: .5rem; margin-bottom: 1.5rem; }
.lead { color: var(--ink-soft); font-size: 1.05rem; }
footer { border-top: 1px solid var(--line); background: var(--surface); padding: 2rem 0; color: var(--ink-muted); font-size: .9rem; }
footer .wrap { display: flex; flex-wrap: wrap; gap: .35rem 1rem; align-items: baseline; }
footer a { text-decoration: none; }
`.trim();
}

/** Rangka HTML lengkap untuk halaman yang disajikan Worker. */
export function kerangkaHtml(opts: {
  title: string;
  description: string;
  canonical: string;
  /** Tag tambahan untuk `<head>`, mis. JSON-LD. */
  head?: string;
  /** Isi `<main>`. */
  body: string;
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}" />
<link rel="canonical" href="${esc(opts.canonical)}" />
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="preload" href="/font/inter.woff2" as="font" type="font/woff2" crossorigin />
<meta property="og:title" content="${esc(opts.title)}" />
<meta property="og:description" content="${esc(opts.description)}" />
<meta property="og:image" content="/og-image.png" />
${opts.head ?? ""}
<style>${css()}</style>
</head>
<body>
<header><div class="wrap">
  <a href="/" aria-label="ERPindo">${wordmarkHtml()}</a>
  <nav><a href="/fitur">Fitur</a><a href="/harga">Harga</a><a href="/blog">Blog</a><a href="/panduan">Panduan</a><a class="cta" href="/daftar">Daftar</a></nav>
</div></header>
<main><div class="wrap">${opts.body}</div></main>
<footer><div class="wrap">
  <span>© ${new Date().getFullYear()} ERPindo — ERP untuk perusahaan Indonesia.</span>
  <a href="/">Lihat demo berisi data setahun penuh</a>
  <a href="/keamanan">Keamanan</a>
  <a href="/syarat">Syarat Layanan</a>
  <a href="/privasi">Kebijakan Privasi</a>
</div></footer>
</body>
</html>`;
}
