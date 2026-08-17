# Fase 25d — tutorial peluncuran & peta repo (dokumen)

Permintaan pemilik: tutorial langkah demi langkah tentang apa yang harus ia
kerjakan, dan penjelasan struktur repo. Keputusannya: **dokumen di repo saja**
(bukan halaman web), tutorial mencakup **teknis + komersial**, peta repo dibuat
**dua dokumen terpisah** — satu untuk pemilik, satu referensi teknis.

Tidak ada satu baris kode aplikasi yang berubah.

## Kenapa runbook yang sudah ada tidak cukup

`docs/05-runbook-go-live.md` ditulis untuk **operator rilis**: ia mendaftar nama
secret, perilakunya saat absen, dan alasan tiap keputusan. Yang tidak dijawabnya
adalah pertanyaan pemilik yang sebenarnya — *besok pagi saya mulai dari mana, dan
bagaimana saya tahu langkah itu berhasil?*

Runbook juga menganggap pembacanya sudah tahu apa itu secret, binding, dan slot.
Dan tidak ada satu pun dokumen di repo ini yang menjelaskan **isi repo**: pemilik
tidak punya cara mengetahui bahwa harga paket tinggal di `packages/shared/src/core.ts`
atau teks halaman depan di `pages/landing/sections.ts`.

Runbook **tidak dilebur** ke dokumen baru. Dua salinan yang sama-sama harus
diperbarui adalah cara termudah membuat dokumen berbohong; tutorial merujuk ke
runbook untuk detail, tidak menyalinnya.

## Yang dikerjakan

- **`docs/06-tutorial-peluncuran.md`** — 12 langkah berurutan, tiap langkah
  berpola tetap: **klik di mana · isi apa · cara tahu berhasil · akibat bila
  dilewati.** Delapan langkah teknis (Admin → Resend → domain → Google → Xendit
  uji → Xendit produksi → kapasitas → uji asap), lalu empat langkah komersial
  yang selama ini tidak ada di dokumen mana pun (isi blog, pelanggan pertama,
  siklus tagihan, rutinitas mingguan). Ditutup tabel gejala → sebab → tindakan.
- **`docs/07-peta-repo-untuk-pemilik.md`** — perjalanan satu klik dari peramban
  sampai jurnal, fungsi tiap folder dalam bahasa biasa, dan tabel **"mau ubah X →
  berkasnya ini"** dengan path nyata.
- **`docs/08-referensi-teknis-repo.md`** — siklus permintaan, dua bidang
  database, resolusi `db_ref`, daftar tugas cron, tabel degradasi anggun, alat di
  `scripts/`, workflow, dan larangan yang sudah diputuskan.
- **`README.md`** — dua klaim yang sudah tidak benar diperbaiki (lihat bawah).

## Titik awal ditulis dari kenyataan, bukan ingatan

Tutorial dibuka dengan tabel "Anda sedang di sini" yang seluruh isinya dikueri
langsung ke control-plane produksi hari ini (read-only):

| Yang diperiksa | Hasil |
| --- | --- |
| Slot terpakai | 3 dari 6 (`softtin`, `pt-demo-sejahtera`, `cv-demo-cabang`) |
| Faktur langganan | **0** — checkout belum pernah terbukti hidup di produksi |
| Artikel blog | **0** — `/blog` yang diindeks Google masih kosong |
| Pengguna terverifikasi email | **0** — jalur email belum pernah terbukti sampai |
| `TENANT_DB_MODE` | `local` → batas keras 6 perusahaan |

Dua di antaranya baru terlihat justru karena dokumen ini ditulis: **blog produksi
kosong** (padahal halamannya ikut sitemap dan SEO landing menjanjikan isinya) dan
**belum ada satu pun email yang terbukti sampai** ke inbox. Keduanya masuk sebagai
langkah bernomor, bukan catatan kaki.

## Dua klaim README yang sudah tidak benar

- Tabel paket masih memuat baris **"Trial · Rp0 (30 hari)"** — trial dihapus di
  Fase 24a dan seluruh janjinya dibersihkan dari produksi di Fase 24d. README
  adalah halaman pertama repo; dibiarkan, ia menjanjikan hal yang sudah tidak
  ada. Diganti penjelasan alur sebenarnya (`provisioning` → bayar → database
  lahir).
- Angka gerbang mutu tertulis **842 smoke · 182 ui-sim · 137 unit**; kenyataannya
  **1.088 · 337 · 482**. Angka baru ditulis bersama tanggal pengukurannya supaya
  ketahuan bila kelak basi.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **482** (tetap) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1.088** (tetap) |
| `node scripts/ui-sim.mjs` | 0 | **337/337** |

Dokumen tidak punya compiler, jadi dua pemeriksaan khusus dijalankan — dan
inilah kelas cacat yang sebenarnya di sini:

1. **Seluruh 55 path berkas yang dikutip diverifikasi ada** (ekstrak dengan
   `grep -oE`, lalu `test -e`; nama berkas polos di dalam tabel dicocokkan ke
   `git ls-files`). Hasil: 0 hilang.
2. **Lima rujukan baris kode diperiksa satu per satu** — `core.ts:158` benar
   berisi harga `499_000`, `middleware/auth.ts:264` benar `MODULE_ROUTE_PREFIXES`,
   `auth.ts:23` benar `requireAuth`, `migrations.ts:1832` benar
   `TENANT_SCHEMA_VERSION`, `index.ts:219` benar handler `scheduled`.

Angka struktur (82 tabel tenant · 33 migrasi tenant · 16 tabel control-plane · 3
migrasi control-plane · 48 modul route) dihitung dari berkas, bukan diingat;
perintah penghitungnya ikut ditulis di dokumen teknis agar bisa diverifikasi
ulang kapan saja.

## Yang TIDAK dikerjakan

- **Tidak ada perubahan kode aplikasi**, termasuk untuk dua temuan di atas: blog
  produksi kosong dan email yang belum terbukti sampai adalah pekerjaan pemilik
  (langkah 2 dan 9 tutorial), bukan cacat kode.
- **Tidak ada halaman web/artifact** — sesuai pilihan pemilik.
- **Runbook tidak dirombak.** Ia tetap dokumen operator; hanya dirujuk.
- **Utang lama tetap terbuka dan disebut apa adanya di tutorial**: contoh Grup
  Harga belum tersemai di demo, riwayat slip gaji & penyusutan demo masih ±2
  periode, dan lampiran berkas belum dibangun.
