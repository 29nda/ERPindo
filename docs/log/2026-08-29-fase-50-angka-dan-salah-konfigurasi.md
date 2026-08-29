# Fase 50 — angka yang menagih dirinya, dan salah konfigurasi yang terlihat

Tiga pekerjaan kecil yang berbagi satu bentuk: **keadaan yang benar tidak ada
gunanya bila tidak ada yang melihatnya salah.**

## 50a — angka gerbang berhenti basi

### Yang ditemukan

`docs/05-runbook-go-live.md` (dokumen yang dibaca pemilik pada hari peluncuran)
dan `docs/STATUS.md` (laporan keadaan produk) mengumumkan jumlah pemeriksaan
otomatis sebagai angka. Angkanya ditulis tangan, dan sejak Fase 38r sampai
Fase 49 jumlahnya naik dari 2.498 menjadi 2.890 **tanpa satu pun dokumen ikut
berubah**. Empat kutipan basi sekaligus:

| Tempat | Tertulis | Sebenarnya |
| --- | --- | --- |
| runbook, checklist gerbang | 1.157 smoke · 917 unit · 424 browser | 1.299 · 1.117 · 474 |
| STATUS, kalimat penutup | 1.157 + 917 + 424 = 2.498 | 1.299 + 1.117 + 474 = 2.890 |
| STATUS, tabel "Angka pemeriksaan" | unit **1.113** | 1.117 |

Ironinya khas: repo ini menegakkan "jumlah cek hanya boleh naik", lalu
menerbitkan angka yang tidak pernah naik. Yang salah bukan angkanya — angka
tulisan tangan memang akan basi — melainkan tidak adanya gerbang. Ini kelas
cacat yang sama persis dengan yang melahirkan `periksa-tautan-dokumen.mjs` di
Fase 31e: **dokumen yang sama**, sebab yang sama (Markdown tidak dikompilasi,
jadi tidak ada yang memerah).

Catatan kejujuran: pemeriksaan aritmetika totalnya LULUS pada keadaan basi itu.
1.157 + 917 + 424 memang 2.498. Angkanya konsisten satu sama lain, hanya
seluruhnya tertinggal — jadi konsistensi internal saja bukan bukti kebenaran.

### Yang dikerjakan

`scripts/lib/angka-gerbang.mjs` — penjaganya. Yang tahu jumlah cek sebenarnya
adalah gerbang yang **menghasilkannya**, dan hanya pada detik ia selesai. Jadi
pemeriksaannya ditempelkan di sana, bukan dijadikan skrip terpisah yang harus
menjalankan ulang semuanya:

- `pnpm smoke` → menagih angka smoke
- `node scripts/ui-sim.mjs` → menagih angka browser
- `pnpm test` → kini melewati `scripts/uji-unit.mjs`, pembungkus tipis
  `pnpm -r test` yang meneruskan keluaran & kode keluar apa adanya, lalu
  membaca ringkasan vitest untuk menagih angka unit. Dibungkus, bukan
  digerbangi terpisah, supaya suite tidak berjalan dua kali hanya demi satu
  angka.

Tiga keputusan yang perlu dicatat:

1. **Tidak lewat `check()`.** Satu ✓ tambahan akan menaikkan jumlah cek menjadi
   "yang barusan diperiksa + 1", dan penjaganya selamanya meleset satu dari yang
   dijaganya.
2. **Kutipan yang HILANG dianggap galat**, bukan diabaikan. Kalau seseorang
   mengubah kalimatnya, penjaga ikut memerah — gerbang yang berhenti menemukan
   apa yang dijaganya adalah gerbang mati. Diuji: mengganti "totalnya **2.890
   pemeriksaan**" menjadi "totalnya sekian pemeriksaan" memang memerah.
3. **`docs/log/` tidak dijaga**, begitu pula kolom "Sebelum" di tabel STATUS.
   Log adalah catatan sejarah; angkanya memang harus beku pada tanggalnya.
   Yang dijaga hanya angka yang mengaku menggambarkan keadaan **sekarang**.

