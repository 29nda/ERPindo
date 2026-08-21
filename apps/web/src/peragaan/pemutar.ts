import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useKurangiGerak, useTabTerlihat, useTerlihat } from "../lib/gerak";
import { langgananAntrean, lepasSlot, memegangSlot, mintaSlot } from "./antrean";
import {
  bingkaiAkhir,
  bingkaiPada,
  DURASI_ULANG,
  durasiLangkah,
  indeksAkhir,
  type Bingkai,
} from "./mesin";
import type { Naskah } from "./tipe";

/**
 * Pemutar peragaan (Fase 38a) — satu-satunya tempat yang memegang timer.
 *
 * Tiga gerbang menentukan apakah sebuah peragaan berjalan, dan ketiganya harus
 * terbuka: peragaannya terlihat, tabnya terlihat, dan ia memegang salah satu
 * dari dua slot antrean global. Pengguna yang meminta lebih sedikit gerak
 * melewati semuanya — ia langsung menerima bingkai akhir, dan tidak satu pun
 * timer dibuat.
 */

/** Berapa kali `maju` diperbarui selama satu langkah ketikan. */
const DETAK_KETIK = 10;

export type OpsiPemutar = {
  /**
   * Berhenti di keadaan akhir alih-alih mengulang, menimpa `naskah.sekaliJalan`.
   *
   * Ada sebagai OPSI PEMUTAR, bukan hanya sifat naskah, karena naskah yang sama
   * dipakai di dua tempat dengan kebutuhan berlawanan (Fase 38f). Di halaman
   * jualan, pengulangan justru yang membuat pengunjung yang baru menggulir
   * sampai situ ikut melihatnya. Di panduan, pembaca sedang mencocokkan
   * layarnya sendiri dengan yang di dokumen, dan gerak yang terus berulang
   * mengganggu pekerjaan itu.
   *
   * Menaruhnya di naskah akan memaksa dua salinan naskah yang sama.
   */
  sekaliJalan?: boolean;
};

export function usePemutar(
  naskah: Naskah,
  ref: RefObject<Element | null>,
  opsi: OpsiPemutar = {},
): Bingkai & { selesai: boolean; ulangi: () => void } {
  const kurangi = useKurangiGerak();
  const terlihat = useTerlihat(ref);
  const tabTerlihat = useTabTerlihat();
  const id = useId();

  const [{ indeks, maju }, setPosisi] = useState({ indeks: -1, maju: 1 });
  const [punyaSlot, setPunyaSlot] = useState(false);
  // Bertambah tiap kali pemutar diminta mengulang dari awal, supaya efek timer
  // di bawah terpasang ulang — tanpa ini tombol "Putar ulang" tidak berbunyi
  // pada peragaan yang sudah berhenti.
  const [putaran, setPutaran] = useState(0);

  const boleh = terlihat && tabTerlihat && !kurangi;

  // --- Antrean -------------------------------------------------------------
  useEffect(() => {
    if (!boleh) {
      lepasSlot(id);
      setPunyaSlot(false);
      return;
    }
    mintaSlot(id);
    setPunyaSlot(memegangSlot(id));
    const batal = langgananAntrean(() => setPunyaSlot(memegangSlot(id)));
    return () => {
      batal();
      lepasSlot(id);
    };
  }, [boleh, id]);

  // --- Timer ---------------------------------------------------------------
  //
  // Disimpan di ref supaya perubahan `indeks` tidak memasang ulang efeknya —
  // memasang ulang tiap langkah akan membuat langkah pertama dijadwalkan dua
  // kali, dan peragaan tersendat di awal tanpa sebab yang terlihat.
  const posisiRef = useRef({ indeks: -1, maju: 1 });
  posisiRef.current = { indeks, maju };

  useEffect(() => {
    if (!punyaSlot) return;

    const akhir = indeksAkhir(naskah);
    if (akhir < 0) return;

    let batal = false;
    let timer: ReturnType<typeof setTimeout>;

    const jadwalkan = (ms: number, lanjut: () => void) => {
      timer = setTimeout(() => {
        if (!batal) lanjut();
      }, ms);
    };

    const majukan = () => {
      const kini = posisiRef.current.indeks;

      if (kini >= akhir) {
        if (opsi.sekaliJalan ?? naskah.sekaliJalan) return;
        jadwalkan(DURASI_ULANG, () => {
          setPosisi({ indeks: 0, maju: 1 });
          majukan();
        });
        return;
      }

      const berikut = kini + 1;
      const langkah = naskah.langkah[berikut]!;
      const durasi = durasiLangkah(naskah, berikut);

      if (langkah.aksi === "ketik") {
        // Ketikan perlu kemajuan di DALAM langkah, supaya hurufnya bertambah
        // satu per satu alih-alih muncul sekaligus di akhir.
        let detak = 0;
        setPosisi({ indeks: berikut, maju: 0 });
        const detakkan = () => {
          detak += 1;
          if (detak >= DETAK_KETIK) {
            setPosisi({ indeks: berikut, maju: 1 });
            majukan();
            return;
          }
          setPosisi({ indeks: berikut, maju: detak / DETAK_KETIK });
          jadwalkan(durasi / DETAK_KETIK, detakkan);
        };
        jadwalkan(durasi / DETAK_KETIK, detakkan);
        return;
      }

      setPosisi({ indeks: berikut, maju: 1 });
      jadwalkan(durasi, majukan);
    };

    jadwalkan(durasiLangkah(naskah, Math.max(posisiRef.current.indeks, 0)), majukan);

    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [punyaSlot, naskah, putaran, opsi.sekaliJalan]);

  const sekaliJalan = opsi.sekaliJalan ?? naskah.sekaliJalan ?? false;
  const ulangi = () => {
    setPosisi({ indeks: -1, maju: 1 });
    setPutaran((n) => n + 1);
  };

  if (kurangi) return { ...bingkaiAkhir(naskah), selesai: true, ulangi };
  return {
    ...bingkaiPada(naskah, indeks, maju),
    selesai: sekaliJalan && indeks >= indeksAkhir(naskah),
    ulangi,
  };
}
