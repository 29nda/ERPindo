# Fase 54i — audit situs publik (bagian 10 dari 10)

## Yang dikerjakan

Bagian terakhir audit. Yang dicari: klaim di halaman publik yang tidak lagi
cocok dengan produknya, tautan mati, dan naskah hukum yang masih draf.

Yang ditemukan bukan soal naskah.

### Jalan buntu yang dilaporkan apa adanya

Pengukuran pertama memakai peramban dan menyimpulkan **setiap halaman publik
menyuntikkan JSON-LD yang sama**, termasuk `FAQPage` di `/syarat` dan
`/privasi` yang tidak memuat satu pun tanya-jawab — pelanggaran panduan data
terstruktur Google yang bisa membuat rich result dicabut.

Itu salah. Sumbernya (`landingSeo.ts`) memilih blok per jalur dengan benar, dan
smoke sudah menagihnya lewat HTTP mentah sejak Fase 39a:

```
"39a FAQPage HANYA di beranda, tidak di /privasi yang tak memuat FAQ"
```

Yang saya ukur adalah DOM peramban, dan service worker PWA menyajikan cangkang
`/` yang tersimpan untuk navigasi berikutnya. Temuannya dibuang sebelum ditulis
ke mana pun. Dicatat di sini karena metodenya yang salah, bukan kesimpulannya:
peramban adalah alat yang tepat untuk menguji apa yang dilihat pengguna, dan
alat yang salah untuk menguji apa yang dikirim server.

### Temuan 1 — tiga paket dijual, satu yang bisa dibeli

Fase 53a memecah satu paket menjadi tiga, 53c menegakkan kapasitasnya, 53d
memperbarui beranda. Yang tidak pernah terjadi: membuat ketiganya **bisa
dibeli**.

- Pendaftaran selalu memberi paket masuk (`PAKET_BAWAAN = PAKET_MASUK`).
- Kartu langganan di aplikasi memanggil `checkout.mutate(tenant.plan)` —
  hanya paket yang sedang dipakai, tidak pernah paket lain.
- `api.billingCheckout` tidak pernah mengirim `periode`, jadi skema server
  menjatuhkannya ke bawaan `"bulanan"`.

Akibatnya beranda memasang tiga kartu berisi "atau Rp 7.500.000 per tahun —
hemat dua bulan", dan **harga tahunan itu tidak bisa dipilih di mana pun**.
Naik ke Business atau Enterprise hanya mungkin lewat admin platform.

Servernya sudah menerima keduanya sejak Fase 53a: `checkoutSchema` menerima
paket mana pun dan kedua periode, `hargaPaket` menghitungnya, kelebihan
karyawan ikut ditagih (53e), dan webhook menyetel `plan` dari invoicenya. Yang
tidak ada hanya tempat memilihnya.

Kartu langganan kini memuat pemilih paket dan periode. Penurunan paket sengaja
**tidak** dibuka: kapasitas yang sudah terpakai bisa melampaui paket yang lebih
kecil, dan penurunan diam-diam akan meninggalkan perusahaan dalam keadaan
melewati batasnya sendiri. Itu lewat Dukungan, dan layarnya mengatakan begitu.

### Temuan 2 — halaman "Harga" masih menjual satu paket

Halaman `/harga` dibuat Fase 38d justru supaya ada tautan yang layak
diteruskan ke bagian pengadaan. Sembilan fase setelah paketnya menjadi tiga, ia
masih berbunyi:

| Yang tertulis | Kenyataannya |
|---|---|
| "Satu harga, tanpa biaya tambahan" | tiga harga, dan ada tagihan kelebihan karyawan |
| satu kartu berisi Rp 750.000 tanpa menyebut nama paketnya | itu harga Starter saja |
| "Yang dibatasi — hanya ada satu", lalu kuota AI 100/hari | lima batas pembeda; kuota AI 50/150/400 |
| "beberapa badan usaha beserta konsolidasi" di "yang termasuk" | Starter memuat satu badan usaha |
| "tidak adanya baris lain di bawahnya" | kelebihan karyawan ditagih Rp 150.000 per kepala per tahun |

Beranda sudah benar sejak 53d. Jadi situsnya membantah dirinya sendiri, dan
yang membantah adalah halaman yang dinamai "Harga".

Ditulis ulang: tiga kartu, tabel batas per paket, biaya kepemilikan tiga tahun
untuk pembayaran bulanan maupun tahunan. **Tidak satu angka pun dieja** —
seluruhnya dibaca dari `PLAN_LIMITS`.

### Temuan 3 — `/llms.txt` menyatakan model harga yang sudah dicabut

Berkas ini ditulis khusus untuk dikutip utuh mesin penjawab, dan komentarnya
sendiri menyatakan alasannya: *"angka yang salah kembali sebagai jawaban yang
salah kepada calon pelanggan"*. Isinya:

> Rp 750.000 per perusahaan per bulan. **Satu paket, tidak ada tingkatan.**
> …
> Biaya kepemilikan tiga tahun: 36 kali biaya bulanan, **tanpa baris lain di
> bawahnya**.

Keduanya sudah tidak benar. Daftar paketnya kini dibangun dari `PLANS`, lengkap
dengan harga tahunan, kapasitas, dan tarif kelebihan karyawan.

### Temuan 4 — yang ditemukan gerbangnya sendiri, bukan oleh saya

Setelah ketiga temuan di atas ditambal, gerbang baru dijalankan dan **memerah
untuk dua tempat yang tidak saya baca**:

