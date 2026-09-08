# Fase 57a — ekor tenant yang tidak pernah tersapu

## Yang ditutup

`scheduled()` menyapu seluruh tenant tiap hari di bawah **anggaran waktu lunak
~20 detik**. Ketika anggarannya habis, gelungnya berhenti dan mencatat:

```
[cron] anggaran waktu habis — penyusutan dilanjutkan run berikutnya
```

Kalimat itu benar hanya bila jalan berikutnya benar-benar **sampai** ke sisa
itu. Sampai fase ini, tidak ada yang menjaminnya.

### Dua sebab yang saling menguatkan

**1. Sapuannya tidak berurutan.** Keempat sapuan tenant yang bisa dipotong
anggaran ditulis tanpa `ORDER BY`. Urutan barisnya karena itu ditentukan mesin
database, bukan oleh kode — jadi "siapa yang terlewat" pun ikut tak tertulis di
mana pun, dan bisa berubah tanpa satu baris kode berubah.

**2. Penandanya dibaca satu per satu, DI DALAM gelung.** Penanda "sudah
selesai" ada di KV, yang hanya bisa dibaca satu kunci per panggilan:

```ts
for (const t of dueTenants) {
  if (overBudget()) break;                                // anggaran ~20 detik
  if (await monthlyDone(env, "dep", t.id, period)) continue;  // 1 baca KV
  …
}
```

Ongkos untuk *mencapai* pekerjaan yang tersisa tumbuh seiring banyaknya
pekerjaan yang **sudah selesai** — persis kebalikan dari yang seharusnya.

Gabungannya: tenant yang terdorong ke belakang antrean selalu tenant yang sama,
dan begitu anggarannya habis, ekor yang sama pula yang terlewat setiap hari.

### Kenapa itu bukan sekadar tertunda

Untuk tugas harian, terlewat berarti besok lagi. Untuk tugas **bulanan**
jendelanya hanya tanggal 1–3 — sesudah itu bloknya tidak berjalan sampai bulan
berikutnya. Tenant di ekor karena itu **melewatkan bulannya sama sekali**:
penyusutan tidak diposting, rekap tidak terkirim.

Tidak ada galat. Tidak ada yang memberi tahu siapa pun. Pekerjaannya hanya tidak
pernah terjadi.

### Dan gelung harian justru yang paling rawan

Tugas bulanan setidaknya punya penanda: jalan berikutnya bisa melewati yang
sudah beres dan maju sedikit. **Tugas harian tidak punya penanda apa pun** —
idempotensinya ada di lapis data (`next_run_date` dimajukan), bukan pada penanda
yang bisa dilewati.

Artinya tenant di kepala antrean mengerjakan **kerja nyata setiap hari** —
sambungan DB tenant, penyegaran kurs, template jurnal, tagihan kontrak, work
order — dan menghabiskan anggarannya di situ. Ekornya tidak pernah tersentuh.
Bukan tertunda: tidak pernah. Tagihan kontraknya tidak pernah terbit, jurnal
berulangnya tidak pernah diposting.

## Yang dikerjakan

### 1. Penanda bulanan pindah dari KV ke control-plane

Migrasi `0019_cron_marks`. Seluruh set "sudah selesai" kini terbaca dalam **satu
kueri** per tugas, dan gelungnya menyaring **sebelum** berjalan:

```ts
const depSelesai = await selesaiBulanan(env, "dep", period);
const depBelum = dueTenants.filter((t) => !depSelesai.has(t.id));
for (const t of depBelum) { … }
```

Yang masuk gelung hanyalah pekerjaan yang benar-benar belum dikerjakan, jadi
tiap jalannya cron **pasti** memajukan keadaan.

Perpindahan ini melahirkan kelas cacat baru yang ikut ditutup di commit yang
sama: di KV tiap kunci punya TTL sendiri, di D1 tidak ada yang membuangnya. Ada
sapuan penanda lama, satu pernyataan per jalan, di luar gelung mana pun.
Ambangnya 400 hari supaya penanda tugas **tahunan** tidak terbuang sebelum
tahunnya lewat.

### 2. Sapuan berbatas anggaran dinyatakan urutannya

`ORDER BY id` pada keempatnya. Sapuan penagihan sengaja **tidak** ikut: gelungnya
menyapu semuanya tanpa `overBudget()`, jadi urutannya memang tidak menentukan
apa pun di sana.

### 3. Gelung harian menggilir gilirannya

Titik mulainya digeser tiap hari lalu melingkar:

```ts
const putaranHarian = Math.floor(Date.now() / 86_400_000) % billTenants.length;
const antreanHarian = [...billTenants.slice(putaranHarian), ...billTenants.slice(0, putaranHarian)];
```

Ini **tidak** membuat anggarannya cukup. Ia membuat kekurangannya dibagi rata —
dan itu memang satu-satunya yang bisa dijanjikan sebuah anggaran.

## Validasi

| Gerbang | Hasil |
|---|---|
| `pnpm typecheck` | lulus |
| `pnpm test` | 1.375 unit test (+9) |
| `pnpm build` | lulus |
| `pnpm smoke` | 1.372 cek |
| `node scripts/ui-sim.mjs` | 508 cek |
| `pnpm lint` | lulus |
| `sapu-i18n` | 0 (ambang 0) |
| `sapu-warna` | 0 / 0 |
| `sapu-istilah` | 0 pelanggaran |
| `sapu-gaya` | 0 (ambang 0) |
| `periksa-tautan-dokumen` | semua hidup |

Sembilan uji baru di `apps/api/test/cronMajuTerus.test.ts`. Sifat yang dijaga
**struktural**, dan itu disengaja: cacatnya hanya muncul pada jumlah tenant yang
tak mungkin dibuat di suite mana pun, jadi menunggunya di uji sama saja dengan
tidak menjaganya.

Ketiga penjaga intinya dibuktikan bisa merah dengan menyuntik cacatnya
masing-masing — `ORDER BY` dicabut, antrean gilir dikembalikan ke daftar asli,
penyaringan sebelum gelung dihapus. Ketiganya memerah pada uji yang tepat, lalu
hijau lagi sesudah dipulihkan.

Satu gerbang lain ikut menangkap perubahan ini tanpa diminta:
`angkaAcuanDokumen` memerah karena `docs/08` mengutip jumlah migrasi
control-plane. Itu justru bukti gerbangnya bekerja — angkanya diperbarui pada
commit yang sama.

## Catatan

Cacat ini tidak ditemukan lewat laporan, lewat log, maupun lewat gejala apa pun.
Ia ditemukan dengan membaca sebuah kalimat di komentar kode — *"dilanjutkan run
berikutnya"* — lalu menanyakan apa yang sebenarnya menjamin kalimat itu.
Jawabannya: tidak ada.
