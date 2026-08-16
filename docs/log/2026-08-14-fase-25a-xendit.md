# Fase 25a — gerbang pembayaran ditukar: Midtrans → Xendit

Keputusan pemilik: **Midtrans dihapus total**, bukan disimpan sebagai cadangan.
Dua provider yang hidup berdampingan berarti dua jalur checkout, dua bentuk
webhook, dan dua kali permukaan bug — untuk sesuatu yang hanya dipakai satu
arah.

Waktunya kebetulan bagus: `subscription_invoices` di produksi masih **0 baris**,
jadi tidak ada satu pun pembayaran sungguhan yang perlu dimigrasikan. Kalau
penukaran ini terjadi enam bulan lagi, ceritanya lain.

## Yang berbeda antara keduanya

| | Midtrans | Xendit |
| --- | --- | --- |
| Buat pembayaran | `POST /snap/v1/transactions` → `redirect_url` | `POST https://api.xendit.co/v2/invoices` → `invoice_url` |
| Auth | Basic `base64(server_key:)` | Basic `base64(secret_key:)` — kebetulan sama bentuknya |
| Uji vs produksi | **host berbeda** + `MIDTRANS_IS_PRODUCTION` | **host sama**, dibedakan prefiks kunci |
| Verifikasi webhook | SHA-512 atas isi body | header `x-callback-token` |
| Status lunas | `settlement` / `capture` + `fraud_status` | `PAID` / `SETTLED` |
| Status gagal | `expire` · `cancel` · `deny` | hanya `EXPIRED` |
| Retry | mengulang saat non-2xx | mengulang **6×** backoff saat non-2xx |

**Tanpa migrasi DB.** `subscription_invoices.order_id` menjadi `external_id`,
`redirect_url` menyimpan `invoice_url`, `transaction_status` menyimpan status
Xendit. Nama kolomnya memang jadi tidak persis lagi, tetapi membangun ulang tabel
SQLite menjelang peluncuran demi kosmetik nama bukan pertukaran yang sepadan;
pemetaannya ditulis di komentar berkas.

## Lubang yang dibuat oleh penukaran ini — dan penambalnya

Midtrans memisahkan sandbox dan produksi lewat **host yang berbeda**. Xendit
tidak: `api.xendit.co` melayani keduanya, dan yang membedakan hanya kuncinya
(`xnd_development_…` vs `xnd_production_…`).

Artinya `MIDTRANS_IS_PRODUCTION` hilang **tanpa pengganti**, dan yang tertinggal
adalah keadaan diam-diam yang berbahaya: produksi dengan kunci uji menerima
"pembayaran" yang tidak pernah menjadi uang, pelanggan melihat langganannya
aktif, dan **tidak ada satu pun tanda di layar**. Yang akan menemukannya adalah
rekening bank, berminggu-minggu kemudian.

Penambalnya: `billingModeUji()` membaca prefiks kunci, `GET /billing`
mengembalikan `modeUji`, dan Pengaturan → Langganan menampilkan lencana **"mode
uji pembayaran"**. Runbook §3 menjadikannya langkah verifikasi, bukan sekadar
catatan: *"kalau lencana tidak muncul, kunci yang terpasang kunci produksi —
berhenti di sini."*

## Keputusan kecil yang sengaja diambil

- **`SETTLED` diperlakukan lunas, sama seperti `PAID`.** Untuk sebagian metode
  pembayaran, `SETTLED` bisa jadi webhook pertama yang kita lihat; menunggu
  `PAID` yang tidak akan datang berarti pelanggan yang sudah membayar tetap
  tertahan, dan tidak ada yang akan melaporkannya.
- **Path `/api/billing/notification` tidak diubah.** Namanya sudah
  netral-provider, dan menggantinya berarti URL yang sudah didaftarkan di
  dashboard menjadi 404 tanpa satu pun gerbang yang melihatnya.
- **Tidak ada padanan `cancel`/`deny`.** Di Xendit, kartu yang ditolak membuat
  invoice tetap `PENDING` sampai pelanggan mencoba metode lain atau invoice-nya
  kedaluwarsa. Jadi status `failed` tidak lagi pernah ditulis dari webhook —
  disebutkan di sini supaya tidak dikira hilang karena kelalaian.
