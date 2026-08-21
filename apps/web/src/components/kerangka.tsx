import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { pick, useLang, type Dual } from "../i18n";
import { PAGE_HEADINGS, type PageHeadingKey } from "../i18n/pageHeadings";
import { Button, cx } from "./ui";

/**
 * Primitif tata letak halaman modul (Fase 38h).
 *
 * ## Kenapa berkas baru, bukan ditambahkan ke `ui.tsx`
 *
 * `ui.tsx` sudah 37 KB dan memegang kontrol atomik — tombol, medan, tabel,
 * lencana. Menambahkan tujuh primitif TATA LETAK ke sana membuatnya berkas yang
 * tidak bisa dibaca siapa pun. Pemisahannya mengikuti garis yang sudah ada:
 * `ui.tsx` menjawab "seperti apa sebuah tombol", berkas ini menjawab "seperti
 * apa sebuah halaman".
 *
 * ## Perubahan alur kerja yang menjadi alasan utamanya
 *
 * Hampir setiap halaman modul hari ini menaruh **formulir pembuatan yang
 * permanen di atas daftar**: helpdesk, aset, kontrak, tiket, dan belasan
 * lainnya. Artinya hal pertama yang dilihat pengguna saat membuka halaman
 * adalah formulir kosong — bukan datanya.
 *
 * Itu sebab terbesar aplikasi ini terbaca sebagai aplikasi lama, dan ia lebih
 * besar daripada warna mana pun. Dua perombakan desain sebelumnya (17a, 18a)
 * mengganti nilai warna dan tidak menyentuh ini sama sekali, yang menjelaskan
 * kenapa keduanya tidak pernah terasa.
 *
 * Keputusan: **data dulu, pembuatan lewat `<Lembar>`** yang dibuka aksi utama
 * halaman. Satu perubahan mekanis, direplikasi ±25 kali.
 *
 * ## Kait uji
 *
 * Tiap primitif membawa atribut `data-*` yang stabil (`data-halaman`,
 * `data-lembar`, `data-filter`, `data-daftar`, `data-detail`,
 * `data-aksi-massal`). Asersi ui-sim mengikat **peran**, bukan markup —
 * sehingga tata letaknya boleh berubah lagi tanpa memecahkan 387 asersi.
 */

// --- Halaman ----------------------------------------------------------------

export function Halaman({
  k,
  judul,
  deskripsi,
  ikon: Ikon,
  aksi,
  filter,
  children,
}: {
  /** Kunci judul dwibahasa dari `PAGE_HEADINGS`. */
  k?: PageHeadingKey;
  /** Judul langsung, bila halaman belum punya entri di `PAGE_HEADINGS`. */
  judul?: Dual;
  deskripsi?: Dual;
  ikon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Aksi utama halaman — biasanya tombol yang membuka `<Lembar>`. */
  aksi?: ReactNode;
  /** Bilah saringan, dirender tepat di bawah judul. */
  filter?: ReactNode;
  children: ReactNode;
}) {
  const lang = useLang();
  // `PAGE_HEADINGS` diketik sebagai objek konstan, jadi sebagian entrinya
  // memang tidak punya `desc`. Diambil lewat pelebaran tipe eksplisit alih-alih
  // `any`: yang dilonggarkan hanya bentuk entrinya, bukan kunci yang boleh
  // dipakai — `PageHeadingKey` tetap menjaga itu.
  const h = k
    ? (PAGE_HEADINGS[k] as { title: Dual; desc?: Dual })
    : undefined;
  const judulTampil = h ? pick(h.title, lang) : judul ? pick(judul, lang) : "";
  const descTampil = h?.desc ? pick(h.desc, lang) : deskripsi ? pick(deskripsi, lang) : "";

  return (
    <div data-halaman="" className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="judul flex items-center gap-2 text-[1.75rem]">
            {Ikon ? <Ikon className="size-6 shrink-0 text-brand-ink" aria-hidden /> : null}
            {judulTampil}
          </h1>
          {descTampil ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{descTampil}</p>
          ) : null}
        </div>
        {/* Aksi utama punya SATU tempat tetap di tiap halaman. Sebelumnya ia
            berada di mana saja: di dalam kartu formulir, di kaki tabel, atau
            tidak ada sama sekali karena formulirnya selalu terbuka. */}
        {aksi ? <div className="flex shrink-0 flex-wrap gap-2">{aksi}</div> : null}
      </header>
      {filter}
      {children}
    </div>
  );
}

