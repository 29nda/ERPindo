# Fase 23c — kesiapan launching: kapasitas pendaftaran & email yang jujur

Pemilik akan meluncurkan besok dan meminta "kelarin semuanya". Penelusuran
menemukan bahwa yang menghalangi peluncuran **bukan** fitur yang belum jadi.

**Produksi tidak bisa menerima satu pun pelanggan baru.**

## Temuan yang mendasari seluruh fase ini

Query langsung ke control-plane produksi menunjukkan pool tenant **penuh 6/6**:

| Binding | Tenant | Asal |
| --- | --- | --- |
| TENANT_DB_1 | Softtin | nyata |
| TENANT_DB_2 | Workspace Seeder | `scripts/seed-demo.mjs` |
| TENANT_DB_3 | PT Demo Sejahtera | demo publik |
| TENANT_DB_4 | Workspace Staf Demo | `scripts/seed-demo.mjs` |
| TENANT_DB_5 | Probe AI | `scripts/ai-probe.mjs` |
| TENANT_DB_6 | Probe AI | `scripts/ai-probe.mjs` |

**Empat dari enam slot produksi dihabiskan skrip uji kami sendiri.** Keduanya
mendaftarkan perusahaan baru tiap kali dijalankan, dan tidak ada jalur apa pun
yang mengembalikan slotnya.

Runbook Fase 11a sudah menuliskan akibatnya sejak setahun lalu — *"Tenant ke-7
gagal daftar"* — tetapi **tidak ada yang pernah memeriksa bahwa tenant ke-7
sudah tiba.** Checklist pra-peluncuran pun tidak menyebut kapasitas sama sekali.

Yang membuatnya tak terlihat: **seluruh gerbang mutu repo ini berjalan di atas
D1 lokal yang selalu kosong.** 1.075 cek smoke, 336 cek browser, dan 453 uji
unit semuanya hijau sementara produksi tidak bisa menerima pelanggan. Tidak ada
cek yang salah; yang salah adalah menganggap gerbang hijau berarti produksi
sehat.

## Yang dikerjakan

**A1 — pembersihan produksi + `scripts/bersihkan-tenant.mjs`.** Empat tenant
sampah dihapus, databasenya dikosongkan. Kapasitas **0 → 4 slot**.

**A2 — penjaga slot bekas (`poolMasihKosong`).** `applyMigrations()` melewati
migrasi yang sudah tercatat di `_migrations` dan tidak pernah mengosongkan
tabel. Jadi slot yang dibebaskan dengan cara paling wajar — `DELETE FROM
tenants` — akan diserahkan ke pendaftar berikutnya **berisi seluruh pembukuan
perusahaan sebelumnya**. Slot kotor kini **dilewati**, bukan ditolak: bila
TENANT_DB_2 kotor tetapi TENANT_DB_4 bersih, pendaftaran tetap berhasil.

**A4 — kapasitas dilaporkan di `/api/admin/infra`.** Sisa slot, daftar slot
kotor, dan peringatan saat sisa ≤ 2. Memperluas endpoint yang sudah ada.

**B2 — `ResendMailer` berhenti berbohong.** Non-2xx dulu hanya `console.error`
lalu fungsinya kembali normal; pemanggilnya percaya email terkirim. Kini
melempar, dan `kirimEmail()` menangkap + mencatat audit `email.gagal` sehingga
alur pemanggil tidak pernah gagal tetapi kegagalannya terlihat.

**C — skrip uji berhenti membakar slot.** `seed-demo.mjs` & `ai-probe.mjs`
menolak berjalan terhadap non-localhost tanpa `IZINKAN_TENANT_BARU=1`.
Penjaganya diletakkan **di atas**, bukan di dalam `if (REGISTER)` — registrasi
"Workspace Staf Demo" ternyata berjalan tanpa syarat, jadi seed apa pun ke
produksi memakan slot.

**D — runbook §0 & §6.** Kapasitas diperiksa lebih dulu; urutan pasang kunci
(`PLATFORM_ADMIN_EMAILS` → Resend → Google → Midtrans sandbox → produksi).

**B1 tidak dikerjakan — sudah ada.** `KapasitasTenantPenuhError` + 503 berpesan
masuk lewat PR #190 yang digabungkan di awal fase ini.

## Cacat yang hampir saya buat sendiri

Penjaga A2 versi pertama membaca **setiap** slot produksi sebagai "kotor".

