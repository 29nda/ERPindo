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

/**
 * Ambil kurs referensi harian dan perbarui master kurs tenant (Fase 22b).
 *
 * Tiga keputusan yang menentukan bentuk fungsi ini:
 *
 * 1. **Sumber absen = fitur mati, bukan galat.** Sama seperti binding opsional
 *    lain di repo ini: tanpa `KURS_SOURCE_URL` cron melewatinya diam-diam.
 * 2. **HANYA memperbarui mata uang yang SUDAH terdaftar** di tenant. Sumber
 *    kurs mengembalikan 150+ mata uang; menyisipkan semuanya akan membanjiri
 *    daftar milik pemilik warung yang cuma memakai USD. Kode yang tak dikenal
 *    dilaporkan lewat `dilewati`, bukan diam-diam dibuang.
 * 3. **Kegagalan tidak menyentuh kurs lama.** Sumber mati, balasan bukan JSON,
 *    atau basis salah → kurs kemarin tetap dipakai. Kurs yang usang masih bisa
 *    dipertanggungjawabkan; kurs yang tergantikan angka sampah tidak.
 */
export async function segarkanKursReferensi(
  env: Env,
  db: SqlExecutor,
): Promise<HasilSegarkanKurs> {
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
    try {
      const resp = await fetch(env.KURS_SOURCE_URL!, { headers: { accept: "application/json" } });
      if (!resp.ok) return { status: "gagal", alasan: `Sumber kurs menjawab HTTP ${resp.status}.` };
      payload = await resp.json();
    } catch (err) {
      return { status: "gagal", alasan: `Sumber kurs tidak bisa dihubungi: ${(err as Error).message}` };
    }
  }

  const dibaca = bacaKursReferensi(payload);
  if (!dibaca.ok) return { status: "gagal", alasan: dibaca.alasan };

  const { results: terdaftar } = await db
    .prepare(`SELECT code FROM currencies WHERE is_base = 0`)
    .all<{ code: string }>();
  const kodeTenant = new Set(terdaftar.map((r) => r.code.toUpperCase()));

  const dilewati: string[] = [];
  let diperbarui = 0;
  for (const [kode, nilai] of Object.entries(dibaca.kurs)) {
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
  return { status: "diperbarui", diperbarui, dilewati, diabaikan: dibaca.diabaikan };
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
