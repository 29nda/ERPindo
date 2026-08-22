# Fase 38d — enam halaman yang bisa diteruskan ke bagian pengadaan

## Yang dikerjakan

Sampai fase ini situs publik hanya punya beranda, `/fitur`, `/panduan`, dan
`/blog`. Harga hanyalah seksi di beranda, dan **tidak ada satu pun halaman yang
bisa dikirim ke bagian pengadaan atau bagian hukum calon pelanggan.**

Itu masalah nyata untuk pembeli yang disasar `docs/posisi-produk.md`: pada
pembelian perangkat lunak perusahaan, yang menilai dan yang menyetujui adalah
orang berbeda — dan yang menilai bekerja dengan cara **meneruskan tautan**.
`/#harga` bukan tautan yang layak diteruskan.

| Rute | Isinya |
| --- | --- |
| `/harga` | Rincian paket, yang termasuk, batas yang memang ada, biaya kepemilikan 3 tahun, dan apa yang terjadi bila pembayaran terlambat |
| `/keamanan` | Isolasi basis data, hak akses, integritas jurnal, lapisan jaringan — **plus seksi "yang belum ada"** |
| `/tentang` | Kenapa dibangun, bukan siapa yang membangun |
| `/kontak` | Demo, surel, dan menu Dukungan di dalam aplikasi |
| `/syarat`, `/privasi` | Naskah hukum berbahasa Indonesia, ditandai draf |

## Koreksi rencana: seksi harga TIDAK jadi dipindahkan

Rencana awal memindahkan `Pricing` dan kalkulator dari beranda ke `/harga`.
Dibatalkan setelah membaca asersinya:

- **F30b** menguji harga muncul di hero **sebelum** judul seksi harga, dengan
  penanda posisi `"Tidak ada paket yang lebih mahal"`.
- Satu asersi lain menguji kesimpulan kalkulator terbaca **tanpa menggeser
  slider**.

Keduanya keputusan Fase 30b dan 35c, keduanya masih berlaku, dan keduanya masih
benar. Jadi `/harga` menjadi versi **mendalam**, bukan pemindahan — beranda
tetap tempat harga pertama kali terbaca, dan tidak satu asersi pun perlu
dilonggarkan untuk itu.

## Tiga keputusan naskah

**`/keamanan` menyebut apa yang belum ada.** Ia menyatakan terus terang bahwa
ERPindo belum memegang ISO 27001 maupun SOC 2. Halaman keamanan yang hanya
memuat hal baik terbaca sebagai brosur, dan brosur tidak diteruskan manajer TI
ke bagian pengadaan. Ada asersi ui-sim yang menjaganya tetap di sana.

**`/kontak` tidak membangun kembali formulir yang sudah dibuang.** Fase 27a
membuang formulir "Jadwalkan demo" karena ia menjanjikan percakapan tanpa satu
pun cara memulainya, dan asersi F48 menjaga keputusan itu. Halaman ini menyebut
ketiadaannya sebagai sikap: "Tidak ada formulir yang meminta nomor telepon lalu
menyerahkannya ke tenaga penjual."

**Halaman hukum berbahasa Indonesia saja.** Seluruh situs dwibahasa; dua halaman
ini sengaja tidak. Naskah hukum yang diterjemahkan tanpa peninjau menghasilkan
dua dokumen yang berbeda maknanya sambil sama-sama tampak resmi, dan yang
dirugikan adalah pihak yang membaca versi yang salah. Keterangan tentang hal itu
sendiri tetap dwibahasa.

Keduanya memuat penampung `[NAMA BADAN USAHA]` dan `[ALAMAT LENGKAP]` sesuai
keputusan pemilik, dengan spanduk draf yang mencolok. **Tidak ada klaim
kepatuhan UU PDP** — yang dinyatakan hanya fakta yang bisa ditunjuk barisnya.

## Gerbang yang bekerja sebagaimana mestinya