1. **FAQ beranda.** Pertanyaan "Nanti ada biaya tambahan?" dijawab "Satu harga
   per perusahaan per bulan… menambah pengguna tidak menambah tagihan." Jawaban
   itu menyangkal justru biaya tambahan yang memang ada sejak Fase 53e.
2. **Layar masuk & daftar.** "1.300+ uji otomatis menjaga setiap rilis",
   sementara uji unitnya 1.273 — klaim yang **melebihi** kenyataannya, di
   halaman yang dilihat setiap orang yang mendaftar.

Yang kedua lolos karena gerbang angka Fase 50a hanya menyapu dua dokumen;
naskah aplikasi tidak pernah ikut. Angka itu kini dipaksa
`scripts/lib/angka-gerbang.mjs` sebagai **ribuan bulat terdekat di bawah total
pemeriksaan** — deterministik, jadi ia berubah hanya ketika satu tonggak
benar-benar terlampaui.

## Gerbangnya

`apps/web/test/klaim-paket.test.ts` (10 uji). Fase 42b sudah menutup klaim yang
menunjuk sesuatu yang TIDAK ADA. Yang belum pernah ditanyakan: klaim yang
menunjuk sesuatu yang MASIH ADA, tetapi sudah berubah bentuk.

- **Ungkapan "satu pilihan" dilarang selagi `PLANS` berisi lebih dari satu** —
  dan otomatis diizinkan kembali bila pemilik memang kembali ke satu paket.
  Aturannya tunduk pada datanya, bukan pada tanggal ditulisnya.
- **Setiap medan yang MEMBEDAKAN paket wajib terlihat pembeli**, atau terdaftar
  beserta alasannya. Medan pembedanya dihitung dari `PLAN_LIMITS` sendiri, jadi
  medan pembeda baru langsung tertagih. Inilah yang menangkap "hanya ada satu":
  halaman itu menampilkan satu dari lima.
- **Tidak ada angka rupiah yang dieja di naskah jualan.**
- **Paket masuk wajib paket termurah** — pemilih naik-saja hanya aman selama
  pelanggan baru mulai dari yang paling bawah.
- **Checkout wajib mengirim paket dan periode**, bukan mengandalkan bawaan skema.

Komentar dibuang lebih dulu sebelum disapu, dan itu bukan kerapian: berkas-berkas
ini penuh catatan sejarah paket tunggal ("Fase 30 — paket tunggal") yang justru
harus disimpan. Menyapu berkas mentah akan memerah pada sejarah, lalu ditenangkan
dengan melonggarkan polanya — dan gerbang yang dilonggarkan sekali tidak pernah
kembali ketat.

Ketiga aturan intinya diuji-negatif: menghapus satu baris tabel batas, mengembalikan
`checkout.mutate(tenant.plan)`, dan menaikkan klaim "3.000+" menjadi "4.000+" —
ketiganya memerah, dan hijau lagi setelah dipulihkan.

### Satu gerbang lama ikut diperbaiki

`scripts/sapu-i18n.mjs` mengecualikan nilai `data-*` dan pengenal (`id`,
`htmlFor`, `testId`) sebagai penanda gerbang, bukan teks layar — tetapi hanya
untuk untai berkutip ganda. ``data-testid={`periode-${p}`}`` adalah penanda yang
sama yang ditulis dengan sintaks lain, dan tetap terhitung utang. Kelas yang
sama dengan glob `pages/*.tsx` yang tidak turun ke subfolder (Fase 20m): aturan
yang benar, diterapkan pada sebagian tempat saja.

Diperiksa agar perbaikan ini tidak menutupi utang lama: penyapu **baru** atas
kode **lama** tetap menghasilkan 51 — sama persis. Jadi angkanya turun bukan
karena ada yang disembunyikan.

## Yang TIDAK dikerjakan, dan sebabnya

- **`/panduan` diumumkan di `sitemap.xml` tetapi tidak disajikan Worker.** Ia
  tidak ada di `run_worker_first` maupun di rute `landingSeo`, jadi perayap dan
  mesin penjawab — yang tidak menjalankan JavaScript — menerima cangkang SPA
  kosong bertajuk beranda dan tanpa canonical. 25 modul panduan, badan naskah
  terbesar di situs ini, tidak terbaca oleh pembaca yang justru diundang
  `robots.txt` satu per satu. Memperbaikinya berarti memindahkan isi panduan ke
  `packages/shared` agar Worker bisa membacanya; itu perubahan tersendiri, bukan
  tambalan di ujung fase audit. `/api-docs` kebalikannya: disajikan Worker
  penuh, tetapi tidak ada di sitemap.
- **Tiga medan pembeda paket tidak diumumkan**: `kanalDukungan`,
  `responsJamKerja`, `pendampinganJamPerTahun`. Ketiganya terdefinisi sejak
  53a dan diuji urutannya, tetapi tidak pernah ditampilkan maupun ditegakkan
  satu baris pun. Mengumumkannya berarti menjanjikan SLA yang tidak dijaga apa
  pun — persis kesalahan `maxEntities` yang dihapus Fase 30. Itu keputusan
  pemilik, dan gerbangnya menyimpan alasannya sebagai pengecualian bernama,
  bukan sebagai kelalaian.
- **Prorata saat naik paket** tetap tertunda dari Fase 53. Pemilih paket
  membeli periode baru penuh; tidak ada perhitungan sisa siklus.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.283** (dari 1.273) |
| smoke | **1.351** (dari 1.348) |
| ui-sim | **505/505** (dari 501) |
| sapu-warna · istilah · gaya | 0 pelanggaran |
| sapu-i18n | 51, tidak naik |
| tautan dokumen | lulus |

Total **3.139 pemeriksaan**.
