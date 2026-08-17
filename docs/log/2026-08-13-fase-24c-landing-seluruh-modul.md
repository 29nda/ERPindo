# Fase 24c — halaman jualan menyebut seluruh modul, dan berhenti menjanjikan trial

Permintaan pemilik: landing harus menjelaskan **seluruh** kemampuan aplikasi,
tanpa ada yang terlewat.

Sejak trial dihapus (Fase 24a), tuntutan itu berubah sifat. Dulu calon pelanggan
bisa menemukan modul yang tidak tertulis dengan mencobanya sendiri selama 30
hari. Sekarang tidak bisa — **yang tidak tertulis di halaman jualan praktis
tidak ada baginya.**

## Cakupan sebenarnya sebelum fase ini

Halaman `/fitur` memuat **9 modul**. `docs/03-roadmap-lanjutan.md` mendaftar
**23 modul bernomor**, dua di antaranya internal (Platform & Infrastruktur,
Monetisasi) — jadi ±21 yang layak dijual, dan **12 di antaranya tidak pernah
disebut sama sekali**: Dasbor, Pembelian & Pengadaan, Persetujuan Berjenjang,
Kas & Bank, Aset Tetap, CRM, Anggaran, Proyek, Kontrak Berulang, Manufaktur &
QC, Pemeliharaan Aset, Helpdesk, Asisten AI.

Daftar disusun **terhadap roadmap sebagai daftar periksa**, bukan dari ingatan —
persis alasan aturan penandaan Fase 21a dibuat.

## Yang dikerjakan

**`MODUL_DETAIL` 9 → 22 entri.** Tiap entri mengikuti bentuk yang sudah ada:
masalah yang dirasakan → cara aplikasi mengerjakannya → hasil yang didapat.
Bukan daftar kemampuan, karena daftar kemampuan tidak menjawab "buat saya apa".
Semuanya dwibahasa.

**Tangkapan layar dibuat opsional.** Dua modul (Kas & Bank, Asisten AI) belum
punya tangkapan layarnya sendiri. Meminjam milik modul lain akan menampilkan
layar yang bukan miliknya — memberi kesan keliru tentang apa yang akan dilihat
pembeli. Keduanya karena itu dirender **tanpa gambar**, dan `gambar` menjadi
opsional di tipenya.

**Versi perayap disamakan.** `noscriptFitur` di `apps/api/src/routes/landingSeo.ts`
memuat daftarnya sendiri (`MODUL_RINGKAS`) yang juga berhenti di 9 — jadi mesin
pencari melihat produk yang jauh lebih kecil daripada kenyataannya. Ikut
diperluas ke 22; keduanya kini wajib dirawat bersama dan itu ditulis di
komentarnya.

## Janji trial yang masih tertinggal — tiga tempat

Fase 24a membersihkan teks jualan yang terlihat, tetapi **tiga janji trial masih
hidup di tempat yang tidak terlihat mata**:

| Tempat | Isi | Akibat bila dibiarkan |
| --- | --- | --- |
| JSON-LD `description` | "Gratis 30 hari." | Google menampilkan janji yang tidak ada |
| FAQ terstruktur | "Ya, 30 hari gratis… tanpa kartu kredit." | sama, dan ini justru pertanyaan yang paling sering dibaca |
| `lib/guideKnowledge.ts` | "Trial 30 hari semua fitur tanpa kartu kredit." | **Asisten AI memberitahu pengguna soal trial yang sudah dihapus** |

Yang ketiga paling merepotkan: ia bukan teks statis melainkan bahan yang dipakai
Asisten AI menjawab. Aplikasi akan menjanjikan sesuatu yang tidak bisa
ditepatinya sendiri, kepada orang yang sedang bertanya langsung. Ketiganya
diganti dengan ajakan ke demo 6 bulan.

Ajakan `noscript` juga dibalik mengikuti keputusan Fase 24a: **demo lebih dulu**,
daftar & berlangganan menyusul.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **470** |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1085** |
| `node scripts/ui-sim.mjs` | 0 | **336/336** |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

Smoke memeriksa `noscript` `/fitur` berisi modul dan bukan salinan landing —
cek itu tetap hijau setelah daftarnya diperluas tiga kali lipat.

Jumlah cek **tidak bertambah** di fase ini, dan itu disengaja: yang berubah
adalah isi teks jualan, bukan perilaku. Menambah cek yang mengunci kalimat
pemasaran justru membuat setiap penyuntingan teks menjadi kerja dua kali tanpa
menjaga apa pun yang bisa rusak diam-diam.

## Yang TIDAK dikerjakan, dinyatakan apa adanya

- **Kas & Bank dan Asisten AI belum punya tangkapan layar.** Pipeline
  screenshot (`scripts/`) bisa membuatnya, tetapi itu pekerjaan tersendiri.
- **Halaman depan (`/`) tidak ditulis ulang** — hanya CTA dan janji trialnya yang
  disesuaikan pada 24a. Seksi showcase-nya masih memakai 5 alur yang sama.
- **Demo produksi masih ±2 bulan** sampai pemilik memasang secret `SEED_EMAIL`/
  `SEED_PASSWORD` dan memicu workflow `Seed demo` (runbook §7). Sampai itu
  terjadi, halaman ini menjanjikan "6 bulan data nyata" yang belum ditepati
  produksi — dan itulah satu-satunya klaim di halaman ini yang saat ini belum
  benar.
