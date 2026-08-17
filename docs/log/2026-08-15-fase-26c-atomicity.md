# Fase 26c — transisi uang & token dibuat atomik (audit C · D · F)

Sub-fase ketiga penutup audit keamanan. Ketiga temuan berbagi satu bentuk:
**baca → periksa → tulis** sebagai tiga langkah terpisah, padahal yang dijaga
adalah keadaan yang hanya boleh berpindah sekali.

## Verifikasi temuan

| Temuan | Verdict | Bukti |
| --- | --- | --- |
| **C** — webhook Xendit non-atomik | **VALID (P1)** | `billing.ts` lama: cek `invoice.status !== "paid"` lalu `UPDATE … WHERE id = ?` **tanpa predikat status**. Jalur `EXPIRED` di berkas yang sama justru sudah memakai CAS |
| **D** — token sekali-pakai bisa dibalap | **VALID (P2)** | `auth.ts` lama `consumeToken`: SELECT → periksa `used_at` → UPDATE. Dipakai verifikasi email, reset sandi, undangan |
| **F** — jumlah bayar tidak diverifikasi | **VALID (P2)** | `paid_amount` di-destructure dari payload lalu **tidak pernah dipakai**; `subscription_invoices.amount` tersimpan tetapi tidak pernah dibandingkan |

Temuan C bukan skenario karangan. Xendit mengirim **`PAID` dan `SETTLED`** untuk
satu invoice — keduanya dipetakan "lunas" — ditambah **6× percobaan ulang** saat
balasan non-2xx. Dua yang tiba bersamaan sama-sama lolos pemeriksaan sebelum
salah satunya menulis, `addMonths` berjalan dua kali, dan pelanggan mendapat
sebulan gratis yang tidak muncul di laporan mana pun.

## Yang dikerjakan

- **`routes/billing.ts`** — transisi langganan dan payment link menjadi
  compare-and-set (`WHERE id = ? AND status != 'paid'`). Seluruh efek hilir —
  perpanjangan langganan, audit, **pembuatan database tenant** — hanya berjalan
  untuk pemenang balapan (`changes === 1`). Ulangan menjawab
  `{ ok: true, ignored: "sudah-diproses" }`, tetap 2xx.
- **Invarian jumlah bayar.** Bila `paid_amount` ada dan **kurang** dari
  `invoice.amount`: langganan **tidak** diaktifkan, invoice tetap `pending`,
  audit `billing.jumlah_kurang` ditulis, balasan tetap 2xx (non-2xx hanya
  memanen 6× ulangan untuk keadaan yang tidak akan membaik). **Lebih** bayar
  tetap mengaktifkan dan dicatat sebagai `billing.jumlah_lebih` — menahan
  pelanggan yang membayar lebih hanya memindahkan masalah ke dukungan.
- **`routes/auth.ts` `consumeToken`** — penandaan menjadi pemeriksaannya sendiri:
  `UPDATE tokens SET used_at = ? WHERE token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > ?`,
  lanjut hanya bila `changes === 1`, baris dibaca **sesudah** klaim berhasil.

## Uji balapan yang semula tidak bisa gagal — dan bagaimana itu ketahuan

Ini bagian terpenting dari sub-fase ini.

Uji balapan pertama kali ditulis memakai harness SQLite yang sudah ada, lulus,
dan **tampak** membuktikan perbaikannya. Lalu perbaikannya disabotase — dikembalikan
ke pola baca-lalu-tulis yang rusak — dan ujinya **tetap hijau**.

Sebabnya: `node:sqlite` **sinkron**. Tidak ada titik `await` yang menyerahkan
kendali di antara SELECT, pemeriksaan, dan UPDATE, sehingga dua permintaan
"bersamaan" sebenarnya berjalan berurutan. Uji balapan yang berjalan di atas
database sinkron tidak menguji balapan apa pun.

Penambalnya: `wrapSqliteLambat()` di `test/helpers/memdb.ts` — pembungkus yang
menunda **setiap** operasi satu putaran event-loop, meniru D1 yang setiap
panggilannya melintasi jaringan. Dengan itu, sabotase yang sama menghasilkan:

- reset sandi: **2 dari 2** dan **5 dari 5** permintaan paralel berhasil —
  satu tautan reset dipakai lima kali;
- webhook: **2** audit `billing.paid` dan langganan diperpanjang dua kali.

Keduanya persis kerentanan aslinya, direproduksi. Kalau sabotase tidak pernah
dijalankan, sub-fase ini akan menutup dengan dua uji yang mustahil merah.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | 0 | — |
| `pnpm test` | 0 | **513** (dari 499) |
| `pnpm smoke` | 0 | **1.107** (tetap) |
| `node scripts/ui-sim.mjs` | 0 | **337/337** |

**Dibuktikan bisa gagal** — empat sabotase, seluruhnya dipulihkan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| `consumeToken` kembali baca-lalu-tulis | 2 uji: "DUA permintaan bersamaan" → **2 sukses**, "LIMA permintaan" → **5 sukses** |
| CAS invoice dilepas (`WHERE id = ?` saja) | "DUA webhook PAID beriringan" → **2** audit `billing.paid` |
| Invarian jumlah dilepas | "KURANG bayar → langganan TIDAK aktif" |
| *(temuan proses)* uji balapan dijalankan tanpa `wrapSqliteLambat` | **tidak ada** yang merah — inilah yang mengungkap harness-nya sendiri cacat |

## Yang menyesuaikan, dan kenapa itu bukan pelonggaran

`test/billing.test.ts` memakai DB **tiruan** yang menjawab apa pun yang
diprogramkan. Tiruan itu diperbarui agar mengembalikan `meta.changes` dan meniru
`WHERE status != 'paid'` — mengikuti preseden yang sudah ada di berkas yang sama
(komentar tentang meniru `WHERE … AND db_ref = ''`). Yang berubah adalah
**fixture-nya**, bukan penjaganya: uji baru di `billing-atomicity.test.ts`
berjalan di atas SQLite sungguhan justru karena tiruan tidak bisa membuktikan
semantik SQL.

## Yang TIDAK dikerjakan

- **Bukan transaksi sungguhan.** D1 tidak menyediakan transaksi interaktif;
  `batch()` bersifat atomik tetapi tidak bisa mengambil keputusan di tengahnya.
  Yang dipakai adalah CAS pada satu baris penentu, lalu efek hilir menyusul. Bila
  Worker mati **tepat setelah** invoice ditandai lunas tetapi sebelum tenant
  diperpanjang, keadaan itu tidak dipulihkan otomatis oleh sub-fase ini — yang
  menyelamatkannya adalah blok "Pemulihan-diri" di `GET /billing` yang sudah ada.
  Dinyatakan apa adanya, bukan diklaim tuntas.
- **Mata uang tidak dibandingkan.** Seluruh invoice diterbitkan dalam IDR dan
  Xendit membalas dalam mata uang invoice yang sama; menambah perbandingan yang
  selalu benar hanya menambah jalur yang tidak pernah teruji.
- Temuan **E** dan **H** menyusul di Fase 26d.
