# Fase 38a — kerangka peragaan menggantikan tangkapan layar

## Yang dikerjakan

Pemilik meminta perombakan total: desain, tata letak, naskah, dan gambar —
dengan satu keputusan yang mengikat seluruh sisanya. **Gambar produk tidak lagi
berupa tangkapan layar, melainkan peragaan beranimasi** yang memperlihatkan
aplikasi sedang dipakai.

Sub-fase ini membangun mesinnya. Belum ada satu pun halaman yang berubah.

### Kenapa mesin, bukan 57 animasi tulisan tangan

Repo ini punya 57 gambar produk (6 di beranda, 22 di `/fitur`, 29 di panduan)
seberat 3,9 MB. Peragaan hero Fase 35a sudah membuktikan bahwa memperagakan
lebih baik daripada memotret — tetapi ia satu komponen tulisan tangan sepanjang
242 baris. Lima puluh tujuh di antaranya berarti ±11.000 baris, masing-masing
dengan timernya sendiri, penanganan `prefers-reduced-motion` sendiri, dan
perlakuan aksesibilitasnya sendiri. Itu bentuk duplikasi yang sama persis
dengan tiga footer yang sedang menunggu disatukan di sub-fase berikutnya.

Jadi: **satu mesin, banyak naskah data.** Naskah berupa data membuat empat hal
mungkin yang tidak mungkin bila tiap peragaan adalah komponennya sendiri —
naskahnya bisa diuji, bisa disapu `sapu-istilah`, bisa dihitung, dan satu
perbaikan aksesibilitas berlaku untuk seluruhnya sekaligus.

Kosakatanya sengaja **tertutup**: delapan jenis panel, delapan jenis langkah.
"Mesin yang bisa menggambar apa saja" adalah bahasa mini, dan bahasa mini
adalah tempat proyek mati. Panel kesembilan adalah keputusan sadar yang ditulis
di `tipe.ts`, bukan improvisasi di dalam sebuah naskah.

### Berkas baru

| Berkas | Baris | Isi |
| --- | --- | --- |
| `apps/web/src/peragaan/tipe.ts` | 176 | `Panel`, `Langkah`, `Naskah`, `Sasaran` |
| `apps/web/src/peragaan/mesin.ts` | 165 | Fungsi **murni**: `bingkaiPada(naskah, i)` → `Bingkai` |
| `apps/web/src/peragaan/pemutar.ts` | 126 | Hook React — satu-satunya pemegang timer |
| `apps/web/src/peragaan/antrean.ts` | 73 | Pembatas global: maksimal dua pemutar aktif |
| `apps/web/src/peragaan/panel.tsx` | 448 | Delapan perender panel |
| `apps/web/src/peragaan/Peragaan.tsx` | 171 | Bingkai jendela, kursor, narasi |
| `apps/web/src/peragaan/naskah/beranda.ts` | 183 | Naskah pertama: `faktur-berantai` |
| `apps/web/src/peragaan/index.ts` | 27 | Registri + tipe `PeragaanId` |

### Keputusan yang mengikat sub-fase berikutnya

**Mesin dipisah dari komponen.** Seluruh keputusan "apa yang terlihat pada
langkah ke-n" ada di `mesin.ts` dan tidak menyentuh DOM, timer, atau state
React. Itulah yang membuatnya bisa diuji sebagai tabel kebenaran biasa, tanpa
merender Chromium.

**Registri, bukan jalur berkas.** Halaman menyebut peragaan lewat `PeragaanId`.
Ini menutup kelas bug yang ditinggalkan pendahulunya: `image: "/landing/…webp"`
bertipe `string`, sehingga salah ketik nama berkas lolos typecheck, lolos lint,
lolos uji, dan muncul sebagai gambar rusak di halaman jualan.

