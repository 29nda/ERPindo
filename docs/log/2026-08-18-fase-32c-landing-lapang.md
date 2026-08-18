# Fase 32c — landing dilapangkan & diringkas

Fase 32a memasang palet dan tipografi. Sub-fase ini mengerjakan **tata letaknya**
— bagian yang sebenarnya membuat halaman terasa lapang, dan yang paling
dikeluhkan pemilik sejak awal.

## 12 bagian → 8

Susunan lama: hero → trust bar → **pita integrasi** → showcase → **grid 11
kartu fitur** → perbandingan → kalkulator → **perbandingan kategori** → harga →
keamanan → FAQ → CTA.

Tiga yang ditebalkan dibuang. Ketiganya mengulang isi `/fitur` yang sudah
ditautkan dari bilah atas, dan bersama-sama membentuk urutan
hero → bukti → fitur → banding → banding → harga — kerangka halaman SaaS mana
pun. Bukti nyata (tangkapan layar produk) kini mendahului argumen.

## Urutan pengerjaannya yang menentukan, bukan hasilnya

Percobaan pertama (dikembalikan sebelum ter-commit) membuang ketiganya **lebih
dulu**, lalu memperbaiki asersi yang pecah. Itu langsung menemukan bahwa klaim
kompatibilitas **Xendit hanya ada di pita itu** — `/fitur` sama sekali tidak
menyebutnya. Satu klaim nyata nyaris hilang dari seluruh situs.

Kali ini urutannya dibalik dan dijalankan sebagai disiplin:

1. Pita integrasi **dipindahkan** ke `/fitur`, di bawah 22 modul — tempat yang
   justru lebih tepat, karena pembaca yang sudah menelusuri seluruh modul
   persis sedang bertanya "apakah ini nyambung dengan yang saya pakai".
2. Asersi `F15b` ditulis dan **dijalankan sampai hijau** untuk membuktikan
   isinya benar-benar sudah ada di rumah barunya.
3. **Baru** pitanya dibuang dari landing.

Memindahkan isi sebelum membuang bukan kehati-hatian berlebih: ia yang
membedakan "meringkas" dari "menghilangkan".

## Dua asersi lain yang menempel — dan satu temuan

**F21** menghitung sel kisi modul di landing. Yang dijaganya adalah **kelas
cacat**, bukan satu kisi tertentu: pada kisi berbagi garis, jumlah sel yang
tidak habis dibagi jumlah kolom meninggalkan lubang menganga. Kisinya pindah ke
kisi integrasi di `/fitur` (6 butir, 3 kolom) — cacat yang sama masih mungkin
muncul di sana bila butir ke-7 ditambahkan kelak.

**Temuan: satu asersi berbohong lewat namanya.**
`"F15 landing memuat kalkulator per-pengguna + perbandingan kategori"` — badannya
hanya memeriksa `landingText.includes("per pengguna")`. Tabel perbandingan
kategori **tidak pernah diperiksa sama sekali**. Namanya diperbaiki agar cocok
dengan yang benar-benar dikerjakannya.

Nama yang menjanjikan lebih dari yang diperiksanya lebih berbahaya daripada
tidak ada asersi: ia membuat pembaca berikutnya menyangka ada yang menjaga,
lalu tenang.

**Positif palsu di uji ikon.** `landing-ikon.test.ts` memeriksa penulisan merek
lewat `JSON.stringify` mentah. `COMPARISON` punya field bernama `erpindo`, jadi
**nama kunci** terhitung sebagai salah tulis huruf kecil — uji memerah untuk
teks yang tidak pernah dilihat siapa pun. Kini yang ditelusuri hanya nilai
string.

## Pelapangan

| | Sebelum | Sesudah |
| --- | --- | --- |
| Jarak antar-seksi | `py-20` | `py-28 sm:py-36` |
| Awal halaman | `pt-16 sm:pt-24` | `pt-20 sm:pt-32` |
| Lebar paragraf | `max-w-2xl` (42rem) | `max-w-[34rem]` (±65 karakter) |
| Tinggi baris paragraf | `leading-relaxed` | `leading-[1.7]` |

Lebar baca dibatasi karena 42rem pada teks 18px menghasilkan baris ±85
karakter — terlalu panjang untuk dibaca nyaman, dan justru melawan kesan tenang
yang sedang dituju. `/fitur` ikut dilapangkan agar seirama.

Aplikasi **tidak** disentuh: keputusan pemilik "landing lapang, aplikasi tetap
padat".

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 610 | ✅ **611** |
| `pnpm smoke` | 1.132 | ✅ 1.132 |
| `node scripts/ui-sim.mjs` | 360 | ✅ **361** |
| `sapu-warna` | 88 / 335 | ✅ **85 / 327** |

**−188 baris, +122 baris.**

## Yang BELUM dikerjakan

38 gambar produk di `public/landing/` & `public/panduan/` masih memotret palet
biru dan kini bertentangan dengan halamannya yang krem. Regenerasi lewat
`screenshots.mjs` menyusul di 32d — sekarang tata letaknya sudah final, jadi
tidak akan dikerjakan dua kali.
