import {
  contactSchema,
  INDUSTRY_KEYS,
  productSchema,
  warehouseSchema,
  type ContactType,
  type IndustryKey,
} from "@erpindo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isi, useLang } from "../i18n";
import { useUi, type UiKey } from "../i18n/ui";
import { Contact, Download, Package, Plus, Search, Upload, Warehouse } from "lucide-react";
import { Halaman, Lembar } from "../components/kerangka";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { api, downloadCsv, formatIDR, parseCsv } from "../api/client";
import { useDebounced } from "./commerce";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  FieldError,
  Input,
  Label,
  PageHeading,
  Select,
  Spinner,
  Table,
  Td,
  Th,
  Thead,
  Tr,
  useToast,
} from "../components/ui";
import { CustomFieldInputs, useFieldKustom } from "../components/customFields";
import { useWorkspace } from "./app";

// Peta label INDUSTRY_LABELS tinggal di packages/shared dan tetap
// berbahasa Indonesia (apps/api ikut memakai paket itu, jadi shared tidak
// boleh bergantung pada kamus web). Pemetaan ke kunci kamus dilakukan di
// sisi web — Fase 16t.
const INDUSTRY_KEY: Record<IndustryKey, UiKey> = {
  retail: "industriRetail",
  fnb: "industriFnb",
  jasa: "industriJasa",
  grosir: "industriGrosir",
};


/**
 * Tombol impor CSV: pilih file → parse di browser → petakan kolom → kirim batch
 * ke server (validasi per baris di sana) → tampilkan hasil.
 */
