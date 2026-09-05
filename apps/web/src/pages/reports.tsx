import {
  AGING_BUCKETS,
  AGING_BUCKET_LABELS,
  hitungRasioKeuangan,
  type AgingBucket,
  type ApiReportLine,
} from "@erpindo/shared";
import { useUi, type UiKey } from "../i18n/ui";
import { useHeading } from "../i18n/pageHeadings";
import { useQuery } from "@tanstack/react-query";
import { Download, Inbox } from "lucide-react";
import { useState } from "react";
import { api, downloadCsv, downloadXlsx, downloadXml, formatDate, formatIDR } from "../api/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
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
import { useWorkspace } from "./app";

// Peta label AGING_BUCKET_LABELS tinggal di packages/shared dan tetap
// berbahasa Indonesia (apps/api ikut memakai paket itu, jadi shared tidak
// boleh bergantung pada kamus web). Pemetaan ke kunci kamus dilakukan di
// sisi web — Fase 16t.
const AGING_BUCKET_KEY: Record<AgingBucket, UiKey> = {
  current: "umurBelumJatuhTempo",
  d1_30: "umur1_30",
  d31_60: "umur31_60",
  d61_90: "umur61_90",
  d90_plus: "umur90plus",
};

export function ExportButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  const u = useUi();
  // Fase 21b: label bawaannya dulu string Indonesia harfiah di tanda tangan
  // fungsi (`label = "Ekspor CSV"`). Sebelas tombol ekspor memakainya tanpa
  // mengirim label sendiri, jadi SEMUANYA berbahasa Indonesia walau aplikasi
  // disetel Inggris — dan penyapu i18n tak melihatnya karena bentuk "nilai
  // bawaan parameter" bukan atribut JSX maupun teks layar.
  return (
    <Button variant="secondary" className="h-9" onClick={onClick}>
      <Download className="size-4" aria-hidden /> {label ?? u("eksporCsv")}
    </Button>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

function ReportSection({
  title,
  lines,
  total,
}: {
  title: string;
  lines: ApiReportLine[];
  total: number;
}) {
  const u = useUi();
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      <Table>
        <tbody>
          {lines.map((l) => (
            <Tr key={l.accountId}>
              <Td label={u("kode")} className="py-1 font-mono text-xs">
                {l.code}
              </Td>
              <Td label={u("akun")} className="py-1">
                {l.name}
              </Td>
              <Td numeric label={u("jumlah")} className="py-1">
                {formatIDR(l.amount)}
              </Td>
            </Tr>
          ))}
          <Tr className="border-t border-line font-semibold">
            <Td colSpan={2}>Total {title}</Td>
            <Td numeric label={`Total ${title}`}>
              {formatIDR(total)}
            </Td>
          </Tr>
        </tbody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Laba Rugi
// ---------------------------------------------------------------------------

/** Periode sebelumnya dengan panjang yang sama (untuk perbandingan Laba Rugi). */
function previousPeriod(from: string, to: string): { from: string; to: string } {
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1);
  const prevTo = new Date(f.getTime() - 86_400_000);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86_400_000);
  return { from: prevFrom.toISOString().slice(0, 10), to: prevTo.toISOString().slice(0, 10) };
}

function deltaPct(now: number, prev: number): string {
  if (prev === 0) return now === 0 ? "0%" : "—";
  return `${(((now - prev) / Math.abs(prev)) * 100).toFixed(1).replace(".", ",")}%`;
}

