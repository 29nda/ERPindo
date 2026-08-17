# Fase 21g — Pemindai barcode untuk Safari iOS (cadangan WebAssembly)

Penutup Fase 21. Butir terakhir yang tersisa adalah satu-satunya yang pernah
**ditolak dengan alasan**, bukan sekadar belum dikerjakan — jadi fase ini
dimulai dengan meninjau alasan itu, bukan dengan menulis kode.

## Alasan penolakan Fase 20i: separuh benar, dan separuh yang salah itu penting

Fase 20i menolak cadangan wasm dengan argumen yang rapi: Chromium ui-sim
diperiksa langsung dan menjawab `{"detector":false,"media":false}` — tanpa API
bawaan **dan tanpa kamera** — sehingga jalur pemindaian yang berhasil "tidak
bisa dijalankan oleh gerbang mana pun yang repo ini punya".

Bagian pertama masih berlaku: Safari/WebKit iOS memang tetap tanpa
`BarcodeDetector` per Agustus 2026, jadi butirnya nyata.

Bagian keduanya keliru, dan kekeliruannya berumur sepuluh fase:
**`"media":false` bukan sifat Chromium, melainkan sifat cara kita
menjalankannya.** Chromium menerima `--use-file-for-fake-video-capture=<y4m>`
dan akan memutar berkas itu sebagai kamera. Yang dulu disimpulkan sebagai
"tidak bisa diuji" sebenarnya "belum dicoba".

Pelajaran yang layak dicatat: pengamatannya benar, pengukurannya benar,
kesimpulannya tetap salah — karena yang diukur adalah **konfigurasi alat**,
lalu dibaca sebagai **batas alat**.

## Yang dikerjakan

- `apps/web/src/lib/barcode.ts` — `ctorCadangan()` memuat `barcode-detector`
  (di atas `zxing-wasm`) lewat `import()` **dinamis**, hanya bila
  `BarcodeDetector` bawaan absen. Pengguna Android tidak mengunduh satu byte
  pun dari 1 MB itu.
- `dukunganPindai()` tidak lagi mengembalikan `tanpa-detektor`; varian itu
  dihapus dan diganti `pengurai-gagal`, yang menggambarkan satu-satunya
  kegagalan pemuatan yang masih mungkin (potongan wasm gagal diunduh).
- `scripts/lib/ean13.mjs` — pembangkit barcode EAN-13 (deret modul, PNG, dan
  bingkai Y4M) sebagai sumber tunggal untuk kedua gerbang.
- Kamera palsu di `scripts/ui-sim.mjs`: satu bingkai Y4M berisi barcode kopi
  demo, sehingga suite bisa memindai **barcode sungguhan**.

## Tiga cacat produksi yang ditemukan sebelum satu baris fitur pun berjalan

Ketiganya sudah ada di repo sebelum fase ini, ketiganya tak terlihat oleh
gerbang mana pun, dan **ketiganya sendiri-sendiri cukup untuk mematikan
pemindai barcode sepenuhnya**.

### 1. `camera=()` — Fase 20i membangun pemindai di balik pintu yang dikunci sendiri

`permissionsPolicy: { camera: [] }` di `apps/api/src/index.ts` diterjemahkan
hono menjadi header `Permissions-Policy: camera=()`. Daftar kosong bukan
berarti "tanpa pembatasan tambahan" — ia berarti **kamera ditutup untuk semua
origin, termasuk aplikasi ini sendiri**.

Artinya pemindai barcode yang dibangun Fase 20i **tidak pernah bisa berjalan di
produksi**, bahkan di Android yang punya API bawaan. `getUserMedia()` ditolak
sebelum dialog izin muncul, dan kasir hanya melihat "izin kamera ditolak" —
kalimat yang menyalahkan pengguna atas kesalahan kita.

Cek smoke yang seharusnya menjaganya sudah ada sejak Fase 10h:

```js
check("Permissions-Policy membatasi kamera/mikrofon/lokasi",
      (headers.get("permissions-policy") ?? "").includes("camera"));
```

