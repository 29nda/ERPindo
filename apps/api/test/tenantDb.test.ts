import { TENANT_SCHEMA_VERSION } from "@erpindo/db";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/env";
import {
  ensureTenantMigrated,
  getTenantDb,
  hitungKapasitasPool,
  KapasitasTenantPenuhError,
  migrateAllTenants,
  pastikanTenantTerprovisi,
  provisionTenantDb,
} from "../src/lib/tenantDb";

/**
 * Fase 11a — jalur produksi (mode cloudflare) & auto-migrasi tenant.
 *
 * Mode cloudflare (getTenantDb "uuid:") tak tersentuh smoke lokal, jadi diuji
 * di sini dengan fetch tiruan. Orkestrasi migrasi diuji dengan database tiruan
 * in-memory yang meniru semantik tabel `_migrations`.
 */

// --- HttpD1Executor via getTenantDb("uuid:...") + fetch tiruan ---------------

function cfResponse(rows: unknown[]) {
  return new Response(JSON.stringify({ success: true, errors: [], result: [{ results: rows, success: true }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const cfEnv = { CLOUDFLARE_API_TOKEN: "tok", CLOUDFLARE_ACCOUNT_ID: "acc" } as unknown as Env;

describe("HttpD1Executor (mode cloudflare)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("all() memetakan hasil D1 REST + mengirim sql & params", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(cfResponse([{ id: "a" }, { id: "b" }]));
    const db = getTenantDb(cfEnv, "uuid:db-123");
    const { results } = await db.prepare("SELECT id FROM x WHERE y = ?").bind(7).all<{ id: string }>();
    expect(results).toEqual([{ id: "a" }, { id: "b" }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/accounts/acc/d1/database/db-123/query");
    expect(JSON.parse(String(init?.body))).toEqual({ sql: "SELECT id FROM x WHERE y = ?", params: [7] });
  });

  it("first() mengembalikan baris pertama, atau null bila kosong", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(cfResponse([{ id: "a" }, { id: "b" }]));
    const db = getTenantDb(cfEnv, "uuid:db-123");
    expect(await db.prepare("SELECT id FROM x").bind().first<{ id: string }>()).toEqual({ id: "a" });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(cfResponse([]));
    expect(await db.prepare("SELECT id FROM x").bind().first()).toBeNull();
  });

  it("melempar error yang jelas saat D1 REST gagal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false, errors: [{ message: "boom" }], result: [] }), { status: 500 }),
    );
    const db = getTenantDb(cfEnv, "uuid:db-123");
    await expect(db.prepare("SELECT 1").all()).rejects.toThrow(/boom/);
  });

  it("uuid: tanpa kredensial → error konfigurasi", () => {
    expect(() => getTenantDb({} as Env, "uuid:db-1")).toThrow(/CLOUDFLARE_API_TOKEN/);
  });
});

// --- Database tiruan: meniru semantik tabel `_migrations` --------------------

/** Executor tiruan yang cukup untuk applyMigrations (idempoten). */
function fakeTenantDb(opts: { seeded?: string[]; failOnRun?: boolean } = {}) {
  const migrations = new Set(opts.seeded ?? []);
  let touched = false;
  const exec = {
    prepare(sql: string) {
      const handle = (params: unknown[]) => ({
        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (/SELECT id FROM _migrations/i.test(sql)) {
            return { results: [...migrations].map((id) => ({ id })) as T[] };
          }
          return { results: [] };
        },
        async run() {
          touched = true;
          if (opts.failOnRun) throw new Error("tenant db meledak");
          if (/INSERT INTO _migrations/i.test(sql)) migrations.add(String(params[0]));
          return {};
        },
        async first<T = unknown>(): Promise<T | null> {
          return null;
        },
      });
      return {
        bind: (...p: unknown[]) => handle(p),
        all: <T = unknown>() => handle([]).all<T>(),
        run: () => handle([]).run(),
        first: <T = unknown>() => handle([]).first<T>(),
      };
    },
  };
  return { exec, get touched() { return touched; }, get count() { return migrations.size; } };
}

