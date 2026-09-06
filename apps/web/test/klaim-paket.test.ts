import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PAID_PLANS,
  PAKET_MASUK,
  PERIODE_TAGIHAN,
  PLAN_LIMITS,
  PLANS,
  type BatasPaket,
} from "@erpindo/shared";

/**
 * Penjaga klaim-BENTUK: apakah naskah publik masih menggambarkan produknya?
 *
 * ## Kelas cacat yang ditutup uji ini
 *
 * Fase 42b sudah menutup klaim yang menunjuk sesuatu yang TIDAK ADA (medan
 * peragaan tanpa kolomnya). Yang belum pernah ditanyakan siapa pun: klaim yang
 * menunjuk sesuatu yang MASIH ADA, tetapi sudah berubah bentuk.
 *
 * Fase 53a memecah satu paket menjadi tiga. Beranda ikut diperbarui pada 53d.
 * Halaman `/harga` — halaman yang justru dibuat untuk diteruskan ke bagian
 * pengadaan — tidak, dan bertahan sembilan fase dengan berbunyi:
 *
 * - "Satu harga, tanpa biaya tambahan" (harganya tiga);
 * - satu kartu berisi harga paket masuk tanpa menyebut namanya;
 * - "Yang dibatasi — hanya ada satu", lalu menyebut kuota AI 100 per hari
 *   (batasnya lima, dan kuota AI-nya 50/150/400 per paket);
 * - "beberapa badan usaha beserta konsolidasi" di daftar yang termasuk
 *   (lebih dari satu badan usaha hanya ada di paket terbesar).
 *
 * `/llms.txt` — berkas yang ditulis khusus untuk dikutip mesin penjawab —
 * berbunyi "Satu paket, tidak ada tingkatan".
 *
 * Tidak satu pun dari sebelas gerbang bisa melihatnya, dan alasannya sama
 * untuk semuanya: penyapu memeriksa EJAAN dan BENTUK KALIMAT, smoke memeriksa
 * halamannya tersaji dan ber-canonical, ui-sim memeriksa dua angka yang
 * kebetulan tetap benar. Tidak ada yang menanyakan apakah kalimatnya masih
 * menggambarkan datanya.
 *
 * Uji ini menanyakan itu, dengan membaca `PLAN_LIMITS` — bukan daftar tulis
 * tangan yang akan basi persis seperti naskah yang dijaganya.
 */

const AKAR = path.join(__dirname, "..", "..", "..");
const R = (p: string) => path.join(AKAR, p);

/** Naskah yang benar-benar SAMPAI ke pembaca — bukan komentar, bukan uji. */
const NASKAH_TAYANG = [
  "apps/web/src/pages/publik/teks.ts",
  "apps/web/src/pages/publik/index.tsx",
  "apps/web/src/pages/landing/sections.ts",
  "apps/web/src/pages/landing/index.tsx",
  "apps/web/src/i18n/ui.ts",
  "packages/shared/src/landing.ts",
  "apps/api/src/routes/landingSeo.ts",
  "apps/api/src/routes/blog.ts",
];

/**
 * Membuang komentar, menyisakan kode + naskahnya.
 *
 * WAJIB, dan bukan kerapian: berkas-berkas ini penuh komentar yang MENCERITAKAN
 * sejarah paket tunggal ("Fase 30 — paket tunggal", "Dengan satu paket tidak
 * ada penurunan…"). Menyapu berkas mentah akan memerah pada catatan sejarah
 * yang justru harus disimpan, lalu ditenangkan dengan melonggarkan polanya —
 * dan gerbang yang dilonggarkan sekali tidak pernah kembali ketat.
 */
function tanpaKomentar(src: string): string {
  let keluar = "";
  let i = 0;
  let kutip: string | null = null;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (kutip) {
      keluar += c;
      if (c === "\\") {
        keluar += d ?? "";
        i += 2;
        continue;
      }
      if (c === kutip) kutip = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      kutip = c;
      keluar += c;
      i += 1;
      continue;
    }
    if (c === "/" && d === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    keluar += c;
    i += 1;
  }
  return keluar;
}

const NASKAH: [berkas: string, isi: string][] = NASKAH_TAYANG.map((f) => [
  f,
  tanpaKomentar(readFileSync(R(f), "utf8")),
]);

