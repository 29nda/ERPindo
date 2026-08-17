# Fase 28 — demo publik dijadikan perusahaan yang masuk akal

Pemilik meminta dua utang yang sudah tercatat dilunasi: contoh **Grup Harga**
belum tersemai, dan riwayat **gaji & penyusutan** baru ±2 periode.

Memverifikasinya ke database produksi lebih dulu — bukan mengerjakan langsung
dari catatan — memunculkan sesuatu yang belum pernah tercatat sama sekali.

## Yang ditemukan: demo tampil RUGI Rp 20,7 juta di bulan lalu

Laba-rugi bulanan demo produksi, dikueri langsung dari `erpindo-tenant-2`:

| Bulan | Pendapatan | Beban | Gaji | Laba |
| --- | --- | --- | --- | --- |
| 2026-02 | 11,3 jt | 7,1 jt | **0** | +4,2 jt |
| 2026-03 | 24,2 jt | 14,6 jt | **0** | +9,6 jt |
| 2026-04 | 20,7 jt | 12,7 jt | **0** | +8,0 jt |
| 2026-05 | 20,7 jt | 12,7 jt | **0** | +8,0 jt |
| 2026-06 | 21,2 jt | 13,0 jt | **0** | +8,2 jt |
| **2026-07** | 11,0 jt | 31,7 jt | 23,3 jt | **−20,7 jt** |
| 2026-08 | 96,5 jt | 87,7 jt | 25,5 jt | +8,8 jt |

Empat cacat, seluruhnya terbukti lewat kueri, bukan dugaan:

1. **Lima bulan tanpa gaji sama sekali** — perusahaan berkaryawan empat orang
   yang tidak menggaji siapa pun selama lima bulan, lalu Juli menanggungnya
   sendirian. Pengunjung yang membuka Laba Rugi dan memilih "bulan lalu" —
   pilihan paling wajar — melihat **rugi Rp 20,7 juta**.
2. **Hutang Usaha Rp 231,8 juta** — tidak satu pun pembelian riwayat pernah
   dibayar. Di Neraca: kas Rp 152 jt, hutang Rp 232 jt.
3. **Penyusutan hanya satu periode** — akumulasi Rp 3 jt atas aset Rp 114 jt,
   dan bulan berjalan tidak punya beban penyusutan sama sekali.
4. **Grup Harga kosong** — 0 grup, 0 baris harga, 0 kontak bergrup. Menunya ada
   di sidebar, pengunjung mengekliknya, layarnya kosong.

### Akar cacat 1–3 satu dan sama: aritmetika 30 hari

Blok riwayat Fase 24c menempatkan enam bulan penjualan dengan `daysAgo(m * 30)`.
Bulan kalender bukan 30 hari, jadi jendelanya melenceng makin jauh tiap bulan
mundur: Februari hanya terisi separuh, dan **Juli nyaris tidak kebagian
penjualan grosir** — sementara Juli-lah bulan pertama yang menanggung gaji.

Bentuk bug ini sudah **dua kali** ditambal di berkas yang sama (`lastMonth` dan
`dalamBulanIni`, keduanya Fase 19b): salah hanya pada sebagian tanggal, jadi
tidak pernah terlihat di hari biasa. Kali ketiga inilah ia dipindahkan ke berkas
tersendiri yang bisa diuji.

## Yang dikerjakan

Seluruhnya di skrip penyemaian. **Tidak satu baris pun kode aplikasi disentuh** —
semua cacat di sini adalah data semai, dan menambal produk untuk memperbaiki
demo justru menyembunyikan masalahnya.

- **`scripts/lib/kalender.mjs`** (baru) — bulan riwayat dihitung dari kalender.
  Tanggal dijepit ke panjang bulan, sehingga meminta "tanggal 31" di Februari
  memberi 28/29, bukan melimpah ke Maret.
- **Volume dinaikkan ±4×** dengan tanjakan landai. Ini bukan kosmetik: marjin
  kotor lama Rp 7,9 jt/bulan tidak mungkin menanggung gaji Rp 24,4 jt/bulan —
  menambahkan gaji tanpa menaikkan volume akan membuat kelima bulan rugi ±16 jt,
  persis kegagalan yang sudah diperingatkan komentar Fase 24c di berkas itu.
