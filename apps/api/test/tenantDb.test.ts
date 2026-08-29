import { TENANT_SCHEMA_VERSION } from "@erpindo/db";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/env";
import {
  ensureTenantMigrated,
  getTenantDb,
  hitungKapasitasPool,
  KapasitasTenantPenuhError,
  kesiapanD1Dinamis,
  migrateTenantBatch,
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

/**
 * Control-plane tiruan untuk tabel `tenants`.
 *
 * **Menghormati `WHERE schema_version < ?` dan `LIMIT`** (Fase 30d), bukan
 * mengembalikan semua baris apa pun kuerinya. Tiruan yang mengabaikan klausa
 * penyaring akan meluluskan migrasi berbatch yang justru TIDAK berbatch —
 * yaitu persis cacat yang uji ini ada untuk mencegahnya.
 */
function fakeControlPlane(rows: { id: string; slug: string; db_ref: string; schema_version: number }[]) {
  return {
    prepare(sql: string) {
      const handle = (params: unknown[]) => ({
        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (!/FROM tenants/i.test(sql)) return { results: [] };
          let out = [...rows];
          if (/schema_version\s*<\s*\?/i.test(sql)) {
            const batas = params[0] as number;
            out = out.filter((r) => r.schema_version < batas);
          }
          if (/ORDER BY schema_version/i.test(sql)) {
            out.sort((a, b) => a.schema_version - b.schema_version);
          }
          if (/LIMIT\s*\?/i.test(sql)) {
            const limit = params[params.length - 1] as number;
            out = out.slice(0, limit);
          }
          return { results: out as T[] };
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
          if (/COUNT\(\*\)/i.test(sql) && /schema_version\s*<\s*\?/i.test(sql)) {
            const batas = params[0] as number;
            return { n: rows.filter((r) => r.schema_version < batas).length } as T;
          }
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

describe("migrateTenantBatch (Fase 30d)", () => {
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

    const hasil = await migrateTenantBatch(env);
    const pick = (id: string) => {
      const r = hasil.results.find((x) => x.id === id);
      if (!r) throw new Error(`hasil migrasi tenant ${id} tidak ada`);
      return r;
    };

    // Tenant MUTAKHIR tidak muncul di hasil sama sekali — kuerinya menyaringnya
    // di database, bukan loop yang melewatinya. Pada 1.000 tenant, perbedaan
    // itulah yang menentukan apakah pemanggilan ini murah atau mahal.
    expect(hasil.results.some((r) => r.id === "t-fresh")).toBe(false);
    expect(fresh.touched).toBe(false);
    expect(hasil.diproses).toBe(2);

    // Tertinggal: semua migrasi diterapkan + versi control-plane naik.
    expect(pick("t-stale").ok).toBe(true);
    expect(pick("t-stale").applied.length).toBe(TENANT_SCHEMA_VERSION);
    expect(rows.find((r) => r.id === "t-stale")?.schema_version).toBe(TENANT_SCHEMA_VERSION);

    // Gagal: dilaporkan error, versi TIDAK naik (dicoba ulang saat dijalankan lagi).
    expect(pick("t-broken").ok).toBe(false);
    expect(pick("t-broken").error).toMatch(/meledak/);
    expect(rows.find((r) => r.id === "t-broken")?.schema_version).toBe(0);

    // Satu tenant masih tertinggal → BELUM selesai. Kabar baik palsu di sini
    // akan membuat cron berhenti memanggil dan tenant rusak tinggal rusak.
    expect(hasil.gagal).toBe(1);
    expect(hasil.sisa).toBe(1);
    expect(hasil.selesai).toBe(false);
  });

  it("50 tenant: berhenti di batas batch lalu MELANJUTKAN, bukan mengulang", async () => {
    // Inti Fase 30d. Versi lama memutari seluruh tenant dalam satu request;
    // pada jumlah besar itu menembus batas subrequest/CPU Worker dan mati di
    // tengah — sebagian termigrasi, sebagian tidak, tanpa penanda posisi.
    const dbs = new Map<string, ReturnType<typeof fakeTenantDb>>();
    const rows = Array.from({ length: 50 }, (_, i) => {
      const binding = `T${i}`;
      dbs.set(binding, fakeTenantDb());
      return { id: `t${i}`, slug: `tenant-${i}`, db_ref: `binding:${binding}`, schema_version: 0 };
    });
    const env = {
      DB: fakeControlPlane(rows),
      ...Object.fromEntries([...dbs].map(([k, v]) => [k, v.exec])),
    } as unknown as Env;

    const batas = 20;
    const b1 = await migrateTenantBatch(env, batas);
    expect(b1.diproses).toBe(20);
    expect(b1.sisa).toBe(30);
    expect(b1.selesai).toBe(false);

    const b2 = await migrateTenantBatch(env, batas);
    expect(b2.diproses).toBe(20);
    expect(b2.sisa).toBe(10);
    // MELANJUTKAN, bukan mengulang: tak satu pun tenant batch pertama muncul lagi.
    const idBatch1 = new Set(b1.results.map((r) => r.id));
    expect(b2.results.some((r) => idBatch1.has(r.id))).toBe(false);

    const b3 = await migrateTenantBatch(env, batas);
    expect(b3.diproses).toBe(10);
    expect(b3.sisa).toBe(0);
    expect(b3.selesai).toBe(true);

    // Seluruh 50 tenant benar-benar termigrasi, masing-masing TEPAT sekali.
    expect(rows.every((r) => r.schema_version === TENANT_SCHEMA_VERSION)).toBe(true);
    expect(b1.diproses + b2.diproses + b3.diproses).toBe(50);

    // Panggilan sesudah selesai tidak mengerjakan apa pun (idempoten).
    const b4 = await migrateTenantBatch(env, batas);
    expect(b4.diproses).toBe(0);
    expect(b4.selesai).toBe(true);
  });

  it("tenant paling tertinggal ditangani lebih dulu", async () => {
    // Urutan `schema_version` menaik, bukan `created_at`: tenant yang paling
    // jauh tertinggal paling mungkin rusak bila dibiarkan menunggu.
    const dbs = new Map<string, ReturnType<typeof fakeTenantDb>>();
    const versi = [5, 1, 9, 3];
    const rows = versi.map((v, i) => {
      const binding = `V${i}`;
      dbs.set(binding, fakeTenantDb());
      return { id: `t${i}`, slug: `v${v}`, db_ref: `binding:${binding}`, schema_version: v };
    });
    const env = {
      DB: fakeControlPlane(rows),
      ...Object.fromEntries([...dbs].map(([k, v]) => [k, v.exec])),
    } as unknown as Env;

    const hasil = await migrateTenantBatch(env, 2);
    expect(hasil.results.map((r) => r.from)).toEqual([1, 3]);
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

/**
 * Fase 50b — kesiapan D1 dinamis.
 *
 * `provisionTenantDb` sudah melempar untuk mode cloudflare tanpa secret, tapi
 * hanya SAAT pendaftaran. Yang diuji di sini adalah pelaporan dini: keadaan
 * yang sama, terlihat sebelum ada calon pelanggan yang ditolak olehnya.
 */
describe("kesiapanD1Dinamis — salah konfigurasi yang terlihat sebelum menggigit", () => {
  const rahasia = { CLOUDFLARE_API_TOKEN: "t", CLOUDFLARE_ACCOUNT_ID: "a" };

  it("mode lokal tidak melaporkan apa pun — bukan keadaan yang relevan", () => {
    expect(kesiapanD1Dinamis({ TENANT_DB_MODE: "local" } as unknown as Env)).toBeNull();
    // Secret yang kebetulan ada pun tidak membuatnya jadi relevan di mode lokal.
    expect(kesiapanD1Dinamis({ TENANT_DB_MODE: "local", ...rahasia } as unknown as Env)).toBeNull();
  });

  it("mode cloudflare dengan kedua secret dinyatakan siap, tanpa peringatan", () => {
    const k = kesiapanD1Dinamis({ TENANT_DB_MODE: "cloudflare", ...rahasia } as unknown as Env);
    expect(k).toEqual({ siap: true, kurang: [], peringatan: null });
  });

  it("menyebut secret mana yang kurang, bukan sekadar 'konfigurasi salah'", () => {
    const tanpaToken = kesiapanD1Dinamis({
      TENANT_DB_MODE: "cloudflare",
      CLOUDFLARE_ACCOUNT_ID: "a",
    } as unknown as Env);
    expect(tanpaToken?.siap).toBe(false);
    expect(tanpaToken?.kurang).toEqual(["CLOUDFLARE_API_TOKEN"]);
    expect(tanpaToken?.peringatan).toContain("CLOUDFLARE_API_TOKEN");
    expect(tanpaToken?.peringatan).not.toContain("CLOUDFLARE_ACCOUNT_ID");

    const tanpaAkun = kesiapanD1Dinamis({
      TENANT_DB_MODE: "cloudflare",
      CLOUDFLARE_API_TOKEN: "t",
    } as unknown as Env);
    expect(tanpaAkun?.kurang).toEqual(["CLOUDFLARE_ACCOUNT_ID"]);
    expect(tanpaAkun?.peringatan).toContain("CLOUDFLARE_ACCOUNT_ID");
  });

  it("keduanya kurang → keduanya disebut", () => {
    const k = kesiapanD1Dinamis({ TENANT_DB_MODE: "cloudflare" } as unknown as Env);
    expect(k?.kurang).toEqual(["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]);
    expect(k?.peringatan).toContain("CLOUDFLARE_API_TOKEN");
    expect(k?.peringatan).toContain("CLOUDFLARE_ACCOUNT_ID");
  });

  it("peringatannya menyebut jalan keluar, bukan hanya menyatakan rusak", () => {
    const p = kesiapanD1Dinamis({ TENANT_DB_MODE: "cloudflare" } as unknown as Env)?.peringatan ?? "";
    // Dua jalan keluar yang sah: pasang secret, atau turunkan kembali modenya.
    expect(p).toContain("wrangler secret put");
    expect(p).toContain("local");
    // Dan menyatakan luasnya dengan jujur — ini bukan kegagalan sebagian.
    expect(p).toContain("SETIAP");
  });

  it("keadaan yang SAMA menggagalkan provisionTenantDb — pelaporan dini bukan pengganti penjaganya", async () => {
    await expect(
      provisionTenantDb({ TENANT_DB_MODE: "cloudflare" } as unknown as Env, "acme", []),
    ).rejects.toThrow(/CLOUDFLARE_API_TOKEN/);
  });
});
