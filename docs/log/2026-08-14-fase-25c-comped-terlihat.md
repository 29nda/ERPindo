# Fase 25c — status comped dibuat terlihat

Pemilik memasang `COMPED_EMAILS` lalu meminta diperiksa. Pemeriksaan itu
ternyata **tidak mungkin dilakukan tanpa merusak sesuatu**, dan itulah temuan
sebenarnya dari sub-fase ini.

## Kenapa "cek saja" tidak bisa dijawab

`isComped()` hanya dipanggil di tiga tempat, seluruhnya di jalur **membuat
tenant** (registrasi dan `POST /auth/companies`). Tidak ada satu pun endpoint,
layar, atau log yang memantulkan hasilnya. Konsekuensinya: satu-satunya cara
membuktikan secret itu benar adalah **membuat perusahaan lalu melihat paketnya**
— memakan satu slot dari enam, untuk sebuah pemeriksaan.

Itu pula sebab cacat 14 Agustus baru ketahuan terlambat: penyemaian demo mati di
menit ke-9 di modul CRM dengan `403 plan-upgrade-required`, karena perusahaannya
lahir `starter`. Keadaan yang menyebabkannya sudah benar sejak detik pertama —
hanya saja tidak terlihat dari mana pun.

Jadi yang dikerjakan bukan "memeriksa", melainkan **membuat keadaan itu bisa
diperiksa**.

## Yang dikerjakan

- **`GET /auth/me` memantulkan `comped: boolean`.** Satu boolean, aditif, tidak
  dipakai untuk menentukan izin apa pun — sengaja: yang menentukan tetap
  `isComped()` di sisi server saat tenant dibuat, dan menjadikan field ini
  sumber kebenaran akan memindahkan keputusan paket ke klien.
- **`isComped` diekspor** agar bisa diuji langsung.
- **`apps/api/test/auth-comped.test.ts` (baru, 5 cek).** Aturan parsingnya —
  dipisah koma, spasi dipangkas, tidak peduli besar-kecil huruf, entri kosong
  diabaikan — **belum pernah diuji sama sekali** sejak Fase 4a, padahal satu
  huruf kapital yang tak tertangani cukup untuk memperlakukan pemilik sebagai
  pendaftar biasa.
- **`scripts/seed-demo.mjs`** — mode probe (`SEED_PROBE=1`) ikut mencetak
  `comped : YA / TIDAK — perusahaan baru akan lahir paket starter`. Probe login
  lalu keluar **sebelum satu pun langkah menulis**, jadi pemeriksaan ini gratis
  dan aman diulang berapa kali pun.
- **`docs/05-runbook-go-live.md` §7** — cara memeriksanya ditulis sebagai
  langkah, bukan catatan.

## Hasil pemeriksaan pertama: `comped : YA`

Probe dijalankan terhadap produksi (run `31831054773`, 14 Agustus 18:57 UTC,
langkah seed **dilewati** sesuai penjaga `[probe]`):

```
=== MODE PROBE (SEED_PROBE=1) — tidak ada yang ditulis ===
  akun          : ***
  comped        : YA
  perusahaan    : softtin[active], pt-demo-sejahtera[active], cv-demo-cabang[active]
  demo sudah ada: YA (pt-demo-sejahtera)
```

Jadi secret yang dipasang pemilik **benar**. Konsekuensi praktisnya: penyemaian
demo berikutnya lahir `active` + `enterprise` sendiri, dan langkah manual
menaikkan paket lewat control-plane (yang terpaksa dilakukan 14 Agustus siang)
tidak diperlukan lagi. Utang yang tercatat di log Fase 25b ditutup di sini.

## Cara pemilik memeriksanya sendiri, kapan saja

Push commit berjudul diawali `[probe]` ke `ops/seed-demo-run`, lalu baca log
workflow **Seed demo**. Barisnya berbunyi `comped : YA` bila secretnya benar,
`TIDAK` bila kosong atau ejaan emailnya beda. Tidak ada perusahaan yang dibuat
dan tidak ada slot yang terpakai.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **482** (dari 477) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1088** (tetap) |
| `node scripts/ui-sim.mjs` | 0 | **337/337** |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

**Dibuktikan bisa gagal** — dua sabotase, keduanya mengenai bentuk cacat aslinya
dan dipulihkan sesudahnya:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| `.filter(Boolean)` dihapus | `entri kosong diabaikan — koma nyasar tidak membuat semua orang comped` |
| `.toLowerCase()` pada entri dihapus | 2 cek: `tidak peduli besar-kecil huruf`, `entri kosong diabaikan` |

Sabotase pertama sengaja menyasar kelas cacat yang paling sunyi: tanpa
`filter(Boolean)`, var berisi `","` saja menghasilkan daftar dengan satu entri
kosong — dan **setiap pendaftar dengan email kosong menjadi comped**. Tidak ada
gejala yang terlihat sampai tagihan tidak pernah terbit.

## Yang TIDAK dikerjakan

- **Nilai `COMPED_EMAILS` yang sebenarnya tidak bisa dibaca dari sesi ini.**
  Cloudflare tidak memperlihatkan isi secret lewat API mana pun yang tersedia di
  sini, dan memang tidak seharusnya. Yang dibangun sub-fase ini adalah cara
  membuktikannya dari luar; jawabannya datang dari log probe, bukan dari
  pembacaan langsung.
- **Layar UI tidak menampilkan status comped.** Field-nya ada di `/auth/me` dan
  itu cukup untuk pemeriksaan; menambah lencana di Pengaturan berarti
  menjelaskan konsep "akun rumah" kepada seluruh pelanggan yang tidak
  memilikinya.
