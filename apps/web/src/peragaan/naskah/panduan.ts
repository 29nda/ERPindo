import type { Naskah } from "../tipe";

/**
 * Naskah peragaan tambahan untuk halaman panduan (Fase 38f).
 *
 * Hanya ENAM. Dua puluh dari dua puluh enam slot gambar di panduan memakai
 * ulang naskah yang sudah ditulis untuk beranda dan `/fitur`, dan itu bukan
 * penghematan melainkan yang benar: panduan modul Kasir menerangkan alur yang
 * sama persis dengan yang diperagakan `kasir-shift`. Dua peragaan berbeda untuk
 * satu alur akan menjadi dua sumber yang bisa berpisah.
 *
 * Enam di bawah menutup seksi yang memang tidak punya padanan di `/fitur`:
 * data induk (produk, kontak), bagan akun, neraca, mata uang, dan penawaran.
 *
 * ## Perbedaan perlakuan di panduan
 *
 * Peragaan panduan dirender dengan `sekaliJalan` — berhenti di keadaan akhir
 * dan menawarkan tombol ulang. Pembaca panduan sedang mencocokkan layarnya
 * sendiri dengan yang di dokumen, dan gerak yang terus berulang mengganggu
 * pekerjaan itu. Di halaman jualan justru sebaliknya.
 */

export const PRODUK_INDUK: Naskah = {
  id: "produk-induk",
  jalur: "/app/master/produk",
  judul: { id: "Data produk yang dipakai seluruh modul", en: "Product records every module draws on" },
  ringkas: {
    id: "Produk dicatat sekali beserta harga jual, satuan, dan akun akuntansinya. Kasir, faktur, pembelian, dan laporan membaca dari catatan yang sama, jadi harga tidak pernah berbeda antar-modul.",
    en: "A product is recorded once with its price, unit, and accounts. The till, invoices, purchasing, and reports all read the same record, so prices never differ between modules.",
  },
  panel: [
    {
      jenis: "formulir",
      id: "produk",
      judul: { id: "Produk baru", en: "New product" },
      tombol: { id: "Simpan", en: "Save" },
      medan: [
        { id: "nama", label: { id: "Nama", en: "Name" }, nilai: { id: "Kopi Arabika 1 kg", en: "Arabica coffee 1 kg" } },
        { id: "sku", label: { id: "SKU", en: "SKU" }, nilai: { id: "KOP-ARB-1000", en: "KOP-ARB-1000" } },
        {
          id: "harga",
          label: { id: "Harga jual", en: "Selling price" },
          nilai: { id: "Rp 150.000", en: "Rp 150,000" },
          num: true,
        },
        { id: "satuan", label: { id: "Satuan", en: "Unit" }, nilai: { id: "kg", en: "kg" } },
      ],
    },
    {
      jenis: "daftar",
      id: "dipakai",
      judul: { id: "Langsung tersedia di", en: "Immediately available in" },
      butir: [
        {
          teks: { id: "Kasir — muncul di pencarian produk", en: "The till — appears in product search" },
          lencana: { id: "Siap", en: "Ready" },
          nada: "ok",
        },
        {
          teks: { id: "Faktur dan pesanan penjualan", en: "Invoices and sales orders" },
          lencana: { id: "Siap", en: "Ready" },
          nada: "ok",
        },
        {
          teks: { id: "Pembelian, stok, dan laporan penjualan", en: "Purchasing, stock, and sales reports" },
          lencana: { id: "Siap", en: "Ready" },
          nada: "ok",
        },
      ],
    },
    {
      jenis: "catatan",
      id: "catatan",
      nada: "netral",
      teks: {
        id: "Barcode boleh dikosongkan, lalu dipindai dan diisikan belakangan dari layar kasir. Harga per grup pelanggan diatur terpisah di Grup Harga.",
        en: "The barcode may be left blank; it can be scanned in later from the till. Per-customer-group pricing is set separately under Price Groups.",
      },
    },
  ],
  langkah: [
    {
      aksi: "ketik",
      sasaran: { panel: "produk", medan: "nama" },
      narasi: { id: "Nama produk diisi.", en: "The product name is entered." },
    },
    {
      aksi: "ketik",
      sasaran: { panel: "produk", medan: "harga" },
      narasi: { id: "Harga jualnya ditetapkan.", en: "Its selling price is set." },
    },
    {
      aksi: "klik",
      sasaran: { panel: "produk" },
      narasi: { id: "Produk disimpan.", en: "The product is saved." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "dipakai" },
      narasi: {
        id: "Sekali disimpan, ia tersedia di seluruh modul tanpa dimasukkan ulang.",
        en: "Once saved it is available across every module without re-entry.",
      },
    },
  ],
};

