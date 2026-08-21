import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { twMerge } from "tailwind-merge";
import { useLang } from "../i18n";
import { useUi } from "../i18n/ui";
import { PAGE_HEADINGS, type PageHeadingKey } from "../i18n/pageHeadings";

/**
 * Komponen dasar design system ERPindo (gaya shadcn/ui, tanpa dependensi
 * eksternal). Akan dipindah ke packages/ui saat jumlah komponen bertambah.
 */

/**
 * Gabung kelas Tailwind dengan penyelesaian konflik yang benar.
 *
 * Versi sebelumnya hanya menyambung string. Itu terlihat berfungsi, padahal
 * konflik antar-utilitas diselesaikan oleh **urutan CSS**, bukan urutan
 * penulisan — dan Tailwind memancarkan `.h-7 → .h-8 → .h-9 → .h-10` menaik,
 * sehingga nilai terbesar SELALU menang.
 *
 * Akibatnya, sampai Fase 17b, `<Button className="h-8">` tidak berpengaruh
 * sama sekali karena default tombol `h-10` menang. Diukur di Chromium atas CSS
 * hasil build: `h-10 + h-8` → 40px, `h-10 + h-7` → 40px. Ada **96 dari 98**
 * penimpaan tinggi tombol di aplikasi yang mati diam-diam seperti ini — salah
 * satu sebab tampilan terasa longgar.
 *
 * `twMerge` menyelesaikannya di tingkat semantik: kelas belakangan dalam
 * argumen menang atas kelas sebelumnya pada properti yang sama. Karena
 * `className` pemanggil selalu diletakkan TERAKHIR, penimpaan kini benar-benar
 * berlaku.
 */
export function cx(...classes: (string | false | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}

// --- Button -----------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/**
 * Fase 31a — bahasa "garis & permukaan", menggantikan "kartu melayang" 18b.
 *
 * Tiga perubahan bentuk, dan semuanya disengaja:
 *
 * 1. **Tanpa `shadow-sm`.** Bayangan pada kontrol sebaris adalah kebiasaan
 *    dasbor SaaS yang justru membuat aplikasi ini dikenali sebagai produk
 *    lama. Bobot tombol kini datang dari warna dan tepi, bukan ketinggian.
 * 2. **`secondary` memakai `border-line-strong`,** bukan garis lembut yang
 *    nyaris tak terlihat di atas permukaan putih.
 * 3. **Warna disebut lewat peran** (`text-ink`, `bg-surface-muted`), sehingga
 *    tidak ada satu pun varian `dark:` tersisa di sini — temanya diurus token.
 */
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-muted",
  ghost: "text-ink-soft hover:bg-surface-muted hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

/**
 * Skala lapang (Fase 18b) — dinaikkan satu tingkat dari skala rapat 17b.
 *
 * `md` (bawaan) `h-8` → **`h-9`**, dan `lg` `h-10` → **`h-11`** supaya tombol
 * ajakan utama di landing punya bobot yang pantas.
 *
 * `sm` sengaja dinaikkan ke `h-8` — itu tinggi minimum yang masih nyaman
 * disentuh; `xs` (`h-7`) hanya untuk tombol di dalam sel tabel, tempat ruang
 * memang sempit dan aksinya sekunder.
 *
 * Catatan: sejak `cx()` memakai `twMerge` (17b), penimpaan `className="h-…"`
 * dari pemanggil benar-benar berlaku. Sebelum itu 96 dari 98 penimpaan mati.
 */
const buttonSizes = {
  xs: "h-7 px-2.5 text-xs",
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-[15px]",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
}) {
  return (
    <button
      className={cx(
        // Sudut lebih tegas (`rounded-control` = 0.375rem, dari `rounded-lg`
        // 0.5rem) dan satu cincin fokus milik seluruh aplikasi: sebelumnya tiap
        // primitif menulis kombinasi `focus-visible:ring-*` sendiri, sehingga
        // tebal, warna, dan offsetnya berbeda-beda antar komponen.
        "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors focus-visible:fokus disabled:cursor-not-allowed disabled:opacity-60",
        buttonSizes[size],
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
}

// --- Form fields --------------------------------------------------------------

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cx("mb-1.5 block text-xs font-medium text-ink-soft", className)}
      {...props}
    />
  );
}

