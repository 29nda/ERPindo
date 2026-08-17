# Fase 26b — state OAuth yang benar-benar mengikat (audit B · J2)

Sub-fase kedua penutup audit keamanan. Menangani temuan **B** (state OAuth Drive
tidak terikat sesi) dan **J2** (temuan baru: login Google tidak memeriksa
`email_verified`), plus mengoreksi klaim laporan tentang verifikasi tanda tangan
ID token.

## Verifikasi temuan

| Temuan | Verdict | Bukti |
| --- | --- | --- |
| **B** — state Drive tidak terikat sesi | **PARTIALLY VALID (P1)** | `routes/drive.ts` lama: `state = <tenantId>.sha256("drive-state\|<tenantId>\|<client_secret>")` — **dihitung, bukan disimpan** |
| **I** — ID token Google tidak diverifikasi | **SEBAGIAN FALSE POSITIVE** | Tanda tangan boleh dilewati pada alur ini; lihat bawah |
| **J2** — `email_verified` tidak diperiksa | **VALID (P1, baru)** | `routes/authGoogle.ts` menautkan identitas Google ke akun password **berdasarkan email** tanpa memeriksa klaim itu |

### Yang laporan tulis vs yang sebenarnya terjadi (B)

Skenario di laporan — "penyerang memulai OAuth untuk tenant korban" — **tidak
berjalan**: `/drive/connect` menuntut `requireTenantRole("owner")`, dan tanda
tangan state diturunkan dari `GOOGLE_CLIENT_SECRET`, jadi penyerang tidak bisa
membuat state untuk tenant yang bukan miliknya. Karena itu verdict-nya
*partially valid*, bukan valid.

Yang **memang** nyata, dan tidak kalah serius:

- State **tidak pernah kedaluwarsa** dan **bisa dipakai berulang tanpa batas**.
  Nilainya tetap sama sepanjang umur tenant. Ia muncul di bilah alamat, riwayat
  peramban, log proxy, dan tangkapan layar dukungan — dan satu kebocoran berlaku
  **selamanya**.
- State **tidak terikat sesi**. Bila state itu pernah bocor, penyerang cukup
  menempelkan `code` hasil izin Google atas akunnya sendiri lalu membuat seorang
  owner mengeklik callback-nya. Cookie sesi ERPindo ber-`SameSite=Lax`, dan
  callback adalah **GET** — navigasi tingkat-atas tetap membawa cookie korban.
  Hasilnya: **refresh token penyerang tersimpan sebagai integrasi Drive tenant
  korban**, dan backup ERP mengalir ke Drive penyerang.

### Login Google jauh lebih terbuka daripada Drive

`state = "login." + sha256("google-login|" + client_secret)` — **konstan untuk
semua orang, selamanya**. Dan `GET /api/auth/google` **publik**: siapa pun bisa
memulai alur lalu membaca state "sah" itu dari URL redirect. State yang bisa
diambil siapa saja tidak memberi perlindungan CSRF apa pun.

Login-CSRF-nya lurus: penyerang menyelesaikan izin Google atas akunnya sendiri,
menyimpan `code`, lalu memancing korban mengeklik
`/api/auth/google/callback?code=<milik penyerang>&state=login.<konstan>`. Korban
kini masuk ke **akun penyerang** tanpa menyadarinya, dan data yang ia ketikkan
sesudahnya masuk ke ruang kerja penyerang.

### Kenapa tanda tangan ID token tetap tidak diverifikasi (I)

Laporan meminta verifikasi kriptografis `iss`/`aud`/`exp`/tanda tangan. Itu
**tidak diterapkan**, dan alasannya dinyatakan, bukan dihindari: token diambil
langsung dari endpoint token Google lewat **TLS**, pada pertukaran
server-ke-server yang memakai `client_secret` kita sendiri. OpenID Connect Core
**§3.1.3.7** secara eksplisit mengizinkan validasi TLS menggantikan pengecekan
tanda tangan pada alur authorization-code seperti ini.

Yang **tidak** boleh dilewati justru satu klaim yang tidak disebut laporan sama
sekali: `email_verified`. Tanpanya, siapa pun yang bisa menerbitkan identitas
Google beralamat email korban — akun Workspace di domain yang ia kuasai —
mengambil alih akun ERPindo korban hanya dengan menekan "Lanjutkan dengan
Google", karena penautannya terjadi **lewat email**. Itulah J2, dan itu yang
ditambal.

