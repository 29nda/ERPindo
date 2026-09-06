# Fase 54h — audit naskah & UX

Bagian 9 dari sepuluh bagian audit.

## Yang sudah dijaga, dan dijaga ketat

Naskah adalah bagian repo ini yang gerbangnya paling banyak, dan itu perlu
dinyatakan sebelum temuannya. Empat penyapu berjalan tiap commit:

- **`sapu-istilah`** memaksa keputusan di `docs/glosarium.md` — ejaan, merek,
  ragam baku, verba berawalan.
- **`sapu-gaya`** menjaga BENTUK kalimatnya: terjemahan Inggris dalam kurung,
  *empty state* buntu, placeholder angka tanpa pemisah ribuan, klaim hampa,
  nada merendahkan.
- **`sapu-i18n`** menghitung utang teks layar yang belum masuk kamus.
- **`sapu-warna`** menjaga token semantik.

Ditambah `pesan-galat.test.ts` yang menolak satu aturan diucapkan dengan
sembilan bunyi berbeda, dan tiga uji yang melarang toast dirakit dari potongan
kamus.

Jadi yang dicari di sini bukan naskah yang salah — melainkan **yang tidak
diukur sama sekali**.

## Temuan 1 — aksesibilitas: baik, tetapi tidak sebaik yang saya kira

Diukur dengan membuka halaman di peramban sungguhan dan menghitung kendali yang
tidak punya nama terbaca pembaca layar.

**Pengukuran pertama saya menyapu dua belas halaman tersibuk dan menemukan
satu.** Saya sempat menuliskannya sebagai "satu kendali di seluruh aplikasi".
Itu salah, dan cara salahnya adalah inti bagian ini: **dua belas halaman bukan
seluruh aplikasi.**

Gerbang yang saya tulis sesudahnya menyapu **setiap rute** yang dikenal ui-sim,
dan menemukan empat lagi yang luput dari sampel saya:

| Tempat | Keadaan |
|---|---|
| Produk — pilih jenis usaha | label terlihat menempel, tetapi tidak terkait `htmlFor`/`id` |
| Manufaktur — jumlah komponen BoM | tanpa label maupun placeholder |
| Panduan publik — kotak cari | hanya berlabel placeholder |
| Kontrak — cari produk/jasa | hanya berlabel placeholder |
| Manufaktur — cari komponen | hanya berlabel placeholder |

Nol tombol tanpa nama, nol gambar tanpa `alt` — bagian itu memang bersih.

`placeholder` sengaja **tidak** dihitung sebagai nama. Ia hilang begitu orang
mulai mengetik, jadi tepat pada saat pengguna paling butuh tahu ia sedang
mengisi apa, keterangannya justru tidak ada.

### Satu perbaikan yang tidak berbuah, dan sebabnya

Dua kotak cari itu tetap tanpa nama walau `aria-label` sudah saya pasangkan —
karena keduanya `SearchSelect`, dan **komponen itu tidak meneruskan propnya sama
sekali.** Pemanggil yang mengirimkannya tidak mendapat apa pun, tanpa satu pun
peringatan: bukan tsc, bukan lint, bukan mata.

Diperbaiki di komponennya, sekali: `SearchSelect` kini meneruskan `aria-label`,
dan bila tidak diisi ia memakai `placeholder`-nya sendiri. Seluruh pemakainya
ikut membaik tanpa disentuh.

Kejadian ini juga yang membuat gerbangnya bernilai lebih daripada perbaikannya:
tanpa pengukuran ulang, saya akan menutup fase ini dengan yakin bahwa dua kotak
itu sudah bernama.

## Temuan 2 — server tahu medan mana yang salah; layar membuangnya

**113 endpoint** mengembalikan `issues` — peta medan → alasan, dihitung zod,
dalam kalimat Indonesia yang bisa langsung dibaca: "Kode wajib diisi", "Nama
akun minimal 2 karakter", "Akun wajib dipilih". Skema repo ini menulis **257**
pesan semacam itu.

**Tiga halaman** dari sekitar empat puluh benar-benar menampilkannya.

Sisanya membuang seluruh rincian itu dan menoast "Data tidak valid". Pengguna
tahu formulirnya ditolak; ia tidak tahu di mana. Pekerjaan menghitungnya sudah
dilakukan, jawabannya sudah dikirim lewat kabel, lalu dibuang di ujung.

Menambal empat puluh halaman satu per satu berarti churn besar untuk satu
kelemahan yang sama, dan halaman keempat puluh satu akan lahir tanpa
rinciannya. Jadi rinciannya dimasukkan ke **pesannya**, sekali, di tempat
`ApiRequestError` dibuat — dan seluruh halaman yang sudah ada ikut membaik tanpa
disentuh satu pun.

Dua batasan yang disengaja:

- **Paling banyak dua alasan.** Tiga atau lebih membuat toast lebih panjang
  daripada yang sempat dibaca orang sebelum ia menghilang.
- **Bawaan zod berbahasa Inggris dilewati.** Medan tanpa pesan kustom dijawab
  zod dengan "Required" atau "Expected number, received string"; menempelkan itu
  ke pesan pengguna lebih buruk daripada tidak menempelkan apa pun.

Enam uji mengunci keduanya, termasuk bahwa alasan yang sama untuk dua medan
tidak diulang dan titik di ujung pesan tidak menghasilkan "valid. — alasan".

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.273** (dari 1.267) |
| smoke | **1.348** (tidak berubah) |
| ui-sim | **501/501** (dari 498) |
| sapu-warna · istilah · gaya | 0 pelanggaran |
| sapu-i18n | utang tidak naik (51) |
| tautan dokumen | lulus |

Total **3.122 pemeriksaan**.
