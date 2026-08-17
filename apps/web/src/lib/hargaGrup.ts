import { hargaUntukGrup, type SatuanBaris, type SumberHarga } from "@erpindo/shared";
import { useCallback, useState } from "react";
import { api } from "../api/client";

/**
 * Daftar harga grup pelanggan untuk layar transaksi (Fase 23a/23b).
 *
 * **Hook ini tidak memuat satu pun aturan harga.** Seluruhnya ada di
 * `hargaUntukGrup()` di `@erpindo/shared` — fungsi murni yang diuji unit.
 * Yang diurus di sini hanya pengambilan datanya: satu permintaan per pelanggan
 * (atau per grup), bukan satu per baris.
 *
 * Diekstrak pada Fase 23b sebelum polanya disalin ke kasir, pesanan penjualan,
 * penawaran, dan kontrak. Lima salinan aturan yang sama adalah kelas masalah
 * yang berulang kali menggigit repo ini — terakhir di Fase 22f, saat dua
 * definisi "kas" berdampingan di satu layar dan menyebut angka berbeda.
 */
export type HargaGrupState = { nama: string | null; harga: Record<string, number> };

export const GRUP_HARGA_KOSONG: HargaGrupState = { nama: null, harga: {} };

export function useGrupHarga(tenantId: string, aktif = true) {
  const [state, setState] = useState<HargaGrupState>(GRUP_HARGA_KOSONG);

  /** Muat daftar harga milik seorang pelanggan (lewat grupnya). */
  const muat = useCallback(
    async (contactId: string): Promise<HargaGrupState> => {
      if (!aktif || !contactId) {
        setState(GRUP_HARGA_KOSONG);
        return GRUP_HARGA_KOSONG;
      }
      const res = await api.resolvePrices(tenantId, contactId).catch(() => null);
      // Pengambilan gagal → JANGAN pasang nama grupnya. Layar yang menampilkan
      // "Harga Grosir" sambil memakai harga dasar berbohong tentang angka yang
      // sedang ditawarkan, dan itu tak terlihat oleh siapa pun.
      const berikutnya: HargaGrupState = res
        ? { nama: res.groupName ?? null, harga: res.prices ?? {} }
        : GRUP_HARGA_KOSONG;
      setState(berikutnya);
      return berikutnya;
    },
    [tenantId, aktif],
  );

  /**
   * Muat daftar harga sebuah grup langsung, tanpa lewat pelanggan.
   *
   * Dipakai kasir (Fase 23b): layar POS tidak punya pemilih pelanggan sama
   * sekali — `routes/pos.ts` memakai kontak tetap "Pelanggan Umum" — jadi yang
   * dipilih di sana adalah grupnya.
   */
  const muatGrup = useCallback(
    async (groupId: string, namaGrup: string | null): Promise<HargaGrupState> => {
      if (!aktif || !groupId) {
        setState(GRUP_HARGA_KOSONG);
        return GRUP_HARGA_KOSONG;
      }
      const res = await api.priceGroupItems(tenantId, groupId).catch(() => null);
      if (!res) {
        // Alasan sama seperti di `muat()`: tanpa harganya, grupnya tidak boleh
        // diakui di layar.
        setState(GRUP_HARGA_KOSONG);
        return GRUP_HARGA_KOSONG;
      }
      const harga: Record<string, number> = {};
      // Ditulis eksplisit, bukan lewat filter: harga Rp 0 (barang bonus) wajib
      // ikut terbawa. Menyaringnya dengan `if (it.unitPrice)` adalah cacat yang
      // sudah pernah dibuktikan merah di Fase 23a.
      for (const it of res.items) harga[it.productId] = it.unitPrice;
      const berikutnya: HargaGrupState = { nama: namaGrup, harga };
      setState(berikutnya);
      return berikutnya;
    },
    [tenantId, aktif],
  );

  const bersihkan = useCallback(() => setState(GRUP_HARGA_KOSONG), []);

  return { ...state, muat, muatGrup, bersihkan };
}

/**
 * Harga usulan untuk satu baris, dari daftar harga yang sudah dimuat.
 *
 * Fungsi lepas (bukan bagian hook) supaya bisa dipakai di dalam `setState`
 * dengan daftar harga yang BARU diterima — state React belum tentu sudah
 * ter-update di titik itu, dan memakai state lama akan menghitung ulang baris
 * dengan harga pelanggan sebelumnya.
 */
export function hargaBaris(
  harga: Record<string, number>,
  input: { productId: string; hargaDasar: number; satuan?: SatuanBaris; faktor?: number },
): { harga: number; sumber: SumberHarga } {
  return hargaUntukGrup({
    hargaDasar: input.hargaDasar,
    // `in`, bukan `??`: 0 adalah harga yang sah (barang bonus), dan
    // "belum diatur" hanya diwakili oleh ketiadaan kuncinya.
    hargaGrup: input.productId in harga ? harga[input.productId] : null,
    satuan: input.satuan,
    faktor: input.faktor,
  });
}
