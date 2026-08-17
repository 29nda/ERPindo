# Riwayat keputusan ERPindo (Fase 0–30)

Ringkasan dari **258 log fase (18.972 baris)** yang digantikannya. Yang disimpan
di sini hanya keputusan yang **masih mengikat hari ini** — beserta alasannya,
karena keputusan tanpa alasan akan dibongkar orang berikutnya.

Log per sub-fase untuk program yang sedang berjalan tetap ada di `docs/log/`.
Riwayat lengkap Fase 0–30 tetap bisa dibaca lewat `git log` bila suatu saat
diperlukan.

---

## 1. Arsitektur — keputusan yang tidak boleh dibalik tanpa alasan besar

**Satu database D1 per tenant.** Control-plane di binding `DB`; database tenant
diambil dari pool `TENANT_DB_1..6` (mode `local`) atau dibuat dinamis lewat REST
API (mode `cloudflare`). Resolusinya di `apps/api/src/lib/tenantDb.ts`.
Konsekuensi yang sering dilupakan: tidak ada kueri lintas tenant, dan itu
disengaja — isolasi data adalah janji produk, bukan detail teknis.

**Jurnal double-entry adalah pusat data.** Setiap modul (penjualan, POS, gaji,
aset, manufaktur) memposting jurnal; seluruh laporan membaca dari jurnal
berstatus `posted`. Jurnal bersifat **immutable** — tidak ada endpoint edit.
Koreksi dilakukan lewat pembalik (void/retur), bukan penyuntingan. Ini yang
membuat neraca dijamin seimbang oleh sistem, bukan oleh kedisiplinan pemakai.

**Binding Env opsional harus terdegradasi anggun.** Workers AI absen → 503
`binding-absent`; kunci Resend/Xendit/Google absen → fitur nonaktif dengan pesan
yang menyebut secret mana yang kurang. Tidak boleh gagal keras. Pola ini diuji
deterministik di smoke, dan itu bagian dari kontraknya.

**Rate limit memakai Durable Object, bukan KV** (Fase 30e). Tulis-KV-per-request
menabrak kuota paket gratis (1.000 tulis/hari) jauh sebelum batas 100.000
request/hari — jadi tembok pertama bukan yang disangka orang. DO tersedia di
paket gratis dan tidak memakan kuota KV sama sekali.

**`APP_URL` wajib diset di produksi dan wajib dibuang di dev** (Fase 30j).
Tanpanya, ketiga email siklus langganan terkirim tanpa tautan, dan tautan
verifikasi/reset password jatuh ke origin request — bentuk klasik
*password-reset poisoning*. Sebaliknya bila ia terbawa ke `wrangler dev`,
`setSessionCookie` menyetel `secure: true` di atas `http://127.0.0.1`, peramban
membuang cookie diam-diam, dan **seluruh smoke runtuh di langkah login**.
`scripts/make-dev-config.mjs` membuangnya; smoke menjaga kelas bahayanya.

## 2. Produk & harga

**Satu paket, satu harga: Rp499.000 per perusahaan per bulan** (Fase A/30).
Seluruh modul terbuka, pengguna tak terbatas. `MODULE_MIN_PLAN`,
`PLAN_ACCESS_RANK`, `planIncludesModule`, dan prorata dihapus seluruhnya — bukan
dinonaktifkan. Harga per perusahaan, bukan per pengguna: menambah karyawan tidak
menambah tagihan.

**Tidak ada masa coba gratis** (Fase 24). Diganti demo publik berisi data
setahun penuh di seluruh modul, bisa ditelusuri tanpa mendaftar. Akun yang belum
berlangganan berstatus `provisioning` dan **tidak punya database sama sekali** —
jadi spanduknya bukan hitung mundur melainkan satu-satunya jalan ke depan.

**Masa tenggang tetap berlaku** (Fase 20c), tetapi hanya untuk pelanggan
berbayar — satu-satunya yang punya tanggal berakhir. Warnanya oranye, bukan
merah: merah dipakai `past_due` yang berarti sudah terkunci, dan menyamakan
keduanya membuat pemilik mengira sudah terlambat padahal belum.

**Data pelanggan tetap bisa diunduh setelah langganan berakhir.** Akun beralih
ke baca-saja; ekspor ZIP berisi CSV per tabel tetap terbuka.

## 3. Larangan yang sudah diputuskan — jangan diulang

- **`apps/web/src/api/client.ts` TIDAK dipecah** (Fase 9d, ditegaskan 12c).
  Pemecahannya adalah churn tanpa nilai.
- **Jangan membangun ulang pembayaran non-tunai POS.** Sudah ada sejak Fase 7a:
  `POS_PAYMENT_METHODS`, multi-tender, jurnal ke akun bank.
