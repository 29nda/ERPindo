# Fase 0 — impor basis kode ke repo & pengukuran angka dasar

Pemilik memulai program baru (harga tunggal, landing dirombak, demo 12 bulan,
skala 1000 perusahaan). Prasyaratnya sederhana tetapi mutlak: **kodenya belum ada
di repo ini.** Repo `29nda/erpindo` hanya berisi `README.md` rintisan dua baris;
seluruh aplikasi ada di arsip unggahan pemilik.

## Yang dikerjakan

- Basis kode ERPindo dipindahkan apa adanya ke repo — **594 berkas, 114.387 baris**.
  Tidak satu baris kode pun diubah di fase ini; mengubah kode sekaligus memindahkannya
  akan membuat setiap kegagalan berikutnya ambigu antara "salah pindah" dan "salah ubah".
- `README.md` rintisan diganti README proyek yang lengkap.
- Pemeriksaan rahasia sebelum commit: seluruh kecocokan pola `xnd_*`, `AIza*`,
  `GOCSPX-`, `ghp_*`, dan blok private key **nihil di kode nyata** — semua kecocokan
  `xnd_development_` adalah placeholder di `docs/` dan berkas uji. Tidak ada
  `.dev.vars` maupun `.env`. `.gitignore` bawaan sudah mengecualikan
  `wrangler.dev.jsonc`, `.dev.vars`, dan `.env`.
- `wrangler.jsonc` memuat `database_id` D1. Itu **pengenal sumber daya, bukan
  rahasia** — akses tetap menuntut kredensial akun. Dibiarkan sebagaimana adanya.

## Validasi — angka DIUKUR, bukan disalin

Seluruh gerbang dijalankan sungguhan di lingkungan ini pada 16 Agustus 2026.
Ini penting dinyatakan: `README.md` memuat angka bertanggal 14 Agustus, dan menyalin
angka itu ke sini akan menjadikan log ini pengulangan klaim, bukan pengukuran.

| Gerbang | Hasil terukur | Klaim README (14 Agu) |
| --- | --- | --- |
| `pnpm typecheck` | ✅ hijau, 4 paket | — |
| `pnpm lint` | ✅ hijau | — |
| `pnpm build` | ✅ hijau — SPA + PWA, 34 entri precache | — |
| `pnpm test` | ✅ **582** unit (shared 273 · web 71 · api 238) | 482 |
| `pnpm smoke` | ✅ **1.115** cek, semua lulus | 1.088 |
| `node scripts/ui-sim.mjs` | ✅ **343/343** cek Chromium nyata | 337 |

**Total 2.040 pemeriksaan otomatis, semuanya hijau.** Ketiga angka lebih tinggi
daripada klaim README, jadi aturan "jumlah cek hanya boleh naik" terpenuhi dan
**582 / 1.115 / 343 menjadi garis dasar** pembanding seluruh fase berikutnya.

## Catatan kejujuran — dua temuan yang membantah rencana saya sendiri

Rencana program yang disetujui pemilik memuat beberapa butir Fase B yang saya tandai
"baru". Menjalankan gerbangnya — bukan membaca kodenya — menunjukkan **tiga di
antaranya sudah ada sejak lama**. Dicatat di sini supaya Fase B tidak membangun ulang
sesuatu yang sudah berjalan, persis larangan yang sudah tertulis di `CLAUDE.md`.

1. **FAQ landing sudah ada, 11 butir** (`landing/sections.ts:197`), dirender di
   `landing/index.tsx:678`, dan ikut disajikan SSR sebagai JSON-LD `FAQPage`.
   Keempat pertanyaan yang saya usulkan ditambahkan ("data milik siapa", "kalau
   berhenti berlangganan", "apakah aman", "impor dari Excel") **seluruhnya sudah
   terjawab di sana**.
2. **Kalkulator hemat biaya sudah ada** (`landing/index.tsx:442`), lengkap dengan
   penanganan titik impas yang ditambal Fase 27a. Komentarnya bahkan menyebut maksud
   yang sama persis dengan usulan saya: *"biaya sistem per-pengguna vs ERPindo tetap"*.
3. **Tabel pembanding sudah ada dua buah** — `Comparison` (`index.tsx:364`) dan
   `CategoryComparison` (`index.tsx:507`).

Ketiganya terlihat bukan dari membaca berkas, melainkan dari **nama cek ui-sim yang
lewat** (`F15 landing: … + hemat Rp di kalkulator`, `F15 … seksi Showcase/Comparison/
FAQ ikut ke Inggris`). Menjalankan gerbang lebih dulu ternyata bukan sekadar formalitas
verifikasi — ia langsung memangkas ruang lingkup Fase B.

### Konsekuensi untuk fase berikutnya

Fase B menyusut dari "bangun bagian pembanding + kalkulator + FAQ" menjadi
**"perbaiki yang akan menjadi salah"**:

- `FAQ` butir 1 menyebut *"Demo publik kami berisi **6 bulan** data nyata"* —
  menjadi salah begitu **Fase C** menaikkannya ke 12 bulan.
- `FAQ` butir 2 menjelaskan *"Ada **tiga paket** — Starter, Business, dan
  Enterprise"* — menjadi salah begitu **Fase A** menjadikannya satu paket.
- `Kalkulator` (`index.tsx:447`) menghitung hemat terhadap
  `PLAN_LIMITS.business.pricePerMonth`. Setelah Fase A, `business` tidak ada lagi —
  `pnpm typecheck` akan menangkapnya sebagai galat, jadi tidak mungkin terlewat diam-diam.
  Efek sampingnya justru menguntungkan: dengan patokan Rp499rb (bukan Rp999rb),
  titik impas melawan ERP per-pengguna **turun setengahnya**.
- SSR `landingSeo.ts` menyebut ketiga harga secara harfiah (baris 29 dan 76) dan
  **wajib ikut berubah**, kalau tidak Google mengindeks harga lama sementara halaman
  menampilkan harga baru.

Karena tiga tempat berbeda memuat fakta yang sama, Fase A dan C **tidak boleh
dianggap selesai** hanya karena kodenya berubah. Cek smoke penegak akan ditambahkan:
halaman publik tidak boleh lagi memuat "Starter"/"Business"/"Enterprise", dan tidak
boleh menyebut demo "6 bulan".

## Berikutnya

Fase A — harga tunggal Rp499.000, seluruh modul terbuka, `MODULE_MIN_PLAN` dicabut.
