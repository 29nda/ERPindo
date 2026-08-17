# Fase 30i — koreksi kueri monitor kuota

Fase 30f membangun monitor kuota dengan catatan jujur bahwa kueri GraphQL-nya
**belum diverifikasi**. Dengan connector Cloudflare tersambung, dokumentasinya
kini bisa dicocokkan — dan pencocokan itu menemukan satu kesalahan yang membuat
kueri Worker **tidak akan pernah mengembalikan angka**.

## Cacat 1: `*Adaptive` vs `*AdaptiveGroups`

Versi pertama menulis:

```graphql
workersInvocationsAdaptive(...) { sum { requests } }
```

Pola Cloudflare konsisten di seluruh produk — R2 (`r2StorageAdaptiveGroups`),
Workflows (`workflowsAdaptiveGroups`), D1 (`d1AnalyticsAdaptiveGroups`):

- dataset ber-akhiran **`Groups`** menyediakan agregasi (`sum {}`, `count`, `max {}`);
- varian **tanpa `Groups`** mengembalikan **event mentah** berisi field per-baris
  dan **tidak punya `sum` sama sekali**.

Jadi `workersInvocationsAdaptive { sum { requests } }` adalah kombinasi yang
tidak sah. Diperbaiki menjadi `workersInvocationsAdaptiveGroups`.

Bagian D1 sudah benar sejak awal (`d1AnalyticsAdaptiveGroups`), dan itu justru
yang membuat cacatnya sulit terlihat: satu dataset benar, satu salah.

## Cacat 2: satu nama field salah menjatuhkan SEMUANYA

Versi pertama menggabungkan kedua dataset dalam **satu** kueri. GraphQL menolak
seluruh permintaan bila satu nama field tidak dikenal — jadi dataset D1 yang
benar akan ikut hilang gara-gara tetangganya yang salah, dan pemilik melihat
kartu kosong tanpa tahu bahwa separuhnya sebenarnya bisa dibaca.

Kini **satu kueri per dataset**, dijalankan paralel. Kesalahan pada satu dataset
hanya menghilangkan barisnya sendiri; sisanya tetap tampil. Kartu baru menyatakan
gagal total bila **kedua-duanya** gagal.

Cacat kedua ini lebih penting daripada yang pertama: cacat pertama bisa
diperbaiki sekali, sedangkan cacat kedua adalah **bentuk** yang membuat setiap
kesalahan berikutnya berbiaya maksimal.

## Status verifikasi sekarang

| | Keadaan |
| --- | --- |
| Bentuk kueri (`viewer → accounts(accountTag) → dataset → sum`) | ✅ dicocokkan ke contoh resmi Cloudflare |
| Varian `*AdaptiveGroups` untuk agregasi | ✅ dicocokkan (R2, Workflows, D1) |
| Pemanggilan sungguhan dengan token akun | ❌ token analitik milik pemilik |

Turun dari "belum diverifikasi sama sekali" menjadi "bentuknya terverifikasi,
pemanggilannya belum". Sisa risikonya kini tertahan oleh bentuk barunya: satu
field yang masih meleset hanya menghilangkan satu baris.

## Validasi

`typecheck` · `lint` · `build` hijau; `test` **597**; `smoke` **1.129** —
termasuk cek Fase 30f yang membuktikan jalur terdegradasi (tanpa token) membalas
`configured:false` dengan pesan yang menyebut secret yang harus dipasang.