/** Control-plane tiruan: hanya tabel `tenants` (SELECT semua + UPDATE versi). */
function fakeControlPlane(rows: { id: string; slug: string; db_ref: string; schema_version: number }[]) {
  return {
    prepare(sql: string) {
      const handle = (params: unknown[]) => ({
        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (/FROM tenants/i.test(sql)) return { results: rows as T[] };
          return { results: [] };
        },
        async run() {
          if (/UPDATE tenants SET schema_version/i.test(sql)) {
            const [version, id] = params as [number, string];
            const row = rows.find((r) => r.id === id);
            if (row) row.schema_version = version;
          }
          return {};
        },
        async first<T = unknown>(): Promise<T | null> {
          return null;
        },
      });
      return {
        bind: (...p: unknown[]) => handle(p),
        all: <T = unknown>() => handle([]).all<T>(),
        run: () => handle([]).run(),
        first: <T = unknown>() => handle([]).first<T>(),
      };
    },
  };
}

describe("ensureTenantMigrated", () => {
  it("tenant mutakhir → langsung kembali, database tak disentuh", async () => {
    const tenantDb = fakeTenantDb();
    const env = { DB: fakeControlPlane([]), TDB: tenantDb.exec } as unknown as Env;
    const v = await ensureTenantMigrated(env, { id: "t1", dbRef: "binding:TDB", schemaVersion: TENANT_SCHEMA_VERSION });
    expect(v).toBe(TENANT_SCHEMA_VERSION);
    expect(tenantDb.touched).toBe(false);
  });

  it("tenant tertinggal → migrasi diterapkan + versi dinaikkan di control-plane", async () => {
    const tenantDb = fakeTenantDb();
    const rows = [{ id: "t1", slug: "toko", db_ref: "binding:TDB", schema_version: 0 }];
    const env = { DB: fakeControlPlane(rows), TDB: tenantDb.exec } as unknown as Env;
    const v = await ensureTenantMigrated(env, { id: "t1", dbRef: "binding:TDB", schemaVersion: 0 });
    expect(v).toBe(TENANT_SCHEMA_VERSION);
    expect(tenantDb.count).toBe(TENANT_SCHEMA_VERSION); // semua migrasi tercatat
    expect(rows[0]?.schema_version).toBe(TENANT_SCHEMA_VERSION);
  });
});

describe("migrateAllTenants", () => {
  it("mutakhir dilewati, tertinggal dimigrasi, gagal terisolasi (resumable)", async () => {
    const fresh = fakeTenantDb();
    const stale = fakeTenantDb();
    const broken = fakeTenantDb({ failOnRun: true });
    const rows = [
      { id: "t-fresh", slug: "fresh", db_ref: "binding:FRESH", schema_version: TENANT_SCHEMA_VERSION },
      { id: "t-stale", slug: "stale", db_ref: "binding:STALE", schema_version: 0 },
      { id: "t-broken", slug: "broken", db_ref: "binding:BROKEN", schema_version: 0 },
    ];
    const env = {
      DB: fakeControlPlane(rows),
      FRESH: fresh.exec,
      STALE: stale.exec,
      BROKEN: broken.exec,
    } as unknown as Env;

    const results = await migrateAllTenants(env);
    const pick = (id: string) => {
      const r = results.find((x) => x.id === id);
      if (!r) throw new Error(`hasil migrasi tenant ${id} tidak ada`);
      return r;
    };

    // Mutakhir: dilewati tanpa menyentuh DB.
    expect(pick("t-fresh").ok).toBe(true);
    expect(pick("t-fresh").applied).toEqual([]);
    expect(fresh.touched).toBe(false);

    // Tertinggal: semua migrasi diterapkan + versi control-plane naik.
    expect(pick("t-stale").ok).toBe(true);
    expect(pick("t-stale").applied.length).toBe(TENANT_SCHEMA_VERSION);
    expect(rows.find((r) => r.id === "t-stale")?.schema_version).toBe(TENANT_SCHEMA_VERSION);

    // Gagal: dilaporkan error, versi TIDAK naik (dicoba ulang saat dijalankan lagi).
    expect(pick("t-broken").ok).toBe(false);
    expect(pick("t-broken").error).toMatch(/meledak/);
    expect(rows.find((r) => r.id === "t-broken")?.schema_version).toBe(0);
  });
});

