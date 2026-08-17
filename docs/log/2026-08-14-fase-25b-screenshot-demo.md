# Fase 25b — seluruh tangkapan layar diganti, dan penjaga demo dibuatkan kuncinya

Permintaan pemilik: demo dibuat baru (yang lama dihapus), dan **seluruh
tangkapan layar aplikasi di halaman jualan maupun di dalam aplikasi diganti
total**.

Keduanya tuntas: gambar diganti dari repo, dan demo produksi benar-benar
dihapus lalu disemai ulang — terverifikasi lewat kueri langsung, bukan klaim.
Jalannya berliku dan dua cacat ditemukan di sepanjang jalan; keduanya ditulis
apa adanya di bawah.

## Yang dikerjakan

**35 gambar diregenerasi** dari seed demo yang sudah berisi 6 bulan data
(Fase 24b): 6 gambar landing + 29 gambar panduan. Semua lewat pipeline yang
sudah ada (`scripts/screenshots.mjs`: wrangler dev → seed → Playwright → WebP),
bukan alat baru.

**Dua modul terakhir yang tak bergambar akhirnya bergambar.** Fase 24c terpaksa
merender **Kas & Bank** dan **Asisten AI** di `/fitur` tanpa gambar — meminjam
milik modul lain akan menampilkan layar yang bukan miliknya. Sebabnya berbeda
untuk masing-masing:

- **Kas & Bank** sekadar tidak pernah masuk manifest. Satu baris.
- **Asisten AI bukan halaman.** Ia panel mengambang yang baru ada setelah
  tombolnya ditekan, sementara pipeline hanya tahu cara membuka rute. Karena itu
  manifest dapat opsi `klik` — satu selector yang ditekan sebelum tangkapan
  diambil.

Kini **seluruh 22 entri** `MODUL_DETAIL` bergambar. Sifat opsional `gambar`
sengaja dipertahankan untuk modul yang ditambahkan kelak.

**`--izinkan-demo` di `scripts/bersihkan-tenant.mjs`.** Mengganti demo memang
mengharuskan yang lama dihapus, sementara `pt-demo-sejahtera` ada di daftar
`DILINDUNGI`. Yang **tidak** dilakukan: mencabut barisnya. Sekali dicabut ia
tidak pernah kembali, dan daftar yang sama melindungi `softtin` — perusahaan
nyata. Kuncinya karena itu berupa flag terpisah yang **hanya** berlaku untuk slug
demo; `softtin` tetap mustahil terhapus dengan cara apa pun (diuji langsung:
`bersihkan-tenant.mjs softtin --izinkan-demo` → tetap MENOLAK).

## Catatan kejujuran — satu elemen sengaja dihapus dari tangkapan layar

Tangkapan Asisten AI diambil di dasbor, dan di lingkungan tangkapan layar
**tidak ada binding Workers AI**. Akibatnya widget "Ringkasan mingguan AI" di
latar menampilkan *"Fitur AI belum tersedia di lingkungan ini"* — benar untuk
dev, **keliru untuk produksi** (Asisten terverifikasi menjawab di sana sejak
Fase 5a). Membiarkannya berarti gambar modul Asisten AI di halaman jualan
mengumumkan bahwa fiturnya mati.

Kalimat itu dihapus sebelum tangkapan, memakai mekanisme yang sudah ada di
pipeline untuk banner "belum diverifikasi": artefak lingkungan, bukan perilaku
produk. Dicatat di sini dan di komentar manifest supaya tidak menjadi kebiasaan
diam-diam — batasnya jelas, yang boleh dihapus hanya yang **tidak benar di
produksi**.

Percobaan pertama menghindarinya dengan memindahkan latar ke Laba Rugi. Hasilnya
lebih buruk: panel asisten menutupi **seluruh kolom nominal**, sehingga laporan
di baliknya terbaca seperti laporan tanpa angka.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **476** |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1088** |
| `node scripts/ui-sim.mjs` | 0 | **337/337** |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