- **Gaji 7 periode** dan **penyusutan 7 periode**, keduanya menyusuri daftar
  bulan yang SAMA dengan blok penjualan — jadi mustahil berselisih lagi.
- **Hutang belanja riwayat dilunasi**; perolehan aset dimundurkan ke sebelum
  jendela riwayat; **modal awal dipindah ke 14 bulan lalu** dan dinaikkan.
- **Grup Harga**: 2 grup (Grosir −12%, Reseller −18%), 6 baris harga, 2 pelanggan
  dikaitkan.
- **35 tangkapan layar diregenerasi** dari semai yang sama, sehingga angka di
  halaman depan identik dengan angka di demo.

Catatan yang perlu dibaca sebelum mengira demo salah: harga grup **disarankan,
bukan ditegakkan** (keputusan sadar, `priceGroups.ts`). Faktur-faktur riwayat
tetap memakai harga dasar, dan itu benar.

## Tiga kekeliruan saya sendiri, ditemukan oleh pemeriksaan yang sama

Percobaan pertama lulus "laba positif tiap bulan" tetapi menghasilkan neraca
yang mustahil. Ketiganya ketahuan karena hasil semai **diperiksa angkanya**,
bukan sekadar dinyatakan berhasil karena skripnya keluar dengan kode 0:

| Yang salah | Angkanya | Sebab |
| --- | --- | --- |
| Kas Rp 284,8 jt vs Bank Rp 0,1 jt | UKM yang menyimpan seperempat miliar di laci | faktur terbesar tiap bulan diarahkan ke kas |
| Hutang Usaha Rp 141 jt | masih separuh masalah awal | satu bulan belanja sengaja disisakan — padahal sebulan kini bernilai Rp 64,7 jt |
| Piutang Rp 196 jt, tunggakan tertua 6 bulan | perusahaan yang tidak pernah menagih | satu faktur menunggak disisakan di SETIAP bulan |

Dan satu lagi yang hanya terlihat dari gambarnya, bukan dari angkanya: dengan
tanjakan pertumbuhan yang curam, bulan terakhir riwayat menembus Rp 106,6 jt —
**melampaui bulan berjalan yang baru separuh jalan**. Dasbor lalu menampilkan
"▼19% vs bulan lalu" dan "▼36%" berwarna merah, dan dasbor itu adalah gambar
produk terbesar di halaman depan. Tanjakannya dilandaikan (7,5% sepanjang enam
bulan, bukan 22,5%) supaya puncaknya bukan di masa lalu.

## Hasil

| Bulan | Pendapatan | Beban | Gaji | Susut | Laba |
| --- | --- | --- | --- | --- | --- |
| 2026-02 | 78,4 jt | 75,6 jt | 23,3 jt | 3,0 jt | **+2,8 jt** |
| 2026-03 | 79,7 jt | 76,3 jt | 23,3 jt | 2,9 jt | **+3,4 jt** |
| 2026-04 | 81,3 jt | 77,1 jt | 23,3 jt | 2,9 jt | **+4,1 jt** |
| 2026-05 | 82,1 jt | 77,6 jt | 23,3 jt | 2,8 jt | **+4,5 jt** |
| 2026-06 | 83,7 jt | 78,5 jt | 23,3 jt | 2,8 jt | **+5,2 jt** |
| 2026-07 | 90,3 jt | 82,9 jt | 23,3 jt | 2,8 jt | **+7,3 jt** |
| 2026-08 | 96,5 jt | 87,8 jt | 25,5 jt | 2,7 jt | **+8,8 jt** |