/**
 * Kolom isian — `placeholder:text-ink-faint`, bukan `text-ink-muted`.
 *
 * Ini bukan pergantian nama belaka. `text-ink-muted` lama bernilai `#9d9da8`,
 * yang di atas putih hanya **2,69:1** — gagal WCAG AA (butuh 4,5:1) dan dipakai
 * 151 kali tanpa pasangan `dark:`. `ink-faint`/`ink-muted` dipilih agar lulus
 * di KEDUA tema; lihat catatan kontras di `styles.css`.
 */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "h-9 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-600 focus:fokus",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "h-9 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink focus:border-brand-600 focus:fokus",
        className
      )}
      {...props}
    />
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{messages[0]}</p>;
}

// --- Card & layout -------------------------------------------------------------

export function Card({
  className,
  hover = false,
  children,
}: {
  className?: string;
  /** Efek angkat halus saat kursor di atas kartu (untuk kartu yang bisa diklik). */
  hover?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        // Fase 31a — kartu TIDAK LAGI MELAYANG.
        //
        // 18b memberi kartu bayangan ambient berlapis supaya "terasa melayang
        // tipis di atas kertas". Justru itulah bentuk yang membuat aplikasi ini
        // terbaca sebagai dasbor SaaS generik. Kini permukaan dipisahkan oleh
        // GARIS: `border-line` tunggal, tanpa blur sama sekali.
        //
        // `hover` juga berhenti memakai bayangan — kartu yang bisa diklik
        // ditandai dengan tepi yang menguat, isyarat yang tetap terbaca bagi
        // pemakai yang mematikan efek dan tidak menggeser tata letak.
        "rounded-card border border-line bg-surface",
        hover && "transition-colors hover:border-line-strong",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  /** ReactNode agar judul bisa memuat lencana/nomor, bukan hanya teks polos. */
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("px-4 py-4 sm:px-5", className)}>{children}</div>;
}

// --- Alert ----------------------------------------------------------------------

export function Alert({
  tone,
  children,
  testId,
}: {
  tone: "info" | "success" | "warning" | "error";
  children: ReactNode;
  /**
   * Fase 23c. `<Alert>` dulu hanya menerima `tone` & `children`, sehingga
   * `data-testid` yang ditulis pemanggil **dibuang diam-diam** — atributnya tak
   * pernah sampai ke DOM dan ceknya mencari elemen yang tidak ada. Ditemukan
   * Fase 23b pada empat testid sekaligus; kelas cacat yang sama persis dengan
   * Fase 17b (prop yang ditulis tetapi tidak pernah dibaca komponennya).
   */
  testId?: string;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    // Fase 17b: tone yang selama ini tidak ada, sehingga peringatan "belum
    // fatal" terpaksa memakai `error` (merah) dan terbaca lebih gawat dari
    // semestinya.
    warning:
      "border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-900 dark:bg-accent-950 dark:text-accent-200",
    error:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  };
  return (
    <div
      data-testid={testId}
      // Fase 31a: garis kiri tebal alih-alih kotak berbingkai penuh. Nadanya
      // terbaca dari satu batang warna di tepi, jadi isinya tetap tenang dan
      // tidak bersaing dengan kartu di sekitarnya.
      className={cx("rounded-control border border-l-[3px] px-3.5 py-2.5 text-sm", tones[tone])}
    >
      {children}
    </div>
  );
}

// --- Tabel ----------------------------------------------------------------------

/**
 * Tabel padat — sebelum Fase 17b komponen ini TIDAK ADA, sehingga `<table>`
 * ditulis tangan **31 kali** dengan dua gaya yang bersaing: header `pb-2 pr-4`
 * (61×) vs `py-2 pr-3` (20×), dan garis baris `border-line` (53×) vs
 * `border-line` (51×). Komponen ini menyatukannya.
 *
 * `Td numeric` memakai utilitas `num` (Fase 17a): font mono + `tabular-nums`,
 * supaya kolom rupiah benar-benar berbaris — hal yang paling terasa di
 * aplikasi akuntansi.
 */
