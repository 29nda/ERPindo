# Fase 53a — tiga paket, dibedakan kapasitas

## Yang dikerjakan

Harga tunggal Rp 499.000 (Fase 30) diganti tiga paket: **Starter Rp 750.000,
Business Rp 1.500.000, Enterprise Rp 3.000.000** per perusahaan per bulan.
Tahunan dibayar sepuluh bulan — hemat dua bulan, dinyatakan sekali di
`BULAN_DIBAYAR_TAHUNAN` supaya halaman harga, checkout, dan uji tidak pernah
menghitungnya sendiri-sendiri.

**Sumbu pembedanya kapasitas, bukan modul.** Ini yang menentukan seluruh bentuk
fase ini, dan perlu dinyatakan tegas karena mudah disalahpahami sebagai
pembatalan Fase 30. Fase 30 membubarkan pemaketan bertingkat karena pembedanya
waktu itu adalah *apa yang boleh dibuka*: UKM membeli Starter, menemukan
penggajian terkunci di bulan kedua, lalu merasa dijebak. Yang kembali di sini
hanyalah nama paketnya. Seluruh modul tetap terbuka di paket termurah, termasuk
penggajian, manufaktur, dan konsolidasi.

Definisi paket hidup di satu tempat, `packages/shared/src/core.ts`, sebagai data
murni beserta fungsi hitungnya (`hargaPaket`, `hematTahunan`,
`biayaKaryawanTambahan`, `paketTerkecilUntuk`) — semuanya murni, jadi bisa diuji
unit tanpa database, dan dibaca oleh api maupun web.

### Keputusan yang diambil di tengah jalan, bukan sebelumnya

**Pengguna tetap tak terbatas di semua paket.** Rencana awal membatasi 3 / 20 /
tak terbatas. Saat membaca kode ternyata "pengguna tak terbatas" bukan satu
kalimat di landing melainkan janji yang tertulis di 30-an tempat: judul landing,
JSON-LD, `llms.txt`, artikel blog, `docs/posisi-produk.md`, kalkulator "hemat
berapa vs sistem per-user", penegakan di `routes/tenants.ts`, dan satu uji yang
bunyinya *"pengguna tak terbatas — janji inti produk, bukan detail"*.

Batas per paket akan membatalkan seluruhnya sekaligus, dan menyerahkan kembali
senjata terkuat melawan pesaing yang menagih per kepala. Ada alasan kedua yang
khusus ERP: batas pengguna mendorong satu akun dipakai beramai-ramai, dan jejak
audit "siapa memposting jurnal ini" langsung kehilangan arti. Ditanyakan ke
pemilik, dan dipertahankan tak terbatas.

**Angka kapasitas belum ditampilkan di kartu harga.** `maxBadanUsaha`,
`maxLokasi`, dan `karyawanTermasuk` sudah terdefinisi tetapi belum ada satu
baris kode pun yang menegakkannya. Fase 30 menghapus `maxEntities` justru karena
kesalahan itu: batas yang diumumkan tetapi tidak diperiksa bukan kode mati,
melainkan janji yang bisa dibantah pelanggan. Karena itu urutan fase berikutnya
dibalik dari rencana semula — **penegakan mendahului halaman harga rinci**,
sehingga tidak pernah ada satu hari pun ketika naskah menjanjikan batas yang
kodenya tidak periksa.

### Dua gerbang naskah baru

`harga-paket-literal` menolak harga paket yang dieja di dalam naskah, dalam
format Indonesia maupun Inggris. Harga dibaca dari `PLAN_LIMITS` lalu
disisipkan. Ada karena harga tunggal dulu ditulis literal di enam tempat — FAQ
landing, poin kepercayaan, halaman `/harga`, syarat layanan, keterangan ikon,
naskah SSR — dan selama harganya satu, tidak ada yang rugi. Begitu paketnya
tiga, tiap salinan menjadi calon kebohongan yang tidak terlihat gerbang mana
pun: halaman menjanjikan satu angka, checkout menagih angka lain, typecheck
tetap hijau karena string apa pun sah.

`paket-tidak-menjual-modul` menggantikan `paket-bertingkat-dibubarkan`. Aturan
lama melarang NAMA paket; itu menjaga ejaan, bukan keputusan. Penggantinya
melarang yang benar-benar dibubarkan Fase 30: menjual modul lewat paket
("tersedia mulai paket Business", "tingkatkan ke Enterprise untuk membuka …").

