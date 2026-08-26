# Fase 39d — halaman tangkapan layar, dan cara mengembalikannya tanpa mengulang kesalahan

## Yang dikerjakan

Permintaan pemilik: satu halaman khusus berisi tangkapan layar aplikasi.

Permintaan ini bertabrakan langsung dengan keputusan Fase 38, yang menghapus 57
gambar (3,9 MB) dan menggantinya dengan peragaan. **Keputusan itu tidak
dicabut**, dan alasannya masih berlaku: tangkapan layar adalah klaim yang harus
dipercaya, peragaan bisa diperiksa, dan tangkapan layar menjadi basi diam-diam
begitu tampilan aplikasi berubah.

Yang berubah adalah pemahaman soal cakupannya. Peragaan sengaja memperagakan
satu alur sempit selangkah demi selangkah; ia tidak pernah memperlihatkan **satu
layar padat** berisi sidebar, bilah atas, dan tabel sungguhan sekaligus — dan
itu justru yang ditanyakan pembeli perusahaan.

Jadi `/tampilan` bersifat menambah, bukan mengganti. Beranda dan `/fitur` tetap
memakai peragaan, dan sebuah asersi ui-sim baru **menjaga** agar tidak satu pun
tangkapan layar merayap kembali ke beranda.

## Tiga pengaman

1. **Gambar tidak pernah dibuat tangan.** `node scripts/tangkap-layar.mjs`
   membangkitkan wrangler dev, menyemai data demo, masuk sebagai pengguna, lalu
   menangkap sepuluh layar. Menyegarkannya satu perintah, bukan proyek.
2. **Umurnya tercetak di halaman.** Skrip menulis tanggal dan commit ke
   `tangkapanMeta.ts`, dan halaman menampilkannya di ATAS gambarnya. Tangkapan
   layar basi yang mengaku segar adalah masalahnya; yang menyebutkan umurnya
   sendiri tidak.
3. **Gambar hilang menggagalkan build.** `apps/web/test/tampilan.test.ts`
   menolak berkas yang disebut naskah tetapi tidak ada di cakram, berkas nol
   byte, nama ganda, keterangan yang sisi Inggrisnya menyalin sisi Indonesia,
   dan gambar di atas 400 KB. Tanpa itu, gambar yang hilang hanya menyisakan
   kotak kosong di halaman jualan — kegagalan paling sunyi yang bisa dialami
   halaman semacam ini.

Berat totalnya **1,1 MB untuk sepuluh gambar**, dibanding 3,9 MB untuk 57 gambar
yang dihapus Fase 38.

## Empat tempat yang harus diperbarui bersamaan

Halaman publik baru menyentuh empat berkas, dan melewatkan salah satunya
menghasilkan halaman yang tampak benar di peramban tetapi kosong bagi perayap:

1. rute SPA — `apps/web/src/main.tsx`
2. rute SEO — `apps/api/src/routes/landingSeo.ts`
3. `sitemap.xml` — `apps/api/src/routes/blog.ts`
4. `run_worker_first` — `wrangler.jsonc`

Ditambah daftar putih RBAC (`apps/api/test/rbac-guard.test.ts`), yang menangkap
rute publik baru dengan benar saat pertama dijalankan.

## Validasi

- `node scripts/ui-sim.mjs` — **431/431**, tujuh cek F53 baru, termasuk
  `naturalWidth === 0` untuk membuktikan gambar benar-benar termuat di peramban
  (uji vitest hanya tahu berkasnya ada di cakram)
- `pnpm smoke` — **1.173 cek**, `/tampilan` ikut loop halaman publik
- `pnpm test` — enam uji baru di `tampilan.test.ts`