`smoke.mjs` mendapat penghitung `passed` (sebelumnya hanya `failures`),
dideklarasikan cukup tinggi untuk mencakup ✓ blok pra-terbang yang dicetak
sebelum `check()` sempat ada. Angkanya terbukti sama persis dengan hitungan
`grep -c "✓"` yang selama ini dipakai manual.

**Penjaganya terbukti bekerja pada pemakaian pertamanya**: begitu 50b menambah
6 unit test dan 1 cek smoke, ketiga dokumen langsung memerah dengan angka
penggantinya disebutkan.

## 50b — salah konfigurasi D1 dinamis terlihat sebelum menggigit

### Yang ditemukan

Runbook §6 memperingatkan: deploy `TENANT_DB_MODE=cloudflare` tanpa
`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` membuat **seluruh** pendaftaran
gagal — "lebih buruk daripada batas 6". Penjaganya memang ada
(`provisionTenantDb` menolak di awal), tetapi menolak **saat pendaftaran**:
setelah salah konfigurasi tayang dan sudah menolak calon pelanggan sungguhan.

Yang membuatnya berbahaya bukan galatnya, melainkan **tampilannya**. Halaman
Admin → Infra melaporkan kapasitas hanya untuk mode lokal; di mode `cloudflare`
ia sengaja diam (D1 dinamis memang tak berbatas). Jadi deploy yang salah
konfigurasi terlihat **lebih sehat** daripada deploy lokal yang normal — tidak
ada peringatan apa pun — sementara tidak satu pun pendaftaran berhasil.

### Yang dikerjakan

`kesiapanD1Dinamis(env)` di `apps/api/src/lib/tenantDb.ts`: fungsi murni,
mengembalikan `null` di mode lokal, dan di mode `cloudflare` menyebut **secret
mana** yang kurang beserta dua jalan keluarnya (pasang secret, atau kembalikan
mode ke `local`). Dilaporkan lewat `GET /api/admin/infra` sebagai `d1Dinamis`,
dan ditampilkan di Admin → Infra sebagai peringatan merah **di paling atas** —
di atas peringatan demo dan kapasitas, karena kapasitas habis pun masih
melaporkan dirinya di kartu, sedangkan keadaan ini membuat kartunya diam.

Dibuat sebagai fungsi murni, bukan logika sebaris di route, supaya cabang
`cloudflare`-nya bisa diuji deterministik tanpa mode itu benar-benar menyala.

## 50c — `testId` bukan teks layar

`sapu-i18n` menghitung `testId="infra-d1-belum-siap"` sebagai utang teks layar.
Prop itu diteruskan apa adanya menjadi `data-testid={testId}` di
`components/ui.tsx` — jadi ia PERSIS kelas `data-*` yang sudah dikecualikan
sejak Fase 22a, hanya berbeda ejaan karena lewat prop React. Menerjemahkannya
justru mematahkan ui-sim yang mencarinya.

Utang turun 53 → 52 (satu positif palsu lama, `infra-demo-belum-siap`, ikut
bersih). Ini kelanjutan langsung dari catatan kejujuran Fase 41 tentang
kelebihan hitung 50: kelas yang sama, ditemukan lagi.

## 50d — angka acuan struktur, salah untuk kedua kalinya

### Yang ditemukan

`docs/08-referensi-teknis-repo.md` menyebut jumlah modul route, halaman, tabel,
dan migrasi. Enam dari angkanya basi:

| Angka | Tertulis | Sebenarnya |
| --- | --- | --- |
| Migrasi control-plane | 16 | **17** |
| Tabel tenant | 81 | **89** |
| Migrasi tenant | 46 | **57** |
| Modul route | 48, lalu "~48" di kalimat lain | **47** (dua-duanya salah) |
| Halaman aplikasi | ~40 | **44** |
| Modul `packages/shared` | 20 | **21** |