## Yang dikerjakan

- **Migrasi control-plane `0016_oauth_states`** — tabel state yang menyimpan
  **hash** state (bukan nilainya), tujuannya, tenant, sesi penerbit, dan
  kedaluwarsa.
- **`apps/api/src/lib/oauthState.ts` (baru)** — `buatState()` / `pakaiState()`
  dengan empat sifat: acak 32 byte · TTL 10 menit · **sekali pakai atomik** ·
  terikat pemulainya.
  Sekali-pakainya bertumpu pada `DELETE ... WHERE id = ?` yang hasilnya
  (`changes === 1`) menjadi pemeriksaannya sendiri — bukan baca-lalu-tandai,
  yang bisa dibalap dua permintaan bersamaan (bentuk cacat yang sama dengan
  temuan D).
- **`routes/drive.ts`** — `stateSig()` dihapus; callback menolak bila sesi
  penukar bukan sesi penerbit. Cek `owner` yang sudah ada **tetap** dipertahankan.
- **`routes/authGoogle.ts`** — state acak + cookie nonce berumur 10 menit
  (alur ini dimulai tanpa sesi, jadi ikatannya di peramban), dan
  `email_verified !== true` → ditolak.
- **Percobaan yang gagal ikut menghabiskan state**, supaya state yang ditolak
  karena salah sesi tidak bisa dicoba berulang sampai ada sesi yang cocok.

## Koreksi dokumen yang saya tulis sendiri di Fase 25d

`docs/08-referensi-teknis-repo.md` menyebut "**3 migrasi** control-plane · **82
tabel** tenant · **33 migrasi** tenant". **Ketiganya salah** — yang benar 16
migrasi control-plane (setelah PR ini), 81 tabel tenant, 46 migrasi tenant.

Penyebabnya adalah perintah penghitung yang ikut saya terbitkan di dokumen itu:
ia membaca berkas sebagai teks dan mencocokkan `^\s*\{\s*id:`, pola yang meleset
untuk entri yang didahului komentar. Perintah penggantinya menghitung dari
**modul yang sudah dimuat**, bukan dari teks berkas. Dokumen diperbaiki beserta
catatan koreksinya, karena angka salah yang diam-diam dibetulkan tidak
mengajarkan apa pun tentang cara ia bisa salah.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | 0 | — |
| `pnpm test` | 0 | **499** (dari 489) |
| `pnpm smoke` | 0 | **1.107** (dari 1.104) |
| `node scripts/ui-sim.mjs` | 0 | **337/337** |

**Dibuktikan bisa gagal** — tiga sabotase, seluruhnya dipulihkan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| State login dikembalikan konstan (persis cacat lama) | 2 cek smoke: "state ACAK — dua kali mulai berbeda" → `sama? true` |
| Ikatan sesi dilepas dari `pakaiState` | 2 uji: "SESI LAIN ditolak", "state gagal ikut habis" |
| `DELETE`+`changes === 1` dilepas (sekali-pakai) | 2 uji: "SEKALI PAKAI", "state gagal ikut habis" |

## Yang TIDAK dikerjakan

- **Alur OAuth tidak diuji end-to-end di smoke.** Suite smoke sengaja berjalan
  **tanpa** kunci Google pada deployment utamanya — memasang kunci di sana akan
  mematikan seluruh cek degradasi anggun yang ada. Yang diuji di smoke adalah
  bagian yang bisa diuji tanpa Google: state acak, cookie nonce, dan penolakan
  callback tanpa cookie. Perilaku `pakaiState` sendiri diuji unit terhadap
  SQLite asli lewat harness `test/helpers/memdb.ts`.
- **Verifikasi tanda tangan ID token** — tidak diterapkan; alasannya di atas.
- **Rotasi refresh token Drive yang sudah tersimpan** tidak dilakukan. Tidak ada
  bukti penyalahgunaan, dan produksi baru punya satu integrasi Drive milik
  pemilik sendiri; mencabutnya akan mematikan backup tanpa alasan.
- Temuan **C, D, E, F, H** menyusul di Fase 26c–26d.
