import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Catat dulu, baru buat kewajibannya (Fase 54g).
 *
 * Kedua jalur uang — checkout langganan dan link penagihan pelanggan — dulu
 * memanggil Xendit LEBIH DULU lalu menyimpan barisnya. Bila penyimpanan itu
 * gagal (satu gangguan D1 sudah cukup), pelanggan memegang tagihan Xendit yang
 * HIDUP untuk pesanan yang tidak kita kenali. Ia membayar; webhook mencari
 * `order_id` itu, tidak menemukannya, lalu membalas 200 — karena balasan itulah
 * yang benar untuk ping tak dikenal — sehingga Xendit berhenti mengulang.
 *
 * Uang diterima, langganan tidak pernah aktif, faktur tidak pernah lunas.
 *
 * Urutan yang benar tidak bisa dijaga uji perilaku: ia hanya salah pada jendela
 * kegagalan yang tidak bisa dipaksa terjadi di smoke, dan smoke berjalan tanpa
 * kunci Xendit sehingga checkout berhenti di 503 jauh sebelum sampai ke sana.
 * Yang bisa dijaga adalah URUTANNYA di dalam kode, dan itu yang dilakukan uji
 * ini — ia memerah pada hari seseorang menukarnya kembali, bukan pada hari
 * seorang pelanggan kehilangan uangnya.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");

const JALUR_UANG = [
  {
    berkas: "routes/billing.ts",
    nama: "checkout langganan",
    catat: "INSERT INTO subscription_invoices",
  },
  {
    berkas: "routes/collections.ts",
    nama: "link penagihan pelanggan",
    catat: "INSERT INTO payment_links",
  },
];

describe("jalur uang mencatat pesanannya sebelum menagih lewat Xendit", () => {
  for (const j of JALUR_UANG) {
    it(`${j.nama}: baris pesanan ditulis sebelum buatInvoiceXendit dipanggil`, () => {
      const isi = readFileSync(join(SRC, j.berkas), "utf8");
      const iCatat = isi.indexOf(j.catat);
      const iTagih = isi.indexOf("buatInvoiceXendit(c.env");
      expect(iCatat, `"${j.catat}" tidak ditemukan — uji ini sudah basi`).toBeGreaterThan(-1);
      expect(iTagih, "panggilan buatInvoiceXendit tidak ditemukan — uji ini sudah basi").toBeGreaterThan(-1);
      expect(
        iCatat,
        `${j.nama} memanggil Xendit sebelum mencatat pesanannya. Bila pencatatan ` +
          `gagal, pelanggan memegang tagihan hidup untuk pesanan yang tidak kita ` +
          `kenali — dan webhook akan membalas 200 sehingga Xendit berhenti mengulang.`,
      ).toBeLessThan(iTagih);
    });

    it(`${j.nama}: kegagalan Xendit menandai barisnya gagal, bukan meninggalkannya pending`, () => {
      const isi = readFileSync(join(SRC, j.berkas), "utf8");
      expect(isi).toMatch(/SET status = 'failed'/);
    });
  }
});
