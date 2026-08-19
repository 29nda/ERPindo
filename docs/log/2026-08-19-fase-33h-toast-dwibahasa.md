# Fase 33h — 96 toast jadi dwibahasa, dan pola yang membuatnya mustahil

Bagian F panduan gaya. Fase 33f mencatat "14 toast masih Bahasa Indonesia
keras"; diukur langsung, **121**.

## Dua pola, dan yang kedua lebih berbahaya

**Literal (49).** `toast("success", "Data tersimpan.")` — jelas salah dan
jelas terlihat. Diberi kunci kamus, selesai.

**Rakitan potongan (47).** Ini yang tidak terlihat:

```
toast("success", `${u("toastPermintaanPrefix")} ${res.reqNo} ${u("toastDiajukan")}`)
```

Setiap potongnya **sudah** ada di kamus dan **sudah** punya terjemahan. Penyapu
i18n melihatnya bersih. Tetapi urutan katanya terkunci di dalam kode: nomor
selalu di tengah, karena `${res.reqNo}` ditulis di antara dua potongan.

Bahasa yang menaruh nomornya di tempat lain tidak punya cara mengubahnya —
kamus hanya boleh **mengisi** potongan, tidak boleh **menyusun ulang** kalimat.
Hasilnya kalimat Inggris berpola Indonesia, dan tidak ada gerbang yang bisa
melihatnya justru karena tiap potongnya memang sudah diterjemahkan.

Contoh yang paling gamblang, dari `payroll.tsx`:

| | |
| --- | --- |
| Indonesia | "Pengajuan **cuti 3 hari** dicatat" |
| Inggris yang benar | "A **3-day leave** request was recorded" |

Angka dan jenisnya bertukar tempat. Potongan tidak bisa melakukannya.

## `isi()` — kalimat utuh, lubang bernomor

```ts
isi(u("toastCutiDicatat"), jenis, res.days)

id: "Pengajuan {0} {1} hari dicatat — menunggu persetujuan."
en: "A {1}-day {0} request was recorded — awaiting approval."
```

Nomor lubangnya sama, urutannya berbeda. Tiap bahasa menaruh nilainya menurut
tata bahasanya sendiri.

Lubang tanpa nilai sengaja **dibiarkan apa adanya** (`{0}` tampil di layar),
bukan diubah jadi `undefined` — kesalahan yang terlihat lebih murah daripada
kesalahan yang menyamar sebagai kalimat.

## Hasil

| | Sebelum | Sesudah |
| --- | --- | --- |
| toast literal | 49 | **0** |
| toast rakitan template | 47 | **0** |
| utang teks layar (`sapu-i18n`) | 147 | **145** |
| toast terdeteksi penyapu | 121 | 22 (sisanya salah kenali: nilai enum, nama berkas CSV, potongan kode) |

18 potongan kamus yang menjadi yatim karenanya ikut dibuang. Yatim dari fase
lain **tidak** disentuh: sebagiannya mungkin dipakai lewat kunci terhitung
(`u(LEAVE_LABEL[type])`), dan membuangnya butuh pemeriksaan tersendiri.

## Penjaga baru — dan buktinya bahwa keduanya bisa gagal

Tiga uji di `apps/web/test/i18n.test.ts`:

1. tidak ada `toast(...)` berisi **template string**;
2. tidak ada `toast(...)` berisi **literal**;
3. `isi()` menaruh nilai sesuai urutan kata tiap bahasa — diuji dengan pasangan
   ID/EN yang urutannya memang berbeda.

Uji pertama **langsung menemukan 14 kasus** yang belum saya konversi saat
pertama kali dijalankan — persis kelas rakitan potongan, yang lolos dari
penyapu i18n maupun mata saya. Semuanya ikut diperbaiki.

**Disabotase.** Satu toast di `salesorders.tsx` dikembalikan ke template, satu
lagi ke literal: tepat dua uji gagal, keduanya menyebut berkas dan isinya. Lalu
dipulihkan.

## Kekeliruan saya sendiri: impor yang merusak berkas

Skrip penyisip impor saya memasang `import { isi } from "../i18n";` **di baris
kedua** setiap berkas — yang untuk sebelas berkas berarti tepat di tengah
pernyataan `import {` multi-baris. Sebelas berkas gagal parse sekaligus.

Dua kekeliruan sekaligus, dan yang kedua nyaris lolos: kedalaman path juga
salah untuk `pages/settings/*` (`../i18n`, seharusnya `../../i18n`). `tsc`
menangkap yang pertama dengan keras; yang kedua hanya akan muncul setelah yang
pertama diperbaiki.

Diperbaiki dengan memasang impor **sebelum baris impor `i18n/ui`** yang sudah
ada di tiap berkas, dengan kedalaman dihitung dari letak berkasnya.

## Yang BELUM dikerjakan dari Bagian F, dan alasannya

**346 pesan galat API tetap Bahasa Indonesia.** Bukan karena naskahnya, tetapi
karena **API sama sekali tidak punya mekanisme bahasa** — tidak ada
`Accept-Language`, tidak ada parameter bahasa, tidak ada kamus di sisi Worker.
Mendwibahasakannya berarti menambah mekanisme itu lebih dulu, dan itu perubahan
arsitektur, bukan perbaikan naskah. Dicatat sebagai pekerjaan tersendiri.

**29 modul panduan (2.606 kata) tetap Bahasa Indonesia.** `GuideModule.title`
bertipe `string`, bukan `Dual` — strukturnya memang belum dwibahasa.

Keduanya dinyatakan apa adanya, bukan dikerjakan setengah. Menerjemahkan
separuh panduan lebih buruk daripada tidak sama sekali: pembaca Inggris akan
menemukan halaman yang berganti bahasa di tengah jalan.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 616 | ✅ **619** |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 147 · 0 | ✅ **145** · 0 |
