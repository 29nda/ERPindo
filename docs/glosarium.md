# Glosarium naskah ERPindo

Sumber tunggal untuk istilah yang tampil di layar, dokumen cetak, pesan galat,
dan email. **Dijaga otomatis** oleh `scripts/sapu-istilah.mjs`.

Lahir dari `panduan-gaya-naskah` (Fase 33): 26 istilah Inggris punya ≥2 padanan
Indonesia dan 14 istilah Indonesia punya ≥2 padanan Inggris — dua di antaranya
berbahaya karena artinya benar-benar berbeda.

> **Aturan pemakaian.** Kolom "Jangan pakai" bukan larangan mutlak untuk seluruh
> repo — hanya untuk **string yang dilihat manusia**. Nama field API, nilai enum,
> dan nama akun di `packages/db` punya alasannya sendiri; lihat §4.

---

## 1. Empat keputusan yang mengikat

Diambil dari usulan panduan gaya. Semuanya **bisa dibalik** — yang tidak bisa
dibalik adalah data yang telanjur rusak karena tombolnya ambigu.

### (a) "Batal" bukan "Batalkan"

| Kunci | Indonesia | Inggris | Artinya |
|---|---|---|---|
| `batal` | **Batal** | Cancel | Tutup dialog. Tidak ada yang berubah. |
| `batalkan` | **Batalkan dokumen** | Void | Buat jurnal pembalik. **Permanen, tercatat di audit.** |
| `batalkanPesanan` | **Batalkan pesanan** | Cancel order | Batalkan pesanan yang belum diproses. |

Sebelumnya ketiganya berbunyi "Batal"/"Batalkan" di sisi Indonesia, sementara
sisi Inggris membedakannya. Tombol "tidak jadi" berdiri bersebelahan dengan
tombol yang membuat jurnal pembalik permanen. **Ini kelas kesalahan yang
menghasilkan data rusak, bukan sekadar kebingungan.**

### (b) "Jumlah" tidak boleh berarti dua hal

| Konsep | Dipakai | Jangan |
|---|---|---|
| Banyaknya barang | **Qty** | Jumlah |
| Nilai rupiah | **Jumlah (Rp)** | Nominal *(untuk kolom tabel)* |

Di baris faktur, kolom "Jumlah" bisa berarti 12 (dus) atau 1.200.000 (rupiah)
tergantung halaman.

### (c) Kapitalisasi

- **Sentence case** — tombol, label form, header kolom, empty state, toast.
- **Title Case** — judul halaman dan nama modul saja.
- Nama resmi apa adanya: PPN, PPh 21, BPJS, e-Faktur, Coretax, NPWP, QRIS.

### (d) Merek ditulis **ERPindo**

Satu bentuk di mana pun manusia membacanya: `<title>`, OG tag, kop dokumen
cetak, slip gaji, email, nama Asisten, dan asersi ui-sim.

**Pengecualian — pengenal teknis, biarkan huruf kecil:** `@erpindo/*`,
`erpindo-lang`, `erpindo-tenant`, `erpindo-theme`, `erpindo-nav-collapsed`,
`erpindo-tour:*`, `erpindo-ai-draft`, `erpindo-wizard-done`,
`erpindo-simple-mode`, cookie `erpindo_sid` & `erpindo_goauth`, domain
`erpindo.id`, berkas `logo-erpindo.png`, nama berkas unduhan
(`erpindo-export-…zip`, `erpindo-backup-…zip`, `erpindo-audit-…csv`),
nama paket npm, dan kunci `localStorage`.

Dua di antaranya **nilai kontrak API**, bukan naskah, dan karena itu ikut
dibiarkan: `service: "erpindo"` pada `GET /api/health` dan `app: "erpindo"`
pada manifes ekspor ZIP. Keduanya dibaca mesin; mengubahnya memecah integrasi
tanpa satu pun pengguna melihat bedanya.

---

## 2. Satu Inggris → satu Indonesia

Sebelumnya bercabang dua. Yang dipilih ditebalkan.