function ImportCsvButton({
  entity,
  templateHeaders,
  templateExample,
  mapRow,
}: {
  entity: "products" | "contacts";
  templateHeaders: string[];
  templateExample: (string | number)[];
  mapRow: (r: Record<string, string>) => unknown;
}) {
  const u = useUi();
  const { tenant } = useWorkspace();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{
    inserted: number;
    failed: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const importMutation = useMutation({
    mutationFn: (rows: unknown[]) => api.importItems(tenant.tenantId, entity, rows),
    onSuccess: (res) => {
      setResult(res);
      toast(
        res.failed === 0 ? "success" : "error",
        `Impor selesai: ${res.inserted} masuk, ${res.failed} gagal/dilewati.`
      );
      queryClient.invalidateQueries({ queryKey: [entity, tenant.tenantId] });
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      toast("error", u("toastFileKosong"));
      return;
    }
    importMutation.mutate(rows.map(mapRow));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onFile}
      />
      <Button
        variant="secondary"
        onClick={() => fileRef.current?.click()}
        disabled={importMutation.isPending}
      >
        {importMutation.isPending ? <Spinner /> : <Upload className="size-4" aria-hidden />} Impor
        CSV
      </Button>
      <Button
        variant="ghost"
        onClick={() => downloadCsv(`template-${entity}.csv`, templateHeaders, [templateExample])}
      >
        {u("unduhTemplate")}
      </Button>
      {result && result.errors.length > 0 ? (
        <div className="w-full rounded-lg border border-awas-line bg-awas-surface px-3 py-2 text-xs text-awas-ink">
          {result.errors.slice(0, 8).map((er) => (
            <div key={er.row}>
              {u("barisKe")} {er.row}: {er.message}
            </div>
          ))}
          {result.errors.length > 8 ? (
            <div>
              … {result.errors.length - 8} {u("danLainnya")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Kerangka halaman master data seragam: form tambah/ubah (admin) + tabel +
 * arsip berkonfirmasi. `editing` menampung baris yang sedang diubah — form
 * yang sama dipakai untuk tambah maupun ubah (dibedakan lewat submit).
 */
function useEntityPage<Row extends { id: string }>(entity: "products" | "contacts" | "warehouses") {
  const { tenant } = useWorkspace();
  const isAdmin = tenant.role !== "viewer";
  const toast = useToast();
  const u = useUi();
  const queryClient = useQueryClient();
  const [issues, setIssues] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [toArchive, setToArchive] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [limit, setLimit] = useState(100);

  const query = useQuery({
    queryKey: [entity, tenant.tenantId, q, limit],
    queryFn: () => api.listItems(tenant.tenantId, entity, { q, limit }),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [entity, tenant.tenantId] });

  const create = useMutation({
    mutationFn: (input: Parameters<typeof api.createItem>[2]) =>
      api.createItem(tenant.tenantId, entity, input),
    onSuccess: () => {
      toast("success", u("toastDataTersimpan"));
      invalidate();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const update = useMutation({
    mutationFn: (vars: { id: string; input: Parameters<typeof api.updateItem>[3] }) =>
      api.updateItem(tenant.tenantId, entity, vars.id, vars.input),
    onSuccess: () => {
      toast("success", u("toastPerubahanTersimpan"));
      setEditing(null);
      invalidate();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.archiveItem(tenant.tenantId, entity, id),
    onSuccess: () => {
      toast("success", u("toastDataDiarsipkan"));
      setToArchive(null);
      invalidate();
    },
    onError: (err) => {
      toast("error", (err as Error).message);
      setToArchive(null);
    },
  });

  return {
    tenant,
    isAdmin,
    query,
    create,
    update,
    archive,
    issues,
    setIssues,
    editing,
    setEditing,
    toArchive,
    setToArchive,
    search,
    setSearch,
    q,
    limit,
    setLimit,
  };
}

/**
 * Ekspor CSV master data beserta KOLOM FIELD KUSTOM (Fase 20j).
 *
 * Judul kolomnya memakai `fieldKey`, bukan label — label boleh berubah
 * sewaktu-waktu, sedangkan kunci tidak. Berkas ekspor yang judul kolomnya
 * berubah diam-diam akan merusak spreadsheet penerimanya.
 */
function ExportCsvButton<Row extends Record<string, unknown>>({
  namaBerkas,
  kolom,
  rows,
  defs,
}: {
  namaBerkas: string;
  kolom: { header: string; ambil: (r: Row) => string | number }[];
  rows: Row[];
  defs: { fieldKey: string }[];
}) {
  const u = useUi();
  return (
    <Button
      variant="ghost"
      data-testid={`ekspor-${namaBerkas}`}
      onClick={() => {
        const headers = [...kolom.map((k) => k.header), ...defs.map((d) => d.fieldKey)];
        const data = rows.map((r) => {
          const kustom = (r.customFields ?? []) as { fieldKey: string; value: string }[];
          return [
            ...kolom.map((k) => k.ambil(r)),
            ...defs.map((d) => kustom.find((v) => v.fieldKey === d.fieldKey)?.value ?? ""),
          ];
        });
        downloadCsv(namaBerkas, headers, data);
      }}
    >
      <Download className="size-4" aria-hidden /> {u("eksporCsv")}
    </Button>
  );
}

/** Kotak cari daftar master data (debounce lewat useEntityPage). */
function SearchBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden
      />
      <Input
        aria-label={label}
        className="pl-9"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Footer "Menampilkan X dari Y" + tombol muat lebih banyak. */
function LoadMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  const u = useUi();
  const lang = useLang();
  if (total <= shown) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <span className="text-xs text-ink-muted">
        {lang === "en" ? `Showing ${shown} of ${total}` : `Menampilkan ${shown} dari ${total}`}
      </span>
      <Button variant="secondary" className="h-8" onClick={onMore}>
        {u("muatLebihBanyak")}
      </Button>
    </div>
  );
}

/** Tombol aksi baris (Ubah + Arsipkan) yang seragam di ketiga halaman. */
function RowActions({ onEdit, onArchive }: { onEdit: () => void; onArchive: () => void }) {
  const u = useUi();
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" className="h-8" onClick={onEdit}>
        {u("ubah")}
      </Button>
      <Button
        variant="ghost"
        className="h-8 text-galat-ink hover:bg-galat-surface"
        onClick={onArchive}
      >
        {u("arsipkan")}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sell_price: number;
  buy_price: number;
  track_expiry: number;
  is_service: number;
  min_stock: number;
  barcode: string | null;
  uom_secondary: string | null;
  uom_factor: number;
  track_serial: number;
};

/** Registri nomor seri untuk produk yang melacak seri (Fase 7c). */
function SerialManager({ product }: { product: ProductRow }) {
  const u = useUi();
  const { tenant } = useWorkspace();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [serialNo, setSerialNo] = useState("");
  const key = ["serials", tenant.tenantId, product.id] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: () => api.productSerials(tenant.tenantId, product.id),
  });

  const add = useMutation({
    mutationFn: () =>
      api.addProductSerial(tenant.tenantId, product.id, { serialNo: serialNo.trim() }),
    onSuccess: () => {
      setSerialNo("");
      queryClient.invalidateQueries({ queryKey: key });
      toast("success", u("toastNomorSeriDitambah"));
    },
    onError: (e: Error) => toast("error", e.message),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "in_stock" | "sold" }) =>
      api.setSerialStatus(tenant.tenantId, product.id, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast("error", e.message),
  });

  const serials = query.data?.serials ?? [];
  const available = serials.filter((s) => s.status === "in_stock").length;
  return (
    <div className="mt-4 rounded-xl border border-line p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {u("nomorSeri")} — {product.name}
        </h3>
        <span className="text-xs text-ink-muted">
          {available} {u("tersedia")} / {serials.length} {u("total").toLowerCase()}
        </span>
      </div>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (serialNo.trim()) add.mutate();
        }}
      >
        <Input
          id="serial-no"
          value={serialNo}
          onChange={(e) => setSerialNo(e.target.value)}
          placeholder={u("isiNomorSeri")}
          className="flex-1"
        />
        <Button type="submit" disabled={add.isPending || !serialNo.trim()}>
          {add.isPending ? <Spinner /> : null} {u("tambahSeri")}
        </Button>
      </form>
      {query.isLoading ? (
        <div className="mt-3">
          <Spinner />
        </div>
      ) : serials.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{u("belumAdaNomorSeri")}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {serials.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-mono text-xs">{s.serialNo}</span>
              <span className="flex items-center gap-2">
                <Badge tone={s.status === "in_stock" ? "green" : "neutral"}>
                  {s.status === "in_stock" ? "Tersedia" : "Terjual"}
                </Badge>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setStatus.mutate({
                      id: s.id,
                      status: s.status === "in_stock" ? "sold" : "in_stock",
                    })
                  }
                  disabled={setStatus.isPending}
                >
                  {s.status === "in_stock" ? "Tandai terjual" : "Kembalikan"}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Mulai cepat (Fase 11f): isi contoh produk & kontak sesuai jenis usaha. */
function IndustryTemplateCard() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const toast = useToast();
  const qc = useQueryClient();
  const [industry, setIndustry] = useState<IndustryKey>("retail");
  const apply = useMutation({
    mutationFn: () => api.applyIndustryTemplate(tenant.tenantId, industry),
    onSuccess: (r) => {
      toast("success", isi(u("toastContohDitambah"), r.productsAdded, r.contactsAdded));
      void qc.invalidateQueries({ queryKey: ["products", tenant.tenantId] });
      void qc.invalidateQueries({ queryKey: ["contacts", tenant.tenantId] });
    },
    onError: (e) => toast("error", (e as Error).message),
  });
  return (
    <Card>
      <CardHeader title={u("mulaiCepat")} description={u("descMulaiCepat")} />
      <CardBody className="flex flex-wrap items-end gap-3">
        <div>
          <Label>{u("jenisUsaha")}</Label>
          <Select
            value={industry}
            onChange={(e) => setIndustry(e.target.value as IndustryKey)}
            className="w-56"
          >
            {INDUSTRY_KEYS.map((k) => (
              <option key={k} value={k}>
                {u(INDUSTRY_KEY[k])}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
          {apply.isPending ? "Mengisi…" : "Isi contoh data"}
        </Button>
      </CardBody>
    </Card>
  );
}

export function ProductsPage() {
  const u = useUi();
  const {
    isAdmin,
    query,
    create,
    update,
    archive,
    issues,
    setIssues,
    editing,
    setEditing,
    toArchive,
    setToArchive,
    search,
    setSearch,
    q,
    setLimit,
    tenant,
  } = useEntityPage<ProductRow>("products");
  const kustom = useFieldKustom(tenant.tenantId, "product");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIssues({});
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const parsed = productSchema.safeParse({
      sku: raw.sku,
      name: raw.name,
      unit: raw.unit || "pcs",
      sellPrice: Number(raw.sellPrice) || 0,
      buyPrice: Number(raw.buyPrice) || 0,
      trackExpiry: raw.trackExpiry === "on",
      isService: raw.isService === "on",
      minStock: Number(raw.minStock) || 0,
      barcode: raw.barcode || "",
      uomSecondary: raw.uomSecondary || "",
      uomFactor: Number(raw.uomFactor) || 1,
      trackSerial: raw.trackSerial === "on",
    });
    if (!parsed.success) {
      setIssues(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    if (editing) {
      update.mutate({ id: editing.id, input: { ...parsed.data, ...kustom.payload() } });
    } else {
      create.mutate({ ...parsed.data, ...kustom.payload() }, {
        onSuccess: () => {
          form.reset();
          kustom.reset();
        },
      });
    }
  }

  const [tambahBuka, setTambahBuka] = useState(false);
  const busy = create.isPending || update.isPending;

  // Fase 38j — formulir produk pindah ke Lembar. Ia melayani DUA hal sekaligus:
  // pembuatan (dibuka aksi utama) dan penyuntingan (dibuka tombol ubah pada
  // baris). Keduanya memang formulir yang sama, dan menyatukannya di satu
  // tempat menghilangkan kebingungan lama: dulu mengeklik "ubah" pada baris
  // paling bawah menggulirkan halaman jauh ke atas tanpa penjelasan.
  const lembarBuka = Boolean(editing) || tambahBuka;
  const tutupLembar = () => {
    setEditing(null);
    setTambahBuka(false);
  };

  return (
    <Halaman
      k="produk"
      ikon={Package}
      aksi={
        isAdmin ? (
          <Button onClick={() => setTambahBuka(true)}>
            <Plus className="size-4" aria-hidden /> {u("tambahProduk")}
          </Button>
        ) : null
      }
    >
      {isAdmin && (query.data?.total ?? 0) === 0 ? <IndustryTemplateCard /> : null}

      {isAdmin ? (
        <Lembar
          terbuka={lembarBuka}
          tutup={tutupLembar}
          lebar="lebar"
          judul={editing ? `${u("ubahProduk")} — ${editing.sku}` : u("tambahProduk")}
          deskripsi={editing ? u("descUbahProduk") : u("descTambahProduk")}
        >
          <div className="space-y-4">
            {editing ? null : (
              <ImportCsvButton
                entity="products"
                templateHeaders={["sku", "nama", "satuan", "harga_jual", "harga_beli", "lacak_exp"]}
                templateExample={["BRG-001", "Kopi Arabika 1kg", "pcs", 150000, 100000, "tidak"]}
                mapRow={(r) => ({
                  sku: r.sku ?? "",
                  name: r.nama ?? r.name ?? "",
                  unit: r.satuan || r.unit || "pcs",
                  sellPrice: Number(r.harga_jual ?? r.sellprice ?? 0) || 0,
                  buyPrice: Number(r.harga_beli ?? r.buyprice ?? 0) || 0,
                  trackExpiry: ["ya", "yes", "1", "true"].includes(
                    (r.lacak_exp ?? "").toLowerCase()
                  ),
                })}
              />
            )}
            <form
              key={editing?.id ?? "new"}
              onSubmit={onSubmit}
              className="grid gap-3 sm:grid-cols-2"
              noValidate
            >
              <div>
                <Label htmlFor="p-sku">SKU</Label>
                <Input
                  id="p-sku"
                  name="sku"
                  placeholder="BRG-001"
                  defaultValue={editing?.sku}
                  required
                />
                <FieldError messages={issues.sku} />
              </div>
              <div>
                <Label htmlFor="p-unit">{u("satuan")}</Label>
                <Input
                  id="p-unit"
                  name="unit"
                  placeholder="pcs"
                  defaultValue={editing?.unit ?? "pcs"}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-name">{u("nama")}</Label>
                <Input
                  id="p-name"
                  name="name"
                  placeholder={u("mdPhNamaProduk")}
                  defaultValue={editing?.name}
                  required
                />
                <FieldError messages={issues.name} />
              </div>
              <div>
                <Label htmlFor="p-sell">{u("hargaJualRp")}</Label>
                <Input
                  id="p-sell"
                  name="sellPrice"
                  type="number"
                  min={0}
                  placeholder="150000"
                  defaultValue={editing?.sell_price}
                />
              </div>
              <div>
                <Label htmlFor="p-buy">{u("hargaBeliRp")}</Label>
                <Input
                  id="p-buy"
                  name="buyPrice"
                  type="number"
                  min={0}
                  placeholder="100000"
                  defaultValue={editing?.buy_price}
                />
              </div>
              <div>
                <Label htmlFor="p-minstock">{u("stokMinimum")}</Label>
                <Input
                  id="p-minstock"
                  name="minStock"
                  type="number"
                  min={0}
                  placeholder={u("nolTanpaPeringatan")}
                  defaultValue={editing?.min_stock || ""}
                />
              </div>
              <div>
                <Label htmlFor="p-barcode">{u("barcodeLabel")}</Label>
                <Input
                  id="p-barcode"
                  name="barcode"
                  placeholder={u("opsionalPindaiKasir")}
                  defaultValue={editing?.barcode ?? ""}
                />
                <FieldError messages={issues.barcode} />
              </div>
              <div>
                <Label htmlFor="p-uom2">{u("satuanBesar")}</Label>
                <Input
                  id="p-uom2"
                  name="uomSecondary"
                  placeholder={u("contohSatuanBesar")}
                  defaultValue={editing?.uom_secondary ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="p-uomf">{u("satuanBesarSamaDengan")}</Label>
                <Input
                  id="p-uomf"
                  name="uomFactor"
                  type="number"
                  min={1}
                  placeholder={u("contohFaktorSatuan")}
                  defaultValue={
                    editing?.uom_factor && editing.uom_factor > 1 ? editing.uom_factor : ""
                  }
                />
                <FieldError messages={issues.uomFactor} />
              </div>
              <div className="sm:col-span-2">
                <CustomFieldInputs
                  defs={kustom.defs}
                  values={kustom.values}
                  onChange={kustom.setValue}
                  idPrefix="produk"
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-ink-soft sm:col-span-2">
                <input
                  type="checkbox"
                  name="trackExpiry"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong"
                  defaultChecked={editing ? editing.track_expiry === 1 : false}
                />
                {u("lacakLotKedaluwarsa")}
              </label>
              <label className="flex items-start gap-2 text-sm text-ink-soft sm:col-span-2">
                <input
                  type="checkbox"
                  name="isService"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong"
                  defaultChecked={editing ? editing.is_service === 1 : false}
                />
                {u("jasaTanpaStok")}
              </label>
              <label className="flex items-start gap-2 text-sm text-ink-soft sm:col-span-2">
                <input
                  type="checkbox"
                  name="trackSerial"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong"
                  defaultChecked={editing ? editing.track_serial === 1 : false}
                />
                {u("lacakNomorSeri")}
              </label>
              {/*
                Aksi utama duduk di DASAR formulir, bukan di tengahnya.
                Sebelum Fase 38h formulir ini berbaris mendatar di atas daftar,
                jadi tombolnya jatuh di kolom terakhir — di dalam Lembar yang
                menggulir tegak, posisi itu menaruh "Simpan" di tengah medan.
              */}
              <div className="flex gap-2 border-t border-line pt-3 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? <Spinner /> : null} {editing ? u("simpan") : u("tambah")}
                </Button>
                {editing ? (
                  <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                    {u("batal")}
                  </Button>
                ) : null}
              </div>
            </form>
            {editing && editing.track_serial === 1 ? <SerialManager product={editing} /> : null}
          </div>
        </Lembar>
      ) : null}

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SearchBox
              label={u("cariProduk")}
              value={search}
              onChange={(v) => {
                setSearch(v);
                setLimit(100);
              }}
            />
            <ExportCsvButton
              namaBerkas="produk.csv"
              defs={kustom.defs}
              rows={(query.data?.items ?? []) as unknown as Record<string, unknown>[]}
              kolom={[
                { header: "sku", ambil: (r) => String(r.sku ?? "") },
                { header: "nama", ambil: (r) => String(r.name ?? "") },
                { header: "satuan", ambil: (r) => String(r.unit ?? "") },
                { header: "harga_jual", ambil: (r) => Number(r.sell_price ?? 0) },
                { header: "harga_beli", ambil: (r) => Number(r.buy_price ?? 0) },
              ]}
            />
          </div>
          {query.isLoading ? (
            <Spinner />
          ) : (query.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Package className="size-6" aria-hidden />}
              title={q ? u("tidakAdaProdukCocok") : u("belumAdaProduk")}
              description={q ? u("cobaKataKunciLain") : u("descBelumAdaProduk")}
            />
          ) : (
            <div>
              <Table>
                <Thead>
                  <tr>
                    <Th>SKU</Th>
                    <Th>{u("nama")}</Th>
                    <Th>{u("satuan")}</Th>
                    <Th numeric>{u("hargaJual")}</Th>
                    <Th numeric>{u("hargaBeli")}</Th>
                    <Th className="hidden sm:table-cell">{u("barcodeLabel")}</Th>
                    <Th>{u("label")}</Th>
                    {isAdmin ? <Th></Th> : null}
                  </tr>
                </Thead>
                <tbody>
                  {((query.data?.items ?? []) as ProductRow[]).map((p) => (
                    <Tr key={p.id}>
                      <Td label="SKU" className="font-mono text-xs">
                        {p.sku}
                      </Td>
                      <Td label={u("nama")}>
                        {p.name}
                        {p.uom_secondary && p.uom_factor > 1 ? (
                          <span className="ml-1 text-xs text-ink-muted">
                            · 1 {p.uom_secondary} = {p.uom_factor} {p.unit}
                          </span>
                        ) : null}
                      </Td>
                      <Td label={u("satuan")}>{p.unit}</Td>
                      <Td numeric label={u("hargaJual")}>
                        {formatIDR(p.sell_price)}
                      </Td>
                      <Td numeric label={u("hargaBeli")}>
                        {formatIDR(p.buy_price)}
                      </Td>
                      {/* Barcode disembunyikan di layar sempit LEWAT `sm:`, jadi
                          di mode kartu ia memang tidak ikut tampil — dan itu
                          disengaja: kartu produk sudah panjang. */}
                      <Td
                        label={u("barcodeLabel")}
                        className="hidden font-mono text-xs sm:table-cell"
                      >
                        {p.barcode || "—"}
                      </Td>
                      <Td label={u("label")} className="space-x-1">
                        {p.track_expiry ? <Badge tone="amber">FEFO</Badge> : null}
                        {p.track_serial ? <Badge tone="brand">{u("seri")}</Badge> : null}
                        {!p.track_expiry && !p.track_serial ? "—" : null}
                      </Td>
                      {isAdmin ? (
                        <Td className="text-right">
                          <RowActions
                            onEdit={() => setEditing(p)}
                            onArchive={() => setToArchive(p)}
                          />
                        </Td>
                      ) : null}
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <LoadMore
                shown={query.data?.items.length ?? 0}
                total={query.data?.total ?? 0}
                onMore={() => setLimit((l) => Math.min(l + 100, 500))}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={toArchive !== null}
        title={u("arsipkanProduk")}
        description={
          toArchive ? `${toArchive.sku} — ${toArchive.name} ${u("descArsipkan")}` : undefined
        }
        confirmLabel={u("arsipkan")}
        danger
        busy={archive.isPending}
        onConfirm={() => toArchive && archive.mutate(toArchive.id)}
        onCancel={() => setToArchive(null)}
      />
    </Halaman>
  );
}

// ---------------------------------------------------------------------------

type ContactRow = {
  id: string;
  type: ContactType;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  npwp: string | null;
  /** Grup harga pelanggan (Fase 23a); null = pakai harga dasar produk. */
  price_group_id: string | null;
  /** Batas kredit (Fase 42a); null = tanpa batas, 0 = tidak boleh berutang. */
  credit_limit: number | null;
  /** Termin pembayaran dalam hari (Fase 42a); null = tidak ada termin baku. */
  payment_term_days: number | null;
};

// Konstanta tingkat modul tidak boleh memanggil hook, jadi yang disimpan
// adalah KUNCI kamus — diterjemahkan saat render (pola sama dengan Fase 16j).
const CONTACT_TYPE_LABELS: Record<ContactType, UiKey> = {
  customer: "pelanggan",
  supplier: "pemasok",
  both: "pelangganPemasok",
};

export function ContactsPage() {
  const u = useUi();
  const [tambahBuka, setTambahBuka] = useState(false);
  const {
    isAdmin,
    query,
    create,
    update,
    archive,
    issues,
    setIssues,
    editing,
    setEditing,
    toArchive,
    setToArchive,
    search,
    setSearch,
    q,
    setLimit,
    tenant,
  } = useEntityPage<ContactRow>("contacts");
  const kustom = useFieldKustom(tenant.tenantId, "contact");

  const priceGroupsQuery = useQuery({
    queryKey: ["price-groups", tenant.tenantId],
    queryFn: () => api.listItems<{ id: string; name: string }>(tenant.tenantId, "price-groups", { limit: 200 }),
  });
  const priceGroups = priceGroupsQuery.data?.items ?? [];

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIssues({});
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form)) as Record<string, string>;
    // Fase 42a — dua medan angka yang KOSONGNYA bermakna.
    //
    // Pola `Number(x) || 0` yang dipakai formulir produk di berkas ini tidak
    // bisa dipakai di sini: ia mengubah medan kosong menjadi 0, dan 0 pada
    // kedua kolom ini berarti kebalikan dari kosong — "tidak boleh berutang
    // sama sekali" dan "jatuh tempo hari itu juga". Kosong harus tetap
    // `undefined` supaya tersimpan NULL.
    const angkaOpsional = (v: string | undefined) => (v === undefined || v.trim() === "" ? undefined : Number(v));
    const parsed = contactSchema.safeParse({
      ...raw,
      creditLimit: angkaOpsional(raw.creditLimit),
      paymentTermDays: angkaOpsional(raw.paymentTermDays),
    });
    if (!parsed.success) {
      setIssues(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    const input = { ...parsed.data, ...kustom.payload() };
    if (editing) {
      update.mutate({ id: editing.id, input });
    } else {
      create.mutate(input, {
        onSuccess: () => {
          form.reset();
          kustom.reset();
        },
      });
    }
  }

  const busy = create.isPending || update.isPending;
  return (
    <Halaman
      k="kontak"
      ikon={Contact}
      aksi={
        isAdmin ? (
          <Button onClick={() => setTambahBuka(true)}>
            <Plus className="size-4" aria-hidden /> {u("tambahKontak")}
          </Button>
        ) : null
      }
    >
      {isAdmin ? (
        <Lembar
          terbuka={Boolean(editing) || tambahBuka}
          tutup={() => {
            setEditing(null);
            setTambahBuka(false);
          }}
          lebar="lebar"
          judul={editing ? `${u("ubahKontak")} — ${editing.name}` : u("tambahKontak")}
          deskripsi={editing ? u("descUbahKontak") : u("descTambahKontak")}
        >
          <div className="space-y-4">
            {editing ? null : (
              <ImportCsvButton
                entity="contacts"
                templateHeaders={["jenis", "nama", "email", "telepon", "alamat", "npwp"]}
                templateExample={[
                  "pelanggan",
                  "PT Pelanggan Setia",
                  "info@pelanggan.co.id",
                  "0812345678",
                  "Jakarta",
                  "",
                ]}
                mapRow={(r) => ({
                  type:
                    { pelanggan: "customer", pemasok: "supplier", keduanya: "both" }[
                      (r.jenis ?? r.type ?? "").toLowerCase()
                    ] ??
                    (r.type || "customer"),
                  name: r.nama ?? r.name ?? "",
                  email: r.email || undefined,
                  phone: r.telepon || r.phone || undefined,
                  address: r.alamat || r.address || undefined,
                  npwp: r.npwp || undefined,
                })}
              />
            )}
            <form
              key={editing?.id ?? "new"}
              onSubmit={onSubmit}
              className="grid gap-3 sm:grid-cols-2"
              noValidate
            >
              <div>
                <Label htmlFor="k-type">{u("jenis")}</Label>
                <Select id="k-type" name="type" defaultValue={editing?.type ?? "customer"}>
                  <option value="customer">{u("pelanggan")}</option>
                  <option value="supplier">{u("pemasok")}</option>
                  <option value="both">{u("keduanya")}</option>
                </Select>
              </div>
              {/* Fase 23a: grup harga pelanggan. Ditaruh di form utama, bukan di
                  blok "hanya saat mengubah", karena grup paling sering ditetapkan
                  justru saat pelanggan grosir pertama kali didaftarkan. */}
              <div>
                <Label htmlFor="k-price-group">{u("ghGrup")}</Label>
                <Select
                  id="k-price-group"
                  name="priceGroupId"
                  defaultValue={editing?.price_group_id ?? ""}
                >
                  <option value="">{u("ghTanpaGrup")}</option>
                  {priceGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="k-name">{u("nama")}</Label>
                <Input
                  id="k-name"
                  name="name"
                  placeholder={u("contohNamaPelanggan")}
                  defaultValue={editing?.name}
                  required
                />
                <FieldError messages={issues.name} />
              </div>
              <div>
                <Label htmlFor="k-email">{u("email")}</Label>
                <Input
                  id="k-email"
                  name="email"
                  type="email"
                  placeholder="opsional"
                  defaultValue={editing?.email ?? ""}
                />
                <FieldError messages={issues.email} />
              </div>
              <div>
                <Label htmlFor="k-phone">{u("telepon")}</Label>
                <Input
                  id="k-phone"
                  name="phone"
                  placeholder="opsional"
                  defaultValue={editing?.phone ?? ""}
                />
              </div>
              {editing ? (
                <>
                  <div>
                    <Label htmlFor="k-address">{u("alamat")}</Label>
                    <Input
                      id="k-address"
                      name="address"
                      placeholder="opsional"
                      defaultValue={editing.address ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="k-npwp">NPWP</Label>
                    <Input
                      id="k-npwp"
                      name="npwp"
                      placeholder="opsional"
                      defaultValue={editing.npwp ?? ""}
                    />
                  </div>
                  {/* Fase 42a — keduanya opsional, dan kosong BERBEDA dari nol.
                      Kosong pada batas kredit berarti tanpa batas; nol berarti
                      pelanggan tidak boleh berutang sama sekali. Placeholder-nya
                      menyebutkan itu, karena selisih ini mustahil ditebak. */}
                  <div>
                    <Label htmlFor="k-termin">{u("mdTerminPembayaran")}</Label>
                    <Input
                      id="k-termin"
                      name="paymentTermDays"
                      type="number"
                      min={0}
                      max={365}
                      placeholder={u("mdTerminPlaceholder")}
                      defaultValue={editing.payment_term_days ?? ""}
                    />
                    <p className="mt-1 text-xs text-ink-muted">{u("mdTerminBantuan")}</p>
                  </div>
                  <div>
                    <Label htmlFor="k-kredit">{u("mdBatasKredit")}</Label>
                    <Input
                      id="k-kredit"
                      name="creditLimit"
                      type="number"
                      min={0}
                      placeholder={u("mdBatasKreditPlaceholder")}
                      defaultValue={editing.credit_limit ?? ""}
                    />
                    <p className="mt-1 text-xs text-ink-muted">{u("mdBatasKreditBantuan")}</p>
                  </div>
                </>
              ) : null}
              <div className="sm:col-span-2">
                <CustomFieldInputs
                  defs={kustom.defs}
                  values={kustom.values}
                  onChange={kustom.setValue}
                  idPrefix="kontak"
                />
              </div>
              <div className="flex gap-2 border-t border-line pt-3 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? <Spinner /> : null} {editing ? u("simpan") : u("tambah")}
                </Button>
                {editing ? (
                  <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                    {u("batal")}
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        </Lembar>
      ) : null}

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SearchBox
              label={u("cariKontak")}
              value={search}
              onChange={(v) => {
                setSearch(v);
                setLimit(100);
              }}
            />
            <ExportCsvButton
              namaBerkas="kontak.csv"
              defs={kustom.defs}
              rows={(query.data?.items ?? []) as unknown as Record<string, unknown>[]}
              kolom={[
                { header: "nama", ambil: (r) => String(r.name ?? "") },
                { header: "jenis", ambil: (r) => String(r.type ?? "") },
                { header: "email", ambil: (r) => String(r.email ?? "") },
                { header: "telepon", ambil: (r) => String(r.phone ?? "") },
              ]}
            />
          </div>
          {query.isLoading ? (
            <Spinner />
          ) : (query.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Contact className="size-6" aria-hidden />}
              title={q ? u("tidakAdaKontakCocok") : u("belumAdaKontak")}
              description={q ? u("cobaKataKunciLain") : u("descBelumAdaKontak")}
            />
          ) : (
            <div>
              <Table>
                <Thead>
                  <tr>
                    <Th>{u("nama")}</Th>
                    <Th>{u("jenis")}</Th>
                    <Th>{u("email")}</Th>
                    <Th>{u("telepon")}</Th>
                    {isAdmin ? <Th></Th> : null}
                  </tr>
                </Thead>
                <tbody>
                  {((query.data?.items ?? []) as ContactRow[]).map((k) => (
                    <Tr key={k.id}>
                      <Td label={u("nama")}>{k.name}</Td>
                      <Td label={u("jenis")}>
                        <Badge>{u(CONTACT_TYPE_LABELS[k.type])}</Badge>
                      </Td>
                      <Td label={u("email")}>{k.email ?? "—"}</Td>
                      <Td label={u("telepon")}>{k.phone ?? "—"}</Td>
                      {isAdmin ? (
                        <Td className="text-right">
                          <RowActions
                            onEdit={() => setEditing(k)}
                            onArchive={() => setToArchive(k)}
                          />
                        </Td>
                      ) : null}
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <LoadMore
                shown={query.data?.items.length ?? 0}
                total={query.data?.total ?? 0}
                onMore={() => setLimit((l) => Math.min(l + 100, 500))}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={toArchive !== null}
        title={u("arsipkanKontak")}
        description={toArchive ? `${toArchive.name} ${u("descArsipkan")}` : undefined}
        confirmLabel={u("arsipkan")}
        danger
        busy={archive.isPending}
        onConfirm={() => toArchive && archive.mutate(toArchive.id)}
        onCancel={() => setToArchive(null)}
      />
    </Halaman>
  );
}

// ---------------------------------------------------------------------------

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  /** Fase 48b — gudang konsinyasi & mitra penitipannya. */
  is_consignment?: number;
  partner_contact_id?: string | null;
};

export function WarehousesPage() {
  const u = useUi();
  const {
    isAdmin,
    query,
    create,
    update,
    archive,
    issues,
    setIssues,
    editing,
    setEditing,
    toArchive,
    setToArchive,
    search,
    setSearch,
    q,
    setLimit,
  } = useEntityPage<WarehouseRow>("warehouses");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIssues({});
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    // FormData memberi "on" untuk kotak centang yang tercentang, dan tidak
    // memberi apa pun bila tidak — keduanya bukan boolean. Dikonversi di sini
    // supaya skema tetap menerima tipe yang sebenarnya (Fase 48b).
    const parsed = warehouseSchema.safeParse({
      ...data,
      isConsignment: data.isConsignment === "on",
      partnerContactId: data.partnerContactId || undefined,
    });
    if (!parsed.success) {
      setIssues(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    if (editing) {
      update.mutate({ id: editing.id, input: parsed.data });
    } else {
      create.mutate(parsed.data, { onSuccess: () => form.reset() });
    }
  }

  const busy = create.isPending || update.isPending;
  return (
    <div className="space-y-6">
      <PageHeading k="gudang" />

      {isAdmin ? (
        <Card>
          <CardHeader
            title={editing ? `${u("ubahGudang")} — ${editing.code}` : u("tambahGudang")}
            description={editing ? u("descUbahGudang") : u("descTambahGudang")}
          />
          <CardBody>
            <form
              key={editing?.id ?? "new"}
              onSubmit={onSubmit}
              className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr_auto] sm:items-end"
              noValidate
            >
              <div>
                <Label htmlFor="w-code">{u("kode")}</Label>
                <Input
                  id="w-code"
                  name="code"
                  placeholder="CAB-01"
                  defaultValue={editing?.code}
                  required
                />
                <FieldError messages={issues.code} />
              </div>
              <div>
                <Label htmlFor="w-name">{u("nama")}</Label>
                <Input
                  id="w-name"
                  name="name"
                  placeholder={u("contohNamaGudang")}
                  defaultValue={editing?.name}
                  required
                />
                <FieldError messages={issues.name} />
              </div>
              <div>
                <Label htmlFor="w-address">{u("alamat")}</Label>
                <Input
                  id="w-address"
                  name="address"
                  placeholder="opsional"
                  defaultValue={editing?.address ?? ""}
                />
              </div>
              {/* Konsinyasi (Fase 48b): gudang bertanda, bukan mekanisme
                  tersendiri. Barang yang dititipkan masih milik kita, jadi
                  memindahkannya ke sana bukan penjualan. */}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm" htmlFor="w-konsinyasi">
                  <input
                    id="w-konsinyasi"
                    name="isConsignment"
                    type="checkbox"
                    defaultChecked={editing?.is_consignment === 1}
                  />
                  {u("gudangKonsinyasi")}
                </label>
                <p className="mt-1 text-xs text-ink-muted">{u("descGudangKonsinyasi")}</p>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="w-mitra">{u("mitraPenitipan")}</Label>
                <Input
                  id="w-mitra"
                  name="partnerContactId"
                  placeholder="opsional"
                  defaultValue={editing?.partner_contact_id ?? ""}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? <Spinner /> : null} {editing ? u("simpan") : u("tambah")}
                </Button>
                {editing ? (
                  <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                    {u("batal")}
                  </Button>
                ) : null}
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-3">
          <SearchBox
            label={u("cariGudang")}
            value={search}
            onChange={(v) => {
              setSearch(v);
              setLimit(100);
            }}
          />
          {query.isLoading ? (
            <Spinner />
          ) : (query.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Warehouse className="size-6" aria-hidden />}
              title={q ? u("tidakAdaGudangCocok") : u("belumAdaGudang")}
              description={q ? u("cobaKataKunciLain") : u("descBelumAdaGudang")}
            />
          ) : (
            <div>
              <Table>
                <Thead>
                  <tr>
                    <Th>{u("kode")}</Th>
                    <Th>{u("nama")}</Th>
                    <Th>{u("alamat")}</Th>
                    {isAdmin ? <Th></Th> : null}
                  </tr>
                </Thead>
                <tbody>
                  {((query.data?.items ?? []) as WarehouseRow[]).map((w) => (
                    <Tr key={w.id}>
                      <Td label={u("kode")} className="font-mono text-xs">
                        {w.code}
                      </Td>
                      <Td label={u("nama")}>{w.name}</Td>
                      <Td label={u("alamat")}>{w.address ?? "—"}</Td>
                      {isAdmin ? (
                        <Td className="text-right">
                          <RowActions
                            onEdit={() => setEditing(w)}
                            onArchive={() => setToArchive(w)}
                          />
                        </Td>
                      ) : null}
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <LoadMore
                shown={query.data?.items.length ?? 0}
                total={query.data?.total ?? 0}
                onMore={() => setLimit((l) => Math.min(l + 100, 500))}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={toArchive !== null}
        title={u("arsipkanGudang")}
        description={
          toArchive ? `${toArchive.code} — ${toArchive.name} ${u("descArsipkanGudang")}` : undefined
        }
        confirmLabel={u("arsipkan")}
        danger
        busy={archive.isPending}
        onConfirm={() => toArchive && archive.mutate(toArchive.id)}
        onCancel={() => setToArchive(null)}
      />
    </div>
  );
}