D1 sungguhan membuat tabel internal `_cf_KV` di **setiap** database, termasuk
yang belum pernah dipakai. Kueri kebersihan saya menghitungnya sebagai isi, jadi
setiap slot bebas akan ditolak dan **seluruh pendaftaran mati** — penjaga yang
dibangun untuk melindungi data justru memadamkan penjualan, lebih parah daripada
keadaan yang diperbaikinya.

Gerbang lokal **tidak bisa menangkapnya**: miniflare tidak membuat `_cf_KV`.
Uji, smoke, dan ui-sim semuanya hijau. Ketahuan hanya karena saya membaca daftar
tabel produksi sungguhan sebelum menjalankan DROP.

Ini pengulangan pelajaran fase ini sendiri dengan wajah baru: **lingkungan uji
yang selalu bersih tidak bisa membuktikan apa pun tentang lingkungan yang kotor.**
Pengecualiannya kini dikunci uji yang sengaja meniru bentuk **produksi**.

## Catatan kejujuran kedua — urutan DROP

Percobaan pertama mengosongkan database gagal: `no such table: main.products`.
Sebabnya foreign key — `DROP TABLE products` ditolak selagi tabel anak yang
mereferensinya masih ada, dan `sqlite_master` mengembalikan tabel dalam urutan
pembuatan (induk lebih dulu). Skrip versi pertama saya menghapus persis menurut
urutan itu, jadi **skrip yang saya tulis untuk membersihkan slot tidak akan
pernah berhasil membersihkan slot**. Diperbaiki dengan membalik urutannya.

D1 menolak seluruh batch secara transaksional, jadi kegagalan itu kentara dan
tidak meninggalkan database separuh terhapus. Verifikasi "masih ada sisa?"
tetap dipasang sebagai penentu akhir, dan ia berhenti **sebelum** menghapus
baris control-plane — supaya slot tak pernah terlihat bebas dalam keadaan kotor.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **464** (dari 453) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1079** (dari 1075) |
| `node scripts/ui-sim.mjs` | 0 | **336/336** |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

11 uji unit baru, 4 cek smoke baru (blok `23c`).

**Dibuktikan bisa gagal**, semuanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| pemeriksaan kebersihan dilepas dari pemilihan slot (perilaku lama) | `slot kotor DILEWATI…` **dan** `semua slot bebas ternyata kotor…` |
| `ResendMailer` mencatat ke console alih-alih melempar (perilaku lama) | `Resend membalas non-2xx → MELEMPAR` **dan** `gagal → mengembalikan false DAN menulis audit` |

Sabotase sengaja mengenai **bentuk cacat aslinya**, bukan pesan galatnya —
pelajaran Fase 22f. Untuk A2 itu berarti mengembalikan pemilihan slot tanpa
pemeriksaan, bukan mengubah teks `KapasitasTenantPenuhError`.

## Verifikasi produksi

`SELECT slug, db_ref, status FROM tenants` → tersisa **dua** baris
(`softtin`, `pt-demo-sejahtera`). Keempat database bekas terverifikasi kosong
(0 tabel milik skema kita; `_cf_KV` sengaja dipertahankan).

## Yang TIDAK dikerjakan, dinyatakan apa adanya

- **`TENANT_DB_MODE=cloudflare` belum dinyalakan.** Perubahannya disiapkan di
  commit terpisah dan **sengaja tidak digabung**, karena deploy mode itu tanpa
  `CLOUDFLARE_API_TOKEN`/`ACCOUNT_ID` membuat **seluruh** pendaftaran gagal —
  lebih buruk daripada batas 6. Menunggu pemilik memasang secret & Workers Paid.
- **Batas 6 masih berlaku.** Empat slot bebas cukup untuk pilot, tidak untuk
  peluncuran terbuka.
- **Jalur Resend sungguhan tetap tak teruji gerbang** — ujinya memakai `fetch`
  tiruan. Yang teruji adalah *reaksi kami* terhadap kegagalan, bukan Resend-nya.
- **26 halaman belum dwibahasa, lampiran file (R2), hari libur di kalender
  pajak, kurs Kemenkeu** — di luar cakupan, tidak menghalangi peluncuran ke
  pasar Indonesia.
- **Domain masih `erpindo.nurudhuhaalamin.workers.dev`.** Bukan pekerjaan kode;
  keputusan pemilik.
