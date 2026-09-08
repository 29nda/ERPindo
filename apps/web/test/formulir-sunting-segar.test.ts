import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Formulir sunting tidak boleh ditutup sebelum daftarnya segar (Fase 56d).
 *
 * ## Cacat yang ditutup uji ini
 *
 * Medan formulir master data memakai `defaultValue`, dan disemai SEKALI dari
 * baris yang tertangkap ketika tombol "Ubah" diklik:
 *
 *   onEdit={() => setEditing(p)}
 *   <Input id="k-termin" defaultValue={editing.payment_term_days ?? ""} />
 *
 * Sesudah menyimpan, `update.onSuccess` dulu menutup lembarnya lalu memanggil
 * `invalidate()` tanpa menunggunya. Di antara keduanya ada jendela waktu:
 * daftar di belakangnya masih baris LAMA. Siapa pun yang mengeklik "Ubah" lagi
 * di dalam jendela itu mendapat formulir berisi nilai sebelum-simpan — dan
 * karena `defaultValue` tidak pernah disemai ulang, formulir itu tetap salah
 * selamanya. Menyimpannya lagi mengembalikan perubahan yang baru saja dibuat
 * pemakainya, tanpa galat, tanpa peringatan.
 *
 * Jendelanya beberapa ratus milidetik di jaringan sungguhan — jauh lebih lebar
 * daripada di mesin pengembang. Ia ketahuan bukan lewat laporan pemakai
 * melainkan karena gerbang ui-sim memerah di CI yang lebih lambat.
 *
 * ## Kenapa diuji dari BENTUK SUMBERNYA
 *
 * Balapan tidak bisa diuji andal dengan menunggu: uji yang menang balapan di
 * satu mesin akan kalah di mesin lain, dan yang hijau karena beruntung tidak
 * menjaga apa pun. Yang dijaga di sini adalah URUTANNYA — satu-satunya hal
 * yang membuat jendelanya tidak ada. Perilakunya sendiri dijaga di peramban
 * sungguhan oleh cek `F56d` di `scripts/ui-sim.mjs`.
 */

const AKAR = path.join(__dirname, "..", "..", "..");
const SUMBER = readFileSync(path.join(AKAR, "apps/web/src/pages/masterdata.tsx"), "utf8");

/** Isi `update: useMutation({ … })` pada hook bersama `useEntityPage`. */
function badanUpdate(): string {
  const mulai = SUMBER.indexOf("const update = useMutation({");
  expect(mulai, "blok `const update = useMutation({` tidak ditemukan").toBeGreaterThan(-1);
  const akhir = SUMBER.indexOf("const archive = useMutation({", mulai);
  return SUMBER.slice(mulai, akhir);
}

describe("useEntityPage.update menutup lembar sesudah data segar", () => {
  const BADAN = badanUpdate();

  it("menunggu invalidasinya, bukan membiarkan promise-nya menggantung", () => {
    expect(BADAN).toMatch(/await\s+invalidate\(\)/);
  });

  it("menutup lembarnya SESUDAH invalidasi, bukan sebelumnya", () => {
    const posInvalidate = BADAN.indexOf("await invalidate()");
    const posTutup = BADAN.indexOf("setEditing(null)");
    expect(posInvalidate).toBeGreaterThan(-1);
    expect(posTutup).toBeGreaterThan(-1);
    expect(posTutup, "setEditing(null) harus SESUDAH await invalidate()").toBeGreaterThan(posInvalidate);
  });

  /**
   * Menunggu hanya berarti kalau tombolnya ikut menunggu. React Query menahan
   * `isPending` selama promise `onSuccess` belum selesai, dan tombol Simpan
   * memakai `isPending` — tanpa itu, pemakai bisa menekan Simpan dua kali.
   */
  it("tombol Simpan terikat pada isPending mutasinya", () => {
    expect(SUMBER).toMatch(/const busy = create\.isPending \|\| update\.isPending;/);
  });
});

describe("gerbang perilakunya tidak disiasati", () => {
  const UISIM = readFileSync(path.join(AKAR, "scripts/ui-sim.mjs"), "utf8");
  const BLOK = UISIM.slice(
    UISIM.indexOf("F54 termin & batas kredit tersimpan lewat formulir"),
    UISIM.indexOf("F2 kontak bebas galat halaman"),
  );

  /**
   * Fase 56c sempat memuat ulang halaman di sini supaya ceknya hijau. Itu
   * membuat gerbangnya berhenti menjaga cacat yang justru dimaksudkannya —
   * bentuk kegagalan yang paling sulit dilihat, karena hasilnya hijau.
   */
  it("cek F56d membuka lagi formulirnya tanpa memuat ulang halaman", () => {
    expect(BLOK).not.toContain("page.reload(");
  });

  it("cek F56d tidak menunggu medannya terisi (penantian yang tak mungkin selesai)", () => {
    expect(BLOK).not.toMatch(/inputValue\("#k-termin"\)\) === "30"/);
  });
});
