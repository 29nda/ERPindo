# Langkah yang menunggu Anda

> Halaman ini ditulis untuk pemilik. Seluruh pekerjaan kode sudah selesai dan
> ter-merge. **Tiga hal di bawah ini tidak bisa dikerjakan dari sisi kode** —
> semuanya menuntut akses ke akun Cloudflare Anda atau keputusan biaya Anda.
>
> Urutan di dalam tiap langkah **tidak boleh dibalik**. Yang paling berbahaya
> ditandai jelas.

---

## Ringkasan cepat

| # | Langkah | Waktu | Biaya | Akibat bila ditunda |
| --- | --- | --- | --- | --- |
| 1 | Semai ulang demo → 12 bulan | ±20 menit | gratis | Demo masih 6 bulan; calon pelanggan melihat produk yang lebih dangkal daripada aslinya |
| 2 | Workers Paid + D1 dinamis | ±15 menit | **$5/bulan** | **Kapasitas mentok 6 perusahaan.** Pendaftar ke-7 ditolak |
| 3 | Token analitik (monitor kuota) | ±5 menit | gratis | Anda tidak tahu sisa kuota sampai pelanggan menelepon karena aplikasi mati |

Bisa dikerjakan terpisah dan dalam urutan apa pun. Yang paling mendesak adalah
**nomor 2**, dan hanya bila Anda mengharapkan lebih dari enam pelanggan.

---

## 1. Semai ulang demo publik menjadi 12 bulan

**Kenapa.** Tanpa masa coba gratis, demo publik adalah **satu-satunya** cara
calon pelanggan menilai produk. Kodenya sudah dinaikkan ke 12 bulan riwayat,
tetapi **data di produksi tidak ikut berubah dengan sendirinya** — ia hanya
berubah saat penyemainya dijalankan.

Halaman depan sengaja **tidak menyebut angka bulan** sama sekali, jadi tidak ada
janji yang meleset selama Anda belum sempat. Ini peningkatan mutu, bukan
tambalan kebohongan.

**Langkah:**

1. Buka repo di GitHub → tab **Actions** → workflow **seed-demo**.
2. Pastikan secret `SEED_EMAIL` dan `SEED_PASSWORD` sudah terisi
   (Settings → Secrets and variables → Actions). Keduanya harus milik akun yang
   terdaftar di `COMPED_EMAILS` — perusahaan demo tidak pernah membayar, jadi ia
   harus disemai dari akun yang dibebaskan dari paywall.
3. Klik **Run workflow**.

**Verifikasi — jangan lewati.** Setelah selesai, jalankan pemeriksa yang
mengueri hasilnya, bukan sekadar melihat layar:

```sh
BASE_URL=https://<alamat-aplikasi-anda> \
  SEED_EMAIL=<email> SEED_PASSWORD=<sandi> \
  node scripts/verifikasi-demo.mjs --tanpa-semai
```

Ia mencetak tabel laba-rugi & kas **per bulan** dan gagal bila ada bulan yang
rugi, kas negatif, atau hutang melampaui kas. Alat ini ada karena demo produksi
pernah menampilkan **rugi Rp 20,7 juta** di bulan lalu tanpa ada yang tahu
selama berminggu-minggu — tak satu pun gerbang mutu bisa melihatnya, karena
cacatnya ada di data, bukan di kode.

---

## 2. Workers Paid + D1 dinamis — menembus batas 6 perusahaan

> ### ⚠️ URUTANNYA TIDAK BOLEH DIBALIK
>
> Mengubah `TENANT_DB_MODE` ke `cloudflare` **sebelum** secretnya terpasang akan
> membuat **SELURUH pendaftaran gagal** — lebih buruk daripada batas 6 yang
> berlaku sekarang. Peringatan ini juga tertulis di `wrangler.jsonc` tepat di
> atas baris yang bersangkutan.

**Kenapa $5/bulan diperlukan.** Ini kesimpulan yang paling penting dari seluruh
program, dan angkanya resmi dari Cloudflare:

| Sumber daya | Paket gratis | Workers Paid ($5/bln) |
| --- | --- | --- |
| Request Worker | 100.000/hari | tanpa batas |
| Tulis KV | 1.000/hari | 1 juta/bulan |
| Baris D1 ditulis | 100.000/hari | 50 juta/bulan |
| Baris D1 dibaca | 5 juta/hari | 25 miliar/bulan |
| Subrequest per request | 50 | 10.000 |
| CPU per request | 10 ms | 5 menit |

