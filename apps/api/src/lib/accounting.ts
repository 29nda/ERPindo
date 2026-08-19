import type { SqlExecutor } from "@erpindo/db";
import { docNumberScopePrefix, renderDocNumber, type ApiDocNumbering, type DocType } from "@erpindo/shared";

/**
 * Helper akuntansi & stok yang dipakai lintas modul (jurnal manual, penjualan,
 * pembelian, pembayaran). Semua nominal INTEGER rupiah.
 */

/** Kode akun sistem (disemai migrasi 0002) yang menjadi sasaran jurnal otomatis. */
export const SYS_ACCOUNTS = {
  KAS: "1-1000",
  BANK: "1-1100",
  PIUTANG: "1-1200",
  PERSEDIAAN: "1-1300",
  PPN_MASUKAN: "1-1400",
  HUTANG: "2-1000",
  PPN_KELUARAN: "2-1100",
  PENDAPATAN: "4-1000",
  HPP: "5-1000",
  /**
   * Kontra-beban penyerapan produksi (Fase 21f). Dikredit saat biaya tenaga
   * kerja & overhead dikapitalisasi ke nilai persediaan, membatalkan beban yang
   * sudah tercatat lewat penggajian/biaya operasional supaya tidak dobel.
   */
  PRODUKSI_DISERAP: "5-2100",
} as const;

/**
 * Satu kalimat untuk SATU aturan: akun yang dipakai membayar atau menerima uang
 * harus bertipe **aset** dan belum diarsipkan.
 *
 * Fase 33g — aturan ini sebelumnya diucapkan dengan **sembilan bunyi berbeda**
 * di sebelas tempat: "Akun pembayar harus akun kas/bank (aset).", "Akun
 * pembayaran harus akun kas/bank (tipe aset).", "Akun refund harus akun aset
 * (kas/bank) yang aktif.", dan seterusnya. Aturannya sama persis; yang berbeda
 * hanya kata yang kebetulan dipilih penulisnya saat itu.
 *
 * Akibatnya bukan sekadar tidak rapi: pengguna yang menemuinya di dua layar
 * berbeda tidak punya cara tahu bahwa ia sedang menabrak aturan yang sama.
 *
 * Peran (`pembayar`, `penerima`, `sumber`, …) tetap disebut karena di layar
 * dengan beberapa pilihan akun, ia satu-satunya petunjuk kolom mana yang salah.
 */
export function galatAkunKasBank(peran: string): string {
  return `Akun ${peran} harus akun kas atau bank yang masih aktif. Pilih salah satunya di daftar akun.`;
}

export async function accountIdByCode(db: SqlExecutor, code: string): Promise<string> {
  const { results } = await db.prepare(`SELECT id FROM accounts WHERE code = ?`).bind(code).all<{ id: string }>();
  const row = results[0];
  if (!row) throw new Error(`Akun sistem ${code} tidak ditemukan`);
  return row.id;
}

/** Baca pola penomoran kustom tenant (settings 'doc_numbering') utk satu jenis dokumen. */
async function tenantDocPattern(db: SqlExecutor, docType: DocType): Promise<string | null> {
  const { results } = await db
    .prepare(`SELECT value FROM settings WHERE key = 'doc_numbering'`)
    .all<{ value: string }>();
  const raw = results[0]?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ApiDocNumbering;
    return parsed[docType] ?? null;
  } catch {
    return null;
  }
}

/**
 * Nomor dokumen berurutan per tenant. Default: `PREFIX-00001`. Bila `opts.docType`
 * diberikan DAN tenant menyetel pola kustom (Fase 13i), pola itu dipakai — urutan
 * di-scope pada bagian pola sebelum {SEQ} (mis. `INV-{YYYY}{MM}-{SEQ:4}` reset
 * tiap bulan) dengan menghitung nomor berawalan sama di kolom `opts.column`.
 */