export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="md:overflow-x-auto">
      <table
        className={cx(
          "w-full text-sm max-md:block",
          // `<tbody>` HARUS ikut jadi blok di layar kecil (Fase 18q).
          //
          // Tanpa ini `tbody` tetap `table-row-group`, sehingga baris yang sudah
          // `block` dibungkus tabel anonim yang **menciut ke lebar isinya**.
          // Akibatnya kartu baris tidak memenuhi lebar kartu induknya. Cacat ini
          // ada sejak 18d tapi tidak terlihat: tabel Stok & Manufaktur isinya
          // cukup lebar sehingga kebetulan penuh. Halaman Mata Uang (3 kolom
          // pendek) memperlihatkannya — dan hanya ketahuan dari melihat
          // tangkapan layar, bukan dari asersi.
          //
          // Ditulis sebagai varian arbitrer di sini, bukan komponen `Tbody`
          // baru, supaya seluruh pemanggil yang sudah bermigrasi ikut terbaiki
          // tanpa perlu disentuh satu per satu.
          "max-md:[&>tbody]:block",
          className
        )}
      >
        {children}
      </table>
    </div>
  );
}

/**
 * Kepala tabel — TANPA `uppercase` (Fase 18b).
 *
 * `text-transform` ikut mengubah nilai `innerText`, sehingga judul kolom yang
 * dibaca asersi ui-sim akan terbaca dalam huruf besar semua dan asersinya
 * gagal. Itu persis bug yang memecah F15 pada Fase 17d — mahal dicari karena
 * kodenya terlihat benar dan hanya CSS yang berubah.
 */
export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line-strong text-left text-xs font-semibold tracking-wide text-ink-muted max-md:hidden">
      {children}
    </thead>
  );
}