Ia menuntut kata "camera" **ada**, dan `camera=()` memenuhinya dengan sempurna.
Cek itu mengukur keberadaan kebijakan, bukan isinya — dan karena namanya
menyebut "membatasi", membacanya sepintas justru menenangkan.

### 2. CSP menolak WebAssembly

`script-src 'self'` melarang kompilasi wasm di Chromium. Ditambahkan
`'wasm-unsafe-eval'` — izin yang jauh lebih sempit dari namanya: ia tidak
menghidupkan `eval()` maupun `new Function()`. Ada cek smoke baru yang menuntut
`'unsafe-eval'` biasa **tetap** tidak ada.

### 3. Berkas wasm 1 MB ter-inline sebagai base64

Perbaikan Fase 17a menulis:

```js
assetsInlineLimit: (filePath) => !/\.(woff2?|ttf|otf|eot)$/i.test(filePath)
```

Bentuk fungsi ini artinya "inline apa pun ukurannya" untuk segala sesuatu yang
bukan font — ambang 4 KB bawaan Vite tidak berlaku lagi. Berkas pengurai
1,02 MB karena itu ter-inline jadi **1,42 MB** JavaScript base64, dan precache
PWA naik **5.772 → 6.119 KiB** untuk isi yang sama persis.

**Dua koreksi terhadap dugaan saya sendiri, keduanya ditulis apa adanya.**

1. Saya menulis di komentar kode bahwa bentuk ter-inline juga *merusak*
   pemindaian, karena `fetch()` ke skema `data:` akan ditolak
   `connect-src 'self'`. Itu **dugaan, bukan pengukuran**, dan tidak pernah
   saya buktikan.
2. Saya sempat mengira sudah membuktikannya terbantah, karena pada jalannya
   pembuktian `F38b` **hijau**. Itu juga keliru: pada jalan yang sama saya
   melumpuhkan `F38a` dengan mengisi keranjang lebih dulu, sehingga baris Kopi
   yang ditunggu `F38b` memang **sudah ada sebelum pemindaian**. Hijaunya tidak
   berarti apa-apa — dan `F38a` merah persis untuk memberi tahu saya itu.
   Menggabungkan dua sabotase dalam satu jalan adalah kesalahan metode saya.

Jadi yang benar-benar diketahui hanyalah **biayanya** — 1,02 MB → 1,42 MB,
precache 5.772 → 6.119 KiB — bukan apakah fiturnya rusak. Komentar kode dan
nama cek `F38c` sudah disesuaikan supaya keduanya hanya mengklaim itu.

`.wasm` kini dikecualikan dari inline, dan `wasm` ditambahkan ke `globPatterns`
PWA supaya berkasnya ikut ter-precache sebagai berkas tersendiri.

## Barcode data demo tidak sah, dan itu baru penting sekarang

Ketiga barcode di `seed-demo.mjs` dan satu di `smoke.mjs` memakai digit cek
yang salah (`8990011112220` seharusnya `…224`). Selama pencarian barcode hanya
mencocokkan teks persis, itu tidak berakibat apa-apa. Begitu ada pemindai
sungguhan, barcode berdigit-cek salah **tidak akan pernah terbaca** — pengurai
mana pun menolaknya, dan benar demikian.

Keempatnya dikoreksi. `modulEan13()` sengaja **menolak** kode berdigit cek
salah, supaya fixture yang keliru gagal saat dibuat, bukan diam-diam menguji
kegagalan sambil terlihat menguji keberhasilan.

Yang **tidak** dikerjakan dan dinyatakan: form produk masih menerima barcode
apa pun tanpa memvalidasi digit ceknya. Itu pekerjaan tersendiri (menyentuh
master data + validasi API), bukan bagian dari fase ini.

## Apa yang benar-benar teruji, dan apa yang tidak

Kamera palsu membuat `F38b` menjalankan rantai penuhnya di CI: header CSP &
Permissions-Policy sungguhan → Worker menyajikan berkas wasm → `import()`
dinamis → penguraian dari bingkai kamera → `lookupBarcode` → barang masuk
keranjang. Itu jauh lebih dari yang direncanakan.

