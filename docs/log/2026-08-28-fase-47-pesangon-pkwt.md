# Fase 47 — Pesangon & kompensasi PKWT

## Yang dikerjakan

Pesangon adalah kewajiban hukum yang paling mahal bila salah hitung, dan sampai
fase ini ERPindo tidak bisa menghitungnya sama sekali. Kompensasi PKWT juga
tidak ada — padahal ia kewajiban yang paling sering terlewat justru karena
tidak ada yang mengingatkannya.

- `packages/shared/src/payroll.ts` — `bulanPesangon()`, `bulanPenghargaan()`,
  `ALASAN_PHK`, `hitungPesangon()`, `kompensasiPkwt()`, `hakCutiTahunan()`.
- Migrasi `0055_sdm_lanjutan` — `employees.employment_type`,
  `contract_end_date`, tabel `severance_records`.
- `apps/api/src/routes/payroll.ts` — hitung & simpan pesangon.
- `apps/web/src/pages/payroll.tsx` — tab Pesangon, plus **medan tanggal masuk
  dan status kerja di formulir karyawan**.

## Keputusan dan alasannya

**Pengali berbeda per ALASAN berakhirnya hubungan kerja.** Ini yang paling
sering diabaikan, dan paling menentukan: pensiun 1,75× UP, meninggal dunia 2×,
sakit berkepanjangan 2× UP **dan** 2× UPMK, efisiensi karena rugi hanya 0,5×
UP (tetapi UPMK-nya tetap 1×), mengundurkan diri tidak berhak sama sekali.
Memakai satu angka untuk semuanya membuat perusahaan membayar terlalu banyak
pada sebagian orang dan terlalu sedikit pada sebagian lain — dan yang kedua
berujung perselisihan hubungan industrial.

**UPH cuti tetap dibayar meski alasannya tanpa pesangon.** Cuti yang belum
diambil sudah menjadi hak karyawan; ia tidak hangus karena orangnya
mengundurkan diri.

**Uang pisah TIDAK dikarang sistem.** Besarnya diatur perjanjian kerja, bukan
peraturan. Menebaknya berarti mengarang kewajiban yang mungkin tidak ada, jadi
ia medan isian dan layarnya mengatakan alasannya.

**Tanpa tanggal masuk, perhitungan DITOLAK.** Pesangon yang dihitung dari masa
kerja karangan adalah angka yang akan diperselisihkan. Lebih baik menolak dan
meminta datanya dilengkapi.

**Baku `pkwtt` untuk karyawan lama.** Kalau bakunya `pkwt`, seluruh karyawan
tetap tiba-tiba terlihat berhak uang kompensasi kontrak — kewajiban yang tidak
pernah ada.

**Angkanya disimpan, bukan dihitung ulang saat dibaca.** Alasan yang sama
seperti slip THR dan lembur: berkas lama harus tetap menunjukkan angka yang
benar-benar dibayarkan waktu itu.

**Layarnya menampilkan rinciannya, bukan satu angka total.** Pesangon adalah
angka yang diperselisihkan orang, dan yang menyelesaikan perselisihan bukan
totalnya melainkan cara sampainya: berapa bulan upah, dikali berapa, karena
alasan apa.

## Temuan sampingan yang penting

**Formulir karyawan ternyata tidak punya medan tanggal masuk sama sekali.**
Kolom `join_date` sudah dipakai sejak Fase 43a untuk THR, dan pesangon
mewajibkannya — tetapi satu-satunya jalan mengisinya adalah lewat API. Inilah
sebabnya pratinjau THR begitu sering menandai "tanggal masuk kosong": bukan
karena pemiliknya lalai, melainkan karena aplikasinya tidak pernah menyediakan
tempat mengisinya. Ditambahkan pada fase ini, bersama status PKWT/PKWTT.

## Catatan kejujuran

Fase ini lolos seluruh gerbang pada percobaan pertama — pertama kalinya sejak
Fase 42b. Dua kesalahan kecil tertangkap `tsc` sebelum sempat berjalan: satu
kunci kamus (`kontrakBerakhir`) sudah dipakai daftar kontrak dengan arti
berbeda ("berakhir"), dan tanda tangan `createEmployee` di klien belum memuat
medan baru.

Batasan yang perlu dicatat: `ALASAN_PHK` memuat sembilan alasan yang lazim
ditemui perusahaan kecil dan menengah. Daftarnya **tertutup, bukan lengkap** —
PP 35/2021 memuat lebih banyak keadaan, dan alasan di luar daftar harus dihitung
manual dengan mengacu peraturannya. Ini ditulis di komentar kodenya, bukan
disembunyikan.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **1.101 lulus** (412 shared + 366 web + 323 api; naik dari 1.071)
- `pnpm build` — lulus
- `pnpm smoke` — **1.288 cek** (naik dari 1.273; 15 cek pesangon)
- `node scripts/ui-sim.mjs` — **469/469** (naik dari 462; 6 cek)
- `pnpm lint` — bersih
- `sapu-i18n` 53 (tetap), `sapu-warna` 0, `sapu-istilah` bersih,
  `sapu-gaya` bersih, `periksa-tautan-dokumen` bersih
