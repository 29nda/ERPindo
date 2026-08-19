# Fase 33j — dokumen cetak, subjek email, dan meta

Bagian H panduan gaya. Fase kecil, tiga temuan.

## 1. Satu kolom, dua nama — di dua dokumen yang diterima orang yang sama

| Dokumen | Label |
| --- | --- |
| Slip gaji | "Nama karyawan" |
| Ringkasan 1721-A1 | "Nama **pegawai**" |

Karyawan yang menerima keduanya berhenti sejenak untuk memastikan itu memang
dirinya. Diseragamkan ke **karyawan** — kata yang dipakai seluruh aplikasi
(menu Penggajian, "Tambah karyawan", "Belum ada karyawan").

"Pegawai" tetap boleh dipakai bila mengutip formulir DJP kata per kata; itu
dicatat di glosarium supaya pengecualiannya tidak melar sendiri.

## 2. "Gaji dibawa pulang (netto)"

Baris di atasnya berbunyi "Penghasilan **bruto**". Pasangan yang benar adalah
bruto/bersih; "dibawa pulang" adalah frasa sehari-hari, bukan lawan kata
"bruto".

Jadi urutannya dibalik, bukan dibuang: **"Gaji bersih (dibawa pulang)"** —
istilah akuntansinya sejajar dengan barisnya di atas, dan penjelasan
sehari-harinya tetap ada di dalam kurung untuk yang tidak terbiasa.

## 3. Subjek email tanpa nama pengirim

Empat dari lima email siklus langganan tidak menyebut ERPindo sama sekali:

```
"Langganan PT Maju Bersama telah berakhir"
"PT Maju Bersama masih dalam mode baca-saja"
```

Di kotak masuk, kalimat itu tidak punya petunjuk siapa pengirimnya. Email
tanpa pengirim yang dikenali adalah email yang tidak dibuka — dan email ini
justru yang paling perlu dibaca, karena menyangkut akun yang akan terkunci.

Semua kini diawali `ERPindo — `.

### Satu variabel yang tidak berguna lagi

`const apa = "Langganan"` — sisa dari masa banyak paket, ketika kata itu bisa
berbunyi lain. Sekarang isinya konstan, dan satu-satunya efeknya adalah membuat
subjek email dirakit dari potongan tanpa alasan. Dihapus, kalimatnya ditulis
utuh.

## 4. Meta: diperiksa, tidak diubah

`index.html` sudah menyebut yang benar-benar ada — satu harga, seluruh modul,
pengguna tak terbatas, demo tanpa mendaftar. `og:locale` `id_ID`, gambar OG
ada, Twitter card lengkap.

Satu hal yang diperiksa dan terbukti sudah konsisten: **UMKM vs UKM**. 34
kemunculan `UMKM` di naskah, `UKM` **nol** — tujuh sisanya hanya di komentar
kode, yang tidak dilihat pengguna. Tidak ada yang perlu diubah; dicatat di
glosarium agar tidak dipertanyakan lagi.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 619 | ✅ 619 |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 145 · 0 | ✅ 145 · 0 |

Satu asersi smoke mencocokkan subjek email lama apa adanya
(`/subject="Langganan .* telah berakhir"/`) dan memerah begitu subjeknya
berubah. Diperbarui untuk menyebut awalan barunya — **bukan** dilonggarkan
menjadi pencocokan sebagian, karena awalan itulah yang jadi isi perubahan.
