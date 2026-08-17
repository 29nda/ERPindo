# Fase 30a — satu paket, satu harga: Rp499.000

Keputusan pemilik: bubarkan paket bertingkat (Starter Rp499rb / Business Rp999rb /
Enterprise Rp2,49jt) menjadi **satu paket Rp499.000 per perusahaan per bulan dengan
seluruh modul terbuka dan pengguna tak terbatas**.

Alasannya bukan penyederhanaan kode. Pembeda paket lama adalah "kedalaman
operasional", dan calon pelanggan tidak bisa menilai kedalaman yang belum pernah
dipakainya. Yang benar-benar terjadi: UKM membeli Starter, menemukan penggajian
terkunci di bulan kedua, lalu merasa dijebak. Satu harga menghapus seluruh kelas
kekecewaan itu — dan menghasilkan argumen jualan terkuat melawan ERP per-pengguna:
harga tidak naik saat tim bertambah.

## Yang dikerjakan

**Sumber tunggal — `packages/shared/src/core.ts`.** Komentar berkas itu memang
menyatakan seluruh keputusan bisnis terpusat di sana, dan itu terbukti: hampir
seluruh fase ini adalah konsekuensi berantai dari satu perubahan di situ.

- `PLANS` → `["lengkap"]`; `PLAN_LIMITS.lengkap` Rp499.000, kuota AI 100/hari,
  pengguna tak terbatas.
- **Dicabut seluruhnya**: `MODULE_MIN_PLAN`, `MODULE_KEYS`, `MODULE_LABELS`,
  `PLAN_ACCESS_RANK`, `planIncludesModule`, `minPlanForModule`, `modulesForPlan`,
  `hitungProrata`, `BILLING_CYCLE_DAYS`, `changePlanSchema`, `SINGLE_PLAN`,
  `EXTRA_ENTITY_PRICE`, field `modul` pada `TENANT_ROUTE_ACCESS` (34 entri),
  middleware `requirePlanModule`, gerbang paket konsolidasi & API publik, kedua
  endpoint ganti paket, dan blok cron penurunan paket terjadwal.
- Respons `403 plan-upgrade-required` **tidak ada lagi di seluruh API**.
- Migrasi control-plane `0017_paket_tunggal`: `plan → 'lengkap'`,
  `pending_plan → NULL`, riwayat invoice dinormalkan.
- UI: tiga kartu paket → satu kartu (landing & Pengaturan→Langganan); lencana
  "paket dipilih" di halaman daftar dicabut; kalkulator hemat kini berpatokan
  Rp499rb, sehingga **titik impas melawan ERP per-pengguna turun dari 3 ke 2 orang**.
- SSR `landingSeo.ts`: JSON-LD kini satu `Offer`, kalimat noscript menyebut satu
  harga. Bila terlewat, Google mengindeks paket yang tidak dijual.
- FAQ: butir "Ada tiga paket…" ditulis ulang. Ini yang **sudah diperingatkan**
  rencana Fase 0 sebagai teks yang akan menjadi bohong.

### `maxEntities` dihapus — batas yang tidak pernah membatasi

Ditelusuri sebelum diputuskan: `maxEntities` hanya muncul di teks landing
("Enterprise mencakup 3 entitas") dan satu baris kartu langganan. **Tidak ada satu
baris kode pun yang memeriksanya.** Yang benar-benar membatasi penambahan
perusahaan adalah pagar anti-abuse `belumBayar` di `routes/auth.ts`, dan itu tetap
ada. Menyisakan angka yang tidak membatasi apa pun bukan cuma jebakan bagi pembaca
berikutnya — ia janji yang bisa dibantah pelanggan.

## Validasi

| Gerbang | Sebelum (garis dasar Fase 0) | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` | hijau | ✅ hijau |
| `pnpm lint` | hijau | ✅ hijau |
| `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 582 | ✅ **592** (shared 282 · web 71 · api 239) |
| `pnpm smoke` | 1.115 | ✅ **1.116** |
| `node scripts/ui-sim.mjs` | 343 | ✅ **346** |
| `sapu-i18n` utang teks | 146 | ✅ **145** |

**Total 2.054 pemeriksaan (dari 2.040).** Seluruh angka naik; utang i18n turun.

