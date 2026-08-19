import {
  bankImportSchema,
  hitungPengisianKasKecil,
  hitungSelisihKas,
  journalTemplateSchema,
  kasKecilDanaTetapSchema,
  kasKecilOpnameSchema,
  kasKecilPengisianSchema,
  revaluasiBarisValas,
  ringkasRevaluasiValas,
  type ApiBankStatementItem,
  type ApiJournalTemplate,
  type ApiKasKecil,
} from "@erpindo/shared";
import type { SqlExecutor } from "@erpindo/db";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { galatAkunKasBank, postJournal, PeriodLockedError, SYS_ACCOUNTS } from "../lib/accounting";
import { audit } from "../lib/audit";
import { getTenantDb } from "../lib/tenantDb";
import { requireAuth, requireTenantRole } from "../middleware/auth";
import { clientIp } from "./auth";

/**
 * Keuangan lanjut (Fase 5d): template jurnal berulang + rekonsiliasi bank v1.
 *
 * - Template = jurnal siap pakai (sewa, listrik, dsb.). Terbit manual sekali
 *   klik, atau otomatis bulanan via cron bila schedule='monthly'.
 * - Rekonsiliasi: impor mutasi rekening koran (CSV di sisi klien → JSON),
 *   auto-match ke baris jurnal akun tsb. (nominal sama, tanggal ±3 hari),
 *   sisanya dicocokkan manual. Tidak pernah mengubah jurnal — hanya menandai.
 */

const MATCH_WINDOW_DAYS = 3;

function addMonthsClamped(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y!, m! - 1 + months, 1));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d!, lastDay)).padStart(2, "0")}`;
}

function shiftDays(dateStr: string, days: number): string {
  const t = new Date(`${dateStr}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

type TemplateRow = {
  id: string;
  name: string;
  memo: string | null;
  lines: string;
  schedule: string | null;
  next_run_date: string | null;
  is_active: number;
};

type StoredLine = { accountId: string; debit: number; credit: number };

/** Posting otomatis template terjadwal yang jatuh tempo (dipanggil cron harian). */
export async function runScheduledTemplates(db: SqlExecutor, today: string, createdBy: string): Promise<{ posted: number }> {
  const { results } = await db
    .prepare(
      `SELECT * FROM journal_templates
       WHERE is_active = 1 AND schedule = 'monthly' AND next_run_date IS NOT NULL AND next_run_date <= ?`,
    )
    .bind(today)
    .all<TemplateRow>();
  let posted = 0;
  for (const t of results) {
    const runDate = t.next_run_date!;
    try {
      const lines = JSON.parse(t.lines) as StoredLine[];
      await postJournal(db, { entryDate: runDate, memo: t.memo ?? t.name, createdBy, lines });
      posted++;
    } catch (err) {
      // Periode terkunci/akun terarsip: jangan macet — lewati posting periode
      // ini tapi tetap majukan jadwal agar tidak menumpuk selamanya.
      console.error(`[cron] template jurnal '${t.name}' gagal diposting:`, err);
    }
    await db
      .prepare(`UPDATE journal_templates SET next_run_date = ? WHERE id = ?`)
      .bind(addMonthsClamped(runDate, 1), t.id)
      .run();
  }
  return { posted };
}

/**
 * Jurnal penutup: pindahkan seluruh saldo pendapatan/beban s.d. `asOf` ke Laba
 * Ditahan (Fase 21d — diekstrak dari route supaya cron memakai logika yang SAMA).
 *
 * Disatukan dengan sengaja: menyalin perhitungannya ke cron berarti dua definisi
 * "laba ditahan" yang bisa menyimpang tanpa ada yang menyadarinya, dan selisih
 * antara tutup buku manual & otomatis adalah jenis selisih yang paling sulit
 * ditelusuri pemilik.
 *
 * `PeriodLockedError` sengaja TIDAK ditangkap di sini — pemanggilnya yang tahu
 * cara memperlakukannya (route → 409, cron → dilewati dengan alasan tercatat).
 */
