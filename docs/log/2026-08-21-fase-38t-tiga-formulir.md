# Fase 38t — tiga formulir terakhir, ditata ulang bukan digeser

## Yang dikerjakan

Fase 38j dan 38k memindahkan formulir sembilan halaman dari **atas daftar** ke
dalam `<Lembar>`. Tiga ditunda dengan alasan yang dicatat di
`docs/03-roadmap-lanjutan.md`: ketiganya bukan formulir sederhana, jadi
menggeser pembungkusnya saja akan meninggalkan halaman setengah jadi.

Ketiganya kini selesai — sebagai penataan ulang.

### 1. `payroll.tsx` — formulir karyawan

Formulir berbagi satu kartu dengan **daftar** karyawan, di dalam satu tab.
Tujuh medan terpasang permanen mendorong daftarnya turun hampir satu layar
penuh — padahal yang paling sering dilakukan di tab itu justru membaca
daftarnya. Menambah karyawan adalah kejadian sesekali; membaca daftar adalah
kejadian harian, dan tata letaknya menomorsatukan yang jarang.

Formulir keluar ke Lembar; pemicunya duduk di kepala kartu, bukan di kepala
halaman — halaman ini bertab, dan aksi yang hanya berlaku pada satu tab tidak
boleh terlihat saat tab lain terbuka.

### 2. `crm.tsx` — Penawaran

Bentuknya sama dengan editor dokumen: satu kepala, baris barang yang bisa
ditambah, rekap total yang ikut berubah. Halaman ini juga masih memakai
`PageHeading` langsung alih-alih `Halaman`, jadi sekalian diseragamkan.

Kisi kepala disusut dari empat kolom ke dua — empat kolom di dalam lembar
selebar `max-w-3xl` menghasilkan medan tanggal selebar delapan karakter.

### 3. `commerce.tsx` — editor faktur

Yang terbesar: ±380 baris yang melayani **dua** mode lewat satu komponen
(penjualan dan pembelian), dengan picking multi-gudang, satuan besar, lot &
kedaluwarsa, valuta asing, dan medan kustom.

**Koreksi terhadap catatan rencana.** Rencana menyebut berkas ini melayani
"empat jenis dokumen". Yang benar dua — `Mode = "sale" | "purchase"`. Angka
empat tampaknya terbawa dari halaman pesanan yang memakai komponen lain.

Dua hal yang bukan sekadar pemindahan:

- **Aksi utama menyebut jenis dokumennya** — "Faktur penjualan baru" /
  "Faktur pembelian baru", bukan "Tambah". Satu komponen melayani dua halaman,
  dan tombol yang berbunyi sama di keduanya menghapus satu-satunya petunjuk
  tentang apa yang akan terbuat.
- **"Ubah" kini membuka lembarnya.** Alur "Ubah" adalah batalkan + isi ulang
  formulir; dulu ia diakhiri `window.scrollTo({ top: 0 })` untuk memindahkan
  mata ke formulir yang selalu terpasang. Dengan formulir di dalam lembar,
  gulir itu tidak berarti apa-apa — dan tanpa penggantinya, "Ubah" akan
  terlihat seperti tombol yang tidak melakukan apa pun.

## Satu asersi lama yang menangkap kesalahan saya

Kisi baris barang saya susutkan dari `1fr_8.5rem_9rem_5.5rem_9rem_2.5rem` agar
muat di lembar. ui-sim menolaknya:

```
✗ F34d kotak qty tetap cukup lebar setelah pemilih satuan muncul (≥ 48px)
```

Asersi itu ditulis di Fase 21c setelah pemeriksaan mata menemukan kotak qty
tergencet oleh pemilih satuan yang berbagi kolom dengannya. Ia mengukur lebar
yang **benar-benar ter-render**, bukan kelas Tailwind-nya — dan justru itulah
yang membuatnya bisa melihat kesalahan hari ini.

Angka treknya dikembalikan ke aslinya. Yang benar-benar dibutuhkan hanya
`[&>*]:min-w-0`: masalahnya bukan trek terlalu lebar, melainkan butir kisi yang
menolak menyusut (lihat Fase 38s).

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm test` | 917 | 917 |
| `pnpm smoke` | 1.157 | 1.157 |
| `node scripts/ui-sim.mjs` | 417 | **424** |
| `sapu-warna` | 0 / 0 | 0 / 0 |
| `sapu-istilah` | 7 aturan / 0 | 7 aturan / 0 |
| `sapu-gaya` | 0 / 9 / 0 / 0 / 0 | 0 / 9 / 0 / 0 / 0 |
| `sapu-i18n` | 146 | 146 |

`pnpm typecheck`, `pnpm build`, dan `pnpm lint` bersih.

Neraca asersi ui-sim: **dipindah 1 · ditambah 7 · dihapus 0.**

Yang dipindah: `F19 Penggajian bertab` dulu menandai tab aktif lewat keberadaan
medan `#emp-name`. Subjeknya tidak berubah — tab Karyawan tetap yang tampil
lebih dulu — tetapi buktinya berubah, karena medan itu kini hidup di dalam
lembar. Penandanya menjadi tombol yang membukanya, dan sebuah asersi baru
memeriksa medannya ada di dalam lembar.

Enam dari tujuh tambahan adalah `lembarTidakMeluber` yang ikut terpasang
sendiri pada tiap pemanggil `bukaLembar()` baru — persis yang dirancang di Fase
38s. Ketiga formulir ini terjaga tanpa satu baris asersi ditulis untuk mereka.
