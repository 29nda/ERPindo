# Fase 38q — register perusahaan, dan pembersihan yang menemukan dua drift

## Koreksi lebih dulu: log 38g menyatakan typecheck hijau, dan itu tidak benar

`pnpm typecheck` gagal sejak Fase 38g. Berkas `apps/api/test/token-publik.test.ts`
yang dibuat di sana membaca `styles.css` lewat `node:fs`, dan tipe Node bentrok
dengan `@cloudflare/workers-types` di `apps/api`.

Saya memvalidasi berkas itu dengan `npx vitest run` — yang lulus — lalu
menjalankan `pnpm test`, `pnpm smoke`, `ui-sim`, dan keempat penyapu, tetapi
**tidak menjalankan ulang `pnpm typecheck`** setelah berkasnya ada. Tabel
validasi di log 38g karena itu menyatakan sesuatu yang tidak saya periksa.

Perbaikannya sudah terdokumentasi di repo ini: `apps/api/tsconfig.json` memuat
daftar kecualikan untuk uji yang membaca berkas, lengkap dengan alasannya.
Berkas itu ditambahkan ke daftar tersebut. Ia tetap dijalankan penuh oleh
vitest; yang dilewati hanya pemeriksaan tipenya.

## Register perusahaan: aturan ditulis dulu, baru penjaganya

`docs/glosarium.md` §8 baru — sebutan pembaca, larangan menggurui, kewajiban
klaim bisa ditunjuk barisnya, dan nada saat menyebut pesaing.

Urutannya disengaja. Aturan yang ditulis **setelah** naskahnya hanya
meresmikan apa pun yang telanjur ditulis; yang ditulis lebih dulu bisa menolak.

Kelas baru `merendahkan` di `sapu-gaya.mjs`, ambang **nol**:

> `Anda harus`, `jangan lupa`, `perlu diingat`, `seperti diketahui`,
> `tenang saja`, `jangan khawatir`, `tidak perlu takut`

`Anda dapat` dan `Anda bisa` sengaja **tidak** dilarang: keduanya menyatakan
kemampuan, bukan kewajiban.

Cakupan `sapu-gaya` kini **2.826 entri** (dari 2.077 di awal program).

## Posisi produk lama disapu habis

| Tempat | Sebelum | Sesudah |
| --- | --- | --- |
| `README.md:3` | "untuk UMKM & perusahaan menengah Indonesia" | "untuk perusahaan Indonesia" |
| `README.md:24` | "Tailwind CSS + shadcn/ui" | Tailwind 4, tanpa pustaka komponen pihak ketiga |
| `CLAUDE.md:3` | "untuk UKM Indonesia" | "untuk perusahaan Indonesia" |
| `landingSeo.ts` JSON-LD | "ERP multi-tenant untuk usaha Indonesia" | "…untuk perusahaan Indonesia, tanpa proyek implementasi" |
| `landingSeo.ts` `<noscript>` | "ERP untuk usaha Indonesia" | "ERP untuk perusahaan Indonesia" |

"UMKM" yang tersisa seluruhnya **nama resmi pajak** ("PPh Final UMKM 0,5%
PP 55/2022"), yang memang dipertahankan glosarium §6.

Tabel dokumen di README juga dilengkapi: `posisi-produk.md`, `glosarium.md`,
`keamanan.md`, `riwayat.md`, `03-roadmap-lanjutan.md`, dan `STATUS.md` sebelumnya
tidak terdaftar sama sekali — padahal empat yang pertama justru dokumen paling
mengikat sekarang.

## Drift pertama: glosarium menyatakan satu sumber rupiah yang tidak ada

Glosarium §6 berbunyi: *"Satu sumber: `formatRupiah()` di `packages/shared`."*

Pernyataan itu tidak benar. Fungsinya hidup di `pages/landing/sections.ts`, dan
di sebelahnya ada fungsi **kedua** — `formatIDR()` di `api/client.ts` dengan
**30 pemakai**.

Keduanya menghasilkan bentuk yang berbeda:

| | Keluaran |
| --- | --- |
| `formatIDR` (`Intl`, `style: "currency"`) | `Rp` + **spasi tak-putus** + angka |
| `formatRupiah` (manual) | `Rp` + spasi biasa + angka |

Selisih satu karakter tak terlihat itu nyata akibatnya: asersi ui-sim harus
menormalkan U+00A0 sebelum mencocokkan teks, dan `sapu-istilah` — yang justru
menegakkan aturan "Rp 499.000 berspasi" — melihat dua bentuk berbeda sebagai
hal yang sama.

Kini satu fungsi di `packages/shared/src/text.ts`, memakai spasi biasa.
`formatIDR` dipertahankan sebagai nama lama yang meneruskan ke sana — mengganti
nama di 30 tempat adalah churn tanpa nilai. Glosarium §6 dikoreksi beserta
catatan tentang apa yang sempat tidak benar.

## Drift kedua: `GRACE_DAYS` dibagi, rumusnya tidak

`apps/web/src/lib/tenggang.ts` dan `apps/api/src/lib/dunning.ts` masing-masing
menghitung masa tenggang sendiri. Komentar di berkas web menjelaskan alasannya —
"web tidak bisa mengimpor dari apps/api" — dan alasan itu **benar**.

Tetapi ia hanya menuntut rumusnya berada di tempat ketiga yang bisa diimpor
keduanya, dan tempat itu `@erpindo/shared`, yang sudah menyediakan `GRACE_DAYS`
sejak awal. Yang kurang hanya rumus empat barisnya.

Kedua salinan menghitung batas yang sama dengan cara yang sedikit berbeda.
Selama keduanya benar tidak ada yang menyadarinya; begitu salah satu
diperbaiki, yang lain diam-diam berbeda.

## Kunci kamus mati

25 kunci dihapus dari `i18n/ui.ts` (1.996 → 1.971 entri). **Lima belas di
antaranya berasal dari satu keputusan**: paket bertingkat yang dibubarkan Fase
30. Naskahnya tetap tinggal delapan fase.

Yang membuatnya lebih dari bobot mati: kunci seperti `naikPaket` masih bisa
dipanggil, dan siapa pun yang mencari "bagaimana menawarkan peningkatan paket"
akan menemukannya lalu memakainya — tanpa tahu bahwa paket yang ditawarkannya
sudah tidak ada.

`test/ui-kunci-mati.test.ts` menutup kelasnya dengan ambang **nol**.

## Dokumen

- `docs/04-rencana-monetisasi-tier.md` **dihapus** (71 baris). Nol tautan masuk,
  dan isinya menyajikan empat tingkat harga sebagai "keputusan harga (pemilik)"
  — padahal dibubarkan Fase 30 dan bertentangan langsung dengan
  `packages/shared/src/core.ts:136`.
- **22 log Fase 31–35 dipadatkan** ke `docs/riwayat.md` (judulnya kini
  "Fase 0–37"), sesuai konvensi CLAUDE.md. `docs/log/` menyisakan Fase 38 saja:
  **37 → 11 berkas**.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` | **merah sejak 38g** | ✅ **hijau** |
| `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 916 | ✅ **917** (+1) |
| `pnpm smoke` | 1.157 | ✅ 1.157 |
| `node scripts/ui-sim.mjs` | 392 | ✅ 392 |
| `sapu-warna` | 0 / 0 | ✅ 0 / 0 |
| `sapu-istilah` | 0 | ✅ 0 |
| `sapu-gaya` | 4 kelas, 2.714 entri | ✅ **5 kelas, 2.826 entri** |
| `periksa-tautan-dokumen` | 79 berkas | ✅ 52 berkas (log dipadatkan) |
