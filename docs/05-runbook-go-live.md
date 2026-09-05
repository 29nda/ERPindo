# Runbook Go-Live ERPindo

> Panduan operasional mengubah "aplikasi jadi" menjadi "aplikasi menghasilkan".
> Ditujukan ke pemilik + operator rilis. Semua nama secret & perilaku di sini
> **diverifikasi langsung dari kode** (`apps/api/src/env.ts` dan handler terkait),
> bukan asumsi.

**Status dasar:** aplikasi sudah live di Cloudflare Workers (auto-deploy dari
`main`). Yang tersisa untuk komersialisasi hampir seluruhnya **memasang kunci**,
bukan menulis kode — tiap fitur berkunci sudah *degradasi anggun* (menampilkan
instruksi/pesan jelas, bukan error) sampai kuncinya dipasang.

---

## 0. Kapasitas pendaftaran — periksa ini LEBIH DULU

> Ditambahkan Fase 23c setelah produksi ditemukan **penuh 6/6** sehari sebelum
> peluncuran. Empat dari enam slotnya dihabiskan skrip uji (`seed-demo.mjs` dan
> `ai-probe.mjs`, masing-masing mendaftarkan perusahaan tiap kali jalan).
> Pendaftar sungguhan berikutnya akan ditolak — dan tidak ada satu pun gerbang
> mutu yang bisa melihatnya, karena semua gerbang berjalan di D1 lokal yang
> selalu kosong.

Di mode `local`, **jumlah binding `TENANT_DB_*` adalah batas keras jumlah
perusahaan** (6). Periksa sisanya sebelum apa pun yang lain:

- **Admin → Infra → "Sisa kapasitas daftar"** (butuh `PLATFORM_ADMIN_EMAILS`,
  lihat §1c). Peringatan otomatis muncul saat sisa ≤ 2.
- Peringatan terpisah muncul bila ada slot **bebas tetapi masih berisi data
  perusahaan lama**. Slot begitu sengaja **dilewati** saat pendaftaran, bukan
  dipakai: memakainya berarti menyerahkan pembukuan perusahaan sebelumnya
  kepada pendaftar baru. Bersihkan dengan:

  ```sh
  CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… \
    node scripts/bersihkan-tenant.mjs <slug>            # pratinjau dulu
  … node scripts/bersihkan-tenant.mjs <slug> --hapus    # baru eksekusi
  ```

  Skrip itu mengosongkan database tenant **lebih dulu**, baru menghapus baris
  control-plane — urutan sebaliknya justru menciptakan slot kotor tadi.
  `softtin` dan `pt-demo-sejahtera` ada di daftar dilindungi dan tidak bisa
  terhapus.

**Menghilangkan batasnya sama sekali** (disarankan bila menargetkan >6
pelanggan) — lihat §6.

---

## 1. Empat kunci yang perlu dipasang

Semua disimpan sebagai **secret terenkripsi** di dashboard Cloudflare
(Workers & Pages → **erpindo** → Settings → Variables and Secrets), atau via CLI
`wrangler secret put <NAMA>`. Jangan pernah menaruhnya di repo.

### 1a. Xendit — tarik pembayaran langganan (pemblokir monetisasi #1)

> Fase 25a: provider diganti dari Midtrans ke **Xendit**. Nama secret lama
> (`MIDTRANS_*`) sudah tidak dibaca kode mana pun — hapus saja bila terlanjur
> terpasang.

| Secret | Isi |
|---|---|
| `XENDIT_SECRET_KEY` | Secret Key dari dashboard Xendit (Settings → Developers → API Keys) |
| `XENDIT_CALLBACK_TOKEN` | Webhook Verification Token (Settings → Developers → Webhooks) |

> **Keduanya wajib, dan checkout tidak menyala sampai dua-duanya terpasang.**
> Itu disengaja: dengan secret key saja, pelanggan **bisa membayar sungguhan**
> tetapi setiap webhook ditolak 403 — uang masuk, langganan tak pernah aktif,
> database perusahaan tak pernah dibuat. Aturannya: jangan menjual apa yang
> tidak bisa dikonfirmasi. Selama salah satu kosong, `GET /api/billing` membalas
> `configured:false` dan checkout membalas 503 berpesan.

- **Membuka:** checkout langganan (QRIS/VA/kartu/e-wallet lewat halaman bayar
  Xendit), aktivasi otomatis via webhook terverifikasi, link bayar faktur
  pelanggan (Fase 11d).
- **Tanpa kunci:** `GET /api/billing` membalas `configured:false`; checkout
  membalas `503 "Pembayaran online belum dikonfigurasi…"` (bukan error keras).