`apps/api/test/rbac-guard.test.ts` **gagal** pada percobaan pertama: enam rute
Worker baru adalah endpoint tanpa `requireAuth`, dan gerbang itu menuntut tiap
rute publik dinyatakan publik dengan sengaja. Ia diperbaiki dengan menambahkan
keenamnya ke daftar putih beserta alasannya — bukan dengan melonggarkan
gerbangnya. Rute publik baru memang tidak boleh bisa lahir diam-diam.

## `sapu-gaya` diperluas — naskah publik akhirnya masuk gerbang

Penyapu gaya sebelumnya **hanya** membaca dua kamus aplikasi. Seluruh naskah
halaman publik luput, dan itu bukan kelalaian melainkan akibat bentuk: naskah
publik ditulis sebagai `L(lang, "…", "…")` di tengah JSX, dan parser penyapu —
yang mengenali `kunci: { id, en }` — tidak akan pernah bisa melihatnya.

Naskah enam halaman baru ditulis sebagai data `Dual` sejak lahir, jadi ia bisa
disapu. Cakupan naik **2.077 → 2.398 entri**.

Perluasan itu langsung menemukan sesuatu, dan yang ditemukannya adalah cacat
pada **kaidahnya**, bukan pada naskahnya: `empty-state-buntu` menembak empat
kalimat jualan yang kebetulan diawali "Tidak ada" — di antaranya "Tidak ada
rekapitulasi manual di akhir hari", yang justru kalimat terkuat di peragaannya.

Menaikkan ambang akan menyembunyikan keempatnya beserta tiap keadaan kosong
buntu sungguhan yang ditambahkan sesudahnya. Yang dikerjakan: kaidah itu
**dibatasi ke kamus aplikasi**, tempat keadaan kosong memang hidup. Ambangnya
tetap 9.

### Kaidah baru: `klaim-tanpa-bukti`, ambang nol sejak hari pertama

`docs/posisi-produk.md` §3 sudah menyatakan aturan keras — "tidak ada klaim di
halaman depan yang tidak bisa ditunjuk barisnya di produk" — dan sampai fase ini
aturan itu **hanya hidup di dokumen**. Aturan yang hanya hidup di dokumen akan
dilanggar oleh orang yang tidak membaca dokumen itu.

Kaidah ini melarang kata sifat yang tidak punya cara untuk salah: *terbaik*,
*canggih*, *revolusioner*, *seamless*, *world-class*. "Termurah" sengaja
**tidak** dilarang — ia klaim faktual yang bisa diperiksa. Ambangnya nol sejak
hari pertama karena tidak ada satu pun yang telanjur dipakai.

## Neraca asersi

**ui-sim: 8 ditambah · 0 diperbarui · 0 dihapus.**
**smoke: 13 ditambah.**

Cek Worker ditaruh di smoke, bukan ui-sim, dengan alasan yang konkret: halaman
yang lupa didaftarkan di `run_worker_first` tetap **tampil sempurna** bagi
pengunjung — Worker hanya tak pernah dipanggil, jadi hanya perayap yang
menerima SPA kosong. ui-sim menjalankan JavaScript, jadi ia buta terhadap
kegagalan itu.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 681 | ✅ 681 |
| `pnpm smoke` | 1.139 | ✅ **1.152** (+13) |
| `node scripts/ui-sim.mjs` | 370 | ✅ **378** (+8) |
| `sapu-warna` | 70 / 288 | ✅ 70 / 288 |
| `sapu-istilah` | 0, 160 berkas | ✅ 0, **161 berkas** |
| `sapu-gaya` | 0/9/0, 2.077 entri | ✅ **0/9/0/0, 2.398 entri** |

## Yang menunggu pemilik

Dua butir ditambahkan ke `docs/STATUS.md`:

1. **Aktifkan kotak surat `halo@erpindo.id`.** Halaman `/kontak` sudah
   memasangnya sebagai satu-satunya jalur menghubungi sebelum berlangganan.
   Sampai kotak surat itu dibuat, surel pengunjung hilang tanpa jejak. Ini
   risiko yang saya sampaikan saat menanyakannya, dan pemilik memilih memasang
   alamat itu tetap.
2. **Ganti penampung identitas** di `/syarat` dan `/privasi`.
