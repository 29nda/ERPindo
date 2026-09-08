import type { ApiNotification, JenisNotifikasi } from "@erpindo/shared";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { setLang } from "../src/i18n";
import { judulNotifikasi, rincianNotifikasi, waNotifikasi, KUNCI_LABEL_PAJAK } from "../src/i18n/notifikasi";
import { UI, type UiKey } from "../src/i18n/ui";

/**
 * Lonceng notifikasi tunduk pada bahasa yang dipilih pemakai (Fase 56c).
 *
 * ## Cacat yang ditutup uji ini
 *
 * Ketujuh jenis notifikasi dulu dikirim Worker sebagai kalimat Indonesia jadi
 * (`title`, `detail`, `waText`). Aplikasi ini dwibahasa, tetapi loncengnya
 * tidak: pemakai yang memilih Inggris tetap membaca "Faktur INV-001 lewat jatuh
 * tempo" di kanan atas layarnya, dan tidak ada gerbang yang bisa melihatnya —
 * penyapu i18n hanya menyapu `apps/web`, jadi naskah yang ditulis di
 * `apps/api` tidak pernah muncul di angkanya sama sekali.
 *
 * Akibat keduanya lebih halus: dasbor MEMBEDAH kalimat itu untuk mendapatkan
 * datanya kembali —
 *
 *   n.title.replace("Faktur ", "").replace(" lewat jatuh tempo", "")
 *
 * — sehingga mengganti satu kata di Worker diam-diam merusak kartu dasbor,
 * tanpa galat di mana pun.
 *
 * ## Yang dijaga
 *
 * Kelengkapan cabangnya sudah dijaga tsc: `ApiNotification` adalah union
 * berdiskriminan dan penyusunnya memakai `switch` ber-`never`, jadi jenis baru
 * tanpa kalimat tidak akan dikompilasi. Yang TIDAK bisa dilihat tsc, dan
 * karenanya diuji di sini: kalimatnya benar-benar berbeda antarbahasa, tidak
 * menyisakan lubang `{0}` yang belum terisi, dan Worker tidak lagi menulis
 * prosa apa pun.
 */

const AKAR = path.join(__dirname, "..", "..", "..");

/** Satu contoh untuk tiap jenis — daftarnya diperiksa lengkap di bawah. */
const CONTOH: Record<JenisNotifikasi, ApiNotification> = {
  low_stock: {
    type: "low_stock",
    href: "/app/stok",
    data: { name: "Kopi Arabika 1kg", sku: "VD-003", qty: 10, minStock: 15 },
  },
  overdue_invoice: {
    type: "overdue_invoice",
    href: "/app/penjualan",
    data: { invoiceNo: "INV-0001", contactName: "PT Maju Jaya", outstanding: 80_000, dueDate: "2026-07-01" },
  },
  open_ticket: { type: "open_ticket", href: "/app/helpdesk", data: { count: 3 } },
  pending_approval: { type: "pending_approval", href: "/app/persetujuan", data: { count: 2 } },
  crm_followup_due: {
    type: "crm_followup_due",
    href: "/app/crm/leads",
    data: { leadName: "Toko Sinar", note: "Telepon lagi soal penawaran", dueAt: "2026-09-01" },
  },
  crm_stale_lead: { type: "crm_stale_lead", href: "/app/crm/leads", data: { count: 4, hari: 7 } },
  tenggat_pajak: {
    type: "tenggat_pajak",
    href: "/app/keuangan/pajak",
    data: { jenis: "ppn", kegiatan: "setor", masa: "2026-08", tanggal: "2026-09-15", sisaHari: 7 },
  },
};

const u = (k: UiKey) => UI[k].id;
const uEn = (k: UiKey) => UI[k].en;
const JENIS = Object.keys(CONTOH) as JenisNotifikasi[];

describe("penyusun kalimat notifikasi", () => {
  it.each(JENIS)("%s punya judul dan rincian di kedua bahasa", (jenis) => {
    const n = CONTOH[jenis];
    for (const t of [u, uEn]) {
      expect(judulNotifikasi(n, t).length).toBeGreaterThan(3);
      expect(rincianNotifikasi(n, t).length).toBeGreaterThan(3);
    }
  });

  /** Lubang yang tidak terisi keluar apa adanya ke layar sebagai "{0}". */
  it.each(JENIS)("%s tidak menyisakan lubang {n} yang belum terisi", (jenis) => {
    const n = CONTOH[jenis];
    for (const t of [u, uEn]) {
      expect(judulNotifikasi(n, t)).not.toMatch(/\{\d\}/);
      expect(rincianNotifikasi(n, t)).not.toMatch(/\{\d\}/);
    }
  });

  it.each(JENIS)("%s benar-benar berubah saat bahasanya diganti", (jenis) => {
    const n = CONTOH[jenis];
    // Kecuali tenggat pajak: nama formulir DJP memang sama di kedua bahasa, dan
    // "masa"/tanggalnya angka — jadi hanya rinciannya yang wajib berbeda.
    const bandingkan = jenis === "tenggat_pajak" ? rincianNotifikasi : judulNotifikasi;
    expect(bandingkan(n, u)).not.toBe(bandingkan(n, uEn));
  });

  it("nomor faktur muncul sebagai data, bukan hasil membedah judul", () => {
    const n = CONTOH.overdue_invoice;
    expect(n.type === "overdue_invoice" && n.data.invoiceNo).toBe("INV-0001");
    expect(judulNotifikasi(n, u)).toContain("INV-0001");
    expect(judulNotifikasi(n, uEn)).toContain("INV-0001");
  });
});

