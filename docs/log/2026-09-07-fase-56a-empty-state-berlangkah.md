# Fase 56a — sembilan layar kosong yang berhenti pada kata "belum"

## Yang ditutup

`scripts/sapu-gaya.mjs` menghitung **empty-state-buntu** sejak Fase 33k: naskah
yang menyatakan sesuatu kosong lalu berhenti di situ. Ambangnya sembilan, dan
sembilan itu tidak pernah turun.

Yang dilihat pengguna:

> Tidak ada.
> Belum ada transaksi.
> Belum ada aktivitas.
> Tidak ada permintaan.
> Tidak ada data.

Semuanya benar, dan tidak satu pun berguna. Layar kosong adalah **satu-satunya
layar yang dilihat setiap pelanggan baru di jam pertamanya** — sebelum ada data,
seluruh aplikasi adalah layar kosong. Kalimat yang berhenti pada "belum ada"
memberi tahu apa yang tidak ada, dan menyembunyikan satu-satunya hal yang
sebenarnya dicari pembacanya: apa yang harus dilakukan sekarang.

## Sembilan, satu per satu

| Layar | Sesudahnya |
|---|---|
| Arus Kas (dua seksi) | menyebut periodenya, dan menawarkan mengganti rentang tanggal |
| Neraca Saldo | menyebut dari mana jurnalnya datang: Penjualan, Pembelian, atau Kas & Bank |
| CRM — riwayat lead | mengajak mencatat telepon/kunjungan, dan menyebutkan **kenapa**: supaya riwayatnya tidak hilang saat penanggung jawabnya berganti |
| Dasbor — aktivitas | menjelaskan bahwa umpannya terisi sendiri, bukan menunggu diisi |
| Stok menipis | menawarkan menaikkan ambangnya untuk melihat yang mulai menipis |
| Dasbor — rekap bulanan | menyebut rekapnya tersusun otomatis tiap awal bulan dan dikirim ke surel |
| Antrean persetujuan | menegaskan tidak ada yang menunggu keputusannya, dan permintaan baru masuk sendiri |
| Konsolidasi | menawarkan mengganti periode, atau memastikan perusahaannya sudah punya jurnal |
| Masukan (admin & pelanggan) | menyebut dari mana masukan datang, dan bahwa balasan pengelola muncul di tempat yang sama |

Tiga di antaranya bukan kabar buruk melainkan **kabar baik** — stok tidak ada
yang menipis, tidak ada persetujuan yang tertahan. Untuk ketiganya kalimatnya
tidak dipaksa menjadi ajakan; ia menegaskan keadaannya baik, lalu menyebutkan
apa yang akan mengubahnya.

## Dua rakitan potongan yang ikut dibongkar

Dua di antaranya dirakit dari potongan kamus di dalam JSX — bentuk yang sudah
dilarang repo ini untuk toast sejak Fase 33h karena mengunci urutan kata
Indonesia ke dalam kode:

```tsx
{u("tidakAdaProdukStokKurang")} {lowLimit}.
{u("descBelumAdaRekap")}{canRun ? u("descSusunManual") : "."}
```

Yang pertama menjadi kalimat berlubang `{0}` + `isi()`. Yang kedua menjadi **dua
kalimat utuh** — satu untuk yang boleh menyusun manual, satu untuk yang tidak —
karena menyambung anak kalimat dengan koma di JSX adalah cara yang sama dengan
cara yang berbeda.

Naskah lama yang kedua juga menyebut **"Cron"**, kata yang tidak berarti apa pun
bagi pemilik toko. Diganti dengan yang benar-benar dijanjikannya: tersusun
otomatis tiap awal bulan, dan dikirim ke surel Pemilik.

## Satu kunci untuk dua layar

`belumAdaAktivitas` dipakai di **dua** tempat dengan maksud berbeda: riwayat satu
lead di CRM, dan umpan aktivitas seluruh perusahaan di dasbor. Satu kalimat untuk
keduanya berarti kalimat yang tidak menolong di mana pun — itu sebabnya yang
lama sependek "Belum ada aktivitas."

Dipisah menjadi dua kunci dengan dua kalimat yang masing-masing tahu sedang
berada di layar apa.

## Ambangnya turun ke nol

Sembilan → **0**, dan ambang yang turun tidak boleh naik lagi: itu satu-satunya
hal yang membedakan utang yang dibayar dari utang yang dipindahkan.

Diuji-negatif: satu kalimat dikembalikan ke bentuk buntunya, penyapu memerah
(`empty-state-buntu 1, ambang 0`), lalu dipulihkan.

Penyapu gaya juga menangkap kesalahan saya sendiri di jalan pertama: salah satu
kalimat baru memakai tanda pisah diikuti "atau" — bentuk Inggris yang dilarang
sejak Fase 40d. Diperbaiki menjadi dua kalimat.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.310** (tidak berubah) |
| smoke | **1.371** (tidak berubah) |
| ui-sim | **507/507** (tidak berubah) |
| sapu-gaya | **empty-state-buntu 9 → 0** |
| sapu-warna · istilah | 0 pelanggaran |
| sapu-i18n | 51, tidak naik |
| tautan dokumen | lulus |
