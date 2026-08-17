# Fase 30b — landing menyuarakan harga tunggal

Fase 30a mengubah harganya; fase ini membuat halaman depan **mengatakannya**.
Dua pekerjaan, dan keduanya lebih kecil daripada dugaan awal karena Fase 0 sudah
menemukan bahwa tabel pembanding, kalkulator hemat, dan FAQ semuanya sudah ada.

## Yang dikerjakan

### 1. Harga naik ke hero

Hero sebelumnya **sama sekali tidak menyinggung harga** — pengunjung harus
menggulir sampai seksi harga untuk mengetahuinya. Itu masuk akal saat masih ada
tiga paket: angka mana pun yang disebut di hero akan menyesatkan dua pertiga
pembacanya. Dengan satu harga, angkanya justru kalimat penjualan terkuat, dan
menahannya di bawah halaman hanya membuang perhatian yang sudah didapat.

### 2. Kesimpulan kalkulator dinyatakan terbuka

Kalkulator per-pengguna sudah ada sejak Fase 13c, tetapi kesimpulannya hanya
muncul bila pengunjung **kebetulan menggeser slider ke bawah titik impas**.
Pengunjung yang tidak menyentuhnya sama sekali — mayoritas — tidak pernah
membaca akibat paling langsung dari keputusan harga tunggal.

Kini dinyatakan sebagai kalimat tetap: *"Mulai 2 pengguna, ERPindo sudah lebih
murah — dan tagihannya berhenti naik di situ."* Angka **2** dihitung dari fungsi
biaya yang sama, bukan ditulis tangan, jadi ia ikut bergerak sendiri bila harga
berubah. Sebelum 30a angka itu **3**; patokan yang turun dari Rp999rb ke Rp499rb
memangkasnya sepertiga.

### 3. Kedalaman demo berhenti disebut dalam hitungan bulan

Keputusan pemilik. Data demo produksi hanya berubah saat workflow seed
dijalankan, sedangkan kode bisa berubah kapan saja — jadi angka bulan di halaman
depan **pasti** melenceng dari isi demo cepat atau lambat. Salinan publik kini
memakai kalimat yang benar sebelum maupun sesudah penyemaian ulang
("data nyata lintas seluruh modul").

## Catatan kejujuran — rencana saya salah hitung, tiga kali lipat

Rencana yang disetujui menyebut kalimat "6 bulan" ada di **tiga** tempat.
Penelusuran menemukan **dua belas**, jauh melampaui landing page:

| Tempat | Berkas |
| --- | --- |
| FAQ landing | `landing/sections.ts` |
| Sub-hero + CTA penutup + satu komentar | `landing/index.tsx` |
| Halaman `/fitur` | `pages/fitur.tsx` |
| Teks ajakan i18n | `i18n/ui.ts` |
| Basis pengetahuan asisten AI | `lib/guideKnowledge.ts` |
| Footer SSR blog | `routes/blog.ts` |
| FAQ SSR + description + noscript ×2 | `routes/landingSeo.ts` |

Dan yang **paling penting justru tidak tertangkap grep sama sekali**: tiga meta
description di `apps/web/index.html` — `description`, `og:description`, dan
`twitter:description`. Itu teks yang muncul di **cuplikan hasil pencarian Google
dan pratinjau tautan WhatsApp** — tempat paling menentukan, dan satu-satunya yang
tidak terlihat dari membaca kode aplikasi.

Yang menemukannya bukan ketelitian saya, melainkan **penegak smoke yang ditulis
sebelum perbaikannya** dan langsung memerah pada dua rute. Berkas itu bahkan
sudah memuat komentar Fase 27a yang memperingatkan kelas cacat yang sama persis:
janji usang yang tetap tayang karena penjaga hanya membaca `/blog` dan tidak
pernah kerangka SPA.

Empat kecocokan lain sengaja **tidak** disentuh (`grafikOmzetBulanan` dan
kerabatnya di `i18n/ui.ts`): itu grafik omzet 6 bulan di dashboard — fitur
produk, bukan klaim tentang demo.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 592 | ✅ 592 |
| `pnpm smoke` | 1.116 | ✅ **1.118** |
| `node scripts/ui-sim.mjs` | 346 | ✅ **350** |
| `sapu-i18n` utang teks | 145 | ✅ 145 |

**Total 2.060 pemeriksaan** (dari 2.054).

Penegak baru — semuanya menolak seluruh **kelas** cacat, bukan satu kalimatnya:

- **smoke ×2**: `/` dan `/fitur` tidak boleh memuat pola hitungan bulan demo
  (`/\d+\s*bulan\s+data/i` + padanan Inggrisnya). Angka berapa pun ditolak,
  jadi "12 bulan" pun tidak bisa menyelinap masuk sebelum demo produksi benar
  benar sedalam itu.
- **ui-sim ×4**: harga tampil di hero **diuji lewat posisi** — indeks teks harga
  harus lebih kecil daripada indeks judul seksi harga, kalau tidak ia sebenarnya
  masih di bawah dan cek yang hanya mencari "499.000" akan lolos secara palsu.
  Ditambah satuan `/bulan/perusahaan`, kalimat titik impas, dan larangan angka
  bulan di teks terender.

## Berikutnya

Fase 30c — demo 12 bulan, diverifikasi dengan kueri nyata ke `wrangler dev`.
