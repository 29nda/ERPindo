# Fase 27b — seksi "Jadwalkan demo" dihapus

Pemilik menunjuk satu hal yang benar dan sudah lama berdiri di halaman depan
tanpa dipertanyakan: *"ngapain jadwalkan demo, kan tinggal klik udah kelihatan
demonya"*.

Halaman itu memang menawarkan dua hal berbeda dengan nama yang sama:

| | Apa yang terjadi |
| --- | --- |
| Tombol **"Lihat Demo"** | Sekali klik → masuk perusahaan contoh berisi 6 bulan data |
| Seksi **"Jadwalkan demo"** | Isi 6 kolom → tunggu ditelepon orang |

Yang kedua membuat yang pertama terlihat seperti tawaran kelas dua, padahal
justru yang pertama yang lebih baik.

## Yang ditemukan saat memverifikasi: formulir itu jalan buntu

Masalahnya ternyata lebih dalam daripada penamaan. Pengisi formulir melihat
*"Tim kami akan menghubungi Anda secepatnya"*, sementara hari ini **tidak satu
pun jalur pemberitahuan benar-benar sampai**:

| Jalur | Keadaan |
| --- | --- |
| Email ke pemilik | Memakai `PLATFORM_ADMIN_EMAILS` — **belum dipasang**, penerimanya kosong, email tidak pernah dikirim |
| Email (andai penerima ada) | `RESEND_API_KEY` **belum dipasang** → hanya dicatat ke log |
| Layar Admin | `GET /api/admin/demo-requests` **ada**, method klien `adminDemoRequests` **ada** — tetapi **tidak ada satu layar pun yang memanggilnya** |

Jadi data masuk ke tabel yang tidak pernah dibaca siapa pun. Produksi mencatat
**0 permintaan** — belum ada trafik, jadi belum ada calon pelanggan yang menunggu
telepon yang tidak akan datang.

Keputusan pemilik: **hapus**. Demo instan menggantikannya.

## Yang dihapus

- Komponen `DemoRequest()` di `landing/index.tsx` beserta pemakaiannya.
- **Kartu "Layanan pendampingan" di seksi harga ikut dihapus.** Seluruh isinya
  ajakan menghubungi ("hubungi kami untuk penawaran") menuju formulir yang sudah
  tidak ada. Membiarkannya berarti menjanjikan percakapan tanpa satu pun cara
  memulainya — persis kelas cacat yang baru dibersihkan Fase 27a. Kartu **"Untuk
  grup & holding"** tetap: ia menjelaskan isi paket Enterprise, bukan mengajak
  menghubungi siapa pun.
- `apps/api/src/routes/demo.ts` (berkasnya 100% fitur ini), mount-nya,
  `GET /api/admin/demo-requests`, dua method klien, dan kontrak
  `demoRequestSchema` / `DemoRequestInput` / `ApiDemoRequest` di shared.

**Tabel `demo_requests` TIDAK di-drop.** Migrasi repo ini append-only — aturannya
tertulis di `packages/db/src/migrations.ts`. Tabel ditinggal kosong dan tidak
dipakai; menambah migrasi `DROP TABLE` demi kerapian bukan pertukaran yang
sepadan, apalagi barisnya memang nol.

## Jumlah cek TURUN — dan itu disengaja

Pertama kalinya dalam program ini. Ditulis terbuka, bukan diselipkan.

| | Jumlah |
| --- | --- |
| Cek smoke dihapus (fiturnya tidak ada lagi) | −4 |
| Cek ui-sim dihapus (pengisian formulir) | −1 |
| Cek pengganti yang mengunci keputusan | +2 |
| **Bersih** | **−3** |

Aturan "jumlah cek hanya boleh naik" ada supaya cakupan tidak menyusut
diam-diam. Menghapus fitur secara sadar adalah pengecualian yang sah — asalkan
ditulis, dan asalkan penggantinya menjaga keputusannya:

- **smoke**: `POST /api/demo-requests` membalas **404** — endpoint publiknya
  benar-benar hilang, bukan sekadar tombolnya disembunyikan.
- **ui-sim (F48)**: halaman depan tidak lagi memuat formulir maupun jangkar
  `#demo`, **dan** tombol "Lihat Demo" tetap ada — menjaga agar yang terhapus
  yang benar, bukan demonya.

## Penjaga repo menangkap sisa saya sendiri

Setelah `demo.ts` dihapus, `pnpm test` merah di
`test/rbac-guard.test.ts` → *"daftar putih tidak mengandung entri basi"*:
`demo.ts POST "/"` masih tercantum sebagai rute publik yang diizinkan tanpa
sesi. Entri itu dibersihkan.

Penjaga itu ditulis untuk mencegah daftar putih RBAC membusuk, dan ia bekerja
persis seperti itu — menangkap sisa penghapusan yang saya sendiri tinggalkan.

Sisa kedua tidak tertangkap alat mana pun dan baru terlihat saat membaca diff
sendiri: setelah `GET /demo-requests` dihapus dari `admin.ts`, komentar
*"Permintaan demo dari landing (Fase 13c)"* ikut turun dan menempel di endpoint
`GET /feedback` — sekaligus menghapus judul seksi milik endpoint itu. Tidak ada
uji yang bisa menangkap komentar salah tempel; yang menangkapnya membaca ulang.
Judul aslinya dikembalikan.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | 0 | — |
| `pnpm test` | 0 | **561** (tetap) |
| `pnpm smoke` | 0 | **1.115** (dari 1.118, −3 disengaja) |
| `node scripts/ui-sim.mjs` | 0 | **343/343** (tetap) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

**Dibuktikan bisa gagal** — dua sabotase, keduanya dipulihkan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| Endpoint dipasang kembali (`POST /api/demo-requests` → 201) | cek smoke 404: **"→ HTTP 201"** |
| Jangkar `#demo` dikembalikan ke halaman | F48: **"tombol=0 jangkar=1"** |

Catatan dari percobaan sabotase pertama: mengembalikan `routes/demo.ts` apa
adanya **tidak bisa dibangun** — kontrak `demoRequestSchema` di shared sudah ikut
hilang, jadi penghapusan ini dijaga compiler, bukan hanya oleh uji. Sabotase
diulang dengan endpoint tiruan yang tetap kompilasi supaya ceknya benar-benar
terbukti bisa merah.

## Konsekuensi yang dinyatakan, bukan disembunyikan

**Halaman depan kini tidak punya satu pun cara menghubungi manusia.** Seluruh
jalurnya swalayan: lihat demo → daftar → bayar. Calon pelanggan grup/holding yang
biasanya ingin bicara dulu tidak punya pintu.

Itu konsekuensi langsung dari keputusan pemilik dan bisa dibenarkan
pra-peluncuran — dicatat di sini dan di `docs/STATUS.md` sebagai utang terbuka,
supaya kalau kelak ada calon pelanggan besar yang menanyakannya, sebabnya
diketahui dan bukan kejutan.

## Yang TIDAK dikerjakan

- **Tabel `demo_requests` tidak di-drop** (migrasi append-only).
- **Tidak ada kanal kontak pengganti** (email/WhatsApp): repo tidak memuat alamat
  kontak mana pun, dan menetapkannya keputusan bisnis pemilik — bukan tebakan.
- **Halaman `/fitur` dan panduan tidak disentuh** — keduanya tidak pernah
  menautkan formulir ini.