export async function nextDocNo(
  db: SqlExecutor,
  table: string,
  prefix: string,
  opts?: { docType?: DocType; column?: string; date?: string },
): Promise<string> {
  if (opts?.docType && opts.column) {
    const pattern = await tenantDocPattern(db, opts.docType);
    if (pattern) {
      const date = opts.date ?? new Date().toISOString().slice(0, 10);
      // Escape wildcard agar '%'/'_' pada scope dicari sebagai literal.
      const scope = docNumberScopePrefix(pattern, date).replace(/[\\%_]/g, (ch) => `\\${ch}`);
      const { results } = await db
        .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${opts.column} LIKE ? ESCAPE '\\'`)
        .bind(`${scope}%`)
        .all<{ n: number }>();
      return renderDocNumber(pattern, date, (results[0]?.n ?? 0) + 1);
    }
  }
  const { results } = await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).all<{ n: number }>();
  return `${prefix}-${String((results[0]?.n ?? 0) + 1).padStart(5, "0")}`;
}

export type JournalLineInput = {
  accountId: string;
  description?: string | null;
  debit: number;
  credit: number;
  /** Dimensi opsional (Fase 7f): cost center per baris. */
  costCenterId?: string | null;
};

/**
 * Posting jurnal double-entry. Menolak jurnal tidak seimbang — benteng terakhir
 * setelah validasi Zod di endpoint (jalur otomatis juga lewat sini).
 */
export class PeriodLockedError extends Error {}

/** Tanggal tutup buku (settings key 'locked_before'); transaksi ≤ tanggal ini terkunci. */
export async function getLockedBefore(db: SqlExecutor): Promise<string | null> {
  const { results } = await db
    .prepare(`SELECT value FROM settings WHERE key = 'locked_before'`)
    .all<{ value: string }>();
  return results[0]?.value ?? null;
}

export async function postJournal(
  db: SqlExecutor,
  input: {
    entryDate: string;
    memo?: string | null;
    createdBy: string;
    lines: JournalLineInput[];
    /** Opsional: tag ke proyek untuk laporan profitabilitas (Fase 2q). */
    projectId?: string | null;
  },
): Promise<{ id: string; entryNo: string }> {
  const debit = input.lines.reduce((s, l) => s + l.debit, 0);
  const credit = input.lines.reduce((s, l) => s + l.credit, 0);
  if (debit !== credit || debit === 0 || input.lines.length < 2) {
    throw new Error(`Jurnal tidak seimbang (debit ${debit}, kredit ${credit})`);
  }

  // Gerbang tutup buku: semua jalur posting (manual, faktur, pembayaran)
  // lewat sini, jadi periode terkunci tidak bisa ditembus dari mana pun.
  const lockedBefore = await getLockedBefore(db);
  if (lockedBefore && input.entryDate <= lockedBefore) {
    throw new PeriodLockedError(
      `Periode sampai ${lockedBefore} sudah ditutup — transaksi bertanggal ${input.entryDate} ditolak.`,
    );
  }

  const entryNo = await nextDocNo(db, "journal_entries", "JRN");
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO journal_entries (id, entry_no, entry_date, memo, status, created_by, project_id)
       VALUES (?, ?, ?, ?, 'posted', ?, ?)`,
    )
    .bind(id, entryNo, input.entryDate, input.memo ?? null, input.createdBy, input.projectId ?? null)
    .run();
  for (const line of input.lines) {
    await db
      .prepare(
        `INSERT INTO journal_lines (id, entry_id, account_id, description, debit, credit, cost_center_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), id, line.accountId, line.description ?? null, line.debit, line.credit, line.costCenterId ?? null)
      .run();
  }
  return { id, entryNo };
}

export class AlreadyReversedError extends Error {}

/**
 * Jurnal pembalik generik (Fase 10c): baris asal ditukar debit↔kredit
 * (cost center DIPERTAHANKAN), tanggal default = tanggal jurnal asal sehingga
 * gerbang tutup buku tetap berlaku.
 *
 * Penjaga "dibalik tepat sekali" bersifat keras: klaim atomik lewat
 * `UPDATE ... SET reversed_by_entry_id = id ... WHERE reversed_by_entry_id IS
 * NULL RETURNING` (sentinel = id jurnal sendiri — FK-safe); gagal klaim →
 * AlreadyReversedError. Bila postJournal melempar (mis. periode terkunci),
 * klaim dilepas kembali sebelum error diteruskan.
 */
export async function reverseJournal(
  db: SqlExecutor,
  entryId: string,
  opts: { date?: string; memo: string; userId: string },
): Promise<{ id: string; entryNo: string }> {
  const { results: entries } = await db
    .prepare(`SELECT id, entry_no, entry_date, status FROM journal_entries WHERE id = ?`)
    .bind(entryId)
    .all<{ id: string; entry_no: string; entry_date: string; status: string }>();
  const entry = entries[0];
  if (!entry || entry.status !== "posted") throw new Error("Jurnal asal dokumen tidak ditemukan.");

  const { results: origLines } = await db
    .prepare(`SELECT account_id, description, debit, credit, cost_center_id FROM journal_lines WHERE entry_id = ?`)
    .bind(entryId)
    .all<{ account_id: string; description: string | null; debit: number; credit: number; cost_center_id: string | null }>();
  if (origLines.length < 2) throw new Error("Jurnal asal dokumen tidak ditemukan.");

  const { results: claimed } = await db
    .prepare(
      `UPDATE journal_entries SET reversed_by_entry_id = id
       WHERE id = ? AND reversed_by_entry_id IS NULL RETURNING id`,
    )
    .bind(entryId)
    .all<{ id: string }>();
  if (!claimed[0]) throw new AlreadyReversedError(`Jurnal ${entry.entry_no} sudah pernah dibalik.`);

  let reversal: { id: string; entryNo: string };
  try {
    reversal = await postJournal(db, {
      entryDate: opts.date ?? entry.entry_date,
      memo: opts.memo,
      createdBy: opts.userId,
      lines: origLines.map((l) => ({
        accountId: l.account_id,
        description: `${opts.memo}${l.description ? ` — ${l.description}` : ""}`,
        debit: l.credit,
        credit: l.debit,
        costCenterId: l.cost_center_id,
      })),
    });
  } catch (err) {
    // Lepas klaim agar jurnal bisa dibalik ulang (mis. dengan tanggal lain).
    await db
      .prepare(`UPDATE journal_entries SET reversed_by_entry_id = NULL WHERE id = ? AND reversed_by_entry_id = id`)
      .bind(entryId)
      .run();
    throw err;
  }

  await db
    .prepare(`UPDATE journal_entries SET reversed_by_entry_id = ? WHERE id = ?`)
    .bind(reversal.id, entryId)
    .run();
  await db.prepare(`UPDATE journal_entries SET reverses_entry_id = ? WHERE id = ?`).bind(entryId, reversal.id).run();
  return reversal;
}

/**
 * Cari dokumen sumber sebuah jurnal (Fase 10c). Jurnal TIDAK menyimpan kolom
 * ref, jadi keterkaitan dicek terbalik: 13 tabel dokumen ber-journal_entry_id.
 * Mengembalikan label dokumen (untuk pesan galat) atau null bila jurnal berdiri
 * sendiri (jurnal manual / template).
 */
export async function journalSourceDoc(db: SqlExecutor, entryId: string): Promise<string | null> {
  const sources: [table: string, label: string][] = [
    ["invoices", "faktur penjualan"],
    ["purchases", "faktur pembelian"],
    ["payments", "pembayaran"],
    ["returns", "retur"],
    ["pos_shifts", "rekap shift kasir"],
    ["payroll_runs", "penggajian"],
    ["fixed_assets", "aset tetap"],
    ["depreciation_entries", "penyusutan aset"],
    ["work_orders", "perintah produksi"],
    ["employee_loans", "kasbon karyawan"],
    ["delivery_orders", "surat jalan"],
    ["tax_pph_final", "PPh Final"],
    ["tax_pph23", "PPh 23"],
  ];
  // Satu query per tabel — D1 membatasi jumlah term compound SELECT, jadi
  // UNION ALL 13 tabel ditolak ("too many terms in compound SELECT").
  for (const [table, label] of sources) {
    const { results } = await db
      .prepare(`SELECT 1 AS x FROM ${table} WHERE journal_entry_id = ? LIMIT 1`)
      .bind(entryId)
      .all<{ x: number }>();
    if (results[0]) return label;
  }
  return null;
}

/**
 * Barang masuk: catat mutasi dan perbarui level stok dengan moving average:
 * avg_baru = (qty_lama×avg_lama + qty_masuk×biaya_masuk) / (qty_lama+qty_masuk)
 */
export async function stockIn(
  db: SqlExecutor,
  input: {
    productId: string;
    warehouseId: string;
    qty: number;
    unitCost: number;
    refType: string;
    refId: string;
    /** Opsional: lot/batch + tanggal kedaluwarsa (produk berpelacakan). */
    lot?: { lotNo: string | null; expiryDate: string | null };
  },
): Promise<void> {
  if (input.lot) {
    const { results } = await db
      .prepare(
        `SELECT id FROM stock_lots WHERE product_id = ? AND warehouse_id = ?
           AND COALESCE(lot_no,'') = COALESCE(?,'') AND COALESCE(expiry_date,'') = COALESCE(?,'')`,
      )
      .bind(input.productId, input.warehouseId, input.lot.lotNo, input.lot.expiryDate)
      .all<{ id: string }>();
    if (results[0]) {
      await db.prepare(`UPDATE stock_lots SET qty = qty + ? WHERE id = ?`).bind(input.qty, results[0].id).run();
    } else {
      await db
        .prepare(
          `INSERT INTO stock_lots (id, product_id, warehouse_id, lot_no, expiry_date, qty) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), input.productId, input.warehouseId, input.lot.lotNo, input.lot.expiryDate, input.qty)
        .run();
    }
  }
  await db
    .prepare(
      `INSERT INTO stock_movements (id, product_id, warehouse_id, ref_type, ref_id, qty, unit_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), input.productId, input.warehouseId, input.refType, input.refId, input.qty, input.unitCost)
    .run();

  const { results } = await db
    .prepare(`SELECT qty, avg_cost FROM stock_levels WHERE product_id = ? AND warehouse_id = ?`)
    .bind(input.productId, input.warehouseId)
    .all<{ qty: number; avg_cost: number }>();
  const level = results[0];

  if (!level) {
    await db
      .prepare(`INSERT INTO stock_levels (product_id, warehouse_id, qty, avg_cost) VALUES (?, ?, ?, ?)`)
      .bind(input.productId, input.warehouseId, input.qty, input.unitCost)
      .run();
    return;
  }
  const newQty = level.qty + input.qty;
  const newAvg = Math.round((level.qty * level.avg_cost + input.qty * input.unitCost) / newQty);
  await db
    .prepare(`UPDATE stock_levels SET qty = ?, avg_cost = ? WHERE product_id = ? AND warehouse_id = ?`)
    .bind(newQty, newAvg, input.productId, input.warehouseId)
    .run();
}

export class InsufficientStockError extends Error {}

/**
 * Barang keluar dari BEBERAPA gudang sekaligus (Fase 20g).
 *
 * Tiap gudang punya `avg_cost` sendiri, jadi HPP-nya dijumlahkan per sumber —
 * bukan dihitung dari satu rata-rata gabungan. Ini yang membuat angkanya benar:
 * mengambil 10 unit dari gudang berbiaya 12rb dan 5 unit dari gudang berbiaya
 * 20rb menghasilkan HPP 220rb, bukan 15 × rata-rata mana pun.
 *
 * Validasi seluruh pengambilan dilakukan LEBIH DULU sebelum satu pun stok
 * dikurangi. Tanpa itu, permintaan yang gagal di gudang kedua akan meninggalkan
 * gudang pertama sudah berkurang — stok hilang tanpa dokumen apa pun.
 *
 * Gudang yang sama boleh disebut lebih dari sekali; permintaannya DIJUMLAHKAN
 * dulu. Tanpa penjumlahan itu, dua permintaan 3 unit ke gudang bersisa 4 akan
 * lolos pemeriksaan awal (keduanya dibandingkan dengan sisa yang sama) lalu
 * gagal di tengah pengurangan — persis keadaan yang hendak dicegah fungsi ini.
 */
export async function stockOutMulti(
  db: SqlExecutor,
  input: {
    productId: string;
    picks: { warehouseId: string; qty: number }[];
    refType: string;
    refId: string;
  },
): Promise<number> {
  const perGudang = new Map<string, number>();
  for (const p of input.picks) {
    if (p.qty > 0) perGudang.set(p.warehouseId, (perGudang.get(p.warehouseId) ?? 0) + p.qty);
  }
  if (perGudang.size === 0) return 0;

  // Pemeriksaan awal untuk SEMUA gudang — sebelum ada yang dikurangi.
  for (const [warehouseId, qty] of perGudang) {
    const { results } = await db
      .prepare(`SELECT qty FROM stock_levels WHERE product_id = ? AND warehouse_id = ?`)
      .bind(input.productId, warehouseId)
      .all<{ qty: number }>();
    const tersedia = results[0]?.qty ?? 0;
    if (tersedia < qty) {
      throw new InsufficientStockError(
        `Stok tidak mencukupi di salah satu gudang (tersedia ${tersedia}, diminta ${qty}).`,
      );
    }
  }

  let total = 0;
  for (const [warehouseId, qty] of perGudang) {
    total += await stockOut(db, {
      productId: input.productId,
      warehouseId,
      qty,
      refType: input.refType,
      refId: input.refId,
    });
  }
  return total;
}

/**
 * Barang keluar dengan biaya rata-rata berjalan. Mengembalikan total HPP.
 * Menolak bila stok tidak mencukupi.
 *
 * ## Pengurangannya BERSYARAT, dan itu syarat kebenaran (Fase 29a)
 *
 * Versi sebelumnya memeriksa lalu mengurangi dalam dua langkah terpisah:
 * `SELECT qty` → `if (qty < diminta) throw` → `UPDATE SET qty = qty - ?` tanpa
 * syarat. Dua permintaan bersamaan atas barang TERAKHIR sama-sama lolos
 * pemeriksaan lalu sama-sama mengurangi. Bukan skenario langka: kasir yang
 * menjual barang terakhir bersamaan dengan admin yang membuat faktur sudah
 * cukup.
 *
 * Terbukti, bukan diduga: uji balapan `test/stok-balapan.test.ts` menjalankan
 * pola lama dan stoknya jatuh ke **−1** (dua penjualan atas satu unit) dan
 * **−3** (lima penjualan atas dua unit). Akibatnya senyap dan berlipat — nilai
 * persediaan di neraca ikut salah, dan HPP dihitung dari rata-rata yang basi.
 *
 * Kini syaratnya ikut ke dalam `UPDATE` (`AND qty >= ?`) dan hasilnya diperiksa
 * lewat `meta.changes`: database yang memutuskan siapa yang menang, bukan urutan
 * kebetulan dua pembacaan. `SELECT` di awal tetap ada — bukan sebagai penjaga,
 * melainkan untuk mengambil `avg_cost` dan memberi pesan galat yang menyebut
 * angka sebenarnya.
 *
 * URUTAN JUGA DIBALIK: baris `stock_movements` ditulis SESUDAH pengurangan
 * berhasil. Pola lama menulisnya lebih dulu, sehingga penjualan yang ditolak
 * tetap meninggalkan mutasi keluar — kartu stok memperlihatkan barang keluar
 * yang tidak pernah terjadi, dan laporan mutasi berhenti cocok dengan saldonya.
 */
export async function stockOut(
  db: SqlExecutor,
  input: { productId: string; warehouseId: string; qty: number; refType: string; refId: string },
): Promise<number> {
  const { results } = await db
    .prepare(`SELECT qty, avg_cost FROM stock_levels WHERE product_id = ? AND warehouse_id = ?`)
    .bind(input.productId, input.warehouseId)
    .all<{ qty: number; avg_cost: number }>();
  const level = results[0];
  if (!level || level.qty < input.qty) {
    throw new InsufficientStockError(
      `Stok tidak mencukupi (tersedia ${level?.qty ?? 0}, diminta ${input.qty}).`,
    );
  }

  const kurangi = await db
    .prepare(
      `UPDATE stock_levels SET qty = qty - ?
        WHERE product_id = ? AND warehouse_id = ? AND qty >= ?`,
    )
    .bind(input.qty, input.productId, input.warehouseId, input.qty)
    .run();
  if ((kurangi as { meta?: { changes?: number } }).meta?.changes !== 1) {
    // Kalah balapan: stok sudah diambil permintaan lain di antara SELECT dan
    // UPDATE. Sisanya dibaca ulang supaya pesannya menyebut keadaan sekarang,
    // bukan angka basi yang justru membingungkan.
    const { results: kini } = await db
      .prepare(`SELECT qty FROM stock_levels WHERE product_id = ? AND warehouse_id = ?`)
      .bind(input.productId, input.warehouseId)
      .all<{ qty: number }>();
    throw new InsufficientStockError(
      `Stok tidak mencukupi (tersedia ${kini[0]?.qty ?? 0}, diminta ${input.qty}).`,
    );
  }

  await db
    .prepare(
      `INSERT INTO stock_movements (id, product_id, warehouse_id, ref_type, ref_id, qty, unit_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.productId,
      input.warehouseId,
      input.refType,
      input.refId,
      -input.qty,
      level.avg_cost,
    )
    .run();

  // Konsumsi lot secara FEFO (kedaluwarsa terdekat lebih dulu; tanpa tanggal
  // di akhir). Bila sebagian stok tidak berlot, sisa konsumsi dibiarkan.
  let remaining = input.qty;
  const { results: lots } = await db
    .prepare(
      `SELECT id, qty FROM stock_lots
       WHERE product_id = ? AND warehouse_id = ? AND qty > 0
       ORDER BY expiry_date IS NULL, expiry_date ASC, created_at ASC`,
    )
    .bind(input.productId, input.warehouseId)
    .all<{ id: string; qty: number }>();
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(lot.qty, remaining);
    await db.prepare(`UPDATE stock_lots SET qty = qty - ? WHERE id = ?`).bind(take, lot.id).run();
    remaining -= take;
  }

  return input.qty * level.avg_cost;
}
