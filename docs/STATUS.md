# 📋 Status Proyek ERPindo

> Halaman ini ditulis untuk pemilik produk (non-teknis). Selalu diperbarui setiap ada kemajuan.
> Log teknis per fase ada di folder [docs/log/](./log/).

**Terakhir diperbarui:** 5 September 2026

## Yang baru saja selesai — Fase 54a: audit alur uang & integritas jurnal

Ini bagian 1 dan 2 dari sepuluh bagian audit menyeluruh yang kita sepakati.

**Yang paling perlu Anda ketahui:** neraca saldo yang seimbang **tidak**
membuktikan pembukuan benar. Sebuah jurnal bisa seimbang tetapi memasukkan
angka ke akun yang keliru, dan sampai fase ini tidak ada satu pun pemeriksaan
di aplikasi yang bisa melihatnya.

Sekarang ada. Halaman baru **Laporan → Rekonsiliasi** membandingkan saldo akun
kontrol dengan buku pembantunya: Piutang Usaha dengan sisa faktur, Utang Usaha
dengan sisa tagihan pemasok, Persediaan dengan nilai stok. Begitu salah satu
berpisah, ada posting yang salah arah — dan halaman ini satu-satunya yang bisa
menunjukkannya. Ini juga laporan yang diminta akuntan tiap penutupan buku, jadi
ia berguna untuk pelanggan Anda, bukan cuma untuk pemeriksaan internal.

Untuk membuktikan penjaga ini benar-benar bekerja, saya sengaja merusak satu
posting retur penjualan supaya masuk ke akun yang salah, dengan jurnal yang
tetap seimbang. Hasilnya: **neraca saldo tetap hijau, rekonsiliasi yang
menangkapnya.** Itu seluruh alasan halaman ini ada.

**Satu perbaikan di jantung pembukuan.** Baris jurnal dulu disimpan satu per
satu tanpa transaksi yang membungkusnya, sehingga kegagalan di tengah proses
bisa meninggalkan jurnal yang tersimpan permanen dengan debit dan kredit tidak
sama. Sekarang seluruh barisnya masuk sekaligus atau tidak sama sekali.

**Catatan kejujuran.** Tiga dugaan awal saya keliru — kodenya ternyata sudah
menjaga hal-hal yang saya curigai. Dan cacat pertama yang ditemukan laporan
baru ini justru **milik laporan itu sendiri**: rumusnya salah menghitung faktur
yang sudah lunas lalu diretur tunai sebagai "piutang negatif". Saya nyaris
melaporkannya sebagai kesalahan pembukuan Anda. Diperbaiki, dan sebabnya
dicatat di dalam kodenya supaya tidak terulang.

### Sisa bagian audit

Delapan bagian lagi: kepatuhan pajak, penggajian, persediaan & HPP, otorisasi
dan isolasi antar-perusahaan, alur pengguna ujung-ke-ujung, ketahanan saat
gagal, naskah & pengalaman pakai, dan situs publik.

## Sebelumnya — Fase 53a: tiga paket menggantikan harga tunggal

Harga ERPindo kini bertiga: **Starter Rp 750.000, Business Rp 1.500.000,
Enterprise Rp 3.000.000** per perusahaan per bulan. Bayar tahunan di muka
seharga sepuluh bulan — dua bulan hemat.

**Yang membedakan paket adalah ukuran perusahaannya, bukan fitur yang dikunci.**
Ini penting dan sengaja: seluruh modul tetap terbuka di paket termurah, termasuk
penggajian, manufaktur, dan konsolidasi. Keputusan Fase 30 dulu membubarkan
paket bertingkat karena pembedanya waktu itu adalah fitur — dan itulah yang
membuat pembeli merasa dijebak saat menemukan pintu terkunci di bulan kedua.
Yang kembali sekarang hanya nama paketnya.

**Pengguna tetap tak terbatas di ketiga paket.** Rencana awal membatasinya, dan
saya membatalkannya setelah menelusuri kode: janji "tanpa lisensi per orang"
ternyata tertulis di lebih dari tiga puluh tempat, dan membatasinya akan
membatalkan seluruhnya sekaligus — sekaligus menyerahkan kembali keunggulan
Anda melawan pesaing yang menagih per kepala.

Halaman harga sekarang juga menawarkan **bantuan migrasi data** sebagai
konsultasi, bukan sebagai baris biaya: *"Kami membantu memindahkan data
pembukuan Anda sampai neraca pembukanya cocok dengan catatan lama Anda."*
Ketakutan terbesar saat pindah aplikasi akuntansi bukan harganya, melainkan
apakah angkanya berubah di tengah jalan — jadi yang dijanjikan adalah sesuatu
yang bisa diperiksa.

**Harga tidak lagi ditulis tangan di mana pun.** Dulu angkanya dieja di enam
tempat berbeda. Selama harganya cuma satu, tidak ada yang rugi; dengan tiga
paket, tiap salinan itu bisa diam-diam menyimpang dari yang benar-benar ditagih.
Sekarang semuanya membaca satu sumber, dan ada penjaga otomatis yang menolak
harga yang dieja di naskah.

### Tiga cacat ikut ditemukan dan diperbaiki

**Dasbor admin Anda akan rusak** — halaman metrik bisnis membaca angka yang
sudah tidak dikirim server, dan layarnya galat. Sekarang dasbor menampilkan
rincian pendapatan per paket.

**Perhitungan MRR diam-diam menjadi salah.** Rumus lama "jumlah pelanggan × satu
harga" benar selama paketnya satu; dengan tiga paket angkanya keliru tetapi
tetap terlihat wajar — jenis kesalahan yang paling sulit dicurigai. Kini
dijumlahkan per paket.

**Laba demo bulan berjalan menipis lagi** — ketiga kalinya. Penjaganya berbunyi
tepat seperti maksudnya: merah selagi masih untung, bukan setelah rugi.
Sebabnya akhirnya terukur: bulan berjalan menanggung beban HR sekali-jalan (THR,
lembur, komisi, pesangon) yang tidak ditanggung bulan-bulan sebelumnya, jadi ia
akan **selalu** lebih tipis. Omzetnya dinaikkan sepadan (laba kini Rp 8,2 juta,
sejajar bulan tersehat), dan penjaganya diubah agar ikut berskala sendiri —
supaya tidak perlu disetel ulang keempat kalinya.

### Kapasitasnya kini ditegakkan, dan angkanya sudah terbit

Batas tiap paket sekarang benar-benar diperiksa aplikasi, bukan sekadar
tertulis. Gudang atau outlet ke-3 di paket Starter ditolak dengan pesan yang
menyebutkan paket mana yang memuatnya — bukan galat, melainkan ajakan naik
paket. Perusahaan kedua di akun yang paketnya hanya memuat satu badan usaha
ditolak dengan cara yang sama.

Baru **setelah** itu angkanya saya terbitkan di kartu harga. Urutannya sengaja:
batas yang diumumkan tetapi tidak diperiksa bukan sekadar kode yang menganggur,
melainkan janji yang bisa dibantah pelanggan — dan itu persis kesalahan yang
pernah terjadi di sini sebelumnya.

**Karyawan penggajian sengaja tidak ditolak.** Kalau karyawan ke-51 ditolak,
perusahaan akan menggaji sisanya di luar sistem — dan sejak saat itu laporan
PPh 21 yang dihasilkan ERPindo menjadi salah. Kerugian itu jauh lebih besar
daripada tagihan yang diselamatkan. Jadi jatah karyawan adalah titik mulai
penagihan, bukan pagar: kelebihannya ditagih per kepala, Rp 150.000 per orang
per tahun.

### Checkout sudah mengenal paket dan periode

Pembayaran Xendit kini menagih sesuai paket **dan** periode yang dipilih —
bulanan atau tahunan — beserta kelebihan karyawan bila ada. Masa berlakunya
diperpanjang satu bulan atau satu tahun mengikuti yang dibayar.

Semua ini tetap terdegradasi anggun tanpa kunci Xendit produksi: layar
menampilkan pesan yang jelas, bukan galat. Jadi seluruhnya sudah teruji dan siap
sebelum Anda memasang kuncinya.

### Yang masih tertunda, dan sengaja

**Perilaku saat langganan berakhir** — mode baca-saja dengan ekspor tetap hidup
— belum dikerjakan. Tenggatnya nyata tetapi belum dekat: dua belas bulan setelah
pelanggan pertama. Bagian ini menyentuh data pembukuan pelanggan, jadi tidak
pantas dikerjakan terburu-buru di ujung pekerjaan panjang.

**Perhitungan selisih saat naik paket di tengah periode** juga belum. Keduanya
saya kerjakan sebagai pekerjaan tersendiri, bukan tempelan.

## Sebelumnya — Fase 51–52: mencari cacat yang tidak bisa dilihat mesin mana pun

Anda bertanya apakah aplikasi ini bisa dipakai tanpa salah fungsi dan alur. Saya
jawab tidak yakin — lalu menelusurinya. **Tiga belas cacat ditemukan**, semuanya
lolos dari 2.900-an pemeriksaan yang sudah ada.

### Yang paling perlu Anda ketahui

**Tombol "Keluar" bisa gagal tanpa memberi tahu.** Bila jaringan putus saat
menekannya, sesi Anda **tetap hidup** sementara layar tidak berubah sedikit pun.
Di komputer bersama, orang akan pergi mengira sudah keluar. Sekarang
kegagalannya muncul di layar, dan aplikasi sengaja **tidak** berpura-pura
memindahkan Anda ke halaman masuk — berpindah hanya membuat layarnya berbohong
lebih meyakinkan.

**Halaman yang gagal memuat dulu berbunyi "Belum ada data".** 140 dari 201
pengambilan data tidak membedakan "gagal memuat" dari "memang kosong". Halaman
Faktur yang gagal memuat berbunyi "Belum ada faktur", dan siapa pun akan
menyimpulkan datanya hilang. Diperbaiki sekali di satu tempat, berlaku untuk
seluruhnya.

**Perusahaan demo tampil RUGI tiap tanggal 1–3 tiap bulan.** Itu yang dilihat
setiap calon pelanggan yang mengeklik "Lihat Demo". Cacat ini sudah pernah
diperbaiki sekali (Fase 21d), lalu marginnya termakan habis oleh fitur-fitur
sesudahnya — dan bertahan berbulan-bulan karena **hanya terlihat 2–3 hari
sebulan**. Sekarang bulan berjalannya untung Rp 4 juta, sejajar dengan
bulan-bulan lain, dan penjaganya menuntut margin — bukan sekadar "di atas nol"
yang justru membuatnya bisa terkikis diam-diam.

**Bahan produksi bisa menguap.** Bila bahan pertama cukup dan bahan kedua
kurang, bahan pertama sudah terlanjur keluar dari gudang sementara barang
jadinya tidak pernah masuk — dan karena perintah produksinya masih bisa diulang,
pengulangan mengurangi bahan yang sama untuk kedua kalinya. Terbukti dengan
angka: 60 paku menjadi 58 pada produksi yang **ditolak**.

**Laporan konsolidasi bisa runtuh seluruhnya.** Bila Anda mendaftarkan
perusahaan kedua dan belum membayarnya, laporan gabungan membalas galat server —
padahal justru itulah keadaan yang diundang oleh fitur konsolidasi.

### Sisanya

Retur yang bertanggal sebelum fakturnya kini ditolak (dulu diterima, dan
memindahkan angka ke bulan yang salah tanpa membuat neraca timpang, sehingga
tidak ada yang bisa melihatnya). Empat halaman cetak — faktur, penawaran, slip
gaji, 1721-A1 — kini benar-benar dibuka mesin penguji; sebelumnya nol. Dan satu
kelas cacat yang muncul **enam kali** di tempat berbeda akhirnya dijadikan
gerbang, jadi kemunculan ketujuhnya akan tertangkap sebelum tayang.

## Sebelumnya — Fase 50: merapikan yang tidak terlihat

Empat pekerjaan kecil tanpa fitur baru. Semuanya berbagi satu bentuk: **keadaan
yang salah tidak ada yang melihat, karena tidak ada yang bertugas melihatnya.**

**Angka di laporan ini berhenti basi.** Halaman yang sedang Anda baca, dan
panduan hari peluncuran, mengumumkan berapa banyak pemeriksaan otomatis yang
dijalankan mesin. Angka itu ditulis tangan — dan ternyata sudah tertinggal jauh:
tertulis 2.498 padahal kenyataannya 2.890. Ironinya, aturan repo ini berbunyi
"jumlah pemeriksaan hanya boleh naik", lalu angka yang diterbitkan tidak pernah
naik. Sekarang mesin sendiri yang menagihnya: menambah pemeriksaan tanpa
memperbarui kedua dokumen ini membuat pengujian gagal, lengkap dengan angka
penggantinya. Hal yang sama juga dipasang untuk dokumen teknis, yang enam
angkanya juga sudah salah.

**Salah pasang kunci kapasitas kini ketahuan seketika.** Bila suatu hari Anda
menyalakan mode "database dinamis" (untuk melewati batas 6 perusahaan) tetapi
kuncinya belum terpasang, **setiap** pendaftaran perusahaan baru gagal. Lebih
buruk lagi, halaman Admin → Infra justru terlihat paling sehat dalam keadaan
itu — kartu kapasitasnya sengaja diam karena mode dinamis memang tak berbatas.
Sekarang layar itu menampilkan peringatan merah paling atas, menyebut kunci
mana yang kurang dan dua cara membereskannya.

**Pendaftar yang belum membayar berhenti dihitung sebagai masalah.** Menengok
database produksi menyingkap cacat yang belum terlihat: perusahaan yang sudah
mendaftar tetapi belum membayar dihitung sebagai "tertinggal pemutakhiran",
dan pemutakhiran otomatis mencoba memperbaikinya setiap hari lalu gagal —
selamanya, karena perusahaan itu memang belum punya database untuk diperbarui.
Hari ini hanya satu baris demo. Tetapi **setiap calon pelanggan yang mendaftar
dan belum membayar berbentuk sama persis**, sehingga angka peringatan itu akan
naik terus dan tidak pernah bisa turun. Peringatan yang tidak bisa dipadamkan
pada akhirnya membuat semua peringatan diabaikan — jadi diperbaiki sekarang,
selagi murah.

## Sebelumnya — Fase 42–48: ERPindo berhenti berat sebelah ke keuangan

Anda menyampaikan satu hal yang tepat: aplikasi ini terlalu condong ke sisi
keuangan, padahal ruang lingkup ERP jauh lebih luas. Sepuluh pekerjaan berikut
menutup jarak itu, dan semuanya sudah masuk ke aplikasi.

### Dua kewajiban hukum yang sebelumnya TIDAK ADA sama sekali

Ini bagian yang paling perlu Anda ketahui, karena keduanya bukan pilihan.

**THR (Tunjangan Hari Raya).** Kewajiban menurut Permenaker 6/2016, dan
perusahaan yang tidak membayarnya kena denda 5% yang **tidak menggugurkan
kewajiban pokoknya**. Sebelum ini ERPindo tidak bisa menghitungnya. Sekarang
bisa, lengkap dengan hal-hal yang paling sering salah: dasarnya upah pokok
**ditambah tunjangan tetap** (bukan upah pokok saja), masa kerja dihitung
dalam bulan penuh, dan pajaknya dihitung sebagai selisih — bukan tarif dikali
THR, yang selalu kurang potong.

**Lembur berumus (PP 35/2021).** Sebelumnya lembur hanyalah angka rupiah yang
diketik tangan; rumusnya hidup di kepala orang yang mengetik, dan kesalahannya
tidak bisa diperiksa siapa pun — termasuk oleh karyawan yang dirugikan.
Sekarang Anda mengisi **jam dan jenis hari**, dan aplikasi yang menghitung
memakai tangga pengali peraturannya.

**Pesangon & kompensasi PKWT.** Pesangon adalah kewajiban yang paling mahal
bila salah hitung. Pengalinya berbeda menurut alasan berakhirnya hubungan
kerja: pensiun 1,75 kali, meninggal dunia 2 kali, mengundurkan diri tidak
berhak sama sekali. Layarnya menampilkan **rinciannya**, bukan satu angka
total — karena yang menyelesaikan perselisihan bukan totalnya, melainkan cara
sampainya.

### Sisi penjualan yang selama ini kosong

- **Komisi sales.** Faktur sekarang menyimpan milik siapa penjualan itu. Anda
  menentukan dasarnya (omzet sebelum PPN atau laba kotor) dan kapan komisinya
  lahir. Bakunya menunggu **pelanggan benar-benar membayar** — membayar komisi
  atas faktur yang belum tentu tertagih adalah cara klasik kehilangan uang.
- **Target & prakiraan penjualan.** Target per sales per bulan, dengan
  realisasi yang dihitung dari faktur memakai dasar yang **sama persis** dengan
  komisi, supaya dua angka di layar yang sama tidak pernah berselisih.
  Prakiraannya ditimbang per tahap, dan peluang tiap tahap ditampilkan apa
  adanya supaya Anda bisa menilai sendiri apakah cocok dengan pengalaman Anda.

### Kontrak yang berjalan bertahun-tahun

Kenaikan harga tahunan kini otomatis dan **berbunga majemuk** (5% dari harga
tahun sebelumnya, sebagaimana kontrak Indonesia lazim ditulis), dihitung sejak
ulang tahun kontrak. Harga yang disepakati awal tetap tersimpan apa adanya,
sehingga pelanggan bisa memeriksa sendiri kenaikannya. Kontrak yang habis masa
berlakunya tidak lagi berhenti diam-diam, dan setiap perubahan meninggalkan
jejak adendum.

### Pajak & rantai pasok

- **PPh 22** yang dipungut dari Anda kini tercatat sebagai **kredit pajak**,
  bukan beban. Salah mencatatnya membuat perusahaan membayar pajaknya dua kali.
- **Bahan pengisian e-Bupot** bisa diunduh per masa. Perlu ditegaskan: itu
  **bahan pengisian, bukan berkas impor resmi DJP** — format impornya berubah
  mengikuti aturan dan tidak bisa dijamin dari sini.
- **Konsinyasi** kini didukung sebagai gudang bertanda: barang yang dititipkan
  di toko mitra tetap milik Anda sampai terjual.
- **Dropship** kini bisa: pemasok mengirim langsung ke pelanggan, stok tidak
  digerakkan, tetapi harga pokoknya tetap tercatat.

### Dua kesalahan akuntansi yang ditemukan di jalan

Yang ini perlu Anda ketahui apa adanya. Saat menyiapkan pekerjaan terakhir,
ditemukan **dua kode akun yang bertabrakan** — dua modul memakai kode yang sama
untuk maksud berbeda, sehingga angkanya mendarat di akun milik modul lain:

- pungutan PPh 22 masuk ke **Persediaan** (kesalahan yang dibuat pada pekerjaan
  ini juga, dan sudah diperbaiki);
- beban PPh Final masuk ke akun **penyerapan produksi** — kesalahan yang sudah
  ada sejak lama dan tidak pernah terlihat.

Yang kedua juga bisa **menghentikan pembaruan basis data** bagi perusahaan yang
sempat memakai PPh Final lebih dulu. Keduanya sudah diperbaiki, dan sekarang
ada pemeriksaan otomatis yang menutup seluruh kelasnya.

Satu hal yang **sengaja tidak** dilakukan: jurnal yang sudah diposting tidak
ditulis ulang. Itu catatan sejarah, dan memindahkannya diam-diam akan mengubah
laporan periode yang mungkin sudah Anda tutup. Bila perusahaan Anda sempat
mencatat PPh Final, angkanya perlu direklasifikasi lewat Jurnal Umum sebagai
keputusan sadar Anda.

### Angka pemeriksaan

Seluruh pekerjaan di atas dijaga pemeriksaan otomatis yang jumlahnya hanya
boleh naik:

| Pemeriksaan | Sebelum | Sekarang |
| --- | --- | --- |
| Uji unit | 923 | **1.171** |
| Uji ujung-ke-ujung (smoke) | 1.173 | **1.330** |
| Simulasi klik di peramban nyata | 431 | **491** |

Satu catatan kejujuran: angka utang dwibahasa yang selama ini dilaporkan 103
ternyata **melebih-hitung 50** — sebagian besar bukan teks layar, melainkan
kode program yang salah dibaca oleh alat pemeriksanya. Utang sesungguhnya 53.
Angka yang salah selama berbulan-bulan membuat pekerjaan terlihat lebih
tertinggal daripada keadaannya. Fase 50c menemukan satu lagi dari kelas yang
sama — penanda uji `testId`, yang tidak pernah dibaca siapa pun dan justru
rusak bila diterjemahkan — sehingga angkanya kini **52**.

## Sebelumnya — Fase 39: situs dibaca mesin, dan layarnya bisa dilihat

Empat pekerjaan, semuanya berangkat dari permintaan Anda.

### 1. Halaman baru `/tampilan` — sepuluh layar aplikasi

Pembeli perusahaan menanyakan satu hal yang tidak dijawab peragaan: "seperti apa
layarnya kalau saya benar-benar memakainya sehari-hari". Peragaan memperagakan
satu alur sempit langkah demi langkah; ia tidak pernah memperlihatkan satu layar
padat berisi sidebar, bilah atas, dan tabel sungguhan sekaligus.

