# Fase 33k — dua penyapu baru, dan tiga penjaga yang ternyata tidak bisa gagal

Bagian I panduan gaya. Tanpa fase ini, seluruh Fase 33 berumur persis sampai
halaman berikutnya ditulis: keputusan yang hanya hidup di dokumen dilanggar
oleh orang yang tidak membaca dokumen itu, dan **tidak satu pun gerbang lain
bisa melihatnya** — string apa pun tetap sah bagi tsc, eslint, dan smoke.

Repo ini sudah dua kali kehilangan keputusan dengan cara yang sama: warna
literal (kini dijaga `sapu-warna.mjs`) dan teks satu bahasa (`sapu-i18n.mjs`).

## `scripts/sapu-istilah.mjs` — memaksa glosarium

Empat aturan, semuanya berambang **nol** karena naskahnya memang sudah bersih:

| Aturan | Isi |
| --- | --- |
| `ejaan-utang` | "utang", bukan "hutang" |
| `merek-erpindo` | "ERPindo", bukan "erpindo" |
| `rupiah-tanpa-spasi` | "Rp 499.000", bukan "Rp499.000" |
| `istilah-pegawai` | "karyawan", bukan "pegawai" |

### Tujuh pelanggaran pertama — semuanya sah

Jalan pertama melaporkan tujuh, dan **ketujuhnya boleh**: kunci kamus
`u("hutang")`, nilai enum kontrak API `sumber: "hutang"`, kunci `localStorage`
`erpindo:dashboard-widgets:…`, batas multipart `erpindo${uuid}`, dan
`app: "erpindo"` di manifes ekspor.

Melonggarkan polanya akan membuat penyapu berhenti menjaga apa pun. Yang
membedakan naskah dari pengenal bukan **isinya**, melainkan **bentuknya**:
pengenal satu token tanpa spasi, seluruhnya huruf kecil, sering memuat `:` /
`-` / `_` / interpolasi. Naskah punya spasi, atau diawali huruf besar.

Dengan aturan bentuk itu, `"hutang"` (kunci) lolos sementara `"Hutang"` (label)
dan `"Hutang Usaha"` (nama akun) tetap tertangkap.

Satu sisa: batas multipart `erpindo${crypto.randomUUID().replace(/-/g, "")}`
masih tertangkap, karena `replace(/-/g, "")` mengandung spasi. Isi `${…}`
karena itu dibuang lebih dulu — ia **kode**, dan spasi di dalamnya tidak
menjadikan pembungkusnya sebuah kalimat.

## `scripts/sapu-gaya.mjs` — bentuk kalimat, bukan pilihan katanya

Berambang seperti `sapu-warna.mjs`, karena sebagian kelasnya masih menyimpan
sisa yang sah.

| Kelas | Sisa | Ambang |
| --- | --- | --- |
| `inggris-dalam-kurung` | 0 | 0 |
| `empty-state-buntu` | 9 | 9 |
| `angka-tanpa-pemisah` | 0 | 0 |

Kelas pertama lahir dari kegagalan nyata: "Pengadaan (Procurement)" **lolos**
penjaga judul-vs-menu di Fase 33e, karena judul itu memang diawali label
menunya. Ia diperbaiki dengan tangan, dan sejak sekarang dijaga.

`(BEP)`, `(BoM)`, `(POS)`, `(aging)` justru dipertahankan — singkatan dan
istilah yang pemilik usaha Indonesia memang memakainya. Membuangnya membuat
naskah terasa mengambang (keputusan Fase 32e).

Sembilan sisa `empty-state-buntu` adalah string generik yang dipakai di banyak
layar berbeda (`"Tidak ada."`, `"Belum ada transaksi."`) dan potongan kalimat
yang di layar disambung angka. Langkah lanjut yang spesifik akan benar di satu
layar dan salah di layar lain.

## Uji janji dwibahasa

Penjaga lama (Fase 19q) menangkap `en: ""`. Yang **tidak** ditangkapnya: kolom
Inggris yang berisi kalimat Indonesia, disalin apa adanya saat kunci dibuat lalu
tidak pernah ditengok. Bagi tsc keduanya string; bagi pembaca Inggris, layarnya
berganti bahasa di tengah jalan.

Dua uji baru: kolom `en` tidak memuat kata fungsi Indonesia, dan `id === en`
tidak boleh terjadi pada kalimat panjang.

Uji kedua langsung menemukan satu — dan itu **salah**: `contohNamaKontak`
berbunyi "Toko Berkah / PT Sumber Rezeki" di kedua kolom, dan memang harus
begitu. Menerjemahkan nama perusahaan contoh untuk ERP Indonesia berarti
mengarang data yang tidak akan pernah dilihat pengguna Indonesia mana pun.
Kunci berawalan `contoh*` dikecualikan, dengan alasannya ditulis di tempatnya.

## Setiap penjaga disabotase — dan satu terbukti tidak bisa gagal

Tujuh aturan baru, tujuh sabotase:

| Penjaga | Sabotase | Hasil |
| --- | --- | --- |
| `ejaan-utang` | `id: "Utang"` → `"Hutang"` | ✗ memerah |
| `merek-erpindo` | "menggunakan ERPindo!" → "erpindo!" | ✗ memerah |
| `rupiah-tanpa-spasi` | "mis. 5.000.000" → "mis. Rp5.000.000" | ✗ memerah |
| `istilah-pegawai` | "Nama karyawan" → "Nama pegawai" | ✓ **TETAP HIJAU** |
| `inggris-dalam-kurung` | "Pengadaan" → "Pengadaan (Procurement)" | ✗ memerah |
| `angka-tanpa-pemisah` | "mis. 5.000.000" → "mis. 5000000" | ✗ memerah |
| `empty-state-buntu` | satu langkah lanjut dipangkas | ✗ memerah (10 > 9) |

### Yang keempat itu temuan sesungguhnya dari fase ini

`istilah-pegawai` **tidak bisa gagal**. Penyapu hanya membaca string berkutip,
sementara seluruh isi `pages/print.tsx` — faktur, struk, slip gaji, ringkasan
1721-A1 — adalah **teks JSX**, bukan string.

Artinya penyapu itu buta terhadap **semua dokumen cetak**: satu-satunya naskah
di aplikasi ini yang keluar dari layar dan dipegang orang.

Ditambahkan ekstraksi teks JSX antar tanda kurung sudut. Heuristik, bukan
parser: hanya potongan satu baris tanpa `{}`, yang berarti teks statis murni.
Teks JSX bernilai dinamis lolos, dan itu batasan yang diterima — alternatifnya
menyeret parser JSX ke dalam gerbang yang harus bisa jalan di CI mana pun.

Sesudah itu keempat aturan memerah saat disabotase, dan hijau setelah
dipulihkan.

Tanpa disiplin sabotase, penyapu itu akan masuk CI sambil melaporkan
"✓ 0 pelanggaran" selamanya — laporan yang terlihat meyakinkan justru karena
tidak pernah memeriksa apa pun.

## Dipasang di CI & CLAUDE.md

Keduanya masuk `.github/workflows/ci.yml` dan daftar gerbang di `CLAUDE.md`,
plus dua larangan baru di bagian "Larangan yang sudah diputuskan": naskah
tunduk pada glosarium, dan toast tidak boleh dirakit dari potongan kamus.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 619 | ✅ **621** |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 145 · 0 | ✅ 145 · 0 |
| `sapu-istilah` | — | ✅ **0 / 0 / 0 / 0** (baru) |
| `sapu-gaya` | — | ✅ **0 / 9 / 0** (baru) |

Jumlah gerbang naik dari 6 menjadi **8**.
