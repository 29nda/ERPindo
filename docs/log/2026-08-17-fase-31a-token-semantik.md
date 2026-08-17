# Fase 31a — token semantik & primitif baru

Sub-fase pertama dari perombakan yang diminta pemilik: *"desain dan tata letak
landing page dan aplikasinya terlalu mirip dengan aplikasi sebelumnya … niat
saya beda total, saya share ZIP itu untuk referensi."*

## Diagnosis dulu, baru desain

Repo ini sudah **dua kali** melakukan "perombakan desain" — 17a (gelap-dulu) dan
18a (terang-dulu) — dan pemilik tetap menilai hasilnya mirip aplikasi lama.
Sebelum menggambar apa pun, sebabnya diukur:

| Yang diukur di `apps/web/src` | Jumlah |
| --- | --- |
| Kelas warna literal `slate-*` | **1.724** di 50 berkas |
| Varian `dark:` literal | **1.084** |
| Berkas yang disentuh 17a & 18a | **5** |

Di situlah jawabannya. Kedua fase itu hanya memetakan ulang **nilai** ramp
`slate-*` di `styles.css`; 50 berkas halaman tetap menulis warna sendiri, dan
bentuk komponennya tidak pernah ikut berubah. 18a bahkan mencatatnya sebagai
keunggulan: "membalik arah desain sebesar ini hanya menyentuh lima berkas."

Murah, dan justru itu masalahnya. **Warnanya berganti, kerangkanya warisan ZIP.**

## Yang dikerjakan

### 1. Lapis token semantik yang sebelumnya tidak ada

`styles.css` kini dua lapis: nilai mentah `--erp-*` (didefinisikan dua kali,
terang & gelap) lalu `@theme inline` yang memetakannya menjadi utilitas Tailwind
biasa — `bg-surface`, `text-ink-muted`, `border-line`. Halaman berhenti menyebut
warna dan mulai menyebut **peran**, sehingga `dark:` tidak perlu ditulis lagi.

Ramp `slate-*` tetap dipetakan ulang, tetapi turun pangkat menjadi **jaring
pengaman** untuk kelas yang lolos sapuan — bukan gaya yang dianjurkan.

### 2. Aksen merek diukur dari logo, bukan dikarang

`logo-erpindo.png` didekode (dekoder PNG minimal, `node:zlib` — tidak ada
pustaka gambar di repo) dan piksel dominannya dihitung:

| Warna | Piksel |
| --- | --- |
| `#002060` | 10.762 |
| `#003090` | 7.600 |
| `#0050d0` | 7.230 |
| `#0058e0` | 4.073 |

Seluruhnya **biru murni, r = 0**. Palet lama memakai `#2563eb` (Tailwind
`blue-600`) yang mengandung merah — dekat, tetapi bukan warna logonya. Ramp baru
memakai nilai 600/800/900 sebagai piksel logo apa adanya. Kontras `brand-600`
di atas putih **6,87:1**, lulus AA untuk teks maupun teks putih di atas tombol.

### 3. Bentuk primitif diganti — bukan warnanya

Ini bagian yang membedakan fase ini dari 17a/18a.

| | Sebelum (18b) | Sesudah |
| --- | --- | --- |
| Kartu | bayangan ambient berlapis, "melayang di atas kertas" | **garis rambut, tanpa blur** |
| Radius kartu | `0.75rem` | `0.5rem` |
| Radius kontrol | `0.5rem` | `0.375rem` |
| Tombol | `shadow-sm` pada primary & secondary | **tanpa bayangan** |
| Lencana | `rounded-full` (pil) | `rounded` (persegi) |
| Alert | kotak berbingkai penuh | garis kiri 3px |
| Cincin fokus | tiap primitif menulis sendiri | satu utilitas `fokus` |

Bayangan disisakan **hanya** untuk lapisan yang benar-benar mengambang —
dropdown, dialog, toast, palet perintah — lewat token `--shadow-overlay`. Di
sana bayangan menyampaikan informasi; pada kartu ia hanya hiasan yang membuat
aplikasi terbaca sebagai dasbor SaaS generik.

