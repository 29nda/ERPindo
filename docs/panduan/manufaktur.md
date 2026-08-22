# Manufaktur & QC

Untuk yang memproduksi barang: resep (Bill of Materials), perintah produksi yang mengubah bahan menjadi barang jadi dengan biaya gabungan, plus inspeksi mutu.

> Buka di aplikasi: `/app/manufaktur`

## BoM → produksi → QC

1. Definisikan BoM: komponen & jumlahnya untuk menghasilkan sekian unit barang jadi.
2. Buat perintah produksi → Selesaikan: stok bahan keluar, barang jadi masuk dengan biaya gabungan bahan.
3. Inspeksi QC: luluskan hasil produksi, atau karantina ke gudang terpisah bila bermasalah.

**Bahan berkurang, barang jadi bertambah, modalnya terhitung**

Perintah kerja memakai daftar bahan yang sudah ditetapkan. Saat selesai, bahan berkurang, barang jadi bertambah, dan harga pokoknya tersusun dari bahan beserta biaya olahnya.

1. Perintah kerja memakai daftar bahan yang sudah ditetapkan.
2. Bahan berpindah menjadi barang jadi lewat satu jurnal yang seimbang.
3. Modal per kemasan terhitung, jadi harga jualnya bisa ditetapkan dari angka, bukan dari perkiraan.
