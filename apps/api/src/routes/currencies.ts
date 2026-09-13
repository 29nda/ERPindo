import { bacaKursReferensi, currencySchema, type ApiCurrency } from "@erpindo/shared";
import type { SqlExecutor } from "@erpindo/db";
import { Hono } from "hono";
import type { AppEnv, Env } from "../env";
import { audit } from "../lib/audit";
import { getTenantDb } from "../lib/tenantDb";
import { requireAuth, requireTenantRole } from "../middleware/auth";
import { clientIp } from "./auth";

export type HasilSegarkanKurs =
  | { status: "mati" }
  | { status: "gagal"; alasan: string }
  | { status: "diperbarui"; diperbarui: number; dilewati: string[]; diabaikan: string[] };

/** Kurs referensi yang sudah diambil & diurai — sama untuk SEMUA tenant. */
export type KursReferensi =
  | { status: "mati" }
  | { status: "gagal"; alasan: string }
  | { status: "ok"; kurs: Record<string, number>; diabaikan: string[] };

/** Batas waktu pengambilan sumber kurs. Sama dengan batas pengiriman webhook. */
const BATAS_AMBIL_MS = 10_000;

/**
 * Ambil kurs referensi harian dari sumber luar (Fase 22b, dipisah Fase 57c).
 *
 * Tiga keputusan yang menentukan bentuk fungsi ini:
 *
 * 1. **Sumber absen = fitur mati, bukan galat.** Sama seperti binding opsional
 *    lain di repo ini: tanpa `KURS_SOURCE_URL` cron melewatinya diam-diam.
 * 2. **Kegagalan tidak menyentuh kurs lama.** Sumber mati, balasan bukan JSON,
 *    atau basis salah → kurs kemarin tetap dipakai. Kurs yang usang masih bisa
 *    dipertanggungjawabkan; kurs yang tergantikan angka sampah tidak.
 * 3. **SEKALI per jalannya cron, bukan sekali per tenant** (Fase 57c). Ini kurs
 *    REFERENSI: isinya sama untuk semua orang, dan hanya penulisannya yang
 *    per tenant. Sebelumnya pengambilannya duduk di dalam gelung harian, jadi
 *    seribu perusahaan berarti seribu permintaan identik ke penyedia yang sama
 *    setiap hari — cukup untuk dianggap penyalahgunaan dan diblokir, dan
 *    seribu kesempatan menggantung.
 *
 * Batas waktunya ditambahkan pada fase yang sama. Tanpa itu satu sumber yang
 * menggantung menahan gelung harian tanpa batas — dan pemeriksaan anggaran
 * cron ada DI ANTARA iterasi, bukan di tengah satu permintaan, jadi ia tidak
 * bisa menolong.
 */
export async function ambilKursReferensi(env: Env): Promise<KursReferensi> {
  const override = env.KURS_PAYLOAD_OVERRIDE;
  if (!override && !env.KURS_SOURCE_URL) return { status: "mati" };

  let payload: unknown;
  if (override) {
    try {
      payload = JSON.parse(override);
    } catch {
      return { status: "gagal", alasan: "KURS_PAYLOAD_OVERRIDE bukan JSON yang sah." };
    }
  } else {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), BATAS_AMBIL_MS);
    try {
      const resp = await fetch(env.KURS_SOURCE_URL!, {
        headers: { accept: "application/json" },
        signal: ctrl.signal,
      });
      if (!resp.ok) return { status: "gagal", alasan: `Sumber kurs menjawab HTTP ${resp.status}.` };
      payload = await resp.json();
    } catch (err) {
      return { status: "gagal", alasan: `Sumber kurs tidak bisa dihubungi: ${(err as Error).message}` };
    } finally {
      clearTimeout(timer);
    }
  }

  const dibaca = bacaKursReferensi(payload);
  if (!dibaca.ok) return { status: "gagal", alasan: dibaca.alasan };
  return { status: "ok", kurs: dibaca.kurs, diabaikan: dibaca.diabaikan };
}

