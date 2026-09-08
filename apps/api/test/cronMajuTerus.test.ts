import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CONTROL_PLANE_MIGRATIONS } from "@erpindo/db";

/**
 * Tiap jalannya cron harus MEMAJUKAN keadaan (Fase 57a).
 *
 * ## Cacat yang ditutup uji ini
 *
 * `scheduled()` menyapu seluruh tenant di bawah anggaran waktu lunak ~20 detik.
 * Ketika anggarannya habis, gelungnya `break` dan sisanya "dilanjutkan run
 * berikutnya". Kalimat itu benar hanya bila run berikutnya benar-benar sampai
 * ke sisa itu — dan sampai fase ini, tidak ada yang menjaminnya:
 *
 * 1. Keempat sapuan tenant berbatas anggaran TIDAK menyatakan urutan sama
 *    sekali (tanpa `ORDER BY`), jadi urutan barisnya ditentukan mesin
 *    databasenya.
 * 2. Penanda "sudah selesai" ada di KV, yang hanya bisa dibaca satu kunci per
 *    panggilan, dan dibaca DI DALAM gelung — sesudah pemeriksaan anggaran.
 *    Jadi tiap jalan membayar satu pembacaan untuk tiap tenant yang sudah
 *    beres sebelum menyentuh yang belum.
 *
 * Gabungan keduanya: ongkos mencapai pekerjaan yang tersisa tumbuh seiring
 * banyaknya pekerjaan yang sudah selesai, dan yang terdorong ke belakang
 * antrean selalu tenant yang sama. Begitu anggarannya habis, ekor yang sama
 * pula yang terlewat setiap hari.
 *
 * Untuk tugas HARIAN itu berarti tertunda. Untuk tugas BULANAN jendelanya cuma
 * tanggal 1–3, jadi tenant di ekor itu melewatkan bulannya sama sekali:
 * penyusutan tidak diposting, rekap tidak terkirim. Tidak ada galat, tidak ada
 * yang memberi tahu — pekerjaannya hanya tidak pernah terjadi.
 *
 * ## Yang dijaga
 *
 * Ini sifat STRUKTURAL, bukan sesuatu yang bisa ditunggu di uji: ia hanya
 * muncul pada jumlah tenant yang tak mungkin dibuat di suite mana pun. Jadi
 * yang dijaga bentuknya — dan bentuk itulah yang membuat kemajuan pasti.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src/index.ts");
const KODE = readFileSync(SRC, "utf8");

function badanScheduled(): string {
  const awal = KODE.indexOf("async function scheduled(");
  expect(awal, "fungsi scheduled() tidak ditemukan — parser uji ini sudah basi").toBeGreaterThan(-1);
  const buka = KODE.indexOf("{", awal);
  let depth = 1;
  let i = buka + 1;
  while (i < KODE.length && depth > 0) {
    if (KODE[i] === "{") depth++;
    else if (KODE[i] === "}") depth--;
    i++;
  }
  return KODE.slice(buka, i);
}

const BADAN = badanScheduled();

describe("sapuan tenant berbatas anggaran punya urutan yang dinyatakan", () => {
  const cocok = [...BADAN.matchAll(/`(SELECT[^`]*FROM tenants[^`]*)`/g)];

  /**
   * Hanya sapuan yang gelungnya BISA DIPOTONG anggaran yang dituntut berurutan.
   * Sapuan penagihan (langganan habis, susulan tagihan) menyapu semuanya tanpa
   * `overBudget()`, jadi urutannya memang tidak menentukan apa pun — menuntut
   * ORDER BY di sana hanya akan membuat uji ini menagih hal yang tidak ia
   * maksudkan.
   */
  const sapuan = cocok
    .map((m, i) => ({
      kueri: m[1],
      ekor: BADAN.slice(m.index + m[0].length, cocok[i + 1]?.index ?? BADAN.length),
    }))
    .filter((s) => s.ekor.slice(0, 3000).includes("overBudget()"))
    .map((s) => s.kueri);

  it("parser menemukan sapuan berbatas anggaran (regresi parser)", () => {
    expect(sapuan.length).toBeGreaterThanOrEqual(3);
  });

  /**
   * Tanpa urutan yang dinyatakan, "siapa yang terlewat saat anggaran habis"
   * ditentukan mesin database — dan bisa berubah tanpa satu baris kode pun
   * berubah. Sapuan yang bisa dipotong di tengah wajib punya urutan yang pasti.
   */
  it("sapuan yang bisa dipotong anggaran menyatakan ORDER BY", () => {
    const tanpaUrutan = sapuan.filter((q) => !/ORDER BY/i.test(q));
    expect(
      tanpaUrutan,
      "Sapuan tenant berikut tidak menyatakan ORDER BY. Sapuan berbatas anggaran " +
        "yang urutannya tidak pasti membuat 'siapa yang terlewat' ikut tidak pasti.",
    ).toEqual([]);
  });
});

