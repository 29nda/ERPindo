import type { Dual } from "../../i18n";

/**
 * Naskah peragaan hero (Fase 35a), dipisah dari komponennya.
 *
 * Bukan sekadar kerapian: `scripts/sapu-i18n.mjs` memindai `pages/**\/*.tsx`
 * dan salah mengenali kamus sebesar ini di dalam berkas komponen sebagai
 * delapan utang teks layar — padahal seluruhnya sudah dwibahasa. Memindahkannya
 * ke `.ts` membuat penyapu melihat yang sebenarnya, tanpa melonggarkan polanya.
 */
export const T = {
  labelFaktur: { id: "Faktur penjualan baru", en: "New sales invoice" },
  pelanggan: { id: "Pelanggan", en: "Customer" },
  namaPelanggan: { id: "Toko Berkah Jaya", en: "Toko Berkah Jaya" },
  barang: { id: "Barang", en: "Item" },
  namaBarang: { id: "Kopi Arabika 1 kg", en: "Arabica coffee 1 kg" },
  qtyHarga: { id: "10 × Rp 150.000", en: "10 × Rp 150,000" },
  ppn: { id: "PPN 11%", en: "VAT 11%" },
  total: { id: "Total", en: "Total" },
  tombolPosting: { id: "Posting", en: "Post" },
  sekaliCatat: { id: "Satu kali catat", en: "Recorded once" },
  lalu: { id: "lalu semuanya terisi sendiri", en: "then everything fills itself in" },

  jurnal: { id: "Jurnal", en: "Journal entry" },
  jurnalPiutang: { id: "Piutang Usaha", en: "Accounts receivable" },
  jurnalPendapatan: { id: "Pendapatan Penjualan", en: "Sales revenue" },
  jurnalPpn: { id: "PPN Keluaran", en: "Output VAT" },
  jurnalHpp: { id: "Harga Pokok Penjualan", en: "Cost of goods sold" },
  jurnalPersediaan: { id: "Persediaan Barang", en: "Inventory" },
  seimbang: { id: "Debit = Kredit", en: "Debits = credits" },

  stok: { id: "Stok", en: "Stock" },
  stokBarang: { id: "Kopi Arabika 1 kg", en: "Arabica coffee 1 kg" },
  stokTurun: { id: "40 → 30 kg", en: "40 → 30 kg" },
  stokCatatan: { id: "Biaya rata-rata Rp 90.000/kg", en: "Average cost Rp 90,000/kg" },

  labaRugi: { id: "Laba Rugi", en: "Profit and loss" },
  lrPendapatan: { id: "Pendapatan", en: "Revenue" },
  lrHpp: { id: "HPP", en: "COGS" },
  lrLaba: { id: "Laba kotor", en: "Gross profit" },

  pajak: { id: "Pajak", en: "Tax" },
  pajakBaris: { id: "PPN Keluaran masa ini", en: "Output VAT this period" },
  pajakCatatan: { id: "Siap diekspor ke Coretax", en: "Ready to export to Coretax" },
} satisfies Record<string, Dual>;

/** Satu baris jurnal. Nilai dibiarkan string — ini peragaan, bukan hitungan. */
export type BarisJurnal = { akun: Dual; debit?: string; kredit?: string };

export const BARIS_JURNAL: BarisJurnal[] = [
  { akun: T.jurnalPiutang, debit: "1.665.000" },
  { akun: T.jurnalPendapatan, kredit: "1.500.000" },
  { akun: T.jurnalPpn, kredit: "165.000" },
  { akun: T.jurnalHpp, debit: "900.000" },
  { akun: T.jurnalPersediaan, kredit: "900.000" },
];
