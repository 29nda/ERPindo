# Fase 54b — audit kepatuhan pajak

Bagian 3 dari sepuluh bagian audit.

## Batas yang saya tetapkan sendiri lebih dulu

Tabel TER berisi 125 baris tarif di tiga kategori. Berkas `payroll.ts` sudah
memperingatkan bahwa nilainya harus diverifikasi konsultan pajak terhadap
PMK 168/2023.

Saya **tidak** membandingkan 125 baris itu dengan peraturan aslinya, dan tidak
berpura-pura melakukannya: itu menuntut dokumen resmi, bukan ingatan. Mengklaim
sudah memverifikasinya akan menjadi kebohongan yang tepat berada di tempat
paling berbahaya — pelanggan yang memakai angkanya berurusan dengan kantor
pajak.

Yang bisa diaudit dengan jujur adalah **struktur dan perilakunya**. Dan itu
ternyata cukup untuk menemukan satu anomali nyata.

## Temuan 1 — kategori TER saling menyilang

Uji invarian baru menemukan pelanggaran pada jalan pertamanya.

Kategori TER ditentukan PTKP: A untuk tanggungan paling sedikit, C untuk paling
banyak. Karyawan dengan tanggungan lebih banyak **tidak boleh** membayar pajak
lebih besar pada penghasilan yang sama — itu bertentangan dengan seluruh maksud
PTKP.

Pada bruto bulanan **Rp 8.850.001 – Rp 9.200.000**, kategori C dikenai 1,25%
sementara kategori B hanya 1%.

Sapuan menyeluruh atas 240 titik batas bracket menunjukkan pelanggarannya
**tepat dua titik**, keduanya di pita itu; 238 titik lain utuh.

Dugaan kuat: salah salin di tabel B, bukan bunyi peraturannya. Kategori A dan C
sama-sama punya bracket 1,25%, sementara B melompat 1% → 1,5%. Batas 1% milik B
(9.200.000) juga melampaui batas 1% milik C (8.850.000), padahal C seharusnya
selalu lebih longgar.

**Angka penggantinya sengaja TIDAK ditebak.** Dampak cacatnya kecil dan
terbatas — 0,25% pada satu pita sempit, sekitar Rp 22.500 sebulan — sedangkan
tarif karangan bisa salah ke segala arah tanpa batas. Yang dilakukan:

- pita itu didaftarkan sebagai pengecualian yang **presisi**, bukan uji yang
  dilonggarkan;
- pengecualiannya **membunuh dirinya sendiri**: begitu tabelnya diperbaiki dan
  pita itu berhenti melanggar, ujinya gagal dan meminta pengecualiannya
  dicabut. Pengecualian yang hidup lebih lama daripada sebabnya adalah cara
  paling umum sebuah cacat berubah menjadi perilaku resmi;
- verifikasinya masuk daftar langkah pemilik.

## Temuan 2 — ambang persetujuan mengabaikan diskon

Pratinjau total untuk ambang persetujuan menjumlahkan `qty × harga` tanpa
menerapkan diskon baris, sementara total yang benar-benar diposting
(`commercePosting.ts`) menerapkannya. Dua tempat menghitung "total" dengan cara
berbeda, dan tidak ada yang memeriksa yang lain.

Arah selisihnya kebetulan aman — pratinjau selalu lebih besar, jadi pembelian
masuk antrean tanpa perlu, bukan sebaliknya. Tetapi "kebetulan aman" bukan
alasan membiarkannya: dengan diskon 50%, pemilik diminta menyetujui pembelian
bernilai Rp 555.000 terhadap ambang Rp 1.000.000 miliknya sendiri. Ambang yang
berbunyi tanpa sebab adalah ambang yang lama-lama diabaikan.

Diperbaiki dengan menyamakan rumusnya, termasuk pembulatan per barisnya.
Diuji-negatif: diskon dicabut dari rumus, cek smoke memerah (202 alih-alih
201), lalu dikembalikan.

## Yang diperiksa dan ternyata bersih

- Struktur ketiga tabel TER: batas menaik tanpa celah, tarif tidak pernah
  turun, dibuka 0% dan ditutup `Infinity`, seluruh tarif dalam 0–35%.
- `terRate` di batas bracket: `upTo` benar-benar inklusif, dan rupiah
  berikutnya benar-benar pindah bracket — sumber klasik selisih satu.
- Setiap status PTKP memetakan ke kategori yang ada.
- PPN: tarif dibatasi 0/11/12 lewat skema, dihitung atas subtotal setelah
  diskon, dibulatkan sekali.
- Slip gaji mematuhi invarian yang sama dengan tabelnya, jadi pembulatan dan
  urutan operasi di `calculatePayslip` ikut tercakup.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.202** (dari 1.171) |
| smoke | **1.331** (dari 1.330) |
| ui-sim | 491/491 |
| sapu-warna · istilah · gaya · i18n | 0 pelanggaran |
| tautan dokumen | lulus |

Total **3.024 pemeriksaan**.

## Yang belum, dari bagian 3

Format ekspor e-Faktur/Coretax dan bukti potong e-Bupot belum diaudit isinya —
keduanya menuntut spesifikasi resmi DJP untuk dibandingkan, bukan penalaran
struktural. Sama seperti nilai tarif TER, itu pekerjaan yang perlu dokumen di
tangan.