describe("bentuk daftar harga vs naskah publik (Fase 54i)", () => {
  it("berkas naskah terbaca — daftar kosong bukan kelulusan", () => {
    expect(NASKAH.length).toBe(NASKAH_TAYANG.length);
    for (const [f, isi] of NASKAH) expect(isi.length, f).toBeGreaterThan(500);
  });

  /**
   * Kalimat yang menyatakan daftar harga hanya berisi SATU pilihan.
   *
   * Dilarang selama `PLANS` berisi lebih dari satu — dan otomatis diizinkan
   * kembali bila pemilik memang kembali ke satu paket. Aturannya tunduk pada
   * datanya, bukan pada tanggal ditulisnya.
   */
  const UNGKAPAN_TUNGGAL = [
    "satu paket",
    "paket tunggal",
    "satu harga",
    "tidak ada tingkatan",
    "tanpa tingkatan",
    "one plan",
    "single plan",
    "one price",
    "no tiers",
  ];

  it("naskah tidak menyebut daftar harga berisi satu pilihan selagi paketnya lebih dari satu", () => {
    if (PLANS.length <= 1) return;
    const pelanggaran: string[] = [];
    for (const [f, isi] of NASKAH) {
      const rendah = isi.toLowerCase();
      for (const u of UNGKAPAN_TUNGGAL) {
        if (rendah.includes(u)) pelanggaran.push(`${f}: "${u}"`);
      }
    }
    expect(pelanggaran, `PLANS berisi ${PLANS.length} paket`).toEqual([]);
  });

  /**
   * Medan yang MEMBEDAKAN paket wajib terlihat pembeli — atau terdaftar di
   * bawah dengan alasannya.
   *
   * Inilah yang benar-benar menangkap cacat Fase 54i: halaman harga menyebut
   * satu medan pembeda (`aiDailyLimit`) dari lima yang ada, lalu menyatakan
   * batasnya "hanya ada satu". Uji ini menghitung medan pembedanya dari
   * datanya sendiri, jadi medan pembeda BARU pun langsung tertagih.
   */
  const DIUMUMKAN_DI_KARTU: Partial<Record<keyof BatasPaket, string>> = {
    label: "nama paket — tampil di kartu harga, bukan di tabel batas",
    pricePerMonth: "harga — tampil di kartu harga beserta harga tahunannya",
  };

  const BELUM_DIUMUMKAN: Partial<Record<keyof BatasPaket, string>> = {
    // Ketiganya terdefinisi sejak Fase 53a dan diuji urutannya di
    // packages/shared/test/plans.test.ts, tetapi tidak pernah ditampilkan
    // maupun ditegakkan satu baris pun. Sengaja TIDAK ikut diumumkan pada
    // Fase 54i: ketiganya janji layanan (kanal, waktu respons, jam
    // pendampingan) yang tidak punya mekanisme di belakangnya, dan
    // mengumumkannya berarti mengulangi persis kesalahan `maxEntities` yang
    // dihapus Fase 30. Menjanjikannya adalah keputusan pemilik, bukan
    // keputusan yang boleh diambil sambil memperbaiki naskah.
    kanalDukungan: "belum diumumkan — janji layanan tanpa mekanisme (keputusan pemilik)",
    responsJamKerja: "belum diumumkan — janji layanan tanpa mekanisme (keputusan pemilik)",
    pendampinganJamPerTahun: "belum diumumkan — janji layanan tanpa mekanisme (keputusan pemilik)",
  };

  const medanPembeda = (Object.keys(PLAN_LIMITS[PLANS[0]]) as (keyof BatasPaket)[]).filter(
    (k) => new Set(PLANS.map((p) => String(PLAN_LIMITS[p][k]))).size > 1,
  );

  it("ada medan pembeda yang diperiksa — nol medan bukan kelulusan", () => {
    expect(medanPembeda.length).toBeGreaterThan(3);
  });

  it("setiap medan pembeda ditampilkan di halaman harga, atau terdaftar beserta alasannya", () => {
    const hargaSrc = tanpaKomentar(readFileSync(R("apps/web/src/pages/publik/index.tsx"), "utf8"));
    const luput = medanPembeda.filter(
      (k) => !hargaSrc.includes(k) && !(k in DIUMUMKAN_DI_KARTU) && !(k in BELUM_DIUMUMKAN),
    );
    expect(luput, "medan pembeda yang tidak terlihat pembeli dan tidak terdaftar").toEqual([]);
  });

  it("daftar pengecualian tidak menyimpan medan yang sudah tidak membeda", () => {
    // Pengecualian basi sama berbahayanya dengan pengecualian yang salah: ia
    // membuat gerbang tampak berpendapat tentang sesuatu yang sudah tak ada.
    const basi = [...Object.keys(DIUMUMKAN_DI_KARTU), ...Object.keys(BELUM_DIUMUMKAN)].filter(
      (k) => !medanPembeda.includes(k as keyof BatasPaket),
    );
    expect(basi).toEqual([]);
  });

  /**
   * Naskah JUALAN — tidak boleh mengeja satu angka rupiah pun.
   *
   * `apps/web/src/i18n/ui.ts` sengaja di luar daftar ini: kamus aplikasi
   * memang memuat angka contoh yang sah ("mis. 5.000.000" pada placeholder
   * nominal, "1 USD = Rp 16.200" pada penjelasan kurs) yang tidak menjanjikan
   * apa pun kepada pembeli. Satu-satunya angka BERJANJI di sana — klaim
   * jumlah pemeriksaan di layar masuk — dipaksa `scripts/lib/angka-gerbang.mjs`
   * sejak Fase 54i, jadi ia tidak lolos, hanya dijaga di tempat lain.
   */
  const NASKAH_JUALAN = NASKAH.filter(([f]) => !f.endsWith("i18n/ui.ts"));

  it("angka rupiah tidak dieja di naskah jualan — seluruhnya dibaca dari PLAN_LIMITS", () => {
    // Angka yang dieja akan berpisah dari harga yang benar-benar ditagih, dan
    // perpisahan itu tidak berbunyi di gerbang mana pun. Yang boleh dieja
    // hanyalah kalimat berlubang.
    expect(NASKAH_JUALAN.length).toBe(NASKAH_TAYANG.length - 1);
    const pelanggaran: string[] = [];
    for (const [f, isi] of NASKAH_JUALAN) {
      for (const m of isi.matchAll(/\d{1,3}(?:\.\d{3})+/g)) pelanggaran.push(`${f}: ${m[0]}`);
    }
    expect(pelanggaran).toEqual([]);
  });
});

