# Tutorial peluncuran — dari sekarang sampai pelanggan pertama membayar

> Untuk **pemilik**. Ditulis sebagai urutan kerja: klik di mana, isi apa, cara
> tahu berhasil, dan akibatnya bila dilewati.
>
> Bedanya dengan [`05-runbook-go-live.md`](05-runbook-go-live.md): runbook itu
> daftar **apa saja yang ada** (nama secret, perilakunya, alasannya) untuk
> operator rilis. Dokumen ini menjawab **"besok pagi saya mulai dari mana"**.
> Untuk detail teknis tiap kunci, runbook tetap rujukannya.

## Anda sedang di sini (diperiksa langsung ke produksi, 14 Agustus 2026)

| Yang diperiksa | Kenyataan |
| --- | --- |
| Aplikasi | **Sudah live** di `erpindo.29nurudhuhaalamin.workers.dev`, auto-deploy dari GitHub |
| Kapasitas | **sisa 3 dari 6** slot perusahaan (terpakai: Softtin, PT Demo Sejahtera, CV Demo Cabang) |
| Demo publik | **sehat** — 6 bulan data, neraca seimbang, laporan konsolidasi terisi |
| `COMPED_EMAILS` | **terpasang & terbukti** (probe menjawab `comped : YA`) |
| Pembayaran | **belum pernah terjadi** — 0 faktur langganan; kunci Xendit belum dipasang |
| Email | **belum pernah terbukti sampai** — 0 pengguna terverifikasi email |
| Blog | **0 artikel** di produksi — halaman `/blog` yang diindeks Google masih kosong |
| Batas skala | `TENANT_DB_MODE = local` → **maksimal 6 perusahaan** sampai diubah |

Angka-angka di atas bertanggal. Bila Anda membaca ini berbulan-bulan kemudian,
periksa ulang lewat **Admin → Infra** (langkah 1) sebelum memercayainya.

## Peta jalan

| # | Langkah | Perkiraan waktu | Menunggu pihak lain? | Biaya |
| --- | --- | --- | --- | --- |
| 1 | Buka menu Admin (`PLATFORM_ADMIN_EMAILS`) | 5 menit | tidak | – |
| 2 | Email keluar (Resend + DNS) | 20 menit + **tunggu DNS** | **ya** | ada paket gratis |
| 3 | Domain kustom | 15 menit + propagasi | ya | harga domain |
| 4 | Login Google | 20 menit | tidak | – |
| 5 | **Xendit mode uji** + bayar simulasi | 45 menit | tidak | – |
| 6 | **Xendit produksi** + bayar sungguhan | 15 menit | tidak | biaya per transaksi Xendit |
| 7 | Putuskan kapasitas (>6 pelanggan?) | 30 menit | tidak | Workers Paid $5/bln |
| 8 | Uji asap manual di produksi | 30 menit | tidak | – |
| 9 | Isi blog | berkelanjutan | tidak | – |
| 10 | Pelanggan pertama | – | ya | – |
| 11 | Menagih & siklus langganan | otomatis | tidak | – |
| 12 | Rutinitas mingguan | 15 menit/minggu | tidak | – |

Langkah 2 dan 3 **dimulai lebih dulu** meski tidak paling penting: keduanya
menunggu DNS, dan menunggu bisa dilakukan sambil mengerjakan yang lain.

Langkah 1–8 harus berurutan. Langkah 4 dan 5 memakai alamat domain, jadi
mengerjakannya sebelum langkah 3 berarti mengulangnya.

---

## Sebelum mulai: cara memasang "kunci"

Semua kunci disimpan sebagai **secret terenkripsi** di Cloudflare. Sekali paham
caranya, langkah 1–6 hanyalah pengulangan hal yang sama dengan nama berbeda.

**Lewat dashboard (disarankan):**