Keduanya diuji-negatif: aturan dilanggar sengaja, dipastikan merah, lalu
dikembalikan. Uji-negatif pertama hanya menjaring format Indonesia — salinan
Inggrisnya lolos, dan justru itu yang paling mudah luput dari mata. Polanya
diperluas, lalu diuji-negatif lagi.

## Cacat yang ditemukan di jalan

**Kontrak tipe yang berbohong.** `apps/web/src/api/client.ts` masih mengumumkan
`bisnis.hargaPerBulan: number` setelah server berhenti mengirimnya. `pnpm
typecheck` tetap hijau, dan dasbor admin melempar
`undefined.toLocaleString` di layar pemilik. Yang menemukannya ui-sim, bukan
pemeriksa tipe. Fieldnya dihapus dari kontrak, bukan disisakan bernilai nol.

**MRR dihitung dengan rumus yang diam-diam menjadi salah.** `mrr = jumlah
pelanggan × satu harga` benar selama paketnya satu. Dengan tiga paket rumus itu
salah ke arah paling berbahaya: angkanya tetap terlihat wajar, hanya keliru,
sehingga tidak ada yang curiga. Diganti penjumlahan rincian per paket, dan
rinciannya ikut dikirim ke dasbor.

**Laba demo bulan berjalan tipis — ketiga kalinya.** F1b memerah di
Rp 1.969.416, masih positif tetapi di bawah ambang. Diperiksa lebih dulu bahwa
bukan fase ini penyebabnya: diff `seed-demo.mjs` hanya menyentuh penjaga paket,
tanpa satu angka keuangan pun.

Sebab strukturalnya akhirnya terukur, dan bukan yang diduga: bulan berjalan
justru **beromzet lebih tinggi** dari bulan riwayat (Rp 89,6 jt vs ±Rp 82 jt),
tetapi bebannya Rp 8 juta lebih besar. Beban itu nyata dan memang hanya ada di
bulan berjalan — bonus kinerja, THR, lembur, komisi, pesangon — sementara bulan
riwayat tidak menanggung satu pun. Jadi bulan berjalan akan **selalu** lebih
tipis, dan tiap fase HR baru akan menipiskannya lagi.

Karena itu dua hal diubah, bukan satu. Omzet grosir bulan berjalan dinaikkan
sepadan (laba menjadi **Rp 8.242.053**, margin 7,8%, sejajar bulan riwayat
tersehat), **dan** ambangnya berhenti berupa angka rupiah tetap saja. Ambang
rupiah sudah disetel ulang tiga kali; setiap kali sebabnya sama — skala demo
bergeser, lalu angka tetap itu menjadi salah tanpa ada yang salah, dan ambang
yang menuntut perhatian saat tidak ada masalah lama-lama diabaikan. Penjaga baru
di `verifikasi-demo.mjs` membandingkan MARGIN bulan berjalan terhadap median
bulan riwayat, jadi ia ikut berskala sendiri.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck | lulus |
| uji unit | **1.162** (dari 1.147) |
| build | lulus |
| smoke | **1.314** (dari 1.310) |
| ui-sim | **484/484** (dari 480) |
| lint | lulus |
| sapu-i18n | utang 52, atribut 0 |
| sapu-warna | 0 / 0 |
| sapu-istilah | 0 pelanggaran, 2 aturan baru |
| sapu-gaya | 0 pelanggaran |
| tautan dokumen | 84 tautan di 82 berkas |
| verifikasi-demo | DEMO MASUK AKAL ✅ |

Total **2.960 pemeriksaan**, naik dari 2.937. Angka di `docs/STATUS.md` dan
`docs/05-runbook-go-live.md` diperbarui di commit yang sama, dan
`periksaAngkaGerbang` mengonfirmasinya.

## Catatan kejujuran

Rencana yang saya sampaikan ke pemilik memecah pekerjaan ini menjadi 53a
(definisi saja, kecil) dan 53b (halaman harga). Pemisahan itu **tidak bertahan
saat dikerjakan**, dan sebabnya layak dicatat: mengubah `PLANS` langsung
mematahkan typecheck di 15 tempat dan membuat naskah publik berbohong — smoke
dan ui-sim menagih kalimat "Satu paket, satu harga" yang seketika menjadi tidak
benar. Model harga separuh berpindah tidak punya arti, jadi definisi dan naskah
digabung menjadi satu commit. Yang tetap ditunda adalah tabel perbandingan
kapasitas, penegakan batas, kolom control-plane, dan Xendit enam SKU.

Perkiraan "kecil" untuk 53a karena itu meleset. Yang meleset bukan pekerjaannya,
melainkan asumsi bahwa definisi harga bisa dipisahkan dari naskah yang
menjualnya.
