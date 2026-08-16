# Fase 26e — regresi konsolidasi di demo publik

**Ini bukan temuan audit. Ini regresi yang saya buat sendiri kemarin di Fase 26a**,
ditemukan saat memeriksa produksi sesudah merge. Dicatat dengan judul apa adanya
karena log yang menyamarkan kesalahan sendiri sebagai "penyempurnaan" membuat
riwayat ini berhenti berguna.

## Apa yang rusak

Gerbang paket konsolidasi (Fase 26a, menutup temuan J1) memakai aturan: pengguna
harus memiliki minimal satu perusahaan berpaket Enterprise. Aturannya benar untuk
kasus yang dituju, tetapi ia menyamakan dua keadaan yang berbeda:

| Keadaan | Seharusnya | Sebelum perbaikan ini |
| --- | --- | --- |
| Punya perusahaan, semuanya Starter | 403 "tingkatkan paket" | 403 ✓ |
| **Tidak punya perusahaan sama sekali** | tidak ada yang bisa dikonsolidasikan | **403 "tingkatkan paket"** ✗ |

Kueri control-plane produksi menunjukkan siapa yang terkena:

```
demo-viewer@erpindo.id  → viewer di pt-demo-sejahtera, memiliki 0 tenant
staf.demo.…@example.com → admin di pt-demo-sejahtera, owner workspace starter
```

Jadi **pengunjung demo publik** yang mengeklik menu Konsolidasi melihat *"Modul
Konsolidasi multi-perusahaan tersedia mulai paket Enterprise. Tingkatkan paket
untuk membukanya"* — **di dalam demo yang paketnya Enterprise**. Sebelum Fase 26a
ia melihat keadaan kosong yang benar (`companies: []`, laporan 404 berpesan).
`consolidation.tsx` tidak menangani `plan-upgrade-required` secara khusus, jadi
yang tampil galat, bukan kartu upsell yang rapi.

Ini terjadi di satu-satunya layar yang dilihat calon pelanggan sebelum membayar.

## Kenapa tidak ada gerbang yang melihatnya

Karena **setiap fixture uji memiliki tenant.** Smoke menguji paywall dengan
menurunkan paket tenant milik pengguna, uji unit membuat pemilik, dan ui-sim login
sebagai pemilik. Bentuk akun "anggota yang tidak memiliki perusahaan apa pun" —
yaitu akun demo — tidak pernah dipakai menguji jalur ini.

Perbaikannya karena itu tidak berhenti di kodenya: yang ditambahkan adalah
**fixture yang hilang**, dan smoke kini memakai `demoVisitor` yang sudah ada
(blok 14g) — akun demo sungguhan, bukan tiruan bentuknya.

## Yang dikerjakan

- **`routes/consolidation.ts`** — `results.length === 0 → next()`. Pemilik nol
  perusahaan bukan sedang menghadapi masalah paket; perilaku lama yang benar
  (daftar kosong / 404 berpesan) mengambil alih. Paywall temuan J1 tidak berubah
  sedikit pun untuk pemilik yang **punya** perusahaan berpaket kurang.
- **`test/consolidation-plan.test.ts` (baru, 6 cek)** — tiga cabang gerbang plus
  kasus campuran dan jalur laporan.
- **`scripts/smoke.mjs`** — satu cek di blok demo: pengunjung demo mendapat 200
  daftar kosong, bukan tawaran naik paket.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | 0 | — |
| `pnpm test` | 0 | **555** (dari 549) |
| `pnpm smoke` | 0 | **1.113** (dari 1.112) |
| `node scripts/ui-sim.mjs` | 0 | **337/337** |

**Dibuktikan bisa gagal** — sabotase mengembalikan kode ke bentuk kemarin
(`results.length === 0` ikut 403), lalu dipulihkan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| Percabangan nol-perusahaan dihapus | 2 uji unit + cek smoke pengunjung demo, dengan balasan **403 `plan-upgrade-required`** — persis yang dilihat pengunjung demo di produksi saat itu |

## Pelajaran yang layak dicatat

Fase 26a menutup lubang paket dengan benar dan seluruh gerbangnya hijau. Yang
tidak dilakukan saat itu: memeriksa **siapa saja di produksi** yang akan berubah
perilakunya. Kueri kepemilikan yang menemukan cacat ini butuh satu perintah dan
tersedia sejak awal.

Untuk perubahan otorisasi, "uji hijau" dan "tidak ada yang rusak" bukan pernyataan
yang sama — yang pertama hanya berlaku untuk bentuk akun yang kebetulan ada di
fixture.

## Yang TIDAK dikerjakan

- **Aturan entitlement tidak dirombak.** Merancang ulang konsolidasi agar
  ber-konteks tenant adalah perubahan produk, bukan perbaikan regresi.
- **Kartu upsell khusus di `consolidation.tsx` tidak dibuat.** Setelah perbaikan
  ini yang melihat 403 hanya pemilik berpaket Starter, dan bagi mereka pesan itu
  memang benar.
