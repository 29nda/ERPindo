# Fase 33d — nama akun "Hutang *" → "Utang *", lewat migrasi

Fase 33b menyeragamkan ejaan di seluruh naskah, tetapi berhenti di depan satu
hal yang bukan naskah: **nama akun tersimpan di database tiap tenant**. Fase ini
menyelesaikannya.

## Kenapa ini bukan sekadar mengganti benih COA

Panduan gaya menandainya sebagai ranjau, dan alasannya benar:

> Mengubahnya hanya memengaruhi perusahaan **baru** — pelanggan lama tetap
> memegang "Hutang Usaha". Hasilnya justru terbelah.

Persis itu yang terjadi kalau `COA_SEED` di migrasi `0002` disunting. Lebih
buruk lagi, menyunting entri migrasi lama melanggar aturan yang ditulis di
kepala berkas itu sendiri: **append-only**.

Jadi `COA_SEED` **dibiarkan apa adanya**, dan penyeragamannya dilakukan sebagai
migrasi baru:

```
id: "0047_nama_akun_utang"
UPDATE accounts SET name = 'Utang Usaha'  WHERE code = '2-1000' AND name = 'Hutang Usaha'
UPDATE accounts SET name = 'Utang Gaji'   WHERE code = '2-1200' AND name = 'Hutang Gaji'
UPDATE accounts SET name = 'Utang PPh 23' WHERE code = '2-1400' AND name = 'Hutang PPh 23'
```

Tenant baru menempuh `0002` lalu `0047`. Tenant lama menempuh `0047` saja.
Keduanya berakhir di tempat yang sama — dan itulah seluruh gunanya.

## Kenapa aman

Diperiksa langsung, bukan diasumsikan: **tidak ada satu pun kode yang mencari
akun berdasarkan nama.** Seluruhnya lewat kode akun — `accountIdByCode()`,
`ensureAccountByCode()`, konstanta `SYS_ACCOUNTS`. Nama akun murni teks
tampilan, jadi mengubahnya tidak menyentuh jalur posting mana pun.

Ini juga temuan yang membuat Fase 33c ada: penelusuran yang sama menemukan satu
konstanta kode akun yang salah.

## Syarat `AND name = '<nama lama persis>'`

Bukan hiasan. Pengguna boleh mengganti nama akunnya sendiri — misalnya jadi
"Utang Dagang" atau "Hutang Supplier". Penyeragaman ejaan tidak boleh menimpa
penamaan yang sengaja mereka pilih, jadi migrasi ini hanya menyentuh baris yang
masih persis seperti benihnya.

`2-1400` dibuat sesuai kebutuhan oleh `routes/tax.ts`, jadi barisnya bisa saja
belum ada. UPDATE tanpa baris yang cocok adalah no-op — tidak perlu penjagaan
tambahan.

## Yang ikut berubah di luar migrasi

| Berkas | Perubahan |
| --- | --- |
| `routes/tax.ts` | akun PPh 23 yang dibuat saat dibutuhkan kini bernama "Utang PPh 23" |
| `i18n/ui.ts` | `descBuktiPotong23` — "Menciptakan **Utang** PPh 23 untuk disetor" |
| `routes/payroll.ts` | dua komentar yang menamai akun |
| `scripts/verifikasi-demo.mjs` | judul kolom laporan verifikasi |

`descBuktiPotong23` sengaja **ditahan** di Fase 33b, karena saat itu ia menamai
akun yang benar-benar masih bernama "Hutang PPh 23" di layar pengguna. Sekarang
akunnya ikut berubah, jadi naskahnya boleh menyusul.

## Penjaga baru — dan buktinya bahwa ia bisa gagal

Satu asersi smoke: bagan akun tenant yang baru dibuat harus memuat **tepat**
`2-1000 Utang Usaha` dan `2-1200 Utang Gaji`, tanpa satu pun nama berawalan
"Hutang".

Tenant smoke dibuat dari nol, jadi ia menempuh jalur "0002 lalu 0047" — yang
berarti asersinya membuktikan **migrasinya berjalan**, bukan sekadar benih yang
kebetulan sudah benar.

**Disabotase untuk membuktikan penjaganya hidup.** Dua pernyataan UPDATE
diganti `SELECT 1`, smoke dijalankan penuh: asersi itu gagal, dan
melaporkan `2-1000 Hutang Usaha | 2-1200 Hutang Gaji` apa adanya. Lalu
migrasinya dipasang kembali.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 611 | ✅ 611 |
| `pnpm smoke` | 1.138 | ✅ **1.139** |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 147 · 0 | ✅ 147 · 0 |
| `periksa-tautan-dokumen` | hijau | ✅ |

## Yang perlu diketahui pemilik

Migrasi ini berjalan sendiri saat tenant dibuka setelah rilis — tidak ada yang
perlu diklik. Perusahaan yang sudah ada akan melihat nama akunnya berubah dari
"Hutang Usaha" menjadi "Utang Usaha"; saldo, jurnal, dan seluruh laporan
**tidak berubah sama sekali**, karena yang diganti hanya label.

Satu-satunya yang perlu diperhatikan: laporan lama yang sudah diekspor ke Excel
atau PDF tetap memuat nama lama. Itu memang seharusnya — dokumen yang sudah
dicetak adalah rekaman saat itu.