export function IncomeStatementPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [compare, setCompare] = useState(false);

  const query = useQuery({
    queryKey: ["income-statement", tenant.tenantId, from, to],
    queryFn: () => api.incomeStatement(tenant.tenantId, from, to),
    enabled: Boolean(from && to),
  });
  const prev = previousPeriod(from, to);
  const prevQuery = useQuery({
    queryKey: ["income-statement", tenant.tenantId, prev.from, prev.to],
    queryFn: () => api.incomeStatement(tenant.tenantId, prev.from, prev.to),
    enabled: compare && Boolean(from && to),
  });

  // Rasio ringkas dari data yang sudah ada: margin kotor (pendapatan − HPP)
  // dan margin bersih. Ditampilkan bila ada pendapatan.
  const hpp = (query.data?.expense ?? [])
    .filter((l) => l.code.startsWith("5-1"))
    .reduce((s, l) => s + l.amount, 0);
  const income = query.data?.totalIncome ?? 0;
  const grossMargin =
    income > 0 ? (((income - hpp) / income) * 100).toFixed(1).replace(".", ",") : null;
  const netMargin =
    income > 0 ? ((query.data!.netProfit / income) * 100).toFixed(1).replace(".", ",") : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <PageHeading k="labaRugi" />
        </div>
        {query.data ? (
          <ExportButton
            onClick={() =>
              downloadCsv(
                `laba-rugi-${from}-${to}.csv`,
                ["Kode", "Akun", "Jenis", "Jumlah"],
                [
                  ...query.data!.income.map(
                    (l) => [l.code, l.name, "Pendapatan", l.amount] as (string | number)[]
                  ),
                  ...query.data!.expense.map(
                    (l) => [l.code, l.name, "Beban", l.amount] as (string | number)[]
                  ),
                  ["", "Laba Bersih", "", query.data!.netProfit],
                ]
              )
            }
          />
        ) : null}
      </div>
      <Card>
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="pl-from">{u("dari")}</Label>
              <Input
                id="pl-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pl-to">{u("sampai")}</Label>
              <Input id="pl-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                className="size-4 rounded border-line-strong text-brand-600 focus:ring-brand-500"
              />
              {u("bandingkanPeriode")}
            </label>
          </div>

          {query.isLoading ? (
            <Spinner />
          ) : query.data ? (
            <>
              {grossMargin !== null ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-ink-soft">
                    {u("marginKotor")} <strong>{grossMargin}%</strong>
                  </span>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-ink-soft">
                    {u("marginBersih")} <strong>{netMargin}%</strong>
                  </span>
                </div>
              ) : null}
              <ReportSection
                title={u("pendapatan")}
                lines={query.data.income}
                total={query.data.totalIncome}
              />
              <ReportSection
                title={u("beban")}
                lines={query.data.expense}
                total={query.data.totalExpense}
              />
              <div
                className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold ${
                  query.data.netProfit >= 0
                    ? "bg-ok-surface text-ok-ink"
                    : "bg-galat-surface text-galat-ink"
                }`}
              >
                <span>{query.data.netProfit >= 0 ? u("labaBersih") : u("rugiBersih")}</span>
                <span className="tabular-nums">{formatIDR(Math.abs(query.data.netProfit))}</span>
              </div>
              {compare && prevQuery.data ? (
                <div className="rounded-lg border border-line p-3 text-sm">
                  <div className="mb-2 font-medium">
                    {u("periodeSebelumnya")} ({formatDate(prev.from)} – {formatDate(prev.to)})
                  </div>
                  {[
                    [u("pendapatan"), query.data.totalIncome, prevQuery.data.totalIncome],
                    [u("beban"), query.data.totalExpense, prevQuery.data.totalExpense],
                    [u("labaBersihKecil"), query.data.netProfit, prevQuery.data.netProfit],
                  ].map(([label, now, was]) => (
                    <div
                      key={label as string}
                      className="flex flex-wrap items-center justify-between gap-x-4 py-1"
                    >
                      <span>{label}</span>
                      <span className="tabular-nums text-ink-muted">
                        {formatIDR(was as number)} →{" "}
                        <strong className="text-ink">
                          {formatIDR(now as number)}
                        </strong>{" "}
                        <span
                          className={
                            (now as number) >= (was as number)
                              ? "text-ok-ink"
                              : "text-galat-ink"
                          }
                        >
                          ({deltaPct(now as number, was as number)})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arus Kas
// ---------------------------------------------------------------------------

export function CashFlowPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const query = useQuery({
    queryKey: ["cash-flow", tenant.tenantId, from, to],
    queryFn: () => api.cashFlow(tenant.tenantId, from, to),
    enabled: Boolean(from && to),
  });

  const row = (label: string, amount: number, bold = false) => (
    <div className={`flex justify-between py-1 text-sm ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatIDR(amount)}</span>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <PageHeading k="arusKas" />
        </div>
        {query.data ? (
          <ExportButton
            onClick={() =>
              downloadCsv(
                `arus-kas-${from}-${to}.csv`,
                ["Keterangan", "Arah", "Jumlah"],
                [
                  ...query.data!.inflows.map(
                    (r) => [r.label, "Masuk", r.amount] as (string | number)[]
                  ),
                  ...query.data!.outflows.map(
                    (r) => [r.label, "Keluar", r.amount] as (string | number)[]
                  ),
                ]
              )
            }
          />
        ) : null}
      </div>
      <Card>
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="cf-from">{u("dari")}</Label>
              <Input
                id="cf-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cf-to">{u("sampai")}</Label>
              <Input id="cf-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {query.isLoading ? (
            <Spinner />
          ) : query.data ? (
            <>
              {row(u("saldoKasAwal"), query.data.openingBalance, true)}
              <div>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ok-ink">
                  {u("kasMasuk")}
                </h3>
                {query.data.inflows.length === 0 ? (
                  <p className="text-sm text-ink-muted">{u("tidakAda")}</p>
                ) : (
                  query.data.inflows.map((r, i) => <div key={i}>{row(r.label, r.amount)}</div>)
                )}
                {row(u("totalKasMasuk"), query.data.totalIn, true)}
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-galat-ink">
                  {u("kasKeluar")}
                </h3>
                {query.data.outflows.length === 0 ? (
                  <p className="text-sm text-ink-muted">{u("tidakAda")}</p>
                ) : (
                  query.data.outflows.map((r, i) => <div key={i}>{row(r.label, r.amount)}</div>)
                )}
                {row(u("totalKasKeluar"), query.data.totalOut, true)}
              </div>
              <div className="rounded-lg bg-surface-muted px-4 py-3">
                {row(u("perubahanKasBersih"), query.data.netChange, true)}
                {row(u("saldoKasAkhir"), query.data.closingBalance, true)}
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      <ProyeksiArusKasCard />
    </div>
  );
}

