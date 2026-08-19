import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getLang, isi, LANGS, pick, setLang } from "../src/i18n";
import { UI } from "../src/i18n/ui";

describe("i18n core (Fase 13d)", () => {
  it("default bahasa Indonesia di lingkungan tanpa window", () => {
    expect(getLang()).toBe("id");
    expect(LANGS).toEqual(["id", "en"]);
  });

  it("setLang mengubah bahasa aktif", () => {
    setLang("en");
    expect(getLang()).toBe("en");
    setLang("id");
    expect(getLang()).toBe("id");
  });

  it("pick memilih string sesuai bahasa", () => {
    const dual = { id: "Harga", en: "Pricing" };
    expect(pick(dual, "id")).toBe("Harga");
    expect(pick(dual, "en")).toBe("Pricing");
  });

  /**
   * Fase 19q — penjaga ini dulu mengawasi `DICT`, kamus 17 entri yang
   * `useT()`-nya tidak pernah dipanggil siapa pun. Jadi ia menjaga kode mati
   * sementara kamus yang benar-benar dipakai (`UI`, 1.100+ entri) tidak
   * dijaga sama sekali. `DICT` sudah dihapus; penjaganya dipindahkan ke `UI`.
   *
   * `satisfies Record<string, Dual>` sudah memastikan kedua kolom ADA saat
   * kompilasi; yang belum dijamin adalah keduanya TERISI — kolom `en: ""`
   * lolos tsc tapi membuat layar kosong saat bahasa Inggris dipilih.
   */
  it("setiap entri kamus UI punya kedua bahasa terisi", () => {
    const kosong: string[] = [];
    for (const key of Object.keys(UI) as (keyof typeof UI)[]) {
      if (!UI[key].id.trim()) kosong.push(`${key}.id`);
      if (!UI[key].en.trim()) kosong.push(`${key}.en`);
    }
    expect(kosong).toEqual([]);
    expect(Object.keys(UI).length).toBeGreaterThan(1000);
  });
});

/**
 * Fase 33e — judul halaman harus DIAWALI label menunya.
 *
 * Aturannya lahir dari keluhan yang sangat sederhana: pengguna mengeklik
 * "Pengadaan" lalu mendarat di halaman berjudul "Pengadaan (Procurement)",
 * atau mengeklik "Marketplace" lalu melihat "Pesanan Marketplace". Tak satu
 * pun salah, tetapi tiap ketidakcocokan kecil menuntut pembacanya berhenti
 * sejenak untuk memastikan ia tidak salah klik.
 *
 * Judul boleh lebih SPESIFIK daripada menunya — "Dukungan" → "Dukungan &
 * Masukan" tetap langsung dikenali karena kata yang diklik muncul di depan.
 * Yang dilarang adalah judul yang dimulai dengan kata lain.
 *
 * Diperiksa dengan MEMBACA berkas sumbernya sebagai teks, bukan dengan
 * mengimpor `app.tsx`: mengimpornya menarik seluruh kerangka aplikasi (router,
 * ikon, konteks) ke dalam uji yang sebenarnya hanya butuh dua daftar string.
 */