// --- Kapasitas pool tenant (pengerasan pra-peluncuran) -----------------------
//
// Pool mode lokal punya 6 binding. Perusahaan ke-7 dulu melempar `Error` biasa,
// yang ditangkap penangan galat global dan dijawab 500 "Terjadi kesalahan pada
// server." — pendaftarnya menyangka aplikasinya rusak, padahal ini batas
// kapasitas yang memang diketahui. Kelas galat tersendiri membuat route bisa
// membedakannya dan menjawab 503 yang bisa ditindaklanjuti.

describe("provisionTenantDb — kapasitas pool", () => {
  /** Env mode lokal dengan `jumlah` binding pool terpasang. */
  function envPool(jumlah: number): Env {
    const env: Record<string, unknown> = { TENANT_DB_MODE: "local" };
    for (let i = 1; i <= jumlah; i++) {
      env[`TENANT_DB_${i}`] = {
        prepare: () => ({
          bind: () => ({ all: async () => ({ results: [] }), run: async () => ({}), first: async () => null }),
          all: async () => ({ results: [] }),
          run: async () => ({}),
          first: async () => null,
        }),
      };
    }
    return env as unknown as Env;
  }

  it("pool masih ada sisa → mengembalikan binding yang belum terpakai", async () => {
    const ref = await provisionTenantDb(envPool(2), "toko-baru", ["binding:TENANT_DB_1"]);
    expect(ref).toBe("binding:TENANT_DB_2");
  });

  it("pool habis → KapasitasTenantPenuhError, bukan Error biasa", async () => {
    const env = envPool(2);
    const terpakai = ["binding:TENANT_DB_1", "binding:TENANT_DB_2"];
    await expect(provisionTenantDb(env, "toko-ketiga", terpakai)).rejects.toBeInstanceOf(
      KapasitasTenantPenuhError,
    );
  });

  // Penjaga yang sebenarnya: route membedakan kapasitas penuh dari kerusakan
  // lewat `instanceof`. Kalau kelasnya diganti jadi Error biasa, pemeriksaan itu
  // diam-diam gagal dan pendaftar kembali mendapat 500.
  it("kapasitas penuh TIDAK terbaca sebagai galat lain (instanceof tetap tajam)", async () => {
    const err = await provisionTenantDb(envPool(1), "x", ["binding:TENANT_DB_1"]).catch((e) => e);
    expect(err).toBeInstanceOf(KapasitasTenantPenuhError);
    expect(err).toBeInstanceOf(Error);
    expect(String(err.message)).toMatch(/TENANT_DB_MODE=cloudflare/);
  });
});

// --- Penjaga slot bekas: kebocoran data lintas-tenant ------------------------
//
// `applyMigrations` melewati migrasi yang sudah tercatat di `_migrations` dan
// TIDAK PERNAH mengosongkan tabel. Jadi slot yang dibebaskan hanya dengan
// `DELETE FROM tenants` diserahkan ke pendaftar berikutnya berisi seluruh data
// perusahaan sebelumnya. Cacat ini laten — ia menjadi hidup tepat saat seseorang
// membebaskan slot dengan cara yang paling masuk akal.