Sepuluh tangkapan layar sekarang ada di `/tampilan`, tertaut dari bilah atas.
Gambarnya **tidak dibuat tangan** — satu perintah menangkapnya ulang dari
aplikasi yang benar-benar berjalan — dan **tanggal penangkapannya tercetak di
halaman**. Itu yang membedakannya dari tangkapan layar yang dihapus Fase 38:
gambar boleh menua, asalkan menyebutkan umurnya sendiri.

Beranda tetap memakai peragaan. Sebuah pemeriksaan otomatis menjaga agar
tangkapan layar tidak merayap kembali ke sana.

### 2. Situs kini ditulis untuk mesin penjawab, bukan hanya mesin pencari

Makin banyak calon pelanggan bertanya kepada ChatGPT atau Perplexity alih-alih
mengetik di Google. Situs ini sekarang menyediakan yang mereka baca:

- **`/llms.txt`** — ringkasan situs berbentuk prosa khusus untuk mesin penjawab,
  berisi harga, modul, dan — yang justru membuatnya berguna — **apa yang belum
  ada** (ERPindo belum punya ISO 27001 maupun SOC 2). Model yang mengutipnya
  ikut menyebut batasannya, sehingga calon pelanggan tidak datang membawa
  harapan yang tidak bisa dipenuhi.
- **robots.txt menyebut perayap AI satu per satu** dan mengizinkannya.
- **Data terstruktur diperbaiki**: daftar fitur, tangkapan layar, dan sasaran
  pengguna kini diumumkan ke mesin; tanya-jawab tidak lagi diumumkan di halaman
  yang tidak memuat tanya-jawab.

**Satu bug tertangkap di jalan.** Kalimat harga di beranda yang khusus disajikan
kepada perayap ternyata mengirimkan potongan kode program, bukan "Rp 499.000".
Google dan mesin penjawab telah membaca versi rusak itu selama berbulan-bulan.
Pemeriksaan otomatisnya menyatakan halaman itu benar — karena angka "499.000"
memang ada di halaman yang sama, hanya di bagian tanya-jawab. Sudah diperbaiki,
beserta penjaga baru yang menolak bentuk kesalahan itu, bukan sekadar mencari
bentuk yang benar.

### 3. Teks logo diperbesar

Sekaligus menutup selisih lama: wordmark di aplikasi ternyata 39% lebih kecil
daripada kembarannya di halaman blog, dan tidak pernah terlihat karena keduanya
tidak pernah tampil bersamaan. Di layar ponsel ukurannya tetap seperti semula —
versi besarnya sempat membuat tiga halaman meluber, dan pemeriksaan otomatis
menangkapnya sebelum sampai ke Anda.

### 4. Dokumen yang Anda kirimkan kini ikut dwibahasa

Faktur, penawaran, slip gaji, rekap pajak karyawan, dan surat jalan sebelumnya
selalu berbahasa Indonesia — bahkan bagi pengguna yang sudah memilih Inggris.
Padahal justru dokumen itulah yang paling dilihat orang **di luar** perusahaan
pemakainya. Kelimanya sekarang mengikuti bahasa yang dipilih.

Halaman Panduan juga berhenti menjanjikan "tangkapan layar asli", yang sudah
tidak benar sejak Fase 38.

## Sebelumnya — Fase 38: perombakan total situs

Ini perombakan desain **ketiga** di repo ini. Dua yang sebelumnya (Fase 17a dan
18a) hanya mengganti nilai warna di satu berkas sementara 50 halaman menulis
warnanya sendiri — itu sebabnya keduanya tidak pernah terasa berubah. Yang ini
mengubah hal yang berbeda.

### 1. Tidak ada lagi tangkapan layar produk. Sama sekali.

Situs ini punya 57 gambar produk seberat 3,9 MB. Semuanya dihapus, diganti
**peragaan** — alur kerja yang benar-benar berjalan di depan mata pengunjung,
dirakit dari komponen yang sama dengan aplikasinya.

Bedanya bukan kecantikan. Tangkapan layar adalah klaim yang harus dipercaya;
peragaan bisa diperiksa. Jurnal yang diperagakan adalah double-entry sungguhan,
dan **keseimbangannya diuji mesin** — angka karangan akan menggagalkan build.

Peragaan juga tidak bisa basi: begitu tampilan aplikasi berubah, ia ikut
berubah sendiri.

### 2. Halaman modul membuka dengan data, bukan formulir kosong

Sembilan halaman dulu menaruh formulir pembuatan yang selalu terbuka **di atas**
daftarnya. Hal pertama yang Anda lihat saat membuka halaman Produk adalah
formulir produk kosong — bukan produk Anda.

Ini sebab terbesar aplikasi terbaca seperti aplikasi lama, dan lebih besar
daripada warna mana pun. Sekarang formulirnya muncul sebagai panel yang digeser
masuk saat Anda menekan tombol di pojok kanan atas — tempat yang sama di setiap
halaman.

### 3. Enam halaman baru yang bisa Anda kirimkan

`/harga`, `/keamanan`, `/tentang`, `/kontak`, `/syarat`, `/privasi`.

Sebelumnya harga hanyalah bagian dari beranda, dan tidak ada satu pun halaman
yang bisa diteruskan ke bagian pengadaan atau bagian hukum calon pelanggan.
Halaman `/keamanan` menyebut juga apa yang **belum** ada (ERPindo belum
bersertifikat ISO 27001 maupun SOC 2) — halaman keamanan yang hanya memuat hal
baik terbaca sebagai brosur.

### 4. Merek sepenuhnya teks

Tidak ada berkas logo tersisa. Favicon, ikon aplikasi, dan gambar pratinjau
tautan tetap ada karena peramban mewajibkannya, tetapi isinya **dirender dari
teks** oleh skrip — tidak ada gambar buatan tangan di mana pun.

### 5. Situsnya jauh lebih ringan

| | Sebelum | Sesudah |
| --- | --- | --- |
| Berkas aset | 7,1 MB | **172 KB** |
| Hasil build | 9,7 MB | **3,4 MB** |
| Yang diunduh untuk dipasang sebagai aplikasi | 5.837 KB | **2.719 KB** |

### 6. Lima hal yang ditemukan di jalan, dan tidak ada yang pernah melaporkannya

- **Panduan menjanjikan uji coba 30 hari** yang sudah dihapus empat belas fase
  sebelumnya — di halaman yang justru dibaca orang yang sudah serius memakai
  produknya.
- **Halaman `/api-docs` menjual "paket Enterprise"** yang sudah dibubarkan,
  bertentangan langsung dengan halaman harga yang baru.
- **Mencetak faktur dalam tema gelap menghasilkan halaman nyaris kosong** —
  teks krem terang di atas kertas putih. Dugaan saya, yang mengalaminya
  menyimpulkan printernya bermasalah.
- **Dua kartu pengaturan masih menawarkan "Tingkatkan ke Enterprise"** pada
  jalur galatnya. Yang membuatnya lebih buruk daripada sekadar naskah basi:
  galat itu sebenarnya berarti *peran Anda tidak cukup*, atau *alamat IP Anda
  tidak termasuk yang diizinkan*. Seorang Pemilik yang baru saja salah mengetik
  daftar IP-nya sendiri akan membaca tawaran paket — jawaban yang salah, pada
  saat yang paling buruk, tentang masalah yang sama sekali berbeda.
- **Formulir produk pecah di dalam panel barunya**: kotak "Nama" tergencet
  menjadi selebar satu huruf dan tombol simpan terpotong di tepi kanan.

Kelimanya diperbaiki, dan kelimanya kini dijaga uji otomatis supaya tidak bisa
kembali.

### 7. Cacat kelima itu ditemukan oleh mata, bukan oleh mesin

Ini layak diceritakan tersendiri, karena ia menyangkut cara kerja seluruh
gerbang di repo ini.

Saat formulir produk pecah, **semua pemeriksaan otomatis hijau**. Bukan karena
ada yang bocor: pemeriksaannya menguji apakah kotak isian **bisa diisi**, dan
kotak selebar satu huruf tetap bisa diisi. Tidak ada satu pun yang menguji
apakah ia **bisa dibaca**.

Ia ketahuan karena Anda meminta melihat hasilnya, dan gambarnya benar-benar
diambil dari aplikasi yang berjalan. Yang dilakukan berikutnya bukan sekadar
membetulkan formulirnya, melainkan memasang penjaga di dalam pembuka panel
itu sendiri — sehingga **setiap panel yang ditulis nanti ikut terjaga tanpa
siapa pun perlu ingat menambahkannya**. Penjaganya juga dibuktikan bisa gagal
lebih dulu: kesalahan lama dipasang kembali sebentar, dan gerbangnya menolak.

Sebuah pemeriksaan yang belum pernah terlihat gagal belum diketahui berguna.

### 8. Formulir terakhir ikut pindah

Tiga formulir sengaja ditunda pada gelombang pertama karena bukan formulir
sederhana: editor faktur (dengan pengambilan dari beberapa gudang, satuan
besar, lot & kedaluwarsa, dan valuta asing), editor penawaran, dan formulir
karyawan. Ketiganya kini selesai — ditata ulang, bukan sekadar dipindahkan.

Pada halaman Penggajian, tujuh kotak isian yang dulu terpasang permanen
mendorong daftar karyawan turun hampir satu layar penuh. Membaca daftar itu
kejadian harian; menambah karyawan kejadian sesekali — dan tata letak lamanya
menomorsatukan yang jarang.

## Di mana kita sekarang?

