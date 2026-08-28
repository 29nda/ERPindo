import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { newTenantDb } from "./helpers/memdb";

/**
 * Kode akun tidak boleh bertabrakan (Fase 48).
 *
 * ## Kelas cacat yang ditutup uji ini
 *
 * Fase 46 memposting PPh 22 ke kode `1-1300` dengan maksud membuat akun baru
 * "Uang Muka PPh 22". Kode itu sudah dipakai **Persediaan Barang** di COA
 * bawaan, sehingga `ensureAccountByCode` menemukan akun yang sudah ada dan
 * mengembalikannya. Akibatnya pungutan pajak mendarat di persediaan:
 * nilai persediaan menggelembung, kredit pajak tidak pernah tercatat.
 *
 * Yang membuatnya sunyi: cek smoke-nya menuntut akunnya "bertipe aset", dan
 * Persediaan memang aset. Tipe yang benar bukan bukti akun yang benar.
 *
 * Uji ini membaca kode akun yang ditulis di seluruh kode sumber, lalu
 * memastikan tidak ada satu pun yang menabrak COA bawaan dengan NAMA berbeda.
 */
const AKAR = path.join(__dirname, "../../..");

/** Kode akun sistem beserta nama yang dikehendaki pemanggilnya. */
function ensureCallsDiKodeSumber(): { code: string; name: string; file: string }[] {
  const berkas = [
    "apps/api/src/routes/tax.ts",
    "apps/api/src/routes/payroll.ts",
    "apps/api/src/lib/commercePosting.ts",
  ];
  const keluar: { code: string; name: string; file: string }[] = [];
  for (const f of berkas) {
    const src = readFileSync(path.join(AKAR, f), "utf8");
    // `ensureAccountByCode(db, KODE, "Nama Akun", "asset")` — konstanta kodenya
    // diselesaikan dari deklarasi `const NAMA = "x-xxxx";` di berkas yang sama.
    const konst = new Map<string, string>();
    for (const m of src.matchAll(/const\s+([A-Z_0-9]+)\s*=\s*"(\d-\d{4})"/g)) konst.set(m[1], m[2]);
    for (const m of src.matchAll(/ensureAccountByCode\(\s*db,\s*([A-Za-z_0-9"]+),\s*"([^"]+)"/g)) {
      const kode = m[1].startsWith('"') ? m[1].slice(1, -1) : konst.get(m[1]);
      if (kode) keluar.push({ code: kode, name: m[2], file: f });
    }
  }
  return keluar;
}

describe("kode akun sistem", () => {
  it("uji ini benar-benar menemukan pemanggilan — daftar kosong bukan kelulusan", () => {
    expect(ensureCallsDiKodeSumber().length).toBeGreaterThan(2);
  });

  it("tidak ada kode yang menabrak akun COA bawaan dengan nama berbeda", async () => {
    const db = await newTenantDb();
    const { results } = await db
      .prepare(`SELECT code, name FROM accounts`)
      .all<{ code: string; name: string }>();
    const bawaan = new Map(results.map((r) => [r.code, r.name]));

    const tabrakan = ensureCallsDiKodeSumber()
      .filter((c) => bawaan.has(c.code) && bawaan.get(c.code) !== c.name)
      .map((c) => `${c.file}: ${c.code} dimaksudkan "${c.name}" tetapi sudah dipakai "${bawaan.get(c.code)}"`);
    expect(tabrakan).toEqual([]);
  });

  it("dua pemanggilan berbeda tidak memakai kode yang sama untuk nama berbeda", () => {
    const perKode = new Map<string, Set<string>>();
    for (const c of ensureCallsDiKodeSumber()) {
      const set = perKode.get(c.code) ?? new Set<string>();
      set.add(c.name);
      perKode.set(c.code, set);
    }
    const bentrok = [...perKode.entries()]
      .filter(([, nama]) => nama.size > 1)
      .map(([kode, nama]) => `${kode}: ${[...nama].join(" vs ")}`);
    expect(bentrok).toEqual([]);
  });
});
