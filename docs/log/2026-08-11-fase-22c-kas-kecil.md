# Fase 22c — Kas kecil sistem dana tetap

## Pemeriksaan kode lebih dulu

Baris roadmap 188 tanpa penanda status, dan memang belum ada apa pun:
`grep -i "kas kecil\|petty"` hanya menemukan baris roadmap itu sendiri. Untuk
sekali ini roadmapnya tidak salah menggambarkan keadaan.

Tetapi pemeriksaan itu memunculkan pertanyaan yang lebih penting: **apa
sebenarnya yang belum bisa dilakukan pemilik hari ini?** Ternyata hampir
semuanya sudah bisa. Ia dapat membuat akun kas kecil sendiri di daftar akun,
mencatat bon lewat Catat Transaksi, dan memindahkan uang lewat mode "pindah".

Jadi nilai fase ini **bukan** mencatat pengeluaran. Yang belum ada cuma tiga:
dana tetap, **jumlah pengisian yang dihitung** alih-alih diketik, dan opname
selisih kas. Fase ini sengaja dibatasi pada ketiganya.

## Yang dikerjakan

- `hitungPengisianKasKecil()` & `hitungSelisihKas()` — fungsi murni di
  `packages/shared/src/accounting.ts`.
- Migrasi `0044_kas_kecil_dana_tetap`: akun sistem `1-1050 Kas Kecil` &
  `5-4900 Selisih Kas`.
- Empat endpoint di `apps/api/src/routes/financeExtras.ts`: baca status, setel
  dana tetap, isi ulang, opname.
- Kartu kas kecil dwibahasa di `apps/web/src/pages/kasbank.tsx`.
- Seed demo: dana tetap Rp 2 juta + dua bon, supaya kas kecil hidup di layar
  yang dilihat setiap calon pelanggan.

## Empat keputusan yang menentukan bentuknya

**1. Bon dijurnal saat DICATAT, bukan ditahan sampai pengisian.** Ini menolak
sistem imprest tekstual, dan alasannya tunggal: menahan bon berarti laba rugi
salah sepanjang periode antar-pengisian. Konsekuensinya bagus — pengisian ulang
jadi **pemindahan murni** yang tidak menambah beban sama sekali, sehingga
**hitung-ganda mustahil secara konstruksi**, bukan lewat penjagaan yang bisa
lupa dipasang.

**2. Jumlah pengisian dihitung SERVER, tidak diterima dari klien.** Layar yang
saldonya sudah basi akan mengisi kotak melebihi dana tetapnya — dan kelebihan
itu tidak melanggar satu pun aturan double-entry, jadi tak ada gerbang akuntansi
yang akan menangkapnya.

**3. Tidak ada tabel baru.** Daftar bon SUDAH berupa buku besar `1-1050`, dan
halaman mutasi kas/bank yang ada sudah menampilkannya. Tabel register tersendiri
berarti dua daftar yang bisa berbeda isi. Dana tetap & tanggal pengisian
terakhir cukup di `settings`.

**4. `5-4900 Selisih Kas` satu akun untuk kedua arah.** Memisahkannya jadi beban
dan pendapatan menyembunyikan angka yang paling ingin dilihat pemilik: selisih
**bersih** setahun. Konsekuensi jujurnya dinyatakan di sini — bila sepanjang
periode kotaknya lebih sering berlebih, baris ini tampil sebagai **beban
negatif** di laba rugi. Itu penyajian yang benar, bukan kesalahan.

## Migrasinya memakai `INSERT OR IGNORE`, dan itu disengaja

`accounts.code` UNIQUE, dan `1-1050` justru kode yang paling mungkin **sudah
dibuat sendiri** oleh tenant lama untuk kas kecil mereka. `INSERT` biasa akan
melempar dan menggagalkan SELURUH migrasi tenant itu — cara paling mahal untuk
kalah pada tebakan kode akun.

Karena itu akunnya dicari lewat **kode**, bukan id tetap, dan **tipenya
diperiksa** sebelum dipakai: akun `1-1050` yang ternyata bukan aset ditolak
dengan pesan jelas, bukan dipakai diam-diam untuk menjurnal.

## Yang benar-benar dijaga: arah, bukan keseimbangan

Jurnal pengisian maupun jurnal selisih **selalu seimbang** — termasuk pada arah
yang terbalik dan pada jumlah yang salah. Neraca saldo hijau pada semua desain
yang keliru. Yang membedakan hanya dua invarian saldo:

1. sesudah pengisian, saldo buku besar `1-1050` **== dana tetap**, persis;
2. sesudah opname, saldo buku besar `1-1050` **== hitungan fisik**, persis.

