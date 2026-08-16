# Fase 22a — Revaluasi saldo valas akhir periode

Pembuka Fase 22. Sampai fase ini selisih kurs hanya dijurnal **saat pelunasan**,
sehingga laporan akhir bulan perusahaan ber-valas menampilkan piutang & hutang
pada kurs faktur — kurs yang bisa berbulan-bulan lampau.

## Pemeriksaan kode lebih dulu — roadmap akurat kali ini

Baris 317–318 & 328 menggambarkan keadaan dengan benar. `computeForexSettlement()`
(`lib/commercePosting.ts:215`) dipanggil dari **satu** tempat saja,
`routes/commerce.ts:379` — jalur pelunasan. Tidak ada revaluasi periodik di mana
pun; `grep -i revalu` hanya menemukan revaluasi **aset tetap** (Fase 20e).

Setelah lima kali roadmap salah menggambarkan keadaan, kali ini tidak ada yang
perlu dikoreksi. Dicatat karena kebalikannya juga layak dicatat.

## Yang dipakai ulang, bukan dibuat baru

| Sudah ada | Dipakai untuk |
| --- | --- |
| `currencies.rate` (Fase 2r) | kurs penutup — angka yang sama dengan yang terlihat di layar Mata Uang |
| `4-3000 Laba Selisih Kurs` & `5-6000 Rugi Selisih Kurs` | sisi laba-rugi |
| `postJournal()` + `PeriodLockedError` | posting + gerbang tutup buku |

## Yang paling mudah salah: selisih kurs terhitung DUA KALI

Piutang & hutang disimpan dalam **IDR pada kurs faktur**: `invoices.total`
adalah `valas × exchange_rate`, dan pelunasan menguranginya sebesar
`round(valas × kursFaktur)`. Buku besar Piutang karena itu selalu sama dengan
jumlah sisa faktur pada kurs faktur — dan `computeForexSettlement()`
mengandalkan tepatnya hubungan itu untuk menghitung selisih kurs **terealisasi**.

Kalau revaluasi ini dibiarkan permanen, dua hal rusak sekaligus:

1. GL Piutang berpisah dari subledger faktur — **diam-diam**, karena neraca
   saldo tetap seimbang pada kedua desain;
2. saat faktur itu akhirnya dilunasi, `docRate` tidak berubah, sehingga selisih
   yang sudah diakui di sini diakui **untuk kedua kalinya**.

Karena itu revaluasinya **dibalik otomatis pada H+1**. Konsekuensi yang membuat
desain ini murah: jalur pelunasan **tidak disentuh satu baris pun**, jadi tidak
ada risiko regresi pada perhitungan yang sudah benar sejak Fase 2r.

### Cek yang menjaganya — dan mengapa neraca saldo tidak cukup

Ceknya membandingkan **GL Piutang sesudah tanggal pembalik** dengan nilainya
sebelum revaluasi: keduanya wajib sama persis.

Dibuktikan: jurnal pembalik dilumpuhkan → cek itu **merah**
(`35.604.500 vs 37.604.500` — GL tertinggal 2 juta di atas subledger, permanen),
sedangkan cek **"neraca saldo tetap seimbang" tetap HIJAU**. Itu persis alasan
invarian ini ada, dan pola yang sama dengan Fase 21f.

Catatan kejujuran atas pembuktian itu: cek "menghasilkan jurnal utama DAN
pembalik" **tetap hijau** saat disabotase, karena sabotase saya mengembalikan
nomor jurnal palsu. Pada regresi sungguhan (panggilan `postJournal` dihapus)
nomornya `undefined` dan cek itu ikut merah — tetapi yang benar-benar menangkap
kelas kesalahan ini adalah invarian GL-vs-subledger, bukan cek keberadaan nomor.

## Tanda yang paling mudah terbalik

Kenaikan kurs membuat **piutang** lebih berharga (laba) tetapi **hutang** lebih
memberatkan (rugi). `ringkasRevaluasiValas()` memisahkan keduanya dan diuji dari
kedua sisi, termasuk kasus "hanya hutang yang naik → laba bersih negatif".

## Sisa risiko yang dinyatakan, bukan disembunyikan

- **Pembulatan.** Sisa valas dipulihkan lewat `sisaIdr / kursFaktur`, jadi ada
  sisa sub-rupiah pada faktur yang sudah dicicil sebagian. `sisaValas`
  dikembalikan fungsi murni supaya terhitung, bukan hilang diam-diam.
- **Jalur periode-terkunci tidak diuji langsung dari rute ini.** Buku smoke
  terkunci s.d. 2026-07-10 sementara satu-satunya faktur valas bertanggal
  Agustus, jadi tanggal mana pun di dalam periode terkunci berhenti lebih dulu
  di "tidak ada saldo valas". Yang menanggung jalur itu adalah `postJournal()`
  yang sama — sudah diuji lewat closing-entry (409). Dinyatakan, bukan ditutup
  cek yang seolah menguji.
