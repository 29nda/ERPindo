import { DatabaseSync } from "node:sqlite";
import { applyMigrations, TENANT_MIGRATIONS, type SqlExecutor } from "@erpindo/db";

/**
 * Harness uji: database SQLite in-memory (Node built-in `node:sqlite`) yang
 * membungkus antarmuka `SqlExecutor` D1 sehingga mesin akuntansi nyata
 * (commercePosting / accounting) bisa diuji end-to-end tanpa wrangler.
 * Skema dibangun dari migrasi tenant asli (`TENANT_MIGRATIONS`) — termasuk seed
 * COA + gudang UTAMA — jadi uji ini menempel pada skema produksi.
 */

function normParam(p: unknown): unknown {
  if (p === undefined) return null;
  if (p === true) return 1;
  if (p === false) return 0;
  return p;
}

/** Bungkus DatabaseSync sebagai SqlExecutor bergaya D1 (prepare/bind/all/run/first). */
export function wrapSqlite(raw: DatabaseSync): SqlExecutor {
  return {
    prepare(query: string) {
      const stmt = raw.prepare(query);
      const make = (params: unknown[]) => {
        const p = params.map(normParam);
        return {
          async all<T = unknown>(): Promise<{ results: T[] }> {
            return { results: stmt.all(...(p as never[])) as T[] };
          },
          async run(): Promise<unknown> {
            const info = stmt.run(...(p as never[]));
            return { meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
          },
          async first<T = unknown>(): Promise<T | null> {
            return (stmt.get(...(p as never[])) as T | undefined) ?? null;
          },
        };
      };
      return {
        bind: (...values: unknown[]) => make(values),
        all: <T = unknown>() => make([]).all<T>(),
        run: () => make([]).run(),
        first: <T = unknown>() => make([]).first<T>(),
      };
    },
    /**
     * Padanan `D1Database.batch`. Ditambahkan Fase 26c karena jalur reset sandi
     * memakainya, dan uji token sekali-pakai menguji jalur itu apa adanya lewat
     * HTTP — bukan dengan memanggil fungsi internalnya.
     *
     * Dijalankan berurutan, BUKAN paralel: D1 menjalankan batch sebagai satu
     * rangkaian, dan menjalankannya paralel di sini akan menyembunyikan cacat
     * urutan yang justru ingin ditangkap uji.
     */
    async batch<T = unknown>(stmts: { run(): Promise<unknown> }[]): Promise<T[]> {
      const hasil: unknown[] = [];
      for (const st of stmts) hasil.push(await st.run());
      return hasil as T[];
    },
  } as SqlExecutor;
}

/**
 * Bungkus `SqlExecutor` agar SETIAP operasi menunda satu putaran event-loop
 * sebelum dijalankan — meniru D1, yang setiap panggilannya melintasi jaringan.
 *
 * Kenapa ini perlu (Fase 26c): `node:sqlite` bersifat SINKRON. Pola
 * baca-lalu-tulis yang rusak — SELECT, periksa, UPDATE — karena itu tidak pernah
 * benar-benar berselang-seling di harness biasa: tidak ada titik `await` yang
 * menyerahkan kendali di antara ketiganya, sehingga dua permintaan "bersamaan"
 * tetap berjalan berurutan dan uji balapan LULUS untuk kode yang sebenarnya
 * rusak.
 *
 * Itu ditemukan dengan cara yang benar: menyabotase perbaikannya lalu melihat
 * uji balapan tetap hijau. Uji yang tidak bisa gagal tidak menjaga apa pun.
 * Dengan penundaan ini, dua permintaan benar-benar berselang-seling dan pola
 * lama gagal seperti seharusnya.
 */
export function wrapSqliteLambat(raw: DatabaseSync): SqlExecutor {
  const dasar = wrapSqlite(raw);
  const tunda = () => new Promise<void>((r) => setTimeout(r, 0));
  const bungkusStmt = (st: {
    all<T>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
    first<T>(): Promise<T | null>;
  }) => ({
    async all<T = unknown>() {
      await tunda();
      return st.all<T>();
    },
    async run() {
      await tunda();
      return st.run();
    },
    async first<T = unknown>() {
      await tunda();
      return st.first<T>();
    },
  });
  return {
    prepare(query: string) {
      const p = dasar.prepare(query);
      return {
        bind: (...v: unknown[]) => bungkusStmt(p.bind(...v)),
        ...bungkusStmt(p),
      };
    },
    async batch<T = unknown>(stmts: { run(): Promise<unknown> }[]): Promise<T[]> {
      const hasil: unknown[] = [];
      for (const st of stmts) hasil.push(await st.run());
      return hasil as T[];
    },
  } as SqlExecutor;
}

/** Buat database tenant baru dengan seluruh migrasi diterapkan. */
export async function newTenantDb(): Promise<SqlExecutor> {
  // FK dimatikan agar setara D1 (yang tak menegakkan FK secara default) — mesin
  // ini bersandar pada validasi lapis aplikasi, bukan FK database.
  const raw = new DatabaseSync(":memory:", { enableForeignKeyConstraints: false });
  const db = wrapSqlite(raw);
  await applyMigrations(db, TENANT_MIGRATIONS);
  return db;
}

/** Gudang utama yang selalu ada dari seed migrasi 0002. */
export const WH_UTAMA = "wh-utama";

/** Seed satu kontak; kembalikan id. */
export async function seedContact(
  db: SqlExecutor,
  opts: { type?: "customer" | "supplier" | "both"; name?: string } = {},
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO contacts (id, type, name) VALUES (?, ?, ?)`)
    .bind(id, opts.type ?? "customer", opts.name ?? "Kontak Uji")
    .run();
  return id;
}

/** Seed satu produk; kembalikan id. */
export async function seedProduct(
  db: SqlExecutor,
  opts: { sku?: string; name?: string; sellPrice?: number; buyPrice?: number; isService?: boolean } = {},
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO products (id, sku, name, unit, sell_price, buy_price, is_service) VALUES (?, ?, ?, 'pcs', ?, ?, ?)`)
    .bind(id, opts.sku ?? `SKU-${id.slice(0, 8)}`, opts.name ?? "Produk Uji", opts.sellPrice ?? 10000, opts.buyPrice ?? 6000, opts.isService ? 1 : 0)
    .run();
  return id;
}