describe("judul halaman vs label menu (Fase 33e)", () => {
  const baca = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

  /**
   * Tiga judul yang MEMANG tidak diawali label menu, dan alasannya masing-
   * masing. Daftar ini sengaja eksplisit: pengecualian yang tidak tertulis
   * berubah menjadi kebocoran diam-diam pada perubahan berikutnya.
   */
  const KECUALI: Record<string, string> = {
    "Umur Piutang": "separuh dari satu menu 'Umur Piutang/Utang'; judulnya ikut pilihan di layar",
    "Umur Utang": "separuh dari satu menu 'Umur Piutang/Utang'; judulnya ikut pilihan di layar",
    Panduan: "tidak ada di sidebar — dibuka lewat tombol bantuan di header",
  };

  it("setiap judul halaman diawali label menunya", () => {
    const app = baca("../src/pages/app.tsx");
    const ph = baca("../src/i18n/pageHeadings.ts");
    const label = [...app.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
    const judul = [...ph.matchAll(/(\w+):\s*\{\s*\n\s*title:\s*\{\s*id:\s*"([^"]+)"/g)].map((m) => m[2]);

    expect(label.length).toBeGreaterThan(40);
    expect(judul.length).toBeGreaterThan(40);

    const menyimpang = judul.filter((t) => !KECUALI[t] && !label.some((n) => t === n || t.startsWith(n)));
    expect(menyimpang, `judul tidak diawali label menu: ${menyimpang.join(" · ")}`).toEqual([]);
  });

  it("judul halaman memakai Title Case, bukan sentence case", () => {
    // Keputusan (c) di docs/glosarium.md: Title Case HANYA untuk judul halaman
    // dan nama modul. Kebalikannya — judul yang setengah sentence case seperti
    // "Migrasi & saldo awal" — terbaca seperti kalimat yang terpotong.
    const ph = baca("../src/i18n/pageHeadings.ts");
    const judul = [...ph.matchAll(/title:\s*\{\s*id:\s*"([^"]+)"/g)].map((m) => m[1]);
    // Kata sambung pendek memang tetap huruf kecil dalam Title Case.
    const sambung = new Set(["dan", "atau", "di", "ke", "dari", "untuk", "&", "per", "vs"]);
    // Nama resmi ditulis apa adanya (keputusan (c) glosarium): "e-Faktur"
    // memang berhuruf kecil di depan, dan membesarkannya justru salah. Yang
    // membedakannya dari kata biasa: ia tetap memuat huruf kapital di dalamnya.
    const salah = judul.filter((t) =>
      t
        .split(" ")
        .slice(1)
        .some((k) => /^[a-z]/.test(k) && !/[A-Z]/.test(k) && !sambung.has(k) && !k.startsWith("(")),
    );
    expect(salah, `judul dengan kata bermula huruf kecil: ${salah.join(" · ")}`).toEqual([]);
  });
});

/**
 * Fase 33h — toast tidak boleh dirakit dari potongan kamus.
 *
 * Pola yang dilarang:
 *
 * ```
 * toast("success", `${u("toastPermintaanPrefix")} ${res.reqNo} ${u("toastDiajukan")}`)
 * ```
 *
 * Ia terlihat sudah diterjemahkan — kedua potongnya memang ada di kamus. Yang
 * tidak terlihat: **urutan katanya terkunci di dalam kode**. Bahasa yang
 * menaruh nomornya di tempat lain tidak punya cara mengubahnya, karena kamus
 * hanya boleh mengisi potongan, bukan menyusun ulang kalimat.
 *
 * Karena itu penjaga ini tidak memeriksa "sudah pakai u() atau belum" — itu
 * justru yang lolos. Yang diperiksa: apakah masih ada TEMPLATE STRING di dalam
 * `toast(...)`. Kalimat utuh berlubang `{0}` + `isi()` adalah gantinya.
 */
describe("toast dwibahasa (Fase 33h)", () => {
  const HALAMAN = new URL("../src/pages", import.meta.url).pathname;

  function tsxDi(dir: string): string[] {
    const keluar: string[] = [];
    for (const nama of readdirSync(dir)) {
      const p = `${dir}/${nama}`;
      if (statSync(p).isDirectory()) keluar.push(...tsxDi(p));
      else if (nama.endsWith(".tsx")) keluar.push(p);
    }
    return keluar;
  }

  it("tidak ada toast yang dirakit dari template string", () => {
    const pelanggar: string[] = [];
    for (const f of tsxDi(HALAMAN)) {
      const isiBerkas = readFileSync(f, "utf8");
      for (const m of isiBerkas.matchAll(/toast\(\s*"(?:success|error)"\s*,\s*(`[^`]*`)/g)) {
        pelanggar.push(`${f.split("/").pop()}: ${m[1].slice(0, 60)}`);
      }
    }
    expect(pelanggar, `toast dirakit dari template: ${pelanggar.join(" · ")}`).toEqual([]);
  });

  it("tidak ada toast berisi literal Indonesia", () => {
    // Literal apa pun di posisi pesan berarti satu bahasa saja. Nama variabel
    // dan pemanggilan fungsi (`u(...)`, `isi(...)`, `err.message`) tidak kena.
    const pelanggar: string[] = [];
    for (const f of tsxDi(HALAMAN)) {
      const isiBerkas = readFileSync(f, "utf8");
      for (const m of isiBerkas.matchAll(/toast\(\s*"(?:success|error)"\s*,\s*"([^"]{4,})"/g)) {
        pelanggar.push(`${f.split("/").pop()}: ${m[1].slice(0, 50)}`);
      }
    }
    expect(pelanggar, `toast berliteral: ${pelanggar.join(" · ")}`).toEqual([]);
  });

  it("isi() menaruh nilai sesuai urutan kata tiap bahasa", () => {
    // Inti alasan `isi()` ada: kalimat yang sama menaruh nilainya di posisi
    // berbeda per bahasa, dan keduanya harus benar.
    expect(isi("Pengajuan {0} {1} hari dicatat.", "cuti", 3)).toBe("Pengajuan cuti 3 hari dicatat.");
    expect(isi("A {1}-day {0} request was recorded.", "leave", 3)).toBe("A 3-day leave request was recorded.");
    // Lubang tanpa nilai dibiarkan apa adanya — lebih baik terlihat di layar
    // daripada berubah diam-diam menjadi "undefined".
    expect(isi("Jurnal {0} diposting.")).toBe("Jurnal {0} diposting.");
  });
});
