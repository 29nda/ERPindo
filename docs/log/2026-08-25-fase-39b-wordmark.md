# Fase 39b — wordmark diperbesar, dan satu selisih lama ikut tertutup

## Yang dikerjakan

Permintaan pemilik: teks logo agak diperbesar.

Saat mengukurnya, ternyata ada dua ukuran untuk satu merek:

| Tempat | Ukuran "ERP" |
| --- | --- |
| SPA (`BrandWordmark`, `apps/web/src/components/ui.tsx`) | 0,72em × 1,35 ≈ **15,6px** |
| Cangkang SSR (`apps/api/src/lib/kerangkaPublik.ts`) | **21,6px** (1,35rem) |

Keduanya seharusnya kembaran — komentar di berkas SSR menyebutkan begitu — dan
selisih 39% itu tidak pernah terlihat karena keduanya tidak pernah tampil di
layar yang sama. Menaikkan SPA ke 1em sekaligus menyamakannya.

Komentar lama di `BrandWordmark` juga keliru: ia menyatakan "ukuran ikut tinggi
wadah", padahal `em` relatif ke font **induk**, dan `h-*` hanya membatasi kotak.

## Regresi yang tertangkap gerbang, bukan oleh mata

Ukuran penuh merusak bilah atas ponsel. Pada 390px, `/app`, `/app/stok`, dan
`/app/penjualan` meluber menjadi **408px** — ditangkap asersi F26 ui-sim.

Perbaikannya memindahkan ukuran dari style inline ke CSS. Bukan selera: **style
inline mengalahkan kelas apa pun**, sehingga ukuran yang ditulis di komponen
mustahil dibuat responsif. Sekarang `[data-wordmark]` 0,75em di bawah 640px dan
1em di atasnya — merek membesar di tempat yang punya ruang, dan tetap seperti
semula di tempat yang tidak.

Kroni peragaan (`peragaan/Peragaan.tsx`) sengaja dipertahankan mungil lewat font
induk `text-[11.5px]`: ia meniru bilah alamat peramban, dan merek sebesar header
sungguhan akan merusak ilusinya.

## Validasi

- `node scripts/ui-sim.mjs` — **431/431** (F26 kembali hijau)
- `pnpm typecheck` · `pnpm lint` · `pnpm build` — lulus
- `node scripts/sapu-warna.mjs` — utang warna tidak naik