Ditambah satu penjaga anti hitung-ganda: **total beban tidak boleh berubah**
saat pengisian ulang.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **382** (dari 369) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1020** (dari 997) |
| `node scripts/ui-sim.mjs` | 0 | **311/311** (dari 305) |
| `sapu-i18n` | 0 | utang atribut tetap **0**; utang layar 158 → **138** |

13 uji unit baru, 23 cek smoke (blok `11l3`), 6 cek ui-sim (`F41a`–`F41f`).

**Dibuktikan bisa gagal**, keduanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| arah `hitungSelisihKas` dibalik | invarian smoke merah (`→ 1520000`, seharusnya `1480000`) sementara cek **`22c neraca saldo tetap seimbang` TETAP HIJAU** — bukti langsung bahwa neraca saldo tidak menjaga apa pun di sini; 3 uji unit ikut merah |
| `kekurangan` selalu = dana tetap (desain naif "isi penuh") | ui-sim **308/310**: `F41b` (`→ Rp 2.000.000`, seharusnya 750.000) & `F41c` merah |

## Tiga temuan yang mengubah kode, bukan cuma ceknya

**1. Takaran terbalik** (pemeriksaan mata). Bilah kemajuan semula terisi sebesar
porsi yang **habis**: 38% terisi sementara kotaknya masih berisi 62%.
Bersebelahan dengan angka "Perlu diisi", itu terbaca sebagai "tinggal segini".
Sebuah takaran bahan bakar menunjukkan yang tersisa, bukan yang sudah habis.
Dibalik, dan arahnya dikunci `F41f` (`aria-valuenow=62`).

**2. `F1c` jadi tidak deterministik.** Query kas kecil menambah satu permintaan
ke halaman yang sama, dan jeda tetap 900 ms kadang habis sebelum kartu
rekonsiliasi ter-render — ceknya merah karena **lambat**, bukan karena
terjemahannya, yaitu kelas kegagalan yang paling membingungkan untuk ditelusuri
orang berikutnya. Diganti `waitFor()` eksplisit. Ini ketahuan hanya karena jalan
pemeriksaan mata kebetulan lebih lambat; jalan sebelumnya hijau.

**3. Penyapu i18n dipersempit pada `id=`/`htmlFor=`** (utang 164 → **138**).
`htmlFor="kk-dana-tetap-input"` terhitung utang hanya karena kata "dana",
padahal string itu tak pernah dibaca siapa pun — ia menyambungkan `<label>` ke
`<input>`. Utang yang, kalau "dibayar", justru **merusak aksesibilitas**. Kelas
yang sama dengan `data-*` di Fase 22a, dan sudah lama ada di angkanya
(`csv-mutasi`, `bank-recon` sudah terhitung sejak sebelum fase ini).

**Dibuktikan tidak membutakan**: berkas uji berisi teks `<label>`,
`placeholder`, `title`, dan `aria-label` berbahasa Indonesia tetap terhitung
seluruhnya (LAYAR=3 ATRIBUT=3); hanya kedua pengenal yang dilewati.

## Catatan kejujuran

**Uji simetri tidak menangkap pembalikan tanda.** Di bawah sabotase arah, uji
`"arahnya tidak simetris — menukar argumen membalik tandanya"` tetap **hijau**:
`f(a,b) === -f(b,a)` benar pada kedua arah. Yang menangkapnya adalah uji yang
menyebut arahnya secara harfiah ("fisik lebih sedikit → kurang"). Uji yang
menguji *bentuk* rumus tidak bisa menggantikan uji yang menguji *artinya*.

**Nilai `F41f` sempat saya tulis 63.** `Math.round(37,5)` = 38 di JavaScript
(pembulatan ke atas), jadi sisanya 62. Ceknya merah karena ekspektasi saya yang
salah, bukan kodenya — dan itu justru bukti ceknya mengukur sesuatu yang nyata.

## Yang TIDAK dikerjakan, dinyatakan apa adanya

- **Hanya satu kas kecil per tenant.** Perusahaan dengan beberapa cabang atau
  beberapa pemegang kas kecil butuh beberapa dana — itu tabel tersendiri dan
  pekerjaan tersendiri. Tidak dikarang seolah sudah ada.
- **Tidak ada persetujuan (approval) untuk pengisian ulang.** Pengisian
  memindahkan uang antar akun milik sendiri, jadi risikonya berbeda dengan
  pembelian; bila nanti diinginkan, jalurnya sudah ada lewat mesin persetujuan
  Fase 20.
- **Opname tidak mengunci apa pun.** Dua opname pada tanggal yang sama sah-sah
  saja dan keduanya berjurnal. Sama dengan utang revaluasi berulang Fase 22a —
  tidak merusak angka, tetapi mengotori buku besar.
