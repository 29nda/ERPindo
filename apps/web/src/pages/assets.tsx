import type { ApiFixedAsset } from "@erpindo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Landmark } from "lucide-react";
import { useState } from "react";
import { api, formatIDR } from "../api/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  PageHeading,
  Select,
  Spinner,
  useToast,
} from "../components/ui";
import { KELOMPOK_HARTA, type MetodePenyusutan } from "@erpindo/shared";
import { isi } from "../i18n";
import { useUi } from "../i18n/ui";
import { useWorkspace } from "./app";

const thisMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
type AccountRow = { id: string; code: string; name: string; type: string };

export function AssetsPage() {
  const { tenant } = useWorkspace();
  const isAdmin = tenant.role !== "viewer";
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();

  const assetsQuery = useQuery({
    queryKey: ["assets", tenant.tenantId],
    queryFn: () => api.assets(tenant.tenantId),
  });
  const accountsQuery = useQuery({
    queryKey: ["accounts", tenant.tenantId],
    queryFn: () => api.accounts(tenant.tenantId),
  });
  const cashAccounts = (accountsQuery.data?.accounts ?? []).filter(
    (a: AccountRow) => a.type === "asset"
  );

  const [form, setForm] = useState({
    name: "",
    category: "",
    acquisitionDate: today(),
    acquisitionCost: "",
    usefulLifeMonths: "48",
    residualValue: "",
    depreciationMethod: "garis_lurus" as MetodePenyusutan,
    taxGroup: "",
  });
  const [tahunFiskal, setTahunFiskal] = useState(String(new Date().getFullYear()));
  const [cashAccountId, setCashAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [depPeriod, setDepPeriod] = useState(thisMonth);
  const [depDate, setDepDate] = useState(today);

  const create = useMutation({
    mutationFn: () =>
      api.createAsset(tenant.tenantId, {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        acquisitionDate: form.acquisitionDate,
        acquisitionCost: Number(form.acquisitionCost) || 0,
        usefulLifeMonths: Number(form.usefulLifeMonths) || 0,
        residualValue: Number(form.residualValue) || 0,
        cashAccountId: cashAccountId || cashAccounts[0]?.id || "",
        depreciationMethod: form.depreciationMethod,
        taxGroup: form.taxGroup || null,
      }),
    onSuccess: () => {
      toast("success", u("toastAsetTerdaftar"));
      setForm({
        name: "",
        category: "",
        acquisitionDate: today(),
        acquisitionCost: "",
        usefulLifeMonths: "48",
        residualValue: "",
        depreciationMethod: "garis_lurus",
        taxGroup: "",
      });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["assets", tenant.tenantId] });
    },
    onError: (err) => setError((err as Error).message),
  });

  const depreciate = useMutation({
    mutationFn: () => api.runDepreciation(tenant.tenantId, { period: depPeriod, date: depDate }),
    onSuccess: (res) => {
      toast(
        "success",
        res.count > 0
          ? `Penyusutan ${depPeriod}: ${res.count} aset, total ${formatIDR(res.total)}.`
          : "Tidak ada aset yang perlu disusutkan bulan ini."
      );
      queryClient.invalidateQueries({ queryKey: ["assets", tenant.tenantId] });
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const fiskalQuery = useQuery({
    queryKey: ["tax-depreciation", tenant.tenantId, tahunFiskal],
    queryFn: () => api.taxDepreciation(tenant.tenantId, Number(tahunFiskal)),
  });

  const assets = assetsQuery.data?.assets ?? [];
  const active = assets.filter((a) => a.status === "active");
  const totalBook = active.reduce((s, a) => s + a.bookValue, 0);

  return (
    <div className="space-y-6">
      <div>
        <PageHeading k="asetTetap" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody className="py-3">
            <div className="text-xs text-ink-muted">{u("asetAktif")}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{active.length}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <div className="text-xs text-ink-muted">{u("nilaiBukuTotal")}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{formatIDR(totalBook)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <div className="text-xs text-ink-muted">{u("penyusutanPerBulan")}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatIDR(
                active.reduce(
                  (s, a) => s + Math.min(a.monthlyDepreciation, a.bookValue - a.residualValue),
                  0
                )
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader
            title={u("daftarkanAsetBaru")}
            description={u("descDaftarkanAset")}
          />
          <CardBody className="space-y-4">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="as-name">{u("namaAset")}</Label>
                <Input
                  id="as-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="as-metode">{u("adMetodePenyusutan")}</Label>
                <Select
                  id="as-metode"
                  value={form.depreciationMethod}
                  onChange={(e) => setForm({ ...form, depreciationMethod: e.target.value as MetodePenyusutan })}
                >
                  <option value="garis_lurus">{u("adGarisLurus")}</option>
                  <option value="saldo_menurun">{u("adSaldoMenurun")}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="as-kelompok">{u("adKelompokHarta")}</Label>
                <Select
                  id="as-kelompok"
                  value={form.taxGroup}
                  onChange={(e) => setForm({ ...form, taxGroup: e.target.value })}
                >
                  <option value="">{u("adBelumDiatur")}</option>
                  {KELOMPOK_HARTA.map((k) => (
                    <option key={k.kode} value={k.kode}>
                      {k.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="as-cat">{u("kategori")}</Label>
                <Input
                  id="as-cat"
                  placeholder={u("contohKategoriAset")}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="as-date">{u("tanggalPerolehan")}</Label>
                <Input
                  id="as-date"
                  type="date"
                  value={form.acquisitionDate}
                  onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="as-cost">{u("nilaiPerolehan")}</Label>
                <Input
                  id="as-cost"
                  type="number"
                  min={1}
                  value={form.acquisitionCost}
                  onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="as-life">{u("masaManfaatBulan")}</Label>
                <Input
                  id="as-life"
                  type="number"
                  min={1}
                  value={form.usefulLifeMonths}
                  onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="as-res">{u("nilaiResidu")}</Label>
                <Input
                  id="as-res"
                  type="number"
                  min={0}
                  value={form.residualValue}
                  onChange={(e) => setForm({ ...form, residualValue: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="as-cash">{u("dibayarDariAkun")}</Label>
                <Select
                  id="as-cash"
                  value={cashAccountId}
                  onChange={(e) => setCashAccountId(e.target.value)}
                >
                  {cashAccounts.map((a: AccountRow) => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => create.mutate()}
                disabled={
                  create.isPending ||
                  form.name.trim().length < 2 ||
                  !form.acquisitionCost ||
                  cashAccounts.length === 0
                }
              >
                {create.isPending ? <Spinner /> : <PackagePlus className="size-4" aria-hidden />}{" "}
                {u("daftarkanAset")}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <CardHeader
            title={u("jalankanPenyusutanBulanan")}
            description={u("descPenyusutanBulanan")}
          />
          <CardBody className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="dep-period">{u("periode")}</Label>
              <Input
                id="dep-period"
                type="month"
                value={depPeriod}
                onChange={(e) => setDepPeriod(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dep-date">{u("tanggalJurnal")}</Label>
              <Input
                id="dep-date"
                type="date"
                value={depDate}
                onChange={(e) => setDepDate(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => depreciate.mutate()}
              disabled={depreciate.isPending || active.length === 0}
            >
              {depreciate.isPending ? <Spinner /> : null} {u("jalankanPenyusutan")}
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <Card>
      <Card>
        <CardHeader title={u("adJudulFiskal")} description={u("adDescFiskal")} />
        <CardBody className="space-y-3">
          <div className="max-w-40">
            <Label htmlFor="as-tahun-fiskal">{u("adTahunPajak")}</Label>
            <Input
              id="as-tahun-fiskal"
              type="number"
              value={tahunFiskal}
              onChange={(e) => setTahunFiskal(e.target.value)}
            />
          </div>
          {fiskalQuery.isLoading ? (
            <Spinner />
          ) : !fiskalQuery.data ? null : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-uji="fiskal-ringkas">
                <div>
                  <div className="text-xs text-ink-muted">{u("adKomersial")}</div>
                  <div className="text-lg font-semibold tabular-nums" data-uji="fiskal-komersial">
                    {formatIDR(fiskalQuery.data.totalKomersial)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-muted">{u("adFiskal")}</div>
                  <div className="text-lg font-semibold tabular-nums" data-uji="fiskal-fiskal">
                    {formatIDR(fiskalQuery.data.totalFiskal)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-muted">{u("adKoreksiFiskal")}</div>
                  <div className="text-lg font-semibold tabular-nums" data-uji="fiskal-koreksi">
                    {formatIDR(fiskalQuery.data.totalKoreksi)}
                  </div>
                </div>
              </div>
              {fiskalQuery.data.tanpaKelompok > 0 ? (
                <Alert tone="warning">
                  {fiskalQuery.data.tanpaKelompok} {u("adTanpaKelompokSuffix")}
                </Alert>
              ) : null}
              <p className="text-sm text-ink-muted" data-uji="fiskal-catatan">
                {u("adFiskalTidakDijurnal")}
              </p>
            </>
          )}
        </CardBody>
      </Card>

        <CardHeader title={u("daftarAset")} />
        <CardBody>
          {assetsQuery.isLoading ? (
            <Spinner />
          ) : assets.length === 0 ? (
            <EmptyState
              icon={<Landmark className="size-6" aria-hidden />}
              title={u("belumAdaAset")}
              description={u("descBelumAdaAset")}
            />
          ) : (
            <div className="space-y-3">
              {assets.map((a) => (
                <AssetRow key={a.id} asset={a} isAdmin={isAdmin} cashAccounts={cashAccounts} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function AssetRow({
  asset,
  isAdmin,
  cashAccounts,
}: {
  asset: ApiFixedAsset;
  isAdmin: boolean;
  cashAccounts: AccountRow[];
}) {
  const { tenant } = useWorkspace();
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proceeds, setProceeds] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [date, setDate] = useState(today);

  const [revalOpen, setRevalOpen] = useState(false);
  const [fairValue, setFairValue] = useState("");
  const [revalDate, setRevalDate] = useState(today);

  const revalue = useMutation({
    mutationFn: () =>
      api.revalueAsset(tenant.tenantId, asset.id, {
        revalDate,
        fairValue: Number(fairValue) || 0,
      }),
    onSuccess: (res) => {
      // Nada pesannya mengikuti ARAH selisihnya: surplus masuk ekuitas, rugi
      // masuk beban — dua peristiwa akuntansi yang berbeda, jadi tidak boleh
      // dilaporkan dengan kalimat yang sama.
      toast(
        "success",
        isi(u("toastRevaluasiTersimpan"), res.difference >= 0 ? u("surplusKata") : u("rugiPenurunanKata"), formatIDR(Math.abs(res.difference))),
      );
      setRevalOpen(false);
      setFairValue("");
      queryClient.invalidateQueries({ queryKey: ["assets", tenant.tenantId] });
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const dispose = useMutation({
    mutationFn: () =>
      api.disposeAsset(tenant.tenantId, asset.id, {
        disposalDate: date,
        proceeds: Number(proceeds) || 0,
        cashAccountId: cashAccountId || cashAccounts[0]?.id || "",
      }),
    onSuccess: (res) => {
      toast(
        "success",
        isi(u("toastAsetDilepas"), res.gain >= 0 ? u("labaKata") : u("rugiKata"), formatIDR(Math.abs(res.gain)))
      );
      setOpen(false);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["assets", tenant.tenantId] });
    },
    onError: (err) => {
      toast("error", (err as Error).message);
      setConfirmOpen(false);
    },
  });

  const pct =
    asset.acquisitionCost > 0
      ? Math.round((asset.accumulatedDepreciation / asset.acquisitionCost) * 100)
      : 0;

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{asset.name}</span>
        {asset.category ? <span className="text-xs text-ink-muted">{asset.category}</span> : null}
        {asset.status === "disposed" ? (
          <Badge tone="neutral">{u("statusDilepas")}</Badge>
        ) : (
          <Badge tone="green">{u("statusAktif")}</Badge>
        )}
        <span className="ml-auto text-sm text-ink-muted">
          {u("perolehan")} <span className="tabular-nums">{formatIDR(asset.acquisitionCost)}</span> ·{" "}
          {u("nilaiBuku")}{" "}
          <strong className="tabular-nums text-ink">
            {formatIDR(asset.bookValue)}
          </strong>
        </span>
        {isAdmin && asset.status === "active" ? (
          <>
            <Button variant="ghost" className="h-8" onClick={() => setRevalOpen((o) => !o)}>
              {revalOpen ? u("batal") : u("revaluasi")}
            </Button>
            <Button variant="ghost" className="h-8" onClick={() => setOpen((o) => !o)}>
              {open ? u("batal") : u("lepas")}
            </Button>
          </>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-ink-muted">
        {u("sejak")} {asset.acquisitionDate} · {u("masa")} {asset.usefulLifeMonths}{" "}
        {u("blnSingkat")} · {u("penyusutan")} {formatIDR(asset.monthlyDepreciation)}
        {u("perBlnSingkat")}
        {/*
          Fase 22d — pemeriksaan mata: pada saldo menurun angka di atas BUKAN
          angka tetap, ia mengecil tiap bulan. Tanpa penanda ini "/bln" terbaca
          sebagai janji angsuran yang sama besar sampai lunas, dan pembaca akan
          mengalikannya dengan sisa bulan untuk menebak nilai buku akhir.
        */}
        {asset.depreciationMethod === "saldo_menurun" ? ` (${u("adSaldoMenurun")}, ${u("adAngsuranBerikutnya")})` : ""} ·{" "}
        {u("tersusut")} {pct}%
        {asset.disposedDate ? ` · ${u("statusDilepas")} ${asset.disposedDate}` : ""}
      </div>

      {revalOpen && asset.status === "active" ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-brand-50 p-3 dark:bg-brand-950/30">
          <div>
            <Label htmlFor={`r-date-${asset.id}`}>{u("tanggalRevaluasi")}</Label>
            <Input
              id={`r-date-${asset.id}`}
              type="date"
              value={revalDate}
              onChange={(e) => setRevalDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`r-fair-${asset.id}`}>{u("nilaiWajar")}</Label>
            <Input
              id={`r-fair-${asset.id}`}
              type="number"
              min={0}
              value={fairValue}
              onChange={(e) => setFairValue(e.target.value)}
            />
          </div>
          <Button onClick={() => revalue.mutate()} disabled={revalue.isPending || !fairValue}>
            {u("simpanRevaluasi")}
          </Button>
          <p className="w-full text-xs text-ink-muted">
            {u("descRevaluasi")}
          </p>
        </div>
      ) : null}

      {open && asset.status === "active" ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-surface-sunken p-3">
          <div>
            <Label htmlFor={`d-date-${asset.id}`}>{u("tanggalPelepasan")}</Label>
            <Input
              id={`d-date-${asset.id}`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`d-proc-${asset.id}`}>{u("hasilPenjualanAset")}</Label>
            <Input
              id={`d-proc-${asset.id}`}
              type="number"
              min={0}
              value={proceeds}
              onChange={(e) => setProceeds(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`d-cash-${asset.id}`}>{u("diterimaDiAkun")}</Label>
            <Select
              id={`d-cash-${asset.id}`}
              value={cashAccountId}
              onChange={(e) => setCashAccountId(e.target.value)}
            >
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="danger"
            onClick={() => setConfirmOpen(true)}
            disabled={dispose.isPending}
          >
            {u("lepasAset")}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            title={`${u("lepasAsetTanya")} ${asset.name}?`}
            description={`${u("nilaiBuku")} ${formatIDR(asset.bookValue)} ${u("descLepasAset")}`}
            confirmLabel={u("yaLepasAset")}
            danger
            busy={dispose.isPending}
            onConfirm={() => dispose.mutate()}
            onCancel={() => setConfirmOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
