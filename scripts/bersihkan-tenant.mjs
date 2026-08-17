#!/usr/bin/env node
/**
 * Bebaskan slot tenant dengan BENAR — kosongkan databasenya, baru hapus barisnya.
 *
 * ## Kenapa skrip ini ada
 *
 * Di mode pool lokal, tiap perusahaan memakan satu binding `TENANT_DB_*` yang
 * jumlahnya tetap (6). Cara paling wajar membebaskan slot — `DELETE FROM
 * tenants` — justru **membocorkan data**: `applyMigrations()` melewati migrasi
 * yang sudah tercatat di `_migrations` dan tidak pernah mengosongkan tabel,
 * sehingga binding itu diserahkan ke pendaftar berikutnya **berisi seluruh data
 * perusahaan sebelumnya** — faktur, kontak, jurnal, gaji.
 *
 * Karena itu urutannya di sini dibalik dari yang intuitif:
 *
 *   1. kosongkan database tenant (DROP semua tabel, termasuk `_migrations`);
 *   2. BARU hapus baris control-plane.
 *
 * Kalau langkah 1 gagal di tengah, barisnya masih ada — slotnya tidak pernah
 * terlihat "bebas" dalam keadaan kotor. Urutan sebaliknya akan meninggalkan
 * persis jebakan yang skrip ini dibuat untuk menghindarinya.
 *
 * Aplikasi juga punya penjaga keduanya (`provisionTenantDb` melewati slot yang
 * masih berisi tabel), jadi pembersihan yang gagal separuh tidak akan pernah
 * diserahkan ke pendaftar. Skrip ini yang membuat slotnya benar-benar kembali
 * bisa dipakai.
 *
 * ## Pemakaian
 *
 *   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… \
 *     node scripts/bersihkan-tenant.mjs <slug> [slug…]        # pratinjau
 *   … node scripts/bersihkan-tenant.mjs <slug> --hapus        # eksekusi
 *
 * Token cukup ber-scope **D1:Edit** (bukan token global).
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
// Control-plane D1. Bukan rahasia — sudah tercantum di wrangler.jsonc.
const CONTROL_DB_ID = process.env.CONTROL_DB_ID ?? "2979c39c-bf54-42c4-8486-e843897b3006";

const EKSEKUSI = process.argv.includes("--hapus");
const SLUGS = process.argv.slice(2).filter((a) => !a.startsWith("--"));

/**
 * Slug yang TIDAK BOLEH dihapus, apa pun yang diketik operator.
 *
 * `softtin` adalah perusahaan nyata; `pt-demo-sejahtera` adalah demo publik yang
 * dilihat calon pelanggan dari landing page. Keduanya berstatus `active` dan
 * mudah tersapu kalau seseorang kelak menambahkan filter "hapus semua yang
 * past_due" atau pola wildcard. Daftar ini membuat kekeliruan itu mustahil,
 * bukan sekadar tidak disarankan.
 */
const DILINDUNGI = new Set(["softtin", "pt-demo-sejahtera"]);

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error("Set CLOUDFLARE_ACCOUNT_ID dan CLOUDFLARE_API_TOKEN (scope D1:Edit).");
  process.exit(1);
}
if (SLUGS.length === 0) {
  console.error("Pemakaian: node scripts/bersihkan-tenant.mjs <slug> [slug…] [--hapus]");
  process.exit(1);
}

/**
 * Kunci pembuka khusus demo (Fase 25b).
 *
 * Mengganti perusahaan demo dengan yang baru MEMANG mengharuskan yang lama
 * dihapus, jadi penjaganya perlu bisa dibuka. Yang tidak boleh adalah membukanya
 * dengan mencabut baris `DILINDUNGI` — sekali dicabut ia tidak pernah kembali,
 * dan penjaga yang sama juga melindungi `softtin`, perusahaan NYATA.
 *
 * Karena itu pembukanya berupa flag terpisah, hanya berlaku untuk slug demo,
 * dan harus diketik utuh: `softtin` tetap mustahil terhapus dengan cara apa pun.
 */
const IZINKAN_DEMO = process.argv.includes("--izinkan-demo");
const DEMO_SLUG = "pt-demo-sejahtera";