| Fase | Isi | Status |
|---|---|---|
| Perencanaan | Blueprint bisnis & teknis | ✅ Selesai |
| Fase 0 — Fondasi | Kerangka aplikasi, akun & login, multi-tenant, keamanan dasar, design system, CI/CD | ✅ Selesai |
| Fase 1a — Akuntansi inti & master data | Bagan akun (template Indonesia), jurnal double-entry, buku besar, neraca saldo; produk, kontak, gudang | ✅ Selesai |
| Fase 1b — Penjualan & Pembelian | Faktur jual/beli dengan jurnal & stok otomatis (biaya rata-rata), pembayaran, PPN, level stok | ✅ Selesai |
| Fase 1c — Laporan & dashboard | Laba Rugi, Neraca (selalu seimbang), dashboard angka nyata | ✅ Selesai |
| Fase 1d — Pelengkap MVP | Kartu stok, umur piutang/hutang, ekspor CSV, tutup buku | ✅ Selesai — MVP inti lengkap |
| Fase 2a — PWA & cetak faktur | Aplikasi bisa di-install & offline; faktur bisa dicetak/PDF | ✅ Selesai |
| Fase 2b-1 — Fondasi langganan & arus kas | Paket & batasnya, siklus trial otomatis, mode baca-saja saat menunggak, laporan arus kas | ✅ Selesai |
| Fase 2c — Keamanan 2FA & landing page | Verifikasi dua langkah (authenticator) + halaman depan siap jualan | ✅ Selesai |
| Fase 2d — Impor CSV | Impor produk & kontak dari Excel/CSV dengan laporan per baris | ✅ Selesai |
| Fase 2e — Opname & audit log | Penyesuaian stok berjurnal otomatis + riwayat aktivitas untuk Owner | ✅ Selesai |
| Fase 2f — Retur jual/beli | Nota kredit/debit dengan jurnal pembalik & stok otomatis | ✅ Selesai |
| Fase 2g — Transfer gudang, multi-perusahaan, profil, pengingat email | Operasional harian makin lengkap | ✅ Selesai |
| Fase 2h — POS / Kasir | Layar kasir cepat, shift + rekap kas berjurnal, struk | ✅ Selesai |
| Fase 2i — Persetujuan pembelian | Pembelian besar oleh Admin wajib disetujui Owner dulu | ✅ Selesai |
| Fase 2j — Lot & kedaluwarsa (FEFO) | Lacak lot/exp per produk, keluar otomatis yang paling dekat kedaluwarsa, peringatan ≤ 30 hari | ✅ Selesai |
| Fase 2k — Tampilan baru ala SaaS modern | Sidebar gelap berikon, kartu statistik berwarna, avatar, badge status konsisten, landing lebih meyakinkan | ✅ Selesai |
| Fase 2l — CRM Pipeline | Catat calon pelanggan (lead), tahap funnel, aktivitas follow-up, konversi jadi pelanggan + penawaran (quotation) sekali klik ke faktur | ✅ Selesai |
| Fase 2n — Anggaran | Tetapkan target pendapatan & beban per akun per bulan; realisasi otomatis dari jurnal; laporan selisih (varians) berwarna | ✅ Selesai |
| Fase 2o — HR & Payroll | Data karyawan, penggajian bulanan dengan PPh 21 (metode TER) & BPJS otomatis, slip gaji, jurnal beban gaji otomatis | ✅ Selesai |
| Fase 2p — Aset Tetap | Register aset, penyusutan garis lurus otomatis tiap bulan (jurnal), pelepasan aset dengan laba/rugi | ✅ Selesai |
| Fase 2q — Proyek | Proyek & tugas, tag pendapatan/biaya per proyek (faktur & jurnal), laporan profitabilitas | ✅ Selesai |
| Fase 2r — Multi mata uang | Kurs valas, faktur mata uang asing (dikonversi ke IDR), laba/rugi selisih kurs otomatis saat pelunasan | ✅ Selesai |
| Fase 2s — Kontrak & tagihan berulang | Kontrak langganan yang menerbitkan faktur otomatis tiap periode; produk jasa (tanpa stok) | ✅ Selesai |
| Fase 2t — Konsolidasi multi-perusahaan | Buat perusahaan tambahan dari satu akun; laporan Laba Rugi & Neraca gabungan lintas perusahaan milik pemilik yang sama | ✅ Selesai |
| Fase 2u — Manufaktur & QC | Resep produk (BoM), perintah produksi (bahan → produk jadi biaya gabungan), inspeksi QC (lulus/karantina) | ✅ Selesai |
| Fase 2v — Maintenance / servis aset | Jadwal servis berkala per aset (Cron menerbitkan work order), work order ad-hoc, riwayat & biaya dijurnal | ✅ Selesai |
| Fase 2w — Helpdesk | Tiket dukungan pelanggan: prioritas & status, penugasan ke tim, balasan + catatan internal | ✅ Selesai |
| Fase 2x — Ekspor e-Faktur | Ekspor CSV faktur keluaran ber-PPN per periode (NPWP/DPP/PPN) untuk impor e-Faktur DJP | ✅ Selesai |
| Fase 2y — UI responsif + tema + landing | Sidebar/menu ikut tema terang↔gelap, menu mobile jadi off-canvas drawer, tabel responsif, landing marketing penuh + harga baru | ✅ Selesai |
| Fase 3a — Kepatuhan 2026 + trial 30 hari | Trial 30 hari (teks diturunkan dari konstanta), batas upah JP BPJS Rp11.086.300 (Maret 2026), tanggal format Indonesia, email bertanda tangan | ✅ Selesai |
| Fase 3b — Void, edit master data & konfirmasi | Batalkan faktur jual/beli (jurnal pembalik + stok kembali persis), edit produk/kontak/gudang & nama akun dari UI, dialog konfirmasi untuk semua aksi berisiko | ✅ Selesai |
| Fase 3c — Pencarian, pagination & pemilih berskala | Kotak cari + muat-lebih-banyak di semua daftar utama, combobox typeahead produk/kontak (faktur, kontrak, BoM), pencarian POS sisi server — siap ribuan produk | ✅ Selesai |
| Fase 3d — Diskon, logo kop & notifikasi | Diskon % per baris (faktur, POS, cetakan; PPN & jurnal mengikuti), logo kop faktur/struk dari Pengaturan, ambang stok minimum + lonceng notifikasi (stok menipis, faktur jatuh tempo, tiket, persetujuan) | ✅ Selesai |
| Fase 3e — Dashboard modern & polish | Grafik penjualan 30 hari, checklist onboarding, widget jatuh tempo + feed aktivitas, halaman auth split, nav↔judul selaras (Maintenance→Pemeliharaan), paragraf pengantar semua halaman, favicon/OG + shortcut PWA | ✅ Selesai |
| Fase 3f — e-Faktur XML Coretax | Ekspor XML `TaxInvoiceBulk` sesuai skema impor Coretax terbaru (kode 04 DPP nilai lain 11/12 utk non-mewah, kode 01 utk tarif 12%; NPWP→TIN 16 digit; faktur void/non-PPN dikecualikan) — rangkaian Fase 3 lengkap | ✅ Selesai |
| Fase 4a — Akun bebas langganan + seed demo | Daftar email khusus (`COMPED_EMAILS`) mendapat tenant aktif permanen paket Enterprise (kebal siklus trial); skrip seed "PT Demo Sejahtera" mengisi data hidup SEMUA modul (131 langkah, neraca seimbang) untuk review langsung — **sudah dijalankan di produksi** | ✅ Selesai |
| Fase 4b — Identitas visual baru | Palet baru total: indigo-violet + aksen amber (semua halaman lewat token), font Inter Variable, kartu/tombol/badge disempurnakan, ikon & PWA baru, kontras dark mode diperbaiki | ✅ Selesai |
| Fase 4c — Landing page baru | Hero dengan screenshot produk nyata, trust bar, showcase 5 alur bertab, seksi perbandingan vs Excel, FAQ 8, pipeline screenshot otomatis (WebP 534 KB total) | ✅ Selesai |
| Fase 4d — Panduan lengkap | 23 modul panduan ber-screenshot asli di `/panduan` (publik, code-split, bisa dicari), versi Markdown di repo (`docs/panduan/`), dan tombol `?` di tiap halaman aplikasi yang membuka panduan terkait | ✅ Selesai |
| Fase 4e — Asisten AI gratis | "Asisten ERPindo" via Cloudflare Workers AI (kuota gratis 10rb neuron/hari, tanpa API key): chat cara pakai grounded panduan + draf jurnal dari bahasa alami (usulan seimbang, manusia yang memposting); kuota 50/hari/perusahaan; mundur anggun bila AI tak tersedia | ✅ Selesai |
| Fase 4f — Roadmap lanjutan per modul | Dokumen [03-roadmap-lanjutan.md](./03-roadmap-lanjutan.md): 23 modul dinilai kondisi saat ini + quick wins + ide lanjutan berskor Dampak/Usaha/AI, ditutup urutan prioritas 6 bulan & analisis kuota AI gratis — rangkaian Fase 4 lengkap | ✅ Selesai |
| **Fase 5a — Perbaikan kritis review pemilik** | Bug tombol keluar kartu di Penjualan/Pembelian HP, header 4 halaman laporan berantakan di layar sempit, menu hamburger landing, harga 3 kolom di tablet — diverifikasi matriks 108 screenshot (36 halaman × 3 ukuran layar). Jalur error AI dibuat terbaca (503 kini menyebut alasannya; kuota tak terpotong saat gagal) + alat probe produksi. **Akar masalah AI ketemu lewat probe: model lama dipensiunkan Cloudflare 30 Mei 2026 → diganti model pengganti resmi (glm-4.7-flash) dengan cadangan otomatis — Asisten AI kini terverifikasi MENJAWAB di produksi (HTTP 200)** | ✅ Selesai |
| Fase 5b — Audit tata bahasa menyeluruh | Sapuan ejaan otomatis (0 kata tak baku) + proofread manual ±150 kalimat di aplikasi, landing, email, dan 23 modul panduan; 4 kalimat panduan berbahasa campur diperbaiki; konsistensi istilah dicek; `docs/panduan/` di-regenerasi | ✅ Selesai |
| Fase 5c — Mode Pemula (akuntansi tanpa jargon) | Wizard "Catat Transaksi" berbahasa sehari-hari (Uang Masuk/Keluar/Pindah Dana, kategori awam → jurnal 2 baris otomatis, pratinjau sebelum simpan), Mode Sederhana di Pengaturan (sembunyikan menu akuntansi teknis), Kamus Istilah ±35 entri, panduan "Akuntansi untuk Pemula", Asisten AI bisa menjelaskan istilah | ✅ Selesai |
| Fase 5d — Keuangan lanjut | Halaman Kas & Bank (saldo per dompet + mutasi saldo berjalan) dengan **rekonsiliasi rekening koran** (impor CSV + pencocokan otomatis nominal & tanggal ±3 hari + manual), **template jurnal berulang** (terbit sekali klik atau otomatis bulanan via cron), **jurnal penutup tahunan** ke Laba Ditahan, Laba Rugi perbandingan 2 periode + margin kotor/bersih | ✅ Selesai |
| Fase 5e — CRM lanjut | **Papan kanban funnel** (geser kartu lead antar tahap), aktivitas follow-up **ber-tenggat** yang masuk lonceng notifikasi saat jatuh tempo + pengingat lead terbengkalai >7 hari, **laporan konversi per sumber** (Instagram/WA/referensi, dsb.), penawaran dengan **masa berlaku** (status kedaluwarsa otomatis) + **halaman cetak/PDF berlogo** | ✅ Selesai |
| Fase 5f — HR lanjut | **Slip gaji cetak/PDF** berlogo per karyawan, **komponen ad-hoc** per periode (bonus/lembur/potongan ikut PPh 21 & jurnal), **kasbon karyawan** (Piutang Karyawan berjurnal + cicilan otomatis potong gaji tiap run), **cuti & izin** (pengajuan + persetujuan, saldo cuti tahunan 12 hari), **bukti potong PPh 21 tahunan** (ringkasan 1721-A1 akumulasi setahun) | ✅ Selesai |
| Fase 5g — Proyek lanjut | **Termin penagihan** (milestone → faktur jasa tertaut proyek), **RAB** (anggaran biaya per kategori vs realisasi jurnal ber-tag, progress bar), **papan tugas kanban** drag-and-drop (belum/proses/selesai) + **progres otomatis** dari tugas, **timesheet** (jam × tarif → estimasi biaya tenaga kerja & laba setelah tenaga kerja) | ✅ Selesai |
| Fase 5h — Pelengkap modul | **Laporan penjualan analitik** (produk terlaris + pelanggan terbesar per rentang + ekspor CSV), **dashboard delta %** penjualan vs bulan lalu, **umur tiket** Helpdesk (kuning >24 jam, merah >72 jam), **filter stok menipis + ekspor CSV** | ✅ Selesai — Fase 5 lengkap |
| **Fase 6a — Perbaikan kualitas (putaran 2)** | **Asisten AI** anti-macet (timeout 35 dtk + sisa kuota, ambang 100/hari), **kelola peran anggota tim** (ubah peran & keluarkan anggota), **audit log berbahasa manusia** (semua aksi diterjemahkan + detail ramah), **responsif HP** dirapikan (kartu Penjualan/Pembelian, item penawaran tak tumpang-tindih, dropdown notifikasi tak terpotong) | ✅ **Selesai** |
| **Fase 6b — HR Absensi/kehadiran** | Menu baru **HR › Absensi**: catat kehadiran harian (hadir/izin/sakit/alfa/cuti + jam masuk/keluar), **rekap bulanan per karyawan** + ekspor CSV, daftar catatan. Satu catatan per karyawan per tanggal (koreksi menimpa) | ✅ **Selesai** |
| **Fase 6c — Proyek jadi PM serius** | Papan tugas kini punya **penanggung jawab** & **prioritas** (Tinggi/Sedang/Rendah), **beban kerja per orang**, **daftar tugas dengan tenggat** (terlambat disorot), dan **garis waktu proyek** (mulai→selesai) | ✅ **Selesai** |
| **Fase 6d — Pengadaan lengkap (procure-to-pay)** | Menu baru **Transaksi › Pengadaan**: alur **permintaan (PR) → pesanan (PO) → penerimaan (GRN)** → otomatis jadi **faktur pembelian & stok masuk**. Status terlacak per tahap, setujui/tolak permintaan, batalkan pesanan | ✅ **Selesai** |
| **Fase 6e — Approval workflow engine** | **Engine persetujuan berjenjang konfigurable**: aturan per jenis dokumen + ambang + urutan approver (mis. Admin → Pemilik); ajukan → setujui berurutan per peran; antrean per pengguna + riwayat + jejak langkah. **Fase 6 selesai** — lihat laporan akhir | ✅ **Selesai** |
| **Fase 7a — POS lanjut (retail)** | Kasir **multi metode bayar** (Tunai/QRIS/Kartu/E-Wallet) + **pembayaran terpisah (split)** + kembalian (hanya dari tunai); **tahan transaksi (park)** + panggil lagi. Kas laci shift hanya menghitung porsi tunai; non-tunai masuk Bank | ✅ **Selesai** |
| **Fase 7b — Penjualan bertahap** | Alur **Pesanan Penjualan (SO) → Surat Jalan (DO) → Faktur**: pesanan mencatat komitmen pelanggan (belum menyentuh stok/pembukuan); **surat jalan** mengeluarkan stok + mengakui HPP **tepat sekali**; **faktur** mengakui pendapatan tanpa menggerakkan stok lagi. **Uang muka (DP)** bisa diterima sebelum faktur lalu otomatis terpakai saat difakturkan. Cetak surat jalan | ✅ **Selesai** |
| **Fase 7c — Stok lanjut** | **Titik pesan otomatis** — produk di bawah stok minimum jadi usulan pembelian sekali klik (tersambung ke Pengadaan/PR→PO→GRN); **multi-satuan (UOM)** dengan satuan besar + faktor konversi (mis. 1 dus = 24 pcs); **barcode** untuk pindai di kasir; **nomor seri** untuk barang bernilai tinggi/garansi | ✅ **Selesai** |
| **Fase 7d — Pajak UMKM** | Halaman Pajak: **PPh Final UMKM 0,5%** (PP 55/2022) — omzet bulanan otomatis × 0,5%, setoran berjurnal; **PPh 23** — bukti potong (jasa/sewa/royalti) + setor; **SPT Masa PPN 1111** — rekap Pajak Keluaran vs Masukan + kurang/lebih bayar + ekspor | ✅ **Selesai** |
| **Fase 7e — RBAC granular** | **Peran kustom** dengan **izin per modul** — mis. "Kasir Toko" hanya lihat Penjualan/POS/Stok. Owner/Admin/Viewer tetap preset (aturan lama tak berubah); menu sidebar otomatis menyaring modul yang tak diizinkan & API menolak akses modul terlarang | ✅ **Selesai** |
| **Fase 7f — Dimensi & rekonsiliasi v2** | **Cost center / departemen** opsional per baris jurnal + laporan **laba-rugi per dimensi** (per cabang/divisi); **rekonsiliasi bank v2** — aturan auto-match tersimpan (kata kunci + toleransi) & dukungan format impor rekening koran BCA/Mandiri/BRI | ✅ **Selesai** |
| **Fase 7g — Proyek Gantt + Manufaktur routing** | **Gantt** proyek (jadwal tugas, dependensi “setelah…”, baseline rencana vs aktual); **Manufaktur** — work center (pusat kerja + tarif/jam) + **routing** per produksi dengan biaya standar vs aktual & varian (WIP) | ✅ **Selesai** |
| **Fase 7h — Dashboard kustom + ekspor Excel + laporan terjadwal** | **Dashboard bisa disesuaikan** (pilih widget yang tampil, tersimpan per perangkat) + **grafik tren bulanan**; **ekspor Excel (.xlsx)** di Laporan Penjualan & Neraca Saldo (berdampingan CSV, tanpa pustaka pihak ketiga); **laporan terjadwal** — Cron menyusun rekap penjualan bulanan otomatis tiap awal bulan (+ tombol susun manual). **PR terakhir Fase 7** | ✅ **Selesai** |
| **Fase 8a — Pemulihan CI + standar kode (ESLint/Prettier)** | Memperbaiki commit eksternal 14 Juli yang membuat CI merah (lockfile tak diperbarui + config ESLint cacat); 10 pelanggaran lint nyata dibersihkan; job **Lint non-blocking** ditambahkan ke CI | ✅ **Selesai** |
| **Fase 8b — Backup & portabilitas data** | **Unduh semua data (ZIP CSV + manifest)** — tetap bisa walau langganan berakhir (anti lock-in, diuji otomatis); **backup Google Drive** (OAuth, terenkripsi, manual + otomatis bulanan) — aktif setelah Anda memasang Client ID/Secret Google | ✅ **Selesai** |
| **Fase 8c — Struktur organisasi** | **Departemen bertingkat** (induk/sub) + **atasan langsung** per karyawan + **bagan organisasi** di halaman Penggajian — fondasi laporan per departemen & approval hierarki | ✅ **Selesai** |
| **Fase 8d — RBAC berdimensi** | Peran kustom bisa **dibatasi ke cost center tertentu** (mis. Manajer Cabang hanya melihat & membukukan data cabangnya) — daftar dimensi, laporan per dimensi, dan jurnal ditegakkan; peran tanpa batasan tak berubah | ✅ **Selesai** |
| **Fase 9a — Pengerasan hasil audit** | Audit menyeluruh 32 file API (hasil: SQL aman, tanpa `any`, error tak bocor) + perbaikan semua temuan: **buku besar & audit log berhalaman** (tak lagi tanpa batas), **rate limit** endpoint laporan/ekspor, **guard RBAC permanen** (uji otomatis semua endpoint wajib berpenjaga), 2 indeks database baru, validasi ketat 4 input tersisa, **cron tahan-gagal** (marker + beban tersebar + batas waktu) | ✅ **Selesai** |
| **Fase 9b — Simulasi UI penuh** | Lapisan uji ketiga: **browser Chromium sungguhan** login, mengetik, mengeklik, dan memverifikasi hasil — sapu 44 halaman + 13 alur nyata (POS bayar tunai, terima pembayaran faktur, wizard catat, jurnal→neraca saldo, CRM, tiket, karyawan, persetujuan, Mode Sederhana) = **122 cek UI**; berjalan otomatis di CI | ✅ **Selesai** |
| **Fase 9c — Efisiensi navigasi** | Menu dirapikan: grup Keuangan 18 item dipecah jadi **Keuangan (9) + Laporan (6) + Aset & Pajak (4)**, 2 item salah-rumah dipindah, 5 ikon kembar dibedakan; baru: **pencarian menu** ("Cari menu…") dan **grup bisa dilipat** (tersimpan per pengguna, grup aktif selalu terbuka). Rute & izin tidak berubah | ✅ **Selesai** |
| **Fase 9d — Konsolidasi + laporan akhir Fase 9** | Berkas terbesar aplikasi dipecah 3 (tanpa perubahan perilaku — dibuktikan simulasi UI); **simulasi UI kini gerbang WAJIB di CI** (3 lapis: 668 uji API + 130 uji browser + deploy); laporan akhir Fase 9 (lihat `docs/riwayat.md`) | ✅ **Selesai** |
| **Fase 10a — Rebranding ERPindo** | Logo & ikon resmi dari pemilik dipasang di seluruh permukaan (aplikasi, landing, ikon PWA, favicon, gambar OG, email) + seluruh warna aplikasi beralih ke biru logo + 33 screenshot diregenerasi; dashboard perusahaan baru kini menampilkan **Rp 0 nyata** (bukan kotak abu-abu) + pesan ramah saat grafik kosong | ✅ **Selesai** |
| **Fase 10b — Harga tunggal + demo publik + landing** | Satu harga untuk semua: **paket Lengkap Rp389.000/bulan** (seluruh modul, pengguna tak terbatas; trial 30 hari tetap); tombol **"Lihat Demo"** di landing masuk PT Demo Sejahtera **tanpa mendaftar** (baca-saja, ditegakkan server + banner Mode demo); landing dirombak: CTA ganda, seksi keamanan, FAQ diperbarui | ✅ **Selesai** |
| **Fase 10c — Koreksi transaksi terposting** | Transaksi yang sudah diinput/dibayar kini bisa dikoreksi dengan aman: **hapus pembayaran** (sisa tagihan pulih), **balik jurnal** (badge DIBALIK/PEMBALIK, jejak utuh), **Ubah faktur** (batalkan + muat ke form), **batalkan penggajian** (saldo kasbon pulih otomatis, periode bisa digaji ulang), **Refund POS** dari laci kasir — semua lewat jurnal pembalik bertaut dua arah, neraca dijamin tetap seimbang | ✅ **Selesai** |
| **Fase 10d — Masuk/daftar via Google** | Tombol **"Lanjutkan dengan Google"** di halaman Masuk & Daftar — siap-pakai, otomatis muncul begitu kredensial Google dipasang; pendaftar via Google langsung terverifikasi dan hanya ditanya nama perusahaan | ✅ Selesai — **menunggu Anda memasang GOOGLE_CLIENT_ID/SECRET** (lihat baris Google Drive di bawah; kredensialnya sama) |
| **Fase 10e — Admin platform + Dukungan + Blog SEO** | **Dashboard Admin Platform** (khusus email Anda): pantau seluruh pendaftar & langganan, tren pendaftaran 12 bulan, kelola **masukan pengguna**, dan tulis **artikel blog**; halaman **Dukungan & Masukan** untuk semua pengguna (kirim saran/bug/pertanyaan + lihat statusnya); **blog publik** yang di-render server (SEO) di `/blog` lengkap dengan sitemap.xml & robots.txt agar ditemukan Google | ✅ Selesai — **menunggu Anda memasang PLATFORM_ADMIN_EMAILS** (lihat baris di bawah) |
| **Fase 10f — Onboarding: wizard, panduan dalam app & tur** | **Wizard awal** 4 langkah (profil → tingkat akuntansi → produk → kontak) menyambut pengguna baru, semuanya bisa dilewati; **Panduan kini di dalam aplikasi** (tak perlu pindah situs — tombol "?" tiap halaman langsung membuka artikelnya); **tur berpandu** yang menyorot bagian penting tiap halaman (tampil otomatis sekali di dasbor, bisa diputar ulang lewat tombol "Tur") | ✅ **Selesai** |
| **Fase 10g — Halaman bertab + Kalkulator bisnis** | Halaman panjang kini **bertab** agar mudah dijelajah: Pengaturan (5 tab), Penggajian (6 tab), dan detail Proyek (4 tab); menu baru **"Alat Bantu"** berisi kalkulator praktis — HPP per unit, markup vs margin, titik impas (BEP), simulasi PPh 21 (TER), PPN, dan cicilan kasbon | ✅ **Selesai** |
| **Fase 10h — Keamanan + seed demo lengkap + Laporan Akhir** | Pengerasan **header keamanan** server (Content-Security-Policy, Referrer-Policy, Permissions-Policy) + halaman keamanan landing + `docs/keamanan.md`; **seed demo diperkaya** (perusahaan kedua "CV Demo Cabang" → laporan konsolidasi kini terisi, pelepasan aset, anggaran 6 baris, balasan tiket) + **Laporan Akhir Fase 10** (17 arahan → selesai) | ✅ **Selesai** |
| **Fase 11a — Buka kapasitas: auto-migrasi tenant + Infra admin** | Perusahaan lama kini **otomatis menerima pembaruan skema** (saat dibuka & lewat tugas terjadwal) — sebelumnya hanya perusahaan baru yang dapat; tab **Infra** di Admin Platform memantau mode database, versi skema, dan perusahaan yang tertinggal + tombol "Migrasi sekarang"; jalur database produksi (D1 dinamis) dimatangkan & diuji, siap dinyalakan untuk skala di atas 6 perusahaan (runbook di `docs/05-runbook-go-live.md` §6) | ✅ **Selesai** |
| **Fase 11b — Billing langganan (Midtrans)** | ERPindo kini bisa **menarik pembayaran langganan sendiri** — buka Pengaturan → Langganan → bayar via QRIS/transfer/kartu/e-wallet; akun aktif **otomatis** setelah pembayaran terkonfirmasi (webhook terverifikasi tanda tangan), dan turun ke baca-saja saat langganan habis. Dibangun siap-pakai: aktif begitu kunci Midtrans dipasang, tanpa kunci menampilkan info. **Pemblokir launching #1 — tuntas.** | ✅ **Selesai** |
| **Fase 11c — AI-native: Tanya Laporan** | Asisten kini punya mode **Laporan** — tanya kondisi keuangan dengan bahasa sehari-hari ("berapa laba bulan ini?", "bandingkan pendapatan bulan ini vs lalu") dan dijawab **dari buku Anda sendiri** (pendapatan/beban/laba bulan ini & lalu, saldo kas, piutang, hutang). Read-only & tidak mengarang angka — AI tak pernah mengubah data. | ✅ **Selesai** |
| **Fase 11d — Tagih pelanggan: WhatsApp + link bayar** | Tombol **"Tagih (WA)"** di faktur penjualan menyiapkan pesan tagihan di WhatsApp (langsung jalan, tanpa kunci) + **link pembayaran online** (Midtrans, aktif begitu kunci dipasang) agar pelanggan bisa bayar via QRIS/transfer/kartu/e-wallet; pembayaran online terkonfirmasi otomatis (webhook). Perusahaan yang menunggak pun tetap boleh menagih pelanggannya. | ✅ **Selesai** |
| **Fase 11e — Pesanan Marketplace** | Menu **Marketplace** baru: ekspor pesanan dari **Shopee/Tokopedia/TikTok Shop** (CSV) lalu impor sekali klik — tiap pesanan otomatis jadi **faktur penjualan + stok keluar**. Cocokkan produk per SKU, aman diulang (pesanan yang sudah masuk dilewati). Jembatan omnichannel yang bekerja tanpa kunci API. | ✅ **Selesai** |
| **Fase 11f — Mulai cepat + Laporan Akhir** | Halaman Produk kini punya **"Mulai cepat"**: pilih jenis usaha (Retail/F&B/Jasa/Grosir) → contoh produk & kontak terisi sekali klik. Keputusan yang masih mengikat dari fase ini terangkum di `docs/riwayat.md`. | ✅ **Selesai** |
| **Fase 12a — Standar kode jadi gerbang wajib** | Pemeriksa kualitas kode (lint) dimodernisasi dan kini **wajib lulus** sebelum kode boleh masuk (dulu hanya pemantau); panduan kerja untuk asisten AI pengembang (`CLAUDE.md`) ditambahkan agar sesi berikutnya langsung paham aturan main repo | ✅ **Selesai** |
| **Fase 12b — Uji otomatis hampir dua kali lipat** | Uji unit **49 → 90**: perhitungan gaji (batas bracket PPh 21 TER & plafon BPJS diuji tepat di ambangnya), validasi input POS/faktur/impor marketplace, keamanan renderer blog (anti-XSS), dan util web (CSV, format rupiah/tanggal). Bonus: uji baru menemukan & memperbaiki bug kecil slug nama perusahaan beraksen | ✅ **Selesai** |
| **Fase 12c — Perapian struktur kode (lanjutan 9d)** | Tiga berkas terbesar dipecah jadi modul-modul kecil (berkas tipe bersama 2.800 baris → 14 modul domain; mesin posting faktur/pembelian → pustaka sendiri; halaman Stok → berkas sendiri) — **tanpa perubahan perilaku**, dibuktikan seluruh 784 uji API + 169 uji browser tetap hijau | ✅ **Selesai** |
| **Fase 12d — Dashboard makin actionable** | Grafik penjualan bisa difilter **7/30/90 hari**; **semua kartu KPI bisa diklik** menuju laporan sumbernya; KPI baru **"Laba Bulan Ini"** dengan panah naik/turun vs bulan lalu; sapaan sesuai waktu + pengingat "ada N faktur lewat jatuh tempo" | ✅ **Selesai** |
| **Fase 12e — Kasir makin cepat** | Tombol **"Uang pas" / +50rb / +100rb** (kembalian tampil besar agar tak salah hitung) + kartu **"Rekap hari ini"**: penjualan per jam, per shift, dan per metode pembayaran untuk analisis jam ramai | ✅ **Selesai** |
| **Fase 12f — Ringkasan mingguan AI** | Dashboard kini punya widget **narasi mingguan berbahasa Indonesia** ("omzet naik/turun sekian %…") yang dihitung dari buku Anda sendiri — hemat kuota (sekali hitung per minggu, disimpan di cache), dan bila AI sedang tak tersedia widget diam-diam menampilkan info, bukan error | ✅ **Selesai** |
| **Fase 13a–13c — Monetisasi 4 paket + reposisi jualan** | Pemaketan **4 tingkat**: **Trial Rp0 (30 hari) · Starter Rp499rb · Business Rp999rb · Enterprise Rp2.499rb** per bulan per perusahaan — **pengguna tak terbatas di semua paket** (pembeda utama vs pesaing per-user). Modul operasional (HR, manufaktur, proyek, dll.) mulai Business; skala/keamanan/API mulai Enterprise; akuntansi inti di semua paket. Pelanggan lama Rp389rb **tetap akses penuh** (grandfather). Landing baru: kalkulator "hemat berapa vs sistem per-user", tabel perbandingan kategori (tanpa menyebut merek), form **Jadwalkan Demo**, halaman **Layanan** (implementasi/migrasi berbayar). Checkout Midtrans per paket + kartu upsell (bukan error) untuk modul di luar paket | ✅ **Selesai** |
| **Fase 13d–13e — Multibahasa (Indonesia + Inggris)** | Pemilih bahasa ID/EN (tersimpan) di landing & aplikasi; **landing, shell aplikasi (menu/pencarian), dan dashboard** kini dwibahasa. Angka/tanggal ikut format bahasa; mata uang tetap Rupiah. Halaman modul menyusul bertahap (kamus & pola sudah siap) | ✅ **Selesai** |
| **Fase 13f — Wizard migrasi & saldo awal** | Menu **Migrasi**: impor **saldo awal akun** dari CSV → **jurnal pembuka seimbang otomatis** (selisih ke Ekuitas Saldo Awal), termasuk nilai persediaan awal yang sinkron dengan kartu stok. Penghancur hambatan terbesar pindah dari software lama | ✅ **Selesai** |
| **Fase 13g — Keamanan enterprise** | Paket Enterprise: **2FA wajib** per perusahaan (anggota tanpa 2FA diminta menyiapkannya dulu), **pembatasan akses per IP** (daftar CIDR kantor), dan **ekspor audit log ke CSV**. Ada katup pengaman agar Owner tak pernah terkunci dari pengaturannya sendiri | ✅ **Selesai** |
| **Fase 13h — API publik + webhook** | Paket Enterprise: **API key** per perusahaan (Bearer, skop baca/tulis) untuk menghubungkan toko online/sistem lain lewat **API terkurasi** (kontak, produk, faktur, pembayaran, ringkasan); **webhook** saat faktur/pembayaran/stok-menipis terjadi (bertanda tangan HMAC, dengan percobaan ulang); **halaman dokumentasi** publik di `/api-docs` | ✅ **Selesai** |
| **Fase 13i — Penomoran dokumen kustom** | Perusahaan bisa menyetel **format nomor dokumen sendiri** per jenis (faktur jual/beli, pembayaran) memakai token — mis. `INV-{YYYY}{MM}-{SEQ:4}` → `INV-202607-0001`; nomor urut otomatis **reset tiap bulan/tahun** bila polanya memuat tanggal. Ada di Pengaturan → Perusahaan dengan pratinjau langsung; kosongkan untuk format bawaan | ✅ **Selesai** |
| **Fase 14a — Uji mesin akuntansi inti** | Mesin double-entry yang dilewati SEMUA faktur, pembelian, dan pembayaran kini punya **jaring pengaman uji sendiri** (19 uji unit baru terhadap database asli): jurnal seimbang & bernomor urut, PPN & harga pokok rata-rata, diskon per baris, produk jasa tanpa stok, stok tak cukup ditolak tanpa efek, pembatalan (void) memulihkan buku & stok persis, dan periode terkunci ditolak. Menutup celah risiko terbesar sebelum menumpuk fitur baru | ✅ **Selesai** |
| **Fase 14b — Perapian halaman Pengaturan** | Halaman Pengaturan yang sudah sangat panjang dipecah rapi per tab (Akun, Perusahaan, Tim, Data, Lainnya) menjadi berkas-berkas kecil — **tanpa perubahan apa pun yang Anda lihat atau rasakan**, dibuktikan simulasi UI tetap hijau. Memudahkan pengembangan berikutnya | ✅ **Selesai** |
| **Fase 14c — Retur atas dokumen yang sudah dibayar (refund kas)** | Dulu retur ditolak bila fakturnya sudah dibayar. Kini bisa: bagian sebatas sisa tagihan mengurangi piutang/hutang seperti biasa, dan **kelebihannya dikembalikan sebagai uang tunai** lewat akun kas/bank yang Anda pilih (retur jual → uang keluar ke pelanggan; retur beli → uang diterima dari pemasok). Neraca dijamin tetap seimbang | ✅ **Selesai** |
| **Fase 14d — SEO halaman depan (data terstruktur)** | Halaman depan kini menyajikan **data terstruktur** (JSON-LD: profil perusahaan, aplikasi + harga tiap paket, dan FAQ) langsung dari server, plus versi teks `noscript` untuk mesin pencari yang tak menjalankan JavaScript. Tujuannya agar ERPindo tampil lebih baik & berpeluang muncul sebagai hasil kaya (rich result) di Google | ✅ **Selesai** |
| **Fase 14e — Bukti sosial & konversi landing** | Landing diperkuat untuk mendorong pendaftaran: seksi **badge kompatibilitas jujur** (Midtrans, e-Faktur/Coretax, PPh 21 & BPJS, Google Drive, WhatsApp, impor Shopee/Tokopedia/TikTok — bukan testimoni karangan), **tombol ajakan lengket di HP**, kalkulator yang kini menampilkan **"Hemat Rp sekian"** vs sistem per-pengguna, dan janji tanpa risiko (tanpa kartu kredit · batal kapan saja · data bisa diekspor) | ✅ **Selesai** |
| **Fase 14f — Landing 100% dwibahasa** | Multibahasa gelombang lanjutan: **seluruh** seksi halaman depan (bukan hanya hero & harga) kini mengikuti pilihan bahasa Indonesia/Inggris — showcase, fitur, perbandingan, keamanan, FAQ, kalkulator, dan footer. Istilah standar Indonesia (Coretax, PPh 21 TER, BPJS, e-Faktur) sengaja dipertahankan | ✅ **Selesai** |
| **Fase 14g — Uji mesin penyusutan aset** | Lanjutan 14a: mesin **penyusutan garis lurus** (yang tiap bulan membukukan beban penyusutan aset tetap otomatis) kini punya **jaring pengaman uji sendiri** (10 uji unit baru terhadap database asli): besaran garis lurus & nilai residu, jurnal seimbang, tidak menyusut dua kali di bulan yang sama, berhenti pas di nilai tersusutkan (tak berlebih), aset yang sudah dilepas/tersusut penuh dilewati, dan periode terkunci ditolak | ✅ **Selesai** |
| **Fase 14h — Uji mesin laporan keuangan** | Lanjutan 14g: mesin **Laba Rugi & Neraca** (dipakai laporan per-perusahaan maupun konsolidasi) kini terjaga 11 uji unit baru — memastikan **Neraca selalu seimbang**, laba/rugi berjalan masuk ekuitas dengan benar (termasuk saat rugi), rentang tanggal & kutoff dihormati, jurnal yang dibatalkan (void) tak terhitung, dan akun bersaldo nol disaring | ✅ **Selesai** |
| **Fase 14i — Uji penjaga integritas posting** | Lanjutan 14h: **penjaga** yang dijalankan tiap kali membuat faktur/pembelian kini teruji (10 uji) — validasi mata uang & kurs valas, penolakan transaksi di periode yang sudah ditutup buku, ambang persetujuan pembelian, dan pemeriksaan kontak/gudang/produk (termasuk yang salah jenis atau sudah diarsipkan). Mencegah dokumen cacat lolos ke pembukuan | ✅ **Selesai** |
| **Fase 14j — Uji utilitas (ekspor data & AI)** | Lanjutan 14i: dua utilitas kunci kini teruji (8 uji) — pembuat **arsip ZIP "Unduh semua data"** (anti lock-in) diverifikasi struktur & CRC32-nya terhadap nilai baku, dan **pemilih materi grounding Asisten AI** dipastikan mengembalikan panduan paling relevan dengan pertanyaan pengguna | ✅ **Selesai** |
| **Fase 14k — Uji mesin selisih kurs pelunasan** | Perhitungan **laba/rugi selisih kurs** saat pelanggan/pemasok melunasi faktur mata uang asing kini punya uji unit langsung (7 uji) — arah laba/rugi benar untuk penerimaan maupun pembayaran, pembulatan ke rupiah tepat, dan faktur Rupiah tetap tanpa selisih. Logikanya dirapikan jadi satu fungsi teruji **tanpa mengubah perilaku** (dibuktikan lolos uji jalur pelunasan valas & keseimbangan neraca yang sudah ada) | ✅ **Selesai** |
| **Fase 14l — Uji jurnal pelepasan aset** | Pembukuan **laba/rugi saat aset dijual atau dibuang** kini teruji langsung (5 uji) — nilai buku, arah laba (ke Pendapatan Lain) vs rugi (ke Beban Lain), kasus tanpa hasil penjualan, impas, dan aset belum tersusut — semuanya dengan jurnal dijamin seimbang. Logika dirapikan jadi fungsi teruji **tanpa mengubah perilaku** (jalur pelepasan & keseimbangan neraca yang ada tetap lolos) | ✅ **Selesai** |
| **Fase 14m — Uji jurnal penggajian** | Pembukuan **penggajian bulanan** (Beban Gaji, Kas netto, Hutang PPh 21 & BPJS, Piutang kasbon) kini teruji langsung (5 uji) — arah tiap baris & keseimbangan bruto = netto + potongan + cicilan, termasuk kasus dengan/tanpa kasbon. Perhitungan pajaknya sudah teruji sejak dulu; kini perakitan jurnalnya pun terjaga, dirapikan **tanpa mengubah perilaku** | ✅ **Selesai** |
| **Fase 14n — Uji perhitungan uang kasir (POS)** | Perhitungan di kasir kini teruji langsung (9 uji) — subtotal + diskon per baris + PPN, dan pembayaran gabungan (split): **kembalian hanya dari tunai**, pembayaran non-tunai (QRIS/kartu/e-wallet) masuk pembukuan persis, plus penolakan kurang bayar. Dirapikan **tanpa mengubah perilaku**; ditemukan pula satu catatan kecil (kembalian pada >1 tender tunai) yang dicatat untuk perbaikan terpisah | ✅ **Selesai** |
| **Fase 14o — Perbaikan kembalian multi-tender tunai (POS)** | Menindaklanjuti temuan 14n: bila satu transaksi kasir memakai lebih dari satu setoran **tunai**, kembalian dulu terpotong berulang sehingga tunai yang tercatat kurang. Kini kembalian dikurangkan dari total tunai **sekali** (disebar antar setoran). Kasus normal (satu setoran tunai) **sama persis** seperti sebelumnya — hanya kasus langka yang dibenarkan; diverifikasi uji kesetaraan + smoke | ✅ **Selesai** |
| **Fase 15a — Runbook go-live + audit degradasi** | Persiapan peluncuran komersial: audit memastikan **semua fitur berkunci** (Midtrans/Google/Admin/Email/AI) nonaktif anggun dengan pesan jelas (bukan error), plus **panduan go-live** `docs/05-runbook-go-live.md` — daftar kunci yang perlu dipasang, uji langganan sandbox, dan checklist pra-peluncuran | ✅ **Selesai** |
| **Fase 15b — Pengingat WhatsApp di dashboard** | Widget "Faktur lewat jatuh tempo" di dashboard kini punya tombol **"Tagih (WA)"** per faktur — sekali klik membuka WhatsApp dengan pesan pengingat siap kirim (nama pelanggan, no. faktur, nominal, jatuh tempo). Jalan tanpa kunci apa pun; pemilik bisa menagih pelanggan telat langsung dari halaman utama | ✅ **Selesai** |
| **Fase 15c — Deteksi beban mencurigakan** | Dashboard punya widget baru **"Beban perlu diperiksa"**: sistem otomatis membandingkan beban bulan ini dengan kebiasaan 3 bulan sebelumnya, lalu menandai yang melonjak (mis. *"Beban Sewa 10× biasanya"*) lengkap dengan nominal & selisihnya. Dihitung pasti dari jurnal Anda sendiri (bukan tebakan AI), jadi hasilnya bisa dipertanggungjawabkan dan tak memakai kuota | ✅ **Selesai** |
| **Fase 15d — Perbaikan retur barang berdiskon** | Ditemukan & diperbaiki bug nyata: meretur **seluruh** barang dari faktur berdiskon yang belum dibayar sempat **ditolak** karena selisih pembulatan Rp 1 — sistem meminta "akun refund" untuk uang yang sebenarnya tidak ada. Kini retur yang menghabiskan barang membalik nilai **persis** seperti fakturnya, dan sisa tagihan menjadi 0 dengan bersih | ✅ **Selesai** |
| **Fase 16a — Judul halaman ikut bahasa** | Menu sidebar sudah dwibahasa sejak lama, tapi **judul halamannya belum** — menu tampil "Products" sementara isinya "Produk". Kini **seluruh** halaman modul (master data, transaksi, laporan, keuangan, pajak, HR, proyek, POS, admin) punya judul & paragraf pengantar yang ikut bahasa aktif. *Catatan: isi halaman — label tabel, tombol, form — masih Bahasa Indonesia; itu tahap berikutnya* | ✅ **Selesai** |
| **Fase 16b — Isi halaman Master Data dwibahasa** | Lanjutan 16a: dibuat **kamus istilah bersama** (±55 istilah yang berulang di banyak halaman — Nama, Tanggal, Simpan, Batal, Hapus, dll.) agar terjemahan konsisten, lalu halaman **Produk · Kontak · Gudang** dituntaskan **penuh** — label tabel, form, dan tombolnya ikut bahasa aktif. *Catatan: 35 halaman lain isinya masih Indonesia; polanya kini siap pakai* | ✅ **Selesai** |
| **Fase 16c — Isi halaman Penjualan & Pembelian dwibahasa** | Lanjutan 16b: dua halaman transaksi yang paling sering dipakai kini isinya ikut bahasa aktif — label form & tabel (Harga satuan, Diskon, Mata uang), tombol aksi (Cetak/Ubah/Retur/Batalkan), panel pembayaran, dan teks konfirmasi. *Cakupan kumulatif: 3 dari 36 halaman tuntas isinya* | ✅ **Selesai** |
| **Fase 16d — Isi halaman Stok dwibahasa** | Lanjutan 16c: halaman **Stok** (level per gudang, kartu stok, transfer antar gudang, opname, lot & kedaluwarsa, usulan pembelian) kini isinya ikut bahasa aktif — judul kartu, label kolom, dan form. *Cakupan kumulatif: 4 dari 36 halaman tuntas isinya* | ✅ **Selesai** |
| **Fase 16e — Isi halaman Laporan dwibahasa** | Lanjutan 16d: **enam layar laporan** (Laba Rugi, Arus Kas, Umur Piutang/Hutang, Ekspor e-Faktur, Neraca, Laporan Penjualan) kini isinya ikut bahasa aktif — label kolom, bagian neraca, metrik penjualan, dan pesan kosong. *Cakupan kumulatif: ±10 layar tuntas isinya* | ✅ **Selesai** |
| **Fase 16f — Isi halaman Keuangan dwibahasa** | Lanjutan 16e: **empat halaman inti pembukuan** (Bagan Akun, Jurnal Umum, Buku Besar, Neraca Saldo) + kartu template jurnal berulang kini isinya ikut bahasa aktif. *Cakupan kumulatif: ±14 layar tuntas isinya* | ✅ **Selesai** |
| **Fase 16g — Isi halaman Kasir (POS) dwibahasa** | Layar kasir penuh — buka/tutup shift, keranjang & pembayaran, tahan/panggil transaksi, rekap harian, panel Struk & Refund — kini isinya ikut bahasa aktif. *Cakupan kumulatif: ±15 layar tuntas isinya* | ✅ **Selesai** |
| **Fase 16h — Isi halaman CRM dwibahasa** | Halaman **Pipeline** (lead, papan kanban, aktivitas follow-up, laporan konversi per sumber) dan **Penawaran** (buat, kirim, terima/tolak, konversi ke faktur) kini isinya ikut bahasa aktif. *Cakupan kumulatif: ±17 layar tuntas isinya* | ✅ **Selesai** |
| **Fase 16i — Isi halaman Penggajian dwibahasa** | Halaman terbesar aplikasi (karyawan, departemen bertingkat, bagan organisasi, jalankan penggajian + slip, komponen ad-hoc, kasbon, cuti & izin) kini isinya ikut bahasa aktif. Istilah resmi BPJS/PPh 21 (TER)/PTKP sengaja dipertahankan. *Cakupan kumulatif: ±18 layar tuntas isinya* | ✅ **Selesai** |
| **Fase 16j — Isi halaman Proyek dwibahasa** | Daftar proyek, detail bertab (Ikhtisar/Tugas/Timesheet/Termin & RAB), Gantt, papan tugas kanban, beban kerja, termin penagihan, RAB, timesheet — semuanya ikut bahasa aktif. Ditemukan pula bentuk teks yang selama ini luput (label tab), sehingga **tab halaman Penggajian ikut diperbaiki**. *Cakupan kumulatif: ±20 layar tuntas isinya* | ✅ **Selesai** |
| **Fase 16k — Isi halaman Aset Tetap dwibahasa + audit ulang** | Halaman **Aset Tetap** (ikhtisar nilai buku, pendaftaran aset, penyusutan bulanan, daftar & pelepasan aset) kini isinya ikut bahasa aktif. Selain itu alat pemeriksa terjemahan diperketat dan dipasang di repo — pemeriksa versi lama ternyata terlalu longgar, sehingga ditemukan **±297 potongan teks yang masih berbahasa Indonesia di halaman-halaman yang sebelumnya dinyatakan tuntas**. Daftar utang itu dicatat terbuka dan akan dilunasi pada sub-fase 16l dan seterusnya | ✅ **Selesai** (halaman Aset Tetap) · ⏳ pelunasan utang menyusul |
| **Fase 16l — Lunasi utang bahasa di Penjualan & Pembelian** | Sub-fase pertama yang melunasi utang hasil audit 16k. Halaman **Penjualan & Pembelian** (utang terbesar: 61 temuan) kini benar-benar dwibahasa — tombol baris & posting, lencana lunas/belum lunas, deskripsi keadaan kosong, label kurs mata uang asing, serta tiga kotak konfirmasi (batalkan dokumen, ubah dokumen, hapus pembayaran). *Sisa utang: 9 halaman* | ✅ **Selesai** |
| **Fase 16m — Lunasi utang bahasa di Data Master** | Tiga halaman data master (**Produk**, **Kontak**, **Gudang**) kini benar-benar dwibahasa — judul & penjelasan form tambah/ubah, pesan saat daftar masih kosong, kotak konfirmasi arsip, tombol Simpan/Tambah, serta label pilihan lacak lot/kedaluwarsa, jasa tanpa stok, dan lacak nomor seri. *Sisa utang: 7 halaman* | ✅ **Selesai** |
| **Fase 16n — Lunasi utang bahasa di Laporan** | Enam layar laporan (Laba Rugi, Arus Kas, Umur Piutang/Hutang, Ekspor e-Faktur, Neraca, Laporan Penjualan) kini benar-benar dwibahasa. Sekaligus ketahuan bahwa dari 44 temuan di halaman ini, **27 sebenarnya header kolom berkas ekspor CSV** yang justru TIDAK boleh diterjemahkan (mengubahnya akan merusak berkas yang sudah diunduh pengguna). Alat pemeriksa disesuaikan agar tidak lagi salah hitung | ✅ **Selesai** |
| **Fase 16o — Lunasi utang bahasa di Keuangan** | Empat halaman inti pembukuan (Bagan Akun, Jurnal Umum, Buku Besar, Neraca Saldo) beserta kartu template jurnal berulang kini benar-benar dwibahasa — tombol posting & tambah baris, lencana seimbang/belum seimbang, lencana DIBALIK/PEMBALIK, kotak konfirmasi balik jurnal, sampai singkatan D/K pada pratinjau template (dalam Inggris K menjadi C) | ✅ **Selesai** |
| **Fase 16p — Lunasi utang bahasa di Proyek** | Halaman Proyek kini benar-benar dwibahasa — tombol buat proyek, ringkasan biaya/laba, garis waktu, papan tugas, beban kerja, termin, dan RAB. Ditemukan pula **enam label aksesibilitas** (yang dibacakan pembaca layar untuk tunanetra) masih berbahasa Indonesia padahal terjemahannya sudah tersedia — jenis kesalahan yang tak terlihat mata maupun oleh uji otomatis yang membaca teks layar | ✅ **Selesai** |
| **Fase 16q — Lunasi utang bahasa di Stok** | Halaman Stok kini benar-benar dwibahasa — kartu stok, transfer antar gudang, lot & kedaluwarsa (termasuk peringatan lot yang akan kedaluwarsa), penjelasan metode biaya rata-rata, dan baris total nilai persediaan. Catatan pada usulan pembelian otomatis sengaja tetap berbahasa Indonesia karena **tersimpan sebagai data** dan dibaca orang lain di halaman Pengadaan — kalau ikut bahasa layar, isi basis data jadi campur bahasa | ✅ **Selesai** |
| **Fase 16r — Lunasi utang bahasa di Penggajian** | Halaman Penggajian kini benar-benar dwibahasa — pengumuman tarif pajak, ringkasan karyawan aktif, bagan organisasi, komponen bonus/lembur, kasbon, cuti, riwayat penggajian, dan kotak konfirmasi pembatalan. Ditemukan lagi pola yang sama seperti di Proyek: **terjemahannya sudah dibuat pada fase sebelumnya, tetapi tidak pernah disambungkan ke tempat yang memakainya** | ✅ **Selesai** |
| **Fase 16s — Lunasi utang bahasa di Kasir & CRM** | Halaman Kasir dan CRM kini benar-benar dwibahasa. **Utang dari audit Fase 16k lunas** — sepuluh halaman yang dulu terlanjur dinyatakan selesai kini benar-benar bersih | ✅ **Selesai** |
| **Temuan baru: teks di luar berkas halaman** | Alat pemeriksa selama ini hanya melihat folder halaman. Ternyata teks tampilan juga tersimpan di paket bersama (`packages/shared`) — 20+ daftar istilah seperti tahap penjualan, status persetujuan, dan status tiket. Akibatnya papan CRM masih terbaca "Baru/Dihubungi/Terkualifikasi" walau aplikasi disetel bahasa Inggris. Sudah diperbaiki untuk CRM; daftar lain menyusul | ⏳ **Berlanjut** |
| **Fase 16t — Daftar istilah bersama + perbaikan bug struk kasir** | Enam daftar istilah di paket bersama (jenis akun, bidang usaha, jenis aktivitas CRM, metode bayar kasir, prioritas tugas, kelompok umur piutang) kini ikut bahasa layar. **Ditemukan juga bug nyata: struk kasir yang dicetak sejak Fase 16g menampilkan tulisan mentah `{u("subtotal")}` alih-alih "Subtotal"** — tidak pernah terlihat karena struk terbuka di jendela cetak terpisah. Sudah diperbaiki dan dikunci dengan 4 uji otomatis baru | ✅ **Selesai** |
| **Fase 16u — Dasbor dwibahasa** | **Layar pertama yang Anda lihat setelah masuk** kini ikut bahasa aktif sepenuhnya: grafik penjualan, faktur jatuh tempo, beban yang perlu diperiksa, aktivitas terakhir, daftar mulai cepat, tren bulanan, laporan terjadwal, ringkasan mingguan AI, dan tautan pintasan. Ini halaman pertama di luar daftar utang — artinya program dwibahasa mulai menggarap halaman baru, bukan lagi memperbaiki klaim lama | ✅ **Selesai** |
| **Fase 17a — Wajah baru: fondasi & tema gelap** | Awal perombakan total tampilan. Seluruh warna aplikasi diganti ke palet baru bergaya "alat kerja" (rapat, gelap, tegas) — dan karena warnanya diatur dari satu berkas pusat, **seluruh aplikasi berubah rupa sekaligus** tanpa menyentuh halaman satu per satu. Aplikasi kini **gelap secara bawaan** dan tidak lagi berkedip putih saat dibuka. Ditambahkan pula font khusus angka — aplikasi akuntansi ini sebelumnya tidak punya, padahal angka ada di mana-mana | ✅ **Selesai** |
| **Fase 17b — Tombol, form & tabel yang rapat** | Semua elemen dasar dirapatkan (tombol, kolom isian, kartu) sesuai arah "alat kerja". **Ditemukan juga bug lama: 96 dari 98 upaya membuat tombol ringkas di seluruh aplikasi ternyata tidak pernah berpengaruh** — tombol selalu kembali ke ukuran besar. Sudah diperbaiki dan dikunci 6 uji otomatis. Ditambahkan pula komponen tabel baku (sebelumnya tiap halaman membuat tabelnya sendiri, dengan dua gaya yang berbeda-beda) | ✅ **Selesai** |
| **Fase 17c — Menu & topbar yang menempel + pencarian cepat ⌘K** | Bilah atas dan menu kiri kini **ikut diam saat halaman digulir** — pada tabel panjang, tombol tema dan Keluar tak lagi hilang dari layar. Menu kiri dirapatkan sehingga lebih banyak modul terlihat tanpa menggulir. Yang terbesar: **tekan Ctrl+K (⌘K di Mac) di mana saja untuk melompat ke halaman mana pun** — ketik beberapa huruf, tekan Enter. Palet ini hanya menampilkan halaman yang memang boleh Anda buka. **Bug tertangkap dari memeriksa tampilan dengan mata, bukan dari uji otomatis**: sorotan di daftar sempat melompat ke baris di bawah kursor, sehingga Enter bisa membawa ke halaman yang tidak dipilih — sudah diperbaiki dan dikunci uji baru | ✅ **Selesai** |
| **Fase 17d — Halaman jualan (landing) dirombak total** | Halaman depan tidak lagi terlihat seperti "SaaS kebanyakan": gradien buram di belakang judul, judul berwarna pelangi, bingkai jendela Mac bertitik tiga, dan pita ajakan bergradien semuanya dibuang. Diganti tata letak rata kiri yang rapat, bergaris tegas, dengan angka memakai font khusus angka. **Teksnya tidak diubah sedikit pun** — hanya bentuknya. Ditemukan juga satu lubang kosong di kisi daftar modul (11 modul di kisi 3 kolom) yang selama ini tak terlihat; sekarang diisi ajakan dan dikunci uji baru | ✅ **Selesai** |
| **Fase 17e — Gambar produk diperbarui (33 tangkapan layar)** | Semua gambar produk di halaman depan dan panduan kini menampilkan tampilan baru yang gelap dan rapat. **Ditemukan bahwa alat pembuat gambarnya sendiri sudah rusak sejak Fase 13b** — itulah sebabnya gambar tertinggal belasan fase tanpa ada yang tahu. Setelah diperbaiki, dua cacat lain baru ketahuan dari melihat hasilnya: seluruh aplikasi ter-render **berbahasa Inggris**, dan tur perkenalan menutupi kartu ringkasan. Ketiganya sudah diperbaiki | ✅ **Selesai** |
| **Fase 17f — Halaman masuk & daftar** | Halaman masuk tidak lagi memakai panel bergradien khas halaman login SaaS; diganti bidang gelap bergaris tipis yang senada dengan halaman depan dan aplikasi. Formnya dirapatkan. **Klaim "890+ uji otomatis" di halaman itu sudah lama tertinggal** — jumlah sebenarnya kini 1.326, jadi diperbarui menjadi "1.300+". Halaman ini adalah pintu masuk seluruh ujian otomatis, sehingga kontraknya dikunci uji baru lebih dulu sebelum satu baris gaya pun diubah | ✅ **Selesai** |
| **Fase 17g — Tabel modul Stok dirapikan** | Keempat tabel di halaman Stok kini memakai komponen tabel baku dari Fase 17b. Hasil paling terasa: **kolom rupiah benar-benar berbaris lurus** karena angka memakai font khusus angka. Sisa pekerjaan dicatat apa adanya: masih ada **45 tabel tulis-tangan** di seluruh aplikasi (bukan 31 seperti perkiraan awal), 5 di antaranya adalah dokumen cetak yang sengaja **tidak** akan diubah karena harus tetap putih saat dicetak | ✅ **Selesai** |
| **Fase 17h — Tabel modul Keuangan dirapikan** | Keempat tabel Keuangan (Bagan Akun, Jurnal Umum, Buku Besar, Neraca Saldo) memakai komponen tabel baku. Kolom rupiah berbaris lurus; kode akun tetap rata kiri karena ia pengenal, bukan nilai — keputusan itu dikunci uji baru supaya tidak terbalik kelak | ✅ **Selesai** |
| **Fase 18a — Wajah baru: putih & lapang (arah desain berubah)** | Pemilik mengubah arah: dari "alat pro gelap" menjadi **modern, bersih, dan lapang dengan tema putih sebagai bawaan**. Fase ini membalik fondasinya: seluruh warna aplikasi diganti ke palet terang, sudut kartu dibulatkan, bayangan halus kembali, dan aplikasi kini **putih secara bawaan** (mode gelap tetap tersedia lewat tombol). Ke-33 gambar produk ikut diregenerasi supaya tidak ada gambar gelap di halaman putih. **Kabar baiknya: hampir tidak ada pekerjaan sebelumnya yang terbuang** — karena warna diatur dari satu berkas pusat, membalik arah sebesar ini hanya menyentuh lima berkas | ✅ **Selesai** |
| **Fase 18b — Tombol, form & kartu jadi lapang** | Semua elemen dasar dilonggarkan: tombol dan kolom isian lebih tinggi, sudut lebih membulat, bantalan kartu lebih lega, judul kartu lebih besar, dan bayangan halus kembali. Cincin fokus dipertegas supaya tetap terlihat pada sudut membulat (soal aksesibilitas, bukan gaya). Aplikasi kini bukan hanya terang, tapi benar-benar terasa lapang | ✅ **Selesai** |
| **Fase 18c — Tampilan HP mulai benar-benar diuji** | **Temuan penting: selama ini seluruh ujian tampilan hanya dijalankan pada satu ukuran layar besar (1360px)** — jadi klaim "bisa dipakai di HP" tidak pernah dijaga apa pun. Fase ini menambah lintasan uji pada layar HP (390px), dan lintasan itu **langsung menemukan dua masalah nyata**: tombol menu terlalu kecil untuk jempol (34px), dan setelah diperbesar pun lebarnya masih tergencet. Keduanya sudah diperbaiki ke ukuran nyaman 44px | ✅ **Selesai** |
| **Fase 18d — Tabel jadi kartu di layar HP** | Di layar kecil, tabel berhenti jadi tabel: **tiap baris berubah jadi kartu** dengan pasangan "judul kolom — isi", sehingga tidak ada lagi geser ke samping dan tidak ada kolom terpotong. Sudah diterapkan di Stok dan Keuangan sebagai percontohan; modul lain menyusul. Uji barunya sengaja memeriksa bahwa **judul kolomnya benar-benar terlihat**, bukan sekadar ada di halaman | ✅ **Selesai** |
| **Fase 18i — Tabel modul Laporan** | Kelima tabel Laporan (Laba Rugi, Neraca, Umur Piutang/Hutang, Ekspor e-Faktur, Penjualan per produk & pelanggan) kini memakai komponen tabel baku dan **berubah jadi kartu di layar HP**. Tabel e-Faktur yang 7 kolom adalah yang paling menderita di HP sebelum ini | ✅ **Selesai** |
| **Fase 18j — Tabel modul Penggajian** | Keempat tabel Penggajian memakai komponen tabel baku dan berubah jadi kartu di HP. Daftar karyawan yang **9 kolom** adalah tabel terlebar di seluruh aplikasi — sebelumnya praktis tidak terbaca di layar HP | ✅ **Selesai** |
| **Fase 18k — Tabel Master Data (Produk, Kontak, Gudang)** | Tiga halaman yang paling sering dibuka pengguna baru — mengisi produk, kontak, dan gudang adalah langkah pertama setelah daftar. Ketiganya kini jadi kartu di layar HP | ✅ **Selesai** |
| **Fase 18l — Tabel modul Pajak** | Ketiga tabel Pajak (PPh Final UMKM, bukti potong PPh 23, dan rincian SPT Masa PPN) kini jadi kartu di layar HP. Tabel bukti potong yang 8 kolom sebelumnya harus digeser-geser | ✅ **Selesai** |
| **Fase 18m — Tabel Admin Platform** | Ketiga tabel di panel admin (pendaftar terbaru, semua perusahaan, perusahaan tertinggal migrasi) kini jadi kartu di layar HP | ✅ **Selesai** |
| **Fase 18n — Tabel Kas & Bank** | Mutasi kas/bank dan rekonsiliasi rekening koran kini jadi kartu di layar HP. **Ditemukan juga koreksi hitungan**: dua "tabel" di halaman Kasir ternyata bagian dari struk cetak, bukan tampilan layar — jadi tidak boleh diubah, sama seperti dokumen cetak lainnya | ✅ **Selesai** |
| **Fase 18o — Tabel Dimensi & Pemeliharaan** | Daftar cost center, laba/rugi per dimensi, jadwal servis, dan work order kini jadi kartu di layar HP. Tabel work order paling rumit sejauh ini — sel aksinya memuat formulir penyelesaian yang terbuka di dalam sel | ✅ **Selesai** |
| **Fase 18p — Tabel Manufaktur & QC** | Riwayat produksi dan tahapan routing kini jadi kartu di layar HP. Baris "Total" di tabel routing dapat perlakuan khusus: di layar lebar ia satu baris ringkas, di HP tiap angkanya diberi keterangan sendiri supaya tetap terbaca | ✅ **Selesai** |
| **Fase 18q — Tabel Mata Uang & Marketplace** | Dua tabel terakhir yang sederhana kini jadi kartu di layar HP. **Justru di sini ketahuan satu cacat lama**: sejak pola kartu HP diperkenalkan, kartu barisnya tidak melebar penuh — hanya selebar isinya. Tidak terlihat selama dua belas modul sebelumnya karena isi tabelnya kebetulan sudah panjang. Sudah diperbaiki untuk semua tabel sekaligus | ✅ **Selesai** |
| **Fase 18r — Tabel Absensi & CRM** | Rekap kehadiran bulanan dan laporan konversi lead kini jadi kartu di layar HP. Kolom "Alfa" ikut diperbaiki: nol yang dulu dibiarkan kosong kini ditulis "—", karena di tampilan kartu sel kosong terbaca seperti data yang hilang, bukan seperti nol | ✅ **Selesai** |
| **Fase 18s — Tabel Anggaran** | Anggaran vs realisasi kini jadi kartu di layar HP, termasuk baris totalnya. Bentuk paling padat sejauh ini: tabelnya dipakai dua kali (Pendapatan & Beban), barisnya bisa disunting langsung, dan punya dua macam baris gabungan | ✅ **Selesai** |
| **Fase 18t — Tabel Konsolidasi & Proyek** | Dua tabel terakhir. **Migrasi tabel ke tampilan kartu HP kini tuntas** — seluruh tabel di dalam aplikasi bisa dibaca di layar ponsel tanpa menggeser-geser ke samping. Yang tersisa hanya dokumen cetak, yang memang harus tetap berbentuk tabel | ✅ **Selesai** |
| **Fase 19a — Logo tanpa kotak putih** | Logo ERPindo dulu berupa gambar yang latar putihnya menyatu di dalam file, sehingga selalu tampak sebagai kotak putih — paling terlihat di halaman masuk dan di tema gelap. Kini dibuat dua versi berlatar tembus pandang (terang & gelap), jadi logonya bersih di latar mana pun | ✅ **Selesai** |
| **Fase 19b — Perusahaan demo berhenti merugi** | Demo yang dilihat calon pelanggan dulu menampilkan RUGI Rp 42 juta. Sebabnya dua: gaji bulan lalu keliru tercatat di bulan berjalan (jadi terhitung dua kali), dan penjualan demo terlalu kecil dibanding jumlah karyawannya. Keduanya diperbaiki — demo kini menampilkan laba Rp 5,9 juta dengan angka yang saling masuk akal | ✅ **Selesai** |
| **Fase 19c — Kas & Bank dwibahasa** | Halaman Kas & Bank (saldo, mutasi, rekonsiliasi rekening koran) kini ikut berganti bahasa saat tombol EN ditekan — termasuk pesan galat saat menempel CSV mutasi bank | ✅ **Selesai** |
| **Fase 19d — Catat Transaksi dwibahasa** | Halaman pencatatan cepat (Uang Masuk / Keluar / Pindah Dana) kini ikut berganti bahasa. **Sekaligus memperbaiki cacat tersembunyi**: kategori dulu dikenali dari teksnya sendiri, sehingga mengganti bahasa akan membuat kategori terpilih hilang diam-diam dan transaksi tidak bisa disimpan | ✅ **Selesai** |
| **Fase 19e — Pajak dwibahasa** | Halaman Pajak (PPh Final, Bukti Potong PPh 23, SPT Masa PPN) kini sepenuhnya dwibahasa — termasuk pesan konfirmasinya. Nama resmi seperti "PPh 23" dan "SPT Masa PPN 1111" sengaja dipertahankan agar tetap cocok dengan formulir pajak aslinya | ✅ **Selesai** |
| **Fase 19f — Pengadaan dwibahasa** | Halaman Pengadaan (permintaan → pesanan → penerimaan barang) kini sepenuhnya dwibahasa. **Sekaligus memperbaiki satu cacat dari fase sebelumnya**: label ringkasan SPT PPN tidak ikut berganti bahasa saat tombol EN ditekan | ✅ **Selesai** |
| **Fase 19g — Pesanan Penjualan dwibahasa** | Halaman Pesanan Penjualan (pesanan → surat jalan → faktur) kini ikut berganti bahasa. Isi surat jalan yang dicetak sengaja tetap Indonesia, sesuai keputusan bahwa dokumen cetak tidak diterjemahkan | ✅ **Selesai** |
| **Fase 19h — Manufaktur & Pemeliharaan dwibahasa** | Kedua halaman kini sepenuhnya dwibahasa, termasuk pesan konfirmasinya. Istilah pabrik yang memang dipakai sehari-hari (BoM, work center, routing) sengaja dipertahankan, hanya diberi keterangan | ✅ **Selesai** |
| **Fase 19i — Persetujuan dwibahasa** | Halaman Persetujuan (antrean, pengajuan, aturan berjenjang) kini ikut berganti bahasa, termasuk status dan jenis dokumennya | ✅ **Selesai** |
| **Fase 19j — Kontrak Berulang & Helpdesk dwibahasa** | Kedua halaman kini ikut berganti bahasa, termasuk status kontrak dan pesan konfirmasinya | ✅ **Selesai** |
| **Fase 19k — Absensi dwibahasa + perbaikan penjaga terjemahan** | Halaman Absensi kini ikut berganti bahasa. **Sekaligus menemukan cacat yang lebih penting**: pemeriksa otomatis yang seharusnya menolak kunci terjemahan yang belum dibuat ternyata tidak bekerja sama sekali — akibatnya dua tulisan sempat tampil sebagai kode mentah di layar (halaman Pajak dan Proyek). Pemeriksanya diperbaiki, kedua tulisan itu dibetulkan | ✅ **Selesai** |
| **Fase 19l — Dimensi & Anggaran dwibahasa** | Halaman Dimensi/Rekonsiliasi dan Anggaran kini ikut berganti bahasa. Sub-fase pertama yang menikmati hasil perbaikan 19k: kunci terjemahan yang belum dibuat langsung ditolak sebelum sempat tampil salah di layar | ✅ **Selesai** |
| **Fase 19m — Mata Uang, Marketplace & Konsolidasi dwibahasa** | Ketiga halaman kini sepenuhnya dwibahasa. Ditemukan juga dua tulisan yang lolos dari alat pemeriksa otomatis dan tetap berbahasa Indonesia — keduanya sudah diperbaiki | ✅ **Selesai** |
| **Fase 19n — Wizard "Mulai" dwibahasa** | Layar pertama yang dilihat pengguna baru kini ikut berganti bahasa. Didahulukan karena inilah kesan pertama: pendaftar berbahasa Inggris sebelumnya disambut wizard berbahasa Indonesia | ✅ **Selesai** |
| **Fase 19o — Halaman Migrasi dwibahasa** | Halaman impor saldo awal dari sistem lama kini ikut berganti bahasa, termasuk pesan galat saat data CSV-nya tidak cocok. Contoh nama kolom CSV sengaja tetap Indonesia karena itulah yang harus ditulis pengguna di berkasnya | ✅ **Selesai** |
| **Fase 19p — Alat Bantu dwibahasa** | Enam kalkulator cepat (HPP per unit, markup vs margin, titik impas, PPh 21, PPN, cicilan kasbon) kini ikut berganti bahasa. Istilah pajak resmi seperti PPN, PPh 21, dan PTKP sengaja tetap sama di kedua bahasa. **Sekaligus koreksi laporan sebelumnya**: halaman Masuk/Daftar ternyata belum dwibahasa sama sekali — terjemahannya sudah ditulis sejak lama tetapi tidak pernah tersambung ke halamannya. Itu dikerjakan berikutnya, didahulukan karena dilihat setiap calon pelanggan | ✅ **Selesai** |
| **Fase 19q — Halaman Masuk/Daftar dwibahasa** | Tujuh layar publik (masuk, daftar, verifikasi email, lupa password, atur ulang password, undangan tim, dan langkah setelah masuk via Google) kini ikut berganti bahasa. **Halaman masuk juga akhirnya mendapat tombol bahasa** — sebelumnya satu-satunya layar publik tanpa itu, sehingga pengunjung yang datang lewat tautan undangan tidak punya cara mengganti bahasa sama sekali. Terjemahan halaman ini sebenarnya sudah ditulis bertahun lalu tetapi tidak pernah tersambung ke halamannya; kamus lama yang menganggur itu dihapus, dan pemeriksa kelengkapannya dipindahkan ke kamus yang benar-benar dipakai | ✅ **Selesai** |
| **Fase 19r — Admin platform & Dukungan dwibahasa** | Dashboard admin (internal) dan halaman Dukungan & Masukan kini ikut berganti bahasa. **Dua perbaikan ikut terbawa**: status langganan perusahaan dulu tampil sebagai kode mentah seperti "past_due" — sekarang jadi "Menunggak"; dan halaman Dukungan yang dipakai semua pengguna ternyata belum dwibahasa sama sekali, dengan pilihan jenis masukan tetap Indonesia walau tombol EN ditekan. Alat pemeriksa otomatis tidak bisa melihat kebocoran itu karena teksnya datang dari tempat lain — jadi ditambahkan tiga pemeriksa baru agar tidak terulang | ✅ **Selesai** |
| **Fase 19s — Kerangka aplikasi & Asisten AI dwibahasa** | Bagian yang muncul di **setiap** halaman kini ikut berganti bahasa: tombol keluar, spanduk verifikasi email, spanduk masa trial, lonceng notifikasi, pemilih perusahaan, dan seluruh panel Asisten AI. Sebelumnya satu kalimat Indonesia tertinggal di sini terlihat di seluruh aplikasi sekaligus. **Alat pemeriksanya juga diperbaiki**: ia salah melaporkan 64 masalah di berkas menu yang sebenarnya sudah dwibahasa, dan angka palsu itu menyembunyikan 17 masalah yang benar-benar ada di berkas yang sama. Kini alat itu justru bisa mendeteksi menu baru yang lupa diberi terjemahan | ✅ **Selesai** |
| **Fase 19t — Memeriksa sisa temuan satu per satu** | Seluruh 110 temuan sisa diperiksa satu per satu, bukan diasumsikan aman: 12 ternyata utang nyata (halaman Panduan dalam aplikasi, dua pecahan pesan notifikasi, tiga label kartu laporan) dan sudah dikerjakan; sisanya memang disengaja (contoh data CSV, alamat URL, dokumen cetak) atau salah lapor dari alatnya. **Ditemukan juga satu jenis masalah yang selama ini sama sekali tak terlihat**: teks yang diletakkan sebagai atribut — misalnya judul kartu dan label kolom di tampilan HP — tidak pernah terdeteksi alat mana pun. Setelah alatnya diperbarui, ketahuan ada **123 teks seperti itu di 23 berkas**. Itu belum dikerjakan dan dinyatakan apa adanya: program dwibahasa belum tuntas, tetapi sisanya kini terukur | ✅ **Selesai** |
| **Fase 19u — Teks tersembunyi di atribut (tuntas)** | Judul kartu dan label kolom tampilan HP di **seluruh** halaman kini ikut berganti bahasa — jenis teks yang selama ini tak pernah terdeteksi alat mana pun karena diletakkan sebagai atribut, bukan sebagai tulisan biasa. Dari 123 temuan: sebagian ternyata istilah yang memang sama di kedua bahasa (PPN, DPP, BPJS, Qty, dan sejenisnya) sehingga didaftar sebagai netral, sisanya diterjemahkan sampai **nol**. Tiga komponen ternyata belum dwibahasa sama sekali dan baru ketahuan dari galat kompilasi | ✅ **Selesai** |
| **Fase 20a — Pengingat sebelum akun jadi baca-saja** | **Temuan penting: pelanggan yang MEMBAYAR selama ini tidak diperingatkan sama sekali** sebelum langganannya habis — akun mendadak baca-saja, dan email pertama yang mereka terima adalah pemberitahuan bahwa itu sudah terjadi. Yang gratis diingatkan, yang membayar tidak. Sekarang keduanya dapat pengingat **7 hari dan 1 hari** sebelum berakhir, lengkap dengan penegasan bahwa data tetap aman dan bisa diekspor. **Masa tenggang sengaja belum dikerjakan** — itu mengubah kapan pelanggan kehilangan akses, jadi keputusan berapa hari (atau tidak sama sekali) ada di tangan Anda | ✅ **Selesai** |
| **Fase 20b — Susulan setelah akun baca-saja** | Satu email susulan 3 hari setelah akun jatuh ke mode baca-saja, mengingatkan bahwa pencatatan terhenti tetapi **data tetap aman dan bisa diekspor**. Sengaja hanya SATU, bukan rentetan: akun yang baca-saja sudah menampilkan spanduk merah tiap dibuka, dan email berulang justru berisiko masuk folder spam — yang akan menenggelamkan pengingat H-7/H-1 yang masih bisa mencegah akun terputus | ✅ **Selesai** |
| **Fase 20c — Masa tenggang 3 hari** | Sesuai keputusan Anda: setelah trial/langganan habis, akun **masih bisa mencatat transaksi selama 3 hari** sebelum jadi baca-saja, dengan spanduk oranye yang menyebut sisa harinya. Emailnya kini lengkap: peringatan 7 hari & 1 hari sebelum habis, pemberitahuan saat masa tenggang mulai ("Anda masih bisa mencatat"), pemberitahuan saat benar-benar baca-saja, lalu satu susulan. Spanduk tenggang sengaja oranye, bukan merah — merah berarti sudah terkunci, dan menyamakannya membuat orang mengira sudah terlambat padahal belum | ✅ **Selesai** |
| **Fase 20d — Rekap PPh per masa (unifikasi)** | Satu tab baru di halaman Pajak yang menampilkan **semua** PPh dalam satu masa sekaligus: PPh 21 dari penggajian, PPh 23 dari bukti potong, dan PPh Final 4(2) — lengkap dengan penanda mana yang **belum disetor**. Sebelumnya harus membuka tiga tab dan menjumlahkan sendiri saat mengisi SPT Masa. Tidak ada input ulang: seluruh angkanya dihitung dari data yang sudah tercatat | ✅ **Selesai** |
| **Fase 20e — Revaluasi aset tetap** | Aset bisa dinilai ulang ke **nilai wajar** hasil penilaian (appraisal), dan sistem membuat jurnalnya sendiri. Yang penting: **kenaikan nilai masuk ke Ekuitas (Surplus Revaluasi), bukan ke laba** — untung yang belum terealisasi tidak boleh menggelembungkan laba; sebaliknya penurunan nilai langsung diakui sebagai beban. Akumulasi penyusutan dinolkan dan penyusutan berikutnya dihitung dari nilai baru | ✅ **Selesai** |
| **Fase 20f — Eliminasi transaksi antar-perusahaan** | Untuk pemilik beberapa perusahaan: jual-beli **antar perusahaan sendiri** tidak lagi terhitung sebagai omzet grup di laporan gabungan. Caranya sederhana — tandai akunnya sekali di Bagan Akun (misalnya "Penjualan ke Afiliasi"), selebihnya otomatis. **Angkanya tetap ditampilkan** dengan label "Dieliminasi", bukan dihilangkan diam-diam, supaya laporan tetap bisa ditelusuri saat totalnya tidak cocok dengan pembukuan masing-masing perusahaan | ✅ **Selesai** |
| **Fase 20g — Ambil barang dari beberapa gudang sekaligus** | Satu baris faktur kini bisa mengambil stok dari **lebih dari satu gudang** — misalnya 10 dari Gudang Utama dan 2 dari Cabang, ketika satu gudang tidak cukup. Bagian yang paling penting tidak terlihat di layar: **harga pokoknya dihitung per gudang asal**, karena barang yang sama bisa berbeda harga belinya di tiap gudang. Kalau ini salah, totalnya tetap terlihat wajar dan hanya angka laba Anda yang keliru | ✅ **Selesai** |
| **Fase 20h — Peramalan kebutuhan stok** | Dari kecepatan jual 90 hari terakhir, aplikasi memperkirakan **kapan stok habis** dan **berapa yang perlu dibeli**, memperhitungkan berapa lama pemasok Anda mengirim. Hitungannya rata-rata bergerak biasa — **bukan AI** — supaya Anda bisa menelusuri sendiri angkanya dengan kalkulator. Ada kolom **Keyakinan**: produk yang jarang terjual ditandai "Rendah", karena rata-rata dari data tipis terlihat sama meyakinkannya dengan rata-rata dari data tebal, dan itulah cara ramalan menyesatkan orang | ✅ **Selesai** |
| **Fase 20i — Pindai barcode lewat kamera** | Kasir bisa memindai barcode produk dengan kamera HP; barangnya langsung masuk keranjang. Saat itu hanya memakai kemampuan bawaan peramban, sehingga **Safari di iPhone belum kebagian**. **Dituntaskan di Fase 21g** (lihat di bawah) — dan di sana ketahuan bahwa pemindainya sebenarnya belum pernah bisa jalan sama sekali | ✅ **Selesai (lewat 21g)** |
| **Fase 20j — Kolom buatan Anda sendiri** | Butuh mencatat "Nomor PO Pelanggan" di faktur, atau "Kode Wilayah" di kontak? Sekarang Anda bisa **menambah kolom sendiri** pada Kontak, Produk, dan Faktur — kolomnya ikut muncul di form, **ikut tercetak di faktur**, dan **ikut terekspor ke CSV**. Menghapus definisi kolom sebenarnya hanya **mengarsipkan**: nilai yang sudah Anda catat di ratusan dokumen tidak ikut hilang karena satu klik | ✅ **Selesai** |
| **Fase 20k — Naik/turun paket sendiri** | Anda bisa berpindah paket langsung dari Pengaturan tanpa menghubungi kami, dan **angkanya terlihat sebelum Anda memutuskan**. Naik paket berlaku seketika dan hanya ditagih **selisih harga untuk sisa hari** periode ini — bukan sebulan penuh. Turun paket berlaku di akhir periode yang sudah Anda bayar, tanpa tagihan dan tanpa pengembalian dana; sisa periode ini tetap hak Anda | ✅ **Selesai** |
| **Fase 20m — Halaman Pengaturan ikut berganti bahasa** | **Koreksi jujur: halaman Pengaturan ternyata tidak pernah ikut program dwibahasa Fase 19 sama sekali** — 219 potong tulisan masih berbahasa Indonesia saat aplikasi disetel ke Inggris. Sebabnya alat pemeriksa kami hanya melihat folder halaman utama dan tidak turun ke subfolder, jadi tak ada yang tahu. Alatnya diperbaiki **lebih dulu** (dan dibuktikan kini menangkap apa yang dulu lolos), baru isinya diterjemahkan | ✅ **Selesai** |
| **Fase 21a — Audit peta pengembangan** | Bukan fitur baru, melainkan **memperbaiki dokumen yang Anda pakai untuk memilih pekerjaan berikutnya**. Dari 74 baris tanpa penanda, **29 ternyata salah gambar**: 19 sudah jadi tapi tak tercentang (mis. pesanan penjualan, PO formal, timesheet, ekspor Excel), 9 ternyata cuma **sebagian**. Yang paling penting: **satu centang saya ternyata palsu** — "ringkasan bulanan dikirim email" saya centang di Fase 20l tanpa memeriksa isi fungsinya; ternyata rekapnya memang dibuat otomatis tiap awal bulan **tetapi tidak pernah dikirim ke Anda**. Mulai sekarang tiap centang wajib menyebut berkas atau nomor fasenya, supaya klaim saya bisa Anda periksa sendiri | ✅ **Selesai** |
| **Fase 21b — Rekap bulanan benar-benar dikirim + rasio keuangan lengkap** | Menepati janji yang dicentang keliru di Fase 20l: ringkasan bulanan kini **sungguh masuk ke email Anda** tiap awal bulan, bukan sekadar tersimpan diam-diam di aplikasi. Ditambah rasio lancar dan perputaran persediaan di laporan, supaya kondisi keuangan terbaca tanpa menghitung manual | ✅ **Selesai** |
| **Fase 21c — Satuan dus & pcs dipakai saat transaksi** | Beli 2 dus isi 20 kini otomatis menambah **40 pcs** ke stok, dengan harga modal per pcs dihitung sendiri. Sebelumnya satuan besar hanya tercatat di data produk tetapi tak terpakai saat bertransaksi. Bagian yang paling mudah salah dan karenanya dijaga ketat: kalau konversinya keliru, **semua total tetap terlihat wajar dan hanya angka laba Anda yang salah** | ✅ **Selesai** |
| **Fase 21d — Tutup buku tahunan otomatis** | Jurnal penutup akhir tahun bisa dijalankan sendiri oleh sistem tiap awal Januari — **tetapi harus Anda nyalakan dulu** di Pengaturan, dan bawaannya mati. Alasannya sederhana: memposting jurnal besar ke pembukuan orang lain tanpa diminta bukan sesuatu yang boleh menyala diam-diam. Sekalian dikoreksi satu klaim di peta pengembangan yang menyebut jurnal berulang belum terjadwal — padahal sudah berjalan sejak lama | ✅ **Selesai** |
| **Fase 21e — Form penangkap calon pelanggan** | Sekarang ada form yang bisa Anda tempel di halaman web atau bio Instagram; siapa pun yang mengisinya **langsung masuk ke Pipeline CRM** Anda, ditandai sebagai berasal dari form. Ditambah pembanding **"vs tahun lalu"** di kartu Penjualan & Laba di Dashboard. Dua cacat produk ikut ketahuan dan diperbaiki: batas anti-spam terlalu ketat (lima salah ketik email langsung mengunci pengunjung), dan pembanding tahun lalu tak pernah terlihat di perusahaan yang datanya masih baru | ✅ **Selesai** |
| **Fase 21f — Upah tukang & listrik pabrik masuk harga pokok** | Sebelumnya biaya produksi hanya menghitung **bahan**; upah dan overhead tidak pernah sampai ke nilai barang jadi, sehingga laba terlihat lebih besar dari sebenarnya setiap kali barang itu terjual. Sekarang keduanya diisi per batch produksi dan dibagi otomatis per unit. Yang dijaga ketat: biaya itu **tidak dihitung dua kali** — sisi lawannya membatalkan beban yang sudah tercatat di gaji dan biaya operasional | ✅ **Selesai** |
| **Fase 21g — Pemindai barcode untuk iPhone + tiga cacat yang ketahuan** | Pengguna Safari/iPhone akhirnya bisa memindai barcode. Tetapi yang lebih penting ditemukan saat mengerjakannya: **pemindai yang dibangun Fase 20i sebenarnya tidak pernah bisa jalan sama sekali** — bahkan di Android. Satu setelan keamanan menutup akses kamera untuk aplikasi kita sendiri, dan kasir hanya melihat pesan "izin kamera ditolak" yang menyalahkan pengguna atas kesalahan kami. Dua cacat lain menyusul (aturan keamanan menolak mesin pemindainya, dan berkasnya membengkak 40%). Ketiganya tidak terlihat karena komputer penguji kami memang tak punya kamera; sekarang ia **diberi kamera palsu berisi barcode sungguhan**, sehingga pindai-sampai-masuk-keranjang diuji ulang setiap kali ada perubahan | ✅ **Selesai — seluruh Fase 21 tuntas** |
| **Fase 22a — Menilai ulang saldo mata uang asing tiap akhir bulan** | Kalau Anda punya piutang atau hutang dalam dolar, nilainya dalam rupiah berubah setiap hari mengikuti kurs. Sekarang sistem bisa menilai ulang seluruh saldo valas per tanggal tutup buku dan mencatat selisihnya sebagai laba/rugi kurs — lalu **membalik jurnalnya keesokan hari secara otomatis**, supaya selisih yang sama tidak terhitung dua kali saat tagihannya benar-benar dibayar | ✅ **Selesai** |
| **Fase 22b — Kurs diperbarui sendiri tiap hari** | Sebelumnya kurs hanya berubah kalau ada yang ingat mengetiknya. Sekarang sistem bisa menariknya otomatis tiap hari dari sumber luar. Tiga aturan menjaganya: kalau sumbernya mati, **kurs kemarin tetap dipakai** (kurs usang masih bisa dipertanggungjawabkan, kurs sampah tidak); hanya mata uang yang sudah Anda daftarkan yang ikut diperbarui; dan ada kolom "Terakhir diperbarui" supaya angka tidak pernah berubah diam-diam. **Catatan jujur:** kurs pajak Kemenkeu belum dipakai — bentuknya berbeda dan butuh penerjemah tersendiri | 🟡 **Sebagian** |
| **Fase 22c — Kas kecil dengan pengisian ulang berjurnal** | Kotak uang tunai untuk belanja kecil. Setiap bon dicatat seperti pengeluaran biasa; saat kotaknya menipis **sistem menghitung sendiri berapa yang perlu diisikan** supaya kembali ke jumlah yang Anda tetapkan — angkanya tidak diketik, jadi tidak bisa salah ketik. Ada juga fitur menghitung isi kotak (opname): selisihnya terhadap catatan dijurnal otomatis, kurang maupun lebih | ✅ **Selesai** |
| **Fase 22d — Penyusutan saldo menurun + penyusutan pajak** | Aset kini bisa disusutkan dengan metode saldo menurun, bukan cuma garis lurus. Ditambah **penyusutan fiskal berdampingan**: mesin yang di pembukuan Anda disusutkan 5 tahun bisa saja menurut pajak 4 tahun, dan selisihnya adalah koreksi fiskal yang Anda butuhkan saat mengisi SPT. Angka pajaknya **tidak pernah masuk pembukuan** — kalau masuk, asetnya tersusut dua kali | ✅ **Selesai** |
| **Fase 22e — Kalender jatuh tempo pajak** | Tenggat lapor & setor PPN, PPh 21, PPh 23, PPh 25, PPh Final, dan SPT Tahunan, muncul di halaman Pajak **dan di lonceng notifikasi**. Hanya kewajiban yang benar-benar berlaku bagi perusahaan Anda yang ditampilkan. **Catatan jujur:** hari libur nasional belum diperhitungkan — daftarnya terbit tiap tahun dan berubah — jadi tenggat sebenarnya bisa lebih lambat dari yang tertera, **tidak pernah lebih awal** | ✅ **Selesai** |
| **Fase 22f — Proyeksi arus kas 30/60/90 hari + satu cacat lama yang ketahuan** | Perkiraan saldo kas Anda ke depan, dari tagihan yang akan masuk dan hutang yang akan jatuh tempo. Mengerjakannya membuat kartu proyeksi berdampingan dengan laporan arus kas lama — dan ketahuan **keduanya menyebut saldo kas yang berbeda**: laporan arus kas ternyata **tidak pernah menghitung isi kas kecil** sejak fitur itu dibuat. Sekarang keduanya memakai satu definisi yang sama, dan ada pemeriksaan otomatis yang menuntut kedua angka itu selalu cocok | ✅ **Selesai — seluruh Fase 22 tuntas** |
| **Fase 22g — Halaman ini sendiri dirapikan** | Tanpa kode aplikasi. Tabel fase di atas selalu terpelihara, tetapi **bagian di bawahnya tidak pernah ikut diperbarui sejak ±19 fase lalu** — sehingga halaman ini masih menyuruh Anda mendaftar Midtrans (padahal Fase 11b menuntaskannya), masih menulis "POS, HR & Payroll: Belum", dan masih menyebut jumlah uji 863 padahal sebenarnya 1.823. Tujuh titik basi diperbaiki setelah seluruh berkas disapu — bukan hanya yang teringat. **Tidak ada gerbang otomatis yang bisa menangkap dokumen basi**, dan itu dinyatakan terbuka di lognya | ✅ **Selesai** |
| **Fase 23a — Harga grosir & ecer** | Buat grup pelanggan (mis. Grosir, Ecer, Distributor) di menu baru **Master Data › Grup Harga**, lalu isi harga khusus per produk. Tandai pelanggan dengan grupnya sekali, dan **harga di faktur penjualan terisi sendiri** — lengkap dengan lencana yang menyebut grupnya, supaya tak ada angka yang berubah tanpa penjelasan. Harga tetap bisa Anda ubah bila harganya nego, dan **harga nego yang sudah diketik tidak akan tertimpa** meski pelanggannya diganti. Harga Rp 0 sah — itu barang bonus, bukan "belum diatur". *Kasir, pesanan penjualan, penawaran, dan kontrak menyusul di 23b* | ✅ **Selesai** |
| **Fase 23b — Harga grosir dipakai di kasir & seluruh alur jual** | Lanjutan 23a. Kasir kini punya **pemilih grup harga** di atas daftar produk — pilih "Grosir", seluruh harga di kartu produk dan keranjang langsung mengikuti. Bawaannya selalu **tanpa grup** dan **kembali sendiri tiap transaksi selesai**, supaya kasir yang lupa menurunkannya tidak menjual sehari penuh di bawah harga. Pesanan Penjualan, Penawaran, dan Kontrak juga ikut. Yang sengaja **tidak** berubah: transaksi yang ditahan lalu dipanggil lagi, faktur berulang kontrak, dan penawaran yang dikonversi jadi faktur — ketiganya memakai harga yang sudah disepakati, bukan harga daftar hari itu | ✅ **Selesai** |
| **Fase 23c — Pengerasan menjelang peluncuran** | Bukan fitur. Aplikasi bawaan punya **batas keras 6 perusahaan**; pendaftar ke-7 dulu mendapat error 500 yang membuat aplikasinya terlihat rusak padahal hanya penuh. Kini ditolak dengan pesan jelas yang bisa ditindaklanjuti. **Batasnya sendiri tidak hilang** — menghilangkannya adalah satu setelan di dashboard Cloudflare, bukan kode (lihat runbook go-live) | ✅ **Selesai** |
| **Fase 24a — Masa coba 30 hari dihapus** | Keputusan Anda menjelang peluncuran. Pendaftaran **tetap terbuka**, tetapi akun baru tidak bisa mencatat transaksi sampai berlangganan — dan yang lebih penting: **database perusahaan baru dibuat saat pembayaran masuk, bukan saat mendaftar**. Tanpa perubahan itu, menghapus trial tidak menghemat apa pun: setiap pendaftar yang batal bayar tetap memakan satu dari enam slot selamanya. Calon pelanggan menilai produk lewat demo publik | ✅ **Selesai** |
| **Fase 24b — Demo publik jadi 6 bulan** | Karena demo kini satu-satunya cara calon pelanggan menilai produk, riwayatnya diperpanjang: penjualan, pembelian, pembayaran, dan piutang yang menua kini terisi **enam bulan** sehingga grafik tren, perbandingan periode, dan umur piutang tidak lagi kosong. Ditemukan pula bahwa Fase 24a **mematahkan penyemai demonya sendiri** — sudah diperbaiki. *Catatan jujur: riwayat slip gaji & jadwal penyusutan masih ±2 periode* | ✅ **Selesai** |
| **Fase 24c — Halaman jualan menyebut seluruh modul** | Halaman `/fitur` dulu memuat **9 modul** dari ±21 yang layak dijual — 12 modul (Dasbor, Pengadaan, Kas & Bank, Aset Tetap, CRM, Anggaran, Proyek, Manufaktur, Helpdesk, Asisten AI, dan lainnya) tidak pernah disebut sama sekali. Sejak trial dihapus, yang tidak tertulis praktis tidak ada bagi calon pelanggan. Kini **22 modul**, dwibahasa, versi untuk mesin pencari ikut diperluas | ✅ **Selesai** |
| **Fase 24d — Janji "gratis 30 hari" yang masih tertinggal** | Trial sudah dihapus, tetapi janjinya masih **tayang di produksi**: footer & menu halaman blog (yang ikut terindeks Google) berbunyi "Coba gratis 30 hari", dan tombol pertama di bilah atas halaman depan, `/fitur`, serta `/panduan` masih berbunyi "Coba Gratis". Orang mengeklik janji gratis lalu menabrak paywall yang tak pernah disebut. Semuanya dibersihkan dan **dikunci pemeriksaan otomatis** agar tidak kembali. Sekalian: halaman Admin berhenti menampilkan kolom trial yang selamanya kosong, dan status "belum berlangganan" — keadaan setiap pendaftar baru sekarang — akhirnya punya nama, bukan kode mentah | ✅ **Selesai** |
| **Fase 25a — Pembayaran pindah ke Xendit** | Gerbang pembayaran langganan diganti dari Midtrans ke **Xendit** sesuai keputusan Anda; Midtrans dihapus seluruhnya, bukan disimpan sebagai cadangan. Yang Anda pasang sekarang dua kunci Xendit (Secret Key + token webhook), bukan lagi kunci Midtrans — langkahnya di runbook go-live. Satu bahaya baru ikut ditambal: Xendit memakai alamat server yang **sama** untuk mode uji dan mode sungguhan, sehingga produksi yang tak sengaja memakai kunci uji akan menerima "pembayaran" yang tidak pernah menjadi uang tanpa satu pun tanda. Kini Pengaturan → Langganan menampilkan lencana **"mode uji pembayaran"** selama kunci uji terpasang. Belum ada satu pun pembayaran sungguhan di produksi saat penukaran ini dilakukan, jadi tidak ada data yang perlu dipindahkan | ✅ **Selesai** |
| **Fase 25b — Demo baru + seluruh tangkapan layar diganti** | **35 gambar produk** di halaman depan, halaman Fitur, dan panduan di dalam aplikasi diambil ulang dari demo berisi enam bulan data. Dua modul yang selama ini tampil **tanpa gambar** akhirnya punya miliknya sendiri: **Kas & Bank** dan **Asisten AI**. **Demo publik juga benar-benar diganti**: yang lama dihapus sampai bersih, yang baru disemai ulang — kini **20 faktur di bulan berjalan (Rp 89,4 juta)**, neraca seimbang persis, seluruh modul terisi (lead, karyawan & slip gaji, proyek, tiket, aset, produksi), dan **CV Demo Cabang kembali ada** sehingga laporan konsolidasi tidak lagi kosong. Sisa kapasitas: 3 dari 6 slot. *Catatan jujur: contoh Grup Harga belum ikut tersemai di demo, dan saat penyemaian ini paket demo masih perlu dinaikkan manual ke Enterprise karena email Anda belum terdaftar di `COMPED_EMAILS` — **sudah Anda perbaiki, terverifikasi di Fase 25c*** | ✅ **Selesai** |
| **Fase 25c — "Akun rumah" jadi bisa diperiksa** | Anda memasang `COMPED_EMAILS` (daftar email yang kebal paywall) lalu minta dicek — dan ternyata **tidak ada satu pun cara memeriksanya** selain membuat perusahaan lalu melihat paketnya, yaitu memakan satu dari enam slot untuk sekadar bertanya. Itu juga sebab masalah paket demo kemarin baru ketahuan setelah penyemaian mati di menit ke-9. Kini status itu ikut dikembalikan saat aplikasi menanyakan siapa Anda, dan alat pemeriksa demo mencetaknya terang-terangan — **tanpa membuat perusahaan dan tanpa memakai slot**. Sekalian, aturan pembacaan daftarnya (koma, spasi, huruf besar-kecil) akhirnya dikunci uji; sejak dibuat, aturan itu **tidak pernah diuji sama sekali**, padahal satu koma nyasar cukup membuat semua orang dianggap kebal paywall | ✅ **Selesai** |
| **Fase 25d — Tutorial peluncuran & peta repo** | Tiga dokumen baru: **tutorial 12 langkah** yang menjawab "besok pagi saya mulai dari mana" (pasang kunci → uji bayar mode uji → pelanggan pertama → rutinitas mingguan), **peta repo dalam bahasa biasa** lengkap dengan tabel *"mau ubah harga/tulisan/gambar/isi demo → berkasnya ini"*, dan satu referensi teknis untuk siapa pun yang menyentuh kode nanti. Menulisnya memunculkan dua hal yang belum terlihat: **blog produksi masih 0 artikel** padahal halamannya diindeks Google, dan **belum ada satu pun email yang terbukti sampai ke inbox** — keduanya kini jadi langkah bernomor, bukan catatan kaki. Sekalian, README diperbaiki: ia masih menjanjikan **"Trial gratis 30 hari"** yang sudah dihapus sejak Fase 24a | ✅ **Selesai** |
| **Fase 26a–26d — Audit keamanan ditutup** | Anda mengirim laporan audit berisi 9 temuan; seluruhnya **diperiksa ke kode nyata** lebih dulu, bukan diterima apa adanya. Hasilnya: **8 terbukti** (satu di antaranya berat), **1 keliru sebagian**, dan **2 temuan baru** muncul justru saat memverifikasi. Yang terberat: seorang staf dengan peran kustom "hanya penjualan & kasir" ternyata masih bisa membuka akuntansi, penggajian, dan pengadaan **lewat API** — yang membatasinya selama ini hanya menu di layar, dan menu bukan pengaman. Ikut ditutup: tautan reset sandi yang bisa dipakai lebih dari sekali bila dikirim bersamaan (terbukti **5 kali** saat diuji), pembayaran yang bisa terhitung dua kali sehingga pelanggan mendapat sebulan gratis diam-diam, pembayaran kurang yang tetap mengaktifkan langganan, tautan "Sambungkan Google Drive" yang berlaku selamanya, login Google yang menerima email belum terverifikasi, dan dua modul berbayar (peran kustom + laporan konsolidasi) yang ternyata terbuka untuk semua paket. Pemeriksaan otomatis naik dari 482 ke **549 uji** dan 1.088 ke **1.112 skenario**; tiap perbaikan dibuktikan bisa gagal dengan sengaja merusaknya lebih dulu — **18 kali** | ✅ **Selesai** |
| **Fase 33 — Naskah aplikasi dirapikan menyeluruh** | Anda mengirim panduan gaya naskah dan meminta seluruhnya diterapkan. Sebelas sub-fase. Yang paling penting bukan naskahnya: menelusuri istilah "hutang" satu per satu memaksa membaca konstanta kode akun, dan **satu di antaranya salah** — revaluasi kurs sisi utang memposting selisihnya ke **PPN Keluaran**, akun pajak, sejak Februari lalu. Angkanya tetap seimbang sehingga tidak ada pemeriksa yang memerah, dan tidak ada satu pun uji yang pernah menjalankan cabang itu. Sudah diperbaiki beserta enam pemeriksa baru. Selebihnya: nama akun "Hutang" → **"Utang"** untuk perusahaan lama dan baru sekaligus (label saja — saldo, jurnal, dan laporan tidak berubah), 49 layar kosong kini memberi tahu langkah berikutnya, aturan "akun harus kas/bank" yang tadinya berbunyi sembilan cara berbeda kini satu, 114 pesan "tidak ditemukan" diberi langkah lanjut, 96 pesan pop-up yang tadinya selalu Bahasa Indonesia kini ikut bahasa yang dipilih, kop dokumen cetak & empat email transaksional memakai penulisan merek yang benar, dan subjek email kini menyebut ERPindo agar dikenali di kotak masuk. **Dua pemeriksa baru** dipasang agar hasilnya tidak terkikis lagi | ✅ **Selesai** |
| **Fase 27a — Audit halaman depan** | Anda minta halaman depan ditinjau: teks, tata letak, ikon. Dugaan Anda benar hampir di semua titik — tetapi temuan terbesarnya justru bukan salah satunya: **halaman depan masih menjanjikan "Gratis 30 hari" di tiga tempat**, yaitu teks yang **Google tampilkan di hasil pencarian** dan yang muncul sebagai **pratinjau saat tautan ERPindo dibagikan di WhatsApp**. Masa coba dihapus Februari lalu dan janjinya sudah dibersihkan dari halaman, tetapi pemeriksa otomatisnya tidak pernah melihat lapisan itu. Ikut diperbaiki: tombol utama di layar pertama (dulu dua tombol putih kembar, tidak ada yang menonjol), pita penutup yang menjanjikan demo tetapi tombolnya ke pendaftaran, tombol mengambang di HP yang sama sekali tidak punya jalan ke demo, lima kartu keamanan yang **ikonnya sama persis**, badge integrasi & bilah bukti yang tanpa ikon, penulisan nama merek yang campur "ERPindo"/"erpindo" dalam satu halaman, kalkulator yang menampilkan "Hemat Rp 0" saat digeser ke bawah, dan klaim jumlah uji yang tertinggal (1.300+ → **2.000+**). Sekarang paket yang Anda pilih di halaman harga **ikut terbawa** ke halaman pendaftaran | ✅ **Selesai** |
| **Fase 27b — Formulir "Jadwalkan demo" dihapus** | Anda menunjuk hal yang benar: *"ngapain jadwalkan demo, kan tinggal klik udah kelihatan demonya"*. Halaman depan memang menawarkan dua hal berbeda dengan nama yang sama — tombol **"Lihat Demo"** (sekali klik, langsung masuk perusahaan contoh berisi 6 bulan data) dan formulir **"Jadwalkan demo"** (isi 6 kolom, lalu tunggu ditelepon). Saat diperiksa, ternyata masalahnya lebih dalam: **formulir itu jalan buntu**. Pengisinya dijanjikan "tim kami akan menghubungi Anda secepatnya", padahal **tidak satu pun jalur pemberitahuan benar-benar sampai** — emailnya dikirim ke `PLATFORM_ADMIN_EMAILS` yang belum Anda pasang (penerimanya kosong), pengirim emailnya sendiri belum aktif, dan layar Admin untuk membacanya **tidak pernah dibuat** meski endpoint-nya ada. Jadi data masuk ke tabel yang tidak pernah dibaca siapa pun. Produksi mencatat **0 permintaan**, jadi belum ada calon pelanggan yang menunggu telepon yang tidak akan datang. Formulirnya dihapus sampai ke sisi server, dan kartu "Layanan pendampingan" di halaman harga ikut dihapus karena isinya mengajak menghubungi lewat formulir yang sudah tidak ada. **Yang perlu Anda tahu: halaman depan kini tidak punya satu pun cara menghubungi manusia** — seluruh jalurnya swalayan (lihat demo → daftar → bayar). Wajar pra-peluncuran, tetapi dicatat sebagai utang terbuka: bila kelak ada calon pelanggan grup/holding yang ingin bicara dulu, kanal kontaknya (email/WhatsApp) perlu Anda tentukan lebih dulu | ✅ **Selesai** |
| **Fase 28 — Demo publik dijadikan perusahaan yang masuk akal** | Anda minta dua kekurangan demo dilunasi (contoh Grup Harga belum ada; riwayat gaji & penyusutan baru 2 periode). Memeriksanya lebih dulu ke database sungguhan memunculkan hal yang jauh lebih serius: **demo Anda menampilkan RUGI Rp 20,7 juta di "bulan lalu"** — dan "bulan lalu" itu pilihan paling wajar bagi siapa pun yang membuka Laba Rugi. Sebabnya berantai: penjualan enam bulan ke belakang ditempatkan dengan hitungan "30 hari", padahal bulan kalender bukan 30 hari, sehingga satu bulan penuh nyaris tidak kebagian penjualan — sementara bulan itulah satu-satunya yang menanggung gaji. Ikut ketahuan: **lima bulan tercatat tanpa gaji sama sekali** (perusahaan berkaryawan empat orang yang tidak menggaji siapa pun), **hutang ke pemasok menumpuk Rp 231,8 juta** karena tidak satu pun pembelian lama pernah dibayar, dan **penyusutan cuma dijalankan sekali** sehingga bulan berjalan tidak punya beban penyusutan. Semuanya diperbaiki: kini **tujuh bulan berturut-turut untung** (Rp 2,8 jt → Rp 8,8 jt, menanjak), gaji & penyusutan lengkap tiap bulan, hutang pemasok tinggal yang memang belum jatuh tempo, dan **Grup Harga sudah berisi** (Grosir & Reseller, dengan dua pelanggan terkait). **Ke-35 gambar produk di halaman depan dan panduan diambil ulang** dari demo baru, jadi angka yang calon pelanggan lihat di gambar sama persis dengan yang ia temukan saat mengeklik "Lihat Demo". *Catatan jujur: tiga kali percobaan saya sendiri menghasilkan neraca yang tidak masuk akal (kas Rp 284 juta di laci sementara rekening bank kosong; perusahaan yang tidak pernah menagih piutang) — semuanya ketahuan karena hasilnya diperiksa angka per angka, bukan dianggap beres begitu skripnya selesai.* **Demo produksi sudah disemai ulang** dan hasilnya diperiksa langsung ke database: tujuh bulan untung berturut-turut, neraca seimbang persis, Grup Harga terisi, dan perusahaan Anda sendiri (softtin) tidak tersentuh sama sekali. **Yang masih perlu Anda lakukan: klik tombol "Lihat Demo" sekali** — lingkungan kerja saya diblokir dari alamat produksi, jadi seluruh pemeriksaan saya lewat database, bukan lewat aplikasinya | ✅ **Selesai** |
| **Tabel modul lain menyusul** | Pola kartu-di-HP sudah dipasang di 10 modul. Tersisa **10 tabel di 9 berkas**, hampir semuanya satu tabel per berkas. Tujuh tabel lain sengaja dikecualikan permanen karena bagian dari dokumen cetak (faktur, slip gaji, struk kasir) yang harus tetap putih | ✅ **Selesai** — sisa 10 tabel itu dituntaskan Fase 18i–18t; tujuh pengecualian dokumen cetak tetap berlaku |
| **Fase 18e — Halaman jualan: tampilan lapang + tulisan diperbarui** | Halaman depan ditulis ulang dalam gaya bersih & lapang, dan **kalimat-kalimatnya diperbarui** supaya bicara soal masalah yang Anda rasakan (jam yang hilang tiap bulan, selisih yang baru ketahuan saat tutup buku), bukan sekadar daftar fitur. **Klaim "800+ uji otomatis" dikoreksi** — jumlah sebenarnya kini 1.334, jadi ditulis "1.300+" (dibulatkan ke bawah supaya tetap benar meski jumlahnya bergerak) | ✅ **Selesai** |
| **Fase 18f — Halaman "Fitur" baru dengan penjelasan mendalam** | Halaman `/fitur` tersendiri berisi penjelasan **sembilan modul**, masing-masing ditulis dengan urutan: masalah apa yang Anda rasakan → bagaimana ERPindo mengerjakannya → hasil apa yang didapat. Bukan daftar kemampuan. Dibuat sebagai halaman terpisah supaya halaman depan tetap ringkas, sekaligus punya alamat sendiri di mesin pencari (lengkap dengan sitemap dan versi teks untuk perayap) | ✅ **Selesai** |
| **Fase 18g — Halaman masuk ikut terang** | Panel kiri halaman masuk masih hitam pekat, sisa arah desain lama — di sebelah form putih terbaca seperti dua halaman berbeda yang ditempel. Diganti bidang bernuansa merek yang lembut sehingga menyatu dengan sisanya. Halaman ini adalah pintu masuk seluruh ujian otomatis, dan kontraknya sudah dikunci uji sejak sebelumnya | ✅ **Selesai** |
| **Fase 18h — Gambar produk diperbarui ke tampilan final** | Ke-33 gambar produk di halaman depan dan panduan diregenerasi sekali lagi, kini mencerminkan tampilan akhir yang sudah lapang (tombol dan kartu lebih lega, sudut membulat, bayangan halus). Sebelumnya gambar sudah terang tapi masih memotret tampilan yang rapat | ✅ **Selesai** |
| **Cakupan sebenarnya program dwibahasa** | Setelah alat pemeriksa dipercaya, seluruh 36 halaman aplikasi disapu. Hasilnya: **10 halaman sudah masuk program** (dan kini bersih), **26 halaman belum pernah disentuh sama sekali** — antara lain Dasbor, Kas & Bank, Pajak, Pengadaan, dan Manufaktur. Ini bukan utang dari klaim keliru, melainkan pekerjaan yang memang belum dimulai; dicatat di sini supaya cakupannya jelas, tidak terkesan lebih jauh dari kenyataan | ✅ **Selesai** — ke-26 halaman itu dituntaskan sepanjang Fase 19 (ditutup 19u dengan sisa **0**), dan `pages/settings/` yang lolos dari alat penyapu ditutup Fase 20m |
| Fase 8b lapis 2 + 10d — Aktivasi Google (Drive & login) | Buat OAuth Client di console.cloud.google.com dengan DUA redirect URI: `https://<domain>/api/drive/callback` dan `https://<domain>/api/auth/google/callback` → simpan secret `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` di dashboard Workers — backup Drive & tombol masuk via Google aktif bersamaan | ⏸ **Menunggu kredensial dari Anda** |
| Fase 10e — Aktivasi Admin Platform | Tambah variabel `PLATFORM_ADMIN_EMAILS` (isi dengan email Anda, pisah koma bila lebih dari satu) di dashboard Workers → menu **Admin** muncul di aplikasi untuk email tersebut | ⏸ **Menunggu Anda memasang PLATFORM_ADMIN_EMAILS** |
| Fase 2m — Manajemen dokumen (lampiran file) | Lampiran di faktur/kontak/jurnal (penyimpanan Cloudflare R2) | ⏸ **Menunggu Anda mengaktifkan R2 di dashboard Cloudflare** |