| Yang diperiksa | Sasaran | Hasil |
| --- | --- | --- |
| Laba tiap bulan | positif | ✅ +2,8 jt → +8,8 jt, menanjak |
| Penggajian | 7 periode | ✅ 7 |
| Penyusutan | 7 periode | ✅ 14 entri (2 aset × 7), akumulasi 19,9 jt |
| Kas & bank | tidak pernah negatif | ✅ terendah 280,0 jt |
| Neraca seimbang | selisih 0 | ✅ 0 |
| Grup Harga | 2 grup, ≥6 baris, 2 kontak | ✅ persis |
| Hutang Usaha | ±50–60 jt | ⚠️ **76,4 jt** — di atas sasaran |
| Piutang Usaha | — | 86,3 jt (±1 bulan penjualan) |
| Kas / Bank | proporsional | ✅ 58,4 jt / 248,5 jt |

**Sasaran hutang usaha meleset dan tidak ditutupi.** Rp 76,4 jt itu tersusun
dari belanja grosir bulan berjalan yang memang belum jatuh tempo (Rp 57,2 jt)
dan enam pembelian ritel lama (Rp 19,1 jt) yang sengaja menua supaya laporan
Umur Hutang punya isi. Menurunkannya ke Rp 50–60 jt berarti melunasi hutang yang
belum jatuh tempo — lebih tidak masuk akal daripada angkanya sendiri. Sasarannya
yang keliru, bukan hasilnya.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | 0 | — |
| `pnpm test` | 0 | **578** (dari 561) |
| `pnpm smoke` | 0 | **1.115** (tetap) |
| `node scripts/ui-sim.mjs` | 0 | **343/343** (tetap) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

**Dibuktikan bisa gagal** — helper kalender dikembalikan ke aritmetika `m * 30`,
yaitu keadaan sebelum fase ini:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| `bulanRiwayat()` kembali memakai kelipatan 30 hari | **11 dari 17** uji merah, dengan pesan yang menyebut cacat produksinya sendiri: *"ada bulan yang DOBEL: 2025-12, 2025-12"*, lompatan `2026-01 → 2026-03` (Februari hilang), dan *"tanggal 2026-03-04 bocor keluar dari 2026-02"* |

Sabotase ini mengembalikan kode ke keadaan **sebelum** fase ini, jadi bulan yang
dobel dan bulan yang hilang itu bukan simulasi — itu keadaan demo sampai hari ini.

## Yang TIDAK dikerjakan

- **Kode aplikasi tidak disentuh sama sekali.**
- **Harga grup tidak dibuat ditegakkan** — keputusan produk yang sudah diambil
  sadar; menyentuhnya berarti mengubah faktur, kasir, pesanan penjualan,
  penawaran, kontrak, dan API publik sekaligus.
- **"Penjualan Bulan Ini ▼5% vs bulan lalu" dibiarkan merah.** Bulan berjalan
  memang baru separuh jalan saat gambar diambil, jadi perbandingannya dengan
  bulan penuh selalu timpang. Menghapus tanda merah itu berarti menggelembungkan
  bulan berjalan sampai tidak wajar; laba tetap **▲20% hijau** di sebelahnya.
- **September–Desember 2025 tetap kosong** di laporan 12 bulan. Perusahaan demo
  "berdiri" Juni 2025 (modal), berjualan sekali Agustus 2025 sebagai pembanding
  tahun lalu, lalu mulai beroperasi penuh Februari 2026. Mengisi empat bulan itu
  di luar lingkup yang diminta — dicatat, bukan didiamkan.
- **Hutang Gaji Rp 8,1 jt** (potongan PPh21 & BPJS yang belum disetor) ikut
  tumbuh karena penggajian kini 7 periode, bukan 2. Perilaku lama yang membesar,
  bukan yang baru.
- **Klik-tembus demo publik belum diverifikasi dari sesi ini** — lihat catatan
  penyemaian produksi di bawah.

## Penyemaian produksi — dikerjakan, dan hasilnya diperiksa

Dijalankan setelah PR ini masuk `main`. Urutannya persis runbook: probe dulu
(`comped: YA`, `demo sudah ada: YA`), baru penghapusan, baru semai.

