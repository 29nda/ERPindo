import {
  blogPostSchema,
  FEEDBACK_STATUSES,
  feedbackSchema,
  PLAN_LIMITS,
  setTenantPlanSchema,
  type ApiBlogPost,
  type ApiFeedback,
  type FeedbackCategory,
  type FeedbackStatus,
} from "@erpindo/shared";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { audit } from "../lib/audit";
import { ambilKuota } from "../lib/kuota";
import { requireAuth, requirePlatformAdmin } from "../middleware/auth";
import { rateLimitUser } from "../middleware/rateLimit";
import { BATCH_MIGRASI, hitungKapasitasPool, migrateTenantBatch, pastikanTenantTerprovisi, TENANT_SCHEMA_VERSION } from "../lib/tenantDb";
import { clientIp } from "./auth";

/**
 * Dashboard admin platform (Fase 10e) — khusus email pada
 * PLATFORM_ADMIN_EMAILS: pantau pendaftar & langganan, kelola masukan
 * pengguna, dan tulis artikel blog (dilayani SSR di /blog untuk SEO).
 * Semua data di control-plane (c.env.DB — punya .first()).
 */

type FeedbackRow = {
  id: string;
  category: FeedbackCategory;
  message: string;
  page_path: string | null;
  status: FeedbackStatus;
  admin_note: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  tenant_name: string | null;
};

