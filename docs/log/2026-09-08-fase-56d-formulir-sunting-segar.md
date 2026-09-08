# Fase 56d — formulir sunting yang membuka nilai sebelum-simpan

## Yang ditutup

Fase 56c berakhir dengan satu pertanyaan yang sengaja tidak digabungkan ke
dalamnya: membuka lagi formulir sunting kontak tepat setelah menyimpan bisa
memperlihatkan nilai sebelum-simpan. Ini fase yang menjawabnya.

Medan formulir master data memakai `defaultValue`, dan disemai **sekali** dari
baris yang tertangkap ketika tombol "Ubah" diklik:

```tsx
onEdit={() => setEditing(p)}
<Input id="k-termin" defaultValue={editing.payment_term_days ?? ""} />
```

Sesudah menyimpan, `update.onSuccess` menutup lembarnya lalu memanggil
`invalidate()` **tanpa menunggunya**:

```ts
onSuccess: () => {
  toast("success", u("toastPerubahanTersimpan"));
  setEditing(null);
  invalidate();          // promise-nya dibiarkan menggantung
},
```

Di antara keduanya ada jendela waktu ketika daftar di belakangnya masih baris
lama. Siapa pun yang mengeklik "Ubah" lagi di dalam jendela itu mendapat
formulir berisi nilai sebelum-simpan — dan karena `defaultValue` tidak pernah
disemai ulang, formulir itu **tetap salah selamanya**; pemuatan data yang tiba
kemudian tidak menyentuh input yang sudah terpasang.

Akibatnya bukan sekadar tampilan yang keliru. Menyimpan formulir itu lagi
**mengembalikan perubahan yang baru saja dibuat pemakainya** — tanpa galat,
tanpa peringatan, tanpa apa pun yang bisa ia lihat.

Jendelanya beberapa ratus milidetik di jaringan sungguhan, jauh lebih lebar
daripada di mesin pengembang. Itu sebabnya cacat ini tidak pernah ditemukan
dengan mengeklik-klik aplikasinya.

## Bagaimana ia ketahuan

Bukan dari laporan pemakai, dan bukan dari membaca kode. Gerbang ui-sim memerah
di CI — runner yang lebih lambat memperlebar jendelanya sampai terlihat —
sementara lokal selalu hijau.

Yang membuatnya terbaca adalah cek diagnostik yang ditambahkan lebih awal
justru untuk itu: tanpa cek itu, yang memerah hanya paruh "batas kredit
dikosongkan tersimpan NULL", dan penyelidik berikutnya akan menghabiskan
waktunya pada penyimpanan batas kredit — yang sama sekali tidak rusak.

## Yang dikerjakan

### 1. Tutup lembarnya SESUDAH datanya segar

```ts
onSuccess: async () => {
  toast("success", u("toastPerubahanTersimpan"));
  await invalidate();
  setEditing(null);
},
```

`invalidateQueries` selesai ketika kueri aktifnya sudah benar-benar diambil
ulang, dan React Query menunggu promise yang dikembalikan `onSuccess`. Jadi
mutasinya tetap `isPending` — tombol Simpan tetap berputar dan tetap nonaktif —
sampai daftarnya segar. Jendelanya hilang, bukan menyempit.

Diperbaiki di `useEntityPage`, satu-satunya tempat yang melayani ketiga halaman
master data (Produk, Kontak, Gudang) sekaligus.

### 2. Siasat di gerbangnya dicabut

Fase 56c menyiasati kegagalan CI ini dengan memuat ulang halaman sebelum
formulirnya dibuka lagi. Siasat itu membuat ceknya hijau **tanpa memperbaiki
apa pun** — bentuk kegagalan yang paling sulit dilihat, karena hasilnya hijau.

Sekarang ceknya membuka lagi formulirnya seketika, tanpa muat ulang dan tanpa
jeda, lalu menagih nilai yang tersimpan. Namanya ikut berganti menjadi `F56d`
supaya kegagalannya menunjuk fase yang menjelaskannya.

## Validasi