| Inggris | Pakai | Jangan |
|---|---|---|
| Amount | **Jumlah** | Nominal |
| Amount (Rp) | **Jumlah (Rp)** | Nominal (Rp) |
| Qty | **Qty** | Jumlah |
| Paid | **Lunas** | Sudah dibayar |
| Pay | **Bayar** | Setor |
| Payment date | **Tanggal bayar** | Tanggal setor |
| Payroll | **Penggajian** | Gaji *(sebagai nama modul)* |
| Period | **Periode** | Masa *(kecuali "masa pajak", istilah resmi)* |
| Overdue invoices | **Faktur lewat jatuh tempo** | Faktur jatuh tempo *(artinya beda — belum tentu lewat)* |
| Awaiting payment | **Menunggu pembayaran** | Menunggu bayar |
| Counterparty | **Lawan transaksi** | Rekanan |
| Overview | **Ringkasan** | Ikhtisar |
| Actual | **Realisasi** | Aktual |
| Active | **Aktif** | Berjalan |
| Rate (mata uang) | **Kurs** | Tarif |
| Rate (pajak) | **Tarif** | Kurs |
| Number | **Nomor** | Angka *(untuk nomor dokumen)* |
| Type | **Jenis** | Tipe |
| Phone | **No. HP** | Telepon |
| Record (kata kerja) | **Catat** | — |
| Record (kata benda) | **Catatan** | — |
| Variance | **Selisih** | Varian |
| Unassigned | **Belum ditugaskan** | Tanpa PJ |
| days | **hari** | hari terakhir |
| to (rentang) | **s.d.** | ke |

## 3. Satu Indonesia → satu Inggris

| Indonesia | Pakai | Jangan |
|---|---|---|
| Laba Rugi | **Income Statement** | Profit & Loss |
| Penawaran | **Quotation** | Proposal |
| Setor | **Deposit** | Pay *(sudah dipakai "Bayar")* |
| Kewajiban | **Liabilities** | Obligation |
| Baris | **Line** | Row |
| Diterima | **Received** | Accepted |
| Kedaluwarsa | **Expiry** | Expired |
| Harga | **Price** | Pricing |
| Selesai | **Done** | End |
| D/K | **Dr/Cr** | D,C |

## 4. Kata Inggris yang tidak boleh muncul di kalimat Indonesia

| Jangan | Pakai |
|---|---|
| lead | calon pelanggan |
| refund | pengembalian dana |
| cost center | pos biaya |
| work order | perintah kerja |
| work center | stasiun kerja |
| routing | urutan kerja |
| field kustom | kolom tambahan |
| funnel | tahapan |
| widget | kartu |
| backup | cadangan |
| template | format · contoh berkas |
| reset | atur ulang |
| token | kode |
| Putar Ulang Token | Buat Kode Baru |
| Cron | dijadwalkan otomatis |
| multi-tender | bayar campuran |
| dashboard | dasbor |
| void | batalkan dokumen |
| payload · scope | *(istilah sistem — jangan sampai ke layar pengguna)* |

**Tetap dipakai** — nama resmi yang justru membangun kepercayaan:
PPN · PPh 21 · TER · BPJS · e-Faktur · Coretax · DJP · QRIS · NPWP ·
PMK 131/2024 · PP 55/2022 · SKU · FEFO · BoM · SPT · Qty.

## 5. Ejaan

| Baku (KBBI) | Tidak baku |
|---|---|
| **utang** | hutang |

**Ranjau — nama akun ada di dalam data tiap tenant.**
`packages/db/src/migrations.ts` menyemai **"Hutang Usaha"** & **"Hutang Gaji"**,
dan `apps/api/src/routes/tax.ts` membuat **"Hutang PPh 23"** saat dibutuhkan.
Mengganti benih itu saja hanya memengaruhi perusahaan **baru**: pelanggan lama
tetap memegang nama lama, jadi hasilnya terbelah. Itu **migrasi data**, bukan
perbaikan naskah.

Diperiksa di Fase 33b: **tidak ada satu pun kode yang mencari akun berdasarkan
nama** — seluruhnya lewat kode akun (`accountIdByCode`, `ensureAccountByCode`).
Jadi namanya murni teks tampilan, dan migrasi append-only yang menyeragamkannya
untuk tenant lama sekaligus baru memang bisa dibuat.