Dokumen ini **sudah pernah dikoreksi** di Fase 26b, dengan kesimpulan yang
benar: hitung dari modul yang dimuat, bukan dari teks berkas. Kesimpulan itu
tetap benar dan tetap tidak cukup — menghitung sekali lalu **menyalinnya ke
Markdown** tetap menghasilkan angka beku, karena sesudah itu tidak ada lagi
yang menagihnya. Fase 43–48 menambah sebelas migrasi dan tidak ada yang
memerah.

Dua temuan tambahan saat memeriksa:

- **Perintah hitung ulang yang diterbitkan dokumen itu sudah tidak bisa
  dijalankan.** `node --experimental-strip-types` gagal dengan
  `ERR_MODULE_NOT_FOUND` pada impor tanpa ekstensi di dalam paket. Jadi selama
  entah berapa lama, satu-satunya cara memverifikasi angkanya juga rusak.
- **Satu hal ditulis dengan dua angka berbeda** di satu dokumen: "48 modul
  route" di bagian angka acuan, "~48" di siklus permintaan. Keduanya salah,
  dan yang satu tidak pernah menyingkap yang lain.

Diperiksa juga dan ternyata BENAR (tidak diubah): "22 modul" di
`docs/07-peta-repo-untuk-pemilik.md` — `MODUL_DETAIL` memang berisi 22 entri.

### Yang dikerjakan

`apps/api/test/angkaAcuanDokumen.test.ts` — enam uji yang menagih setiap angka
di bagian itu terhadap modul yang dimuat (`@erpindo/db`) dan isi direktori.
Dua kalimat yang menyebut modul route dijaga terpisah, supaya memperbaiki satu
tidak menutupi yang lain.

Perintah hitung ulang yang rusak **dihapus, bukan diperbaiki**. Jalan keluarnya
memang bukan perintah yang lebih baik: perintah manual hanya berguna bila ada
yang ingat menjalankannya, dan dua kali terbukti tidak ada. Dokumen kini
menunjuk uji yang memaksanya, yang ikut berjalan pada `pnpm test`.

Uji negatif: mengubah "89 tabel" kembali ke "81" memang memerah dengan
`expected 81 to be 89`.

## 50e — pendaftar yang belum membayar bukan tenant yang tertinggal

### Yang ditemukan

Menengok control-plane produksi untuk membereskan satu baris tenant yang
tampak tersangkut (`Workspace Staf Demo`, status `provisioning`, `db_ref`
kosong) justru menyingkap **cacat kode**, bukan sampah data:

```
name                 status         db_ref                schema_version
PT Coba Demo         active         binding:TENANT_DB_1   57
PT Demo Sejahtera    active         binding:TENANT_DB_2   57
Workspace Staf Demo  provisioning   (kosong)               0
CV Demo Cabang       active         binding:TENANT_DB_3   57
```

Bentuk itu bukan kerusakan — ia keadaan sah yang didokumentasikan sendiri di
`docs/08` (`""` = `TANPA_DB`, tenant terdaftar yang belum membayar). Dan
`routes/auth.ts` menulisnya untuk **setiap** pendaftar non-comped:
`comped ? TENANT_SCHEMA_VERSION : 0`.

Tetapi tiga kueri memperlakukannya sebagai tenant biasa:

1. **`migrateTenantBatch`** memilih `WHERE schema_version < ?` tanpa menyaring
   `db_ref`. `getTenantDb(env, "")` melempar `db_ref tidak dikenal`, jadi tenant
   itu tercatat **GAGAL pada setiap jalannya cron** — selamanya, karena tidak
   ada database untuk dimigrasikan. `sisa` tidak pernah 0 dan `selesai` tidak
   pernah true.
2. **`/api/admin/infra`** menghitungnya tertinggal, jadi Admin → Infra
   menampilkan "1 tertinggal migrasi" yang tidak bisa dipadamkan.
