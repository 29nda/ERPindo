import type { Naskah } from "../tipe";

/**
 * Naskah peragaan halaman `/fitur` (Fase 38e).
 *
 * Tujuh belas naskah, bukan dua puluh dua: lima modul terberat — faktur, kasir,
 * stok, penggajian, dan laporan — memakai ulang naskah yang sudah ditulis untuk
 * beranda. Menulis versi kedua untuk modul yang sama bukan hanya pekerjaan
 * ganda; ia juga membuat dua peragaan yang bisa saling bertentangan angkanya
 * tanpa ada yang menyadarinya.
 *
 * ## Angkanya menyambung antar-naskah
 *
 * Kopi Arabika berharga Rp 150.000 dengan biaya rata-rata Rp 90.000 di seluruh
 * naskah yang menyebutnya. Pendapatan tahunan PT Berkah Jaya
 * Rp 4.820.000.000 sama di `laporan-tersusun`, `konsolidasi-entitas`, dan
 * `anggaran-realisasi`. Ini bukan kerapian: pengunjung yang membandingkan dua
 * peragaan adalah pengunjung yang paling serius menilai, dan ia yang paling
 * mungkin menemukan angka yang tidak cocok.
 *
 * ## Tiap jurnal seimbang, dan itu diuji
 *
 * `test/peragaan-naskah.test.ts` menuntut Σdebit = Σkredit pada tiap panel
 * jenis `jurnal`. Angka di bawah bukan hiasan — ia bagian dari klaim halaman
 * ini, dan satu-satunya cara memastikannya adalah menjadikannya gerbang.
 */

