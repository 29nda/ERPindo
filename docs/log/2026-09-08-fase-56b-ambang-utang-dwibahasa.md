# Fase 56b — angka utang dwibahasa yang akhirnya berarti (dan berambang)

## Yang ditutup

`scripts/sapu-i18n.mjs` melaporkan **35 utang teks layar**. Angka itu dikutip
`docs/03-roadmap-lanjutan.md` sebagai pekerjaan yang tersisa, dan sepanjang
Fase 38 tercatat "tidak naik".

Dua hal ternyata salah tentang angka itu, dan keduanya ke arah yang berbeda.

**Pertama: hampir semuanya bukan utang.** Diperiksa satu per satu, 34 dari 35
temuan adalah nilai enum kontrak API (`"pembelian"`, `"saldo_menurun"`), kunci
cache TanStack Query (`"bank-recon"`), nama berkas unduhan (`"produk.csv"`),
jalur impor (`"./stok"`), pesan galat untuk pengembang, contoh isi berkas CSV
yang justru diurai balik oleh importirnya, nama resmi formulir DJP, potongan
kerangka JSX, dan sisi Inggris pasangan dwibahasa yang sudah lengkap. Beberapa
di antaranya JUSTRU rusak kalau "dibayar": menerjemahkan kunci cache membuat
versi Inggris dan Indonesia memakai cache berbeda untuk data yang sama.

**Kedua: angkanya tidak dijaga apa pun.** CI menjalankan penyapu ini dengan
`> /dev/null` dan hanya peduli pada dua kelas bug (`{u()}` harfiah dan menu
tanpa padanan Inggris). Utang teks layar bisa naik tanpa ada yang tahu — jadi
catatan "tidak naik sepanjang Fase 38" benar karena kebetulan, bukan karena
dijaga.

Angka yang sebagian besar palsu dan tidak berambang adalah dua kegagalan yang
saling menutupi: tidak ada yang mau menurunkannya (karena isinya bukan utang),
dan tidak ada yang bisa melihat kalau ia naik.

## Yang dikerjakan

### 1. Penyapu dibuat jujur

Enam kelas pengecualian, tiap-tiapnya dengan alasan tertulis di tempatnya:

| Kelas | Contoh | Kenapa bukan naskah |
|---|---|---|
| `nilaiPengenalKecil` | `"pembelian"`, `"bank-recon"`, `"produk.csv"`, `"./stok"` | pengenal, bukan kalimat — dan menerjemahkannya memecah cache/kontrak API |
| `pesanPengembang` | `new Error("WorkspaceContext belum tersedia")` | meledak saat pengembangan, tidak pernah sampai ke pelanggan |
| `isiTemplateCsv` | `templateExample={["PT Pelanggan Setia", …]}` | kontrak berkas — importirnya mengurai balik nilainya |
| `contohBerkasCsv` | `"kode,debit,kredit\n1-1000,5000000,0…"` | contoh tempel yang akan DITOLAK kalau diterjemahkan |
| `sisiInggris` | nilai `en:` pasangan dwibahasa | sudah bahasa Inggris menurut definisinya |
| `sisaTanpaMarkup` | `role="dialog" aria-modal="true" aria-label=` | kerangka JSX, bukan yang dibaca orang |

Dua aturan lama ikut diperluas ke tempat yang seharusnya sudah tercakup:
`NETRAL` (daftar "sama di kedua bahasa") kini dihormati `isID`, bukan hanya
saringan atribut; dan pengenalan tabel dwibahasa kini juga memeriksa larik
wilayah kerja `AREAS` terhadap `SECTION_EN` — pemeriksaan **cakupan**, jadi
wilayah baru yang lupa diberi padanan Inggris tetap dilaporkan bolong.

`nilaiPengenalKecil` bukan keputusan baru: saringan `ATRIBUT_TAMPILAN` sudah
membuang `/^[a-z0-9-]+$/` sejak Fase 19t dengan alasan yang sama. Yang baru
hanyalah menerapkan keputusan itu di tempat kedua ia berlaku — kelas yang sama
dengan glob `pages/*.tsx` di Fase 20m: aturan yang benar, dipasang di sebagian
tempat saja.

### 2. Satu percobaan yang gagal, dan itu yang paling berguna

Versi pertama pengecualian markup **melewati seluruh potongan** yang memuat
pasangan `atribut="`. Angkanya turun rapi. Ia juga menyembunyikan ini:

```
</div> <table><thead><tr><th>Barang</th><th class="r">Jumlah</th></tr></thead>
```

— naskah surat jalan yang betul-betul dicetak dan dibaca pelanggan.