/** Seed satu aset tetap; kembalikan id. */
export async function seedAsset(
  db: SqlExecutor,
  opts: {
    cost: number;
    lifeMonths: number;
    residual?: number;
    accumulated?: number;
    name?: string;
    acquisitionDate?: string;
    status?: "active" | "disposed";
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO fixed_assets
         (id, name, acquisition_date, acquisition_cost, useful_life_months, residual_value, accumulated_depreciation, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'u1')`,
    )
    .bind(
      id,
      opts.name ?? "Aset Uji",
      opts.acquisitionDate ?? "2026-01-01",
      opts.cost,
      opts.lifeMonths,
      opts.residual ?? 0,
      opts.accumulated ?? 0,
      opts.status ?? "active",
    )
    .run();
  return id;
}

/** Akumulasi penyusutan tercatat pada satu aset. */
export async function assetAccumulated(db: SqlExecutor, assetId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT accumulated_depreciation AS acc FROM fixed_assets WHERE id = ?`)
    .bind(assetId)
    .first<{ acc: number }>();
  return row?.acc ?? 0;
}

/** Jumlah debit & kredit sebuah jurnal (untuk asersi keseimbangan). */
export async function journalTotals(db: SqlExecutor, entryId: string): Promise<{ debit: number; credit: number }> {
  const row = await db
    .prepare(`SELECT COALESCE(SUM(debit),0) AS d, COALESCE(SUM(credit),0) AS c FROM journal_lines WHERE entry_id = ?`)
    .bind(entryId)
    .first<{ d: number; c: number }>();
  return { debit: row?.d ?? 0, credit: row?.c ?? 0 };
}

/** Level stok satu produk di gudang utama. */
export async function stockLevel(db: SqlExecutor, productId: string, warehouseId = WH_UTAMA): Promise<{ qty: number; avgCost: number }> {
  const row = await db
    .prepare(`SELECT qty, avg_cost FROM stock_levels WHERE product_id = ? AND warehouse_id = ?`)
    .bind(productId, warehouseId)
    .first<{ qty: number; avg_cost: number }>();
  return { qty: row?.qty ?? 0, avgCost: row?.avg_cost ?? 0 };
}