**Selesai di Fase 33d.** Migrasi `0047_nama_akun_utang` menyeragamkan
"Hutang Usaha" → "Utang Usaha", "Hutang Gaji" → "Utang Gaji", dan
"Hutang PPh 23" → "Utang PPh 23" untuk tenant **lama dan baru sekaligus**.
`COA_SEED` di migrasi 0002 sengaja **tidak** disunting: mengubah entri lama
melanggar aturan append-only berkas itu, dan hanya akan mengubah perusahaan
baru. Tenant baru menempuh 0002 lalu 0047; tenant lama menempuh 0047 saja;
keduanya berakhir sama.

Syarat `AND name = '<nama lama persis>'` melindungi pengguna yang sudah
mengganti nama akunnya sendiri — ejaan tidak boleh menimpa penamaan yang
sengaja dipilih.

Yang tetap tidak berubah: nama field API dan nilai enum (`selisihHutang`,
`sumber: "hutang"`).

Alasannya berbeda dari nama akun: keduanya **dibaca mesin**. Menggantinya
memecah respons API dan smoke sekaligus tanpa satu pun pengguna melihat
bedanya.

## 5b. Istilah yang sudah seragam — jangan diubah lagi

| Dipakai | Jangan | Catatan |
|---|---|---|
| **UMKM** | UKM | 34 kemunculan di naskah vs 0 — `UKM` hanya tersisa di komentar kode, dan itu tidak dilihat pengguna. |
| **karyawan** | pegawai | Slip gaji dan ringkasan 1721-A1 diterima orang yang sama; dua nama untuk kolom yang sama membuatnya berhenti memastikan itu dirinya. "Pegawai" hanya dipakai bila mengutip formulir DJP kata per kata. |
| **Gaji bersih (dibawa pulang)** | Gaji dibawa pulang (netto) | Pasangannya "Penghasilan bruto" di baris atasnya — bruto/bersih sejajar, "dibawa pulang" tetap ada sebagai penjelas. |

## 7. Subjek email

Selalu diawali **`ERPindo — `**. Penerima yang membaca "Langganan PT Maju telah
berakhir" di kotak masuknya tidak punya petunjuk siapa pengirimnya, dan email
tanpa pengirim yang dikenali adalah email yang tidak dibuka.

## 5c. Ragam: baku, bukan percakapan

Keputusan pemilik (Fase 34a): yang diminta **tata bahasa yang benar**, bukan
sekadar bahasa yang mudah dipahami. Keduanya bukan hal yang sama — naskah bisa
jernih sekaligus salah ragam.

| Pakai | Jangan |
|---|---|
| hanya | cuma |
| mudah | gampang |
| terlambat | telat |
| membuat | bikin |
| seperti | kayak |
| jika *(dalam kalimat berita)* | kalau |
| ponsel | HP |
| berkas | file |
| basis data | database |
| kata sandi | password *(kecuali label teknis)* |
| daring | online |
| dompet elektronik | e-wallet |

**Verba deskriptif memakai awalannya.** "Kasir tetap **berjalan**", bukan
"tetap jalan". "Slip gaji langsung **terbentuk**", bukan "langsung jadi".
Kalimat perintah pada tombol tetap tanpa awalan — "Simpan", "Tambah produk" —
dan itu memang bentuk yang benar.

**Dua klausa berpredikat tidak dipisah koma saja.** "Internet mati, penjualan
tetap tercatat" → "**Saat** internet mati, penjualan tetap tercatat."

**Kalimat tidak dimulai tanpa subjek.** "Tersimpan sendiri begitu koneksi
kembali" → "**Datanya** tersimpan sendiri begitu koneksi kembali."

**`bisa` TIDAK dilarang.** Ia baku menurut KBBI, hanya lebih santai daripada
`dapat`. Memaksanya di 78 tempat adalah churn tanpa nilai. Yang dipakai di
naskah penjualan dan keamanan: `dapat`.

## 6. Rupiah