## Apa yang sudah bisa dilakukan aplikasi hari ini?

1. **Mendaftar sebagai perusahaan baru** — sistem otomatis membuatkan "database pribadi" untuk perusahaan tersebut (inilah pondasi multi-tenant: data tiap perusahaan benar-benar terpisah).
2. **Login/logout dengan aman** — password tersimpan terenkripsi, sesi aman, ada verifikasi email dan lupa-password.
3. **Mengundang anggota tim dengan peran berbeda** — Owner/Admin bisa mengubah data, Viewer hanya bisa melihat. Sistem menolak orang luar yang mencoba mengakses data perusahaan lain.
4. **Mengatur profil perusahaan** (nama, alamat, NPWP) — tersimpan di database milik perusahaan itu sendiri.
5. **Tampil rapi di HP, tablet, dan komputer**, dengan mode terang/gelap.
6. **Pembukuan double-entry sungguhan** *(baru — Fase 1a)*: bagan akun standar Indonesia langsung tersedia (18 akun, bisa ditambah), mencatat jurnal umum (sistem menolak jurnal yang tidak seimbang), melihat buku besar per akun dan neraca saldo yang selalu seimbang. Jurnal yang sudah diposting tidak bisa diubah-ubah — sesuai prinsip audit.
7. **Master data** *(Fase 1a)*: daftar produk (dengan harga jual/beli), kontak pelanggan & pemasok, dan gudang.
8. **Jual-beli lengkap** *(baru — Fase 1b)*: membuat faktur penjualan dan pembelian dengan PPN — sistem **otomatis** membuat catatan akuntansinya dan menambah/mengurangi stok (dengan perhitungan harga pokok rata-rata). Menjual barang yang stoknya kurang otomatis ditolak.
9. **Pencatatan pembayaran** *(baru — Fase 1b)*: menerima pembayaran pelanggan atau membayar pemasok; status faktur otomatis menjadi "lunas"; membayar melebihi tagihan ditolak.
10. **Pantauan stok** *(Fase 1b)*: level stok per gudang beserta nilai persediaan.
11. **Laporan keuangan** *(baru — Fase 1c)*: **Laba Rugi** per periode dan **Neraca** per tanggal yang selalu seimbang (laba berjalan otomatis diperhitungkan) — dihitung langsung dari jurnal, jadi pasti konsisten dengan buku besar.
12. **Dashboard angka nyata** *(Fase 1c)*: kas & bank, penjualan bulan berjalan, piutang/hutang belum lunas, dan nilai persediaan terpampang begitu Anda masuk.
13. **Kartu stok** *(baru — Fase 1d)*: riwayat keluar-masuk setiap barang dengan saldo berjalan.
14. **Umur piutang/hutang** *(baru — Fase 1d)*: siapa berutang berapa dan sudah berapa lama (belum jatuh tempo / 1–30 / 31–60 / 61–90 / >90 hari).
15. **Ekspor CSV** *(baru — Fase 1d)*: Laba Rugi, Neraca, dan aging dapat diunduh dan dibuka di Excel.
16. **Tutup buku** *(Fase 1d)*: Owner dapat mengunci periode — transaksi bertanggal pada periode terkunci ditolak sistem dari jalur mana pun.
17. **Di-install seperti aplikasi native** *(baru — Fase 2a)*: buka aplikasi di HP/komputer → menu "Install"/"Add to Home Screen"; aplikasi tetap terbuka saat offline dan meng-update dirinya otomatis.
18. **Cetak / simpan PDF faktur** *(Fase 2a)*: setiap faktur penjualan punya tampilan cetak profesional dengan kop perusahaan Anda.
19. **Laporan arus kas** *(baru — Fase 2b-1)*: kas masuk/keluar per periode dengan saldo awal & akhir.
20. **Siklus langganan otomatis** *(Fase 2b-1)*: paket dengan batas pengguna yang ditegakkan sistem; trial 30 hari dengan banner pengingat; saat trial habis akun otomatis menjadi baca-saja (data aman, tidak hilang) sampai langganan diaktifkan.
21. **Verifikasi dua langkah (2FA)** *(baru — Fase 2c)*: aktifkan di Pengaturan → Keamanan; login lalu membutuhkan kode 6 digit dari aplikasi authenticator di HP Anda — standar keamanan yang sama dengan internet banking.
22. **Halaman depan siap jualan** *(Fase 2c)*: hero, fitur unggulan, dan daftar harga paket.
23. **Impor dari Excel/CSV** *(Fase 2d)*: pindahkan daftar produk & kontak lama sekaligus — unduh template, isi, unggah; baris bermasalah dilaporkan satu per satu tanpa menggagalkan sisanya.
24. **Stok opname** *(baru — Fase 2e)*: hitung fisik gudang, masukkan angkanya — sistem menyamakan stok dan otomatis membukukan nilai selisihnya (barang hilang/rusak menjadi beban).
25. **Riwayat aktivitas** *(Fase 2e)*: Owner bisa melihat 100 aktivitas terakhir — siapa melakukan apa dan kapan.
26. **Retur penjualan & pembelian** *(Fase 2f)*: barang dikembalikan? Klik Retur pada fakturnya — pembukuan terbalik otomatis (termasuk PPN proporsional), stok kembali bergerak, dan sisa tagihan langsung menyesuaikan.
27. **Transfer antar gudang** *(baru — Fase 2g)*: pindahkan stok antar gudang — nilai persediaan ikut berpindah dengan benar.
28. **Multi-perusahaan** *(baru — Fase 2g)*: satu akun bisa mengelola beberapa perusahaan dan berpindah lewat dropdown.
29. **Profil & ganti password** *(baru — Fase 2g)*: ganti password mencabut sesi di perangkat lain secara otomatis.
30. **Pengingat email otomatis** *(Fase 2g)*: Owner diberi tahu saat trial hampir habis dan saat berakhir.
31. **Kasir (POS)** *(Fase 2h)*: layar kasir cepat untuk toko/kafe — klik produk, terima tunai, kembalian dihitung, struk tercetak; buka/tutup shift dengan hitung kas fisik dan selisihnya otomatis masuk pembukuan.
32. **Persetujuan pembelian** *(Fase 2i)*: tetapkan ambang (mis. Rp 5 juta) — pembelian Admin di atas itu menunggu persetujuan Anda dan baru diproses (stok & pembukuan) setelah disetujui; bisa ditolak dengan catatan.
33. **Lot & tanggal kedaluwarsa (FEFO)** *(Fase 2j)*: centang "lacak kedaluwarsa" pada produk (cocok untuk F&B/farmasi) — pembelian wajib mengisi tanggal exp per baris, penjualan otomatis mengambil lot yang paling dekat kedaluwarsa lebih dulu, dan halaman Stok menandai lot yang lewat (merah) atau ≤ 30 hari lagi (kuning).
34. **Tampilan baru ala SaaS modern** *(Fase 2k)*: sidebar gelap dengan ikon per menu, avatar pengguna, kartu statistik dashboard berikon warna, badge status konsisten (hijau lunas / kuning menunggu / merah lewat), skeleton saat memuat, dan landing page dengan ikon fitur + paket "Terpopuler" yang menonjol.
35. **CRM Pipeline** *(Fase 2l)*: catat calon pelanggan (lead) beserta perkiraan nilainya, gerakkan lewat tahap funnel (baru → dihubungi → terkualifikasi → penawaran → menang/kalah), catat setiap aktivitas follow-up (telepon/WA/email/pertemuan), lalu **konversi lead menjadi pelanggan** sekali klik. Buat **penawaran harga (quotation)** — belum menyentuh stok/pembukuan — dan saat pelanggan setuju, **konversi menjadi faktur penjualan** sekali klik (stok & jurnal otomatis, lewat mesin faktur yang sama). Dashboard menampilkan jumlah lead terbuka.
36. **Anggaran** *(Fase 2n)*: tetapkan target pendapatan & beban per akun untuk tiap bulan, lalu bandingkan dengan **realisasi yang dihitung otomatis dari jurnal**. Selisih ditandai warna (hijau bila menguntungkan — pendapatan di atas target atau beban di bawah target; merah bila sebaliknya), lengkap dengan ringkasan laba/rugi anggaran vs realisasi dan ekspor CSV.
37. **HR & Penggajian** *(Fase 2o)*: catat karyawan (jabatan, status PTKP, gaji pokok + tunjangan), lalu **jalankan penggajian bulanan sekali klik** — sistem menghitung **PPh 21 metode TER** dan **potongan BPJS** (Kesehatan, JHT, JP dengan batas upah) tiap karyawan, menyusun slip gaji, dan otomatis membukukan jurnal beban gaji (netto ke kas, potongan pajak & iuran jadi hutang untuk disetor). *Catatan: tarif pajak/BPJS mengikuti ketentuan 2024 dan diberi tanda agar diverifikasi sebelum penggajian resmi.*
38. **Aset Tetap** *(Fase 2p)*: daftarkan aset (kendaraan, mesin, peralatan) beserta nilai perolehan, masa manfaat, dan nilai residu — sistem membuat jurnal perolehan dan **menyusutkan garis lurus otomatis tiap awal bulan** (beban penyusutan dibukukan sendiri). Saat aset dijual/dibuang, **pelepasan sekali klik** menghapusnya dari buku dan mencatat laba/rugi pelepasan. Halaman menampilkan nilai buku berjalan & persentase tersusut.
39. **Proyek** *(Fase 2q)*: buat proyek (mis. per klien/pekerjaan) dan **tandai faktur, pembelian, atau jurnal ke proyek** — sistem menghitung **profitabilitas per proyek** (pendapatan − biaya = laba, lengkap dengan margin) langsung dari jurnal, jadi konsisten dengan pembukuan. Kelola juga daftar tugas per proyek. Menutup rangkaian modul back-office (Gelombang B).
40. **Multi mata uang** *(Fase 2r)*: tetapkan kurs mata uang asing, lalu **buat faktur dalam USD, SGD, dsb.** — sistem otomatis mengonversi ke Rupiah untuk pembukuan (semua laporan tetap dalam IDR). Saat pelanggan/pemasok melunasi pada kurs yang berbeda, **laba/rugi selisih kurs dijurnal otomatis**. Cocok untuk usaha ekspor/impor.
41. **Kontrak & tagihan berulang** *(Fase 2s)*: buat **kontrak langganan** (bulanan/triwulan/tahunan) — sistem **menerbitkan faktur otomatis** tiap periode jatuh tempo (bisa juga dipicu manual). Dilengkapi **produk jasa** (tanpa stok) agar cocok untuk layanan, sewa, maintenance, dan retainer. Ideal untuk pendapatan berulang.
42. **Konsolidasi multi-perusahaan** *(Fase 2t)*: kelola **beberapa badan usaha dari satu akun** (buat perusahaan baru langsung dari Pengaturan), lalu lihat **Laba Rugi & Neraca gabungan** seluruh perusahaan Anda dalam satu tabel — nilai tiap akun dijumlahkan lintas perusahaan dengan rincian per perusahaan di setiap kolom. Bisa memfilter perusahaan yang disertakan & ekspor CSV. Data tiap perusahaan tetap terpisah dan aman.
43. **Manufaktur & QC** *(Fase 2u)*: buat **resep produk (BoM)** — komponen & jumlah untuk menghasilkan produk jadi — lalu jalankan **perintah produksi**: bahan otomatis keluar dari stok dan produk jadi masuk stok dengan **biaya gabungan** (biaya bahan dibagi jumlah hasil). **Inspeksi QC** menentukan hasil siap jual atau dikarantina ke gudang khusus. Cocok untuk mebel, makanan, konveksi, dan perakitan.
44. **Maintenance / servis aset** *(Fase 2v)*: buat **jadwal servis berkala** per aset (kendaraan, mesin) — sistem **menerbitkan work order otomatis** saat jatuh tempo. Bisa juga buat **work order ad-hoc** untuk perbaikan mendadak. Saat pekerjaan selesai, biaya servis dicatat dan **langsung dijurnal sebagai Beban Pemeliharaan**, lengkap dengan riwayat & total biaya per aset.
45. **Helpdesk** *(Fase 2w)*: kelola **tiket dukungan pelanggan** — atur **prioritas** (rendah s.d. mendesak) dan **status** (terbuka → diproses → selesai), **tugaskan ke anggota tim**, dan balas lewat utas percakapan dengan opsi **catatan internal** yang tak terlihat pelanggan. Setiap tiket terhubung ke kontak.
46. **Ekspor e-Faktur** *(baru — Fase 2x)*: hasilkan **CSV faktur keluaran ber-PPN** per periode — lengkap dengan NPWP/nama pembeli, DPP, dan PPN — siap diimpor ke aplikasi e-Faktur DJP. Faktur non-PPN otomatis dikecualikan; pembeli tanpa NPWP diekspor sebagai `000000000000000`.