**Yang tetap tidak teruji, dan tidak ditutup cek yang seolah menguji:**

- **Safari iOS sungguhan.** Yang dibuktikan adalah "peramban tanpa
  `BarcodeDetector` bisa memindai lewat cadangan wasm" — dan Chromium ui-sim
  memang peramban semacam itu (prasyaratnya diasersi, bukan diasumsikan).
  Bahwa Safari berperilaku sama masih inferensi.
- **Kamera perangkat nyata.** Fokus otomatis, cahaya rendah, dan barcode
  melengkung di kemasan plastik tidak diwakili satu bingkai Y4M yang sempurna.
- **Precache luring.** Berkas wasm terbukti masuk daftar precache, tetapi
  skenario "pesawat mode lalu pindai" tidak dijalankan.

## Temuan pemeriksaan mata

Pemeriksaan mata ID & EN pada panel pemindai yang sedang aktif menemukan tiga
sisa bahasa Indonesia di mode Inggris — dan yang pertama adalah **tombol
terpenting di layar kasir**:

| Terlihat di mode Inggris | Seharusnya |
| --- | --- |
| **Bayar & Cetak Struk** | Pay & print receipt |
| Lihat rekap / Tutup | View summary / Close |
| +50rb, +100rb | +50k, +100k |

Ketiganya luput dari dua penjaga sekaligus, dan sebabnya berbeda-beda:

- **Penyapu i18n** tidak punya "bayar", "cetak", maupun "struk" di kosakata
  penandanya — jadi ini kebutaan **kosakata**, bukan kebutaan struktur seperti
  lima kelas sebelumnya. Menambah kata ke daftar itu memperbaiki satu kasus,
  bukan kelasnya; yang benar-benar menangkapnya adalah mata.
- `+{n / 1000}rb` **dirangkai dari angka** — kelas buta kelima (Fase 21e), yang
  memang belum bisa dibaca alat mana pun.
- Cek `F2a` yang sudah ada memeriksa **panel pemindainya** dan karena itu hijau
  terus, sementara tombol di sebelahnya berbahasa lain. Pola yang persis sama
  dengan `F1h` di Fase 21f: cek yang benar, tetapi menunjuk terlalu sempit.

Ditambahkan `F38d` yang memeriksa **tombol aksi kasir**, bukan panelnya.

## Penyapu i18n dipersempit untuk keenam kalinya — kali ini pada kunci objek

Mengganti nama varian `"tanpa-detektor"` menjadi `"pengurai-gagal"` **menaikkan**
utang penyapu 165 → 166: kata "gagal" ada di kosakata Indonesia penyapu, dan
literal itu duduk sebagai **kunci objek** pada `Record<SebabGagalPindai, UiKey>`
— tak pernah sampai ke layar.

Ini kelas positif-palsu yang sama dengan atribut `${…}` di Fase 21e: memperbaiki
kode justru menaikkan angka utang, dan penyapu berhenti berguna sebagai penanda
kemajuan.

Yang membedakan kunci objek dari cabang ternary (`x ? "Aktif" : "Mati"` — yang
justru teks layar dan **wajib** tetap terhitung) bukan tanda titik dua
sesudahnya, melainkan karakter **sebelumnya**: kunci didahului `{` atau `,`,
cabang ternary didahului `?`. Keduanya diperiksa.

Dibuktikan tidak membutakan penyapu: pada berkas uji, `"pengurai-gagal"` di
posisi kunci dilewati sementara **kedua** cabang ternary Indonesia dan literal
teks biasa tetap terlaporkan. Total utang turun 166 → 162 — tiga di antaranya
positif palsu lama di berkas lain.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **353** (dari 349) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **982** (dari 978) |
| `node scripts/ui-sim.mjs` | 0 | **302** (dari 299) |
| `sapu-i18n` | 0 | utang atribut tetap **0** (utang layar 165 → **162**) |