Target 1.000 perusahaan **mustahil** di paket gratis — bukan karena kodenya,
melainkan karena empat batas keras sekaligus. Pada 10 pelanggan saja pendapatan
Anda sudah Rp 5.000.000/bulan, sehingga $5 menjadi tidak relevan.

**Langkah, berurutan:**

1. **Naikkan ke Workers Paid.** dash.cloudflare.com → Workers & Pages →
   Plans → Workers Paid.
2. **Buat API token.** My Profile → API Tokens → Create Token → Custom token.
   Izin minimum: **Account · D1 · Edit**. (Tambahkan **Account · Account
   Analytics · Read** sekalian bila Anda juga mengerjakan langkah 3.)
3. **Pasang dua secret** di Workers & Pages → **erpindo** → Settings →
   Variables and Secrets:
   - `CLOUDFLARE_API_TOKEN` — token dari langkah 2
   - `CLOUDFLARE_ACCOUNT_ID` — terlihat di sidebar kanan dashboard
4. **Deploy** (otomatis begitu ada perubahan, atau klik Deploy manual).
5. **Verifikasi SEBELUM menyalakan.** Buka aplikasi → menu **Admin → Infra**.
   Pastikan halamannya terbuka dan `dbMode` masih `local`. Bila halaman ini
   galat, **berhenti** — jangan lanjut ke langkah 6.
6. **Baru sekarang** ubah `wrangler.jsonc`: `"TENANT_DB_MODE": "local"` →
   `"cloudflare"`, commit, dan biarkan ter-deploy.
7. **Uji dengan satu pendaftaran sungguhan.** Daftarkan perusahaan uji coba dan
   pastikan ia berhasil masuk. Bila gagal, kembalikan baris di langkah 6 ke
   `local` — pendaftaran langsung pulih.

Runbook lebih rinci: `docs/05-runbook-go-live.md` §6.

---

## 3. Token analitik — monitor kuota di dasbor

**Kenapa.** Anda memilih "mulai gratis, naik paket saat tumbuh". Keputusan itu
hanya bisa diambil tepat waktu bila angkanya terlihat. Tanpa monitor, cara Anda
mengetahui kuota habis adalah **pelanggan menelepon karena aplikasinya mati**
(Error 1027) — titik ketika menaikkan paket sudah terlambat.

**Langkah:**

1. Buat/perbarui API token dengan izin **Account · Account Analytics · Read**
   (bisa token yang sama dengan langkah 2).
2. Pastikan `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` terpasang.
3. Buka **Admin → Ringkasan**. Kartu **Kuota Cloudflare** akan berubah dari
   pesan "belum aktif" menjadi tiga bilah pemakaian. Peringatan muncul di **70%**.

> **Catatan jujur.** Kueri analitik ini **belum pernah diuji terhadap akun
> Cloudflare sungguhan** — tokennya milik Anda dan tidak tersedia di lingkungan
> pengembangan. Bila bentuk datanya ternyata berbeda dari dugaan, kartunya akan
> menampilkan pesan "tidak bisa membaca kuota" beserta alasannya, dan **sisa
> dasbor tetap normal**. Kabari bila itu terjadi; perbaikannya kecil, tetapi
> harus dilakukan dengan melihat respons aslinya.

---

## Yang TIDAK perlu Anda kerjakan

- **Harga & paket** — sudah menjadi satu paket Rp 499.000/perusahaan/bulan
  dengan seluruh modul terbuka. Berlaku otomatis; tenant lama ikut dinormalkan
  oleh migrasi saat deploy pertama.
- **Backup data pelanggan** — ekspor ZIP penuh dan backup Google Drive sudah ada
  sejak sebelum program ini. Data tetap bisa diunduh bahkan setelah langganan
  berakhir.
- **Keamanan** — 2FA, RBAC per peran, audit log, rate limit, CSP, dan enkripsi
  token OAuth semuanya sudah terpasang dan diuji.
- **Pemberitahuan penurunan harga** — tidak diperlukan; Anda mengonfirmasi belum
  ada pelanggan berbayar pada paket lama.