47. **Batalkan (void) faktur** *(baru — Fase 3b)*: faktur jual/beli yang salah input dan **belum dibayar/diretur** bisa dibatalkan sekali klik — sistem memposting **jurnal pembalik persis** dan **mengembalikan stok pada biaya asal**, dokumen tetap tercatat dengan tanda DIBATALKAN (jejak audit utuh). Dokumen di periode terkunci atau yang stok pembeliannya sudah bergerak diarahkan memakai retur.
48. **Edit master data & nama akun** *(baru — Fase 3b)*: produk, kontak, dan gudang kini bisa **diubah langsung dari halaman** (tombol Ubah per baris); nama akun di Bagan Akun bisa diganti (kode & tipe sengaja terkunci demi integritas laporan). Mengubah SKU/kode ke nilai yang sudah dipakai ditolak dengan pesan jelas.
49. **Dialog konfirmasi berbrand** *(baru — Fase 3b)*: semua aksi berisiko — arsip data, batalkan dokumen, tutup buku, lepas aset, nonaktif 2FA — kini meminta konfirmasi lewat dialog yang menjelaskan konsekuensinya.
50. **Pencarian & skala besar** *(baru — Fase 3c)*: kotak cari di daftar Produk/Kontak/Gudang, Penjualan/Pembelian, dan Jurnal (dengan "Muat lebih banyak"); memilih produk/pelanggan di form faktur, kontrak, dan resep produksi kini lewat **kotak ketik-cari** yang mengambil hasil dari server — aplikasi tetap ringan meski katalog berisi ribuan produk. Pencarian kasir POS juga dari server.
51. **Diskon per baris** *(baru — Fase 3d)*: kolom diskon % di setiap baris faktur penjualan/pembelian dan keranjang POS — **PPN dan seluruh pembukuan otomatis mengikuti nilai setelah diskon**; cetakan faktur & struk menampilkan diskonnya.
52. **Logo kop faktur & struk** *(baru — Fase 3d)*: unggah logo perusahaan di Pengaturan (otomatis dikecilkan) — langsung tampil di kop cetakan faktur dan struk kasir.
53. **Lonceng notifikasi & stok menipis** *(baru — Fase 3d)*: tetapkan ambang stok minimum per produk; lonceng di bilah atas memberi tahu **stok menipis, faktur lewat jatuh tempo, tiket terbuka, dan pembelian menunggu persetujuan** — klik untuk langsung menuju halamannya.
54. **Dashboard modern & panduan mulai** *(baru — Fase 3e)*: grafik tren penjualan 30 hari dengan tooltip, widget faktur lewat jatuh tempo, feed aktivitas terakhir, dan **checklist "Mulai cepat"** berprogres untuk perusahaan baru (hilang otomatis saat lengkap). Halaman daftar/masuk bergaya split modern; setiap halaman kini punya paragraf pengantar; nama menu dan judul halaman konsisten (Maintenance menjadi Pemeliharaan).
55. **Ekspor e-Faktur XML Coretax** *(baru — Fase 3f)*: satu klik "Unduh XML Coretax" di halaman Ekspor e-Faktur menghasilkan berkas XML yang **langsung bisa diimpor ke Coretax DJP** (format satu-satunya yang diterima sejak 2025). Sistem otomatis memakai kode transaksi yang benar — 04 dengan DPP nilai lain 11/12 untuk barang non-mewah (PMK 131/2024), 01 untuk tarif 12% penuh — menormalkan NPWP ke TIN 16 digit, dan mengecualikan faktur yang dibatalkan/non-PPN. CSV rekap tetap tersedia.

