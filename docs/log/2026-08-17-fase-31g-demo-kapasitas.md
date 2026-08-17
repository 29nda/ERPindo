# Fase 31g — demo publik & kapasitas multi-perusahaan

Pemilik melapor setelah mendaftar di produksi: *"gagal nampilin demo, harusnya
akses saya bisa buka banyak PT dong"*.

## Keadaan sebenarnya — dikueri, bukan ditebak

D1 control-plane produksi (`c525c4e3-…2dece2`) langsung dikueri lewat connector:

| Tabel | Isi |
| --- | --- |
| `users` | 1 — `29nurudhuhaalamin@gmail.com`, dibuat 17 Agu 15:42, `email_verified: 0` |
| `tenants` | 1 — **PT Coba Demo**, `status: active`, `subscription_ends_at: NULL`, `db_ref: binding:TENANT_DB_1`, `schema_version: 46` |
| `memberships` | 1 — peran `owner` |

**Akun master bekerja.** `active` + `subscription_ends_at` kosong adalah tanda
`COMPED_EMAILS` terbaca. Skema tenant juga sudah versi terbaru, jadi rantai
deploy → binding → database utuh.

Yang dilaporkan ternyata **dua hal berbeda**, dan hanya satu yang cacat.

## 1. "Banyak PT" — sudah bisa sejak awal, hanya tidak terlihat

`POST /api/auth/companies` (`routes/auth.ts:316`) memasang pagar
"aktifkan langganan dulu", tetapi pagar itu **dilewati sepenuhnya** untuk akun
comped:

```ts
if (!isComped(c.env, user.email)) { /* pagar 402 belum-berlangganan */ }
```

UI-nya pun sudah ada — `NewCompanyCard` (`settings/company.tsx:574`) dirender
di `settings/index.tsx:62` untuk peran `owner`, dan pemilik memang `owner`.

Jadi tidak ada yang perlu dibangun. Yang kurang adalah **pemilik tidak pernah
diberi tahu**: tidak di dokumen, tidak di aplikasi. Ditutup lewat bagian baru
"Membuka perusahaan kedua" di `docs/langkah-pemilik.md`.

Batas nyatanya kapasitas, bukan izin: `wrangler.jsonc` produksi mendeklarasikan
`TENANT_DB_1..6` → **6 perusahaan**, satu terpakai.

## 2. Demo gagal — perusahaannya memang belum pernah disemai

`POST /api/auth/demo` mencari slug `pt-demo-sejahtera`. Kueri membuktikan tenant
itu tidak ada. Endpoint menjawab 404 dengan benar; kodenya tidak cacat.

### Cacat sebenarnya ada di dokumen yang saya tulis sendiri

`docs/langkah-pemilik.md:66` menyuruh **"Klik Run workflow"**.
`.github/workflows/seed-demo.yml` **tidak punya `workflow_dispatch`** — satu-
satunya pemicunya push ke branch `ops/seed-demo-run`.

**Tombol itu tidak pernah ada.** Pemilik mengikuti petunjuknya, tidak menemukan
tombolnya, dan demo tidak pernah tersemai — lalu tombol "Lihat Demo", ajakan
utama halaman depan sejak masa coba dihapus, gagal untuk setiap pengunjung.

Diperbaiki: `workflow_dispatch` ditambahkan (pemicu `push` dipertahankan sebagai
cadangan), dan langkahnya ditulis ulang dengan urutan yang benar — **secret
dipasang lebih dulu**, karena tanpanya workflow berhenti di langkah pertama
dengan `402`.

## 3. Yang selama ini tidak terlihat, kini terlihat

`/admin/infra` menambahkan blok `demo`: `siap`, `slug`, `nama`, `status`, dan
`peringatan` yang menyebutkan **cara memperbaikinya**, bukan sekadar bahwa ada
yang salah. Halaman Admin menampilkannya sebagai `Alert` merah **di atas**
peringatan kapasitas — kapasitas habis menghentikan pendaftar baru, sedangkan
demo yang tidak ada menggagalkan ajakan utama untuk setiap pengunjung, termasuk
yang belum sempat berniat mendaftar.

Kapasitas sendiri **sudah dilaporkan di sana sejak Fase 23c**; rencana fase ini
keliru menyangka belum. Yang benar-benar hilang hanya status demo.

## 4. Kegagalan demo tidak lagi terbaca seperti aplikasi rusak

`DemoButton` dulu meneruskan `err.message` apa adanya, sehingga calon pelanggan
membaca **"Akun demo belum disiapkan."** — kalimat untuk operator, bukan
pengunjung, terpampang tepat di ajakan utama halaman. Diganti kalimat yang jujur
tanpa membocorkan keadaan internal dan menawarkan langkah berikutnya. Sisi
operator tidak kehilangan apa pun: `/app/admin` → Infra kini menyatakan persis
apa yang kurang.

## Koreksi atas pekerjaan saya sendiri

**Satu cek yang saya tulis ternyata duplikat.** Saya menambahkan asersi
`POST /auth/demo → 404`, padahal cek "demo 404 sebelum perusahaan demo di-seed"
sudah ada sejak Fase 10b di baris 254 suite yang sama. Dibuang, diganti komentar
yang menunjuk cek aslinya.

**Penjaga tautan dokumen memerah karena log ini sendiri.** Log Fase 31e
menjelaskan cacat pemeriksanya memakai jalur *contoh* dalam backtick, dan
pemeriksa itu menghitungnya sebagai rujukan nyata. Contohnya ditulis ulang tanpa
jalur harfiah. Positif palsu semacam ini adalah harga wajar dari pemeriksa yang
tidak bisa membedakan contoh dari rujukan — dan lebih murah daripada tautan mati
yang lolos.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 610 | ✅ 610 |
| `pnpm smoke` | 1.130 | ✅ **1.132** |
| `node scripts/ui-sim.mjs` | 360 | ✅ 360 |
| `sapu-warna` | 88 / 335 | ✅ 88 / 335 |
| `periksa-tautan-dokumen` | 60 | ✅ 64 |

### Penjaga baru dibuktikan bisa gagal

`siap: Boolean(demoTenant)` disabotase menjadi `siap: true` — mengembalikan
keadaan sebelum fase ini, ketika ketidaksiapan demo tidak terlihat sama sekali:

```
✗ 31g /admin/infra melaporkan kesiapan demo publik
1 PEMERIKSAAN GAGAL ❌
```

Tepat satu asersi memerah, lalu dipulihkan.

## Yang tersisa untuk pemilik

Pemilik mengonfirmasi `SEED_EMAIL` + `SEED_PASSWORD` sudah dipasang. Langkah
berikutnya menjalankan workflow **Seed demo**. Penyemaian tidak bisa dijalankan
dari lingkungan pengembangan: proxy menolak koneksi ke `*.workers.dev`
(terbukti, gateway `403` pada CONNECT). Menyisipkan data lewat connector D1 juga
bukan jalan keluar — penyemai membangun data lintas 40+ modul berikut jurnalnya,
dan menirunya dengan SQL mentah menghasilkan demo yang pembukuannya tidak
seimbang.
