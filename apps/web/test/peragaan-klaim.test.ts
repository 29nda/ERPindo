import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PERAGAAN } from "../src/peragaan";
import type { Naskah } from "../src/peragaan/tipe";

/**
 * Penjaga klaim-vs-produk (Fase 42b).
 *
 * ## Kelas cacat yang ditutup uji ini
 *
 * Empat kali berturut-turut halaman publik menjanjikan sesuatu yang tidak ada
 * di produknya:
 *
 * 1. `noscript` mengirim potongan JavaScript alih-alih harganya (Fase 39b);
 * 2. `/panduan` menjanjikan tangkapan layar yang Fase 49d jamin tidak ada;
 * 3. FAQ menyuruh pembaca "menjadwalkan demo" yang Fase 48 jamin tidak ada;
 * 4. peragaan kontak memperagakan **batas kredit** dan **termin pembayaran**
 *    padahal `contacts` tidak pernah punya kolomnya (Fase 41a, ditutup 42a).
 *
 * Yang keempat paling berbahaya, dan justru paling sunyi: 255 uji peragaan
 * lolos sepanjang waktu itu. Semuanya memeriksa **konsistensi ke dalam** —
 * `sasaran` menunjuk panel yang ada, tiap `Dual` terisi dua bahasa, jalurnya
 * terdaftar di `main.tsx`. Tidak satu pun menanyakan hal yang sebenarnya
 * penting: **apakah yang diperagakan ini ada di basis datanya?**
 *
 * Karena itu `medan` sebuah panel formulir sekarang WAJIB menyebut `sumber`,
 * dan uji ini mengurai `packages/db/src/migrations.ts` untuk membuktikan tiap
 * `sumber` menunjuk tabel dan kolom yang sungguh ada. Peragaan yang menjanjikan
 * kolom khayalan tidak lagi bisa dikirim — ia memecahkan build lebih dulu.
 *
 * Skemanya dibaca dari migrasi, bukan dari daftar tabel yang ditulis tangan di
 * sini. Daftar tulis tangan akan basi persis seperti yang lain-lain, dan
 * penjaga yang basi lebih buruk daripada tidak ada penjaga sama sekali.
 */

const MIGRASI = path.join(__dirname, "../../../packages/db/src/migrations.ts");

/** Nilai `sumber` untuk medan yang memang tidak berasal dari kolom mana pun. */
const HITUNG = "hitung";

/**
 * Skema tenant sebagaimana benar-benar dibangun migrasi: `CREATE TABLE` untuk
 * bentuk awal, `ALTER TABLE ... ADD COLUMN` untuk yang menyusul. Kolom yang
 * ditambahkan migrasi belakangan (`contacts.credit_limit`, Fase 42a) hanya
 * terlihat bila keduanya dibaca.
 */
function bacaSkema(): Map<string, Set<string>> {
  const src = readFileSync(MIGRASI, "utf8");
  const skema = new Map<string, Set<string>>();
  const kolom = (t: string) => {
    let s = skema.get(t);
    if (!s) skema.set(t, (s = new Set()));
    return s;
  };

  for (const m of src.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? (\w+)\s*\(([\s\S]*?)\)\s*`/g)) {
    const set = kolom(m[1]);
    for (const potong of m[2].split(",")) {
      const nama = /^\s*(\w+)\s/.exec(potong)?.[1];
      // `PRIMARY KEY (...)`, `FOREIGN KEY ...`, dan kawan-kawannya bukan kolom.
      if (nama && !["PRIMARY", "FOREIGN", "UNIQUE", "CHECK", "CONSTRAINT"].includes(nama.toUpperCase())) {
        set.add(nama);
      }
    }
  }
  for (const m of src.matchAll(/ALTER TABLE (\w+) ADD COLUMN (\w+)/g)) kolom(m[1]).add(m[2]);
  return skema;
}

/** Tiap medan formulir di seluruh peragaan, beserta asal-usulnya untuk pesan galat. */
function semuaMedan(): { peragaan: string; panel: string; medan: string; sumber: string }[] {
  const keluar: { peragaan: string; panel: string; medan: string; sumber: string }[] = [];
  // Ditelusuri lewat `PERAGAAN`, bukan `SEMUA_PERAGAAN`, semata demi pesan
  // galatnya: yang gagal harus terbaca `kontak/kontak.kredit`, bukan `23/...`.
  for (const [kunci, naskah] of Object.entries(PERAGAAN as Record<string, Naskah>)) {
    for (const panel of naskah.panel) {
      if (panel.jenis !== "formulir") continue;
      for (const medan of panel.medan) {
        keluar.push({ peragaan: kunci, panel: panel.id, medan: medan.id, sumber: medan.sumber });
      }
    }
  }
  return keluar;
}

describe("peragaan formulir terikat ke skema sungguhan", () => {
  const skema = bacaSkema();
  const medan = semuaMedan();

  it("skema berhasil diurai — kalau tidak, seluruh uji di bawah lolos palsu", () => {
    // Penjaga bagi penjaganya sendiri. Bila bentuk `migrations.ts` berubah
    // sampai regexnya tidak lagi cocok, `bacaSkema()` mengembalikan peta kosong
    // dan setiap asersi di bawah akan lolos tanpa memeriksa apa pun.
    expect(skema.size).toBeGreaterThan(40);
    expect(skema.get("contacts")).toContain("credit_limit");
    expect(skema.get("invoices")).toContain("total");
  });

  it("ada medan yang diperiksa — daftar kosong bukan kelulusan", () => {
    expect(medan.length).toBeGreaterThan(20);
  });

  it("setiap sumber menunjuk tabel yang ada", () => {
    const hilang = medan
      .filter((m) => m.sumber !== HITUNG && !skema.has(m.sumber.split(".")[0]))
      .map((m) => `${m.peragaan}/${m.panel}.${m.medan} → ${m.sumber}`);
    expect(hilang).toEqual([]);
  });

  it("setiap sumber menunjuk kolom yang ada di tabel itu", () => {
    const hilang = medan
      .filter((m) => {
        if (m.sumber === HITUNG) return false;
        const [tabel, kol] = m.sumber.split(".");
        return skema.has(tabel) && !skema.get(tabel)!.has(kol);
      })
      .map((m) => `${m.peragaan}/${m.panel}.${m.medan} → ${m.sumber}`);
    expect(hilang).toEqual([]);
  });

  it("sumber berbentuk `tabel.kolom` atau persis `hitung`", () => {
    const salahBentuk = medan
      .filter((m) => m.sumber !== HITUNG && !/^[a-z_]+\.[a-z_]+$/.test(m.sumber))
      .map((m) => `${m.peragaan}/${m.panel}.${m.medan} → ${m.sumber}`);
    expect(salahBentuk).toEqual([]);
  });

  it("`hitung` dipakai secukupnya, bukan sebagai jalan pintas", () => {
    // Menandai semua medan `hitung` akan melucuti penjaga ini sepenuhnya tanpa
    // memecahkan satu pun uji. Ambangnya menjadikan pelucutan itu terlihat.
    const hitung = medan.filter((m) => m.sumber === HITUNG).length;
    expect(hitung / medan.length).toBeLessThan(0.35);
  });
});