56. **Satu harga untuk semuanya** *(baru — Fase 30)*: paket bertingkat Starter/Business/Enterprise **dibubarkan**. Kini **satu paket Rp 499.000 per perusahaan per bulan**, seluruh 40+ modul terbuka, pengguna tetap tak terbatas. Tidak ada lagi fitur yang terkunci di balik paket yang lebih mahal — penggajian, manufaktur, konsolidasi, API publik, dan keamanan lanjutan tersedia untuk semua pelanggan sejak hari pertama.
57. **Dasbor pemilik: uang, bukan cuma jumlah** *(baru — Fase 30)*: halaman Admin kini menampilkan **pendapatan berulang (MRR)**, jumlah pelanggan yang membayar (dipisah: aman / masa tenggang / gratis), berapa yang berhenti dalam 30 hari, dan umur langganan rata-rata. Ditambah **monitor kuota Cloudflare** yang memperingatkan di 70% — supaya Anda menaikkan paket sebelum pelanggan melihat aplikasi mati, bukan sesudah.
58. **Siap menampung ribuan perusahaan** *(baru — Fase 30)*: dua penghalang teknis yang akan patah pada jumlah besar sudah dibereskan — pemutakhiran database pelanggan kini dicicil bertahap (dulu semuanya sekaligus, dan itu pasti gagal di tengah jalan pada ratusan pelanggan), dan pembatas laju tidak lagi memakan kuota penyimpanan yang batas gratisnya cuma 1.000 tulisan sehari.
59. **Demo publik setahun penuh** *(baru — Fase 30)*: riwayat demo diperdalam dari 6 bulan menjadi **12 bulan**, sehingga perbandingan tahun-ke-tahun, tren setahun, dan anggaran penuh semuanya punya isi. Dilengkapi alat pemeriksa yang **mengueri** demo dan menolak menyatakannya sehat bila ada bulan yang rugi, kas negatif, atau hutang melampaui kas.

