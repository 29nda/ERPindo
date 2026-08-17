import { applyMigrations, TENANT_MIGRATIONS, TENANT_SCHEMA_VERSION, type SqlExecutor } from "@erpindo/db";
import type { Env } from "../env";

/**
 * Abstraksi database-per-tenant.
 *
 * - Mode "local" (dev/test): tenant dipetakan ke pool binding D1 statis yang
 *   dideklarasikan di wrangler.jsonc (TENANT_DB_1..N). Binding Workers tidak
 *   bisa dibuat dinamis, jadi pool ini mensimulasikan provisioning nyata.
 * - Mode "cloudflare" (produksi): database D1 dibuat dinamis via REST API dan
 *   di-query lewat endpoint /d1/database/{uuid}/query.
 *
 * Kedua jalur mengembalikan antarmuka SqlExecutor yang sama sehingga kode
 * modul bisnis tidak perlu tahu berjalan di mode mana.
 */

/**
 * Nama binding pool yang DIKENALI. Bukan jumlah slot yang tersedia — kapasitas
 * nyata selalu dihitung dari binding yang benar-benar terpasang di env
 * (`env[name] !== undefined`), sehingga daftar ini boleh lebih panjang daripada
 * yang dideklarasikan sebuah lingkungan.
 *
 * Produksi mendeklarasikan 1–6; config dev menambah 7–10 karena suite uji
 * menjelajahi lebih banyak perusahaan daripada yang dipakai produksi
 * (lihat scripts/make-dev-config.mjs).
 */
const LOCAL_POOL = [
  "TENANT_DB_1",
  "TENANT_DB_2",
  "TENANT_DB_3",
  "TENANT_DB_4",
  "TENANT_DB_5",
  "TENANT_DB_6",
  "TENANT_DB_7",
  "TENANT_DB_8",
  "TENANT_DB_9",
  "TENANT_DB_10",
] as const;

type CfD1QueryResult = {
  success: boolean;
  errors: { message: string }[];
  result: { results: unknown[]; success: boolean }[];
};

/** Driver produksi: eksekusi SQL ke D1 dinamis via Cloudflare REST API. */
class HttpD1Executor implements SqlExecutor {
  constructor(
    private accountId: string,
    private apiToken: string,
    private databaseId: string,
  ) {}

  prepare(query: string) {
    const exec = async <T>(params: unknown[]): Promise<{ results: T[] }> => {
      const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql: query, params }),
      });
      const body = (await res.json()) as CfD1QueryResult;
      if (!res.ok || !body.success) {
        const msg = body.errors?.map((e) => e.message).join("; ") || res.statusText;
        throw new Error(`Query D1 tenant gagal: ${msg}`);
      }
      return { results: (body.result?.[0]?.results ?? []) as T[] };
    };

    // `.first()` melengkapi antarmuka D1 nyata (mode lokal) agar kode yang
    // memakainya tetap berjalan identik di mode cloudflare — ambil baris pertama
    // dalam SATU round-trip REST (bukan tarik semua lalu iris di sisi Worker).
    const first = async <T>(params: unknown[]): Promise<T | null> => {
      const { results } = await exec<T>(params);
      return results.length > 0 ? (results[0] as T) : null;
    };

    const statement = (params: unknown[]) => ({
      all: <T = unknown>() => exec<T>(params),
      run: () => exec(params),
      first: <T = unknown>() => first<T>(params),
    });

    return {
      bind: (...values: unknown[]) => statement(values),
      all: <T = unknown>() => exec<T>([]),
      run: () => exec([]),
      first: <T = unknown>() => first<T>([]),
    };
  }
}

export function getTenantDb(env: Env, dbRef: string): SqlExecutor {
  const [kind, ref] = dbRef.split(":", 2);
  if (kind === "binding") {
    const db = (env as unknown as Record<string, D1Database | undefined>)[ref!];
    if (!db) throw new Error(`Binding database tenant '${ref}' tidak ditemukan`);
    return db as unknown as SqlExecutor;
  }
  if (kind === "uuid") {
    if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
      throw new Error("CLOUDFLARE_API_TOKEN/ACCOUNT_ID belum dikonfigurasi untuk akses tenant produksi");
    }
    return new HttpD1Executor(env.CLOUDFLARE_ACCOUNT_ID, env.CLOUDFLARE_API_TOKEN, ref!);
  }
  throw new Error(`db_ref tidak dikenal: ${dbRef}`);
}