- **`sha512Hex` dihapus** dari `lib/crypto.ts`: satu-satunya pemakainya adalah
  tanda tangan Midtrans. Pembanding constant-time yang sudah ada di berkas itu
  (dipakai verifikasi password) diekspor sebagai `samaAman` dan dipakai ulang
  untuk token webhook — bukan menulis pembanding kedua.

## Temuan review sendiri sebelum merge: checkout bisa menerima uang yang tak bisa dikonfirmasi

Membaca ulang diff sebelum merge menemukan satu lubang yang tidak tertangkap
gerbang mana pun: **`billingConfigured()` semula hanya menguji
`XENDIT_SECRET_KEY`.**

Dengan secret key saja tetapi tanpa `XENDIT_CALLBACK_TOKEN`, urutannya jadi:
checkout **menyala** → pelanggan **membayar sungguhan** → setiap webhook ditolak
403 → Xendit mengulang 6× lalu menyerah → **langganan tak pernah aktif dan
database tenant tak pernah dibuat**. Uang masuk, pelanggan tidak mendapat apa
pun — persis kegagalan terburuk yang komentar di berkas itu sendiri berjanji
mencegahnya (lihat blok "Pemulihan-diri" di `GET /billing`).

Tidak ada gerbang yang bisa melihatnya: seluruh uji berjalan dengan **kedua**
kunci terpasang, dan lencana "mode uji pembayaran" tetap tampil normal walau
token webhook kosong — jadi bahkan langkah verifikasi runbook pun ikut lolos.

`billingConfigured()` kini menguji **keduanya**. Aturannya: *jangan menjual apa
yang tidak bisa kita konfirmasi.* Tanpa token, checkout membalas 503 berpesan —
degradasi anggun yang sudah ada, bukan mekanisme baru.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **477** (dari 470) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1088** (dari 1087) |
| `node scripts/ui-sim.mjs` | 0 | **337/337** |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

**Dibuktikan bisa gagal** — sabotase mengenai bentuk cacat aslinya, keduanya
dipulihkan sesudahnya:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| `tokenCallbackXenditValid` dibuat selalu `true` | 3 cek: uji unit token, `token callback salah → 403`, `tanpa header → 403` |
| body permintaan mengirim `order_id` alih-alih `external_id` | `buatInvoiceXendit mengirim external_id/amount/redirect` |
| `billingConfigured` dikembalikan ke hanya menguji secret key | `billingConfigured butuh SECRET_KEY *dan* CALLBACK_TOKEN` |

Sabotase kedua sengaja menyasar **nama field**, karena itulah kelas cacat yang
paling mungkin terjadi di penukaran provider: satu nama salah membuat checkout
gagal 100% di produksi sementara seluruh gerbang lokal tetap hijau — tidak ada
satu pun uji lain di repo ini yang menyentuh `api.xendit.co`.

## Yang TIDAK bisa diuji di sini, dinyatakan apa adanya

- **`api.xendit.co` tidak bisa dihubungi dari lingkungan pengembangan ini**
  (egress proxy memblokirnya). Seluruh uji memakai `fetch` tiruan: yang teruji
  adalah **reaksi kami** terhadap jawaban Xendit, bukan Xendit-nya. Bentuk
  permintaan disusun dari dokumentasi resmi (`external_id`, `amount`,
  `invoice_url`, `x-callback-token`) — pembuktian akhirnya tetap satu pembayaran
  simulasi di produksi, langkah demi langkah di runbook §3.
- **Penolakan token salah (403) tidak diuji smoke.** Jalur itu ada di balik
  `billingConfigured`, dan memasang kunci di suite smoke akan mematikan seluruh
  cek degradasi anggun yang sudah ada di sana. Yang ditambahkan ke smoke justru
  kebalikannya (blok `25a`): deployment **tanpa** kunci harus membalas 200
  meski tokennya ngawur — karena non-2xx akan memanen 6× percobaan ulang Xendit
  untuk sesuatu yang memang sengaja tidak aktif. Penolakan 403 diuji di
  `test/billing.test.ts` (token salah · header hilang · secret belum terpasang).
- **Riwayat Midtrans di `docs/STATUS.md` sengaja tidak ditulis ulang.** Baris
  Fase 11b/11d/13a mencatat apa yang benar **saat itu**; yang diperbarui hanya
  klaim yang masih berlaku ke depan (roadmap, rencana monetisasi, runbook).
