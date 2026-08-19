import { leadFormSchema, SUMBER_LEAD_FORM } from "@erpindo/shared";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { getTenantDb } from "../lib/tenantDb";
import { rateLimit } from "../middleware/rateLimit";

/**
 * Form penangkap lead publik per tenant (Fase 21e).
 *
 * Pemilik menempelkan potongan HTML ini di landing/bio media sosialnya sendiri;
 * kiriman masuk langsung ke CRM Leads miliknya. PUBLIK — pengunjung tentu tidak
 * punya akun.
 *
 * ## Kenapa tenant diresolusi dari SLUG, bukan dari token
 *
 * Token disimpan di tabel `settings` milik DB **tenant**, sedangkan resolusi
 * "token ini punya siapa" harus terjadi SEBELUM DB tenant mana pun dibuka.
 * Mencari lewat token saja berarti memindai seluruh pool DB tenant tiap kiriman.
 * Slug sudah ada di control-plane dan sudah dipakai jalur lain (`routes/auth.ts`).
 *
 * ## Tokennya BUKAN rahasia — dan memang tidak perlu
 *
 * Ia tertanam di HTML halaman publik, jadi siapa pun yang membuka "view source"
 * bisa membacanya. Tugasnya hanya memastikan pengirim benar-benar memakai form
 * yang pemiliknya terbitkan — bukan menebak-nebak slug tenant lalu menyiram
 * CRM orang. Yang menahan penyalahgunaan adalah batas laju per IP di bawah,
 * dan tombol putar-ulang token bila ada yang menyalahgunakan.
 *
 * Menyebutnya "kunci rahasia" akan membuat pemilik menaruh kepercayaan yang
 * tidak bisa ditopang bentuknya.
 */
export const leadFormRoutes = new Hono<AppEnv>().post(
  "/lead/:slug",
  // 20 per 10 menit per IP, bukan 5 seperti form demo ERPindo. Middleware ini
  // menghitung SETIAP permintaan, termasuk yang gagal validasi — dengan 5,
  // pengunjung yang salah ketik email lima kali langsung terkunci. 20 masih
  // menahan penyiraman massal (120/jam) sekaligus memaafkan kantor/CGNAT yang
  // ber-IP sama.
  rateLimit({ key: "lead-form", limit: 20, windowSeconds: 600 }),
  async (c) => {
    const parsed = leadFormSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const input = parsed.data;

    // Tenant hanya boleh berstatus aktif/trial: perusahaan yang berhenti
    // berlangganan tidak lagi menerima kiriman ke datanya.
    const tenant = await c.env.DB.prepare(
      `SELECT id, db_ref FROM tenants WHERE slug = ? AND status IN ('active', 'past_due')`,
    )
      .bind(c.req.param("slug"))
      .first<{ id: string; db_ref: string }>();
    if (!tenant) return c.json({ error: "Form tidak ditemukan. Muat ulang halaman, lalu pilih dari daftar terbaru." }, 404);

    const db = getTenantDb(c.env, tenant.db_ref);
    const { results } = await db
      .prepare(`SELECT value FROM settings WHERE key = 'lead_form_token'`)
      .all<{ value: string }>();
    const token = results[0]?.value ?? "";
    // Token kosong = form belum diaktifkan pemiliknya. Dibedakan dari token
    // salah HANYA di log internal; ke pengirim keduanya 403 yang sama, supaya
    // rute ini tidak jadi alat untuk memetakan tenant mana yang punya form.
    if (!token || token !== input.token) return c.json({ error: "Form tidak aktif atau token salah." }, 403);

    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO leads (id, name, contact_person, email, phone, source, est_value, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind(
        id,
        input.name,
        input.name,
        input.email || null,
        input.phone || null,
        SUMBER_LEAD_FORM,
        input.message || null,
        // `created_by` bertipe TEXT NOT NULL tanpa FK ke `users` — sentinel ini
        // aman, dan membuat asal-usul barisnya terbaca di data mentah.
        SUMBER_LEAD_FORM,
      )
      .run();

    return c.json({ ok: true, id }, 201);
  },
);
