# Fase 26d — kebijakan tujuan webhook & predikat tenant (audit E · H)

Sub-fase penutup audit keamanan. Menangani temuan **E** (SSRF webhook keluar) dan
**H** (predikat tenant pada mutasi), lalu menutup seluruh rangkaian 26a–26d.

## Verifikasi temuan

| Temuan | Verdict | Bukti |
| --- | --- | --- |
| **E** — SSRF webhook keluar | **PARTIALLY VALID (P2)** | Skema hanya `z.string().url()`; `lib/webhooks.ts` mengikuti redirect (bawaan `fetch`) |
| **H** — predikat tenant pada mutasi | **PARTIALLY VALID (P3)** | `tenants.ts` — `UPDATE custom_roles … WHERE id = ?` dan `UPDATE memberships … WHERE custom_role_id = ?` tanpa `tenant_id` |

### Kenapa E hanya *partially valid* — dan tetap ditutup

Runtime-nya Cloudflare Workers: **tidak ada jaringan internal, tidak ada endpoint
metadata instans**, dan `fetch` ke loopback tidak menjangkau apa pun. Pivot SSRF
klasik ala VM — membaca kredensial dari `169.254.169.254`, menyentuh layanan
internal — **tidak berlaku di sini**, dan mengklaim sebaliknya akan melebih-lebihkan
temuan.

Yang **nyata** dan ditutup:

1. **`http://` polos.** Payload webhook membawa data bisnis pelanggan dan
   ditandatangani HMAC; mengirimnya tanpa TLS membocorkan isinya ke jaringan mana
   pun yang dilewatinya.
2. **Kredensial di URL** (`https://user:sandi@…`) — tersimpan apa adanya di
   database dan ikut tercetak di log kegagalan.
3. **Redirect.** `fetch` mengikutinya secara bawaan, jadi tujuan publik yang sah
   bisa membalas 302 ke alamat internal dan kebijakan hanya berlaku satu lompatan.

### H: tidak ada eksploit, invariannya yang dijaga

Mutasi peran kustom **didahului** cek keberadaan ber-`tenant_id`, jadi tidak ada
jalur nyata untuk menyentuh peran tenant lain. Yang diperbaiki adalah
ketergantungan isolasi pada **jarak dua pernyataan**: `AND tenant_id = ?` kini
melekat pada mutasinya sendiri, sehingga penulisan ulang berikutnya tidak bisa
kehilangannya tanpa terlihat. Cakupannya jujur: hanya control-plane — database
tenant terpisah secara fisik dan tidak punya kolom `tenant_id` untuk
dipredikatkan.

## Yang dikerjakan

- **`packages/shared/src/publicApi.ts`** — `alasanTolakUrlWebhook()` /
  `webhookUrlAman()`: https saja · tolak kredensial · tolak `localhost`,
  `*.localhost`, `*.local` · tolak IPv4 loopback/privat/link-local/CGNAT/multicast
  · tolak IPv6 loopback/unspecified/link-local/unique-local. Pesan galatnya
  spesifik ("harus memakai https://"), bukan "URL tidak valid".
- **`lib/webhooks.ts`** — kebijakan diperiksa **ulang** sebelum `fetch`, dan
  `redirect: "manual"`.
- **`routes/tenants.ts`** — `AND tenant_id = ?` pada mutasi peran kustom,
  sinkronisasi `memberships`, dan hitungan pemakaian.
- **`docs/keamanan.md`** — kebijakan SSRF beserta **batasnya** ditulis sebagai
  bagian tetap dokumen keamanan.

### Satu cacat yang nyaris ikut terkirim

Versi pertama `ipv6Terlarang()` hanya memeriksa bentuk bertitik
`::ffff:127.0.0.1`. Uji langsung menolaknya: parser URL **menormalkan** alamat itu
menjadi `::ffff:7f00:1`, sehingga pemeriksaannya lolos total dan
`https://[::ffff:127.0.0.1]/hook` akan diterima di produksi. Bentuk heksadesimal
kini ikut diurai. Ini persis alasan uji ditulis dari daftar bentuk penyamaran,
bukan dari satu contoh yang terlintas.

