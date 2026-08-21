import { escapeHtml, renderMarkdown } from "@erpindo/shared";
import { Hono } from "hono";
import { kerangkaHtml } from "../lib/kerangkaPublik";
import type { AppEnv, Env } from "../env";

/**
 * Blog publik server-side rendered (Fase 10e) — artikel ditulis dari
 * dashboard admin, dilayani sebagai HTML penuh oleh Worker sehingga terindeks
 * mesin pencari (SEO), lengkap dengan meta OG + JSON-LD + sitemap.
 *
 * PENTING: jalur /blog, /sitemap.xml, /robots.txt masuk `run_worker_first`
 * di wrangler.jsonc — tanpa itu permintaan jatuh ke aset statis SPA.
 */

type BlogRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  published_at: string;
  updated_at: string;
};

function origin(env: Env, reqUrl: string): string {
  return (env.APP_URL ?? new URL(reqUrl).origin).replace(/\/$/, "");
}

function formatTanggal(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Kerangka HTML blog — ringan, tanpa aset eksternal selain logo situs sendiri.
 *
 * Fase 24d: ajakan di nav & footer TIDAK boleh menjanjikan masa coba gratis —
 * trial dihapus di Fase 24a. Berkas ini punya kerangka HTML sendiri, terpisah
 * dari SPA dan dari `landingSeo.ts`, sehingga tersapu luput sewaktu Fase 24c
 * membersihkan teks jualan; ketiganya wajib dirawat bersama. Dijaga cek smoke
 * blok `24d`.
 */
/**
 * Kerangka halaman blog — kini memakai kerangka publik bersama (Fase 38g).
 *
 * Sebelumnya berkas ini menulis `<head>`, CSS, header, dan footernya sendiri
 * sepanjang 40 baris, berwarna biru `#2563eb` di atas `#f8fafc` — palet yang
 * sudah tidak ada di produk ini sejak Fase 32a. Ia juga menayangkan
 * `/brand/logo-erpindo.png`, satu-satunya logo raster yang masih tampil
 * setelah wordmark menjadi teks.
 */
const page = kerangkaHtml;
const CACHE = "public, max-age=300";

export const blogRoutes = new Hono<AppEnv>()

  .get("/blog", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT slug, title, excerpt, body_md, cover_url, published_at, updated_at
       FROM blog_posts WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT 100`,
    ).all<BlogRow>();
    const base = origin(c.env, c.req.url);
    const cards = results
      .map(
        (p) => `<a class="card" href="/blog/${escapeHtml(p.slug)}">
  <h2>${escapeHtml(p.title)}</h2>
  <p>${escapeHtml(p.excerpt ?? "")}</p>
  <p class="meta">${formatTanggal(p.published_at)}</p>
</a>`,
      )
      .join("\n");
    const html = page({
      title: "Blog ERPindo — Tips pembukuan, pajak & operasional perusahaan",
      description: "Artikel praktis seputar pembukuan, pajak, stok, gaji, dan operasional perusahaan Indonesia dari tim ERPindo.",
      canonical: `${base}/blog`,
      body: `<h1>Blog ERPindo</h1>
<p class="meta">Tips praktis pembukuan, pajak, dan operasional untuk perusahaan Indonesia.</p>
${results.length === 0 ? "<p>Belum ada artikel — nantikan segera.</p>" : cards}`,
    });
    return c.html(html, 200, { "Cache-Control": CACHE });
  })

  .get("/blog/:slug", async (c) => {
    const slug = c.req.param("slug");
    const post = await c.env.DB.prepare(
      `SELECT slug, title, excerpt, body_md, cover_url, published_at, updated_at
       FROM blog_posts WHERE slug = ? AND published_at IS NOT NULL`,
    )
      .bind(slug)
      .first<BlogRow>();
    const base = origin(c.env, c.req.url);
    if (!post) {
      return c.html(
        page({
          title: "Artikel tidak ditemukan — Blog ERPindo",
          description: "Artikel yang Anda cari tidak ditemukan.",
          canonical: `${base}/blog`,
          body: `<h1>Artikel tidak ditemukan</h1><p>Artikel yang Anda cari tidak ada atau belum diterbitkan. <a href="/blog">Kembali ke blog</a>.</p>`,
        }),
        404,
      );
    }
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.excerpt ?? undefined,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { "@type": "Organization", name: "ERPindo" },
      mainEntityOfPage: `${base}/blog/${post.slug}`,
    };
    const html = page({
      title: `${post.title} — Blog ERPindo`,
      description: post.excerpt ?? post.title,
      canonical: `${base}/blog/${post.slug}`,
      head: `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
      body: `<article>
<h1>${escapeHtml(post.title)}</h1>
<p class="meta">Diterbitkan ${formatTanggal(post.published_at)}</p>
${post.cover_url ? `<img class="cover" src="${escapeHtml(post.cover_url)}" alt="" />` : ""}
${renderMarkdown(post.body_md)}
</article>`,
    });
    return c.html(html, 200, { "Cache-Control": CACHE });
  })

  .get("/sitemap.xml", async (c) => {
    const base = origin(c.env, c.req.url);
    const { results } = await c.env.DB.prepare(
      `SELECT slug, updated_at FROM blog_posts WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT 500`,
    ).all<{ slug: string; updated_at: string }>();
    const urls = [
      `<url><loc>${base}/</loc></url>`,
      `<url><loc>${base}/fitur</loc></url>`,
      // Fase 38d — enam halaman publik baru. Sitemap adalah tempat ketiga yang
      // harus ikut diperbarui bersama rute SEO dan `run_worker_first`.
      `<url><loc>${base}/harga</loc></url>`,
      `<url><loc>${base}/keamanan</loc></url>`,
      `<url><loc>${base}/tentang</loc></url>`,
      `<url><loc>${base}/kontak</loc></url>`,
      `<url><loc>${base}/syarat</loc></url>`,
      `<url><loc>${base}/privasi</loc></url>`,
      `<url><loc>${base}/panduan</loc></url>`,
      `<url><loc>${base}/blog</loc></url>`,
      ...results.map(
        (p) => `<url><loc>${base}/blog/${escapeHtml(p.slug)}</loc><lastmod>${p.updated_at.slice(0, 10)}</lastmod></url>`,
      ),
    ].join("\n");
    return c.body(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`, 200, {
      "Content-Type": "application/xml",
      "Cache-Control": CACHE,
    });
  })

  .get("/robots.txt", (c) => {
    const base = origin(c.env, c.req.url);
    return c.text(`User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api\n\nSitemap: ${base}/sitemap.xml\n`, 200, {
      "Cache-Control": CACHE,
    });
  });
