// Penjaga tautan dokumen internal (Fase 31e).
//
// ## Kenapa gerbang ini ada
//
// Fase 31e memadatkan 258 log fase (18.972 baris) menjadi satu
// `docs/riwayat.md` lalu menghapus aslinya. Penghapusan itu meninggalkan
// **empat rujukan menggantung** di `docs/STATUS.md` dan
// `docs/05-runbook-go-live.md` — keduanya dokumen yang justru dibaca pemilik
// saat meluncurkan, dan keduanya menunjuk berkas yang sudah tidak ada.
//
// Tidak ada gerbang yang bisa melihatnya: Markdown tidak dikompilasi, jadi
// tautan mati tidak menghasilkan galat apa pun. Skrip ini menjadi gerbangnya.
//
// Yang diperiksa hanya tautan ke berkas DI DALAM repo. Tautan http(s) sengaja
// diabaikan — memeriksanya menuntut jaringan, dan gerbang yang bergantung pada
// jaringan akan memerah karena sebab yang tak ada hubungannya dengan kode.
import { existsSync, readFileSync, globSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const berkas = globSync(["*.md", "docs/**/*.md", ".github/**/*.md"]);
const putus = [];
let diperiksa = 0;

for (const f of berkas) {
  const isi = readFileSync(f, "utf8");
  // Dua bentuk: [teks](path) dan `path` di dalam backtick yang berakhiran .md
  // Dua bentuk dengan DUA titik acuan berbeda — membedakannya penting:
  //   [teks](path)  → relatif terhadap berkas yang memuatnya (aturan Markdown)
  //   `docs/x.md`   → sebutan jalur dari AKAR repo, bukan tautan Markdown
  // Menyamakan keduanya membuat `docs/STATUS.md` yang disebut dari dalam
  // `docs/` dicari sebagai `docs/docs/STATUS.md` dan dilaporkan putus padahal
  // tidak. Versi pertama skrip ini melakukan persis itu.
  const kandidat = [
    ...[...isi.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)].map((m) => ({
      rel: m[1],
      dariAkar: false,
    })),
    ...[...isi.matchAll(/`((?:docs|scripts|apps|packages)\/[^`\s]+\.md)`/g)].map((m) => ({
      rel: m[1],
      dariAkar: true,
    })),
  ];
  for (const { rel, dariAkar } of new Map(kandidat.map((k) => [k.rel + k.dariAkar, k])).values()) {
    if (/^https?:/.test(rel)) continue;
    // Pola contoh, bukan tautan: `YYYY-MM-DD-fase-NX-ringkas.md`, `…-*.md`.
    if (/YYYY|MM-DD|NX|\*/.test(rel)) continue;
    diperiksa++;
    const target = dariAkar
      ? normalize(rel)
      : rel.startsWith("/")
        ? normalize(rel.slice(1))
        : normalize(join(dirname(f), rel));
    if (!existsSync(target)) putus.push(`${f} → ${rel}`);
  }
}

console.log(`tautan dokumen internal diperiksa: ${diperiksa} di ${berkas.length} berkas`);

if (putus.length > 0) {
  console.error(`\n✗ ${putus.length} tautan dokumen menunjuk berkas yang tidak ada:`);
  for (const p of putus) console.error(`  ${p}`);
  console.error(
    `\n  Perbaiki tautannya, atau arahkan ke docs/riwayat.md bila berkas asalnya\n` +
      `  termasuk log fase yang sudah dipadatkan.`
  );
  process.exit(1);
}

console.log("✓ Semua tautan dokumen internal menunjuk berkas yang ada.");
