import { useEffect, useState } from "react";
import { ArrowRight, BookText, Boxes, LineChart, Percent, Receipt } from "lucide-react";
import { pick, useLang, type Dual } from "../../i18n";
import { kurangiGerak } from "../../lib/gerak";
import { BARIS_JURNAL, T } from "./pertunjukanTeks";

/**
 * Hero "pertunjukan" (Fase 35a) — layar pertama MENUNJUKKAN produknya bekerja,
 * bukan menjelaskannya.
 *
 * ## Kenapa komponen ini ada
 *
 * Pemilik menilai halaman depan membosankan sampai ia sendiri tidak tertarik.
 * Dua fase sebelumnya (32e, 34a) memperbaiki KALIMATNYA — kejernihan lalu ragam
 * bahasa — dan keduanya tidak menjawab keluhan itu, karena keluhannya bukan
 * tentang kalimat.
 *
 * Layar pertama yang lama berisi enam blok teks bertumpuk lalu satu tangkapan
 * layar mati di bawah lipatan. Ia MENGAKU "catat sekali, sisanya otomatis" —
 * dan pengunjung diminta mempercayainya begitu saja.
 *
 * Padahal klaim itu satu-satunya klaim di seluruh halaman yang **bisa
 * diperagakan**. Jadi diperagakan: satu faktur diposting, lalu jurnal, stok,
 * laba rugi, dan PPN terisi sendiri satu per satu di depan mata.
 *
 * ## Angkanya benar, dan itu bagian dari maksudnya
 *
 * Jurnalnya double-entry sungguhan dan SEIMBANG:
 *
 *   Debit  : Piutang Usaha 1.665.000 + HPP 900.000        = 2.565.000
 *   Kredit : Pendapatan 1.500.000 + PPN 165.000 + Persediaan 900.000 = 2.565.000
 *
 * HPP 900.000 berasal dari 10 × biaya rata-rata 90.000, dan stoknya turun
 * 40 → 30. Angka karangan akan langsung terlihat oleh pembeli yang paham
 * pembukuan — dan merekalah yang paling menentukan keputusan membeli.
 *
 * ## Aksesibilitas
 *
 * Seluruh isi SELALU ada di DOM; animasi hanya menyingkapnya. Pembaca layar
 * dan perayap mendapatkan teks lengkap tanpa menunggu, dan
 * `prefers-reduced-motion` menampilkan semuanya sekaligus tanpa gerak.
 */



/** Berapa lama tiap langkah bertahan sebelum langkah berikutnya menyala. */
const JEDA_MS = 900;
/** Langkah 0 mengisi faktur; 1 menekan Posting; 2–5 menyalakan tiap kartu. */
const LANGKAH_TERAKHIR = 5;
/** Jeda tambahan sebelum peragaan diulang dari awal. */
const JEDA_ULANG_MS = 2600;