Cacatnya ketahuan karena penyapu BARU dijalankan atas kode LAMA (`dceaf80`,
impor basis kode) dan hasilnya dibandingkan butir demi butir dengan penyapu
lama. Sesudah diperbaiki, kerangkanya dibuang lalu **sisanya dinilai ulang**,
sehingga "Barang" dan "Jumlah" tetap tertagih.

### 3. Verifikasi anti-pembungkaman

Penyapu lama atas kode lama: **99**. Penyapu baru atas kode lama: **55**.
Empat puluh empat selisihnya diperiksa satu per satu; semuanya masuk kelas di
tabel atas. Yang penting, dua di antaranya — naskah cetak surat jalan — tadinya
ikut hilang, lalu kembali sesudah perbaikan di §2. Selisih itu yang membuktikan
pemeriksaannya bekerja.

### 4. Ambang

`AMBANG = { layar: 1, atribut: 0 }`, menyalin pola `sapu-warna.mjs` (Fase 31a):
gagal bila naik, dan menyarankan menurunkan ambangnya bila turun. CI tidak lagi
membuang keluarannya ke `/dev/null` — gerbang yang gagal tanpa memperlihatkan
temuannya memaksa orang menjalankan ulang di mesinnya sendiri.

Dibuktikan dengan menyuntik cacat: satu kalimat Indonesia ditambahkan ke
`mulai.tsx`, penyapu keluar dengan kode 1 dan menyebut angkanya (`2 > 1`).

### 5. Dua naskah yang memang utang

- `stok.tsx` — catatan baris usulan pembelian dirakit di dalam kode
  (`` `Stok ${qty} ≤ minimum ${min}` ``), padahal catatan induknya sudah lewat
  kamus. Catatan itu dibaca orang lain: yang menyetujui usulannya.
- `commerce.tsx` — pesan tagihan WhatsApp dirakit dari potongan yang disambung
  `+`. Bentuk yang sudah dilarang repo ini untuk toast sejak Fase 33h, dengan
  sebab yang sama: urutan katanya terkunci ke dalam kode dan bahasa lain tidak
  punya cara mengubahnya. Sekarang tiga kalimat utuh berlubang `{0}`.

## Yang sengaja TIDAK dikerjakan

Satu temuan tersisa, dan ambangnya menyebutkannya: `dashboard.tsx` membedah
judul notifikasi buatan server untuk mengambil nomor fakturnya —

```ts
n.title.replace("Faktur ", "").replace(" lewat jatuh tempo", "")
```

Itu bukan utang naskah melainkan **utang bentuk data**: seluruh lonceng
notifikasi (enam jenis, dengan `title`, `detail`, dan `waText`) disusun sebagai
kalimat Indonesia di `apps/api/src/routes/tenants.ts`, di luar jangkauan kamus
web. Pengguna berbahasa Inggris melihat lonceng dan kartu dasbornya tetap
berbahasa Indonesia, dan halaman web mengurai balik prosa server untuk
mendapatkan datanya. Memperbaikinya berarti mengubah bentuk `ApiNotification`
dan kedua pembacanya — **Fase 56c**, bukan tambahan pada fase ini.

Penyapu ini juga hanya menyapu `apps/web`. Itulah sebabnya utang server tadi
tidak pernah muncul di angkanya sama sekali; dicatat di sini supaya angka
"1" tidak dibaca sebagai "tinggal satu kalimat lagi".

## Validasi

| Gerbang | Hasil |
|---|---|
| `pnpm typecheck` | lulus |
| `pnpm test` | 1.325 unit test (+15) |
| `pnpm build` | lulus |
| `pnpm smoke` | 1.371 cek |
| `node scripts/ui-sim.mjs` | 507 cek |
| `pnpm lint` | lulus |
| `sapu-i18n` | 1 (ambang 1) — sebelumnya 35 tanpa ambang |
| `sapu-warna` | 0 / 0 |
| `sapu-istilah` | 0 pelanggaran |
| `sapu-gaya` | 0 (ambang 0) |
| `periksa-tautan-dokumen` | 89 tautan, semua hidup |

Lima belas unit test baru di `apps/web/test/sapu-i18n-tidak-membungkam.test.ts`
menjalankan penyapu atas berkas contoh dua belas kasus: sembilan yang harus
dilewati dan enam yang harus tetap tertagih — termasuk naskah yang bersembunyi
di dalam markup, bentuk yang paling mudah tertelan.

## Catatan kejujuran

Fase ini **menurunkan angka utang dari 35 ke 1 tanpa menerjemahkan 34 kalimat**.
Itu bentuk yang paling mudah disalahpahami sebagai kemajuan palsu, dan memang
hampir menjadi begitu: percobaan pertamanya betul-betul menyembunyikan naskah
cetak. Yang membedakan hasil akhirnya dari pembungkaman bukan niat, melainkan
pembandingan di §3 dan uji di §5 — keduanya bisa diulang siapa pun.
