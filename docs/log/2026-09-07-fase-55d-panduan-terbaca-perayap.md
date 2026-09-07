# Fase 55d — panduan yang diumumkan ke Google tetapi tidak pernah disajikan

## Cacat yang ditutup

`/panduan` terdaftar di `sitemap.xml` sejak lama: kita **menyuruh Google
mengindeksnya**. Yang tidak pernah ada adalah rute Worker dan pendaftaran
`run_worker_first`-nya.

Akibatnya perayap dan mesin penjawab — yang tidak menjalankan JavaScript —
menerima cangkang SPA kosong bertajuk beranda, tanpa canonical. **Dua puluh lima
modul panduan, badan naskah terbesar di situs ini**, tidak terbaca oleh pembaca
yang justru diundang `robots.txt` satu per satu:

```
User-agent: GPTBot / OAI-SearchBot / ChatGPT-User / ClaudeBot / PerplexityBot / …
Allow: /
```

Yang membuatnya bertahan: **tidak ada layar yang memperlihatkannya.** Di
peramban halamannya tampil sempurna. Hanya perayap yang melihat yang kosong, dan
perayap tidak melapor.

Kebalikannya juga ada, ditemukan pada audit yang sama: `/api-docs` disajikan
Worker penuh sejak lama tetapi **tidak pernah diumumkan** di sitemap.

## Yang dikerjakan

**Isi panduan pindah ke `packages/shared`.** Worker tidak bisa mengimpor dari
`apps/web`, jadi ia pindah ke tempat yang memang dibaca keduanya. Isinya data
murni tanpa React, jadi perpindahannya mekanis.

**Satu URL per modul**, bukan hanya `/panduan`. Itu bentuk pertanyaan yang
benar-benar diketik orang: *"cara tutup buku ERPindo"*, bukan *"panduan"*.
Sitemap membangun daftarnya dari `GUIDE_MODULES` — peta situs yang mengeja dua
puluh lima jalur akan berpisah dari panduannya pada modul berikutnya, dan
perpisahan itu tidak berbunyi di mana pun.

`<noscript>`-nya sengaja **bukan** salinan seluruh isi modul: judul, paragraf
pembuka, dan judul tiap seksi beserta langkahnya. Alasannya sama dengan
`noscriptFitur` — blok ini memberi perayap inti maknanya, dan menyalin ratusan
langkah ke shell HTML akan memperbesar setiap muat halaman bagi pengunjung yang
JavaScript-nya normal.

Slug tak dikenal tetap dilayani sebagai halaman panduan, bukan 404 dari Worker:
yang menentukan halaman ada atau tidak adalah aplikasinya, dan dua sumber
kebenaran untuk itu adalah cara termudah keduanya berpisah.

## Pemeriksaan tipe yang dilepas, dan penggantinya yang lebih kuat

`GuideSection.peragaan` dulu bertipe `PeragaanId` — union kunci `PERAGAAN` —
sehingga rujukan ke peragaan yang tidak ada gagal saat kompilasi. `packages/shared`
tidak boleh bergantung pada `apps/web`, jadi tipenya melemah menjadi `string`.

`apps/web/test/panduan-peragaan.test.ts` mengembalikan jaminannya, dan sebenarnya
**lebih kuat daripada union yang digantikannya**: union hanya memeriksa nilai
pada saat ditulis, dan tidak pernah melihat peragaan yang DIHAPUS belakangan —
berkas panduan yang merujuknya tidak ikut disunting, jadi tidak ikut diperiksa
ulang sampai ada yang menyentuhnya.

Pencocokannya di layar memakai `in`, bukan penegasan tipe: penegasan akan
mengembalikan persis ketidakamanan yang baru dilepas, dan seksi yang menunjuk
peragaan tak dikenal akan meledak di layar pembaca alih-alih tampil tanpa
animasinya.

## Gerbangnya

`apps/web/test/jalur-publik-sepakat.test.ts` (7 uji). Sebuah halaman publik baru
berguna bagi mesin pencari hanya bila **empat** hal benar sekaligus: rutenya ada
di `landingSeo.ts`, jalurnya terdaftar di `run_worker_first` **di kedua** berkas
wrangler, jalurnya diumumkan di `sitemap.xml`, dan rutenya ada di SPA.

Komentar di `landingSeo.ts` sudah memperingatkan ini sejak Fase 38d —
*"melewatkan salah satunya menghasilkan halaman yang tampak benar di peramban
tetapi kosong bagi perayap — kegagalan yang tidak berbunyi di gerbang mana pun."*
Peringatan itu tidak cukup; dua cacat berlawanan arah membuktikannya.

**Uji-negatif menemukan gerbangnya sendiri keliru.** Versi pertama menganggap
`/panduan/*` menutupi `/panduan`, sehingga ia LULUS untuk keadaan yang justru
harus ditolaknya. Pola bintang hanya menutupi rute berparameter; diperbaiki, dan
uji-negatifnya diulang sampai memerah pada aturan yang benar.

## Satu berkas hasil generate yang ternyata basi

`docs/panduan/*.md` dihasilkan `scripts/export-panduan-md.mjs`. Menjalankannya
setelah jalurnya diperbarui menghasilkan selisih di sebelas berkas — bukan dari
perpindahan ini, melainkan dari naskah peragaan yang pernah disunting tanpa
ekspornya ikut dijalankan ulang. Ikut diperbarui: berkas hasil generate yang
basi adalah bentuk lain dari dua tempat yang memikul satu kebenaran.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.310** (dari 1.300) |
| smoke | **1.367** (dari 1.362) |
| ui-sim | **506/506** (tidak berubah) |
| sapu-warna · istilah · gaya | 0 pelanggaran |
| sapu-i18n | tidak naik |
| tautan dokumen | lulus |
