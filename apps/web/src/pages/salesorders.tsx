import {
  SO_STATUS_LABELS,
  TAX_RATES,
  type ApiSalesOrder,
  type SalesOrderStatus,
} from "@erpindo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Send, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { api, formatIDR } from "../api/client";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Select,
  Spinner,
  useToast,
  PageHeading,
} from "../components/ui";
import { isi } from "../i18n";
import { useUi } from "../i18n/ui";
import { hargaBaris, useGrupHarga } from "../lib/hargaGrup";
import { useWorkspace } from "./app";

type ProductRow = { id: string; name: string; sell_price: number };
type ContactRow = { id: string; name: string; type: string };
type WarehouseRow = { id: string; name: string };
type AccountRow = { id: string; code: string; name: string; type: string };

const today = () => new Date().toISOString().slice(0, 10);
const SO_TONE: Record<SalesOrderStatus, "brand" | "amber" | "green" | "red"> = {
  open: "brand",
  delivered: "amber",
  invoiced: "green",
  cancelled: "red",
};

/** Cetak surat jalan sederhana lewat jendela print browser. */
function printDeliveryNote(o: ApiSalesOrder, companyName: string) {
  const rows = o.lines.map((l) => `<tr><td>${l.productName}</td><td style="text-align:right">${l.qty}</td></tr>`).join("");
  const w = window.open("", "_blank", "width=600,height=700");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>Surat Jalan ${o.deliveryNo ?? o.soNo}</title><style>
    body{font-family:sans-serif;font-size:13px;padding:24px;max-width:640px;margin:0 auto}
    h1{font-size:18px} table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left} .r{text-align:right}
  </style></head><body>
    <h1>${companyName}</h1>
    <div><strong>SURAT JALAN</strong> ${o.deliveryNo ?? "—"} · Pesanan ${o.soNo}</div>
    <div>Kepada: ${o.contactName} · Tanggal: ${o.orderDate}</div>
    <table><thead><tr><th>Barang</th><th class="r">Jumlah</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:32px">Diterima oleh: ________________</p>
    <script>window.print()</script>
  </body></html>`);
  w.document.close();
}

export function SalesOrdersPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const isAdmin = tenant.role !== "viewer";

  const productsQuery = useQuery({ queryKey: ["products", tenant.tenantId], queryFn: () => api.listItems<ProductRow>(tenant.tenantId, "products") });
  const contactsQuery = useQuery({ queryKey: ["contacts", tenant.tenantId], queryFn: () => api.listItems<ContactRow>(tenant.tenantId, "contacts") });
  const warehousesQuery = useQuery({ queryKey: ["warehouses", tenant.tenantId], queryFn: () => api.listItems<WarehouseRow>(tenant.tenantId, "warehouses") });
  const accountsQuery = useQuery({ queryKey: ["accounts", tenant.tenantId], queryFn: () => api.accounts(tenant.tenantId) });
  const ordersQuery = useQuery({ queryKey: ["sales-orders", tenant.tenantId], queryFn: () => api.salesOrders(tenant.tenantId) });

  const products = (productsQuery.data?.items ?? []) as ProductRow[];
  const customers = ((contactsQuery.data?.items ?? []) as ContactRow[]).filter((k) => ["customer", "both"].includes(k.type));
  const warehouses = (warehousesQuery.data?.items ?? []) as WarehouseRow[];
  const cashAccounts = ((accountsQuery.data?.accounts ?? []) as AccountRow[]).filter((a) => a.type === "asset");
  const orders = ordersQuery.data?.orders ?? [];

  return (
    <div className="space-y-6">
      <div>
        {/* Fase 19g: judul + pengantar ke PAGE_HEADINGS (Fase 16a). */}
        <PageHeading k="pesananPenjualan" />
      </div>

      {isAdmin ? <NewOrderCard tenantId={tenant.tenantId} products={products} customers={customers} warehouses={warehouses} /> : null}

      <Card>
        <CardHeader title={u("daftarPesanan")} description={u("descDaftarPesanan")} />
        <CardBody>
          {ordersQuery.isLoading ? (
            <Spinner />
          ) : orders.length === 0 ? (
            <EmptyState icon={<FileText className="size-6" aria-hidden />} title={u("belumAdaPesanan")} description={u("descBelumAdaPesananSo")} />
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <OrderRow key={o.id} order={o} isAdmin={isAdmin} cashAccounts={cashAccounts} companyName={tenant.tenantName} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function NewOrderCard({ tenantId, products, customers, warehouses }: { tenantId: string; products: ProductRow[]; customers: ContactRow[]; warehouses: WarehouseRow[] }) {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [head, setHead] = useState({ contactId: "", warehouseId: "", taxRate: "0", orderDate: today(), expectedDate: "" });
  // `hargaDisentuh` (Fase 23b): prefill lama memakai `l.unitPrice || …`, dan
  // syarat "string kosong" itu TIDAK cukup sebagai penjaga harga nego — harga
  // yang sengaja dikosongkan lalu diisi ulang tak terbedakan darinya.
  type SoLine = {
    productId: string;
    qty: string;
    unitPrice: string;
    discountPct: string;
    hargaDisentuh: boolean;
    hargaDariGrup: boolean;
  };
  const barisKosong = (): SoLine => ({
    productId: "",
    qty: "1",
    unitPrice: "",
    discountPct: "",
    hargaDisentuh: false,
    hargaDariGrup: false,
  });
  const [lines, setLines] = useState<SoLine[]>([barisKosong()]);
  const grupHarga = useGrupHarga(tenantId);

  function pilihProduk(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    const hasil = p
      ? hargaBaris(grupHarga.harga, { productId: p.id, hargaDasar: p.sell_price })
      : { harga: 0, sumber: "dasar" as const };
    setLines((ls) =>
      ls.map((l, j) =>
        j === i
          ? {
              ...l,
              productId,
              unitPrice: p ? String(hasil.harga || "") : l.unitPrice,
              hargaDisentuh: false,
              hargaDariGrup: hasil.sumber === "grup",
            }
          : l,
      ),
    );
  }

  /** Ganti pelanggan → muat daftar harga grupnya, hitung ulang baris yang belum diketik manual. */
  async function pilihPelanggan(idBaru: string) {
    setHead((h) => ({ ...h, contactId: idBaru }));
    const { harga } = await grupHarga.muat(idBaru);
    setLines((ls) =>
      ls.map((l) => {
        if (!l.productId || l.hargaDisentuh) return l;
        const p = products.find((x) => x.id === l.productId);
        if (!p) return l;
        const hasil = hargaBaris(harga, { productId: l.productId, hargaDasar: p.sell_price });
        return { ...l, unitPrice: String(hasil.harga || ""), hargaDariGrup: hasil.sumber === "grup" };
      }),
    );
  }

  const create = useMutation({
    mutationFn: () =>
      api.createSalesOrder(tenantId, {
        contactId: head.contactId,
        orderDate: head.orderDate,
        ...(head.expectedDate ? { expectedDate: head.expectedDate } : {}),
        warehouseId: head.warehouseId,
        taxRate: Number(head.taxRate) as (typeof TAX_RATES)[number],
        lines: lines
          .filter((l) => l.productId && Number(l.qty) > 0)
          .map((l) => ({ productId: l.productId, qty: Number(l.qty), unitPrice: Number(l.unitPrice) || 0, ...(Number(l.discountPct) > 0 ? { discountPct: Number(l.discountPct) } : {}) })),
      }),
    onSuccess: (res) => {
      toast("success", isi(u("toastPesananDibuat"), res.soNo));
      setHead({ contactId: "", warehouseId: "", taxRate: "0", orderDate: today(), expectedDate: "" });
      setLines([barisKosong()]);
      queryClient.invalidateQueries({ queryKey: ["sales-orders", tenantId] });
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const canSubmit = head.contactId && head.warehouseId && lines.some((l) => l.productId && Number(l.qty) > 0);

  return (
    <Card>
      <CardHeader title={u("pesananBaru")} description={u("descPesananBaru")} />
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="so-cust">{u("pelanggan")}</Label>
            <Select id="so-cust" value={head.contactId} onChange={(e) => void pilihPelanggan(e.target.value)}>
              <option value="">{u("pilihPelangganOpsi")}</option>
              {customers.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </Select>
            {/* Fase 23b: tanpa penanda ini, harga yang terisi sendiri terbaca
                seperti harga dasar yang salah. */}
            {grupHarga.nama ? (
              <div className="mt-1" data-testid="so-grup-aktif">
                <Badge tone="green">
                  {u("ghLencanaHarga")} {grupHarga.nama}
                </Badge>
              </div>
            ) : null}
          </div>
          <div>
            <Label htmlFor="so-wh">{u("gudang")}</Label>
            <Select id="so-wh" value={head.warehouseId} onChange={(e) => setHead({ ...head, warehouseId: e.target.value })}>
              <option value="">{u("pilihGudangOpsi")}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="so-tax">PPN</Label>
            <Select id="so-tax" value={head.taxRate} onChange={(e) => setHead({ ...head, taxRate: e.target.value })}>
              {TAX_RATES.map((t) => (
                <option key={t} value={t}>{t}%</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="so-date">{u("tanggalPesan")}</Label>
            <Input id="so-date" type="date" value={head.orderDate} onChange={(e) => setHead({ ...head, orderDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="so-exp">{u("perkiraanKirim")}</Label>
            <Input id="so-exp" type="date" value={head.expectedDate} onChange={(e) => setHead({ ...head, expectedDate: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Select aria-label={u("produk")} className="min-w-[10rem] flex-1" value={line.productId} onChange={(e) => pilihProduk(i, e.target.value)}>
                <option value="">{u("pilihProdukOpsi")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <Input aria-label={u("qtyBarang")} type="number" min={1} className="w-20" value={line.qty} onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, qty: e.target.value } : l)))} />
              <Input aria-label={u("hargaSatuan")} type="number" min={0} placeholder={u("hargaSatuan")} className="w-32" value={line.unitPrice} onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, unitPrice: e.target.value, hargaDisentuh: true } : l)))} />
              <Input aria-label={u("diskonPersen")} type="number" min={0} max={100} placeholder="0%" className="w-16" value={line.discountPct} onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, discountPct: e.target.value } : l)))} />
              {lines.length > 1 ? (
                <button type="button" aria-label={u("hapusBaris")} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:text-galat-ink" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="h-8" onClick={() => setLines([...lines, barisKosong()])}>
              <Plus className="size-4" aria-hidden /> {u("barisAksi")}
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
              {create.isPending ? <Spinner /> : <FileText className="size-4" aria-hidden />} {u("buatPesanan")}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function OrderRow({ order, isAdmin, cashAccounts, companyName }: { order: ApiSalesOrder; isAdmin: boolean; cashAccounts: AccountRow[]; companyName: string }) {
  const u = useUi();
  const { tenant } = useWorkspace();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dpOpen, setDpOpen] = useState(false);
  const [dp, setDp] = useState({ amount: "", accountId: "" });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sales-orders", tenant.tenantId] });
    queryClient.invalidateQueries({ queryKey: ["invoices", tenant.tenantId] });
    queryClient.invalidateQueries({ queryKey: ["stock", tenant.tenantId] });
  };

  const deliver = useMutation({
    mutationFn: () => api.deliverSalesOrder(tenant.tenantId, order.id, { deliveryDate: today() }),
    onSuccess: (res) => { toast("success", isi(u("toastSuratJalan"), res.doNo)); invalidate(); },
    onError: (err) => toast("error", (err as Error).message),
  });
  const invoice = useMutation({
    mutationFn: () => api.invoiceSalesOrder(tenant.tenantId, order.id, { invoiceDate: today() }),
    onSuccess: (res) => { toast("success", isi(u("toastFakturDiterbitkan"), res.invoiceNo)); invalidate(); },
    onError: (err) => toast("error", (err as Error).message),
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelSalesOrder(tenant.tenantId, order.id),
    onSuccess: () => { toast("success", u("toastPesananDibatalkanSo")); invalidate(); },
    onError: (err) => toast("error", (err as Error).message),
  });
  const downPayment = useMutation({
    mutationFn: () => api.soDownPayment(tenant.tenantId, order.id, { amount: Number(dp.amount) || 0, accountId: dp.accountId || cashAccounts[0]?.id || "", paymentDate: today() }),
    onSuccess: () => { toast("success", u("toastUangMukaDicatat")); setDpOpen(false); setDp({ amount: "", accountId: "" }); invalidate(); },
    onError: (err) => toast("error", (err as Error).message),
  });

  return (
    <div className="rounded-lg border border-line p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-xs">{order.soNo}</span>
        <span className="font-medium">{order.contactName}</span>
        <Badge tone={SO_TONE[order.status]}>{SO_STATUS_LABELS[order.status]}</Badge>
        {order.deliveryNo ? <Badge tone="neutral">{order.deliveryNo}</Badge> : null}
        {order.invoiceNo ? <Badge tone="green">{u("fakturPrefix")} {order.invoiceNo}</Badge> : null}
        {order.dpAmount > 0 ? <span className="text-xs text-ink-muted">DP {formatIDR(order.dpAmount)}</span> : null}
        <span className="ml-auto font-semibold tabular-nums">{formatIDR(order.total)}</span>
      </div>
      <div className="mt-1.5 text-xs text-ink-muted">
        {order.lines.map((l) => `${l.productName} ×${l.qty}`).join(" · ")}
      </div>
      {isAdmin ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
          {order.status === "open" ? (
            <>
              <Button className="h-8" onClick={() => deliver.mutate()} disabled={deliver.isPending}>
                <Truck className="size-4" aria-hidden /> {u("kirimSuratJalan")}
              </Button>
              <Button variant="secondary" className="h-8" onClick={() => setDpOpen((o) => !o)}>
                {u("uangMuka")}
              </Button>
              <Button variant="ghost" className="h-8" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                {u("batalkanPesanan")}
              </Button>
            </>
          ) : null}
          {order.status === "delivered" ? (
            <>
              <Button className="h-8" onClick={() => invoice.mutate()} disabled={invoice.isPending}>
                <Send className="size-4" aria-hidden /> {u("buatFaktur")}
              </Button>
              <Button variant="secondary" className="h-8" onClick={() => printDeliveryNote(order, companyName)}>
                {u("cetakSuratJalan")}
              </Button>
            </>
          ) : null}
          {order.status === "invoiced" && order.deliveryNo ? (
            <Button variant="secondary" className="h-8" onClick={() => printDeliveryNote(order, companyName)}>
              {u("cetakSuratJalan")}
            </Button>
          ) : null}
          {dpOpen && order.status === "open" ? (
            <div className="flex w-full flex-wrap items-center gap-2 pt-1">
              <Input aria-label={u("nominalUangMuka")} type="number" min={1} placeholder={u("placeholderNominalDp")} className="w-40" value={dp.amount} onChange={(e) => setDp({ ...dp, amount: e.target.value })} />
              <Select aria-label={u("akunKasBank")} className="w-48" value={dp.accountId} onChange={(e) => setDp({ ...dp, accountId: e.target.value })}>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
              <Button className="h-8" onClick={() => downPayment.mutate()} disabled={downPayment.isPending || !(Number(dp.amount) > 0)}>
                {u("simpanDp")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
