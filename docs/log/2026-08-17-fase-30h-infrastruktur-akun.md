# Fase 30h — infrastruktur Cloudflare dibuat, config menunjuk ke sumber daya nyata

Pemilik menghubungkan akun Cloudflare-nya ke sesi ini. Pemeriksaan pertama lewat
connector langsung menemukan sesuatu yang **tidak mungkin terlihat dari kode**.

## Yang ditemukan

Merge Fase 30 memicu deploy, dan deploy-nya **berhasil** — Worker `erpindo` ada,
dibuat 07:04:49 dan diperbarui 07:05:54 pada 17 Agustus 2026, persis setelah
merge. Tetapi akun yang menerimanya kosong:

| Sumber daya | Dirujuk `wrangler.jsonc` | Ada di akun |
| --- | --- | --- |
| D1 database | 7 (1 control-plane + 6 tenant) | **0** |
| KV namespace | 1 (`RATE_KV`) | **0** |
| R2 bucket | – | belum diaktifkan |

Dibuktikan bukan dengan menyimpulkan dari daftar kosong, melainkan dengan
meminta database itu secara langsung:

```
d1_database_get 2979c39c-bf54-42c4-8486-e843897b3006
→ 404 "The database ... could not be found"
```

**Deploy yang berhasil tetapi aplikasi yang mati.** Worker terpasang dengan
binding ke sumber daya yang tidak ada, jadi setiap request yang menyentuh
database akan gagal — sementara status deploy-nya hijau. Ini kelas kegagalan
yang paling menyesatkan: semua tanda di GitHub dan Workers Builds menunjukkan
keberhasilan.

## Kenapa ini tidak ambigu

Sempat terpikir bahwa ID lama mungkin milik akun lain milik pemilik, sehingga
menggantinya berisiko memutus aplikasi dari data yang sudah ada. Satu fakta
arsitektur menutup keraguan itu: **binding D1 dan KV terikat pada akun.** Worker
yang berjalan di akun A tidak bisa membaca database di akun B, berapa pun ID
yang ditulis di config.

Jadi tidak ada versi dari cerita ini di mana mempertahankan ID lama membuat
aplikasi bekerja di akun yang menerima deploy. Membuat sumber daya baru di akun
itu adalah satu-satunya jalan, bukan salah satu pilihan.

## Yang dikerjakan

Tujuh database D1 + satu KV namespace dibuat lewat connector, seluruhnya di
region **APAC** — terdekat ke Indonesia, dan D1 tidak bisa dipindah regionnya
setelah dibuat.

| Binding | Nama | ID |
| --- | --- | --- |
| `DB` | erpindo-control-plane | `c525c4e3-9f7a-42ea-bc78-f0035f2dece2` |
| `TENANT_DB_1` | erpindo-tenant-1 | `d5eab9f6-0a14-4c2c-995d-967e0d136b39` |
| `TENANT_DB_2` | erpindo-tenant-2 | `48e88c27-351e-4c92-b895-f7f943ed2019` |
| `TENANT_DB_3` | erpindo-tenant-3 | `51d31dd0-1b67-435e-b103-47b841707088` |
| `TENANT_DB_4` | erpindo-tenant-4 | `7573b5b1-c59e-4d4e-9279-55b9d0e93133` |
| `TENANT_DB_5` | erpindo-tenant-5 | `b71c597b-0f40-426f-b08b-d17ec79fa122` |
| `TENANT_DB_6` | erpindo-tenant-6 | `19529a13-ca43-467d-8a1b-278b52d03476` |
| `RATE_KV` | erpindo-rate-kv | `f84f208b97034a33b7748b3eaf14827d` |

`wrangler.jsonc` diperbarui ke ID tersebut, disertai komentar yang menjelaskan
kenapa — supaya pembaca berikutnya tidak mengira ID lama hilang tanpa sebab.

Skema tidak perlu dijalankan dengan tangan: migrasi control-plane berjalan
sendiri pada request pertama (`ensureMigrated` di `apps/api/src/index.ts`), dan
skema tenant dibuat saat perusahaan pertama diprovisi.

## Validasi

`typecheck` · `lint` · `build` · `smoke` (**1.129** cek) seluruhnya hijau —
smoke menjalankan `wrangler dev` dengan `wrangler.jsonc` nyata, jadi config yang
rusak akan gagal di gerbang sebelum merge.

Verifikasi akhir dilakukan **setelah deploy** dengan mengueri database
control-plane lewat connector: tabelnya harus terbentuk sendiri pada request
pertama. Hasilnya dilampirkan di bawah setelah deploy berjalan.

## Catatan jujur

**Alamat produksi belum bisa saya konfirmasi.** Egress dari lingkungan ini ke
`*.workers.dev` diblokir proxy, jadi saya tidak bisa memanggil aplikasi hidup
untuk membuktikan ia sudah pulih. Yang bisa saya buktikan: sumber daya kini ada,
ID-nya cocok, dan config-nya lulus seluruh gerbang. Pembuktian terakhir —
membuka aplikasinya — ada di sisi pemilik.

`.github/workflows/ai-probe.yml` masih menunjuk
`https://erpindo.nurudhuhaalamin.workers.dev`. Bila subdomain akun ini berbeda,
alamat itu perlu diperbarui; saya tidak mengubahnya karena menebak subdomain
yang salah lebih buruk daripada membiarkannya terlihat jelas untuk dikoreksi.
