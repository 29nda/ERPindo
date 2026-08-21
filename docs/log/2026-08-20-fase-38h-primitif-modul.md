# Fase 38h — data dulu, formulir belakangan

## Yang dikerjakan

Tujuh primitif tata letak baru di `apps/web/src/components/kerangka.tsx`, plus
satu halaman pilot yang dikonversi untuk membuktikannya.

Ini pembuka bagi 47 halaman modul. Ia dikerjakan lebih dulu karena
mengonversi halaman satu per satu tanpa primitifnya berarti menulis tata letak
yang sama empat puluh tujuh kali — persis cara tiga footer dan dua header lahir.

## Perubahan alur kerja yang menjadi alasan utamanya

Hampir setiap halaman modul hari ini menaruh **formulir pembuatan yang permanen
di atas daftar**: helpdesk, aset, kontrak, tiket, dan belasan lainnya. Artinya
hal pertama yang dilihat pengguna saat membuka halaman adalah formulir kosong —
bukan datanya.

Itu sebab terbesar aplikasi ini terbaca sebagai aplikasi lama, dan ia lebih
besar daripada warna mana pun. Dua perombakan desain sebelumnya (17a dan 18a)
mengganti nilai warna dan tidak menyentuh ini sama sekali, yang menjelaskan
kenapa keduanya tidak pernah terasa berubah bagi pemilik.

Keputusan: **data dulu, pembuatan lewat `<Lembar>`** yang dibuka aksi utama
halaman. Satu perubahan mekanis, akan direplikasi ±25 kali.

## Tujuh primitif

| Primitif | Menggantikan | Perubahan yang dibawanya |
| --- | --- | --- |
| `Halaman` | judul + `space-y-6` yang ditulis tangan 47 kali | Aksi utama halaman punya SATU tempat tetap |
| `Lembar` | — | Formulir pembuatan keluar dari atas daftar |
| `BilahFilter` | pencarian/saringan yang ditulis ulang di ±20 halaman | Saringan menyatu dalam satu bilah |
| `DaftarDetail` | pola dua kolom tangan di 7 halaman | Di layar kecil: salah satu, bukan bertumpuk |
| `BilahAksiMassal` | — | **Kemampuan baru**: pilih banyak baris, satu aksi |
| `StatBaris` / `KartuAngka` | baris KPI yang ditulis 4 kali | — |
| `BaganBatang` | SVG tangan di dashboard & reports | Dipakai bersama panel `bagan` peragaan |

### Kenapa berkas baru, bukan ditambahkan ke `ui.tsx`

`ui.tsx` sudah 37 KB dan memegang kontrol atomik. Pemisahannya mengikuti garis
yang sudah ada: `ui.tsx` menjawab "seperti apa sebuah tombol", `kerangka.tsx`
menjawab "seperti apa sebuah halaman".

### `DaftarDetail` memperbaiki cacat nyata di layar kecil

Ketujuh halaman berpola daftar+detail menumpuk keduanya di ponsel. Setelah
memilih satu baris, pengguna harus menggulir jauh ke bawah untuk melihat
hasilnya — dan tidak ada yang memberi tahu bahwa ada yang berubah di sana.
Sekarang layar kecil menampilkan salah satu, dengan tombol kembali.

## Halaman pilot: `helpdesk.tsx`

Dipilih karena ia berkas kecil (400 baris) yang menyentuh **setiap** primitif —
formulir pembuatan, daftar, detail — dan alur ui-sim-nya hanya satu cek,
sehingga murah dipindahkan bila ternyata polanya keliru.

Utang warnanya ikut terbayar: baris terpilih memakai
`border-brand-400 bg-brand-50/60 dark:border-brand-700 dark:bg-brand-950/40`,
kini `border-brand-line bg-brand-surface`.

## `bukaLembar()` — satu penolong, ±25 pemanggil

Memindahkan formulir ke dalam Lembar memecahkan setiap asersi yang melakukan
`page.fill("#tk-subject", …)`, karena medannya belum terpasang sampai lembarnya
dibuka. Penolong baru di `ui-sim.mjs` membukanya lewat aksi utama halaman lalu
menunggu `[data-lembar]` muncul.

Satu penolong, bukan dua puluh lima suntingan bespoke yang masing-masing bisa
salah dengan caranya sendiri.

## Kait uji mengikat peran, bukan markup

Tiap primitif membawa atribut `data-*` yang stabil: `data-halaman`,
`data-lembar`, `data-filter`, `data-daftar`, `data-detail`,
`data-aksi-massal`. Asersi F52 mengikat itu — sehingga tata letaknya boleh
berubah lagi tanpa memecahkan 392 asersi.

## Neraca asersi ui-sim

**5 ditambah · 1 diperbarui · 0 dihapus.**

F9 (helpdesk) diperbarui memakai `bukaLembar()`. Subjeknya tidak berubah:
ia tetap menguji bahwa tiket baru terbuat dan tampil di daftar.

Yang paling berharga di antara yang baru adalah **"halaman terbuka dengan data,
bukan formulir pembuatan"** — ia menjadikan keputusan alur kerja sub-fase ini
sesuatu yang tidak bisa terurai diam-diam saat 46 halaman berikutnya
dikonversi.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 913 | ✅ 913 |
| `pnpm smoke` | 1.157 | ✅ 1.157 |
| `node scripts/ui-sim.mjs` | 387 | ✅ **392** (+5) |
| `sapu-warna` | 70 / 288 | ✅ **69 / 286** |
| `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |
