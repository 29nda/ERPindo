# Fase 32a — palet krem hangat & tipografi editorial

Pemilik meminta perombakan UI dari landing sampai dasbor, dengan rujukan
`anthropic.com`.

## Catatan jujur di depan: situs rujukannya tidak bisa saya buka

Proxy jaringan lingkungan ini memblokir domainnya (`EGRESS_BLOCKED`). Palet dan
tipografi di bawah **diturunkan dari pemahaman saya atas bahasa desainnya**,
bukan dari pengambilan sampel piksel seperti yang dilakukan pada logo di Fase
31a. Itu perbedaan mutu bukti yang perlu dicatat, bukan disamarkan.

Konsekuensinya dibuat semurah mungkin: bila hasilnya meleset dari yang
dibayangkan pemilik, yang perlu diubah hanya **satu blok nilai** di
`styles.css` — bukan 50 halaman.

## Keputusan wawancara

| Pertanyaan | Jawaban |
| --- | --- |
| Palet vs logo | **Logo ikut dirancang ulang jadi hangat** |
| Tipografi | **Serif hanya untuk judul besar**, tabel tetap sans + mono |
| Kepadatan | **Landing lapang, aplikasi tetap padat** |

Pilihan pertama membalik keputusan wawancara Fase 31 ("pertahankan logo").
Itu disebutkan di dalam pilihannya sendiri, jadi pembalikannya diambil dengan
sadar — dicatat di sini agar tidak terlihat seperti kelalaian di kemudian hari.

## Yang dikerjakan

### Palet: netral biru → krem hangat

Ciri paling menentukan arah ini bukan warna aksen melainkan **latarnya**: krem
hangat (`#f5f2ea`), bukan putih dan bukan abu dingin. Latar itulah yang membuat
halaman terbaca seperti terbitan cetak alih-alih dasbor.

Netral biru Fase 31a dibuang seluruhnya — ia dipilih untuk menemani aksen biru
murni, dan sejak aksennya menjadi tanah liat, ia justru melawannya.

Aksen `brand-600` = `#a8492a`. Kontras di atas krem **5,15:1**, teks putih di
atasnya **5,75:1** — keduanya lulus WCAG AA.

**Nama ramp `brand-*` sengaja dipertahankan.** Ada ratusan pemakaian
`bg-brand-600`/`text-brand-700` di halaman; mengganti nilainya memindahkan
seluruh aplikasi ke aksen baru **tanpa menyentuh satu pun halaman**.

Inilah bukti bahwa lapis token Fase 31a bekerja — dan sekaligus bedanya dengan
17a/18a: di sana pergantian palet murah **karena** kerangkanya tidak pernah
berubah; di sini bentuk komponennya sudah diganti lebih dulu, jadi pergantian
palet bukan pengecatan ulang di atas kerangka lama.

### Tipografi: serif editorial, dibatasi

`Source Serif 4 Variable` ditambahkan, dipakai lewat dua utilitas: `judul`
(judul seksi) dan `judul-hero` (judul utama). Sebelas judul di landing dan
`/fitur` beralih.

Sengaja **utilitas, bukan aturan pada `h1/h2`**: `h2` juga dipakai di kepala
kartu dasbor, dan serif di sana akan merembet ke seluruh layar kerja — persis
yang tidak diinginkan pemilik. Tabel, angka rupiah, dan kode akun tetap sans +
mono.

### Wordmark digambar, bukan gambar

Logo lama PNG gradien biru elektrik dengan segitiga cyan. `BrandWordmark` kini
menggambar teks: "ERP" serif + "indo" sans ringan berwarna aksen.

Tiga hal ikut terbawa, dan ketiganya bukan soal selera:

1. **Ikut tema sendiri** — warnanya token, jadi tidak ada lagi dua berkas PNG
   yang harus diregenerasi tiap palet berubah.
2. **Tajam di segala ukuran**, termasuk cetak faktur.
3. **Nama merek menjadi teks di DOM**, bukan `alt` pada gambar.

## Satu asersi disesuaikan

`F1a` mencari wordmark lewat `img[alt^="ERPindo"]`. Wordmark bukan `<img>` lagi.
Asersinya kini mencari `[aria-label="ERPindo"]` — **yang diuji tidak berubah**
(latar di belakang wordmark tidak boleh putih di atas panel berwarna), hanya
cara menemukannya. Dicari lewat `aria-label` dan bukan nama kelas: label itu
bagian dari kontrak aksesibilitas komponennya, sedangkan kelas bisa berganti
tanpa mengubah apa pun yang dilihat atau didengar pengguna.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 610 | ✅ 610 |
| `pnpm smoke` | 1.132 | ✅ 1.132 |
| `node scripts/ui-sim.mjs` | 360 | ✅ 360 |
| `sapu-warna` | 88 / 335 | ✅ 88 / 335 |

## Yang BELUM dikerjakan

Landing masih 12 bagian. Melapangkannya (keputusan "landing lapang") dan
meringkas susunannya dikerjakan terpisah — sub-fase ini menyiapkan palet dan
tipografinya lebih dulu supaya penulisan ulang tata letaknya tidak perlu
mengurus warna sekaligus.

Gambar produk di landing & panduan (38 berkas) masih memotret palet biru dan
kini **bertentangan dengan halamannya**. Regenerasi lewat `screenshots.mjs`
menyusul setelah tata letaknya final — meregenerasi sekarang berarti
mengerjakannya dua kali.