Empat uji unit baru (`barcode-cadangan.test.ts` 3 + satu di `barcode.test.ts`),
enam cek smoke, empat cek ui-sim (`F38a`–`F38d`). Satu cek `F6c` lama —
"panel menjelaskan peramban tidak mendukung" — **dihapus**, karena keadaan yang
diperiksanya sudah tidak mungkin terjadi lagi; membiarkannya berarti menyimpan
cek yang hijau tanpa menguji apa pun. Jadi 299 − 1 + 4 = **302**.

**Dibuktikan bisa gagal**, semuanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| `camera: ["self"]` dikembalikan ke `camera: []` | smoke `camera=(self)`; ui-sim `F38b` (**298/300**) — dan cek galat halaman menyebut sebabnya sendiri: `Permissions policy violation: camera is not allowed in this document` |
| `'wasm-unsafe-eval'` dilepas dari `script-src` | ui-sim `F38b` — galat halamannya menyebut sebabnya sendiri: `Refused to compile or instantiate WebAssembly module … "script-src 'self'"`. `F38c` sengaja **tetap hijau**, dan itu benar: berkasnya tetap diambil, hanya kompilasinya yang ditolak |
| `.wasm` dikembalikan ke daftar ter-inline `assetsInlineLimit` | ui-sim `F38c` (`→ []` — tak satu pun permintaan `.wasm`) |
| keranjang diisi lebih dulu sebelum pemindaian | ui-sim `F38a` (`→ 1 baris`) |
| kunci EN `bayarCetakStruk` disamakan dengan ID | ui-sim `F38d` (`sisaID` berubah `false` → `true`) |

Ketiga baris pertama bukan sabotase buatan: masing-masing **mengembalikan
keadaan repo sebelum fase ini**. Jadi yang dibuktikan bukan sekadar "ceknya
bisa merah", melainkan "ceknya menangkap cacat yang benar-benar ada di sana".

## Catatan kejujuran

**Dua kesalahan metode saya sendiri, keduanya ketahuan oleh gerbangnya.**

*Menggabungkan dua sabotase dalam satu jalan.* Sudah diuraikan di bagian
cacat 3: `F38b` hijau di sana tidak berarti apa-apa karena `F38a` sedang
dilumpuhkan pada jalan yang sama. Itu membuat saya sempat menyimpulkan sesuatu
yang tidak saya ukur. Pembuktian-bisa-gagal harus satu penjaga per jalan.

*Cek yang merah karena salah asersi, bukan karena ada bug.* Versi pertama
`F38d` menuntut tombol kartu rekap berbunyi "View summary" — padahal `F6b` di
awal suite sudah membukanya, jadi tombol itu berbunyi "Close" sepanjang sisa
suite. Ceknya merah pada pohon kerja yang sebenarnya benar. Asersinya diperbaiki
supaya memeriksa sisi Indonesia ("Tutup"), yaitu keadaan yang memang tampil di
titik itu. Konsekuensinya untuk pembuktian: sinyal yang benar-benar
membedakan adalah `sisaID` — `false` saat sehat, `true` saat kunci EN
dilumpuhkan — dan itulah yang dicatat di tabel di atas, bukan `EN=false` yang
saat itu ikut merah karena sebab lain.

Satu uji unit juga sempat **hijau palsu**. Saya menulis "kegagalannya tidak perlu
dipalsukan — di Node impor `?url` memang gagal", lalu uji itu justru lulus
dengan `{ hentikan }` alih-alih menolak: vitest memakai Vite, sehingga `?url`
ikut terselesaikan dan wasm-nya baru diambil saat `detect()` dipanggil.
Dugaan saya tentang lingkungan uji salah, dan yang menangkapnya adalah asersi
yang kebetulan cukup ketat. Ujinya kini memakai `doMock` dengan alasan
tertulis, dan pengamatan "tanpa mock hasilnya `{ hentikan }`" dicatat di
komentarnya sebagai bukti bahwa uji itu benar-benar mengukur sesuatu.
