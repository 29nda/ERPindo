# Fase 26a — izin granular benar-benar ditegakkan (audit A · G · J1)

Bagian pertama dari empat sub-fase penutup temuan audit keamanan. Menangani
temuan **A** (peran kustom lolos gerbang izin), **G** (gerbang paket dari segmen
URL), dan **J1** (temuan baru: konsolidasi tanpa gerbang paket sama sekali).

## Verifikasi temuan — bukan diterima apa adanya

| Temuan | Verdict | Bukti |
| --- | --- | --- |
| **A** — izin granular hanya ditegakkan sebagian | **VALID (P0)** | `requirePermission` dipakai di **satu** berkas: `routes/tax.ts` (10×). 39 berkas route lain hanya memakai `requireTenantRole` |
| **G** — gerbang paket dari segmen URL rapuh | **VALID** | `middleware/auth.ts` lama: `path.split("/")[4]` → `MODULE_ROUTE_PREFIXES`. Celah nyatanya bukan hipotetis: segmen `roles` (modul `customRoles`, paket Business) **tidak ada di peta** |
| **J1** — konsolidasi tanpa gerbang paket | **VALID (baru)** | `routes/consolidation.ts` hanya memakai `requireAuth`. Rutenya di-mount di `/api/consolidation`, di luar `/api/tenants/:tenantId/`, sehingga middleware paket tidak pernah menyentuhnya |

Eksploitnya sederhana dan tidak butuh alat apa pun: buat peran kustom
`{ baseRole: "admin", permissions: ["penjualan", "kasir"] }`, tetapkan ke
seorang anggota, lalu panggil `GET /api/tenants/<id>/accounts` langsung. Sebelum
fase ini jawabannya **200**. Yang menyembunyikannya selama ini hanyalah menu di
layar — dan menu bukan penjaga keamanan.

## Akar masalahnya bukan "satu route lupa dipasangi penjaga"

Ini yang menentukan bentuk perbaikannya. Kalau cacatnya sekadar kelalaian di satu
tempat, tambalannya cukup satu baris. Tetapi 39 dari 40 berkas route tidak pernah
memakai `requirePermission` sama sekali, berbulan-bulan, tanpa satu pun gerbang
yang bisa melihatnya — karena **tidak ada satu pun tempat yang tahu daftar
lengkap segmen route**. Penjaga per-endpoint mustahil dibuktikan lengkap: yang
bisa dilihat hanyalah yang ditulis, bukan yang dilupakan.

Karena itu perbaikannya dua bagian, dan bagian keduanya yang penting:

1. **Satu registri eksplisit** — `TENANT_ROUTE_ACCESS` di
   `packages/shared/src/core.ts`. Tiap segmen menyatakan izin **baca**, izin
   **tulis**, dan modul berpaketnya. Menggantikan `MODULE_ROUTE_PREFIXES`.
2. **Satu uji yang membaca router sungguhan** —
   `apps/api/test/rbac-registry.test.ts` mengenumerasi `app.routes` Hono (daftar
   path yang benar-benar terpasang saat modul dimuat) dan **gagal bila ada
   segmen tanpa entri**. Route baru karena itu tidak bisa lagi lolos diam-diam;
   jawaban "tidak dijaga izin" tetap boleh, asal **ditulis**.

Uji itu langsung membayar dirinya sendiri pada percobaan pertama: ia menemukan
`contacts` dan `warehouses` — dua segmen yang dibangun dari template di
`masterdata.ts` dan **tidak muncul sama sekali** saat berkas route dibaca dengan
grep. Persis kelas kelalaian yang membuat temuan A bertahan begitu lama.

## Baca dan tulis dipisah, dan itu bukan kompromi