| Gerbang | Hasil |
|---|---|
| `pnpm typecheck` | lulus |
| `pnpm test` | 1.366 unit test (+5) |
| `pnpm build` | lulus |
| `pnpm smoke` | 1.372 cek |
| `node scripts/ui-sim.mjs` | 508 cek |
| `pnpm lint` | lulus |
| `sapu-i18n` | 0 (ambang 0) |
| `sapu-warna` | 0 / 0 |
| `sapu-istilah` | 0 pelanggaran |
| `sapu-gaya` | 0 (ambang 0) |
| `periksa-tautan-dokumen` | semua hidup |

Dua lapis, karena keduanya menjaga hal yang berbeda:

- **Lima uji unit** (`apps/web/test/formulir-sunting-segar.test.ts`) menjaga
  URUTANNYA di sumber: `await invalidate()` ada, dan `setEditing(null)` berada
  sesudahnya. Dua di antaranya menjaga gerbang ui-sim-nya sendiri: tidak ada
  `page.reload()`, dan tidak ada penantian atas medan yang tak mungkin terisi —
  dua bentuk salah yang benar-benar sempat ditulis di fase ini.
- **Satu cek ui-sim** (`F56d`) menjaga PERILAKUNYA di peramban sungguhan.

Uji unitnya dibuktikan bisa merah dengan mengembalikan `onSuccess` ke bentuk
lamanya: dua dari lima memerah, lalu hijau lagi sesudah dipulihkan.

## Tiga percobaan untuk membuat ceknya benar-benar menjaga sesuatu

Bagian ini dicatat karena hasilnya dua kali berbunyi "hijau" padahal tidak
menjaga apa pun — dan itu bentuk kegagalan yang paling sulit dilihat.

**Percobaan 1 — muat ulang halaman sebelum membuka formulirnya lagi** (dibawa
dari Fase 56c). Hijau, dan menutupi cacatnya: memuat ulang memang menghapus
seluruh masalahnya, jadi ceknya tidak pernah menguji apa pun.

**Percobaan 2 — muat-ulangnya dicabut, lembarnya ditutup paksa dengan Escape.**
Dijalankan atas kode yang BELUM diperbaiki: **lulus, 508/508.** Dua sebab, dan
keduanya salah bentuk. Menutup paksa melangkahi justru jaminan yang hendak
diuji (sejak fase ini lembarnya menutup sendiri, dan hanya sesudah daftarnya
segar), dan di localhost daftarnya kembali dalam hitungan milidetik sehingga
jendela basinya terlalu sempit untuk tertangkap.

**Percobaan 3 — tunggu lembarnya menutup sendiri, dan buat jendelanya sendiri.**
GET daftar kontak ditunda 600 ms hanya selama langkah ini. Dijalankan atas kode
yang belum diperbaiki, ceknya **memerah dengan gejala yang persis sama seperti
di CI**:

```
✗ F56d formulir sunting dibuka lagi SEGERA sudah berisi nilai tersimpan → termin di formulir = ""
```

Cacat ini semula hanya pernah terlihat di CI, karena runnernya kebetulan cukup
lambat. Gerbang yang bergantung pada keberuntungan bukan gerbang; sekarang
jendelanya dibuat, bukan ditunggu, jadi ceknya menjaga di mesin mana pun.

Percobaan ketiga juga memunculkan cacat pada penjaganya sendiri: melepas rute
selagi penanganannya masih tidur membuat `route.continue()` melempar
"Route is already handled" dan **mematikan seluruh ui-sim di tengah jalan**.
Tundaannya kini dimatikan lewat penanda sebelum rutenya dilepas, dan
`continue()` dibungkus penangkap galat.

## Catatan

Ini cacat yang ditemukan oleh gerbang, bukan oleh orang — dan tiga langkah
sebelum ia terbaca semuanya diperlukan: cek yang menyebut sebab yang benar
(Fase 42a-an), kegagalan di mesin yang cukup lambat (CI), dan penolakan untuk
menerima "hijau di lokal" sebagai jawaban.
