# Persetujuan Pembelian

Kontrol pengeluaran: pembelian oleh Admin di atas ambang nominal harus disetujui Owner sebelum diposting.

> Buka di aplikasi: `/app/persetujuan`

## Cara kerjanya

1. Owner mengatur ambang (mis. Rp 5.000.000) di halaman Persetujuan.
2. Pembelian Admin di bawah ambang langsung diposting; di atasnya masuk antrean menunggu.
3. Owner menyetujui (transaksi diposting persis seperti diajukan) atau menolak dengan alasan.

**Batas wewenang yang dijalankan sistem**

Pengeluaran di atas batas tertentu tidak bisa diposting sebelum disetujui orang yang berwenang. Aturannya ditulis sekali, lalu berlaku pada tiap dokumen tanpa siapa pun perlu mengingatnya.

1. Aturan batas wewenang ditulis sekali di pengaturan.
2. Permintaan di atas batas berhenti di antrean, bukan lolos diam-diam.
3. Penyetuju memutuskan.
4. Keputusannya tercatat, termasuk bila ditolak.
