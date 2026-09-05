import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TENANT_SCHEMA_VERSION } from "@erpindo/db";
import { describe, expect, it } from "vitest";
import { gerbangTenant } from "../src/lib/gerbangTenant";

/**
 * Gerbang tenant (Fase 54e).
 *
 * Aplikasi punya DUA pintu masuk konteks tenant — sesi cookie dan API key
 * Bearer — dan keduanya menyematkan konteks yang sama persis. Sebelum fase ini
 * aturan keadaan perusahaan hanya ditulis di pintu sesi, sehingga pintu API key
 * melewatkan mode baca-saja, perusahaan tanpa database, dan auto-migrasi. Bukan
 * karena diputuskan begitu; karena tidak ada satu tempat yang memaksa keduanya
 * sepakat.
 *
 * Uji ini menjaga dua hal sekaligus: perilaku gerbangnya, dan kenyataan bahwa
 * tiap pintu benar-benar melewatinya.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");

/** Env tiruan; DB tidak tersentuh selama skemanya tidak tertinggal. */
const env = {} as never;

const tenantSehat = {
  id: "t-1",
  db_ref: "TENANT_DB_1",
  status: "active",
  schema_version: TENANT_SCHEMA_VERSION,
};

describe("gerbangTenant memutuskan berdasarkan KEADAAN perusahaan", () => {
  it("perusahaan aktif dan sehat dilewatkan, baca maupun tulis", async () => {
    expect(await gerbangTenant(env, tenantSehat, "GET")).toBeNull();
    expect(await gerbangTenant(env, tenantSehat, "POST")).toBeNull();
  });

  it("perusahaan ditangguhkan ditolak 402, termasuk untuk membaca", async () => {
    const tolak = await gerbangTenant(env, { ...tenantSehat, status: "suspended" }, "GET");
    expect(tolak?.status).toBe(402);
    expect(tolak?.detail).toBe("suspended");
  });

  it("menunggak: MEMBACA tetap boleh, MENULIS ditolak 402", async () => {
    const menunggak = { ...tenantSehat, status: "past_due" };
    expect(await gerbangTenant(env, menunggak, "GET")).toBeNull();
    for (const metode of ["POST", "PATCH", "PUT", "DELETE"]) {
      const tolak = await gerbangTenant(env, menunggak, metode);
      expect(tolak?.status, `${metode} lolos mode baca-saja`).toBe(402);
      expect(tolak?.detail).toBe("baca-saja");
    }
  });

  it("perusahaan tanpa database ditolak sebelum ada yang mencoba membukanya", async () => {
    // Menolak SEMUA method termasuk GET: tidak ada data untuk dibaca, dan
    // getTenantDb(env, "") akan melempar sebelum sempat menjelaskan apa pun.
    const belumBayar = await gerbangTenant(env, { ...tenantSehat, db_ref: "", status: "provisioning" }, "GET");
    expect(belumBayar?.status).toBe(402);
    expect(belumBayar?.detail).toBe("belum-berlangganan");

    // Sudah bayar tetapi databasenya belum sempat dibuat — pesannya berbeda,
    // karena yang harus dilakukan pelanggan juga berbeda (menunggu, bukan bayar).
    const sedangDisiapkan = await gerbangTenant(env, { ...tenantSehat, db_ref: "", status: "active" }, "GET");
    expect(sedangDisiapkan?.detail).toBe("sedang-disiapkan");
  });

  it("ditangguhkan didahulukan daripada tanpa-database (pesan yang paling menjelaskan)", async () => {
    const tolak = await gerbangTenant(env, { ...tenantSehat, db_ref: "", status: "suspended" }, "GET");
    expect(tolak?.detail).toBe("suspended");
  });
});

