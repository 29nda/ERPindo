# Fase 51d — halaman yang diserahkan keluar, tapi tak pernah dibuka peramban

Lanjutan audit Fase 51. Fokusnya cakupan, bukan cacat: mencari **tempat yang
tidak bisa dilihat gerbang mana pun**, lalu membuktikan isinya.

## Hasil negatif yang layak dicatat

Tiga kelas ditelusuri lebih dulu dan ternyata **bersih**. Dicatat apa adanya,
karena hasil negatif yang tidak ditulis akan ditelusuri ulang oleh orang
berikutnya:

| Kelas | Temuan |
| --- | --- |
| Otorisasi per-rute | 277 rute bertenant, **seluruhnya** ber-`requireAuth`. Empat tanpa penjaga peran di middleware — keempatnya ternyata dijaga di dalam handler (`role !== "owner"`, `viewer` ditolak) |
| Stok negatif | Sudah dituntaskan Fase 29a: `UPDATE … AND qty >= ?` + `meta.changes`, dengan uji balapan yang membuktikan pola lama jatuh ke −1 dan −3 |
| Kelebihan bayar | Ditolak: `remaining = total − paid_amount − returned_amount` |

Yang menonjol: keempat rute tanpa penjaga middleware itu **semuanya menyentuh
uang** (billing, checkout, payment link). Pemindaian awal menandainya sebagai
kandidat; pembacaan handler-nya membatalkan tuduhan itu. Melaporkannya tanpa
membaca akan menjadi temuan palsu.

## Yang benar-benar kosong: empat halaman cetak

`/cetak/faktur`, `/cetak/penawaran`, `/cetak/slip-gaji`, `/cetak/1721a1` tidak
ada di `audit-routes.mjs` **dan** tidak disebut sekali pun di `ui-sim.mjs`.
Nol cakupan peramban.

Justru inilah yang diserahkan KELUAR: faktur ke pelanggan, slip gaji dan
1721-A1 ke karyawan. Keempatnya membaca parameter dari query string lalu
mencari dokumennya di daftar — jadi satu perubahan bentuk pada API-nya cukup
untuk mengubahnya menjadi "tidak ditemukan", tanpa satu pun gerbang memerah
sampai ada pengguna menekan tombol cetak.

**Diperiksa: keempatnya merender dengan benar.** Bukan cacat — celah cakupan.
Kini punya cek sendiri (`F51d`), dengan asersi dua sisi: nomor dokumennya harus
muncul DAN kalimat "tidak ditemukan" harus absen. Memeriksa satu sisi saja akan
hijau pada halaman kosong yang kebetulan tidak memuat kata itu.

## Daftar yang mengaku lengkap, tanpa ada yang memaksanya

`audit-routes.mjs` menyatakan dirinya "satu sumber kebenaran: rute baru cukup
ditambah di sini". Komentar di berkas itu sendiri lalu mencatat klaim itu
pernah tidak benar — **tujuh rute publik tidak pernah ditambahkan**, termasuk
dua halaman hukum yang paling perlu diperiksa sebelum tayang.

Empat halaman cetak di atas adalah sisa dari kelas yang sama, masih ada.

`apps/web/test/rute-tersapu.test.ts` menjadikannya gerbang. Yang diperiksa
bukan keanggotaan daftar, melainkan sifat yang sebenarnya penting: **rute itu
dibuka peramban**, entah lewat sapuan atau lewat `goto` tersendiri. Memaksa
keanggotaan daftar akan menyeret halaman berparameter ke sapuan buta, dan
sapuan buta atas halaman semacam itu hanya menghasilkan "tidak ditemukan"
yang hijau.

Tiga rute dikecualikan dengan sebabnya masing-masing (`/verifikasi`,
`/reset-password`, `/undangan` — hanya bermakna dengan token sah; alurnya diuji
smoke di tingkat API). Ada asersi tersendiri yang menjaga daftar pengecualian
tetap kecil dan seluruh isinya masih ada di router: pengecualian yang menumpuk
adalah cara gerbang ini kehilangan arti.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` | lulus | ✅ lulus |
| `pnpm test` (unit) | 1.141 | ✅ **1.144** (+3) |
| `pnpm build` | lulus | ✅ lulus |
| `pnpm smoke` | 1.304 | ✅ 1.304 |
| `node scripts/ui-sim.mjs` | 476 | ✅ **480** (+4) |
| `pnpm lint` | bersih | ✅ bersih |
| `sapu-warna` · `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |
| `periksa-tautan-dokumen` | lulus | ✅ lulus |
| `sapu-i18n` (utang) | 52 | ✅ 52 |

Total pemeriksaan: **2.928**.

Uji negatif: menambahkan rute `/halaman-baru-yang-lupa-disapu` ke router
membuat penjaga cakupan memerah dan menyebut namanya persis.