Jumlah cek tidak bertambah, dan itu disengaja: yang berubah adalah berkas gambar.
Penjaganya sudah ada dan tetap hijau — `F22 gambar produk hero landing termuat
(bukan 404/rusak)` di ui-sim, dan penjaga slug dilindungi diuji langsung dari
baris perintah (di atas). Menambah cek yang mengunci isi gambar berarti mengunci
piksel; itu akan merah tiap kali UI berubah sedikit pun tanpa menjaga apa pun.

Seed lokal yang menjadi sumber gambar: **286 langkah, neraca saldo seimbang.**

## Mode probe, dan cacat yang ditemukannya pada dirinya sendiri

Urutan yang disepakati semula "hapus dulu, baru semai". Itu dibalik setelah
pemilik menyatakan **tidak yakin** secret `SEED_EMAIL`/`SEED_PASSWORD` sudah
terpasang — dan tidak ada cara memeriksanya: GitHub tidak memperlihatkan
keberadaan secret lewat API yang tersedia. Menghapus demo lalu menemukan
kredensialnya salah berarti demo mati tanpa jalan pulang.

Karena itu dibuat `SEED_PROBE=1`: login, laporkan akun + apakah perusahaan demo
sudah ada, keluar **sebelum satu pun langkah menulis**. Workflow menjalankannya
selalu; commit yang judulnya memuat `[probe]` berhenti di situ.

Penjaga "demo sudah ada" yang lama tidak cukup untuk peran ini: ia hanya berbunyi
bila akunnya kebetulan anggota perusahaan demo. Akun dengan kredensial benar
tetapi bukan anggota justru **lolos** penjaga itu dan membuat demo **kedua** yang
memakan dua slot pool.

**Run probe pertama membuktikan bahwa probe itu sendiri cacat.** Ia berhenti di
penjaga `IZINKAN_TENANT_BARU` (Fase 23c) **sebelum sampai ke login** — alat yang
dibuat untuk membuktikan kredensial tidak membuktikan apa pun, persis kelas
kegagalan yang alat ini dibuat untuk mencegahnya. Penjaga slot kini dikecualikan
saat `SEED_PROBE=1`, dan itu bukan kelonggaran: probe tidak pernah sampai ke
langkah yang bisa memakan slot.

Run kedua berjalan benar sampai ujung, dan langkah seed **dilewati** (skipped)
sebagaimana mestinya.

## Hasil probe pertama: secretnya memang belum ada

```
SEED_EMAIL:
SEED_PASSWORD:
PROBE: SEED_EMAIL/SEED_PASSWORD KOSONG — secretnya belum terpasang di repo
```

Demo karena itu **tidak disentuh sama sekali** pada tahap ini. Kalau urutan
semula ("hapus dulu") dijalankan apa adanya, `/demo` akan mati tanpa cara
menghidupkannya kembali — probe inilah yang mencegahnya, dan itu sekaligus
membenarkan keputusan membalik urutannya.

## Demo produksi: dihapus, disemai ulang, terverifikasi

Setelah pemilik memasang `SEED_EMAIL`/`SEED_PASSWORD`, probe berbunyi
`demo sudah ada: YA (pt-demo-sejahtera)` — kredensial terbukti **dan** akunnya
anggota perusahaan demo, jadi penggantian aman dilanjutkan.

**Penghapusan.** 82 tabel di-drop, lalu `SELECT … FROM sqlite_master` dijalankan
ulang dan mengembalikan **0** sebelum satu pun baris control-plane disentuh —
urutan yang sama dengan `bersihkan-tenant.mjs`, supaya tidak pernah ada slot yang
terlihat bebas padahal masih berisi pembukuan perusahaan sebelumnya. Pengguna
yatim (`demo-viewer@erpindo.id`, akun staf demo) ikut disapu.

