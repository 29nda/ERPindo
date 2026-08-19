# Fase 33a — glosarium: satu sumber untuk istilah yang dilihat pengguna

Pemilik menyerahkan panduan gaya naskah dan meminta seluruhnya diterapkan.
Bagian pertamanya menuntut sesuatu yang belum pernah ada di repo ini: **satu
tempat yang memutuskan kata mana yang dipakai**, supaya keputusan berhenti
diulang dari nol tiap kali ada halaman baru.

`docs/glosarium.md` adalah tempat itu. Ia bukan ringkasan panduan gaya —
ia daftar keputusan yang mengikat, dan Fase 33i akan memaksanya lewat
`scripts/sapu-istilah.mjs`.

## Empat keputusan yang diminta pemilik, dan jawabannya

### (a) "Batal" ternyata dua perintah berbeda

Sebelumnya satu kata dipakai untuk dua hal yang **akibatnya jauh berbeda**:

| Kunci | Ditulis | Artinya |
| --- | --- | --- |
| `batal` | Batal | menutup dialog — tidak terjadi apa-apa |
| `batalkan` | **Batalkan Dokumen** | jurnal pembalik permanen, tidak bisa diurungkan |
| `batalkanPesanan` | **Batalkan Pesanan** | membatalkan SO yang belum diproses |

Yang kedua duduk di sebelah yang pertama dalam satu layar. Pengguna yang
mengira ia menutup dialog justru membalik pembukuan.

### (b) "Jumlah" tidak boleh berarti dua hal

Kolom kuantitas dan kolom nilai rupiah sama-sama berjudul "Jumlah" di beberapa
tabel. Diputuskan: **Qty** untuk kuantitas, **Jumlah (Rp)** untuk nilai.

### (c) Kapitalisasi

Sentence case untuk tombol, label, header kolom, empty state, toast.
Title Case **hanya** untuk judul halaman dan nama modul.

### (d) Merek

**ERPindo** di mana pun manusia membacanya. Pengenal teknis (kunci
`localStorage`, cookie, nama berkas unduhan, paket npm, dua nilai kontrak API)
dikecualikan dan didaftar satu per satu — supaya pengecualiannya tidak melar
sendiri nanti.

## Yang juga dicatat: ranjau

Glosarium memuat bagian ranjau, karena istilah yang paling ingin diseragamkan
justru yang paling berbahaya disentuh: **nama akun tersimpan di database tiap
tenant**, dan nama field API bukan naskah. Rinciannya di §5 dan §1(d).

## Validasi

| Gerbang | Hasil |
| --- | --- |
| `periksa-tautan-dokumen` | ✅ 65 tautan di 50 berkas |

Fase ini menambah dokumen saja — tidak ada kode yang berubah, jadi gerbang
lain tidak terpengaruh. Yang menerapkannya adalah 33b dan seterusnya.
