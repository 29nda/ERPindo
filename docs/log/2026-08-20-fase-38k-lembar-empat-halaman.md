# Fase 38k — empat halaman lagi, dan satu yang ternyata sudah benar

## Yang dikerjakan

| Halaman | Formulir yang dipindah ke Lembar |
| --- | --- |
| `masterdata.tsx` — Produk | Tambah/ubah produk |
| `masterdata.tsx` — Kontak | Tambah/ubah kontak |
| `finance.tsx` — Bagan Akun | Tambah akun |
| `finance.tsx` — Jurnal Umum | Jurnal manual baru |

Total sejak 38h: **sembilan halaman** membuka dengan datanya, bukan dengan
formulir kosong.

## Lembar yang melayani dua hal sekaligus

Formulir produk dan kontak berbeda dari empat yang sebelumnya: ia dipakai untuk
**pembuatan dan penyuntingan**. Lembarnya terbuka bila salah satu dari keduanya
diminta:

```tsx
terbuka={Boolean(editing) || tambahBuka}
```

Ini sekaligus memperbaiki kebingungan lama yang tidak pernah dilaporkan:
mengeklik "ubah" pada baris paling bawah daftar menggulirkan halaman jauh ke
atas ke formulir, tanpa satu pun penanda bahwa itulah yang terjadi. Pengguna
yang tidak melihat halamannya bergerak akan mengira tombolnya tidak berfungsi.

## Satu halaman ternyata sudah benar

`approvals.tsx` masuk daftar kandidat karena punya formulir pengajuan. Setelah
dibaca, formulir itu berada di **tabnya sendiri** ("Ajukan"), dan tab bawaannya
adalah antrean persetujuan. Ia sudah data-dulu sejak awal; tidak ada yang perlu
diubah.

Ini alasan konversi dikerjakan dengan membaca tiap halaman alih-alih mencocokkan
pola secara otomatis: heuristik "ada `CardHeader` berjudul ajukan/baru" akan
memindahkan formulir yang sudah berada di tempat yang benar.

## Tiga asersi yang pecah, dan semuanya sebab yang sama

Ketiganya membaca sesuatu **di dalam** formulir yang kini belum terpasang:

| Asersi | Yang dicarinya | Perbaikan |
| --- | --- | --- |
| F0o | label "Track serial numbers" di form produk | `bukaLembar(page, "Add product")` |
| F2c ×2 | blok kolom kustom di form kontak | `bukaLembar(page, "Tambah kontak")` |
| F0s | tombol "Post entry" di form jurnal | `bukaLembar(page, "New manual entry")` |

Subjek keempatnya tidak berubah. Yang berubah hanya satu langkah di depannya —
dan `bukaLembar()` yang dibangun di 38h memang dibuat untuk ini.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 916 | ✅ 916 |
| `pnpm smoke` | 1.157 | ✅ 1.157 |
| `node scripts/ui-sim.mjs` | 392 | ✅ 392 |
| `sapu-warna` | 0 / 0 | ✅ 0 / 0 |
| `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |

## Yang belum dikerjakan, dan penilaian jujurnya

Tiga formulir masih berada di atas daftar:

- **`commerce.tsx`** — formulir faktur/pembelian. Ia bukan formulir sederhana
  melainkan editor dokumen berbaris banyak, dan halaman ini melayani empat
  jenis dokumen lewat satu komponen. Memindahkannya ke Lembar layak, tetapi
  menuntut pembacaan ulang menyeluruh, bukan penggeseran struktur.
- **`crm.tsx` — Penawaran** — sama: editor dokumen berbaris banyak.
- **`payroll.tsx` — Karyawan** — formulirnya berbagi kartu dengan daftar
  karyawan di dalam satu tab. Memisahkannya berarti menata ulang tabnya.

Ketiganya saya nilai lebih baik dikerjakan sebagai penataan ulang halamannya
sendiri daripada sebagai penggeseran mekanis — dan menyatakannya di sini lebih
jujur daripada memaksakannya lalu meninggalkan halaman yang setengah jadi.