Penghapusan dikerjakan **lewat Cloudflare MCP, bukan `bersihkan-tenant.mjs`** —
sesi ini tidak memegang kredensial Cloudflare. Urutan skripnya ditiru persis:
82 tabel di-DROP terbalik di tiap database, `sqlite_master` diperiksa
mengembalikan **0** sebelum satu pun baris control-plane disentuh, lalu 11 tabel
control-plane + `tenants`, lalu sapuan pengguna yatim. Kehilangan yang perlu
dinyatakan: pengaman bawaan skrip (penolakan atas slug terlindungi) **tidak ikut
berjalan** — yang menjaga `softtin` hanyalah pemetaan binding yang diverifikasi
lebih dulu (`softtin` = `TENANT_DB_1`, demo = `TENANT_DB_2`/`TENANT_DB_3`).

Semai memakan **18 menit**, lebih lama dari ±9 menit sebelumnya — memang wajar,
langkahnya bertambah tujuh penggajian dan tujuh penyusutan.

### Hasil produksi, dikueri langsung

| Bulan | Pendapatan | Beban | Gaji | Susut | Laba |
| --- | --- | --- | --- | --- | --- |
| 2026-02 | 78,6 jt | 75,8 jt | 23,3 jt | 3,0 jt | **+2,8 jt** |
| 2026-03 | 79,7 jt | 76,3 jt | 23,3 jt | 2,9 jt | **+3,4 jt** |
| 2026-04 | 81,3 jt | 77,1 jt | 23,3 jt | 2,9 jt | **+4,1 jt** |
| 2026-05 | 82,1 jt | 77,6 jt | 23,3 jt | 2,8 jt | **+4,5 jt** |
| 2026-06 | 83,7 jt | 78,5 jt | 23,3 jt | 2,8 jt | **+5,2 jt** |
| 2026-07 | 90,3 jt | 82,9 jt | 23,3 jt | 2,8 jt | **+7,3 jt** |
| 2026-08 | 96,5 jt | 87,8 jt | 25,5 jt | 2,7 jt | **+8,8 jt** |

Cocok dengan hasil semai lokal sampai satu desimal. **Rugi Rp 20,7 juta di bulan
lalu tidak ada lagi.**

| Yang diperiksa | Hasil produksi |
| --- | --- |
| Neraca seimbang | selisih **0** |
| Kas / Bank | 58,4 jt / 248,5 jt |
| Piutang / Hutang Usaha | 86,3 jt / 76,4 jt |
| Akumulasi penyusutan | 19,9 jt (14 entri, 7 periode × 2 aset) |
| Penggajian | 7 periode |
| Grup Harga | 2 grup · 6 baris harga · 2 kontak bergrup |
| Perusahaan | `pt-demo-sejahtera` + `cv-demo-cabang`, keduanya `enterprise` |
| `softtin` | **utuh, tidak tersentuh** |

### Sisa yang ditemukan dan dibersihkan

Penyemaian membuat `workspace-staf-demo-2`, karena `workspace-staf-demo` dari
semai 14 Agustus masih ada dan slug-nya bentrok. Akun staf demo memakai email
sekali pakai (`staf.demo.<timestamp>@example.com`), jadi yang lama sudah mati —
**tiap penyemaian meninggalkan satu baris seperti ini.** Yang lama dihapus
berikut penggunanya. Baris itu tidak memakan slot database (`db_ref` kosong),
jadi biayanya kerapian, bukan kapasitas — tetapi `bersihkan-tenant.mjs` tidak
akan pernah menyapunya sendiri karena hanya menerima slug yang disebutkan.

### Yang TIDAK bisa diverifikasi dari sesi ini

**Tombol "Lihat Demo" belum diklik.** Egress ke `*.workers.dev` diblokir di
lingkungan ini (`CONNECT tunnel failed, 403`), jadi seluruh verifikasi di atas
lewat kueri D1 — bukan lewat aplikasinya. Yang belum terbukti: `POST /api/auth/demo`
membuat `demo-viewer@erpindo.id` beserta keanggotaannya **saat pertama dipakai**,
dan itu belum pernah dipakai sejak penyemaian. Tenant-nya ada dan aktif sehingga
syaratnya terpenuhi, tetapi "seharusnya jalan" bukan "terbukti jalan" —
pembuktiannya satu klik oleh pemilik.