export function Tr({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <tr
      className={cx(
        "border-b border-line last:border-0",
        // Layar kecil: tiap baris jadi KARTU bertumpuk, bukan digulir mendatar.
        "max-md:mb-2 max-md:block max-md:rounded-card max-md:border max-md:border-line max-md:p-3 max-md:last:mb-0 max-md:last:border",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function Th({
  numeric = false,
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th className={cx("px-3 py-2.5 font-medium", numeric && "text-right", className)} {...props}>
      {children}
    </th>
  );
}

export function Td({
  numeric = false,
  className,
  label,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  numeric?: boolean;
  /**
   * Judul kolom, ditampilkan HANYA di layar kecil (saat baris menumpuk jadi
   * kartu dan `<thead>` disembunyikan). Isinya sengaja diminta ulang dari
   * pemanggil, bukan disimpulkan otomatis dari `<Th>`: menyimpulkannya berarti
   * menebak-nebak pasangan kolom, dan diam-diam salah begitu ada `colSpan`.
   *
   * Sel tanpa `label` (mis. kolom aksi) tetap muncul, hanya tanpa judul.
   */
  label?: ReactNode;
}) {
  return (
    <td
      className={cx(
        "px-3 py-2.5",
        numeric && "num text-right",
        // Layar kecil: label di kiri, nilai di kanan, dalam satu baris.
        "max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1 max-md:text-left",
        className
      )}
      {...props}
    >
      {label ? (
        <span className="hidden shrink-0 text-xs font-medium text-ink-muted max-md:inline">
          {label}
        </span>
      ) : null}
      <span className={cx("max-md:min-w-0", numeric && "max-md:num")}>{children}</span>
    </td>
  );
}

export function Spinner() {
  const u = useUi();
  return (
    <span
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      role="status"
      aria-label={u("memuat")}
    />
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "brand" | "amber" | "red" | "green";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-surface-muted text-ink-soft",
    brand: "bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    red: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  };
  return (
    <span
      className={cx(
        // `rounded-full` → `rounded`: lencana persegi terbaca sebagai penanda
        // data, bukan pil pemasaran. Perbedaan kecil yang muncul ratusan kali.
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

// --- Skeleton & empty state ---------------------------------------------------------

/** Placeholder berkilau saat data dimuat — pengganti spinner untuk konten berbentuk. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded bg-surface-muted", className)} />;
}

/** Keadaan kosong yang ramah: ikon besar + judul + penjelasan (+ aksi opsional). */
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-control border border-line bg-surface-sunken text-ink-faint">
        {icon}
      </div>
      <div className="text-sm font-medium text-ink">{title}</div>
      {description ? <p className="max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {children}
    </div>
  );
}

// --- SearchSelect (combobox typeahead) ------------------------------------------------

export type SearchSelectOption = { value: string; label: string; hint?: string };

/**
 * Combobox ringan untuk data berskala: opsi di-fetch saat mengetik (debounce),
 * bukan dirender semua — produk ke-501+ tetap bisa dipilih. Keyboard: ↑/↓
 * memindah sorotan, Enter memilih, Escape menutup.
 */
export function SearchSelect({
  id,
  value,
  valueLabel,
  placeholder,
  disabled,
  fetchOptions,
  onSelect,
}: {
  id?: string;
  /** Nilai terpilih saat ini ("" bila belum ada). */
  value: string;
  /** Label nilai terpilih — ditampilkan saat combobox tertutup. */
  valueLabel: string;
  placeholder?: string;
  disabled?: boolean;
  /** Dipanggil (ter-debounce) dengan teks pencarian; kembalikan daftar opsi. */
  fetchOptions: (q: string) => Promise<SearchSelectOption[]>;
  onSelect: (option: SearchSelectOption) => void;
}) {
  const u = useUi();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const fetchRef = useRef(fetchOptions);
  fetchRef.current = fetchOptions;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const seq = setTimeout(async () => {
      try {
        const opts = await fetchRef.current(query.trim());
        setOptions(opts);
        setHighlight(0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(seq);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  function choose(opt: SearchSelectOption) {
    onSelect(opt);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={value ? undefined : (placeholder ?? u("cpKetikCari"))}
        value={open ? query : valueLabel}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          if (!open) setOpen(true);
          setQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, options.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const opt = options[highlight];
            if (opt) choose(opt);
          }
        }}
      />
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-control bg-surface-raised py-1 shadow-overlay">
          {loading ? (
            <div className="px-3 py-2 text-sm text-ink-muted">{u("cpMencari")}</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-ink-muted">
              {u("cpTakAdaHasil")}
            </div>
          ) : (
            options.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                className={cx(
                  "flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm",
                  i === highlight
                    ? "bg-brand-50 text-brand-800 dark:bg-brand-600/20 dark:text-brand-100"
                    : "text-ink-soft hover:bg-surface-muted",
                  opt.value === value && "font-semibold"
                )}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(opt)}
              >
                <span className="truncate">{opt.label}</span>
                {opt.hint ? (
                  <span className="shrink-0 text-xs text-ink-muted">{opt.hint}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

// --- ConfirmDialog ------------------------------------------------------------------

/**
 * Dialog konfirmasi berbrand — pengganti window.confirm untuk aksi berisiko
 * (arsip, batalkan dokumen, tutup buku, pelepasan aset, nonaktif 2FA).
 * Render selalu; kontrol lewat prop `open`. Escape/klik backdrop = batal.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const u = useUi();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-card bg-surface-raised p-5 shadow-overlay">
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <div className="mt-2 text-sm text-ink-soft">{description}</div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel ?? u("cpBatal")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner /> : null}
            {confirmLabel ?? u("cpYaLanjutkan")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Toast ------------------------------------------------------------------------

type Toast = { id: number; tone: "success" | "error"; message: string };
const ToastContext = createContext<(tone: Toast["tone"], message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto rounded-control px-4 py-2.5 text-sm font-medium text-white shadow-overlay",
              t.tone === "success" ? "bg-emerald-600" : "bg-red-600"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// --- Dark mode ----------------------------------------------------------------------

/**
 * Tema gelap/terang.
 *
 * Fase 17a mengubah dua hal:
 *  1. **Gelap-dulu** — tanpa preferensi tersimpan, aplikasi tampil gelap.
 *     Nilai awal dibaca dari kelas `.dark` yang sudah dipasang skrip anti-FOUC
 *     di `index.html`, jadi state React dan DOM tidak pernah berselisih saat
 *     muat pertama.
 *  2. **Tanpa efek samping saat render** — versi lama memanggil
 *     `document.documentElement.classList.toggle(...)` langsung di badan hook.
 *     Itu tidak aman untuk React 19 (render bisa diulang/dibuang), jadi
 *     dipindah ke `useEffect`.
 *
 * Hook ini dipanggil di tiga tempat terpisah (shell aplikasi, landing,
 * panduan) tanpa context bersama; sinkronisasinya lewat `localStorage` + kelas
 * pada `documentElement`, dan efek di bawah menjaga keduanya tetap sejalan.
 */
export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });

  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d;
      try {
        localStorage.setItem("erpindo-theme", next ? "dark" : "light");
      } catch {
        /* mode privat / kuota penuh — tema tetap berlaku untuk sesi ini */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  return { dark, toggle };
}

// --- Wordmark ERPindo (Fase 10a) ------------------------------------------------------

/**
 * Wordmark ERPindo — digambar, bukan gambar (Fase 32a).
 *
 * ## Kenapa berganti bentuk
 *
 * Logo lama adalah PNG gradien biru elektrik (#002060 → #0058e0) dengan
 * segitiga cyan. Setelah palet berpindah ke krem hangat + tanah liat, biru
 * murni di atas krem terbaca sebagai dua merek yang kebetulan bertetangga —
 * pemilik memilih logonya ikut dirancang ulang.
 *
 * Kini digambar sebagai teks, bukan raster, dan itu membawa tiga hal sekaligus:
 *
 * 1. **Ikut tema.** Warnanya `currentColor`/token, jadi versi terang & gelap
 *    tidak lagi perlu dua berkas PNG yang harus diregenerasi tiap ganti palet.
 * 2. **Tajam di segala ukuran** — termasuk retina dan cetak faktur.
 * 3. **Bisa dibaca mesin.** Nama merek kini benar-benar teks di DOM, bukan
 *    `alt` pada gambar.
 *
 * "ERP" memakai serif editorial yang sama dengan judul halaman; "indo" memakai
 * sans dengan bobot ringan. Kontrasnya sengaja: gabungan serif+sans dalam satu
 * wordmark memberi karakter tanpa perlu simbol tambahan, dan simbol tambahan
 * justru yang membuat logo lama sulit dipakai di ukuran kecil.
 */
export function BrandWordmark({ className = "h-8" }: { className?: string }) {
  return (
    <span
      className={cx("inline-flex select-none items-baseline leading-none", className)}
      // Ukuran ikut tinggi wadah supaya pemanggil lama (`h-7`, `h-8`) tidak
      // perlu diubah — sebelumnya tinggi datang dari <img className="h-full">.
      style={{ fontSize: "0.72em" }}
      // Penanda uji, BUKAN `aria-label`. Sejak wordmark menjadi teks sungguhan,
      // `aria-label="ERPindo"` justru MENIMPA isi yang dibaca pembaca layar —
      // ia mengulang apa yang sudah ada di DOM sambil membuang struktur
      // aslinya. Penyapu i18n juga menghitungnya sebagai teks tampilan di
      // atribut, dan itu benar: nama merek di atribut adalah bentuk yang sama
      // dengan teks tak-tersapu, hanya kebetulan tidak perlu diterjemahkan.
      data-wordmark=""
    >
      <span className="judul text-[1.35em] tracking-tight text-ink">ERP</span>
      <span className="text-[1.28em] font-light tracking-tight text-brand-600 dark:text-brand-400">
        indo
      </span>
    </span>
  );
}

// --- Tabs: bilah tab bersama (Fase 10g) -----------------------------------------------

/** Bilah tab beraksesibilitas (role=tablist) — difaktorkan dari pola hand-rolled
 *  di approvals.tsx. Terkontrol: induk menyimpan `active` & menangani `onChange`. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap gap-1.5 border-b border-line",
        className
      )}
      role="tablist"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
            active === t.key
              ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300"
              : "border-transparent text-ink-muted hover:text-ink"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// --- PageTour: tur per halaman (Fase 10f) ---------------------------------------------

/** Satu langkah tur: sorot elemen `selector` (bila ada) + judul & isi. Tanpa
 *  selector (atau bila elemen tak ditemukan), kartu tampil di tengah layar. */
export type TourStep = { selector?: string; title: string; body: string };

const TOUR_KEY_PREFIX = "erpindo-tour:";

export function tourSeen(id: string): boolean {
  try {
    return localStorage.getItem(TOUR_KEY_PREFIX + id) === "1";
  } catch {
    return true; // localStorage tak tersedia → anggap sudah dilihat (jangan ganggu)
  }
}

export function markTourSeen(id: string): void {
  try {
    localStorage.setItem(TOUR_KEY_PREFIX + id, "1");
  } catch {
    /* abaikan */
  }
}

/**
 * Tur berpandu homegrown (tanpa lib): overlay spotlight yang dihitung dari
 * getBoundingClientRect elemen sasaran, tooltip berisi judul/isi, tombol
 * Kembali/Lanjut/Selesai, dan Escape untuk menutup. Menutup menandai tur ini
 * "sudah dilihat" (localStorage) agar tidak muncul otomatis lagi.
 */
export function PageTour({
  id,
  steps,
  open,
  onClose,
}: {
  id: string;
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const u = useUi();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  const step = open ? steps[i] : undefined;

  const finish = useCallback(() => {
    markTourSeen(id);
    onClose();
  }, [id, onClose]);

  // Ukur elemen sasaran; coba beberapa frame bila elemen terlambat mount.
  useEffect(() => {
    if (!open || !step) return;
    let raf = 0;
    let tries = 0;
    const measure = () => {
      const el = step.selector ? document.querySelector(step.selector) : null;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
        if (step.selector && tries < 8) {
          tries += 1;
          raf = requestAnimationFrame(measure);
        }
      }
    };
    raf = requestAnimationFrame(measure);
    const remeasure = () => {
      const el = step.selector ? document.querySelector(step.selector) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [open, step, i]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || !step) return null;

  const last = i === steps.length - 1;
  const next = () => (last ? finish() : setI((n) => Math.min(n + 1, steps.length - 1)));
  const prev = () => setI((n) => Math.max(n - 1, 0));

  // Posisi kartu tooltip: di bawah sasaran bila muat, jika tidak di atasnya;
  // tanpa sasaran → tengah layar.
  const CARD_W = 320;
  let cardStyle: CSSProperties = {};
  let centered = false;
  if (rect) {
    const vw = window.innerWidth;
    const belowTop = rect.bottom + 12;
    const placeAbove = belowTop + 200 > window.innerHeight && rect.top - 12 > 200;
    const left = Math.min(Math.max(rect.left, 12), vw - CARD_W - 12);
    cardStyle = placeAbove
      ? { position: "fixed", left, bottom: window.innerHeight - rect.top + 12, width: CARD_W }
      : { position: "fixed", left, top: belowTop, width: CARD_W };
  } else {
    centered = true;
  }

  const card = (
    <div
      className="pointer-events-auto rounded-card bg-surface-raised p-4 shadow-overlay"
      style={centered ? { width: CARD_W } : cardStyle}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
          Tur · {i + 1}/{steps.length}
        </span>
        <button
          onClick={finish}
          className="text-ink-muted hover:text-ink"
          aria-label={u("cpTutupTur")}
        >
          ✕
        </button>
      </div>
      <h3 className="mt-1.5 text-base font-semibold tracking-tight text-ink">
        {step.title}
      </h3>
      <p className="mt-1 text-sm text-ink-soft">{step.body}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={finish}
          className="text-xs text-ink-muted hover:text-ink"
        >
          Lewati
        </button>
        <div className="flex gap-2">
          {i > 0 ? (
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={prev}>
              Kembali
            </Button>
          ) : null}
          <Button className="h-8 px-3 text-xs" onClick={next}>
            {last ? "Selesai" : "Lanjut"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60]">
      {rect ? (
        <>
          {/* Spotlight: kotak transparan di atas sasaran dengan bayangan gelap besar. */}
          <div
            className="pointer-events-none fixed rounded-control ring-2 ring-brand-500"
            style={{
              left: rect.left - 6,
              top: rect.top - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 0 9999px rgba(15,23,42,0.6)",
            }}
          />
          <div className="pointer-events-none fixed inset-0">{card}</div>
        </>
      ) : (
        <>
          <div className="fixed inset-0 bg-slate-950/60" onClick={finish} aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">{card}</div>
        </>
      )}
    </div>
  );
}

/**
 * Judul + paragraf pengantar halaman modul, mengikuti bahasa aktif (Fase 16a).
 * Teksnya diambil dari kamus `PAGE_HEADINGS` agar seluruh halaman konsisten
 * dwibahasa — sebelumnya tiap halaman menulis <h1>/<p> berbahasa Indonesia
 * sendiri walau menu sidebar sudah mengikuti bahasa aktif.
 */
export function PageHeading({ k }: { k: PageHeadingKey }) {
  const lang = useLang();
  const h = PAGE_HEADINGS[k];
  const desc = "desc" in h ? h.desc[lang] : "";
  // Fragment (bukan <div>) agar h1 & p tetap anak langsung kontainer halaman —
  // jarak vertikalnya persis sama seperti sebelum diekstrak.
  return (
    <>
      {/* Fase 32d: judul halaman memakai serif editorial, sesuai keputusan
          pemilik ("landing DAN judul halaman"). Hanya `h1` — kepala kartu
          (`CardHeader`) tetap sans, karena serif di sana merembet ke seluruh
          layar kerja dan justru melawan kepadatan yang dipilih untuk aplikasi. */}
      <h1 className="judul text-[1.75rem]">{h.title[lang]}</h1>
      <p className="mt-1 text-sm text-ink-muted">{desc}</p>
    </>
  );
}