function toApiFeedback(r: FeedbackRow): ApiFeedback {
  return {
    id: r.id,
    category: r.category,
    message: r.message,
    pagePath: r.page_path,
    status: r.status,
    adminNote: r.admin_note,
    createdAt: r.created_at,
    userName: r.user_name,
    userEmail: r.user_email,
    tenantName: r.tenant_name,
  };
}

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function toApiBlogPost(r: BlogRow): ApiBlogPost {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    bodyMd: r.body_md,
    coverUrl: r.cover_url,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Middleware dipasang PER-HANDLER (bukan .use) mengikuti gerbang struktural
// rbac-guard.test.ts — satu registrasi yang lupa penjaga langsung tertangkap.
export const adminRoutes = new Hono<AppEnv>()

  // -------------------------------------------------------------------------
  // Ringkasan platform: total, per status/paket, pendaftar terbaru, tren 12 bln.
  // -------------------------------------------------------------------------
  .get("/overview", requireAuth, requirePlatformAdmin, async (c) => {
    const [users, tenants, byStatus, byPlan, recent, growth, feedbackNew] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first<{ n: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS n FROM tenants`).first<{ n: number }>(),
      c.env.DB.prepare(`SELECT status, COUNT(*) AS n FROM tenants GROUP BY status`).all<{ status: string; n: number }>(),
      c.env.DB.prepare(`SELECT plan, COUNT(*) AS n FROM tenants GROUP BY plan`).all<{ plan: string; n: number }>(),
      c.env.DB.prepare(
        `SELECT t.id, t.name, t.slug, t.status, t.plan, t.created_at,
                (SELECT u.email FROM memberships m JOIN users u ON u.id = m.user_id
                 WHERE m.tenant_id = t.id AND m.role = 'owner' ORDER BY m.created_at LIMIT 1) AS owner_email
         FROM tenants t ORDER BY t.created_at DESC LIMIT 20`,
      ).all<{ id: string; name: string; slug: string; status: string; plan: string; created_at: string; owner_email: string | null }>(),
      c.env.DB.prepare(
        `SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS n FROM tenants
         GROUP BY month ORDER BY month DESC LIMIT 12`,
      ).all<{ month: string; n: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS n FROM feedback WHERE status = 'baru'`).first<{ n: number }>(),
    ]);

    // --- Metrik bisnis (Fase 30f) -------------------------------------------
    //
    // Sampai fase ini dasbor hanya menghitung BADAN: berapa user, berapa tenant.
    // Angka yang menentukan apakah bisnisnya hidup — pendapatan berulang dan
    // berapa yang pergi — tidak pernah dihitung di mana pun, sehingga pemilik
    // harus menaksirnya sendiri dari daftar tenant.
    //
    // Seluruhnya dihitung dari control-plane, bukan dari gerbang pembayaran:
    // Xendit hanya tahu transaksi yang lewat dirinya, sedangkan pelanggan yang
    // diaktifkan manual (transfer bank — masih cara paling umum di segmen ini)
    // sama nyatanya dan tetap harus terhitung.
    const nowIso = new Date().toISOString();
    const [langganan, umur, churnBulanan] = await Promise.all([
      // `active` dipecah tiga, karena ketiganya berarti hal yang sangat berbeda
      // bagi pemilik: berbayar & aman, berbayar & jatuh tempo tetapi masih boleh
      // menulis (masa tenggang), dan comped (tak pernah menagih).
      c.env.DB.prepare(
        `SELECT
           SUM(CASE WHEN status = 'active' AND subscription_ends_at IS NOT NULL AND subscription_ends_at >= ? THEN 1 ELSE 0 END) AS berbayar,
           SUM(CASE WHEN status = 'active' AND subscription_ends_at IS NOT NULL AND subscription_ends_at < ? THEN 1 ELSE 0 END) AS tenggang,
           SUM(CASE WHEN status = 'active' AND subscription_ends_at IS NULL THEN 1 ELSE 0 END) AS comped,
           SUM(CASE WHEN status = 'past_due' THEN 1 ELSE 0 END) AS menunggak,
           SUM(CASE WHEN status = 'provisioning' THEN 1 ELSE 0 END) AS belumBayar,
           SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS berhenti
         FROM tenants`,
      )
        .bind(nowIso, nowIso)
        .first<{
          berbayar: number;
          tenggang: number;
          comped: number;
          menunggak: number;
          belumBayar: number;
          berhenti: number;
        }>(),
      // Umur langganan rata-rata (hari sejak mendaftar) untuk tenant yang
      // BENAR-BENAR membayar. Comped dikecualikan: mereka tidak pernah
      // memutuskan untuk bertahan, jadi memasukkannya membuat angka ini
      // terlihat lebih sehat daripada kenyataannya.
      c.env.DB.prepare(
        `SELECT AVG(julianday('now') - julianday(created_at)) AS hari
         FROM tenants WHERE subscription_ends_at IS NOT NULL`,
      ).first<{ hari: number | null }>(),
      // Churn: tenant yang jatuh ke past_due/suspended dalam 30 hari terakhir,
      // dibaca dari audit log — satu-satunya tempat yang menyimpan KAPAN
      // sebuah langganan berakhir. Kolom `tenants` hanya menyimpan keadaan
      // sekarang, jadi tanpa ini "berapa yang pergi bulan ini" tak terjawab.
      c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM audit_logs
         WHERE action = 'billing.subscription_lapsed' AND created_at >= ?`,
      )
        .bind(new Date(Date.now() - 30 * 86_400_000).toISOString())
        .first<{ n: number }>(),
    ]);

    const berbayar = langganan?.berbayar ?? 0;
    const tenggang = langganan?.tenggang ?? 0;
    // MRR menghitung yang berbayar DAN yang masih dalam masa tenggang: mereka
    // belum pergi, hanya terlambat. Comped TIDAK dihitung — pendapatan yang
    // tidak pernah ditagih bukan pendapatan, dan angka MRR yang digelembungkan
    // olehnya adalah cara paling mudah menipu diri sendiri.
    const pelangganMembayar = berbayar + tenggang;
    const mrr = pelangganMembayar * PLAN_LIMITS.lengkap.pricePerMonth;
    const dasarChurn = pelangganMembayar + (churnBulanan?.n ?? 0);
    return c.json({
      totals: { users: users?.n ?? 0, tenants: tenants?.n ?? 0, feedbackBaru: feedbackNew?.n ?? 0 },
      byStatus: Object.fromEntries(byStatus.results.map((r) => [r.status, r.n])),
      byPlan: Object.fromEntries(byPlan.results.map((r) => [r.plan, r.n])),
      recentSignups: recent.results.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.status,
        plan: r.plan,
        createdAt: r.created_at,
        ownerEmail: r.owner_email,
      })),
      growth: growth.results.reverse(),
      bisnis: {
        mrr,
        hargaPerBulan: PLAN_LIMITS.lengkap.pricePerMonth,
        pelangganMembayar,
        berbayar,
        tenggang,
        comped: langganan?.comped ?? 0,
        menunggak: langganan?.menunggak ?? 0,
        belumBayar: langganan?.belumBayar ?? 0,
        berhenti: langganan?.berhenti ?? 0,
        churn30Hari: churnBulanan?.n ?? 0,
        // Persentase hanya berarti bila ada penyebutnya. Tanpa penjaga ini,
        // akun tanpa pelanggan menampilkan NaN% di dasbor pemilik.
        churnPersen: dasarChurn > 0 ? Math.round(((churnBulanan?.n ?? 0) / dasarChurn) * 1000) / 10 : 0,
        umurRataHari: umur?.hari !== null && umur?.hari !== undefined ? Math.round(umur.hari) : 0,
      },
    });
  })

  // -------------------------------------------------------------------------
  // Daftar tenant: paginasi + filter status + pencarian nama/slug.
  // -------------------------------------------------------------------------
  .get("/tenants", requireAuth, requirePlatformAdmin, async (c) => {
    const q = (c.req.query("q") ?? "").trim();
    const status = (c.req.query("status") ?? "").trim();
    const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 200);
    const offset = Math.max(Number(c.req.query("offset")) || 0, 0);

    const conds: string[] = [];
    const binds: (string | number)[] = [];
    if (q) {
      const like = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      conds.push(`(t.name LIKE ? ESCAPE '\\' OR t.slug LIKE ? ESCAPE '\\')`);
      binds.push(like, like);
    }
    if (status) {
      conds.push(`t.status = ?`);
      binds.push(status);
    }
    const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";

    const [{ results }, count] = await Promise.all([
      c.env.DB.prepare(
        `SELECT t.id, t.name, t.slug, t.status, t.plan, t.trial_ends_at, t.created_at,
                (SELECT COUNT(*) FROM memberships m WHERE m.tenant_id = t.id) AS members,
                (SELECT u.email FROM memberships m JOIN users u ON u.id = m.user_id
                 WHERE m.tenant_id = t.id AND m.role = 'owner' ORDER BY m.created_at LIMIT 1) AS owner_email
         FROM tenants t ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
      )
        .bind(...binds, limit, offset)
        .all<{
          id: string;
          name: string;
          slug: string;
          status: string;
          plan: string;
          trial_ends_at: string | null;
          created_at: string;
          members: number;
          owner_email: string | null;
        }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS n FROM tenants t ${where}`)
        .bind(...binds)
        .first<{ n: number }>(),
    ]);
    return c.json({
      tenants: results.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.status,
        plan: r.plan,
        trialEndsAt: r.trial_ends_at,
        createdAt: r.created_at,
        members: r.members,
        ownerEmail: r.owner_email,
      })),
      total: count?.n ?? 0,
      limit,
      offset,
    });
  })

  // -------------------------------------------------------------------------
  // Infra & kapasitas (Fase 11a): mode database tenant, versi skema terkini,
  // dan sebaran versi tenant — agar admin melihat siapa yang tertinggal migrasi
  // dan mendeteksi tenant yang mendekati batas D1.
  // -------------------------------------------------------------------------
  .get("/infra", requireAuth, requirePlatformAdmin, async (c) => {
    const [total, byVersion, behind, jumlahBehind, byMode] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) AS n FROM tenants`).first<{ n: number }>(),
      c.env.DB.prepare(
        `SELECT schema_version AS v, COUNT(*) AS n FROM tenants GROUP BY schema_version ORDER BY v`,
      ).all<{ v: number; n: number }>(),
      c.env.DB.prepare(
        `SELECT id, name, slug, schema_version FROM tenants WHERE schema_version < ? ORDER BY schema_version, created_at LIMIT 100`,
      )
        .bind(TENANT_SCHEMA_VERSION)
        .all<{ id: string; name: string; slug: string; schema_version: number }>(),
      // JUMLAH tertinggal dihitung terpisah dari CONTOHNYA (Fase 30f).
      //
      // Sebelumnya `tenantsBehind` diisi `behind.results.length` — panjang
      // daftar yang ber-LIMIT 100. Pada enam tenant angkanya kebetulan benar;
      // pada 1.000 tenant tertinggal ia melaporkan "100" dan **tetap 100**
      // sepanjang cron mencicilnya, sehingga pemilik tidak bisa membedakan
      // seratus dari seribu dan tidak melihat kemajuan sama sekali. Daftarnya
      // tetap dibatasi 100 — itu contoh untuk ditindaklanjuti, bukan sensus.
      c.env.DB.prepare(`SELECT COUNT(*) AS n FROM tenants WHERE schema_version < ?`)
        .bind(TENANT_SCHEMA_VERSION)
        .first<{ n: number }>(),
      // Sebaran jenis referensi DB: 'binding:' (pool lokal) vs 'uuid:' (D1 dinamis).
      c.env.DB.prepare(
        `SELECT CASE WHEN db_ref LIKE 'uuid:%' THEN 'cloudflare' ELSE 'binding' END AS kind, COUNT(*) AS n
         FROM tenants GROUP BY kind`,
      ).all<{ kind: string; n: number }>(),
    ]);

    // Kapasitas pendaftaran (Fase 23c). Di mode lokal jumlah binding adalah
    // batas KERAS: begitu habis, pendaftar berikutnya ditolak 503. Produksi
    // pernah sampai 6/6 tanpa ada yang tahu — empat slotnya dihabiskan skrip
    // uji — dan tidak ada satu pun gerbang yang bisa melihatnya, karena semua
    // gerbang berjalan di D1 lokal yang selalu kosong. Karena itu angkanya
    // dilaporkan di sini, bukan diasumsikan aman.
    let kapasitas: {
      total: number;
      terpakai: number;
      bebasBersih: number;
      bebasKotor: string[];
      peringatan: string | null;
    } | null = null;
    if (c.env.TENANT_DB_MODE !== "cloudflare") {
      const { results: refRows } = await c.env.DB.prepare(`SELECT db_ref FROM tenants`).all<{ db_ref: string }>();
      const k = await hitungKapasitasPool(
        c.env,
        refRows.map((r) => r.db_ref),
      );
      const peringatan =
        k.bebasBersih === 0
          ? "Kapasitas pendaftaran HABIS — perusahaan baru tidak bisa mendaftar. Nyalakan TENANT_DB_MODE=cloudflare."
          : k.bebasBersih <= 2
            ? `Sisa kapasitas tinggal ${k.bebasBersih} perusahaan. Siapkan D1 dinamis sebelum habis.`
            : null;
      kapasitas = { ...k, peringatan };
    }

    return c.json({
      dbMode: c.env.TENANT_DB_MODE,
      schemaVersion: TENANT_SCHEMA_VERSION,
      totalTenants: total?.n ?? 0,
      tenantsBehind: jumlahBehind?.n ?? 0,
      /** Contoh tenant tertinggal yang ditampilkan (≤100), bukan seluruhnya. */
      behindDitampilkan: behind.results.length,
      versionDistribution: byVersion.results,
      refKinds: Object.fromEntries(byMode.results.map((r) => [r.kind, r.n])),
      behind: behind.results.map((r) => ({ id: r.id, name: r.name, slug: r.slug, schemaVersion: r.schema_version })),
      kapasitas,
    });
  })

  // -------------------------------------------------------------------------
  // Monitor kuota Cloudflare (Fase 30f) — supaya keputusan "kapan naik paket"
  // diambil dari angka, bukan tebakan. Terpisah dari /infra karena memanggil
  // API eksternal: /infra harus tetap cepat & selalu berhasil, sedangkan kartu
  // ini boleh gagal sendirian tanpa menyeret layarnya.
  // -------------------------------------------------------------------------
  .get("/kuota", requireAuth, requirePlatformAdmin, async (c) => {
    return c.json(await ambilKuota(c.env));
  })

  // Terapkan migrasi tenant yang tertinggal — SATU BATCH per panggilan
  // (Fase 30d; sebelumnya seluruh tenant dalam satu request).
  //
  // Idempoten & resumable: panggil berulang sampai `selesai` bernilai true.
  // Cron harian melakukannya sendiri, jadi endpoint ini untuk operator yang
  // ingin menuntaskannya SEKARANG setelah rilis skema baru.
  //
  // `batas` bisa dikecilkan untuk menguji perilaku batch tanpa membuat ribuan
  // tenant; nilainya dijepit agar tidak bisa dipakai memaksa satu panggilan
  // raksasa yang justru menghidupkan kembali cacat yang baru saja diperbaiki.
  .post("/migrate-tenants", requireAuth, requirePlatformAdmin, async (c) => {
    const diminta = Number(c.req.query("batas"));
    const batas = Number.isFinite(diminta) && diminta > 0 ? Math.min(diminta, BATCH_MIGRASI) : BATCH_MIGRASI;
    const hasil = await migrateTenantBatch(c.env, batas);
    // Audit hanya saat ada yang benar-benar disentuh: cron memanggil jalur yang
    // sama tiap hari, dan mencatat "0 tenant dimigrasi" 365× setahun mengubur
    // baris audit yang berarti.
    if (hasil.diproses > 0) {
      await audit(c.env, {
        action: "admin.tenants_migrated",
        userId: c.get("user").id,
        detail: { diproses: hasil.diproses, berhasil: hasil.berhasil, gagal: hasil.gagal, sisa: hasil.sisa },
        ip: clientIp(c),
      });
    }
    return c.json(hasil);
  })

  // -------------------------------------------------------------------------
  // Set paket tenant manual (Fase 13b): untuk grant/koreksi paket, comped, atau
  // grandfather. Juga seam pengujian penegakan paket. Platform admin saja.
  // -------------------------------------------------------------------------
  .post("/tenants/:id/plan", requireAuth, requirePlatformAdmin, async (c) => {
    const tenantId = c.req.param("id");
    const parsed = setTenantPlanSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "Data tidak valid.", issues: parsed.error.flatten().fieldErrors }, 400);
    const { plan, status, legacyFullAccess, subscriptionEndsAt } = parsed.data;

    const exists = await c.env.DB.prepare(`SELECT id FROM tenants WHERE id = ?`).bind(tenantId).first();
    if (!exists) return c.json({ error: "Perusahaan tidak ditemukan." }, 404);

    // Bangun UPDATE dinamis hanya untuk field yang dikirim.
    const sets: string[] = ["plan = ?"];
    const binds: (string | number)[] = [plan];
    if (status !== undefined) {
      sets.push("status = ?");
      binds.push(status);
    }
    if (legacyFullAccess !== undefined) {
      sets.push("legacy_full_access = ?");
      binds.push(legacyFullAccess ? 1 : 0);
    }
    if (subscriptionEndsAt !== undefined) {
      sets.push("subscription_ends_at = ?");
      // `null` dikirim sengaja untuk mencabut periode (mis. comped), jadi
      // dibedakan dari `undefined` yang berarti "jangan sentuh".
      binds.push(subscriptionEndsAt as unknown as string);
    }
    binds.push(tenantId);
    await c.env.DB.prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...binds)
      .run();
    // Fase 24 — aktivasi manual JUGA harus membuatkan database.
    //
    // Endpoint ini adalah jalur pelanggan yang membayar di luar Xendit
    // (transfer bank). Sejak registrasi berhenti membuat database, mengaktifkan
    // tenant lewat sini tanpa memprovisikannya akan menghasilkan akun "aktif"
    // yang tetap tidak bisa dibuka — pemilik menyangka sudah selesai, padahal
    // pelanggannya masih tertahan. Idempoten: tenant yang sudah punya database
    // tidak tersentuh.
    let provisioning: string | undefined;
    if (status === "active") {
      const hasil = await pastikanTenantTerprovisi(c.env, tenantId);
      if (!hasil.ok) provisioning = hasil.alasan;
    }

    await audit(c.env, {
      action: "admin.tenant_plan_set",
      userId: c.get("user").id,
      tenantId,
      detail: { plan, status, legacyFullAccess, subscriptionEndsAt, ...(provisioning ? { provisioning } : {}) },
      ip: clientIp(c),
    });
    return c.json({ ok: true, plan, ...(provisioning ? { provisioning } : {}) });
  })

  // -------------------------------------------------------------------------
  // Masukan pengguna: daftar + ubah status/catatan.
  // -------------------------------------------------------------------------
  .get("/feedback", requireAuth, requirePlatformAdmin, async (c) => {
    const status = (c.req.query("status") ?? "").trim();
    const binds: string[] = [];
    let where = "";
    if (status) {
      where = "WHERE f.status = ?";
      binds.push(status);
    }
    const { results } = await c.env.DB.prepare(
      `SELECT f.id, f.category, f.message, f.page_path, f.status, f.admin_note, f.created_at,
              u.name AS user_name, u.email AS user_email, t.name AS tenant_name
       FROM feedback f
       JOIN users u ON u.id = f.user_id
       LEFT JOIN tenants t ON t.id = f.tenant_id
       ${where} ORDER BY f.created_at DESC LIMIT 200`,
    )
      .bind(...binds)
      .all<FeedbackRow>();
    return c.json({ feedback: results.map(toApiFeedback) });
  })

  .patch("/feedback/:id", requireAuth, requirePlatformAdmin, async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { status?: string; adminNote?: string };
    const id = c.req.param("id");
    const row = await c.env.DB.prepare(`SELECT id FROM feedback WHERE id = ?`).bind(id).first<{ id: string }>();
    if (!row) return c.json({ error: "Masukan tidak ditemukan." }, 404);
    const status = body.status && (FEEDBACK_STATUSES as readonly string[]).includes(body.status) ? body.status : null;
    const note = typeof body.adminNote === "string" ? body.adminNote.slice(0, 500) : null;
    if (!status && note === null) return c.json({ error: "Tidak ada perubahan." }, 400);
    await c.env.DB.prepare(
      `UPDATE feedback SET status = COALESCE(?, status), admin_note = COALESCE(?, admin_note), updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(status, note, id)
      .run();
    await audit(c.env, {
      action: "admin.feedback_updated",
      userId: c.get("user").id,
      detail: { id, status: status ?? undefined },
      ip: clientIp(c),
    });
    return c.json({ ok: true });
  })

  // -------------------------------------------------------------------------
  // Blog CMS: CRUD artikel; publish = mengisi published_at.
  // -------------------------------------------------------------------------
  .get("/blog-posts", requireAuth, requirePlatformAdmin, async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM blog_posts ORDER BY COALESCE(published_at, created_at) DESC LIMIT 200`,
    ).all<BlogRow>();
    return c.json({ posts: results.map(toApiBlogPost) });
  })

  .post("/blog-posts", requireAuth, requirePlatformAdmin, async (c) => {
    const parsed = blogPostSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const input = parsed.data;
    const dupe = await c.env.DB.prepare(`SELECT id FROM blog_posts WHERE slug = ?`).bind(input.slug).first();
    if (dupe) return c.json({ error: `Slug "${input.slug}" sudah dipakai.` }, 409);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO blog_posts (id, slug, title, excerpt, body_md, cover_url) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, input.slug, input.title, input.excerpt ?? null, input.bodyMd, input.coverUrl || null)
      .run();
    await audit(c.env, {
      action: "admin.blog_created",
      userId: c.get("user").id,
      detail: { slug: input.slug },
      ip: clientIp(c),
    });
    return c.json({ ok: true, id }, 201);
  })

  .patch("/blog-posts/:id", requireAuth, requirePlatformAdmin, async (c) => {
    const id = c.req.param("id");
    const row = await c.env.DB.prepare(`SELECT * FROM blog_posts WHERE id = ?`).bind(id).first<BlogRow>();
    if (!row) return c.json({ error: "Artikel tidak ditemukan." }, 404);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

    // Terbit/tarik: { published: true|false } — kolom lain lewat skema penuh.
    if (typeof body.published === "boolean") {
      await c.env.DB.prepare(
        `UPDATE blog_posts SET published_at = ${body.published ? "COALESCE(published_at, datetime('now'))" : "NULL"},
                updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(id)
        .run();
      await audit(c.env, {
        action: body.published ? "admin.blog_published" : "admin.blog_unpublished",
        userId: c.get("user").id,
        detail: { slug: row.slug },
        ip: clientIp(c),
      });
      return c.json({ ok: true });
    }

    const parsed = blogPostSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const input = parsed.data;
    if (input.slug !== row.slug) {
      const dupe = await c.env.DB.prepare(`SELECT id FROM blog_posts WHERE slug = ? AND id != ?`)
        .bind(input.slug, id)
        .first();
      if (dupe) return c.json({ error: `Slug "${input.slug}" sudah dipakai.` }, 409);
    }
    await c.env.DB.prepare(
      `UPDATE blog_posts SET slug = ?, title = ?, excerpt = ?, body_md = ?, cover_url = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(input.slug, input.title, input.excerpt ?? null, input.bodyMd, input.coverUrl || null, id)
      .run();
    await audit(c.env, {
      action: "admin.blog_updated",
      userId: c.get("user").id,
      detail: { slug: input.slug },
      ip: clientIp(c),
    });
    return c.json({ ok: true });
  })

  .delete("/blog-posts/:id", requireAuth, requirePlatformAdmin, async (c) => {
    const id = c.req.param("id");
    const row = await c.env.DB.prepare(`SELECT slug FROM blog_posts WHERE id = ?`).bind(id).first<{ slug: string }>();
    if (!row) return c.json({ error: "Artikel tidak ditemukan." }, 404);
    await c.env.DB.prepare(`DELETE FROM blog_posts WHERE id = ?`).bind(id).run();
    await audit(c.env, {
      action: "admin.blog_deleted",
      userId: c.get("user").id,
      detail: { slug: row.slug },
      ip: clientIp(c),
    });
    return c.json({ ok: true });
  });

/**
 * Masukan pengguna (halaman /app/dukungan) — semua pengguna ber-sesi boleh
 * mengirim; rate-limited agar tidak jadi saluran spam.
 */
export const feedbackRoutes = new Hono<AppEnv>()
  .post("/", requireAuth, rateLimitUser({ key: "feedback", limit: 5, windowSeconds: 300 }), async (c) => {
    const parsed = feedbackSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const user = c.get("user");
    const input = parsed.data;
    // tenantId opsional divalidasi sebagai keanggotaan agar tak bisa menautkan
    // masukan ke perusahaan orang lain.
    let tenantId: string | null = null;
    if (input.tenantId) {
      const member = await c.env.DB.prepare(`SELECT id FROM memberships WHERE user_id = ? AND tenant_id = ?`)
        .bind(user.id, input.tenantId)
        .first<{ id: string }>();
      if (member) tenantId = input.tenantId;
    }
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO feedback (id, tenant_id, user_id, category, message, page_path) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, tenantId, user.id, input.category, input.message, input.pagePath ?? null)
      .run();
    await audit(c.env, {
      action: "feedback.submitted",
      userId: user.id,
      ...(tenantId ? { tenantId } : {}),
      detail: { category: input.category },
      ip: clientIp(c),
    });
    return c.json({ ok: true, id }, 201);
  })

  .get("/mine", requireAuth, async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT f.id, f.category, f.message, f.page_path, f.status, f.admin_note, f.created_at,
              NULL AS user_name, NULL AS user_email, NULL AS tenant_name
       FROM feedback f WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT 50`,
    )
      .bind(c.get("user").id)
      .all<FeedbackRow>();
    return c.json({ feedback: results.map(toApiFeedback) });
  });