describe("provisionTenantDb — slot bekas yang masih berisi data", () => {
  /**
   * Env pool yang tiap bindingnya bisa disetel "kotor" (punya tabel tenant) atau
   * bersih. Kekotoran dijawab lewat `sqlite_master`, persis seperti kode nyata
   * memeriksanya.
   */
  function envPoolDenganKotor(jumlah: number, kotor: number[]): Env {
    const env: Record<string, unknown> = { TENANT_DB_MODE: "local" };
    for (let i = 1; i <= jumlah; i++) {
      const isiTabel = kotor.includes(i) ? { name: "invoices" } : null;
      env[`TENANT_DB_${i}`] = {
        prepare: (sql: string) => {
          const jawab = sql.includes("sqlite_master") ? isiTabel : null;
          return {
            bind: () => ({ all: async () => ({ results: [] }), run: async () => ({}), first: async () => jawab }),
            all: async () => ({ results: [] }),
            run: async () => ({}),
            first: async () => jawab,
          };
        },
      };
    }
    return env as unknown as Env;
  }

  it("slot kotor DILEWATI, slot bersih berikutnya yang dipakai", async () => {
    // TENANT_DB_1 terpakai, TENANT_DB_2 kotor bekas tenant lama, TENANT_DB_3 bersih.
    const ref = await provisionTenantDb(envPoolDenganKotor(3, [2]), "toko-baru", ["binding:TENANT_DB_1"]);
    expect(ref).toBe("binding:TENANT_DB_3");
  });

  it("semua slot bebas ternyata kotor → kapasitas penuh, BUKAN diserahkan berisi data lama", async () => {
    await expect(
      provisionTenantDb(envPoolDenganKotor(2, [2]), "toko-baru", ["binding:TENANT_DB_1"]),
    ).rejects.toBeInstanceOf(KapasitasTenantPenuhError);
  });

  it("pool yang benar-benar kosong tetap dipakai seperti biasa (tidak ada regresi)", async () => {
    const ref = await provisionTenantDb(envPoolDenganKotor(2, []), "toko-baru", ["binding:TENANT_DB_1"]);
    expect(ref).toBe("binding:TENANT_DB_2");
  });

  /**
   * D1 SUNGGUHAN membuat `_cf_KV` di setiap database, termasuk yang belum
   * pernah dipakai; D1 lokal (miniflare) TIDAK. Kalau penjaga menghitungnya
   * sebagai isi, setiap slot produksi terbaca "kotor" dan SELURUH pendaftaran
   * ditolak — penjaga anti-kebocoran berubah jadi pemadaman total.
   *
   * Uji ini meniru bentuk PRODUKSI dengan sengaja, karena bentuk lokal justru
   * yang tidak bisa menangkapnya: seluruh gerbang repo ini berjalan di atas D1
   * lokal yang selalu bersih dari `_cf_KV`.
   */
  it("_cf_KV milik D1 TIDAK dihitung sebagai isi (kalau dihitung, produksi mati total)", async () => {
    const env: Record<string, unknown> = { TENANT_DB_MODE: "local" };
    env.TENANT_DB_1 = {
      prepare: (sql: string) => {
        // Meniru SQLite: satu-satunya tabel di database ini adalah `_cf_KV`,
        // jadi kueri yang MENGECUALIKAN `_cf_%` tidak mengembalikan apa pun.
        // Backslash ESCAPE dilepas dulu — pola aslinya ditulis `\_cf\_%`.
        const mengecualikanCf = sql.replace(/\\/g, "").includes("_cf_%");
        const jawab = mengecualikanCf ? null : { name: "_cf_KV" };
        return {
          bind: () => ({ all: async () => ({ results: [] }), run: async () => ({}), first: async () => jawab }),
          all: async () => ({ results: [] }),
          run: async () => ({}),
          first: async () => jawab,
        };
      },
    };
    const ref = await provisionTenantDb(env as unknown as Env, "toko-baru", []);
    expect(ref).toBe("binding:TENANT_DB_1");
  });

  it("hitungKapasitasPool memisahkan slot bersih dari slot kotor", async () => {
    const kapasitas = await hitungKapasitasPool(envPoolDenganKotor(4, [3]), ["binding:TENANT_DB_1"]);
    expect(kapasitas).toEqual({
      total: 4,
      terpakai: 1,
      bebasBersih: 2,
      bebasKotor: ["TENANT_DB_3"],
    });
  });
});

