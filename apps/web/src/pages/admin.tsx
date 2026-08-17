import {
  FEEDBACK_STATUSES,
  PLAN_LABELS,
  renderMarkdown,
  type ApiBlogPost,
  type Plan,
} from "@erpindo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, formatDate } from "../api/client";
import { useDebounced } from "./commerce";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
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
import { KATEGORI_KEY, STATUS_MASUKAN_KEY } from "../i18n/masukan";
import { useUi, type UiKey } from "../i18n/ui";
import { useWorkspace } from "./app";

/**
 * Dashboard admin platform (Fase 10e) — hanya untuk email pada
 * PLATFORM_ADMIN_EMAILS: pantau pendaftar & langganan, kelola masukan
 * pengguna, dan tulis artikel blog (tayang SSR di /blog).
 */

// Kunci tab dipisah dari labelnya (Fase 19r): dulu label Indonesia sekaligus
// menjadi nilai state, jadi menerjemahkannya akan mematikan pemilihan tab —
// cacat senyap yang sama seperti kategori di catat.tsx (19d).
const TABS = ["ringkasan", "tenant", "infra", "masukan", "blog"] as const;
type Tab = (typeof TABS)[number];
const TAB_KEY = {
  ringkasan: "adTabRingkasan",
  tenant: "adTabTenant",
  infra: "adTabInfra",
  masukan: "adTabMasukan",
  blog: "adTabBlog",
} satisfies Record<Tab, UiKey>;

/**
 * Fase 24d: status `trial` tidak ada lagi (dihapus Fase 24a) — nadanya diganti
 * `provisioning`, satu-satunya status yang justru belum pernah punya label dan
 * karenanya tampil sebagai kode mentah. Sejak trial dihapus, itulah keadaan
 * setiap pendaftar baru sampai ia membayar.
 */
const STATUS_TONE: Record<string, "green" | "amber" | "red" | "neutral" | "brand"> = {
  active: "green",
  provisioning: "brand",
  past_due: "amber",
  suspended: "red",
};

/** Kode status langganan → kunci kamus. Sebelumnya kodenya tampil apa adanya. */
const STATUS_KEY = {
  provisioning: "adTsProvisioning",
  active: "adTsActive",
  past_due: "adTsPastDue",
  suspended: "adTsSuspended",
} satisfies Record<string, UiKey>;

