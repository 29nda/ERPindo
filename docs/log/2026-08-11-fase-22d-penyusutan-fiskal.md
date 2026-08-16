# Fase 22d — Penyusutan saldo menurun & fiskal vs komersial

Menutup dua baris roadmap sekaligus (261 & 263). Keduanya menyentuh mesin yang
sama — `runDepreciation()` — jadi memisahkannya jadi dua fase berarti membongkar
mesin itu dua kali.

## Yang dikerjakan

- `penyusutanBulanan()`, `ringkasPenyusutanFiskal()`, dan tabel `KELOMPOK_HARTA`
  (UU PPh Pasal 11) di `packages/shared/src/hr.ts`.
- Migrasi `0045`: kolom `depreciation_method`, `tax_group`, `tax_method`.
- `runDepreciation()` memakai fungsi murni itu, dengan metode per aset.
- `PATCH /assets/:id/tax` untuk menyetel aset yang sudah ada.
- `GET /assets/tax-depreciation` — laporan **baca-saja** komersial vs fiskal.
- Kartu "Penyusutan fiskal vs komersial" + pemilih metode & kelompok harta di
  `apps/web/src/pages/assets.tsx`; seed demo diberi kelompok harta.

## Dua titik yang paling mungkin salah — dinyatakan di muka, bukan ditemukan belakangan

**1. Saldo menurun tidak pernah SELESAI.** Rumusnya asimtotik: berapa pun
lamanya dijalankan, selalu tersisa sebagian nilai buku. Tanpa aturan penutup,
daftar aset menumpuk jurnal receh selamanya dan aset yang jelas-jelas sudah
habis tidak pernah tutup buku. Ini **sifat rumusnya**, bukan kesalahan
pembulatan, jadi ditangani di rumusnya: mengikuti praktik fiskal Indonesia, pada
**bulan terakhir masa manfaat seluruh sisa disusutkan sekaligus**.

Angkanya: tanpa aturan itu, aset Rp 12.000.000 bermasa 24 bulan hanya mencapai
akumulasi **Rp 10.513.189** setelah 24 bulan penuh — 12% nilainya menggantung.

**2. Angka fiskal tidak boleh DIJURNAL.** Buku besar memuat penyusutan
komersial; yang fiskal cuma memo untuk merekonsiliasi laba komersial ke laba
fiskal di SPT. Kalau ia ikut dijurnal, asetnya tersusut dua kali — dan karena
jurnalnya tetap seimbang, **neraca saldo tidak akan menangkapnya sama sekali**.
Rutenya karena itu baca-saja, dijaga invarian eksplisit: membaca laporan fiskal
tidak boleh mengubah saldo `1-1510 Akumulasi Penyusutan`.

## Tiga keputusan kecil yang menentukan hasilnya

**Umur fiskal berasal dari kelompok harta, bukan dari masa manfaat komersial.**
Itulah inti "berdampingan": mesin yang komersialnya disusutkan 5 tahun bisa saja
fiskalnya 4 tahun (Kelompok 1). Kalau umurnya ikut komersial, kolom fiskalnya
cuma salinan — laporan yang terlihat bekerja tanpa menghitung apa pun.

**Fiskal tidak mengenal nilai residu.** Seluruh harga perolehan disusutkan
habis. Ini salah satu sumber koreksi fiskal yang paling sering terlewat.

**`tax_group` NULL berarti "belum diatur", bukan "fiskalnya nol".** Keduanya
keadaan berbeda; menyamakannya membuat koreksi fiskal diam-diam salah. Aset
tanpa kelompok dihitung terpisah lewat `tanpaKelompok` dan ditampilkan sebagai
peringatan di layar.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **404** (dari 382) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1036** (dari 1020) |
| `node scripts/ui-sim.mjs` | 0 | **316/316** (dari 311) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

22 uji unit baru, 16 cek smoke (blok `11n2`), 5 cek ui-sim (`F42a`–`F42e`).

