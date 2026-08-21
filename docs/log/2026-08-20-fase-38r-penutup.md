# Fase 38r — penutup program perombakan situs

## Angka akhir, dibandingkan dengan awal program

| Gerbang | Awal (Fase 37) | Akhir (Fase 38r) | Δ |
| --- | --- | --- | --- |
| `pnpm test` | 623 | **917** | +294 |
| `pnpm smoke` | 1.139 | **1.157** | +18 |
| `node scripts/ui-sim.mjs` | 362 | **392** | +30 |
| `sapu-istilah` (berkas disapu) | 152 | **161** | +9 |
| `sapu-gaya` (entri disapu) | 2.077 | **2.826** | +749 |
| `sapu-gaya` (kelas kaidah) | 3 | **5** | +2 |
| `sapu-warna` | 83 slate / 325 dark | **0 / 0** | −408 |

Jumlah cek naik di **setiap** gerbang, dan nol asersi dihapus sepanjang
delapan belas sub-fase.

## Ukuran

| | Awal | Akhir |
| --- | --- | --- |
| `apps/web/public` | 7,1 MB | **172 KB** |
| `apps/web/dist` | 9,7 MB | **3,4 MB** |
| Precache PWA | 5.837 KiB | **2.719 KiB** |
| Gambar produk (`.webp`) | 57 berkas / 3,9 MB | **0** |
| Berkas logo | 5 PNG / 2,7 MB | **0** |
| `docs/log/` | 26 berkas / 2.804 baris | **12 berkas** (Fase 38 saja) |

## Tiga hal yang membuat perombakan ini berbeda dari dua sebelumnya

Fase 17a dan 18a sama-sama disebut "perombakan desain", dan pemilik menilai
keduanya tidak terasa. Sebabnya tercatat di `docs/riwayat.md` §6: keduanya hanya
mengganti **nilai warna** di satu berkas, sementara 50 halaman menulis warnanya
sendiri.

Yang berbeda kali ini:

1. **Bentuknya berubah, bukan hanya warnanya.** Formulir pembuatan pindah dari
   atas daftar ke panel geser di sembilan halaman. Hal pertama yang dilihat
   pengguna saat membuka halaman kini datanya.
2. **Buktinya berubah dari klaim menjadi peragaan.** 57 tangkapan layar diganti
   28 naskah peragaan yang memainkan alur kerja nyata — dengan jurnal
   double-entry yang keseimbangannya **diuji mesin**.
3. **Kosakatanya dilengkapi, jadi utangnya bisa nol.** Lima token baru
   (`ok`/`awas`/`galat`, `brand-surface`, `accent-surface`, `brand-solid`,
   `brand-teks`) menyelesaikan hal yang membuat angka `dark:` mustahil turun ke
   nol selama tujuh fase.

## Enam temuan yang tidak pernah dilaporkan siapa pun

Ditemukan sambil mengerjakan hal lain, dan tiap satunya kini dijaga uji:

| Temuan | Sejak | Penjaganya sekarang |
| --- | --- | --- |
| Panduan menjanjikan uji coba 30 hari yang sudah dihapus | Fase 24a | `test/panduan-janji.test.ts` |
| `/api-docs` menjual "paket Enterprise" yang dibubarkan | Fase 30 | cek smoke 38g |
| Mencetak dalam tema gelap menghasilkan halaman nyaris kosong | Fase 31a | `test/tema-cetak.test.ts` |
| `/api-docs` merujuk `/logo.svg` yang tidak pernah ada | — | cek smoke 38g |
| Dua pemformat rupiah dengan spasi berbeda | — | disatukan di `@erpindo/shared` |
| Rumus masa tenggang digandakan di web & API | Fase 20c | disatukan di `@erpindo/shared` |

Tiga di antaranya adalah **naskah yang menjanjikan hal yang sudah dibatalkan**.
Polanya sama: keputusan diambil, kode diperbaiki, gerbang dipasang untuk
tempat-tempat yang teringat — dan satu tempat yang tidak teringat bertahan
belasan fase.

## Koreksi yang dicatat sepanjang program

Tiga kali saya keliru, dan ketiganya tercatat di lognya masing-masing:

1. **38b** — `uppercase` pada judul panel memecahkan asersi ui-sim karena
   `text-transform` ikut mengubah `innerText`. Pelajaran itu sudah tertulis di
   `ui.tsx` sejak Fase 18b dan terulang.
2. **38i** — normalizer warna percobaan pertama merusak ±40 kelas dengan
   menghilangkan nama propertinya. Dibatalkan lewat `git checkout` dan diulang,
   bukan ditambal.
3. **38q** — log 38g menyatakan `pnpm typecheck` hijau padahal ia merah sejak
   fase itu; saya memvalidasi berkas ujinya dengan vitest tanpa menjalankan
   ulang typecheck penuh.

## Yang sengaja belum dikerjakan

Tercatat di `docs/03-roadmap-lanjutan.md`:

- Formulir `commerce.tsx` dan `crm.tsx` (Penawaran) — editor dokumen berbaris
  banyak, lebih baik ditata ulang daripada digeser mekanis.
- Formulir karyawan `payroll.tsx` — berbagi kartu dengan daftarnya di satu tab.
- Ajakan "Tingkatkan ke Enterprise" di dua halaman pengaturan — sisa paket
  bertingkat pada jalur galat 403.

## Yang menunggu pemilik

Dua butir di `docs/STATUS.md`:

1. **Aktifkan kotak surat `halo@erpindo.id`** — halaman `/kontak` sudah
   memasangnya sebagai satu-satunya jalur menghubungi sebelum berlangganan.
   Risiko ini saya sampaikan saat menanyakannya, dan pemilik memilih memasang
   alamat itu tetap.
2. **Ganti penampung identitas** `[NAMA BADAN USAHA]` dan `[ALAMAT LENGKAP]` di
   `/syarat` dan `/privasi`. Selama penampung itu ada, kedua halaman menampilkan
   spanduk "draf menunggu tinjauan" — dan cek smoke menuntutnya tetap begitu.
