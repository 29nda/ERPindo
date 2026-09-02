# Fase 51 — sembilan cacat yang tidak terlihat gerbang mana pun

Berangkat dari pertanyaan pemilik: **apakah aplikasi ini bisa dipakai tanpa
salah fungsi dan alur?** Jawabannya tidak, dan berikut yang ditemukan.

Semuanya lolos 2.900-an pemeriksaan yang sudah ada. Tiga di antaranya menyentuh
uang atau keamanan.

## 51a — empat mutasi yang gagal dalam diam

`request()` melempar pada status non-2xx maupun jaringan mati, dan `QueryClient`
aplikasi ini **tidak punya penangan galat global** (`main.tsx` hanya menyetel
opsi `queries`). Jadi `useMutation` tanpa `onError` dan tanpa ada yang merender
`.isError` gagal tanpa jejak apa pun: spinner berhenti, layar tidak berubah.

| Tempat | Akibat bagi pengguna |
| --- | --- |
| `ForgotPasswordPage` | Satu-satunya jalan pulih akun; endpoint dibatasi 5×/5 menit, jadi 429 nyata |
| `kasbank` batal-cocok | Entri tetap tercocok sementara rekonsiliasi dilanjutkan |
| `finance` hapus template | Barisnya tetap ada tanpa sebab yang terlihat |
| `AppShell` keluar | **Sesi tetap hidup** padahal pengguna mengira sudah keluar |

**Tiga dari empat duduk tepat di sebelah saudara yang sudah menangani galat** —
kelalaian berulang, bukan keputusan.

Yang terakhir paling berimbas: di komputer bersama, pengguna menekan "Keluar",
melihat layar yang sama, lalu pergi. Sengaja **tidak** ikut berpindah ke
`/masuk` saat gagal — berpindah hanya membuat layarnya berbohong lebih
meyakinkan, karena cookie sesi masih sah.

Dijaga `apps/web/test/mutasi-sunyi.test.ts`. Lingkupnya **per-komponen**, bukan
per-berkas: versi pertama pemindai ini mencari `.isError` di seluruh berkas,
sehingga `ForgotPasswordPage` tertutup oleh `ResetPasswordPage` yang tinggal di
berkas yang sama — dan cacat paling berbahaya justru luput.

## 51b — 140 query yang gagal menjadi "tidak ada data"

**140 dari 201** `useQuery` memakai `data?.xxx ?? []` tanpa pernah membaca
`.isError`. Gagal memuat karena itu tidak bisa dibedakan dari tidak ada data:
halaman Faktur yang gagal memuat berbunyi **"Belum ada faktur"**, dan pengguna
menyimpulkan datanya hilang.

Menambal 140 tempat berarti churn di 40-an berkas untuk satu kelemahan yang
sama, dan tempat ke-141 lahir tanpa penjaga. Diperbaiki sekali lewat
`QueryCache.onError`.

Yang sengaja tidak ditoast, masing-masing dengan alasannya: **401** (sesi habis,
sudah ditangani AppShell), **403** (tanpa izin, layarnya sudah menjelaskan), dan
**503** (binding absen — degradasi anggun adalah perilaku yang **dirancang** di
repo ini, bukan kerusakan). Pesan sama diredam 5 detik.

Keputusannya diuji di `test/galat-query.test.ts`; **kabelnya** (QueryCache →
toastGlobal → ToastProvider) diuji di browser sungguhan lewat `F51b`, karena
sambungan yang putus akan membuat perbaikan ini diam-diam tidak berbuat apa-apa
— persis kelas cacat yang sedang ditutup.

## 51c — demo tampil rugi tiap tanggal 1–3, untuk kedua kalinya

ui-sim memerah pada `F1b` di tengah pekerjaan 51a/51b. Dipastikan lebih dulu
bukan akibat perubahan itu: **gagal juga pada main bersih**. Muncul karena
tanggal kontainer berganti ke 1 September.

Kartu "Laba Bulan Ini" — yang dilihat setiap calon pelanggan lewat "Lihat Demo"
— menampilkan **rugi Rp 226.150**.

