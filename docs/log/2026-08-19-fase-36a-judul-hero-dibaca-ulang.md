# Fase 36a — judul yang cerdas dalam bahasa Inggris, janggal dalam bahasa Indonesia

Pemilik membaca ulang judul yang baru saya pasang di Fase 35a dan bertanya:
*"Menurutmu, lo aja enak gak dibacanya oleh manusia?"*

Tidak. Dan diagnosisnya spesifik.

## Yang salah

```
Anda mencatat satu penjualan tiga kali. Itu dua kali kebanyakan.

Nota, lalu buku, lalu Excel — tiga kali menyalin angka yang sama, dan tiga
kesempatan untuk keliru. Di bawah ini satu faktur diposting sekali.
Perhatikan sisanya.
```

**1. "Itu dua kali kebanyakan" adalah idiom Inggris yang diterjemahkan mentah.**
Aslinya *"That is twice too many"* — konstruksi yang di bahasa Inggris berbunyi
tajam, dan di bahasa Indonesia tidak berbunyi sama sekali. Pembacanya harus
berhenti sejenak untuk menghitung maksudnya: tiga kali, dua kali kelebihan,
berarti seharusnya sekali. Judul yang perlu dihitung bukan judul.

Ini kelas kesalahan yang **tidak tertangkap** `sapu-istilah.mjs` maupun
`sapu-gaya.mjs`: tiap katanya baku, tata bahasanya benar, ragamnya formal. Yang
salah adalah **bentuk pikirannya berasal dari bahasa lain**.

**2. Nadanya menuduh.** Kalimat pertama yang dibaca calon pembeli adalah
pemberitahuan bahwa cara kerjanya salah — dua kali lipat pula. Pemilik memilih
nada "berani", dan saya menerjemahkannya menjadi **menggurui**. Bukan hal yang
sama.

**3. Sublinenya tiga kalimat mengerjakan tiga hal**, lalu ditutup **perintah**:
"Perhatikan sisanya." Menyuruh orang melihat sesuatu yang sudah bergerak
sendiri 200px di bawahnya.

**4. "diposting"** — jargon, di kalimat yang ditujukan kepada pemilik toko.

### Akarnya satu

Naskah itu **menarasikan peragaan** alih-alih membiarkannya bicara. Kalau
peragaannya bekerja — dan Fase 35a memang membuatnya bekerja — ia tidak butuh
keterangan. Ia butuh kalimat yang **menyiapkan orang untuk melihat**, lalu diam.

## Yang dipasang

```
Berhenti menyalin angka yang sama tiga kali.

Nota, lalu buku, lalu Excel. Di ERPindo cukup mencatat sekali —
stok, pembukuan, dan pajaknya menyusul sendiri.
```

Kalimat perintah, jadi tetap tegas. Tetapi yang disuruh berhenti adalah
**pekerjaannya**, bukan pembacanya — dan itu ajakan, bukan tuduhan.

Sublinenya satu kalimat. Ia menyebut tiga tempat yang benar-benar dipakai orang
(nota, buku, Excel), lalu menyatakan klaimnya, lalu berhenti. Peragaan di
bawahnya yang membuktikan.

### Label kartu ikut berhenti mengulang

"Satu kali catat · lalu semuanya terisi sendiri" mengulang subline kata per kata
tepat di bawahnya. Kini **"Yang terisi sendiri · tanpa satu pun input
tambahan"** — menamai apa yang dilihat, bukan mengulang yang sudah dibaca.

## Catatan

Ini kekeliruan saya yang kelima berturut-turut pada naskah halaman yang sama,
dan polanya sekarang terlihat: **saya menulis untuk terdengar pintar, bukan
untuk dibaca.** Fase 32e mengejar kejernihan sampai ragamnya turun; 34a
memperbaiki ragam; 35a mengejar keberanian sampai nadanya menuduh dan idiomnya
berpindah bahasa.

Tidak ada gerbang yang bisa menangkap ini. Yang bisa hanya membacanya keras-
keras dan bertanya apakah ada orang yang benar-benar bicara begitu.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 623 | ✅ 623 |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 362 | ✅ 362 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 145 · 0 | ✅ 145 · 0 |
| `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |

Dua asersi ui-sim membaca judul hero apa adanya (`F15` sisi ID dan EN) dan ikut
diperbarui ke bunyi barunya.
