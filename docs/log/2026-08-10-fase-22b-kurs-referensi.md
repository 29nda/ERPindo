# Fase 22b — Kurs referensi harian dari sumber luar

Lanjutan langsung Fase 22a. Revaluasi akhir periode memakai `currencies.rate`
sebagai kurs penutup — dan sampai fase ini angka itu **hanya bisa diketik
manual**. Laporan yang mengaku memakai "kurs penutup" karena itu sebenarnya
memakai kurs terakhir kali seseorang ingat memperbaruinya.

## Yang dikerjakan

- `bacaKursReferensi()` di `packages/shared/src/accounting.ts` — fungsi murni
  yang mengurai payload sumber luar jadi peta `KODE → Rupiah per 1 valas`.
- `segarkanKursReferensi()` di `apps/api/src/routes/currencies.ts` — mengambil
  payload, lalu memperbarui master kurs tenant.
- Blok di loop cron harian `apps/api/src/index.ts`, **didahulukan sebelum
  jurnal apa pun hari itu** supaya template & revaluasi yang diposting cron
  memakai kurs hari ini, bukan kurs kemarin.
- Kolom **"Terakhir diperbarui"** di halaman Mata Uang.

## Tiga keputusan yang menentukan bentuknya

**1. Sumber absen = fitur mati, bukan galat.** Tanpa `KURS_SOURCE_URL` cron
melewatinya diam-diam — pola degradasi anggun yang sama dengan binding opsional
lain di repo ini.

**2. HANYA memperbarui mata uang yang SUDAH terdaftar.** Sumber kurs
mengembalikan 150+ mata uang. Menyisipkan semuanya akan membanjiri daftar milik
pemilik warung yang cuma memakai USD — dan daftar yang membengkak diam-diam
adalah kerusakan yang tak seorang pun laporkan sebagai bug, cuma ditinggalkan.

**3. Kegagalan tidak menyentuh kurs lama.** Sumber mati, balasan bukan JSON,
atau basisnya bukan IDR → kurs kemarin tetap berlaku. **Kurs yang usang masih
bisa dipertanggungjawabkan; kurs yang tergantikan angka sampah tidak.**

## Pengurainya sengaja rewel

Kurs adalah angka yang **mengalikan seluruh saldo valas**. Satu nilai sampah
yang lolos akan menggeser neraca tanpa ada yang mengetik apa pun. Karena itu
`bacaKursReferensi()` memisahkan dua tingkat penolakan:

| Keadaan | Perlakuan | Alasan |
| --- | --- | --- |
| bukan objek, `base` bukan IDR, tanpa `rates` | tolak **seluruhnya** | payload berbasis USD dibaca sebagai IDR akan menggeser kurs ribuan kali lipat — kelas kesalahan yang tidak boleh separuh jalan |
| satu nilai bukan angka berhingga positif | buang **satu itu saja**, laporkan lewat `diabaikan` | satu mata uang rusak tidak boleh menahan pembaruan yang lain |
| akhirnya kosong | tolak | "sukses yang kebetulan tidak mengubah apa pun" adalah laporan yang menyesatkan |

Delapan uji unit menutup ketiganya, termasuk kasus `{ USD: ok, EUR: "banyak",
JPY: 0, GBP: -1, CHF: NaN }` → hanya USD terpakai, empat sisanya terlapor.

## Pekerjaan latar yang mengubah angka akuntansi harus meninggalkan jejak

`ApiCurrency` sebelumnya tidak memuat `updatedAt`, jadi kurs bisa berubah
sendiri tanpa satu pun tanda di layar. Itu persis pola yang berulang kali jadi
masalah di repo ini — fitur yang bekerja (atau salah bekerja) tanpa terlihat.
Kolom **"Terakhir diperbarui"** ditambahkan ke daftar kurs, dijaga `F40`.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **369** (dari 361) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **997** (dari 993) |
| `node scripts/ui-sim.mjs` | 0 | **305** (dari 304) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

Delapan uji unit baru, empat cek smoke (blok `14c3`), satu cek ui-sim (`F40`).

**Dibuktikan bisa gagal**, semuanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| penjaga "hanya mata uang terdaftar" diganti INSERT-or-UPDATE | `22b mata uang di sumber yang TIDAK terdaftar tenant tidak ikut disisipkan` (`→ IDR,USD,XAU`) — tiga cek lain **tetap hijau**, jadi kegagalannya benar-benar terisolasi |
| kolom "Terakhir diperbarui" dihapus dari tabel | ui-sim `F40` (`→ ada kolom=false`) |

## Yang TIDAK teruji, dinyatakan apa adanya

**Jalur `fetch()` sungguhannya tidak dijalankan gerbang mana pun.** Smoke
memakai `KURS_PAYLOAD_OVERRIDE` yang menggantikan pengambilan lewat jaringan.
Itu keputusan sadar: gerbang tidak boleh bergantung pada layanan pihak ketiga
yang bisa mati, berubah bentuk, atau membatasi laju — suite yang merah karena
server orang lain sedang bermasalah akan cepat berhenti dipercaya.

Konsekuensinya jujur: yang terbukti adalah **pengurai, penjaga, dan
perkabelannya ke cron**; yang belum adalah panggilan HTTP-nya sendiri dan
bentuk payload penyedia sungguhan. Sampai `KURS_SOURCE_URL` diisi dengan sumber
nyata dan hasilnya diperiksa sekali secara manual, butir ini belum bisa disebut
selesai di produksi.

**Sumber kurs pajak Kemenkeu belum dipakai.** Roadmap menyebutnya secara
spesifik. Pengurai ini menerima bentuk `{ base, rates }` yang umum dipakai
penyedia gratis; kurs pajak KMK terbit mingguan dalam bentuk berbeda dan
butuh pengurai tersendiri. Dicatat, tidak dikarang.

## Catatan kejujuran

Cek smoke pertama saya memeriksa **tenant yang salah**. Saya menaruhnya sesudah
blok siklus langganan, di mana tenant utama sudah jatuh `past_due` — sementara
loop harian cron hanya menyapu tenant `active`/`trial`. Ceknya merah
(`→ 16000`) bukan karena fiturnya rusak melainkan karena cron memang tidak
pernah menyentuh tenant itu.

Ini kelas yang sama dengan tiga kesalahan Fase 22a: **cek yang mengukur tempat
yang salah terlihat persis seperti fitur yang rusak.** Dipindahkan ke tenant
`dewiOwn` yang tetap aktif, dan alasannya ditulis di komentar ceknya supaya
orang berikutnya tidak memindahkannya kembali.