export const KONTAK_INDUK: Naskah = {
  id: "kontak-induk",
  jalur: "/app/master/kontak",
  judul: { id: "Satu kontak untuk pelanggan sekaligus pemasok", en: "One contact record for customer and supplier alike" },
  ringkas: {
    id: "Kontak menyimpan NPWP, alamat, dan grup harganya. Faktur mengambil datanya, umur piutang mengelompokkannya, dan ekspor pajak memakai NPWP yang sama.",
    en: "A contact holds the tax number, address, and price group. Invoices draw on it, ageing groups by it, and tax exports use the same tax number.",
  },
  panel: [
    {
      jenis: "formulir",
      id: "kontak",
      judul: { id: "Kontak baru", en: "New contact" },
      tombol: { id: "Simpan", en: "Save" },
      medan: [
        { id: "nama", label: { id: "Nama", en: "Name" }, nilai: { id: "PT Berkah Jaya", en: "PT Berkah Jaya" } },
        { id: "npwp", label: { id: "NPWP", en: "Tax number" }, nilai: { id: "01.234.567.8-901.000", en: "01.234.567.8-901.000" } },
        { id: "alamat", label: { id: "Alamat", en: "Address" }, nilai: { id: "Jl. Merdeka 12, Bandung", en: "Jl. Merdeka 12, Bandung" } },
        { id: "grupHarga", label: { id: "Grup harga", en: "Price group" }, nilai: { id: "Grosir", en: "Wholesale" } },
      ],
    },
    {
      jenis: "daftar",
      id: "akibat",
      judul: { id: "Yang mengikutinya", en: "What follows from it" },
      butir: [
        {
          teks: { id: "Jatuh tempo faktur dipakai umur piutang untuk mengelompokkannya", en: "The invoice due date is what ageing groups by" },
          lencana: { id: "Otomatis", en: "Automatic" },
          nada: "ok",
        },
        {
          teks: { id: "Faktur berikutnya memakai harga dari grup pelanggan ini", en: "The next invoice uses the price from this customer group" },
          lencana: { id: "Otomatis", en: "Automatic" },
          nada: "ok",
        },
        {
          teks: { id: "NPWP terbawa ke ekspor e-Faktur dan Coretax", en: "The tax number carries into e-Faktur and Coretax exports" },
          lencana: { id: "Terbawa", en: "Carried" },
          nada: "netral",
        },
      ],
    },
  ],
  langkah: [
    {
      aksi: "ketik",
      sasaran: { panel: "kontak", medan: "nama" },
      narasi: { id: "Nama kontak diisi.", en: "The contact name is entered." },
    },
    {
      aksi: "ketik",
      sasaran: { panel: "kontak", medan: "npwp" },
      narasi: {
        id: "NPWP diisi sekali di sini, bukan di tiap faktur.",
        en: "The tax number is entered once here, not on every invoice.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "kontak" },
      narasi: { id: "Kontak disimpan.", en: "The contact is saved." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "akibat" },
      narasi: {
        id: "Grup harganya langsung berlaku pada faktur berikutnya.",
        en: "Its price group applies to the next invoice immediately.",
      },
    },
  ],
};

export const BAGAN_AKUN: Naskah = {
  id: "bagan-akun",
  jalur: "/app/keuangan/akun",
  judul: { id: "Bagan akun yang sudah terpasang, bukan yang harus disusun", en: "A chart of accounts already in place, not one to be built" },
  ringkas: {
    id: "Bagan akun standar Indonesia terpasang saat perusahaan dibuat. Ia bisa ditambah, tetapi tidak perlu disusun dari nol, dan tidak ada proyek berbulan-bulan untuk menetapkannya.",
    en: "A standard Indonesian chart of accounts is in place the moment the company is created. It can be extended, but does not need building from scratch — and there is no months-long project to settle it.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "bagan",
      judul: { id: "Bagan akun bawaan", en: "Preloaded chart of accounts" },
      kolom: [
        { label: { id: "Kode", en: "Code" }, num: true },
        { label: { id: "Nama akun", en: "Account name" } },
        { label: { id: "Jenis", en: "Type" } },
      ],
      baris: [
        [{ id: "1100", en: "1100" }, { id: "Kas di Tangan", en: "Cash on hand" }, { id: "Aset", en: "Asset" }],
        [{ id: "1200", en: "1200" }, { id: "Piutang Usaha", en: "Accounts receivable" }, { id: "Aset", en: "Asset" }],
        [{ id: "2100", en: "2100" }, { id: "Utang Usaha", en: "Accounts payable" }, { id: "Kewajiban", en: "Liability" }],
        [{ id: "4100", en: "4100" }, { id: "Pendapatan Penjualan", en: "Sales revenue" }, { id: "Pendapatan", en: "Revenue" }],
      ],
    },
    {
      jenis: "formulir",
      id: "tambah",
      judul: { id: "Menambah akun sendiri", en: "Adding your own account" },
      tombol: { id: "Tambahkan", en: "Add" },
      medan: [
        { id: "kode", label: { id: "Kode", en: "Code" }, nilai: { id: "6250", en: "6250" }, num: true },
        { id: "nama", label: { id: "Nama akun", en: "Account name" }, nilai: { id: "Beban Sewa Gudang", en: "Warehouse rent expense" } },
      ],
    },
    {
      jenis: "catatan",
      id: "catatan",
      nada: "ok",
      teks: {
        id: "Akun yang sudah pernah dipakai tidak bisa dihapus, hanya dinonaktifkan. Menghapusnya akan memutus jurnal yang menunjuknya, dan jurnal adalah satu-satunya sumber angka laporan.",
        en: "An account already used cannot be deleted, only deactivated. Deleting it would break the journals pointing at it, and journals are the sole source of every reported figure.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "bagan" },
      narasi: {
        id: "Bagan akun sudah ada sejak perusahaan dibuat.",
        en: "The chart of accounts exists from the moment the company is created.",
      },
    },
    {
      aksi: "ketik",
      sasaran: { panel: "tambah", medan: "nama" },
      narasi: { id: "Akun tambahan bisa dibuat sendiri.", en: "Extra accounts can be added yourself." },
    },
    {
      aksi: "klik",
      sasaran: { panel: "tambah" },
      narasi: { id: "Akun ditambahkan.", en: "The account is added." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "catatan" },
      narasi: {
        id: "Akun yang sudah terpakai dilindungi dari penghapusan.",
        en: "Accounts already in use are protected from deletion.",
      },
    },
  ],
};

export const NERACA_SEIMBANG: Naskah = {
  id: "neraca-seimbang",
  jalur: "/app/keuangan/neraca",
  judul: { id: "Neraca yang seimbang karena disusun, bukan karena dicocokkan", en: "A balance sheet that balances by construction, not by adjustment" },
  ringkas: {
    id: "Aset selalu sama dengan kewajiban ditambah ekuitas, karena keduanya dibaca dari jurnal yang sama dan tiap jurnal wajib seimbang saat disimpan.",
    en: "Assets always equal liabilities plus equity, because both are read from the same journals and every journal must balance on save.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "aset",
      judul: { id: "Aset", en: "Assets" },
      kolom: [
        { label: { id: "Pos", en: "Line" } },
        { label: { id: "Jumlah (Rp)", en: "Amount (Rp)" }, num: true },
      ],
      baris: [
        [{ id: "Kas dan bank", en: "Cash and bank" }, { id: "842.500.000", en: "842,500,000" }],
        [{ id: "Piutang usaha", en: "Accounts receivable" }, { id: "614.300.000", en: "614,300,000" }],
        [{ id: "Persediaan", en: "Inventory" }, { id: "489.200.000", en: "489,200,000" }],
        [{ id: "Aset tetap (neto)", en: "Fixed assets (net)" }, { id: "1.054.000.000", en: "1,054,000,000" }],
        [{ id: "Jumlah aset", en: "Total assets" }, { id: "3.000.000.000", en: "3,000,000,000" }],
      ],
    },
    {
      jenis: "tabel",
      id: "kewajiban",
      judul: { id: "Kewajiban dan ekuitas", en: "Liabilities and equity" },
      kolom: [
        { label: { id: "Pos", en: "Line" } },
        { label: { id: "Jumlah (Rp)", en: "Amount (Rp)" }, num: true },
      ],
      baris: [
        [{ id: "Utang usaha", en: "Accounts payable" }, { id: "528.400.000", en: "528,400,000" }],
        [{ id: "Utang pajak", en: "Tax payable" }, { id: "147.600.000", en: "147,600,000" }],
        [{ id: "Modal disetor", en: "Paid-in capital" }, { id: "1.600.000.000", en: "1,600,000,000" }],
        [{ id: "Laba ditahan", en: "Retained earnings" }, { id: "724.000.000", en: "724,000,000" }],
        [{ id: "Jumlah", en: "Total" }, { id: "3.000.000.000", en: "3,000,000,000" }],
      ],
    },
    {
      jenis: "catatan",
      id: "catatan",
      nada: "ok",
      teks: {
        id: "Kedua sisi berjumlah Rp 3.000.000.000. Bila sebuah jurnal tidak seimbang, sistem menolak menyimpannya, jadi neraca tidak pernah perlu dicocokkan belakangan.",
        en: "Both sides total Rp 3,000,000,000. If a journal would not balance, the system refuses to save it — so the balance sheet never needs reconciling afterwards.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "aset", baris: 4 },
      narasi: { id: "Sisi aset dijumlahkan.", en: "The asset side totals." },
    },
    {
      aksi: "sorot",
      sasaran: { panel: "kewajiban", baris: 4 },
      narasi: {
        id: "Sisi kewajiban dan ekuitas berjumlah sama persis.",
        en: "Liabilities and equity total exactly the same.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "catatan" },
      narasi: {
        id: "Keseimbangannya bukan hasil penyesuaian, melainkan akibat jurnal yang tidak bisa disimpan bila timpang.",
        en: "The balance is not an adjustment; it follows from journals that cannot be saved when lopsided.",
      },
    },
  ],
};

export const KURS_SELISIH: Naskah = {
  id: "kurs-selisih",
  jalur: "/app/keuangan/kurs",
  judul: { id: "Transaksi mata uang asing beserta selisih kursnya", en: "Foreign currency transactions with their exchange differences" },
  ringkas: {
    id: "Faktur mata uang asing dicatat dengan kurs pada tanggalnya. Saat dilunasi pada kurs berbeda, selisihnya dijurnal sebagai laba atau rugi selisih kurs, bukan diselipkan ke pendapatan.",
    en: "A foreign-currency invoice is recorded at the rate on its date. When settled at a different rate, the difference is journalled as an exchange gain or loss, not folded into revenue.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "faktur",
      judul: { id: "Faktur ekspor INV-1210", en: "Export invoice INV-1210" },
      kolom: [
        { label: { id: "Tanggal", en: "Date" } },
        { label: { id: "Nilai", en: "Value" }, num: true },
        { label: { id: "Kurs", en: "Rate" }, num: true },
      ],
      baris: [
        [
          { id: "2 Des 2026 · diterbitkan", en: "2 Dec 2026 · issued" },
          { id: "USD 10.000", en: "USD 10,000" },
          { id: "16.200", en: "16,200" },
        ],
        [
          { id: "28 Des 2026 · dilunasi", en: "28 Dec 2026 · settled" },
          { id: "USD 10.000", en: "USD 10,000" },
          { id: "16.450", en: "16,450" },
        ],
      ],
    },
    {
      jenis: "jurnal",
      id: "jurnal",
      judul: { id: "Jurnal pelunasan", en: "Settlement entry" },
      baris: [
        { akun: { id: "Kas di Bank", en: "Cash at bank" }, debit: 164_500_000 },
        { akun: { id: "Piutang Usaha", en: "Accounts receivable" }, kredit: 162_000_000 },
        { akun: { id: "Laba Selisih Kurs", en: "Foreign exchange gain" }, kredit: 2_500_000 },
      ],
    },
    {
      jenis: "catatan",
      id: "catatan",
      nada: "netral",
      teks: {
        id: "Selisih Rp 2.500.000 muncul sebagai akunnya sendiri, sehingga laba usaha tidak tercampur laba yang berasal dari pergerakan kurs.",
        en: "The Rp 2,500,000 difference appears as its own account, so operating profit is not mixed with profit that came from currency movement.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "faktur", baris: 0 },
      narasi: {
        id: "Faktur dicatat memakai kurs pada tanggal terbitnya.",
        en: "The invoice is recorded at the rate on its issue date.",
      },
    },
    {
      aksi: "sorot",
      sasaran: { panel: "faktur", baris: 1 },
      narasi: {
        id: "Pelunasannya terjadi saat kursnya sudah berbeda.",
        en: "Settlement happens when the rate has moved.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jurnal" },
      narasi: {
        id: "Selisihnya dijurnal ke akunnya sendiri, dan jurnalnya tetap seimbang.",
        en: "The difference is journalled to its own account, and the entry still balances.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "catatan" },
      narasi: {
        id: "Laba usaha tetap terpisah dari laba yang berasal dari kurs.",
        en: "Operating profit stays separate from profit that came from the currency.",
      },
    },
  ],
};

export const PENAWARAN_CETAK: Naskah = {
  id: "penawaran-cetak",
  jalur: "/app/crm/penawaran",
  judul: { id: "Penawaran berkop yang siap dikirim", en: "A letterheaded quotation ready to send" },
  ringkas: {
    id: "Penawaran disusun dari data produk dan kontak yang sudah ada, lengkap dengan masa berlaku. Yang diterima menjadi pesanan penjualan tanpa satu baris pun diketik ulang.",
    en: "A quotation is assembled from existing product and contact records, with a validity period. An accepted one becomes a sales order without a single line retyped.",
  },
  panel: [
    {
      jenis: "formulir",
      id: "penawaran",
      judul: { id: "Penawaran QT-2026-0071", en: "Quotation QT-2026-0071" },
      tombol: { id: "Cetak & kirim", en: "Print & send" },
      medan: [
        { id: "pelanggan", label: { id: "Pelanggan", en: "Customer" }, nilai: { id: "PT Sinar Abadi", en: "PT Sinar Abadi" } },
        {
          id: "nilai",
          label: { id: "Nilai penawaran", en: "Quotation value" },
          nilai: { id: "Rp 148.000.000", en: "Rp 148,000,000" },
          num: true,
        },
        { id: "berlaku", label: { id: "Berlaku sampai", en: "Valid until" }, nilai: { id: "31 Januari 2027", en: "31 January 2027" } },
      ],
    },
    {
      jenis: "daftar",
      id: "lanjut",
      judul: { id: "Setelah dikirim", en: "After it is sent" },
      butir: [
        {
          teks: { id: "Berkas PDF berkop perusahaan Anda", en: "A PDF on your company letterhead" },
          lencana: { id: "Siap", en: "Ready" },
          nada: "ok",
        },
        {
          teks: { id: "Penawaran yang mendekati masa berlakunya ditandai", en: "Quotations nearing expiry are flagged" },
          lencana: { id: "Diingatkan", en: "Reminded" },
          nada: "awas",
        },
        {
          teks: { id: "Yang diterima menjadi pesanan penjualan dalam satu klik", en: "An accepted one becomes a sales order in one click" },
          lencana: { id: "Tertaut", en: "Linked" },
          nada: "netral",
        },
      ],
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "penawaran" },
      narasi: {
        id: "Baris penawaran diambil dari data produk yang sudah ada.",
        en: "Quotation lines are drawn from existing product records.",
      },
    },
    {
      aksi: "pilih",
      sasaran: { panel: "penawaran", medan: "nilai" },
      narasi: { id: "Nilainya terhitung dari barisnya.", en: "The value follows from the lines." },
    },
    {
      aksi: "klik",
      sasaran: { panel: "penawaran" },
      narasi: { id: "Penawaran dicetak dan dikirim.", en: "The quotation is printed and sent." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "lanjut" },
      narasi: {
        id: "Masa berlakunya diawasi, dan yang diterima berlanjut tanpa diketik ulang.",
        en: "Its validity is watched, and an accepted one continues without retyping.",
      },
    },
  ],
};