/**
 * Kapasitas pendaftaran habis: seluruh binding pool `TENANT_DB_*` sudah terpakai.
 *
 * Dibedakan dari galat lain karena **bukan kerusakan** — ini batas kapasitas
 * yang memang diketahui, dan pendaftar berhak tahu bedanya. Tanpa kelas
 * tersendiri, perusahaan ke-7 mendapat 500 "Terjadi kesalahan pada server."
 * dari penangan galat global: pendaftarnya menyangka aplikasinya rusak, dan
 * pemiliknya tidak punya petunjuk apa pun bahwa yang perlu dilakukan hanyalah
 * menyalakan D1 dinamis (`TENANT_DB_MODE=cloudflare`).
 */
export class KapasitasTenantPenuhError extends Error {
  constructor() {
    super("Pool database tenant habis — nyalakan TENANT_DB_MODE=cloudflare atau tambah binding TENANT_DB_*.");
    this.name = "KapasitasTenantPenuhError";
  }
}

/**
 * Apakah database pool ini masih benar-benar kosong?
 *
 * Binding pool dipakai ulang begitu tenant lamanya dihapus dari control-plane,
 * dan di situlah bahayanya: `applyMigrations` melewati migrasi yang sudah
 * tercatat di `_migrations` dan **tidak pernah mengosongkan tabel**. Jadi slot
 * yang dibebaskan hanya dengan menghapus baris `tenants` akan diserahkan ke
 * perusahaan berikutnya **berisi seluruh data perusahaan sebelumnya** — faktur,
 * kontak, jurnal, gaji. Pendaftar baru login dan langsung melihat pembukuan
 * orang lain.
 *
 * Cacat itu laten: ia menjadi hidup tepat pada saat seseorang melakukan
 * perbaikan yang paling masuk akal (membebaskan slot dengan `DELETE FROM
 * tenants`). Karena itu penjaganya ada di kode, bukan cuma di prosedur ops.
 *
 * **`_cf_KV` WAJIB dikecualikan.** D1 sungguhan membuat tabel internal itu di
 * SETIAP database, termasuk yang belum pernah dipakai; skema kita tidak pernah
 * menyentuhnya. Tanpa pengecualian ini penjaga akan membaca setiap slot
 * produksi sebagai "kotor" dan menolak SELURUH pendaftaran — penjaga yang
 * dibangun untuk melindungi data justru mematikan penjualan.
 *
 * Yang membuatnya berbahaya: gerbang lokal **tidak bisa melihatnya**. Suite uji
 * dan smoke berjalan di atas D1 lokal (miniflare) yang tidak membuat `_cf_KV`,
 * jadi ceknya hijau sementara produksi mati. Karena itu pengecualiannya
 * dikunci uji tersendiri yang meniru bentuk produksi, bukan bentuk lokal.
 */
async function poolMasihKosong(db: SqlExecutor): Promise<boolean> {
  const baris = await db
    .prepare(
      `SELECT name FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\'
        LIMIT 1`,
    )
    .first<{ name: string }>();
  return baris === null;
}

/**
 * Kapasitas pool mode lokal, dipisah antara slot yang benar-benar siap pakai dan
 * slot yang bebas tetapi masih berisi data tenant lama.
 *
 * Dipakai `provisionTenantDb` untuk memilih slot, dan `/api/admin/infra` untuk
 * memperingatkan pemilik **sebelum** pendaftar gagal, bukan sesudah.
 */
export async function hitungKapasitasPool(
  env: Env,
  usedRefs: string[],
): Promise<{ total: number; terpakai: number; bebasBersih: number; bebasKotor: string[] }> {
  const used = new Set(usedRefs);
  const terpasang = LOCAL_POOL.filter((name) => (env as unknown as Record<string, unknown>)[name] !== undefined);
  const bebas = terpasang.filter((name) => !used.has(`binding:${name}`));

  const bebasKotor: string[] = [];
  for (const name of bebas) {
    if (!(await poolMasihKosong(getTenantDb(env, `binding:${name}`)))) bebasKotor.push(name);
  }

  return {
    total: terpasang.length,
    terpakai: terpasang.length - bebas.length,
    bebasBersih: bebas.length - bebasKotor.length,
    bebasKotor,
  };
}

