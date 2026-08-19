import { type ApiMembership, type MeResponse, type PermissionKey } from "@erpindo/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Calculator,
  ChevronDown,
  CircleHelp,
  BookOpen,
  BookText,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Combine,
  Compass,
  Contact,
  Factory,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Coins,
  Hourglass,
  Landmark,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  UploadCloud,
  LineChart,
  ListTree,
  LogOut,
  Menu,
  Moon,
  Package,
  PackageSearch,
  PenLine,
  Percent,
  PiggyBank,
  Receipt,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sigma,
  Store,
  Sun,
  Target,
  Wrench,
  Tags,
  UsersRound,
  Wallet,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState,  } from "react";
import { api, ApiRequestError,  } from "../api/client";
import { useLang } from "../i18n";
import { LangSwitcher } from "../i18n/LangSwitcher";
import { dalamTenggang, sisaTenggang } from "../lib/tenggang";
import { useUi } from "../i18n/ui";
import {
  Alert,
  BrandWordmark,
  Badge,
  Button,
  cx,
  PageTour,
  Spinner,
  tourSeen,
  useDarkMode,
} from "../components/ui";
import { Asisten } from "../components/asisten";
import { PaletPerintah } from "../components/palet";
import { AUTO_TOUR_IDS, tourForPath } from "../tours";

// ---------------------------------------------------------------------------
// Konteks workspace: user + tenant aktif (tenant pertama untuk Fase 0)
// ---------------------------------------------------------------------------

type Workspace = { me: MeResponse; tenant: ApiMembership };
const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const ws = useContext(WorkspaceContext);
  if (!ws) throw new Error("WorkspaceContext belum tersedia");
  return ws;
}

// ---------------------------------------------------------------------------
// Shell aplikasi: sidebar (desktop) / menu atas (mobile)
// ---------------------------------------------------------------------------

