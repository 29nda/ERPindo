# Fase 21e — Form lead publik & pembanding tahun lalu

Dua baris 🟡 terakhir dari kelompok "janji yang sudah tertulis" ditutup.

## Roadmap menunjuk bukti yang keliru

Baris 281 berbunyi: *"form publik ada (`routes/demo.ts` → `demo_requests`),
tetapi belum masuk CRM leads"* — seolah tinggal menyambungkan dua hal yang
sudah ada.

`routes/demo.ts` adalah form **ERPindo sendiri**: calon pelanggan menghubungi
ERPindo, tersimpan di **control-plane** `env.DB`. Yang dijanjikan baris itu
("embed di landing/IG bio **Anda**") adalah form milik **tenant**, masuk ke
tabel `leads` **per-tenant**. Menyambungkan permintaan demo ERPindo ke CRM
tenant mana pun tidak masuk akal.

Ini jenis kesalahan roadmap yang **baru** dan paling meyakinkan: statusnya benar
(memang belum ada), tetapi **buktinya salah** — dan berkas yang disebutnya
sungguh-sungguh ada, jadi terbaca seperti sudah diperiksa. Kalau saya percaya
begitu saja, saya akan menyambungkan tabel yang salah ke modul yang salah.

## Yang dikerjakan

- `routes/leadForm.ts` — `POST /api/form/lead/:slug`, publik, dibatasi laju.
- Endpoint terbit/putar/matikan token di `routes/crm.ts` (khusus Pemilik).
- Kartu **Form lead publik** + cuplikan HTML siap salin di `pages/crm.tsx`.
- `salesLastYear`/`profitLastYear` di `ApiDashboard` + dua query
  `monthStart(-12)` di `routes/reports.ts`; delta "vs tahun lalu" di dasbor.

### Tenant diresolusi dari slug, bukan dari token

Token disimpan di `settings` milik DB **tenant**, sedangkan pertanyaan "token
ini punya siapa" harus dijawab **sebelum** DB tenant mana pun dibuka. Mencari
lewat token saja berarti memindai seluruh pool DB tiap kiriman. Slug sudah ada
di control-plane dan sudah dipakai `routes/auth.ts`.

### Tokennya bukan rahasia — dan memang tidak perlu

Ia tertanam di HTML halaman publik; siapa pun yang membuka "view source" bisa
membacanya. Tugasnya hanya memastikan pengirim memakai form yang pemiliknya
terbitkan, bukan menebak slug lalu menyiram CRM orang. Yang menahan
penyalahgunaan adalah batas laju per IP dan tombol putar-ulang.

Menyebutnya "kunci rahasia" akan membuat pemilik menaruh kepercayaan yang tidak
bisa ditopang bentuknya, jadi teks kartunya menyatakan hal ini apa adanya.

Token kosong dan token salah dijawab **403 yang identik**, supaya rute ini tidak
bisa dipakai memetakan tenant mana yang punya form aktif.

### Pengunjung tidak boleh mengisi nilai perkiraan

`leadFormSchema` sengaja lebih sempit daripada `leadSchema`: tidak ada
`estValue` maupun `source`. Nilai perkiraan yang datang dari orang luar akan
mengotori pipeline penjualan pemiliknya. Diuji: kiriman yang menyuntikkan
`estValue: 999.000.000` tetap tersimpan sebagai 0.

## Dua cacat produk yang ketahuan saat menguji

**Batas laju 5/10 menit terlalu ketat.** Ketahuan karena cek smoke saya sendiri
kehabisan jatah di kiriman keenam. Yang penting bukan ceknya: middleware
menghitung **setiap** permintaan termasuk yang gagal validasi, jadi pengunjung
yang salah ketik email lima kali langsung terkunci sepuluh menit. Dinaikkan ke
20/10 menit — masih 120/jam, tetapi memaafkan salah ketik dan kantor ber-IP
sama. Batasnya tetap diuji sampai benar-benar 429.