describe("setiap pintu masuk konteks tenant melewati gerbang itu", () => {
  /**
   * Penjaga struktural, sengaja berupa pembacaan berkas.
   *
   * Yang dijaga bukan isi fungsinya melainkan JUMLAH pintunya: menyematkan
   * `c.set("tenant", …)` di tempat ketiga tanpa memanggil gerbangnya adalah
   * persis cara cacat ini lahir pertama kali — dan tidak ada uji perilaku yang
   * bisa melihat pintu yang belum ditulis.
   */
  const penyemat = cariPenyemat(SRC);

  it("pintunya tepat dua, dan keduanya yang memang dikenal", () => {
    expect(penyemat.sort()).toEqual(["middleware/auth.ts", "routes/publicApi.ts"]);
  });

  it.each(penyemat)("%s memanggil gerbangTenant", (berkas) => {
    expect(readFileSync(join(SRC, berkas), "utf8"), `${berkas} menyemat konteks tenant tanpa gerbang`).toContain(
      "gerbangTenant(",
    );
  });
});

describe("jalur yang memeriksa keanggotaan sendiri tetap menegakkan kebijakan keamanan", () => {
  /**
   * Ada rute ber-`:tenantId` yang SENGAJA tidak memakai `requireTenantRole` —
   * billing dan penagihan pelanggan — supaya perusahaan yang menunggak tetap
   * bisa membayar dan menagih. Konsekuensinya: keduanya juga melewatkan
   * pembatasan IP dan kewajiban 2FA, karena keduanya ikut menumpang middleware
   * yang mereka hindari itu.
   *
   * Daftarnya diturunkan dari kodenya sendiri, bukan ditulis tangan: rute
   * ber-`:tenantId` tanpa penjaga peran wajib berada di berkas yang memanggil
   * `kebijakanKeamanan`. Rute keempat yang lahir dengan pola yang sama akan
   * tertangkap tanpa ada yang perlu ingat memperbarui uji ini.
   */
  const REGISTRASI = /\.(get|post|put|patch|delete)\(\s*(`[^`]*`|"[^"]*")\s*,([\s\S]*?)(?:async\s*\(|\(c\)\s*=>)/g;

  const berkasTanpaPenjagaPeran = new Set<string>();
  for (const nama of readdirSync(join(SRC, "routes"))) {
    if (!nama.endsWith(".ts")) continue;
    const isi = readFileSync(join(SRC, "routes", nama), "utf8");
    let m: RegExpExecArray | null;
    REGISTRASI.lastIndex = 0;
    while ((m = REGISTRASI.exec(isi)) !== null) {
      const jalur = m[2] ?? "";
      const middleware = m[3] ?? "";
      if (!jalur.includes(":tenantId")) continue;
      if (middleware.includes("requireTenantRole") || middleware.includes("requireApiKey")) continue;
      berkasTanpaPenjagaPeran.add(nama);
    }
  }

  it("berkasnya tepat yang sudah dikenal — billing dan penagihan", () => {
    expect([...berkasTanpaPenjagaPeran].sort()).toEqual(["billing.ts", "collections.ts"]);
  });

  it.each([...berkasTanpaPenjagaPeran].sort())("%s memanggil kebijakanKeamanan", (nama) => {
    expect(
      readFileSync(join(SRC, "routes", nama), "utf8"),
      `${nama} memeriksa keanggotaan sendiri tanpa menegakkan kebijakan keamanan perusahaan`,
    ).toContain("kebijakanKeamanan(");
  });
});

/** Semua berkas di `src/` yang menyematkan konteks tenant. */
function cariPenyemat(akar: string): string[] {
  const hasil: string[] = [];
  const telusuri = (rel: string) => {
    for (const nama of readdirSync(join(akar, rel))) {
      const anak = rel ? `${rel}/${nama}` : nama;
      if (statSync(join(akar, anak)).isDirectory()) telusuri(anak);
      else if (nama.endsWith(".ts") && readFileSync(join(akar, anak), "utf8").includes('c.set("tenant"')) {
        hasil.push(anak);
      }
    }
  };
  telusuri("");
  return hasil;
}