// Taksonomi menu (Fase 31b): dikelompokkan per PEKERJAAN, bukan per nama modul
// teknis. Delapan seksi lama (Transaksi, CRM, Keuangan, Laporan, Aset & Pajak,
// Master Data, HR, Lainnya) menuntut pemakai tahu lebih dulu modul mana yang
// memuat pekerjaannya — "Kontak" ada di Master Data, "Pemeliharaan" di Lainnya.
// Kini: Jual, Beli & Stok, Uang, Laporan, Aset & Pajak, Orang & Proyek, Kelola.
//
// Rute, label, izin, dan ikon per item TIDAK berubah — hanya pengelompokan dan
// urutannya. Itu batasan yang disengaja: 46 rute disapu ui-sim lewat URL
// langsung, jadi navigasi boleh dirombak total selama URL-nya tetap.
const NAV_ITEMS: { to: string; label: string; exact: boolean; section?: string; icon: LucideIcon; module?: PermissionKey; adminOnly?: boolean }[] = [
  { to: "/app", label: "Dashboard", exact: true, icon: LayoutDashboard },
  { to: "/app/pos", label: "Kasir (POS)", exact: false, section: "Jual", icon: Store, module: "kasir" },
  { to: "/app/penjualan", label: "Penjualan", exact: false, section: "Jual", icon: Receipt, module: "penjualan" },
  { to: "/app/pesanan-penjualan", label: "Pesanan Penjualan", exact: false, section: "Jual", icon: ClipboardList, module: "penjualan" },
  { to: "/app/marketplace", label: "Pesanan Marketplace", exact: false, section: "Jual", icon: ShoppingBag, module: "penjualan" },
  { to: "/app/crm/leads", label: "Pipeline", exact: false, section: "Jual", icon: Target, module: "crm" },
  { to: "/app/crm/penawaran", label: "Penawaran", exact: false, section: "Jual", icon: FileText, module: "crm" },
  { to: "/app/helpdesk", label: "Helpdesk", exact: false, section: "Jual", icon: LifeBuoy, module: "crm" },
  { to: "/app/pembelian", label: "Pembelian", exact: false, section: "Beli & Stok", icon: ShoppingCart, module: "pembelian" },
  { to: "/app/pengadaan", label: "Pengadaan", exact: false, section: "Beli & Stok", icon: PackageSearch, module: "pembelian" },
  { to: "/app/stok", label: "Stok", exact: false, section: "Beli & Stok", icon: Boxes, module: "stok" },
  { to: "/app/master/produk", label: "Produk", exact: false, section: "Beli & Stok", icon: Package, module: "stok" },
  { to: "/app/master/kontak", label: "Kontak", exact: false, section: "Beli & Stok", icon: Contact, module: "penjualan" },
  { to: "/app/master/gudang", label: "Gudang", exact: false, section: "Beli & Stok", icon: Warehouse, module: "stok" },
  { to: "/app/master/grup-harga", label: "Grup Harga", exact: false, section: "Beli & Stok", icon: Tags, module: "penjualan" },
  { to: "/app/keuangan/catat", label: "Catat Transaksi", exact: false, section: "Uang", icon: PenLine, module: "keuangan" },
  { to: "/app/keuangan/kas-bank", label: "Kas & Bank", exact: false, section: "Uang", icon: Wallet, module: "keuangan" },
  { to: "/app/keuangan/akun", label: "Bagan Akun", exact: false, section: "Uang", icon: ListTree, module: "keuangan" },
  { to: "/app/keuangan/jurnal", label: "Jurnal Umum", exact: false, section: "Uang", icon: BookText, module: "keuangan" },
  { to: "/app/keuangan/buku-besar", label: "Buku Besar", exact: false, section: "Uang", icon: BookOpen, module: "keuangan" },
  { to: "/app/keuangan/anggaran", label: "Anggaran", exact: false, section: "Uang", icon: PiggyBank, module: "keuangan" },
  { to: "/app/keuangan/dimensi", label: "Dimensi & Rekonsiliasi", exact: false, section: "Uang", icon: Layers, module: "keuangan" },
  { to: "/app/keuangan/kurs", label: "Mata Uang", exact: false, section: "Uang", icon: Coins, module: "keuangan" },
  { to: "/app/konsolidasi", label: "Konsolidasi", exact: false, section: "Uang", icon: Combine, module: "keuangan" },
  { to: "/app/keuangan/neraca-saldo", label: "Neraca Saldo", exact: false, section: "Laporan", icon: Sigma, module: "keuangan" },
  { to: "/app/keuangan/laba-rugi", label: "Laba Rugi", exact: false, section: "Laporan", icon: LineChart, module: "laporan" },
  { to: "/app/keuangan/neraca", label: "Neraca", exact: false, section: "Laporan", icon: Scale, module: "laporan" },
  { to: "/app/keuangan/arus-kas", label: "Arus Kas", exact: false, section: "Laporan", icon: ArrowLeftRight, module: "laporan" },
  { to: "/app/keuangan/umur-tagihan", label: "Umur Piutang/Utang", exact: false, section: "Laporan", icon: Hourglass, module: "laporan" },
  { to: "/app/laporan/penjualan", label: "Laporan Penjualan", exact: false, section: "Laporan", icon: BarChart3, module: "laporan" },
  { to: "/app/keuangan/aset", label: "Aset Tetap", exact: false, section: "Aset & Pajak", icon: Landmark, module: "keuangan" },
  { to: "/app/maintenance", label: "Pemeliharaan", exact: false, section: "Aset & Pajak", icon: Wrench, module: "proyek" },
  { to: "/app/keuangan/pajak", label: "Pajak", exact: false, section: "Aset & Pajak", icon: Percent, module: "pajak" },
  { to: "/app/keuangan/e-faktur", label: "Ekspor e-Faktur", exact: false, section: "Aset & Pajak", icon: FileSpreadsheet, module: "pajak" },
  { to: "/app/manufaktur", label: "Manufaktur", exact: false, section: "Orang & Proyek", icon: Factory, module: "proyek" },
  { to: "/app/hr/penggajian", label: "Penggajian", exact: false, section: "Orang & Proyek", icon: UsersRound, module: "hr" },
  { to: "/app/hr/absensi", label: "Absensi", exact: false, section: "Orang & Proyek", icon: CalendarCheck, module: "hr" },
  { to: "/app/proyek", label: "Proyek", exact: false, section: "Orang & Proyek", icon: FolderKanban, module: "proyek" },
  { to: "/app/kontrak", label: "Kontrak Berulang", exact: false, section: "Orang & Proyek", icon: CalendarClock, module: "proyek" },
  { to: "/app/persetujuan", label: "Persetujuan", exact: false, section: "Orang & Proyek", icon: CheckSquare, module: "persetujuan" },
  { to: "/app/alat", label: "Alat Bantu", exact: false, section: "Kelola", icon: Calculator },
  { to: "/app/dukungan", label: "Dukungan", exact: false, section: "Kelola", icon: LifeBuoy },
  { to: "/app/migrasi", label: "Migrasi", exact: false, section: "Kelola", icon: UploadCloud },
  { to: "/app/admin", label: "Admin", exact: false, section: "Kelola", icon: ShieldCheck, adminOnly: true },
  { to: "/app/pengaturan", label: "Pengaturan", exact: false, section: "Kelola", icon: Settings },
];