export function AdminPage() {
  const u = useUi();
  const { me } = useWorkspace();
  const [tab, setTab] = useState<Tab>("ringkasan");

  if (!me.user.isPlatformAdmin) {
    return (
      <div className="p-2">
        <Alert tone="error">{u("adHanyaAdmin")}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <PageHeading k="adminPlatform" />
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={u("adBagianAdmin")}>
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
              tab === t
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-surface text-ink-soft ring-1 ring-inset ring-line hover:bg-surface-muted"
            }`}
          >
            {u(TAB_KEY[t])}
          </button>
        ))}
      </div>

      {tab === "ringkasan" ? <OverviewTab /> : null}
      {tab === "tenant" ? <TenantsTab /> : null}
      {tab === "infra" ? <InfraTab /> : null}
      {tab === "masukan" ? <FeedbackTab /> : null}
      {tab === "blog" ? <BlogTab /> : null}
    </div>
  );
}

function KartuKuota() {
  const u = useUi();
  const q = useQuery({ queryKey: ["admin-kuota"], queryFn: api.adminKuota });
  const d = q.data;
  if (!d) return null;
  return (
    <Card>
      <CardHeader title={u("adKuota")} description={u("adDescKuota")} />
      <CardBody>
        {!d.configured || !d.ok ? (
          // Monitor mati atau pembacaannya gagal adalah keadaan yang SAH, bukan
          // galat: kartunya menjelaskan dirinya sendiri dan sisa dasbor utuh.
          <Alert tone={d.configured ? "error" : "info"}>{d.pesan}</Alert>
        ) : (
          <div className="space-y-3">
            {d.adaPeringatan ? <Alert tone="error">{u("adKuotaWaspada")}</Alert> : null}
            {(d.pemakaian ?? []).map((p) => (
              <div key={p.nama}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-soft">{p.nama}</span>
                  <span className="num tabular-nums text-ink-muted">
                    {p.terpakai.toLocaleString("id-ID")} / {p.batas.toLocaleString("id-ID")} ({p.persen}%)
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-active">
                  <div
                    className={`h-full rounded-full ${p.waspada ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(p.persen, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function OverviewTab() {
  const u = useUi();
  const q = useQuery({ queryKey: ["admin-overview"], queryFn: api.adminOverview });
  if (q.isLoading) return <Spinner />;
  if (!q.data) return <Alert tone="error">{u("adGagalRingkasan")}</Alert>;
  const d = q.data;
  const stats = [
    { label: u("adTotalPerusahaan"), value: d.totals.tenants },
    { label: u("adTotalPengguna"), value: d.totals.users },
    { label: u("adMenungguPembayaran"), value: d.byStatus.provisioning ?? 0 },
    { label: u("adAktifBerbayar"), value: d.byStatus.active ?? 0 },
    { label: u("adMenunggakBacaSaja"), value: d.byStatus.past_due ?? 0 },
    { label: u("adMasukanBaru"), value: d.totals.feedbackBaru },
  ];
  const maxGrowth = Math.max(...d.growth.map((g) => g.n), 1);
  const b = d.bisnis;
  return (
    <div className="space-y-6">
      {/* Metrik bisnis (Fase 30f) dipisahkan dari hitungan badan di bawahnya
          dan diletakkan PALING ATAS: pemilik membuka layar ini untuk tahu
          apakah usahanya hidup, bukan untuk menghitung baris tabel. */}
      <Card>
        <CardHeader title={u("adMetrikBisnis")} description={u("adDescMetrikBisnis")} />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm text-ink-muted">{u("adMrr")}</div>
              <div className="num mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Rp {b.mrr.toLocaleString("id-ID")}
              </div>
              <div className="text-xs text-ink-muted">
                {b.pelangganMembayar} × Rp {b.hargaPerBulan.toLocaleString("id-ID")}
              </div>
            </div>
            <div>
              <div className="text-sm text-ink-muted">{u("adPelangganMembayar")}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{b.pelangganMembayar}</div>
              <div className="text-xs text-ink-muted">
                {b.berbayar} {u("adAman")} · {b.tenggang} {u("adTenggang")} · {b.comped} {u("adComped")}
              </div>
            </div>
            <div>
              <div className="text-sm text-ink-muted">{u("adChurn30")}</div>
              <div
                className={`mt-1 text-2xl font-bold tabular-nums ${b.churn30Hari > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}
              >
                {b.churn30Hari}
              </div>
              <div className="text-xs text-ink-muted">{b.churnPersen}% {u("adDariPelanggan")}</div>
            </div>
            <div>
              <div className="text-sm text-ink-muted">{u("adUmurLangganan")}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{b.umurRataHari}</div>
              <div className="text-xs text-ink-muted">{u("adHariRataRata")}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <div className="text-sm text-ink-muted">{s.label}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <KartuKuota />

      <Card>
        <CardHeader title={u("adPendaftaranPerBulan")} description={u("adDescPendaftaran")} />
        <CardBody>
          <div className="flex h-32 items-end gap-2">
            {d.growth.map((g) => (
              <div key={g.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-ink-muted">
                  {g.n}
                </span>
                <div
                  className="w-full rounded-t bg-brand-500"
                  style={{ height: `${Math.max((g.n / maxGrowth) * 100, 4)}%` }}
                />
                <span className="text-[10px] text-ink-muted">{g.month.slice(2)}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={u("adPendaftarTerbaru")} description={u("adDescPendaftarTerbaru")} />
        <CardBody>
          <Table>
            <Thead>
              <tr>
                <Th>{u("adKolomPerusahaan")}</Th>
                <Th>{u("adKolomPemilik")}</Th>
                <Th>{u("adKolomStatus")}</Th>
                <Th>{u("adKolomPaket")}</Th>
                <Th>{u("adKolomDaftar")}</Th>
              </tr>
            </Thead>
            <tbody>
              {d.recentSignups.map((t) => (
                <Tr key={t.id}>
                  <Td label={u("adKolomPerusahaan")} className="font-medium">
                    {t.name}
                  </Td>
                  <Td label={u("adKolomPemilik")}>{t.ownerEmail ?? "—"}</Td>
                  <Td label={u("adKolomStatus")}>
                    <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>
                      {STATUS_KEY[t.status as keyof typeof STATUS_KEY]
                        ? u(STATUS_KEY[t.status as keyof typeof STATUS_KEY])
                        : t.status}
                    </Badge>
                  </Td>
                  <Td label={u("adKolomPaket")}>{PLAN_LABELS[t.plan as Plan] ?? t.plan}</Td>
                  <Td label={u("adKolomDaftar")} className="text-ink-muted">
                    {formatDate(t.createdAt.slice(0, 10))}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

function TenantsTab() {
  const u = useUi();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["admin-tenants", q, status],
    queryFn: () => api.adminTenants({ q, status, limit: 100 }),
    placeholderData: (prev) => prev,
  });
  return (
    <Card>
      <CardHeader
        title={u("adSemuaPerusahaan")}
        description={`${query.data?.total ?? 0} ${u("adPerusahaanTerdaftar")}`}
      />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={u("adCariPerusahaan")}
            placeholder={u("adCariNamaSlug")}
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            aria-label={u("adFilterStatus")}
            className="w-44"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{u("adSemuaStatus")}</option>
            {/* Nilai `value` adalah kode API — jangan ikut diterjemahkan. */}
            {(Object.keys(STATUS_KEY) as (keyof typeof STATUS_KEY)[]).map((s) => (
              <option key={s} value={s}>
                {u(STATUS_KEY[s])}
              </option>
            ))}
          </Select>
        </div>
        {query.isLoading ? (
          <Spinner />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{u("adKolomPerusahaan")}</Th>
                <Th>{u("adKolomPemilik")}</Th>
                <Th>{u("adKolomStatus")}</Th>
                <Th>{u("adKolomPaket")}</Th>
                <Th numeric>{u("adKolomAnggota")}</Th>
                <Th>{u("adKolomDaftar")}</Th>
              </tr>
            </Thead>
            <tbody>
              {(query.data?.tenants ?? []).map((t) => (
                <Tr key={t.id}>
                  <Td label={u("adKolomPerusahaan")}>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-ink-muted">{t.slug}</div>
                  </Td>
                  <Td label={u("adKolomPemilik")}>{t.ownerEmail ?? "—"}</Td>
                  <Td label={u("adKolomStatus")}>
                    <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>
                      {STATUS_KEY[t.status as keyof typeof STATUS_KEY]
                        ? u(STATUS_KEY[t.status as keyof typeof STATUS_KEY])
                        : t.status}
                    </Badge>
                  </Td>
                  <Td label={u("adKolomPaket")}>{PLAN_LABELS[t.plan as Plan] ?? t.plan}</Td>
                  <Td numeric label={u("adKolomAnggota")}>
                    {t.members}
                  </Td>
                  <Td label={u("adKolomDaftar")} className="text-ink-muted">
                    {formatDate(t.createdAt.slice(0, 10))}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Infra & kapasitas (Fase 11a): mode database tenant, versi skema, dan sebaran
 * migrasi antar-tenant. Tombol "Migrasi sekarang" menerapkan migrasi skema baru
 * ke tenant yang tertinggal (idempoten & resumable).
 */
function InfraTab() {
  const u = useUi();
  const toast = useToast();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin-infra"], queryFn: api.adminInfra });
  const migrate = useMutation({
    mutationFn: api.adminMigrateTenants,
    onSuccess: (r) => {
      toast(
        r.failed ? "error" : "success",
        r.migrated > 0
          ? `${r.migrated} ${u("adToastDimutakhirkan")}${r.failed ? `, ${r.failed} ${u("adToastGagalKata")}` : ""}.`
          : u("adToastSemuaTerkini")
      );
      void qc.invalidateQueries({ queryKey: ["admin-infra"] });
    },
    onError: (e) => toast("error", (e as Error).message),
  });

  const d = query.data;
  const behind = d?.tenantsBehind ?? 0;
  const stats = d
    ? [
        {
          label: u("adModeDbTenant"),
          value: d.dbMode === "cloudflare" ? u("adModeCloudflare") : u("adModeLokal"),
        },
        { label: u("adVersiSkemaTerkini"), value: `v${d.schemaVersion}` },
        { label: u("adTotalPerusahaan"), value: String(d.totalTenants) },
        { label: u("adTertinggalMigrasi"), value: String(behind) },
        // Hanya relevan di mode pool lokal; D1 dinamis tak punya batas keras.
        ...(d.kapasitas
          ? [
              {
                label: u("adSisaKapasitas"),
                value: `${d.kapasitas.bebasBersih} / ${d.kapasitas.total}`,
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={u("adInfrastruktur")} description={u("adDescInfra")} />
        <CardBody className="space-y-4">
          {query.isLoading ? (
            <Spinner />
          ) : !d ? (
            <Alert tone="error">{u("adGagalInfra")}</Alert>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl bg-surface-sunken p-3 ring-1 ring-inset ring-line"
                  >
                    <div className="text-xs text-ink-muted">{s.label}</div>
                    <div className="mt-1 text-lg font-bold tabular-nums">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Demo publik didahulukan bahkan di atas kapasitas: kapasitas
                  habis menghentikan pendaftar BARU, sedangkan demo yang tidak
                  ada menggagalkan ajakan utama halaman depan untuk SETIAP
                  pengunjung — termasuk yang belum sempat berniat mendaftar. */}
              {d.demo && !d.demo.siap ? (
                <Alert tone="error" testId="infra-demo-belum-siap">
                  {d.demo.peringatan}
                </Alert>
              ) : null}

              {/* Kapasitas pendaftaran didahulukan di atas status migrasi:
                  tertinggal migrasi merepotkan, kapasitas habis menghentikan
                  penjualan sama sekali. */}
              {d.kapasitas && d.kapasitas.bebasBersih === 0 ? (
                <Alert tone="error" testId="infra-kapasitas-habis">
                  {u("adKapasitasHabis")}
                </Alert>
              ) : d.kapasitas && d.kapasitas.bebasBersih <= 2 ? (
                <Alert tone="warning" testId="infra-kapasitas-menipis">
                  {u("adKapasitasMenipis")}
                </Alert>
              ) : null}

              {d.kapasitas && d.kapasitas.bebasKotor.length > 0 ? (
                <Alert tone="warning">
                  {u("adSlotKotor")} {d.kapasitas.bebasKotor.join(", ")}
                </Alert>
              ) : null}

              {behind > 0 ? (
                <Alert tone="info">
                  {behind} {u("adPeringatanTertinggal")}
                </Alert>
              ) : (
                <Alert tone="success">{u("adSemuaTerkini")}</Alert>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => migrate.mutate()} disabled={migrate.isPending}>
                  {migrate.isPending ? u("adMemigrasi") : u("adMigrasiSekarang")}
                </Button>
                <span className="text-xs text-ink-muted">
                  {u("adAmanBerulang")}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">{u("adSebaranVersi")}</h3>
                  <div className="space-y-1">
                    {d.versionDistribution.map((v) => (
                      <div
                        key={v.v}
                        className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-1.5 text-sm"
                      >
                        <span>
                          v{v.v}
                          {v.v === d.schemaVersion ? ` ${u("adTerkiniSuffix")}` : ""}
                        </span>
                        <span className="tabular-nums text-ink-muted">
                          {v.n} {u("adPerusahaanKata")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">{u("adJenisPenyimpanan")}</h3>
                  <div className="space-y-1">
                    {Object.entries(d.refKinds).map(([kind, n]) => (
                      <div
                        key={kind}
                        className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-1.5 text-sm"
                      >
                        <span>{kind === "cloudflare" ? u("adD1Dinamis") : u("adPoolLokal")}</span>
                        <span className="tabular-nums text-ink-muted">
                          {n} {u("adPerusahaanKata")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {d.behind.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">{u("adPerusahaanTertinggal")}</h3>
                  <Table>
                    <Thead>
                      <tr>
                        <Th>{u("adKolomPerusahaan")}</Th>
                        <Th>{u("adKolomVersiSkema")}</Th>
                      </tr>
                    </Thead>
                    <tbody>
                      {d.behind.map((t) => (
                        <Tr key={t.id}>
                          <Td label={u("adKolomPerusahaan")}>
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-ink-muted">{t.slug}</div>
                          </Td>
                          {/* Bukan `numeric`: isinya "v12 → v38", sebuah
                              perpindahan versi, bukan nilai yang perlu
                              dirata-kanankan terhadap kolom lain. */}
                          <Td label={u("adKolomVersiSkema")} className="num">
                            v{t.schemaVersion} → v{d.schemaVersion}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function FeedbackTab() {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["admin-feedback", status],
    queryFn: () => api.adminFeedback(status || undefined),
    placeholderData: (prev) => prev,
  });
  const update = useMutation({
    mutationFn: (input: { id: string; status?: string; adminNote?: string }) =>
      api.adminUpdateFeedback(input.id, { status: input.status, adminNote: input.adminNote }),
    onSuccess: () => {
      toast("success", u("adToastMasukanDiperbarui"));
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
    },
    onError: (err) => toast("error", (err as Error).message),
  });
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  return (
    <Card>
      <CardHeader title={u("adMasukanPengguna")} description={u("adDescMasukan")} />
      <CardBody className="space-y-3">
        <Select
          aria-label={u("adFilterStatusMasukan")}
          className="w-44"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{u("adSemuaStatus")}</option>
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {u(STATUS_MASUKAN_KEY[s])}
            </option>
          ))}
        </Select>
        {query.isLoading ? (
          <Spinner />
        ) : (query.data?.feedback ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">{u("adBelumAdaMasukan")}</p>
        ) : (
          (query.data?.feedback ?? []).map((f) => (
            <div
              key={f.id}
              className="rounded-lg border border-line p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{u(KATEGORI_KEY[f.category])}</Badge>
                <span className="font-medium">{f.userName}</span>
                <span className="text-xs text-ink-muted">{f.userEmail}</span>
                {f.tenantName ? (
                  <span className="text-xs text-ink-muted">· {f.tenantName}</span>
                ) : null}
                <span className="text-xs text-ink-muted">
                  · {formatDate(f.createdAt.slice(0, 10))}
                </span>
                <span className="ml-auto">
                  <Select
                    aria-label={`${u("adStatusMasukan")} ${f.id}`}
                    className="h-8 w-32"
                    value={f.status}
                    onChange={(e) => update.mutate({ id: f.id, status: e.target.value })}
                  >
                    {FEEDBACK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {u(STATUS_MASUKAN_KEY[s])}
                      </option>
                    ))}
                  </Select>
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-ink">
                {f.message}
              </p>
              {f.pagePath ? (
                <p className="mt-1 text-xs text-ink-muted">
                  {u("adHalamanLabel")} {f.pagePath}
                </p>
              ) : null}
              <div className="mt-2 flex gap-2">
                <Input
                  aria-label={`${u("adBalasanUntuk")} ${f.id}`}
                  placeholder={
                    f.adminNote
                      ? `${u("adBalasanPrefix")} ${f.adminNote}`
                      : u("adTulisBalasan")
                  }
                  className="h-9 flex-1"
                  value={noteDraft[f.id] ?? ""}
                  onChange={(e) => setNoteDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                />
                <Button
                  variant="secondary"
                  className="h-9"
                  disabled={!noteDraft[f.id]?.trim() || update.isPending}
                  onClick={() => {
                    update.mutate({ id: f.id, adminNote: noteDraft[f.id]!.trim() });
                    setNoteDraft((d) => ({ ...d, [f.id]: "" }));
                  }}
                >
                  {u("adBalas")}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

const EMPTY_POST = { slug: "", title: "", excerpt: "", bodyMd: "", coverUrl: "" };

function BlogTab() {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin-blog"], queryFn: api.adminBlogPosts });
  const [editing, setEditing] = useState<ApiBlogPost | null>(null);
  const [form, setForm] = useState(EMPTY_POST);
  const [preview, setPreview] = useState(false);
  const [deleting, setDeleting] = useState<ApiBlogPost | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
  const save = useMutation({
    mutationFn: () => {
      const input = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || undefined,
        bodyMd: form.bodyMd,
        coverUrl: form.coverUrl.trim(),
      };
      return editing ? api.adminUpdateBlogPost(editing.id, input) : api.adminCreateBlogPost(input);
    },
    onSuccess: () => {
      toast("success", editing ? u("adToastArtikelDiperbarui") : u("adToastDrafDibuat"));
      setEditing(null);
      setForm(EMPTY_POST);
      refresh();
    },
    onError: (err) => toast("error", (err as Error).message),
  });
  const publish = useMutation({
    mutationFn: (input: { id: string; published: boolean }) =>
      api.adminUpdateBlogPost(input.id, { published: input.published }),
    onSuccess: (_res, vars) => {
      toast(
        "success",
        vars.published ? u("adToastArtikelTayang") : u("adToastArtikelDitarik")
      );
      refresh();
    },
    onError: (err) => toast("error", (err as Error).message),
  });
  const doDelete = useMutation({
    mutationFn: (id: string) => api.adminDeleteBlogPost(id),
    onSuccess: () => {
      toast("success", u("adToastArtikelDihapus"));
      setDeleting(null);
      refresh();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={editing ? `${u("adUbahArtikel")} ${editing.title}` : u("adArtikelBaru")}
          description={u("adDescMarkdown")}
        />
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="blog-title">{u("adJudulArtikel")}</Label>
              <Input
                id="blog-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="blog-slug">{u("adSlugUrl")}</Label>
              <Input
                id="blog-slug"
                placeholder="cara-hitung-hpp-umkm"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="blog-excerpt">{u("adRingkasanMeta")}</Label>
            <Input
              id="blog-excerpt"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="blog-body" className="mb-0">
                {u("adIsiArtikel")}
              </Label>
              <button
                type="button"
                className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                onClick={() => setPreview((p) => !p)}
              >
                {preview ? u("adTulis") : u("adPratinjau")}
              </button>
            </div>
            {preview ? (
              <div
                className="prose-blog min-h-40 rounded-lg border border-line bg-surface-sunken px-4 py-3 text-sm"
                // renderMarkdown escape-first — aman XSS by construction.
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(form.bodyMd || u("adBelumAdaIsi")),
                }}
              />
            ) : (
              <textarea
                id="blog-body"
                rows={12}
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                value={form.bodyMd}
                onChange={(e) => setForm({ ...form, bodyMd: e.target.value })}
              />
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {editing ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  setForm(EMPTY_POST);
                }}
              >
                {u("adBatal")}
              </Button>
            ) : null}
            <Button
              onClick={() => save.mutate()}
              disabled={
                save.isPending || !form.title.trim() || !form.slug.trim() || form.bodyMd.length < 10
              }
            >
              {save.isPending ? <Spinner /> : null}{" "}
              {editing ? u("adSimpanPerubahan") : u("adSimpanDraf")}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={u("adSemuaArtikel")} description={u("adDescDraf")} />
        <CardBody>
          {query.isLoading ? (
            <Spinner />
          ) : (query.data?.posts ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">{u("adBelumAdaArtikel")}</p>
          ) : (
            <div className="space-y-2">
              {(query.data?.posts ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line p-3 text-sm"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="font-mono text-xs text-ink-muted">/blog/{p.slug}</span>
                  {p.publishedAt ? (
                    <Badge tone="green">{u("adTayang")}</Badge>
                  ) : (
                    <Badge tone="amber">{u("adDraf")}</Badge>
                  )}
                  <span className="ml-auto flex gap-2">
                    {p.publishedAt ? (
                      <a
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                      >
                        {u("adLihat")}
                      </a>
                    ) : null}
                    <button
                      className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                      onClick={() => {
                        setEditing(p);
                        setForm({
                          slug: p.slug,
                          title: p.title,
                          excerpt: p.excerpt ?? "",
                          bodyMd: p.bodyMd,
                          coverUrl: p.coverUrl ?? "",
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      {u("adUbah")}
                    </button>
                    <button
                      className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                      onClick={() => publish.mutate({ id: p.id, published: !p.publishedAt })}
                    >
                      {p.publishedAt ? u("adTarik") : u("adTerbitkan")}
                    </button>
                    <button
                      className="text-xs font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                      onClick={() => setDeleting(p)}
                    >
                      {u("adHapus")}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={deleting !== null}
        title={`${u("adHapusArtikelPrefix")} "${deleting?.title}"?`}
        description={u("adDescHapusArtikel")}
        confirmLabel={u("adYaHapusArtikel")}
        danger
        busy={doDelete.isPending}
        onConfirm={() => deleting && doDelete.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
