# Fase 22f — Proyeksi arus kas 30/60/90 hari

Penutup Fase 22. Laporan arus kas yang sudah ada menjawab "ke mana uang saya
pergi"; fase ini menjawab pertanyaan yang justru lebih sering ditanyakan pemilik
UKM: **"apakah uang saya cukup bulan depan?"**

## Yang dikerjakan

- `proyeksikanArusKas()` — fungsi murni di `packages/shared/src/accounting.ts`.
- `GET /:tenantId/reports/cash-projection` (**baca-saja**) di
  `apps/api/src/routes/reports.ts`.
- Kartu proyeksi di halaman Arus Kas, tepat di bawah laporan historisnya —
  keduanya dibaca berurutan, jadi tidak dipisah ke halaman lain.

## Tiga keputusan yang menentukan angkanya

**1. Tagihan yang sudah lewat tempo TETAP dihitung**, masuk ember pertama.
Membuangnya membuat proyeksi terlihat lebih buruk daripada kenyataan; menaruhnya
di embernya sendiri membuat ini bukan proyeksi lagi. Jumlahnya dilaporkan
terpisah supaya pemilik tahu berapa banyak angka ini bersandar pada tagihan yang
sudah macet — di data demo, **13 tagihan**.

**2. Hanya SATU faktur kontrak berikutnya yang diproyeksikan**, bukan seluruh
sisa masa kontrak. Memproyeksikan semuanya berarti mengarang pendapatan
berbulan-bulan ke depan dari kontrak yang bisa dihentikan kapan saja — angka
besar yang terasa meyakinkan justru karena besarnya.

**3. Akun kas dipilih dari KODE, bukan dari nama.** Halaman Kas & Bank memakai
heuristik nama (`/kas|bank/i`) yang boleh saja longgar untuk daftar saldo;
untuk laporan, akun bernama "Bank Garansi" — yang bukan kas — akan menggeser
seluruh proyeksinya.

## Cacat yang ditemukan pemeriksaan mata — dan usianya lebih tua dari fase ini

Kartu proyeksi berdampingan dengan laporan arus kas di satu layar, dan keduanya
menyebut saldo kas yang **berbeda**: Rp 81.217.104 vs Rp 93.467.104.

Penyebabnya dua, dan yang pertama sudah ada sejak Fase 22c:

**a. Laporan arus kas memakai `1-1000, 1-1100` saja.** `1-1050 Kas Kecil` yang
ditambahkan Fase 22c **tidak pernah dimasukkan**, sehingga uang yang dipindahkan
ke kas kecil hilang dari laporan arus kas dan saldo akhirnya terlalu kecil
sebesar isi kotak. Tidak ada gerbang yang menangkapnya karena **tidak ada satu
pun cek yang membandingkan kedua angka itu** — masing-masing benar menurut
definisinya sendiri.

**b. Saldo awal proyeksi menjumlahkan SELURUH jurnal terposting**, termasuk yang
bertanggal masa depan. Jurnal semacam itu terhitung **dua kali**: sekali di
saldo awal, sekali lagi sebagai arus yang diproyeksikan. Ini cacat milik fase
ini sendiri.

Keduanya diperbaiki: satu konstanta `KODE_AKUN_KAS` dipakai kedua laporan, dan
saldo awal dibatasi sampai hari ini.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **441** (dari 427) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1057** (dari 1048) |
| `node scripts/ui-sim.mjs` | 0 | **325/325** (dari 322) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

14 uji unit baru, 9 cek smoke (blok `11n4`), 3 cek ui-sim (`F44a`–`F44c`).

**Dibuktikan bisa gagal**, semuanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| rantai saldo diputus (tiap ember dihitung ulang dari saldo awal) | uji unit `saldo akhir tiap ember BERANTAI` **dan** cek smoke `22f saldo akhir tiap ember BERANTAI` (`→ [24954000,-9680500,-6420500]`) |
| laporan arus kas diberi filter akun SENDIRI lagi (keadaan sebelum fase ini) | `22f INVARIAN: saldo akhir laporan arus kas == saldo awal proyeksi` (`→ -38709500 vs -36709500`, selisihnya persis pengisian kas kecil) |

## Catatan kejujuran

Pembuktian pertama untuk invarian silang-laporan **tidak membuktikan apa pun**.
Saya menyabotasenya dengan mengubah isi konstanta `KODE_AKUN_KAS` — padahal
konstanta itu kini dipakai **kedua** laporan, jadi keduanya bergeser bersamaan
dan tetap cocok. Ceknya hijau, dan sesaat itu terlihat seperti cek yang lemah.

Yang sebenarnya perlu disabotase adalah bentuk cacat aslinya: **dua filter yang
terpisah**. Setelah laporan arus kas diberi filter sendiri lagi, ceknya merah
dengan selisih yang persis sebesar pengisian kas kecil.

Pelajarannya berulang di repo ini dengan wajah baru: **sabotase yang salah
sasaran memberi rasa aman yang sama persis dengan penjaga yang bekerja.**

## Yang TIDAK dikerjakan, dinyatakan apa adanya

- **Perilaku bayar pelanggan tidak dimodelkan.** Proyeksi mengasumsikan setiap
  tagihan dibayar tepat pada tanggal jatuh temponya. Pelanggan yang biasa telat
  30 hari akan membuat ember pertama terlalu optimistis. Dinyatakan di layar.
- **Beban rutin (gaji, sewa, listrik) tidak diproyeksikan** — yang masuk hanya
  hutang yang sudah berupa tagihan. Untuk perusahaan bergaji besar, ember
  pertama karena itu terlalu optimistis untuk alasan kedua. Menambahkannya butuh
  pola beban berulang yang belum ada bentuk datanya.
- **Tidak ada skenario (optimis/pesimis).** Satu angka, satu asumsi, dinyatakan.