// --- Fase 24: database dibuat saat pembayaran, bukan saat pendaftaran -------
//
// Registrasi tidak lagi memanggil provisionTenantDb, jadi helper inilah
// satu-satunya jalur yang mengubah "akun terdaftar" jadi "perusahaan yang bisa
// dipakai". Ia dipanggil dari webhook Midtrans DAN dari GET /billing sebagai
// pemulihan-diri — dua pemanggil untuk satu tenant, jadi idempotensinya bukan
// kehalusan melainkan syarat.

describe("pastikanTenantTerprovisi", () => {
  /** Control-plane tiruan dengan satu tenant + satu slot pool. */
  function bikin(dbRefAwal: string) {
    const tenant = { id: "t1", name: "PT Uji", slug: "pt-uji", db_ref: dbRefAwal };
    let migrasiDijalankan = 0;
    const poolDb = {
      prepare(sql: string) {
        if (/CREATE TABLE|INSERT INTO settings/.test(sql)) migrasiDijalankan++;
        const stmt = {
          all: async () => ({ results: [] }),
          run: async () => ({}),
          first: async () => null,
        };
        return { bind: () => stmt, ...stmt };
      },
    };
    const env = {
      TENANT_DB_MODE: "local",
      TENANT_DB_1: poolDb,
      DB: {
        prepare(sql: string) {
          const jalankan = (params: unknown[]) => {
            if (/UPDATE tenants SET db_ref = \?/.test(sql)) {
              // Meniru `WHERE … AND db_ref = ''` milik SQL sungguhannya.
              if (tenant.db_ref === "") {
                tenant.db_ref = String(params[0]);
                return Promise.resolve({ meta: { changes: 1 } });
              }
              return Promise.resolve({ meta: { changes: 0 } });
            }
            return Promise.resolve({ meta: { changes: 0 } });
          };
          const ambil = () =>
            /FROM tenants WHERE id = \?/.test(sql) ? Promise.resolve({ ...tenant }) : Promise.resolve(null);
          const semua = () => Promise.resolve({ results: [{ db_ref: tenant.db_ref }] });
          return {
            bind: (...p: unknown[]) => ({ run: () => jalankan(p), first: ambil, all: semua }),
            run: () => jalankan([]),
            first: ambil,
            all: semua,
          };
        },
      },
    } as unknown as Env;
    return { env, tenant, migrasi: () => migrasiDijalankan };
  }

  it("tenant tanpa database → dibuatkan, db_ref terisi", async () => {
    const { env, tenant } = bikin("");
    const hasil = await pastikanTenantTerprovisi(env, "t1");
    expect(hasil.ok).toBe(true);
    expect(tenant.db_ref).toBe("binding:TENANT_DB_1");
  });

  /**
   * INI penjaga idempotensi yang sebenarnya. Webhook Midtrans bisa tiba lebih
   * dari sekali, dan `GET /billing` memanggil helper ini tiap kali halaman
   * langganan dibuka — tanpa pemeriksaan `db_ref`, tiap kunjungan akan
   * memakan satu slot pool baru dan meninggalkan database yatim.
   */
  it("tenant yang SUDAH punya database tidak diprovisi ulang", async () => {
    const { env, tenant, migrasi } = bikin("binding:TENANT_DB_1");
    const hasil = await pastikanTenantTerprovisi(env, "t1");
    expect(hasil.ok).toBe(true);
    expect(tenant.db_ref).toBe("binding:TENANT_DB_1");
    expect(migrasi()).toBe(0); // tak satu pun pernyataan skema dijalankan
  });

  it("dipanggil dua kali berturut-turut hanya membuat database sekali", async () => {
    const { env, migrasi } = bikin("");
    await pastikanTenantTerprovisi(env, "t1");
    const setelahPertama = migrasi();
    await pastikanTenantTerprovisi(env, "t1");
    expect(migrasi()).toBe(setelahPertama);
  });
});