- **`packages/shared` tidak boleh mengimpor kamus web** (Fase 16s). `shared`
  dipakai juga oleh `apps/api`; membuatnya bergantung pada `apps/web` membalik
  arah ketergantungan monorepo.
- **Konstanta tingkat modul tidak boleh memanggil hook** (Fase 16j, 16m).
  Berulang cukup sering untuk dicatat sebagai pola, bukan insiden.
- **Jangan memberi `uppercase` pada kepala tabel** (Fase 18b). `text-transform`
  ikut mengubah `innerText`, sehingga asersi ui-sim membaca huruf besar semua
  dan gagal — mahal dicari karena kodenya terlihat benar dan hanya CSS berubah.

## 4. Disiplin mutu yang dibangun bertahap

| Gerbang | Dijadikan WAJIB pada |
| --- | --- |
| smoke API | sejak awal |
| simulasi UI (`ui-sim.mjs`, Chromium nyata) | Fase 9d |
| ESLint | Fase 12a |
| penyapu i18n | Fase 16 |
| penyapu warna (`sapu-warna.mjs`) | Fase 31a |

**Jumlah cek hanya boleh naik.** Aturan ini ada di `CLAUDE.md` dan berlaku
harfiah: menurunkan ambang untuk membuat sesuatu lulus adalah pelanggaran, bukan
penyesuaian.

**Uji yang tidak bisa gagal tidak menjaga apa pun** (Fase 26c). Setiap gerbang
baru harus **dibuktikan bisa gagal** — disabotase dengan sengaja, dilihat
memerah, lalu dipulihkan. Disiplin ini sudah menangkap beberapa penjaga yang
ternyata hampa sejak lahir.

**Glob penyapu wajib `**`** (Fase 20m). Pola `pages/*.tsx` tidak turun ke
subfolder, sehingga `pages/settings/` lolos tanpa terlihat **selama seluruh
program dwibahasa Fase 19** — 219 utang teks tak tersapu.

## 5. Cacat berulang yang layak diingat bentuknya

Bukan daftar bug, melainkan **bentuk kesalahan** yang sudah terjadi lebih dari
sekali di repo ini:

**Prop yang ditulis tetapi tidak pernah dibaca komponennya.** `<Alert>` menerima
`data-testid` yang dibuang diam-diam (Fase 23c); `<Button className="h-8">`
tidak berpengaruh karena konflik Tailwind diselesaikan urutan CSS, bukan urutan
penulisan — **96 dari 98** penimpaan mati tanpa suara sampai Fase 17b.

**Dua sumber yang mengaku selaras tetapi tidak pernah dibandingkan.** FAQ JSON-LD
di Worker vs FAQ di halaman berpisah total tanpa ada gerbang yang bisa
melihatnya, karena tidak ada satu berkas pun yang memuat keduanya (Fase 31c).

**Angka yang dihitung dari daftar ber-`LIMIT`.** `/admin/infra` melaporkan
"100 tenant tertinggal" selamanya karena dihitung dari daftar `LIMIT 100`.

**Typecheck hijau di atas kode yang rusak.** `.bind()` menerima `unknown[]`,
sehingga string paket yang salah lolos TypeScript dan mematikan seluruh
pendaftaran. Tertangkap smoke, bukan typecheck.

**Cacat yang ada di DATA, bukan di kode.** Demo produksi sempat menampilkan rugi
Rp 20,7 juta selama berminggu-minggu; tak satu pun gerbang bisa melihatnya.
`scripts/verifikasi-demo.mjs` lahir dari situ — ia mengueri hasilnya, bukan
melihat layarnya.

## 6. Arah desain — dan kenapa arahnya pernah dibalik

| Fase | Arah | Nasib |
| --- | --- | --- |
| 17a | "alat pro padat", **gelap-dulu** | Ditolak pemilik setelah melihat hasilnya |
| 18a | "bersih & lapang", **terang-dulu** | Berlaku; ditegaskan ulang pada wawancara Fase 31 |
| 31a | "garis & permukaan", terang-dulu | Berlaku |

Catatan ini yang paling sering terpakai, dan sebabnya layak disebut: pada
wawancara Fase 31 pemilik sempat memilih arah gelap-dulu lagi. Karena log 18a
mencatat bahwa arah itu **sudah pernah dicoba dan ditolak sendiri olehnya**,
pertanyaannya bisa diajukan ulang dengan konteks — dan jawabannya berubah.

Pelajaran teknisnya terpisah dan lebih penting: 17a dan 18a sama-sama hanya
memetakan ulang **nilai warna** di satu berkas, sementara 50 berkas halaman
menulis warna literal. Karena itu keduanya murah — dan karena itu pula
kerangkanya tidak pernah benar-benar berubah. **Perombakan desain yang hanya
menyentuh berkas token bukan perombakan.** Fase 31a memperbaikinya dengan token
semantik + ratchet `sapu-warna.mjs`.
