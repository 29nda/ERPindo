# Fase 57b — antrean webhook, dan penjaga yang berhenti di batas berkas

## Yang ditutup

Fase 57a memeriksa `scheduled()` blok demi blok. Bloknya yang kelima hanya satu
baris:

```ts
const wh = await runWebhookDeliveries(env, 100);
```

Kerja sebenarnya ada di `lib/webhooks.ts` — satu panggilan fungsi di seberang
batas berkas. Di sana ada tiga cacat, dan ketiganya luput karena alasan yang
sama: **penjaganya berhenti di batas itu.**

### 1. Aturan Fase 54g tidak pernah sampai ke sini

Fase 54g memutuskan aturan keras: gelung yang menyentuh jaringan wajib
membungkus kerjanya, supaya kegagalan satu item tidak membatalkan sisanya. Ia
menulis penjaganya, `cronKetahanan.test.ts`, dan membuktikannya pada sepuluh
gelung.

Penjaga itu membaca `scheduled()` di `index.ts` saja. Gelung pengiriman webhook
karena itu tidak pernah tersentuh aturannya — dan memang telanjang.

Kelas yang sama dengan glob `pages/*.tsx` yang tidak turun ke subfolder
(Fase 20m) dan daftar `NETRAL` yang hanya dihormati satu saringan (Fase 56b):
aturan yang benar, ditegakkan **di tempat ia ditulis, bukan di tempat ia
berlaku**.

### 2. Batch tanpa anggaran waktu, dan keadaan yang tidak tercatat

Tiap pengiriman boleh menghabiskan sampai sepuluh detik (batas waktu di
`deliverOne`). Satu batch berisi seratus. Batch yang seluruh tujuannya
menggantung karena itu menuntut hampir **tiga jam**, dan penangan cron dimatikan
jauh sebelum itu.

Yang membuatnya buruk bukan pekerjaan yang tertunda, melainkan apa yang **tidak
tercatat**. Baris yang penangannya mati sebelum sempat di-`UPDATE` tetap
`pending`, dengan `next_attempt_at` **dan** `attempts` yang sama persis. Ia
jatuh tempo lagi seketika, terurut paling depan lagi, lalu menggantung lagi.

Percobaannya tidak pernah bertambah, jadi `WEBHOOK_MAX_ATTEMPTS` tidak pernah
tercapai. **Satu tujuan yang menggantung memblokir antrean seluruh platform,
selamanya, tanpa satu baris log pun.**

### 3. Satu pelanggan bisa memborong gilirannya

Batch diambil `ORDER BY next_attempt_at ASC LIMIT 100`. Satu tenant yang ramai —
impor besar, penutupan kasir, apa pun yang memancarkan ratusan peristiwa
sekaligus — mengisi seluruh seratus itu. Pelanggan lain menunggu di belakangnya,
setiap batch.

Kelas yang sama dengan ekor tenant pada Fase 57a: giliran yang tidak digilir
bukan antrean, melainkan tembok.

## Yang dikerjakan

- **Tiap pengiriman dibungkus sendiri.** Baris yang galat tetap `pending` dan
  diambil lagi jalan berikutnya; sisanya tetap terkirim.
- **Anggaran waktu batch**, disetel pemanggilnya. Cron memberi **sisa**
  anggarannya (`Math.max(5_000, 25_000 - berjalan)`), bukan angka tetap — blok
  ini berjalan paling akhir, jadi jatahnya memang bergantung pada blok
  sebelumnya. Yang tertunda **dihitung dan dilaporkan**, bukan didiamkan.
- **Giliran adil**: satu pengiriman per pelanggan bergiliran, lalu putaran
  berikutnya. Urutan tunggu tetap dihormati — yang paling lama menunggu tetap
  dapat giliran pertama di tiap putaran.
- **`last_attempt_at` diambil saat percobaan**, bukan saat batch dimulai. Pada
  batch panjang keduanya berselisih menit, dan yang dibaca pemilik di layar
  adalah "kapan terakhir dicoba", bukan "kapan cron bangun".
- **Penjaga 54g diperluas** ke berkas yang kerjanya dipanggil cron
  (`BERKAS_KERJA_CRON`). Menambah pekerjaan cron ke berkas baru kini berarti
  menambahkannya ke daftar itu pada commit yang sama.

## Penjaga yang hijau tanpa memeriksa apa pun

Perluasan penjaganya mula-mula **hijau** — dan salah.

Perlindungan di `webhooks.ts` sengaja dicabut untuk membuktikan penjaganya bisa
merah. Ia tetap hijau. Sebabnya ada di parser penjaga itu sendiri:

```js
const re = /for \((?:const|let) [^)]*? of [^)]*?\) \{/g;
```

`[^)]` berhenti pada kurung tutup pertama, jadi header yang iterabelnya berupa
**panggilan** — `for (const d of giliranAdil(results))` — tidak pernah cocok.
Gelungnya tak terlihat, dan uji yang tidak menemukan gelung apa pun lulus tanpa
memeriksa apa pun.

Diperbaiki jadi `[^\n]`, dan tiap berkas yang disapu kini juga punya **asersi
jumlah gelung**: penjaga yang tidak menemukan apa-apa harus berisik, bukan
diam. Sesudah itu sabotasenya memerah pada uji yang tepat, lalu hijau lagi.

Ini kali keempat dalam program ini sebuah gerbang berbunyi hijau padahal tidak
menguji apa pun. Tiga kali sebelumnya di Fase 56d, dan seperti di sana, yang
menemukannya bukan pembacaan ulang melainkan sabotase.

## Validasi

| Gerbang | Hasil |
|---|---|
| `pnpm typecheck` | lulus |
| `pnpm test` | 1.387 unit test (+12) |
| `pnpm build` | lulus |
| `pnpm smoke` | 1.372 cek |
| `node scripts/ui-sim.mjs` | 508 cek |
| `pnpm lint` | lulus |
| `sapu-i18n` | 0 (ambang 0) |
| `sapu-warna` | 0 / 0 |
| `sapu-istilah` | 0 pelanggaran |
| `sapu-gaya` | 0 (ambang 0) |
| `periksa-tautan-dokumen` | semua hidup |

Dua belas uji baru: sepuluh di `webhookAntrean.test.ts` (giliran adil diuji
sebagai fungsi murni; anggaran waktu & waktu percobaan sebagai bentuk sumber),
dua di `cronKetahanan.test.ts` (cakupan berkas kerja + regresi parser per
berkas).

## Catatan

Ketiga cacat di fase ini ada di kode yang berjalan **tanpa ada yang menonton**,
dan tidak satu pun akan pernah muncul sebagai keluhan yang bisa ditelusuri.
Gejalanya bagi pelanggan hanyalah "webhook saya kadang tidak sampai" — kalimat
yang tak seorang pun bisa mengubahnya menjadi laporan bug.