const dilarang = SLUGS.filter((s) => DILINDUNGI.has(s) && !(IZINKAN_DEMO && s === DEMO_SLUG));
if (dilarang.length > 0) {
  console.error(
    `MENOLAK: ${dilarang.join(", ")} ada di daftar dilindungi dan tidak boleh dihapus.` +
      (dilarang.includes(DEMO_SLUG) ? `\nUntuk mengganti demo publik dengan yang baru, tambahkan --izinkan-demo.` : ""),
  );
  process.exit(1);
}
if (IZINKAN_DEMO && SLUGS.includes(DEMO_SLUG)) {
  console.warn(
    `\n⚠  --izinkan-demo aktif: ${DEMO_SLUG} akan dihapus.\n` +
      `   Tombol "Lihat Demo" di landing MATI sampai seed baru selesai\n` +
      `   (workflow "Seed demo" → runbook §7). Pastikan secret SEED_EMAIL/\n` +
      `   SEED_PASSWORD sudah terpasang SEBELUM menjalankan ini.\n`,
  );
}

/**
 * Tabel milik SKEMA KITA di sebuah database tenant.
 *
 * Mengecualikan tabel internal SQLite dan `_cf_%` milik D1. Definisinya satu di
 * sini dan dipakai baik saat mengumpulkan sasaran DROP maupun saat memverifikasi
 * sisa — dua kueri yang berbeda akan membuat verifikasinya bohong.
 */
const SQL_TABEL_TENANT =
  `SELECT name FROM sqlite_master ` +
  `WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\'`;

/** Jalankan SQL di sebuah database D1 lewat REST API. */
async function d1(databaseId, sql, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`D1 gagal (${res.status}): ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.result?.[0]?.results ?? [];
}

/**
 * Peta nama database → uuid, supaya `binding:TENANT_DB_3` bisa diterjemahkan.
 * Diambil dari API, bukan dengan mengurai wrangler.jsonc — konfigurasi itu
 * ber-komentar (JSONC) dan mengurainya dengan regex adalah cara yang rapuh.
 */
async function petaDatabase() {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database?per_page=100`,
    { headers: { Authorization: `Bearer ${API_TOKEN}` } },
  );
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(`Gagal membaca daftar D1: ${JSON.stringify(body.errors ?? body)}`);
  return new Map(body.result.map((db) => [db.name, db.uuid]));
}

/** `binding:TENANT_DB_3` → uuid database `erpindo-tenant-3`. */
function uuidDariRef(dbRef, peta) {
  const [jenis, ref] = dbRef.split(":", 2);
  if (jenis === "uuid") return ref;
  if (jenis !== "binding") throw new Error(`db_ref tidak dikenal: ${dbRef}`);
  const n = /^TENANT_DB_(\d+)$/.exec(ref)?.[1];
  if (!n) throw new Error(`Nama binding tak terduga: ${ref}`);
  const nama = `erpindo-tenant-${n}`;
  const uuid = peta.get(nama);
  if (!uuid) throw new Error(`Database '${nama}' tidak ada di akun ini`);
  return uuid;
}

const peta = await petaDatabase();

// --- 1. Kumpulkan sasaran & tampilkan rencananya -----------------------------
const sasaran = [];
for (const slug of SLUGS) {
  const [t] = await d1(CONTROL_DB_ID, `SELECT id, name, slug, db_ref, status FROM tenants WHERE slug = ?`, [slug]);
  if (!t) {
    console.error(`  ! '${slug}' tidak ditemukan di control-plane — dilewati`);
    continue;
  }
  const dbId = uuidDariRef(t.db_ref, peta);
  // Skema tenant hanya berisi TABLE (tidak ada view) — diperiksa terhadap
  // packages/db/src/migrations.ts, bukan diasumsikan.
  //
  // `_cf_KV` DIKECUALIKAN: D1 membuatnya sendiri di setiap database dan tidak
  // boleh di-DROP maupun dihitung sebagai sisa. Pengecualian yang sama persis
  // dipakai penjaga `poolMasihKosong()` di apps/api/src/lib/tenantDb.ts —
  // kalau keduanya tidak sepakat, slot yang sudah bersih tetap dibaca kotor.
  const tabel = await d1(dbId, SQL_TABEL_TENANT);
  sasaran.push({ ...t, dbId, tabel: tabel.map((r) => r.name) });
}

if (sasaran.length === 0) {
  console.error("Tidak ada sasaran yang valid.");
  process.exit(1);
}