/**
 * Sediakan database untuk tenant baru dan jalankan migrasi skema tenant.
 * Mengembalikan db_ref yang disimpan di tabel tenants.
 *
 * Melempar `KapasitasTenantPenuhError` bila pool mode lokal sudah penuh — atau
 * bila slot yang tersisa semuanya masih kotor (lihat {@link poolMasihKosong}).
 */
export async function provisionTenantDb(env: Env, tenantSlug: string, usedRefs: string[]): Promise<string> {
  let dbRef: string;

  if (env.TENANT_DB_MODE === "cloudflare") {
    if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
      throw new Error("Mode cloudflare butuh CLOUDFLARE_API_TOKEN dan CLOUDFLARE_ACCOUNT_ID");
    }
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: `erpindo-tenant-${tenantSlug}` }),
      },
    );
    const body = (await res.json()) as { success: boolean; result?: { uuid: string }; errors?: { message: string }[] };
    if (!res.ok || !body.success || !body.result) {
      throw new Error(`Gagal membuat database tenant: ${body.errors?.map((e) => e.message).join("; ")}`);
    }
    dbRef = `uuid:${body.result.uuid}`;
  } else {
    const used = new Set(usedRefs);
    const kandidat = LOCAL_POOL.filter((name) => {
      const bound = (env as unknown as Record<string, unknown>)[name] !== undefined;
      return bound && !used.has(`binding:${name}`);
    });

    // Slot kotor DILEWATI, bukan dijadikan galat: bila TENANT_DB_2 masih berisi
    // data tenant lama sementara TENANT_DB_4 bersih, pendaftaran harus tetap
    // berhasil lewat yang bersih. Baru bila tak satu pun slot bersih tersisa,
    // kapasitas dinyatakan penuh — jawaban yang jujur, karena memang tak ada
    // slot yang boleh dipakai.
    let free: string | undefined;
    for (const name of kandidat) {
      if (await poolMasihKosong(getTenantDb(env, `binding:${name}`))) {
        free = name;
        break;
      }
      // Terlihat di log Workers; pemilik juga melihatnya di Admin → Infra.
      console.error(
        `[pool] ${name} bebas tetapi MASIH BERISI data tenant lama — dilewati. ` +
          `Kosongkan dengan scripts/bersihkan-tenant.mjs sebelum dipakai ulang.`,
      );
    }
    if (!free) throw new KapasitasTenantPenuhError();
    dbRef = `binding:${free}`;
  }

  const db = getTenantDb(env, dbRef);
  await applyMigrations(db, TENANT_MIGRATIONS);
  return dbRef;
}

/**
 * Penanda "tenant ini belum punya database". Kolom `db_ref` bertipe NOT NULL,
 * jadi string kosong dipakai sebagai sentinel alih-alih NULL — mengubah
 * kolomnya butuh membangun ulang tabel di SQLite, dan tidak sepadan.
 */
export const TANPA_DB = "";

/**
 * Buatkan database untuk tenant yang belum punya — **idempoten**.
 *
 * Sejak Fase 24, pendaftaran TIDAK lagi membuat database: tenant lahir
 * berstatus `provisioning` dengan `db_ref` kosong, dan databasenya baru dibuat
 * ketika pembayaran pertama terkonfirmasi. Itulah yang membuat pendaftar yang
 * batal bayar tidak memakan satu pun slot.
 *
 * Dipanggil dari DUA tempat, dan keduanya perlu:
 * - **webhook Xendit**, jalur normal;
 * - **`GET /billing`**, sebagai pemulihan-diri. Webhook bisa tiba saat pool
 *   sedang penuh — pelanggan sudah membayar tetapi tidak bisa diberi database.
 *   Menyerah di situ berarti pelanggan membayar dan tidak mendapat apa pun,
 *   jadi percobaannya diulang tiap kali ia membuka halaman langganan.
 *
 * Idempotensi ditegakkan oleh `UPDATE … WHERE db_ref = ''`: bila dua webhook
 * tiba bersamaan, hanya satu yang menang dan yang kalah tidak menimpa apa pun.
 */