export const JURNAL_PEMBALIK: Naskah = {
  id: "jurnal-pembalik",
  jalur: "/app/keuangan/jurnal",
  judul: {
    id: "Koreksi yang meninggalkan jejak, bukan yang menghapusnya",
    en: "A correction that leaves a trail, not one that erases it",
  },
  ringkas: {
    id: "Jurnal tidak pernah dihapus atau disunting. Salah posting diperbaiki dengan jurnal pembalik yang bertaut dua arah dengan yang dikoreksinya, sehingga riwayatnya tetap utuh untuk diperiksa.",
    en: "Journal entries are never deleted or edited. A wrong posting is fixed with a reversing entry linked in both directions to what it corrects, so the history stays intact for review.",
  },
  panel: [
    {
      jenis: "jurnal",
      id: "asli",
      judul: { id: "Jurnal asli · JU-2026-0412", en: "Original entry · JU-2026-0412" },
      baris: [
        { akun: { id: "Beban Sewa", en: "Rent expense" }, debit: 12_000_000 },
        { akun: { id: "Kas di Bank", en: "Cash at bank" }, kredit: 12_000_000 },
      ],
    },
    {
      jenis: "catatan",
      id: "sebab",
      nada: "awas",
      teks: {
        id: "Sewa ini seharusnya dibebankan ke Beban Sewa Gudang, bukan Beban Sewa. Akunnya salah, nilainya benar.",
        en: "This rent belongs to Warehouse Rent, not Rent. The account is wrong; the amount is right.",
      },
    },
    {
      jenis: "jurnal",
      id: "pembalik",
      judul: { id: "Jurnal pembalik · JU-2026-0419", en: "Reversing entry · JU-2026-0419" },
      baris: [
        { akun: { id: "Kas di Bank", en: "Cash at bank" }, debit: 12_000_000 },
        { akun: { id: "Beban Sewa", en: "Rent expense" }, kredit: 12_000_000 },
      ],
    },
    {
      jenis: "daftar",
      id: "jejak",
      judul: { id: "Yang tercatat sesudahnya", en: "What is recorded afterwards" },
      butir: [
        {
          teks: { id: "JU-2026-0412 ditandai sudah dibalik", en: "JU-2026-0412 marked as reversed" },
          lencana: { id: "Tertaut", en: "Linked" },
          nada: "netral",
        },
        {
          teks: { id: "Pelaku dan waktu koreksi tersimpan di log audit", en: "Who corrected it and when is stored in the audit log" },
          lencana: { id: "Terekam", en: "Recorded" },
          nada: "ok",
        },
        {
          teks: { id: "Neraca saldo tetap seimbang di sepanjang prosesnya", en: "The trial balance stays balanced throughout" },
          lencana: { id: "Seimbang", en: "Balanced" },
          nada: "ok",
        },
      ],
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "asli" },
      narasi: {
        id: "Sebuah jurnal diposting ke akun yang keliru.",
        en: "An entry was posted to the wrong account.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "sebab" },
      narasi: {
        id: "Kesalahannya ditemukan saat menutup buku.",
        en: "The mistake surfaces during period close.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "asli" },
      narasi: {
        id: "Yang tersedia adalah tombol Balik, bukan tombol Hapus.",
        en: "The available action is Reverse, not Delete.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "pembalik" },
      narasi: {
        id: "Jurnal pembalik terbentuk dengan nilai yang sama persis, arah berlawanan.",
        en: "A reversing entry forms with identical amounts in the opposite direction.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jejak" },
      narasi: {
        id: "Kedua jurnal saling menunjuk, dan tidak satu pun bisa dihilangkan.",
        en: "The two entries point at each other, and neither can be made to disappear.",
      },
    },
  ],
};

export const PPN_CORETAX: Naskah = {
  id: "ppn-coretax",
  jalur: "/app/keuangan/pajak",
  judul: {
    id: "PPN masa yang tersusun dari transaksi, bukan dari rekapitulasi",
    en: "Period VAT assembled from transactions, not from a recap sheet",
  },
  ringkas: {
    id: "PPN keluaran dan masukan dikumpulkan dari faktur yang sudah diposting, selisihnya dihitung, lalu berkasnya dibentuk dalam format yang diterima Coretax.",
    en: "Output and input VAT are gathered from posted invoices, the difference is computed, and the file is produced in the format Coretax accepts.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "rekap",
      judul: { id: "Masa Desember 2026", en: "December 2026 period" },
      kolom: [
        { label: { id: "Pos", en: "Line" } },
        { label: { id: "Faktur", en: "Invoices" }, num: true },
        { label: { id: "Jumlah (Rp)", en: "Amount (Rp)" }, num: true },
      ],
      baris: [
        [
          { id: "PPN Keluaran", en: "Output VAT" },
          { id: "184", en: "184" },
          { id: "33.000.000", en: "33,000,000" },
        ],
        [
          { id: "PPN Masukan", en: "Input VAT" },
          { id: "96", en: "96" },
          { id: "21.000.000", en: "21,000,000" },
        ],
      ],
    },
    {
      jenis: "angka",
      id: "kurang",
      judul: { id: "PPN kurang bayar", en: "VAT payable" },
      nilai: 12_000_000,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: {
        id: "Keluaran Rp 33.000.000 dikurangi masukan Rp 21.000.000",
        en: "Output Rp 33,000,000 less input Rp 21,000,000",
      },
    },
    {
      jenis: "daftar",
      id: "berkas",
      judul: { id: "Berkas yang terbentuk", en: "Files produced" },
      butir: [
        {
          teks: { id: "XML impor Coretax untuk seluruh faktur keluaran", en: "Coretax import XML for all output invoices" },
          lencana: { id: "Siap", en: "Ready" },
          nada: "ok",
        },
        {
          teks: { id: "Rekapitulasi per lawan transaksi untuk pemeriksaan sendiri", en: "Counterparty recap for your own review" },
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
        id: "Tarif mengikuti aturan yang berlaku, termasuk DPP nilai lain 11/12 sesuai PMK 131/2024. Tidak ada tabel tarif yang disalin tangan ke dalam berkas kerja.",
        en: "Rates follow the rules in force, including the 11/12 alternative tax base per PMK 131/2024. No rate table is hand-copied into a working file.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "rekap" },
      narasi: {
        id: "Masa pajak dipilih, lalu fakturnya dikumpulkan dari yang sudah diposting.",
        en: "A tax period is selected; its invoices are gathered from what has been posted.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "kurang" },
      narasi: {
        id: "Selisihnya dihitung, bukan diketik dari hasil rekapitulasi terpisah.",
        en: "The difference is computed, not typed in from a separate recap.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "berkas" },
      narasi: { id: "Berkas ekspor dibentuk.", en: "The export files are produced." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "berkas" },
      narasi: {
        id: "Format XML-nya yang diterima Coretax, jadi tidak perlu disusun ulang.",
        en: "The XML is in the format Coretax accepts, so nothing needs rebuilding.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "catatan" },
      narasi: {
        id: "Tarif yang dipakai mengikuti aturan yang berlaku sekarang.",
        en: "The rates applied follow the rules currently in force.",
      },
    },
  ],
};

export const KONSOLIDASI_ENTITAS: Naskah = {
  id: "konsolidasi-entitas",
  jalur: "/app/konsolidasi",
  judul: {
    id: "Beberapa badan usaha, satu laporan gabungan",
    en: "Several legal entities, one combined report",
  },
  ringkas: {
    id: "Tiap badan usaha punya basis datanya sendiri. Konsolidasi menjumlahkan keduanya dan mengeliminasi transaksi antar-perusahaan, sehingga penjualan ke perusahaan sendiri tidak terhitung dua kali.",
    en: "Each legal entity has its own database. Consolidation sums them and eliminates intercompany transactions, so a sale to your own company is not counted twice.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "entitas",
      judul: { id: "Pendapatan tahun berjalan", en: "Revenue year to date" },
      kolom: [
        { label: { id: "Badan usaha", en: "Legal entity" } },
        { label: { id: "Jumlah (Rp)", en: "Amount (Rp)" }, num: true },
      ],
      baris: [
        [{ id: "PT Berkah Jaya", en: "PT Berkah Jaya" }, { id: "4.820.000.000", en: "4,820,000,000" }],
        [{ id: "PT Berkah Logistik", en: "PT Berkah Logistik" }, { id: "2.150.000.000", en: "2,150,000,000" }],
      ],
    },
    {
      jenis: "catatan",
      id: "eliminasi",
      nada: "awas",
      teks: {
        id: "PT Berkah Logistik menagih jasa pengiriman Rp 350.000.000 kepada PT Berkah Jaya. Bagi grup, itu bukan pendapatan, karena uangnya hanya berpindah di dalam grup sendiri.",
        en: "PT Berkah Logistik billed Rp 350,000,000 of freight to PT Berkah Jaya. For the group that is not revenue — the money moved inside the same house.",
      },
    },
    {
      jenis: "angka",
      id: "gabungan",
      judul: { id: "Pendapatan konsolidasi", en: "Consolidated revenue" },
      nilai: 6_620_000_000,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: {
        id: "Rp 4.820.000.000 + Rp 2.150.000.000 − Rp 350.000.000 eliminasi",
        en: "Rp 4,820,000,000 + Rp 2,150,000,000 − Rp 350,000,000 eliminated",
      },
    },
    {
      jenis: "daftar",
      id: "sifat",
      judul: { id: "Yang tetap terpisah", en: "What stays separate" },
      butir: [
        {
          teks: { id: "Basis data tiap badan usaha, termasuk jurnal dan dokumennya", en: "Each entity's database, including its journals and documents" },
          lencana: { id: "Terpisah", en: "Separate" },
          nada: "ok",
        },
        {
          teks: { id: "Hak akses: seorang manajer bisa dibatasi ke satu badan usaha saja", en: "Permissions: a manager can be limited to a single entity" },
          lencana: { id: "Terpisah", en: "Separate" },
          nada: "ok",
        },
        {
          teks: { id: "Pelaporan pajak, karena kewajibannya memang per badan usaha", en: "Tax filing, because the obligation is per entity" },
          lencana: { id: "Terpisah", en: "Separate" },
          nada: "ok",
        },
      ],
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "entitas" },
      narasi: {
        id: "Dua badan usaha dipilih untuk digabungkan.",
        en: "Two legal entities are selected to combine.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "eliminasi" },
      narasi: {
        id: "Transaksi antar-perusahaan ditemukan dan ditandai.",
        en: "Intercompany transactions are found and flagged.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "gabungan" },
      narasi: {
        id: "Pendapatan gabungan dihitung setelah eliminasi, bukan sebelumnya.",
        en: "Combined revenue is computed after elimination, not before.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "sifat" },
      narasi: {
        id: "Penggabungan berlaku pada laporannya saja. Datanya sendiri tetap terpisah.",
        en: "The combining happens in the report; the data itself stays separate.",
      },
    },
  ],
};

export const PERAN_AUDIT: Naskah = {
  id: "peran-audit",
  jalur: "/app/pengaturan",
  judul: {
    id: "Siapa boleh melihat apa, dan siapa mengubah apa",
    en: "Who may see what, and who changed what",
  },
  ringkas: {
    id: "Hak akses diatur per modul dan per dimensi, ditegakkan di sisi server pada tiap permintaan. Setiap perubahan meninggalkan catatan berisi pelakunya, waktunya, dan nilai sebelum serta sesudahnya.",
    en: "Permissions are set per module and per dimension, enforced server-side on every request. Every change leaves a record of who, when, and the values before and after.",
  },
  panel: [
    {
      jenis: "daftar",
      id: "peran",
      judul: { id: "Peran pada perusahaan ini", en: "Roles in this company" },
      butir: [
        {
          teks: { id: "Direktur Keuangan · seluruh modul, seluruh cabang", en: "Finance Director · every module, every branch" },
          lencana: { id: "Owner", en: "Owner" },
          nada: "netral",
        },
        {
          teks: { id: "Manajer Cabang Bandung · penjualan dan stok, cabangnya saja", en: "Bandung Branch Manager · sales and stock, their branch only" },
          lencana: { id: "Kustom", en: "Custom" },
          nada: "ok",
        },
        {
          teks: { id: "Auditor eksternal · seluruh laporan, tanpa hak mengubah", en: "External auditor · all reports, no write access" },
          lencana: { id: "Viewer", en: "Viewer" },
          nada: "ok",
        },
      ],
    },
    {
      jenis: "catatan",
      id: "batas",
      nada: "netral",
      teks: {
        id: "Pembatasan per dimensi berarti manajer cabang membuka halaman yang sama dengan direktur, tetapi angkanya sudah tersaring ke cabangnya sebelum meninggalkan server.",
        en: "Per-dimension restriction means the branch manager opens the same page as the director, but the figures are already filtered to their branch before leaving the server.",
      },
    },
    {
      jenis: "tabel",
      id: "audit",
      judul: { id: "Log audit", en: "Audit log" },
      kolom: [
        { label: { id: "Waktu", en: "Time" } },
        { label: { id: "Pelaku", en: "Actor" } },
        { label: { id: "Perubahan", en: "Change" } },
      ],
      baris: [
        [
          { id: "14:02", en: "14:02" },
          { id: "Sri Wahyuni", en: "Sri Wahyuni" },
          { id: "Batas kredit PT Berkah Jaya: 50 juta → 80 juta", en: "PT Berkah Jaya credit limit: 50m → 80m" },
        ],
        [
          { id: "11:37", en: "11:37" },
          { id: "Bagas Prakoso", en: "Bagas Prakoso" },
          { id: "Faktur INV-1182 dibatalkan", en: "Invoice INV-1182 voided" },
        ],
      ],
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "peran", baris: 1 },
      narasi: {
        id: "Peran kustom dibuat dengan hak akses yang dipilih per modul.",
        en: "A custom role is created with permissions picked per module.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "batas" },
      narasi: {
        id: "Pembatasan cabang berlaku di server, bukan disembunyikan di antarmuka.",
        en: "The branch restriction applies on the server, not hidden in the interface.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "audit" },
      narasi: {
        id: "Tiap perubahan tercatat lengkap dengan pelakunya.",
        en: "Every change is recorded together with who made it.",
      },
    },
    {
      aksi: "sorot",
      sasaran: { panel: "audit", baris: 1 },
      narasi: {
        id: "Termasuk pembatalan dokumen, yang justru paling perlu ditelusuri.",
        en: "Including document voids, which are the ones most worth tracing.",
      },
    },
  ],
};

export const DASBOR_HARIAN: Naskah = {
  id: "dasbor-harian",
  jalur: "/app",
  judul: {
    id: "Layar pertama yang menyebut apa yang perlu diputuskan",
    en: "A first screen that names what needs deciding",
  },
  ringkas: {
    id: "Dasbor membaca dari jurnal yang sama dengan laporan, jadi angkanya tidak pernah berbeda. Yang ditampilkan bukan seluruh yang bisa dihitung, melainkan yang menuntut keputusan hari ini.",
    en: "The dashboard reads from the same journals as the reports, so the figures never differ. What it shows is not everything computable, but what demands a decision today.",
  },
  panel: [
    {
      jenis: "angka",
      id: "kas",
      judul: { id: "Kas dan bank", en: "Cash and bank" },
      nilai: 842_500_000,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: { id: "Naik Rp 61.200.000 dari bulan lalu", en: "Up Rp 61,200,000 from last month" },
      nada: "ok",
    },
    {
      jenis: "angka",
      id: "piutang",
      judul: { id: "Faktur lewat jatuh tempo", en: "Overdue invoices" },
      nilai: 214_800_000,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: { id: "17 faktur · tertua 62 hari", en: "17 invoices · oldest 62 days" },
      nada: "awas",
    },
    {
      jenis: "bagan",
      id: "tren",
      judul: { id: "Pendapatan enam bulan terakhir", en: "Revenue, last six months" },
      seri: [352, 388, 401, 375, 430, 452],
      label: [
        { id: "Jul", en: "Jul" },
        { id: "Agu", en: "Aug" },
        { id: "Sep", en: "Sep" },
        { id: "Okt", en: "Oct" },
        { id: "Nov", en: "Nov" },
        { id: "Des", en: "Dec" },
      ],
    },
    {
      jenis: "daftar",
      id: "tindakan",
      judul: { id: "Menunggu keputusan", en: "Awaiting a decision" },
      butir: [
        {
          teks: { id: "3 permintaan pembelian di atas batas persetujuan Anda", en: "3 purchase requests above your approval threshold" },
          lencana: { id: "Setujui", en: "Approve" },
          nada: "awas",
        },
        {
          teks: { id: "Periode November belum ditutup", en: "November has not been closed" },
          lencana: { id: "Tutup buku", en: "Close" },
          nada: "netral",
        },
      ],
    },
  ],
  langkah: [
    {
      aksi: "isi",
      sasaran: { panel: "kas" },
      narasi: {
        id: "Saldo kas dibaca dari buku besar, bukan dari catatan terpisah.",
        en: "The cash balance is read from the ledger, not a separate note.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "piutang" },
      narasi: {
        id: "Faktur lewat jatuh tempo muncul tanpa perlu dicari.",
        en: "Overdue invoices surface without being looked for.",
      },
    },
    {
      aksi: "tandai",
      sasaran: { panel: "piutang" },
      nada: "awas",
      narasi: {
        id: "Yang menuntut perhatian ditandai, bukan disamakan dengan yang lain.",
        en: "What needs attention is flagged, not levelled with the rest.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "tren" },
      narasi: {
        id: "Trennya memakai angka yang sama dengan laporan laba rugi.",
        en: "The trend uses the same figures as the profit and loss report.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "tindakan" },
      narasi: {
        id: "Daftar terakhir berisi pekerjaan, bukan sekadar kabar.",
        en: "The last list holds work, not merely news.",
      },
    },
  ],
};

export const PEMBELIAN_UTANG: Naskah = {
  id: "pembelian-utang",
  jalur: "/app/pembelian",
  judul: {
    id: "Barang masuk, utang tercatat, PPN masukan siap dikreditkan",
    en: "Goods in, payable recorded, input VAT ready to credit",
  },
  ringkas: {
    id: "Satu penerimaan barang menambah stok, membentuk utang usaha, dan mencatat PPN masukan sekaligus, sehingga tidak ada tagihan pemasok yang baru ditemukan saat ditagih.",
    en: "One goods receipt raises stock, creates the payable, and records input VAT at once — so no supplier bill is discovered only when they chase it.",
  },
  panel: [
    {
      jenis: "formulir",
      id: "penerimaan",
      judul: { id: "Penerimaan barang · PO-2026-0338", en: "Goods receipt · PO-2026-0338" },
      tombol: { id: "Terima & posting", en: "Receive & post" },
      medan: [
        {
          id: "pemasok",
          label: { id: "Pemasok", en: "Supplier" },
          nilai: { id: "CV Sumber Tani", en: "CV Sumber Tani" },
        },
        {
          id: "barang",
          label: { id: "Barang", en: "Item" },
          nilai: { id: "Kopi Arabika 1 kg · 200 × Rp 100.000", en: "Arabica coffee 1 kg · 200 × Rp 100,000" },
        },
        {
          id: "ppn",
          label: { id: "PPN masukan 11%", en: "Input VAT 11%" },
          nilai: { id: "Rp 2.200.000", en: "Rp 2,200,000" },
          num: true,
        },
      ],
    },
    {
      jenis: "jurnal",
      id: "jurnal",
      judul: { id: "Jurnal pembelian", en: "Purchase journal" },
      baris: [
        { akun: { id: "Persediaan Barang", en: "Inventory" }, debit: 20_000_000 },
        { akun: { id: "PPN Masukan", en: "Input VAT" }, debit: 2_200_000 },
        { akun: { id: "Utang Usaha", en: "Accounts payable" }, kredit: 22_200_000 },
      ],
    },
    {
      jenis: "catatan",
      id: "hpp",
      nada: "netral",
      teks: {
        id: "Biaya rata-rata Kopi Arabika naik dari Rp 90.000 menjadi Rp 98.750 per kg setelah penerimaan ini, dan harga pokok penjualan berikutnya langsung memakai angka baru itu.",
        en: "The average cost of Arabica coffee rises from Rp 90,000 to Rp 98,750 per kg after this receipt, and the next sale's cost of goods uses the new figure immediately.",
      },
    },
    {
      jenis: "daftar",
      id: "lanjut",
      judul: { id: "Yang terjadi sesudahnya", en: "What follows" },
      butir: [
        {
          teks: { id: "Utang usaha masuk daftar umur utang beserta jatuh temponya", en: "The payable joins the payables ageing with its due date" },
          lencana: { id: "Terjadwal", en: "Scheduled" },
          nada: "netral",
        },
        {
          teks: { id: "PPN masukan ikut terhitung di masa pajak berjalan", en: "Input VAT counts toward the current tax period" },
          lencana: { id: "Terhitung", en: "Counted" },
          nada: "ok",
        },
      ],
    },
  ],
  langkah: [
    {
      aksi: "ketik",
      sasaran: { panel: "penerimaan", medan: "barang" },
      narasi: {
        id: "Barang yang benar-benar diterima dicatat, bukan yang dipesan.",
        en: "What was actually received is recorded, not what was ordered.",
      },
    },
    {
      aksi: "pilih",
      sasaran: { panel: "penerimaan", medan: "ppn" },
      narasi: { id: "PPN masukan dihitung sendiri.", en: "Input VAT is computed automatically." },
    },
    {
      aksi: "klik",
      sasaran: { panel: "penerimaan" },
      narasi: { id: "Penerimaan diposting.", en: "The receipt is posted." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jurnal" },
      narasi: {
        id: "Persediaan dan utang usaha terbentuk dalam satu jurnal yang seimbang.",
        en: "Inventory and the payable form in a single balanced entry.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "hpp" },
      narasi: {
        id: "Biaya rata-rata dihitung ulang, jadi laba penjualan berikutnya memakai modal yang benar.",
        en: "Average cost is recomputed, so the next sale's margin uses the right cost.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "lanjut" },
      narasi: {
        id: "Jatuh tempo dan PPN masukannya terdaftar tanpa langkah tambahan.",
        en: "The due date and its input VAT are registered with no extra step.",
      },
    },
  ],
};

export const PERSETUJUAN_BERJENJANG: Naskah = {
  id: "persetujuan-berjenjang",
  jalur: "/app/persetujuan",
  judul: { id: "Batas wewenang yang dijalankan sistem", en: "Spending limits the system enforces" },
  ringkas: {
    id: "Pengeluaran di atas batas tertentu tidak bisa diposting sebelum disetujui orang yang berwenang. Aturannya ditulis sekali, lalu berlaku pada tiap dokumen tanpa siapa pun perlu mengingatnya.",
    en: "Spending above a threshold cannot post until the right person approves. The rule is written once, then applies to every document without anyone needing to remember it.",
  },
  panel: [
    {
      jenis: "daftar",
      id: "aturan",
      judul: { id: "Aturan yang berlaku", en: "Rules in force" },
      butir: [
        {
          teks: { id: "Di bawah Rp 10.000.000 — langsung diposting", en: "Below Rp 10,000,000 — posts directly" },
          lencana: { id: "Tanpa persetujuan", en: "No approval" },
          nada: "ok",
        },
        {
          teks: { id: "Rp 10.000.000 s.d. Rp 100.000.000 — Manajer Keuangan", en: "Rp 10,000,000 to Rp 100,000,000 — Finance Manager" },
          lencana: { id: "Satu jenjang", en: "One level" },
          nada: "netral",
        },
        {
          teks: { id: "Di atas Rp 100.000.000 — Manajer Keuangan lalu Direktur", en: "Above Rp 100,000,000 — Finance Manager then Director" },
          lencana: { id: "Dua jenjang", en: "Two levels" },
          nada: "awas",
        },
      ],
    },
    {
      jenis: "tabel",
      id: "antrean",
      judul: { id: "Menunggu keputusan Anda", en: "Awaiting your decision" },
      kolom: [
        { label: { id: "Dokumen", en: "Document" } },
        { label: { id: "Pemohon", en: "Requester" } },
        { label: { id: "Jumlah (Rp)", en: "Amount (Rp)" }, num: true },
      ],
      baris: [
        [
          { id: "Permintaan pembelian PR-0412", en: "Purchase request PR-0412" },
          { id: "Bagas Prakoso", en: "Bagas Prakoso" },
          { id: "148.000.000", en: "148,000,000" },
        ],
      ],
    },
    {
      jenis: "catatan",
      id: "jejak",
      nada: "ok",
      teks: {
        id: "Keputusan tersimpan beserta pelakunya, waktunya, dan catatan yang ditulisnya. Dokumen yang ditolak tidak terhapus. Ia tercatat sebagai ditolak, sehingga alasannya bisa dibaca kembali.",
        en: "The decision is stored with who, when, and the note they wrote. A rejected document is not deleted — it is recorded as rejected, so the reason can be read again later.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "aturan", baris: 2 },
      narasi: {
        id: "Aturan batas wewenang ditulis sekali di pengaturan.",
        en: "The authority thresholds are written once in settings.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "antrean" },
      narasi: {
        id: "Permintaan di atas batas berhenti di antrean, bukan lolos diam-diam.",
        en: "A request above the threshold stops in the queue rather than slipping through.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "antrean" },
      narasi: { id: "Penyetuju memutuskan.", en: "The approver decides." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jejak" },
      narasi: {
        id: "Keputusannya tercatat, termasuk bila ditolak.",
        en: "The decision is recorded, including when it is a rejection.",
      },
    },
  ],
};

export const KAS_REKONSILIASI: Naskah = {
  id: "kas-rekonsiliasi",
  jalur: "/app/keuangan/kas-bank",
  judul: { id: "Rekonsiliasi bank yang menyisakan selisih nol", en: "Bank reconciliation that ends at zero" },
  ringkas: {
    id: "Mutasi rekening dicocokkan dengan jurnal kas. Yang cocok ditandai, yang tidak cocok disebutkan satu per satu, sehingga selisih tidak pernah berupa satu angka besar tanpa penjelasan.",
    en: "Bank movements are matched against the cash journal. Matches are marked, mismatches are named one by one — so a difference is never one large unexplained figure.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "cocok",
      judul: { id: "Pencocokan Desember", en: "December matching" },
      kolom: [
        { label: { id: "Keterangan", en: "Description" } },
        { label: { id: "Jumlah (Rp)", en: "Amount (Rp)" }, num: true },
      ],
      baris: [
        [{ id: "Saldo rekening koran", en: "Bank statement balance" }, { id: "842.500.000", en: "842,500,000" }],
        [{ id: "Saldo buku besar kas", en: "Ledger cash balance" }, { id: "851.300.000", en: "851,300,000" }],
        [{ id: "Selisih awal", en: "Initial difference" }, { id: "8.800.000", en: "8,800,000" }],
      ],
    },
    {
      jenis: "daftar",
      id: "sebab",
      judul: { id: "Selisihnya berasal dari", en: "The difference comes from" },
      butir: [
        {
          teks: { id: "Cek CQ-0271 sudah dicatat, belum dicairkan penerimanya", en: "Cheque CQ-0271 recorded, not yet presented by the payee" },
          lencana: { id: "Rp 9.000.000", en: "Rp 9,000,000" },
          nada: "netral",
        },
        {
          teks: { id: "Biaya administrasi bank belum dijurnal", en: "Bank charges not yet journalled" },
          lencana: { id: "Rp 200.000", en: "Rp 200,000" },
          nada: "awas",
        },
      ],
    },
    {
      jenis: "angka",
      id: "sisa",
      judul: { id: "Selisih yang belum terjelaskan", en: "Difference still unexplained" },
      nilai: 0,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: {
        id: "Rp 8.800.000 selisih awal, seluruhnya tertelusuri",
        en: "Rp 8,800,000 initial difference, all of it traced",
      },
      nada: "ok",
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "cocok", baris: 2 },
      narasi: {
        id: "Saldo bank dan saldo buku tidak sama, dan itu wajar.",
        en: "The bank and ledger balances differ, and that is normal.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "sebab" },
      narasi: {
        id: "Selisihnya diuraikan menjadi sebab yang bisa disebut namanya.",
        en: "The difference is broken into causes that can be named.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "sebab" },
      narasi: {
        id: "Biaya bank yang belum dijurnal langsung dijurnal dari sini.",
        en: "The unjournalled bank charge is journalled straight from here.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "sisa" },
      narasi: {
        id: "Yang tersisa nol, dan itulah tanda rekonsiliasinya selesai.",
        en: "What remains is zero, and that is what finished reconciliation means.",
      },
    },
  ],
};

export const ASET_PENYUSUTAN: Naskah = {
  id: "aset-penyusutan",
  jalur: "/app/keuangan/aset",
  judul: { id: "Penyusutan yang berjalan sendiri tiap bulan", en: "Depreciation that runs itself each month" },
  ringkas: {
    id: "Aset dicatat sekali beserta masa manfaatnya. Beban penyusutan dijurnal tiap bulan tanpa diminta, dan nilai bukunya selalu bisa dilihat pada tanggal berapa pun.",
    en: "An asset is recorded once with its useful life. Depreciation is journalled every month unasked, and its book value can be read at any date.",
  },
  panel: [
    {
      jenis: "formulir",
      id: "aset",
      judul: { id: "Aset tetap · AT-0044", en: "Fixed asset · AT-0044" },
      medan: [
        { id: "nama", label: { id: "Aset", en: "Asset" }, nilai: { id: "Truk boks Isuzu", en: "Isuzu box truck" } },
        {
          id: "harga",
          label: { id: "Harga perolehan", en: "Acquisition cost" },
          nilai: { id: "Rp 480.000.000", en: "Rp 480,000,000" },
          num: true,
        },
        { id: "masa", label: { id: "Masa manfaat", en: "Useful life" }, nilai: { id: "8 tahun", en: "8 years" } },
        {
          id: "bulanan",
          label: { id: "Penyusutan per bulan", en: "Monthly depreciation" },
          nilai: { id: "Rp 5.000.000", en: "Rp 5,000,000" },
          num: true,
        },
      ],
    },
    {
      jenis: "jurnal",
      id: "jurnal",
      judul: { id: "Jurnal penyusutan bulan berjalan", en: "This month's depreciation entry" },
      baris: [
        { akun: { id: "Beban Penyusutan", en: "Depreciation expense" }, debit: 5_000_000 },
        { akun: { id: "Akumulasi Penyusutan", en: "Accumulated depreciation" }, kredit: 5_000_000 },
      ],
    },
    {
      jenis: "angka",
      id: "buku",
      judul: { id: "Nilai buku per 31 Desember 2026", en: "Book value at 31 December 2026" },
      nilai: 360_000_000,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: {
        id: "Rp 480.000.000 dikurangi akumulasi 24 bulan",
        en: "Rp 480,000,000 less 24 months accumulated",
      },
    },
  ],
  langkah: [
    {
      aksi: "ketik",
      sasaran: { panel: "aset", medan: "harga" },
      narasi: { id: "Aset dicatat sekali saat dibeli.", en: "The asset is recorded once, at purchase." },
    },
    {
      aksi: "pilih",
      sasaran: { panel: "aset", medan: "bulanan" },
      narasi: {
        id: "Penyusutan bulanannya terhitung dari masa manfaat.",
        en: "Monthly depreciation follows from the useful life.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jurnal" },
      narasi: {
        id: "Jurnalnya terbentuk tiap awal bulan tanpa diminta.",
        en: "The entry forms at the start of each month, unasked.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "buku" },
      narasi: {
        id: "Nilai bukunya mengikuti jurnal, bukan dihitung terpisah di berkas kerja.",
        en: "Book value follows the journal rather than a separate working file.",
      },
    },
  ],
};

export const PIPELINE_PENAWARAN: Naskah = {
  id: "pipeline-penawaran",
  jalur: "/app/crm/leads",
  judul: { id: "Dari calon pelanggan sampai faktur, tanpa mengetik ulang", en: "From prospect to invoice without retyping" },
  ringkas: {
    id: "Calon pelanggan bergerak antar-tahapan, penawaran dibuat dari datanya, dan penawaran yang diterima menjadi pesanan lalu faktur. Nomor dan harganya terbawa, tidak diketik ulang.",
    en: "A prospect moves between stages, a quotation is built from their data, and an accepted quotation becomes an order then an invoice — numbers and prices carry over rather than being retyped.",
  },
  panel: [
    {
      jenis: "papan",
      id: "papan",
      judul: { id: "Tahapan penjualan", en: "Sales pipeline" },
      kolom: [
        { judul: { id: "Baru", en: "New" }, kartu: [{ id: "PT Sinar Abadi", en: "PT Sinar Abadi" }] },
        {
          judul: { id: "Penawaran", en: "Quoted" },
          kartu: [{ id: "PT Berkah Jaya · Rp 148.000.000", en: "PT Berkah Jaya · Rp 148,000,000" }],
        },
        { judul: { id: "Menang", en: "Won" }, kartu: [{ id: "CV Mitra Karya", en: "CV Mitra Karya" }] },
      ],
    },
    {
      jenis: "daftar",
      id: "rantai",
      judul: { id: "Yang terbawa saat penawaran diterima", en: "What carries over when a quote is accepted" },
      butir: [
        {
          teks: { id: "Baris barang beserta harga dan diskonnya", en: "Line items with their prices and discounts" },
          lencana: { id: "Terbawa", en: "Carried" },
          nada: "ok",
        },
        {
          teks: { id: "Data pelanggan beserta termin pembayarannya", en: "Customer details along with their payment term" },
          lencana: { id: "Terbawa", en: "Carried" },
          nada: "ok",
        },
        {
          teks: { id: "Tautan ke penawaran asalnya, untuk ditelusuri kembali", en: "A link back to the originating quotation" },
          lencana: { id: "Tertaut", en: "Linked" },
          nada: "netral",
        },
      ],
    },
    {
      jenis: "catatan",
      id: "catatan",
      nada: "netral",
      teks: {
        id: "Penawaran yang kalah tetap tersimpan beserta alasannya, sehingga tingkat keberhasilan penawaran bisa dibaca dari data, bukan dari ingatan.",
        en: "Lost quotations are kept with their reasons, so win rates can be read from data rather than memory.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "papan" },
      narasi: {
        id: "Calon pelanggan bergerak antar-tahapan dengan cara diseret.",
        en: "Prospects move between stages by dragging.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "papan" },
      narasi: { id: "Penawaran yang diterima ditandai menang.", en: "An accepted quotation is marked won." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "rantai" },
      narasi: {
        id: "Pesanan penjualan terbentuk dari isi penawarannya.",
        en: "A sales order forms from the quotation's contents.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "catatan" },
      narasi: {
        id: "Yang kalah pun tersimpan, karena angkanya berguna.",
        en: "Even lost ones are kept, because the figures are useful.",
      },
    },
  ],
};

export const ANGGARAN_REALISASI: Naskah = {
  id: "anggaran-realisasi",
  jalur: "/app/keuangan/anggaran",
  judul: { id: "Anggaran yang dibandingkan sendiri dengan realisasinya", en: "A budget that compares itself against actuals" },
  ringkas: {
    id: "Anggaran disusun per akun dan per periode. Realisasinya dibaca dari jurnal yang sama dengan laporan, jadi selisihnya muncul sepanjang bulan berjalan, bukan setelah tutup buku.",
    en: "Budgets are set per account and period. Actuals are read from the same journals as the reports, so variances appear during the month rather than after close.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "banding",
      judul: { id: "Beban usaha · Desember", en: "Operating expenses · December" },
      kolom: [
        { label: { id: "Pos biaya", en: "Cost line" } },
        { label: { id: "Anggaran", en: "Budget" }, num: true },
        { label: { id: "Realisasi", en: "Actual" }, num: true },
        { label: { id: "Selisih", en: "Variance" }, num: true },
      ],
      baris: [
        [
          { id: "Gaji", en: "Salaries" },
          { id: "50.000.000", en: "50,000,000" },
          { id: "50.000.000", en: "50,000,000" },
          { id: "0", en: "0" },
        ],
        [
          { id: "Sewa", en: "Rent" },
          { id: "12.000.000", en: "12,000,000" },
          { id: "12.000.000", en: "12,000,000" },
          { id: "0", en: "0" },
        ],
        [
          { id: "Pemasaran", en: "Marketing" },
          { id: "20.000.000", en: "20,000,000" },
          { id: "31.400.000", en: "31,400,000" },
          { id: "−11.400.000", en: "−11,400,000" },
        ],
      ],
    },
    {
      jenis: "angka",
      id: "lampau",
      judul: { id: "Pemasaran terhadap anggarannya", en: "Marketing against its budget" },
      nilai: 157,
      satuan: { id: "persen", en: "percent" },
      delta: { id: "Terlampaui Rp 11.400.000 pada 21 Desember", en: "Over by Rp 11,400,000 as at 21 December" },
      nada: "galat",
    },
    {
      jenis: "catatan",
      id: "catatan",
      nada: "awas",
      teks: {
        id: "Peringatan muncul saat anggaran terlampaui, bukan pada laporan bulan berikutnya. Anggaran dapat disusun per cabang atau per pos biaya, sehingga pemiliknya jelas.",
        en: "The warning appears when the budget is exceeded, not in next month's report. Budgets can be set per branch or per cost centre, so ownership is clear.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "banding" },
      narasi: {
        id: "Anggaran dan realisasi diletakkan berdampingan per pos biaya.",
        en: "Budget and actual sit side by side per cost line.",
      },
    },
    {
      aksi: "tandai",
      sasaran: { panel: "banding" },
      nada: "awas",
      narasi: {
        id: "Pos yang terlampaui ditandai selagi bulannya masih berjalan.",
        en: "An exceeded line is flagged while the month is still running.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "lampau" },
      narasi: {
        id: "Besaran pelampauannya disebut, bukan hanya statusnya.",
        en: "The size of the overrun is named, not merely its status.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "catatan" },
      narasi: {
        id: "Realisasinya dibaca dari jurnal yang sama dengan laporan keuangan.",
        en: "Actuals are read from the same journals as the financial reports.",
      },
    },
  ],
};

export const PROYEK_BIAYA: Naskah = {
  id: "proyek-biaya",
  jalur: "/app/proyek",
  judul: { id: "Laba per proyek, bukan hanya laba perusahaan", en: "Profit per project, not just company profit" },
  ringkas: {
    id: "Tiap biaya dan pendapatan bisa ditandai milik proyek tertentu. Laba tiap proyek terbaca sepanjang pengerjaannya, sehingga proyek yang merugi ditemukan sebelum selesai.",
    en: "Every cost and revenue can be tagged to a project. Each project's margin is readable while it runs, so a loss-making project is found before it finishes.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "proyek",
      judul: { id: "Proyek berjalan", en: "Active projects" },
      kolom: [
        { label: { id: "Proyek", en: "Project" } },
        { label: { id: "Nilai kontrak", en: "Contract value" }, num: true },
        { label: { id: "Biaya sejauh ini", en: "Cost to date" }, num: true },
      ],
      baris: [
        [
          { id: "Pemasangan gudang Bandung", en: "Bandung warehouse fit-out" },
          { id: "820.000.000", en: "820,000,000" },
          { id: "612.000.000", en: "612,000,000" },
        ],
        [
          { id: "Peremajaan armada", en: "Fleet refresh" },
          { id: "1.150.000.000", en: "1,150,000,000" },
          { id: "1.088.000.000", en: "1,088,000,000" },
        ],
      ],
    },
    {
      jenis: "angka",
      id: "margin",
      judul: { id: "Margin peremajaan armada", en: "Fleet refresh margin" },
      nilai: 5,
      satuan: { id: "persen", en: "percent" },
      delta: { id: "Turun dari 18% pada rencana awal", en: "Down from 18% at plan" },
      nada: "galat",
    },
    {
      jenis: "daftar",
      id: "sumber",
      judul: { id: "Biaya yang mendorongnya", en: "The costs driving it" },
      butir: [
        {
          teks: { id: "Lembur di luar rencana Rp 96.000.000", en: "Unplanned overtime Rp 96,000,000" },
          lencana: { id: "Penggajian", en: "Payroll" },
          nada: "awas",
        },
        {
          teks: { id: "Pembelian suku cadang tambahan Rp 74.000.000", en: "Extra parts purchased Rp 74,000,000" },
          lencana: { id: "Pembelian", en: "Purchasing" },
          nada: "awas",
        },
      ],
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "proyek", baris: 1 },
      narasi: {
        id: "Tiap proyek membawa nilai kontrak dan biaya yang sudah terjadi.",
        en: "Each project carries its contract value and the cost incurred so far.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "margin" },
      narasi: {
        id: "Marginnya terhitung selagi proyeknya masih berjalan.",
        en: "The margin is computed while the project is still running.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "margin" },
      narasi: { id: "Angkanya dibuka untuk ditelusuri.", en: "The figure is opened to drill down." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "sumber" },
      narasi: {
        id: "Biayanya berasal dari penggajian dan pembelian yang sudah ditandai proyeknya.",
        en: "The costs come from payroll and purchases already tagged to the project.",
      },
    },
  ],
};

export const KONTRAK_BERULANG: Naskah = {
  id: "kontrak-berulang",
  jalur: "/app/kontrak",
  judul: { id: "Tagihan berulang yang terbit tanpa diingatkan", en: "Recurring bills that issue without a reminder" },
  ringkas: {
    id: "Kontrak berlangganan ditulis sekali beserta periodenya. Fakturnya terbit sendiri pada tanggalnya, sudah berjurnal, dan kontrak yang mendekati berakhir ditandai sebelum terlewat.",
    en: "A recurring contract is written once with its cycle. Invoices issue themselves on the date, already journalled, and contracts nearing expiry are flagged before they lapse.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "kontrak",
      judul: { id: "Kontrak aktif", en: "Active contracts" },
      kolom: [
        { label: { id: "Pelanggan", en: "Customer" } },
        { label: { id: "Siklus", en: "Cycle" } },
        { label: { id: "Nilai (Rp)", en: "Value (Rp)" }, num: true },
      ],
      baris: [
        [
          { id: "PT Sinar Abadi", en: "PT Sinar Abadi" },
          { id: "Bulanan", en: "Monthly" },
          { id: "18.500.000", en: "18,500,000" },
        ],
        [
          { id: "CV Mitra Karya", en: "CV Mitra Karya" },
          { id: "Kuartalan", en: "Quarterly" },
          { id: "42.000.000", en: "42,000,000" },
        ],
      ],
    },
    {
      jenis: "daftar",
      id: "otomatis",
      judul: { id: "Yang berjalan sendiri", en: "What runs by itself" },
      butir: [
        {
          teks: { id: "Faktur terbit pada tanggal siklusnya, sudah berjurnal", en: "The invoice issues on its cycle date, already journalled" },
          lencana: { id: "Terjadwal", en: "Scheduled" },
          nada: "ok",
        },
        {
          teks: { id: "Kontrak yang berakhir dalam 30 hari ditandai untuk diperpanjang", en: "Contracts expiring within 30 days are flagged for renewal" },
          lencana: { id: "Diingatkan", en: "Reminded" },
          nada: "awas",
        },
        {
          teks: { id: "Kenaikan harga tahunan diterapkan pada siklus berikutnya", en: "Annual uplifts apply from the next cycle" },
          lencana: { id: "Terjadwal", en: "Scheduled" },
          nada: "netral",
        },
      ],
    },
    {
      jenis: "angka",
      id: "berulang",
      judul: { id: "Pendapatan berulang per bulan", en: "Monthly recurring revenue" },
      nilai: 32_500_000,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: { id: "Dari 2 kontrak aktif, disetahunkan", en: "From 2 active contracts, annualised" },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "kontrak" },
      narasi: {
        id: "Kontrak ditulis sekali, beserta siklus penagihannya.",
        en: "The contract is written once, with its billing cycle.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "otomatis" },
      narasi: {
        id: "Fakturnya terbit pada tanggalnya tanpa ada yang perlu mengingat.",
        en: "Invoices issue on the date with nobody needing to remember.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "berulang" },
      narasi: {
        id: "Pendapatan berulangnya terbaca sebagai satu angka.",
        en: "Recurring revenue reads as a single figure.",
      },
    },
  ],
};

export const MANUFAKTUR_BOM: Naskah = {
  id: "manufaktur-bom",
  jalur: "/app/manufaktur",
  judul: { id: "Bahan berkurang, barang jadi bertambah, modalnya terhitung", en: "Materials down, finished goods up, cost computed" },
  ringkas: {
    id: "Perintah kerja memakai daftar bahan yang sudah ditetapkan. Saat selesai, bahan berkurang, barang jadi bertambah, dan harga pokoknya tersusun dari bahan beserta biaya olahnya.",
    en: "A work order draws on a defined bill of materials. On completion, materials fall, finished goods rise, and the cost is assembled from materials plus conversion cost.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "bom",
      judul: { id: "Daftar bahan · Kopi Bubuk 250 g × 400", en: "Bill of materials · Ground coffee 250 g × 400" },
      kolom: [
        { label: { id: "Bahan", en: "Material" } },
        { label: { id: "Dipakai", en: "Consumed" }, num: true },
        { label: { id: "Nilai (Rp)", en: "Value (Rp)" }, num: true },
      ],
      baris: [
        [
          { id: "Kopi Arabika 1 kg", en: "Arabica coffee 1 kg" },
          { id: "100 kg", en: "100 kg" },
          { id: "9.875.000", en: "9,875,000" },
        ],
        [
          { id: "Kemasan 250 g", en: "250 g packaging" },
          { id: "400 pcs", en: "400 pcs" },
          { id: "1.200.000", en: "1,200,000" },
        ],
      ],
    },
    {
      jenis: "jurnal",
      id: "jurnal",
      judul: { id: "Jurnal penyelesaian produksi", en: "Production completion entry" },
      baris: [
        { akun: { id: "Persediaan Barang Jadi", en: "Finished goods" }, debit: 13_075_000 },
        { akun: { id: "Persediaan Bahan Baku", en: "Raw materials" }, kredit: 11_075_000 },
        { akun: { id: "Beban Produksi Dibebankan", en: "Applied production cost" }, kredit: 2_000_000 },
      ],
    },
    {
      jenis: "angka",
      id: "modal",
      judul: { id: "Modal per kemasan", en: "Cost per pack" },
      nilai: 32_688,
      satuan: { id: "rupiah", en: "rupiah" },
      delta: {
        id: "Rp 13.075.000 dibagi 400 kemasan",
        en: "Rp 13,075,000 across 400 packs",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "bom" },
      narasi: {
        id: "Perintah kerja memakai daftar bahan yang sudah ditetapkan.",
        en: "The work order uses a bill of materials already defined.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jurnal" },
      narasi: {
        id: "Bahan berpindah menjadi barang jadi lewat satu jurnal yang seimbang.",
        en: "Materials move into finished goods through a single balanced entry.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "modal" },
      narasi: {
        id: "Modal per kemasan terhitung, jadi harga jualnya bisa ditetapkan dari angka, bukan dari perkiraan.",
        en: "Cost per pack is computed, so the selling price can be set from a figure rather than a guess.",
      },
    },
  ],
};

export const PEMELIHARAAN_JADWAL: Naskah = {
  id: "pemeliharaan-jadwal",
  jalur: "/app/maintenance",
  judul: { id: "Pemeliharaan yang dijadwalkan aset, bukan diingat orang", en: "Maintenance scheduled by the asset, not remembered by a person" },
  ringkas: {
    id: "Tiap aset membawa jadwal pemeliharaannya sendiri. Perintah kerja terbit pada waktunya, biayanya menempel pada asetnya, dan riwayatnya terbaca saat aset itu dinilai atau dijual.",
    en: "Each asset carries its own maintenance schedule. Work orders issue on time, costs attach to the asset, and the history is readable when the asset is valued or sold.",
  },
  panel: [
    {
      jenis: "daftar",
      id: "jadwal",
      judul: { id: "Jatuh tempo pemeliharaan", en: "Maintenance due" },
      butir: [
        {
          teks: { id: "Truk boks Isuzu · servis 20.000 km", en: "Isuzu box truck · 20,000 km service" },
          lencana: { id: "Lewat 6 hari", en: "6 days late" },
          nada: "galat",
        },
        {
          teks: { id: "Mesin roasting · kalibrasi bulanan", en: "Roasting machine · monthly calibration" },
          lencana: { id: "3 hari lagi", en: "In 3 days" },
          nada: "awas",
        },
      ],
    },
    {
      jenis: "formulir",
      id: "perintah",
      judul: { id: "Perintah kerja · WO-0217", en: "Work order · WO-0217" },
      tombol: { id: "Selesaikan", en: "Complete" },
      medan: [
        { id: "aset", label: { id: "Aset", en: "Asset" }, nilai: { id: "Truk boks Isuzu", en: "Isuzu box truck" } },
        {
          id: "biaya",
          label: { id: "Biaya suku cadang dan jasa", en: "Parts and labour" },
          nilai: { id: "Rp 4.250.000", en: "Rp 4,250,000" },
          num: true,
        },
      ],
    },
    {
      jenis: "catatan",
      id: "riwayat",
      nada: "ok",
      teks: {
        id: "Biaya menempel pada asetnya, bukan hanya masuk beban umum. Saat truk itu dijual, riwayat perawatannya bisa ditunjukkan beserta angkanya.",
        en: "The cost attaches to the asset rather than only landing in general expenses. When that truck is sold, its service history can be shown with figures.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "jadwal", baris: 0 },
      narasi: {
        id: "Jadwal yang terlewat ditandai, bukan menunggu ada yang teringat.",
        en: "A missed schedule is flagged rather than waiting for someone to recall it.",
      },
    },
    {
      aksi: "ketik",
      sasaran: { panel: "perintah", medan: "biaya" },
      narasi: {
        id: "Biaya pengerjaannya dicatat pada perintah kerjanya.",
        en: "The cost of the work is recorded on its work order.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "perintah" },
      narasi: { id: "Perintah kerja diselesaikan.", en: "The work order is completed." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "riwayat" },
      narasi: {
        id: "Biayanya menempel pada asetnya dan masuk riwayat perawatannya.",
        en: "The cost attaches to the asset and joins its service history.",
      },
    },
  ],
};

export const HELPDESK_TIKET: Naskah = {
  id: "helpdesk-tiket",
  jalur: "/app/helpdesk",
  judul: { id: "Keluhan pelanggan yang tidak hilang di kotak masuk", en: "Customer issues that do not vanish into an inbox" },
  ringkas: {
    id: "Tiket terhubung ke pelanggan dan fakturnya, sehingga yang menangani melihat riwayat transaksinya tanpa bertanya ke bagian lain.",
    en: "A ticket links to the customer and their invoices, so whoever handles it sees the transaction history without asking another department.",
  },
  panel: [
    {
      jenis: "tabel",
      id: "tiket",
      judul: { id: "Tiket terbuka", en: "Open tickets" },
      kolom: [
        { label: { id: "Pelanggan", en: "Customer" } },
        { label: { id: "Perihal", en: "Subject" } },
        { label: { id: "Umur", en: "Age" } },
      ],
      baris: [
        [
          { id: "PT Berkah Jaya", en: "PT Berkah Jaya" },
          { id: "Kekurangan 4 kg pada kiriman", en: "4 kg short on delivery" },
          { id: "2 hari", en: "2 days" },
        ],
      ],
    },
    {
      jenis: "daftar",
      id: "konteks",
      judul: { id: "Terbuka bersama tiketnya", en: "Opens alongside the ticket" },
      butir: [
        {
          teks: { id: "Faktur INV-1204 · Rp 1.665.000 · lunas", en: "Invoice INV-1204 · Rp 1,665,000 · paid" },
          lencana: { id: "Tertaut", en: "Linked" },
          nada: "netral",
        },
        {
          teks: { id: "Surat jalan beserta gudang pengirimnya", en: "Delivery note with the dispatching warehouse" },
          lencana: { id: "Tertaut", en: "Linked" },
          nada: "netral",
        },
      ],
    },
    {
      jenis: "catatan",
      id: "hasil",
      nada: "ok",
      teks: {
        id: "Penyelesaiannya berupa retur penjualan yang membalik jurnal dan mengembalikan stok, dibuat langsung dari tiketnya, bukan diminta lewat bagian lain.",
        en: "The resolution is a sales return that reverses the journal and restores stock, created straight from the ticket rather than requested through another department.",
      },
    },
  ],
  langkah: [
    {
      aksi: "sorot",
      sasaran: { panel: "tiket" },
      narasi: { id: "Keluhan masuk sebagai tiket.", en: "The complaint arrives as a ticket." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "konteks" },
      narasi: {
        id: "Faktur dan surat jalannya terbuka bersamaan.",
        en: "The invoice and delivery note open alongside it.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "konteks" },
      narasi: { id: "Retur dibuat dari tiketnya.", en: "The return is created from the ticket." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "hasil" },
      narasi: {
        id: "Jurnal terbalik dan stok kembali, tanpa dokumen yang dibuat dua kali.",
        en: "The journal reverses and stock returns, with no document created twice.",
      },
    },
  ],
};

export const ASISTEN_TANYA: Naskah = {
  id: "asisten-tanya",
  jalur: "/app",
  judul: { id: "Pertanyaan yang dijawab dari data Anda sendiri", en: "Questions answered from your own data" },
  ringkas: {
    id: "Asisten membaca data perusahaan Anda dan menjawab dengan angka beserta jalan menuju sumbernya. Bila datanya tidak ada, ia mengatakan begitu alih-alih menyusun jawaban.",
    en: "The assistant reads your company's data and answers with figures plus a route to their source. When the data is not there, it says so rather than composing an answer.",
  },
  panel: [
    {
      jenis: "formulir",
      id: "tanya",
      judul: { id: "Asisten", en: "Assistant" },
      tombol: { id: "Tanyakan", en: "Ask" },
      medan: [
        {
          id: "pertanyaan",
          label: { id: "Pertanyaan", en: "Question" },
          nilai: {
            id: "Pelanggan mana yang tagihannya paling lama lewat jatuh tempo?",
            en: "Which customer has the longest overdue bill?",
          },
        },
      ],
    },
    {
      jenis: "daftar",
      id: "jawab",
      judul: { id: "Jawaban", en: "Answer" },
      butir: [
        {
          teks: { id: "PT Sinar Abadi · Rp 62.400.000 · lewat 62 hari", en: "PT Sinar Abadi · Rp 62,400,000 · 62 days overdue" },
          lencana: { id: "INV-1097", en: "INV-1097" },
          nada: "galat",
        },
        {
          teks: { id: "CV Mitra Karya · Rp 28.100.000 · lewat 41 hari", en: "CV Mitra Karya · Rp 28,100,000 · 41 days overdue" },
          lencana: { id: "INV-1131", en: "INV-1131" },
          nada: "awas",
        },
      ],
    },
    {
      jenis: "catatan",
      id: "batas",
      nada: "netral",
      teks: {
        id: "Tiap angka membawa tautan ke dokumen asalnya, jadi jawabannya bisa Anda periksa sendiri. Asisten dibatasi 100 pertanyaan per hari per perusahaan, dan bisa dimatikan sepenuhnya.",
        en: "Every figure carries a link to its source document, so the answer can be checked. The assistant is capped at 100 questions per day per company, and can be switched off entirely.",
      },
    },
  ],
  langkah: [
    {
      aksi: "ketik",
      sasaran: { panel: "tanya", medan: "pertanyaan" },
      narasi: {
        id: "Pertanyaan diketik dengan bahasa biasa.",
        en: "The question is typed in ordinary language.",
      },
    },
    {
      aksi: "klik",
      sasaran: { panel: "tanya" },
      narasi: { id: "Pertanyaan dikirim.", en: "The question is sent." },
    },
    {
      aksi: "isi",
      sasaran: { panel: "jawab" },
      narasi: {
        id: "Jawabannya berupa angka dari data Anda, bukan penjelasan umum.",
        en: "The answer is figures from your data, not a general explanation.",
      },
    },
    {
      aksi: "isi",
      sasaran: { panel: "batas" },
      narasi: {
        id: "Tiap angka bisa ditelusuri ke dokumen asalnya.",
        en: "Every figure can be traced to its source document.",
      },
    },
  ],
};
