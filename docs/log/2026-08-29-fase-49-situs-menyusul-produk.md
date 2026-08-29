# Fase 49 — Situs menyusul produknya

## Yang ditemukan

Pertanyaan pemilik: "apakah landing page sudah terupdate?" Jawabannya **belum,
nol dari sepuluh**. Sepuluh fase fitur dikirim ke produksi tanpa satu kata pun
muncul di situs yang menjualnya:

THR · lembur · pesangon · PKWT · komisi sales · target & prakiraan · eskalasi
kontrak · PPh 22 · e-Bupot · konsinyasi · dropship.

Fase 42b menutup arah yang satu — halaman menjanjikan yang tidak ada di produk.
Ini arah **sebaliknya**, dan tidak ada satu pun gerbang yang melihatnya.
Kerugiannya nyata meski sunyi: pembeli membandingkan ERPindo dengan pesaing
memakai daftar yang salah, dan modul yang paling sulit dibangun justru yang
paling tidak terlihat.

## Yang dikerjakan

- `packages/shared/src/landing.ts` — `FITUR_UTAMA` diperkaya (13 → 16 butir),
  dan FAQ pajak menyebut PPh 22, THR, lembur, pesangon, serta e-Bupot.
- `apps/web/src/pages/landing/fiturDetail.ts` — modul Gaji, Pajak, Stok, CRM,
  dan Kontrak masing-masing mendapat butir baru.
- `apps/api/test/fiturTertinggal.test.ts` — penjaga baru.

`FITUR_UTAMA` dipilih sebagai tempat utama karena ia **satu sumber yang memberi
makan tiga permukaan sekaligus**: halaman landing, `featureList` JSON-LD untuk
mesin pencari, dan bagian Modul di `/llms.txt` untuk mesin penjawab. Satu
suntingan, tiga tempat — dan itu pula sebabnya ia tempat yang tepat dijaga.

## Penjaganya

Uji baru memasangkan tiap istilah wajib dengan **bukti keberadaannya di
produk** — nama tabel atau kolom yang dicari di `migrations.ts`/`routes/tax.ts`,
bukan sekadar keyakinan penulis uji. Tiga lapis:

1. istilahnya benar-benar ada di produk (kalau buktinya lenyap, uji berhenti
   menuntut situs menyebut fitur yang sudah tidak ada);
2. tiap fitur yang ada di produk disebut di daftar situs;
3. tiap butir daftar berupa kalimat, bukan potongan dua kata — di
   `featureList` JSON-LD, potongan menjadi klaim yang tak bisa ditafsirkan mesin.

Kegagalannya diverifikasi sungguhan: THR dihapus dari daftar, uji gagal
menyebut `Fase 43a: \bTHR\b`, lalu dipulihkan.

## Batas yang dijaga

Naskah e-Bupot tetap berbunyi **"bahan pengisian, bukan berkas impor resmi
DJP"** — di daftar fitur, di FAQ, dan di halaman modul. Menaikkannya menjadi
"impor langsung ke e-Bupot" akan mengulang persis cacat yang ditutup Fase 42b,
kali ini di halaman yang paling banyak dibaca.

Keterangan tangkapan layar di `pages/publik/teks.ts` **sengaja tidak disentuh**:
isinya menjelaskan apa yang terlihat di gambar, dan menambahkan THR ke
keterangan gambar yang tidak memuat THR akan menjadikannya keterangan palsu.

## Catatan kejujuran

Pencarian pertama saya memakai `grep -ril THR` dan melaporkan THR **sudah**
disebut di empat berkas. Itu keliru: `-i` membuatnya cocok dengan kata Inggris
seperti "through". Pencarian berbatas kata menunjukkan angka sebenarnya nol.
Nyaris saja saya melaporkan kepada pemilik bahwa sebagian pekerjaan sudah
selesai padahal belum satu pun.

Uji ini semula ditaruh di `packages/shared`, lalu gagal typecheck karena
`node:fs` tidak bertipe di sana. Membuat `shared` bergantung pada `db` demi
satu uji adalah perubahan arsitektur yang salah arah, jadi ujinya dipindahkan
ke `apps/api` — tempat pola pengecualian typecheck untuk uji pembaca berkas
memang sudah ada, dan tempat yang lebih tepat karena ia memeriksa migrasi dan
rute.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **1.117 lulus** (412 shared + 366 web + 339 api; naik dari 1.113)
- `pnpm build` — lulus
- `pnpm smoke` — **1.299 cek** (tetap; fase ini tidak menyentuh API)
- `node scripts/ui-sim.mjs` — **474/474** (tetap)
- `pnpm lint` — bersih
- `sapu-i18n` 53 (tetap), `sapu-warna` 0, `sapu-istilah` bersih,
  `sapu-gaya` bersih, `periksa-tautan-dokumen` bersih