console.log(`\nRencana pembersihan (${EKSEKUSI ? "EKSEKUSI" : "PRATINJAU — tambahkan --hapus untuk menjalankan"}):\n`);
for (const s of sasaran) {
  console.log(`  ${s.slug}`);
  console.log(`    nama    : ${s.name}`);
  console.log(`    status  : ${s.status}`);
  console.log(`    db_ref  : ${s.db_ref} → ${s.dbId}`);
  console.log(`    tabel   : ${s.tabel.length} akan di-DROP`);
}
console.log();

if (!EKSEKUSI) {
  console.log("Pratinjau saja. Tidak ada yang diubah.");
  process.exit(0);
}

// --- 2. Kosongkan database tenant DULU ---------------------------------------
for (const s of sasaran) {
  // URUTAN TERBALIK, dan ini bukan gaya penulisan melainkan syarat.
  //
  // D1 menyalakan foreign key, sehingga `DROP TABLE products` GAGAL selagi
  // tabel anak yang mereferensinya (invoice_lines, stock_levels, …) masih ada:
  //   "no such table: main.products: SQLITE_ERROR"
  // `sqlite_master` mengembalikan tabel dalam urutan pembuatan — yaitu induk
  // lebih dulu — jadi menghapus menurut urutan itu persis membentur masalahnya.
  // Membaliknya berarti anak dihapus sebelum induknya.
  //
  // Sekali jalan tanpa dibalik akan menolak SELURUH batch (D1 transaksional),
  // jadi kegagalannya kentara, bukan separuh jalan. Verifikasi di bawah tetap
  // menjadi penentu akhir.
  for (const nama of [...s.tabel].reverse()) {
    await d1(s.dbId, `DROP TABLE IF EXISTS "${nama}"`);
  }
  const sisa = await d1(s.dbId, SQL_TABEL_TENANT);
  if (sisa.length > 0) {
    // Berhenti SEBELUM menghapus baris control-plane: slot yang setengah bersih
    // tidak boleh terlihat bebas.
    console.error(`GAGAL: ${s.slug} masih menyisakan ${sisa.length} objek (${sisa.map((r) => r.name).join(", ")}).`);
    console.error("Baris control-plane TIDAK dihapus — slot tetap tertandai terpakai. Perbaiki lalu ulangi.");
    process.exit(1);
  }
  console.log(`  ✓ ${s.slug}: database dikosongkan (${s.tabel.length} objek)`);
}

// --- 3. BARU hapus baris control-plane ---------------------------------------
for (const s of sasaran) {
  // Semua tabel control-plane yang memuat tenant_id, ditelusuri dari skema
  // (packages/db/src/control-plane/schema.ts) — bukan dari ingatan.
  for (const tabel of [
    "audit_logs",
    "api_keys",
    "custom_roles",
    "drive_connections",
    "feedback",
    "payment_links",
    "subscription_invoices",
    "tokens",
    "webhook_deliveries",
    "webhooks",
    "memberships",
  ]) {
    await d1(CONTROL_DB_ID, `DELETE FROM ${tabel} WHERE tenant_id = ?`, [s.id]);
  }
  await d1(CONTROL_DB_ID, `DELETE FROM tenants WHERE id = ?`, [s.id]);
  console.log(`  ✓ ${s.slug}: baris control-plane dihapus`);
}

// --- 4. Sapu pengguna yatim --------------------------------------------------
//
// Pengguna yang keanggotaannya habis tidak bisa masuk ke mana pun lagi, tetapi
// emailnya masih memblokir pendaftaran ulang ("Email sudah terdaftar") — dan
// akun seeder/probe memakai email sekali pakai yang tak akan pernah dipakai
// orang. Sesi & tokennya ikut dicabut supaya tidak ada sesi hidup tanpa pemilik.
const yatim = await d1(
  CONTROL_DB_ID,
  `SELECT u.id, u.email FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = u.id)`,
);
for (const u of yatim) {
  await d1(CONTROL_DB_ID, `DELETE FROM sessions WHERE user_id = ?`, [u.id]);
  await d1(CONTROL_DB_ID, `DELETE FROM tokens WHERE user_id = ?`, [u.id]);
  await d1(CONTROL_DB_ID, `DELETE FROM users WHERE id = ?`, [u.id]);
  console.log(`  ✓ pengguna yatim dihapus: ${u.email}`);
}

console.log(`\nSelesai. ${sasaran.length} slot dibebaskan dan benar-benar kosong.`);
console.log("Verifikasi di Admin → Infra: 'Sisa kapasitas daftar' harus naik.");