/** Label menu bahasa Inggris (Fase 13e), dikunci per rute agar label ID tetap sumber utama. */
const NAV_LABEL_EN: Record<string, string> = {
  "/app": "Dashboard",
  "/app/pos": "Cashier (POS)",
  "/app/penjualan": "Sales",
  "/app/pesanan-penjualan": "Sales Orders",
  "/app/pembelian": "Purchases",
  "/app/pengadaan": "Procurement",
  "/app/stok": "Inventory",
  "/app/marketplace": "Marketplace Orders",
  "/app/manufaktur": "Manufacturing",
  "/app/crm/leads": "Pipeline",
  "/app/crm/penawaran": "Quotations",
  "/app/helpdesk": "Helpdesk",
  "/app/keuangan/catat": "Record Transaction",
  "/app/keuangan/kas-bank": "Cash & Bank",
  "/app/keuangan/akun": "Chart of Accounts",
  "/app/keuangan/jurnal": "General Journal",
  "/app/keuangan/buku-besar": "General Ledger",
  "/app/keuangan/anggaran": "Budget",
  "/app/keuangan/dimensi": "Dimensions & Reconciliation",
  "/app/keuangan/kurs": "Currencies",
  "/app/konsolidasi": "Consolidation",
  "/app/keuangan/neraca-saldo": "Trial Balance",
  "/app/keuangan/laba-rugi": "Income Statement",
  "/app/keuangan/neraca": "Balance Sheet",
  "/app/keuangan/arus-kas": "Cash Flow",
  "/app/keuangan/umur-tagihan": "AR/AP Aging",
  "/app/laporan/penjualan": "Sales Report",
  "/app/keuangan/aset": "Fixed Assets",
  "/app/maintenance": "Maintenance",
  "/app/keuangan/pajak": "Tax",
  "/app/keuangan/e-faktur": "e-Faktur Export",
  "/app/master/produk": "Products",
  "/app/master/kontak": "Contacts",
  "/app/master/gudang": "Warehouses",
  "/app/master/grup-harga": "Price Groups",
  "/app/hr/penggajian": "Payroll",
  "/app/hr/absensi": "Attendance",
  "/app/proyek": "Projects",
  "/app/kontrak": "Recurring Contracts",
  "/app/persetujuan": "Approvals",
  "/app/alat": "Tools",
  "/app/dukungan": "Support",
  "/app/migrasi": "Migration",
  "/app/admin": "Admin",
  "/app/pengaturan": "Settings",
};

/** Nama seksi menu bahasa Inggris (Fase 13e). */
const SECTION_EN: Record<string, string> = {
  Jual: "Sell",
  "Beli & Stok": "Buy & Stock",
  Uang: "Money",
  Laporan: "Reports",
  "Aset & Pajak": "Assets & Tax",
  "Orang & Proyek": "People & Projects",
  Kelola: "Manage",
};

/**
 * Rail wilayah kerja (Fase 31b).
 *
 * Sebelumnya sidebar adalah satu daftar 45 item dalam 8 seksi bernama modul
 * teknis (Transaksi, CRM, Keuangan, Master Data, HR, Lainnya). Bentuk itu yang
 * paling dikenali pemilik dari aplikasi lama, dan penamaannya menuntut pemakai
 * tahu lebih dulu modul mana yang memuat pekerjaannya — "Kontak" ada di Master
 * Data, "Pemeliharaan" di Lainnya.
 *
 * Taksonomi baru dikelompokkan per **pekerjaan**: Jual, Beli & Stok, Uang,
 * Laporan, Aset & Pajak, Orang & Proyek, Kelola.
 *
 * Rail-nya BUKAN penyaring. Panel tetap memuat seluruh tautan — mengeklik
 * ikon menggulirkan panel ke wilayahnya dan membukanya bila sedang terlipat.
 * Ini disengaja: rail yang menyembunyikan wilayah lain akan membuat pencarian
 * menu lintas-wilayah mustahil, dan membuat 45 halaman terasa lebih jauh
 * daripada sebelumnya, bukan lebih dekat.
 */
const AREAS: { nama: string; icon: LucideIcon }[] = [
  { nama: "Jual", icon: Store },
  { nama: "Beli & Stok", icon: ShoppingCart },
  { nama: "Uang", icon: Wallet },
  { nama: "Laporan", icon: BarChart3 },
  { nama: "Aset & Pajak", icon: Landmark },
  { nama: "Orang & Proyek", icon: UsersRound },
  { nama: "Kelola", icon: Settings },
];

/** Id elemen judul grup — dipakai rail untuk menggulir. */
const idGrup = (nama: string) => `grup-${nama.replace(/[^a-z]+/gi, "-").toLowerCase()}`;

// Seksi lipat (Fase 9c): daftar nama seksi yang dilipat, per pengguna.
// Tidak ada simpanan = semua terbuka (perilaku lama persis).
const NAV_COLLAPSE_KEY = "erpindo-nav-collapsed";

function getCollapsedSections(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(NAV_COLLAPSE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Avatar inisial (maks 2 huruf) dengan warna brand — ala aplikasi SaaS. */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
      {initials || "?"}
    </span>
  );
}