describe("setiap pilihan yang diumumkan bisa dipilih (Fase 54i)", () => {
  const KARTU = tanpaKomentar(
    readFileSync(R("apps/web/src/pages/settings/company.tsx"), "utf8"),
  );
  const KLIEN = tanpaKomentar(readFileSync(R("apps/web/src/api/client.ts"), "utf8"));

  it("paket masuk adalah paket termurah — pemilih naik-saja tetap menjangkau semuanya", () => {
    // Pemilih paket sengaja hanya menawarkan paket yang sedang dipakai ke
    // atas. Itu aman SELAMA pelanggan baru mulai dari yang paling bawah; bila
    // paket masuk pindah ke tengah, paket di bawahnya menjadi tidak terjual
    // lagi tanpa satu baris pun berubah di layarnya.
    expect(PAKET_MASUK).toBe(PAID_PLANS[0]);
  });

  it("checkout mengirim paket DAN periode, bukan mengandalkan bawaan skema", () => {
    // Sampai Fase 54i pemanggilnya hanya mengirim `plan`, sehingga `periode`
    // jatuh ke bawaan "bulanan" di server — dan harga tahunan yang diiklankan
    // beranda tidak bisa dibeli di mana pun.
    expect(KLIEN).toMatch(/billingCheckout:\s*\([^)]*periode/);
    expect(KLIEN).toMatch(/\{\s*plan,\s*periode\s*\}/);
  });

  it("layar langganan menawarkan seluruh periode tagihan", () => {
    expect(KARTU).toMatch(/PERIODE_TAGIHAN\.map\(/);
    expect(PERIODE_TAGIHAN.length).toBeGreaterThan(1);
  });

  it("layar langganan menawarkan paket dari PAID_PLANS, bukan paket yang ditulis mati", () => {
    expect(KARTU).toMatch(/PAID_PLANS/);
    // Tombol beli tidak boleh lagi mengirim paket tenant apa adanya: itulah
    // bentuk lama yang membuat naik paket mustahil dari dalam aplikasi.
    expect(KARTU).not.toMatch(/checkout\.mutate\(tenant\.plan\)/);
  });
});