export async function pastikanTenantTerprovisi(
  env: Env,
  tenantId: string,
): Promise<{ ok: boolean; alasan?: "kapasitas-penuh" | "tenant-hilang" }> {
  const t = await env.DB.prepare(`SELECT id, name, slug, db_ref FROM tenants WHERE id = ?`)
    .bind(tenantId)
    .first<{ id: string; name: string; slug: string; db_ref: string }>();
  if (!t) return { ok: false, alasan: "tenant-hilang" };
  if (t.db_ref !== TANPA_DB) return { ok: true }; // sudah punya — tidak ada kerja

  const { results: refRows } = await env.DB.prepare(`SELECT db_ref FROM tenants`).all<{ db_ref: string }>();
  let dbRef: string;
  try {
    dbRef = await provisionTenantDb(
      env,
      t.slug,
      refRows.map((r) => r.db_ref),
    );
  } catch (err) {
    if (err instanceof KapasitasTenantPenuhError) return { ok: false, alasan: "kapasitas-penuh" };
    throw err;
  }

  const now = new Date().toISOString();
  const res = await env.DB.prepare(
    `UPDATE tenants SET db_ref = ?, schema_version = ? WHERE id = ? AND db_ref = ''`,
  )
    .bind(dbRef, TENANT_SCHEMA_VERSION, tenantId)
    .run();
  // Lomba: tenant sudah diprovisi request lain sepersekian detik lalu.
  if ((res as { meta?: { changes?: number } }).meta?.changes === 0) return { ok: true };

  // Nama tampilan awal — dulu ditulis saat registrasi, ikut pindah ke sini
  // karena saat registrasi belum ada database untuk menuliskannya.
  await getTenantDb(env, dbRef)
    .prepare(`INSERT INTO settings (key, value, updated_at) VALUES ('display_name', ?, ?)`)
    .bind(t.name, now)
    .run();

  return { ok: true };
}

/**
 * Pastikan database sebuah tenant berada di versi skema terkini.
 *
 * Ini menutup celah kapasitas/kompatibilitas utama sebelum Fase 11: dulu
 * `applyMigrations` hanya dijalankan SEKALI saat provisioning, sehingga tenant
 * lama TIDAK pernah menerima migrasi baru yang ditambahkan pada rilis berikut.
 * Fungsi ini dipanggil "malas" saat tenant diakses (middleware) dan borongan
 * lewat {@link migrateAllTenants} (cron/endpoint admin).
 *
 * Aman dipanggil di setiap request: bila `schemaVersion` sudah mutakhir, ia
 * langsung kembali tanpa menyentuh database tenant. `applyMigrations` sendiri
 * idempoten (mencatat id di tabel `_migrations`), jadi dua request paralel yang
 * sama-sama memicu migrasi tidak akan merusak apa pun. Mengembalikan versi
 * terbaru tenant tersebut.
 */
export async function ensureTenantMigrated(
  env: Env,
  tenant: { id: string; dbRef: string; schemaVersion: number },
): Promise<number> {
  if (tenant.schemaVersion >= TENANT_SCHEMA_VERSION) return tenant.schemaVersion;
  const db = getTenantDb(env, tenant.dbRef);
  const applied = await applyMigrations(db, TENANT_MIGRATIONS);
  await env.DB.prepare(`UPDATE tenants SET schema_version = ? WHERE id = ?`)
    .bind(TENANT_SCHEMA_VERSION, tenant.id)
    .run();
  if (applied.length > 0) {
    console.log(`[db] tenant ${tenant.id} migrasi diterapkan (v${tenant.schemaVersion}→v${TENANT_SCHEMA_VERSION}): ${applied.join(", ")}`);
  }
  return TENANT_SCHEMA_VERSION;
}

/**
 * Berapa tenant yang dimigrasi dalam SATU pemanggilan.
 *
 * Angkanya konservatif dengan sengaja. Di mode `cloudflare` setiap tenant
 * berarti beberapa panggilan REST ke D1 — satu per pernyataan migrasi yang
 * tertinggal — jadi biaya per tenant bukan satu subrequest melainkan belasan.
 * 25 menjaga pemanggilan terburuk tetap jauh di bawah batas 10.000 subrequest
 * dan CPU 5 menit, sambil tetap menuntaskan 1.000 tenant dalam 40 putaran cron.
 */
export const BATCH_MIGRASI = 25;

export type TenantMigrationResult = {
  id: string;
  slug: string;
  from: number;
  to: number;
  applied: string[];
  ok: boolean;
  error?: string;
};