## Cakupan smoke yang HILANG — dinyatakan, bukan disembunyikan

Blok webhook di smoke dulu mendaftarkan tujuan `http://127.0.0.1:8800/…` (Worker
smoke itu sendiri) dan membuktikan satu pengiriman benar-benar **`delivered`**.
Kebijakan baru menolak tujuan itu, dan sandbox smoke tidak punya egress ke
internet — jadi **jalur "terkirim sungguhan" tidak lagi bisa dibuktikan di
smoke**. Asersinya diturunkan menjadi "mesin antrean berjalan dan hasilnya
tercatat".

Yang menggantikannya justru lebih tepat sasaran:
`apps/api/test/webhookPengiriman.test.ts` menyeed baris webhook **lama** bertujuan
terlarang lalu membuktikan `fetch` **tidak pernah dipanggil** — bukan sekadar
"gagal", karena gagal setelah menghubungi tetap berarti permintaannya terkirim.
Uji itu juga menutup alasan keberadaan pemeriksaan kedua: baris yang tersimpan
sebelum kebijakan ada tidak pernah melewati skemanya.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | 0 | — |
| `pnpm test` | 0 | **549** (dari 513) |
| `pnpm smoke` | 0 | **1.112** (dari 1.107) |
| `node scripts/ui-sim.mjs` | 0 | **337/337** |

**Dibuktikan bisa gagal** — tiga sabotase, seluruhnya dipulihkan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| `webhookUrlAman` dibuat selalu `true` | **23** uji kebijakan + **4** uji jalur pengiriman |
| Bentuk IPv4-mapped heksa diabaikan | "TOLAK IPv4-mapped ke loopback" |
| Pemeriksaan ulang saat pengiriman dilepas | 4 uji: `fetch` terpanggil untuk tujuan terlarang |

## Yang TIDAK dikerjakan

- **DNS rebinding tidak dicegah.** Nama yang sah saat disimpan bisa menunjuk
  alamat lain saat dikirim; mencegahnya butuh penyematan DNS (resolve lalu
  hubungi IP yang sama) yang tidak tersedia di Workers. Ditulis di
  `docs/keamanan.md` sebagai batas yang diketahui.
- **Tidak ada allowlist domain per tenant.** Itu keputusan produk (menambah satu
  layar pengaturan), bukan penambal cacat.
- **Predikat tenant tidak disapu ke seluruh repo.** Yang diperbaiki adalah
  pernyataan yang benar-benar ada temuannya; sapuan menyeluruh atas ±40 modul
  tanpa temuan konkret adalah churn.

---

## Penutup rangkaian 26a–26d

| Temuan | Verdict akhir | Status |
| --- | --- | --- |
| A — RBAC peran kustom | VALID (P0) | **ditutup** (26a) |
| B — state OAuth Drive | PARTIALLY VALID (P1) | **ditutup** (26b) |
| C — webhook non-atomik | VALID (P1) | **ditutup** (26c) |
| D — token bisa dibalap | VALID (P2) | **ditutup** (26c) |
| E — SSRF webhook | PARTIALLY VALID (P2) | **ditutup** (26d) |
| F — jumlah bayar | VALID (P2) | **ditutup** (26c) |
| G — gerbang paket dari URL | VALID (P2) | **ditutup** (26a) |
| H — predikat tenant | PARTIALLY VALID (P3) | **ditutup** (26d) |
| I — verifikasi ID token | **SEBAGIAN FALSE POSITIVE** | tanda tangan sengaja tidak diverifikasi (OIDC §3.1.3.7); yang nyata (J2) ditutup |
| J1 — konsolidasi tanpa paket | VALID (baru) | **ditutup** (26a) |
| J2 — `email_verified` | VALID (baru) | **ditutup** (26b) |

Gerbang naik sepanjang rangkaian: **482 → 549 uji · 1.088 → 1.112 smoke ·
337 ui-sim tetap**. Total **18 sabotase** dibuktikan merah lalu dipulihkan.
