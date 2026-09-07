# Fase 55c — naik paket tanpa membuang sisa periode

## Cacat yang ditutup

Fase 53a memecah paket menjadi tiga. Fase 54i membuat ketiganya bisa dibeli.
Yang tersisa: **naik paket berarti membeli periode BARU penuh**, sehingga sisa
periode yang sudah dibayar hangus.

Untuk pelanggan bulanan itu berarti membuang paling banyak sebulan. Untuk
pelanggan tahunan yang naik paket di bulan kedua, itu membuang **sepuluh bulan
yang sudah lunas** — dan orang tidak melakukan itu. Mereka menunggu sampai
perpanjangan berikutnya, atau tidak naik sama sekali.

## Yang ternyata sudah ada

Kolom `subscription_invoices.is_prorata` dan penanganannya di webhook **tidak
pernah dihapus** saat Fase 30 mencabut mesin prorata:

```ts
const newEnd =
  invoice.is_prorata === 1 ? (invoice.subscription_ends_at ?? base) : addMonths(base, invoice.period_months);
```

Komentarnya bahkan masih menjelaskan sebabnya: memperpanjang tanggal akhir untuk
invoice prorata akan memberi tenant satu periode gratis setiap kali ia naik
paket, dan tidak ada laporan yang akan memperlihatkannya.

Jadi yang perlu ditulis hanya bagian yang dicabut: perhitungannya, kedua
endpointnya, dan tempat memilihnya di layar.

## Rumusnya, dan yang sengaja tidak dihitung

```
selisih per hari = (harga(tujuan, periode) − harga(sekarang, periode)) / HARI_SIKLUS[periode]
jumlah           = ceil(selisih per hari × sisa hari)
```

`HARI_SIKLUS` = 30 hari untuk bulanan, 365 untuk tahunan — angka tetap, **bukan**
jumlah hari kalender yang sebenarnya. Pelanggan yang naik paket pada Februari
tidak boleh membayar lebih mahal per hari daripada yang naik pada Maret hanya
karena bulannya lebih pendek. Yang dijaga keadilan tarif, bukan ketepatan almanak.

Sisa hari dibulatkan ke **atas**: hari yang sedang berjalan sudah dipakai
pelanggan pada paket barunya, jadi ia ikut dibayar. Membulatkan ke bawah membuat
kenaikan sore hari terasa "gratis sehari", dan itu selisih yang akan ditanyakan.

**Kelebihan karyawan penggajian sengaja tidak ikut dihitung.** Jatahnya memang
naik bersama paket (10 → 50 → 200), sehingga menghitungnya di tengah periode
berarti mengembalikan sebagian tagihan yang sudah lunas — pengembalian dana,
bukan penagihan. Itu keputusan komersial, bukan aritmetika, jadi kelebihan
karyawan diselesaikan pada perpanjangan berikutnya dengan jatah paket yang baru.

**Penurunan paket tidak menghasilkan apa pun**: `jumlah` nol dengan alasan
`bukan-kenaikan`. Penurunan menyentuh kapasitas yang mungkin sudah terpakai, dan
itu lewat Dukungan — sama dengan keputusan Fase 54i pada pemilih paket.

## Ambang "tagihan terlalu kecil" yang ditulis lalu dibuang

Prorata sisa satu hari terdengar seperti angka receh yang tidak layak dikirim ke
gerbang pembayaran, jadi ambang `MINIMUM_TAGIHAN` sempat ditulis.

Lalu diukur: selisih per hari yang paling kecil pada daftar harga sekarang
adalah Starter → Business, `(1.500.000 − 750.000) / 30 = Rp 25.000` sehari. Sisa
terkecil yang mungkin adalah satu hari, jadi tagihan prorata **tidak pernah bisa
lebih kecil dari itu**.

Ambangnya karena itu cabang yang tidak pernah dijalani — dan cabang yang tidak
pernah dijalani tidak pernah diuji, lalu membusuk sampai suatu hari ia berjalan
dengan perilaku yang tak pernah dilihat siapa pun. Dibuang, dan hubungannya
dijaga uji: bila kelak ada paket berselisih di bawah Rp 300.000 sebulan, ujinya
memerah dan ambangnya bisa ditulis **saat ia benar-benar dibutuhkan**.

## Urutan penjaga yang ditemukan cek smoke sendiri

Penjaga "kunci Xendit terpasang?" mula-mula ditulis sebelum pemeriksaan
kelayakan, meniru `checkout`. Cek smoke fase ini langsung memerah:

```
✗ 55c naik paket tanpa periode berjalan ditolak 400 dengan sebabnya, bukan 503 Xendit
  → 503 {"error":"Pembayaran online belum dikonfigurasi..."}
```

Pemilik yang tidak punya periode berjalan diberi tahu bahwa pembayaran belum
dikonfigurasi — padahal itu bukan sebab permintaannya ditolak. Ia akan menunggu
kunci pembayaran dipasang untuk sesuatu yang tetap ditolak sesudahnya.

Di `checkout` urutan itu benar karena permintaannya selalu sah; di sini tidak.
Memeriksa kelayakan lebih dulu juga gratis: tidak ada panggilan keluar sebelum
titik itu.

## Dua cek lama yang menuntut kebalikannya

Smoke sejak Fase 30 menuntut kedua endpoint menjawab **404** — "endpoint yang
masih hidup tetapi tak terpakai adalah permukaan serang tanpa pemilik". Itu
benar selama paketnya satu.

Keduanya tidak dihapus, melainkan ditulis ulang menuntut kebalikannya **dengan
alasan yang sama**: endpointnya ada dan berpenjaga, dan paket yang tidak dijual
ditolak 400 — bukan 404 yang menyamarkan keberadaannya.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.300** (dari 1.291) |
| smoke | **1.362** (dari 1.351) |
| ui-sim | **506/506** (tidak berubah) |
| sapu-warna · istilah · gaya | 0 pelanggaran |
| sapu-i18n | tidak naik |
| tautan dokumen | lulus |

Satu cek ui-sim lama akhirnya berarti sesuatu: *"F2b tenant tanpa periode
berlangganan TIDAK ditawari ganti paket prorata"* menghitung tombol
`ganti-paket-*` dan selalu nol — karena sejak Fase 30 tombol itu memang tidak
ada di mana pun. Sekarang tombolnya ada, dan ceknya benar-benar menguji bahwa ia
tidak muncul untuk akun tanpa siklus berjalan.
