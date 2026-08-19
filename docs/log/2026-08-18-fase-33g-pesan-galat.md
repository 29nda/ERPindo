# Fase 33g — pesan galat: satu aturan, satu suara; dan langkah lanjut

Bagian E panduan gaya. Dua tuntutan: satukan varian yang mengatakan hal sama,
dan beri langkah lanjut pada pesan yang membiarkan pengguna di tempat.

## Angka panduan diukur ulang

| Klaim panduan | Terukur |
| --- | --- |
| 282 pesan galat unik | **346** (`error:`, `message:`, `min(1, …)`) — 274 di antaranya `error:` |
| 10 varian aturan "harus akun kas/bank" | **15** varian, di dua kelas berbeda |
| 121 pesan tanpa langkah lanjut | **204** dari 274 |

Semuanya lebih besar daripada yang ditulis panduan. Tidak ada yang lebih kecil.

## 1. Satu aturan yang diucapkan sembilan cara

Aturan "akun untuk membayar atau menerima uang harus bertipe aset dan belum
diarsipkan" berbunyi berbeda di sebelas tempat:

```
"Akun pembayar harus akun kas/bank (aset)."
"Akun pembayaran harus akun kas/bank (tipe aset)."
"Akun refund harus akun aset (kas/bank) yang aktif."
"Akun sumber harus akun kas/bank (aset) yang aktif."
"Akun uang muka harus akun kas/bank (aset)."
…
```

Aturannya sama persis. Yang berbeda hanya kata yang kebetulan dipilih
penulisnya saat itu. Akibatnya bukan sekadar tidak rapi: pengguna yang
menabraknya di dua layar berbeda **tidak punya cara tahu bahwa itu satu aturan
yang sama**, jadi ia memperlakukannya sebagai dua masalah terpisah.

Kini satu fungsi di `lib/accounting.ts`:

```
galatAkunKasBank("pembayar")
→ "Akun pembayar harus akun kas atau bank yang masih aktif.
   Pilih salah satunya di daftar akun."
```

Perannya tetap disebut. Di layar dengan beberapa kolom akun, peran itu
**satu-satunya petunjuk kolom mana yang salah** — menyeragamkannya sampai
hilang justru membuat pesannya lebih buruk.

### Dua kelas yang sengaja TETAP berbeda

Enam varian lain berbunyi "Pilih akun kas/bank", "Akun kas/bank wajib
dipilih", "Pilih akun bank" — dan itu **bukan** aturan yang sama. Yang di atas
berarti *akun yang Anda pilih salah tipe*; yang ini berarti *kolomnya masih
kosong*. Keduanya diseragamkan **masing-masing**, menjadi
`"Pilih akun kas atau bank lebih dulu."`, bukan digabung jadi satu.

Menggabungkannya akan menukar sembilan bunyi berlebih dengan satu bunyi yang
salah di separuh kasus.

## 2. Langkah lanjut: kelas "… tidak ditemukan."

Pola tunggal terbesar di antara 204 pesan buntu. Ia muncul **114 kali di 32
berkas** — "Proyek tidak ditemukan.", "Gudang tidak ditemukan.", "Aset tidak
ditemukan.", dan seterusnya.

Semuanya berarti hal yang sama: acuannya sudah tidak ada — biasanya dihapus
atau diarsipkan dari tab lain, atau halaman ini sudah usang. Karena sebabnya
sama, langkahnya juga sama:

> "Proyek tidak ditemukan. **Muat ulang halaman, lalu pilih dari daftar
> terbaru.**"

Itu memindahkan pesan dari "sesuatu salah" ke "ini yang perlu Anda lakukan",
tanpa menebak-nebak sebab yang tidak diketahui server.

## Yang BELUM dikerjakan, dan kenapa

Masih ada ±90 pesan tanpa langkah lanjut setelah fase ini. Yang terbesar di
antaranya `"Data tidak valid"` — muncul **107 kali** sebagai fallback zod.

Ia sengaja dibiarkan: pesan itu **tidak pernah tampil sendirian**. Ia selalu
disertai `issues` berisi galat per kolom, dan layar menampilkan galat kolom
itulah yang dibaca pengguna. Menambahkan langkah lanjut pada kalimat pembungkus
berarti menambah satu baris yang mengulang apa yang sudah ditunjuk di kolomnya.

Sisanya menunggu penilaian satu per satu — bukan pola yang bisa disapu, karena
langkah yang benar berbeda tiap pesan.

## Penjaga baru — dan buktinya bahwa keduanya bisa gagal

`apps/api/test/pesan-galat.test.ts`, tiga uji:

1. aturan kas/bank tidak ditulis ulang dengan tangan di mana pun;
2. `galatAkunKasBank()` menyebut peran **dan** langkah lanjut;
3. tidak ada `error: "… tidak ditemukan."` tanpa langkah lanjut.

**Disabotase.** Satu pemanggil di `assets.ts` dikembalikan ke bunyi lamanya →
uji 1 gagal. Satu pesan di `crm.ts` dipangkas langkah lanjutnya → uji 3 gagal.
Keduanya dipulihkan.

### Kekeliruan saya sendiri di penjaga itu

Versi pertama memindai **seluruh isi berkas**, dan langsung memerah pada
`lib/accounting.ts` — karena komentar dokumentasi `galatAkunKasBank()` sendiri
mengutip bunyi-bunyi lama sebagai contoh, dan pada komentar di `commerce.ts`
yang menjelaskan aturannya dalam prosa.

Uji yang melarang sebuah aturan disebutkan **di dalam penjelasannya sendiri**
menjaga hal yang salah. Polanya dipersempit ke posisi yang benar-benar
mengeluarkan pesan (`error:`, `message:`, `min(1, …)`).

### Catatan tipe

Uji ini membaca berkas sumber lewat `node:fs`, dan `apps/api/tsconfig.json`
hanya memuat `@cloudflare/workers-types`. Ia karena itu ikut dikecualikan dari
`typecheck` — **preseden yang sudah ada**: `test/rbac-guard.test.ts` melakukan
hal yang persis sama sejak Fase 7e. Keduanya tetap dijalankan penuh oleh
vitest; yang dilewati hanya pemeriksaan tipenya.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 613 | ✅ **616** |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 147 · 0 | ✅ 147 · 0 |

Smoke tidak berubah, dan itu memang benar: ia memeriksa **kode status**
(400/403/404), bukan bunyi kalimatnya. Karena itu ia hijau baik sebelum maupun
sesudah — dan karena itu pula naskah galat butuh penjaganya sendiri.
