# Fase 57c — kurs yang dibulatkan sampai salah, dan sumber yang ditanya seribu kali

## Yang ditutup

Audit multi-mata-uang. Tiga cacat, satu di antaranya menyangkut **nilai uang
yang tercatat di buku**.

### 1. Penyegaran otomatis lebih kasar daripada isian tangan yang ditimpanya

`bacaKursReferensi` membalik "valas per 1 IDR" menjadi "Rupiah per 1 valas",
lalu membulatkannya ke bilangan bulat:

```ts
const perValas = Math.round(1 / nilai);
```

Pembulatan itu membuang ketelitian yang **disediakan skemanya** — kolom `rate`
bertipe `REAL` — dan yang **diterima formulir manualnya**
(`rate: z.number().positive()`, pecahan apa pun). Jadi pekerjaan latar yang
berjalan tiap malam menimpa angka pemilik dengan angka yang lebih kasar.

Sepele bagi USD. Fatal bagi mata uang yang satu satuannya bernilai kurang dari
satu rupiah:

| Mata uang | Sumber (valas per IDR) | Seharusnya | Sebelum fase ini | Akibat |
|---|---|---|---|---|
| VND | 1,57 | 0,636943 | **1** | tiap faktur dong dilebihkan **57%** |
| IRR | 2.600 | 0,000384615 | **0** → ditolak | mata uangnya **tak pernah tersegarkan** |
| USD | 0,0000616 | 16.233,8 | 16.234 | selisih tak berarti |
| JPY | 0,00934 | 107,066 | 107 | selisih tak berarti |

Indonesia berdagang dengan negara-negara itu, dan kurs mengalikan **seluruh**
saldo valas — jadi satu angka yang meleset menggeser neraca tanpa ada yang
mengetik apa pun.

Diganti `Number((1 / nilai).toPrecision(6))`: **enam angka penting**, bukan
enam desimal. Yang perlu dijaga adalah ketelitian **nisbi**, dan itulah yang
dirusak pembulatan bilangan bulat.

### 2. Sumber global diambil sekali PER TENANT

Ini kurs **referensi**: isinya sama untuk semua orang, dan hanya penulisannya
yang per tenant. Pengambilannya duduk di dalam gelung harian:

```ts
for (const t of antreanHarian) {
  …
  const kurs = await segarkanKursReferensi(env, db);   // fetch + tulis
```

Seribu perusahaan berarti **seribu permintaan identik** ke penyedia yang sama
setiap hari — cukup untuk dianggap penyalahgunaan dan diblokir — dan seribu
kesempatan menggantung di dalam gelung yang anggarannya terbatas.

Dipisah jadi `ambilKursReferensi(env)` (sekali per jalan) dan
`terapkanKursReferensi(db, ref)` (per tenant).

### 3. Pengambilannya tanpa batas waktu

Tidak seperti pengiriman webhook yang sudah berbatas 10 detik, `fetch` di sini
tidak punya batas sama sekali. Satu sumber yang menggantung menahan gelung
harian **tanpa batas** — dan pemeriksaan anggaran cron ada **di antara**
iterasi, bukan di tengah satu permintaan, jadi ia tidak bisa menolong.

Ditambahkan `AbortController` 10 detik, sama dengan `deliverOne`.

## Uji lama yang menuntut kebalikannya

`packages/shared/test/kursReferensi.test.ts` menuntut `SGD` tepat `12_005` —
dengan komentar *"1/0,0000833 dibulatkan"*. Angka itu memang yang dihasilkan
kodenya waktu itu; yang tidak diperiksa siapa pun adalah apakah pembulatannya
sendiri benar.

Uji itu **ditulis ulang, bukan dihapus**, dengan alasannya tercatat di
tempatnya — dan ditambahi penjaga kambuh untuk VND & IRR.

## Validasi

| Gerbang | Hasil |
|---|---|
| `pnpm typecheck` | lulus |
| `pnpm test` | 1.399 unit test (+12) |
| `pnpm build` | lulus |
| `pnpm smoke` | 1.372 cek |
| `node scripts/ui-sim.mjs` | 508 cek |
| `pnpm lint` | lulus |
| `sapu-i18n` | 0 (ambang 0) |
| `sapu-warna` | 0 / 0 |
| `sapu-istilah` | 0 pelanggaran |
| `sapu-gaya` | 0 (ambang 0) |
| `periksa-tautan-dokumen` | semua hidup |

Sebelas uji baru di `apps/api/test/kursReferensi.test.ts`, satu ditulis ulang
dan satu ditambahkan di `packages/shared/test/kursReferensi.test.ts`.

Kedua perbaikan intinya dibuktikan bisa merah dengan mengembalikan cacatnya:
pembulatan bilangan bulat dipasang lagi → **empat** uji memerah; pengambilan
dikembalikan ke dalam gelung → **dua** uji memerah. Keduanya hijau lagi sesudah
dipulihkan.

## Catatan

Cacat pertama sudah ada sejak Fase 22b dan lolos dari uji yang ditulis khusus
untuk fungsi itu — karena ujinya menuntut angka yang dihasilkan kodenya, bukan
angka yang benar. Uji yang ditulis dengan menyalin keluaran adalah uji yang
membekukan cacatnya bersama perilakunya.
