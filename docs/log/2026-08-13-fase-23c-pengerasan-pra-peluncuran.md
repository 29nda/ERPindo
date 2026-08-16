# Fase 23c — Pengerasan pra-peluncuran: kapasitas pendaftaran

Fase kecil di luar urutan roadmap, dipicu kabar pemilik bahwa **peluncuran
dijadwalkan besok**. Yang dikerjakan bukan fitur baru melainkan satu risiko
peluncuran yang sudah ada di kode sejak lama dan tidak pernah terlihat karena
belum pernah ada pendaftar ketujuh.

## Risikonya

Mode database bawaan (`TENANT_DB_MODE=local`) memetakan tiap perusahaan ke satu
binding `TENANT_DB_1..6`. Pendaftaran perusahaan **ke-7** memanggil
`provisionTenantDb()`, yang melempar `Error` biasa. Tidak ada penangkap di
`routes/auth.ts`, jadi ia jatuh ke `onError` global dan pendaftar menerima:

```
500  { "error": "Terjadi kesalahan pada server." }
```

Itu keliru dalam dua arah sekaligus. **Bagi pendaftar**, aplikasinya terlihat
rusak — padahal ia berfungsi sempurna dan hanya penuh. **Bagi pemilik**, tidak
ada satu pun petunjuk bahwa yang perlu dilakukan cuma menyalakan D1 dinamis;
yang terlihat di log hanyalah satu galat 500 di antara galat lain.

Pada hari peluncuran, kegagalan ini muncul persis pada momen paling mahal:
pendaftar ketujuh, yaitu saat pemasarannya mulai berhasil.

## Koreksi klaim saya sendiri

Saat pertama menemukannya saya menyatakan galat itu **membocorkan pesan
konfigurasi internal** ke pendaftar. **Itu salah.** `onError` global di
`apps/api/src/index.ts:181` sudah menyamarkan seluruh galat menjadi pesan
generik; pesan aslinya hanya masuk `console.error`. Pengerasan Fase 9a soal
"error tak bocor" memang masih berlaku. Yang tersisa murni soal keterbacaan,
bukan keamanan — dan itu tetap layak diperbaiki, tetapi bukan dengan alasan yang
saya sebut mula-mula.

## Yang dikerjakan

- `KapasitasTenantPenuhError` di `apps/api/src/lib/tenantDb.ts` — kelas galat
  tersendiri, karena kapasitas penuh **bukan kerusakan** dan route berhak
  membedakannya.
- Kedua jalur pendaftaran di `routes/auth.ts` (perusahaan pertama & perusahaan
  tambahan) menangkapnya dan menjawab **503** dengan pesan yang bisa
  ditindaklanjuti + `code: "kapasitas-penuh"`.
- `docs/05-runbook-go-live.md`: batas 6 perusahaan dinaikkan menjadi **butir
  checklist pra-peluncuran**, bukan lagi catatan pasca-peluncuran yang terbaca
  setelah semuanya terlambat. Angka gerbangnya juga diperbarui — tertulis
  850 smoke · 222 unit · 184 ui-sim, kenyataannya **1.075 · 453 · 336**.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **453** (dari 450) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1075** (tetap) |
| `node scripts/ui-sim.mjs` | 0 | **336/336** (tetap) |

3 uji unit baru di `apps/api/test/tenantDb.test.ts`. Smoke & ui-sim tidak
bertambah: menguji jalur ini di sana berarti benar-benar menghabiskan pool 6
binding, yang membuat seluruh blok sesudahnya tak bisa mendaftarkan tenant —
biaya yang jauh lebih besar daripada nilainya.

**Dibuktikan bisa gagal** — sabotase mengenai bentuk cacat aslinya, yaitu
melempar `Error` biasa alih-alih kelas tersendiri:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| `throw new KapasitasTenantPenuhError()` → `throw new Error(...)` | **dua** uji: `pool habis → KapasitasTenantPenuhError` dan `instanceof tetap tajam` |

## Yang TIDAK dikerjakan, dan ini yang paling penting

**Batas 6 perusahaan tidak dihilangkan.** Fase ini hanya membuat penolakannya
jujur dan terbaca. Menghilangkan batasnya adalah **tindakan konfigurasi milik
pemilik**, bukan kode: `TENANT_DB_MODE=cloudflare` + `CLOUDFLARE_API_TOKEN` +
`CLOUDFLARE_ACCOUNT_ID`. Jalur dinamisnya sudah matang & teruji sejak Fase 11a.

Bila peluncuran besok menargetkan lebih dari enam pendaftar dan saklar itu tidak
dinyalakan, pendaftar ketujuh **tetap tidak bisa mendaftar** — kini dengan pesan
yang jelas, tetapi tetap tidak bisa. Dinyatakan sekeras ini karena inilah satu
hal yang paling mungkin merusak hari peluncuran, dan ia tidak bisa diperbaiki
dari sisi kode.