- **Uji vs produksi ditentukan KUNCINYA, bukan alamat servernya.** Xendit memakai
  `api.xendit.co` yang sama untuk keduanya: `xnd_development_…` = mode uji,
  `xnd_production_…` = uang sungguhan. Karena itu **pasang kunci `xnd_development_`
  dulu**, jalankan uji §3 sampai tuntas, baru ganti ke kunci produksi.
  Selama kunci uji terpasang, Pengaturan → Langganan menampilkan lencana
  **"mode uji pembayaran"** — bila lencana itu masih muncul di produksi,
  pembayaran pelanggan tidak akan pernah menjadi uang.
- **Webhook:** dashboard Xendit → Settings → Webhooks → *Invoices paid* →
  `https://<domain>/api/billing/notification`. Verifikasi header
  `x-callback-token` sudah ada di kode; token yang salah ditolak 403.
- **Retry:** Xendit mengulang webhook hingga 6× dengan backoff bila endpoint
  membalas non-2xx. Kegagalan yang tidak bisa diperbaiki dengan mengulang
  (mis. pool tenant penuh) sengaja tetap dibalas 2xx dan dicatat di audit log
  sebagai `billing.provisioning_tertunda`.

### 1b. Google OAuth — login Google + backup Drive

| Secret | Isi |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth Client ID (console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret |

- Buat OAuth Client (tipe Web) dengan **dua** Authorized redirect URI:
  - `https://<domain>/api/auth/google/callback` (login)
  - `https://<domain>/api/drive/callback` (backup Drive)
- **Membuka:** tombol "Lanjutkan dengan Google" + backup terenkripsi ke Drive.
- **Tanpa kunci:** `GET /api/drive/status` → `configured:false` (UI menyembunyikan/
  menonaktifkan tombol); endpoint auth Google membalas `503 "belum dikonfigurasi"`.

### 1c. Admin Platform

| Secret | Isi |
|---|---|
| `PLATFORM_ADMIN_EMAILS` | email Anda (pisah koma bila >1) |

- **Membuka:** menu **Admin** (`/app/admin`) — pantau pendaftar, langganan,
  masukan pengguna, tulis blog.
- **Tanpa var:** seluruh `/api/admin` membalas **403** (aman secara default).

### 1d. Email transaksional (Resend) — opsional tapi disarankan

| Secret | Isi |
|---|---|
| `RESEND_API_KEY` | API key Resend |
| `MAIL_FROM` | mis. `ERPindo <no-reply@erpindo.id>` (default sudah ada) |

- **Membuka:** email nyata (verifikasi, lupa sandi, pengingat trial/tagihan).
- **Tanpa kunci:** `ConsoleMailer` — email hanya **dicatat ke log**, aplikasi tidak
  gagal. Cocok untuk staging; wajib untuk produksi agar pengguna terima email.

> **Catatan:** Lampiran file (Fase 2m, butuh **R2**) **belum dibangun** — tidak
> ada binding R2 di kode saat ini, jadi tidak ada yang perlu dinyalakan sampai
> fiturnya dibuat. Provisioning D1 dinamis (skala >6 tenant) memakai
> `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` — aktifkan hanya saat menjelang
> skala komersial.

---

## 2. Ringkasan degradasi anggun (terverifikasi kode)

| Fitur | Tanpa kunci | Dengan kunci |
|---|---|---|
| Billing/langganan | `configured:false`, checkout `503` berpesan | Checkout + aktivasi otomatis |
| Login/Drive Google | `configured:false`, tombol nonaktif | Login Google + backup Drive |
| Admin Platform | `/api/admin` → `403` | Menu Admin aktif untuk email terdaftar |
| Email (Resend) | dicatat ke log (tak gagal) | Email nyata terkirim |
| Asisten AI | `503 "binding-absent"`, kuota tak terpotong | AI menjawab |

Prinsip ini **diuji deterministik** di smoke — jadi memasang/mencabut kunci tidak
akan membuat aplikasi gagal keras.

---

## 3. Uji langganan mode uji Xendit (sebelum produksi)

1. Pasang `XENDIT_SECRET_KEY` **`xnd_development_…`** + `XENDIT_CALLBACK_TOKEN`.
2. Daftarkan webhook Xendit → `/api/billing/notification`.
3. Buka Pengaturan → Langganan, pastikan lencana **"mode uji pembayaran"** muncul.
   Kalau tidak muncul, kunci yang terpasang kunci produksi — berhenti di sini.
4. Buat perusahaan uji → Pengaturan → Langganan → pilih paket → checkout.
5. Bayar lewat **simulasi pembayaran** di dashboard Xendit (invoice test mode).
6. Verifikasi: webhook masuk → langganan **otomatis aktif** → banner baca-saja
   hilang → **database tenant terbentuk** (sejak Fase 24a, pembayaran pertama
   inilah yang membuatnya; cek Admin → Infra bila ragu). Cek juga invoice yang
   dibiarkan **expired** → status tidak aktif.
7. Uji **link bayar faktur** (Fase 11d) ke pelanggan.
8. Bila semua benar → ganti `XENDIT_SECRET_KEY` ke **`xnd_production_…`** dan
   pastikan lencana "mode uji pembayaran" **hilang**. Token webhook produksi
   berbeda dari token uji — perbarui `XENDIT_CALLBACK_TOKEN` sekalian, kalau
   tidak seluruh webhook produksi akan ditolak 403.

---

## 4. Checklist pra-peluncuran

**Gerbang mutu (harus hijau — sudah otomatis di CI):**
- [ ] `pnpm typecheck && pnpm test && pnpm build && pnpm smoke` (**1.340 smoke · 1.244 unit**)
- [ ] `node scripts/ui-sim.mjs` (**494 cek browser**)
- [ ] `pnpm lint`

**Urutan pasang kunci (bukan sembarang urutan):**

1. **`PLATFORM_ADMIN_EMAILS`** — didahulukan karena inilah yang membuka Admin →
   Infra, satu-satunya tempat sisa kapasitas & kesehatan tenant terlihat. Tanpa
   ini Anda menjalankan sisa checklist dengan mata tertutup.
2. **Resend** — didahulukan kedua karena satu-satunya langkah yang **menunggu
   pihak lain**: verifikasi domain pengirim butuh propagasi DNS (bisa berjam-jam).
   Pasang pagi-pagi, kerjakan yang lain sambil menunggu.
3. **Google OAuth** — perlu domain final lebih dulu (redirect URI).
4. **Kunci uji Xendit** (`xnd_development_…`) → jalankan uji §3 sampai tuntas →
   **baru** kunci produksi. Jangan membalik urutan ini: kunci produksi yang
   dipasang sebelum alurnya terbukti berarti uji pertama Anda memakai uang
   sungguhan. Xendit tidak punya host sandbox terpisah, jadi urutan ini —
   ditambah lencana "mode uji pembayaran" di Pengaturan → Langganan — adalah
   satu-satunya pengaman yang ada.

**Konfigurasi produksi:**
- [ ] **Kapasitas diperiksa (§0)** — sisa slot cukup, dan tidak ada slot kotor
- [ ] **Kapasitas:** `TENANT_DB_MODE=cloudflare` + `CLOUDFLARE_API_TOKEN` +
      `CLOUDFLARE_ACCOUNT_ID` bila menargetkan **lebih dari 6 perusahaan**.
      Tanpa ini pendaftar ke-7 ditolak `503` — pesannya jelas, tetapi tetap tak
      bisa mendaftar
- [ ] Domain kustom dipasang (Workers → Custom Domains) & redirect URI Google
      menunjuk domain final
- [ ] Empat kunci §1 terpasang (Xendit **produksi** + token webhook-nya, Google, admin, Resend)
- [ ] `COMPED_EMAILS` berisi email pemilik (akun kebal trial) bila diperlukan
- [x] **Demo publik disemai ulang ke 12 bulan** (Fase 24b, diperdalam di Fase 30).
      Sejak trial dihapus, demo inilah satu-satunya cara calon pelanggan menilai
      produk. Caranya di §7. **Diperiksa ulang 29 Agustus 2026:** demo produksi
      berisi **237** jurnal yang membentang 15 bulan (2025-06-05 s.d. 2026-08-31).
- [x] Seed demo produksi masih tampil sehat (`/app` mode demo, neraca seimbang,
      **laba positif** di jendela 12 bulan maupun bulan berjalan).
      **Diperiksa ulang 29 Agustus 2026** langsung di D1 produksi: total debit =
      total kredit (**Rp 5.086.116.854**) dan **nol** jurnal yang tidak seimbang.

      > Angkanya berubah dari catatan 24 Agustus (236 jurnal ·
      > Rp 5.085.725.220) karena Fase 48a memposting **satu jurnal koreksi**
      > (JRN-00237): beban PPh Final UMKM Rp 391.634 dipindahkan dari akun
      > `5-2100` — yang ternyata sudah dipakai "Beban Produksi Diserap" — ke
      > `5-2200`. Bukan data baru, melainkan pembetulan penempatan akun.

**Uji asap manual pasca-deploy (di domain produksi):**
- [ ] Daftar perusahaan baru → login → buat faktur → terima pembayaran → Neraca seimbang
- [ ] POS: buka shift → jual tunai → kembalian benar → tutup shift
- [ ] Asisten AI menjawab (HTTP 200) — bila 503, cek binding Workers AI
- [ ] Email verifikasi/lupa-sandi benar-benar **sampai ke inbox** (Resend) —
      lalu buka **Admin → audit log** dan pastikan tidak ada entri `email.gagal`.
      Sejak Fase 23c kegagalan Resend dicatat alih-alih ditelan diam-diam;
      "tidak ada entri" adalah buktinya, bukan "layarnya bilang terkirim"
- [ ] Checkout langganan produksi (nominal kecil) → aktivasi otomatis
- [ ] Login Google berhasil → pendaftar baru hanya ditanya nama perusahaan
- [ ] Menu Admin muncul untuk email di `PLATFORM_ADMIN_EMAILS`

---

## 5. Pasca-peluncuran

- **Pantauan:** Cloudflare → Workers → erpindo → Logs/Analytics; tab **Infra** di
  Admin Platform (mode DB, versi skema, tenant tertinggal migrasi).
- **Rollback:** Workers Builds menyimpan riwayat deploy — kembalikan ke deploy
  hijau sebelumnya bila ada regresi. Semua migrasi tenant **maju & idempoten**.
- **Skala — batas keras 6 perusahaan.** Mode bawaan (`local`) memetakan tiap
  tenant ke satu binding `TENANT_DB_1..6`. Pendaftaran perusahaan **ke-7
  ditolak** dengan `503 kapasitas-penuh` berpesan jelas (bukan 500 — dijaga uji
  `provisionTenantDb — kapasitas pool`), tetapi tetap **ditolak**. Aktifkan D1
  dinamis SEBELUM peluncuran bila menargetkan lebih dari 6 pendaftar:
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` + `TENANT_DB_MODE=cloudflare`
  — lihat §6 di bawah.
- **Kuota AI:** Workers AI gratis ~10rb neuron/hari; fitur AI dibatasi per tenant.
  Bila laris, Workers AI berbayar murah (bayar per neuron) & bisa dibebankan ke
  paket Enterprise.

---

## 6. Menghilangkan batas 6 perusahaan (D1 dinamis)

Langkah lengkapnya ada di §6 dokumen ini;
ringkasannya di sini supaya bisa dikerjakan tanpa berpindah dokumen.

**Prasyarat:**

1. **Workers Paid ($5/bln)** — free tier D1 dibagi se-akun dan hanya cukup untuk
   pilot beberapa usaha.
2. **`CLOUDFLARE_API_TOKEN`** — buat di dash.cloudflare.com → My Profile → API
   Tokens → Create Token → Custom token, izin **D1 : Edit** pada akun yang
   dipakai. **Jangan** memakai Global API Key.
3. **`CLOUDFLARE_ACCOUNT_ID`** — id akun (terlihat di URL dashboard Workers).

**Langkah:**

```sh
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# lalu ubah wrangler.jsonc → "vars": { "TENANT_DB_MODE": "cloudflare" }
wrangler deploy
```

> **Pasang secret-nya DULU, baru ubah `TENANT_DB_MODE`.** Deploy mode
> `cloudflare` tanpa kedua secret membuat **seluruh** pendaftaran gagal
> (`tenantDb.ts` menolak di awal) — lebih buruk daripada batas 6.
>
> Sejak Fase 50b keadaan itu **terlihat tanpa menunggu ada yang mendaftar**:
> Admin → Infra menampilkan peringatan merah yang menyebut secret mana yang
> kurang. Sebelumnya justru sebaliknya — kartu kapasitas sengaja diam di mode
> `cloudflare` (D1 dinamis memang tak berbatas), sehingga deploy yang salah
> konfigurasi terlihat **lebih sehat** daripada deploy lokal yang normal.
> Kalau Anda terlanjur membalik urutannya, buka Admin → Infra: peringatannya
> ada di paling atas.

**Verifikasi:**

- Daftar satu perusahaan uji → `db_ref`-nya harus berawalan `uuid:`, bukan
  `binding:`.
- Admin → Infra → "Mode database tenant" = **Cloudflare (D1 dinamis)**;
  kartu sisa kapasitas menghilang (memang tidak ada lagi batas kerasnya).
- Hapus perusahaan uji itu sesudahnya.

**Enam tenant lama tetap `binding:` dan terus berfungsi** — `getTenantDb()`
menyelesaikan per-`db_ref`, jadi kedua mode hidup berdampingan. Tidak ada
migrasi yang perlu dijalankan.


---

## 7. Menyemai ulang demo publik (12 bulan)

Perusahaan demo **tidak pernah membayar**, dan sejak Fase 24a hanya akun yang
terdaftar di `COMPED_EMAILS` yang mendapat database saat mendaftar. Karena itu
seed **harus** dijalankan dari akun comped Anda — mode `SEED_REGISTER` dengan
akun acak tidak lagi bisa bekerja (akun acak mustahil ada di `COMPED_EMAILS`).

**Sekali saja:** simpan dua secret di repo GitHub (Settings → Secrets and
variables → Actions):

| Secret | Isi |
|---|---|
| `SEED_EMAIL` | email Anda yang **sudah ada di `COMPED_EMAILS`** worker |
| `SEED_PASSWORD` | passwordnya |

**Menjalankan:** push ke branch `ops/seed-demo-run` (workflow `Seed demo`).

**Mengganti demo lama dengan yang baru (Fase 25b).** Demo lama harus dihapus
lebih dulu — slugnya sama. Urutannya **buktikan dulu, baru hapus**, karena
menghapus demo lalu menemukan kredensialnya salah berarti demo mati tanpa jalan
pulang:

1. Push commit yang **judulnya DIAWALI `[probe]`** ke `ops/seed-demo-run`.
   Workflow login, melaporkan akun + status comped + apakah perusahaan demo
   sudah ada, lalu **berhenti tanpa menulis apa pun**. Dua baris yang dicari di
   log: `comped : YA` dan `demo sudah ada: YA`.
   - `comped : TIDAK` → email itu belum ada di `COMPED_EMAILS` (atau ejaannya
     beda). Perusahaan demo akan lahir paket `starter` dan seed berhenti di awal.
     Perbaiki secretnya lebih dulu — **ini juga cara memeriksa `COMPED_EMAILS`
     tanpa membuat perusahaan apa pun.**
   - Login gagal → secret `SEED_*` belum terpasang/salah. Berhenti di sini.
   - `demo sudah ada: TIDAK` → `SEED_EMAIL` bukan anggota perusahaan demo;
     menjalankan seed akan **membuat demo kedua**, bukan menggantikan. Perbaiki
     dulu.
2. Hapus demo lama:
   ```sh
   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… \
     node scripts/bersihkan-tenant.mjs pt-demo-sejahtera --izinkan-demo          # pratinjau
   … node scripts/bersihkan-tenant.mjs pt-demo-sejahtera --izinkan-demo --hapus  # eksekusi
   ```
   Tombol "Lihat Demo" mati sejak titik ini sampai langkah 3 selesai.
3. Push lagi ke `ops/seed-demo-run`, kali ini **tanpa** `[probe]` di judul commit.

Kapasitas: seed memakai **2 slot** (PT Demo Sejahtera + CV Demo Cabang).
"Workspace Staf Demo" tidak lagi memakan slot sejak Fase 24a — pendaftar lahir
`provisioning` tanpa database.

> **Perusahaan demo HARUS berpaket `enterprise`.** `POST /auth/companies` memberi
> `enterprise` hanya bila akunnya ada di `COMPED_EMAILS`; selain itu `starter`,
> dan di starter modul CRM/HR/proyek/manufaktur/helpdesk menolak 403 sehingga
> demo terisi separuh. Sejak Fase 25b seed **berhenti di awal** bila paketnya
> salah, jadi kegagalannya kentara — tetapi perbaikannya tetap dua pilihan:
> masukkan email seed ke `COMPED_EMAILS`, atau naikkan paket tenant demo ke
> `enterprise` di control-plane sebelum menjalankan ulang.

**Verifikasi sesudahnya:**

1. Buka `/demo` dari landing — masuk tanpa mendaftar.
2. Laporan → Laba Rugi, rentang **6 bulan terakhir**: harus ada isi tiap bulan
   dan **labanya positif**.
3. Dasbor: grafik tren dan pembanding periode tidak kosong.

> Skrip berhenti di awal dengan penjelasan bila akunnya belum berlangganan —
> bukan gagal di tengah jalan. Bila pesan itu muncul, `SEED_EMAIL` belum ada di
> `COMPED_EMAILS`.

**Yang menjadi 6 bulan:** penjualan, pembelian, pembayaran, dan piutang yang
menua. **Penggajian dan penyusutan masih ±2 periode** — dinyatakan apa adanya.