Satu sumber: `formatRupiah()` di `packages/shared/src/text.ts`. Menghasilkan
`Rp 750.000` — dengan spasi BIASA, pemisah ribuan titik.

> **Fase 38p:** pernyataan "satu sumber" di atas sempat **tidak benar** selama
> beberapa fase. Fungsinya hidup di `pages/landing/sections.ts`, dan di
> sebelahnya ada fungsi kedua — `formatIDR()` di `api/client.ts` dengan 30
> pemakai — yang memakai `Intl` dan karena itu menyisipkan **spasi tak-putus**
> setelah "Rp". Selisih satu karakter tak terlihat itu memaksa asersi ui-sim
> menormalkan teksnya sebelum mencocokkan. Keduanya kini satu fungsi di
> `packages/shared`; `formatIDR` dipertahankan sebagai nama lama yang
> meneruskan ke sana.

Jangan menulis `Rp750.000` atau `Rp 750000` langsung di naskah. Placeholder
angka juga memakai pemisah ribuan: `mis. 5.000.000`, bukan `mis. 5000000`.

**Harga paket sama sekali tidak boleh dieja** (Fase 53a), sekalipun ejaannya
benar. Ia dibaca dari `PLAN_LIMITS` lalu disisipkan — lewat template literal
di `packages/shared`, atau lubang `{0}` + `isi()` di kamus web. Naskah yang
mengeja harganya sendiri akan menyimpang dari harga yang benar-benar ditagih,
dan tidak ada gerbang lain yang bisa melihatnya: halaman menjanjikan satu
angka, checkout menagih angka lain, dan typecheck tetap hijau karena string
apa pun sah. Dijaga aturan `harga-paket-literal` di `scripts/sapu-istilah.mjs`.

## 8. Register perusahaan (Fase 38p)

Pembacanya profesional yang sudah menjalankan perusahaan. Aturan di bawah
adalah konsekuensi dari itu, bukan selera.

### 8a. Sebutan pembaca

| Jangan | Pakai |
| --- | --- |
| UMKM (sebagai posisi produk) | perusahaan, badan usaha, bisnis yang sedang tumbuh |
| pemilik usaha, pemilik toko | manajer keuangan, direktur, tim keuangan |
| usaha Anda | perusahaan Anda |

"UMKM" tetap dipakai pada **nama resmi** yang memang berbunyi begitu — "PPh
Final UMKM 0,5% (PP 55/2022)" — dan hanya di situ.

### 8b. Tidak menggurui

Pembaca tidak perlu diberi tahu bahwa cara kerjanya salah, dan tidak perlu
diyakinkan bahwa pembukuan itu penting. Yang dilarang:

- **"Anda harus…"**, **"jangan lupa…"**, **"perlu diingat…"** — ia menempatkan
  penulis di atas pembaca.
- **"tenang saja"**, **"gampang kok"** — meremehkan pekerjaan yang justru
  sedang dinilai pembaca.
- **"seperti diketahui"** — bila memang diketahui, tidak perlu ditulis.

Yang menggantikannya: menyatakan apa yang produk lakukan, lalu berhenti.

### 8c. Klaim wajib bisa ditunjuk barisnya

Aturan keras dari `docs/posisi-produk.md` §3, kini **dipaksa** oleh kelas
`klaim-tanpa-bukti` di `scripts/sapu-gaya.mjs` dengan ambang **nol**.

Yang dilarang adalah kata sifat yang tidak punya cara untuk salah: *terbaik*,
*canggih*, *revolusioner*, *paling lengkap*, *seamless*, *world-class*.

Yang **tidak** dilarang: klaim faktual yang bisa diperiksa — "termurah",
"pengguna tak terbatas", "68% proyek ERP gagal". Klaim faktual boleh salah, dan
itu justru yang membuatnya klaim.

### 8d. Nada saat menyebut pesaing

Nama pesaing **tidak disebut**. Harga vendor berubah tanpa pemberitahuan, dan
angka basi tentang pihak lain merugikan yang menuliskannya. Yang dipakai:
rentang kategori beserta sumbernya, dan kalkulator yang menghitung dari angka
yang dimasukkan pengunjung sendiri.