/**
 * Lonceng notifikasi topbar: stok menipis, faktur lewat jatuh tempo, tiket
 * terbuka, dan pembelian menunggu persetujuan — dihitung server on-demand,
 * disegarkan tiap menit.
 */
/** Pemetaan rute aplikasi → slug modul panduan (untuk tombol bantuan topbar). */
/** Mode Sederhana: sembunyikan menu akuntansi teknis (per pengguna, localStorage). */
const SIMPLE_MODE_KEY = "erpindo-simple-mode";
const SIMPLE_MODE_EVENT = "erpindo-simple-mode-change";
const SIMPLE_HIDDEN = new Set([
  "/app/keuangan/akun",
  "/app/keuangan/jurnal",
  "/app/keuangan/buku-besar",
  "/app/keuangan/neraca-saldo",
]);

export function isSimpleMode(): boolean {
  return localStorage.getItem(SIMPLE_MODE_KEY) === "1";
}

export function setSimpleMode(on: boolean): void {
  localStorage.setItem(SIMPLE_MODE_KEY, on ? "1" : "0");
  window.dispatchEvent(new Event(SIMPLE_MODE_EVENT));
}

const GUIDE_SLUG_BY_PREFIX: [prefix: string, slug: string][] = [
  ["/app/pos", "pos"],
  ["/app/penjualan", "penjualan"],
  ["/app/pembelian", "pembelian"],
  ["/app/stok", "stok"],
  ["/app/persetujuan", "persetujuan"],
  ["/app/crm", "crm"],
  ["/app/master/produk", "produk"],
  ["/app/master/kontak", "kontak"],
  ["/app/master", "produk"],
  ["/app/hr", "penggajian"],
  ["/app/keuangan/catat", "akuntansi-pemula"],
  ["/app/keuangan/e-faktur", "pajak"],
  ["/app/keuangan/anggaran", "anggaran"],
  ["/app/keuangan/aset", "aset"],
  ["/app/keuangan/kurs", "kurs"],
  ["/app/keuangan/laba-rugi", "laporan"],
  ["/app/keuangan/neraca", "laporan"],
  ["/app/keuangan/arus-kas", "laporan"],
  ["/app/keuangan/umur-tagihan", "laporan"],
  ["/app/keuangan", "akuntansi"],
  ["/app/proyek", "proyek"],
  ["/app/kontrak", "kontrak"],
  ["/app/konsolidasi", "konsolidasi"],
  ["/app/manufaktur", "manufaktur"],
  ["/app/maintenance", "maintenance"],
  ["/app/helpdesk", "helpdesk"],
  ["/app/pengaturan", "pengaturan"],
];

/** Tombol "?" — membuka panduan modul yang sedang dibuka DI DALAM aplikasi
 *  (Fase 10f: rute internal /app/panduan, tak lagi pindah situs). */
function HelpLink() {
  const u = useUi();
  const { location } = useRouterState();
  const navigate = useNavigate();
  const slug = GUIDE_SLUG_BY_PREFIX.find(([p]) => location.pathname.startsWith(p))?.[1] ?? "mulai";
  return (
    <button
      onClick={() => navigate({ to: "/app/panduan/$modul", params: { modul: slug } })}
      className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted"
      aria-label={u("shPanduanAria")}
      title={u("shPanduanTitle")}
    >
      <CircleHelp className="size-4" aria-hidden />
    </button>
  );
}

/** Tombol "Tur" + tur berpandu untuk halaman aktif (Fase 10f). Tur dasbor
 *  tampil otomatis sekali untuk pengguna baru; sisanya lewat tombol ini. */
