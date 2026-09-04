# Fase 53b–53e — kolom, penegakan, kartu kapasitas, checkout berperiode

Lanjutan Fase 53a. Urutannya sengaja dibalik dari rencana semula: penegakan
mendahului penerbitan angka, sehingga tidak pernah ada satu hari pun ketika
halaman harga menjanjikan batas yang kodenya tidak periksa.

## 53b — kolom control-plane

Migrasi `0018_paket_kapasitas` menambah `billing_period` dan `plan_overrides`,
lalu menormalkan `plan = 'lengkap'` menjadi `'business'`.

Pilihan `business` bukan kebetulan: paket `lengkap` menjanjikan seluruh modul
terbuka dan pengguna tak terbatas, dan Business membawa keduanya dengan
kapasitas menengah. Tidak ada pelanggan berbayar yang perlu di-grandfather saat
migrasi ini ditulis — `subscription_invoices` masih kosong — jadi tidak ada
tagihan siapa pun yang berubah diam-diam.

`billing_period` disimpan di tenant, bukan disimpulkan dari nominal invoice
terakhir: perpanjangan perlu tahu berapa lama masa berlakunya diperpanjang, dan
menebaknya dari angka adalah cara paling mudah salah setelah harga berubah.

`plan_overrides` (JSON) menampung pengecualian kapasitas per tenant. Ada sejak
awal karena kesepakatan Enterprise selalu punya pengecualian, dan menambah kolom
di tengah negosiasi adalah cara paling buruk untuk menemukannya. Harga sengaja
**tidak** bisa ditimpa: harga yang bisa dibengkokkan per baris database berarti
tidak ada satu pun tempat yang bisa menjawab "berapa harga paket Business"
dengan pasti.

`batasEfektif()` di `packages/shared` menggabungkan paket dengan
pengecualiannya. JSON rusak atau berisi kunci asing **tidak** menggagalkan apa
pun — ia diabaikan dan tenant jatuh ke batas paketnya. Kolom ini diisi tangan
saat menutup kesepakatan, dan satu salah ketik di sana tidak boleh membuat
perusahaan tidak bisa membuat gudang.

## 53c — penegakan

`apps/api/src/lib/kapasitas.ts` menjadi satu titik pemeriksaan, bukan tiga cek
yang tersebar. Batas kapasitas akan bertambah, dan pemeriksaan yang tersebar
adalah cara paling mudah kehilangan salah satunya diam-diam.

Bentuk penolakannya mengikuti pola `binding-absent`: 402 dengan
`detail: "kuota-paket"` beserta jenis kuota, batas, pemakaian, paket sekarang,
dan paket terkecil yang memuatnya. Layar penerima tidak perlu tahu apa pun
tentang daftar harga.

Dua hal yang layak dicatat:

**Impor massal adalah jalur sisip kedua.** `crudRoutes` menyisipkan baris lewat
`POST` biasa *dan* `POST /import`. Cek yang hanya menjaga yang pertama akan
meninggalkan impor massal sebagai pintu belakang yang melewati kuota tanpa
terlihat. Karena itu kuotanya dipasang di konfigurasi entitas, bukan di dalam
satu handler — dan smoke mengujinya terpisah. Diuji-negatif: penjaga jalur impor
dicabut, cek smoke memerah, lalu dikembalikan.

**Karyawan penggajian sengaja TIDAK menolak.** Jatahnya bukan pagar melainkan
titik mulai penagihan. Menolak karyawan ke-51 akan mendorong perusahaan menggaji
sisanya di luar sistem, dan sejak saat itu laporan PPh 21 yang dihasilkan
ERPindo salah — kerugian yang jauh lebih besar daripada tagihan yang
diselamatkan.

Kuota badan usaha memakai paket **paling longgar** di antara perusahaan yang
dimiliki akun, bukan paket perusahaan pertamanya. Pemilik yang menaikkan salah
satu perusahaannya ke Enterprise justru sedang bersiap menambah badan usaha;
memakai paket perusahaan pertama akan menolaknya tepat setelah ia membayar.

## 53d — angka kapasitas terbit di kartu harga

Baru sekarang, setelah ada yang menegakkannya. Tiap kartu menyebut badan usaha,
lokasi, karyawan penggajian yang termasuk, dan pengguna tak terbatas; di
bawahnya tarif kelebihan karyawan dinyatakan per kepala.

## 53e — checkout per paket dan per periode

`checkoutSchema` menerima `periode` (`bulanan` | `tahunan`, berdefault bulanan
supaya pemanggil lama tetap sah). Nominalnya `hargaPaket()` ditambah kelebihan
karyawan; `period_months` menjadi 1 atau 12, dan `billing_period` tenant ikut
tersimpan.

Untuk periode bulanan, tarif tahunan per karyawan dibagi dua belas dan
dibulatkan **ke atas**. Pembulatan ke bawah membuat dua belas tagihan bulanan
lebih murah daripada satu tagihan tahunan, dan selisih diam-diam itu akan
menjadi pertanyaan yang tidak enak dijawab.

## Dua cacat yang saya buat sendiri, dan cara ketahuannya

**`Number.isFinite(Number.MAX_SAFE_INTEGER)` bernilai `true`.** Kartu Enterprise
menuliskan "9007199254740991 lokasi" alih-alih "Lokasi tak terbatas", dan
penjaga kapasitas memakai `!Number.isFinite()` yang tidak pernah terpicu. Yang
menemukannya asersi ui-sim yang saya tulis satu langkah sebelumnya. Konsepnya
kini punya nama — `TAK_TERBATAS` dan `takTerbatas()` — dan tiga uji mengunci
sebabnya, bukan gejalanya.

**Checkout memanggil `getTenantDb` tanpa syarat.** Tenant `provisioning` belum
punya database, dan checkout pertama terjadi tepat saat itu —
`getTenantDb(env, TANPA_DB)` melempar, jadi jalur uang satu-satunya akan mati
untuk pelanggan yang baru pertama kali membayar. Kelas cacat yang sama persis
dengan enam yang dijaring Fase 52c; kali ini tertangkap saat menulisnya.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck | lulus |
| uji unit | **1.171** (dari 1.162) |
| build | lulus |
| smoke | **1.321** (dari 1.314) |
| ui-sim | **487/487** (dari 484) |
| lint | lulus |
| sapu-i18n | utang 52, atribut 0 |
| sapu-warna | 0 / 0 |
| sapu-istilah | 0 pelanggaran |
| sapu-gaya | 0 pelanggaran |
| tautan dokumen | lulus |

Total **2.979 pemeriksaan**. `docs/08-referensi-teknis-repo.md` ikut diperbarui —
gerbang `angkaAcuanDokumen` menagih jumlah migrasi control-plane yang berubah
dari 17 menjadi 18.

## Yang masih tertunda, dan sengaja

**Perilaku saat langganan berakhir** (mode baca-saja, ekspor tetap hidup) belum
dikerjakan. Tenggatnya nyata tetapi belum dekat: dua belas bulan setelah
pelanggan pertama. Ia menyentuh data pembukuan orang, jadi tidak pantas
diimprovisasi di ujung fase panjang.

**Proration saat naik paket** juga belum. `hitungProrata` masih terdaftar
tercabut di `paket-tanpa-kunci-modul.test.ts`; dengan tiga paket ia boleh
kembali, tetapi lewat keputusan sadar yang mengubah berkas itu — bukan
diam-diam.
