# Fase 54f — audit alur pengguna ujung-ke-ujung

Bagian 7 dari sepuluh bagian audit.

## Metodenya: membuka aplikasinya, bukan membaca kodenya

Enam bagian sebelumnya diaudit dengan membaca kode dan menulis invarian. Bagian
ini tidak bisa begitu — yang diperiksa adalah **apa yang dilihat orang**, dan
itu hanya bisa dijawab dengan membukanya.

Jadi yang dilakukan pertama bukan menulis perbaikan, melainkan menjalankan
peramban sungguhan: mendaftar sebagai pelanggan baru, masuk, lalu berkeliling
seperti orang yang baru saja membayar biaya pendaftaran dan ingin tahu apa yang
dibelinya.

## Temuan — perusahaan yang belum berlangganan diperlakukan sebagai perusahaan kosong

Inilah keadaan yang **dilalui setiap pelanggan** sebelum membayar. Dan inilah
satu-satunya keadaan yang tidak pernah dibuka satu pun cek peramban: akun
simulasi ui-sim bersifat *comped* — aktif otomatis — sehingga layar ini tidak
pernah muncul dalam 494 cek yang ada.

Yang benar-benar terlihat, terverifikasi di peramban:

| Layar | Yang dikatakannya | Yang sebenarnya |
|---|---|---|
| Penjualan | "Belum ada faktur penjualan" | faktur belum **bisa** ada |
| Produk | tombol "Isi contoh data" | pasti ditolak 402 |
| Mulai Cepat | wisaya 4 langkah, "Simpan & lanjut" | tiap simpanan ditolak |
| Dasbor | tur "Selamat datang 👋 · TUR 1/4" | menuntun keliling aplikasi yang belum hidup |
| Semua halaman | toast merah "belum berlangganan" | mengulang spanduk di atasnya |

Ini kelas cacat yang sama dengan yang ditutup Fase 51b — *gagal memuat tidak
bisa dibedakan dari tidak ada data* — hanya sebabnya 402, bukan galat jaringan.
Bedanya satu hal, dan itu yang membuatnya lebih buruk: pengguna bukan cuma
salah paham, ia **diundang mengerjakan lima hal yang semuanya akan ditolak**.

### Kenapa pintunya ditutup, bukan tiap halamannya ditambal

Menambal lima puluh halaman berarti menyentuh lima puluh berkas untuk satu
kesalahpahaman yang sama, dan halaman kelima puluh satu akan lahir tanpa
penjaga. Jadi kerangka aplikasi yang memutuskan: selama perusahaan belum punya
database, seluruh modul diganti **satu layar** yang mengatakan keadaannya apa
adanya dan memberi satu tombol.

Pengaturan, Dukungan, dan dasbor admin platform tetap terbuka. Menutup
Pengaturan berarti mengunci pelanggan di luar kasirnya sendiri.

## Temuan kedua — satu-satunya jalan maju punya langkah yang tidak diberitahukan

Spanduknya berbunyi "Pilih paket di **Pengaturan**". Menekannya mendarat di tab
**Akun**, berisi nama dan password pengguna. Kartu Langganan ada satu tab di
sebelahnya, tanpa satu pun petunjuk.

Halaman Pengaturan kini menerima `?tab=`, dan setiap tautan yang menyuruh orang
berlangganan membawanya.

## Temuan ketiga — `suspended` tidak punya kalimat sama sekali

Sepanjang audit ini baru terlihat bahwa status `suspended` tidak punya spanduk:
satu-satunya kabar yang diterima pengguna adalah toast merah yang hilang sendiri
dalam beberapa detik.

Itu harus diperbaiki **sebelum** membungkam toast 402 mana pun — kalau tidak,
penangguhan langganan berubah menjadi kegagalan yang benar-benar senyap. Karena
itu yang dibungkam hanya 402 yang layarnya sudah menjelaskan sendiri
(`belum-berlangganan`, `sedang-disiapkan`); 402 lain tetap ditoast.

Agar bisa dibedakan, `ApiRequestError` kini membawa `detail` dari server. Status
HTTP saja tidak cukup: 402 yang sama bisa berarti "sudah dijelaskan layarnya"
atau "tidak dijelaskan di mana pun".

## `tenantSiap` — status saja tidak bisa menjawabnya

Aplikasi web butuh satu jawaban: *apakah perusahaan ini bisa dipakai sekarang?*
`tenantStatus` tidak bisa menjawabnya. Perusahaan yang sudah **membayar**
berstatus `active` sementara databasenya bisa saja belum sempat dibuat (webhook
tiba saat pool penuh) — dan di keadaan itu setiap layar menerima 402 yang sama
persis seperti perusahaan yang belum bayar.

`/api/auth/me` kini mengirim `tenantSiap` per keanggotaan, diturunkan dari
`db_ref`. Layar penggantinya memakai status hanya untuk memilih kalimat: yang
belum bayar diberi tombol, yang sedang disiapkan diberi tahu tidak ada yang
perlu dikerjakannya.

## Gerbangnya

Cakupan peramban untuk keadaan yang belum pernah dibuka: ui-sim kini mendaftar
pelanggan kedua yang **tidak** comped, masuk di konteks peramban terpisah, dan
memeriksa ketiganya — modul ditutup dengan penjelasan (dan **tidak** berbunyi
"Belum ada faktur penjualan"), tanpa toast yang mengulang layarnya, dan
tombolnya benar-benar mendarat di kartu Langganan.

Konteks terpisah itu disengaja: pelajaran Fase 54a — blok yang disisipkan ke
tengah alur uji lain memerahkan uji yang tidak ada hubungannya.

## Gerbang repo menangkap kelalaian saya (lagi)

`tenantTanpaDb.test.ts` memerah karena kueri `/me` kini mengambil `db_ref` tanpa
menyaring perusahaan tanpa database. Di sini justru itulah maksudnya — `/me`
harus melihatnya untuk bisa menjawab `tenantSiap` — jadi ia didaftarkan sebagai
pengecualian beserta alasannya, bukan dilonggarkan polanya.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.259** (dari 1.257) |
| smoke | **1.348** (dari 1.346) |
| ui-sim | **498/498** (dari 494) |
| sapu-warna · istilah · gaya | 0 pelanggaran |
| sapu-i18n | utang turun 52 → 51 |
| tautan dokumen | lulus |

Total **3.105** pemeriksaan.