function TourLauncher() {
  const u = useUi();
  const { location } = useRouterState();
  const tour = tourForPath(location.pathname);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Auto-tampil sekali untuk pengguna baru (hanya tur yang ditandai auto).
    if (tour && AUTO_TOUR_IDS.has(tour.id) && !tourSeen(tour.id)) setOpen(true);
    else setOpen(false);
    // Sengaja hanya bergantung pada id tur (tourForPath mengembalikan objek baru
    // tiap render — memasukkan `tour` akan memicu efek terus-menerus).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour?.id]);
  if (!tour) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted"
        aria-label={u("shTurAria")}
        title={u("shTurTitle")}
      >
        <Compass className="size-4" aria-hidden />
      </button>
      <PageTour id={tour.id} steps={tour.steps} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function NotificationBell({ tenantId }: { tenantId: string }) {
  const u = useUi();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: ["notifications", tenantId],
    queryFn: () => api.notifications(tenantId),
    refetchInterval: 60_000,
  });
  const items = query.data?.notifications ?? [];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toneByType: Record<string, string> = {
    low_stock: "bg-amber-500",
    overdue_invoice: "bg-red-500",
    open_ticket: "bg-sky-500",
    pending_approval: "bg-brand-500",
    crm_followup_due: "bg-violet-500",
    crm_stale_lead: "bg-slate-400",
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-ink-muted hover:bg-surface-muted"
        aria-label={`${u("shNotifikasi")}${items.length > 0 ? ` (${items.length})` : ""}`}
        title={u("shNotifikasi")}
      >
        <Bell className="size-4" aria-hidden />
        {items.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed right-2 top-16 z-50 w-[calc(100vw-1rem)] max-w-sm overflow-hidden rounded-card border border-line bg-surface shadow-xl sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
          <div className="border-b border-line px-4 py-2.5 text-sm font-semibold">
            {u("shNotifikasi")}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-muted">
                {u("shTakAdaPerhatian")}
              </p>
            ) : (
              items.map((n, i) => (
                <Link
                  key={i}
                  to={n.href}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 border-b border-line px-4 py-3 text-sm hover:bg-surface-sunken"
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${toneByType[n.type] ?? "bg-slate-400"}`} aria-hidden />
                  <span>
                    <span className="block font-medium text-ink">{n.title}</span>
                    <span className="block text-xs text-ink-muted">{n.detail}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell() {
  const u = useUi();
  const navigate = useNavigate();
  const { dark, toggle } = useDarkMode();
  const lang = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  // Label menu sesuai bahasa aktif (Fase 13e).
  const navLabel = (item: (typeof NAV_ITEMS)[number]) => (lang === "en" ? (NAV_LABEL_EN[item.to] ?? item.label) : item.label);

  // Efisiensi navigasi (Fase 9c): pencarian menu + seksi lipat persisten.
  const [navQuery, setNavQuery] = useState("");
  const [paletOpen, setPaletOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<string[]>(getCollapsedSections);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const toggleSection = (name: string) => {
    setCollapsedSections((prev) => {
      const next = prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name];
      localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me, retry: false });

  // Izin modul efektif (RBAC granular Fase 7e) — untuk menyaring menu sidebar.
  const activeTenantId = meQuery.data
    ? (meQuery.data.memberships.find((m) => m.tenantId === localStorage.getItem("erpindo-tenant"))?.tenantId ?? meQuery.data.memberships[0]?.tenantId)
    : undefined;
  const permQuery = useQuery({
    queryKey: ["my-permissions", activeTenantId],
    queryFn: () => api.myPermissions(activeTenantId as string),
    enabled: Boolean(activeTenantId),
  });

  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => navigate({ to: "/masuk" }),
  });

  // Mode Sederhana: ikuti perubahan toggle dari halaman Pengaturan.
  const [simpleMode, setSimpleModeState] = useState(isSimpleMode);
  useEffect(() => {
    const onChange = () => setSimpleModeState(isSimpleMode());
    window.addEventListener(SIMPLE_MODE_EVENT, onChange);
    return () => window.removeEventListener(SIMPLE_MODE_EVENT, onChange);
  }, []);

  // Palet perintah ⌘K / Ctrl+K (Fase 17c). Diabaikan saat fokus sedang di
  // kolom isian supaya tidak merebut pintasan pengetikan pengguna.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      const el = document.activeElement;
      const mengetik =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement;
      if (mengetik && !paletOpen) return;
      e.preventDefault();
      setPaletOpen((o) => !o);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [paletOpen]);

  // Drawer mobile: tutup dengan Escape + kunci scroll body saat terbuka.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (meQuery.isError || !meQuery.data) {
    if (meQuery.error instanceof ApiRequestError && meQuery.error.status === 401) {
      navigate({ to: "/masuk" });
      return null;
    }
    return (
      <div className="p-6">
        <Alert tone="error">{u("shGagalMuat")}</Alert>
      </div>
    );
  }

  const me = meQuery.data;
  const storedTenantId = localStorage.getItem("erpindo-tenant");
  const tenant = me.memberships.find((m) => m.tenantId === storedTenantId) ?? me.memberships[0];
  if (!tenant) {
    return (
      <div className="p-6">
        <Alert tone="error">{u("shBelumGabung")}</Alert>
      </div>
    );
  }

  // Sembunyikan menu modul yang tak diizinkan peran (default tampil saat izin belum termuat).
  const allowedModules = permQuery.data?.permissions;
  const permitted = (item: (typeof NAV_ITEMS)[number]) =>
    (!item.module || !allowedModules || allowedModules.includes(item.module)) &&
    // Menu Admin platform (Fase 10e) hanya untuk email di PLATFORM_ADMIN_EMAILS.
    (!item.adminOnly || me.user.isPlatformAdmin === true);
  const navItems = (simpleMode ? NAV_ITEMS.filter((item) => !SIMPLE_HIDDEN.has(item.to)) : NAV_ITEMS).filter(permitted);

  // Pencarian menu: saat mencari, lipat diabaikan & seksi kosong tak berjudul.
  const navFilter = navQuery.trim().toLowerCase();
  const visibleItems = navFilter
    ? navItems.filter((item) => item.label.toLowerCase().includes(navFilter) || navLabel(item).toLowerCase().includes(navFilter))
    : navItems;
  // Kelompokkan berurutan per seksi (butuh grup utuh untuk lipat/buka).
  const navGroups: { section?: string; items: typeof navItems }[] = [];
  for (const item of visibleItems) {
    const last = navGroups[navGroups.length - 1];
    if (last && last.section === item.section) last.items.push(item);
    else navGroups.push({ section: item.section, items: [item] });
  }
  // Seksi rute aktif selalu terbuka agar posisi pengguna tak pernah tersembunyi.
  const activeSection = navItems.find((item) => (item.exact ? pathname === item.to : pathname.startsWith(item.to)))?.section;

  const navLink = (item: (typeof NAV_ITEMS)[number]) => (
    <Link
      key={item.to}
      to={item.to}
      activeOptions={{ exact: item.exact }}
      activeProps={{
        className:
          "bg-brand-50 font-medium text-brand-700 ring-1 ring-inset ring-brand-200/70 dark:bg-brand-500/15 dark:text-brand-100 dark:ring-brand-400/20",
      }}
      inactiveProps={{
        className:
          "text-ink-soft hover:bg-slate-100 hover:text-ink dark:hover:bg-white/5",
      }}
      className="flex items-center gap-2 rounded px-2.5 py-1.5 text-[13px] transition-colors"
      onClick={() => setMenuOpen(false)}
    >
      <item.icon className="size-4 shrink-0" aria-hidden />
      {navLabel(item)}
    </Link>
  );

  const nav = (
    <nav className="flex flex-col gap-px p-2">
      <div className="relative mb-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          value={navQuery}
          onChange={(e) => setNavQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setNavQuery("");
          }}
          placeholder={lang === "en" ? "Search menu…" : "Cari menu…"}
          aria-label={u("shCariMenuAria")}
          className="h-8 w-full rounded border border-line bg-transparent pl-8 pr-2 text-[13px] text-ink outline-none placeholder:text-slate-400 focus:border-brand-400 dark:focus:border-brand-500"
        />
      </div>
      {navGroups.map((group) => {
        const isCollapsed =
          !navFilter && Boolean(group.section) && group.section !== activeSection && collapsedSections.includes(group.section!);
        return (
          <div key={group.section ?? "utama"}>
            {group.section ? (
              <button
                type="button"
                id={idGrup(group.section)}
                onClick={() => toggleSection(group.section!)}
                aria-expanded={!isCollapsed}
                className="mb-1 mt-4 flex w-full items-center justify-between rounded px-2 py-1 text-[11px] font-semibold tracking-tight text-ink-soft transition-colors hover:bg-surface-muted"
              >
                {lang === "en" ? (SECTION_EN[group.section!] ?? group.section) : group.section}
                <ChevronDown className={`size-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} aria-hidden />
              </button>
            ) : null}
            {isCollapsed ? null : group.items.map(navLink)}
          </div>
        );
      })}
      {visibleItems.length === 0 ? (
        <p className="px-3 py-2 text-sm text-ink-faint">{lang === "en" ? "No matching menu." : "Tidak ada menu cocok."}</p>
      ) : null}
      <Link
        to="/app/panduan"
        className="mt-3 flex items-center gap-2 rounded px-2.5 py-1.5 text-[13px] text-ink-soft transition-colors hover:bg-slate-100 hover:text-ink dark:hover:bg-white/5"
      >
        <CircleHelp className="size-4 shrink-0" aria-hidden />
        {lang === "en" ? "Guide" : "Panduan"}
      </Link>
      <div className="mt-3 px-3">
        <LangSwitcher />
      </div>
    </nav>
  );

  const workspacePicker =
    me.memberships.length > 1 ? (
      <div className="mt-2 flex items-center gap-1.5 rounded bg-surface-muted px-2 py-1 dark:bg-white/5">
        <Building2 className="size-4 shrink-0 text-ink-muted" aria-hidden />
        <select
          aria-label={u("shPilihPerusahaan")}
          className="w-full bg-transparent text-[13px] text-ink outline-none [&>option]:text-slate-900"
          value={tenant.tenantId}
          onChange={(e) => {
            localStorage.setItem("erpindo-tenant", e.target.value);
            window.location.href = "/app";
          }}
        >
          {me.memberships.map((m) => (
            <option key={m.tenantId} value={m.tenantId}>
              {m.tenantName}
            </option>
          ))}
        </select>
      </div>
    ) : (
      <div className="mt-2 flex items-center gap-1.5 truncate px-1 text-sm text-ink-muted">
        <Building2 className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{tenant.tenantName}</span>
      </div>
    );

  // Isi sidebar dipakai bersama desktop (aside) & mobile (drawer) agar tak duplikat.
  const sidebarContent = (
    <>
      <div className="border-b border-line px-3 py-2.5">
        <div className="flex items-center gap-2">
          <BrandWordmark className="h-8" />
        </div>
        {workspacePicker}
      </div>
      <div className="flex-1 overflow-y-auto">{nav}</div>
      <div className="border-t border-line p-2">
        <div className="flex items-center gap-2 px-1">
          <Avatar name={me.user.name} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{me.user.name}</div>
            <div className="truncate text-xs text-ink-muted">{me.user.email}</div>
          </div>
        </div>
      </div>
    </>
  );

  /**
   * Rail wilayah kerja — kolom ikon di kiri panel (Fase 31b).
   *
   * SENGAJA di luar `<nav>`, sama seperti pemicu palet perintah di topbar:
   * sebelas asersi ui-sim menghitung `aside nav a:visible` dan
   * `aside nav button:visible`. Menaruh tujuh tombol wilayah di dalam `<nav>`
   * akan memecah kesebelasnya sekaligus tanpa pesan yang menjelaskan sebabnya.
   */
  const areaAktif = navItems.find((item) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to)
  )?.section;
  const rail = (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface-sunken py-3">
      {AREAS.filter((a) => navItems.some((i) => i.section === a.nama)).map((a) => {
        const aktif = areaAktif === a.nama;
        return (
          <button
            key={a.nama}
            type="button"
            data-area={a.nama}
            aria-label={lang === "en" ? (SECTION_EN[a.nama] ?? a.nama) : a.nama}
            title={lang === "en" ? (SECTION_EN[a.nama] ?? a.nama) : a.nama}
            aria-current={aktif ? "true" : undefined}
            onClick={() => {
              // Buka lipatannya dulu — menggulir ke judul yang terlipat hanya
              // memindahkan pandangan ke tempat kosong.
              setCollapsedSections((prev) => {
                if (!prev.includes(a.nama)) return prev;
                const next = prev.filter((s) => s !== a.nama);
                localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(next));
                return next;
              });
              setNavQuery("");
              requestAnimationFrame(() => {
                document.getElementById(idGrup(a.nama))?.scrollIntoView({ block: "start" });
              });
            }}
            className={cx(
              "flex size-10 items-center justify-center rounded-control transition-colors",
              aktif
                ? "bg-brand-600 text-white"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink"
            )}
          >
            <a.icon className="size-[18px]" aria-hidden />
          </button>
        );
      })}
    </div>
  );

  return (
    <WorkspaceContext.Provider value={{ me, tenant }}>
      <div className="flex min-h-full">
        {/* Sidebar desktop — rail wilayah + panel (Fase 31b).
            Fase 17c: `sticky top-0 h-dvh self-start` supaya menu ikut diam saat
            halaman panjang digulir. `self-start` wajib: tanpa itu aside meregang
            setinggi konten (stretch bawaan flex) dan `sticky` tak punya ruang
            gerak, jadi terlihat seolah tidak berfungsi. */}
        <aside className="sticky top-0 hidden h-dvh w-[17.5rem] shrink-0 self-start border-r border-line bg-surface md:flex">
          {rail}
          <div className="flex min-w-0 flex-1 flex-col">{sidebarContent}</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar — Fase 17c: melekat di atas (dulu ikut mengalir, sehingga
              pada tabel panjang tombol tema/keluar hilang dari jangkauan). */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-3 sm:px-4 md:h-12">
            <div className="flex items-center gap-3 md:hidden">
              {/* Sasaran sentuh 44px (Fase 18c). Sebelumnya 34x34 — di bawah
                  ambang nyaman untuk jempol, dan ini SATU-SATUNYA jalan ke menu
                  di layar kecil karena sidebar desktop `hidden md:flex`. */}
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-line-strong"
                aria-label="Menu"
              >
                <Menu className="size-5" aria-hidden />
              </button>
              <BrandWordmark className="h-7" />
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {tenant.tenantStatus === "provisioning" ? <Badge tone="amber">{u("shBelumBerlangganan")}</Badge> : null}
              <Badge tone="brand">{tenant.role}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Pemicu palet — SENGAJA di topbar, bukan di dalam <nav>:
                  sebelas asersi ui-sim menghitung `aside nav a/button`. */}
              <button
                onClick={() => setPaletOpen(true)}
                className="hidden items-center gap-2 rounded border border-line-strong px-2 py-1 text-xs text-ink-muted transition-colors hover:border-slate-400 hover:text-ink md:flex dark:hover:border-slate-600"
                aria-label={lang === "en" ? "Open command palette" : "Buka palet perintah"}
                title={lang === "en" ? "Jump to a page (Ctrl+K)" : "Lompat ke halaman (Ctrl+K)"}
              >
                <Search className="size-3.5" aria-hidden />
                <kbd className="font-mono text-[10px] tracking-tight">Ctrl K</kbd>
              </button>
              <NotificationBell tenantId={tenant.tenantId} />
              <TourLauncher />
              <HelpLink />
              <button
                onClick={toggle}
                className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted"
                aria-label={u("shGantiTemaAria")}
                title={u("shGantiTemaTitle")}
              >
                {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
              </button>
              <span className="hidden sm:block">
                <Avatar name={me.user.name} />
              </span>
              <Button variant="secondary" onClick={() => logout.mutate()}>
                <LogOut className="size-4" aria-hidden /> {u("shKeluar")}
              </Button>
            </div>
          </header>

          {/* Menu mobile — off-canvas drawer geser dari kiri + backdrop */}
          <div
            className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
              menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] flex-col border-r border-line bg-white shadow-xl transition-transform duration-300 md:hidden dark:border-white/10 dark:bg-slate-950 ${
              menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={u("shMenuNavigasi")}
          >
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-lg text-ink-muted hover:bg-slate-100 dark:hover:bg-white/5"
              aria-label={u("shTutupMenu")}
            >
              <X className="size-5" aria-hidden />
            </button>
            {sidebarContent}
          </aside>

          {me.user.isDemo ? (
            <div className="border-b border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
              <strong>{u("shModeDemo")}</strong> {u("shDemoBacaSaja")}{" "}
              <a href="/daftar" className="font-medium underline">
                {u("authDaftarGratis")}
              </a>{" "}
              {u("shUntukKelolaBisnis")}
            </div>
          ) : !me.user.emailVerified ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {u("shEmailBelumVerifikasi")}
            </div>
          ) : null}

          {tenant.tenantStatus === "past_due" ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {u("shLanggananBerakhir")} <strong>{u("shModeBacaSaja")}</strong>{u("shAktifkanDi")}{" "}
              <Link to="/app/pengaturan" className="font-medium underline">
                {u("shPengaturan")}
              </Link>
              .
            </div>
          ) : tenant.tenantStatus === "provisioning" ? (
            // Fase 24: tidak ada lagi hitung mundur trial. Akun yang belum
            // berlangganan tidak punya database sama sekali, jadi spanduknya
            // bukan peringatan melainkan satu-satunya jalan ke depan.
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {u("shBelumBerlanggananPesan")}{" "}
              <Link to="/app/pengaturan" className="font-medium underline">
                {u("shPengaturan")}
              </Link>
              .
            </div>
          ) : tenant.subscriptionEndsAt && dalamTenggang(tenant.subscriptionEndsAt) ? (
            // Masa tenggang (Fase 20c) TETAP berlaku setelah Fase 24 — kini
            // hanya untuk pelanggan berbayar, satu-satunya yang punya tanggal
            // berakhir. Sengaja oranye, bukan merah: merah dipakai `past_due`
            // yang artinya sudah benar-benar terkunci, dan menyamakan keduanya
            // membuat pemilik mengira sudah terlambat padahal belum.
            <div className="border-b border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
              {u("shTenggangPrefix")}{" "}
              <strong>
                {sisaTenggang(tenant.subscriptionEndsAt)} {u("shHari")}
              </strong>{" "}
              {u("shTenggangSuffix")}
            </div>
          ) : null}

          <main className="flex-1 p-3 sm:p-4">
            <Outlet />
          </main>
        </div>
      </div>
      <Asisten tenantId={tenant.tenantId} isAdmin={tenant.role !== "viewer"} />

      {/* Palet perintah — dipasang di AKAR shell, di luar <aside>/<nav>.
          Daftar isinya memakai navItems yang sudah tersaring izin peran &
          Mode Sederhana, dan labelnya sudah diterjemahkan lewat navLabel(). */}
      <PaletPerintah
        open={paletOpen}
        onClose={() => setPaletOpen(false)}
        items={navItems.map((item) => ({
          to: item.to,
          label: navLabel(item),
          section: item.section
            ? lang === "en"
              ? (SECTION_EN[item.section] ?? item.section)
              : item.section
            : undefined,
          icon: item.icon,
        }))}
        onPilih={(to) => {
          setPaletOpen(false);
          void navigate({ to });
        }}
      />
    </WorkspaceContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Halaman Dashboard & Pengaturan dipisah ke berkas sendiri (Fase 9d).
// Re-export menjaga nama ekspor lama agar main.tsx & pemakai lain tak berubah.
// ---------------------------------------------------------------------------
export { DashboardPage } from "./dashboard";
export { SettingsPage } from "./settings";
