# Fase 54e — audit otorisasi & isolasi antar-tenant

Bagian 6 dari sepuluh bagian audit.

## Yang sudah dijaga, dan dijaga dengan baik

Bagian ini adalah yang paling sudah dipikirkan di seluruh repo, dan itu perlu
dinyatakan sebelum temuannya:

- **Tiap perusahaan punya database sendiri.** Kebocoran antar-tenant tidak bisa
  terjadi lewat kelalaian `WHERE`; ia menuntut `db_ref` yang salah.
- **Setiap registrasi rute wajib punya penjaga**, dan itu dipaksa
  `rbac-guard.test.ts` yang mem-parse seluruh berkas rute. Rute publik baru
  tidak bisa lahir tanpa seseorang menyatakannya publik dengan sengaja.
- Seluruh kueri control-plane di rute tenant yang saya periksa menyaring
  `tenant_id`, dan pencabutan API key/webhook memakai `AND tenant_id = ?` —
  bukan hanya `WHERE id = ?`.
- **Konsolidasi** menyaring dulu ke perusahaan yang benar-benar dimiliki, baru
  menerapkan filter `?companies=`; id asing hanya terbuang.
- **Callback Google Drive** mengikat `state` ke sesi yang menerbitkannya
  (Fase 26b), sehingga callback yang dibuat orang lain tidak bisa diselesaikan
  peramban korban.

## Temuan 1 — aplikasi punya DUA pintu masuk, dan hanya satu yang menjaga

Konteks tenant disematkan di dua tempat: `requireTenantRole` (sesi cookie,
dipakai aplikasi web) dan `requireApiKey` (Bearer `erpk_…`, dipakai API
publik). Keduanya menyematkan konteks yang sama persis. Yang membedakan
hanyalah cara membuktikan siapa pemanggilnya.

Empat aturan tidak ada hubungannya dengan pembuktian itu — semuanya tentang
**keadaan perusahaannya** — dan tiga di antaranya hanya ditulis di pintu sesi:

| Aturan | Pintu sesi | Pintu API key |
|---|---|---|
| Ditangguhkan → 402 | ada | ada |
| **Mode baca-saja saat menunggak** | ada | **tidak ada** |
| **Perusahaan tanpa database** | ada | **tidak ada** |
| **Auto-migrasi skema** | ada | **tidak ada** |

Yang paling terasa yang pertama. Halaman aplikasi memblokir tiap perubahan
dengan 402 dan menampilkan "mode baca-saja", sementara API key berskop tulis
milik perusahaan yang sama tetap bisa membuat faktur — tanpa batas waktu.
Aturan yang ditegakkan di satu pintu dan tidak di pintu lain bukan aturan; itu
saran.

Dua sisanya lebih sunyi: perusahaan tanpa database menerima 500 dari
`getTenantDb(env, "")` alih-alih penjelasan, dan tenant yang skemanya
tertinggal menerima galat SQL "no such column" sampai ada orang yang kebetulan
membuka aplikasi webnya.

Ketiganya bukan keputusan. Hanya tidak ada satu tempat yang memaksa kedua pintu
sepakat. Sekarang ada: `lib/gerbangTenant.ts`, dipanggil keduanya.

**Uji-negatif:** gerbangnya dicabut dari pintu API key lalu smoke dijalankan
penuh — kunci berskop tulis pada perusahaan menunggak membalas **201**, bukan
402. Cacatnya nyata dan terulang.

## Temuan 2 — janji keamanan yang berlaku di sebagian layar saja

Dua kelompok rute ber-`:tenantId` sengaja **tidak** memakai `requireTenantRole`:
halaman langganan dan penagihan pelanggan. Alasannya bagus — perusahaan yang
menunggak harus tetap bisa membayar dan menagih, sementara middleware itu
memblokir tulis saat menunggak.

Konsekuensi yang tidak disengaja: keduanya ikut melewatkan **pembatasan IP** dan
**kewajiban 2FA**, karena keduanya menumpang middleware yang sama. Perusahaan
yang menyalakan "wajib 2FA" tetap melihat anggotanya membuka data faktur lewat
kedua jalur itu tanpa 2FA.

Kebijakannya dipindahkan ke `kebijakanKeamanan()` dan diterapkan di sana, dengan
satu perbedaan yang disengaja:

- **Penagihan pelanggan** menegakkan keduanya.
- **Halaman pembayaran** menegakkan 2FA, tetapi **tidak** pembatasan IP.

Perbedaan itu bukan kelonggaran. 2FA selalu bisa dipenuhi sendiri oleh yang
bersangkutan lewat Profil; alamat IP tidak. Mengunci pelanggan di luar kasirnya
sendiri berarti langganannya berakhir karena kebijakan keamanannya sendiri,
tanpa cara memperbaikinya dari tempat ia berada.

## Gerbangnya

`test/gerbangTenant.test.ts` menjaga dua hal yang berbeda:

1. **Perilaku** gerbangnya — termasuk bahwa "ditangguhkan" didahulukan daripada
   "tanpa database", karena pesannya yang lebih menjelaskan.
2. **Jumlah pintunya.** Menyematkan `c.set("tenant", …)` di tempat ketiga tanpa
   memanggil gerbangnya adalah persis cara cacat ini lahir — dan tidak ada uji
   perilaku yang bisa melihat pintu yang belum ditulis. Daftar rute yang
   memeriksa keanggotaan sendiri juga **diturunkan dari kodenya**, bukan ditulis
   tangan: rute ber-`:tenantId` tanpa penjaga peran wajib berada di berkas yang
   memanggil `kebijakanKeamanan`.

Diuji-negatif: panggilan `kebijakanKeamanan` dicabut dari penagihan → uji
strukturalnya memerah sambil menyebut berkasnya.

## Gerbang repo menangkap kelalaian saya

`tenantTanpaDb.test.ts` memerah karena saya mengubah teks kueri keanggotaan di
penagihan, sehingga pengecualian yang terdaftar untuknya berhenti cocok. Uji itu
menolak pengecualian yang tidak lagi melindungi apa pun — persis kelas
"pengecualian basi yang diam-diam melindungi kueri yang sudah berubah".

## Yang sengaja tidak diubah

- **API key tidak tunduk pembatasan IP maupun 2FA.** Keduanya tentang manusia
  dan perangkatnya; kunci mesin dipakai server-ke-server dari alamat yang tidak
  bisa diramalkan. Menegakkannya di sana akan mematikan integrasi pelanggan
  tanpa menambah jaminan yang setara.
- **Form lead publik tetap menerima kiriman saat perusahaan menunggak.** Itu
  penulisan data saat mode baca-saja, tetapi disengaja dan sudah tertulis:
  formulir yang ditempel di situs pelanggan tidak boleh mati karena tagihan.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.255** (dari 1.244) |
| smoke | **1.346** (dari 1.340) |
| ui-sim | 494/494 (tidak berubah — perubahannya di sisi API) |
| sapu-warna · istilah · gaya · i18n | 0 pelanggaran |
| tautan dokumen | lulus |

Total **3.095** pemeriksaan.
