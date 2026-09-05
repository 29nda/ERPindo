# Fase 54c — audit penggajian

Bagian 4 dari sepuluh bagian audit.

## Hasilnya sebagian besar bersih, dan itu perlu dinyatakan apa adanya

Tiga puluh dua invarian baru dijalankan terhadap lembur, pesangon, THR,
kompensasi PKWT, cuti tahunan, dan perhitungan masa kerja. **Seluruhnya lulus
pada jalan pertama.**

Yang diperiksa dan ternyata benar:

- **Tangga pengali lembur** — jam segmen berjumlah persis sama dengan jam yang
  dimasukkan, untuk pecahan sekalipun. Ini invarian terkuat di bagian ini:
  tangga yang tumpang tindih membayar satu jam dua kali, tangga berlubang tidak
  membayarnya sama sekali, dan keduanya tidak terlihat dari membaca tabelnya.
- Upah lembur tidak pernah turun saat jam bertambah; jam nol atau negatif tidak
  menghasilkan upah; penanda melampaui batas mengikuti batasnya.
- **Tabel UP dan UPMK** menaik tanpa penurunan sepanjang 40 tahun masa kerja,
  dan batas 3 tahun untuk UPMK adalah batas peraturan, bukan pembulatan.
- Mengundurkan diri benar-benar tidak berhak UP maupun UPMK; seluruh komponen
  pesangon tidak pernah negatif; totalnya selalu sama dengan jumlah komponennya.
- **`masaKerjaBulan`** menghormati tanggal kalender: masuk 15 Januari belum
  genap sebulan pada 14 Februari, dan genap pada 15 Februari. Tanggal bayar
  yang mendahului tanggal masuk memberi nol, bukan angka negatif.
- **THR** tidak pernah melampaui satu bulan upah, tidak pernah turun saat masa
  kerja bertambah, dan genap setahun berarti penuh.
- **PKWT** setahun penuh tepat satu bulan upah; **cuti wajib** lahir tepat di
  bulan ke-12.

Menemukan nol cacat pada bagian yang ditulis hati-hati adalah hasil yang sah.
Nilai yang tersisa adalah gerbangnya: 32 invarian itu kini menjaga agar
perubahan berikutnya tidak diam-diam melanggarnya.

## Satu cacat yang ditemukan, di tempat yang tidak diduga

Bukan di rumusnya, melainkan di **layar**.

`apps/web/src/pages/payroll.tsx` menuliskan `s.upahSebulan / 25` — angka
pembagi upah harian, disalin dari `PEMBAGI_UPAH_HARIAN` di `packages/shared`.

Konstanta itu justru **dirancang untuk berubah**: komentarnya menyatakan 25
adalah asumsi pekan enam hari kerja, dan perusahaan berpekan lima hari memakai
angka lain. Begitu diubah, API menghitung dengan angka baru sementara layar
tetap membagi 25 — rincian yang dilihat karyawan tidak lagi sama dengan uang
yang benar-benar dibayarkan, pada komponen pesangon yang justru paling sering
disengketakan.

Ini kelas yang sama persis dengan harga paket yang dieja di naskah (Fase 53a):
dua tempat memikul satu angka, dan tidak ada yang memeriksa yang lain.

Diperbaiki dengan membaca konstantanya, dan dipagari uji baru
`apps/web/test/konstanta-penggajian.test.ts` yang menolak `/ 25` dan `/ 173`
ditulis literal di halaman penggajian. Berupa uji, bukan aturan penyapu, karena
penyapu naskah membaca isi string sementara angka ini ada di dalam ekspresi
JavaScript — ia tidak akan pernah terlihat dari sana.

Diuji-negatif: angka 25 dikembalikan, uji memerah, lalu dicabut lagi.

## Catatan yang perlu diketahui pemilik

Pembagi 25 adalah **asumsi**, bukan ketentuan peraturan — dan sistem belum
memberi cara mengubahnya per perusahaan. Untuk pelanggan berpekan lima hari,
komponen uang penggantian hak atas sisa cuti akan terhitung sekitar 19% lebih
rendah daripada yang lazim dipakai. Kodenya jujur menyatakan asumsinya dan
layar menampilkan angkanya, jadi ini bukan kesalahan tersembunyi — tetapi tetap
keterbatasan yang layak diketahui sebelum menjual ke perusahaan berpekan lima
hari.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.237** (dari 1.202) |
| smoke | 1.331 |
| ui-sim | 491/491 |
| sapu-warna · istilah · gaya · i18n | 0 pelanggaran |
| tautan dokumen | lulus |

Total **3.059 pemeriksaan**.
