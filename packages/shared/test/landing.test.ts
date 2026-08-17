import { describe, expect, it } from "vitest";
import { FAQ_LANDING, FAQ_RICH_RESULT } from "../src/landing";

/**
 * Penjaga sumber tunggal FAQ (Fase 31c).
 *
 * Sampai fase ini, FAQ ditulis DUA kali: 11 tanya-jawab di
 * `apps/web/src/pages/landing/sections.ts` (yang dilihat manusia) dan 5
 * tanya-jawab di `apps/api/src/routes/landingSeo.ts` (yang dikirim ke mesin
 * pencari sebagai JSON-LD `FAQPage`). Komentar di sisi server menyatakan
 * keduanya "selaras". **Tidak satu pun pertanyaannya sama.**
 *
 * Tak ada gerbang yang bisa melihatnya, dan sebabnya penting: tidak ada satu
 * berkas pun yang memuat kedua daftar, jadi tidak ada tempat untuk
 * membandingkannya. Uji ini adalah tempat itu.
 *
 * Yang dijaga bukan sekadar kerapian. Panduan data terstruktur Google menuntut
 * isi `FAQPage` benar-benar tampak di halaman yang sama; markup yang
 * menjanjikan jawaban yang tidak ada di halaman bisa membuat rich result
 * dicabut.
 */
describe("FAQ landing — satu sumber untuk halaman & rich result", () => {
  it("rich result adalah bagian dari FAQ halaman, bukan daftar terpisah", () => {
    const pertanyaanHalaman = new Set(FAQ_LANDING.map((f) => f.q.id));
    for (const [q] of FAQ_RICH_RESULT) {
      expect(
        pertanyaanHalaman.has(q),
        `Pertanyaan JSON-LD tidak ada di halaman: "${q}"`
      ).toBe(true);
    }
  });

  it("jawaban rich result sama persis dengan jawaban di halaman", () => {
    const jawaban = new Map(FAQ_LANDING.map((f) => [f.q.id, f.a.id]));
    for (const [q, a] of FAQ_RICH_RESULT) expect(jawaban.get(q)).toBe(a);
  });

  it("mengangkat lima teratas — cukup untuk rich result, tanpa membanjiri", () => {
    expect(FAQ_RICH_RESULT).toHaveLength(5);
    expect(FAQ_RICH_RESULT[0]?.[0]).toBe(FAQ_LANDING[0]?.q.id);
  });

  it("setiap entri dwibahasa dan tidak ada sisi yang kosong", () => {
    for (const f of FAQ_LANDING) {
      for (const bagian of [f.q, f.a]) {
        expect(bagian.id.trim().length).toBeGreaterThan(0);
        expect(bagian.en.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("sisi Inggris benar-benar diterjemahkan, bukan disalin dari Indonesia", () => {
    // Menyalin sisi ID ke EN adalah kegagalan paling mudah terjadi dan paling
    // sulit terlihat: bentuknya lolos seluruh pemeriksaan tipe.
    for (const f of FAQ_LANDING) {
      expect(f.q.en, `Pertanyaan EN identik dengan ID: "${f.q.id}"`).not.toBe(f.q.id);
      expect(f.a.en, `Jawaban EN identik dengan ID: "${f.q.id}"`).not.toBe(f.a.id);
    }
  });

  it("tidak ada pertanyaan kembar", () => {
    const q = FAQ_LANDING.map((f) => f.q.id);
    expect(new Set(q).size).toBe(q.length);
  });

  it("tidak menjanjikan masa coba gratis — produk ini tidak punya", () => {
    // Regresi Fase 24: masa coba dihapus dari produk, tetapi naskah lama sempat
    // tertinggal di beberapa tempat. Janji yang tidak bisa ditepati di halaman
    // harga adalah cacat yang lebih mahal daripada salah ketik.
    const semua = FAQ_LANDING.map((f) => `${f.q.id} ${f.a.id}`).join(" ").toLowerCase();
    expect(semua).not.toMatch(/gratis \d+ hari|masa percobaan|free trial/);
  });
});
