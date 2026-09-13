import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Link pembayaran yang lunas tidak boleh hilang tanpa jejak (Fase 57d).
 *
 * ## Cacat yang ditutup uji ini
 *
 * Webhook Xendit menandai `payment_links.status = 'paid'` lalu menulis satu
 * baris audit. Itu saja. Tidak ada baris pembayaran, tidak ada jurnal,
 * `invoices.paid_amount` tidak bergerak — dan tidak ada satu pun pembaca
 * `payment_links.status` di seluruh repo yang mengubah keadaan itu.
 *
 * Akibatnya bagi pemakai: pelanggan membayar, uangnya sampai di akun Xendit
 * merchant, dan fakturnya di ERPindo **tetap menunggak**. Ia terus muncul di
 * kartu jatuh tempo, dan pengingatnya terus berjalan ke orang yang sudah
 * membayar.
 *
 * Yang membuatnya lebih buruk: `docs/STATUS.md` — dokumen yang dibaca PEMILIK —
 * menuliskan "pembayaran online terkonfirmasi otomatis (webhook)".
 * Konfirmasinya memang otomatis; pencatatannya tidak pernah ada.
 *
 * ## Kenapa dibuat berbunyi, bukan diotomatiskan
 *
 * Mencatatnya otomatis menuntut dua keputusan akuntansi yang bukan milik
 * program: akun mana yang menerima (uangnya di saldo Xendit, belum di bank —
 * membukukannya sebagai kas bank merusak rekonsiliasi), dan bagaimana biaya
 * potongan dibukukan (yang diterima adalah jumlah bersih). Menebak salah
 * satunya berarti menulis jurnal yang salah tiap transaksi.
 */

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..");
const TENANTS = readFileSync(join(AKAR, "src/routes/tenants.ts"), "utf8");
const BILLING = readFileSync(join(AKAR, "src/routes/billing.ts"), "utf8");
const STATUS = readFileSync(join(AKAR, "../../docs/STATUS.md"), "utf8");

describe("celahnya berbunyi, bukan diam", () => {
  it("notifikasi memuat faktur yang linknya lunas tapi bukunya belum mencatat", () => {
    expect(TENANTS).toMatch(/type: "tagihan_link_dibayar"/);
    expect(TENANTS).toMatch(/WHERE tenant_id = \? AND status = 'paid'/);
  });

  /**
   * Yang dilaporkan HANYA yang benar-benar belum tercatat. Melaporkan semua
   * link lunas akan membuat notifikasi ini menetap selamanya sesudah pemilik
   * mencatatnya — dan penanda yang tidak pernah hilang berhenti dibaca orang.
   */
  it("hanya faktur yang bukunya memang belum lunas yang dilaporkan", () => {
    expect(TENANTS).toMatch(/total > paid_amount \+ returned_amount/);
    expect(TENANTS).toMatch(/if \(!perluDicatat\.has\(l\.invoice_id\)\) continue;/);
  });

  it("korelasinya lintas-database, jadi dua kueri — bukan join yang mustahil", () => {
    // payment_links di control-plane (c.env.DB), invoices di DB tenant (db).
    const blok = TENANTS.slice(TENANTS.indexOf("linkLunas"), TENANTS.indexOf("Kalender pajak"));
    expect(blok).toMatch(/c\.env\.DB\.prepare/);
    expect(blok).toMatch(/db\s*\n?\s*\.prepare/);
  });
});

describe("dokumen pemilik tidak lagi mengklaim yang tidak dilakukan", () => {
  /**
   * Klaim yang salah di dokumen yang dibaca pemilik lebih berbahaya daripada
   * fiturnya yang absen: ia membuat orang berhenti memeriksa.
   */
  it("STATUS.md tidak lagi menyebut pencatatannya otomatis", () => {
    expect(STATUS).not.toContain("pembayaran online terkonfirmasi otomatis (webhook).");
  });

  it("STATUS.md menyatakan pencatatannya masih manual", () => {
    expect(STATUS).toMatch(/pencatatannya ke\s+buku masih manual/);
  });

  /** Dua pertanyaan yang menahan otomatisasinya harus tertulis, bukan tersirat. */
  it("STATUS.md menyebutkan kedua keputusan akuntansi yang ditunggu", () => {
    const bagian = STATUS.slice(STATUS.indexOf("Fase 57d: pelanggan sudah bayar"));
    expect(bagian).toMatch(/Akun mana yang menerima/);
    expect(bagian).toMatch(/biaya Xendit dibukukan/);
  });
});

describe("webhook tetap seperti adanya, dan itu disengaja", () => {
  /**
   * Penjaga kambuh terbalik: kalau suatu hari ada yang MENAMBAHKAN posting
   * otomatis di sini, uji ini gagal dan memaksa keputusan akuntansinya
   * dituliskan lebih dulu — bukan diselundupkan lewat satu commit.
   */
  it("webhook tidak memposting jurnal apa pun ke buku tenant", () => {
    const blok = BILLING.slice(BILLING.indexOf('post("/notification"'));
    expect(blok).not.toContain("postJournal");
    expect(blok).not.toContain("getTenantDb");
  });

  it("webhook tetap menandai linknya lunas (sumber notifikasinya)", () => {
    expect(BILLING).toMatch(/UPDATE payment_links SET status = 'paid', paid_at = \?/);
  });
});