**Dibuktikan bisa gagal**, keduanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| aturan penutup saldo menurun dilepas | 3 uji unit merah, terutama `TERMINASI: bulan terakhir menghabiskan sisa nilai buku` (`→ 10.513.189`, seharusnya 12.000.000) |
| laporan fiskal menyamakan fiskal dengan komersial | ui-sim **314/315**: `F42b` merah (`→ komersial=Rp 3.000.000 fiskal=Rp 3.000.000`), sementara `F42a`, `F42c`, `F42d` **tetap hijau** — kegagalannya benar-benar terisolasi |

## Dua koreksi sepanjang jalan, keduanya ditemukan gerbang yang sudah ada

**1. Aturan penutup semula ikut berlaku untuk garis lurus.** Uji
`apps/api/test/depreciation.test.ts` yang sudah ada langsung merah: aset bermasa
6 bulan yang baru disusutkan pada bulan ke-7 tiba-tiba menyapu seluruh sisanya
(total 3jt → 8jt). Artinya perubahan ini akan **menggeser angka aset lama yang
penyusutannya sempat tertunda** — persis hal yang fase ini janjikan tidak
terjadi.

Aturannya dipersempit hanya ke saldo menurun. Garis lurus memang tidak
membutuhkannya: batas `Math.min(…, sisa)` sudah menyerap angsuran terakhir
dengan sendirinya.

Konsekuensi yang ikut ketahuan dan dinyatakan apa adanya: garis lurus
meninggalkan **sisa pembulatan** yang butuh satu angsuran kecil tambahan
(Rp 10.000.000 ÷ 7 bulan → akumulasi 9.999.997 setelah 7 bulan, sisa Rp 3 di
bulan ke-8). Itu perilaku **sejak sebelum fase ini** dan sengaja tidak diubah.
Uji saya semula menyatakan sebaliknya — ekspektasinya yang salah, bukan kodenya.

**2. `monthlyDepreciation` semula dihitung dari kalender.** Ia memakai bulan
berjalan menurut jam dinding, sehingga ceknya akan berubah sendiri begitu waktu
nyata melewati akhir masa manfaat aset uji — bom waktu yang meledak jauh setelah
siapa pun ingat kenapa. Diganti memakai **banyaknya angsuran yang sudah
diposting**, yang sekaligus lebih benar: aset yang penyusutannya tertunda
beberapa bulan tidak lagi salah hitung.

## Dua temuan pemeriksaan mata

**1. Keterangan halaman menjanjikan lebih sedikit daripada yang ada.** Subjudul
halaman Aset masih berbunyi "penyusutan **garis lurus** otomatis tiap bulan"
padahal metodenya kini bisa dipilih. Keterangan yang meleset dari fiturnya
adalah kebalikan dari janji tak tertepati, tapi kelasnya sama: layar dan
kenyataan berbeda. Diperbarui di kedua bahasa.

**2. "Rp 944.444/bln" pada aset saldo menurun menyesatkan.** Angka itu mengecil
tiap bulan, sementara "/bln" terbaca sebagai janji angsuran sama besar sampai
lunas — pembaca akan mengalikannya dengan sisa bulan untuk menebak nilai buku
akhir dan meleset jauh. Baris aset saldo menurun kini menyebut "(saldo menurun,
angsuran berikutnya)", dijaga `F42e`.

## Yang TIDAK dikerjakan, dinyatakan apa adanya

- **Tidak ada jurnal koreksi fiskal otomatis.** Laporannya menyajikan angka
  koreksi; memasukkannya ke SPT tetap pekerjaan manual. Menjurnalkannya justru
  hal yang fase ini larang.
- **Kelompok harta tidak divalidasi terhadap jenis asetnya.** Sistem menerima
  "mobil = Kelompok 4" walau menurut PMK seharusnya Kelompok 2; yang ditegakkan
  hanya larangan saldo menurun untuk bangunan. Memetakan seluruh jenis harta ke
  kelompoknya adalah tabel PMK tersendiri, dan menebaknya lebih berbahaya
  daripada membiarkan pemilik memilih.
- **Penyusutan fiskal tidak memperhitungkan bulan perolehan secara pro-rata
  harian.** Perhitungannya per bulan penuh, sama dengan sisi komersialnya.