Komentar di `seed-demo.mjs` menunjukkan **Fase 21d sudah pernah memperbaiki
cacat yang sama persis** ("dasbor demo tetap merah di hari pertama tiap bulan")
dengan menambah satu faktur. Marginnya lalu disetel pas-pasan, dan fase-fase
sesudahnya (43a THR, 43b lembur, 44a komisi, 47 pesangon) menambah beban sampai
margin itu habis. Bertahan berbulan-bulan karena **hanya terlihat 2–3 hari
sebulan**: 27 hari sisanya positif tipis, dan CI hijau.

Diukur dengan `verifikasi-demo.mjs`, bukan ditebak:

```
sebelum   2026-09  Rp 76.408.750 | Rp 76.634.900 |   Rp -226.150
sesudah   2026-09  Rp 88.308.750 | Rp 84.281.477 | Rp 4.027.273
```

### Penjaganya diubah dari "di atas nol" menjadi ambang

Inti perbaikannya bukan fakturnya. `nilai > 0` justru **sebab** cacat ini bisa
terkikis diam-diam sampai menembus nol. Kini `F1b` menuntut margin Rp 2 juta.

### Dua gerbang yang saling bertentangan, didamaikan

`verifikasi-demo.mjs` sengaja **mengecualikan** bulan berjalan dari uji laba
("selalu separuh jalan, jadi rugi di sana normal"). Untuk perusahaan sungguhan
itu benar; untuk demo salah — bulan berjalan justru satu-satunya yang dilihat
pengunjung.

Akibatnya berkas itu menyatakan "DEMO MASUK AKAL ✅" pada hari yang sama ui-sim
menyatakannya merah. Dua gerbang bertentangan entah sejak kapan, dan tidak ada
yang mendamaikannya karena keduanya jarang merah bersamaan.

### Regex yang berbohong tentang apa yang dilihatnya

Pola lama hanya mengenali `-Rp 1.000`, sedangkan kartunya merender
`Rp -226.150`. Nilai negatif karena itu dibaca sebagai "tidak ketemu": ceknya
tetap merah, tetapi pesannya menyesatkan penyelidik berikutnya ke arah
"kartunya rusak" alih-alih angka rugi yang benar-benar tercetak.

## 51c — retur bisa bertanggal SEBELUM dokumen asalnya

Kueri dokumen asal di `routes/returns.ts` bahkan **tidak mengambil tanggalnya**,
jadi urutannya mustahil diperiksa: barang bisa tercatat kembali sebelum terjual.

Yang rusak bukan kerapian tanggal melainkan angkanya — jurnal pembalik retur
memakai `returnDate`, jadi retur bertanggal mundur memindahkan pengurangnya ke
**bulan sebelum penjualannya**: bulan lalu kurang saji, bulan ini lebih saji,
dan **neraca saldo tetap seimbang** sehingga tidak ada gerbang lain yang bisa
melihatnya.

Tanggal **sama** tetap boleh — dijual dan dikembalikan di hari yang sama adalah
kejadian nyata; penjaganya memakai "sebelum" yang ketat. Seluruh retur di smoke
yang sudah ada tetap lulus tanpa diubah.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` | lulus | ✅ lulus |
| `pnpm test` (unit) | 1.131 | ✅ **1.141** (+10) |
| `pnpm build` | lulus | ✅ lulus |
| `pnpm smoke` | 1.303 | ✅ **1.304** (+1) |
| `node scripts/ui-sim.mjs` | 474 | ✅ **476** (+2) |
| `pnpm lint` | bersih | ✅ bersih |
| `sapu-warna` · `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |
| `verifikasi-demo` | bulan berjalan dikecualikan | ✅ ikut dinilai |

Setiap penjaga baru diuji negatif lalu dikembalikan:

- melepas perbaikan lupa-password → `F51a` memerah
- melepas `QueryCache.onError` → `F51b` memerah
- melepas `onError` kasbank → penjaga mutasi-sunyi menyebut lokasinya persis

## Catatan kejujuran

Log ini ditulis **menyusul**, pada audit lengkap 2 September, setelah ketahuan
Fase 51 adalah satu-satunya fase di program ini yang tidak punya catatan di
`docs/log/` — padahal justru yang terbesar. Rinciannya waktu itu hanya hidup di
pesan commit `4d1a0f5` dan badan PR #34, dan keduanya bukan tempat orang
mencari "apa yang terjadi di Fase 51".
