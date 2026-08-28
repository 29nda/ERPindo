import { useLang, type Dual } from "./index";

/**
 * Kamus istilah UI yang dipakai berulang di banyak halaman modul (Fase 16b):
 * label kolom tabel, label form, dan tombol aksi. Dibuat terpusat karena kata
 * yang sama muncul belasan kali di berkas berbeda — menerjemahkannya satu per
 * satu di tiap halaman akan cepat menjadi tidak konsisten.
 *
 * Dipakai lewat `const u = useUi(); u("nama")`.
 *
 * Istilah domain Indonesia yang merupakan nama resmi (PPN, NPWP, SKU, FEFO,
 * PPh 21, BPJS) sengaja TIDAK diterjemahkan — sama seperti keputusan i18n
 * landing (Fase 14f) dan judul halaman (Fase 16a).
 */
/**
 * Kamus istilah UI.
 *
 * Fase 19k: anotasi `Record<string, Dual>` DIHAPUS. Anotasi itu membuat
 * `keyof typeof UI` melebar menjadi `string`, sehingga `UiKey` sama sekali
 * tidak membatasi apa pun: `u("kunciYangTidakAda")` lolos kompilasi, dan
 * seluruh penjaga `satisfies Record<…, UiKey>` yang ditambahkan sejak Fase 16u
 * sebenarnya hampa. Akibatnya kunci yang salah tulis atau belum ditambahkan
 * baru ketahuan saat dijalankan — `useUi` mengembalikan `String(key)`, jadi
 * pemakai melihat nama kuncinya sendiri terpampang di layar.
 *
 * `satisfies Record<string, Dual>` memberi pemeriksaan bentuk yang sama tanpa
 * melebarkan tipe kuncinya.
 *
 * Diekspor HANYA untuk uji kelengkapan (`test/i18n.test.ts`). Di kode aplikasi
 * pakailah `useUi()` — mengambil `UI` langsung melewatkan reaktivitas bahasa.
 */
