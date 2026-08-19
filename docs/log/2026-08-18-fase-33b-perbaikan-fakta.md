# Fase 33b — empat perbaikan fakta pada naskah

Sub-fase kedua panduan gaya: hal-hal yang **salah**, bukan hal-hal yang bisa
diperbaiki. Naskah yang membingungkan masih bisa ditunda; naskah yang berbohong
tidak.

## 1. Klaim "demo 6 bulan" — bertentangan dengan datanya sendiri

`apps/web/src/i18n/ui.ts` sisi Inggris berbunyi *"explore the 6-month demo
first"*. Perusahaan demo disemai `scripts/seed-demo.mjs` sedalam **14 bulan**,
dan FAQ landing sudah menyebut angka yang benar.

Jadi satu halaman menjanjikan setengah dari yang diberikan halaman lain. Diganti
tanpa angka sama sekali — kedalaman demo bisa berubah lagi, dan smoke sudah
menjaga agar landing **tidak** menyebut kedalaman dalam hitungan bulan
(dua asersi "30b … tidak menyebut kedalaman demo dalam hitungan bulan").

## 2. Format rupiah tidak seragam

`Rp499.000` di `packages/shared/src/landing.ts` dan `Rp5 juta` di
`fiturDetail.ts`, sementara seluruh aplikasi memakai `formatRupiah()` yang
menghasilkan **`Rp 499.000`** — dengan spasi. Harga di landing adalah angka
paling sering dibaca di seluruh situs, dan ia satu-satunya yang ditulis
berbeda. Diseragamkan, termasuk sisi Inggrisnya (`Rp 499,000`).

## 3. "hutang" → "utang"

Bentuk baku KBBI. **111 → 72 kemunculan**, dan yang tersisa bukan naskah:

| Area | Sebelum | Sesudah | Sisanya |
| --- | --- | --- | --- |
| `apps/web/src` | 34 | 12 | kunci i18n (`umurHutang`, `katBayarHutang`, …) |
| `apps/api/src` | 73 | 49 | konstanta kode akun, variabel lokal, `selisihHutang` |
| `packages/shared/src` | 15 | 8 | `selisihHutang`, enum `sumber: "hutang"` |
| `packages/db/src` | 3 | 3 | **tidak disentuh** — benih nama akun |

### Yang sengaja TIDAK diubah, dan kenapa

**Nama akun di database tiap tenant.** `packages/db/src/migrations.ts` menyemai
"Hutang Usaha" & "Hutang Gaji"; `tax.ts` membuat "Hutang PPh 23". Mengganti
benihnya saja hanya berlaku untuk perusahaan **baru** — pelanggan lama tetap
memegang nama lama, jadi hasilnya justru terbelah.

Konsekuensinya satu naskah ikut dipertahankan: `descBuktiPotong23` masih
berbunyi "Menciptakan **Hutang** PPh 23 untuk disetor", karena ia menyebut akun
yang benar-benar akan dilihat pengguna di bagan akunnya. Menuliskannya "Utang"
sambil akunnya bernama "Hutang" hanya memindahkan kebingungan.

**Nilai kontrak API.** `selisihHutang` dan `sumber: "hutang"` dibaca smoke
(`smoke.mjs:3406`, `:3411`) dan klien API. Menggantinya memecah respons tanpa
seorang pun melihat bedanya.

**Kata kunci pencarian Asisten.** `guideKnowledge.ts` sekarang memuat
**keduanya** — `"utang", "hutang"`. Pengguna yang mengetik ejaan lama tetap
harus menemukan jawabannya; menghapus kata kuncinya akan membuat pencarian
memburuk demi kerapian ejaan.

### Temuan yang mengoreksi asumsi panduan gaya

Panduan menyebut penyeragaman nama akun sebagai migrasi data yang berisiko.
Diperiksa langsung: **tidak ada satu pun kode yang mencari akun berdasarkan
nama** — seluruhnya lewat kode akun (`accountIdByCode`, `ensureAccountByCode`,
konstanta `SYS_ACCOUNTS`). Nama akun murni teks tampilan.

Artinya migrasi append-only yang menyeragamkan nama untuk tenant **lama dan
baru sekaligus** memang bisa dibuat, dan tidak menyisakan perpecahan. Itu
pekerjaan tersendiri (Fase 33c), bukan bagian dari perbaikan naskah — tetapi ia
bukan hal yang harus dihindari, hanya hal yang harus dikerjakan dengan benar.

## 4. Merek: `erpindo` → `ERPindo`

**84 → 35 kemunculan huruf kecil**, dan 35 yang tersisa seluruhnya pengenal
teknis: kunci `localStorage`, cookie `erpindo_sid`/`erpindo_goauth`, domain
`erpindo.id`, nama berkas unduhan, `logo-erpindo.png`, paket `@erpindo/*`,
plus dua **nilai kontrak API** (`service: "erpindo"` di `/api/health` dan
`app: "erpindo"` di manifes ekspor ZIP) yang dibaca mesin, bukan orang.

Yang diperbaiki mencakup tempat-tempat yang paling terlihat justru karena
jarang dibuka pengembang: **kop dokumen cetak** (faktur, struk, slip gaji,
rekap 1721-A1), **empat email transaksional** (verifikasi, reset password,
undangan tim, tiga surat masa tenggang), dan **nama Asisten** di seluruh
panel AI.

Empat asersi ui-sim membaca label Asisten itu apa adanya
(`"Open the erpindo Assistant"` dst.) dan ikut diperbarui dalam commit yang
sama — kalau tidak, ui-sim memerah karena naskah yang memang sengaja diubah.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 611 | ✅ 611 |
| `pnpm smoke` | 1.132 | ✅ 1.132 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 147 · 0 | ✅ 147 · 0 |
| `periksa-tautan-dokumen` | hijau | ✅ |

## Catatan kejujuran

Panduan gaya juga menyebut naskah **"2.000+ uji otomatis"** sebagai fakta yang
perlu diperbaiki. Diperiksa: naskah itu **sudah dihapus di Fase 32e**. Yang
tersisa hanya komentar basi di `sections.ts` yang masih menjelaskannya; komentar
itu ikut dibersihkan, tetapi tidak ada klaim salah yang dilihat pengguna.

Dari lima butir Bagian B panduan, empat benar-benar ada dan diperbaiki di sini;
satu sudah selesai sebelum panduan ditulis.