function useLangkah(): number {
  const [langkah, setLangkah] = useState(0);

  useEffect(() => {
    if (kurangiGerak()) {
      // Tampilkan hasil akhirnya sekaligus: pengguna yang meminta lebih sedikit
      // gerak tetap berhak melihat SELURUH isinya, bukan versi terpotong.
      setLangkah(LANGKAH_TERAKHIR);
      return;
    }
    let batal = false;
    let timer: ReturnType<typeof setTimeout>;
    const maju = (n: number) => {
      if (batal) return;
      setLangkah(n);
      timer = setTimeout(
        () => maju(n >= LANGKAH_TERAKHIR ? 0 : n + 1),
        n >= LANGKAH_TERAKHIR ? JEDA_ULANG_MS : JEDA_MS,
      );
    };
    timer = setTimeout(() => maju(1), JEDA_MS);
    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, []);

  return langkah;
}

/** Kartu hasil yang menyala pada langkah tertentu. */
function Kartu({
  aktif,
  ikon: Ikon,
  judul,
  children,
}: {
  aktif: boolean;
  ikon: typeof BookText;
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-card border bg-surface p-4 transition-all duration-500 ${
        aktif
          ? "border-brand-line opacity-100 shadow-card"
          : "border-line opacity-40"
      }`}
      style={{ transform: aktif ? "none" : "translateY(6px)" }}
    >
      <div className="flex items-center gap-2">
        <Ikon
          className={`size-4 shrink-0 transition-colors ${aktif ? "text-brand-ink" : "text-ink-faint"}`}
          aria-hidden
        />
        <span className="text-[13px] font-semibold text-ink">{judul}</span>
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

export function PertunjukanHero() {
  const lang = useLang();
  const langkah = useLangkah();
  const u = (d: Dual) => pick(d, lang);
  const terisi = langkah >= 1;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      {/* --- Kiri: faktur yang diposting ------------------------------------ */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Receipt className="size-4 text-brand-ink" aria-hidden />
          <span className="text-[13px] font-semibold text-ink">{u(T.labelFaktur)}</span>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-ink-faint">{u(T.pelanggan)}</dt>
            <dd
              className="mt-0.5 font-medium text-ink transition-opacity duration-500"
              style={{ opacity: terisi ? 1 : 0.25 }}
            >
              {u(T.namaPelanggan)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-ink-faint">{u(T.barang)}</dt>
            <dd
              className="mt-0.5 transition-opacity duration-500"
              style={{ opacity: terisi ? 1 : 0.25 }}
            >
              <span className="font-medium text-ink">{u(T.namaBarang)}</span>
              <span className="num ml-2 text-ink-muted">{u(T.qtyHarga)}</span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="text-ink-muted">{u(T.ppn)}</dt>
            <dd className="num text-ink" style={{ opacity: terisi ? 1 : 0.25 }}>
              Rp 165.000
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="font-semibold text-ink">{u(T.total)}</dt>
            <dd
              className="num text-lg font-bold text-ink transition-opacity duration-500"
              style={{ opacity: terisi ? 1 : 0.25 }}
            >
              Rp 1.665.000
            </dd>
          </div>
        </dl>

        {/* Tombol peraga — BUKAN tombol sungguhan. `aria-hidden` + `tabIndex`
            negatif supaya pembaca layar dan penekan Tab tidak menemukan kontrol
            palsu yang tidak melakukan apa pun. */}
        <div
          aria-hidden
          className={`mt-5 flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
            langkah >= 1
              ? "bg-brand-600 text-white shadow-sm"
              : "bg-surface-muted text-ink-faint"
          }`}
          style={{ transform: langkah === 1 ? "scale(0.97)" : "scale(1)" }}
        >
          {u(T.tombolPosting)}
          <ArrowRight className="size-4" aria-hidden />
        </div>
      </div>

      {/* --- Kanan: yang terisi sendiri ------------------------------------- */}
      <div>
        <p className="mb-3 flex flex-wrap items-baseline gap-x-2 text-[13px]">
          <span className="font-semibold text-ink">{u(T.sekaliCatat)}</span>
          <span className="text-ink-muted">{u(T.lalu)}</span>
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Kartu aktif={langkah >= 2} ikon={BookText} judul={u(T.jurnal)}>
            <table className="w-full text-[12px]">
              <tbody>
                {BARIS_JURNAL.map((b) => (
                  <tr key={b.akun.id}>
                    <td className="py-0.5 pr-2 text-ink-muted">{u(b.akun)}</td>
                    <td className="num py-0.5 text-right text-ink">{b.debit ?? ""}</td>
                    <td className="num py-0.5 pl-2 text-right text-ink">{b.kredit ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 border-t border-line pt-1.5 text-[11px] font-medium text-accent-ink">
              {u(T.seimbang)} · 2.565.000
            </p>
          </Kartu>

          <Kartu aktif={langkah >= 3} ikon={Boxes} judul={u(T.stok)}>
            <p className="text-[13px] text-ink">{u(T.stokBarang)}</p>
            <p className="num mt-1 text-lg font-bold text-ink">{u(T.stokTurun)}</p>
            <p className="mt-1 text-[11px] text-ink-muted">{u(T.stokCatatan)}</p>
          </Kartu>

          <Kartu aktif={langkah >= 4} ikon={LineChart} judul={u(T.labaRugi)}>
            <dl className="space-y-1 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">{u(T.lrPendapatan)}</dt>
                <dd className="num text-ink">+1.500.000</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">{u(T.lrHpp)}</dt>
                <dd className="num text-ink">−900.000</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-semibold">
                <dt className="text-ink">{u(T.lrLaba)}</dt>
                <dd className="num text-accent-ink">+600.000</dd>
              </div>
            </dl>
          </Kartu>

          <Kartu aktif={langkah >= 5} ikon={Percent} judul={u(T.pajak)}>
            <p className="text-[12px] text-ink-muted">{u(T.pajakBaris)}</p>
            <p className="num mt-1 text-lg font-bold text-ink">Rp 165.000</p>
            <p className="mt-1 text-[11px] text-ink-muted">{u(T.pajakCatatan)}</p>
          </Kartu>
        </div>
      </div>
    </div>
  );
}