**Pembanding tahun lalu tak pernah terlihat.** `pctDelta` mengembalikan `null`
bila pembaginya 0, dan perusahaan demo hanya punya riwayat ±60 hari — jadi
fiturnya tak muncul justru di layar yang dilihat setiap calon pelanggan. Bukan
bug perhitungan: persentase dari nol memang tidak bermakna, dan menampilkan
"∞%" akan mengulang kesalahan yang dihindari di Fase 21b. Yang diperbaiki
datanya: satu faktur **jasa** setahun lalu di seed — sengaja jasa, supaya
persediaan & HPP bulan berjalan tidak ikut tergeser.

Keterbatasannya nyata dan ditulis di roadmap: perusahaan yang belum genap
setahun tidak akan melihat delta ini.

## Temuan pemeriksaan mata: blind spot kelima penyapu

Mode Inggris pada halaman Pipeline masih menyisakan Indonesia — semuanya
berbentuk **teks yang dirangkai dengan angka**:

- `"3 lead terbuka"`, `"0 aktivitas"`, toast `"Lead ditambahkan."`;
- placeholder di dalam cuplikan form (`Nama`, `No. HP`, `Kirim`) — pemilik
  ber-antarmuka Inggris menempelkan form berbahasa Indonesia ke landing
  page-nya sendiri.

Bentuk ini lolos penyapu **dan** lolos asersi "tanpa teks Indonesia" yang
mencari kalimat utuh, karena potongannya baru menjadi kalimat saat dirender.
Blind spot kelima pada penyapu yang sama, setelah `label="Kode"` (Fase 19), glob
subfolder (20m), nilai bawaan parameter (21b), dan isi `<option>` (21c).

### Penyapunya justru harus DIPERSEMPIT, bukan diperlebar

Memperbaiki placeholder jadi `placeholder="${u("phFormNama")}"` malah menaikkan
utang atribut dari 0 ke 4: polanya melihat `${u(` sebagai teks tampilan. Artinya
memperbaiki sesuatu membuat penanda kemajuannya memburuk — dan penyapu yang
menghukum perbaikan berhenti berguna.

Ditambahkan pengecualian: nilai atribut yang **diawali `${`** sudah lewat kamus.
Dibuktikan tidak membutakan penyapu — dengan `placeholder="Nama Lengkap"`
disisipkan sementara, utangnya naik ke 1 lagi.

## Penjaga RBAC menangkap rute publik saya

`rbac-guard.test.ts` gagal: `leadForm.ts POST "/lead/:slug"` tanpa
`requireAuth`. Itu memang disengaja — rutenya publik — jadi ia dimasukkan ke
daftar putih **beserta alasannya**: yang menggantikan sesi adalah slug + token
yang harus cocok dan batas laju per IP, dan rute itu hanya bisa menyisipkan satu
baris lead, tidak membaca maupun mengubah data tenant lain.

Perlu dicatat jujur: saya hanya menjalankan `typecheck` selama menulis fiturnya,
dan baru menjalankan `pnpm test` di sapuan gerbang penuh. Penjaga itu bekerja,
tetapi ia menangkapnya belakangan karena saya menundanya.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **343** (tetap) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **969** (dari 955) |
| `node scripts/ui-sim.mjs` | 0 | **296** (dari 292) |
| `sapu-i18n` (pola dipersempit) | 0 | utang atribut kembali **0** |

Empat belas cek smoke baru (blok `13i2`), empat cek ui-sim (`F36a`–`F36d`).

**Keempat cek ui-sim dibuktikan bisa gagal**, semuanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| slug pada cuplikan dipalsukan `undefined` | `F36a` |
| token diganti placeholder | `F36b` (`false`) |
| `deltaYoY` dilepas dari kartu KPI | `F36c` (`0 elemen`) |
| kunci EN `leadTerbukaSuffix` disamakan dengan ID | `F36d` (`halaman=false`) |

**Pemeriksaan mata** lewat `UI_SIM_SHOT`, mode Indonesia **dan** Inggris — dari
situlah seluruh temuan i18n di atas berasal. Blok tangkapan sementara sudah
dihapus.
