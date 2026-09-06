# Fase 54g — audit ketahanan saat gagal

Bagian 8 dari sepuluh bagian audit.

## Pertanyaannya

Bukan "apakah kodenya benar" — tujuh bagian sebelumnya sudah menanyakan itu.
Bagian ini menanyakan: **apa yang tersisa ketika sesuatu gagal di tengah?**
Jaringan putus di antara dua langkah, D1 tersendat sesaat, KV tidak menjawab,
Xendit menerima permintaan lalu koneksi terputus.

## Temuan 1 — kewajiban ke pihak ketiga dibuat sebelum dicatat

Kedua jalur uang — checkout langganan dan link penagihan pelanggan — memanggil
Xendit **lebih dulu**, lalu menyimpan barisnya.

Bila penyimpanan itu gagal (satu gangguan D1 sudah cukup), pelanggan memegang
tagihan Xendit yang **hidup** untuk pesanan yang tidak kita kenali. Ia membayar.
Webhook mencari `order_id` itu di `subscription_invoices`, tidak menemukannya,
mencoba `payment_links`, juga tidak, lalu membalas **200** — karena balasan
itulah yang benar untuk ping tak dikenal. Xendit berhenti mengulang.

Hasil akhirnya: **uang diterima, langganan tidak pernah aktif, faktur tidak
pernah lunas, dan tidak ada satu pun jejak.**

Yang membuat ini pantas dicatat: `routes/billing.ts` **sudah** menyebut akibat
persis itu sebagai "kegagalan terburuk yang bisa dihasilkan alur ini" — untuk
sebab yang berbeda (token webhook tidak terpasang), yang memang sudah dijaga
dengan menolak menjual apa yang tidak bisa dikonfirmasi. Sebab yang satu ini
belum pernah ditanyakan.

Urutannya dibalik: barisnya ditulis lebih dulu tanpa `redirect_url`, baru Xendit
dipanggil, lalu tautannya diisi. Bila Xendit gagal, barisnya ditandai `failed` —
yang tersisa hanya baris gagal yang terlihat di daftar tagihan, bukan tagihan
hidup yang tak dikenali. Tidak butuh migrasi: kedua kolom `redirect_url` memang
sudah boleh kosong.

## Temuan 2 — pesanan tak dikenal yang berstatus lunas hilang tanpa jejak

Balasan 200 untuk pesanan tak dikenal tetap benar — Xendit mengirim ping dan
peristiwa lain ke URL yang sama, dan membalas non-2xx hanya memanen enam
percobaan ulang untuk keadaan yang tidak akan membaik.

Yang salah adalah **senyapnya**. Pesanan tak dikenal berstatus LUNAS berarti
uang benar-benar berpindah untuk sesuatu yang tidak ada di database — dan
satu-satunya cara mengetahuinya adalah membandingkan dasbor Xendit dengan
database secara manual, yang berarti tidak pernah.

Kini ia meninggalkan `billing.pesanan_tak_dikenal` di audit log beserta nominal
dan id Xendit-nya. Ping dan peristiwa non-lunas tetap diabaikan tanpa catatan;
mencatat semuanya akan membuat catatan yang penting ikut tidak terbaca.

## Temuan 3 — satu perusahaan yang gagal membatalkan pekerjaan cron seluruh platform

`scheduled()` menyapu seluruh tenant tiap hari. Lima gelungnya sudah memakai
pola `try { … } catch { console.error(…) }` per tenant sejak lama. **Empat
gelung tagihan tidak.**

Akibatnya bukan sekadar "sisa tenant di gelung itu terlewat". Karena tidak ada
`try` di sekelilingnya, galatnya melompat keluar dari **seluruh** penangan cron
— membatalkan semua blok sesudahnya: penyusutan aset, laporan terjadwal,
cadangan Google Drive, penagihan kontrak, penutupan buku.

Jadi satu gangguan KV pada satu perusahaan cukup untuk membatalkan pekerjaan
harian **semua** perusahaan, dan satu-satunya tandanya satu baris di log.

Yang paling mahal di antaranya: gelung pertama menurunkan langganan kedaluwarsa
ke mode baca-saja. Bila ia mati di tengah, perusahaan-perusahaan sesudahnya
**tetap bisa menulis** meski langganannya sudah habis — diam-diam, sampai ada
yang menyadarinya.

## Gerbangnya

Ketiganya dijaga oleh uji yang membaca kodenya sendiri, karena ketiganya adalah
sifat yang tidak bisa dipaksa muncul di smoke:

- **`cronKetahanan.test.ts`** mencocokkan kurung untuk menemukan tiap gelung di
  dalam `scheduled()`, lalu menuntut setiap gelung yang menyentuh database, KV,
  email, atau jaringan terlindungi — oleh dirinya sendiri atau oleh gelung
  induknya. Ia menemukan **lima**, satu lebih banyak daripada yang saya hitung
  dengan mata.
- **`catatSebelumTagih.test.ts`** menuntut baris pesanan ditulis sebelum
  `buatInvoiceXendit` dipanggil, di kedua jalur uang. Urutan yang benar hanya
  salah pada jendela kegagalan yang tidak bisa dipaksa terjadi — dan smoke
  berjalan tanpa kunci Xendit sehingga checkout berhenti di 503 jauh sebelum
  sampai ke sana.
- Dua uji perilaku untuk jejak pesanan tak dikenal: yang lunas mencatat, yang
  bukan pembayaran tidak.

Diuji-negatif ketiganya. Uji-negatif pertama saya untuk gerbang urutan **cacat**
— saya mengganti nama tabelnya menjadi `payment_linksX`, dan `indexOf` tetap
menemukan substring aslinya sehingga gerbangnya "lulus" untuk kode yang sudah
saya rusak. Diulang dengan benar-benar memindahkan blok INSERT ke belakang
panggilan Xendit; barulah ia memerah.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.267** (dari 1.259) |
| smoke | 1.348 (tidak berubah — perubahannya di jalur yang tidak bisa dipaksa muncul di smoke) |
| ui-sim | 498/498 (tidak berubah — tidak ada perubahan UI) |
| sapu-warna · istilah · gaya | 0 pelanggaran |
| tautan dokumen | lulus |

Total **3.113** pemeriksaan.
