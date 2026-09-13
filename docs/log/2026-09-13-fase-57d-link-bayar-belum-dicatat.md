# Fase 57d — pelanggan sudah bayar, tagihannya tetap jalan

## Yang ditutup

Webhook Xendit untuk **link pembayaran faktur** melakukan tepat dua hal:

```ts
UPDATE payment_links SET status = 'paid', paid_at = ? WHERE id = ? AND status != 'paid'
INSERT INTO audit_logs (… 'collection.paid' …)
```

Dan tidak ada lagi. Tidak ada baris pembayaran, tidak ada jurnal,
`invoices.paid_amount` tidak bergerak. Disapu seluruh repo: **tidak satu pun
pembaca `payment_links.status` yang mengubah keadaan itu** — `collections.ts`
hanya membacanya untuk ditampilkan, dan cron tidak menyentuh tabel itu sama
sekali.

Akibatnya bagi pemakai: pelanggan membayar, uangnya sampai di akun Xendit
merchant, dan fakturnya di ERPindo **tetap menunggak**. Ia terus muncul di kartu
"Faktur lewat jatuh tempo", dan **pengingatnya terus berjalan ke orang yang
sudah membayar**.

### Dokumen pemiliknya ikut salah

`docs/STATUS.md` — dokumen yang dibaca pemilik — menuliskan sejak Fase 11d:

> pembayaran online terkonfirmasi otomatis (webhook)

Konfirmasinya memang otomatis. **Pencatatannya tidak pernah ada.** Kalimat itu
membuat orang berhenti memeriksa, dan itu yang membuatnya lebih berbahaya
daripada fiturnya yang absen.

Kontras yang paling terang ada di berkas yang sama: cabang **langganan** tepat
di sebelahnya melakukan semuanya dengan benar — compare-and-set untuk webhook
ganda, invarian jumlah bayar, penanganan prorata. Cabang **link pelanggan**
tidak.

## Yang dikerjakan — dan yang sengaja TIDAK

### Celahnya dibuat berbunyi

Jenis notifikasi baru `tagihan_link_dibayar`: tiap faktur yang linknya sudah
lunas tetapi bukunya belum mencatat muncul di lonceng, dengan jumlah dan
tanggal terimanya.

Yang dilaporkan **hanya** yang benar-benar belum tercatat
(`total > paid_amount + returned_amount`). Melaporkan semua link lunas akan
membuat penanda ini menetap selamanya sesudah pemilik mencatatnya — dan penanda
yang tidak pernah hilang berhenti dibaca orang.

Korelasinya lintas-database (`payment_links` di control-plane, `invoices` di DB
tenant), jadi dua kueri, bukan satu join.

### Klaimnya diperbaiki

`docs/STATUS.md` kini menyatakan pencatatannya masih manual, dan menyebutkan
kedua keputusan yang menahannya.

### Pencatatan otomatis TIDAK dipasang, dan itu keputusan sadar

Mengotomatiskannya menuntut dua keputusan **akuntansi**, bukan keputusan
program — dan `payment_links` tidak punya kolom untuk keduanya:

1. **Akun mana yang menerima.** Uangnya belum di rekening bank; ia ada di saldo
   Xendit sampai dicairkan. Membukukannya langsung sebagai kas bank membuat
   rekonsiliasi bank tidak pernah cocok.
2. **Bagaimana biaya Xendit dibukukan.** Yang diterima merchant adalah jumlah
   **bersih**. Mencatat bruto ke kas melebihkan saldo sebesar biaya itu, tiap
   transaksi.

Menebak salah satunya berarti menulis jurnal yang salah pada setiap pembayaran.
Menaruh angka yang salah ke dalam buku besar lebih buruk daripada tidak
menaruhnya sama sekali — yang kedua terlihat, yang pertama tidak.

Uji ini memasang **penjaga kambuh terbalik**: kalau suatu hari ada yang
menambahkan posting otomatis di webhook itu, ujinya gagal — memaksa keputusan
akuntansinya dituliskan lebih dulu, bukan diselundupkan lewat satu commit.

## Validasi

| Gerbang | Hasil |
|---|---|
| `pnpm typecheck` | lulus |
| `pnpm test` | 1.407 unit test (+8) |
| `pnpm build` | lulus |
| `pnpm smoke` | 1.372 cek |
| `node scripts/ui-sim.mjs` | 508 cek |
| `pnpm lint` | lulus |
| `sapu-i18n` | 0 (ambang 0) |
| `sapu-warna` | 0 / 0 |
| `sapu-istilah` | 0 pelanggaran |
| `sapu-gaya` | 0 (ambang 0) |
| `periksa-tautan-dokumen` | semua hidup |

Delapan uji baru. Dibuktikan bisa merah dengan dua sabotase: notifikasinya
dicabut → satu uji memerah; klaim lama di `STATUS.md` dikembalikan → dua uji
memerah.

Gerbang exhaustiveness dari Fase 56c bekerja persis seperti maksudnya: begitu
jenis notifikasi baru ditambahkan ke union-nya, `tsc` langsung menolak
dikompilasi di dua cabang penyusun kalimat yang belum ditulis. Tidak perlu ada
yang mengingat.

## Yang menunggu keputusan pemilik

Begitu kedua pertanyaan akuntansi di atas dijawab, pencatatan otomatis bisa
dipasang dan notifikasi ini tidak akan pernah muncul lagi. Usulan bentuknya:
akun kliring "Saldo Xendit" menerima bruto saat webhook, biaya diakui sebagai
beban, dan pencairan ke bank dicatat terpisah saat dana benar-benar masuk.
Tetapi itu usulan — bukan sesuatu yang boleh dipilihkan program untuk buku
orang lain.
