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
    id: "Kasir memasukkan satu faktur penjualan. Jurnal, stok, laba rugi, dan PPN terisi tanpa satu pun entri tambahan, dan jurnalnya tetap seimbang.",
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
        id: "Jurnalnya terbentuk sendiri, dan debit sama dengan kredit.",
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

/**
 * Kasir — penjualan tunai yang langsung masuk pembukuan.
 *
 * Angkanya:
 *   2 × Kopi Arabika 1 kg @ Rp 150.000 = Rp 300.000 (DPP)
 *   PPN 11%                            = Rp  33.000
 *   Dibayar tunai                      = Rp 333.000
 *   HPP 2 × Rp 90.000                  = Rp 180.000
 *
 *   Debit  : Kas 333.000 + HPP 180.000                       = 513.000
 *   Kredit : Pendapatan 300.000 + PPN 33.000 + Persediaan 180.000 = 513.000
 *
 * Harga satuan dan biaya rata-rata sengaja SAMA dengan `faktur-berantai`.
 * Pengunjung yang membandingkan kedua peragaan akan mendapati angkanya cocok —
 * dan yang tidak membandingkan tidak dirugikan apa pun.
 */
export const KASIR_SHIFT: Naskah = {
  id: "kasir-shift",
  jalur: "/app/pos",
  judul: {
    id: "Tutup kasir tanpa menyisakan pekerjaan pembukuan",
    en: "A till that leaves no bookkeeping behind",
  },
  ringkas: {
    id: "Pramuniaga memindai barang dan menerima uang tunai. Jurnal kas, harga pokok, dan selisih kas shift tercatat tanpa ada yang mengetiknya ulang di akhir hari.",
    en: "An assistant scans items and takes cash. The cash journal, cost of goods, and the shift's cash difference are recorded without anyone retyping them at close.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "keranjang",
      judul: { id: "Keranjang", en: "Basket" },
      kolom: [
        { label: { id: "Barang", en: "Item" } },
        { label: { id: "Qty", en: "Qty" }, num: true },
        { label: { id: "Jumlah (Rp)", en: "Amount (Rp)" }, num: true },
      ],
      baris: [
        [
          { id: "Kopi Arabika 1 kg", en: "Arabica coffee 1 kg" },
          { id: "2", en: "2" },
          { id: "300.000", en: "300,000" },
        ],
      ],
    },
    {
      jenis: "formulir",
      id: "bayar",
      judul: { id: "Pembayaran", en: "Payment" },
      tombol: { id: "Selesaikan transaksi", en: "Complete sale" },
      medan: [
        {
          id: "ppn",
          label: { id: "PPN 11%", en: "VAT 11%" },
          nilai: { id: "Rp 33.000", en: "Rp 33,000" },
          num: true,
        },
        {
          id: "total",
          label: { id: "Total tagihan", en: "Total due" },
          nilai: { id: "Rp 333.000", en: "Rp 333,000" },
          num: true,
        },
        {
          id: "tunai",
          label: { id: "Tunai diterima", en: "Cash received" },
          nilai: { id: "Rp 350.000", en: "Rp 350,000" },
          num: true,
        },
        {
          id: "kembali",
          label: { id: "Kembalian", en: "Change" },
          nilai: { id: "Rp 17.000", en: "Rp 17,000" },
          num: true,
        },
      ],
    },
    {
      jenis: "jurnal",
      id: "jurnal",
      judul: { id: "Jurnal penjualan tunai", en: "Cash sale journal" },
      baris: [
        { akun: { id: "Kas di Tangan", en: "Cash on hand" }, debit: 333_000 },
        { akun: { id: "Pendapatan Penjualan", en: "Sales revenue" }, kredit: 300_000 },
        { akun: { id: "PPN Keluaran", en: "Output VAT" }, kredit: 33_000 },
        { akun: { id: "Harga Pokok Penjualan", en: "Cost of goods sold" }, debit: 180_000 },
        { akun: { id: "Persediaan Barang", en: "Inventory" }, kredit: 180_000 },
      ],
    },
    {
      jenis: "angka",
      id: "shift",
      judul: { id: "Tutup shift · selisih kas", en: "Shift close · cash difference" },
      nilai: 0,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: {
        id: "Kas fisik cocok dengan yang tercatat sistem",
        en: "Physical cash matches what the system recorded",
      },
      nada: "ok",
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "keranjang", baris: 0 },
      narasi: {
        id: "Barang dipindai, harganya diambil dari data produk.",
        en: "The item is scanned; its price comes from the product record.",
      },
    },
    {
      aksi: "pilih",
      sasaran: { panel: "bayar", medan: "ppn" },
      narasi: { id: "PPN dihitung sendiri.", en: "VAT is computed automatically." },
    },
    {
      aksi: "ketik",
      sasaran: { panel: "bayar", medan: "tunai" },
      narasi: { id: "Pramuniaga memasukkan uang yang diterima.", en: "The assistant enters the cash received." },
    },
    {
      aksi: "pilih",
      sasaran: { panel: "bayar", medan: "kembali" },
      narasi: { id: "Kembaliannya muncul tanpa dihitung manual.", en: "The change appears without manual arithmetic." },
    },
    {
      aksi: "klik",
      sasaran: { panel: "bayar" },
      narasi: { id: "Transaksi diselesaikan.", en: "The sale is completed." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jurnal" },
      narasi: {
        id: "Kas, pendapatan, PPN, dan harga pokok masuk jurnal sekaligus.",
        en: "Cash, revenue, VAT, and cost of goods enter the journal at once.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "shift" },
      narasi: {
        id: "Saat shift ditutup, selisih kas dihitung terhadap yang tercatat sistem.",
        en: "At shift close, the cash difference is computed against the system record.",
      },
    },
    {
      aksi: "tandai",
      sasaran: { panel: "shift" },
      nada: "ok",
      narasi: {
        id: "Tidak ada rekapitulasi manual di akhir hari.",
        en: "There is no manual reconciliation at the end of the day.",
      },
    },
  ],
};