describe("penanda selesai dibaca sekali, bukan per tenant", () => {
  /**
   * Inti perbaikannya. Pembacaan penanda per tenant DI DALAM gelung adalah
   * bentuk yang membuat ongkosnya tumbuh seiring pekerjaan yang sudah selesai.
   */
  it("tidak ada lagi pembacaan penanda per tenant di dalam gelung", () => {
    const kode = BADAN.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    expect(kode).not.toMatch(/await\s+monthlyDone\(/);
  });

  it("set selesai dimuat lewat satu kueri per tugas", () => {
    expect(KODE).toMatch(/SELECT tenant_id FROM cron_marks WHERE task = \? AND period = \?/);
  });

  /**
   * Menyaring SEBELUM gelung adalah yang membuat kemajuan pasti: yang masuk
   * gelung hanya pekerjaan yang benar-benar belum dikerjakan, jadi tiap jalan
   * mengecilkan sisanya.
   */
  it("tiap tugas bulanan menyaring daftarnya sebelum gelung", () => {
    for (const tugas of ["dep", "recap", "drive", "closing"]) {
      expect(BADAN, `tugas ${tugas} belum memuat set selesainya`).toContain(
        `selesaiBulanan(env, "${tugas}"`,
      );
    }
    for (const nama of ["depBelum", "recapBelum", "driveBelum", "closingBelum"]) {
      expect(BADAN, `daftar tersaring ${nama} tidak dipakai`).toContain(`of ${nama}`);
    }
  });
});

describe("gelung harian menggilir gilirannya", () => {
  /**
   * Tugas harian tidak punya penanda "sudah selesai" — idempotensinya di lapis
   * data, bukan pada penanda yang bisa dilewati. Jadi tenant di kepala antrean
   * mengerjakan kerja nyata SETIAP HARI dan menghabiskan anggarannya, sedang
   * ekornya tidak pernah tersentuh. Bukan tertunda: tidak pernah.
   *
   * Menggilir titik mulainya tidak membuat anggarannya cukup; ia membuat
   * kekurangannya dibagi rata — dan itu memang yang bisa dijanjikan sebuah
   * anggaran.
   */
  it("titik mulai tugas harian bergeser tiap hari lalu melingkar", () => {
    expect(BADAN).toMatch(/putaranHarian/);
    expect(BADAN).toMatch(/Math\.floor\(Date\.now\(\) \/ 86_400_000\) % billTenants\.length/);
    // Melingkar: potongan sesudah titik mulai, disambung potongan sebelumnya.
    expect(BADAN).toMatch(/slice\(putaranHarian\)[\s\S]{0,40}slice\(0, putaranHarian\)/);
  });

  it("gelung harian benar-benar memakai antrean yang sudah digilir", () => {
    expect(BADAN).toMatch(/for \(const t of antreanHarian\)/);
  });
});

describe("penanda punya tempat penyimpanan dan pembuangan", () => {
  it("migrasi control-plane membuat tabel cron_marks", () => {
    const migrasi = CONTROL_PLANE_MIGRATIONS.find((m) => m.id === "0019_cron_marks");
    expect(migrasi, "migrasi 0019_cron_marks hilang").toBeDefined();
    expect(migrasi?.statements.join("\n") ?? "").toMatch(/CREATE TABLE cron_marks/);
  });

  /**
   * Di KV tiap kunci punya TTL sendiri, jadi tak ada yang perlu dibuang. Di D1
   * tidak ada yang membuangnya — tabel penanda akan tumbuh selamanya kalau
   * tidak disapu, dan itu kelas cacat tersendiri yang lahir dari perpindahan
   * ini. Sapuannya satu pernyataan per jalan, tidak bergantung jumlah tenant.
   */
  it("penanda lama disapu sekali per jalan, di luar gelung mana pun", () => {
    expect(BADAN).toMatch(/DELETE FROM cron_marks WHERE done_at < \?/);
    const posHapus = BADAN.indexOf("DELETE FROM cron_marks");
    const posGelungPertama = BADAN.indexOf("for (const");
    expect(
      posHapus,
      "sapuan penanda harus di luar gelung tenant — kalau di dalamnya, ongkosnya ikut tumbuh",
    ).toBeLessThan(posGelungPertama);
  });
});
