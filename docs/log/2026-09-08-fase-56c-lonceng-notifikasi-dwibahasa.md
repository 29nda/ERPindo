# Fase 56c — lonceng yang berbahasa Indonesia meski pemakainya memilih Inggris

## Yang ditutup

Fase 56b menurunkan utang teks layar ke satu, dan menamai sisanya: `dashboard.tsx`
membedah judul notifikasi buatan server untuk mengambil nomor fakturnya.

```ts
n.title.replace("Faktur ", "").replace(" lewat jatuh tempo", "")
```

Menariknya bukan baris itu, melainkan **kenapa baris itu perlu ada**. Seluruh
lonceng notifikasi — tujuh jenis, masing-masing dengan `title`, `detail`, dan
(untuk faktur jatuh tempo) `waText` — disusun sebagai kalimat Indonesia di
`apps/api/src/routes/tenants.ts`:

```ts
title: `Faktur ${d.invoice_no} lewat jatuh tempo`,
detail: `${d.contact_name} — sisa Rp ${sisa} (jatuh tempo ${d.due_date}).`,
```

Akibatnya tiga, bertingkat:

1. **Loncengnya tidak pernah dwibahasa.** Pengguna yang memilih Inggris tetap
   membaca "Faktur INV-001 lewat jatuh tempo" di kanan atas layarnya. Kalimat
   itu tidak pernah lewat kamus web, jadi tidak ada yang bisa menerjemahkannya.
2. **Tidak ada gerbang yang bisa melihatnya.** `sapu-i18n.mjs` hanya menyapu
   `apps/web`. Naskah yang ditulis di `apps/api` tidak pernah muncul di angkanya
   sama sekali — itulah sebabnya angka "0" pada penyapu bukan berarti selesai,
   dan itu sekarang tertulis di ambangnya.
3. **Halaman web mengurai balik prosa server.** Karena datanya sudah dilebur ke
   dalam kalimat, satu-satunya cara mendapatkannya kembali adalah membedah
   kalimat itu. Mengganti satu kata di Worker diam-diam merusak kartu dasbor,
   tanpa galat di mana pun.

Ketiganya satu sebab: **data yang dilebur menjadi kalimat terlalu dini.**

## Yang dikerjakan

### 1. `ApiNotification` membawa data, bukan kalimat

```ts
export type ApiNotification = { href: string } & (
  | { type: "low_stock"; data: { name; sku; qty; minStock } }
  | { type: "overdue_invoice"; data: { invoiceNo; contactName; outstanding; dueDate } }
  | …
);
```

Nominalnya dikirim sebagai **angka**, bukan untai berpemisah ribuan: pemisah
ribuan Indonesia dan Inggris berbeda, dan memformatnya di Worker berarti
memilihkan format untuk pembaca yang belum diketahui bahasanya.

### 2. Kalimatnya disusun di web, dan tsc yang menjaga kelengkapannya

`apps/web/src/i18n/notifikasi.ts` menyusun judul, rincian, dan pesan WhatsApp
lewat kamus. Bentuknya `switch` atas union berdiskriminan dengan cabang
`default` yang menugaskan nilainya ke `never` — jadi **menambah jenis
notifikasi tanpa menuliskan kalimatnya tidak akan dikompilasi.**

Dibuktikan dengan menyuntik jenis baru (`cacat_uji`) ke union: `tsc` gagal di
dua tempat dengan pesan yang menunjuk tepat ke cabang yang belum ditulis.
Gerbangnya kompilator, bukan uji yang bisa lupa ditulis.

### 3. Satu pemetaan label pajak, bukan dua

Nama jenis pajak ("SPT Masa PPN", "PPh 21") dipetakan **dua kali**: di Worker
untuk judul notifikasi, dan di `pages/pajak.tsx` untuk tabel kalender. Tidak ada
yang memeriksa keduanya sepakat. Sekarang tinggal satu, di kamus, dan halaman
Pajak memakai pemetaan yang sama.

### 4. Pesan WhatsApp mengikuti bahasa penggunanya

`waText` dulu dirakit Worker dalam bahasa Indonesia. Sekarang web yang
menyusunnya — dari data yang sama — dalam bahasa yang dipilih orang yang membaca
dan menekan tombolnya.

Satu naskah harfiah ikut terbayar: label tombolnya sendiri (`Tagih (WA)`)
ditulis langsung di JSX dan tidak pernah terlihat penyapu karena tak satu pun
katanya ada di kosakata penandanya.

## Validasi

| Gerbang | Hasil |
|---|---|
| `pnpm typecheck` | lulus |
| `pnpm test` | 1.361 unit test (+36) |
| `pnpm build` | lulus |
| `pnpm smoke` | 1.372 cek (+1 bersih: dua cek baru, satu cek lama yang kehilangan pokoknya dihapus) |
| `node scripts/ui-sim.mjs` | 508 cek (+1) |
| `pnpm lint` | lulus |
| `sapu-i18n` | **0** (ambang diturunkan dari 1 ke 0) |
| `sapu-warna` | 0 / 0 |
| `sapu-istilah` | 0 pelanggaran |
| `sapu-gaya` | 0 (ambang 0) |
| `periksa-tautan-dokumen` | semua hidup |

Tiga lapis cek baru, masing-masing untuk hal yang tidak bisa dilihat lapis lain:

- **36 uji unit** (`apps/web/test/notifikasi-dwibahasa.test.ts`) — tiap jenis
  punya kalimat di kedua bahasa, tidak menyisakan lubang `{0}` yang belum
  terisi, dan **benar-benar berubah** saat bahasanya diganti. Ditambah dua
  penjaga kambuh: Worker tidak lagi punya medan `title`/`detail`/`waText`, dan
  tidak merakit kalimat apa pun di blok notifikasinya (kueri SQL dikecualikan —
  tidak ada bahasa manusia di dalamnya).
- **Dua cek smoke baru** — Worker betul-betul tidak lagi mengirim prosa, dan
  tiap notifikasi membawa jenis, rute, serta data. Tiga cek lama ditulis ulang,
  bukan dihapus: yang diperiksa berpindah dari kata-katanya ke datanya.
- **Satu cek ui-sim** — loncengnya dibuka di peramban sungguhan dalam mode
  Inggris. Ini satu-satunya lapis yang bisa melihatnya: penyapu tidak menyapu
  `apps/api`, dan asersi dasbor tidak menjangkau panel yang masih tertutup.

  Cek yang isinya kebetulan kosong akan hijau tanpa memeriksa apa pun, jadi itu
  diukur, bukan diandaikan: label loncengnya berbunyi **"Notifications (14)"**
  pada data ui-sim. Lalu penyusun kalimatnya disabotase supaya mengembalikan
  kalimat Indonesia lagi — ceknya memerah dengan menyebutkan temuannya
  (`sisaID=["lewat jatuh tempo"]`), dan hijau kembali sesudah dipulihkan.

Kedua penjaga kambuh dibuktikan bisa merah dengan mengembalikan satu medan
`title` ke Worker; keduanya memerah, lalu hijau lagi setelah dipulihkan.

## Catatan kejujuran

Angka penyapu i18n sekarang **nol**, dan itu perlu dibaca dengan hati-hati.
Nol berarti tidak ada sisa naskah satu bahasa **di `apps/web`**. Penyapu itu
tidak pernah melihat `apps/api`, dan fase ini adalah buktinya: tujuh kalimat
yang dibaca setiap pengguna setiap hari duduk di sana selama dua puluh fase
tanpa satu gerbang pun berbunyi. Catatan itu sekarang tertulis di ambangnya,
supaya angka nol tidak dibaca sebagai "selesai".