Semua hal di atas **diuji otomatis oleh mesin setiap kali ada perubahan kode** — **1.330 skenario ujian end-to-end + 1.171 unit test + 491 cek simulasi UI browser nyata**, totalnya **2.992 pemeriksaan**. Di atas itu ada enam gerbang lagi yang juga wajib lulus: pemeriksa tipe data, pemeriksa standar kode, dan empat penyapu naskah (warna, istilah, gaya kalimat, dan tautan dokumen). Perubahan tidak bisa masuk ke versi utama bila salah satu gagal, dan jumlah pemeriksaan hanya boleh naik — tidak pernah turun.

*Angka di atas dihitung ulang dengan menjalankan gerbangnya pada 29 Agustus 2026, bukan disalin dari catatan.*

## Apakah sudah bisa diakses di internet?

**Ya — jalur deploy otomatis sudah aktif.** Anda telah menghubungkan repo GitHub ke Cloudflare (Workers Builds), dan infrastruktur produksi sudah dibuat di akun Cloudflare Anda: 1 database pusat + 6 database tenant (D1) + penyimpanan rate-limit (KV). Setiap perubahan yang masuk ke versi utama kini otomatis di-build dan di-deploy oleh Cloudflare. Alamat aplikasi bisa dilihat di dashboard Cloudflare → Workers & Pages → **erpindo** (format `erpindo.<nama-akun>.workers.dev`; domain sendiri bisa dipasang kapan saja lewat menu yang sama).