> Catatan teknis: batch `DROP TABLE` menurut urutan pembuatan terbalik **tetap**
> ditolak `FOREIGN KEY constraint failed` — urutan itu bukan urutan topologis
> untuk seluruh graf relasi. `PRAGMA defer_foreign_keys = ON` di awal batch
> menyelesaikannya. Skripnya sendiri lolos karena menjalankan satu DROP per
> panggilan API, bukan satu batch transaksional.

## Dua percobaan semai, dan dua cacat yang ditemukannya

**Percobaan pertama: workflow hijau, seed tidak pernah berjalan.** Penjaga
`[probe]` memakai `contains()` atas **seluruh** pesan commit, sementara badan
pesan commit saya menyebut kata `[probe]` — justru saat menjelaskan bahwa commit
itu *bukan* probe. Komentar di sebelahnya sudah menjanjikan "judul commit", jadi
kondisinya yang salah, bukan niatnya. Diganti `startsWith()`.

**Percobaan kedua: berhenti di menit ke-9, demo separuh terisi.** Perusahaan demo
lahir berpaket **`starter`**, dan modul CRM ke atas menolak
`403 plan-upgrade-required`. Penjualan dan kasir sudah masuk; CRM, HR, aset,
proyek, manufaktur, helpdesk, dan CV Demo Cabang tidak pernah tersentuh.

Sebabnya: `POST /auth/companies` memberi `enterprise` **hanya** bila akunnya ada
di `COMPED_EMAILS`. Demo lama enterprise (warisan lama yang melekat), demo baru
tidak. Slot dikosongkan lagi, seed dipicu ulang, dan paket dinaikkan ke
`enterprise` lewat control-plane sebelum seed menyentuh CRM.

Cacat itu kini **tidak bisa terulang diam-diam**: `seed-demo.mjs` memeriksa paket
tepat setelah perusahaan dibuat — sebelum satu pun data ditulis — dan berhenti
dengan pesan yang menyebut dua cara memperbaikinya.

## Hasil akhir (kueri control-plane & DB tenant, bukan klaim)

| Yang diperiksa | Hasil |
| --- | --- |
| Faktur per bulan | Feb–Agu 2026 terisi; **Agustus 20 faktur, Rp 89.446.480** |
| Neraca | debit = kredit **persis** (Rp 1.070.092.658, selisih **0**) |
| Modul | 3 lead · 4 karyawan · 8 slip gaji · 3 proyek · 4 tiket · 3 aset · 1 produksi · 2 work order · **129 jurnal posted** |
| CV Demo Cabang | ada (TENANT_DB_3, 3 jurnal) — **laporan konsolidasi tidak lagi kosong** |
| Kapasitas | **3 dari 6 slot** terpakai (softtin, demo, cabang) |

"Workspace Staf Demo" memang muncul di daftar tenant tetapi berstatus
`provisioning` tanpa `db_ref` — **tidak memakan slot**, persis seperti yang
diperhitungkan sebelumnya.

## Utang terbuka yang ditemukan sepanjang jalan

- **`COMPED_EMAILS` tidak memuat email pemilik.** Paket demo dinaikkan manual
  sekali ini. Tanpa perbaikan secret, penyemaian berikutnya akan mengulang
  keadaan yang sama — bedanya kini berhenti di detik pertama, bukan menit ke-9.
  **Ditutup Fase 25c:** pemilik memasang ulang secretnya, dan probe produksi
  (14 Agustus 18:57 UTC, run `31831054773`) menjawab `comped : YA`. Penyemaian
  berikutnya akan lahir `enterprise` sendiri, tanpa langkah manual.
- **Grup harga (Fase 23a/b) tidak ikut disemai** — `price_groups` = 0 di demo.
  Fiturnya ada di aplikasi dan dijual di halaman `/fitur`, tetapi calon pelanggan
  yang menelusuri demo tidak akan menemukan contohnya. Dinyatakan apa adanya;
  memperbaikinya berarti menambah langkah baru di seed, pekerjaan tersendiri.
- **Riwayat slip gaji & penyusutan masih ±2 periode** (catatan Fase 24b, belum
  berubah).