// --- Bilah saringan ---------------------------------------------------------

export function BilahFilter({ children }: { children: ReactNode }) {
  return (
    <div
      data-filter=""
      className="flex flex-wrap items-end gap-2 rounded-card border border-line bg-surface p-3"
    >
      {children}
    </div>
  );
}

// --- Lembar (panel geser) ---------------------------------------------------

/**
 * Panel yang menggeser masuk dari kanan, menampung formulir pembuatan dan
 * penyuntingan.
 *
 * Di layar kecil ia menjadi lembar penuh dari bawah — bukan panel sempit yang
 * memaksa formulir menjadi satu kolom sempit di tengah layar.
 *
 * Menutup lewat Escape, klik latar, dan tombol silang. Ketiganya disediakan
 * karena ketiganya adalah kebiasaan yang berbeda, dan pengguna yang terbiasa
 * salah satunya akan merasa terjebak bila hanya dua yang ada.
 */
export function Lembar({
  terbuka,
  tutup,
  judul,
  deskripsi,
  aksi,
  lebar = "sedang",
  children,
}: {
  terbuka: boolean;
  tutup: () => void;
  judul: string;
  deskripsi?: string;
  /** Tombol di kaki lembar — simpan, batal. */
  aksi?: ReactNode;
  lebar?: "sedang" | "lebar";
  children: ReactNode;
}) {
  const lang = useLang();
  const judulId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!terbuka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup();
    };
    document.addEventListener("keydown", onKey);
    // Fokus dipindah ke panel supaya pembaca layar mengumumkan isinya, dan
    // supaya Tab berikutnya masuk ke dalam lembar alih-alih ke halaman di
    // belakangnya yang sudah tidak bisa disentuh.
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [terbuka, tutup]);

  if (!terbuka) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[1px]"
        onClick={tutup}
        aria-hidden
      />
      <div
        ref={panelRef}
        data-lembar=""
        role="dialog"
        aria-modal="true"
        aria-labelledby={judulId}
        tabIndex={-1}
        className={cx(
          "relative flex h-full w-full flex-col border-line bg-surface shadow-overlay outline-none",
          "max-sm:mt-16 max-sm:rounded-t-card max-sm:border-t",
          lebar === "lebar" ? "sm:max-w-3xl" : "sm:max-w-xl",
          "sm:border-l",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={judulId} className="text-base font-semibold text-ink">
              {judul}
            </h2>
            {deskripsi ? <p className="mt-1 text-sm text-ink-muted">{deskripsi}</p> : null}
          </div>
          <button
            type="button"
            onClick={tutup}
            aria-label={pick({ id: "Tutup", en: "Close" }, lang)}
            className="flex size-9 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:fokus"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {aksi ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
            {aksi}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- Daftar + detail --------------------------------------------------------

/**
 * Pola daftar di kiri, detail di kanan.
 *
 * Ditulis tangan dengan tiga cara berbeda di helpdesk, crm, projects,
 * approvals, kontrak, manufaktur, dan maintenance. Perbedaan yang paling
 * merugikan ada di layar kecil: semuanya menumpuk daftar di atas detail,
 * sehingga setelah memilih satu baris pengguna harus menggulir jauh ke bawah
 * untuk melihat hasilnya — dan tidak ada yang memberi tahu bahwa ada yang
 * berubah di sana.
 *
 * Di sini, layar kecil menampilkan SALAH SATU: daftar, atau detail beserta
 * tombol kembali.
 */
export function DaftarDetail({
  daftar,
  detail,
  adaPilihan,
  kembali,
  labelKembali,
}: {
  daftar: ReactNode;
  detail: ReactNode;
  /** `true` bila sebuah baris sedang dipilih. */
  adaPilihan: boolean;
  kembali: () => void;
  labelKembali?: string;
}) {
  const lang = useLang();
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div data-daftar="" className={cx(adaPilihan && "max-lg:hidden")}>
        {daftar}
      </div>
      <div data-detail="" className={cx(!adaPilihan && "max-lg:hidden")}>
        {adaPilihan ? (
          <button
            type="button"
            onClick={kembali}
            className="mb-2 inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink focus-visible:fokus lg:hidden"
          >
            ← {labelKembali ?? pick({ id: "Kembali ke daftar", en: "Back to list" }, lang)}
          </button>
        ) : null}
        {detail}
      </div>
    </div>
  );
}

// --- Bilah aksi massal ------------------------------------------------------

/**
 * Bilah yang muncul saat beberapa baris dipilih.
 *
 * Kemampuan BARU, bukan penyeragaman: sebelum ini tidak ada satu halaman pun
 * yang bisa memproses banyak baris sekaligus, sehingga menyetujui dua belas
 * permintaan berarti dua belas kali membuka dan menutup.
 */
export function BilahAksiMassal({
  jumlah,
  batal,
  children,
}: {
  jumlah: number;
  batal: () => void;
  children: ReactNode;
}) {
  const lang = useLang();
  if (jumlah === 0) return null;
  return (
    <div
      data-aksi-massal=""
      className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-card border border-brand-line bg-surface p-2.5 shadow-overlay"
    >
      <span className="num px-1 text-sm font-semibold text-ink">{jumlah}</span>
      <span className="text-sm text-ink-muted">
        {pick({ id: "baris dipilih", en: "rows selected" }, lang)}
      </span>
      <div className="ml-auto flex flex-wrap gap-2">
        {children}
        <Button variant="ghost" size="sm" onClick={batal}>
          {pick({ id: "Batal", en: "Cancel" }, lang)}
        </Button>
      </div>
    </div>
  );
}

// --- Angka ringkas ----------------------------------------------------------

export type NadaAngka = "netral" | "ok" | "awas" | "galat";

const TINTA: Record<NadaAngka, string> = {
  netral: "text-ink",
  ok: "text-ok-ink",
  awas: "text-awas-ink",
  galat: "text-galat-ink",
};

export function StatBaris({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function KartuAngka({
  label,
  nilai,
  catatan,
  nada = "netral",
}: {
  label: string;
  nilai: string;
  catatan?: string;
  nada?: NadaAngka;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cx("num mt-1.5 text-2xl font-bold leading-tight", TINTA[nada])}>{nilai}</p>
      {catatan ? <p className="mt-1 text-xs text-ink-faint">{catatan}</p> : null}
    </div>
  );
}

// --- Bagan batang -----------------------------------------------------------

/**
 * Bagan batang sederhana, digambar dengan div — bukan SVG tangan.
 *
 * Dashboard dan reports masing-masing menggambar SVG sendiri dengan hasil yang
 * berbeda bentuk dan berbeda warna. Yang di sini dipakai keduanya, dan juga
 * oleh panel `bagan` di kerangka peragaan — sehingga peragaan benar-benar
 * dirakit dari primitif yang sama dengan aplikasinya.
 */
export function BaganBatang({
  seri,
  label,
  tinggi = 120,
}: {
  seri: number[];
  label: string[];
  tinggi?: number;
}) {
  const puncak = Math.max(...seri, 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: tinggi }}>
      {seri.map((n, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-[2px] bg-brand-400 transition-all duration-500"
            style={{ height: `${Math.max((n / puncak) * 100, 3)}%` }}
            title={`${label[i] ?? ""}: ${n.toLocaleString("id-ID")}`}
          />
          <span className="truncate text-[10px] text-ink-faint">{label[i] ?? ""}</span>
        </div>
      ))}
    </div>
  );
}