Catatan kapasitas: mode saat ini memakai pool **6 database tenant**. Perusahaan ke-7 akan **ditolak** sampai Anda menaikkan akun ke Workers Paid ($5/bulan) dan memasang dua secret. Ini satu-satunya penghalang yang tersisa menuju ribuan pelanggan, dan langkahnya — beserta urutan yang tidak boleh dibalik — ada di **[docs/langkah-pemilik.md](./langkah-pemilik.md)**.

Kenapa $5 memang diperlukan, dengan angka: paket gratis Cloudflare membatasi 100.000 request/hari, **1.000 tulisan penyimpanan cepat/hari**, dan 100.000 baris database ditulis/hari. Target 1.000 perusahaan mustahil di dalamnya — bukan karena kodenya, melainkan karena empat batas keras sekaligus. Pada 10 pelanggan saja pendapatan Anda sudah Rp 5.000.000/bulan, sehingga $5 menjadi tidak relevan.

## Yang menunggu Anda sekarang

Pekerjaan kode sudah selesai, dan infrastruktur Cloudflare (7 database + penyimpanan cepat) sudah dibuatkan. **Sisanya hanya bisa Anda kerjakan**, karena menuntut akses ke akun Cloudflare Anda:

0. ~~**Buka alamat aplikasi sekali** → skema database terbentuk sendiri.~~ ✅ **Sudah selesai.** Diperiksa langsung di database produksi pada 24 Agustus 2026: ke-19 tabel control-plane sudah terbentuk.
1. ~~**Semai ulang demo publik**~~ ✅ **Sudah selesai.** Demo produksi kini berisi 236 jurnal yang membentang **15 bulan** (Juni 2025 s.d. Agustus 2026), bukan 6 bulan seperti tertulis sebelumnya. Neracanya juga diperiksa dan seimbang tepat.
2. **Workers Paid + D1 dinamis** → menembus batas 6 perusahaan ($5/bulan).
3. **Token analitik** → menyalakan monitor kuota di dasbor (±5 menit, gratis).

4. **Aktifkan kotak surat `halo@erpindo.id`** → halaman `/kontak` sudah memasang alamat ini sebagai satu-satunya jalur menghubungi Anda sebelum berlangganan. Sampai kotak surat itu dibuat di penyedia domain, surel yang dikirim pengunjung hilang tanpa jejak (±10 menit).
5. **Ganti penampung identitas di `/syarat` dan `/privasi`** → kedua halaman memuat `[NAMA BADAN USAHA]` dan `[ALAMAT LENGKAP]`, dan selama itu ada keduanya menampilkan spanduk "draf menunggu tinjauan". Halaman hukum sebaiknya juga dibaca penasihat hukum sebelum dipakai sebagai dasar perjanjian.

Langkah rincinya, beserta cara memverifikasi tiap langkah berhasil: **[docs/langkah-pemilik.md](./langkah-pemilik.md)**.

Halaman depan sengaja **tidak menyebut angka bulan demo** sama sekali, jadi tidak ada janji yang meleset selama Anda belum sempat mengerjakan nomor 1.

## Yang dikerjakan berikutnya — setelah Fase 22

**Seluruh Fase 21 dan Fase 22 sudah tuntas.** Fase 21 menutup dua belas janji yang sudah tertulis di peta pengembangan tetapi belum benar-benar jadi. Fase 22 menyelesaikan enam butir akuntansi & kepatuhan — dan di sepanjang jalannya menemukan **dua cacat lama** yang tidak ada yang laporkan: laporan arus kas yang tidak menghitung kas kecil, dan penyusutan bulanan yang angkanya bergantung pada tanggal komputer.

Sisanya adalah fitur yang memang belum pernah dibangun, dikerjakan berurutan:

| Kelompok | Isi besarnya |
| --- | --- |
| **Fase 23 — Penjualan** | ✅ Harga bertingkat grosir/ecer (**23a + 23b selesai**) · pengingat tagihan otomatis ke pelanggan · faktur kontrak terkirim sendiri |
| **Fase 24 — POS offline penuh** | Kasir tetap bisa berjualan saat internet mati, transaksi diantre lalu disinkronkan. **Ini bagian paling berisiko di seluruh sisa program** — nomor faktur bisa bentrok dan stok bisa minus kalau dikerjakan asal |
| **Fase 25 — Portal** | Karyawan melihat slip gajinya sendiri, pelanggan membuat & memantau tiket |
| **Fase 26–28** | Manufaktur bertingkat, aset ber-QR, stok konsinyasi, target bulanan & peringatan dini anggaran |
| **Fase 29 — Asisten AI (13 butir)** | Draf email penagihan, narasi otomatis di bawah laporan, skor prioritas lead, OCR nota pemasok, dan seterusnya. **Sengaja diletakkan paling akhir**: mutu jawaban AI tidak bisa dijamin oleh uji otomatis mana pun — hanya Anda yang bisa menilainya pada data nyata — jadi tidak ada pekerjaan yang sudah terbukti benar tertahan di belakangnya |
| **Fase 30** | Domain sendiri `erpindo.id` + subdomain per perusahaan |

**Tiga butir lain tidak menunggu kode, melainkan menunggu Anda** — ketiganya bertanda ⏸ di tabel atas: kredensial Google (backup Drive + tombol masuk via Google), variabel `PLATFORM_ADMIN_EMAILS` (agar menu Admin muncul), dan mengaktifkan R2 (untuk lampiran file, dijelaskan di bawah). Ketiganya sudah selesai dibangun dan menyala sendiri begitu kuncinya dipasang; tanpa kunci, fiturnya nonaktif dengan pesan yang jelas — bukan error.

### Untuk fitur Lampiran Dokumen (Fase 2m) — ±2 menit dari Anda

Fitur melampirkan file (foto/PDF) ke faktur, kontak, dan jurnal membutuhkan penyimpanan file **Cloudflare R2**, yang belum aktif di akun Anda. Mengaktifkannya: buka https://dash.cloudflare.com → menu **R2** → klik **Enable/Purchase R2** (ada kuota gratis 10 GB; Cloudflare hanya meminta kartu untuk verifikasi, tidak menagih selama di bawah kuota). Setelah aktif, kabari di sesi pengembangan — bucket dibuat otomatis dan fitur lampiran dibangun. Fase ini sengaja dilewati agar pengembangan tidak berhenti menunggu, dan sejak itu program berjalan terus sampai Fase 22 tanpa pernah tersandung olehnya.