1. Buka [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
   → **erpindo**.
2. Tab **Settings** → bagian **Variables and Secrets**.
3. **+ Add** → pilih tipe **Secret** → isi *Variable name* (persis seperti di
   dokumen ini, huruf besar semua) dan *Value* → **Deploy**.

**Lewat terminal (kalau lebih suka):**

```sh
npx wrangler secret put NAMA_SECRET     # nilainya diketik saat diminta, tidak tersimpan di riwayat shell
```

> Tata letak dashboard Cloudflare, Xendit, Resend, dan Google berubah dari waktu
> ke waktu. Urutan klik di dokumen ini benar saat ditulis (Agustus 2026); bila
> menunya bergeser, yang tetap berlaku adalah **nama** yang dicari — nama secret,
> nama menu, nama event webhook. Cari namanya, jangan mencari posisinya.

Tiga hal yang perlu diketahui:

- **Secret ≠ Variable biasa.** Nilai *secret* tidak bisa dibaca lagi setelah
  disimpan — Cloudflare hanya menampilkan namanya. Kalau lupa isinya, buat baru
  di penyedianya lalu timpa. *Variable* biasa (seperti `TENANT_DB_MODE`) terbaca
  bebas dan memang bukan rahasia; itu diatur di berkas `wrangler.jsonc`, bukan
  di dashboard.
- **Jangan pernah menaruh kunci di dalam repo.** Sekali ter-commit, ia tercatat
  di riwayat Git selamanya walau dihapus di commit berikutnya.
- **Berlaku pada deployment yang sedang berjalan.** Anda tidak perlu men-deploy
  ulang; cukup muat ulang halaman aplikasi. Kalau ragu, cara memastikannya ada
  di "cara tahu berhasil" tiap langkah di bawah — jangan menebak dari layar
  Cloudflare.

---

## Langkah 1 — Buka menu Admin

Ini didahulukan bukan karena paling penting, melainkan karena inilah **satu-satunya
layar** tempat sisa kapasitas, kesehatan tenant, dan daftar pendaftar terlihat.
Tanpa ini Anda mengerjakan sisa daftar dengan mata tertutup.

**Pasang:**

| Secret | Isi |
| --- | --- |
| `PLATFORM_ADMIN_EMAILS` | email Anda (pisahkan koma bila lebih dari satu) |

**Cara tahu berhasil:** login ke aplikasi → menu **Admin** muncul di navigasi →
buka tab **Infra** → kartu **"Sisa kapasitas daftar"** berbunyi **3 / 6**
(angka pertama = slot yang masih **bebas**, bukan yang terpakai).

**Kalau dilewati:** seluruh `/api/admin` membalas 403 dan menu Admin tidak
pernah muncul. Itu perilaku aman yang disengaja, bukan kerusakan.

---

## Langkah 2 — Email keluar (Resend)

Mulai pagi-pagi: verifikasi domain pengirim butuh propagasi DNS yang bisa
memakan waktu berjam-jam.

**Yang dikerjakan:**

1. Daftar di [resend.com](https://resend.com) → **Domains** → **Add Domain** →
   masukkan domain Anda.
2. Resend memberi beberapa **record DNS** (SPF/DKIM). Tambahkan semuanya di
   pengelola DNS domain Anda (kalau domainnya di Cloudflare: dashboard →
   domain → **DNS** → **Add record**).
3. Tunggu status domain di Resend menjadi **Verified**.
4. **API Keys** → **Create API Key** → salin.
5. Pasang dua secret:

| Secret | Isi |
| --- | --- |
| `RESEND_API_KEY` | API key dari Resend |
| `MAIL_FROM` | mis. `ERPindo <no-reply@domain-anda.id>` — alamatnya **harus** di domain yang sudah Verified |

**Cara tahu berhasil** (dua-duanya, jangan hanya yang pertama):

1. Daftarkan satu akun uji di aplikasi → email verifikasi **benar-benar masuk
   inbox** (cek folder spam juga).
2. Buka **Admin → audit log** dan pastikan **tidak ada** entri `email.gagal`.
   Ini penting: kegagalan Resend dicatat di sana alih-alih ditelan diam-diam,
   jadi "tidak ada entri" adalah buktinya — bukan tulisan "terkirim" di layar.

**Kalau dilewati:** aplikasi **tidak gagal**. Email hanya dicatat ke log Worker
dan tidak pernah sampai ke siapa pun. Artinya verifikasi email, lupa sandi, dan
seluruh pengingat tagihan diam-diam tidak berfungsi — pelanggan Anda akan
mengira aplikasinya rusak.

---

## Langkah 3 — Domain kustom

Kerjakan sebelum langkah 4 dan 5: keduanya menyimpan alamat domain di sistem
pihak ketiga, jadi mengganti domain sesudahnya berarti mengulang keduanya.

**Yang dikerjakan:** Cloudflare → **Workers & Pages** → **erpindo** → tab
**Settings** → **Domains & Routes** → **Add** → **Custom Domain** → masukkan
mis. `app.domain-anda.id` (atau domain utama).

**Cara tahu berhasil:** membuka `https://domain-anda.id` menampilkan halaman
depan ERPindo dengan gembok HTTPS.

**Kalau dilewati:** aplikasi tetap jalan di alamat `…workers.dev`. Bisa dipakai,
tetapi alamat itu sulit dipercaya calon pelanggan dan tidak bisa dipindah kelak
tanpa mengulang langkah 4 & 5.

---

## Langkah 4 — Login Google

**Yang dikerjakan:**

1. [console.cloud.google.com](https://console.cloud.google.com) → buat project →
   **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth
   client ID** → tipe **Web application**.
2. Isi **dua** Authorized redirect URI (dua-duanya, bukan salah satu):
   - `https://<domain-anda>/api/auth/google/callback` — untuk login
   - `https://<domain-anda>/api/drive/callback` — untuk backup ke Google Drive
3. Pasang:

| Secret | Isi |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID |
| `GOOGLE_CLIENT_SECRET` | Client secret |

**Cara tahu berhasil:** tombol **"Lanjutkan dengan Google"** muncul di halaman
masuk dan benar-benar berhasil login.

**Kalau dilewati:** tombolnya tidak muncul, dan backup ke Google Drive tidak
tersedia. Pendaftaran lewat email tetap berjalan normal.

---

## Langkah 5 — Xendit MODE UJI (inti dari semuanya)

Ini pemblokir monetisasi: tanpa langkah ini tidak ada satu pun cara pelanggan
membayar Anda.

> **Bacalah bagian ini sampai habis sebelum mengerjakan.** Xendit memakai alamat
> server yang **sama** untuk mode uji dan mode sungguhan — yang membedakan hanya
> kuncinya. Salah urutan berarti uji coba pertama Anda memakai uang betulan.

**Yang dikerjakan:**

1. Dashboard Xendit → pastikan berada di **Test Mode**.
2. **Settings → Developers → API Keys** → buat Secret Key. Nilainya diawali
   **`xnd_development_`** — kalau tidak, Anda sedang di mode produksi; berhenti
   dan pindah ke Test Mode.
3. **Settings → Developers → Webhooks** → salin **Webhook Verification Token**,
   lalu daftarkan URL webhook untuk event **Invoices paid**:
   `https://<domain-anda>/api/billing/notification`
4. Pasang **dua-duanya**:

| Secret | Isi |
| --- | --- |
| `XENDIT_SECRET_KEY` | Secret Key (`xnd_development_…` untuk sekarang) |
| `XENDIT_CALLBACK_TOKEN` | Webhook Verification Token |

> **Keduanya wajib — checkout sengaja tidak menyala sampai dua-duanya ada.**
> Alasannya konkret: dengan secret key saja, pelanggan **bisa membayar
> sungguhan**, tetapi setiap pemberitahuan dari Xendit ditolak karena tidak bisa
> diverifikasi. Uang masuk, langganan tidak pernah aktif, database perusahaan
> tidak pernah dibuat. Aturan yang dipakai kode ini: *jangan menjual apa yang
> tidak bisa dikonfirmasi.*

**Cara tahu berhasil — buktikan berurutan, jangan lompat:**

1. Buka **Pengaturan → Langganan**. Harus muncul lencana kuning **"mode uji
   pembayaran"**. **Kalau lencana itu tidak muncul, berhenti**: berarti kunci
   yang terpasang kunci produksi, dan uji berikutnya memakai uang sungguhan.
2. Buat satu perusahaan uji → **Pengaturan → Langganan** → pilih paket →
   aplikasi mengalihkan Anda ke halaman bayar Xendit.
3. Bayar lewat **simulasi pembayaran** di dashboard Xendit (invoice test mode).
4. Kembali ke aplikasi dan periksa **tiga** hal:
   - status langganan menjadi **aktif**,
   - banner "mode baca-saja" **hilang**,
   - **database perusahaan benar-benar lahir** — sejak Fase 24a, pembayaran
     pertama inilah yang membuatnya. Cek di **Admin → Infra** bila ragu.
5. Buat satu invoice lagi, **biarkan kedaluwarsa**, pastikan langganan tidak
   ikut aktif.
6. Bonus: uji **link bayar faktur** ke pelanggan (menu Penagihan).

**Kalau dilewati:** `GET /api/billing` membalas `configured:false` dan tombol
checkout membalas pesan "Pembayaran online belum dikonfigurasi" — bukan error
keras, tetapi juga bukan uang.

---

## Langkah 6 — Xendit PRODUKSI

Hanya setelah langkah 5 tuntas seluruhnya.

**Yang dikerjakan:**

1. Dashboard Xendit → pindah ke **Live Mode**.
2. Buat Secret Key produksi (diawali **`xnd_production_`**) dan salin **token
   webhook produksi** — **tokennya berbeda dari token uji.**
3. Daftarkan ulang URL webhook di Live Mode.
4. Timpa **kedua** secret: `XENDIT_SECRET_KEY` **dan** `XENDIT_CALLBACK_TOKEN`.

> Mengganti kuncinya saja tetapi lupa tokennya adalah kesalahan yang paling
> mudah terjadi di langkah ini — akibatnya **seluruh** pemberitahuan pembayaran
> produksi ditolak, dan pelanggan yang sudah membayar tidak pernah aktif.

**Cara tahu berhasil:** lencana **"mode uji pembayaran" HILANG** dari Pengaturan
→ Langganan. Lalu lakukan satu pembayaran sungguhan bernominal kecil dan
pastikan langganan aktif otomatis.

---

## Langkah 7 — Putuskan kapasitas SEBELUM meluncur

Hari ini tersisa **3 slot**, dan batasnya **keras**: pendaftar ke-7 ditolak
dengan pesan jelas, tetapi tetap ditolak.

**Cara membacanya sendiri:** Admin → Infra → kartu "Sisa kapasitas daftar".
Peringatan otomatis muncul saat sisa ≤ 2, dan peringatan terpisah muncul bila
ada slot bebas yang **masih berisi data perusahaan lama** (slot begitu sengaja
dilewati, bukan dipakai — memakainya berarti menyerahkan pembukuan lama kepada
pendaftar baru).

**Kalau menargetkan lebih dari 6 pelanggan**, kerjakan **sebelum** peluncuran,
bukan sesudah slot habis:

1. Aktifkan **Workers Paid** ($5/bulan).
2. Buat **API Token** Cloudflare dengan izin **D1 : Edit** (bukan Global API Key).
3. Pasang `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
4. **Baru** ubah `TENANT_DB_MODE` menjadi `cloudflare` di `wrangler.jsonc` dan
   deploy.

> Urutannya tidak bisa dibalik: mengubah mode tanpa kedua secret membuat
> **seluruh** pendaftaran gagal — lebih buruk daripada batas 6.

Langkah lengkap + verifikasinya: [runbook §6](05-runbook-go-live.md).

---

## Langkah 8 — Uji asap manual di domain produksi

Gerbang otomatis (uji, smoke, simulasi browser) berjalan di database lokal yang
selalu kosong. Delapan hal berikut hanya bisa dibuktikan di produksi sungguhan:

- [ ] Daftar perusahaan baru → login → buat faktur → terima pembayaran →
      **Neraca seimbang**
- [ ] POS: buka shift → jual tunai → kembalian benar → tutup shift
- [ ] Asisten AI menjawab (bila menolak dengan pesan "belum tersedia", cek
      binding Workers AI)
- [ ] Email verifikasi masuk inbox **dan** audit log bersih dari `email.gagal`
- [ ] Checkout langganan produksi (nominal kecil) → aktivasi otomatis
- [ ] Login Google berhasil
- [ ] Menu Admin muncul untuk email di `PLATFORM_ADMIN_EMAILS`
- [ ] `/demo` bisa dibuka tanpa mendaftar, Laba Rugi 6 bulan positif

---

## Langkah 9 — Isi blog (etalase yang sedang kosong)

Produksi punya **0 artikel**. Halaman `/blog` sudah dirender di server, masuk
`sitemap.xml`, dan diindeks Google — jadi yang kosong bukan halaman internal,
melainkan etalase.

**Cara menulis:** Admin → tab **Blog** → tulis (judul, slug, ringkasan, isi
Markdown, gambar sampul) → simpan → **terbitkan**. Artikel hanya muncul publik
setelah diterbitkan; sitemap ikut memuatnya otomatis.

**Yang layak ditulis lebih dulu** — pertanyaan yang benar-benar dicari calon
pelanggan: cara menghitung PPN keluaran/masukan, contoh jurnal untuk kasus
sehari-hari, cara memulai pembukuan dari nol, kapan UMKM perlu ERP.

Ini bukan pekerjaan sekali jadi; satu artikel yang benar-benar menjawab satu
pertanyaan lebih berguna daripada sepuluh artikel tipis.

---

## Langkah 10 — Pelanggan pertama

Alur sebenarnya sejak masa coba dihapus (Fase 24a) — pahami ini sebelum
menjelaskannya ke pelanggan:

1. Pelanggan mendaftar → akunnya lahir berstatus **`provisioning`**: bisa masuk,
   **belum punya database**, belum bisa mencatat transaksi.
2. Pelanggan membayar lewat checkout → webhook Xendit masuk → **database
   perusahaannya dibuat saat itu juga** dan statusnya menjadi `active`.
3. Sejak itu ia bekerja normal.

Konsekuensi yang perlu Anda tahu: **pendaftar yang tidak jadi membayar tidak
memakan slot.** Itu memang tujuan rancangannya.

**Kalau ingin memberi akses gratis** (mitra, pelanggan uji coba, akun Anda
sendiri): tambahkan emailnya ke `COMPED_EMAILS` — perusahaannya lahir langsung
aktif berpaket Enterprise tanpa membayar. Gunakan seperlunya: setiap akun comped
memakan slot yang sama dengan pelanggan berbayar, dan tidak pernah ditagih oleh
siklus langganan.

Cara memastikan email tertentu sudah masuk daftar itu — tanpa membuat perusahaan
dan tanpa memakai slot — ada di [runbook §7](05-runbook-go-live.md) (probe
`comped : YA / TIDAK`).

---

## Langkah 11 — Menagih & siklus langganan (kebanyakan otomatis)

Setiap hari pukul **08.17 WIB** aplikasi menjalankan sendiri:

- memastikan seluruh database perusahaan memakai skema terbaru;
- langganan yang lewat jatuh tempo + masa tenggang → **`past_due`** → perusahaan
  masuk **mode baca-saja** (datanya tetap utuh, hanya tidak bisa menulis);
- **pengingat bertahap** sebelum jatuh ke baca-saja, plus satu susulan sesudahnya;
- penurunan paket terjadwal diterapkan **setelah periode yang sudah dibayar
  habis** — bukan saat diminta;
- tugas bulanan tanggal 1–3: penyusutan aset, rekap penjualan bulan lalu, backup
  Google Drive bagi yang menyambungkannya;
- tugas harian per perusahaan: kurs referensi, jurnal template terjadwal,
  penagihan kontrak berulang, work order pemeliharaan;
- 1–3 Januari: jurnal penutup tahunan.

**Yang perlu Anda lakukan:** memastikan langkah 2 (email) benar-benar bekerja —
seluruh rangkaian pengingat di atas tidak berguna bila emailnya tidak sampai.

**Yang tidak perlu Anda lakukan:** menagih manual, mengaktifkan kembali akun yang
sudah membayar, atau menurunkan akun yang menunggak.

---

## Langkah 12 — Rutinitas setelah peluncuran

**Mingguan (15 menit):**

- Admin → Infra: sisa kapasitas, ada tenant tertinggal migrasi?
- Admin → audit log: ada `email.gagal`?
- Admin → Masukan: masukan pengguna baru.
- Buka `/demo` sekilas — inilah yang dilihat calon pelanggan.

**Bulanan:**

- Cloudflare → Workers → erpindo → **Logs/Analytics**: lonjakan error?
- Periksa langganan yang akan jatuh tempo.
- Satu artikel blog baru.

**Kalau ada deploy yang bermasalah:** Cloudflare → Workers Builds menyimpan
riwayat; kembalikan ke deploy hijau sebelumnya. Seluruh migrasi database bersifat
maju & idempoten, jadi rollback kode aman.

---

## Kalau macet

| Gejala | Sebab paling mungkin | Tindakan |
| --- | --- | --- |
| Tombol berlangganan menolak: "Pembayaran online belum dikonfigurasi" | Salah satu dari `XENDIT_SECRET_KEY` / `XENDIT_CALLBACK_TOKEN` belum terpasang | Pasang **keduanya** (langkah 5) |
| Pelanggan sudah bayar, langganan tetap tidak aktif | Token webhook salah/berbeda mode (uji vs produksi), atau URL webhook belum didaftarkan | Samakan `XENDIT_CALLBACK_TOKEN` dengan token di mode yang sama; cek riwayat webhook di dashboard Xendit |
| Lencana "mode uji pembayaran" masih muncul di produksi | Kunci yang terpasang masih `xnd_development_` | Ganti ke kunci `xnd_production_` (langkah 6) — sampai itu, pembayaran pelanggan **tidak menjadi uang** |
| Email tidak sampai | `RESEND_API_KEY` kosong, domain belum Verified, atau `MAIL_FROM` di domain lain | Langkah 2; cek `email.gagal` di audit log untuk alasan persisnya |
| Pendaftar baru ditolak "kapasitas penuh" | 6 slot habis (mode `local`) | Bersihkan slot tak terpakai, atau aktifkan D1 dinamis (langkah 7) |
| Asisten AI menjawab "belum tersedia" | Binding Workers AI tidak aktif di deployment | Cek binding `AI` di Cloudflare; fitur lain tidak terpengaruh |
| Menu Admin tidak muncul | Email Anda tidak persis sama dengan isi `PLATFORM_ADMIN_EMAILS` | Cocokkan ejaannya (langkah 1) |
| Demo terlihat kosong / kedaluwarsa | Demo perlu disemai ulang | [Runbook §7](05-runbook-go-live.md) |

---

## Tiga hal yang sengaja belum dikerjakan

Dicatat di sini supaya tidak mengejutkan, bukan disembunyikan:

1. **Contoh Grup Harga belum ada di demo.** Fiturnya ada di aplikasi dan disebut
   di halaman `/fitur`, tetapi calon pelanggan yang menelusuri demo tidak akan
   menemukan contohnya.
2. **Riwayat slip gaji & penyusutan di demo baru ±2 periode**, sedangkan data
   penjualan 6 bulan.
3. **Lampiran berkas (unggah dokumen)** belum dibangun — belum ada penyimpanan
   objek yang dipasang.