export async function postClosingEntry(
  db: SqlExecutor,
  asOf: string,
  createdBy: string,
): Promise<{ entryNo: string; netProfit: number } | { error: string }> {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.type, SUM(jl.credit) - SUM(jl.debit) AS net
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.id = jl.account_id
       WHERE a.type IN ('income', 'expense') AND je.entry_date <= ?
       GROUP BY a.id, a.type
       HAVING net != 0`,
    )
    .bind(asOf)
    .all<{ id: string; type: string; net: number }>();
  if (results.length === 0) return { error: "Tidak ada saldo pendapatan/beban untuk ditutup." };

  const retained = (
    await db.prepare(`SELECT id FROM accounts WHERE code = '3-2000'`).all<{ id: string }>()
  ).results[0];
  if (!retained) return { error: "Akun Laba Ditahan (3-2000) tidak ditemukan. Muat ulang halaman, lalu pilih dari daftar terbaru." };

  // Balik saldo tiap akun P/L (income bersaldo kredit → debit; expense sebaliknya),
  // selisihnya (laba/rugi bersih) mendarat di Laba Ditahan.
  const lines = results.map((r) => ({
    accountId: r.id,
    debit: r.net > 0 ? r.net : 0,
    credit: r.net < 0 ? -r.net : 0,
  }));
  const netProfit = results.reduce((s, r) => s + r.net, 0);
  lines.push({ accountId: retained.id, debit: netProfit < 0 ? -netProfit : 0, credit: netProfit > 0 ? netProfit : 0 });

  const res = await postJournal(db, {
    entryDate: asOf,
    memo: `Jurnal penutup s.d. ${asOf} — laba/rugi bersih ke Laba Ditahan`,
    createdBy,
    lines: lines.filter((l) => l.debit !== 0 || l.credit !== 0),
  });
  return { entryNo: res.entryNo, netProfit };
}

/**
 * Kode akun yang dipakai revaluasi valas (Fase 22a).
 *
 * Fase 33c — `AKUN_HUTANG` dulu berisi `"2-1100"`, dan itu **PPN Keluaran**,
 * bukan Utang Usaha. Sisi utang direvaluasi ke akun pajak selama sebelas fase
 * tanpa satu gerbang pun memerah, persis karena jurnalnya **tetap seimbang**:
 * baris utang dan baris laba/rugi kurs sama besar, jadi neraca saldo cocok dan
 * smoke yang hanya memeriksa `netProfit` ikut hijau.
 *
 * Akibatnya bukan angka yang meleset sedikit, melainkan angka yang salah tempat
 * di satu-satunya akun yang paling sering dicocokkan pengguna dengan SPT-nya.
 *
 * Karena itu keduanya kini diambil dari `SYS_ACCOUNTS` — satu sumber yang sama
 * dengan yang dipakai posting faktur, sehingga kode akun tidak bisa lagi
 * menyimpang sendiri di berkas ini.
 */
const AKUN_PIUTANG = SYS_ACCOUNTS.PIUTANG;
const AKUN_HUTANG = SYS_ACCOUNTS.HUTANG;
const AKUN_LABA_KURS = "4-3000";
const AKUN_RUGI_KURS = "5-6000";

async function idAkun(db: SqlExecutor, code: string): Promise<string | null> {
  const { results } = await db.prepare(`SELECT id FROM accounts WHERE code = ?`).bind(code).all<{ id: string }>();
  return results[0]?.id ?? null;
}

export type HasilRevaluasi = {
  entryNo: string;
  entryNoPembalik: string;
  selisihPiutang: number;
  selisihHutang: number;
  labaBersih: number;
  jumlahDokumen: number;
};

/**
 * Revaluasi saldo piutang/utang valas ke kurs penutup (Fase 22a).
 *
 * ## Kenapa ada jurnal PEMBALIK, dan kenapa itu bukan pilihan gaya
 *
 * Piutang & utang disimpan dalam **IDR pada kurs faktur**: `invoices.total`
 * adalah hasil `valas × exchange_rate`, dan pelunasan menguranginya sebesar
 * `round(valas × kursFaktur)`. Artinya buku besar Piutang selalu sama dengan
 * jumlah sisa faktur pada kurs faktur — dan `computeForexSettlement()`
 * mengandalkan itu untuk menghitung selisih kurs yang TEREALISASI.
 *
 * Bila revaluasi ini dibiarkan permanen, dua hal rusak sekaligus:
 *
 * 1. GL Piutang berpisah dari subledger faktur — diam-diam, karena **neraca
 *    saldo tetap seimbang** (pelajaran Fase 21f: keseimbangan itu invarian
 *    yang murah, arah yang mahal);
 * 2. saat faktur itu dilunasi, `docRate` tidak berubah sehingga selisih yang
 *    sudah diakui di sini diakui **untuk kedua kalinya**.
 *
 * Membalik jurnalnya pada H+1 menyelesaikan keduanya tanpa menyentuh satu baris
 * pun di jalur pelunasan: laporan akhir periode memuat nilai wajar, sementara
 * subledger tetap satu-satunya sumber kebenaran AR/AP.
 */
export async function postForexRevaluation(
  db: SqlExecutor,
  asOf: string,
  createdBy: string,
): Promise<HasilRevaluasi | { error: string }> {
  // Kurs penutup diambil dari master kurs (Fase 2r), bukan dari input: angka
  // yang dipakai laporan harus sama dengan yang terlihat di layar Mata Uang.
  const { results: kursRows } = await db
    .prepare(`SELECT code, rate FROM currencies WHERE is_base = 0 AND rate > 0`)
    .all<{ code: string; rate: number }>();
  const kurs = new Map(kursRows.map((r) => [r.code, r.rate]));
  if (kurs.size === 0) return { error: "Belum ada mata uang asing terdaftar." };

  // Dokumen dibatalkan ditandai `voided_at`, BUKAN kolom status — kekeliruan
  // yang lolos `tsc` tanpa suara, karena SQL cuma string bagi TypeScript.
  const sisaSql = (tabel: string, kolomNo: string, kolomTgl: string) =>
    `SELECT ${kolomNo} AS doc_no, currency, exchange_rate AS rate,
            (total - paid_amount - returned_amount) AS sisa
     FROM ${tabel}
     WHERE currency != 'IDR' AND voided_at IS NULL AND ${kolomTgl} <= ?
       AND (total - paid_amount - returned_amount) > 0`;

  type BarisSisa = { doc_no: string; currency: string; rate: number; sisa: number };
  const [inv, pur] = await Promise.all([
    db.prepare(sisaSql("invoices", "invoice_no", "invoice_date")).bind(asOf).all<BarisSisa>(),
    db.prepare(sisaSql("purchases", "purchase_no", "purchase_date")).bind(asOf).all<BarisSisa>(),
  ]);

  const nilai = (rows: BarisSisa[]) =>
    rows
      .filter((r) => kurs.has(r.currency))
      .map((r) => revaluasiBarisValas({ docNo: r.doc_no, sisaIdr: r.sisa, kursFaktur: r.rate }, kurs.get(r.currency)!));

  const piutang = nilai(inv.results);
  const hutang = nilai(pur.results);
  const jumlahDokumen = piutang.length + hutang.length;
  if (jumlahDokumen === 0) return { error: "Tidak ada saldo valas yang perlu direvaluasi." };

  const { selisihPiutang, selisihHutang, labaBersih } = ringkasRevaluasiValas({ piutang, hutang });
  // Selisih nol berarti kurs penutup sama dengan kurs faktur pada SEMUA
  // dokumen. Memposting jurnal nol hanya mengotori buku besar.
  if (selisihPiutang === 0 && selisihHutang === 0) {
    return { error: "Kurs penutup sama dengan kurs faktur — tidak ada selisih untuk dijurnal." };
  }

  const [idPiutang, idHutang, idLaba, idRugi] = await Promise.all([
    idAkun(db, AKUN_PIUTANG),
    idAkun(db, AKUN_HUTANG),
    idAkun(db, AKUN_LABA_KURS),
    idAkun(db, AKUN_RUGI_KURS),
  ]);
  if (!idPiutang || !idHutang || !idLaba || !idRugi) return { error: "Akun sistem selisih kurs tidak ditemukan. Muat ulang halaman, lalu pilih dari daftar terbaru." };

  const baris: { accountId: string; description: string; debit: number; credit: number }[] = [];
  if (selisihPiutang !== 0) {
    baris.push({
      accountId: idPiutang,
      description: `Revaluasi piutang valas ${asOf}`,
      debit: selisihPiutang > 0 ? selisihPiutang : 0,
      credit: selisihPiutang < 0 ? -selisihPiutang : 0,
    });
  }
  if (selisihHutang !== 0) {
    // Utang bersaldo KREDIT: kenaikan nilainya dikredit, dan itu RUGI —
    // tanda yang paling mudah terbalik di seluruh fase ini.
    baris.push({
      accountId: idHutang,
      description: `Revaluasi utang valas ${asOf}`,
      debit: selisihHutang < 0 ? -selisihHutang : 0,
      credit: selisihHutang > 0 ? selisihHutang : 0,
    });
  }
  baris.push(
    labaBersih > 0
      ? { accountId: idLaba, description: `Laba selisih kurs belum terealisasi ${asOf}`, debit: 0, credit: labaBersih }
      : { accountId: idRugi, description: `Rugi selisih kurs belum terealisasi ${asOf}`, debit: -labaBersih, credit: 0 },
  );

  const utama = await postJournal(db, {
    entryDate: asOf,
    memo: `Revaluasi saldo valas ${asOf} (belum terealisasi)`,
    createdBy,
    lines: baris,
  });

  // Pembalik H+1. Dibuat DI SINI, bukan diserahkan ke pengguna: revaluasi yang
  // lupa dibalik adalah kesalahan yang tidak terlihat sampai berbulan-bulan
  // kemudian, saat fakturnya dilunasi dan labanya terhitung dua kali.
  const besok = new Date(`${asOf}T00:00:00Z`);
  besok.setUTCDate(besok.getUTCDate() + 1);
  const tglPembalik = besok.toISOString().slice(0, 10);
  const pembalik = await postJournal(db, {
    entryDate: tglPembalik,
    memo: `Pembalik revaluasi valas ${asOf}`,
    createdBy,
    lines: baris.map((l) => ({ ...l, description: `Pembalik — ${l.description}`, debit: l.credit, credit: l.debit })),
  });

  return {
    entryNo: utama.entryNo,
    entryNoPembalik: pembalik.entryNo,
    selisihPiutang,
    selisihHutang,
    labaBersih,
    jumlahDokumen,
  };
}

/**
 * Jurnal penutup tahunan otomatis (Fase 21d), dipanggil blok cron awal tahun.
 *
 * Menolak jalan bila tenant belum menyalakannya. Memposting jurnal ke buku besar
 * orang lain tanpa diminta bukan hal yang boleh menyala diam-diam — apalagi
 * jurnal penutup, yang menggeser SELURUH saldo laba-rugi sekaligus.
 */
export async function runYearlyClosing(
  db: SqlExecutor,
  asOf: string,
  createdBy: string,
): Promise<{ status: "mati" | "kosong" | "terkunci" | "diposting"; entryNo?: string; netProfit?: number; alasan?: string }> {
  const { results } = await db
    .prepare(`SELECT value FROM settings WHERE key = 'auto_closing_entry'`)
    .all<{ value: string }>();
  if (results[0]?.value !== "1") return { status: "mati" };

  try {
    const res = await postClosingEntry(db, asOf, createdBy);
    if ("error" in res) return { status: "kosong", alasan: res.error };
    return { status: "diposting", entryNo: res.entryNo, netProfit: res.netProfit };
  } catch (err) {
    // Justru tenant yang rajin tutup buku yang paling mungkin sudah mengunci
    // Desember sebelum cron sempat jalan. Itu keadaan wajar, bukan kegagalan
    // sistem — dilewati dengan alasannya, cron lanjut ke tenant berikutnya.
    if (err instanceof PeriodLockedError) return { status: "terkunci", alasan: err.message };
    throw err;
  }
}

/** Baris jurnal kandidat pencocokan untuk satu akun (nominal bertanda = debit − kredit). */
async function candidateLines(db: SqlExecutor, accountId: string) {
  const { results } = await db
    .prepare(
      `SELECT jl.id, jl.debit, jl.credit, je.entry_no, je.entry_date, COALESCE(jl.description, je.memo, '') AS description
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       WHERE jl.account_id = ?
         AND jl.id NOT IN (SELECT matched_journal_line_id FROM bank_statement_items WHERE matched_journal_line_id IS NOT NULL)
       ORDER BY je.entry_date DESC
       LIMIT 400`,
    )
    .bind(accountId)
    .all<{ id: string; debit: number; credit: number; entry_no: string; entry_date: string; description: string }>();
  return results.map((r) => ({
    id: r.id,
    entryNo: r.entry_no,
    entryDate: r.entry_date,
    description: r.description,
    amount: r.debit - r.credit,
  }));
}


// --- Kas kecil sistem dana tetap (Fase 22c) ---------------------------------

/**
 * Akun disemai migrasi 0044, tetapi dicari lewat KODE — bukan id tetap —
 * karena migrasinya sengaja `INSERT OR IGNORE`: tenant lama boleh saja sudah
 * punya akun berkode sama buatan sendiri, dan itu tidak boleh menggagalkan
 * migrasi. Konsekuensinya akun yang ketemu belum tentu bertipe benar, jadi
 * tipenya diperiksa sebelum dipakai.
 */
const KODE_KAS_KECIL = "1-1050";
const KODE_SELISIH_KAS = "5-4900";

const SET_DANA_TETAP = "petty_cash_imprest";
const SET_TERAKHIR_DIISI = "petty_cash_last_topup";

async function bacaSetting(db: SqlExecutor, key: string): Promise<string | null> {
  const { results } = await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind(key).all<{ value: string }>();
  return results[0]?.value ?? null;
}

async function tulisSetting(db: SqlExecutor, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, value, new Date().toISOString())
    .run();
}

type AkunRingkas = { id: string; type: string; is_archived: number };

async function akunByKode(db: SqlExecutor, code: string): Promise<AkunRingkas | null> {
  const { results } = await db
    .prepare(`SELECT id, type, is_archived FROM accounts WHERE code = ?`)
    .bind(code)
    .all<AkunRingkas>();
  return results[0] ?? null;
}

/**
 * Saldo buku besar satu akun bernormal DEBIT, hanya dari jurnal `posted`.
 *
 * Jurnal `void` sengaja tidak ikut: kalau ikut, pembatalan sebuah bon tidak
 * akan mengembalikan saldo kotak, dan pengisian ulang berikutnya akan kurang
 * persis sebesar bon yang sudah dibatalkan itu.
 */
async function saldoDebitAkun(db: SqlExecutor, accountId: string): Promise<number> {
  const { results } = await db
    .prepare(
      `SELECT COALESCE(SUM(l.debit), 0) AS d, COALESCE(SUM(l.credit), 0) AS cr
       FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
       WHERE l.account_id = ? AND e.status = 'posted'`,
    )
    .bind(accountId)
    .all<{ d: number; cr: number }>();
  const r = results[0];
  return (r?.d ?? 0) - (r?.cr ?? 0);
}

/** Keadaan kas kecil sekarang, atau alasan kenapa fiturnya belum bisa dipakai. */
async function statusKasKecil(db: SqlExecutor): Promise<{ akunId: string; status: ApiKasKecil } | { error: string }> {
  const akun = await akunByKode(db, KODE_KAS_KECIL);
  if (!akun) return { error: `Akun ${KODE_KAS_KECIL} Kas Kecil belum ada di daftar akun.` };
  if (akun.type !== "asset") {
    return { error: `Akun ${KODE_KAS_KECIL} bukan akun aset — kas kecil butuh akun bertipe aset.` };
  }
  const danaTetap = Number(await bacaSetting(db, SET_DANA_TETAP)) || 0;
  const saldo = await saldoDebitAkun(db, akun.id);
  return {
    akunId: akun.id,
    status: { ...hitungPengisianKasKecil(danaTetap, saldo), terakhirDiisi: await bacaSetting(db, SET_TERAKHIR_DIISI) },
  };
}

export const financeExtraRoutes = new Hono<AppEnv>()

  // ------------------------------- Template jurnal --------------------------
  .get("/:tenantId/journal-templates", requireAuth, requireTenantRole("viewer"), async (c) => {
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const { results } = await db.prepare(`SELECT * FROM journal_templates ORDER BY name`).all<TemplateRow>();
    const { results: accounts } = await db
      .prepare(`SELECT id, code, name FROM accounts`)
      .all<{ id: string; code: string; name: string }>();
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const templates: ApiJournalTemplate[] = results.map((t) => ({
      id: t.id,
      name: t.name,
      memo: t.memo,
      lines: (JSON.parse(t.lines) as StoredLine[]).map((l) => ({
        accountId: l.accountId,
        accountCode: byId.get(l.accountId)?.code ?? "?",
        accountName: byId.get(l.accountId)?.name ?? "(akun terhapus)",
        debit: l.debit,
        credit: l.credit,
      })),
      schedule: (t.schedule as "monthly" | null) ?? null,
      nextRunDate: t.next_run_date,
      isActive: t.is_active === 1,
    }));
    return c.json({ templates });
  })

  .post("/:tenantId/journal-templates", requireAuth, requireTenantRole("admin"), async (c) => {
    const parsed = journalTemplateSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const { name, memo, lines, schedule, nextRunDate } = parsed.data;
    const debit = lines.reduce((s, l) => s + l.debit, 0);
    const credit = lines.reduce((s, l) => s + l.credit, 0);
    if (debit !== credit || debit === 0) {
      return c.json({ error: "Template harus seimbang (total debit = total kredit, bukan nol)." }, 400);
    }
    if (schedule && !nextRunDate) {
      return c.json({ error: "Jadwal bulanan membutuhkan tanggal terbit pertama." }, 400);
    }
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    for (const l of lines) {
      const acc = await db.prepare(`SELECT id FROM accounts WHERE id = ? AND is_archived = 0`).bind(l.accountId).all();
      if (acc.results.length === 0) return c.json({ error: "Ada baris dengan akun yang tidak dikenal/terarsip." }, 400);
    }
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO journal_templates (id, name, memo, lines, schedule, next_run_date, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      )
      .bind(
        id,
        name,
        memo ?? null,
        JSON.stringify(lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit }))),
        schedule ?? null,
        schedule ? (nextRunDate ?? null) : null,
        new Date().toISOString(),
      )
      .run();
    await audit(c.env, { action: "accounting.template_created", userId: c.get("user").id, tenantId: c.get("tenant").id, detail: { name }, ip: clientIp(c) });
    return c.json({ ok: true, id }, 201);
  })

  .delete("/:tenantId/journal-templates/:id", requireAuth, requireTenantRole("admin"), async (c) => {
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    await db.prepare(`DELETE FROM journal_templates WHERE id = ?`).bind(c.req.param("id")).run();
    return c.json({ ok: true });
  })

  /** Terbitkan template sekarang (manual) — jurnal bertanggal hari ini. */
  .post("/:tenantId/journal-templates/:id/post", requireAuth, requireTenantRole("admin"), async (c) => {
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const { results } = await db.prepare(`SELECT * FROM journal_templates WHERE id = ?`).bind(c.req.param("id")).all<TemplateRow>();
    const t = results[0];
    if (!t) return c.json({ error: "Template tidak ditemukan. Muat ulang halaman, lalu pilih dari daftar terbaru." }, 404);
    try {
      const res = await postJournal(db, {
        entryDate: new Date().toISOString().slice(0, 10),
        memo: t.memo ?? t.name,
        createdBy: c.get("user").id,
        lines: JSON.parse(t.lines) as StoredLine[],
      });
      return c.json({ ok: true, entryNo: res.entryNo }, 201);
    } catch (err) {
      if (err instanceof PeriodLockedError) return c.json({ error: err.message }, 409);
      return c.json({ error: (err as Error).message }, 400);
    }
  })

  // ------------------------------ Rekonsiliasi bank --------------------------
  .post("/:tenantId/bank-recon/import", requireAuth, requireTenantRole("admin"), async (c) => {
    const parsed = bankImportSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
    }
    const { accountId, items } = parsed.data;
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const acc = await db
      .prepare(`SELECT id FROM accounts WHERE id = ? AND type = 'asset' AND is_archived = 0`)
      .bind(accountId)
      .all();
    if (acc.results.length === 0) return c.json({ error: "Akun kas atau bank itu tidak ditemukan. Muat ulang halaman, lalu pilih dari daftar akun." }, 400);

    const candidates = await candidateLines(db, accountId);
    const used = new Set<string>();
    let autoMatched = 0;
    const now = new Date().toISOString();
    for (const item of items) {
      const lo = shiftDays(item.date, -MATCH_WINDOW_DAYS);
      const hi = shiftDays(item.date, MATCH_WINDOW_DAYS);
      const hit = candidates.find((l) => !used.has(l.id) && l.amount === item.amount && l.entryDate >= lo && l.entryDate <= hi);
      if (hit) {
        used.add(hit.id);
        autoMatched++;
      }
      await db
        .prepare(
          `INSERT INTO bank_statement_items (id, account_id, stmt_date, description, amount, matched_journal_line_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), accountId, item.date, item.description, item.amount, hit?.id ?? null, now)
        .run();
    }
    await audit(c.env, { action: "accounting.bank_imported", userId: c.get("user").id, tenantId: c.get("tenant").id, detail: { count: items.length, autoMatched }, ip: clientIp(c) });
    return c.json({ ok: true, imported: items.length, autoMatched }, 201);
  })

  .get("/:tenantId/bank-recon", requireAuth, requireTenantRole("viewer"), async (c) => {
    const accountId = c.req.query("accountId") ?? "";
    if (!accountId) return c.json({ error: "accountId wajib diisi" }, 400);
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const { results } = await db
      .prepare(
        `SELECT b.id, b.stmt_date, b.description, b.amount, b.matched_journal_line_id, je.entry_no
         FROM bank_statement_items b
         LEFT JOIN journal_lines jl ON jl.id = b.matched_journal_line_id
         LEFT JOIN journal_entries je ON je.id = jl.entry_id
         WHERE b.account_id = ?
         ORDER BY b.stmt_date DESC, b.description
         LIMIT 500`,
      )
      .bind(accountId)
      .all<{ id: string; stmt_date: string; description: string; amount: number; matched_journal_line_id: string | null; entry_no: string | null }>();
    const items: ApiBankStatementItem[] = results.map((r) => ({
      id: r.id,
      stmtDate: r.stmt_date,
      description: r.description,
      amount: r.amount,
      matchedJournalLineId: r.matched_journal_line_id,
      matchedEntryNo: r.entry_no,
    }));
    const unmatchedLines = (await candidateLines(db, accountId)).slice(0, 100);
    const matched = items.filter((i) => i.matchedJournalLineId !== null).length;
    return c.json({
      items,
      unmatchedLines,
      summary: { total: items.length, matched, unmatched: items.length - matched },
    });
  })

  .post("/:tenantId/bank-recon/:itemId/match", requireAuth, requireTenantRole("admin"), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { journalLineId?: string };
    if (!body.journalLineId) return c.json({ error: "journalLineId wajib diisi" }, 400);
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const item = (
      await db.prepare(`SELECT id, account_id FROM bank_statement_items WHERE id = ?`).bind(c.req.param("itemId")).all<{ id: string; account_id: string }>()
    ).results[0];
    if (!item) return c.json({ error: "Baris mutasi tidak ditemukan. Muat ulang halaman, lalu pilih dari daftar terbaru." }, 404);
    const line = (
      await db.prepare(`SELECT id FROM journal_lines WHERE id = ? AND account_id = ?`).bind(body.journalLineId, item.account_id).all()
    ).results[0];
    if (!line) return c.json({ error: "Baris jurnal tidak ditemukan pada akun yang sama." }, 400);
    const taken = (
      await db.prepare(`SELECT id FROM bank_statement_items WHERE matched_journal_line_id = ? AND id != ?`).bind(body.journalLineId, item.id).all()
    ).results[0];
    if (taken) return c.json({ error: "Baris jurnal itu sudah dicocokkan ke mutasi lain." }, 409);
    await db.prepare(`UPDATE bank_statement_items SET matched_journal_line_id = ? WHERE id = ?`).bind(body.journalLineId, item.id).run();
    return c.json({ ok: true });
  })

  .post("/:tenantId/bank-recon/:itemId/unmatch", requireAuth, requireTenantRole("admin"), async (c) => {
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    await db.prepare(`UPDATE bank_statement_items SET matched_journal_line_id = NULL WHERE id = ?`).bind(c.req.param("itemId")).run();
    return c.json({ ok: true });
  })

  /** Jurnal penutup tahunan: pindahkan laba berjalan s.d. tanggal ke Laba Ditahan. */
  .post("/:tenantId/closing-entry", requireAuth, requireTenantRole("owner"), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { asOf?: string };
    const asOf = body.asOf ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return c.json({ error: "Tanggal tidak valid (YYYY-MM-DD)" }, 400);
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    try {
      // Fase 21d: perhitungannya dipakai bersama jalur cron tahunan — satu
      // definisi "laba ditahan", bukan dua yang bisa menyimpang diam-diam.
      const res = await postClosingEntry(db, asOf, c.get("user").id);
      if ("error" in res) return c.json({ error: res.error }, 400);
      await audit(c.env, { action: "accounting.closing_entry", userId: c.get("user").id, tenantId: c.get("tenant").id, detail: { asOf, netProfit: res.netProfit }, ip: clientIp(c) });
      return c.json({ ok: true, entryNo: res.entryNo, netProfit: res.netProfit }, 201);
    } catch (err) {
      if (err instanceof PeriodLockedError) return c.json({ error: err.message }, 409);
      return c.json({ error: (err as Error).message }, 400);
    }
  })

  /** Revaluasi saldo piutang/utang valas ke kurs penutup (Fase 22a). */
  .post("/:tenantId/forex-revaluation", requireAuth, requireTenantRole("admin"), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { asOf?: string };
    const asOf = body.asOf ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return c.json({ error: "Tanggal tidak valid (YYYY-MM-DD)" }, 400);
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    try {
      const res = await postForexRevaluation(db, asOf, c.get("user").id);
      if ("error" in res) return c.json({ error: res.error }, 400);
      await audit(c.env, { action: "accounting.forex_revaluation", userId: c.get("user").id, tenantId: c.get("tenant").id, detail: { asOf, labaBersih: res.labaBersih, jumlahDokumen: res.jumlahDokumen }, ip: clientIp(c) });
      return c.json({ ok: true, ...res }, 201);
    } catch (err) {
      if (err instanceof PeriodLockedError) return c.json({ error: err.message }, 409);
      return c.json({ error: (err as Error).message }, 400);
    }
  })

  // -------------------------------------------------------------------------
  // Kas kecil sistem dana tetap (Fase 22c)
  // -------------------------------------------------------------------------
  .get("/:tenantId/petty-cash", requireAuth, requireTenantRole("viewer"), async (c) => {
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const res = await statusKasKecil(db);
    if ("error" in res) return c.json({ error: res.error }, 400);
    return c.json(res.status);
  })

  .patch("/:tenantId/petty-cash", requireAuth, requireTenantRole("admin"), async (c) => {
    const parsed = kasKecilDanaTetapSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, 400);
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const res = await statusKasKecil(db);
    if ("error" in res) return c.json({ error: res.error }, 400);

    await tulisSetting(db, SET_DANA_TETAP, String(parsed.data.danaTetap));
    await audit(c.env, {
      action: "accounting.petty_cash_imprest",
      userId: c.get("user").id,
      tenantId: c.get("tenant").id,
      detail: { danaTetap: parsed.data.danaTetap },
      ip: clientIp(c),
    });
    const sesudah = await statusKasKecil(db);
    return c.json("error" in sesudah ? { error: sesudah.error } : sesudah.status);
  })

  /**
   * Pengisian ulang. **Jumlahnya dihitung server**, tidak diterima dari klien:
   * dana tetap dikurangi saldo buku besar saat ini. Menerimanya dari klien
   * berarti layar yang saldonya sudah basi bisa mengisi kotak melebihi dana
   * tetapnya — dan kelebihan itu tidak melanggar satu pun aturan double-entry,
   * jadi tak ada gerbang akuntansi yang akan menangkapnya.
   */
  .post("/:tenantId/petty-cash/replenish", requireAuth, requireTenantRole("admin"), async (c) => {
    const parsed = kasKecilPengisianSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, 400);
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const res = await statusKasKecil(db);
    if ("error" in res) return c.json({ error: res.error }, 400);
    const { akunId, status } = res;

    if (status.danaTetap <= 0) return c.json({ error: "Setel dana tetap kas kecil lebih dulu." }, 400);
    if (status.kekurangan <= 0) {
      return c.json({ error: "Kas kecil masih penuh — tidak ada yang perlu diisi." }, 400);
    }

    const sumber = (
      await db
        .prepare(`SELECT id, type, is_archived FROM accounts WHERE id = ?`)
        .bind(parsed.data.sourceAccountId)
        .all<AkunRingkas>()
    ).results[0];
    if (!sumber || sumber.type !== "asset" || sumber.is_archived) {
      return c.json({ error: galatAkunKasBank("sumber") }, 400);
    }
    // Memindahkan uang dari kas kecil ke kas kecil: jurnalnya SEIMBANG, saldonya
    // tidak berubah, dan layarnya akan melaporkan pengisian yang berhasil.
    // Ditolak di sini karena tidak ada lapisan lain yang akan menolaknya.
    if (sumber.id === akunId) return c.json({ error: "Akun sumber tidak boleh kas kecil itu sendiri." }, 400);

    try {
      const jurnal = await postJournal(db, {
        entryDate: parsed.data.entryDate,
        memo: `Pengisian ulang kas kecil Rp ${status.kekurangan.toLocaleString("id-ID")}`,
        createdBy: c.get("user").id,
        lines: [
          { accountId: akunId, debit: status.kekurangan, credit: 0, description: "Pengisian kas kecil" },
          { accountId: sumber.id, debit: 0, credit: status.kekurangan, description: "Pengisian kas kecil" },
        ],
      });
      await tulisSetting(db, SET_TERAKHIR_DIISI, parsed.data.entryDate);
      await audit(c.env, {
        action: "accounting.petty_cash_replenish",
        userId: c.get("user").id,
        tenantId: c.get("tenant").id,
        detail: { jumlah: status.kekurangan, entryNo: jurnal.entryNo },
        ip: clientIp(c),
      });
      const sesudah = await statusKasKecil(db);
      return c.json(
        { ok: true, jumlah: status.kekurangan, entryNo: jurnal.entryNo, status: "error" in sesudah ? null : sesudah.status },
        201,
      );
    } catch (err) {
      if (err instanceof PeriodLockedError) return c.json({ error: err.message }, 409);
      return c.json({ error: (err as Error).message }, 400);
    }
  })

  /**
   * Opname: hitungan fisik kotak dibandingkan saldo bukunya, selisihnya
   * dijurnal ke `5-4900 Selisih Kas`.
   *
   * ⚠️ Arah jurnalnya adalah bagian paling mudah terbalik di seluruh fase ini,
   * dan neraca saldo tetap seimbang pada arah yang salah. Yang menjaganya
   * adalah invarian setelahnya: saldo buku besar kas kecil HARUS sama persis
   * dengan hitungan fisik yang dimasukkan.
   */
  .post("/:tenantId/petty-cash/count", requireAuth, requireTenantRole("admin"), async (c) => {
    const parsed = kasKecilOpnameSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, 400);
    const db = getTenantDb(c.env, c.get("tenant").dbRef);
    const res = await statusKasKecil(db);
    if ("error" in res) return c.json({ error: res.error }, 400);
    const { akunId, status } = res;

    const selisih = hitungSelisihKas(status.saldoBuku, parsed.data.hitunganFisik);
    if (selisih.arah === "pas") {
      // Cocok = tidak ada jurnal. Jurnal nol hanya mengotori buku besar dengan
      // baris yang tidak menyatakan apa pun.
      return c.json({ ok: true, selisih: 0, arah: selisih.arah, entryNo: null, status: status });
    }

    const akunSelisih = await akunByKode(db, KODE_SELISIH_KAS);
    if (!akunSelisih) return c.json({ error: `Akun ${KODE_SELISIH_KAS} Selisih Kas belum ada di daftar akun.` }, 400);

    const nilai = Math.abs(selisih.selisih);
    const catatan = parsed.data.note?.trim() || null;
    const kurang = selisih.arah === "kurang";
    try {
      const jurnal = await postJournal(db, {
        entryDate: parsed.data.entryDate,
        memo: `Opname kas kecil — ${kurang ? "kurang" : "lebih"} Rp ${nilai.toLocaleString("id-ID")}${catatan ? ` (${catatan})` : ""}`,
        createdBy: c.get("user").id,
        lines: kurang
          ? [
              { accountId: akunSelisih.id, debit: nilai, credit: 0, description: "Selisih kas kecil (kurang)" },
              { accountId: akunId, debit: 0, credit: nilai, description: "Selisih kas kecil (kurang)" },
            ]
          : [
              { accountId: akunId, debit: nilai, credit: 0, description: "Selisih kas kecil (lebih)" },
              { accountId: akunSelisih.id, debit: 0, credit: nilai, description: "Selisih kas kecil (lebih)" },
            ],
      });
      await audit(c.env, {
        action: "accounting.petty_cash_count",
        userId: c.get("user").id,
        tenantId: c.get("tenant").id,
        detail: { hitunganFisik: parsed.data.hitunganFisik, selisih: selisih.selisih, entryNo: jurnal.entryNo },
        ip: clientIp(c),
      });
      const sesudah = await statusKasKecil(db);
      return c.json(
        { ok: true, selisih: selisih.selisih, arah: selisih.arah, entryNo: jurnal.entryNo, status: "error" in sesudah ? null : sesudah.status },
        201,
      );
    } catch (err) {
      if (err instanceof PeriodLockedError) return c.json({ error: err.message }, 409);
      return c.json({ error: (err as Error).message }, 400);
    }
  });