/**
 * Terapkan kurs referensi ke master kurs SATU tenant (Fase 57c).
 *
 * HANYA memperbarui mata uang yang SUDAH terdaftar di tenant itu. Sumber kurs
 * mengembalikan 150+ mata uang; menyisipkan semuanya akan membanjiri daftar
 * milik pemilik warung yang cuma memakai USD. Kode yang tak dikenal dilaporkan
 * lewat `dilewati`, bukan diam-diam dibuang.
 */
export async function terapkanKursReferensi(
  db: SqlExecutor,
  ref: Extract<KursReferensi, { status: "ok" }>,
): Promise<{ diperbarui: number; dilewati: string[] }> {
  const { results: terdaftar } = await db
    .prepare(`SELECT code FROM currencies WHERE is_base = 0`)
    .all<{ code: string }>();
  const kodeTenant = new Set(terdaftar.map((r) => r.code.toUpperCase()));

  const dilewati: string[] = [];
  let diperbarui = 0;
  for (const [kode, nilai] of Object.entries(ref.kurs)) {
    if (!kodeTenant.has(kode)) {
      dilewati.push(kode);
      continue;
    }
    await db
      .prepare(`UPDATE currencies SET rate = ?, updated_at = datetime('now') WHERE code = ?`)
      .bind(nilai, kode)
      .run();
    diperbarui++;
  }
  return { diperbarui, dilewati };
}

/**
 * Ambil lalu terapkan untuk satu tenant. Dipakai jalur non-cron; cron memakai
 * `ambilKursReferensi` sekali lalu `terapkanKursReferensi` per tenant.
 */
export async function segarkanKursReferensi(
  env: Env,
  db: SqlExecutor,
): Promise<HasilSegarkanKurs> {
  const ref = await ambilKursReferensi(env);
  if (ref.status !== "ok") return ref;
  const hasil = await terapkanKursReferensi(db, ref);
  return { status: "diperbarui", ...hasil, diabaikan: ref.diabaikan };
}

/**
 * Master mata uang & kurs (Fase 2r). IDR adalah mata uang basis (kurs 1, tak
 * bisa diubah). Kurs valas dipakai saat memposting faktur — nilai buku selalu
 * dikonversi ke IDR; selisih kurs saat pelunasan dijurnal otomatis.
 */

export const currencyRoutes = new Hono<AppEnv>()

  .get("/:tenantId/currencies", requireAuth, requireTenantRole("viewer"), async (c) => {
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const { results } = await db
      .prepare(`SELECT code, name, rate, is_base, updated_at FROM currencies ORDER BY is_base DESC, code`)
      .all<{ code: string; name: string; rate: number; is_base: number; updated_at: string | null }>();
    const currencies: ApiCurrency[] = results.map((r) => ({
      code: r.code,
      name: r.name,
      rate: r.rate,
      isBase: r.is_base === 1,
      updatedAt: r.updated_at,
    }));
    return c.json({ currencies });
  })

  .put("/:tenantId/currencies", requireAuth, requireTenantRole("admin"), async (c) => {
    const parsed = currencySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const tenant = c.get("tenant");
    const db = getTenantDb(c.env, tenant.dbRef);
    const input = parsed.data;
    if (input.code === "IDR") return c.json({ error: "IDR adalah mata uang basis dan tidak dapat diubah." }, 400);

    await db
      .prepare(
        `INSERT INTO currencies (code, name, rate, is_base, updated_at) VALUES (?, ?, ?, 0, datetime('now'))
         ON CONFLICT(code) DO UPDATE SET name = excluded.name, rate = excluded.rate, updated_at = excluded.updated_at`,
      )
      .bind(input.code, input.name, input.rate)
      .run();

    await audit(c.env, {
      action: "currency.set",
      userId: c.get("user").id,
      tenantId: tenant.id,
      detail: { code: input.code, rate: input.rate },
      ip: clientIp(c),
    });
    return c.json({ ok: true });
  });
