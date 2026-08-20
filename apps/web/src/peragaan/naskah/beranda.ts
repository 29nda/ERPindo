import type { Naskah } from "../tipe";

/**
 * Naskah peragaan halaman depan (Fase 38a–38b).
 *
 * Naskah pertama, `faktur-berantai`, adalah pemindahan langsung dari peragaan
 * hero tulisan tangan (`pages/landing/pertunjukan.tsx`, Fase 35a). Ia dipindah
 * lebih dulu justru karena SUDAH benar: bila mesin baru memainkannya sama
 * persis, mesin itu terbukti terhadap teladan yang sudah dinilai bekerja.
 *
 * Satu hal sengaja berubah dalam pemindahan. Naskah lama menyimpan nilai
 * jurnal sebagai string dengan alasan yang ditulis terus terang di komentarnya:
 * "ini peragaan, bukan hitungan". Kini nilainya angka, dan keseimbangannya
 * dihitung mesin lalu diuji `test/peragaan-akuntansi.test.ts`.
 *
 * Alasannya ada di halaman ini sendiri: seluruh sudut jualannya bertumpu pada
 * "angkanya bisa Anda periksa". Jurnal peraga yang tidak seimbang akan
 * membatalkan klaim itu di tempat yang paling mahal — dan satu-satunya cara
 * memastikannya bukan dengan memeriksanya dengan mata sekali, melainkan dengan
 * menjadikannya gerbang.
 *
 * Angkanya:
 *   Debit  : Piutang Usaha 1.665.000 + HPP 900.000                  = 2.565.000
 *   Kredit : Pendapatan 1.500.000 + PPN 165.000 + Persediaan 900.000 = 2.565.000
 *
 * HPP 900.000 berasal dari 10 × biaya rata-rata 90.000, dan stoknya turun
 * 40 → 30 kg.
 */

export const FAKTUR_BERANTAI: Naskah = {
  id: "faktur-berantai",
  jalur: "/app/penjualan",
  judul: {
    id: "Satu faktur diposting, empat catatan terisi sendiri",
    en: "One invoice posted, four records fill themselves in",
  },
  ringkas: {
    id: "Kasir memasukkan satu faktur penjualan. Jurnal, stok, laba rugi, dan PPN terisi tanpa satu pun entri tambahan — dan jurnalnya seimbang.",
    en: "A clerk enters one sales invoice. The journal, stock, profit and loss, and VAT fill in with no further entry — and the journal balances.",
  },
  panel: [
    {
      jenis: "formulir",
      id: "faktur",
      judul: { id: "Faktur penjualan baru", en: "New sales invoice" },
      tombol: { id: "Posting", en: "Post" },
      medan: [
        {
          id: "pelanggan",
          label: { id: "Pelanggan", en: "Customer" },
          nilai: { id: "PT Berkah Jaya", en: "PT Berkah Jaya" },
        },
        {
          id: "barang",
          label: { id: "Barang", en: "Item" },
          nilai: { id: "Kopi Arabika 1 kg · 10 × Rp 150.000", en: "Arabica coffee 1 kg · 10 × Rp 150,000" },
        },
        {
          id: "ppn",
          label: { id: "PPN 11%", en: "VAT 11%" },
          nilai: { id: "Rp 165.000", en: "Rp 165,000" },
          num: true,
        },
        {
          id: "total",
          label: { id: "Total", en: "Total" },
          nilai: { id: "Rp 1.665.000", en: "Rp 1,665,000" },
          num: true,
        },
      ],
    },
    {
      jenis: "jurnal",
      id: "jurnal",
      judul: { id: "Jurnal umum", en: "General journal" },
      baris: [
        { akun: { id: "Piutang Usaha", en: "Accounts receivable" }, debit: 1_665_000 },
        { akun: { id: "Pendapatan Penjualan", en: "Sales revenue" }, kredit: 1_500_000 },
        { akun: { id: "PPN Keluaran", en: "Output VAT" }, kredit: 165_000 },
        { akun: { id: "Harga Pokok Penjualan", en: "Cost of goods sold" }, debit: 900_000 },
        { akun: { id: "Persediaan Barang", en: "Inventory" }, kredit: 900_000 },
      ],
    },
    {
      jenis: "angka",
      id: "stok",
      judul: { id: "Stok Kopi Arabika 1 kg", en: "Stock: Arabica coffee 1 kg" },
      nilai: 30,
      satuan: { id: "kg", en: "kg" },
      delta: {
        id: "Turun dari 40 kg · biaya rata-rata Rp 90.000/kg",
        en: "Down from 40 kg · average cost Rp 90,000/kg",
      },
    },
    {
      jenis: "tabel",
      id: "labarugi",
      judul: { id: "Laba rugi berjalan", en: "Running profit and loss" },
      kolom: [
        { label: { id: "Pos", en: "Line" } },
        { label: { id: "Jumlah (Rp)", en: "Amount (Rp)" }, num: true },
      ],
      baris: [
        [{ id: "Pendapatan", en: "Revenue" }, { id: "1.500.000", en: "1,500,000" }],
        [{ id: "Harga pokok penjualan", en: "Cost of goods sold" }, { id: "−900.000", en: "−900,000" }],
        [{ id: "Laba kotor", en: "Gross profit" }, { id: "600.000", en: "600,000" }],
      ],
    },
    {
      jenis: "angka",
      id: "pajak",
      judul: { id: "PPN Keluaran masa ini", en: "Output VAT this period" },
      nilai: 165_000,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: { id: "Siap diekspor ke Coretax", en: "Ready to export to Coretax" },
    },
  ],
  langkah: [
    {
      aksi: "ketik",
      sasaran: { panel: "faktur", medan: "pelanggan" },
      narasi: { id: "Pilih pelanggannya.", en: "Pick the customer." },
    },
    {
      aksi: "ketik",
      sasaran: { panel: "faktur", medan: "barang" },
      narasi: {
        id: "Masukkan barang dan jumlahnya.",
        en: "Enter the item and quantity.",
      },
    },
    {
      aksi: "pilih",
      sasaran: { panel: "faktur", medan: "ppn" },
      narasi: {
        id: "PPN 11% dihitung dari nilai barisnya, bukan diketik ulang.",
        en: "VAT at 11% is computed from the line value, not retyped.",
      },
    },
    {
      aksi: "pilih",
      sasaran: { panel: "faktur", medan: "total" },
      narasi: { id: "Totalnya ikut terbentuk.", en: "The total forms with it." },
    },
    {
      aksi: "klik",
      sasaran: { panel: "faktur" },
      narasi: { id: "Faktur diposting.", en: "The invoice is posted." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jurnal" },
      narasi: {
        id: "Jurnal double-entry terbentuk sendiri, dan debit sama dengan kredit.",
        en: "A double-entry journal forms itself, and debits equal credits.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "stok" },
      narasi: {
        id: "Stok berkurang sepuluh, dan harga pokoknya memakai biaya rata-rata yang berlaku.",
        en: "Stock drops by ten, and cost of goods uses the prevailing average cost.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "labarugi" },
      narasi: {
        id: "Laba rugi berjalan ikut bergerak.",
        en: "The running profit and loss moves with it.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "pajak" },
      narasi: {
        id: "PPN masa ini bertambah, siap diekspor ke Coretax.",
        en: "This period's VAT increases, ready to export to Coretax.",
      },
    },
  ],
};