export type MigrasiBatchResult = {
  /** Tenant yang BENAR-BENAR disentuh pemanggilan ini. */
  diproses: number;
  berhasil: number;
  gagal: number;
  /** Tenant yang masih tertinggal SESUDAH batch ini. */
  sisa: number;
  /** `true` bila tidak ada lagi yang tertinggal — pemanggil boleh berhenti. */
  selesai: boolean;
  schemaVersion: number;
  results: TenantMigrationResult[];
};

/**
 * Terapkan migrasi tenant yang tertinggal, **satu batch per pemanggilan**.
 *
 * ## Cacat yang membuat fungsi ini ditulis ulang (Fase 30d)
 *
 * Versi sebelumnya memutari **seluruh** tenant dalam **satu** request. Pada
 * enam tenant itu tak terasa; pada 1.000 tenant di mode `cloudflare` batas
 * 10.000 subrequest dan CPU 5 menit **pasti** tertembus — dan cara ia gagal
 * adalah yang terburuk: migrasi mati di tengah, sebagian tenant termigrasi dan
 * sebagian tidak, tanpa ada yang tahu batasnya di mana.
 *
 * Dua perubahan, dan keduanya perlu:
 *
 * 1. **Kueri hanya mengambil yang tertinggal**, dibatasi `LIMIT`. Versi lama
 *    menarik SEMUA tenant lalu melewati yang sudah mutakhir di dalam loop —
 *    pekerjaan yang sia-sia tepat pada jumlah yang membuatnya mahal.
 * 2. **Hasil hanya memuat yang disentuh.** Versi lama mengembalikan satu baris
 *    per tenant termasuk yang tidak diapa-apakan, sehingga respons `/admin/
 *    migrate-tenants` tumbuh linear terhadap jumlah pelanggan.
 *
 * Urutannya `schema_version` menaik: tenant yang paling tertinggal ditangani
 * lebih dulu, karena merekalah yang paling mungkin rusak bila dibiarkan.
 *
 * Tetap resumable per-tenant seperti sebelumnya: versi hanya dinaikkan saat
 * sukses, dan tiap tenant di-try/catch sendiri sehingga satu kegagalan tidak
 * menghentikan sisanya.
 */
export async function migrateTenantBatch(env: Env, batas = BATCH_MIGRASI): Promise<MigrasiBatchResult> {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, db_ref, schema_version FROM tenants
     WHERE schema_version < ?
     ORDER BY schema_version, created_at
     LIMIT ?`,
  )
    .bind(TENANT_SCHEMA_VERSION, batas)
    .all<{ id: string; slug: string; db_ref: string; schema_version: number }>();

  const out: TenantMigrationResult[] = [];
  for (const t of results) {
    const from = t.schema_version;
    try {
      const db = getTenantDb(env, t.db_ref);
      const applied = await applyMigrations(db, TENANT_MIGRATIONS);
      await env.DB.prepare(`UPDATE tenants SET schema_version = ? WHERE id = ?`)
        .bind(TENANT_SCHEMA_VERSION, t.id)
        .run();
      out.push({ id: t.id, slug: t.slug, from, to: TENANT_SCHEMA_VERSION, applied, ok: true });
    } catch (err) {
      out.push({ id: t.id, slug: t.slug, from, to: from, applied: [], ok: false, error: (err as Error).message });
    }
  }

  // Sisa dihitung SESUDAH batch berjalan, bukan diperkirakan dari selisih —
  // tenant yang gagal tetap terhitung tertinggal, dan itu memang benar.
  const sisaRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM tenants WHERE schema_version < ?`)
    .bind(TENANT_SCHEMA_VERSION)
    .first<{ n: number }>();
  const sisa = sisaRow?.n ?? 0;
  const gagal = out.filter((r) => !r.ok).length;

  return {
    diproses: out.length,
    berhasil: out.length - gagal,
    gagal,
    sisa,
    // "Selesai" berarti tak ada lagi yang tertinggal. Bila SEMUA sisa adalah
    // tenant yang gagal, `selesai` tetap false — dan itu disengaja: pemanggil
    // harus tahu ada yang belum beres, bukan disuguhi kabar baik palsu.
    selesai: sisa === 0,
    schemaVersion: TENANT_SCHEMA_VERSION,
    results: out,
  };
}

export { TENANT_SCHEMA_VERSION };
