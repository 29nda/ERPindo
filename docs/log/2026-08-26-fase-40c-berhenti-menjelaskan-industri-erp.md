# Fase 40c — halaman depan berhenti menjelaskan industri ERP

## Temuan pemilik

> "Ini POV-nya lu jualan ERP, bukan kasih tahu bisnis ERP. Ngapain sih harus
> ada Proyek Pemasangan, 68% Proyek ERP gagal."

Benar, dan ini kritik yang lebih dalam daripada dua sebelumnya. Fase 40a
membetulkan bentuk kalimat. Fase 40b membuat halaman menyebutkan produknya.
Keduanya masih meninggalkan cacat yang lebih besar: **seluruh halaman berporos
pada industrinya sendiri.**

Judulnya berbunyi "tanpa proyek pemasangan" — kalimat yang hanya bermakna bagi
orang yang sudah tahu bahwa ERP biasanya datang bersama proyek pemasangan. Itu
pengetahuan orang dalam industri perangkat lunak. Pembaca halaman ini
menjalankan perusahaannya sendiri; ia tidak mengikuti industri ERP, dan tidak
perlu mengikutinya untuk membeli.

Satu seksi penuh bahkan memajang tingkat kegagalan kategorinya sendiri: 68%,
189%, lalu 34% / 35% / 38%. Halaman yang membuka dengan statistik kegagalan
kategorinya sedang **menjelaskan bisnis ERP**, bukan menjelaskan produknya.

## Keputusan yang ditimpa, dan dokumennya ikut diperbarui

Bingkai itu bukan kelalaian. Ia keputusan Fase 37 yang tertulis di
`docs/posisi-produk.md`: pembeli perusahaan disebut paling takut proyeknya
gagal seperti yang dulu, jadi halaman depan diwajibkan menjawabnya.

Keputusan pemilik pada fase ini membatalkannya. **`docs/posisi-produk.md` ikut
direvisi di commit yang sama** — kalau tidak, fase berikutnya akan
mengembalikan bingkai industri sambil mengutip dokumen yang sudah tidak
berlaku. Itu persis pola yang berulang tiga kali di repo ini: halaman dan
dokumen berpisah diam-diam, lalu salah satunya menang tanpa ada yang memutuskan.

## Yang dikerjakan

- **Judul berhenti berporos pada industrinya:** "Penjualan, stok, gaji, dan
  pajak perusahaan Anda, dalam satu aplikasi." Pekerjaan yang dikenali pembaca
  dari kantornya sendiri.
- **Keunggulan "siap dipakai" dinyatakan sebagai manfaat** — "perusahaan Anda
  dapat mulai memakainya hari ini juga" — bukan sebagai bantahan terhadap cara
  vendor lain bekerja.
- **Seksi "Empat sebab proyek ERP gagal" diganti, bukan dihapus.** Posisinya di
  corong tetap dibutuhkan: ia menjawab keberatan tepat sebelum tombol daftar.
  Yang berubah, keberatannya kini pertanyaan yang benar-benar diajukan
  pelanggan — "Data yang sudah ada bagaimana?", "Tim kami perlu dilatih dulu?",
  "Nanti ada biaya tambahan?", "Kalau suatu saat kami berhenti?"
- **Argumen kegagalan ERP tetap hidup di `/tentang`**, halaman yang memang
  menjelaskan kenapa produk ini dibangun, lengkap dengan sumbernya. Pembeli
  yang mencarinya tetap menemukannya.
- Bingkai yang sama dibersihkan dari lapisan yang menghadap pelanggan: kaki
  halaman publik (tampil di setiap halaman), deskripsi JSON-LD, blok
  `<noscript>` beranda, `/llms.txt`, dan **gambar bagikan sosial** — `og-image`
  masih bertuliskan "Tanpa proyek implementasi", dan itu yang muncul saat
  tautannya dibagikan di WhatsApp.

## Terverifikasi di peramban, bukan di berkas sumber

Beranda dibaca ulang lewat `innerText` peramban sungguhan:

| Kata | Hasil |
| --- | --- |
| "proyek pemasangan" | hilang |
| "proyek implementasi" | hilang |
| "68%" · "189%" | hilang |
| "gagal" | hilang |

## Validasi

Dua asersi ui-sim mengunci judul lama. Keduanya diperbarui menyebut bunyi
barunya, bukan dilonggarkan.

- `pnpm typecheck` · `pnpm lint` · `pnpm build` — lulus
- `pnpm test` — 923 lulus · `pnpm smoke` — 1.173 cek
- `node scripts/ui-sim.mjs` — 431/431
- Lima penyapu naskah hijau
