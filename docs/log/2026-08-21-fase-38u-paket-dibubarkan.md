# Fase 38u — ajakan paket yang bertahan delapan fase setelah paketnya dibubarkan

## Yang dikerjakan

### 1. Dua permukaan yang saling bertentangan

Fase 30 membubarkan paket bertingkat Starter/Business/Enterprise atas keputusan
pemilik. Penegakannya dicabut seluruhnya: `requirePlanModule`, `MODULE_MIN_PLAN`,
dan respons 403 `plan-upgrade-required` tidak ada lagi di seluruh API.

Naskah yang **menjual** paket itu tetap tinggal — di dua kartu pengaturan:

| Berkas | Yang dirender |
| --- | --- |
| `settings/data.tsx` | "Tersedia di paket Enterprise. … Tingkatkan ke Enterprise untuk mengaktifkannya." |
| `settings/integrations.tsx` | naskah yang sama, untuk API publik & webhook |

Fase 38d menerbitkan `/harga` yang menyatakan hal berlawanan: *"Seluruh modul
terbuka sejak hari pertama. Tidak ada kemampuan yang baru muncul setelah
menaikkan paket."* Dua permukaan bertentangan, dan pembaca tidak punya cara tahu
mana yang berlaku. Kelas kegagalan yang sama sudah muncul di `/api-docs` pada
Fase 38g — yang berarti ini bukan kelalaian sekali, melainkan pola.

### 2. Yang ternyata lebih buruk daripada bobot mati

Dugaan awal: cabang 403 itu kode mati, karena satu-satunya sumber 403-nya sudah
dihapus. Ternyata tidak.

Kedua kartu masih bisa menerima 403 — dari **RBAC** (`requireTenantRole("owner")`)
dan dari **pembatasan IP**. Endpoint `/security` dikecualikan dari pembatasan IP
agar Owner yang salah mengetik CIDR tetap bisa membukanya kembali, tetapi
`api-keys` dan `webhooks` **tidak** dikecualikan.

Artinya seorang Owner yang baru saja mengunci dirinya dengan CIDR salah akan
membuka kartu API dan membaca: *"Tersedia di paket Enterprise."* Pesan yang
salah, pada saat yang paling buruk, tentang masalah yang sama sekali berbeda.

Karena itu cabangnya **tidak dihapus, melainkan dibetulkan**: satu pasang kunci
yang menyebutkan sebab 403 yang sebenarnya — peran, dan alamat IP.

### 3. Kalimat utuh, bukan potongan

Naskah lama dirakit dari tiga kunci:

```
{u("descApiUpsell")} <a …>{u("dokumentasiApi")}</a> {u("tingkatkanEnterprise")}
```

Itu persis pola yang dilarang CLAUDE.md untuk toast, dan alasannya berlaku sama
di sini: potongan mengunci urutan kata Indonesia ke dalam kode, dan bahasa lain
tidak punya cara mengubahnya — padahal tiap potongnya terlihat sudah
diterjemahkan. Penggantinya dua kalimat utuh.

Tujuh kunci dihapus, dua ditambahkan:

| Dihapus | Ditambahkan |
| --- | --- |
| `tersediaEnterprise`, `tingkatkanEnterprise`, `descKeamananUpsell`, `descKeamananUpsellSingkat`, `descApiUpsell`, `descApiIntegrasiUpsell`, `dokumentasiApi` | `aksesPengaturanDitolak`, `descAksesPengaturanDitolak` |

Uji kunci mati (Fase 38q, ambang 0) memaksa keduanya konsisten: menghapus
pemakaian tanpa menghapus kuncinya akan menggagalkan build.

### 4. Penjaga: aturan baru di `sapu-istilah.mjs`

Uji kunci mati menjaga kunci yang **ditinggalkan**. Ia tidak menjaga kalimat baru
yang menjual paket yang tidak ada — dan itulah yang terjadi selama delapan fase.

Aturan `paket-bertingkat-dibubarkan` menolak frasa yang menamai tingkatan
sebagai barang dagangan. Polanya sengaja sempit: naskah Inggris yang memakai
"enterprise" dalam arti *kelas perusahaan* tetap sah.

Diuji terhadap empat naskah yang baru dihapus dan tiga yang harus tetap lolos:

```
KENA   Tersedia di paket Enterprise
KENA   Available on the Enterprise plan
KENA   . Tingkatkan ke Enterprise untuk mengaktifkannya.
KENA   . Upgrade to Enterprise to enable it.
---
LOLOS  Enterprise ERP,
LOLOS  Enterprise-grade security controls.
LOLOS  Enterprise software pricing is usually revealed after three meetings.
```

### 5. Lima komentar yang menunjuk mekanisme yang sudah tidak ada

Ditemukan sewaktu menelusuri sumber 403. Komentar bukan naskah tayang, jadi
tidak ada penyapu yang bisa melihatnya — tetapi komentar yang menyebut
`enforcePlanByPath` membuat pembaca berikutnya mencari fungsi yang dihapus enam
fase lalu, lalu menyimpulkan sendiri apa yang mungkin menggantikannya.

`routes/security.ts`, `routes/publicApi.ts` (dua tempat), `routes/ai.ts`,
`routes/billing.ts`, `settings/company.tsx` — semuanya kini menyebut keadaan lama
sebagai **sejarah**, bukan sebagai perilaku yang berlaku.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm test` | 917 | 917 |
| `pnpm smoke` | 1.157 | 1.157 |
| `node scripts/ui-sim.mjs` | 417 | 417 |
| `sapu-istilah` | 6 aturan / 0 pelanggaran | **7 aturan** / 0 pelanggaran |
| `sapu-warna` | 0 / 0 | 0 / 0 |
| `sapu-gaya` | 0 / 9 / 0 / 0 / 0 | 0 / 9 / 0 / 0 / 0 |
| `sapu-i18n` | 146 | 146 |

`pnpm typecheck`, `pnpm build`, dan `pnpm lint` bersih.

## Catatan kejujuran

Tidak ada cek smoke baru ditambahkan, dan itu keputusan, bukan kelalaian. Jalur
yang diperbaiki hanya bisa dicapai lewat 403 dari RBAC atau pembatasan IP —
menyiapkan keadaan itu di smoke berarti mengunci sesi ujinya sendiri. Yang
menjaga keputusan ini adalah aturan penyapu (naskah baru) dan uji kunci mati
(naskah lama). Cek smoke yang hanya memanggil endpoint tanpa memicu 403 akan
menaikkan angka tanpa menjaga apa pun.