/**
 * Proyeksi arus kas 30/60/90 hari (Fase 22f).
 *
 * Ditaruh di halaman Arus Kas, tepat di bawah laporan arus kas historis: yang
 * satu menjawab "ke mana uang saya pergi", yang satu "apakah uang saya cukup
 * bulan depan". Keduanya dibaca berurutan, jadi tidak dipisah ke halaman lain.
 */
function ProyeksiArusKasCard() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const query = useQuery({
    queryKey: ["cash-projection", tenant.tenantId],
    queryFn: () => api.cashProjection(tenant.tenantId),
  });

  const p = query.data;
  return (
    <Card>
      <CardHeader title={u("pkJudul")} description={u("pkDesc")} />
      <CardBody className="space-y-4">
        {query.isLoading || !p ? (
          <Spinner />
        ) : (
          <>
            <div className="text-sm text-ink-muted">
              {u("pkSaldoSekarang")}:{" "}
              <span className="font-semibold tabular-nums text-ink" data-uji="pk-saldo-awal">
                {formatIDR(p.saldoAwal)}
              </span>
            </div>
            <Table>
              <Thead>
                <Tr>
                  <Th>{u("pkJangka")}</Th>
                  <Th numeric>{u("pkMasuk")}</Th>
                  <Th numeric>{u("pkKeluar")}</Th>
                  <Th numeric>{u("pkSaldoAkhir")}</Th>
                </Tr>
              </Thead>
              <tbody data-uji="pk-tabel">
                {p.ember.map((e) => (
                  <Tr key={e.hari}>
                    <Td label={u("pkJangka")}>{e.hari} {u("pkHari")}</Td>
                    <Td numeric label={u("pkMasuk")}>{formatIDR(e.masuk)}</Td>
                    <Td numeric label={u("pkKeluar")}>{formatIDR(e.keluar)}</Td>
                    <Td numeric label={u("pkSaldoAkhir")} className="font-medium">
                      {e.saldoAkhir < 0 ? (
                        <span className="text-galat-ink">{formatIDR(e.saldoAkhir)}</span>
                      ) : (
                        formatIDR(e.saldoAkhir)
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            {p.emberDefisit !== null ? (
              <Alert tone="error" data-uji="pk-defisit">
                {u("pkDefisitAwal")} {p.emberDefisit} {u("pkDefisitAkhir")}
              </Alert>
            ) : null}
            {p.jumlahTerlambat > 0 ? (
              <Alert tone="warning" data-uji="pk-terlambat">
                {p.jumlahTerlambat} {u("pkTerlambatSuffix")}
              </Alert>
            ) : null}
            <p className="text-sm text-ink-muted" data-uji="pk-asumsi">
              {u("pkAsumsi")}
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Umur Piutang / Utang (aging)
// ---------------------------------------------------------------------------

/**
 * Rekonsiliasi buku besar vs buku pembantu (Fase 54a).
 *
 * Laporan yang diminta akuntan tiap penutupan buku, dan satu-satunya yang bisa
 * melihat posting yang seimbang tetapi salah arah — neraca saldo tetap hijau
 * menghadapi kesalahan semacam itu.
 */
export function RekonsiliasiPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const h = useHeading("rekonsiliasi");
  const query = useQuery({
    queryKey: ["rekonsiliasi", tenant.tenantId],
    queryFn: () => api.rekonsiliasi(tenant.tenantId),
  });
  const data = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="judul text-[1.75rem]">{h.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">{h.desc}</p>
      </div>

      <Card>
        <CardBody>
          {query.isLoading ? (
            <Spinner />
          ) : !data ? null : (
            <>
              <Alert tone={data.cocok ? "success" : "warning"}>
                {data.cocok ? u("rekonSemuaCocok") : u("rekonAdaSelisih")}
              </Alert>
              <Table className="mt-4">
                <Thead>
                  <tr>
                    <Th>{u("rekonPos")}</Th>
                    <Th numeric>{u("rekonBukuBesar")}</Th>
                    <Th numeric>{u("rekonBukuPembantu")}</Th>
                    <Th numeric>{u("rekonSelisih")}</Th>
                  </tr>
                </Thead>
                <tbody>
                  {data.pos.map((p) => (
                    <Tr key={p.kodeAkun}>
                      <Td label={u("rekonPos")}>
                        {p.nama} <span className="text-ink-faint">{p.kodeAkun}</span>
                        {p.toleransi > 0 ? (
                          <span className="block text-[11px] text-ink-faint">
                            {u("rekonToleransi")} {formatIDR(p.toleransi)}
                          </span>
                        ) : null}
                      </Td>
                      <Td numeric label={u("rekonBukuBesar")}>{formatIDR(p.bukuBesar)}</Td>
                      <Td numeric label={u("rekonBukuPembantu")}>{formatIDR(p.bukuPembantu)}</Td>
                      <Td numeric label={u("rekonSelisih")}>
                        <span className={p.cocok ? "text-ink-muted" : "font-semibold text-danger-ink"}>
                          {p.selisih === 0 ? "—" : formatIDR(p.selisih)}
                        </span>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </CardBody>
      </Card>

      {(data?.entriTimpang.length ?? 0) > 0 ? (
        <Card>
          <CardHeader title={u("rekonJurnalTimpang")} />
          <CardBody>
            <ul className="space-y-1 text-sm">
              {data!.entriTimpang.map((e) => (
                <li key={e.entryNo}>
                  <span className="font-medium">{e.entryNo}</span> · {formatDate(e.entryDate)} ·{" "}
                  <span className="text-danger-ink">{formatIDR(e.selisih)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {(data?.entriKosong.length ?? 0) > 0 ? (
        <Card>
          <CardHeader title={u("rekonJurnalKosong")} />
          <CardBody>
            <ul className="space-y-1 text-sm">
              {data!.entriKosong.map((e) => (
                <li key={e.entryNo}>
                  <span className="font-medium">{e.entryNo}</span> · {formatDate(e.entryDate)}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {data ? (
        <>
          <DaftarSelisihStok
            judul={u("rekonKartuStok")}
            baris={data.persediaan.kartuStok.map((r) => ({
              ...r,
              angka: [
                { label: u("rekonSaldo"), nilai: r.saldo },
                { label: u("rekonKartu"), nilai: r.kartu },
              ],
            }))}
          />
          <DaftarSelisihStok
            judul={u("rekonSaldoMinus")}
            baris={data.persediaan.saldoMinus.map((r) => ({
              ...r,
              angka: [{ label: u("rekonSaldo"), nilai: r.saldo }],
            }))}
          />
          <DaftarSelisihStok
            judul={u("rekonLotHantu")}
            baris={data.persediaan.lotHantu.map((r) => ({
              ...r,
              angka: [
                { label: u("rekonSaldo"), nilai: r.saldo },
                { label: u("rekonLot"), nilai: r.lot },
              ],
            }))}
          />
          <DaftarSelisihStok
            judul={u("rekonLotBelumDidata")}
            petunjuk={u("rekonLotBelumDidataPetunjuk")}
            baris={data.persediaan.lotBelumDidata.map((r) => ({
              ...r,
              angka: [
                { label: u("rekonSaldo"), nilai: r.saldo },
                { label: u("rekonLot"), nilai: r.lot },
              ],
            }))}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Satu daftar selisih kuantitas persediaan. Menghilang saat kosong — kartu
 * bertuliskan "tidak ada temuan" empat kali berturut-turut membuat halaman ini
 * terlihat sibuk padahal tidak ada apa-apa; ringkasan hijau di atas sudah
 * mengatakannya sekali.
 */
function DaftarSelisihStok({
  judul,
  petunjuk,
  baris,
}: {
  judul: string;
  petunjuk?: string;
  baris: { sku: string; produk: string; gudang: string; angka: { label: string; nilai: number }[] }[];
}) {
  if (baris.length === 0) return null;
  return (
    <Card>
      <CardHeader title={judul} description={petunjuk} />
      <CardBody>
        <ul className="space-y-1 text-sm">
          {baris.map((r) => (
            <li key={`${r.sku}-${r.gudang}`}>
              <span className="font-mono text-xs">{r.sku}</span> <span className="font-medium">{r.produk}</span> ·{" "}
              {r.gudang} ·{" "}
              {r.angka.map((a, i) => (
                <span key={a.label}>
                  {i > 0 ? " · " : null}
                  {a.label} <span className="font-semibold text-danger-ink">{a.nilai.toLocaleString("id-ID")}</span>
                </span>
              ))}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export function AgingPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const [kind, setKind] = useState<"receivable" | "payable">("receivable");
  const hAging = useHeading(kind === "receivable" ? "umurPiutang" : "umurHutang");
  const query = useQuery({
    queryKey: ["aging", tenant.tenantId, kind],
    queryFn: () => api.aging(tenant.tenantId, kind),
  });


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="judul text-[1.75rem]">{hAging.title}</h1>
        <div className="flex items-center gap-2">
          <Select
            aria-label={u("jenis")}
            className="w-40"
            value={kind}
            onChange={(e) => setKind(e.target.value as "receivable" | "payable")}
          >
            <option value="receivable">{u("piutang")}</option>
            <option value="payable">{u("hutang")}</option>
          </Select>
          {query.data ? (
            <ExportButton
              onClick={() =>
                downloadCsv(
                  `aging-${kind}.csv`,
                  ["Kontak", ...AGING_BUCKETS.map((b) => AGING_BUCKET_LABELS[b]), "Total"],
                  query.data!.rows.map((r) => [
                    r.contactName,
                    ...AGING_BUCKETS.map((b) => r.buckets[b]),
                    r.total,
                  ])
                )
              }
            />
          ) : null}
        </div>
      </div>

      <Card>
        <CardBody>
          {query.isLoading ? (
            <Spinner />
          ) : (query.data?.rows.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-muted">
              {kind === "receivable"
                ? u("tidakAdaPiutangBelumLunas")
                : u("tidakAdaHutangBelumLunas")}
            </p>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>{u("kontakKolom")}</Th>
                  {AGING_BUCKETS.map((b) => (
                    <Th key={b} numeric>
                      {u(AGING_BUCKET_KEY[b]!)}
                    </Th>
                  ))}
                  <Th numeric>{u("total")}</Th>
                </tr>
              </Thead>
              <tbody>
                {query.data!.rows.map((r) => (
                  <Tr key={r.contactId}>
                    <Td label={u("kontakKolom")}>{r.contactName}</Td>
                    {AGING_BUCKETS.map((b) => (
                      <Td key={b} numeric label={u(AGING_BUCKET_KEY[b]!)}>
                        {r.buckets[b] === 0 ? "—" : formatIDR(r.buckets[b])}
                      </Td>
                    ))}
                    <Td numeric label={u("total")} className="font-medium">
                      {formatIDR(r.total)}
                    </Td>
                  </Tr>
                ))}
                <Tr className="font-semibold">
                  <Td colSpan={AGING_BUCKETS.length + 1}>{u("totalKeseluruhan")}</Td>
                  <Td numeric label={u("totalKeseluruhan")}>
                    {formatIDR(query.data!.grandTotal)}
                  </Td>
                </Tr>
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ekspor e-Faktur (faktur keluaran ber-PPN)
// ---------------------------------------------------------------------------

export function EfakturPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const toast = useToast();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [xmlBusy, setXmlBusy] = useState(false);

  const query = useQuery({
    queryKey: ["efaktur", tenant.tenantId, from, to],
    queryFn: () => api.efaktur(tenant.tenantId, from, to),
    enabled: Boolean(from && to),
  });

  async function downloadCoretaxXml() {
    setXmlBusy(true);
    try {
      const xml = await api.efakturXml(tenant.tenantId, from, to);
      downloadXml(`efaktur-coretax-${from}-sd-${to}.xml`, xml);
      toast("success", u("toastXmlCoretax"));
    } catch (err) {
      toast("error", (err as Error).message);
    } finally {
      setXmlBusy(false);
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageHeading k="eFaktur" />
        </div>
        {query.data && query.data.rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button className="h-9" onClick={downloadCoretaxXml} disabled={xmlBusy}>
              <Download className="size-4" aria-hidden />{" "}
              {xmlBusy ? "Menyiapkan…" : "Unduh XML Coretax"}
            </Button>
            <ExportButton
              onClick={() =>
                downloadCsv(
                  `e-faktur-${from}-${to}.csv`,
                  [
                    "Nomor Faktur",
                    "Tanggal",
                    "NPWP Pembeli",
                    "Nama Pembeli",
                    "DPP",
                    "PPN",
                    "Total",
                  ],
                  query.data!.rows.map((r) => [
                    r.invoiceNo,
                    r.invoiceDate,
                    r.buyerNpwp ?? "000000000000000",
                    r.buyerName,
                    r.dpp,
                    r.ppn,
                    r.total,
                  ])
                )
              }
            />
          </div>
        ) : null}
      </div>
      <p className="text-sm text-ink-muted">
        {u("descCoretax")} <strong>XML</strong> {u("descCoretax2")}{" "}
        <span className="font-mono">0000000000000000</span>.
      </p>

      <Card>
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="ef-from">{u("dari")}</Label>
              <Input
                id="ef-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ef-to">{u("sampai")}</Label>
              <Input id="ef-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {query.isLoading ? (
            <Spinner />
          ) : (query.data?.rows.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-muted">{u("tidakAdaFakturPpn")}</p>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>{u("nomor")}</Th>
                  <Th>{u("tanggal")}</Th>
                  <Th>NPWP</Th>
                  <Th>{u("pembeli")}</Th>
                  <Th numeric>DPP</Th>
                  <Th numeric>PPN</Th>
                  <Th numeric>{u("total")}</Th>
                </tr>
              </Thead>
              <tbody>
                {query.data!.rows.map((r) => (
                  <Tr key={r.invoiceNo}>
                    <Td label={u("nomor")} className="font-mono text-xs">
                      {r.invoiceNo}
                    </Td>
                    <Td label={u("tanggal")}>{formatDate(r.invoiceDate)}</Td>
                    <Td label="NPWP" className="font-mono text-xs">
                      {r.buyerNpwp ?? "000000000000000"}
                    </Td>
                    <Td label={u("pembeli")}>{r.buyerName}</Td>
                    <Td numeric label="DPP">
                      {formatIDR(r.dpp)}
                    </Td>
                    <Td numeric label="PPN">
                      {formatIDR(r.ppn)}
                    </Td>
                    <Td numeric label={u("total")}>
                      {formatIDR(r.total)}
                    </Td>
                  </Tr>
                ))}
                <Tr className="font-semibold">
                  <Td colSpan={4}>
                    {u("total")} ({query.data!.rows.length} {u("faktur").toLowerCase()})
                  </Td>
                  <Td numeric label="DPP">
                    {formatIDR(query.data!.totalDpp)}
                  </Td>
                  <Td numeric label="PPN">
                    {formatIDR(query.data!.totalPpn)}
                  </Td>
                  <Td numeric label={u("total")}>
                    {formatIDR(query.data!.totalDpp + query.data!.totalPpn)}
                  </Td>
                </Tr>
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Neraca
// ---------------------------------------------------------------------------

export function BalanceSheetPage() {
  const u = useUi();
  const hNeraca = useHeading("neraca");
  const { tenant } = useWorkspace();
  const [asOf, setAsOf] = useState(today);

  const query = useQuery({
    queryKey: ["balance-sheet", tenant.tenantId, asOf],
    queryFn: () => api.balanceSheet(tenant.tenantId, asOf),
    enabled: Boolean(asOf),
  });

  // Fase 21b: perputaran persediaan butuh HPP, yang tinggal di laba rugi —
  // bukan di neraca. Diambil sejak awal tahun berjalan sampai tanggal neraca,
  // supaya perputarannya bermakna (HPP satu hari tidak berarti apa-apa).
  const awalTahun = `${asOf.slice(0, 4)}-01-01`;
  const labaRugiQuery = useQuery({
    queryKey: ["income-statement", tenant.tenantId, awalTahun, asOf],
    queryFn: () => api.incomeStatement(tenant.tenantId, awalTahun, asOf),
    enabled: Boolean(asOf),
  });

  const hppTahunBerjalan = (labaRugiQuery.data?.expense ?? [])
    .filter((l) => l.code.startsWith("5-1"))
    .reduce((s, l) => s + l.amount, 0);
  const rasio = query.data
    ? hitungRasioKeuangan({
        assets: query.data.assets,
        liabilities: query.data.liabilities,
        hpp: hppTahunBerjalan,
      })
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="judul text-[1.75rem]">{hNeraca.title}</h1>
          {query.data ? (
            query.data.balanced ? (
              <Badge tone="brand">{u("seimbang")}</Badge>
            ) : (
              <Badge tone="amber">{u("tidakSeimbang")}</Badge>
            )
          ) : null}
        </div>
        {query.data ? (
          <ExportButton
            onClick={() =>
              downloadCsv(
                `neraca-${asOf}.csv`,
                ["Kode", "Akun", "Kelompok", "Jumlah"],
                [
                  ...query.data!.assets.map(
                    (l) => [l.code, l.name, "Aset", l.amount] as (string | number)[]
                  ),
                  ...query.data!.liabilities.map(
                    (l) => [l.code, l.name, "Kewajiban", l.amount] as (string | number)[]
                  ),
                  ...query.data!.equity.map(
                    (l) => [l.code, l.name, "Ekuitas", l.amount] as (string | number)[]
                  ),
                ]
              )
            }
          />
        ) : null}
      </div>
      <Card>
        <CardBody className="space-y-5">
          <div>
            <Label htmlFor="bs-asof">{u("perTanggal")}</Label>
            <Input
              id="bs-asof"
              type="date"
              className="sm:w-48"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </div>

          {query.isLoading ? (
            <Spinner />
          ) : query.data ? (
            <>
              <ReportSection
                title={u("aset")}
                lines={query.data.assets}
                total={query.data.totalAssets}
              />
              <ReportSection
                title={u("kewajiban")}
                lines={query.data.liabilities}
                total={query.data.totalLiabilities}
              />
              <ReportSection
                title={u("ekuitas")}
                lines={query.data.equity}
                total={query.data.totalEquity}
              />
              <div className="flex items-center justify-between rounded-lg bg-surface-muted px-4 py-3 text-sm font-semibold">
                <span>{u("kewajibanEkuitas")}</span>
                <span className="tabular-nums">
                  {formatIDR(query.data.totalLiabilities + query.data.totalEquity)}
                </span>
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      {/* Fase 21b — rasio lancar & perputaran persediaan. Menutup sisa baris
          roadmap "rasio keuangan otomatis"; margin kotor & bersih sudah ada di
          halaman Laba Rugi sejak lama. */}
      {rasio ? (
        <Card>
          <CardHeader title={u("rasioKeuangan")} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div data-testid="rasio-lancar">
              <div className="text-sm text-ink-muted">{u("rasioLancar")}</div>
              <div className="text-xl font-semibold tabular-nums">
                {rasio.rasioLancar === null
                  ? u("rasioTakBisaDihitung")
                  : rasio.rasioLancar.toFixed(2).replace(".", ",")}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {u("descRasioLancar")}
              </p>
            </div>
            <div data-testid="rasio-perputaran">
              <div className="text-sm text-ink-muted">
                {u("perputaranPersediaan")}
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {rasio.perputaranPersediaan === null
                  ? u("rasioTakBisaDihitung")
                  : `${rasio.perputaranPersediaan.toFixed(2).replace(".", ",")} ${u("kaliSetahun")}`}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {u("descPerputaran")}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Laporan Penjualan analitik (Fase 5h): agregat per produk & per pelanggan
// ---------------------------------------------------------------------------

export function SalesReportPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const query = useQuery({
    queryKey: ["sales-analytics", tenant.tenantId, from, to],
    queryFn: () => api.salesAnalytics(tenant.tenantId, from, to),
  });
  const data = query.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageHeading k="laporanPenjualan" />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="sr-from">{u("dari")}</Label>
            <Input
              id="sr-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sr-to">{u("sampai")}</Label>
            <Input id="sr-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {data && (data.byProduct.length > 0 || data.byCustomer.length > 0) ? (
            <ExportButton
              label={u("eksporExcel")}
              onClick={() =>
                downloadXlsx(`penjualan-${from}_${to}.xlsx`, [
                  {
                    name: "Per produk",
                    headers: ["SKU", "Produk", "Qty", "Omzet"],
                    rows: data.byProduct.map((r) => [r.sku, r.name, r.qty, r.revenue]),
                  },
                  {
                    name: "Per pelanggan",
                    headers: ["Pelanggan", "Jumlah faktur", "Omzet"],
                    rows: data.byCustomer.map((r) => [r.name, r.invoiceCount, r.revenue]),
                  },
                ])
              }
            />
          ) : null}
        </div>
      </div>

      {query.isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardBody>
                <div className="text-sm text-ink-muted">
                  {u("totalPenjualan")}
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {formatIDR(data.totalRevenue)}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-ink-muted">
                  {u("jumlahFaktur")}
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {data.invoiceCount.toLocaleString("id-ID")}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-ink-muted">
                  {u("rataRataPerFaktur")}
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {formatIDR(
                    data.invoiceCount > 0 ? Math.round(data.totalRevenue / data.invoiceCount) : 0
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title={u("perProduk")}
              action={
                data.byProduct.length > 0 ? (
                  <ExportButton
                    onClick={() =>
                      downloadCsv(
                        `penjualan-per-produk-${from}_${to}.csv`,
                        ["SKU", "Produk", "Qty", "Omzet"],
                        data.byProduct.map((r) => [r.sku, r.name, r.qty, r.revenue])
                      )
                    }
                  />
                ) : undefined
              }
            />
            <CardBody>
              {data.byProduct.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="size-6" aria-hidden />}
                  title={u("belumAdaPenjualan")}
                  description={u("tidakAdaFakturRentang")}
                />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>SKU</Th>
                      <Th>{u("produk")}</Th>
                      <Th numeric>Qty</Th>
                      <Th numeric>{u("omzet")}</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {data.byProduct.map((r) => (
                      <Tr key={r.productId}>
                        <Td label="SKU" className="font-mono text-xs">
                          {r.sku}
                        </Td>
                        <Td label={u("produk")}>{r.name}</Td>
                        <Td numeric label="Qty">
                          {r.qty.toLocaleString("id-ID")}
                        </Td>
                        <Td numeric label={u("omzet")}>
                          {formatIDR(r.revenue)}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={u("perPelanggan")}
              action={
                data.byCustomer.length > 0 ? (
                  <ExportButton
                    onClick={() =>
                      downloadCsv(
                        `penjualan-per-pelanggan-${from}_${to}.csv`,
                        ["Pelanggan", "Jumlah faktur", "Omzet"],
                        data.byCustomer.map((r) => [r.name, r.invoiceCount, r.revenue])
                      )
                    }
                  />
                ) : undefined
              }
            />
            <CardBody>
              {data.byCustomer.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="size-6" aria-hidden />}
                  title={u("belumAdaPenjualan")}
                  description={u("tidakAdaFakturRentang")}
                />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>{u("pelanggan")}</Th>
                      <Th numeric>{u("faktur")}</Th>
                      <Th numeric>{u("omzet")}</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {data.byCustomer.map((r) => (
                      <Tr key={r.contactId}>
                        <Td label={u("pelanggan")}>{r.name}</Td>
                        <Td numeric label={u("faktur")}>
                          {r.invoiceCount.toLocaleString("id-ID")}
                        </Td>
                        <Td numeric label={u("omzet")}>
                          {formatIDR(r.revenue)}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
