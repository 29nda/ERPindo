# Fase 33c — revaluasi valas sisi utang memposting ke akun PPN

Bukan pekerjaan naskah. Ditemukan **saat** mengerjakan `hutang` → `utang` di
Fase 33b: menelusuri tiap kemunculan kata itu memaksa membaca konstanta kode
akun satu per satu, dan salah satunya tidak cocok dengan namanya.

## Bug

`apps/api/src/routes/financeExtras.ts`:

```
const AKUN_HUTANG = "2-1100";
```

`2-1100` adalah **PPN Keluaran**. Utang Usaha adalah `2-1000`
(`SYS_ACCOUNTS.HUTANG`). Jadi sejak Fase 22a, revaluasi valas sisi utang
menumpuk selisih kurs ke **akun pajak**.

Diukur langsung pada kode lama: PPN Keluaran bergerak `209.000 → 1.209.000`
untuk satu pembelian USD 1.000 yang belum lunas, sementara Utang Usaha tidak
bergerak sama sekali.

## Kenapa tidak ada yang menangkapnya selama sebelas fase

Dua sebab yang menguatkan satu sama lain.

**Jurnalnya tetap seimbang.** Baris utang dan baris laba/rugi kurs sama besar,
jadi seluruh asersi "neraca saldo TETAP seimbang" — ada **25** di smoke —
hijau pada kode yang salah maupun yang benar. `labaBersih` juga tetap benar,
karena ia dihitung dari selisih, bukan dari akun tujuannya. Pembaliknya pun
rapi: ia membalik ke akun salah yang sama.

Ini persis pelajaran yang sudah dicatat repo ini di Fase 21f dan diulang di
komentar blok 22a itu sendiri: **keseimbangan adalah invarian yang murah, arah
yang mahal.** Catatan itu benar, dan tetap tidak menyelamatkan berkas ini.

**Cabangnya tidak pernah dieksekusi.** Sebab yang lebih menentukan: di seluruh
`smoke.mjs` tidak pernah ada satu pun **pembelian bermata uang asing**. Blok
22a menguji sisi piutang dengan teliti — enam asersi, termasuk cek pembalik —
lalu berhenti. `selisihHutang` selalu bernilai 0, jadi `if (selisihHutang !== 0)`
tidak pernah masuk, dan akun tujuannya tidak pernah dipakai.

Uji yang tidak pernah menjalankan sebuah cabang tidak menjaga cabang itu,
sebanyak apa pun asersi di sekelilingnya.

## Perbaikan

Kedua konstanta kini diambil dari `SYS_ACCOUNTS` — sumber yang sama dengan
yang dipakai posting faktur dan pembelian:

```
const AKUN_PIUTANG = SYS_ACCOUNTS.PIUTANG;
const AKUN_HUTANG = SYS_ACCOUNTS.HUTANG;
```

Kode akun tidak bisa lagi menyimpang sendiri di berkas ini. `4-3000`/`5-6000`
dibiarkan literal karena keduanya memang hanya dipakai di sini dan tidak ada
di `SYS_ACCOUNTS`.

## Penjaga baru — dan buktinya bahwa ia bisa gagal

Enam asersi smoke baru, membangun satu pembelian USD 1.000 @kurs faktur 15.000
yang dibiarkan belum lunas, lalu merevaluasi pada kurs 16.000.

Yang diperiksa bukan angka totalnya — itu sudah benar sejak dulu — melainkan
**akun mana yang bergerak**:

| Asersi | Isi |
| --- | --- |
| `33c` GL Utang Usaha (2-1000) naik tepat 1jt | arah & tempat |
| `33c` PPN Keluaran (2-1100) TIDAK tersentuh | tempat yang salah tetap kosong |
| `33c` sesudah pembalik, Utang Usaha kembali ke kurs faktur | pembalik ke akun yang benar |

**Disabotase untuk membuktikan penjaganya hidup.** `AKUN_HUTANG` dikembalikan
ke `PPN_KELUARAN`, smoke dijalankan penuh: **tepat dua asersi gagal, keduanya
milik 33c**, dan 1.136 asersi lain tetap hijau — termasuk seluruh 25 cek
keseimbangan. Lalu perbaikannya dipasang kembali.

Angka "1.136 lain tetap hijau" itulah ukuran sebenarnya dari celah yang tadi
ada: tidak ada satu pun yang punya alasan memerah.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 611 | ✅ 611 |
| `pnpm smoke` | 1.132 | ✅ **1.138** |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 147 · 0 | ✅ 147 · 0 |

## Dampak bagi pemilik

Kecil dalam praktik, dan sebaiknya dikatakan apa adanya: fitur ini hanya
berjalan bila perusahaan punya **faktur pembelian bermata uang asing yang
belum lunas** dan menjalankan revaluasi akhir periode secara manual. Perusahaan
demo tidak memakainya, dan kemungkinan besar belum ada pelanggan yang memakainya.

Yang membuatnya tetap layak diperbaiki sekarang: akun yang tercemar adalah
**PPN Keluaran** — satu-satunya akun yang paling sering dicocokkan pemilik
dengan SPT-nya. Selisih di sana bukan sekadar salah angka, melainkan salah
angka di tempat yang akan dipertanyakan orang lain.
