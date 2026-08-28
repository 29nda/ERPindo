# Fase 43b — Lembur berumus (PP 35/2021)

## Yang dikerjakan

Sampai fase ini lembur hanyalah **angka rupiah yang diketik tangan** ke dalam
komponen gaji ad-hoc. Artinya rumusnya hidup di kepala orang yang mengetik, dan
kesalahannya tidak bisa diperiksa siapa pun — termasuk oleh karyawan yang
dirugikan.

Sekarang yang dicatat adalah **jam dan jenis hari**; upahnya dihitung server
memakai tangga pengali PP 35/2021.

- `packages/shared/src/payroll.ts` — `upahPerJam()`, `hitungLembur()`,
  `PEMBAGI_UPAH_JAM`, `BATAS_JAM_LEMBUR`.
- Migrasi `0050_lembur` — `overtime_records`.
- `apps/api/src/routes/payroll.ts` — catat, daftar, hapus; dan penyaluran ke
  run penggajian.
- `apps/web/src/pages/payroll.tsx` — kartu lembur di tab Komponen.

## Keputusan dan alasannya

**Pengalinya berjenjang, jadi fungsinya mengembalikan rincian per segmen.**
Hari biasa: jam pertama 1,5×, berikutnya 2×. Hari libur pekan 6 hari: jam 1–7
= 2×, jam ke-8 = 3×, jam 9–10 = 4×. Pekan 5 hari: jam 1–8 = 2×, jam ke-9 = 3×,
jam 10–11 = 4×. Mengalikan seluruh jam dengan satu pengali selalu salah —
terlalu kecil pada jam awal hari libur, terlalu besar pada jam pertama hari
biasa. Rincian per segmen membuat slipnya bisa menunjukkan cara hitungnya,
sehingga karyawan bisa memeriksanya.

**Pembagi 173 ditulis sebagai konstanta bernama.** Angkanya ketentuan hukum
(40 jam × 52 minggu ÷ 12 ≈ 173,33, dibakukan jadi 173 di pasal 32), bukan
pilihan yang boleh diubah orang yang membaca kodenya.

**Jam yang melampaui batas TETAP dibayar, tetapi ditandai.** Memotongnya akan
menghilangkan upah yang secara perdata sudah menjadi hak karyawan atas jam yang
benar-benar ia kerjakan. Yang dilanggar perusahaan adalah batas waktu kerjanya
— dan itu persoalan yang harus terlihat, bukan ditutup oleh pembayaran yang
dikurangi.

**Lembur masuk lewat pintu yang sama dengan komponen ad-hoc**, sehingga ikut
bruto, PPh 21, dan BPJS. Membayarnya di luar bruto akan kurang potong PPh 21,
dan kekurangan itu baru muncul saat SPT tahunan.

**Periode yang sudah digaji menolak lembur baru**, dan lembur yang sudah ikut
run tidak bisa dihapus: slipnya menyebut angka itu, dan menghapusnya membuat
slip tidak bisa dijelaskan lagi. Membatalkan run melepaskannya kembali, sama
seperti komponen ad-hoc.

## Catatan kejujuran

**Dua gerbang menangkap tulisan saya sendiri, dan salah satunya gerbang yang
saya pasang sendiri dua fase lalu.**

1. `sapu-gaya` menolak `descLembur` karena memakai titik koma — aturan yang
   saya tambahkan sendiri di Fase 42b. Ditulis ulang jadi dua klausa berkata
   sambung.
2. `pesan-galat.test.ts` menolak pesan "Catatan lembur tidak ditemukan." karena
   buntu: tidak memberi tahu penggunanya harus berbuat apa. Ditambahi langkah
   lanjut.

**`sapu-i18n` turun lagi, 60 → 53.** Penjaga kode dari Fase 43a ternyata masih
melewatkan satu bentuk: ternary JSX seperti `daftar.length === 0 ? (`. Penanda
`===` / `!==` ditambahkan — prosa yang dibaca pengguna tidak pernah memuat
pembanding ketat. Keenam entri yang gugur diperiksa satu per satu: seluruhnya
ternary JSX dan rantai `else if`, tidak satu pun teks layar.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **993 lulus** (331 shared + 366 web + 296 api; naik dari 972)
- `pnpm build` — lulus
- `pnpm smoke` — **1.213 cek** (naik dari 1.198; 15 cek lembur)
- `node scripts/ui-sim.mjs` — **444/444** (naik dari 439; 5 cek lembur)
- `pnpm lint` — bersih
- `sapu-i18n` **53** utang teks layar (turun dari 60), `sapu-warna` 0,
  `sapu-istilah` bersih, `sapu-gaya` bersih, `periksa-tautan-dokumen` bersih