**Angka jurnal kini benar-benar angka.** Naskah hero yang lama menyimpannya
sebagai string dengan alasan yang ditulis terus terang di komentarnya: "ini
peragaan, bukan hitungan". Kini nilainya `number`, keseimbangannya dihitung
mesin, dan diuji. Alasannya ada di halaman itu sendiri — seluruh sudut
jualannya bertumpu pada "angkanya bisa Anda periksa", dan satu-satunya cara
memastikannya bukan memeriksanya dengan mata sekali, melainkan menjadikannya
gerbang.

**Nol elemen yang bisa difokus.** Tombol peraga dirender `<span>`, bukan
`<button>`. Pelajaran ini sudah tertulis di `pertunjukan.tsx:168` untuk satu
tombol; kini ia berlaku untuk seluruh kerangka.

**Tiga gerbang kinerja, dan yang ketiga yang membatasi kasus terburuk.**
Peragaan berjalan hanya bila ia terlihat, tabnya terlihat, dan ia memegang satu
dari dua slot antrean global. Gerbang keterlihatan saja tidak cukup: di layar
tinggi, belasan peragaan bisa terlihat sekaligus. `prefers-reduced-motion`
melewati semuanya — bingkai akhir langsung, tanpa satu timer pun dibuat.

### Token status ditambahkan ke `styles.css`

Sembilan token baru (`--erp-ok-*`, `--erp-awas-*`, `--erp-galat-*`, terang dan
gelap). Ditambahkan sekarang karena panel peragaan memerlukannya, tetapi
akibatnya jauh lebih besar daripada itu: selama pasangan literal
`text-emerald-700 dark:text-emerald-300` masih satu-satunya cara menyebut
"berhasil" dan "gagal", angka `dark:` **tidak mungkin** mencapai nol — `Alert`,
`Badge`, dan spanduk shell sendiri menyumbang ratusan di antaranya.

### `sapu-istilah` diperluas

`apps/web/src/peragaan/**` ditambahkan ke `BERKAS` pada commit yang sama dengan
direktorinya. Naskah peragaan adalah naskah tayang; tanpa baris itu, 57 naskah
berisi kalimat jualan akan lolos gerbang glosarium tanpa siapa pun menyadari.
Cakupan naik **152 → 160 berkas**.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 623 | ✅ **644** (+21) |
| `pnpm smoke` | 1.139 | ✅ 1.139 (tidak menyentuh API) |
| `node scripts/ui-sim.mjs` | 362 | ✅ 362 (belum ada halaman yang berubah) |
| `sapu-warna` | 83 / 325 | ✅ **83 / 320** (ambang dirapatkan) |
| `sapu-istilah` | 0, 152 berkas | ✅ 0, **160 berkas** |
| `sapu-gaya` | 0 / 9 / 0 | ✅ 0 / 9 / 0 |
| `periksa-tautan-dokumen` | 68 berkas | ✅ 68 berkas |

Uji baru: `test/peragaan-mesin.test.ts` (9) dan `test/peragaan-naskah.test.ts`
(12). Yang terakhir memuat penangkal terpenting seluruh kerangka ini —
**tiap jalur yang disebut peragaan wajib terdaftar di `main.tsx`**.

### Angka dasar untuk diukur nanti

Precache PWA saat ini **34 entri / 5.837 KiB**. Sub-fase yang menghapus 57
gambar wajib mencatat angka ini sesudahnya. Klaim "JS lebih ringan daripada
gambar" belum terbukti dan sengaja tidak diklaim di sini.

## Catatan kejujuran

Peragaan bergaya punya satu kelemahan yang tidak dimiliki tangkapan layar:
ia tidak bisa rusak saat produk berubah, jadi ia berbohong tanpa suara.
Tangkapan layar setidaknya terlihat usang oleh mata manusia. Itulah sebab uji
jalur ada, dan sebab uji label akan menyusul di sub-fase naskah — bukan karena
kerangka ini rapuh, melainkan karena kegagalannya akan senyap.