3. **`refKinds`** memakai `CASE WHEN db_ref LIKE 'uuid:%' … ELSE 'binding'`,
   sehingga `db_ref` kosong jatuh ke `binding` — pemilik melihat slot pool
   terpakai lebih banyak daripada kenyataannya, padahal angka itulah yang
   dipakai memutuskan kapan menyalakan D1 dinamis.

Yang membuatnya layak diperbaiki sekarang: **ini bukan kasus tepi**. Satu baris
demo hari ini, tetapi setiap calon pelanggan yang mendaftar dan belum membayar
berbentuk persis sama. Begitu ada pendaftar sungguhan, hitungan "tertinggal"
naik dan tidak pernah bisa turun — peringatan yang tidak bisa dipadamkan
akhirnya membuat semua peringatan diabaikan.

### Yang dikerjakan

`AND db_ref <> ''` pada keempat kueri (batch, hitungan sisa, daftar & sensus
tertinggal, sebaran versi), dan ember ketiga `'tanpa-db'` pada `refKinds`.

Tenant tanpa database sengaja **tidak** dinaikkan versinya diam-diam: ia memang
belum punya skema apa pun, dan mengaku mutakhir hanya berbohong ke arah
sebaliknya. Ketika ia membayar, `pastikanTenantTerprovisi` membuat databasenya
lalu menulis `schema_version = TENANT_SCHEMA_VERSION` sekaligus — melompat ke
versi terkini tanpa pernah lewat batch.

Tiruan control-plane di `tenantDb.test.ts` diajari syarat `db_ref <> ''` lebih
dulu. Tanpa itu ia tidak memodelkan hal yang sedang diuji, dan ujinya akan
lulus atau gagal karena sebab yang salah.

Tiga cek smoke ditaruh tepat di titik `calon@contoh.co.id` sudah mendaftar dan
belum membayar — satu-satunya saat suite ini benar-benar memiliki tenant tanpa
database.

Uji negatif: melepas `AND db_ref <> ''` membuat uji unitnya merah
(`expected true to be false`).

### Baris produksinya sendiri

**Tidak dihapus.** Setelah perbaikan ini ia menjadi apa adanya — satu pendaftar
yang belum membayar, tidak memakan slot pool, tidak dihitung tertinggal, tidak
menggagalkan cron. Menghapusnya hanya akan menyembunyikan cacat yang baru saja
diperbaiki, dan bentuk yang sama akan lahir lagi dari pendaftar berikutnya.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` | lulus | ✅ lulus |
| `pnpm test` (unit) | 1.117 | ✅ **1.131** (+14) |
| `pnpm build` | lulus | ✅ lulus |
| `pnpm smoke` | 1.299 | ✅ **1.303** (+4) |
| `node scripts/ui-sim.mjs` | 474 | ✅ 474 |
| `pnpm lint` | bersih | ✅ bersih |
| `sapu-warna` | 0 / 0 | ✅ 0 / 0 |
| `sapu-istilah` | 0 pelanggaran | ✅ 0 pelanggaran |
| `sapu-gaya` | 0 / ambang 0 | ✅ 0 / ambang 0 |
| `periksa-tautan-dokumen` | 79 tautan | ✅ 80 tautan |
| `sapu-i18n` (utang, turun = baik) | 53 | ✅ **52** |

Uji negatif penjaga angka (dijalankan, lalu dikembalikan): angka tabel dibuat
basi → memerah menyebut tempat & angka penggantinya; kalimat total diubah
bentuknya → memerah menyebut kutipan yang hilang; "89 tabel" dikembalikan ke
"81" → memerah `expected 81 to be 89`.

## Yang TIDAK dikerjakan, dan kenapa

Mode `cloudflare` tidak dinyalakan. Kodenya sudah lengkap sejak Fase 23c —
yang kurang hanya dua secret milik pemilik. 50b tidak mempercepat langkah itu;
ia hanya memastikan langkah yang dijalankan dengan urutan terbalik ketahuan
seketika, bukan lewat pendaftar yang gagal.