describe("pengingat WhatsApp", () => {
  it("hanya faktur jatuh tempo yang punya, dan memuat semua bahannya", () => {
    const pesan = waNotifikasi(CONTOH.overdue_invoice, u);
    expect(pesan).toContain("INV-0001");
    expect(pesan).toContain("PT Maju Jaya");
    expect(pesan).toContain("80.000");
  });

  it.each(JENIS.filter((j) => j !== "overdue_invoice"))("%s tidak punya pengingat WA", (jenis) => {
    expect(waNotifikasi(CONTOH[jenis], u)).toBeNull();
  });

  it("ikut bahasa yang dipilih pemakai, bukan bahasa Worker", () => {
    expect(waNotifikasi(CONTOH.overdue_invoice, u)).not.toBe(
      waNotifikasi(CONTOH.overdue_invoice, uEn),
    );
  });
});

/** Komentar dibuang: uji ini soal KODE, dan komentar di bawah mengutip bentuk lama. */
const tanpaKomentar = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

describe("Worker tidak lagi menulis naskah lonceng", () => {
  const RUTE = tanpaKomentar(readFileSync(path.join(AKAR, "apps/api/src/routes/tenants.ts"), "utf8"));
  const BLOK = RUTE.slice(RUTE.indexOf("const notifications:"), RUTE.indexOf("return c.json({ notifications"));

  it("tidak ada medan title/detail/waText yang tersisa", () => {
    expect(BLOK).not.toMatch(/\b(title|detail|waText):/);
  });

  /**
   * Penjaga kambuh. Kelas cacatnya bukan "ada medan bernama title" melainkan
   * "Worker merakit kalimat" — dan itu terbaca dari bentuknya: template literal
   * yang memuat spasi di antara dua kata.
   *
   * Kueri SQL dikecualikan, dan itu bukan kelonggaran: SQL memang milik Worker,
   * dan tidak ada bahasa manusia di dalamnya yang bisa salah.
   */
  it("tidak ada kalimat yang dirakit di dalam blok notifikasi", () => {
    const kalimat = [...BLOK.matchAll(/`([^`]*)`/g)]
      .map((m) => m[1].replace(/\$\{[^}]*\}/g, " "))
      .filter((t) => !/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i.test(t))
      .filter((t) => /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(t));
    expect(kalimat).toEqual([]);
  });
});

describe("label jenis pajak hanya dipetakan sekali", () => {
  it("tiap jenis punya kunci kamus", () => {
    for (const [jenis, kunci] of Object.entries(KUNCI_LABEL_PAJAK)) {
      expect(UI[kunci], `jenis ${jenis}`).toBeDefined();
    }
  });

  it("Worker tidak lagi memetakan namanya sendiri", () => {
    const RUTE = readFileSync(path.join(AKAR, "apps/api/src/routes/tenants.ts"), "utf8");
    expect(RUTE).not.toContain("LABEL_PAJAK");
  });

  it("halaman Pajak memakai pemetaan yang sama, bukan salinannya", () => {
    const PAJAK = readFileSync(path.join(AKAR, "apps/web/src/pages/pajak.tsx"), "utf8");
    expect(PAJAK).toContain("KUNCI_LABEL_PAJAK");
    expect(PAJAK).not.toMatch(/ppn:\s*"SPT Masa PPN"/);
  });
});

describe("dasbor tidak lagi membedah judul buatan server", () => {
  it("tidak ada replace() atas title notifikasi", () => {
    const DASH = tanpaKomentar(readFileSync(path.join(AKAR, "apps/web/src/pages/dashboard.tsx"), "utf8"));
    expect(DASH).not.toContain('replace("Faktur "');
    expect(DASH).not.toContain("n.title");
  });
});

// `setLang` tidak dipakai di atas — kamus dibaca langsung supaya uji ini tidak
// bergantung pada localStorage. Dipanggil sekali agar impornya tidak menganggur
// dan agar bahasa global kembali ke bawaan bila berkas lain mengubahnya.
setLang("id");