export const UI = {
  // Kolom & label umum
  nama: { id: "Nama", en: "Name" },
  kode: { id: "Kode", en: "Code" },
  tanggal: { id: "Tanggal", en: "Date" },
  status: { id: "Status", en: "Status" },
  jenis: { id: "Jenis", en: "Type" },
  jumlah: { id: "Jumlah", en: "Amount" },
  total: { id: "Total", en: "Total" },
  subtotal: { id: "Subtotal", en: "Subtotal" },
  keterangan: { id: "Keterangan", en: "Notes" },
  alamat: { id: "Alamat", en: "Address" },
  telepon: { id: "Telepon", en: "Phone" },
  email: { id: "Email", en: "Email" },
  satuan: { id: "Satuan", en: "Unit" },
  // Temuan pemeriksaan mata Fase 21c: tertinggal Indonesia di mode Inggris pada
  // dua halaman. Bukan atribut & bukan teks anak elemen biasa — isi <option>.
  tanpaProyek: { id: "— tanpa proyek —", en: "— no project —" },
  dari: { id: "Dari", en: "From" },
  sampai: { id: "Sampai", en: "To" },
  opsional: { id: "opsional", en: "optional" },

  // Aksi
  simpan: { id: "Simpan", en: "Save" },
  batal: { id: "Batal", en: "Cancel" },
  hapus: { id: "Hapus", en: "Delete" },
  ubah: { id: "Ubah", en: "Edit" },
  tambah: { id: "Tambah", en: "Add" },
  cari: { id: "Cari", en: "Search" },
  arsipkan: { id: "Arsipkan", en: "Archive" },
  cetak: { id: "Cetak", en: "Print" },
  eksporCsv: { id: "Ekspor CSV", en: "Export CSV" },
  unduhTemplate: { id: "Unduh template", en: "Download template" },
  muatLebihBanyak: { id: "Muat lebih banyak", en: "Load more" },
  setujui: { id: "Setujui", en: "Approve" },
  tolak: { id: "Tolak", en: "Reject" },
  // Fase 33b — "Batalkan Dokumen", bukan "Batalkan".
  //
  // Sebelumnya kunci ini dan `batalkanPesanan` sama-sama berbunyi "Batalkan" di
  // sisi Indonesia, sementara sisi Inggris membedakannya (Void vs Cancel
  // order). Tombol "Batal" (tutup dialog, tidak ada yang berubah) berdiri
  // bersebelahan dengan tombol yang membuat jurnal pembalik PERMANEN dan
  // tercatat di audit log.
  //
  // Ini kelas kesalahan yang menghasilkan data rusak, bukan sekadar
  // kebingungan — karena itu diperbaiki lebih dulu dari seluruh naskah lain.
  batalkan: { id: "Batalkan dokumen", en: "Void" },

  // Master data
  produk: { id: "Produk", en: "Product" },
  gudang: { id: "Gudang", en: "Warehouse" },
  pelanggan: { id: "Pelanggan", en: "Customer" },
  pemasok: { id: "Pemasok", en: "Supplier" },
  keduanya: { id: "Keduanya", en: "Both" },
  hargaJual: { id: "Harga Jual", en: "Selling price" },
  hargaBeli: { id: "Harga Beli", en: "Buying price" },
  hargaJualRp: { id: "Harga jual (Rp)", en: "Selling price (Rp)" },
  hargaBeliRp: { id: "Harga beli (Rp)", en: "Buying price (Rp)" },
  stokMinimum: { id: "Stok minimum", en: "Minimum stock" },
  satuanBesar: { id: "Satuan besar (opsional)", en: "Bulk unit (optional)" },
  barcodeLabel: { id: "Barcode / kode batang", en: "Barcode" },
  seri: { id: "Seri", en: "Serial" },

  // Pencarian & konfirmasi
  cariProduk: { id: "Cari SKU / nama produk…", en: "Search SKU / product name…" },
  cariGudang: { id: "Cari kode / nama gudang…", en: "Search warehouse code / name…" },
  cariKontak: { id: "Cari nama / email / telepon…", en: "Search name / email / phone…" },
  arsipkanProduk: { id: "Arsipkan produk ini?", en: "Archive this product?" },
  arsipkanKontak: { id: "Arsipkan kontak ini?", en: "Archive this contact?" },
  arsipkanGudang: { id: "Arsipkan gudang ini?", en: "Archive this warehouse?" },
  label: { id: "Label", en: "Label" },
  jenisUsaha: { id: "Jenis usaha", en: "Business type" },
  mulaiCepat: { id: "Mulai cepat: contoh data usaha", en: "Quick start: sample business data" },
  isiNomorSeri: { id: "Masukkan nomor seri unit", en: "Enter the unit serial number" },
  nolTanpaPeringatan: { id: "0 = tanpa peringatan", en: "0 = no alert" },
  opsionalPindaiKasir: {
    id: "opsional — untuk pindai di kasir",
    en: "optional — for scanning at the till",
  },
  // Transaksi (Penjualan/Pembelian) — Fase 16c
  hargaSatuan: { id: "Harga satuan", en: "Unit price" },
  disc: { id: "Disc %", en: "Disc %" },
  mataUang: { id: "Mata uang", en: "Currency" },
  proyekOpsional: { id: "Proyek (opsional)", en: "Project (optional)" },
  noLotOpsional: { id: "No. lot (opsional)", en: "Lot no. (optional)" },
  tanpaPpn: { id: "Tanpa PPN", en: "No VAT" },
  pembayaran: { id: "Pembayaran", en: "Payments" },
  pembayaranDokumen: { id: "Pembayaran dokumen ini", en: "Payments for this document" },
  belumAdaPembayaran: { id: "Belum ada pembayaran tercatat. Terima pembayaran untuk mengurangi sisa tagihannya.", en: "No payments recorded yet. Receive a payment to reduce the outstanding balance." },
  sudahDibayar: { id: "Sudah dibayar", en: "Paid" },
  sudahDiretur: { id: "Sudah diretur", en: "Returned" },
  retur: { id: "Retur", en: "Return" },
  returIsiQty: {
    id: "Retur barang — isi qty yang dikembalikan:",
    en: "Return goods — enter the quantity returned:",
  },
  dibatalkan: { id: "DIBATALKAN", en: "VOIDED" },
  dihapus: { id: "DIHAPUS", en: "DELETED" },
  hapusPembayaranIni: { id: "Hapus pembayaran ini?", en: "Delete this payment?" },
  yaHapusPembayaran: { id: "Ya, hapus pembayaran", en: "Yes, delete payment" },
  yaBatalkanDokumen: { id: "Ya, batalkan dokumen", en: "Yes, void document" },
  batalkanMuatForm: { id: "Batalkan & muat ke form", en: "Void & load into form" },
  masukKeluarAkun: { id: "Masuk/keluar dari akun", en: "In/out of account" },
  cariDokumen: { id: "Cari no. dokumen / nama kontak…", en: "Search document no. / contact name…" },
  cariProdukSkuNama: { id: "Cari produk (SKU/nama)…", en: "Search product (SKU/name)…" },
  // Stok — Fase 16d
  stok: { id: "Stok", en: "Stock" },
  saldo: { id: "Saldo", en: "Balance" },
  nilai: { id: "Nilai", en: "Value" },
  waktu: { id: "Waktu", en: "Time" },
  catatan: { id: "Catatan", en: "Note" },
  minimum: { id: "Minimum", en: "Minimum" },
  kedaluwarsa: { id: "Kedaluwarsa", en: "Expiry" },
  masukKeluar: { id: "Masuk/Keluar", en: "In/Out" },
  biayaSatuan: { id: "Biaya Satuan", en: "Unit cost" },
  biayaRataRata: { id: "Biaya Rata-rata", en: "Average cost" },
  qtyFisik: { id: "Qty fisik", en: "Physical qty" },
  dariGudang: { id: "Dari gudang", en: "From warehouse" },
  keGudang: { id: "Ke gudang", en: "To warehouse" },
  kartu: { id: "Kartu", en: "Card" },
  usulanBeli: { id: "Usulan beli", en: "Suggest order" },
  hanyaStokMenipis: { id: "Hanya tampilkan stok menipis (qty ≤", en: "Show low stock only (qty ≤" },
  ambangStokMenipis: { id: "Ambang stok menipis", en: "Low-stock threshold" },
  belumAdaStok: { id: "Belum ada stok", en: "No stock yet" },
  levelStokPerGudang: { id: "Level stok per gudang", en: "Stock levels per warehouse" },
  lotKedaluwarsa: { id: "Lot & kedaluwarsa", en: "Lot & expiry" },
  penyesuaianStok: { id: "Penyesuaian stok (opname)", en: "Stock adjustment (stock take)" },
  riwayatMutasi: {
    id: "Riwayat mutasi dengan saldo berjalan.",
    en: "Movement history with a running balance.",
  },
  transferAntarGudang: { id: "Transfer antar gudang", en: "Inter-warehouse transfer" },
  usulanPembelianOtomatis: {
    id: "Usulan pembelian otomatis",
    en: "Automatic purchase suggestions",
  },
  // === Halaman Pengaturan (Fase 20m) ======================================
  // Enam berkas di `pages/settings/` tak pernah masuk program dwibahasa Fase 19
  // karena glob gerbangnya tidak turun ke subfolder. Ini penutupannya.
  descPengaturan: {
    id: "Langganan, profil & keamanan akun, identitas perusahaan, tim, dan kendali pembukuan.",
    en: "Subscription, account profile & security, company identity, team, and bookkeeping controls.",
  },
  tabAkunTampilan: { id: "Akun & Tampilan", en: "Account & Display" },
  tabPerusahaan: { id: "Perusahaan", en: "Company" },
  tabTimPeran: { id: "Tim & Peran", en: "Team & Roles" },
  tabDataKeamanan: { id: "Data & Keamanan", en: "Data & Security" },
  tabLainnya: { id: "Lainnya", en: "Other" },
  hanyaAdminTim: {
    id: "Hanya admin/pemilik yang dapat mengelola tim & peran.",
    en: "Only admins/owners can manage the team & roles.",
  },
  hanyaPemilikCadangan: {
    id: "Hanya pemilik yang dapat mengelola cadangan & audit.",
    en: "Only the owner can manage backups & audit.",
  },
  tanpaPengaturanLain: {
    id: "Belum ada pengaturan lain untuk peran Anda.",
    en: "No other settings for your role yet.",
  },
  // Akun & tampilan
  tampilanJudul: { id: "Tampilan", en: "Display" },
  descTampilan: {
    id: "Sesuaikan menu dengan tingkat kenyamanan Anda terhadap istilah akuntansi.",
    en: "Match the menu to how comfortable you are with accounting terms.",
  },
  sembunyikanMenuAkuntansi: {
    id: "Sembunyikan menu akuntansi teknis (Jurnal Umum, Buku Besar, Neraca Saldo, Bagan Akun). Catat transaksi tetap bisa lewat menu Catat Transaksi.",
    en: "Hide technical accounting menus (General Journal, Ledger, Trial Balance, Chart of Accounts). You can still record entries via Record Transaction.",
  },
  profilSaya: { id: "Profil saya", en: "My profile" },
  simpanNama: { id: "Simpan nama", en: "Save name" },
  passwordSaatIni: { id: "Password saat ini", en: "Current password" },
  passwordBaru: { id: "Password baru", en: "New password" },
  minimal8Karakter: { id: "Minimal 8 karakter", en: "At least 8 characters" },
  gantiPassword: { id: "Ganti password", en: "Change password" },
  keamanan2fa: {
    id: "Keamanan — verifikasi dua langkah (2FA)",
    en: "Security — two-step verification (2FA)",
  },
  desc2fa: {
    id: "Lapisan perlindungan ekstra: selain password, login membutuhkan kode 6 digit dari aplikasi authenticator.",
    en: "An extra layer of protection: besides your password, signing in needs a 6-digit code from an authenticator app.",
  },
  duaFaAktif: { id: "2FA aktif ✓", en: "2FA active ✓" },
  duaFaBelumAktif: { id: "2FA belum aktif.", en: "2FA is not active yet." },
  kodeUntukMenonaktifkan: {
    id: "Kode authenticator untuk menonaktifkan",
    en: "Authenticator code to disable",
  },
  konfirmNonaktif2fa: {
    id: "Nonaktifkan verifikasi dua langkah?",
    en: "Disable two-step verification?",
  },
  descNonaktif2fa: {
    id: "Akun Anda kembali hanya dilindungi password. Anda bisa mengaktifkan 2FA lagi kapan saja.",
    en: "Your account will be protected by a password alone again. You can re-enable 2FA any time.",
  },
  yaNonaktifkan: { id: "Ya, nonaktifkan", en: "Yes, disable" },
  langkah2faSatu: {
    id: "1. Buka aplikasi authenticator → tambah akun →",
    en: "1. Open your authenticator app → add account →",
  },
  masukkanKunciManual: { id: "masukkan kunci manual", en: "enter the manual key" },
  atauBukaTautan: {
    id: "berikut (atau buka tautan di perangkat yang sama):",
    en: "below (or open the link on the same device):",
  },
  bukaDiAuthenticator: {
    id: "Buka langsung di aplikasi authenticator",
    en: "Open directly in the authenticator app",
  },
  langkah2faDua: {
    id: "2. Masukkan kode 6 digit yang muncul",
    en: "2. Enter the 6-digit code shown",
  },
  enamDigit: { id: "6 digit", en: "6 digits" },
  modeSederhana: { id: "Mode Sederhana", en: "Simple mode" },
  nonaktifkan2fa: { id: "Nonaktifkan 2FA", en: "Disable 2FA" },
  aktifkan2fa: { id: "Aktifkan 2FA", en: "Enable 2FA" },
  konfirmasiAktifkan: { id: "Konfirmasi & aktifkan", en: "Confirm & enable" },
  // Tim & peran (Fase 20m)
  persetujuanPembelian: { id: "Persetujuan pembelian", en: "Purchase approval" },
  descPersetujuanPembelian: {
    id: "Pembelian oleh Admin dengan nilai ≥ ambang ini harus Anda setujui dulu sebelum diproses. Isi 0 untuk mematikan.",
    en: "Purchases by an Admin at or above this threshold need your approval before processing. Enter 0 to turn it off.",
  },
  saatIni: { id: "Saat ini:", en: "Currently:" },
  peranKustom: { id: "Peran kustom", en: "Custom roles" },
  descPeranKustom: {
    id: "Buat peran dengan akses modul terbatas — mis. Kasir (hanya POS & Penjualan). Peran dasar menentukan hak baca/tulisnya.",
    en: "Create roles with limited module access — e.g. Cashier (POS & Sales only). The base role decides read/write rights.",
  },
  belumAdaPeranKustom: {
    id: "Belum ada peran kustom. Buat di bawah.",
    en: "No custom roles yet. Create one below.",
  },
  buatPeranKustom: { id: "Buat peran kustom", en: "Create custom role" },
  ubahPeran: { id: "Ubah peran —", en: "Edit role —" },
  namaPeran: { id: "Nama peran", en: "Role name" },
  contohKasirToko: { id: "mis. Kasir Toko", en: "e.g. Shop Cashier" },
  adminBolehMenulis: { id: "Admin (boleh menulis)", en: "Admin (can write)" },
  modulBolehDiakses: { id: "Modul yang boleh diakses", en: "Modules this role may access" },
  batasiCostCenter: {
    id: "Batasi data ke cost center (opsional)",
    en: "Limit data to cost centres (optional)",
  },
  descBatasiCostCenter: {
    id: "Bila dipilih, peran ini hanya melihat & membukukan ke cost center tersebut (daftar dimensi, laporan, dan jurnal ikut dibatasi).",
    en: "When selected, this role only sees and posts to those cost centres (dimension lists, reports, and journals are limited too).",
  },
  buatPeran: { id: "Buat peran", en: "Create role" },
  konfirmHapusPeran: { id: "Hapus peran kustom?", en: "Delete this custom role?" },
  descHapusPeran: {
    id: "akan dihapus. Pastikan tidak ada anggota yang memakainya.",
    en: "will be deleted. Make sure no member is still using it.",
  },
  anggotaTim: { id: "Anggota tim", en: "Team members" },
  descAnggotaTim: {
    id: "Undang rekan kerja, atur peran, atau keluarkan anggota. Pemilik dapat mengubah peran.",
    en: "Invite colleagues, set roles, or remove members. The owner can change roles.",
  },
  konfirmKeluarkanAnggota: { id: "Keluarkan anggota?", en: "Remove this member?" },
  descKeluarkanAnggota: {
    id: "akan kehilangan akses ke perusahaan ini. Tindakan ini bisa diulang dengan mengundang kembali.",
    en: "will lose access to this company. You can undo this by inviting them again.",
  },
  keluarkan: { id: "Keluarkan", en: "Remove" },
  emailRekan: { id: "rekan@perusahaan.co.id", en: "colleague@company.com" },
  tautanUndangan: {
    id: "Tautan undangan (bagikan bila email belum terkirim):",
    en: "Invitation link (share it if the email has not arrived):",
  },
  contohLimaJuta: { id: "mis. 5.000.000", en: "e.g. 5,000,000" },
  ambangRp: { id: "Ambang (Rp)", en: "Threshold (Rp)" },
  peranKolom: { id: "Peran", en: "Role" },
  // Rasio keuangan (Fase 21b)
  rasioKeuangan: { id: "Rasio keuangan", en: "Financial ratios" },
  rasioLancar: { id: "Rasio lancar", en: "Current ratio" },
  perputaranPersediaan: { id: "Perputaran persediaan", en: "Inventory turnover" },
  descRasioLancar: {
    id: "Aset lancar dibagi kewajiban. Di atas 1 berarti kewajiban jangka pendek tertutup.",
    en: "Current assets divided by liabilities. Above 1 means short-term obligations are covered.",
  },
  descPerputaran: {
    id: "HPP tahun berjalan dibagi persediaan akhir, bukan rata-rata, karena neraca hanya satu titik waktu.",
    en: "Year-to-date COGS divided by ending inventory — not an average, because the balance sheet is a single point in time.",
  },
  kaliSetahun: { id: "kali", en: "×" },
  rasioTakBisaDihitung: { id: "belum bisa dihitung", en: "not computable yet" },
  // Data & keamanan (Fase 20m)
  eksporCadangan: { id: "Ekspor & cadangan", en: "Export & backup" },
  descEksporCadangan: {
    id: "Data Anda milik Anda — unduh kapan pun, termasuk setelah langganan berakhir.",
    en: "Your data is yours — download it any time, including after your subscription ends.",
  },
  unduhSemuaZip: { id: "Unduh semua data (ZIP)", en: "Download all data (ZIP)" },
  descUnduhSemua: {
    id: "Seluruh tabel diekspor sebagai CSV standar + manifest — siap dibuka di Excel atau dipindahkan ke aplikasi lain.",
    en: "Every table is exported as standard CSV plus a manifest — ready for Excel or migration to another app.",
  },
  unduhSemuaData: { id: "Unduh semua data", en: "Download all data" },
  backupDrive: { id: "Backup otomatis ke Google Drive", en: "Automatic backup to Google Drive" },
  descDriveBelumSiap: {
    id: "Integrasi Google Drive belum dikonfigurasi oleh operator (butuh OAuth Client ID/Secret Google Cloud). Fitur unduh di atas tetap berfungsi penuh.",
    en: "The Google Drive integration is not configured by the operator yet (it needs a Google Cloud OAuth client ID/secret). The download above still works fully.",
  },
  descSambungkanDrive: {
    id: "Sambungkan akun Google Anda — cadangan bulanan otomatis tersimpan di Drive Anda sendiri.",
    en: "Connect your Google account — monthly backups are stored in your own Drive.",
  },
  sambungkanDrive: { id: "Sambungkan Google Drive", en: "Connect Google Drive" },
  tersambung: { id: "Tersambung", en: "Connected" },
  sebagaiAkun: { id: "sebagai", en: "as" },
  cadanganTerakhir: { id: "Cadangan terakhir:", en: "Last backup:" },
  belumAdaCadangan: {
    id: "Belum ada cadangan — Cron mencadangkan otomatis tiap awal bulan.",
    en: "No backup yet — the scheduler backs up automatically at the start of each month.",
  },
  mencadangkanEllipsis: { id: "Mencadangkan…", en: "Backing up…" },
  cadangkanSekarang: { id: "Cadangkan sekarang", en: "Back up now" },
  putuskanSambungan: { id: "Putuskan sambungan", en: "Disconnect" },
  // 403 pada kartu pengaturan (Fase 38u). Satu pasang kunci dipakai kartu
  // Keamanan lanjutan dan kartu API & integrasi sekaligus: sebabnya sama, dan
  // dua naskah berbeda untuk sebab yang sama hanya akan menyimpang seiring
  // waktu. Kalimatnya UTUH, bukan potongan yang dirakit di tempat pemakaian —
  // pelajaran dari `descApiUpsell` + `tingkatkanEnterprise` yang digantinya.
  aksesPengaturanDitolak: {
    id: "Pengaturan ini tidak bisa dibuka dari sini",
    en: "These settings cannot be opened from here",
  },
  descAksesPengaturanDitolak: {
    id: "Hanya Pemilik perusahaan yang boleh membukanya. Bila pembatasan IP sedang aktif, alamat IP Anda saat ini juga harus termasuk yang diizinkan.",
    en: "Only the company Owner may open them. If IP restriction is active, your current IP address must also be on the allowed list.",
  },
  keamananLanjutan: { id: "Keamanan lanjutan", en: "Advanced security" },
  descKeamananLanjutan: {
    id: "Wajibkan 2FA, batasi akses per IP, dan ekspor audit log — kontrol keamanan tingkat perusahaan.",
    en: "Require 2FA, limit access per IP, and export the audit log — enterprise-grade security controls.",
  },
  wajibkan2fa: { id: "Wajibkan verifikasi 2 langkah (2FA)", en: "Require two-step verification (2FA)" },
  descWajibkan2fa: {
    id: "Anggota tanpa 2FA aktif diminta menyiapkannya di Profil sebelum bisa mengakses perusahaan ini.",
    en: "Members without 2FA are asked to set it up in their Profile before they can access this company.",
  },
  pembatasanIp: {
    id: "Pembatasan IP (CIDR/IP, satu per baris)",
    en: "IP restriction (CIDR/IP, one per line)",
  },
  descPembatasanIp: {
    id: "Kosongkan untuk mengizinkan semua IP. Hati-hati: hanya IP dalam daftar yang bisa mengakses.",
    en: "Leave empty to allow every IP. Careful: only listed IPs will be able to get in.",
  },
  ipAndaSaatIni: { id: "IP Anda saat ini:", en: "Your current IP:" },
  simpanKebijakan: { id: "Simpan kebijakan", en: "Save policy" },
  riwayatAktivitas: { id: "Riwayat aktivitas (audit log)", en: "Activity history (audit log)" },
  descRiwayatAktivitas: {
    id: "Aktivitas di perusahaan ini — siapa melakukan apa dan kapan.",
    en: "Activity in this company — who did what, and when.",
  },
  // Perusahaan & langganan (Fase 20m)
  penomoranDokumen: { id: "Penomoran dokumen", en: "Document numbering" },
  descPenomoranDokumen: {
    id: "Sesuaikan format nomor faktur, pembelian, dan pembayaran. Kosongkan untuk format bawaan.",
    en: "Customise invoice, purchase, and payment number formats. Leave blank for the default.",
  },
  tokenTahun: { id: "tahun", en: "year" },
  tokenBulan: { id: "bulan", en: "month" },
  tokenNomorUrut: { id: "nomor urut (4 digit). Bila memuat", en: "sequence (4 digits). When it contains" },
  tokenResetPeriode: {
    id: ", urutan otomatis reset tiap periode.",
    en: ", the sequence resets automatically each period.",
  },
  simpanFormat: { id: "Simpan format", en: "Save format" },
  polaHarusSeq: { id: "Pola harus memuat token", en: "The pattern must contain the token" },
  pratinjauLabel: { id: "Pratinjau:", en: "Preview:" },
  formatBawaan: { id: "(format bawaan)", en: "(default format)" },
  bawaanContoh: { id: "Bawaan · contoh:", en: "Default · example:" },
  langgananJudul: { id: "Langganan", en: "Subscription" },
  descLangganan: {
    id: "Paket, status, dan pembayaran akun perusahaan Anda.",
    en: "Your company account's plan, status, and payments.",
  },
  paketLabel: { id: "Paket:", en: "Plan:" },
  bacaSajaBerakhir: { id: "baca-saja — langganan berakhir", en: "read-only — subscription ended" },
  sampaiDengan: { id: "s/d", en: "through" },
  aksesPenuhPelangganAwal: { id: "akses penuh (pelanggan awal)", en: "full access (early customer)" },
  modeUjiPembayaran: { id: "mode uji pembayaran", en: "payment test mode" },
  descPelangganAwal1: {
    id: "Sebagai pelanggan awal, akun Anda mendapat",
    en: "As an early customer, your account gets",
  },
  aksesSemuaModul: { id: "akses semua modul", en: "access to all modules" },
  descPelangganAwal2: {
    id: "tanpa perubahan harga. Terima kasih sudah bergabung sejak awal. 🙏",
    en: "with no price change. Thank you for joining us early. 🙏",
  },
  penggunaTakTerbatas: { id: "Pengguna tak terbatas", en: "Unlimited users" },
  // Fase 30 — paket tunggal.
  seluruhModulTerbuka: { id: "Seluruh modul terbuka", en: "Every module unlocked" },
  perpanjangLangganan: { id: "Perpanjang langganan", en: "Renew subscription" },
  perBulanSingkat: { id: "bln", en: "mo" },
  // Fase 30f — metrik bisnis dashboard admin.
  adMetrikBisnis: { id: "Metrik bisnis", en: "Business metrics" },
  adDescMetrikBisnis: {
    id: "Pendapatan berulang & pergerakan pelanggan, dihitung dari control-plane.",
    en: "Recurring revenue & customer movement, computed from the control plane.",
  },
  adMrr: { id: "Pendapatan berulang (MRR)", en: "Recurring revenue (MRR)" },
  adPelangganMembayar: { id: "Pelanggan membayar", en: "Paying customers" },
  adAman: { id: "aman", en: "current" },
  adTenggang: { id: "tenggang", en: "in grace" },
  adComped: { id: "gratis", en: "comped" },
  adChurn30: { id: "Berhenti (30 hari)", en: "Churned (30 days)" },
  adDariPelanggan: { id: "dari pelanggan", en: "of customers" },
  adUmurLangganan: { id: "Umur langganan", en: "Subscription age" },
  adHariRataRata: { id: "hari rata-rata", en: "days on average" },
  adKuota: { id: "Kuota Cloudflare (24 jam)", en: "Cloudflare quota (24 hours)" },
  adDescKuota: {
    id: "Pemakaian terhadap batas paket gratis. Peringatan muncul di 70% — sebelum pelanggan melihat Error 1027.",
    en: "Usage against the free-plan limits. A warning appears at 70% — before customers see Error 1027.",
  },
  adKuotaWaspada: {
    id: "Ada kuota yang melewati 70%. Siapkan peningkatan ke Workers Paid sebelum batasnya tercapai.",
    en: "A quota has passed 70%. Prepare the upgrade to Workers Paid before the limit is reached.",
  },
  aiPerHari: { id: "AI", en: "AI" },
  mengalihkanEllipsis: { id: "Mengalihkan…", en: "Redirecting…" },
  pilihPaket: { id: "Pilih paket", en: "Choose plan" },
  paketAnda: { id: "Paket Anda", en: "Your plan" },
  descBillingBelumSiap: {
    id: "Pembayaran langganan online sedang disiapkan — untuk saat ini hubungi kami untuk aktivasi paket.",
    en: "Online subscription payment is being set up — for now, contact us to activate a plan.",
  },
  hubungiPemilikLangganan: {
    id: "Hubungi Pemilik perusahaan untuk mengatur pembayaran langganan.",
    en: "Contact the company Owner to manage subscription payments.",
  },
  descPembayaranAman: {
    id: "Pembayaran aman via Xendit (QRIS, transfer bank, kartu, e-wallet). Akun aktif otomatis setelah pembayaran terkonfirmasi. Tim & grup perusahaan dapat menghubungi kami untuk penawaran khusus.",
    en: "Secure payment via Xendit (QRIS, bank transfer, card, e-wallet). Your account activates automatically once payment is confirmed. Teams & company groups can contact us for a custom quote.",
  },
  riwayatTagihan: { id: "Riwayat tagihan", en: "Billing history" },
  statusMenungguBayar: { id: "Menunggu bayar", en: "Awaiting payment" },
  statusLunas: { id: "Lunas", en: "Paid" },
  statusGagal: { id: "Gagal", en: "Failed" },
  statusKedaluwarsa: { id: "Kedaluwarsa", en: "Expired" },
  profilPerusahaan: { id: "Profil perusahaan", en: "Company profile" },
  descProfilPerusahaanDb: {
    id: "Data ini tersimpan di database khusus perusahaan Anda.",
    en: "This data is stored in your company's own database.",
  },
  unggahLogo: { id: "Unggah logo", en: "Upload logo" },
  namaTampilan: { id: "Nama tampilan", en: "Display name" },
  hanyaOwnerAdminUbah: {
    id: "Hanya Owner/Admin yang dapat mengubah pengaturan.",
    en: "Only an Owner/Admin can change these settings.",
  },
  logoKop: { id: "Logo kop faktur & struk", en: "Invoice & receipt header logo" },
  belumAdaLogo: { id: "Belum ada logo. Unggah logo agar ikut tercetak di faktur, struk, dan slip gaji.", en: "No logo yet. Upload one so it appears on invoices, receipts, and payslips." },
  gantiLogo: { id: "Ganti logo", en: "Replace logo" },
  descLogo: {
    id: "Berkas PNG, JPEG, WebP, atau SVG. Ukurannya dikecilkan otomatis, lalu tampil di kop faktur cetak dan struk kasir.",
    en: "PNG/JPEG/WebP/SVG — resized automatically; shown on printed invoice headers & POS receipts.",
  },
  perusahaanLain: { id: "Perusahaan lain", en: "Other companies" },
  descPerusahaanLain: {
    id: "Kelola beberapa badan usaha dari satu akun. Setiap perusahaan punya pembukuan terpisah — laporan gabungannya tersedia di menu Konsolidasi.",
    en: "Manage several legal entities from one account. Each company keeps separate books — the combined report lives under Consolidation.",
  },
  namaPerusahaanBaru: { id: "Nama perusahaan baru", en: "New company name" },
  contohCabangKedua: { id: "mis. PT Cabang Kedua", en: "e.g. Second Branch Ltd" },
  tambahPerusahaan: { id: "Tambah perusahaan", en: "Add company" },
  // API & integrasi (Fase 20m)
  apiIntegrasi: { id: "API & Integrasi", en: "API & Integrations" },
  descApiIntegrasi: {
    id: "Hubungkan toko online / sistem lain lewat API publik & webhook.",
    en: "Connect your online store / other systems through the public API & webhooks.",
  },
  panduanLengkapDi: { id: "Panduan lengkap ada di", en: "Full guide at" },
  namaKunci: { id: "Nama kunci", en: "Key name" },
  contohIntegrasiToko: { id: "mis. Integrasi toko online", en: "e.g. Online store integration" },
  skop: { id: "Skop", en: "Scope" },
  bacaSaja: { id: "Baca saja", en: "Read only" },
  bacaTulis: { id: "Baca & tulis", en: "Read & write" },
  membuatEllipsis: { id: "Membuat…", en: "Creating…" },
  buatKunci: { id: "Buat kunci", en: "Create key" },
  salinKunciSekarang: {
    id: "Salin kunci ini sekarang — hanya ditampilkan sekali:",
    en: "Copy this key now — it is shown only once:",
  },
  sudahSayaSalin: { id: "Sudah saya salin", en: "I have copied it" },
  belumAdaApiKey: { id: "Belum ada API key aktif. Buat key bila ingin menghubungkan sistem lain ke data Anda.", en: "No active API keys. Create one if you want to connect another system to your data." },
  bacaTulisKecil: { id: "baca & tulis", en: "read & write" },
  bacaKecil: { id: "baca", en: "read" },
  dipakaiPada: { id: "dipakai", en: "used" },
  belumDipakai: { id: "belum dipakai", en: "not used yet" },
  cabut: { id: "Cabut", en: "Revoke" },
  urlPenerima: { id: "URL penerima", en: "Receiver URL" },
  tambahWebhook: { id: "Tambah webhook", en: "Add webhook" },
  secretHmac: {
    id: "Secret HMAC (untuk verifikasi tanda tangan) — simpan sekarang:",
    en: "HMAC secret (for signature verification) — save it now:",
  },
  belumAdaWebhook: { id: "Belum ada webhook. Tambahkan webhook agar sistem lain diberi tahu saat ada transaksi baru.", en: "No webhooks yet. Add one so other systems are notified when a transaction is created." },
  terakhirKecil: { id: "terakhir:", en: "last:" },
  // Tutup buku
  tutupBuku: { id: "Tutup buku", en: "Close books" },
  tutupBukuAksi: { id: "Tutup buku", en: "Close books" },
  konfirmTutupBuku: { id: "Tutup buku sampai", en: "Close books through" },
  urlWebhookContoh: { id: "https://sistem-anda.co.id/webhook", en: "https://your-system.com/webhook" },
  descTutupBuku: {
    id: "Semua transaksi bertanggal pada atau sebelum tanggal ini akan dikunci — tidak bisa ditambah, diubah, maupun dibalik.",
    en: "All transactions dated on or before this date will be locked — they cannot be added to, changed, or reversed.",
  },
  pembukuanTerkunciSampai: { id: "Pembukuan saat ini terkunci sampai", en: "Books are currently locked through" },
  belumAdaPeriodeDitutup: { id: "Belum ada periode yang ditutup. Tutup buku mengunci angka periode agar laporannya tidak berubah lagi.", en: "No periods closed yet. Closing the books locks a period so its reports stop changing." },
  kunciSampaiTanggal: { id: "Kunci sampai tanggal", en: "Lock through date" },
  descKunciPermanen: {
    id: "Semua transaksi bertanggal pada atau sebelum tanggal ini akan terkunci permanen — jurnal, faktur, dan pembayaran tak bisa lagi diubah.",
    en: "All transactions dated on or before this date become permanently locked — journals, invoices, and payments can no longer be changed.",
  },
  yaKunciPembukuan: { id: "Ya, kunci pembukuan", en: "Yes, lock the books" },
  descJurnalPenutup: {
    id: "Jurnal penutup tahunan: pindahkan laba/rugi berjalan sampai tanggal di atas ke akun Laba Ditahan.",
    en: "Annual closing entry: move the running profit/loss up to the date above into Retained Earnings.",
  },
  postingJurnalPenutup: { id: "Posting jurnal penutup", en: "Post closing entry" },
  konfirmJurnalPenutup: { id: "Posting jurnal penutup per", en: "Post closing entry as of" },
  descKonfirmJurnalPenutup: {
    id: "Semua saldo pendapatan dan beban sampai tanggal itu dinolkan, lalu laba rugi bersihnya dipindahkan ke Laba Ditahan.",
    en: "All revenue and expense balances up to that date are zeroed; the net profit/loss moves to Retained Earnings.",
  },
  yaPostingJurnalPenutup: { id: "Ya, posting jurnal penutup", en: "Yes, post the closing entry" },
  // Peristiwa webhook — peta label di packages/shared tetap Indonesia (dipakai
  // apps/api); sisi web memetakan kode→kunci kamus, pola Fase 16t. Ketahuan
  // dari pemeriksaan mata Fase 21d: ketiganya masih Indonesia di mode Inggris.
  "webhook.invoice.created": { id: "Faktur penjualan dibuat", en: "Sales invoice created" },
  "webhook.payment.received": { id: "Pembayaran diterima", en: "Payment received" },
  "webhook.stock.low": { id: "Stok menipis (di bawah minimum)", en: "Stock running low (below minimum)" },
  // Fase 21d — sakelar jurnal penutup otomatis (khusus Pemilik).
  penutupOtomatis: { id: "Tutup buku tahunan otomatis", en: "Close the year automatically" },
  descPenutupOtomatis: {
    id: "Tiap awal Januari, sistem memposting sendiri jurnal penutup untuk tahun buku sebelumnya (per 31 Desember). Bila periodenya sudah Anda kunci lebih dulu, penutupan dilewati dan alasannya dicatat di log audit.",
    en: "Each early January the system posts the closing entry for the previous fiscal year (as of 31 December) on its own. If you have already locked that period, the closing is skipped and the reason is recorded in the audit log.",
  },
  andaKecil: { id: "(Anda)", en: "(you)" },
  // Label izin modul tinggal di packages/shared (dipakai apps/api) dan tetap
  // berbahasa Indonesia; pemetaan kode→kunci kamus dilakukan di sisi web —
  // pola tetap sejak Fase 16t.
  izinPenjualan: { id: "Penjualan & Pesanan", en: "Sales & Orders" },
  izinPembelian: { id: "Pembelian & Pengadaan", en: "Purchasing & Procurement" },
  izinKasir: { id: "Kasir (POS)", en: "Cashier (POS)" },
  izinStok: { id: "Stok & Produk", en: "Stock & Products" },
  izinKeuangan: { id: "Keuangan & Akuntansi", en: "Finance & Accounting" },
  izinPajak: { id: "Pajak", en: "Tax" },
  izinLaporan: { id: "Laporan", en: "Reports" },
  izinHr: { id: "HR & Penggajian", en: "HR & Payroll" },
  izinProyek: { id: "Proyek & operasi", en: "Projects & operations" },
  izinCrm: { id: "CRM & Penawaran", en: "CRM & Quotations" },
  izinPersetujuan: { id: "Persetujuan", en: "Approvals" },
  izinPengaturan: { id: "Pengaturan perusahaan", en: "Company settings" },
  izinPengguna: { id: "Kelola pengguna & peran", en: "Manage users & roles" },
  undang: { id: "Undang", en: "Invite" },
  nonaktifKecil: { id: "nonaktif", en: "off" },
  dasarAdmin: { id: "Dasar: Admin", en: "Base: Admin" },
  dasarViewer: { id: "Dasar: Viewer", en: "Base: Viewer" },
  modulSatuan: { id: "modul", en: "modules" },
  anggotaSatuan: { id: "anggota", en: "members" },
  terbatasCostCenter: { id: "terbatas", en: "limited to" },
  costCenterSatuan: { id: "cost center", en: "cost centres" },
  peranDasarHak: { id: "Peran dasar (hak baca/tulis)", en: "Base role (read/write rights)" },
  viewerBacaSaja: { id: "Viewer (baca-saja)", en: "Viewer (read-only)" },
  kosongkanUntukSemua: { id: "Kosongkan untuk akses semua.", en: "Leave empty for access to all." },
  // Field kustom per modul (Fase 20j)
  fieldKustom: { id: "Field kustom", en: "Custom fields" },
  descFieldKustom: {
    id: "Tambahkan kolom Anda sendiri pada Kontak, Produk, dan Faktur. Kolomnya ikut tampil di form, cetakan, dan ekspor.",
    en: "Add your own columns to Contacts, Products, and Invoices. They appear in forms, printouts, and exports.",
  },
  modulField: { id: "Modul", en: "Module" },
  kunciField: { id: "Kunci", en: "Key" },
  hintKunciField: {
    id: "Huruf kecil, angka, garis bawah — dipakai sebagai judul kolom ekspor.",
    en: "Lowercase letters, digits, underscore — used as the export column heading.",
  },
  labelField: { id: "Label", en: "Label" },
  tipeField: { id: "Tipe", en: "Type" },
  pilihanField: { id: "Pilihan (pisahkan dengan koma)", en: "Options (comma separated)" },
  wajibDiisi: { id: "Wajib diisi", en: "Required" },
  tambahFieldKustom: { id: "Tambah field", en: "Add field" },
  arsipkanField: { id: "Arsipkan field", en: "Archive field" },
  konfirmArsipField: { id: "Arsipkan field kustom ini?", en: "Archive this custom field?" },
  descArsipField: {
    id: "Field berhenti tampil di form, cetakan, dan ekspor. Nilai yang sudah tercatat TIDAK dihapus.",
    en: "The field stops appearing in forms, printouts, and exports. Values already recorded are NOT deleted.",
  },
  belumAdaFieldKustom: {
    id: "Belum ada field kustom. Tambahkan bila ada data yang perlu Anda catat tetapi belum ada kolomnya.",
    en: "No custom fields yet. Add one when you need to record data that has no column yet.",
  },
  tipeTeks: { id: "Teks", en: "Text" },
  tipeAngka: { id: "Angka", en: "Number" },
  tipeTanggal: { id: "Tanggal", en: "Date" },
  tipePilihan: { id: "Pilihan", en: "Choice" },
  modulKontak: { id: "Kontak", en: "Contacts" },
  modulProduk: { id: "Produk", en: "Products" },
  modulFaktur: { id: "Faktur penjualan", en: "Sales invoices" },
  // Ganti paket dengan prorata (Fase 20k)
  // Pemindai barcode kamera (Fase 20i)
  pindaiBarcode: { id: "Pindai barcode", en: "Scan barcode" },
  tutupPemindai: { id: "Tutup pemindai", en: "Close scanner" },
  pindaiArahkan: {
    id: "Arahkan kamera ke barcode produk — begitu terbaca, barangnya langsung masuk keranjang.",
    en: "Point the camera at the product barcode — once read, the item goes straight into the cart.",
  },
  // Fase 21g: sejak ada pengurai cadangan wasm, "peramban tidak mendukung"
  // bukan lagi keadaan yang mungkin. Yang masih bisa terjadi adalah potongan
  // wasm-nya gagal diunduh — dan kalimatnya harus menyebut itu, bukan
  // menyalahkan peramban yang sebenarnya sanggup.
  pindaiPenguraiGagal: {
    id: "Mesin pemindai gagal dimuat. Coba lagi saat perangkat terhubung internet, atau ketik SKU di kotak pencarian.",
    en: "The scanner engine failed to load. Try again once the device is online, or type the SKU in the search box.",
  },
  pindaiTanpaKamera: {
    id: "Perangkat ini tidak menyediakan akses kamera. Kotak pencarian di atas tetap bisa dipakai.",
    en: "This device offers no camera access. The search box above still works.",
  },
  pindaiTanpaIzin: {
    id: "Kamera tidak bisa dipakai — izinnya ditolak atau sedang dipakai aplikasi lain. Kotak pencarian tetap bisa dipakai.",
    en: "The camera is unavailable — permission was denied or another app is using it. The search box still works.",
  },
  // Peramalan stok (Fase 20h)
  peramalanStok: { id: "Peramalan stok", en: "Stock forecast" },
  descPeramalanStok: {
    id: "Perkiraan kebutuhan dari kecepatan jual 90 hari terakhir. Hitungannya rata-rata bergerak biasa, bukan AI, jadi angkanya dapat Anda telusuri sendiri.",
    en: "Demand estimate from the last 90 days of sales velocity. Plain moving average — not AI — so you can retrace every number yourself.",
  },
  rataJualHarian: { id: "Rata-rata/hari", en: "Avg/day" },
  sisaHariHabis: { id: "Habis dalam", en: "Runs out in" },
  titikPesanDihitung: { id: "Titik pesan", en: "Reorder point" },
  tren: { id: "Tren", en: "Trend" },
  keyakinan: { id: "Keyakinan", en: "Confidence" },
  trenNaik: { id: "Naik", en: "Rising" },
  trenTurun: { id: "Turun", en: "Falling" },
  trenStabil: { id: "Stabil", en: "Steady" },
  keyakinanTinggi: { id: "Tinggi", en: "High" },
  keyakinanSedang: { id: "Sedang", en: "Medium" },
  keyakinanRendah: { id: "Rendah", en: "Low" },
  hanyaPerluPesan: { id: "Hanya yang perlu dipesan", en: "Only those needing an order" },
  waktuTungguHari: { id: "Waktu tunggu pemasok (hari)", en: "Supplier lead time (days)" },
  belumAdaRiwayatJual: {
    id: "Belum ada penjualan pada periode ini, jadi belum ada yang bisa diramalkan. Peramalan butuh riwayat minimal satu bulan.",
    en: "No sales in this period, so there is nothing to forecast yet. Forecasting needs at least one month of history.",
  },
  hintKeyakinanRendah: {
    id: "Baris berkeyakinan rendah dihitung dari penjualan yang terlalu jarang, jadi perlakukan angkanya sebagai perkiraan kasar.",
    en: "Low-confidence rows come from sales that are too infrequent; treat them as rough estimates.",
  },
  // Laporan — Fase 16e
  faktur: { id: "Faktur", en: "Invoice" },
  nomor: { id: "Nomor", en: "Number" },
  kontakKolom: { id: "Kontak", en: "Contact" },
  pembeli: { id: "Pembeli", en: "Buyer" },
  omzet: { id: "Omzet", en: "Revenue" },
  piutang: { id: "Piutang", en: "Receivables" },
  hutang: { id: "Utang", en: "Payables" },
  aset: { id: "Aset", en: "Assets" },
  kewajiban: { id: "Kewajiban", en: "Liabilities" },
  ekuitas: { id: "Ekuitas", en: "Equity" },
  pendapatan: { id: "Pendapatan", en: "Income" },
  beban: { id: "Beban", en: "Expenses" },
  kasMasuk: { id: "Kas Masuk", en: "Cash in" },
  kasKeluar: { id: "Kas Keluar", en: "Cash out" },
  perTanggal: { id: "Per tanggal", en: "As of" },
  kewajibanEkuitas: { id: "Kewajiban + Ekuitas", en: "Liabilities + Equity" },
  tidakSeimbang: { id: "TIDAK seimbang", en: "NOT balanced" },
  marginKotor: { id: "Margin kotor", en: "Gross margin" },
  marginBersih: { id: "Margin bersih", en: "Net margin" },
  jumlahFaktur: { id: "Jumlah faktur", en: "Invoice count" },
  rataRataPerFaktur: { id: "Rata-rata per faktur", en: "Average per invoice" },
  totalPenjualan: { id: "Total penjualan", en: "Total sales" },
  totalKeseluruhan: { id: "Total keseluruhan", en: "Grand total" },
  bandingkanPeriode: {
    id: "Bandingkan dengan periode sebelumnya",
    en: "Compare with the previous period",
  },
  perPelanggan: { id: "Per pelanggan", en: "By customer" },
  perProduk: { id: "Per produk", en: "By product" },
  eksporExcel: { id: "Ekspor Excel", en: "Export Excel" },
  belumAdaPenjualan: { id: "Belum ada penjualan", en: "No sales yet" },
  tidakAda: { id: "Tidak ada.", en: "None." },
  tidakAdaFakturPpn: {
    id: "Tidak ada faktur ber-PPN pada periode ini. Coba masa pajak lain, atau pastikan faktur sudah diposting.",
    en: "No VAT invoices in this period. Try another tax period, or check that the invoices are posted.",
  },
  tidakAdaFakturRentang: {
    id: "Tidak ada faktur pada rentang tanggal ini. Lebarkan rentangnya untuk melihat yang lebih lama.",
    en: "No invoices in this date range. Widen the range to see older ones.",
  },
  // Keuangan / jurnal — Fase 16f
  akun: { id: "Akun", en: "Account" },
  namaAkun: { id: "Nama akun", en: "Account name" },
  pilihAkun: { id: "Pilih akun", en: "Select account" },
  tambahAkun: { id: "Tambah akun", en: "Add account" },
  ubahNama: { id: "Ubah nama", en: "Rename" },
  tipe: { id: "Tipe", en: "Type" },
  debit: { id: "Debit", en: "Debit" },
  kredit: { id: "Kredit", en: "Credit" },
  noJurnal: { id: "No. Jurnal", en: "Entry no." },
  balik: { id: "Balik", en: "Reverse" },
  muatKeForm: { id: "Muat ke form", en: "Load into form" },
  belumAdaTransaksi: { id: "Belum ada transaksi.", en: "No transactions yet." },
  namaTemplate: { id: "Nama template", en: "Template name" },
  simpanSebagaiTemplate: { id: "Simpan sebagai template", en: "Save as template" },
  terbitOtomatisBulanan: { id: "Terbit otomatis tiap bulan", en: "Auto-issue monthly" },
  terbitPertama: { id: "Terbit pertama", en: "First issue" },
  terbitkanSekarang: { id: "Terbitkan sekarang", en: "Issue now" },
  templateJurnal: { id: "Template jurnal", en: "Entry templates" },
  jurnalManualBaru: { id: "Jurnal manual baru", en: "New manual entry" },
  jurnalTerposting: { id: "Jurnal terposting", en: "Posted entries" },
  deskripsiOpsional: { id: "Deskripsi (opsional)", en: "Description (optional)" },
  cariJurnal: { id: "Cari jurnal", en: "Search entries" },
  cariNoJurnal: { id: "Cari no. jurnal / keterangan…", en: "Search entry no. / notes…" },
  akunTemplateOtomatis: {
    id: "Akun template standar Indonesia sudah tersedia otomatis.",
    en: "The Indonesian standard chart of accounts is provided automatically.",
  },
  descJurnalManual: {
    id: "Total debit harus sama dengan total kredit. Jurnal terposting tidak dapat diubah — koreksi lewat jurnal pembalik.",
    en: "Total debits must equal total credits. Posted entries cannot be changed — correct them with a reversing entry.",
  },
  descTemplateJurnal: {
    id: "Jurnal rutin siap pakai — terbitkan sekali klik, atau otomatis tiap bulan bila berjadwal.",
    en: "Ready-made recurring entries — issue in one click, or automatically each month when scheduled.",
  },
  descMulaiCepat: {
    id: "Belum punya produk? Pilih jenis usaha untuk mengisi contoh produk & kontak — semua bisa diubah/hapus kapan saja.",
    en: "No products yet? Pick a business type to load sample products & contacts — all editable or removable at any time.",
  },
  descPembayaranPos: {
    id: "Pembayaran POS menyatu dengan struknya — gunakan Retur/Refund di Kasir.",
    en: "POS payments are tied to their receipt — use Return/Refund in the Cashier.",
  },
  descOpname: {
    id: "Samakan stok sistem dengan hasil hitung fisik — selisih nilainya otomatis dijurnal ke Beban Operasional Lain.",
    en: "Match system stock to your physical count — the value difference is journaled automatically to Other Operating Expense.",
  },
  descUsulanBeli: {
    id: "Produk dengan total stok di bawah/di ambang minimum. Buat permintaan pembelian sekali klik.",
    en: "Products at or below their minimum stock. Create a purchase request in one click.",
  },
  descBelumAdaStok: {
    id: "Catat faktur pembelian untuk mengisi stok — level per gudang akan tampil di sini.",
    en: "Record a purchase invoice to fill stock — levels per warehouse will appear here.",
  },
  // Kasir / POS — Fase 16g
  tunai: { id: "Tunai", en: "Cash" },
  lunas: { id: "Lunas", en: "Paid" },
  kembalian: { id: "Kembalian", en: "Change" },
  kembalianTitik: { id: "Kembalian:", en: "Change:" },
  seharusnya: { id: "Seharusnya:", en: "Expected:" },
  uangPas: { id: "Uang pas", en: "Exact cash" },
  // Fase 21g — temuan pemeriksaan mata: ketiga teks di bawah masih Indonesia
  // di mode Inggris, termasuk TOMBOL BAYAR, tombol terpenting di layar kasir.
  // Penyapu tak melihatnya karena "bayar"/"cetak"/"struk" tak ada di kosakata
  // penandanya, dan `+50rb` dirangkai dari angka (kelas buta Fase 21e).
  bayarCetakStruk: { id: "Bayar & cetak struk", en: "Pay & print receipt" },
  lihatRekap: { id: "Lihat rekap", en: "View summary" },
  tutupRekap: { id: "Tutup", en: "Close" },
  /** Singkatan ribuan pada tombol nominal cepat: "+50rb" / "+50k". */
  ribuSingkat: { id: "rb", en: "k" },
  tahan: { id: "Tahan", en: "Hold" },
  panggil: { id: "Panggil", en: "Recall" },
  transaksiDitahan: { id: "Transaksi ditahan", en: "Held transactions" },
  namaTahanOpsional: { id: "Nama tahan (opsional)", en: "Hold name (optional)" },
  hapusTahan: { id: "Hapus tahan", en: "Remove hold" },
  hapusPembayaran: { id: "Hapus pembayaran", en: "Remove payment" },
  keranjang: { id: "Keranjang", en: "Cart" },
  bukaShift: { id: "Buka shift", en: "Open shift" },
  tutupShift: { id: "Tutup shift", en: "Close shift" },
  kasAwalRp: { id: "Kas awal (Rp)", en: "Opening cash (Rp)" },
  kasFisikLaciRp: { id: "Kas fisik di laci (Rp)", en: "Cash counted in drawer (Rp)" },
  perMetode: { id: "Per metode", en: "By method" },
  perShift: { id: "Per shift", en: "By shift" },
  rekapHariIni: { id: "Rekap hari ini", en: "Today's summary" },
  strukRefund: { id: "Struk & Refund", en: "Receipts & Refunds" },
  cariNomorStruk: { id: "Cari nomor struk…", en: "Search receipt no.…" },
  cariProdukSku: { id: "Cari produk / SKU…", en: "Search product / SKU…" },
  klikProdukTambah: { id: "Klik produk untuk menambahkan.", en: "Click a product to add it." },
  belumAdaPenjualanPos: { id: "Belum ada penjualan POS hari ini. Bukalah shift kasir untuk mulai berjualan.", en: "No POS sales today yet. Open a cashier shift to start selling." },
  belumAdaStrukPos: { id: "Belum ada struk POS. Struk tersimpan di sini setelah transaksi kasir selesai.", en: "No POS receipts yet. Receipts are stored here once a cashier sale completes." },
  kasirHanyaAdmin: {
    id: "Halaman kasir hanya untuk Owner/Admin.",
    en: "The cashier page is for Owner/Admin only.",
  },
  terimaKasih: { id: "Terima kasih 🙏", en: "Thank you 🙏" },
  descBukaShift: {
    id: "Mulai sesi kasir dengan mencatat kas awal di laci.",
    en: "Start a cashier session by recording the opening cash in the drawer.",
  },
  descRekapPos: {
    id: "Penjualan POS per jam, per shift, dan per metode pembayaran.",
    en: "POS sales by hour, by shift, and by payment method.",
  },
  descStrukRefund: {
    id: "Pilih struk, isi qty barang yang dikembalikan — uang tunai keluar dari laci shift ini.",
    en: "Pick a receipt and enter the quantity returned — cash leaves this shift's drawer.",
  },
  prosesRefund: { id: "Proses refund", en: "Process refund" },
  konfirmasiTutup: { id: "Konfirmasi tutup", en: "Confirm close" },
  tambahSeri: { id: "Tambah seri", en: "Add serial" },
  // CRM — Fase 16h
  lead: { id: "Lead", en: "Lead" },
  leadBaru: { id: "Lead baru", en: "New lead" },
  leadAktif: { id: "Lead aktif", en: "Active leads" },
  tambahLead: { id: "Tambah lead", en: "Add lead" },
  belumAdaLead: { id: "Belum ada lead", en: "No leads yet" },
  sumber: { id: "Sumber", en: "Source" },
  narahubung: { id: "Narahubung", en: "Contact person" },
  namaProspek: { id: "Nama perusahaan/prospek", en: "Company/prospect name" },
  perkiraanNilai: { id: "Perkiraan nilai (Rp)", en: "Estimated value (Rp)" },
  pindahTahap: { id: "Pindah tahap", en: "Move stage" },
  menang: { id: "Menang", en: "Won" },
  kalah: { id: "Kalah", en: "Lost" },
  konversi: { id: "Konversi", en: "Convert" },
  konversiPelanggan: { id: "Konversi ke pelanggan", en: "Convert to customer" },
  konversiFaktur: { id: "Konversi ke faktur", en: "Convert to invoice" },
  konversiPerSumber: { id: "Konversi per sumber", en: "Conversion by source" },
  aktivitasFollowUp: { id: "Aktivitas follow-up", en: "Follow-up activity" },
  jenisAktivitas: { id: "Jenis aktivitas", en: "Activity type" },
  catatanAktivitas: { id: "Catatan aktivitas", en: "Activity note" },
  catatanSingkat: { id: "Catatan singkat…", en: "Short note…" },
  belumAdaAktivitas: { id: "Belum ada aktivitas.", en: "No activity yet." },
  catat: { id: "Catat", en: "Record" },
  tenggatOpsional: { id: "Tenggat (opsional)", en: "Due date (optional)" },
  penawaranBaru: { id: "Penawaran baru", en: "New quotation" },
  buatPenawaran: { id: "Buat penawaran", en: "Create quotation" },
  daftarPenawaran: { id: "Daftar penawaran", en: "Quotation list" },
  belumAdaPenawaran: { id: "Belum ada penawaran", en: "No quotations yet" },
  berlakuSampai: { id: "Berlaku sampai", en: "Valid until" },
  diterima: { id: "Diterima", en: "Accepted" },
  ditolak: { id: "Ditolak", en: "Rejected" },
  tandaiTerkirim: { id: "Tandai terkirim", en: "Mark as sent" },
  buatFaktur: { id: "Buat faktur", en: "Create invoice" },
  tanggalFaktur: { id: "Tanggal faktur", en: "Invoice date" },
  gudangStokKeluar: { id: "Gudang (stok keluar)", en: "Warehouse (stock out)" },
  sudahJadiFaktur: {
    id: "Penawaran ini sudah menjadi faktur penjualan.",
    en: "This quotation has become a sales invoice.",
  },
  contohSumber: { id: "mis. Instagram, referensi", en: "e.g. Instagram, referral" },
  descLeadAktif: {
    id: "Perusahaan/orang yang berpotensi jadi pelanggan.",
    en: "Companies or people who could become customers.",
  },
  descBelumAdaLead: {
    id: "Tambahkan calon pelanggan untuk mulai membangun pipeline penjualan Anda.",
    en: "Add a lead to start building your sales pipeline.",
  },
  descKonversiSumber: {
    id: "Sumber lead mana yang paling banyak menghasilkan pelanggan — arahkan promosi ke sana.",
    en: "Which lead sources convert best — focus your marketing there.",
  },
  descPenawaranBaru: {
    id: "Belum memengaruhi stok/jurnal — baru mengikat saat dikonversi ke faktur.",
    en: "Doesn't affect stock or your books yet — it only commits when converted to an invoice.",
  },
  descBelumAdaPenawaran: {
    id: "Buat penawaran untuk calon pembeli. Sekali klik, ia dapat menjadi faktur.",
    en: "Create a quotation for a prospect — one click turns it into an invoice.",
  },
  buatPermintaanPembelian: { id: "Buat permintaan pembelian", en: "Create purchase request" },
  // Penggajian / HR — Fase 16i
  karyawan: { id: "Karyawan", en: "Employees" },
  jabatan: { id: "Jabatan", en: "Position" },
  departemen: { id: "Departemen", en: "Department" },
  induk: { id: "Induk", en: "Parent" },
  atasanLangsung: { id: "Atasan langsung", en: "Direct manager" },
  departemenAtasan: { id: "Departemen · Atasan", en: "Department · Manager" },
  gajiPokok: { id: "Gaji pokok", en: "Base salary" },
  pokok: { id: "Pokok", en: "Base" },
  pokokRp: { id: "Pokok (Rp)", en: "Base (Rp)" },
  tunjangan: { id: "Tunjangan", en: "Allowances" },
  bruto: { id: "Bruto", en: "Gross" },
  netto: { id: "Netto", en: "Net" },
  potongan: { id: "Potongan", en: "Deductions" },
  slip: { id: "Slip", en: "Payslip" },
  statusPtkp: { id: "Status PTKP", en: "PTKP status" },
  periodeBulan: { id: "Periode (bulan)", en: "Period (month)" },
  tanggalBayar: { id: "Tanggal bayar", en: "Payment date" },
  bayarDariAkun: { id: "Bayar dari akun", en: "Pay from account" },
  catatanPajak: { id: "Catatan pajak:", en: "Tax note:" },
  komponen: { id: "Komponen", en: "Components" },
  namaKomponen: { id: "Nama komponen", en: "Component name" },
  nominal: { id: "Nominal", en: "Amount" },
  nominalRp: { id: "Nominal (Rp)", en: "Amount (Rp)" },
  tambahanBonusLembur: { id: "Tambahan (bonus/lembur)", en: "Additions (bonus/overtime)" },
  catatanOpsional: { id: "Catatan (opsional)", en: "Note (optional)" },
  cairkanDari: { id: "Cairkan dari", en: "Disburse from" },
  cicilanBulan: { id: "Cicilan/bulan", en: "Instalment/month" },
  cicilanBulanRp: { id: "Cicilan/bulan (Rp)", en: "Instalment/month (Rp)" },
  sisa: { id: "Sisa", en: "Remaining" },
  sisaCuti: { id: "Sisa cuti", en: "Leave balance" },
  cutiTahunan: { id: "Cuti tahunan", en: "Annual leave" },
  sakit: { id: "Sakit", en: "Sick" },
  izin: { id: "Izin", en: "Excused" },
  mulai: { id: "Mulai", en: "Start" },
  selesai: { id: "Selesai", en: "End" },
  belumAdaDepartemen: { id: "Belum ada departemen. Tambahkan departemen agar karyawan bisa dikelompokkan di laporan.", en: "No departments yet. Add one so employees can be grouped in reports." },
  belumAdaKasbon: { id: "Belum ada kasbon. Kasbon yang dicatat akan dipotong otomatis dari gaji karyawan.", en: "No advances yet. Recorded advances are deducted automatically from payroll." },
  belumAdaKomponen: {
    id: "Belum ada komponen untuk periode ini. Komponen gaji terisi begitu penggajian periode ini dijalankan.",
    en: "No components for this period yet. They appear once payroll is run for it.",
  },
  belumAdaCuti: { id: "Belum ada pengajuan cuti/izin. Pengajuan karyawan muncul di sini untuk disetujui.", en: "No leave requests yet. Employee requests appear here for approval." },
  belumAdaKaryawan: { id: "Belum ada karyawan", en: "No employees yet" },
  belumAdaPenggajian: { id: "Belum ada penggajian", en: "No payroll runs yet" },
  ajukan: { id: "Ajukan", en: "Submit" },
  cairkanKasbon: { id: "Cairkan Kasbon", en: "Disburse loan" },
  jalankanPenggajian: { id: "Jalankan penggajian", en: "Run payroll" },
  tambahKaryawan: { id: "Tambah karyawan", en: "Add employee" },
  descTambahKaryawan: {
    id: "Gaji pokok dan tunjangan dipakai menghitung PPh 21 dan BPJS pada penggajian berikutnya.",
    en: "Base salary and allowances feed the PPh 21 and BPJS calculation on the next payroll run.",
  },
  tambahKomponen: { id: "Tambah komponen", en: "Add component" },
  jalankanPenggajianBulanan: { id: "Jalankan penggajian bulanan", en: "Run monthly payroll" },
  riwayatPenggajian: { id: "Riwayat penggajian", en: "Payroll history" },
  kasbonPinjaman: { id: "Kasbon / pinjaman karyawan", en: "Employee loans" },
  cutiIzin: { id: "Cuti & izin", en: "Leave & absence" },
  strukturOrganisasi: { id: "Struktur organisasi", en: "Org structure" },
  yaBatalkanPenggajian: { id: "Ya, batalkan penggajian", en: "Yes, void payroll" },
  contohBonus: {
    id: "mis. Bonus kinerja / Lembur / Potongan absen",
    en: "e.g. Performance bonus / Overtime / Absence deduction",
  },
  contohKasbon: { id: "mis. Kasbon renovasi rumah", en: "e.g. Home renovation loan" },
  contohKodeDept: { id: "mis. OPS", en: "e.g. OPS" },
  contohNamaDept: { id: "mis. Operasional", en: "e.g. Operations" },
  descJalankanPenggajian: {
    id: "Menghitung semua karyawan aktif & memposting jurnal beban gaji. Satu kali per periode.",
    en: "Calculates every active employee and posts the payroll expense entry. Once per period.",
  },
  descRiwayatPenggajian: {
    id: "Penggajian yang Anda jalankan akan muncul di sini beserta slip gaji tiap karyawan.",
    en: "Payroll runs you perform will appear here with each employee's payslip.",
  },
  descBelumAdaKaryawan: {
    id: "Tambahkan karyawan untuk mulai menjalankan penggajian.",
    en: "Add an employee to start running payroll.",
  },
  descKomponen: {
    id: "Komponen sekali jalan untuk periode di atas. Ikut menambah/mengurangi bruto sehingga PPh 21 & BPJS ikut menyesuaikan.",
    en: "One-off components for the period above. They adjust gross pay, so PPh 21 & BPJS follow automatically.",
  },
  descKasbon: {
    id: "Pencairan tercatat sebagai Piutang Karyawan (berjurnal). Cicilan dipotong otomatis dari gaji netto tiap penggajian sampai lunas.",
    en: "Disbursements are recorded as Employee Receivable (journaled). Instalments are deducted automatically from net pay each run until settled.",
  },
  descCutiIzin: {
    id: "Catat pengajuan cuti tahunan/sakit/izin lalu setujui atau tolak. Cuti tahunan yang disetujui otomatis memotong saldo cuti (12 hari/tahun).",
    en: "Record annual leave / sick / excused requests, then approve or reject. Approved annual leave automatically reduces the leave balance (12 days/year).",
  },
  descStrukturOrganisasi: {
    id: "Peta departemen & karyawan — siapa berada di mana, di bawah siapa.",
    en: "A map of departments & employees — who sits where, under whom.",
  },
  descDepartemen: {
    id: "Struktur unit kerja perusahaan — bisa bertingkat (sub-departemen di bawah induk).",
    en: "Your company's work-unit structure — can be nested (sub-departments under a parent).",
  },
  // Label tab & kolom papan (pola object-literal) — Fase 16j
  tabGaji: { id: "Gaji", en: "Payroll" },
  tabKasbon: { id: "Kasbon", en: "Loans" },
  tabCuti: { id: "Cuti", en: "Leave" },
  tabIkhtisar: { id: "Ikhtisar", en: "Overview" },
  tabTugas: { id: "Tugas", en: "Tasks" },
  tabTimesheet: { id: "Timesheet", en: "Timesheet" },
  tabTerminRab: { id: "Termin & RAB", en: "Milestones & Budget" },
  kolomBelumDikerjakan: { id: "Belum dikerjakan", en: "To do" },
  kolomSedangProses: { id: "Sedang proses", en: "In progress" },
  kolomSelesai: { id: "Selesai", en: "Done" },
  // Proyek — Fase 16j
  namaProyek: { id: "Nama proyek", en: "Project name" },
  statusProyek: { id: "Status proyek", en: "Project status" },
  pelangganOpsional: { id: "Pelanggan (opsional)", en: "Customer (optional)" },
  anggaranOpsional: { id: "Anggaran (opsional)", en: "Budget (optional)" },
  berjalan: { id: "Berjalan", en: "Active" },
  ditunda: { id: "Ditunda", en: "On hold" },
  biaya: { id: "Biaya", en: "Cost" },
  jurnal: { id: "Jurnal", en: "Journal" },
  papanTugas: { id: "Papan tugas", en: "Task board" },
  garisWaktu: { id: "Garis waktu", en: "Timeline" },
  ganttJadwal: { id: "Gantt (jadwal & dependensi)", en: "Gantt (schedule & dependencies)" },
  bebanKerja: { id: "Beban kerja per orang", en: "Workload per person" },
  tugasTenggat: { id: "Tugas dengan tenggat", en: "Tasks with deadlines" },
  tanpaPj: { id: "Tanpa PJ", en: "Unassigned" },
  termin: { id: "Termin", en: "Milestone" },
  terminPenagihan: { id: "Termin penagihan", en: "Billing milestones" },
  totalTermin: { id: "Total termin", en: "Total milestones" },
  barisRab: { id: "Baris RAB", en: "Budget line" },
  totalAnggaran: { id: "Total anggaran", en: "Total budget" },
  catatJam: { id: "Catat jam", en: "Log hours" },
  buatFakturKecil: { id: "Buat faktur", en: "Create invoice" },
  terbitkanFaktur: { id: "Terbitkan faktur", en: "Issue invoice" },
  simpanBaseline: { id: "Simpan + baseline", en: "Save + baseline" },
  estimasiBiayaTk: { id: "Estimasi biaya tenaga kerja", en: "Estimated labour cost" },
  labaSetelahTk: { id: "Laba setelah tenaga kerja", en: "Profit after labour" },
  realisasiBiaya: { id: "Realisasi biaya (jurnal ber-tag)", en: "Actual cost (tagged entries)" },
  pendapatanBiayaTag: {
    id: "Pendapatan & biaya (dari jurnal ber-tag)",
    en: "Income & cost (from tagged entries)",
  },
  rabAnggaranVsRealisasi: {
    id: "RAB — anggaran biaya vs realisasi",
    en: "Budget — planned vs actual cost",
  },
  timesheetJamKerja: { id: "Timesheet — jam kerja", en: "Timesheet — hours worked" },
  belumAdaRab: { id: "Belum ada RAB. Susun rencana anggaran biaya untuk membandingkannya dengan realisasi.", en: "No budget yet. Draft one to compare it against actual spending." },
  belumAdaTermin: { id: "Belum ada termin. Bagi nilai proyek menjadi termin agar bisa ditagih bertahap.", en: "No milestones yet. Split the project value into milestones so it can be billed in stages." },
  belumAdaJam: { id: "Belum ada catatan jam. Catat jam kerja agar biaya tenaga kerja masuk ke laba-rugi proyek.", en: "No hours logged yet. Log hours so labour cost lands in the project's profit and loss." },
  belumAdaTugasTenggat: {
    id: "Tidak ada tugas terbuka dengan tenggat.",
    en: "No open tasks with a deadline.",
  },
  belumAdaTransaksiProyek: {
    id: "Belum ada transaksi ditandai ke proyek ini. Pilih proyek saat membuat faktur atau mencatat beban.",
    en: "No transactions tagged to this project yet. Pick the project when invoicing or recording an expense.",
  },
  tetapkanPelangganTermin: {
    id: "Tetapkan pelanggan pada proyek untuk menagih termin.",
    en: "Assign a customer to the project to bill milestones.",
  },
  daftarProyek: { id: "Daftar proyek", en: "Project list" },
  proyekBaru: { id: "Proyek baru", en: "New project" },
  belumAdaProyek: { id: "Belum ada proyek", en: "No projects yet" },
  anggaran: { id: "Anggaran", en: "Budget" },
  baselineRencana: { id: "Baseline (rencana)", en: "Baseline (plan)" },
  kategoriRab: { id: "Kategori RAB", en: "Budget category" },
  namaTermin: { id: "Nama termin", en: "Milestone name" },
  nominalTermin: { id: "Nominal termin", en: "Milestone amount" },
  namaTugas: { id: "Nama tugas", en: "Task name" },
  tambahTugas: { id: "Tambah tugas…", en: "Add task…" },
  penanggungJawab: { id: "Penanggung jawab", en: "Assignee" },
  ubahPenanggungJawab: { id: "Ubah penanggung jawab", en: "Change assignee" },
  prioritas: { id: "Prioritas", en: "Priority" },
  ubahPrioritas: { id: "Ubah prioritas", en: "Change priority" },
  tenggat: { id: "Tenggat", en: "Deadline" },
  jam: { id: "Jam", en: "Hours" },
  tarifJam: { id: "Tarif/jam", en: "Rate/hour" },
  contohKategoriRab: { id: "mis. Material / Tenaga kerja", en: "e.g. Materials / Labour" },
  contohTermin: { id: "mis. Uang muka 30%", en: "e.g. 30% down payment" },
  descBelumAdaProyek: {
    id: "Buat proyek untuk mulai melacak profitabilitas per pekerjaan/klien.",
    en: "Create a project to start tracking profitability per job or client.",
  },
  descProyekBaru: {
    id: "Setelah dibuat, pilih proyek ini saat membuat faktur, pembelian, atau jurnal untuk menandai biayanya.",
    en: "Once created, pick this project when making an invoice, purchase, or entry to tag its costs.",
  },

  // Aset tetap (Fase 16k)
  asetAktif: { id: "Aset aktif", en: "Active assets" },
  nilaiBukuTotal: { id: "Nilai buku total", en: "Total book value" },
  penyusutanPerBulan: { id: "Penyusutan/bulan", en: "Depreciation/month" },
  namaAset: { id: "Nama aset", en: "Asset name" },
  kategori: { id: "Kategori", en: "Category" },
  tanggalPerolehan: { id: "Tanggal perolehan", en: "Acquisition date" },
  nilaiPerolehan: { id: "Nilai perolehan", en: "Acquisition cost" },
  masaManfaatBulan: { id: "Masa manfaat (bulan)", en: "Useful life (months)" },
  nilaiResidu: { id: "Nilai residu", en: "Residual value" },
  dibayarDariAkun: { id: "Dibayar dari akun", en: "Paid from account" },
  periode: { id: "Periode", en: "Period" },
  tanggalJurnal: { id: "Tanggal jurnal", en: "Entry date" },
  daftarkanAset: { id: "Daftarkan aset", en: "Register asset" },
  jalankanPenyusutan: { id: "Jalankan penyusutan", en: "Run depreciation" },
  daftarkanAsetBaru: { id: "Daftarkan aset baru", en: "Register a new asset" },
  jalankanPenyusutanBulanan: {
    id: "Jalankan penyusutan bulanan",
    en: "Run monthly depreciation",
  },
  daftarAset: { id: "Daftar aset", en: "Asset list" },
  belumAdaAset: { id: "Belum ada aset", en: "No assets yet" },
  contohKategoriAset: { id: "mis. Kendaraan, Peralatan", en: "e.g. Vehicles, Equipment" },
  statusDilepas: { id: "dilepas", en: "disposed" },
  statusAktif: { id: "aktif", en: "active" },
  perolehan: { id: "Perolehan", en: "Acquisition" },
  nilaiBuku: { id: "Nilai buku", en: "Book value" },
  lepas: { id: "Lepas", en: "Dispose" },
  sejak: { id: "Sejak", en: "Since" },
  masa: { id: "masa", en: "life" },
  blnSingkat: { id: "bln", en: "mo" },
  penyusutan: { id: "penyusutan", en: "depreciation" },
  perBlnSingkat: { id: "/bln", en: "/mo" },
  tersusut: { id: "tersusut", en: "depreciated" },
  tanggalPelepasan: { id: "Tanggal pelepasan", en: "Disposal date" },
  hasilPenjualanAset: {
    id: "Hasil penjualan (0 bila dibuang)",
    en: "Sale proceeds (0 if scrapped)",
  },
  diterimaDiAkun: { id: "Diterima di akun", en: "Received in account" },
  lepasAset: { id: "Lepas Aset", en: "Dispose Asset" },
  lepasAsetTanya: { id: "Lepas aset", en: "Dispose asset" },
  yaLepasAset: { id: "Ya, lepas aset", en: "Yes, dispose asset" },
  descDaftarkanAset: {
    id: "Jurnal perolehan (Debit Aset Tetap / Kredit kas-bank) dibuat otomatis.",
    en: "The acquisition entry (Debit Fixed Assets / Credit cash-bank) is posted automatically.",
  },
  descPenyusutanBulanan: {
    id: "Berjalan otomatis tiap awal bulan, dan dapat juga dipicu manual. Aman diulang, karena tidak dobel per periode.",
    en: "Runs automatically each month; can also be triggered manually. Safe to repeat (never doubles a period).",
  },
  descBelumAdaAset: {
    id: "Daftarkan aset tetap (kendaraan, peralatan, dll.) untuk mulai menyusutkan otomatis.",
    en: "Register a fixed asset (vehicle, equipment, etc.) to start depreciating it automatically.",
  },
  descLepasAset: {
    id: "akan dihapus dari neraca dan laba/rugi pelepasan dijurnal otomatis. Aksi ini tidak bisa diurungkan.",
    en: "will be removed from the balance sheet and the disposal gain/loss is posted automatically. This action cannot be undone.",
  },
  // Penjualan & Pembelian — pelunasan utang 16c (Fase 16l)
  kurs: { id: "Kurs", en: "Rate" },
  kursSaatBayar: { id: "Kurs saat bayar", en: "Rate at payment" },
  hapusBaris: { id: "Hapus baris", en: "Remove line" },
  nomorLotBaris: { id: "Nomor lot baris", en: "Lot number line" },
  tanggalKedaluwarsaBaris: { id: "Tanggal kedaluwarsa baris", en: "Expiry date line" },
  qtyRetur: { id: "Qty retur", en: "Return qty" },
  dibeli: { id: "dibeli", en: "bought" },
  tambahBarang: { id: "Tambah barang", en: "Add item" },
  postingFaktur: { id: "Posting faktur", en: "Post invoice" },
  postingRetur: { id: "Posting retur", en: "Post return" },
  terimaPembayaran: { id: "Terima pembayaran", en: "Receive payment" },
  bayar: { id: "Bayar", en: "Pay" },
  belumLunas: { id: "belum lunas", en: "unpaid" },
  menampilkan: { id: "Menampilkan", en: "Showing" },
  dariTotal: { id: "dari", en: "of" },
  akunRefundTunai: {
    id: "Akun refund tunai (bila nilai retur melebihi sisa tagihan)",
    en: "Cash refund account (when the return exceeds the outstanding balance)",
  },
  tanpaRefundTunai: { id: "— tanpa refund tunai —", en: "— no cash refund —" },
  pilihKasBank: { id: "— pilih kas/bank —", en: "— pick cash/bank —" },
  fakturPadaKurs: { id: "Faktur pada kurs", en: "Invoice at rate" },
  hintFefo: {
    id: "Produk ini melacak kedaluwarsa — tanggal exp wajib diisi (keluar otomatis FEFO).",
    en: "This product tracks expiry — the exp date is required (issued automatically by FEFO).",
  },
  // Picking multi-gudang (Fase 20g)
  ambilBeberapaGudang: { id: "Ambil dari beberapa gudang", en: "Pick from several warehouses" },
  ambilSatuGudang: { id: "Ambil dari satu gudang saja", en: "Pick from a single warehouse" },
  tambahGudangPicking: { id: "Tambah gudang", en: "Add warehouse" },
  gudangBaris: { id: "Gudang baris", en: "Warehouse line" },
  qtyGudangBaris: { id: "Qty gudang baris", en: "Warehouse qty line" },
  hapusGudangPicking: { id: "Hapus gudang picking", en: "Remove picking warehouse" },
  hintPickingSama: {
    id: "Jumlah qty per gudang harus sama dengan qty baris.",
    en: "The per-warehouse quantities must add up to the line quantity.",
  },
  hintPickingBeda: {
    id: "Jumlah qty per gudang belum sama dengan qty baris — faktur akan ditolak.",
    en: "The per-warehouse quantities do not add up to the line quantity yet — the invoice will be rejected.",
  },
  descCariDokumenKosong: {
    id: "Coba kata kunci lain — pencarian mencocokkan nomor dokumen dan nama kontak.",
    en: "Try another keyword — the search matches document numbers and contact names.",
  },
  descBelumAdaDokumen: {
    id: "Dokumen yang Anda posting akan muncul di sini beserta status pembayarannya.",
    en: "Documents you post will appear here along with their payment status.",
  },
  descSelisihKurs: {
    id: ". Selisih dengan kurs bayar otomatis dijurnal sebagai laba/rugi selisih kurs.",
    en: ". The gap against the payment rate is posted automatically as a forex gain/loss.",
  },
  descBatalkanDokumen1: {
    id: "Jurnal pembalik akan diposting dan stok dikembalikan seperti sebelum dokumen ini dibuat. Dokumen tetap tercatat dengan tanda",
    en: "A reversing entry is posted and stock is restored to how it was before this document. The document stays on record marked",
  },
  descBatalkanDokumen2: {
    id: "— aksi ini tidak bisa diurungkan.",
    en: "— this action cannot be undone.",
  },
  descUbahDokumen1: { id: "Dokumen ini akan", en: "This document will be" },
  descUbahDokumen2: {
    id: "(jurnal pembalik + stok pulih), lalu isinya dimuat ke form di atas untuk diperbaiki dan diposting sebagai dokumen",
    en: "(reversing entry + stock restored), then its contents load into the form above to be corrected and posted as a",
  },
  descUbahDokumen3: { id: "baru bernomor baru", en: "new document with a new number" },
  descUbahDokumen4: {
    id: "— begitulah koreksi pada pembukuan yang jejaknya utuh.",
    en: "— that is how corrections work in books that keep a full trail.",
  },
  descHapusPembayaran1: {
    id: "Jurnal pembayaran akan dibalik dan sisa tagihan dokumen kembali seperti sebelum pembayaran dicatat. Baris pembayaran tetap tercatat dengan tanda",
    en: "The payment entry is reversed and the outstanding balance returns to what it was before the payment. The payment row stays on record marked",
  },
  // Data Master — pelunasan utang 16b (Fase 16m)
  danLainnya: { id: "lainnya", en: "more" },
  nomorSeri: { id: "Nomor seri", en: "Serial numbers" },
  tersedia: { id: "tersedia", en: "available" },
  belumAdaNomorSeri: {
    id: "Belum ada nomor seri. Tambahkan unit satu per satu di atas.",
    en: "No serial numbers yet. Add units one by one above.",
  },
  tambahProduk: { id: "Tambah produk", en: "Add product" },
  ubahProduk: { id: "Ubah produk", en: "Edit product" },
  tambahKontak: { id: "Tambah kontak", en: "Add contact" },
  ubahKontak: { id: "Ubah kontak", en: "Edit contact" },
  tambahGudang: { id: "Tambah gudang", en: "Add warehouse" },
  ubahGudang: { id: "Ubah gudang", en: "Edit warehouse" },
  descUbahProduk: {
    id: "Perubahan hanya memengaruhi data master. Transaksi lama tetap memakai nilai saat diposting.",
    en: "Changes affect master data only; past transactions keep the values they were posted with.",
  },
  descTambahProduk: {
    id: "Tambah satu per satu, atau impor sekaligus dari file CSV/Excel.",
    en: "Add them one by one, or import in bulk from a CSV/Excel file.",
  },
  descUbahKontak: {
    id: "Perubahan berlaku untuk transaksi berikutnya.",
    en: "Changes apply to subsequent transactions.",
  },
  descTambahKontak: {
    id: "Pelanggan dan pemasok Anda — bisa impor sekaligus dari CSV.",
    en: "Your customers and suppliers — bulk import from CSV is available.",
  },
  descUbahGudang: {
    id: "Stok & riwayat mutasi tetap terikat pada gudang ini.",
    en: "Stock and movement history stay tied to this warehouse.",
  },
  descTambahGudang: {
    id: "Gudang Utama sudah dibuat otomatis.",
    en: "The Main Warehouse was created automatically.",
  },
  lacakLotKedaluwarsa: {
    id: "Lacak lot & tanggal kedaluwarsa (F&B/farmasi). Tanggal kedaluwarsa wajib diisi saat pembelian, dan barang keluar otomatis secara FEFO.",
    en: "Track lots & expiry dates (F&B/pharma) — the exp date is required on purchase, issued automatically by FEFO",
  },
  jasaTanpaStok: {
    id: "Jasa tanpa stok. Fakturnya tidak menggerakkan stok maupun HPP, jadi cocok untuk layanan, sewa, dan langganan",
    en: "Service (no stock) — invoices do not move stock/COGS; suited to services, rentals, subscriptions",
  },
  lacakNomorSeri: {
    id: "Lacak nomor seri — untuk barang bernilai tinggi/garansi (elektronik, mesin)",
    en: "Track serial numbers — for high-value or warrantied goods (electronics, machinery)",
  },
  contohSatuanBesar: { id: "mis. dus", en: "e.g. box" },
  contohFaktorSatuan: { id: "mis. 24", en: "e.g. 24" },
  satuanBesarSamaDengan: {
    id: "1 satuan besar = … satuan dasar",
    en: "1 bulk unit = … base units",
  },
  tidakAdaProdukCocok: { id: "Tidak ada produk yang cocok. Coba kata kunci lebih pendek, atau kosongkan pencarian.", en: "No matching products. Try a shorter keyword, or clear the search." },
  belumAdaProduk: { id: "Belum ada produk. Tambahkan produk agar stok, faktur, dan kasir bisa dipakai.", en: "No products yet. Add one so inventory, invoices, and the cashier can be used." },
  tidakAdaKontakCocok: { id: "Tidak ada kontak yang cocok. Coba kata kunci lebih pendek, atau kosongkan pencarian.", en: "No matching contacts. Try a shorter keyword, or clear the search." },
  belumAdaKontak: { id: "Belum ada kontak. Tambahkan pelanggan atau pemasok agar bisa dipilih saat membuat faktur.", en: "No contacts yet. Add a customer or supplier so they can be picked when invoicing." },
  tidakAdaGudangCocok: { id: "Tidak ada gudang yang cocok. Coba kata kunci lebih pendek, atau kosongkan pencarian.", en: "No matching warehouses. Try a shorter keyword, or clear the search." },
  belumAdaGudang: { id: "Belum ada gudang. Tambahkan minimal satu gudang sebelum mencatat stok masuk.", en: "No warehouses yet. Add at least one before recording stock in." },
  cobaKataKunciLain: { id: "Coba kata kunci lain.", en: "Try another keyword." },
  descBelumAdaProduk: {
    id: "Tambahkan produk pertama Anda lewat form di atas, atau impor sekaligus dari CSV.",
    en: "Add your first product with the form above, or import in bulk from CSV.",
  },
  descBelumAdaKontak: {
    id: "Tambahkan pelanggan atau pemasok pertama Anda lewat form di atas.",
    en: "Add your first customer or supplier with the form above.",
  },
  descBelumAdaGudang: {
    id: "Gudang Utama dibuat otomatis saat registrasi.",
    en: "The Main Warehouse is created automatically at registration.",
  },
  descArsipkan: {
    id: "akan disembunyikan dari daftar & form transaksi. Riwayat transaksi tetap utuh.",
    en: "will be hidden from lists and transaction forms. Transaction history stays intact.",
  },
  descArsipkanGudang: {
    id: "akan disembunyikan dari daftar & form transaksi. Riwayat mutasi stok tetap utuh.",
    en: "will be hidden from lists and transaction forms. Stock movement history stays intact.",
  },
  pelangganPemasok: { id: "Pelanggan & Pemasok", en: "Customer & Supplier" },
  contohNamaPelanggan: { id: "PT Pelanggan Setia", en: "PT Pelanggan Setia" },
  contohNamaGudang: { id: "Gudang Cabang Bandung", en: "Bandung Branch Warehouse" },
  barisKe: { id: "Baris", en: "Row" },
  // Laporan — pelunasan utang 16e (Fase 16n)
  labaBersih: { id: "Laba Bersih", en: "Net Profit" },
  rugiBersih: { id: "Rugi Bersih", en: "Net Loss" },
  labaBersihKecil: { id: "Laba bersih", en: "Net profit" },
  periodeSebelumnya: { id: "Periode sebelumnya", en: "Previous period" },
  saldoKasAwal: { id: "Saldo kas awal periode", en: "Opening cash balance" },
  saldoKasAkhir: { id: "Saldo kas akhir periode", en: "Closing cash balance" },
  totalKasMasuk: { id: "Total kas masuk", en: "Total cash in" },
  totalKasKeluar: { id: "Total kas keluar", en: "Total cash out" },
  perubahanKasBersih: { id: "Perubahan kas bersih", en: "Net change in cash" },
  seimbang: { id: "seimbang ✓", en: "balanced ✓" },
  tidakAdaPiutangBelumLunas: {
    id: "Tidak ada piutang yang belum lunas. 🎉",
    en: "No outstanding receivables. 🎉",
  },
  tidakAdaHutangBelumLunas: {
    id: "Tidak ada utang yang belum lunas. 🎉",
    en: "No outstanding payables. 🎉",
  },
  descCoretax: {
    id: "Sejak 2025 Coretax DJP menerima impor faktur keluaran dalam format",
    en: "Since 2025 Coretax DJP accepts output-invoice imports in",
  },
  descCoretax2: {
    id: "— unduh XML Coretax lalu impor di menu e-Faktur Coretax. Faktur non-mewah memakai kode transaksi 04 dengan DPP nilai lain (11/12); NPWP perusahaan diambil dari Pengaturan. CSV tetap tersedia sebagai rekap. Pembeli tanpa NPWP diekspor sebagai",
    en: "— download the Coretax XML then import it from the Coretax e-Faktur menu. Non-luxury invoices use transaction code 04 with an alternative DPP basis (11/12); the company NPWP comes from Settings. CSV remains available as a recap. Buyers without an NPWP are exported as",
  },
  // Keuangan — pelunasan utang 16f (Fase 16o)
  namaBaruAkun: { id: "Nama baru untuk akun", en: "New name for account" },
  akunBaris: { id: "Akun baris", en: "Account line" },
  debitBaris: { id: "Debit baris", en: "Debit line" },
  kreditBaris: { id: "Kredit baris", en: "Credit line" },
  pilihAkunOpsi: { id: "— pilih akun —", en: "— pick an account —" },
  tambahBaris: { id: "Tambah baris", en: "Add line" },
  seimbangSingkat: { id: "seimbang", en: "balanced" },
  belumSeimbang: { id: "belum seimbang", en: "not balanced" },
  postingJurnal: { id: "Posting jurnal", en: "Post entry" },
  contohMemoJurnal: { id: "Setoran modal awal", en: "Initial capital deposit" },
  contohNamaTemplate: { id: "mis. Sewa ruko bulanan", en: "e.g. Monthly shop rent" },
  tidakAdaJurnalCocok: {
    id: "Tidak ada jurnal yang cocok. Coba kata kunci lain, atau lebarkan rentang tanggalnya.",
    en: "No entries match. Try another keyword, or widen the date range.",
  },
  belumAdaJurnal: { id: "Belum ada jurnal. Jurnal terbentuk sendiri dari faktur, pembelian, dan kasir, atau dapat Anda catat manual di sini.", en: "No entries yet. Entries are created automatically by invoices, purchases, and the cashier — or record one manually here." },
  dibalikLabel: { id: "DIBALIK", en: "REVERSED" },
  pembalikLabel: { id: "PEMBALIK", en: "REVERSING" },
  periodeTerkunciBalik: {
    id: "Periode terkunci — balik per hari ini?",
    en: "Period locked — reverse as of today?",
  },
  balikJurnalTanya: { id: "Balik jurnal", en: "Reverse entry" },
  balikPerHariIni: { id: "Balik per hari ini", en: "Reverse as of today" },
  yaBalikJurnal: { id: "Ya, balik jurnal", en: "Yes, reverse entry" },
  tanggalHariIni: { id: "tanggal hari ini", en: "today's date" },
  descBalikTerkunci1: {
    id: "Tanggal jurnal asal berada di periode yang sudah ditutup. Jurnal pembalik dapat diposting dengan",
    en: "The original entry falls in a closed period. The reversing entry can be posted with",
  },
  descBalikTerkunci2: {
    id: "sehingga koreksi terjadi di periode berjalan.",
    en: "so the correction lands in the current period.",
  },
  descBalikBiasa: {
    id: "Jurnal pembalik (debit↔kredit ditukar) akan diposting dengan tanggal yang sama. Keduanya saling tertaut dan tidak bisa dibalik ulang — begitulah koreksi pada buku besar yang jejaknya utuh.",
    en: "A reversing entry (debit↔credit swapped) is posted with the same date. The two stay linked and cannot be reversed again — that is how corrections work in a ledger that keeps a full trail.",
  },
  memuat: { id: "Memuat…", en: "Loading…" },
  muatLebihLama: { id: "Muat lebih lama", en: "Load older" },
  saldoAkhir: { id: "Saldo akhir", en: "Closing balance" },
  bulananBerikutnya: { id: "bulanan · berikutnya", en: "monthly · next" },
  manualLabel: { id: "manual", en: "manual" },
  debitSingkat: { id: "D", en: "D" },
  kreditSingkat: { id: "K", en: "C" },
  // Proyek — pelunasan utang 16j (Fase 16p)
  selesaiStatus: { id: "selesai", en: "completed" },
  buatProyek: { id: "Buat proyek", en: "Create project" },
  waktuBerjalan: { id: "waktu berjalan", en: "of time elapsed" },
  lewatTenggat: { id: "lewat tenggat", en: "past due" },
  belumAdaTugasBerjadwal: { id: "Belum ada tugas berjadwal. Jadwalkan laporan agar dikirim ke email Anda sendiri.", en: "No scheduled tasks yet. Schedule a report so it is emailed to you automatically." },
  petunjukJadwalTugas: {
    id: "Klik “Jadwal” pada tugas di bawah untuk menetapkan tanggal mulai–selesai.",
    en: "Click “Schedule” on a task below to set its start and end dates.",
  },
  belumDitugaskan: { id: "Belum ditugaskan", en: "Unassigned" },
  kolomKosong: { id: "kosong", en: "empty" },
  petunjukSeretKartu: {
    id: "Seret kartu untuk memindahkan tahap. Progres proyek dihitung dari tugas selesai.",
    en: "Drag a card to move it between stages. Project progress is derived from completed tasks.",
  },
  terbuka: { id: "terbuka", en: "open" },
  belumKecil: { id: "belum", en: "to do" },
  prosesKecil: { id: "proses", en: "in progress" },
  selesaiKecil: { id: "selesai", en: "done" },
  sudahDitagih: { id: "sudah ditagih", en: "billed" },
  realisasi: { id: "Realisasi", en: "Actual" },
  dariAnggaran: { id: "dari anggaran", en: "of budget" },
  melebihiRab: { id: "— melebihi RAB", en: "— over budget" },
  descTimesheetEstimasi: {
    id: "Timesheet bersifat estimasi — gaji sudah dibebankan lewat penggajian, jadi tidak dijurnal ulang di sini agar tidak dobel-hitung.",
    en: "Timesheets are estimates — wages are already charged through payroll, so they are not posted again here to avoid double counting.",
  },
  // Stok — pelunasan utang 16d (Fase 16q)
  pembelianJudul: { id: "Pembelian", en: "Purchase" },
  penjualanJudul: { id: "Penjualan", en: "Sale" },
  penyesuaian: { id: "Penyesuaian", en: "Adjustment" },
  kartuStok: { id: "Kartu stok", en: "Stock card" },
  pilihProdukOpsi: { id: "— pilih produk —", en: "— pick a product —" },
  pilihOpsi: { id: "— pilih —", en: "— pick one —" },
  transferAksi: { id: "Transfer", en: "Transfer" },
  totalNilaiTerfilter: { id: "Total nilai (terfilter)", en: "Total value (filtered)" },
  totalNilaiPersediaan: { id: "Total nilai persediaan", en: "Total inventory value" },
  tidakAdaProdukStokKurang: {
    id: "Tidak ada produk dengan stok ≤",
    en: "No products with stock ≤",
  },
  descTransferGudang: {
    id: "Nilai persediaan berpindah pada biaya rata-rata — tanpa jurnal.",
    en: "Inventory value moves at average cost — no journal entry.",
  },
  descLotFefo: {
    id: "Lot aktif urut kedaluwarsa terdekat — penjualan mengambil lot paling awal kedaluwarsa lebih dulu (FEFO).",
    en: "Active lots sorted by nearest expiry — sales take the earliest-expiring lot first (FEFO).",
  },
  peringatanLotKedaluwarsa: {
    id: "lot kedaluwarsa dalam ≤ 30 hari — prioritaskan penjualannya atau tarik dari rak.",
    en: "lots expire within ≤ 30 days — prioritise selling them or pull them from the shelf.",
  },
  descBiayaRataRataBergerak: {
    id: "Nilai persediaan memakai metode biaya rata-rata bergerak (moving average).",
    en: "Inventory is valued using the moving average cost method.",
  },
  // Penggajian — pelunasan utang 16i (Fase 16r)
  nonaktif: { id: "nonaktif", en: "inactive" },
  aktifKecil: { id: "aktif", en: "active" },
  menungguKecil: { id: "menunggu", en: "pending" },
  disetujuiKecil: { id: "disetujui", en: "approved" },
  ditolakKecil: { id: "ditolak", en: "rejected" },
  diBawah: { id: "di bawah", en: "under" },
  hariSatuan: { id: "hari", en: "days" },
  sisaKecil: { id: "sisa", en: "left" },
  jurnalKecil: { id: "jurnal", en: "entry" },
  periodeLabel: { id: "Periode", en: "Period" },
  bonusLemburPotongan: {
    id: "Bonus, lembur & potongan — periode",
    en: "Bonus, overtime & deductions — period",
  },
  aktifDari: { id: "aktif dari", en: "active of" },
  karyawanSatuan: { id: "karyawan", en: "employees" },
  batalkanPenggajianTanya: { id: "Batalkan penggajian", en: "Void payroll run" },
  descCatatanPajakPayroll: {
    id: "tarif TER (PPh 21) & BPJS mengikuti ketentuan 2024. Peraturan dapat berubah — verifikasi angka dengan konsultan/peraturan terbaru sebelum penggajian resmi.",
    en: "TER (PPh 21) & BPJS rates follow the 2024 rules. Regulations can change — verify the figures with a consultant or the latest rules before running official payroll.",
  },
  belumAdaStruktur: {
    id: "Belum ada struktur — tambahkan departemen lalu tempatkan karyawan.",
    en: "No structure yet — add a department, then place employees into it.",
  },
  descBatalkanPenggajian1: {
    id: "Jurnal beban gaji akan dibalik, saldo kasbon karyawan dipulihkan, dan komponen ad-hoc dilepas agar bisa dipakai lagi. Periode",
    en: "The wage expense entry is reversed, employee advance balances are restored, and ad-hoc components are released for reuse. Period",
  },
  descBatalkanPenggajian2: {
    id: "bisa digaji ulang. Slip lama tetap tersimpan dengan tanda",
    en: "can be run again. Old payslips stay on record marked",
  },
  // Kasir & CRM — pelunasan utang 16g/16h (Fase 16s)
  perJam: { id: "Per jam", en: "Per hour" },
  transaksiSatuan: { id: "transaksi", en: "transactions" },
  refundKecil: { id: "refund", en: "refund" },
  refundAksi: { id: "Refund", en: "Refund" },
  tutupAksi: { id: "Tutup", en: "Close" },
  qtyRefund: { id: "Qty refund", en: "Refund qty" },
  sisaDari: { id: "sisa", en: "left of" },
  produkFallback: { id: "Produk", en: "Product" },
  sisaLabel: { id: "Sisa:", en: "Remaining:" },
  namaTahanAria: { id: "Nama tahan", en: "Hold name" },
  jadiPelanggan: { id: "jadi pelanggan", en: "converted to customer" },
  produkBaris: { id: "Produk baris", en: "Product line" },
  // Tahap lead — LEAD_STAGE_LABELS ada di packages/shared (berbahasa Indonesia
  // dan tidak boleh bergantung pada kamus web), jadi web memetakannya sendiri.
  tahapBaru: { id: "Baru", en: "New" },
  tahapDihubungi: { id: "Dihubungi", en: "Contacted" },
  tahapTerkualifikasi: { id: "Terkualifikasi", en: "Qualified" },
  tahapPenawaran: { id: "Penawaran", en: "Proposal" },
  tahapMenang: { id: "Menang", en: "Won" },
  tahapKalah: { id: "Kalah", en: "Lost" },
  statusDraf: { id: "draf", en: "draft" },
  statusTerkirim: { id: "terkirim", en: "sent" },
  statusDiterima: { id: "diterima", en: "accepted" },
  statusDitolak: { id: "ditolak", en: "rejected" },
  statusJadiFaktur: { id: "jadi faktur", en: "invoiced" },
  // Peta label packages/shared — dipetakan di sisi web (Fase 16t).
  // shared TIDAK boleh mengimpor kamus web (apps/api ikut memakainya), jadi
  // labelnya dibiarkan apa adanya di sana dan web memetakan kunci sendiri.
  industriRetail: { id: "Toko Retail / Kelontong", en: "Retail / Convenience store" },
  industriFnb: { id: "Kuliner / F&B", en: "Food & Beverage" },
  industriJasa: { id: "Jasa / Servis", en: "Services" },
  industriGrosir: { id: "Grosir / Distribusi", en: "Wholesale / Distribution" },
  aktivitasTelepon: { id: "Telepon", en: "Call" },
  aktivitasEmail: { id: "Email", en: "Email" },
  aktivitasPertemuan: { id: "Pertemuan", en: "Meeting" },
  aktivitasWhatsapp: { id: "WhatsApp", en: "WhatsApp" },
  aktivitasCatatan: { id: "Catatan", en: "Note" },
  bayarTunai: { id: "Tunai", en: "Cash" },
  bayarQris: { id: "QRIS", en: "QRIS" },
  bayarKartu: { id: "Kartu/EDC", en: "Card/EDC" },
  bayarEwallet: { id: "E-Wallet", en: "E-Wallet" },
  prioritasRendah: { id: "Rendah", en: "Low" },
  prioritasSedang: { id: "Sedang", en: "Medium" },
  prioritasTinggi: { id: "Tinggi", en: "High" },
  umurBelumJatuhTempo: { id: "Belum jatuh tempo", en: "Not yet due" },
  umur1_30: { id: "1–30 hari", en: "1–30 days" },
  umur31_60: { id: "31–60 hari", en: "31–60 days" },
  umur61_90: { id: "61–90 hari", en: "61–90 days" },
  umur90plus: { id: "> 90 hari", en: "> 90 days" },
  // Dasbor — Fase 16u
  penjualanHariTerakhir: { id: "Penjualan", en: "Sales" },
  hariTerakhirSuffix: { id: "hari terakhir", en: "days" },
  hariSuffix: { id: "hari", en: "days" },
  rentangGrafik: { id: "Rentang grafik", en: "Chart range" },
  belumAdaPenjualanRentang: { id: "Belum ada penjualan", en: "No sales in the last" },
  grafikPenjualanHarian: { id: "Grafik penjualan harian", en: "Daily sales chart" },
  grafikOmzetBulanan: { id: "Grafik omzet bulanan 6 bulan", en: "Six-month revenue chart" },
  fakturLewatJatuhTempo: { id: "Faktur lewat jatuh tempo", en: "Overdue invoices" },
  tidakAdaJatuhTempo: {
    id: "Tidak ada faktur yang lewat jatuh tempo. 👍",
    en: "No overdue invoices. 👍",
  },
  bebanPerluDiperiksa: { id: "Beban perlu diperiksa", en: "Expenses worth checking" },
  tidakAdaBebanMencurigakan: {
    id: "Tidak ada beban yang mencurigakan. 👍",
    en: "No unusual expenses. 👍",
  },
  kaliBiasanya: { id: "× biasanya", en: "× usual" },
  bulanIni: { id: "Bulan ini", en: "This month" },
  vsBiasanya: { id: "vs biasanya", en: "vs usual" },
  aktivitasTerakhir: { id: "Aktivitas terakhir", en: "Recent activity" },
  trenPenjualanBulanan: { id: "Tren penjualan bulanan", en: "Monthly sales trend" },
  laporanTerjadwal: { id: "Laporan terjadwal", en: "Scheduled reports" },
  menyusun: { id: "Menyusun…", en: "Building…" },
  susunBulanLalu: { id: "Susun bulan lalu", en: "Build last month" },
  ringkasanMingguanAi: { id: "Ringkasan mingguan AI", en: "AI weekly summary" },
  dibuatPada: { id: "Dibuat", en: "Generated" },
  bukaPanduCepat: { id: "Buka pandu cepat →", en: "Open quick guide →" },
  mulaiCepatJudul: { id: "Mulai cepat", en: "Quick start" },
  selesaiKata: { id: "selesai", en: "done" },
  // Langkah onboarding
  langkahProfil: {
    id: "Lengkapi profil perusahaan (alamat & NPWP)",
    en: "Complete the company profile (address & NPWP)",
  },
  langkahProduk: { id: "Tambah produk pertama", en: "Add your first product" },
  langkahKontak: { id: "Tambah pelanggan / pemasok", en: "Add a customer / supplier" },
  langkahFaktur: { id: "Posting faktur pertama", en: "Post your first invoice" },
  langkahTim: { id: "Undang anggota tim", en: "Invite a team member" },
  // Tautan cepat
  tautanPembelian: {
    id: "Catat pembelian untuk mengisi stok",
    en: "Record a purchase to stock up",
  },
  tautanPenjualan: {
    id: "Buat faktur — jurnal & stok otomatis",
    en: "Create an invoice — entries & stock handled for you",
  },
  tautanLabaRugi: {
    id: "Lihat laba rugi & neraca kapan saja",
    en: "View profit & loss and the balance sheet any time",
  },
  tautanPengaturan: { id: "Undang tim dengan peran berbeda", en: "Invite your team with roles" },
  labaRugiJudul: { id: "Laba Rugi", en: "Profit & Loss" },
  pengaturanJudul: { id: "Pengaturan", en: "Settings" },
  // Deskripsi kartu
  descGrafikHarian: {
    id: "Total faktur penjualan per hari (dokumen dibatalkan tidak dihitung).",
    en: "Total sales invoices per day (voided documents are excluded).",
  },
  descMulaiDariFaktur: {
    id: "— mulai dari faktur pertama Anda di menu Penjualan.",
    en: "— start with your first invoice from the Sales menu.",
  },
  descTagihSegera: {
    id: "Tagih segera agar arus kas tetap sehat.",
    en: "Collect promptly to keep cash flow healthy.",
  },
  descBebanMelonjak: {
    id: "Beban bulan ini yang melonjak jauh dari kebiasaan.",
    en: "This month's expenses that jumped well above the usual.",
  },
  descAktivitasTerakhir: {
    id: "Siapa melakukan apa — cuplikan riwayat audit.",
    en: "Who did what — a slice of the audit trail.",
  },
  descLimaLangkah: {
    id: "Lima langkah agar pembukuan Anda langsung berjalan.",
    en: "Five steps to get your books running right away.",
  },
  descTrenBulanan: {
    id: "Total omzet faktur per bulan, 6 bulan terakhir.",
    en: "Total invoiced revenue per month, last six months.",
  },
  descBelumAdaOmzet: {
    id: "Belum ada omzet 6 bulan terakhir — grafik terisi otomatis begitu ada faktur penjualan.",
    en: "No revenue in the last six months — the chart fills in as soon as sales invoices exist.",
  },
  descLaporanTerjadwal: {
    id: "Rekap penjualan bulanan yang disusun otomatis tiap awal bulan.",
    en: "A monthly sales recap built automatically at the start of each month.",
  },
  descBelumAdaRekap: {
    id: "Belum ada rekap. Cron menyusun rekap bulan lalu tiap awal bulan",
    en: "No recap yet. Cron builds last month's recap at the start of each month",
  },
  descSusunManual: { id: ", atau susun manual di atas.", en: ", or build it manually above." },
  descRingkasanAi: {
    id: "Narasi singkat kinerja minggu ini vs minggu lalu — dihitung dari buku Anda.",
    en: "A short narrative of this week versus last — computed from your books.",
  },
  descDiperbaruiMingguan: {
    id: "· diperbarui otomatis tiap minggu.",
    en: "· refreshed automatically each week.",
  },
  descAiTakTersedia: {
    id: "Fitur AI belum tersedia di lingkungan ini — fitur lain tetap berjalan normal.",
    en: "AI is not available in this environment — everything else works as normal.",
  },
  descRingkasanGagal: {
    id: "Ringkasan belum bisa dimuat.",
    en: "The summary could not be loaded.",
  },
  // Nama widget (konstanta tingkat modul → UiKey)
  widgetKpi: { id: "Ringkasan angka (KPI)", en: "Key numbers (KPI)" },
  widgetTrenHarian: { id: "Grafik penjualan 30 hari", en: "30-day sales chart" },
  widgetTrenBulanan: { id: "Grafik tren bulanan", en: "Monthly trend chart" },
  widgetJatuhTempo: { id: "Faktur jatuh tempo", en: "Overdue invoices" },
  widgetAktivitas: { id: "Aktivitas / mulai dari sini", en: "Activity / start here" },
  sesuaikanDashboard: { id: "Sesuaikan dashboard", en: "Customise dashboard" },
  descSesuaikanDashboard: {
    id: "Pilih widget yang ingin Anda tampilkan. Tersimpan di perangkat ini.",
    en: "Pick the widgets you want to see. Saved on this device.",
  },
  gagalMuatRingkasan: {
    id: "Gagal memuat ringkasan dashboard.",
    en: "Could not load the dashboard summary.",
  },
  cobaLagi: { id: "Coba lagi", en: "Try again" },
  bukaLaporanSumber: { id: "buka laporan sumber", en: "open source report" },
  vsBulanLalu: { id: "vs bulan lalu", en: "vs last month" },
  vsTahunLalu: { id: "vs tahun lalu", en: "vs last year" },
  // Temuan pemeriksaan mata Fase 21f: label medan & sel tabel di halaman
  // Manufaktur masih Indonesia di mode Inggris. Cek F1h yang ada hanya memeriksa
  // JUDUL kartu, jadi kebocoran di tingkat medan lolos begitu saja.
  aksiLabel: { id: "Aksi", en: "Action" },
  tarifPerJam: { id: "Tarif/jam (Rp)", en: "Rate/hour (Rp)" },
  perintahProduksiLabel: { id: "Perintah produksi", en: "Production order" },
  statusSelesai: { id: "selesai", en: "done" },
  // Fase 21f — biaya konversi produksi.
  biayaTenagaKerjaBatch: { id: "Upah tenaga kerja (total)", en: "Labour cost (total)" },
  biayaOverheadBatch: { id: "Overhead pabrik (total)", en: "Factory overhead (total)" },
  descBiayaKonversi: {
    id: "Diisi untuk SATU perintah produksi, bukan per unit. Keduanya masuk ke nilai persediaan barang jadi dan dijurnal ke akun Beban Produksi Diserap, sehingga upah & listrik tidak terhitung dua kali.",
    en: "Entered per production order, not per unit. Both are capitalised into finished-goods inventory and posted to Absorbed Production Cost, so wages and utilities are not counted twice.",
  },
  // Fase 21e — form lead publik.
  formLeadPublik: { id: "Form lead publik", en: "Public lead form" },
  descFormLeadPublik: {
    id: "Tempel potongan HTML ini di landing page atau bio media sosial Anda. Kiriman masuk langsung ke daftar Lead di bawah. Tokennya ikut terlihat di halaman publik, dan itu wajar. Bila ada yang menyalahgunakannya, tekan Putar Ulang Token lalu pasang potongan yang baru.",
    en: "Paste this HTML snippet on your landing page or social media bio. Submissions land straight in the Leads list below. The token is visible on the public page — that is expected; if anyone abuses it, hit Rotate token and paste the new snippet.",
  },
  terbitkanFormLead: { id: "Terbitkan form", en: "Publish form" },
  putarUlangToken: { id: "Putar Ulang Token", en: "Rotate token" },
  matikanFormLead: { id: "Matikan form", en: "Disable form" },
  belumAdaFormLead: { id: "Form lead publik belum diterbitkan.", en: "The public lead form has not been published yet." },
  salinCuplikan: { id: "Salin cuplikan", en: "Copy snippet" },
  // Isi form yang dihasilkan cuplikan — ikut bahasa aplikasi supaya pemilik
  // ber-antarmuka Inggris tidak menempelkan form berbahasa Indonesia.
  phFormNama: { id: "Nama", en: "Name" },
  phFormEmail: { id: "Email", en: "Email" },
  phFormHp: { id: "No. HP", en: "Phone" },
  phFormPesan: { id: "Pesan", en: "Message" },
  phFormKirim: { id: "Kirim", en: "Send" },
  // Temuan pemeriksaan mata Fase 21e: tertinggal Indonesia di mode Inggris
  // pada halaman Pipeline — teks yang dirangkai dari angka, jadi tak terbaca
  // penyapu maupun cek "tanpa teks Indonesia" yang mencari kalimat utuh.
  leadTerbukaSuffix: { id: "lead terbuka", en: "open leads" },
  aktivitasSuffix: { id: "aktivitas", en: "activities" },
  leadDitambahkan: { id: "Lead ditambahkan.", en: "Lead added." },
  mulaiDariSini: { id: "Mulai dari sini", en: "Start here" },
  descAlurHarian: { id: "Alur kerja harian yang umum.", en: "Common day-to-day workflows." },
  menuPenjualan: { id: "Penjualan", en: "Sales" },

  // Kas & Bank + rekonsiliasi rekening koran (Fase 19c).
  // Istilah perbankan Indonesia yang memang nama baku ("rekening koran")
  // diterjemahkan deskriptif ke "bank statement", bukan dibiarkan apa adanya —
  // berbeda dari PPN/NPWP yang merupakan nama resmi pajak.
  mutasiAkun: { id: "Mutasi", en: "Transactions" },
  descMutasi: {
    id: "Riwayat keluar-masuk beserta saldo berjalan — sama dengan buku besar akun ini.",
    en: "In and out history with a running balance — the same as this account's ledger.",
  },
  belumAdaMutasi: { id: "Belum ada mutasi pada akun ini. Mutasi muncul begitu ada jurnal yang menyentuh akun ini.", en: "No transactions on this account yet. They appear once an entry touches this account." },
  masuk: { id: "Masuk", en: "In" },
  keluar: { id: "Keluar", en: "Out" },
  rekonsiliasiKoran: { id: "Rekonsiliasi rekening koran", en: "Bank statement reconciliation" },
  descRekonsiliasi: {
    id: "Unduh mutasi (CSV) dari internet banking, tempel di sini — sistem mencocokkan otomatis berdasarkan nominal yang sama dan tanggal berdekatan (±3 hari).",
    en: "Download your transactions (CSV) from internet banking and paste them here — matching is automatic, by equal amount and nearby date (±3 days).",
  },
  labelCsvMutasi: {
    id: "Tempel CSV mutasi — kolom: tanggal; keterangan; jumlah (+ masuk / − keluar)",
    en: "Paste transaction CSV — columns: date; description; amount (+ in / − out)",
  },
  mengimpor: { id: "Mengimpor…", en: "Importing…" },
  imporCocokkan: { id: "Impor & cocokkan otomatis", en: "Import & auto-match" },
  cocok: { id: "cocok", en: "matched" },
  belumCocok: { id: "belum cocok", en: "unmatched" },
  // Rangkaian awalan/akhiran, bukan penyulihan `{n}` — mengikuti pola yang
  // sudah dipakai kamus ini sejak Fase 16 (mis. `penjualanHariTerakhir` +
  // angka + `hariTerakhirSuffix`). Memperkenalkan mekanisme penyulihan kedua
  // hanya untuk satu berkas akan membuat dua gaya bersaing di kamus yang sama.
  //
  // `dariPrefix` sengaja BUKAN memakai kunci `dari` yang sudah ada: kunci itu
  // berisi "Dari"/"From" sebagai label rentang tanggal — nama yang cocok, makna
  // yang tidak (pelajaran Fase 16u).
  dariPrefix: { id: "dari", en: "of" },
  barisMutasiSuffix: { id: "baris mutasi", en: "statement rows" },
  keteranganBank: { id: "Keterangan bank", en: "Bank description" },
  lepasCocok: { id: "lepas", en: "unmatch" },
  cocokkan: { id: "Cocokkan", en: "Match" },
  pilihBarisJurnal: { id: "— pilih baris jurnal —", en: "— pick a journal line —" },
  ariaPilihBarisJurnal: {
    id: "Pilih baris jurnal untuk dicocokkan",
    en: "Pick a journal line to match",
  },
  belumAdaKoranDiimpor: {
    id: "Belum ada mutasi rekening koran yang diimpor untuk akun ini.",
    en: "No bank statement rows imported for this account yet.",
  },
  // Galat pengurai CSV — ditampilkan ke pengguna, jadi ikut dwibahasa.
  // Disusun sebagai awalan "Baris <n>: " + inti pesan, supaya nomor barisnya
  // disisipkan pemanggil tanpa penyulihan. Awalannya memakai `barisKe` yang
  // SUDAH ADA (Fase 16) — sempat ditambahkan lagi di sini dengan isi persis
  // sama, dan TypeScript menangkapnya sebagai TS1117.
  csvButuh3Kolom: {
    id: "butuh 3 kolom (tanggal;keterangan;jumlah)",
    en: "needs 3 columns (date;description;amount)",
  },
  csvTanggalTakDikenal: { id: "tanggal tidak dikenal", en: "unrecognised date" },
  csvPakaiFormatTanggal: {
    id: "pakai YYYY-MM-DD atau DD/MM/YYYY",
    en: "use YYYY-MM-DD or DD/MM/YYYY",
  },
  csvJumlahTakValid: { id: "jumlah tidak valid", en: "invalid amount" },
  tanpaKeterangan: { id: "(tanpa keterangan)", en: "(no description)" },
  csvTakTerbaca: {
    id: "Tidak ada baris mutasi yang bisa dibaca. Pastikan berkasnya CSV rekening koran, bukan PDF atau Excel.",
    en: "No statement rows could be read. Make sure the file is a bank statement CSV, not a PDF or Excel file.",
  },

  // Catat Transaksi (Fase 19d) — wizard berbahasa sehari-hari, jadi
  // terjemahannya sengaja memakai kata awam, bukan istilah akuntansi.
  // "Prive" dipertahankan apa adanya: itu istilah pembukuan baku Indonesia,
  // dan padanan Inggrisnya ("owner's drawings") justru lebih teknis.
  uangMasuk: { id: "Uang Masuk", en: "Money In" },
  uangKeluar: { id: "Uang Keluar", en: "Money Out" },
  pindahDana: { id: "Pindah dana", en: "Move funds" },
  jenisTransaksi: { id: "Jenis transaksi", en: "Transaction type" },
  katListrikAir: { id: "Bayar listrik, air & internet", en: "Electricity, water & internet" },
  katSewaTempat: { id: "Sewa tempat", en: "Rent" },
  katGajiKaryawan: { id: "Gaji karyawan", en: "Staff salaries" },
  katPerlengkapan: { id: "Perlengkapan & operasional", en: "Supplies & operations" },
  katBayarHutang: { id: "Bayar utang usaha", en: "Pay trade payables" },
  katPrive: { id: "Prive (ambil uang pribadi)", en: "Prive (owner withdrawal)" },
  katSetoranModal: { id: "Setoran modal", en: "Capital injection" },
  katPendapatanLain: { id: "Pendapatan di luar faktur", en: "Income outside invoices" },
  katPelunasanPiutang: {
    id: "Terima pelunasan piutang (di luar faktur)",
    en: "Receivable settlement (outside invoices)",
  },
  jumlahRupiah: { id: "Jumlah (Rp)", en: "Amount (Rp)" },
  contohNominal: { id: "mis. 500.000", en: "e.g. 500,000" },
  dariDompet: { id: "Dari dompet", en: "From wallet" },
  dompetKasBank: { id: "Dompet (kas/bank)", en: "Wallet (cash/bank)" },
  keDompet: { id: "Ke dompet", en: "To wallet" },
  uangnyaDariMana: { id: "Uangnya dari mana?", en: "Where did the money come from?" },
  untukApa: { id: "Untuk apa?", en: "What is it for?" },
  pilihKategoriOpsi: { id: "— pilih kategori —", en: "— pick a category —" },
  kategoriLainnya: { id: "Lainnya — pilih akun sendiri…", en: "Other — pick an account…" },
  akunTujuan: { id: "Akun tujuan", en: "Target account" },
  contohCatatanListrik: {
    id: "mis. token listrik bulan Juli",
    en: "e.g. July electricity token",
  },
  yangAkanDicatat: { id: "Yang akan dicatat:", en: "What will be recorded:" },
  menyimpanEllipsis: { id: "Menyimpan…", en: "Saving…" },
  catatAksi: { id: "Catat", en: "Record" },
  hanyaLihatCatat: {
    id: "Peran Anda hanya bisa melihat — minta Owner/Admin untuk mencatat transaksi.",
    en: "Your role is view-only — ask an Owner/Admin to record transactions.",
  },
  isiJumlahDulu: { id: "Isi jumlah uangnya dulu.", en: "Enter the amount first." },
  pilihDompetKategoriDulu: {
    id: "Pilih dompet dan kategori dulu.",
    en: "Pick a wallet and a category first.",
  },
  transaksiTersimpan: { id: "transaksi tersimpan.", en: "transaction saved." },
  bagaimanaDibukukan: { id: "Bagaimana ini dibukukan?", en: "How is this booked?" },
  descBagaimanaDibukukan: {
    id: "Setiap catatan menjadi jurnal 2 baris yang seimbang — sama seperti dicatat akuntan. Rinciannya bisa dilihat di Jurnal Umum (menu bisa disembunyikan lewat Mode Sederhana di Pengaturan).",
    en: "Each record becomes a balanced two-line journal entry — exactly as an accountant would post it. The detail is visible in the General Journal (the menu can be hidden via Simple Mode in Settings).",
  },
  // Pratinjau kalimat: dirangkai dari potongan, mengikuti konvensi awalan/
  // akhiran kamus ini (lihat catatan di bagian Kas & Bank).
  pratinjauMasukKe: { id: "masuk ke", en: "goes into" },
  pratinjauDari: { id: "dari", en: "from" },
  pratinjauKeluarDari: { id: "keluar dari", en: "leaves" },
  pratinjauUntuk: { id: "untuk", en: "for" },
  pratinjauDipindahDari: { id: "dipindahkan dari", en: "moved from" },
  pratinjauKe: { id: "ke", en: "to" },

  // Pajak (Fase 19e).
  //
  // Batas yang dipakai: **nama resmi tidak diterjemahkan, konsep diterjemahkan.**
  // "PPh Final", "PPh 23", "SPT Masa PPN 1111", "Bukti Potong" adalah nama
  // dokumen/pungutan resmi Direktorat Jenderal Pajak — menerjemahkannya justru
  // menyulitkan pembaca yang harus mencocokkannya dengan formulir asli.
  // Sebaliknya "Pajak Keluaran"/"Pajak Masukan" adalah konsep yang punya padanan
  // baku (output/input VAT), dan `tanpaPpn` sejak Fase 16 memang sudah
  // menerjemahkan PPN menjadi "VAT" — jadi diikuti agar konsisten.
  //
  // `masaPajak` sengaja BUKAN memakai kunci `masa` yang sudah ada: isinya
  // "masa"/"life" untuk masa manfaat aset — nama cocok, makna tidak (Fase 16u).
  tabPphFinal: { id: "PPh Final 0,5%", en: "PPh Final 0.5%" },
  tabPph23: { id: "PPh 23 (Bukti Potong)", en: "PPh 23 (withholding slip)" },
  tabSptPpn: { id: "SPT Masa PPN", en: "Periodic VAT return (SPT Masa PPN)" },
  setorPphFinalMasa: { id: "Setor PPh Final masa", en: "Pay PPh Final for a period" },
  descSetorPphFinal: {
    id: "Omzet (peredaran bruto) dihitung otomatis dari faktur penjualan bulan terpilih × 0,5%.",
    en: "Gross revenue is computed automatically from the selected month's sales invoices × 0.5%.",
  },
  masaPajak: { id: "Masa (bulan)", en: "Period (month)" },
  bayarDari: { id: "Bayar dari", en: "Pay from" },
  pilihAkunKasBank: { id: "— pilih akun kas/bank —", en: "— pick a cash/bank account —" },
  tanggalSetor: { id: "Tanggal setor", en: "Payment date" },
  catatSetoran: { id: "Catat setoran", en: "Record payment" },
  omzetMasa: { id: "Omzet masa", en: "Revenue for" },
  masaSudahDicatat: { id: "Masa ini sudah dicatat.", en: "This period is already recorded." },
  belumAdaOmzetMasa: {
    id: "Belum ada omzet pada masa ini. Angkanya terisi sendiri begitu ada faktur penjualan diposting.",
    en: "No revenue in this period yet. It fills in on its own once a sales invoice is posted.",
  },
  riwayatSetoranPphFinal: {
    id: "Riwayat setoran PPh Final",
    en: "PPh Final payment history",
  },
  belumAdaSetoran: { id: "Belum ada setoran tercatat. Catat setoran pajak agar utangnya berkurang.", en: "No payments recorded yet. Record a tax payment so the liability is reduced." },
  masaKolom: { id: "Masa", en: "Period" },
  tarif: { id: "Tarif", en: "Rate" },
  tglSetor: { id: "Tgl setor", en: "Paid on" },
  // PPh 23
  buatBuktiPotong23: { id: "Buat bukti potong PPh 23", en: "Create a PPh 23 withholding slip" },
  descBuktiPotong23: {
    id: "Potong PPh 23 atas jasa/sewa/royalti/dll dari rekanan. Menciptakan Utang PPh 23 untuk disetor.",
    en: "Withhold PPh 23 on services/rent/royalties/etc. from a counterparty. Creates a PPh 23 payable to remit.",
  },
  pilihRekanan: { id: "— pilih rekanan —", en: "— pick a counterparty —" },
  contohNominalBesar: { id: "mis. 10.000.000", en: "e.g. 10,000,000" },
  akunSumber: { id: "Akun sumber", en: "Source account" },
  hutangUsahaAtauKas: { id: "— utang usaha / kas —", en: "— trade payable / cash —" },
  buatBuktiPotong: { id: "Buat bukti potong", en: "Create slip" },
  belumAdaBuktiPotong: { id: "Belum ada bukti potong. Buat bukti potong saat memotong PPh 23 dari rekanan.", en: "No withholding slips yet. Create one when you withhold PPh 23 from a counterparty." },
  // `nomor` sudah ada sejak Fase 16 dengan isi sama — tidak ditambah ulang.
  belumSetor: { id: "Belum setor", en: "Not yet remitted" },
  kasBankSingkat: { id: "kas/bank", en: "cash/bank" },
  setorAksi: { id: "Setor", en: "Remit" },
  objekPajak: { id: "Objek", en: "Object" },
  // Objek PPh 23 — peta kode → kunci di sisi web (pola Fase 16t: packages/shared
  // tetap berbahasa Indonesia karena apps/api ikut memakainya).
  pph23Jasa: {
    id: "Jasa (teknik/manajemen/konsultan/lainnya)",
    en: "Services (engineering/management/consulting/other)",
  },
  pph23Sewa: {
    id: "Sewa & penghasilan lain terkait harta",
    en: "Rent & other property-related income",
  },
  pph23Royalti: { id: "Royalti", en: "Royalties" },
  pph23Bunga: { id: "Bunga", en: "Interest" },
  pph23Dividen: { id: "Dividen", en: "Dividends" },
  // SPT Masa PPN
  ppnKurangBayar: { id: "PPN Kurang Bayar (setor)", en: "VAT payable (to remit)" },
  sptMasaPpn1111: { id: "SPT Masa PPN 1111", en: "SPT Masa PPN 1111 (periodic VAT return)" },
  descSptMasaPpn: {
    id: "Rekap Pajak Keluaran (A: faktur penjualan ber-PPN) vs Pajak Masukan (B: pembelian ber-PPN).",
    en: "Summary of output VAT (A: sales invoices with VAT) vs input VAT (B: purchases with VAT).",
  },
  pajakKeluaranA: {
    id: "A. Pajak Keluaran (faktur penjualan)",
    en: "A. Output VAT (sales invoices)",
  },
  pajakMasukanB: { id: "B. Pajak Masukan (pembelian)", en: "B. Input VAT (purchases)" },
  tidakAdaTransaksiPpn: {
    id: "Tidak ada transaksi ber-PPN pada masa ini. Faktur dengan tarif 0% memang tidak masuk ke sini.",
    en: "No VAT transactions in this period. Invoices at 0% do not appear here.",
  },
  lawanTransaksi: { id: "Lawan Transaksi", en: "Counterparty" },
  // Pesan toast. Program 16b–16k sengaja mengecualikan toast, tetapi sejak 19c
  // pesan umpan-balik ikut diterjemahkan — halaman yang antarmukanya Inggris
  // tetapi konfirmasinya Indonesia terasa setengah jadi.
  toastSetoranPphTercatat: {
    id: "Setoran PPh Final tercatat & terjurnal.",
    en: "PPh Final payment recorded and journalised.",
  },
  toastPph23Disetor: { id: "PPh 23 disetor.", en: "PPh 23 remitted." },

  // Pengadaan (Fase 19f).
  //
  // Dua kunci sengaja dibuat baru meski namanya "sudah ada" — persis jebakan
  // Fase 16u, dan di berkas ini muncul dua kali sekaligus:
  //   `diterima`  = "Diterima"/"Accepted" (persetujuan)  ≠ barang DITERIMA
  //   `jumlah`    = "Jumlah"/"Amount" (nominal rupiah)   ≠ jumlah UNIT barang
  // Memakainya di sini akan menghasilkan terjemahan yang sekilas benar tetapi
  // salah arti.
  qtyBarang: { id: "Jumlah", en: "Qty" },
  barangDiterima: { id: "Diterima", en: "Received" },
  prJudul: { id: "1. Permintaan pembelian (PR)", en: "1. Purchase requisition (PR)" },
  descPr: {
    id: "Ajukan daftar barang yang dibutuhkan — belum ada harga/pemasok. Perlu disetujui sebelum jadi pesanan.",
    en: "Submit a list of items needed — no prices or supplier yet. Needs approval before becoming an order.",
  },
  // `pilihProdukOpsi` sudah ada (Fase 16) dengan isi sama — dipakai ulang.
  catatanBaris: { id: "Catatan baris", en: "Line note" },
  catatanPermintaan: { id: "Catatan permintaan", en: "Requisition note" },
  catatanPermintaanOpsional: {
    id: "Catatan permintaan (opsional)",
    en: "Requisition note (optional)",
  },
  barisAksi: { id: "Baris", en: "Line" },
  belumAdaPermintaan: { id: "Belum ada permintaan pembelian. Ajukan permintaannya, dan setelah disetujui ia menjadi pesanan ke pemasok.", en: "No purchase requisitions yet. Raise one — once approved it becomes a supplier order." },
  poJudul: { id: "2. Pesanan pembelian (PO)", en: "2. Purchase order (PO)" },
  descPo: {
    id: "Buat pesanan ke pemasok — pilih pemasok, gudang tujuan, harga per barang. Bisa menarik dari permintaan yang disetujui.",
    en: "Create an order to a supplier — pick the supplier, destination warehouse, and unit prices. Can be pulled from an approved requisition.",
  },
  dariPermintaanOpsional: { id: "Dari permintaan (opsional)", en: "From requisition (optional)" },
  barangSuffix: { id: "barang)", en: "items)" },
  pilihPemasokOpsi: { id: "— pilih pemasok —", en: "— pick a supplier —" },
  gudangTujuan: { id: "Gudang tujuan", en: "Destination warehouse" },
  pilihGudangOpsi: { id: "— pilih gudang —", en: "— pick a warehouse —" },
  tanggalPesan: { id: "Tanggal pesan", en: "Order date" },
  buatPesanan: { id: "Buat pesanan", en: "Create order" },
  belumAdaPesanan: { id: "Belum ada pesanan", en: "No orders yet" },
  descBelumAdaPesanan: {
    id: "Buat pesanan pembelian ke pemasok untuk mulai.",
    en: "Create a purchase order to a supplier to get started.",
  },
  jumlahBarangDiterima: { id: "Jumlah barang diterima:", en: "Quantity received:" },
  tanggalTerima: { id: "Tanggal terima", en: "Receipt date" },
  terimaBuatFaktur: { id: "Terima & buat faktur", en: "Receive & create invoice" },
  terimaBarang: { id: "Terima barang", en: "Receive goods" },
  // Sengaja BUKAN `batalkan` yang sudah ada: kunci itu berarti "Void"
  // (membatalkan faktur), sedangkan di sini yang dibatalkan adalah PESANAN.
  batalkanPesanan: { id: "Batalkan pesanan", en: "Cancel order" },
  grnJudul: { id: "3. Penerimaan barang (GRN)", en: "3. Goods receipt (GRN)" },
  descGrn: {
    id: "Riwayat penerimaan — tiap penerimaan otomatis menjadi faktur pembelian & menambah stok.",
    en: "Receipt history — each receipt automatically becomes a purchase invoice and adds stock.",
  },
  belumAdaPenerimaan: { id: "Belum ada penerimaan barang. Penerimaan otomatis menjadi faktur pembelian dan stok masuk.", en: "No goods receipts yet. A receipt automatically becomes a purchase invoice and stock in." },
  toastPermintaanPrefix: { id: "Permintaan", en: "Requisition" },
  toastDiajukan: { id: "diajukan.", en: "submitted." },
  toastPermintaanDisetujui: { id: "Permintaan disetujui.", en: "Requisition approved." },
  toastPermintaanDitolak: { id: "Permintaan ditolak.", en: "Requisition rejected." },
  toastPesananDibatalkan: { id: "Pesanan dibatalkan.", en: "Order cancelled." },

  // Pesanan Penjualan (Fase 19g).
  daftarPesanan: { id: "Daftar pesanan", en: "Order list" },
  descDaftarPesanan: {
    id: "Kelola tiap tahap: uang muka, kirim (surat jalan), buat faktur.",
    en: "Manage each stage: down payment, delivery note, invoicing.",
  },
  descBelumAdaPesananSo: {
    id: "Buat pesanan penjualan untuk mulai.",
    en: "Create a sales order to get started.",
  },
  pesananBaru: { id: "Pesanan baru", en: "New order" },
  descPesananBaru: {
    id: "Catat pesanan pelanggan — belum menggerakkan stok/pembukuan.",
    en: "Record a customer order — no stock or bookkeeping movement yet.",
  },
  pilihPelangganOpsi: { id: "— pilih pelanggan —", en: "— pick a customer —" },
  perkiraanKirim: { id: "Perkiraan kirim (opsional)", en: "Expected delivery (optional)" },
  // `hargaSatuan` ("Harga satuan"/"Unit price") sudah ada sejak Fase 16 dan
  // justru lebih tepat daripada "Harga" saja — dipakai ulang.
  diskonPersen: { id: "Diskon %", en: "Discount %" },
  kirimSuratJalan: { id: "Kirim (surat jalan)", en: "Ship (delivery note)" },
  uangMuka: { id: "Uang muka", en: "Down payment" },
  // `buatFaktur` sudah ada sejak Fase 16 dengan makna sama — dipakai ulang.
  cetakSuratJalan: { id: "Cetak surat jalan", en: "Print delivery note" },
  nominalUangMuka: { id: "Nominal uang muka", en: "Down payment amount" },
  placeholderNominalDp: { id: "Nominal DP", en: "DP amount" },
  akunKasBank: { id: "Akun kas/bank", en: "Cash/bank account" },
  simpanDp: { id: "Simpan DP", en: "Save DP" },
  fakturPrefix: { id: "faktur", en: "invoice" },

  // Manufaktur & QC (Fase 19h).
  // "BoM" dan "work center" dipertahankan: keduanya istilah manufaktur yang
  // dipakai apa adanya di industri Indonesia, dan pemakainya justru mencari
  // kata itu. "Routing" sama — diberi keterangan, bukan diganti.
  resepBom: { id: "Resep produk (BoM)", en: "Bill of materials (BoM)" },
  descResepBom: {
    id: "Komponen & jumlah untuk menghasilkan produk jadi.",
    en: "Components and quantities needed to make a finished product.",
  },
  produkJadi: { id: "Produk jadi", en: "Finished product" },
  cariProdukPendek: { id: "Cari produk…", en: "Search products…" },
  cariKomponen: { id: "Cari komponen…", en: "Search components…" },
  hasilPerResep: { id: "Hasil per resep", en: "Output per recipe" },
  hapusKomponen: { id: "Hapus komponen", en: "Remove component" },
  // `tambahKomponen` & `pilihOpsi` sudah ada sejak Fase 16 — dipakai ulang.
  simpanResep: { id: "Simpan resep", en: "Save recipe" },
  descJalankanProduksi: {
    id: "Jalankan produksi berdasarkan resep.",
    en: "Run production from a recipe.",
  },
  produkHarusPunyaResep: {
    id: "Produk (harus punya resep)",
    en: "Product (must have a recipe)",
  },
  gudangOpsi: { id: "— gudang —", en: "— warehouse —" },
  buatPerintah: { id: "Buat perintah", en: "Create order" },
  daftarResep: { id: "Daftar resep", en: "Recipe list" },
  belumAdaResep: { id: "Belum ada resep", en: "No recipes yet" },
  descBelumAdaResep: {
    id: "Buat resep (BoM) untuk mulai memproduksi.",
    en: "Create a bill of materials to start producing.",
  },
  hasilSuffix: { id: "hasil", en: "output" },
  perResepSuffix: { id: "/ resep", en: "/ recipe" },
  gudangKarantina: {
    id: "Gudang karantina (untuk QC gagal)",
    en: "Quarantine warehouse (for failed QC)",
  },
  belumAdaProduksi: { id: "Belum ada produksi", en: "No production yet" },
  descBelumAdaProduksi: {
    id: "Buat perintah produksi dari resep yang ada — bahannya berkurang dan hasilnya masuk stok otomatis.",
    en: "Create a production order from an existing recipe — materials are consumed and output enters stock automatically.",
  },
  biayaTotal: { id: "Biaya total", en: "Total cost" },
  descWorkCenter: {
    id: "Stasiun/tahap produksi dengan tarif per jam, dipakai untuk routing.",
    en: "Production stations/stages with an hourly rate, used for routing.",
  },
  belumAdaWorkCenter: { id: "Belum ada work center. Tambahkan stasiun kerja sebelum menyusun tahapan routing.", en: "No work centers yet. Add a workstation before defining routing stages." },
  routingProduksi: {
    id: "Routing produksi (biaya standar vs aktual)",
    en: "Production routing (standard vs actual cost)",
  },
  descRoutingProduksi: {
    id: "Tahapan proses per perintah produksi di tiap work center — bandingkan biaya standar dengan aktual (WIP).",
    en: "Process stages per production order at each work center — compare standard cost against actual (WIP).",
  },
  pilihPerintahProduksi: {
    id: "— pilih perintah produksi —",
    en: "— pick a production order —",
  },
  namaTahap: { id: "Nama tahap", en: "Stage name" },
  biayaStandar: { id: "Biaya standar", en: "Standard cost" },
  tambahTahap: { id: "Tambah tahap", en: "Add stage" },
  belumAdaRouting: { id: "Belum ada tahapan routing. Susun urutan tahapan agar biaya produksi terhitung per stasiun.", en: "No routing stages yet. Define the sequence so production cost is tracked per station." },
  // Status QC — konstanta tingkat modul, dipetakan ke kunci lewat `satisfies`.
  qcNone: { id: "—", en: "—" },
  qcPending: { id: "menunggu QC", en: "awaiting QC" },
  qcPassed: { id: "lulus QC", en: "QC passed" },
  qcQuarantined: { id: "karantina", en: "quarantined" },
  toastResepDisimpan: { id: "Resep (BoM) disimpan.", en: "Bill of materials saved." },
  toastPerintahDibuat: { id: "Perintah produksi dibuat.", en: "Production order created." },
  toastQcLulus: { id: "Hasil produksi diluluskan QC.", en: "Production output passed QC." },
  toastQcKarantina: { id: "Hasil produksi dikarantina.", en: "Production output quarantined." },

  // Pemeliharaan (Fase 19h).
  // `asetTunggal` sengaja terpisah dari `aset` yang sudah ada: kunci itu berisi
  // "Aset"/"Assets" (jamak, untuk menu/judul modul), sedangkan di sini ia label
  // sebuah field yang menunjuk SATU aset.
  asetTunggal: { id: "Aset", en: "Asset" },
  descJadwalServis: {
    id: "Servis otomatis diterbitkan saat jatuh tempo.",
    en: "Service work orders are raised automatically when due.",
  },
  pilihAsetOpsi: { id: "— pilih aset —", en: "— pick an asset —" },
  namaServis: { id: "Nama servis", en: "Service name" },
  contohServisRutin: { id: "mis. Servis rutin", en: "e.g. Routine service" },
  intervalBulan: { id: "Interval (bulan)", en: "Interval (months)" },
  simpanJadwal: { id: "Simpan jadwal", en: "Save schedule" },
  descWorkOrderLuarJadwal: {
    id: "Buat pekerjaan servis di luar jadwal.",
    en: "Create an unscheduled service job.",
  },
  contohGantiOli: { id: "mis. Ganti oli mesin", en: "e.g. Change engine oil" },
  tanggalRencana: { id: "Tanggal rencana", en: "Planned date" },
  buatWorkOrder: { id: "Buat work order", en: "Create work order" },
  belumAdaJadwal: { id: "Belum ada jadwal", en: "No schedules yet" },
  descBelumAdaJadwal: {
    id: "Buat jadwal servis berkala per aset.",
    en: "Create a recurring service schedule per asset.",
  },
  bulanSingkat: { id: "bln", en: "mo" },
  statusAktifKecil: { id: "aktif", en: "active" },
  totalBiayaServis: { id: "Total biaya servis tercatat:", en: "Total recorded service cost:" },
  belumAdaWorkOrder: { id: "Belum ada work order", en: "No work orders yet" },
  descBelumAdaWorkOrder: {
    id: "Buat work order untuk mencatat servis, atau pasang jadwal berkala agar terbit sendiri.",
    en: "Create a work order to record a service, or set a recurring schedule so they are raised automatically.",
  },
  asetPekerjaan: { id: "Aset / Pekerjaan", en: "Asset / Job" },
  akunPembayarOpsi: { id: "— akun pembayar —", en: "— paying account —" },
  workOrderRiwayat: { id: "Work order & riwayat servis", en: "Work orders & service history" },
  servisKolom: { id: "Servis", en: "Service" },
  intervalKolom: { id: "Interval", en: "Interval" },
  jatuhTempoBerikut: { id: "Jatuh tempo berikut", en: "Next due" },
  statusJeda: { id: "jeda", en: "paused" },
  toastJadwalServisDibuat: { id: "Jadwal servis dibuat.", en: "Service schedule created." },
  toastWorkOrderDibuat: { id: "Work order dibuat.", en: "Work order created." },
  toastWorkOrderSelesai: { id: "Work order selesai.", en: "Work order completed." },
  toastWorkCenterDitambah: { id: "Work center ditambahkan.", en: "Work center added." },
  toastTahapRoutingDitambah: { id: "Tahap routing ditambahkan.", en: "Routing stage added." },
  toastBiayaAktualDicatat: { id: "Biaya aktual dicatat.", en: "Actual cost recorded." },

  // Persetujuan (Fase 19i).
  antreanSaya: { id: "Antrean saya", en: "My queue" },
  riwayatTab: { id: "Riwayat", en: "History" },
  aturanTab: { id: "Aturan", en: "Rules" },
  pembelianAmbang: { id: "Pembelian (ambang)", en: "Purchases (threshold)" },
  descAntrean: {
    id: "Alur yang langkah aktifnya menunggu peran Anda.",
    en: "Flows whose current step is waiting on your role.",
  },
  antreanKosong: { id: "Antrean kosong", en: "Queue is empty" },
  descAntreanKosong: {
    id: "Tak ada alur yang menunggu persetujuan Anda saat ini.",
    en: "Nothing is waiting on your approval right now.",
  },
  descAjukanDokumen: {
    id: "Ajukan dokumen untuk disetujui sesuai aturan berlaku.",
    en: "Submit a document for approval under the applicable rules.",
  },
  jenisDokumen: { id: "Jenis dokumen", en: "Document type" },
  judulKeterangan: { id: "Judul / keterangan", en: "Title / description" },
  contohPembelianLaptop: {
    id: "mis. Pembelian laptop tim",
    en: "e.g. Team laptop purchase",
  },
  isiNominalUntukAturan: {
    id: "Isi nominal untuk melihat aturan yang berlaku.",
    en: "Enter an amount to see which rule applies.",
  },
  takAdaAturanCocok: {
    id: "Tak ada aturan cocok — akan langsung disetujui (tanpa persetujuan).",
    en: "No matching rule — this will be approved immediately (no approval needed).",
  },
  descSemuaPengajuan: {
    id: "Semua pengajuan + jejak langkah per approver.",
    en: "All submissions plus the step trail per approver.",
  },
  belumAdaPengajuan: { id: "Belum ada pengajuan. Dokumen yang melewati ambang persetujuan masuk ke antrean ini.", en: "No submissions yet. Documents above the approval threshold land in this queue." },
  otomatisDisetujui: {
    id: "Otomatis disetujui (tanpa aturan).",
    en: "Auto-approved (no rule matched).",
  },
  descTetapkanAlur: {
    id: "Tetapkan alur untuk jenis dokumen di atas ambang tertentu — disetujui berurutan sesuai peran.",
    en: "Define a flow for a document type above a threshold — approved in sequence by role.",
  },
  namaAturan: { id: "Nama aturan", en: "Rule name" },
  contohPembelianBesar: { id: "mis. Pembelian besar", en: "e.g. Large purchase" },
  belumAdaAturan: { id: "Belum ada aturan", en: "No rules yet" },
  hapusAturan: { id: "Hapus aturan", en: "Delete rule" },
  permintaanPembelianAmbang: {
    id: "Permintaan pembelian (ambang tunggal)",
    en: "Purchase requests (single threshold)",
  },
  descPermintaanAmbang: {
    id: "Pembelian di atas ambang oleh non-Owner — jurnal & stok baru diproses saat disetujui.",
    en: "Above-threshold purchases by non-Owners — journal and stock are only processed once approved.",
  },
  tidakAdaPermintaan: { id: "Tidak ada permintaan.", en: "No requests." },
  statusMenunggu: { id: "menunggu", en: "pending" },
  statusDisetujui: { id: "disetujui", en: "approved" },
  // `statusDitolak` sudah ada sejak Fase 16 dengan isi sama — dipakai ulang.
  // Jenis dokumen persetujuan — peta shared → kunci web (pola 16t/19e).
  docPembelian: { id: "Pembelian", en: "Purchase" },
  docPesananPembelian: { id: "Pesanan pembelian", en: "Purchase order" },
  docPengeluaran: { id: "Pengeluaran kas", en: "Cash disbursement" },
  docJurnal: { id: "Jurnal", en: "Journal entry" },
  toastAlurSelesai: { id: "Disetujui — alur selesai.", en: "Approved — flow complete." },
  toastDitolakTitik: { id: "Ditolak.", en: "Rejected." },
  toastLangkahDisetujui: {
    id: "Langkah ini disetujui dan alurnya berlanjut ke penyetuju berikutnya.",
    en: "Step approved, moving on to the next approver.",
  },
  toastDiajukanPrefix: { id: "Diajukan", en: "Submitted" },
  toastTanpaPersetujuan: {
    id: "— tak perlu persetujuan, langsung disetujui.",
    en: "— no approval needed, approved immediately.",
  },
  toastMenungguPersetujuan: {
    id: "— menunggu persetujuan.",
    en: "— awaiting approval.",
  },
  toastAturanDibuat: { id: "Aturan dibuat.", en: "Rule created." },
  toastAturanDihapus: { id: "Aturan dihapus.", en: "Rule deleted." },
  toastPermintaanDitolakTitik: { id: "Permintaan ditolak.", en: "Request rejected." },

  // Kontrak Berulang (Fase 19j).
  descKontrakBerulang: {
    id: "Faktur diterbitkan otomatis pada tanggal tagih. Gunakan produk berjenis jasa agar tidak membutuhkan stok.",
    en: "Invoices are issued automatically on the billing date; use a 'service' product so no stock is needed.",
  },
  namaKontrak: { id: "Nama kontrak", en: "Contract name" },
  contohLangganan: {
    id: "Langganan Maintenance Bulanan",
    en: "Monthly Maintenance Subscription",
  },
  cariPelanggan: { id: "Cari pelanggan…", en: "Search customers…" },
  mulaiTagih: { id: "Mulai tagih", en: "Billing starts" },
  cariProdukJasa: { id: "Cari produk/jasa…", en: "Search products/services…" },
  tambahBarisPlus: { id: "+ Tambah baris", en: "+ Add line" },
  buatKontrak: { id: "Buat kontrak", en: "Create contract" },
  daftarKontrak: { id: "Daftar kontrak", en: "Contract list" },
  belumAdaKontrak: { id: "Belum ada kontrak", en: "No contracts yet" },
  descBelumAdaKontrak: {
    id: "Buat kontrak langganan agar faktur terbit otomatis tiap periode.",
    en: "Create a subscription contract so invoices are issued automatically each period.",
  },
  fakturTerbitSuffix: { id: "faktur terbit", en: "invoices issued" },
  kontrakBerjalan: { id: "berjalan", en: "active" },
  kontrakJeda: { id: "jeda", en: "paused" },
  kontrakBerakhir: { id: "berakhir", en: "ended" },

  // Helpdesk (Fase 19j).
  buatTiket: { id: "Buat tiket", en: "Create ticket" },
  daftarTiket: { id: "Daftar tiket", en: "Ticket list" },
  belumAdaTiket: { id: "Belum ada tiket", en: "No tickets yet" },
  descBelumAdaTiket: {
    id: "Buat tiket saat pelanggan melapor, agar keluhannya tidak tercecer di chat.",
    en: "Create a ticket when a customer reports an issue, so it does not get lost in chat.",
  },
  ditugaskanKeSuffix: { id: "· ditugaskan ke", en: "· assigned to" },
  pilihTiketDetail: {
    id: "Pilih tiket untuk melihat detail.",
    en: "Pick a ticket to see its detail.",
  },
  ditugaskanKe: { id: "Ditugaskan ke", en: "Assigned to" },
  belumDitugaskanOpsi: { id: "— belum ditugaskan —", en: "— unassigned —" },
  belumAdaBalasan: { id: "Belum ada balasan. Balasan tim dukungan muncul di sini.", en: "No replies yet. Replies from the support team appear here." },
  catatanInternalKecil: { id: "catatan internal", en: "internal note" },
  balasanSuffix: { id: "balasan", en: "replies" },
  toastKontrakDibuat: { id: "Kontrak dibuat.", en: "Contract created." },
  toastStatusKontrakDiperbarui: {
    id: "Status kontrak diperbarui.",
    en: "Contract status updated.",
  },
  toastTiketDibuat: { id: "Tiket dibuat.", en: "Ticket created." },
  catatanInternalLabel: {
    id: "Catatan internal (tak terlihat pelanggan)",
    en: "Internal note (not visible to the customer)",
  },
  // Absensi (Fase 19k).
  bulan: { id: "Bulan", en: "Month" },
  catatKehadiran: { id: "Catat kehadiran", en: "Record attendance" },
  descCatatKehadiran: {
    id: "Satu catatan per karyawan per tanggal — mencatat ulang tanggal yang sama akan menimpa catatan sebelumnya.",
    en: "One record per employee per date — re-recording the same date overwrites the previous entry.",
  },
  belumAdaKaryawanOpsi: { id: "— belum ada karyawan —", en: "— no employees yet —" },
  jamMasuk: { id: "Jam masuk", en: "Clock in" },
  jamKeluar: { id: "Jam keluar", en: "Clock out" },
  rekapBulanan: { id: "Rekap bulanan", en: "Monthly recap" },
  jumlahHariPerStatus: { id: "Jumlah hari per status untuk", en: "Days per status for" },
  // `belumAdaKaryawan` sudah ada sejak Fase 16 — dipakai ulang.
  descTambahKaryawanDulu: {
    id: "Tambahkan karyawan di menu Penggajian terlebih dahulu.",
    en: "Add employees under Payroll first.",
  },
  catatanKehadiran: { id: "Catatan kehadiran", en: "Attendance records" },
  daftarCatatanPada: { id: "Daftar catatan pada", en: "Records for" },
  terbaruDiAtas: { id: "(terbaru di atas).", en: "(newest first)." },
  belumAdaCatatanBulanIni: {
    id: "Belum ada catatan kehadiran pada bulan ini. Catat kehadiran harian, atau impor dari mesin absensi.",
    en: "No attendance records this month. Record daily attendance, or import from your attendance device.",
  },
  hapusKehadiran: { id: "Hapus kehadiran", en: "Delete attendance" },
  konfirmHapusKehadiran: { id: "Hapus catatan kehadiran?", en: "Delete this attendance record?" },
  catatanKata: { id: "Catatan", en: "Record" },
  padaKata: { id: "pada", en: "on" },
  akanDihapus: { id: "akan dihapus.", en: "will be deleted." },
  sdKata: { id: "s.d.", en: "to" },
  // Dua kunci di bawah TIDAK PERNAH ADA meski sudah dipakai — ketahuan hanya
  // setelah `UiKey` diperbaiki di 19k. Sebelumnya `useUi` mengembalikan
  // `String(key)`, jadi pemakai melihat tulisan "ppnLebihBayar" dan "laba"
  // terpampang di layar.
  ppnLebihBayar: { id: "PPN Lebih Bayar (kompensasi)", en: "VAT overpaid (carried forward)" },
  laba: { id: "laba", en: "profit" },
  // Status kehadiran — `sakit` & `izin` sudah ada sejak Fase 16.
  hadirStatus: { id: "Hadir", en: "Present" },
  alfaStatus: { id: "Alfa", en: "Absent" },
  cutiStatus: { id: "Cuti", en: "Leave" },
  toastKehadiranTercatat: { id: "Kehadiran tercatat.", en: "Attendance recorded." },
  toastKehadiranDihapus: { id: "Catatan kehadiran dihapus.", en: "Attendance record deleted." },

  // Dimensi & Rekonsiliasi (Fase 19l).
  descCostCenter: {
    id: "Unit biaya opsional yang bisa ditandai per baris jurnal (mis. per cabang / divisi).",
    en: "Optional cost units that can be tagged per journal line (e.g. per branch / division).",
  },
  belumAdaCostCenter: { id: "Belum ada cost center. Tambahkan cost center untuk melihat laba-rugi per unit atau cabang.", en: "No cost centers yet. Add one to see profit and loss per unit or branch." },
  takLagiBisaDipilih: {
    id: "tak lagi bisa dipilih. Jurnal lama tetap tertandai.",
    en: "can no longer be selected. Existing journals keep their tag.",
  },
  labaRugiPerDimensi: { id: "Laba-rugi per dimensi", en: "Profit & loss per dimension" },
  descLabaRugiDimensi: {
    id: "Pendapatan & beban dikelompokkan per cost center pada rentang tanggal terpilih.",
    en: "Income and expenses grouped per cost center over the selected date range.",
  },
  belumAdaTransaksiPeriode: {
    id: "Belum ada transaksi pendapatan/beban pada periode ini. Coba periode lain, atau catat transaksi lebih dulu.",
    en: "No income or expense transactions in this period. Try another period, or record a transaction first.",
  },
  labaRugiKolom: { id: "Laba/Rugi", en: "Profit/Loss" },
  rekonsiliasiV2: {
    id: "Rekonsiliasi bank v2 — aturan auto-match",
    en: "Bank reconciliation v2 — auto-match rules",
  },
  descRekonsiliasiV2: {
    id: "Simpan aturan pencocokan berdasarkan kata kunci deskripsi + toleransi tanggal, untuk mempercepat rekonsiliasi berikutnya.",
    en: "Save matching rules based on description keywords plus a date tolerance, to speed up future reconciliations.",
  },
  akunBank: { id: "Akun bank", en: "Bank account" },
  kataKunciDeskripsi: { id: "Kata kunci deskripsi", en: "Description keyword" },
  contohKataKunciBank: { id: "mis. TRSF / BIAYA ADM", en: "e.g. TRSF / BIAYA ADM" },
  simpanAturan: { id: "Simpan aturan", en: "Save rule" },
  kataKunciPrefix: { id: "kata kunci", en: "keyword" },
  belumAdaAturanTersimpan: {
    id: "Belum ada aturan tersimpan.",
    en: "No saved rules yet.",
  },
  formatImporKoran: {
    id: "Format impor rekening koran didukung",
    en: "Supported bank statement import formats",
  },
  descFormatImpor: {
    id: "Saat impor mutasi (menu Kas & Bank), pilih format bank agar kolom terpetakan otomatis:",
    en: "When importing transactions (Cash & Bank menu), pick your bank's format so the columns map automatically:",
  },

  // Anggaran (Fase 19l).
  descAnggaranRealisasi: {
    id: "Tetapkan target pendapatan dan beban per bulan, lalu realisasinya dihitung otomatis dari jurnal. Selisih hijau = menguntungkan (pendapatan di atas target atau beban di bawah target).",
    en: "Set monthly income and expense targets; actuals are computed automatically from the journal. A green variance is favourable (income above target, or expense below target).",
  },
  // `periodeBulan` sudah ada sejak Fase 16 — dipakai ulang.
  hanyaOwnerUbahAnggaran: {
    id: "Hanya Owner/Admin yang dapat mengubah anggaran.",
    en: "Only an Owner/Admin can change the budget.",
  },
  labaRugiKecil: { id: "Laba/rugi", en: "Profit/loss" },
  selisihKolom: { id: "Selisih", en: "Variance" },
  arsipkanCostCenter: { id: "Arsipkan cost center?", en: "Archive this cost center?" },
  hariSuffixTol: { id: "hari", en: "days" },
  anggaranVsRealisasi: { id: "Anggaran vs realisasi", en: "Budget vs actual" },
  kodeKolom: { id: "Kode", en: "Code" },
  anggaranKolom: { id: "Anggaran", en: "Budget" },
  belumAdaAkunSuffix: { id: "Belum ada akun", en: "No accounts for" },
  totalPrefix: { id: "Total", en: "Total" },

  // Mata Uang, Marketplace, Konsolidasi (Fase 19m).
  tambahPerbaruiKurs: { id: "Tambah / perbarui kurs", en: "Add / update rate" },
  descKurs: {
    id: "Kurs = nilai 1 unit valas dalam Rupiah (mis. 1 USD = Rp 16.200).",
    en: "The rate is the value of 1 unit of foreign currency in Rupiah (e.g. 1 USD = Rp 16,200).",
  },
  kursIdr: { id: "Kurs (IDR)", en: "Rate (IDR)" },
  simpanKurs: { id: "Simpan kurs", en: "Save rate" },
  daftarMataUang: { id: "Daftar mata uang", en: "Currency list" },
  kodeTigaHuruf: { id: "Kode (3 huruf)", en: "Code (3 letters)" },
  mataUangDasar: { id: "dasar", en: "base" },
  // Revaluasi saldo valas akhir periode (Fase 22a)
  kursDiperbarui: { id: "Terakhir diperbarui", en: "Last updated" },
  revaluasiValas: { id: "Revaluasi saldo valas", en: "Revalue foreign balances" },
  descRevaluasiValas: {
    id: "Nilai ulang sisa piutang & utang valas memakai kurs pada daftar mata uang di bawah. Jurnalnya otomatis dibalik keesokan harinya, sehingga laporan akhir periode memakai nilai wajar tanpa mengubah tagihan yang tercatat.",
    en: "Restate outstanding foreign-currency receivables and payables using the rates in the currency list below. The entry is reversed automatically the next day, so period-end reports use fair value without altering the recorded invoices.",
  },
  // `tanggalRevaluasi` sudah dipakai revaluasi ASET (Fase 20e); di sini artinya
  // beda — tanggal tutup periode — jadi kuncinya sendiri, bukan dipaksa berbagi.
  tglAkhirPeriode: { id: "Tanggal akhir periode", en: "Period-end date" },
  jalankanRevaluasi: { id: "Jalankan revaluasi", en: "Run revaluation" },
  revaluasiBerhasil: { id: "Revaluasi tercatat", en: "Revaluation recorded" },
  revaluasiDokumen: { id: "dokumen dinilai ulang", en: "documents revalued" },
  revaluasiSelisih: { id: "Selisih belum terealisasi", en: "Unrealised difference" },
  revaluasiPembalik: { id: "Jurnal pembalik", en: "Reversing entry" },
  toastKursDisimpan: { id: "Kurs disimpan.", en: "Rate saved." },
  hanyaAdminImpor: {
    id: "Hanya Admin/Pemilik yang dapat mengimpor pesanan.",
    en: "Only an Admin/Owner can import orders.",
  },
  descImporMarketplace: {
    id: "Pilih kanal, gudang, dan pelanggan, lalu tempel data CSV.",
    en: "Pick a channel, warehouse, and customer, then paste the CSV data.",
  },
  // (kunci di atas sudah ada sejak Fase 16 — dipakai ulang)
  pelangganContohShopee: {
    id: 'Pelanggan (mis. "Pembeli Shopee")',
    en: 'Customer (e.g. "Shopee Buyer")',
  },
  kolomCsvMarketplace: {
    id: "no_pesanan, tanggal(YYYY-MM-DD), SKU, qty, harga_satuan, diskon%(opsional)",
    en: "order_no, date(YYYY-MM-DD), SKU, qty, unit_price, discount%(optional)",
  },
  descSatuBarisPerItem: {
    id: ". Satu baris per item, dan item dari pesanan yang sama digabung menjadi satu faktur.",
    en: ". One row per item; items from the same order are merged into a single invoice.",
  },
  barisDilewati: {
    id: "baris dilewati karena format tidak valid:",
    en: "rows skipped because the format is invalid:",
  },
  gagalKata: { id: "gagal", en: "failed" },
  dilewatiKata: { id: "dilewati", en: "skipped" },
  pesananDiimporSuffix: { id: "pesanan diimpor", en: "orders imported" },
  belumAdaPesananMarketplace: {
    id: "Belum ada pesanan marketplace yang diimpor.",
    en: "No marketplace orders imported yet.",
  },
  csvKolomKurang: {
    id: ": kolom kurang (butuh no. pesanan, tanggal, SKU, qty, harga).",
    en: ": missing columns (needs order no., date, SKU, qty, price).",
  },
  csvDataTakValid: { id: ": data tidak valid.", en: ": invalid data." },
  tidakAdaData: { id: "Tidak ada data.", en: "No data." },
  seimbangCentang: { id: "seimbang ✓", en: "balanced ✓" },
  // (kunci di atas sudah ada sejak Fase 16 — dipakai ulang)
  labaRugiTab: { id: "Laba Rugi", en: "Income Statement" },
  neracaTab: { id: "Neraca", en: "Balance Sheet" },
  descKonsolidasi: {
    id: "Laporan gabungan seluruh perusahaan yang Anda miliki — nilai per akun dijumlahkan lintas perusahaan.",
    en: "A combined report across every company you own — per-account values are summed across companies.",
  },
  // (kunci di atas sudah ada sejak Fase 16 — dipakai ulang)
  satuPerusahaanSaja: {
    id: "Anda baru memiliki satu perusahaan. Tambahkan perusahaan lain di Pengaturan untuk melihat laporan gabungan.",
    en: "You only have one company so far. Add another under Settings to see a consolidated report.",
  },
  labaBersihKonsolidasi: {
    id: "Laba Bersih Konsolidasi",
    en: "Consolidated Net Profit",
  },
  rugiBersihKonsolidasi: {
    id: "Rugi Bersih Konsolidasi",
    en: "Consolidated Net Loss",
  },
  totalAset: { id: "Total Aset", en: "Total Assets" },

  // Wizard "Mulai" (Fase 19n).
  // Label langkah wizard. Sengaja BUKAN memakai `langkahProfil`/`langkahProduk`/
  // `langkahKontak` yang sudah ada: kunci-kunci itu berisi kalimat daftar-tugas
  // onboarding ("Lengkapi profil perusahaan (alamat & NPWP)"), sedangkan di sini
  // yang dibutuhkan satu kata untuk penanda langkah. Nama cocok, makna tidak —
  // pelajaran Fase 16u, varian ketiga.
  wizardProfil: { id: "Profil", en: "Profile" },
  wizardPengalaman: { id: "Pengalaman", en: "Experience" },
  wizardProduk: { id: "Produk", en: "Products" },
  wizardKontak: { id: "Kontak", en: "Contacts" },
  lewatiSemua: {
    id: "Lewati semua dan langsung ke dasbor",
    en: "Skip everything and go straight to the dashboard",
  },
  descProfilPerusahaan: {
    id: "Alamat & NPWP muncul di kop faktur dan dokumen resmi. Bisa dilengkapi nanti di Pengaturan.",
    en: "Address and NPWP appear on invoice letterheads and official documents. You can fill these in later under Settings.",
  },
  simpanLanjut: { id: "Simpan & lanjut", en: "Save & continue" },
  seberapaAkrabAkuntansi: {
    id: "Seberapa akrab Anda dengan akuntansi?",
    en: "How familiar are you with accounting?",
  },
  descSesuaikanMenu: {
    id: "Kami sesuaikan tampilan menu. Bisa diubah kapan saja di Pengaturan.",
    en: "We will tailor the menu accordingly. You can change this any time under Settings.",
  },
  descModeSederhana: {
    id: "Sembunyikan menu akuntansi teknis (jurnal, buku besar). Fokus catat uang masuk/keluar.",
    en: "Hide the technical accounting menus (journal, ledger). Focus on recording money in and out.",
  },
  sayaSudahPaham: { id: "Saya sudah paham", en: "I know my way around" },
  sayaPemula: { id: "Saya pemula", en: "I am a beginner" },
  toastProfilTersimpan: { id: "Profil perusahaan tersimpan.", en: "Company profile saved." },
  toastProdukPertama: { id: "Produk pertama ditambahkan.", en: "First product added." },
  toastKontakPertama: {
    id: "Kontak pertama ditambahkan. Anda siap!",
    en: "First contact added. You are all set!",
  },
  descModeLengkap: {
    id: "Tampilkan semua fitur akuntansi: jurnal umum, buku besar, neraca saldo, tutup buku.",
    en: "Show every accounting feature: general journal, ledger, trial balance, period close.",
  },
  dataProdukTakValid: { id: "Data produk tidak valid", en: "Invalid product data" },
  tambahProdukPertama: {
    id: "Tambah produk/jasa pertama",
    en: "Add your first product or service",
  },
  descProdukPertama: {
    id: "Barang atau jasa yang Anda jual. Nanti dipakai di faktur & kasir.",
    en: "The goods or services you sell. These are used later in invoices and the cashier.",
  },
  namaProduk: { id: "Nama produk", en: "Product name" },
  dataKontakTakValid: { id: "Data kontak tidak valid", en: "Invalid contact data" },
  tambahKontakPertama: {
    id: "Tambah pelanggan/pemasok pertama",
    en: "Add your first customer or supplier",
  },
  descKontakPertama: {
    id: "Pihak yang bertransaksi dengan Anda — pelanggan (menjual) atau pemasok (membeli).",
    en: "The parties you transact with — customers (you sell to) or suppliers (you buy from).",
  },
  contohNamaKontak: {
    id: "Toko Berkah / PT Sumber Rezeki",
    en: "Toko Berkah / PT Sumber Rezeki",
  },

  // Migrasi saldo awal (Fase 19o).
  kodeAkunTakDikenal: { id: "Kode akun tidak dikenal:", en: "Unknown account code:" },
  skuTakDitemukan: { id: "SKU tidak ditemukan:", en: "SKU not found:" },
  gudangTakDitemukan: { id: "Gudang tidak ditemukan:", en: "Warehouse not found:" },
  bukuSudahBerisi: { id: "Buku sudah berisi", en: "The books already contain" },
  descBukuTerkunci: {
    id: "jurnal terposting. Saldo awal hanya bisa diisi saat buku masih kosong (perusahaan baru) untuk menjaga integritas pembukuan.",
    en: "posted journal entries. Opening balances can only be entered while the books are still empty (a new company), to keep the bookkeeping sound.",
  },
  imporSaldoAwal: { id: "Impor saldo awal", en: "Import opening balances" },
  descImporSaldoAwal: {
    id: "Tempel data CSV dari sistem lama. Persediaan diambil dari bagian Stok — jangan diisi di saldo akun.",
    en: "Paste CSV data from your old system. Inventory comes from the Stock section — do not enter it under account balances.",
  },
  tanggalSaldoAwal: { id: "Tanggal saldo awal", en: "Opening balance date" },
  labelCsvAkun: {
    id: "Saldo akun — CSV: kode, debit, kredit",
    en: "Account balances — CSV: code, debit, credit",
  },
  labelCsvStok: {
    id: "Stok awal — CSV: sku, gudang, qty, biaya",
    en: "Opening stock — CSV: sku, warehouse, qty, cost",
  },
  simpanSaldoAwal: { id: "Simpan saldo awal", en: "Save opening balances" },
  descJurnalPembuka: {
    id: "Jurnal pembuka dijamin seimbang: jika total debit ≠ kredit, selisihnya otomatis ditempatkan di Ekuitas Saldo Awal. Nilai persediaan disetel agar cocok dengan buku besar.",
    en: "The opening journal is always balanced: if total debit ≠ credit, the difference is placed automatically in Opening Balance Equity. Inventory value is adjusted to match the ledger.",
  },

  // — Alat bantu bisnis (Fase 19p) —
  // Istilah resmi Indonesia tidak diterjemahkan: PPN, PPh 21, TER, PTKP, DPP.
  tabHppUnit: { id: "HPP per unit", en: "COGS per unit" },
  tabMarkupMargin: { id: "Markup vs Margin", en: "Markup vs margin" },
  tabTitikImpas: { id: "Titik Impas (BEP)", en: "Break-even (BEP)" },
  tabPph21Ter: { id: "PPh 21 (TER)", en: "PPh 21 (TER)" },
  tabPpn: { id: "PPN", en: "PPN" },
  tabCicilanKasbon: { id: "Cicilan Kasbon", en: "Loan instalments" },
  judulHppUnit: {
    id: "Harga Pokok Produksi (HPP) per unit",
    en: "Cost of goods produced (COGS) per unit",
  },
  descHppUnit: {
    id: "Jumlahkan biaya per unit, tentukan margin, dapatkan harga jual.",
    en: "Add up the cost per unit, set a margin, and get the selling price.",
  },
  biayaBahanUnit: { id: "Biaya bahan / unit", en: "Material cost / unit" },
  biayaTenagaUnit: { id: "Biaya tenaga / unit", en: "Labour cost / unit" },
  overheadUnit: { id: "Overhead / unit", en: "Overhead / unit" },
  targetMargin: { id: "Target margin", en: "Target margin" },
  labaPerUnit: { id: "Laba per unit", en: "Profit per unit" },
  hargaJualDisarankan: { id: "Harga jual disarankan", en: "Suggested selling price" },
  descMarkupMargin: {
    id: "Dua cara melihat untung: markup dihitung dari modal, margin dari harga jual.",
    en: "Two ways of looking at profit: markup is measured against cost, margin against the selling price.",
  },
  hargaPokokModal: { id: "Harga pokok (modal)", en: "Cost price (capital)" },
  labaKotor: { id: "Laba kotor", en: "Gross profit" },
  markupDariModal: { id: "Markup (dari modal)", en: "Markup (from cost)" },
  marginDariHargaJual: { id: "Margin (dari harga jual)", en: "Margin (from selling price)" },
  descTitikImpas: {
    id: "Berapa unit harus terjual agar tidak rugi — menutup biaya tetap.",
    en: "How many units must be sold to break even — covering the fixed costs.",
  },
  biayaTetapBulan: { id: "Biaya tetap / bulan", en: "Fixed cost / month" },
  hargaJualUnit: { id: "Harga jual / unit", en: "Selling price / unit" },
  biayaVariabelUnit: { id: "Biaya variabel / unit", en: "Variable cost / unit" },
  marginKontribusiUnit: { id: "Margin kontribusi / unit", en: "Contribution margin / unit" },
  impasPada: { id: "Impas pada", en: "Break-even at" },
  unitSuffix: { id: "unit", en: "units" },
  setaraOmzet: { id: "Setara omzet", en: "Revenue equivalent" },
  peringatanBepHargaJual: {
    id: "Harga jual harus lebih tinggi dari biaya variabel agar bisa impas.",
    en: "The selling price must be higher than the variable cost for break-even to be possible.",
  },
  judulSimulasiPph21: { id: "Simulasi PPh 21 (metode TER)", en: "PPh 21 simulation (TER method)" },
  descSimulasiPph21: {
    id: "Tarif Efektif Rata-rata bulanan (PMK 168/2023). Mesin yang sama dengan penggajian.",
    en: "The monthly Average Effective Rate (PMK 168/2023). The same engine as payroll.",
  },
  penghasilanBrutoBulan: { id: "Penghasilan bruto / bulan", en: "Gross income / month" },
  kategoriTer: { id: "Kategori TER", en: "TER category" },
  tarifEfektif: { id: "Tarif efektif", en: "Effective rate" },
  pph21Bulan: { id: "PPh 21 / bulan", en: "PPh 21 / month" },
  takeHomeSetelahPph: { id: "Take-home (setelah PPh 21)", en: "Take-home (after PPh 21)" },
  descPpnAlat: {
    id: "Hitung PPN dari Dasar Pengenaan Pajak (DPP).",
    en: "Compute PPN from the tax base (DPP).",
  },
  dppSebelumPpn: { id: "DPP (harga sebelum PPN)", en: "DPP (price before PPN)" },
  tarifPpn: { id: "Tarif PPN", en: "PPN rate" },
  totalDppPpn: { id: "Total (DPP + PPN)", en: "Total (DPP + PPN)" },
  judulCicilanKasbon: { id: "Cicilan Kasbon Karyawan", en: "Employee loan instalments" },
  descCicilanKasbon: {
    id: "Bagi pinjaman rata per bulan (tanpa bunga) — potongan gaji tiap periode.",
    en: "Split the loan evenly per month (interest-free) — a payroll deduction each period.",
  },
  jumlahPinjaman: { id: "Jumlah pinjaman", en: "Loan amount" },
  jumlahCicilan: { id: "Jumlah cicilan", en: "Number of instalments" },
  bulanSuffix: { id: "bulan", en: "months" },
  potonganPerBulan: { id: "Potongan per bulan", en: "Deduction per month" },
  cicilanTerakhir: { id: "Cicilan terakhir", en: "Final instalment" },
  totalDipotong: { id: "Total dipotong", en: "Total deducted" },

  // — Halaman masuk/daftar (Fase 19q) —
  // Awalan `auth` dipakai konsisten karena beberapa kata di sini bertabrakan
  // makna dengan kunci lama: `masuk` di kamus ini berarti stok MASUK ("In"),
  // bukan sign-in. Pelajaran 16u, kembali terbukti.
  authManfaat1: {
    id: "Pembukuan double-entry otomatis dari faktur, kasir, sampai penggajian",
    en: "Automatic double-entry bookkeeping from invoices and the till through to payroll",
  },
  authManfaat2: {
    id: "Siap pajak Indonesia: PPN 11/12%, PPh 21 TER, dan ekspor e-Faktur",
    en: "Ready for Indonesian tax: PPN 11/12%, PPh 21 TER, and e-Faktur export",
  },
  authManfaat3: {
    id: "Database terpisah untuk tiap perusahaan — data Anda benar-benar terisolasi",
    en: "A separate database per company — your data really is isolated",
  },
  authManfaat4: {
    id: "1.300+ uji otomatis menjaga setiap rilis, dan angka pembukuan selalu seimbang",
    en: "1,300+ automated tests guard every release; the books always balance",
  },
  authGoogleDibatalkan: { id: "Masuk via Google dibatalkan.", en: "Google sign-in was cancelled." },
  authGoogleGagalToken: {
    id: "Masuk via Google gagal — coba lagi atau pakai email & password.",
    en: "Google sign-in failed — try again, or use email and password.",
  },
  authGoogleTidakDiizinkan: {
    id: "Akun tersebut tidak bisa dipakai masuk via Google.",
    en: "That account cannot be used to sign in with Google.",
  },
  authGoogleBelumDikonfigurasi: {
    id: "Masuk via Google belum tersedia saat ini.",
    en: "Google sign-in is not available right now.",
  },
  authAtau: { id: "atau", en: "or" },
  authLanjutkanGoogle: { id: "Lanjutkan dengan Google", en: "Continue with Google" },
  authTagline: {
    id: "Satu aplikasi untuk seluruh operasional perusahaan Anda.",
    en: "One app for everything your company runs on.",
  },
  // Fase 24 — trial dihapus. Mendaftar tetap gratis; yang berbayar adalah
  // mulai mencatat data sendiri. Demo publik yang menggantikan masa coba.
  authDaftarGratisLangganan: {
    id: "Daftar gratis · telusuri demo dulu · berlangganan saat siap",
    en: "Free to sign up · explore the demo first · subscribe when ready",
  },
  authSatuLangkahLagi: { id: "Satu langkah lagi", en: "One more step" },
  authDescGoogleLangkah: {
    id: "Akun Google Anda sudah tersambung. Beri nama perusahaan Anda untuk mulai.",
    en: "Your Google account is connected. Name your company to get started.",
  },
  authSesiBerakhir: { id: "Sesi Anda berakhir —", en: "Your session has expired —" },
  authMasukLagiGoogle: { id: "masuk lagi dengan Google", en: "sign in with Google again" },
  authNamaPerusahaan: { id: "Nama perusahaan", en: "Company name" },
  authBuatPerusahaan: { id: "Buat perusahaan", en: "Create company" },
  authBuatAkun: { id: "Buat akun perusahaan", en: "Create your company account" },
  authSudahPunyaAkun: { id: "Sudah punya akun?", en: "Already have an account?" },
  authMasuk: { id: "Masuk", en: "Sign in" },
  authNamaAnda: { id: "Nama Anda", en: "Your name" },
  authPassword: { id: "Password", en: "Password" },
  authPlaceholderEmail: { id: "anda@perusahaan.co.id", en: "you@company.com" },
  authPlaceholderPassword: { id: "Minimal 8 karakter", en: "At least 8 characters" },
  authDaftarSekarang: { id: "Daftar Sekarang", en: "Sign up now" },
  authSelamatDatang: { id: "Selamat datang kembali", en: "Welcome back" },
  authDescMasuk: {
    id: "Masuk untuk melanjutkan pekerjaan Anda. Belum punya akun?",
    en: "Sign in to pick up where you left off. Don't have an account yet?",
  },
  authDaftarGratis: { id: "Daftar gratis", en: "Sign up free" },
  // Fase 27a: paket yang dipilih di halaman harga ikut terbawa ke sini.
  authKodeTotp: { id: "Kode authenticator (2FA)", en: "Authenticator code (2FA)" },
  authPlaceholder6Digit: { id: "6 digit", en: "6 digits" },
  authLupaPassword: { id: "Lupa password?", en: "Forgot your password?" },
  authVerifikasiEmail: { id: "Verifikasi email", en: "Email verification" },
  authVerifikasiBerhasil: {
    id: "Email Anda berhasil diverifikasi. Selamat menggunakan ERPindo!",
    en: "Your email is verified. Welcome to ERPindo!",
  },
  authBukaDashboard: { id: "Buka dashboard", en: "Open dashboard" },
  authTautanTidakValid: {
    id: "Tautan verifikasi tidak valid atau sudah kedaluwarsa.",
    en: "That verification link is invalid or has expired.",
  },
  authLupaPasswordJudul: { id: "Lupa password", en: "Forgotten password" },
  authDescLupaPassword: {
    id: "Kami akan mengirim tautan reset ke email Anda.",
    en: "We'll send a reset link to your email.",
  },
  authResetTerkirim: {
    id: "Bila email terdaftar, tautan reset password sudah dikirim. Periksa kotak masuk Anda.",
    en: "If that email is registered, a password reset link is on its way. Check your inbox.",
  },
  authKirimTautanReset: { id: "Kirim tautan reset", en: "Send reset link" },
  authAturUlangPassword: { id: "Atur ulang password", en: "Reset your password" },
  authPasswordBaru: { id: "Password baru", en: "New password" },
  authSimpanPasswordBaru: { id: "Simpan password baru", en: "Save new password" },
  authUndanganTim: { id: "Undangan tim", en: "Team invitation" },
  authDescUndangan: {
    id: "Anda diundang bergabung ke sebuah perusahaan di ERPindo.",
    en: "You have been invited to join a company on ERPindo.",
  },
  authSilakan: { id: "Silakan", en: "Please" },
  authMasukKecil: { id: "masuk", en: "sign in" },
  authDaftarKecil: { id: "daftar", en: "sign up" },
  authUndanganLanjutan: {
    id: "dengan email yang diundang terlebih dahulu, lalu buka tautan ini lagi.",
    en: "with the invited email address first, then open this link again.",
  },
  authTerimaUndangan: { id: "Terima undangan", en: "Accept invitation" },

  // — Dashboard admin platform (Fase 19r) —
  // Awalan `ad` konsisten: halaman ini punya banyak kata umum ("Status",
  // "Daftar", "Hapus", "Ubah") yang sudah dipakai kunci lain dengan makna
  // berbeda. Memberi ruang nama sendiri lebih murah daripada memeriksa satu
  // per satu apakah maknanya kebetulan sama.
  adTabRingkasan: { id: "Ringkasan", en: "Overview" },
  adTabTenant: { id: "Tenant", en: "Tenants" },
  adTabInfra: { id: "Infra", en: "Infra" },
  adTabMasukan: { id: "Masukan", en: "Feedback" },
  adTabBlog: { id: "Blog", en: "Blog" },
  adHanyaAdmin: {
    id: "Halaman ini khusus admin platform ERPindo.",
    en: "This page is for ERPindo platform admins only.",
  },
  adGagalRingkasan: { id: "Gagal memuat ringkasan.", en: "Could not load the overview." },
  adTotalPerusahaan: { id: "Total perusahaan", en: "Total companies" },
  adTotalPengguna: { id: "Total pengguna", en: "Total users" },
  adMenungguPembayaran: { id: "Menunggu pembayaran", en: "Awaiting payment" },
  adAktifBerbayar: { id: "Aktif berbayar/comped", en: "Active paid/comped" },
  adMenunggakBacaSaja: { id: "Menunggak (baca-saja)", en: "Past due (read-only)" },
  adMasukanBaru: { id: "Masukan baru", en: "New feedback" },
  adPendaftaranPerBulan: { id: "Pendaftaran per bulan", en: "Sign-ups per month" },
  adDescPendaftaran: {
    id: "Perusahaan baru 12 bulan terakhir.",
    en: "New companies over the last 12 months.",
  },
  adPendaftarTerbaru: { id: "Pendaftar terbaru", en: "Recent sign-ups" },
  adDescPendaftarTerbaru: {
    id: "20 perusahaan terakhir beserta email pemiliknya.",
    en: "The last 20 companies, with their owners' email addresses.",
  },
  adKolomPerusahaan: { id: "Perusahaan", en: "Company" },
  adKolomPemilik: { id: "Pemilik", en: "Owner" },
  adKolomStatus: { id: "Status", en: "Status" },
  adKolomPaket: { id: "Paket", en: "Plan" },
  adKolomDaftar: { id: "Daftar", en: "Signed up" },
  adKolomAnggota: { id: "Anggota", en: "Members" },
  adKolomVersiSkema: { id: "Versi skema", en: "Schema version" },
  adSemuaPerusahaan: { id: "Semua perusahaan", en: "All companies" },
  adPerusahaanTerdaftar: { id: "perusahaan terdaftar.", en: "companies registered." },
  adCariPerusahaan: { id: "Cari perusahaan", en: "Search companies" },
  adCariNamaSlug: { id: "Cari nama/slug…", en: "Search name/slug…" },
  adFilterStatus: { id: "Filter status", en: "Filter by status" },
  adSemuaStatus: { id: "Semua status", en: "All statuses" },
  // Status langganan tenant. Sebelum Fase 19r lencananya menampilkan kode
  // mentah (`past_due`) di kedua bahasa — jadi ini sekalian perbaikan tampilan.
  // Fase 24d: `trial` diganti `provisioning` — pendaftar yang belum membayar,
  // satu-satunya status yang selama ini tampil sebagai kode mentah.
  adTsProvisioning: { id: "Belum berlangganan", en: "Not subscribed" },
  adTsActive: { id: "Aktif", en: "Active" },
  adTsPastDue: { id: "Menunggak", en: "Past due" },
  adTsSuspended: { id: "Ditangguhkan", en: "Suspended" },
  adInfrastruktur: { id: "Infrastruktur & kapasitas", en: "Infrastructure & capacity" },
  adDescInfra: {
    id: "Mode database tenant, versi skema, dan status migrasi antar-perusahaan.",
    en: "Tenant database mode, schema version, and migration status across companies.",
  },
  adGagalInfra: { id: "Gagal memuat status infra.", en: "Could not load infrastructure status." },
  adModeDbTenant: { id: "Mode database tenant", en: "Tenant database mode" },
  adModeCloudflare: { id: "Cloudflare (D1 dinamis)", en: "Cloudflare (dynamic D1)" },
  adModeLokal: { id: "Lokal (pool binding)", en: "Local (binding pool)" },
  adVersiSkemaTerkini: { id: "Versi skema terkini", en: "Current schema version" },
  adTertinggalMigrasi: { id: "Tertinggal migrasi", en: "Behind on migration" },
  // Fase 23c — kapasitas pendaftaran (mode pool lokal).
  adSisaKapasitas: { id: "Sisa kapasitas daftar", en: "Signup capacity left" },
  adKapasitasHabis: {
    id: "Kapasitas pendaftaran HABIS — perusahaan baru tidak bisa mendaftar. Nyalakan D1 dinamis (TENANT_DB_MODE=cloudflare) atau bebaskan slot.",
    en: "Signup capacity is FULL — new companies cannot register. Switch on dynamic D1 (TENANT_DB_MODE=cloudflare) or free up a slot.",
  },
  adKapasitasMenipis: {
    id: "Sisa kapasitas pendaftaran tinggal sedikit. Siapkan D1 dinamis sebelum benar-benar habis.",
    en: "Signup capacity is nearly exhausted. Set up dynamic D1 before it runs out.",
  },
  adSlotKotor: {
    id: "Slot bebas tetapi masih berisi data perusahaan lama (dilewati demi keamanan):",
    en: "Slots are free but still hold a previous company's data (skipped for safety):",
  },
  adPeringatanTertinggal: {
    id: "perusahaan belum di versi skema terkini. Klik “Migrasi sekarang” untuk menerapkan migrasi.",
    en: "companies are not on the current schema version. Click “Migrate now” to apply the migrations.",
  },
  adSemuaTerkini: {
    id: "Semua perusahaan berada di versi skema terkini.",
    en: "Every company is on the current schema version.",
  },
  adMemigrasi: { id: "Memigrasi…", en: "Migrating…" },
  adMigrasiSekarang: { id: "Migrasi sekarang", en: "Migrate now" },
  adAmanBerulang: {
    id: "Aman dijalankan berulang — hanya perusahaan yang tertinggal yang disentuh.",
    en: "Safe to run repeatedly — only the companies that are behind get touched.",
  },
  adSebaranVersi: { id: "Sebaran versi skema", en: "Schema version spread" },
  adTerkiniSuffix: { id: "(terkini)", en: "(current)" },
  adJenisPenyimpanan: { id: "Jenis penyimpanan", en: "Storage type" },
  adD1Dinamis: { id: "D1 dinamis (uuid)", en: "Dynamic D1 (uuid)" },
  adPoolLokal: { id: "Pool binding lokal", en: "Local binding pool" },
  adPerusahaanKata: { id: "perusahaan", en: "companies" },
  adPerusahaanTertinggal: { id: "Perusahaan tertinggal", en: "Companies behind" },
  adMasukanPengguna: { id: "Masukan pengguna", en: "User feedback" },
  adDescMasukan: {
    id: "Saran fitur, laporan bug, dan pertanyaan dari seluruh pengguna.",
    en: "Feature suggestions, bug reports, and questions from every user.",
  },
  adFilterStatusMasukan: { id: "Filter status masukan", en: "Filter feedback by status" },
  adBelumAdaMasukan: { id: "Belum ada masukan.", en: "No feedback yet." },
  adStatusMasukan: { id: "Status masukan", en: "Feedback status" },
  adHalamanLabel: { id: "Halaman:", en: "Page:" },
  adBalasanUntuk: { id: "Balasan untuk", en: "Reply to" },
  adBalasanPrefix: { id: "Balasan:", en: "Reply:" },
  adTulisBalasan: {
    id: "Tulis balasan singkat (tampil ke pengguna)…",
    en: "Write a short reply (shown to the user)…",
  },
  adBalas: { id: "Balas", en: "Reply" },
  // Peta label masukan dari `packages/shared` tetap berbahasa Indonesia karena
  // apps/api ikut memakainya; sisi web memetakan kodenya ke kamus (pola 16t).
  adKatSaran: { id: "Saran fitur", en: "Feature suggestion" },
  adKatBug: { id: "Laporan bug", en: "Bug report" },
  adKatPertanyaan: { id: "Pertanyaan", en: "Question" },
  adFsBaru: { id: "Baru", en: "New" },
  adFsDibaca: { id: "Dibaca", en: "Read" },
  adFsSelesai: { id: "Selesai", en: "Done" },
  adUbahArtikel: { id: "Ubah artikel:", en: "Edit article:" },
  adArtikelBaru: { id: "Artikel baru", en: "New article" },
  adDescMarkdown: {
    id: "Markdown sederhana: # judul, - daftar, **tebal**, [tautan](https://…). Artikel tayang di /blog setelah diterbitkan.",
    en: "Simple Markdown: # heading, - list, **bold**, [link](https://…). Articles go live on /blog once published.",
  },
  adJudulArtikel: { id: "Judul", en: "Title" },
  adSlugUrl: { id: "Slug (URL)", en: "Slug (URL)" },
  adRingkasanMeta: {
    id: "Ringkasan (untuk daftar & meta description)",
    en: "Excerpt (for the list & meta description)",
  },
  adIsiArtikel: { id: "Isi artikel (Markdown)", en: "Article body (Markdown)" },
  adTulis: { id: "Tulis", en: "Write" },
  adPratinjau: { id: "Pratinjau", en: "Preview" },
  adBelumAdaIsi: { id: "*Belum ada isi.*", en: "*Nothing written yet.*" },
  adBatal: { id: "Batal", en: "Cancel" },
  adSimpanPerubahan: { id: "Simpan perubahan", en: "Save changes" },
  adSimpanDraf: { id: "Simpan draf", en: "Save draft" },
  adSemuaArtikel: { id: "Semua artikel", en: "All articles" },
  adDescDraf: {
    id: "Draf tidak tampil di /blog sampai diterbitkan.",
    en: "Drafts do not appear on /blog until they are published.",
  },
  adBelumAdaArtikel: { id: "Belum ada artikel. Tulis artikel agar muncul di blog publik.", en: "No articles yet. Write one so it appears on the public blog." },
  adTayang: { id: "TAYANG", en: "LIVE" },
  adDraf: { id: "DRAF", en: "DRAFT" },
  adLihat: { id: "Lihat", en: "View" },
  adUbah: { id: "Ubah", en: "Edit" },
  adTarik: { id: "Tarik", en: "Unpublish" },
  adTerbitkan: { id: "Terbitkan", en: "Publish" },
  adHapus: { id: "Hapus", en: "Delete" },
  adHapusArtikelPrefix: { id: "Hapus artikel", en: "Delete article" },
  adDescHapusArtikel: {
    id: "Artikel dihapus permanen dari blog. Aksi ini tidak bisa diurungkan.",
    en: "The article is permanently removed from the blog. This cannot be undone.",
  },
  adYaHapusArtikel: { id: "Ya, hapus artikel", en: "Yes, delete the article" },
  adToastMasukanDiperbarui: { id: "Masukan diperbarui.", en: "Feedback updated." },
  adToastArtikelDiperbarui: { id: "Artikel diperbarui.", en: "Article updated." },
  adToastDrafDibuat: {
    id: "Draf artikel dibuat — terbitkan bila sudah siap.",
    en: "Draft article created — publish it when you are ready.",
  },
  adToastArtikelTayang: { id: "Artikel TAYANG di /blog.", en: "The article is LIVE on /blog." },
  adToastArtikelDitarik: { id: "Artikel ditarik jadi draf.", en: "Article pulled back to draft." },
  adToastArtikelDihapus: { id: "Artikel dihapus.", en: "Article deleted." },
  adToastDimutakhirkan: { id: "perusahaan dimutakhirkan", en: "companies upgraded" },
  adToastGagalKata: { id: "gagal", en: "failed" },
  adToastSemuaTerkini: {
    id: "Semua perusahaan sudah di versi skema terkini.",
    en: "Every company is already on the current schema version.",
  },

  // — Dukungan & masukan (Fase 19r) —
  dkKirimMasukan: { id: "Kirim masukan", en: "Send feedback" },
  dkDikirimSebagai: { id: "Dikirim sebagai", en: "Sent as" },
  dkPeringatanDemo: {
    id: "Mode demo hanya untuk melihat-lihat — masuk dengan akun Anda untuk mengirim masukan.",
    en: "Demo mode is for looking around only — sign in with your own account to send feedback.",
  },
  dkJenis: { id: "Jenis", en: "Type" },
  dkPesan: { id: "Pesan", en: "Message" },
  dkPlaceholderPesan: {
    id: "Ceritakan sedetail mungkin — halaman apa, apa yang Anda harapkan, dan apa yang terjadi.",
    en: "Tell us as much as you can — which page, what you expected, and what happened instead.",
  },
  dkTombolKirim: { id: "Kirim masukan", en: "Send feedback" },
  dkMasukanSaya: { id: "Masukan saya", en: "My feedback" },
  dkDescMasukanSaya: {
    id: "Status ditinjau oleh pengelola ERPindo.",
    en: "Statuses are reviewed by the ERPindo team.",
  },
  dkBelumAdaMasukan: {
    id: "Belum ada masukan yang Anda kirim.",
    en: "You have not sent any feedback yet.",
  },
  dkBalasanPengelola: { id: "Balasan pengelola:", en: "Team reply:" },
  dkToastTerimaKasih: {
    id: "Terima kasih! Masukan Anda sudah kami terima.",
    en: "Thank you! We have received your feedback.",
  },

  // — Kerangka aplikasi: topbar, sidebar, spanduk (Fase 19s) —
  // Awalan `sh` (shell). Teks di sini muncul di SETIAP halaman, jadi satu
  // kalimat yang tertinggal terlihat di seluruh aplikasi sekaligus.
  shPanduanAria: { id: "Buka panduan halaman ini", en: "Open the guide for this page" },
  shPanduanTitle: { id: "Panduan halaman ini", en: "Guide for this page" },
  shTurAria: { id: "Mulai tur halaman ini", en: "Start the tour of this page" },
  shTurTitle: { id: "Tur halaman ini", en: "Tour of this page" },
  shNotifikasi: { id: "Notifikasi", en: "Notifications" },
  shTakAdaPerhatian: {
    id: "Tidak ada yang perlu perhatian. 👍",
    en: "Nothing needs your attention. 👍",
  },
  shGagalMuat: {
    id: "Gagal memuat data. Muat ulang halaman.",
    en: "Could not load your data. Reload the page.",
  },
  shBelumGabung: {
    id: "Akun Anda belum tergabung ke perusahaan mana pun.",
    en: "Your account is not part of any company yet.",
  },
  shCariMenuAria: { id: "Cari menu", en: "Search menu" },
  shPilihPerusahaan: { id: "Pilih perusahaan", en: "Choose company" },
  // Fase 24 — trial dihapus; yang tersisa adalah "terdaftar tetapi belum bayar".
  shBelumBerlangganan: { id: "Belum berlangganan", en: "Not subscribed" },
  shBelumBerlanggananPesan: {
    id: "Perusahaan ini belum berlangganan — pencatatan transaksi belum bisa dimulai. Pilih paket di",
    en: "This company has no subscription yet — you cannot record transactions. Choose a plan in",
  },
  shGantiTemaAria: { id: "Ganti tema", en: "Switch theme" },
  shGantiTemaTitle: { id: "Ganti tema terang/gelap", en: "Switch between light and dark" },
  shMenuNavigasi: { id: "Menu navigasi", en: "Navigation menu" },
  shTutupMenu: { id: "Tutup menu", en: "Close menu" },
  shKeluar: { id: "Keluar", en: "Sign out" },
  shModeDemo: { id: "Mode demo", en: "Demo mode" },
  shDemoBacaSaja: {
    id: "— data hanya bisa dilihat, tidak bisa diubah.",
    en: "— data can only be viewed, not changed.",
  },
  shUntukKelolaBisnis: {
    id: "untuk mengelola bisnis Anda sendiri.",
    en: "to run your own business.",
  },
  shEmailBelumVerifikasi: {
    id: "Email Anda belum diverifikasi. Periksa kotak masuk untuk tautan verifikasi.",
    en: "Your email is not verified yet. Check your inbox for the verification link.",
  },
  shLanggananBerakhir: {
    id: "Masa langganan berakhir — akun dalam",
    en: "Your subscription has ended — this account is in",
  },
  shModeBacaSaja: { id: "mode baca-saja", en: "read-only mode" },
  shAktifkanDi: { id: ". Aktifkan langganan di", en: ". Reactivate your subscription in" },
  shPengaturan: { id: "Pengaturan", en: "Settings" },
  shHari: { id: "hari", en: "days" },
  shTenggangPrefix: { id: "Masa berlaku sudah habis — Anda masih bisa mencatat", en: "Your plan has ended — you can still record entries for" },
  shTenggangSuffix: { id: "lagi sebelum akun jadi baca-saja.", en: "more before the account becomes read-only." },

  // — PPh unifikasi (Fase 20d) —
  tabPphUnifikasi: { id: "PPh Unifikasi", en: "Unified WHT" },
  pphUnifikasiJudul: { id: "Rekap PPh per masa", en: "Withholding tax recap per period" },
  descPphUnifikasi: {
    id: "Semua PPh yang dipotong atau disetor pada satu masa: PPh 21 dari penggajian, PPh 23 dari bukti potong, dan PPh Final 4(2). Dihitung dari data yang sudah ada — tidak ada input ulang.",
    en: "Every withholding tax withheld or paid in one period: PPh 21 from payroll, PPh 23 from withholding slips, and Final PPh 4(2). Computed from existing data — nothing to re-enter.",
  },
  pphKolomJenis: { id: "Jenis", en: "Type" },
  pphKolomBruto: { id: "Bruto", en: "Gross" },
  pphKolomPph: { id: "PPh", en: "WHT" },
  pphJenisPph21: { id: "PPh 21", en: "PPh 21" },
  pphJenisPph23: { id: "PPh 23", en: "PPh 23" },
  pphJenisFinal: { id: "PPh Final 4(2)", en: "Final PPh 4(2)" },
  pphTotalMasa: { id: "Total PPh masa ini", en: "Total WHT this period" },
  pphBelumDisetor: { id: "Belum disetor", en: "Not yet deposited" },
  pphSudahDisetor: { id: "Disetor", en: "Deposited" },
  pphBelumAdaData: {
    id: "Belum ada PPh yang tercatat pada masa ini. Bukti potong yang Anda buat akan muncul di sini.",
    en: "No withholding tax recorded for this period yet. Slips you create will appear here.",
  },

  // — Revaluasi aset (Fase 20e) —
  revaluasi: { id: "Revaluasi", en: "Revalue" },
  tanggalRevaluasi: { id: "Tanggal revaluasi", en: "Revaluation date" },
  nilaiWajar: { id: "Nilai wajar (hasil penilaian)", en: "Fair value (appraised)" },
  simpanRevaluasi: { id: "Simpan revaluasi", en: "Save revaluation" },
  descRevaluasi: {
    id: "Nilai buku disetel ke nilai wajar. Kenaikan masuk Surplus Revaluasi (ekuitas), penurunan masuk beban. Akumulasi penyusutan dinolkan dan penyusutan berikutnya dihitung dari nilai baru.",
    en: "The carrying amount is set to fair value. An increase goes to Revaluation Surplus (equity); a decrease goes to expense. Accumulated depreciation is reset and future depreciation runs from the new value.",
  },

  // — Eliminasi antar-perusahaan (Fase 20f) —
  antarPerusahaan: { id: "Antar-perusahaan", en: "Intercompany" },
  tandaiAntarPerusahaan: { id: "Tandai antar-perusahaan", en: "Mark intercompany" },
  lepasTandaAntarPerusahaan: { id: "Lepas tanda", en: "Unmark" },
  descAntarPerusahaan: {
    id: "Akun bertanda ini dikeluarkan dari total laporan gabungan, supaya jual-beli internal grup tidak terhitung dua kali.",
    en: "Accounts marked this way are excluded from consolidated totals, so trade inside the group is not counted twice.",
  },
  toastDitandaiAntarPerusahaan: {
    id: "Akun ditandai antar-perusahaan.",
    en: "Account marked as intercompany.",
  },
  toastTandaAntarPerusahaanDilepas: {
    id: "Tanda antar-perusahaan dilepas.",
    en: "Intercompany mark removed.",
  },
  dieliminasi: { id: "Dieliminasi", en: "Eliminated" },
  akunSistem: { id: "sistem", en: "system" },

  // — Komponen bersama & Asisten AI (Fase 19s). Awalan `cp` (komponen). —
  cpKetikCari: { id: "Ketik untuk mencari…", en: "Type to search…" },
  cpMencari: { id: "Mencari…", en: "Searching…" },
  cpTakAdaHasil: { id: "Tidak ada hasil. Coba kata yang lebih pendek.", en: "No results. Try a shorter word." },
  cpYaLanjutkan: { id: "Ya, lanjutkan", en: "Yes, continue" },
  cpBatal: { id: "Batal", en: "Cancel" },
  cpAsisten: { id: "Asisten ERPindo", en: "ERPindo Assistant" },
  cpAsistenAi: { id: "Asisten ERPindo (AI)", en: "ERPindo Assistant (AI)" },
  cpTutupAsisten: { id: "Tutup Asisten ERPindo", en: "Close the ERPindo Assistant" },
  cpBukaAsisten: { id: "Buka Asisten ERPindo", en: "Open the ERPindo Assistant" },
  cpModeTanya: { id: "Tanya", en: "Ask" },
  cpModeLaporan: { id: "Laporan", en: "Reports" },
  cpModeJurnal: { id: "Draf Jurnal", en: "Journal Draft" },
  cpAjakanTanya: {
    id: "Tanyakan cara memakai ERPindo, misalnya:",
    en: "Ask how to use ERPindo, for example:",
  },
  cpContohTanya1: {
    id: "Bagaimana cara ekspor XML Coretax?",
    en: "How do I export Coretax XML?",
  },
  cpContohTanya2: { id: "Cara mencatat retur penjualan?", en: "How do I record a sales return?" },
  cpContohTanya3: {
    id: "Gaji karyawan dihitung bagaimana?",
    en: "How is employee pay calculated?",
  },
  cpAjakanLaporan: {
    id: "Tanyakan kondisi keuangan Anda — dijawab dari buku Anda sendiri, misalnya:",
    en: "Ask about your finances — answered from your own books, for example:",
  },
  cpContohLaporan1: { id: "Berapa laba bulan ini?", en: "What is this month's profit?" },
  cpContohLaporan2: {
    id: "Bandingkan pendapatan bulan ini vs bulan lalu.",
    en: "Compare this month's revenue with last month's.",
  },
  cpContohLaporan3: {
    id: "Berapa saldo kas & piutang saya?",
    en: "What are my cash and receivables balances?",
  },
  cpHanyaMembaca: {
    id: "Hanya membaca — AI tidak mengubah data apa pun.",
    en: "Read-only — the AI does not change any data.",
  },
  cpAjakanJurnal: {
    id: "Tulis transaksi dengan bahasa sehari-hari, misalnya:",
    en: "Describe a transaction in plain language, for example:",
  },
  cpContohJurnal1: {
    id: "bayar listrik 500 ribu dari kas",
    en: "pay 500 thousand for electricity from cash",
  },
  cpContohJurnal2: { id: "setor tunai ke bank 2 juta", en: "deposit 2 million cash to the bank" },
  cpHanyaDraf: {
    id: "Hasilnya hanya draf — Anda yang meninjau & memposting.",
    en: "The result is only a draft — you review and post it.",
  },
  cpBerpikir: { id: "berpikir…", en: "thinking…" },
  cpSisaKuota: { id: "Sisa kuota AI hari ini:", en: "AI quota left today:" },
  cpPlaceholderTanya: { id: "Tanya cara pakai…", en: "Ask how to use it…" },
  cpPlaceholderLaporan: { id: "Tanya soal laporan…", en: "Ask about a report…" },
  cpPlaceholderJurnal: { id: "Deskripsikan transaksinya…", en: "Describe the transaction…" },
  cpPesanUntukAsisten: { id: "Pesan untuk Asisten ERPindo", en: "Message for the ERPindo Assistant" },
  cpKirim: { id: "Kirim", en: "Send" },
  cpAiLamaMerespons: {
    id: "Asisten AI lama merespons (mungkin sedang sibuk). Coba lagi sebentar.",
    en: "The AI assistant is slow to respond (it may be busy). Try again shortly.",
  },
  cpAiTakTersedia: {
    id: "Fitur AI sedang tidak tersedia — fitur lain tetap berjalan normal. Coba lagi nanti.",
    en: "The AI feature is unavailable right now — everything else works as normal. Try again later.",
  },
  cpKesalahanUmum: { id: "Terjadi kesalahan. Coba lagi.", en: "Something went wrong. Try again." },
  cpDrafJurnalPrefix: { id: "Draf jurnal:", en: "Journal draft:" },
  cpUsulanJurnal: { id: "Usulan jurnal", en: "Suggested journal entry" },
  cpDrafDimuat: {
    id: "Draf dimuat ke form Jurnal Umum — periksa lalu posting.",
    en: "The draft is loaded into the General Journal form — review it, then post.",
  },
  // Huruf debit/kredit pada ringkasan draf. Sengaja satu huruf: barisnya sempit.
  cpHurufDebit: { id: "D", en: "Dr" },
  cpHurufKredit: { id: "K", en: "Cr" },

  // — Panduan dalam aplikasi (Fase 19t). Awalan `pd`. —
  // Hanya KERANGKA-nya yang dwibahasa. Isi panduannya (./panduan/content)
  // tetap Indonesia, sekeluarga dengan keputusan pemilik soal dokumen cetak:
  // itu korpus dokumentasi untuk UKM Indonesia, bukan teks antarmuka.
  pdCariPanduanPlaceholder: {
    id: "Cari panduan… (mis. PPN, gaji, stok)",
    en: "Search the guide… (e.g. PPN, payroll, stock)",
  },
  pdCariPanduanAria: { id: "Cari panduan", en: "Search the guide" },
  pdTakAdaCocok: {
    id: "Tidak ada panduan yang cocok. Coba satu kata saja, misalnya \"faktur\" atau \"stok\".",
    en: "No guide matches that. Try a single word, such as \"invoice\" or \"stock\".",
  },
  pdTakDitemukan: { id: "Panduan tidak ditemukan.", en: "Guide not found." },
  pdKembaliKeDaftar: { id: "← Kembali ke daftar panduan", en: "← Back to the guide list" },

  // — Manufaktur: teks tampilan yang duduk di atribut (Fase 19u) —
  mfPerintahProduksi: { id: "Perintah produksi", en: "Production orders" },
  mfRiwayatProduksi: { id: "Riwayat produksi", en: "Production history" },
  mfWorkCenterJudul: { id: "Work center (pusat kerja)", en: "Work centers" },
  mfStandar: { id: "Standar", en: "Standard" },
  mfAktual: { id: "Aktual", en: "Actual" },
  mfVarian: { id: "Varian", en: "Variance" },
  // BUKAN `tahapBaru`/`tahapPenawaran` dsb — itu tahap pipeline CRM. Di sini
  // "Tahap" berarti langkah routing produksi (pelajaran 16u sekali lagi).
  mfTahap: { id: "Tahap", en: "Step" },
  mfPhNamaWc: { id: "Pemotongan", en: "Cutting" },
  mfPhTahap: { id: "Potong bahan", en: "Cut material" },

  // — Dimensi & Pemeliharaan: teks tampilan di atribut (Fase 19u) —
  dmCostCenter: { id: "Cost center / departemen", en: "Cost centres / departments" },
  dmPhNamaDimensi: { id: "Cabang Bandung", en: "Bandung branch" },
  dmDimensi: { id: "Dimensi", en: "Dimension" },
  mtJadwalBerkala: { id: "Jadwal servis berkala", en: "Recurring service schedules" },
  mtWorkOrderAdhoc: { id: "Work order ad-hoc", en: "Ad-hoc work orders" },
  mtJadwalServis: { id: "Jadwal servis", en: "Service schedule" },
  mtAksi: { id: "Aksi", en: "Action" },
  mtRencana: { id: "Rencana", en: "Planned" },

  // — Sisa teks tampilan di atribut (Fase 19u bagian 2) —
  mlProfilPerusahaan: { id: "Profil perusahaan", en: "Company profile" },
  mlPhAlamat: { id: "Jl. Merdeka No. 1, Jakarta", en: "1 Merdeka St, Jakarta" },
  mlPhNamaProduk: { id: "Kopi Susu Gula Aren", en: "Palm Sugar Latte" },
  mpImporPesanan: { id: "Impor pesanan", en: "Import orders" },
  mpPesananTerimpor: { id: "Pesanan terimpor", en: "Imported orders" },
  mpKanal: { id: "Kanal", en: "Channel" },
  mpNoPesanan: { id: "No. Pesanan", en: "Order no." },
  mpDiimpor: { id: "Diimpor", en: "Imported" },
  mpDataCsv: { id: "Data CSV pesanan", en: "Order CSV data" },
  adBagianAdmin: { id: "Bagian admin", en: "Admin sections" },
  ktKontrakBaru: { id: "Kontrak baru", en: "New contract" },
  hdTiketBaru: { id: "Tiket baru", en: "New ticket" },
  hdPhBalasan: { id: "Tulis balasan…", en: "Write a reply…" },
  dsKirimPengingatWa: { id: "Kirim pengingat via WhatsApp", en: "Send a reminder via WhatsApp" },
  pjBuktiPotongPph23: { id: "Bukti potong PPh 23", en: "PPh 23 withholding slips" },
  pjRekanan: { id: "Rekanan", en: "Counterparty" },
  cpTutupTur: { id: "Tutup tur", en: "Close the tour" },
  cuPhNamaMataUang: { id: "Dolar Amerika", en: "US Dollar" },
  fnPhNamaAkun: { id: "Piutang Karyawan", en: "Employee Receivables" },
  mdPhNamaProduk: { id: "Kopi Arabika 1kg", en: "Arabica Coffee 1kg" },
  apMenungguSaya: { id: "Menunggu persetujuan saya", en: "Awaiting my approval" },
  apAjukan: { id: "Ajukan persetujuan", en: "Submit for approval" },
  apRiwayat: { id: "Riwayat alur persetujuan", en: "Approval history" },
  apAturan: { id: "Aturan persetujuan", en: "Approval rules" },

  // — Sisa pecahan toast yang luput karena dirakit di variabel, di LUAR
  //   panggilan toast() sehingga alat menggolongkannya LAYAR (Fase 19t). —
  cmRefundTunai: { id: ", refund tunai", en: ", cash refund" },
  cmSelisihKurs: { id: "selisih kurs", en: "FX difference" },
  cmKursLaba: { id: "laba", en: "gain" },
  cmKursRugi: { id: "rugi", en: "loss" },

  // — Kas kecil sistem dana tetap (Fase 22c) —
  kkJudul: { id: "Kas kecil (dana tetap)", en: "Petty cash (imprest fund)" },
  kkDesc: {
    id: "Kotak uang tunai untuk belanja kecil. Setiap bon dicatat seperti pengeluaran biasa. Saat kotaknya menipis, sistem menghitung sendiri berapa yang perlu diisikan supaya kembali ke dana tetap.",
    en: "A cash box for small purchases. Each receipt is recorded like any other expense; when the box runs low, the system works out for itself how much to top up to reach the fund amount.",
  },
  kkDanaTetap: { id: "Dana tetap", en: "Fund amount" },
  kkSaldoBuku: { id: "Saldo menurut catatan", en: "Balance per the books" },
  kkKekurangan: { id: "Perlu diisi", en: "Needs topping up" },
  kkTerakhirDiisi: { id: "Terakhir diisi", en: "Last topped up" },
  kkBelumPernahDiisi: { id: "Belum pernah", en: "Never" },
  kkSimpanDanaTetap: { id: "Simpan dana tetap", en: "Save fund amount" },
  kkAturDanaTetapDulu: {
    id: "Setel dana tetap lebih dulu supaya sistem tahu berapa isi kotak seharusnya.",
    en: "Set the fund amount first so the system knows how full the box should be.",
  },
  kkSumberPengisian: { id: "Diisi dari akun", en: "Top up from account" },
  kkIsiUlang: { id: "Isi ulang kas kecil", en: "Top up petty cash" },
  kkSudahPenuh: { id: "Kotak masih penuh — belum perlu diisi.", en: "The box is still full — no top-up needed yet." },
  kkOpname: { id: "Hitung isi kotak (opname)", en: "Count the box (stock-take)" },
  kkOpnameDesc: {
    id: "Hitung uang yang benar-benar ada di kotak. Selisihnya terhadap catatan dijurnal ke akun Selisih Kas — kurang maupun lebih.",
    en: "Count the money actually in the box. Any gap against the books is journalled to the Cash Over/Short account — short or over.",
  },
  kkHitunganFisik: { id: "Hasil hitungan fisik", en: "Physical count result" },
  kkCatatanOpname: { id: "Catatan (opsional)", en: "Note (optional)" },
  kkCatatOpname: { id: "Catat hasil opname", en: "Record the count" },
  kkPas: { id: "Cocok dengan catatan — tidak ada jurnal.", en: "Matches the books — no journal made." },
  kkKurangPrefix: { id: "Kurang", en: "Short by" },
  kkLebihPrefix: { id: "Lebih", en: "Over by" },
  kkPhCatatan: { id: "Bon parkir belum masuk", en: "Parking receipt not yet entered" },
  kkDanaTetapDisimpan: { id: "Dana tetap kas kecil disimpan.", en: "Petty cash fund amount saved." },

  // — Penyusutan saldo menurun & fiskal (Fase 22d) —
  adMetodePenyusutan: { id: "Metode penyusutan", en: "Depreciation method" },
  adGarisLurus: { id: "Garis lurus", en: "Straight line" },
  adSaldoMenurun: { id: "Saldo menurun", en: "Declining balance" },
  adKelompokHarta: { id: "Kelompok harta pajak", en: "Tax asset group" },
  adBelumDiatur: { id: "— belum diatur —", en: "— not set —" },
  adJudulFiskal: { id: "Penyusutan fiskal vs komersial", en: "Fiscal vs commercial depreciation" },
  adDescFiskal: {
    id: "Buku besar memakai penyusutan komersial. Angka fiskal dihitung dari kelompok harta pajak dan dipakai untuk merekonsiliasi laba komersial ke laba fiskal di SPT.",
    en: "The ledger uses commercial depreciation. The fiscal figure is derived from the tax asset group and used to reconcile commercial profit to taxable profit in the annual return.",
  },
  adTahunPajak: { id: "Tahun pajak", en: "Tax year" },
  adKomersial: { id: "Komersial (dijurnal)", en: "Commercial (journalled)" },
  adFiskal: { id: "Fiskal (memo)", en: "Fiscal (memo)" },
  adKoreksiFiskal: { id: "Koreksi fiskal", en: "Fiscal adjustment" },
  adTanpaKelompokSuffix: {
    id: "aset belum diberi kelompok harta pajak — penyusutan fiskalnya belum bisa dihitung.",
    en: "assets have no tax asset group yet — their fiscal depreciation cannot be computed.",
  },
  adAngsuranBerikutnya: { id: "angsuran berikutnya", en: "next instalment" },

  // — Kalender pajak Indonesia (Fase 22e) —
  kpTabKalender: { id: "Kalender pajak", en: "Tax calendar" },
  kpProfilJudul: { id: "Profil pajak perusahaan", en: "Company tax profile" },
  kpProfilDesc: {
    id: "Menentukan kewajiban mana yang muncul di kalender. Kalender yang memuat kewajiban yang tidak berlaku akan cepat diabaikan, dan pengingat yang diabaikan sama saja tidak ada.",
    en: "Determines which obligations appear in the calendar. A calendar full of obligations that don't apply gets ignored — and a reminder that is ignored is no reminder at all.",
  },
  kpPkp: { id: "Pengusaha Kena Pajak (PKP)", en: "VAT-registered (PKP)" },
  kpPphFinalUmkm: { id: "Pakai PPh Final UMKM 0,5%", en: "Uses 0.5% final small-business income tax" },
  kpBadanUsaha: { id: "Berbentuk badan (PT/CV)", en: "Incorporated entity (PT/CV)" },
  kpAdaKaryawan: {
    id: "Terdeteksi punya karyawan aktif — kewajiban PPh 21 ikut ditampilkan.",
    en: "Active employees detected — PPh 21 obligations are included.",
  },
  kpTanpaKaryawan: {
    id: "Belum ada karyawan aktif, jadi PPh 21 tidak ditampilkan. Ini dibaca dari data karyawan, bukan disetel manual.",
    en: "No active employees, so PPh 21 is not shown. This is read from your employee data, not set manually.",
  },
  kpProfilDisimpan: { id: "Profil pajak disimpan.", en: "Tax profile saved." },

  // — Proyeksi arus kas 30/60/90 hari (Fase 22f) —
  pkJudul: { id: "Proyeksi arus kas 30/60/90 hari", en: "30/60/90-day cash projection" },
  pkDesc: {
    id: "Perkiraan saldo kas ke depan dari piutang & utang yang jatuh tempo dan faktur kontrak berikutnya. Tidak menjurnal apa pun.",
    en: "A forward view of your cash balance from receivables and payables coming due plus the next contract invoice. Nothing is journalled.",
  },
  pkSaldoSekarang: { id: "Saldo kas & bank sekarang", en: "Cash and bank balance today" },
  pkJangka: { id: "Jangka", en: "Horizon" },
  pkHari: { id: "hari", en: "days" },
  pkMasuk: { id: "Perkiraan masuk", en: "Expected in" },
  pkKeluar: { id: "Perkiraan keluar", en: "Expected out" },
  pkSaldoAkhir: { id: "Saldo akhir", en: "Closing balance" },
  pkDefisitAwal: { id: "Kas diperkirakan MINUS dalam", en: "Cash is projected to go NEGATIVE within" },
  pkDefisitAkhir: { id: "hari ke depan — siapkan dana atau percepat penagihan.", en: "days — arrange funds or chase collections." },
  pkTerlambatSuffix: {
    id: "tagihan sudah lewat jatuh tempo dan tetap dihitung masuk. Proyeksi ini akan meleset jika tagihan tersebut tidak tertagih.",
    en: "invoices are already overdue and are still counted as incoming. This projection will be wrong if they are never collected.",
  },
  pkAsumsi: {
    id: "Asumsinya setiap tagihan dibayar tepat pada tanggal jatuh temponya, dan hanya satu faktur kontrak berikutnya yang diperhitungkan, bukan seluruh sisa masa kontrak.",
    en: "It assumes every invoice is paid exactly on its due date, and counts only the next contract invoice — not the rest of the contract term.",
  },
  kpJudul: { id: "Tenggat lapor & setor", en: "Filing and payment deadlines" },
  kpDesc: {
    id: "Tenggat menurut UU KUP. PPh 21 dan PPh 23 disetor tanggal 10 lalu dilaporkan tanggal 20 bulan berikutnya. PPh 25 dan PPh Final tanggal 15. SPT Masa PPN akhir bulan berikutnya.",
    en: "Statutory deadlines: PPh 21/23 paid by the 10th and filed by the 20th of the following month; PPh 25 and final tax by the 15th; the monthly VAT return by the end of the following month.",
  },
  kpKewajiban: { id: "Kewajiban", en: "Obligation" },
  kpMasa: { id: "Masa", en: "Period" },
  kpTenggat: { id: "Tenggat", en: "Deadline" },
  kpSisaHari: { id: "Sisa hari", en: "Days left" },
  kpSetor: { id: "Setor", en: "Pay" },
  kpLapor: { id: "Lapor", en: "File" },
  kpDigeser: { id: "digeser dari akhir pekan", en: "moved off the weekend" },
  kpTerlambat: { id: "Terlambat", en: "Late by" },
  kpKosong: { id: "Tidak ada tenggat dalam jendela ini. Lebarkan jendelanya untuk melihat tenggat yang lebih jauh.", en: "No deadlines in this window. Widen it to see deadlines further out." },
  kpCatatanLibur: {
    id: "Hari libur nasional & cuti bersama belum diperhitungkan — daftarnya terbit tiap tahun dan berubah. Tenggat sebenarnya karena itu bisa lebih lambat dari yang tertera, tidak pernah lebih awal.",
    en: "National and collective holidays are not accounted for — the list is issued yearly and changes. The real deadline may therefore be later than shown, never earlier.",
  },
  adFiskalTidakDijurnal: {
    id: "Angka fiskal tidak pernah dijurnal. Menjurnalkannya berarti menyusutkan aset dua kali.",
    en: "The fiscal figure is never journalled. Journalling it would depreciate the asset twice.",
  },

  // --- Harga bertingkat per grup pelanggan (Fase 23a) -----------------------
  ghGrup: { id: "Grup harga", en: "Price group" },
  ghTanpaGrup: { id: "Tanpa grup (harga dasar)", en: "No group (base price)" },
  ghGrupBaru: { id: "Grup baru", en: "New group" },
  ghNamaGrup: { id: "Nama grup", en: "Group name" },
  ghPhNamaGrup: { id: "mis. Grosir", en: "e.g. Wholesale" },
  ghTambahGrup: { id: "Tambah grup", en: "Add group" },
  ghDaftarGrup: { id: "Daftar grup harga", en: "Price groups" },
  ghBelumAdaGrup: {
    id: "Belum ada grup harga. Buat satu (mis. “Grosir”) lalu isi harga khususnya per produk.",
    en: "No price groups yet. Create one (e.g. “Wholesale”) then set its special prices per product.",
  },
  ghDaftarHarga: { id: "Daftar harga", en: "Price list" },
  ghPilihGrup: { id: "Pilih grup", en: "Pick a group" },
  ghProduk: { id: "Produk", en: "Product" },
  ghHargaDasar: { id: "Harga dasar", en: "Base price" },
  ghHargaKhusus: { id: "Harga khusus", en: "Special price" },
  ghSimpanHarga: { id: "Simpan harga", en: "Save price" },
  ghHapusHarga: { id: "Kembalikan ke harga dasar", en: "Revert to base price" },
  ghBelumAdaHarga: {
    id: "Grup ini belum punya harga khusus — seluruh produknya memakai harga dasar.",
    en: "This group has no special prices yet — all its products use the base price.",
  },
  ghNolItuGratis: {
    id: "Harga Rp 0 berarti gratis (barang bonus), bukan “belum diatur”. Untuk mengembalikan produk ke harga dasar, pakai tombol Kembalikan.",
    en: "A price of Rp 0 means free (a bonus item), not “not set”. To put a product back on the base price, use the Revert button.",
  },
  ghSatuanDasarInfo: {
    id: "Harga diisi per satuan dasar produk. Untuk baris faktur bersatuan besar (mis. dus), sistem mengalikannya sendiri dengan isi per satuan.",
    en: "Prices are entered per the product's base unit. For invoice lines in a larger unit (e.g. a box), the system multiplies it by the pack size for you.",
  },
  ghToastGrupDibuat: { id: "Grup harga dibuat.", en: "Price group created." },
  ghToastHargaDisimpan: { id: "Harga khusus disimpan.", en: "Special price saved." },
  ghToastHargaDihapus: { id: "Kembali ke harga dasar.", en: "Back to the base price." },
  ghLencanaHarga: { id: "Harga", en: "Price" },
  ghHargaNego: {
    id: "Harga diubah manual — mengganti pelanggan tidak akan menimpanya.",
    en: "Price edited manually — changing the customer will not overwrite it.",
  },

  // --- Toast (Fase 33h) — dulu literal Indonesia di dalam halaman, jadi
  // tidak pernah ikut bahasa aktif meski pemilih bahasa ada di tiap layar.
  toastAsetTerdaftar: { id: "Aset terdaftar & jurnal perolehan dibuat.", en: "Asset registered and its acquisition entry posted." },
  toastTahapDiperbarui: { id: "Tahap diperbarui.", en: "Stage updated." },
  toastAktivitasDicatat: { id: "Aktivitas dicatat.", en: "Activity logged." },
  toastLeadJadiPelanggan: { id: "Lead menjadi pelanggan. Sekarang bisa dibuatkan penawaran/faktur.", en: "Lead converted to a customer. You can now raise a quotation or invoice." },
  toastStatusPenawaran: { id: "Status penawaran diperbarui.", en: "Quotation status updated." },
  toastCostCenterDitambah: { id: "Cost center ditambahkan.", en: "Cost center added." },
  toastCostCenterDiarsip: { id: "Cost center diarsipkan.", en: "Cost center archived." },
  toastAturanDisimpan: { id: "Aturan auto-match disimpan.", en: "Auto-match rule saved." },
  toastAkunDitambah: { id: "Akun ditambahkan.", en: "Account added." },
  toastNamaAkunDiperbarui: { id: "Nama akun diperbarui.", en: "Account name updated." },
  toastNamaAkunPendek: { id: "Nama akun minimal 2 karakter.", en: "An account name needs at least 2 characters." },
  toastDrafAiDimuat: { id: "Draf dari Asisten AI dimuat — periksa lalu posting.", en: "Draft from the AI assistant loaded — review it, then post." },
  toastPilihGudangKarantina: { id: "Pilih gudang karantina dulu.", en: "Pick a quarantine warehouse first." },
  toastFileKosong: { id: "File kosong atau header tidak terbaca.", en: "The file is empty, or its header could not be read." },
  toastDataTersimpan: { id: "Data tersimpan.", en: "Saved." },
  toastPerubahanTersimpan: { id: "Perubahan tersimpan.", en: "Changes saved." },
  toastDataDiarsipkan: { id: "Data diarsipkan.", en: "Archived." },
  toastNomorSeriDitambah: { id: "Nomor seri ditambahkan.", en: "Serial number added." },
  toastKaryawanDitambah: { id: "Karyawan ditambahkan.", en: "Employee added." },
  toastDepartemenDitambah: { id: "Departemen ditambahkan.", en: "Department added." },
  toastDepartemenDiarsip: { id: "Departemen diarsipkan.", en: "Department archived." },
  toastKomponenDitambah: { id: "Komponen ditambahkan — akan ikut dihitung saat periode ini digaji.", en: "Component added — it will be included when this period is paid." },
  toastKomponenDihapus: { id: "Komponen dihapus.", en: "Component removed." },
  toastTransaksiDitahan: { id: "Transaksi ditahan.", en: "Sale put on hold." },
  toastProyekDibuat: { id: "Proyek dibuat.", en: "Project created." },
  toastStatusProyek: { id: "Status proyek diperbarui.", en: "Project status updated." },
  toastXmlCoretax: { id: "XML Coretax terunduh — impor lewat menu e-Faktur → Impor Faktur Keluaran.", en: "Coretax XML downloaded — import it from e-Faktur → Import Output Invoices." },
  toastPesananDibatalkanSo: { id: "Pesanan dibatalkan.", en: "Order cancelled." },
  toastUangMukaDicatat: { id: "Uang muka dicatat.", en: "Down payment recorded." },
  toastNamaDiperbarui: { id: "Nama diperbarui.", en: "Name updated." },
  toastPasswordDiganti: { id: "Password diganti. Sesi di perangkat lain telah dikeluarkan.", en: "Password changed. Sessions on other devices have been signed out." },
  toast2faAktif: { id: "2FA aktif. Kode authenticator kini diminta setiap login.", en: "2FA is on. An authenticator code is now required at every sign-in." },
  toast2faNonaktif: { id: "2FA dinonaktifkan.", en: "2FA turned off." },
  toastFormatNomorDisimpan: { id: "Format nomor dokumen disimpan.", en: "Document numbering format saved." },
  toastPengaturanDisimpan: { id: "Pengaturan perusahaan disimpan.", en: "Company settings saved." },
  toastFormatLogo: { id: "Format harus PNG, JPEG, WebP, atau SVG.", en: "The file must be PNG, JPEG, WebP, or SVG." },
  toastLogoBesar: { id: "Logo masih terlalu besar setelah dikecilkan — gunakan gambar yang lebih sederhana.", en: "The logo is still too large after shrinking — use a simpler image." },
  toastGambarRusak: { id: "Gambar tidak bisa dibaca.", en: "That image could not be read." },
  toastPerusahaanDibuat: { id: "Perusahaan baru dibuat. Beralih ke perusahaan tersebut…", en: "New company created. Switching to it…" },
  toastDriveDiputus: { id: "Sambungan Google Drive diputus.", en: "Google Drive disconnected." },
  toastKeamananDisimpan: { id: "Kebijakan keamanan disimpan.", en: "Security policy saved." },
  toastApiKeyDicabut: { id: "API key dicabut.", en: "API key revoked." },
  toastWebhookDihapus: { id: "Webhook dihapus.", en: "Webhook deleted." },
  toastPeranDihapus: { id: "Peran dihapus.", en: "Role deleted." },
  toastUndanganDikirim: { id: "Undangan dikirim.", en: "Invitation sent." },
  toastPeranAnggotaDiperbarui: { id: "Peran anggota diperbarui.", en: "Member role updated." },
  toastAnggotaDikeluarkan: { id: "Anggota dikeluarkan.", en: "Member removed." },

  // Toast bernilai dinamis (Fase 33h): lubang {0}/{1} diisi `isi()`,
  // supaya tiap bahasa menaruh nilainya menurut tata bahasanya sendiri.
  toastAsetDilepas: { id: "Aset dilepas dengan {0} {1}.", en: "Asset disposed at {0} {1}." },
  toastAnggaranDisimpan: { id: "Anggaran {0} disimpan.", en: "Budget {0} saved." },
  toastPengajuanMenunggu: { id: "Pengajuan {0} menunggu persetujuan Owner ({1}).", en: "Submission {0} is waiting for the owner's approval ({1})." },
  toastDokumenDiposting: { id: "{0} {1} diposting ({2}).", en: "{0} {1} posted ({2})." },
  toastDokumenDibatalkan: { id: "{0} dibatalkan — jurnal pembalik {1} diposting dan stoknya dikembalikan.", en: "{0} voided — reversing entry {1} posted, stock returned." },
  toastPembayaranDihapus: { id: "Pembayaran {0} dihapus — jurnal pembalik {1} diposting.", en: "Payment {0} deleted — reversing entry {1} posted." },
  toastReturDiposting: { id: "Retur {0} diposting ({1}{2}, jurnal {3}).", en: "Return {0} posted ({1}{2}, entry {3})." },
  toastPenawaranDibuat: { id: "Penawaran {0} dibuat ({1}).", en: "Quotation {0} created ({1})." },
  toastFakturDariPenawaran: { id: "Faktur {0} dibuat dari penawaran ({1}).", en: "Invoice {0} created from the quotation ({1})." },
  toastRekapDisusun: { id: "Rekap {0} disusun.", en: "Recap for {0} compiled." },
  toastJurnalDibalik: { id: "Jurnal {0} dibalik — pembalik {1} diposting.", en: "Entry {0} reversed — reversing entry {1} posted." },
  toastTemplateTersimpan: { id: "Template \"{0}\" tersimpan.", en: "Template \"{0}\" saved." },
  toastJurnalDiposting: { id: "Jurnal {0} diposting.", en: "Entry {0} posted." },
  toastTemplateDimuat: { id: "Template \"{0}\" dimuat ke form — periksa lalu posting.", en: "Template \"{0}\" loaded into the form — review it, then post." },
  toastJurnalDariTemplate: { id: "Jurnal {0} diposting dari template.", en: "Entry {0} posted from the template." },
  toastContohDitambah: { id: "{0} contoh produk & {1} kontak ditambahkan.", en: "{0} sample products and {1} contacts added." },
  toastPenggajianSelesai: { id: "Penggajian {0}: {1} karyawan, netto {2}.", en: "Payroll {0}: {1} employees, net {2}." },
  toastKasbonDicairkan: { id: "Kasbon dicairkan (jurnal {0}). Cicilannya memotong gaji tiap penggajian.", en: "Advance disbursed (entry {0}). Its instalments are deducted at every payroll run." },
  toastCutiDicatat: { id: "Pengajuan {0} {1} hari dicatat — menunggu persetujuan.", en: "A {1}-day {0} request was recorded — awaiting approval." },
  toastPenggajianDibatalkan: { id: "Penggajian {0} dibatalkan — jurnal pembalik {1}, saldo kasbon pulih.", en: "Payroll {0} voided — reversing entry {1}, advance balances restored." },
  toastRefundPos: { id: "Refund {0} — {1} keluar dari laci (jurnal {2}).", en: "Refund {0} — {1} out of the drawer (entry {2})." },
  toastShiftDibuka: { id: "Shift {0} dibuka.", en: "Shift {0} opened." },
  toastKembalian: { id: "{0} — kembalian {1}", en: "{0} — change {1}" },
  toastFakturDariTermin: { id: "Faktur {0} dibuat dari termin ({1}).", en: "Invoice {0} created from the milestone ({1})." },
  toastPesananDibuat: { id: "Pesanan {0} dibuat.", en: "Order {0} created." },
  toastSuratJalan: { id: "Surat jalan {0} — barang keluar.", en: "Delivery note {0} — goods shipped." },
  toastFakturDiterbitkan: { id: "Faktur {0} diterbitkan.", en: "Invoice {0} issued." },
  toastFieldKustom: { id: "Field kustom disimpan: {0}", en: "Custom field saved: {0}" },
  toastCadanganDrive: { id: "Cadangan terkirim ke Google Drive: {0}", en: "Backup sent to Google Drive: {0}" },
  toastJurnalPenutup: { id: "Jurnal penutup {0} diposting — laba/rugi bersih dipindahkan ke Laba Ditahan.", en: "Closing entry {0} posted — net profit or loss moved to Retained Earnings." },
  toastBukuDikunci: { id: "Pembukuan dikunci sampai {0}.", en: "Books locked through {0}." },
  toastTransferStok: { id: "Transfer {0} unit berhasil (nilai {1}).", en: "Transferred {0} units ({1} in value)." },
  toastPermintaanDibuat: { id: "Permintaan pembelian {0} dibuat — lanjutkan di menu Pengadaan.", en: "Purchase requisition {0} created — continue in Procurement." },
  labaKata: { id: "laba", en: "a gain of" },
  rugiKata: { id: "rugi", en: "a loss of" },
  prFakturTakDitemukan: { id: "Faktur tidak ditemukan, atau Anda tidak punya akses ke perusahaannya.", en: "Invoice not found, or you do not have access to its company." },
  stokUsulanCatatan: { id: "Usulan otomatis dari titik pesan (stok menipis)", en: "Suggested automatically from the reorder point (stock is low)" },

  // --- Fase 42a: batas kredit & termin pembayaran pelanggan -----------------
  //
  // Keterangan di bawah tiap medan menyebutkan selisih antara KOSONG dan NOL,
  // karena selisih itu mustahil ditebak dari nama medannya: kosong berarti
  // tanpa batas, sedangkan nol berarti pelanggan tidak boleh berutang sama
  // sekali. Medan angka yang salah dipahami di sini langsung memblokir
  // penjualan, jadi keterangannya bukan hiasan.
  mdTerminPembayaran: { id: "Termin pembayaran (hari)", en: "Payment term (days)" },
  mdTerminPlaceholder: { id: "mis. 30", en: "e.g. 30" },
  mdTerminBantuan: {
    id: "Dipakai mengisi jatuh tempo faktur. Kosongkan bila jatuh temponya selalu diisi manual.",
    en: "Used to fill in invoice due dates. Leave empty if due dates are always entered by hand.",
  },
  mdBatasKredit: { id: "Batas kredit (Rp)", en: "Credit limit (Rp)" },
  mdBatasKreditPlaceholder: { id: "kosong = tanpa batas", en: "empty = no limit" },
  mdBatasKreditBantuan: {
    id: "Faktur yang membuat piutang pelanggan melampaui batas ini ditolak sebelum diposting. Isi 0 bila pelanggan tidak boleh berutang sama sekali.",
    en: "An invoice that pushes this customer's receivables past the limit is refused before posting. Enter 0 if the customer may not carry any debt.",
  },

  // --- Fase 39c: dokumen cetak (apps/web/src/pages/print.tsx) ----------------
  //
  // Empat halaman cetak — faktur, penawaran, slip gaji, dan rekap 1721-A1 —
  // adalah satu-satunya naskah aplikasi yang MENINGGALKAN aplikasi: ia dicetak,
  // dilampirkan ke surel, dan dikirim ke pelanggan serta karyawan. Sampai fase
  // ini keempatnya berbahasa Indonesia harfiah, sehingga pengguna yang sudah
  // memilih Inggris tetap mengirimkan faktur berbahasa Indonesia — dan itu
  // justru dokumen yang paling dilihat orang di luar perusahaannya.
  prCetakPdf: { id: "🖨 Cetak / Simpan PDF", en: "🖨 Print / Save as PDF" },
  // Surat jalan (apps/web/src/pages/salesorders.tsx) dirakit sebagai string HTML
  // ke jendela cetak baru, bukan sebagai JSX — sehingga ia luput dari seluruh
  // program dwibahasa Fase 19 meski merupakan dokumen yang DISERAHKAN kepada
  // pelanggan dan ditandatangani penerimanya.
  sjJudul: { id: "SURAT JALAN", en: "DELIVERY NOTE" },
  sjPesanan: { id: "Pesanan", en: "Order" },
  sjKepada: { id: "Kepada:", en: "To:" },
  sjTanggal: { id: "Tanggal:", en: "Date:" },
  sjBarang: { id: "Barang", en: "Item" },
  sjJumlah: { id: "Jumlah", en: "Qty" },
  sjDiterimaOleh: { id: "Diterima oleh:", en: "Received by:" },
  prJejakErpindo: { id: "Dibuat dengan ERPindo — ERP untuk perusahaan Indonesia", en: "Made with ERPindo — ERP for Indonesian companies" },
  prTajukFaktur: { id: "FAKTUR", en: "INVOICE" },
  prTajukPenawaran: { id: "PENAWARAN", en: "QUOTATION" },
  prTanggalLabel: { id: "Tanggal:", en: "Date:" },
  prStatusLabel: { id: "Status:", en: "Status:" },
  prLunas: { id: "LUNAS", en: "PAID" },
  prBelumLunas: { id: "BELUM LUNAS", en: "UNPAID" },
  prKolomBarang: { id: "Barang", en: "Item" },
  prKolomJumlah: { id: "Jumlah", en: "Amount" },
  prSudahDibayar: { id: "Sudah dibayar", en: "Already paid" },
  prPenawaranTakDitemukan: { id: "Penawaran tidak ditemukan, atau Anda tidak punya akses ke perusahaannya.", en: "Quotation not found, or you do not have access to its company." },
  prKedaluwarsa: { id: "(KEDALUWARSA)", en: "(EXPIRED)" },
  prCatatan: { id: "Catatan", en: "Notes" },
  prPenawaranBukanTagihan: { id: "Dokumen ini adalah penawaran harga, bukan tagihan. Harga dapat berubah setelah masa berlaku berakhir.", en: "This document is a price quotation, not an invoice. Prices may change once the validity period ends." },
  prSlipTakDitemukan: { id: "Slip gaji tidak ditemukan, atau Anda tidak punya akses ke perusahaannya.", en: "Payslip not found, or you do not have access to its company." },
  prKaryawanTakDitemukan: { id: "Karyawan tidak ditemukan, atau Anda tidak punya akses ke perusahaannya.", en: "Employee not found, or you do not have access to their company." },
  prNamaKaryawan: { id: "Nama karyawan", en: "Employee name" },
  prStatusPtkp: { id: "Status PTKP:", en: "PTKP status:" },
  prRekening: { id: "Rekening:", en: "Bank account:" },
  prSlipCatatanKaki: { id: "Slip gaji ini dihasilkan otomatis oleh ERPindo. Tarif PPh 21 (TER) & BPJS mengikuti ketentuan yang berlaku.", en: "This payslip is generated automatically by ERPindo. PPh 21 (TER) and BPJS rates follow the regulations in force." },
  prKolomMasa: { id: "Masa", en: "Period" },
  prBelumAdaPenggajian: { id: "Belum ada penggajian untuk karyawan ini di tahun {0}. Jalankan penggajian lebih dulu lewat menu Penggajian, lalu cetak ulang ringkasan ini.", en: "No payroll has been run for this employee in {0}. Run payroll from the Payroll menu first, then print this summary again." },
  prRekapCatatanKaki: { id: "Ringkasan ini disusun dari data penggajian di ERPindo sebagai alat bantu. Untuk pelaporan pajak resmi, cocokkan dengan formulir 1721-A1 dan ketentuan DJP yang berlaku.", en: "This summary is assembled from ERPindo payroll data as an aid. For official tax reporting, reconcile it against form 1721-A1 and the DJP regulations in force." },

  // Fase 33h — dulu dirakit dari potongan kamus (prefix + nilai + suffix),
  // yang mengunci urutan kata Indonesia ke dalam kode.
  toastDisetujuiDiposting: { id: "Disetujui — {0} diposting ({1}).", en: "Approved — {0} posted ({1})." },
  toastRevaluasiTersimpan: { id: "Revaluasi tersimpan — {0} {1}.", en: "Revaluation saved — {0} of {1}." },
  toastTransaksiTercatat: { id: "Tercatat: {0}", en: "Recorded: {0}" },
  toastMutasiDiimpor: { id: "{0} mutasi diimpor — {1} langsung cocok.", en: "{0} statement rows imported — {1} matched automatically." },
  toastKasKecilTerisi: { id: "Kas kecil terisi {0} (jurnal {1}).", en: "Petty cash topped up by {0} (entry {1})." },
  toastProduksiSelesai: { id: "Produksi selesai — biaya {0}.", en: "Production completed — cost {0}." },
  toastSaldoAwalTersimpan: { id: "Saldo awal tersimpan (jurnal {0}, nilai stok {1}).", en: "Opening balances saved (entry {0}, stock value {1})." },
  toastBuktiPotongSiap: { id: "Bukti potong {0} dibuat dan siap dicetak.", en: "Withholding slip {0} created and ready to print." },
  toastProdukDipindai: { id: "{0} · {1}", en: "{0} · {1}" },
  toastBarcodeTakDikenal: { id: "Barcode {0} tidak dikenal. Tambahkan barcodenya di data produk.", en: "Barcode {0} is not recognised. Add it to the product record." },
  toastPermintaanDiajukan: { id: "Permintaan {0} diajukan.", en: "Requisition {0} submitted." },
  toastPesananPoDibuat: { id: "Pesanan {0} dibuat.", en: "Order {0} created." },
  toastBarangDiterima: { id: "Barang diterima — faktur pembelian {0} terbentuk dan stok masuk.", en: "Goods received — purchase invoice {0} created and stock is in." },
  toastStokDisesuaikan: { id: "Stok disesuaikan {0}{1}.", en: "Stock adjusted {0}{1}." },
  surplusKata: { id: "surplus", en: "a surplus" },
  rugiPenurunanKata: { id: "rugi penurunan nilai", en: "an impairment loss" },
  toastJurnalSuffix: { id: " (jurnal {0})", en: " (entry {0})" },
  // THR — Tunjangan Hari Raya (Fase 43a)
  tabThr: { id: "THR", en: "Holiday allowance" },
  bayarThr: { id: "Bayar THR", en: "Pay holiday allowance" },
  descBayarThr: {
    id: "THR wajib dibayar paling lambat 7 hari sebelum hari raya. Besarnya satu bulan upah untuk masa kerja 12 bulan ke atas, dan proporsional di bawah itu.",
    en: "Religious holiday allowance is legally due at least 7 days before the holiday. It is one month's wage for 12 months of service or more, and pro-rated below that.",
  },
  hariRaya: { id: "Hari raya", en: "Religious holiday" },
  tahunThr: { id: "Tahun", en: "Year" },
  masaKerja: { id: "Masa kerja", en: "Length of service" },
  upahSebulan: { id: "Upah sebulan", en: "Monthly wage" },
  nilaiThr: { id: "THR", en: "Allowance" },
  proporsionalLabel: { id: "Proporsional", en: "Pro-rated" },
  penuhLabel: { id: "Penuh", en: "Full" },
  belumBerhak: { id: "Belum berhak", en: "Not yet entitled" },
  tanpaTanggalMasuk: { id: "Tanggal masuk kosong", en: "Join date missing" },
  pratinjauThr: { id: "Pratinjau THR", en: "Preview allowance" },
  riwayatThr: { id: "Riwayat pembayaran THR", en: "Holiday allowance history" },
  belumAdaThr: { id: "Belum ada pembayaran THR", en: "No holiday allowance paid yet" },
  descRiwayatThr: {
    id: "Setiap pembayaran THR mencatat masa kerja dan upah yang dipakai saat itu, sehingga slip tahun lalu tetap benar meski gaji sudah naik.",
    en: "Each payment records the length of service and wage used at the time, so last year's slip stays correct even after a raise.",
  },
  descPratinjauThr: {
    id: "Daftar ini belum memindahkan uang. Periksa dulu siapa yang berhak dan berapa, lalu bayarkan.",
    en: "This list moves no money yet. Check who is entitled and how much, then pay.",
  },
  peringatanTanggalMasuk: {
    id: "{0} karyawan belum punya tanggal masuk, sehingga masa kerjanya tidak bisa dihitung dan mereka tidak ikut dibayar. Lengkapi di tab Karyawan lebih dulu.",
    en: "{0} employees have no join date, so their length of service cannot be computed and they are left out. Fill it in under the Employees tab first.",
  },
  penerimaThr: { id: "Penerima", en: "Recipients" },
  pph21Thr: { id: "PPh 21", en: "Income tax" },
  tutupRincian: { id: "Tutup", en: "Close" },
  lihatRincian: { id: "Rincian", en: "Details" },
  toastThrDibayar: {
    id: "THR {0} dibayarkan kepada {1} karyawan, total netto {2}.",
    en: "Holiday allowance {0} paid to {1} employees, net total {2}.",
  },
  toastThrDibatalkan: {
    id: "Pembayaran THR {0} dibatalkan — jurnal balik {1}.",
    en: "Holiday allowance payment {0} cancelled — reversing entry {1}.",
  },
  bulanSatuan: { id: "bulan", en: "months" },
} satisfies Record<string, Dual>;

export type UiKey = keyof typeof UI;

/** Penerjemah istilah UI bersama: `const u = useUi(); u("simpan")`. */
export function useUi(): (key: UiKey) => string {
  const lang = useLang();
  return (key: UiKey) => UI[key]?.[lang] ?? String(key);
}
