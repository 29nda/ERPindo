# Fase 39a — naskah yang dibaca mesin, bukan hanya perayap pencarian

## Yang dikerjakan

Permintaan pemilik: naskah beranda diarahkan agar lebih ramah SEO, GEO, dan AI.
Yang ditemukan saat mengerjakannya lebih penting daripada permintaannya.

### 1. Bug: perayap menerima kode mentah, bukan harga

Kalimat harga di blok `<noscript>` beranda ditulis begini:

```
<p>Satu paket, satu harga: Rp \${PLAN_LIMITS.lengkap.pricePerMonth.toLocaleString("id-ID")} …</p>
```

Dolarnya **ter-escape** di dalam template literal, sehingga yang tersaji ke
Google dan mesin penjawab adalah potongan kode itu sendiri, bukan "Rp 499.000".

Yang membuatnya bertahan bukan ketiadaan gerbang, melainkan gerbang yang
menyatakan hal benar karena alasan yang salah. Penjaga "SSR landing menyatakan
satu harga tunggal" memeriksa dua hal: ada string `499.000`, dan ada frasa
`Satu paket, satu harga`. Keduanya benar — `499.000` datang dari teks FAQ di
halaman yang sama, dan frasa itu memang awalan kalimat yang rusak. Halaman
dinyatakan benar sementara kalimat harganya tidak pernah berbentuk kalimat.

Perbaikannya di sumbernya: `HARGA_ID` dihitung sekali, tidak ada lagi ekspresi
di dalam naskah. Penjaga barunya tidak mencari yang benar melainkan **menolak
yang mustahil** — sintaks template yang tersisa di keluaran adalah kode bocor,
apa pun bentuknya.

### 2. JSON-LD dipilih per halaman

`FAQPage` sebelumnya disajikan di **kesembilan** jalur, termasuk `/privasi` dan
`/syarat` yang tidak menampilkan satu pun tanya-jawab. Itu pelanggaran data
terstruktur yang sama seperti yang sudah diperbaiki Fase 31c di tempat lain; ia
lolos di sini karena tidak ada yang memeriksa halaman selain beranda.

Sekarang: `Organization` + `WebSite` di semua halaman, `SoftwareApplication`
hanya di halaman yang memperlihatkan produknya, `FAQPage` hanya di beranda,
`Offer` hanya sekali, dan `BreadcrumbList` di tiap subhalaman.

Ditambahkan juga `featureList`, `screenshot` (menunjuk gambar `/tampilan` yang
benar-benar ada), `audience`, `areaServed`, dan `inLanguage`.

### 3. `/llms.txt`

Peta situs berbentuk prosa untuk mesin penjawab (konvensi llmstxt.org). Isinya
fakta yang bisa diperiksa — harga, modul, dan **yang belum ada** (ISO 27001,
SOC 2, halaman hukum yang masih draf). Bagian terakhir itu yang membuatnya
berguna alih-alih menjadi brosur: model yang mengutipnya ikut menyebut
batasannya, sehingga calon pelanggan tidak datang membawa harapan yang tidak
bisa dipenuhi.

### 4. robots.txt menyebut perayap AI satu per satu

`User-agent: *` sudah mengizinkan mereka secara teknis, tetapi baris eksplisit
adalah pernyataan sikap yang terbaca mesin. `/app` dan `/api` tetap diblokir.

### 5. Definisi yang bisa dikutip utuh

Satu paragraf yang menjawab "apa itu ERPindo" tanpa perlu kalimat sebelum atau
sesudahnya — subjeknya disebut penuh, bukan "kami". Dipakai di `<noscript>`
beranda dan di `/llms.txt`.

`FITUR_UTAMA` dipindahkan ke `@erpindo/shared` supaya JSON-LD dan `/llms.txt`
membaca daftar yang sama, mengikuti pola `FAQ_LANDING`.

## Validasi

- `pnpm typecheck` · `pnpm lint` · `pnpm build` — lulus
- `pnpm smoke` — **1.173 cek** (naik dari 1.157; 16 cek baru)
- Penjaga nama paket lama diperlebar tiga frasa kosakata schema.org
  ("Enterprise Resource Planning", "BusinessAudience"), sebagai frasa utuh —
  "Enterprise" telanjang di kalimat jualan tetap tertangkap.

## Koreksi

Penjaga "30 SSR landing menyatakan satu harga tunggal" TIDAK dihapus meski
terbukti bisa lolos karena alasan yang salah. Ia masih menangkap hal lain, dan
menggantinya bukan pekerjaan fase ini — yang dikerjakan adalah menambah penjaga
yang menutup celah spesifiknya.
