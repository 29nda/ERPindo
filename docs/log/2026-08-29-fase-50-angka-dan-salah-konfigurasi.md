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

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` | lulus | ✅ lulus |
| `pnpm test` (unit) | 1.117 | ✅ **1.123** (+6) |
| `pnpm build` | lulus | ✅ lulus |
| `pnpm smoke` | 1.299 | ✅ **1.300** (+1) |
| `node scripts/ui-sim.mjs` | 474 | ✅ 474 |
| `pnpm lint` | bersih | ✅ bersih |
| `sapu-warna` | 0 / 0 | ✅ 0 / 0 |
| `sapu-istilah` | 0 pelanggaran | ✅ 0 pelanggaran |
| `sapu-gaya` | 0 / ambang 0 | ✅ 0 / ambang 0 |
| `periksa-tautan-dokumen` | 79 tautan | ✅ 80 tautan |
| `sapu-i18n` (utang, turun = baik) | 53 | ✅ **52** |

Uji negatif penjaga angka (dijalankan, lalu dikembalikan): angka tabel dibuat
basi → memerah menyebut tempat & angka penggantinya; kalimat total diubah
bentuknya → memerah menyebut kutipan yang hilang.

## Yang TIDAK dikerjakan, dan kenapa

Mode `cloudflare` tidak dinyalakan. Kodenya sudah lengkap sejak Fase 23c —
yang kurang hanya dua secret milik pemilik. 50b tidak mempercepat langkah itu;
ia hanya memastikan langkah yang dijalankan dengan urutan terbalik ketahuan
seketika, bukan lewat pendaftar yang gagal.
