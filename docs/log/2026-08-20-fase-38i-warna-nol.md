# Fase 38i — utang warna mencapai NOL, dan satu cacat cetak yang tak pernah dilaporkan

## Yang dikerjakan

Seluruh kelas warna literal di `apps/web/src` dihapus. Angkanya:

| Titik waktu | `slate-*` | `dark:` |
| --- | --- | --- |
| Fase 31a (sebelum token semantik) | 1.724 | 1.084 |
| Awal program ini (Fase 38a) | 83 | 325 |
| **Sekarang** | **0** | **0** |

`scripts/sapu-warna.mjs` kini berambang nol, dan ambangnya **tidak boleh
dinaikkan lagi, bahkan sementara**. Warna literal yang masuk kembali bukan utang
yang bisa dicicil — ia pintu yang sudah ditutup. Bila sebuah warna belum punya
token, yang ditambahkan adalah tokennya, bukan pengecualian di penyapunya.

## Kenapa dua perombakan sebelumnya gagal, dan kenapa yang ini tidak

Fase 17a dan 18a mengganti **nilai** ramp `slate-*`, sementara 50 halaman
menulis warna sendiri. Fase 31a menambahkan token semantik dan menurunkan
angkanya dari 1.724/1.084 ke ratusan — tetapi berhenti di sana selama tujuh
fase.

Sebabnya bukan kemalasan, melainkan **kosakata yang belum lengkap**. Selama
"berhasil" hanya bisa disebut sebagai `text-emerald-700 dark:text-emerald-300`,
angka `dark:` tidak mungkin mencapai nol berapa pun halaman yang dirapikan.

Yang menyelesaikannya adalah lima token yang ditambahkan sepanjang program ini:

| Token | Fase | Menggantikan |
| --- | --- | --- |
| `ok`/`awas`/`galat` × ink/line/surface | 38a | seluruh pasangan emerald/amber/red |
| `brand-surface` | 38c | `bg-brand-50 dark:bg-brand-950/40` |
| `accent-surface` | 38c | pasangan accent |
| `brand-solid` | 38i | `bg-brand-600 dark:bg-brand-500` — tombol merek pekat |
| `brand-teks` | 38i | `text-white dark:text-slate-900` — teks di atasnya |

## Cara mengerjakannya, dan satu kesalahan yang dibatalkan

Penggantian dilakukan bertahap: pasangan sederhana lebih dulu (92 kejadian),
lalu kombinasi tiga properti (23), lalu normalizer berbasis pasangan untuk
keluarga `brand-*` (56 string kelas), lalu sisanya satu per satu.

**Percobaan pertama normalizer merusak ±40 kelas**: ia menyusun ulang string
tanpa mempertahankan nama properti, sehingga `bg-brand-600` menjadi
`brand-surface` — CSS yang tidak sah dan lolos typecheck maupun lint, karena
keduanya tidak membaca isi string kelas Tailwind.

Yang dikerjakan: `git checkout` seluruh `apps/web/src`, lalu mengulang dari awal
dengan normalizer yang benar. Menambal empat puluh titik akan lebih cepat
sesaat, tetapi setiap tambalan adalah tebakan tentang nilai aslinya.

Satu efek samping juga tertangkap saat memeriksa hasilnya: dua keadaan batang
bagan (`fill-brand-500` saat disorot vs `fill-brand-600` biasa) runtuh menjadi
satu warna, sehingga sorotannya berhenti menyampaikan apa pun. Diperbaiki
memakai `brand-solid` vs `brand-ink`.

## Temuan: mencetak dalam tema gelap menghasilkan halaman nyaris kosong

Halaman `/cetak/*` menggambar di atas `bg-white` **tetap** — kertas memang putih
— tetapi tintanya memakai token yang ikut tema aplikasi. Pengguna bertema gelap
yang mencetak faktur mendapat teks krem terang di atas kertas putih.

Cacat ini ada sejak token semantik masuk pada **Fase 31a** dan tidak pernah
dilaporkan. Dugaan saya: yang mencetak dan yang memakai tema gelap jarang orang
yang sama, dan yang mengalaminya menyimpulkan printernya bermasalah.

Perbaikannya kelas `.tema-cetak` yang memaksa nilai terang di dalam lingkupnya,
dipasang pada keempat wadah halaman cetak. Diletakkan pada wadah, bukan di
`@media print`, supaya pratinjau di layar memperlihatkan persis yang akan keluar
dari printer.

`test/tema-cetak.test.ts` menutup **kelasnya**: ia membandingkan daftar token
`:root.dark` dengan `.tema-cetak`, sehingga token baru yang lupa ditambahkan
menggagalkan build alih-alih menunggu seseorang mencetak dalam tema gelap. Ia
juga menuntut tiap wadah ber-`bg-white` di `print.tsx` membawa kelas itu.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 913 | ✅ **916** (+3) |
| `pnpm smoke` | 1.157 | ✅ 1.157 |
| `node scripts/ui-sim.mjs` | 392 | ✅ 392 |
| `sapu-warna` | 69 / 286 | ✅ **0 / 0**, ambang dikunci |
| `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |

37 berkas disentuh. Nol asersi ui-sim pecah — bukti bahwa penggantian ini
memang penukaran kosakata, bukan perubahan tampilan yang tidak disengaja.