- **Revaluasi berulang pada tanggal yang sama tidak dicegah.** Menjalankannya
  dua kali menghasilkan dua pasang jurnal yang saling menghapus di H+1, jadi
  tidak merusak angka — tetapi mengotori buku besar. Belum ditangani.

## Temuan pemeriksaan mata

Dua temuan, satu milik fase ini dan satu bukan.

**Salah rujuk arah, milik fase ini.** Keterangan kartu berbunyi "…ke kurs
penutup **di atas**", padahal daftar kurs justru berada **di bawah** kartu ini;
yang di atas adalah form tambah/perbarui kurs. Kalimat yang menunjuk ke tempat
yang salah lebih buruk daripada kalimat yang tidak menunjuk sama sekali —
pemilik akan mencari angka yang tidak ada di sana. Diubah menjadi "…memakai
kurs pada daftar mata uang di bawah" (ID & EN).

**Format tanggal, BUKAN milik fase ini.** Isian tanggal menampilkan
`08/10/2026` — urutan bulan/hari ala Amerika — di halaman berbahasa Indonesia,
sehingga terbaca "8 Oktober" padahal maksudnya 10 Agustus. Penyebabnya
`<input type="date">` yang formatnya ditentukan **locale peramban**, bukan
aplikasi; seluruh isian tanggal di aplikasi ini berperilaku sama sejak lama.
Memperbaikinya berarti mengganti seluruh isian tanggal dengan komponen sendiri
— pekerjaan tersendiri yang menyentuh puluhan layar. **Dicatat, tidak
dikerjakan di sini**, supaya tidak hilang.

## Penyapu i18n dipersempit untuk ketujuh kalinya — nilai atribut `data-*`

`data-testid="reval-hasil"` terhitung utang layar hanya karena "hasil" ada di
kosakata penanda. Menerjemahkannya justru akan **merusak** cek yang memakainya.

Kelas positif-palsu yang sama dengan atribut `${…}` (21e) dan kunci objek (21g):
memperbaiki kode malah menaikkan angka utang. Penyapu kini melewati nilai
atribut `data-*` — dan **hanya** `data-*`: `aria-label` memang teks tampilan
(dibacakan pembaca layar) dan tetap dijaga.

Dibuktikan tidak membutakan: pada berkas uji, `data-testid` dilewati sementara
`aria-label`, `title`, dan teks isi tetap terlaporkan. Total utang layar turun
**163 → 158**.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **361** (dari 353) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **993** (dari 982) |
| `node scripts/ui-sim.mjs` | 0 | **304** (dari 302) |
| `sapu-i18n` | 0 | utang atribut tetap **0** (utang layar 163 → **158**) |

Delapan uji unit baru, sebelas cek smoke (blok `11l2`), dua cek ui-sim
(`F39a`, `F39b`).

**Dibuktikan bisa gagal**, semuanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| jurnal pembalik dilewati | `22a SESUDAH pembalik, GL Piutang kembali ke kurs faktur` (`35.604.500 vs 37.604.500`) — **neraca saldo tetap hijau** |
| kunci `descRevaluasiValas` dikosongkan | `F39b` (kalimat pembalik hilang dari layar) |

## Catatan kejujuran

**Tiga kesalahan saya, ketiganya ditangkap gerbang, ketiganya soal CEK bukan produk.**

1. *Endpoint yang tidak pernah ada.* Cek smoke pertama saya memanggil
   `/reports/profit-loss` — yang tidak ada di repo ini; namanya
   `/reports/income-statement`. `tsc` diam saja karena URL hanyalah string, dan
   ceknya "gagal" dengan angka 0 seolah fiturnya yang salah. Pelajaran yang sama
   dengan SQL di bawah: **typecheck tidak menjangkau string**.
2. *Nama kolom SQL dikarang.* Query pertama memakai `doc_no`, `doc_date`, dan
   `status != 'void'`. Ketiganya salah — kolomnya `invoice_no`/`purchase_no`,
   `invoice_date`/`purchase_date`, dan pembatalan ditandai `voided_at`.
   `pnpm typecheck` **hijau** pada versi yang salah itu.
3. *Blok cek ditaruh di tempat yang merusak tetangganya.* `F39` semula
   disisipkan di tengah rangkaian halaman Pengaturan; `gotoRoute` ke halaman
   Mata Uang membuat dua cek sesudahnya (`F35c`, `F18`) merah karena isi
   halamannya sudah berganti. Dipindahkan ke batas yang aman — sesudah
   rangkaian F19 selesai.

Ketiganya kelas yang sama: **alat hanya membuktikan yang diukurnya**. Yang
menangkap ketiganya adalah menjalankan gerbangnya, bukan membacanya.
