# Fase 52a — bahan yang hilang ketika produksi ditolak

Lanjutan audit ke modul yang belum tersentuh: POS, manufaktur, konsolidasi.

## POS: bersih

Ditelusuri lebih dulu karena paling sering dipakai di bisnis nyata. Seluruh
jalurnya berpenjaga: shift ganda ditolak, penjualan menuntut shift terbuka,
refund menuntut shift milik SENDIRI yang terbuka, struk harus struk POS dan
belum dibatalkan, qty ≤ sisa yang bisa di-refund, dan tutup buku diperiksa di
awal tiap jalur.

Dicatat apa adanya supaya tidak ditelusuri ulang.

## Manufaktur: bahan menguap saat produksi ditolak

`POST /production-orders/:id/complete` mengonsumsi bahan satu per satu di dalam
`try`, dengan komentar berbunyi **"Bila stok kurang, batalkan"**. Tidak ada yang
dibatalkan — `catch`-nya hanya membalas 400.

Jadi bila bahan ke-1 cukup dan bahan ke-2 kurang, bahan ke-1 sudah TERLANJUR
keluar beserta baris `stock_movements`-nya, sementara barang jadinya tidak
pernah masuk.

### Kenapa senyap, dan kenapa berlipat

1. Persediaan berkurang tanpa barang jadi sebagai gantinya.
2. Status perintah produksi tetap `draft`, jadi pengguna **wajar** mencoba lagi
   setelah menambah stok — dan percobaan kedua mengurangi bahan ke-1 lagi.
3. Jalur gagal ini tidak membuat jurnal apa pun, sehingga neraca saldo tetap
   seimbang. `stock_levels` turun sementara buku besar Persediaan diam.

Poin ketiga persis kelas cacat yang sudah diperingatkan komentar jurnal
penyerapan di berkas yang sama ("dua angka berpisah diam-diam"), hanya lewat
pintu yang berbeda — dan pintu itu tidak dijaga.

### Kenapa gerbang yang ada tidak melihatnya

Smoke sudah punya cek "produksi melebihi stok bahan DITOLAK 400". Ia lulus,
karena yang diperiksa **hanya statusnya**. Stok sesudahnya tidak pernah dilihat.

Lebih halus lagi: pada BoM yang dipakai cek itu, bahan yang kurang justru yang
diproses lebih dulu (`loadBom` mengurutkan `ORDER BY p.name`), sehingga tidak
ada bahan yang sempat keluar. Ceknya hijau karena skenarionya kebetulan tidak
memicu cacatnya.

## Perbaikan

**Semua bahan diperiksa dulu, baru dikonsumsi.** Kebutuhan diagregasi per
komponen (BoM boleh menyebut satu komponen lebih dari sekali — yang menentukan
cukup-tidaknya adalah totalnya), lalu dicocokkan dengan `stock_levels`. Bila
ada yang kurang, jawabannya 400 dengan menyebut bahan MANA dan berapa
kurangnya, tanpa menyentuh persediaan sama sekali.

Pembatalan tetap disediakan untuk sisa yang tidak bisa dicegah: dua penyelesaian
produksi bersamaan atas bahan yang sama bisa lolos pemeriksaan lalu salah
satunya kalah di `stockOut` (yang memang atomik sejak Fase 29a). Di situ bahan
yang sudah keluar dikembalikan **pada biaya yang sama persis saat ia keluar**,
sehingga nilai persediaan pulih utuh.

## Cek baru, dan skenario yang sengaja disusun

Tiga cek smoke. Yang menentukan bukan ketiganya melainkan skenarionya: BoM baru
menyebut "Paku" (stok berlimpah) dan "Zat Perekat" (stok tipis). Karena urutan
`ORDER BY p.name`, Paku diproses lebih dulu dan **berhasil**, lalu Zat Perekat
gagal — bentuk yang benar-benar memicu konsumsi sebagian. Memakai BoM yang sudah
ada tidak akan membuktikan apa pun.

Uji negatif memberi angkanya:

```
✗ 52a stok bahan UTUH setelah produksi ditolak → paku 60→58, zat 2→2
```

Dua paku hilang permanen dari produksi yang ditolak. Cek ketiga tetap hijau di
kode lama, justru karena pengulangannya berhasil sambil mengurangi paku untuk
kedua kalinya — persis pelipatan yang dijelaskan di atas.

## Fase 52b — konsolidasi runtuh karena perusahaan yang belum membayar

Modul terakhir yang belum tersentuh. Otorisasinya **bersih**: `ownedTenants`
menyaring ketat ke `m.role = 'owner'` milik pengguna itu sendiri, dan filter
`?companies=` menyaring DARI daftar yang dimiliki — bukan mengambil berdasarkan
id, arah yang aman.

Yang tidak dijaga adalah `db_ref`. Perusahaan yang sudah didaftarkan tetapi
belum membayar sengaja tidak punya database (`TANPA_DB`). Ia tetap terpilih,
lalu `getTenantDb(env, "")` melempar — dan yang runtuh bukan satu barisnya,
melainkan **seluruh laporan konsolidasi**:

```
✗ konsolidasi dengan perusahaan tanpa database → 500 {"error":"Terjadi kesalahan pada server."}
✗ neraca konsolidasi juga tidak runtuh       → 500 {"error":"Terjadi kesalahan pada server."}
✗ pemilih perusahaan                          → menawarkan "PT Belum Bayar" yang pasti kosong
```

**Bukan kasus tepi.** Justru begitulah keadaan tepat setelah pemilik
mendaftarkan perusahaan keduanya — hal yang persis diundang oleh fitur
konsolidasi itu sendiri.

### Kemunculan ketiga dari kelas yang sama

Fase 50e menemukan tenant tanpa database diperlakukan sebagai tenant biasa oleh
cron migrasi dan kartu kapasitas. Ini tempat ketiganya. Perbaikannya sama —
`AND t.db_ref <> ''` — dan karena `ownedTenants` dipakai ketiga endpoint,
satu syarat itu sekaligus membereskan laporan laba rugi, neraca, dan pemilih
perusahaan.

Perusahaan tanpa database memang tidak punya buku untuk dikonsolidasikan, jadi
menyaringnya juga membuat pemilih berhenti menawarkan perusahaan yang pasti
kosong.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` | lulus | ✅ lulus |
| `pnpm test` (unit) | 1.144 | ✅ 1.144 |
| `pnpm build` | lulus | ✅ lulus |
| `pnpm smoke` | 1.304 | ✅ **1.310** (+6) |
| `node scripts/ui-sim.mjs` | 480 | ✅ 480 |
| `pnpm lint` | bersih | ✅ bersih |
| `sapu-warna` · `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |
| `periksa-tautan-dokumen` | lulus | ✅ lulus |

Total pemeriksaan: **2.934**.

## Cakupan audit

Ketiga modul yang tersisa — POS, manufaktur, konsolidasi — kini sudah
ditelusuri. POS bersih; dua lainnya masing-masing menyimpan satu cacat.