Uji yang dihapus diganti uji yang **menegakkan pencabutan**, bukan dibiarkan hilang:
`prorata.test.ts` → `paket-tunggal.test.ts` (16 cek: tiap simbol yang dicabut
dibuktikan tidak diekspor lagi, registri RBAC dibuktikan tak menyimpan `modul`).
Smoke mendapat penegak baru: halaman publik tidak boleh menyebut
Starter/Business/Enterprise, JSON-LD harus memuat TEPAT satu `Offer`, dan delapan
modul yang dulu terkunci diuji **lewat HTTP** benar-benar 200 — bukan sekadar
tombolnya muncul di layar.

## Catatan kejujuran — empat temuan yang tidak terduga

### 1. `pnpm typecheck` hijau sementara SETIAP pendaftaran rusak

Kedua `INSERT INTO tenants` di `routes/auth.ts` menyematkan string telanjang
`comped ? "enterprise" : "starter"` **di dalam `.bind()`**. Karena `.bind()`
menerima `unknown[]`, TypeScript tidak pernah memeriksanya. Setelah paket
dibubarkan, typecheck tetap hijau sementara setiap tenant baru lahir dengan paket
yang tidak ada, lalu `PLAN_LIMITS[plan].maxUsers` melempar di runtime — di jalur
pendaftaran.

Yang menemukannya **smoke, bukan typecheck**. Nilainya kini dipindahkan ke
konstanta beranotasi `const PAKET_BAWAAN: Plan`, sehingga nama paket yang tidak ada
gagal di gerbang, bukan di layar pendaftar.

### 2. Dua baris uji yang sudah mati sejak Fase 24 — dan "memperbaikinya" merusak

Dua tempat di smoke mengembalikan tenant dengan `{ plan: "trial", status: "trial" }`.
Status `trial` dihapus Fase 24a, jadi **kedua panggilan itu selalu ditolak 400 dan
tak seorang pun memeriksanya** — tenant sebenarnya tetap `active` sepanjang suite
hijau selama ini.

Menormalkannya menjadi nilai yang sah justru **mematahkan enam cek form lead
publik** 1.800 baris di bawahnya (form hanya melayani tenant `active`/`past_due`).
Perbaikan yang benar bukan "betulkan nama statusnya" melainkan berhenti menurunkan
status sama sekali: `active` memang keadaan yang selama ini berlaku. Dicatat karena
kelas cacat ini — panggilan uji yang gagal diam-diam lalu menjadi asumsi tersembunyi
— tidak terlihat dari membaca kode mana pun.

### 3. Uji `rbac-guard` menangkap daftar-putihnya sendiri

Begitu kedua endpoint ganti paket dicabut, `rbac-guard.test.ts` langsung merah:
daftar putihnya masih menyebut rute yang sudah tidak ada. Uji ini bekerja persis
sebagaimana dirancang — dicatat sebagai bukti bahwa penjaga "entri basi" memang
berguna, bukan formalitas.

### 4. Penegak baru sempat merah karena hal yang benar

Cek "halaman publik tidak boleh menyebut nama paket lama" memerah pada
`applicationCategory: "BusinessApplication"` — nilai baku schema.org, bukan nama
paket. Dikecualikan secara eksplisit dengan komentar: cek yang selalu merah akan
dimatikan orang, bukan diperbaiki.

## Yang TIDAK berubah, dan itu disengaja

**Izin RBAC tetap utuh.** Yang dibongkar adalah paywall, bukan keamanan. Modul kini
terbuka untuk semua *paket*, TIDAK untuk semua *peran* — kasir tetap tidak bisa
membuka penggajian. `consolidation-plan.test.ts` ditulis ulang persis untuk
membuktikan ini: rute konsolidasi ada di luar `/api/tenants/:tenantId/` sehingga
`enforceTenantAccessByPath` tidak menjangkaunya, dan satu-satunya penahannya adalah
`m.role = 'owner'`. Uji barunya membuktikan viewer tetap tidak ikut mengkonsolidasi
— mencabut paywall tanpa membuktikan batas itu masih berdiri akan mengubah
pembongkaran harga menjadi kebocoran data lintas perusahaan.

## Berikutnya

Fase 30b — landing page dirombak untuk harga tunggal (bagian pembanding, kalkulator,
dan FAQ **sudah ada**; lihat catatan ruang lingkup di log Fase 0).