/**
 * Laporan keuangan — disusun dari jurnal, bukan diketik ulang.
 *
 * Ini peragaan yang menjawab keberatan paling mahal dari pembeli perusahaan:
 * "laporan kami selalu selisih dengan buku besar". Yang diperagakan bukan
 * kecantikan laporannya, melainkan ASALNYA — angka yang sama ditelusuri turun
 * sampai ke jurnal yang membentuknya.
 */
export const LAPORAN_TERSUSUN: Naskah = {
  id: "laporan-tersusun",
  jalur: "/app/keuangan/laba-rugi",
  judul: {
    id: "Laporan yang bisa ditelusuri sampai ke jurnalnya",
    en: "Reports you can trace back to the journal",
  },
  ringkas: {
    id: "Laba rugi, neraca, dan arus kas disusun dari jurnal yang sudah diposting. Tiap angka dapat diklik sampai ke transaksi pembentuknya, jadi tidak ada baris yang tidak diketahui asalnya.",
    en: "Profit and loss, balance sheet, and cash flow are assembled from posted journals. Every figure drills down to the transactions behind it, so no line has an unknown origin.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "labarugi",
      judul: { id: "Laba rugi · Januari s.d. Desember", en: "Profit and loss · January to December" },
      kolom: [
        { label: { id: "Pos", en: "Line" } },
        { label: { id: "Jumlah (Rp)", en: "Amount (Rp)" }, num: true },
      ],
      baris: [
        [{ id: "Pendapatan", en: "Revenue" }, { id: "4.820.000.000", en: "4,820,000,000" }],
        [{ id: "Harga pokok penjualan", en: "Cost of goods sold" }, { id: "−2.892.000.000", en: "−2,892,000,000" }],
        [{ id: "Laba kotor", en: "Gross profit" }, { id: "1.928.000.000", en: "1,928,000,000" }],
        [{ id: "Beban usaha", en: "Operating expenses" }, { id: "−1.204.000.000", en: "−1,204,000,000" }],
        [{ id: "Laba bersih", en: "Net profit" }, { id: "724.000.000", en: "724,000,000" }],
      ],
    },
    {
      jenis: "bagan",
      id: "tren",
      judul: { id: "Pendapatan per kuartal", en: "Revenue by quarter" },
      seri: [1_050, 1_180, 1_240, 1_350],
      label: [
        { id: "K1", en: "Q1" },
        { id: "K2", en: "Q2" },
        { id: "K3", en: "Q3" },
        { id: "K4", en: "Q4" },
      ],
    },
    {
      jenis: "daftar",
      id: "asal",
      judul: { id: "Asal angka laba kotor", en: "Where gross profit comes from" },
      butir: [
        {
          teks: { id: "3.184 jurnal berstatus posted", en: "3,184 posted journal entries" },
          lencana: { id: "Terkunci", en: "Locked" },
          nada: "ok",
        },
        {
          teks: { id: "0 jurnal draf ikut terhitung", en: "0 draft entries included" },
          lencana: { id: "Bersih", en: "Clean" },
          nada: "ok",
        },
        {
          teks: {
            id: "Periode Desember belum ditutup",
            en: "December has not been closed yet",
          },
          lencana: { id: "Terbuka", en: "Open" },
          nada: "awas",
        },
      ],
    },
    {
      jenis: "catatan",
      id: "catatan",
      nada: "netral",
      teks: {
        id: "Laporan tidak pernah diketik ulang dari sumber lain. Bila sebuah angka terlihat aneh, ia bisa dibuka sampai ke faktur yang membentuknya.",
        en: "Reports are never retyped from another source. If a figure looks wrong, it opens down to the invoice behind it.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "labarugi", baris: 2 },
      narasi: {
        id: "Laba kotor tersusun dari pendapatan dikurangi harga pokok.",
        en: "Gross profit is revenue less cost of goods sold.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "labarugi" },
      narasi: { id: "Angkanya dibuka untuk ditelusuri.", en: "The figure is opened to drill down." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "asal" },
      narasi: {
        id: "Yang muncul adalah jurnal pembentuknya, bukan penjelasan.",
        en: "What appears is the journals behind it, not an explanation.",
      },
    },
    {
      aksi: "sorot",
      sasaran: { panel: "asal", baris: 2 },
      narasi: {
        id: "Periode yang belum ditutup ditandai, supaya tidak dikira final.",
        en: "An unclosed period is flagged, so it is not mistaken for final.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "tren" },
      narasi: {
        id: "Tren kuartalan memakai angka yang sama, bukan salinan terpisah.",
        en: "The quarterly trend uses the same figures, not a separate copy.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "catatan" },
      narasi: {
        id: "Neraca dan arus kas disusun dari sumber yang sama.",
        en: "The balance sheet and cash flow are built from the same source.",
      },
    },
  ],
};

/**
 * Penggajian — PPh 21 TER dan BPJS terhitung, jurnalnya ikut terbentuk.
 *
 * Angkanya:
 *   Gaji bruto seluruh karyawan       = Rp 50.000.000
 *   PPh 21 (TER)                      = Rp  1.500.000
 *   BPJS ditanggung karyawan          = Rp  1.000.000
 *   Gaji bersih (dibawa pulang)       = Rp 47.500.000
 *
 *   Debit  : Beban Gaji 50.000.000                                    = 50.000.000
 *   Kredit : Utang PPh 21 1.500.000 + Utang BPJS 1.000.000
 *            + Kas 47.500.000                                         = 50.000.000
 *
 * Istilah "Gaji bersih (dibawa pulang)" mengikuti glosarium §5b apa adanya.
 */
export const GAJI_SEKALI_JALAN: Naskah = {
  id: "gaji-sekali-jalan",
  jalur: "/app/hr/penggajian",
  judul: {
    id: "Penggajian yang pajaknya sudah ikut terhitung",
    en: "Payroll with the tax already worked out",
  },
  ringkas: {
    id: "Satu periode gaji dijalankan. PPh 21 memakai tarif efektif rata-rata yang berlaku, BPJS ikut terhitung, slip gaji siap dikirim, dan beban gajinya masuk jurnal pada saat yang sama.",
    en: "One payroll period is run. Income tax uses the prevailing average effective rate, social security is included, payslips are ready to send, and the wage cost enters the journal at the same moment.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "karyawan",
      judul: { id: "Periode Desember · 14 karyawan", en: "December period · 14 employees" },
      kolom: [
        { label: { id: "Karyawan", en: "Employee" } },
        { label: { id: "Bruto (Rp)", en: "Gross (Rp)" }, num: true },
        { label: { id: "PPh 21 (Rp)", en: "Income tax (Rp)" }, num: true },
      ],
      baris: [
        [
          { id: "Sri Wahyuni", en: "Sri Wahyuni" },
          { id: "8.500.000", en: "8,500,000" },
          { id: "255.000", en: "255,000" },
        ],
        [
          { id: "Bagas Prakoso", en: "Bagas Prakoso" },
          { id: "6.200.000", en: "6,200,000" },
          { id: "186.000", en: "186,000" },
        ],
        [
          { id: "12 karyawan lain", en: "12 other employees" },
          { id: "35.300.000", en: "35,300,000" },
          { id: "1.059.000", en: "1,059,000" },
        ],
      ],
    },
    {
      jenis: "angka",
      id: "bersih",
      judul: { id: "Gaji bersih (dibawa pulang)", en: "Net pay (take-home)" },
      nilai: 47_500_000,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: {
        id: "Setelah PPh 21 Rp 1.500.000 dan BPJS Rp 1.000.000",
        en: "After Rp 1,500,000 income tax and Rp 1,000,000 social security",
      },
    },
    {
      jenis: "jurnal",
      id: "jurnal",
      judul: { id: "Jurnal penggajian", en: "Payroll journal" },
      baris: [
        { akun: { id: "Beban Gaji", en: "Salary expense" }, debit: 50_000_000 },
        { akun: { id: "Utang PPh 21", en: "Income tax payable" }, kredit: 1_500_000 },
        { akun: { id: "Utang BPJS", en: "Social security payable" }, kredit: 1_000_000 },
        { akun: { id: "Kas di Bank", en: "Cash at bank" }, kredit: 47_500_000 },
      ],
    },
    {
      jenis: "daftar",
      id: "keluaran",
      judul: { id: "Yang siap dipakai setelahnya", en: "Ready to use afterwards" },
      butir: [
        {
          teks: { id: "14 slip gaji siap dikirim", en: "14 payslips ready to send" },
          lencana: { id: "Siap", en: "Ready" },
          nada: "ok",
        },
        {
          teks: { id: "Bukti potong 1721-A1 terbentuk", en: "1721-A1 tax slips generated" },
          lencana: { id: "Siap", en: "Ready" },
          nada: "ok",
        },
        {
          teks: { id: "Utang PPh 21 masuk daftar yang harus disetor", en: "Income tax payable added to the remittance list" },
          lencana: { id: "Terjadwal", en: "Scheduled" },
          nada: "netral",
        },
      ],
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "karyawan" },
      narasi: {
        id: "Periode gaji dibuka dengan data karyawan yang sudah ada.",
        en: "The payroll period opens with the employee data already in place.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "bersih" },
      narasi: {
        id: "PPh 21 memakai tarif efektif rata-rata yang berlaku sekarang, bukan tabel yang disalin tangan.",
        en: "Income tax uses the average effective rate in force today, not a hand-copied table.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jurnal" },
      narasi: {
        id: "Beban gaji dan utang pajaknya masuk jurnal pada saat yang sama.",
        en: "Wage cost and tax payable enter the journal at the same moment.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "keluaran" },
      narasi: {
        id: "Slip gaji dan bukti potong terbentuk tanpa langkah terpisah.",
        en: "Payslips and tax slips are generated without a separate step.",
      },
    },
    {
      aksi: "tandai",
      sasaran: { panel: "jurnal" },
      nada: "ok",
      narasi: {
        id: "Tidak ada berkas yang perlu dipindahkan ke aplikasi akuntansi lain.",
        en: "No file needs moving into a separate accounting application.",
      },
    },
  ],
};

/**
 * Stok — beberapa gudang, biaya rata-rata, dan peringatan sebelum kejadian.
 *
 * Harga satuan dan biaya rata-rata Kopi Arabika sengaja sama dengan
 * `faktur-berantai` dan `kasir-shift`, dengan alasan yang sama: pengunjung yang
 * membandingkan ketiganya akan mendapati angkanya cocok.
 */
export const STOK_TEPERCAYA: Naskah = {
  id: "stok-tepercaya",
  jalur: "/app/stok",
  judul: {
    id: "Stok yang angkanya tidak perlu dihitung ulang",
    en: "Stock figures you never recount",
  },
  ringkas: {
    id: "Beberapa gudang dalam satu daftar, harga pokok memakai biaya rata-rata bergerak, dan peringatan datang sebelum stok habis atau kedaluwarsa, bukan sesudahnya.",
    en: "Several warehouses in one list, cost of goods on a moving average, and warnings arrive before you run out or expire — not after.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "gudang",
      judul: { id: "Kopi Arabika 1 kg per gudang", en: "Arabica coffee 1 kg by warehouse" },
      kolom: [
        { label: { id: "Gudang", en: "Warehouse" } },
        { label: { id: "Qty", en: "Qty" }, num: true },
        { label: { id: "Biaya rata-rata (Rp)", en: "Average cost (Rp)" }, num: true },
      ],
      baris: [
        [
          { id: "Gudang Pusat", en: "Central warehouse" },
          { id: "30", en: "30" },
          { id: "90.000", en: "90,000" },
        ],
        [
          { id: "Cabang Bandung", en: "Bandung branch" },
          { id: "12", en: "12" },
          { id: "90.000", en: "90,000" },
        ],
        [
          { id: "Cabang Surabaya", en: "Surabaya branch" },
          { id: "4", en: "4" },
          { id: "90.000", en: "90,000" },
        ],
      ],
    },
    {
      jenis: "angka",
      id: "nilai",
      judul: { id: "Nilai persediaan seluruh gudang", en: "Inventory value across warehouses" },
      nilai: 4_140_000,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: {
        id: "46 kg × biaya rata-rata Rp 90.000",
        en: "46 kg × Rp 90,000 average cost",
      },
    },
    {
      jenis: "daftar",
      id: "peringatan",
      judul: { id: "Yang perlu diputuskan sekarang", en: "What needs a decision now" },
      butir: [
        {
          teks: {
            id: "Cabang Surabaya tersisa 4 kg, di bawah batas minimum 10 kg",
            en: "Surabaya branch has 4 kg left, below the 10 kg minimum",
          },
          lencana: { id: "Segera pesan", en: "Reorder" },
          nada: "awas",
        },
        {
          teks: {
            id: "6 kg di Gudang Pusat kedaluwarsa dalam 21 hari",
            en: "6 kg at the central warehouse expires in 21 days",
          },
          lencana: { id: "Keluarkan lebih dulu", en: "Ship first" },
          nada: "awas",
        },
      ],
    },
    {
      jenis: "catatan",
      id: "catatan",
      nada: "ok",
      teks: {
        id: "Barang yang paling dekat kedaluwarsa dikeluarkan lebih dulu, dan harga pokok tiap penjualan memakai biaya rata-rata pada saat itu.",
        en: "Whatever is closest to expiry goes out first, and each sale's cost of goods uses the average cost at that moment.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "gudang" },
      narasi: {
        id: "Tiga gudang dilihat dalam satu daftar, bukan tiga berkas terpisah.",
        en: "Three warehouses in one list, not three separate files.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "nilai" },
      narasi: {
        id: "Nilai persediaan terhitung dari biaya rata-rata yang berlaku.",
        en: "Inventory value is computed from the prevailing average cost.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "peringatan" },
      narasi: {
        id: "Peringatan muncul sebelum stok habis, bukan setelah pesanan ditolak.",
        en: "Warnings appear before you run out, not after an order is turned away.",
      },
    },
    {
      aksi: "sorot",
      sasaran: { panel: "peringatan", baris: 1 },
      narasi: {
        id: "Barang yang mendekati kedaluwarsa ikut ditandai.",
        en: "Items approaching expiry are flagged too.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "catatan" },
      narasi: {
        id: "Urutan keluarnya diatur sistem, jadi tidak bergantung ingatan petugas gudang.",
        en: "The system sets the picking order, so it does not depend on a storekeeper remembering.",
      },
    },
  ],
};
