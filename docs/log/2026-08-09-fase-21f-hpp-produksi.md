# Fase 21f — Overhead & tenaga kerja masuk HPP produksi

Baris roadmap 374 akurat: produksi menghitung biaya **hanya dari bahan**. Upah
tukang dan listrik pabrik tak pernah sampai ke nilai barang jadi, sehingga HPP
saat barang itu terjual selalu lebih rendah dari yang sebenarnya.

## Yang dikerjakan

- `hitungBiayaProduksi()` di `packages/shared/src/ops.ts` — fungsi murni yang
  dipakai bersama kalkulator HPP layar Alat Bantu dan jurnal produksi.
- `labourCost`/`overheadCost` di perintah produksi (skema, kolom DB, form).
- Akun kontra-beban baru **`5-2100 Beban Produksi Diserap`** (migrasi `0043`).
- Jurnal penyerapan di `POST /production-orders/:id/complete`.

## Yang paling mudah salah di fase ini — dan bukan soal keseimbangan

Sebelum fase ini produksi **tidak memposting jurnal sama sekali**, dan itu
benar: bahan keluar senilai X, barang jadi masuk senilai X, jadi total nilai
persediaan tidak berubah dan buku besar tetap cocok dengan `stock_levels`.

Begitu biaya konversi ikut dikapitalisasi, nilai `stock_levels` **naik**. Tanpa
jurnal, buku besar Persediaan tertinggal dan kedua angka itu berpisah diam-diam
— sementara **neraca saldo tetap seimbang**, karena memang tak ada jurnal yang
dibuat untuk diperiksa.

Sisi kreditnya sengaja kontra-beban, bukan kas: gaji dan listriknya **sudah**
dibayar dan **sudah** dibebankan lewat jurnal penggajian dan biaya operasional.
Mengkreditnya di sini membatalkan beban itu sebatas yang terserap. Tanpa itu,
biaya yang sama dihitung dua kali — sekali di laba rugi, sekali lagi di nilai
persediaan.

Selisih antara beban aktual dan yang terserap tetap tertinggal di laba rugi.
Itu bukan kelalaian: selisih serapan memang informasi yang harus terlihat.

### Cek yang menjaganya, dan mengapa neraca saldo tidak cukup

Ceknya membandingkan **dua angka yang harus bergerak bersama**: kenaikan nilai
`stock_levels` dan kenaikan saldo buku besar Persediaan — keduanya wajib naik
Rp 400.000, sementara bahan Rp 440.000 hanya berpindah bentuk.

Dibuktikan: jurnal penyerapan dilumpuhkan → dua cek merah
(`buku besar Persediaan IKUT naik 400rb → 0`, `kontra-beban dikredit → 0`),
sedangkan cek **"neraca saldo TETAP seimbang" tetap HIJAU**. Itu persis
alasannya cek invarian ini ada.

## Biaya diisi sebatch, bukan per unit

Pemilik UKM menghitung "upah tukang hari ini Rp 300rb untuk 200 bungkus", bukan
"Rp 1.500 per bungkus". Pembagian per unitnya urusan sistem, dan sisa
pembulatannya dikembalikan `hitungBiayaProduksi()` supaya terhitung, bukan
hilang diam-diam.

Kalkulator HPP di `pages/alat.tsx` **dibiarkan** — ia alat hitung cepat, bukan
jalur posting. Tetapi rumusnya kini satu fungsi dengan jurnalnya, sehingga
kalkulator dan pembukuan tidak akan pernah menjawab berbeda.

## Temuan pemeriksaan mata

Halaman Manufaktur masih menyisakan Indonesia di mode Inggris pada **label
medan dan sel tabel**: `Komponen`, `Aksi`, `Kode`, `Tarif/jam (Rp)`,
`Perintah produksi`, dan status `selesai`/`draf`.

Cek `F1h` yang sudah ada memeriksa **judul kartu** (`Bill of materials (BoM)`,
`Production routing`) dan karenanya hijau sepanjang waktu — kebocoran setingkat
medan lolos di bawahnya. Ditambahkan `F37c` yang memeriksa label medan, bukan
judulnya.

Dua kunci yang hendak saya tambahkan (`kode`, `statusDraf`) ternyata **sudah
ada** di kamus; `tsc` menangkapnya lewat TS1117 dan keduanya dipakai ulang
alih-alih digandakan.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **349** (dari 343) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **978** (dari 969) |
| `node scripts/ui-sim.mjs` | 0 | **299** (dari 296) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

Enam uji unit baru, sembilan cek smoke (blok `11o1b`), tiga cek ui-sim
(`F37a`–`F37c`).

**Dibuktikan bisa gagal**, semuanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| jurnal penyerapan dilewati | GL Persediaan tidak naik (`→ 0`) + kontra-beban tidak dikredit (`→ 0`) — **neraca saldo tetap hijau** |
| isian upah dilepas dari form | `F37a` |
| keterangan EN disamakan dengan ID | `F37b` |
| kunci EN `tarifPerJam` disamakan dengan ID | `F37c` |

Jumlah akun COA naik 23 → **24** karena akun kontra-beban baru; dua asersi yang
mengunci angkanya ikut dinaikkan, dengan alasan ditulis di komentarnya.

**Pemeriksaan mata** lewat `UI_SIM_SHOT`, mode Inggris **dan** Indonesia — dari
situlah temuan i18n di atas berasal. Blok tangkapan sementara sudah dihapus.
