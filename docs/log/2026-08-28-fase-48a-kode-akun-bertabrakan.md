# Fase 48a — Dua kode akun yang bertabrakan

## Yang ditemukan

Saat menyiapkan Fase 48 saya membaca `SYS_ACCOUNTS` dan menyadari `PERSEDIAAN`
memakai kode `1-1300` — kode yang **saya sendiri pakai dua fase sebelumnya**
untuk "Uang Muka PPh 22". Pemeriksaan lanjutan menemukan tabrakan kedua yang
jauh lebih tua.

| Kode | Dimaksudkan | Sudah dipakai | Sejak |
| --- | --- | --- | --- |
| `1-1300` | Uang Muka PPh 22 (Fase 46) | Persediaan Barang (COA bawaan) | Fase 46, saya |
| `5-2100` | Beban PPh Final UMKM (Fase 7d) | Beban Produksi Diserap (Fase 21f) | Fase 21f |

`ensureAccountByCode` mengembalikan akun yang **sudah ada** bila kodenya cocok.
Jadi kedua pemanggilan itu tidak pernah membuat akun baru; keduanya menulis ke
akun milik orang lain:

- Pungutan PPh 22 mendarat di **persediaan** — nilai persediaan menggelembung,
  kredit pajak tidak pernah tercatat.
- Beban PPh Final mendarat di **akun kontra-beban penyerapan produksi** — beban
  pajak tidak pernah tampil sebagai beban pajak, dan angka penyerapan produksi
  ikut terdistorsi.

Yang kedua punya akibat yang lebih buruk lagi. `accounts.code` ber-UNIQUE, jadi
tenant yang sempat mencatat PPh Final **sebelum** migrasi 21f berjalan akan
membuat `5-2100` bernama "Beban PPh Final UMKM" lebih dulu — lalu migrasi 21f
GAGAL menyisipkannya. Satu tabrakan kode bisa menghentikan migrasi seluruh
tenant.

## Kenapa tidak ada yang melihatnya

Cek smoke Fase 46 yang saya tulis sendiri berbunyi:

```js
check("46 PPh 22 masuk akun ASET Uang Muka PPh 22, bukan akun beban",
      uangMukaP22?.type === "asset");
```

Persediaan **memang** aset. Ceknya lulus, dan lulus dengan meyakinkan, padahal
akunnya salah. **Tipe yang benar bukan bukti akun yang benar.** Ini kelas yang
sama dengan cek peran viewer di Fase 44a yang lulus karena bukan-anggota,
bukan karena perannya.

## Yang dikerjakan

- `apps/api/test/kodeAkunUnik.test.ts` — uji baru yang membaca seluruh
  pemanggilan `ensureAccountByCode` di kode sumber, lalu memastikan tidak ada
  kode yang menabrak COA bawaan dengan nama berbeda, dan tidak ada dua
  pemanggilan memakai satu kode untuk dua nama. Uji inilah yang menemukan
  tabrakan `5-2100`; saya hanya mencari yang pertama.
- `1-1410 Uang Muka PPh 22` dan `5-2200 Beban PPh Final UMKM` — kode baru,
  dikelompokkan dekat kerabatnya (1-1400 PPN Masukan, 5-2000 Beban Gaji).
- Migrasi `0056_kode_akun_pajak` menyediakan kedua akun.
- Cek smoke diperketat: memeriksa **nama** akunnya, bukan sekadar tipenya, plus
  cek tambahan bahwa Persediaan tidak tersentuh.

## Yang sengaja TIDAK dikerjakan

Migrasi ini **tidak menulis ulang jurnal yang sudah diposting.** Jurnal
terposting adalah catatan sejarah; memindahkannya diam-diam akan mengubah
laporan periode yang mungkin sudah ditutup dan dilaporkan ke pihak lain. Angka
lama yang salah tempat harus direklasifikasi lewat Jurnal Umum sebagai
keputusan sadar pemiliknya, bukan efek samping sebuah migrasi.

Paparannya sendiri kecil: PPh 22 baru ada beberapa jam dan belum dipakai di
luar demo. PPh Final di `5-2100` berpotensi ada pada tenant yang memakainya
setelah Fase 21f — perlu diperiksa pemiliknya.

## Catatan kejujuran

Cacat `1-1300` adalah **milik saya**, dibuat di Fase 46 dan sudah ter-merge ke
main sebelum ketahuan. Yang menemukannya bukan kejelian, melainkan kebiasaan
membaca konstanta modul lain sebelum menulis kode baru. Uji yang sekarang ada
membuat penemuan itu tidak lagi bergantung pada kebiasaan siapa pun.

Uji barunya juga memuat penjaga bagi dirinya sendiri: satu asersi memastikan
ia benar-benar menemukan pemanggilan, karena regex yang tidak cocok akan
menghasilkan daftar kosong dan lulus tanpa memeriksa apa pun.

`apps/api/tsconfig.json` mengecualikan berkas uji ini dari typecheck, mengikuti
pola yang sudah ada untuk tiga uji lain yang membaca berkas sumber: tipe Node
bentrok dengan `@cloudflare/workers-types`. Ujinya tetap dijalankan penuh oleh
vitest.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **1.104 lulus** (412 shared + 366 web + 326 api; naik dari 1.101)
- `pnpm build` — lulus
- `pnpm smoke` — **1.289 cek** (naik dari 1.288)
- `pnpm lint` — bersih
- COA bawaan kini 28 akun (dari 26) — dua akun yang ditambah adalah perbaikan
  kode yang menabrak, bukan akun baru yang ditambah karena ingin
