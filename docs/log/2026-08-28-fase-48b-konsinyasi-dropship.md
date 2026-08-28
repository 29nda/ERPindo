# Fase 48b — Konsinyasi & dropship

## Yang dikerjakan

Dua pola dagang yang lazim di Indonesia dan sama-sama belum ada. Keduanya
melanggar asumsi bawaan faktur penjualan — bahwa barangnya ada di gudang kita —
tetapi melanggarnya ke arah yang berlawanan.

- Migrasi `0057_konsinyasi_dropship` — `warehouses.is_consignment`,
  `partner_contact_id`, `invoices.is_dropship`, `invoice_lines.unit_cost`.
- `apps/api/src/lib/commercePosting.ts` — dropship melewati mutasi stok dan
  mengakui HPP dengan lawan Utang Usaha.
- `apps/web/src/pages/commerce.tsx` — penanda dropship + medan harga pokok
  per baris; `masterdata.tsx` — penanda gudang konsinyasi + mitranya.

## Keputusan dan alasannya

**Konsinyasi dimodelkan sebagai GUDANG bertanda, bukan mekanisme baru.** Barang
titipan di toko mitra masih milik kita sampai terjual, dan itu persis arti
"stok kita yang berada di lokasi lain" — yaitu gudang. Konsekuensinya seluruh
mesin yang sudah ada langsung berlaku: membeli langsung ke sana, memindahkan
ke sana, dan menjual dari sana semuanya bekerja tanpa satu baris kode baru.
Membuat mekanisme tersendiri akan menduplikasi semuanya tanpa alasan.

**Dropship kebalikannya: barangnya TIDAK PERNAH masuk gudang kita.** Karena itu
fakturnya tidak boleh menggerakkan stok — bila digerakkan, stok jadi minus
atau, lebih buruk, fakturnya ditolak karena stok kurang padahal transaksinya
sah.

**HPP dropship tetap diakui, tetapi lawannya Utang Usaha — BUKAN Persediaan.**
Kita tidak pernah punya persediaannya; mengkredit persediaan akan membuatnya
minus atas barang yang tidak pernah kita simpan. Yang bertambah adalah utang
kepada pemasok yang mengirimkannya.

**Harga pokok dropship diisi tangan per baris.** Ia tidak bisa diambil dari
harga rata-rata persediaan: barangnya tidak pernah ada di persediaan kita, jadi
rata-ratanya tidak bermakna.

## Catatan kejujuran

**Uji "dropship tidak menggerakkan stok" tidak berdiri sendiri.** Uji semacam
itu akan tetap lulus seandainya penjaga stok mati sepenuhnya. Karena itu ia
dipasangkan dengan uji bahwa faktur BIASA atas barang berstok nol tetap
ditolak — di uji unit maupun di smoke. Yang membuktikan dropship bekerja adalah
pasangannya, bukan uji itu sendiri.

**Uji konsinyasi pertama saya menulis mutasi stok dengan tangan**, memakai kolom
`moved_at` yang tidak ada dan `ref_type: 'transfer'` yang tidak lolos CHECK
constraint. Ditulis ulang memakai jalur sungguhan (beli ke gudang konsinyasi,
lalu jual dari sana) — yang justru lebih baik, karena itulah yang benar-benar
dilakukan pengguna.

**Cek smoke saya memakai pelanggan sebagai pemasok** dan ditolak "Kontak
tersebut bukan pemasok". Penjaga yang benar, data uji yang salah — pola yang
sama seperti batas kredit di Fase 44a.

**Cek ui-sim saya mencari medan di halaman tanpa membuka Lembar-nya.** Editor
faktur pindah ke Lembar sejak Fase 38t; medannya baru ada di DOM setelah
lembarnya dibuka. Playwright menunggu 15 detik lalu menghentikan seluruh
ui-sim.

**`ui-kunci-mati` menangkap empat kunci kamus** — dan kali ini penyebabnya
bukan kelalaian menulis: tiga di antaranya untuk gudang konsinyasi yang
UI-nya memang belum saya buat. Membiarkannya berarti konsinyasi hanya bisa
dipakai lewat API, yaitu persis "fitur yang dijanjikan tetapi tidak bisa
dijangkau" — kelas yang ditutup Fase 42b. Formulir gudangnya dibuat.
**Ini ketiga kalinya** gerbang kunci-mati menangkap saya, setelah Fase 45 dan
46.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **1.113 lulus** (412 shared + 366 web + 335 api; naik dari 1.104)
- `pnpm build` — lulus
- `pnpm smoke` — **1.299 cek** (naik dari 1.289; 10 cek konsinyasi & dropship)
- `node scripts/ui-sim.mjs` — **474/474** (naik dari 469; 4 cek)
- `pnpm lint` — bersih
- `sapu-i18n` 53 (tetap), `sapu-warna` 0, `sapu-istilah` bersih,
  `sapu-gaya` bersih, `periksa-tautan-dokumen` bersih
