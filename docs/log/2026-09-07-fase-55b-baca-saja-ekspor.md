# Fase 55b — mode baca-saja: janji yang tidak pernah sampai ke layar

## Koreksi lebih dulu

Laporan akhir audit menempatkan "mode baca-saja saat langganan berakhir — ekspor
harus tetap hidup" sebagai pekerjaan tersisa nomor satu dan paling mendesak.

**Itu salah.** Perilakunya sudah ada, dan sudah diuji:

| Yang diuji | Di mana |
|---|---|
| `past_due` → membaca laporan tetap 200 | smoke, "mode baca-saja: MEMBACA laporan tetap boleh" |
| `past_due` → menulis ditolak 402 | smoke, "mode baca-saja: MENULIS ditolak 402" |
| Kunci API berskop tulis ikut ditolak 402 | smoke Fase 54e, kedua pintu masuk |
| **Ekspor penuh tetap 200 + ZIP + manifest** | smoke, "ekspor penuh TETAP BISA saat past_due" |
| Akun comped tidak ikut turun | smoke, dua cek |

Saya menuliskannya sebagai belum dikerjakan karena membaca bagian "Yang masih
tertunda" di catatan Fase 53 — bukan karena memeriksa kodenya. Catatan itu basi.

Bentuknya persis pola yang saya tulis sendiri di laporan audit satu hari
sebelumnya: **satu keterangan dipikul dua tempat, dan yang dibaca bukan yang
menentukan.** Kali ini tempat yang salah adalah dokumen, dan yang menerima
akibatnya adalah pemilik — yang nyaris membayar sebuah fase untuk sesuatu yang
sudah dimilikinya.

## Yang benar-benar kurang

Janji itu ada di surel penagihan sejak Fase 20b — *"data tetap aman dan bisa
diekspor"* — dan di halaman publik. Yang tidak pernah mengatakannya adalah
**layar**, tepat pada keadaan yang paling membutuhkannya.

Spanduk merah saat langganan berakhir berbunyi hanya:

> Masa langganan berakhir — akun dalam **mode baca-saja**. Aktifkan langganan di
> Pengaturan.

Pemiliknya sedang menimbang apakah akan kembali, dan satu-satunya kalimat yang
ia lihat adalah cara membayar. Tidak ada yang memberitahunya bahwa datanya utuh
dan bisa dibawa pulang — padahal justru kepastian itulah yang membuat orang
merasa aman untuk kembali, dan ketiadaannya membuat mode baca-saja terbaca
sebagai penyanderaan.

Sekarang spanduk itu menyebutkannya, dan menautkannya langsung ke halaman
unduhnya.

## Kalimat utuh, bukan potongan

Spanduk lama dirakit dari empat potongan kamus:

```tsx
{u("shLanggananBerakhir")} <strong>{u("shModeBacaSaja")}</strong>{u("shAktifkanDi")}{" "}
<Link …>{u("shPengaturan")}</Link>.
```

Menambahkan kalimat kelima ke rangkaian itu berarti memperdalam cacat yang sudah
dilarang repo ini untuk toast sejak Fase 33h: **potongan mengunci urutan kata
Indonesia ke dalam kode**, dan bahasa lain tidak punya cara memindahkan
tautannya ke tempat yang benar menurut tata bahasanya sendiri. Tiga uji di
`test/i18n.test.ts` sudah menjaga larangan itu — tetapi tidak pernah menjangkau
bentuk ini, semata karena lubangnya berisi elemen dan bukan untai.

`isiNode()` di `apps/web/src/i18n/index.ts` menutup celahnya: kalimat utuh
berlubang `{0}`/`{1}`, lubangnya diisi elemen. Kuncinya berasal dari posisi
lubang, jadi pemanggil tidak perlu membawa `key` sendiri.

## Penjaganya

`apps/api/test/bacaSajaEkspor.test.ts` (4 uji). Yang dijaga bukan perilakunya —
smoke sudah — melainkan **sebabnya**, dan sebab itu tipis:

Ekspor lolos mode baca-saja bukan karena ada pengecualian yang menyebutnya,
melainkan karena kebetulan ia GET. Mengubahnya menjadi POST adalah perubahan yang
wajar sekali diusulkan (badan permintaan untuk memilih tabel, misalnya) dan
**tidak akan tampak salah dari berkas yang disunting**: rutenya tetap bekerja
sempurna bagi setiap pelanggan yang berlangganan. Yang patah hanya pelanggan yang
langganannya sudah berakhir — orang yang, menurut definisinya, tidak lagi membuka
aplikasi tiap hari untuk melaporkannya.

Uji ini menuntut empat hal: syarat baca-saja tetap memuat `metode !== "GET"`,
`export/full` terdaftar sebagai GET dan bukan method lain, naskah spanduk
menyebut unduh data dalam kedua bahasa dan memuat kedua lubangnya, dan potongan
kamus lama tidak hidup kembali.

Diuji-negatif: `export/full` diubah menjadi POST, uji memerah, lalu dikembalikan.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.291** (dari 1.287) |
| smoke | **1.351** (tidak berubah) |
| ui-sim | **506/506** (tidak berubah) |
| sapu-warna · istilah · gaya | 0 pelanggaran |
| sapu-i18n | tidak naik |
| tautan dokumen | lulus |