Kasir dengan izin `["penjualan","kasir"]` **harus** bisa membaca `products`
(memindai barcode) dan `settings` (footer struk) — POS memanggil keduanya. Kalau
izin baca dan tulis disamakan, penegakan ini akan mematikan POS bagi peran yang
justru menjadi contoh utama laporan audit. Jadi `products`, `contacts`,
`warehouses`, `settings`, `setup`, `doc-numbering`, dan `custom-fields` dibaca
dengan penjagaan **peran** saja, sementara penulisannya dijaga izin.

Keputusan pemilik yang ikut dikunci di registri: **`members`/`invites`/`roles`
tetap dijaga peran saja**, tidak ikut dijaga izin `pengguna` — Admin preset tidak
kehilangan hak yang sudah ia pakai. Yang dibatasi adalah peran **kustom**.

## Yang berubah bagi pelanggan

| | Sebelum | Sesudah |
| --- | --- | --- |
| Peran kustom memanggil modul di luar izinnya | **200** | **403** `permission-denied` |
| Starter membuat peran kustom | 201 | **403** `plan-upgrade-required` (Business) |
| Starter membuka laporan konsolidasi | 200 | **403** `plan-upgrade-required` (Enterprise) |
| Owner / Admin preset / Viewer preset | — | **tidak berubah** |

Dua baris tengah adalah keputusan produk yang diambil pemilik secara eksplisit:
keduanya modul berbayar yang selama ini terbuka untuk semua paket. Produksi hanya
berisi Softtin dan demo — keduanya Enterprise — jadi tidak ada pelanggan yang
kehilangan akses.

Aturan gerbang konsolidasi dinyatakan terbuka karena ia tidak bisa disimpulkan
dari kode mana pun: **pengguna harus memiliki minimal satu perusahaan berpaket
Enterprise**; cakupan laporannya sendiri tidak berubah. Alternatif "saring per
perusahaan" ditolak — laporan keuangan yang diam-diam kehilangan baris lebih
berbahaya daripada 403 yang jelas.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | 0 | — |
| `pnpm test` | 0 | **489** (dari 482) |
| `pnpm smoke` | 0 | **1.104** (dari 1.088) |
| `node scripts/ui-sim.mjs` | 0 | **337/337** |

**Dibuktikan bisa gagal** — empat sabotase, semuanya mengenai bentuk cacat
aslinya, seluruhnya dipulihkan sesudahnya:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| Penegakan izin dilewati (kembali ke perilaku lama) | **6 cek**: akuntansi **200**, penggajian **200**, pengadaan **200**, tulis produk **201**, buku besar, laporan |
| Satu entri registri (`pos`) dihapus | uji kelengkapan: `expected ['pos'] to deeply equal []` |
| Gerbang paket konsolidasi dibuat selalu `true` | 2 cek: daftar perusahaan **200**, laporan konsolidasi **200** |
| `modul: "customRoles"` dilepas dari entri `roles` | Starter membuat peran kustom **201** |

Sabotase pertama sengaja mengembalikan kode ke keadaan **sebelum** fase ini —
jadi angka 200/201 di kolom kanan itu bukan simulasi, melainkan kerentanan
aslinya yang direproduksi apa adanya.

## Yang TIDAK dikerjakan

- **`/:tenantId/approvals` dan `approval-threshold` tidak digerbangi paket.**
  Keduanya fitur ambang persetujuan pembelian yang sudah ada jauh sebelum modul
  berpaket `approvals` (mesin alur berjenjang). Menggerbanginya = mencabut fitur
  dari pelanggan Starter yang memakainya, dan itu keputusan produk. Izinnya tetap
  ditegakkan; statusnya ditulis di registri sebagai keputusan sadar.
- **Batasan dimensi (`scopeCostCenterIds`) tidak ikut ditegakkan di middleware.**
  Ia menyaring baris data, bukan akses modul, jadi tempatnya di kueri modul
  masing-masing — pekerjaan tersendiri, tidak dicampur ke sini.
- **Temuan B, C, D, E, F, H, J2 belum ditangani** — dijadwalkan di Fase 26b–26d
  agar tiap perubahan otorisasi punya gerbang dan bukti sabotasenya sendiri.