### 4. Sapuan 50 berkas

Codemod sekali pakai memecah tiap daftar kelas menjadi kata, memasangkan
`dark:P-C` dengan kata terang berantai varian sama, lalu menggantinya dengan
satu token.

| | Sebelum | Sesudah |
| --- | --- | --- |
| `slate-*` literal | 1.634¹ | **106** |
| `dark:` literal | 1.084 | **344** |
| CSS hasil build | 86.294 B | **83.698 B** (−3,0%) |

¹ setelah `ui.tsx` dikerjakan tangan lebih dulu; 1.724 sebelum itu.

Sisa 106 terpusat di `landing/index.tsx` (22) dan `fitur.tsx` (8) — keduanya
memakai pita gelap yang memang harus gelap di kedua tema, dan keduanya ditulis
ulang total di 31c.

CSS **mengecil**, dan itu ceknya: kalau token semantik hanya menumpuk di atas
kelas lama alih-alih menggantikannya, angkanya akan naik.

## Dua koreksi selama pengerjaan

**Codemod versi pertama salah dan tidak dipakai.** Baris kembaliannya berbunyi
`q + out.trim() === q ? utuh : …` — presedensi `+` di atas `===` membuat
seluruh kondisinya tidak pernah benar. Pencocokan berbasis regex-langsung juga
gagal pada rantai varian seperti `dark:hover:bg-slate-800`. Ditulis ulang dengan
tokenisasi kelas yang benar.

**Regresi yang tertangkap sebelum ter-commit.** Jalannya codemod yang pertama
memetakan `bg-slate-100` dan `hover:bg-slate-200` ke token yang **sama**
(`surface-muted`), sehingga status hover-nya hilang diam-diam. Tiga kejadian
nyata. Diperbaiki dengan menambah tingkat permukaan ketiga, `surface-active`,
lalu codemod dijalankan ulang dari titik bersih.

Tiga tingkat permukaan diperlukan justru **karena** kartu tidak lagi memakai
bayangan: kedalaman kini hanya bisa disampaikan lewat nilai warna.

## Cacat aksesibilitas yang ikut tertutup

`text-slate-400` dipakai **151 kali tanpa pasangan `dark:`**. Nilainya `#9d9da8`
— di atas putih hanya **2,69:1**, sementara WCAG AA menuntut 4,5:1 untuk teks
kecil. Teks itu antara lain tanggal aktivitas CRM, petunjuk kolom, dan hint pada
combobox.

Seluruhnya kini `text-ink-muted` (`#69718a`), **4,85:1** di terang dan 6,54:1 di
gelap. Ini bukan pergantian nama: 151 potong teks yang sebelumnya gagal standar
kontras kini lulus.

## Gerbang baru: `scripts/sapu-warna.mjs`

Ratchet yang menjaga hasil ini — kelas warna literal boleh **turun**, tidak
boleh naik. Polanya sama dengan `sapu-i18n.mjs`. Dipasang di CI setelah ESLint.

**Dibuktikan bisa gagal:** satu berkas disabotase (`text-ink-muted` dikembalikan
ke `text-slate-500 dark:text-slate-400`), skrip keluar dengan kode 1 dan
menyebut angkanya (`slate-* 110 > 106`), lalu dipulihkan. Mengikuti disiplin
repo sejak Fase 26c: uji yang tidak bisa gagal tidak menjaga apa pun.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 603 | ✅ 603 (shared 282 · web 71 · api 250) |
| `pnpm smoke` | 1.130 | ✅ 1.130 |
| `node scripts/ui-sim.mjs` | 356 | ✅ 356 |
| `sapu-i18n` utang teks | 145 | ✅ 145 |
| `sapu-warna` | — | ✅ **baru** (106 / 344) |

**Total 2.089 pemeriksaan**, plus satu gerbang baru.

Angka uji sengaja tidak naik di sub-fase ini: yang berubah adalah rupa, dan
penjaganya adalah ui-sim (356 asersi menembus 46 rute di peramban nyata) —
bukan uji unit baru yang hanya akan mengulang isi berkas token.
