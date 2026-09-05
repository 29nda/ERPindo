import {
  PEMBAGI_UPAH_HARIAN,
  PTKP_STATUSES,
  type ApiEmployee,
  type ApiLeaveRequest,
  type ApiPayrollRun,
  bpKePersen,
  ALASAN_PHK,
  type ApiCommissionScheme,
  type ApiSeverance,
  type ApiOvertime,
  type ApiThrRun,
  type HariRaya,
  type JenisHariLembur,
  type KomisiDasar,
  type KomisiPemicu,
  type LeaveType,
  HARI_RAYA,
} from "@erpindo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isi, namaHariRaya, useLang } from "../i18n";
import { useUi, type UiKey } from "../i18n/ui";
import { CalendarDays, Clock, Gift, HandCoins, Percent, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { api, formatIDR } from "../api/client";
import { Lembar } from "../components/kerangka";
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
  Table,
  Td,
  Th,
  Thead,
  Tr,
  Spinner,
  Tabs,
  useToast,
} from "../components/ui";
import { useWorkspace } from "./app";

const thisMonth = () => new Date().toISOString().slice(0, 7);
/**
 * Label alasan PHK. Diambil dari daftar tertutup di `packages/shared` supaya
 * tidak ada alasan yang bisa muncul di layar tanpa punya pengali resminya.
 */
const ALASAN_LABEL: Record<string, string> = Object.fromEntries(ALASAN_PHK.map((a) => [a.code, a.label]));
/** Tanggal ISO `YYYY-MM-DD` yang berbentuk sah — dipakai menahan kueri rentang. */
const tanggalSah = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const today = () => new Date().toISOString().slice(0, 10);
type AccountRow = { id: string; code: string; name: string; type: string };
type PayrollTab = "karyawan" | "gaji" | "thr" | "komisi" | "komponen" | "kasbon" | "cuti" | "pesangon" | "departemen";

export function PayrollPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const isAdmin = tenant.role !== "viewer";
  const toast = useToast();
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ["employees", tenant.tenantId],
    queryFn: () => api.employees(tenant.tenantId),
  });
  const runsQuery = useQuery({
    queryKey: ["payroll-runs", tenant.tenantId],
    queryFn: () => api.payrollRuns(tenant.tenantId),
  });
  const accountsQuery = useQuery({
    queryKey: ["accounts", tenant.tenantId],
    queryFn: () => api.accounts(tenant.tenantId),
  });

  const cashAccounts = (accountsQuery.data?.accounts ?? []).filter(
    (a: AccountRow) => a.type === "asset"
  );

  const departmentsQuery = useQuery({
    queryKey: ["departments", tenant.tenantId],
    queryFn: () => api.departments(tenant.tenantId),
  });
  const departments = departmentsQuery.data?.departments ?? [];

  const [emp, setEmp] = useState({
    name: "",
    position: "",
    ptkpStatus: "TK/0",
    baseSalary: "",
    allowances: "",
    departmentId: "",
    managerId: "",
    // Fase 47 — tanggal masuk dan status kerja. Tanggal masuk sebenarnya sudah
    // dipakai sejak Fase 43a (THR) dan wajib untuk pesangon, tetapi belum
    // pernah bisa diisi dari layar ini: satu-satunya jalan adalah lewat API.
    joinDate: "",
    employmentType: "pkwtt" as "pkwtt" | "pkwt",
    contractEndDate: "",
  });
  const [empError, setEmpError] = useState<string | null>(null);
  const [empLembar, setEmpLembar] = useState(false);
  const [period, setPeriod] = useState(thisMonth);
  const [cashAccountId, setCashAccountId] = useState("");
  const [payDate, setPayDate] = useState(today);
  const [runError, setRunError] = useState<string | null>(null);
  const [tab, setTab] = useState<PayrollTab>("karyawan");

  const createEmp = useMutation({
    mutationFn: () =>
      api.createEmployee(tenant.tenantId, {
        name: emp.name.trim(),
        position: emp.position.trim() || undefined,
        ptkpStatus: emp.ptkpStatus,
        baseSalary: Number(emp.baseSalary) || 0,
        allowances: Number(emp.allowances) || 0,
        departmentId: emp.departmentId || undefined,
        managerId: emp.managerId || undefined,
        joinDate: emp.joinDate || undefined,
        employmentType: emp.employmentType,
        contractEndDate: emp.employmentType === "pkwt" ? emp.contractEndDate || undefined : undefined,
      }),
    onSuccess: () => {
      toast("success", u("toastKaryawanDitambah"));
      setEmp({
        name: "",
        position: "",
        ptkpStatus: "TK/0",
        baseSalary: "",
        allowances: "",
        departmentId: "",
        managerId: "",
        joinDate: "",
        employmentType: "pkwtt",
        contractEndDate: "",
      });
      setEmpError(null);
      setEmpLembar(false);
      queryClient.invalidateQueries({ queryKey: ["employees", tenant.tenantId] });
    },
    onError: (err) => setEmpError((err as Error).message),
  });

  const toggleActive = useMutation({
    mutationFn: (e: ApiEmployee) =>
      api.updateEmployee(tenant.tenantId, e.id, { isActive: !e.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees", tenant.tenantId] }),
    onError: (err) => toast("error", (err as Error).message),
  });

  const run = useMutation({
    mutationFn: () =>
      api.runPayroll(tenant.tenantId, {
        period,
        cashAccountId: cashAccountId || cashAccounts[0]?.id || "",
        paymentDate: payDate,
      }),
    onSuccess: (res) => {
      toast(
        "success",
        isi(u("toastPenggajianSelesai"), res.runNo, res.employees, formatIDR(res.totalNet))
      );
      setRunError(null);
      queryClient.invalidateQueries({ queryKey: ["payroll-runs", tenant.tenantId] });
    },
    onError: (err) => setRunError((err as Error).message),
  });

  const employees = employeesQuery.data?.employees ?? [];
  const activeCount = employees.filter((e) => e.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <PageHeading k="penggajian" />
      </div>

      <Alert tone="info">
        <strong>{u("catatanPajak")}</strong> {u("descCatatanPajakPayroll")}
      </Alert>

      <Tabs
        tabs={[
          { key: "karyawan", label: u("karyawan") },
          { key: "gaji", label: u("tabGaji") },
          { key: "thr", label: u("tabThr") },
          { key: "komisi", label: u("komisi") },
          { key: "komponen", label: u("komponen") },
          { key: "kasbon", label: u("tabKasbon") },
          { key: "cuti", label: u("tabCuti") },
          { key: "pesangon", label: u("tabPesangon") },
          { key: "departemen", label: u("departemen") },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Karyawan */}
      {tab === "karyawan" ? (
        <Card>
          <CardHeader
            title={u("karyawan")}
            description={`${activeCount} ${u("aktifDari")} ${employees.length} ${u("karyawanSatuan")}`}
            action={
              isAdmin ? (
                <Button onClick={() => setEmpLembar(true)}>
                  <UserPlus className="size-4" aria-hidden /> {u("tambahKaryawan")}
                </Button>
              ) : null
            }
          />
          <CardBody className="space-y-4">
            {isAdmin && empError ? <Alert tone="error">{empError}</Alert> : null}

            {/*
              Fase 38t — formulir karyawan pindah ke Lembar.
              Sebelumnya ia berbagi satu kartu dengan DAFTAR karyawan, di dalam
              satu tab: tujuh medan terpasang permanen mendorong daftarnya turun
              hampir satu layar penuh, padahal yang paling sering dilakukan di
              tab ini justru membaca daftarnya. Menambah karyawan adalah kejadian
              sesekali; membaca daftar adalah kejadian harian.
            */}
            {isAdmin ? (
              <Lembar
                terbuka={empLembar}
                tutup={() => setEmpLembar(false)}
                lebar="lebar"
                judul={u("tambahKaryawan")}
                deskripsi={u("descTambahKaryawan")}
                aksi={
                  <Button
                    onClick={() => createEmp.mutate()}
                    disabled={createEmp.isPending || emp.name.trim().length < 2}
                  >
                    {createEmp.isPending ? (
                      <Spinner />
                    ) : (
                      <UserPlus className="size-4" aria-hidden />
                    )}{" "}
                    {u("tambahKaryawan")}
                  </Button>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="emp-name">{u("nama")}</Label>
                <Input
                  id="emp-name"
                  value={emp.name}
                  onChange={(e) => setEmp({ ...emp, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="emp-pos">{u("jabatan")}</Label>
                <Input
                  id="emp-pos"
                  value={emp.position}
                  onChange={(e) => setEmp({ ...emp, position: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="emp-ptkp">{u("statusPtkp")}</Label>
                <Select
                  id="emp-ptkp"
                  value={emp.ptkpStatus}
                  onChange={(e) => setEmp({ ...emp, ptkpStatus: e.target.value })}
                >
                  {PTKP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="emp-salary">{u("gajiPokok")}</Label>
                <Input
                  id="emp-salary"
                  type="number"
                  min={0}
                  value={emp.baseSalary}
                  onChange={(e) => setEmp({ ...emp, baseSalary: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="emp-allow">{u("tunjangan")}</Label>
                <Input
                  id="emp-allow"
                  type="number"
                  min={0}
                  value={emp.allowances}
                  onChange={(e) => setEmp({ ...emp, allowances: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="emp-join">{u("tanggalMasukKerja")}</Label>
                <Input
                  id="emp-join"
                  type="date"
                  value={emp.joinDate}
                  onChange={(e) => setEmp({ ...emp, joinDate: e.target.value })}
                />
                <p className="mt-1 text-xs text-ink-muted">{u("descTanggalMasukKerja")}</p>
              </div>
              <div>
                <Label htmlFor="emp-tipe">{u("statusKerja")}</Label>
                <Select
                  id="emp-tipe"
                  value={emp.employmentType}
                  onChange={(e) => setEmp({ ...emp, employmentType: e.target.value as "pkwtt" | "pkwt" })}
                >
                  <option value="pkwtt">{u("statusPkwtt")}</option>
                  <option value="pkwt">{u("statusPkwt")}</option>
                </Select>
              </div>
              {emp.employmentType === "pkwt" ? (
                <div>
                  <Label htmlFor="emp-kontrak">{u("kontrakPkwtBerakhir")}</Label>
                  <Input
                    id="emp-kontrak"
                    type="date"
                    value={emp.contractEndDate}
                    onChange={(e) => setEmp({ ...emp, contractEndDate: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-ink-muted">{u("descKompensasiPkwt")}</p>
                </div>
              ) : null}
              <div>
                <Label htmlFor="emp-dept">{u("departemen")}</Label>
                <Select
                  id="emp-dept"
                  value={emp.departmentId}
                  onChange={(e) => setEmp({ ...emp, departmentId: e.target.value })}
                >
                  <option value="">— tanpa departemen —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} · {d.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="emp-manager">{u("atasanLangsung")}</Label>
                <Select
                  id="emp-manager"
                  value={emp.managerId}
                  onChange={(e) => setEmp({ ...emp, managerId: e.target.value })}
                >
                  <option value="">— tanpa atasan —</option>
                  {employees
                    .filter((x) => x.isActive)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </Select>
              </div>
                </div>
              </Lembar>
            ) : null}

            {employeesQuery.isLoading ? (
              <Spinner />
            ) : employees.length === 0 ? (
              <EmptyState
                icon={<Users className="size-6" aria-hidden />}
                title={u("belumAdaKaryawan")}
                description={u("descBelumAdaKaryawan")}
              />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>{u("nama")}</Th>
                    <Th>{u("jabatan")}</Th>
                    <Th>{u("departemenAtasan")}</Th>
                    <Th>PTKP</Th>
                    <Th numeric>{u("gajiPokok")}</Th>
                    <Th numeric>{u("tunjangan")}</Th>
                    <Th numeric>{u("sisaCuti")}</Th>
                    <Th>{u("status")}</Th>
                    <Th>1721-A1</Th>
                  </tr>
                </Thead>
                <tbody>
                  {employees.map((e) => (
                    <Tr key={e.id}>
                      <Td label={u("nama")}>{e.name}</Td>
                      <Td label={u("jabatan")} className="text-ink-muted">
                        {e.position ?? "—"}
                      </Td>
                      <Td
                        label={u("departemenAtasan")}
                        className="text-ink-muted"
                      >
                        {e.departmentName ?? "—"}
                        {e.managerName ? (
                          <span className="block text-xs">↳ {e.managerName}</span>
                        ) : null}
                      </Td>
                      <Td label="PTKP">{e.ptkpStatus}</Td>
                      <Td numeric label={u("gajiPokok")}>
                        {formatIDR(e.baseSalary)}
                      </Td>
                      <Td numeric label={u("tunjangan")}>
                        {formatIDR(e.allowances)}
                      </Td>
                      <Td numeric label={u("sisaCuti")}>
                        {e.leaveBalance} {u("hariSatuan")}
                      </Td>
                      <Td label={u("status")}>
                        {e.isActive ? (
                          <Badge tone="green">{u("aktifKecil")}</Badge>
                        ) : (
                          <Badge tone="neutral">{u("nonaktif")}</Badge>
                        )}
                        {isAdmin ? (
                          <button
                            onClick={() => toggleActive.mutate(e)}
                            className="ml-2 text-xs text-brand-ink hover:underline"
                          >
                            {e.isActive ? "nonaktifkan" : "aktifkan"}
                          </button>
                        ) : null}
                      </Td>
                      <Td label="1721-A1">
                        <a
                          href={`/cetak/1721a1?tenant=${tenant.tenantId}&employee=${e.id}&year=${new Date().getFullYear()}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-ink hover:underline"
                        >
                          {u("cetak")}
                        </a>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* Gaji: jalankan penggajian */}
      {tab === "gaji" && isAdmin ? (
        <Card>
          <CardHeader
            title={u("jalankanPenggajianBulanan")}
            description={u("descJalankanPenggajian")}
          />
          <CardBody className="space-y-4">
            {runError ? <Alert tone="error">{runError}</Alert> : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="run-period">{u("periodeBulan")}</Label>
                <Input
                  id="run-period"
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="run-cash">{u("bayarDariAkun")}</Label>
                <Select
                  id="run-cash"
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
              <div>
                <Label htmlFor="run-date">{u("tanggalBayar")}</Label>
                <Input
                  id="run-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => run.mutate()}
                disabled={run.isPending || activeCount === 0 || cashAccounts.length === 0}
              >
                {run.isPending ? <Spinner /> : null} {u("jalankanPenggajian")}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {tab === "thr" ? (
        <ThrCard tenantId={tenant.tenantId} isAdmin={isAdmin} cashAccounts={cashAccounts} />
      ) : null}

      {tab === "komisi" ? <CommissionCard tenantId={tenant.tenantId} isAdmin={isAdmin} /> : null}

      {tab === "pesangon" && isAdmin ? (
        <SeveranceCard tenantId={tenant.tenantId} employees={employees} />
      ) : null}

      {tab === "komponen" && isAdmin ? (
        <div className="space-y-4">
          <AdjustmentsCard tenantId={tenant.tenantId} employees={employees} period={period} />
          <OvertimeCard tenantId={tenant.tenantId} employees={employees} period={period} />
        </div>
      ) : null}

      {/* Gaji: riwayat penggajian */}
      {tab === "gaji" ? (
        <Card>
          <CardHeader title={u("riwayatPenggajian")} />
          <CardBody>
            {runsQuery.isLoading ? (
              <Spinner />
            ) : (runsQuery.data?.runs.length ?? 0) === 0 ? (
              <EmptyState
                icon={<Users className="size-6" aria-hidden />}
                title={u("belumAdaPenggajian")}
                description={u("descRiwayatPenggajian")}
              />
            ) : (
              <div className="space-y-3">
                {runsQuery.data!.runs.map((r) => (
                  <RunRow
                    key={r.id}
                    run={r}
                    tenantId={tenant.tenantId}
                    // Hanya run aktif TERBARU yang boleh dibatalkan (guard server sama).
                    canVoid={isAdmin && r.id === runsQuery.data!.runs.find((x) => !x.voidedAt)?.id}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "kasbon" ? (
        <LoansCard
          tenantId={tenant.tenantId}
          employees={employees}
          isAdmin={isAdmin}
          cashAccounts={cashAccounts}
        />
      ) : null}
      {tab === "cuti" ? (
        <LeaveCard tenantId={tenant.tenantId} employees={employees} isAdmin={isAdmin} />
      ) : null}
      {tab === "departemen" ? (
        <>
          <DepartmentsCard tenantId={tenant.tenantId} isAdmin={isAdmin} />
          <OrgChartCard tenantId={tenant.tenantId} />
        </>
      ) : null}
    </div>
  );
}

/** Departemen (Fase 8c): master hierarki departemen perusahaan. */
function DepartmentsCard({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: () => api.departments(tenantId),
  });
  const departments = query.data?.departments ?? [];
  const [form, setForm] = useState({ code: "", name: "", parentId: "" });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["departments", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["org-chart", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["employees", tenantId] });
  };
  const create = useMutation({
    mutationFn: () =>
      api.createDepartment(tenantId, {
        code: form.code.trim(),
        name: form.name.trim(),
        parentId: form.parentId || undefined,
      }),
    onSuccess: () => {
      toast("success", u("toastDepartemenDitambah"));
      setForm({ code: "", name: "", parentId: "" });
      refresh();
    },
    onError: (err) => toast("error", (err as Error).message),
  });
  const archive = useMutation({
    mutationFn: (id: string) => api.archiveDepartment(tenantId, id),
    onSuccess: () => {
      toast("success", u("toastDepartemenDiarsip"));
      refresh();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  return (
    <Card>
      <CardHeader title={u("departemen")} description={u("descDepartemen")} />
      <CardBody className="space-y-4">
        {isAdmin ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="dept-code">{u("kode")}</Label>
              <Input
                id="dept-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder={u("contohKodeDept")}
              />
            </div>
            <div>
              <Label htmlFor="dept-name">{u("nama")}</Label>
              <Input
                id="dept-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={u("contohNamaDept")}
              />
            </div>
            <div>
              <Label htmlFor="dept-parent">{u("induk")}</Label>
              <Select
                id="dept-parent"
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">— tingkat teratas —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || !form.code.trim() || form.name.trim().length < 2}
              >
                {u("tambah")}
              </Button>
            </div>
          </div>
        ) : null}

        {query.isLoading ? (
          <Spinner />
        ) : departments.length === 0 ? (
          <p className="py-2 text-sm text-ink-muted">
            {u("belumAdaDepartemen")}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-mono text-xs text-ink-muted">
                    {d.code}
                  </span>{" "}
                  <span className="font-medium">{d.name}</span>
                  {d.parentName ? (
                    <span className="text-xs text-ink-muted">
                      {" "}
                      · {u("diBawah")} {d.parentName}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <Badge tone="neutral">{d.employeeCount} karyawan</Badge>
                  {isAdmin ? (
                    <button
                      onClick={() => archive.mutate(d.id)}
                      className="text-xs text-galat-ink hover:underline"
                    >
                      {u("arsipkan")}
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/** Bagan organisasi sederhana: pohon departemen (indentasi) + karyawan & atasannya. */
function OrgChartCard({ tenantId }: { tenantId: string }) {
  const u = useUi();
  const query = useQuery({
    queryKey: ["org-chart", tenantId],
    queryFn: () => api.orgChart(tenantId),
  });
  const tree = query.data?.tree ?? [];
  const unassigned = query.data?.unassigned ?? [];

  function renderNode(node: (typeof tree)[number], depth: number) {
    return (
      <li key={node.id} style={{ marginLeft: depth * 16 }} className="py-1">
        <div className="text-sm font-semibold">
          <span className="font-mono text-xs text-ink-muted">{node.code}</span>{" "}
          {node.name}
        </div>
        {node.employees.length > 0 ? (
          <ul className="ml-4 border-l border-line pl-3">
            {node.employees.map((e) => (
              <li key={e.id} className="py-0.5 text-sm">
                {e.name}
                <span className="text-xs text-ink-muted">
                  {e.position ? ` · ${e.position}` : ""}
                  {e.managerName ? ` · atasan: ${e.managerName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {node.children.length > 0 ? (
          <ul>{node.children.map((ch) => renderNode(ch, depth + 1))}</ul>
        ) : null}
      </li>
    );
  }

  return (
    <Card>
      <CardHeader title={u("strukturOrganisasi")} description={u("descStrukturOrganisasi")} />
      <CardBody>
        {query.isLoading ? (
          <Spinner />
        ) : tree.length === 0 && unassigned.length === 0 ? (
          <p className="py-2 text-sm text-ink-muted">{u("belumAdaStruktur")}</p>
        ) : (
          <div className="space-y-3">
            <ul>{tree.map((n) => renderNode(n, 0))}</ul>
            {unassigned.length > 0 ? (
              <p className="text-xs text-ink-muted">
                Tanpa departemen: {unassigned.map((e) => e.name).join(", ")}
              </p>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/** Komponen gaji ad-hoc (bonus/lembur/potongan) untuk satu periode — ikut PPh 21 & jurnal. */
function AdjustmentsCard({
  tenantId,
  employees,
  period,
}: {
  tenantId: string;
  employees: ApiEmployee[];
  period: string;
}) {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employeeId: "",
    name: "",
    amount: "",
    kind: "plus" as "plus" | "minus",
  });

  const listQuery = useQuery({
    queryKey: ["payroll-adjustments", tenantId, period],
    queryFn: () => api.payrollAdjustments(tenantId, period),
    enabled: /^\d{4}-\d{2}$/.test(period),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["payroll-adjustments", tenantId] });

  const create = useMutation({
    mutationFn: () =>
      api.createPayrollAdjustment(tenantId, {
        period,
        employeeId: form.employeeId || employees.find((e) => e.isActive)?.id || "",
        name: form.name.trim(),
        amount: (form.kind === "minus" ? -1 : 1) * Math.abs(Math.round(Number(form.amount) || 0)),
      }),
    onSuccess: () => {
      toast("success", u("toastKomponenDitambah"));
      setForm({ employeeId: form.employeeId, name: "", amount: "", kind: "plus" });
      invalidate();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deletePayrollAdjustment(tenantId, id),
    onSuccess: () => {
      toast("success", u("toastKomponenDihapus"));
      invalidate();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const adjustments = listQuery.data?.adjustments ?? [];
  const activeEmployees = employees.filter((e) => e.isActive);

  return (
    <Card>
      <CardHeader title={`${u("bonusLemburPotongan")} ${period}`} description={u("descKomponen")} />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="adj-emp">{u("karyawan")}</Label>
            <Select
              id="adj-emp"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            >
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="adj-name">{u("namaKomponen")}</Label>
            <Input
              id="adj-name"
              placeholder={u("contohBonus")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="adj-kind">{u("jenis")}</Label>
            <Select
              id="adj-kind"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as "plus" | "minus" })}
            >
              <option value="plus">{u("tambahanBonusLembur")}</option>
              <option value="minus">{u("potongan")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="adj-amount">{u("nominalRp")}</Label>
            <Input
              id="adj-amount"
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => create.mutate()}
            disabled={
              create.isPending ||
              form.name.trim().length < 2 ||
              !(Number(form.amount) > 0) ||
              activeEmployees.length === 0
            }
          >
            {create.isPending ? <Spinner /> : null} {u("tambahKomponen")}
          </Button>
        </div>

        {adjustments.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>{u("karyawan")}</Th>
                <Th>{u("komponen")}</Th>
                <Th numeric>{u("nominal")}</Th>
                <Th>{u("status")}</Th>
              </tr>
            </Thead>
            <tbody>
              {adjustments.map((a) => (
                <Tr key={a.id}>
                  <Td label={u("karyawan")}>{a.employeeName}</Td>
                  <Td label={u("komponen")}>{a.name}</Td>
                  <Td
                    numeric
                    label={u("nominal")}
                    className={a.amount < 0 ? "text-galat-ink" : ""}
                  >
                    {formatIDR(a.amount)}
                  </Td>
                  <Td label={u("status")}>
                    {a.runId ? (
                      <Badge tone="green">terpakai</Badge>
                    ) : (
                      <>
                        <Badge tone="amber">menunggu run</Badge>
                        <button
                          onClick={() => remove.mutate(a.id)}
                          className="ml-2 text-xs text-galat-ink hover:underline"
                        >
                          hapus
                        </button>
                      </>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-ink-muted">{u("belumAdaKomponen")}</p>
        )}
      </CardBody>
    </Card>
  );
}

/** Kasbon/pinjaman karyawan: dicairkan dari kas (berjurnal), cicilan otomatis memotong gaji tiap run. */
function LoansCard({
  tenantId,
  employees,
  isAdmin,
  cashAccounts,
}: {
  tenantId: string;
  employees: ApiEmployee[];
  isAdmin: boolean;
  cashAccounts: AccountRow[];
}) {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employeeId: "",
    name: "",
    principal: "",
    monthly: "",
    cashAccountId: "",
    date: today(),
  });

  const loansQuery = useQuery({
    queryKey: ["employee-loans", tenantId],
    queryFn: () => api.employeeLoans(tenantId),
  });

  const create = useMutation({
    mutationFn: () =>
      api.createEmployeeLoan(tenantId, {
        employeeId: form.employeeId || employees.find((e) => e.isActive)?.id || "",
        name: form.name.trim(),
        principal: Math.round(Number(form.principal) || 0),
        monthlyDeduction: Math.round(Number(form.monthly) || 0),
        cashAccountId: form.cashAccountId || cashAccounts[0]?.id || "",
        loanDate: form.date,
      }),
    onSuccess: (res) => {
      toast(
        "success",
        isi(u("toastKasbonDicairkan"), res.journalNo)
      );
      setForm({
        employeeId: form.employeeId,
        name: "",
        principal: "",
        monthly: "",
        cashAccountId: form.cashAccountId,
        date: today(),
      });
      queryClient.invalidateQueries({ queryKey: ["employee-loans", tenantId] });
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const loans = loansQuery.data?.loans ?? [];
  const activeEmployees = employees.filter((e) => e.isActive);

  return (
    <Card>
      <CardHeader title={u("kasbonPinjaman")} description={u("descKasbon")} />
      <CardBody className="space-y-4">
        {isAdmin ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label htmlFor="loan-emp">{u("karyawan")}</Label>
                <Select
                  id="loan-emp"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                >
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="loan-name">{u("keterangan")}</Label>
                <Input
                  id="loan-name"
                  placeholder={u("contohKasbon")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="loan-principal">{u("pokokRp")}</Label>
                <Input
                  id="loan-principal"
                  type="number"
                  min={0}
                  value={form.principal}
                  onChange={(e) => setForm({ ...form, principal: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="loan-monthly">{u("cicilanBulanRp")}</Label>
                <Input
                  id="loan-monthly"
                  type="number"
                  min={0}
                  value={form.monthly}
                  onChange={(e) => setForm({ ...form, monthly: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="loan-cash">{u("cairkanDari")}</Label>
                <Select
                  id="loan-cash"
                  value={form.cashAccountId}
                  onChange={(e) => setForm({ ...form, cashAccountId: e.target.value })}
                >
                  {cashAccounts.map((a) => (
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
                  !(Number(form.principal) > 0) ||
                  !(Number(form.monthly) > 0) ||
                  Number(form.monthly) > Number(form.principal) ||
                  activeEmployees.length === 0 ||
                  cashAccounts.length === 0
                }
              >
                {create.isPending ? <Spinner /> : <HandCoins className="size-4" aria-hidden />}{" "}
                {u("cairkanKasbon")}
              </Button>
            </div>
          </>
        ) : null}

        {loansQuery.isLoading ? (
          <Spinner />
        ) : loans.length === 0 ? (
          <p className="text-sm text-ink-muted">{u("belumAdaKasbon")}</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{u("karyawan")}</Th>
                <Th>{u("keterangan")}</Th>
                <Th numeric>{u("pokok")}</Th>
                <Th numeric>{u("cicilanBulan")}</Th>
                <Th numeric>{u("sisa")}</Th>
                <Th>{u("status")}</Th>
              </tr>
            </Thead>
            <tbody>
              {loans.map((l) => (
                <Tr key={l.id}>
                  <Td label={u("karyawan")}>{l.employeeName}</Td>
                  <Td label={u("keterangan")}>
                    {l.name}
                    {l.journalNo ? (
                      <span className="ml-1 text-xs text-ink-muted">
                        · {u("jurnalKecil")} {l.journalNo}
                      </span>
                    ) : null}
                  </Td>
                  <Td numeric label={u("pokok")}>
                    {formatIDR(l.principal)}
                  </Td>
                  <Td numeric label={u("cicilanBulan")}>
                    {formatIDR(l.monthlyDeduction)}
                  </Td>
                  <Td numeric label={u("sisa")} className="font-medium">
                    {formatIDR(l.balance)}
                  </Td>
                  <Td label={u("status")}>
                    {l.status === "paid" ? (
                      <Badge tone="green">lunas</Badge>
                    ) : (
                      <Badge tone="amber">berjalan</Badge>
                    )}
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

// Konstanta tingkat modul tidak boleh memanggil hook, jadi yang disimpan
// adalah KUNCI kamus — diterjemahkan saat render (aturan tetap sejak 16j).
// Ketiga kuncinya sudah dibuat pada Fase 16i, hanya belum tersambung.
const LEAVE_LABEL: Record<LeaveType, UiKey> = {
  annual: "cutiTahunan",
  sick: "sakit",
  permit: "izin",
};
const LEAVE_STATUS_TONE = { pending: "amber", approved: "green", rejected: "red" } as const;
const LEAVE_STATUS_LABEL: Record<"pending" | "approved" | "rejected", UiKey> = {
  pending: "menungguKecil",
  approved: "disetujuiKecil",
  rejected: "ditolakKecil",
};

/** Cuti & izin: pengajuan + persetujuan; cuti tahunan yang disetujui memotong saldo cuti. */
function LeaveCard({
  tenantId,
  employees,
  isAdmin,
}: {
  tenantId: string;
  employees: ApiEmployee[];
  isAdmin: boolean;
}) {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employeeId: "",
    type: "annual" as LeaveType,
    start: today(),
    end: today(),
    note: "",
  });

  const listQuery = useQuery({
    queryKey: ["leave-requests", tenantId],
    queryFn: () => api.leaveRequests(tenantId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leave-requests", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["employees", tenantId] });
  };

  const create = useMutation({
    mutationFn: () =>
      api.createLeaveRequest(tenantId, {
        employeeId: form.employeeId || employees.find((e) => e.isActive)?.id || "",
        type: form.type,
        startDate: form.start,
        endDate: form.end,
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      }),
    onSuccess: (res) => {
      toast(
        "success",
        isi(u("toastCutiDicatat"), u(LEAVE_LABEL[form.type]).toLowerCase(), res.days)
      );
      setForm({ ...form, note: "" });
      invalidate();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const decide = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" }) =>
      api.decideLeaveRequest(tenantId, v.id, { status: v.status }),
    onSuccess: (_res, v) => {
      toast("success", v.status === "approved" ? "Pengajuan disetujui." : "Pengajuan ditolak.");
      invalidate();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const requests: ApiLeaveRequest[] = listQuery.data?.requests ?? [];
  const activeEmployees = employees.filter((e) => e.isActive);

  return (
    <Card>
      <CardHeader title={u("cutiIzin")} description={u("descCutiIzin")} />
      <CardBody className="space-y-4">
        {isAdmin ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label htmlFor="leave-emp">{u("karyawan")}</Label>
                <Select
                  id="leave-emp"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                >
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({u("sisaKecil")} {e.leaveBalance})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="leave-type">{u("jenis")}</Label>
                <Select
                  id="leave-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
                >
                  <option value="annual">{u("cutiTahunan")}</option>
                  <option value="sick">{u("sakit")}</option>
                  <option value="permit">{u("izin")}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="leave-start">{u("mulai")}</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="leave-end">{u("selesai")}</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="leave-note">{u("catatanOpsional")}</Label>
                <Input
                  id="leave-note"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || activeEmployees.length === 0 || form.end < form.start}
              >
                {create.isPending ? <Spinner /> : <CalendarDays className="size-4" aria-hidden />}{" "}
                {u("ajukan")}
              </Button>
            </div>
          </>
        ) : null}

        {listQuery.isLoading ? (
          <Spinner />
        ) : requests.length === 0 ? (
          <p className="text-sm text-ink-muted">{u("belumAdaCuti")}</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line p-3 text-sm"
              >
                <span className="font-medium">{r.employeeName}</span>
                <span>{u(LEAVE_LABEL[r.type])}</span>
                <span className="text-ink-muted">
                  {r.startDate} s.d. {r.endDate} ({r.days} hari)
                </span>
                {r.note ? <span className="text-xs text-ink-muted">“{r.note}”</span> : null}
                <Badge tone={LEAVE_STATUS_TONE[r.status]}>{u(LEAVE_STATUS_LABEL[r.status])}</Badge>
                {isAdmin && r.status === "pending" ? (
                  <span className="ml-auto flex gap-2">
                    <Button
                      variant="secondary"
                      className="h-8"
                      onClick={() => decide.mutate({ id: r.id, status: "approved" })}
                      disabled={decide.isPending}
                    >
                      {u("setujui")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8"
                      onClick={() => decide.mutate({ id: r.id, status: "rejected" })}
                      disabled={decide.isPending}
                    >
                      {u("tolak")}
                    </Button>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RunRow({
  run,
  tenantId,
  canVoid = false,
}: {
  run: ApiPayrollRun;
  tenantId: string;
  canVoid?: boolean;
}) {
  const u = useUi();
  const [open, setOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const isVoided = Boolean(run.voidedAt);
  const doVoid = useMutation({
    mutationFn: () => api.voidPayrollRun(tenantId, run.id),
    onSuccess: (res) => {
      toast(
        "success",
        isi(u("toastPenggajianDibatalkan"), res.runNo, res.reversalEntryNo)
      );
      setVoidOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payroll-runs", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["employee-loans", tenantId] });
    },
    onError: (err) => {
      toast("error", (err as Error).message);
      setVoidOpen(false);
    },
  });
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-sm">{run.runNo}</span>
        <span className="font-medium">
          {u("periodeLabel")} {run.period}
        </span>
        {isVoided ? (
          <Badge tone="red">DIBATALKAN{run.voidJournalNo ? ` · ${run.voidJournalNo}` : ""}</Badge>
        ) : run.journalNo ? (
          <Badge tone="brand">
            {u("jurnalKecil")} {run.journalNo}
          </Badge>
        ) : null}
        <span className="text-xs text-ink-muted">{run.payslips.length} karyawan</span>
        <span className="ml-auto text-sm">
          {u("bruto")} <strong className="tabular-nums">{formatIDR(run.totalGross)}</strong> · Netto{" "}
          <strong className="tabular-nums">{formatIDR(run.totalNet)}</strong>
        </span>
        {canVoid && !isVoided ? (
          <Button
            variant="ghost"
            className="h-8 text-galat-ink hover:bg-galat-surface"
            onClick={() => setVoidOpen(true)}
          >
            {u("batalkan")}
          </Button>
        ) : null}
        <Button variant="ghost" className="h-8" onClick={() => setOpen((o) => !o)}>
          {open ? "Tutup" : "Slip gaji"}
        </Button>
      </div>

      <ConfirmDialog
        open={voidOpen}
        title={`${u("batalkanPenggajianTanya")} ${run.runNo}?`}
        description={
          <>
            {u("descBatalkanPenggajian1")} {run.period} {u("descBatalkanPenggajian2")}{" "}
            <strong>{u("dibatalkan")}</strong>.
          </>
        }
        confirmLabel={u("yaBatalkanPenggajian")}
        danger
        busy={doVoid.isPending}
        onConfirm={() => doVoid.mutate()}
        onCancel={() => setVoidOpen(false)}
      />

      {open ? (
        <div className="mt-3 rounded-lg bg-surface-sunken p-3">
          <Table>
            <Thead>
              <tr>
                <Th>{u("karyawan")}</Th>
                <Th numeric>{u("bruto")}</Th>
                <Th numeric>BPJS</Th>
                <Th numeric>PPh 21 (TER)</Th>
                <Th numeric>{u("netto")}</Th>
                <Th numeric>{u("slip")}</Th>
              </tr>
            </Thead>
            <tbody>
              {run.payslips.map((p) => (
                <Tr key={p.id}>
                  <Td label={u("karyawan")}>
                    {p.employeeName}
                    {p.position ? (
                      <span className="text-xs text-ink-muted"> · {p.position}</span>
                    ) : null}
                  </Td>
                  <Td numeric label={u("bruto")}>
                    {formatIDR(p.gross)}
                  </Td>
                  <Td numeric label="BPJS">
                    {formatIDR(p.bpjsHealthEmployee + p.bpjsJhtEmployee + p.bpjsJpEmployee)}
                  </Td>
                  {/* Bukan `numeric`: selain nominal, sel ini memuat keterangan
                      kategori/tarif TER — memaksanya mono membuat keterangan itu
                      ikut jadi mono dan sulit dibaca. */}
                  <Td label="PPh 21 (TER)" className="text-right">
                    <span className="num">{formatIDR(p.pph21)}</span>{" "}
                    <span className="text-xs text-ink-muted">
                      ({p.terCategory}/{p.terRate}%)
                    </span>
                  </Td>
                  <Td numeric label={u("netto")} className="font-medium">
                    {formatIDR(p.net)}
                  </Td>
                  <Td label={u("slip")} className="text-right">
                    <a
                      href={`/cetak/slip-gaji?tenant=${tenantId}&run=${run.id}&employee=${p.employeeId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-ink hover:underline"
                    >
                      {u("cetak")}
                    </a>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

/**
 * THR — Tunjangan Hari Raya (Fase 43a).
 *
 * Alurnya sengaja dua langkah: **pratinjau dulu, bayar kemudian**. THR adalah
 * pembayaran besar yang tidak bisa ditarik kembali dari rekening karyawan, dan
 * kesalahannya baru terlihat setelah uangnya pergi. Karena itu tombol bayar
 * baru muncul setelah daftarnya dilihat.
 */
function ThrCard({
  tenantId,
  isAdmin,
  cashAccounts,
}: {
  tenantId: string;
  isAdmin: boolean;
  cashAccounts: AccountRow[];
}) {
  const u = useUi();
  const lang = useLang();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [hariRaya, setHariRaya] = useState<HariRaya>("idulfitri");
  const [payDate, setPayDate] = useState(today());
  const [cashAccountId, setCashAccountId] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  const preview = useQuery({
    queryKey: ["thr-preview", tenantId, payDate],
    queryFn: () => api.thrPreview(tenantId, payDate),
    enabled: tanggalSah(payDate),
  });
  const runsQuery = useQuery({
    queryKey: ["thr-runs", tenantId],
    queryFn: () => api.thrRuns(tenantId),
  });

  const akun = cashAccountId || cashAccounts[0]?.id;
  const bayar = useMutation({
    mutationFn: () => api.runThr(tenantId, { tahun, hariRaya, cashAccountId: akun ?? "", payDate }),
    onSuccess: (res) => {
      setGalat(null);
      toast("success", isi(u("toastThrDibayar"), res.runNo, String(res.penerima), formatIDR(res.totalNet)));
      queryClient.invalidateQueries({ queryKey: ["thr-runs", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["thr-preview", tenantId] });
    },
    onError: (err) => setGalat((err as Error).message),
  });

  const p = preview.data;
  return (
    <div className="space-y-4">
      {isAdmin ? (
        <Card>
          <CardHeader title={u("bayarThr")} description={u("descBayarThr")} />
          <CardBody className="space-y-4">
            {galat ? <Alert tone="error">{galat}</Alert> : null}
            {p && p.tanpaTanggalMasuk > 0 ? (
              <Alert tone="warning">{isi(u("peringatanTanggalMasuk"), String(p.tanpaTanggalMasuk))}</Alert>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor="thr-tahun">{u("tahunThr")}</Label>
                <Input
                  id="thr-tahun"
                  type="number"
                  value={String(tahun)}
                  onChange={(e) => setTahun(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="thr-raya">{u("hariRaya")}</Label>
                <Select
                  id="thr-raya"
                  value={hariRaya}
                  onChange={(e) => setHariRaya(e.target.value as HariRaya)}
                >
                  {HARI_RAYA.map((r) => (
                    <option key={r} value={r}>
                      {namaHariRaya(r, lang)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="thr-tanggal">{u("tanggalBayar")}</Label>
                <Input
                  id="thr-tanggal"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="thr-akun">{u("bayarDariAkun")}</Label>
                <Select id="thr-akun" value={akun ?? ""} onChange={(e) => setCashAccountId(e.target.value)}>
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => bayar.mutate()}
                disabled={bayar.isPending || !akun || (p?.berhak ?? 0) === 0}
              >
                {bayar.isPending ? <Spinner /> : null} {u("bayarThr")}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={u("pratinjauThr")} description={u("descPratinjauThr")} />
        <CardBody>
          {preview.isLoading ? (
            <Spinner />
          ) : !p || p.baris.length === 0 ? (
            <EmptyState
              icon={<Gift className="size-6" aria-hidden />}
              title={u("belumAdaKaryawan")}
              description={u("descBelumAdaKaryawan")}
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>{u("karyawan")}</Th>
                  <Th>{u("masaKerja")}</Th>
                  <Th numeric>{u("upahSebulan")}</Th>
                  <Th numeric>{u("nilaiThr")}</Th>
                  <Th numeric>{u("pph21Thr")}</Th>
                  <Th numeric>{u("netto")}</Th>
                </Tr>
              </Thead>
              <tbody>
                {p.baris.map((b) => (
                  <Tr key={b.employeeId}>
                    <Td label={u("karyawan")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{b.employeeName}</span>
                        {b.tanpaTanggalMasuk ? (
                          <Badge tone="red">{u("tanpaTanggalMasuk")}</Badge>
                        ) : !b.berhak ? (
                          <Badge tone="amber">{u("belumBerhak")}</Badge>
                        ) : b.proporsional ? (
                          <Badge tone="amber">{u("proporsionalLabel")}</Badge>
                        ) : (
                          <Badge tone="green">{u("penuhLabel")}</Badge>
                        )}
                      </div>
                    </Td>
                    <Td label={u("masaKerja")}>
                      {b.tanpaTanggalMasuk ? "—" : `${b.masaKerjaBulan} ${u("bulanSatuan")}`}
                    </Td>
                    <Td label={u("upahSebulan")}  numeric>
                      {formatIDR(b.upahSebulan)}
                    </Td>
                    <Td label={u("nilaiThr")}  numeric>
                      {formatIDR(b.thr)}
                    </Td>
                    <Td label={u("pph21Thr")}  numeric>
                      {formatIDR(b.pph21)}
                    </Td>
                    <Td label={u("netto")}  numeric>
                      <strong>{formatIDR(b.net)}</strong>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={u("riwayatThr")} />
        <CardBody>
          {runsQuery.isLoading ? (
            <Spinner />
          ) : (runsQuery.data?.runs.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Gift className="size-6" aria-hidden />}
              title={u("belumAdaThr")}
              description={u("descRiwayatThr")}
            />
          ) : (
            <div className="space-y-3">
              {runsQuery.data!.runs.map((r) => (
                <ThrRunRow key={r.id} run={r} tenantId={tenantId} canVoid={isAdmin} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function ThrRunRow({ run, tenantId, canVoid }: { run: ApiThrRun; tenantId: string; canVoid: boolean }) {
  const u = useUi();
  const lang = useLang();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const isVoided = Boolean(run.voidedAt);
  const doVoid = useMutation({
    mutationFn: () => api.voidThrRun(tenantId, run.id),
    onSuccess: (res) => {
      toast("success", isi(u("toastThrDibatalkan"), res.runNo, res.reversalEntryNo));
      queryClient.invalidateQueries({ queryKey: ["thr-runs", tenantId] });
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-sm">{run.runNo}</span>
        <span className="font-medium">
          {namaHariRaya(run.hariRaya, lang)} {run.tahun}
        </span>
        {isVoided ? (
          <Badge tone="red">
            {u("dibatalkan")}
            {run.voidJournalNo ? ` · ${run.voidJournalNo}` : ""}
          </Badge>
        ) : run.journalNo ? (
          <Badge tone="brand">
            {u("jurnalKecil")} {run.journalNo}
          </Badge>
        ) : null}
        <span className="text-xs text-ink-muted">
          {run.slips.length} {u("penerimaThr")}
        </span>
        <span className="ml-auto text-sm">
          {u("nilaiThr")} <strong className="tabular-nums">{formatIDR(run.totalThr)}</strong> · {u("netto")}{" "}
          <strong className="tabular-nums">{formatIDR(run.totalNet)}</strong>
        </span>
        {canVoid && !isVoided ? (
          <Button
            variant="ghost"
            className="h-8 text-galat-ink hover:bg-galat-surface"
            onClick={() => doVoid.mutate()}
          >
            {u("batalkan")}
          </Button>
        ) : null}
        <Button variant="ghost" className="h-8" onClick={() => setOpen((o) => !o)}>
          {open ? u("tutupRincian") : u("lihatRincian")}
        </Button>
      </div>
      {open ? (
        <Table className="mt-3">
          <Thead>
            <Tr>
              <Th>{u("karyawan")}</Th>
              <Th>{u("masaKerja")}</Th>
              <Th numeric>{u("upahSebulan")}</Th>
              <Th numeric>{u("nilaiThr")}</Th>
              <Th numeric>{u("pph21Thr")}</Th>
              <Th numeric>{u("netto")}</Th>
            </Tr>
          </Thead>
          <tbody>
            {run.slips.map((s) => (
              <Tr key={s.id}>
                <Td label={u("karyawan")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{s.employeeName}</span>
                    {s.proporsional ? <Badge tone="amber">{u("proporsionalLabel")}</Badge> : null}
                  </div>
                </Td>
                <Td label={u("masaKerja")}>
                  {s.masaKerjaBulan} {u("bulanSatuan")}
                </Td>
                <Td label={u("upahSebulan")}  numeric>
                  {formatIDR(s.upahSebulan)}
                </Td>
                <Td label={u("nilaiThr")}  numeric>
                  {formatIDR(s.thr)}
                </Td>
                <Td label={u("pph21Thr")}  numeric>
                  {formatIDR(s.pph21)}
                </Td>
                <Td label={u("netto")}  numeric>
                  <strong>{formatIDR(s.net)}</strong>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </div>
  );
}

/**
 * Lembur berumus — PP 35/2021 (Fase 43b).
 *
 * Yang diketik pengguna hanya **jam dan jenis hari**; upahnya dihitung server
 * memakai tangga pengali peraturannya. Sebelum fase ini, lembur adalah angka
 * rupiah yang diketik tangan ke komponen ad-hoc — artinya rumusnya hidup di
 * kepala pengetiknya, dan kesalahannya tidak bisa diperiksa siapa pun,
 * termasuk oleh karyawan yang dirugikan.
 *
 * Duduk di tab yang sama dengan komponen ad-hoc karena keduanya menambah bruto
 * periode yang sama; memisahkannya akan menyembunyikan hubungan itu.
 */
function OvertimeCard({
  tenantId,
  employees,
  period,
}: {
  tenantId: string;
  employees: ApiEmployee[];
  period: string;
}) {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employeeId: "",
    date: today(),
    jenisHari: "biasa" as JenisHariLembur,
    hours: "2",
  });
  const [galat, setGalat] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["overtime", tenantId, period],
    queryFn: () => api.overtime(tenantId, period),
    enabled: /^\d{4}-\d{2}$/.test(period),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["overtime", tenantId] });

  const create = useMutation({
    mutationFn: () =>
      api.createOvertime(tenantId, {
        employeeId: form.employeeId || employees[0]?.id || "",
        date: form.date,
        jenisHari: form.jenisHari,
        hours: Number(form.hours),
      }),
    onSuccess: (res) => {
      setGalat(null);
      toast("success", isi(u("toastLemburDicatat"), form.hours, formatIDR(res.amount)));
      invalidate();
    },
    onError: (err) => setGalat((err as Error).message),
  });

  const hapus = useMutation({
    mutationFn: (id: string) => api.deleteOvertime(tenantId, id),
    onSuccess: () => {
      toast("success", u("toastLemburDihapus"));
      invalidate();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const daftar: ApiOvertime[] = listQuery.data?.overtime ?? [];
  const adaLampau = daftar.some((o) => o.exceedsLimit);

  return (
    <Card>
      <CardHeader title={u("lembur")} description={u("descLembur")} />
      <CardBody className="space-y-4">
        {galat ? <Alert tone="error">{galat}</Alert> : null}
        {adaLampau ? <Alert tone="warning">{u("descMelampauiBatasJam")}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="ot-emp">{u("karyawan")}</Label>
            <Select
              id="ot-emp"
              value={form.employeeId || employees[0]?.id || ""}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ot-date">{u("tanggal")}</Label>
            <Input
              id="ot-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="ot-jenis">{u("jenisHariLembur")}</Label>
            <Select
              id="ot-jenis"
              value={form.jenisHari}
              onChange={(e) => setForm((f) => ({ ...f, jenisHari: e.target.value as JenisHariLembur }))}
            >
              <option value="biasa">{u("hariBiasa")}</option>
              <option value="libur6">{u("hariLibur6")}</option>
              <option value="libur5">{u("hariLibur5")}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ot-jam">{u("jamLembur")}</Label>
            <Input
              id="ot-jam"
              type="number"
              step="0.5"
              min="0.5"
              value={form.hours}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => create.mutate()} disabled={create.isPending || employees.length === 0}>
            {create.isPending ? <Spinner /> : null} {u("catatLembur")}
          </Button>
        </div>

        {listQuery.isLoading ? (
          <Spinner />
        ) : daftar.length === 0 ? (
          <EmptyState
            icon={<Clock className="size-6" aria-hidden />}
            title={u("belumAdaLembur")}
            description={u("descBelumAdaLembur")}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>{u("karyawan")}</Th>
                <Th>{u("tanggal")}</Th>
                <Th>{u("jenisHariLembur")}</Th>
                <Th numeric>{u("jamLembur")}</Th>
                <Th numeric>{u("upahSejam")}</Th>
                <Th numeric>{u("upahLembur")}</Th>
                <Th>{u("aksiLabel")}</Th>
              </Tr>
            </Thead>
            <tbody>
              {daftar.map((o) => (
                <Tr key={o.id}>
                  <Td label={u("karyawan")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{o.employeeName}</span>
                      {o.exceedsLimit ? <Badge tone="amber">{u("melampauiBatasJam")}</Badge> : null}
                      {o.runId ? <Badge tone="brand">{u("sudahDigaji")}</Badge> : null}
                    </div>
                  </Td>
                  <Td label={u("tanggal")}>{o.date}</Td>
                  <Td label={u("jenisHariLembur")}>
                    {o.jenisHari === "biasa" ? u("hariBiasa") : o.jenisHari === "libur6" ? u("hariLibur6") : u("hariLibur5")}
                  </Td>
                  <Td label={u("jamLembur")} numeric>
                    {o.hours}
                  </Td>
                  <Td label={u("upahSejam")} numeric>
                    {formatIDR(o.hourlyWage)}
                  </Td>
                  <Td label={u("upahLembur")} numeric>
                    <strong>{formatIDR(o.amount)}</strong>
                  </Td>
                  <Td label={u("aksiLabel")}>
                    {o.runId ? null : (
                      <Button
                        variant="ghost"
                        className="h-8 text-galat-ink hover:bg-galat-surface"
                        onClick={() => hapus.mutate(o.id)}
                      >
                        {u("hapus")}
                      </Button>
                    )}
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
 * Komisi sales (Fase 44a).
 *
 * Laporannya dihitung saat dibaca, bukan disimpan sebagai angka jadi: retur,
 * pelunasan, dan pembatalan faktur terus mengubah komisi yang layak dibayar,
 * dan angka jadi akan basi begitu salah satunya terjadi.
 */
function CommissionCard({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    dasar: "omzet" as KomisiDasar,
    pemicu: "pelunasan" as KomisiPemicu,
    persen: "2,5",
  });
  const [galat, setGalat] = useState<string | null>(null);
  const awalBulan = `${thisMonth()}-01`;
  const [dari, setDari] = useState(awalBulan);
  const [sampai, setSampai] = useState(today());

  const schemesQuery = useQuery({
    queryKey: ["commission-schemes", tenantId],
    queryFn: () => api.commissionSchemes(tenantId),
  });
  // Rentang diperiksa sebagai nilai bernama, bukan di dalam `enabled:` —
  // syaratnya ada tiga, dan tiga syarat yang berdesakan di satu baris adalah
  // tempat orang berikutnya salah membaca.
  const rentangSah = tanggalSah(dari) && tanggalSah(sampai) && dari <= sampai;
  const reportQuery = useQuery({
    queryKey: ["commission-report", tenantId, dari, sampai],
    queryFn: () => api.commissionReport(tenantId, dari, sampai),
    enabled: rentangSah,
  });

  const buat = useMutation({
    mutationFn: () =>
      api.createCommissionScheme(tenantId, {
        name: form.name,
        dasar: form.dasar,
        pemicu: form.pemicu,
        // Persen di layar, basis poin di penyimpanan. Koma desimal Indonesia
        // diterima apa adanya — memaksa titik akan menolak angka yang benar.
        rateBp: Math.round(Number(form.persen.replace(",", ".")) * 100),
      }),
    onSuccess: () => {
      setGalat(null);
      toast("success", isi(u("toastSkemaKomisiDibuat"), form.name));
      setForm((f) => ({ ...f, name: "" }));
      queryClient.invalidateQueries({ queryKey: ["commission-schemes", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["commission-report", tenantId] });
    },
    onError: (err) => setGalat((err as Error).message),
  });

  const schemes: ApiCommissionScheme[] = schemesQuery.data?.schemes ?? [];
  const laporan = reportQuery.data;

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <Card>
          <CardHeader title={u("skemaKomisi")} description={u("descSkemaKomisi")} />
          <CardBody className="space-y-4">
            {galat ? <Alert tone="error">{galat}</Alert> : null}
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor="ks-nama">{u("namaSkema")}</Label>
                <Input
                  id="ks-nama"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="ks-dasar">{u("dasarKomisiLabel")}</Label>
                <Select
                  id="ks-dasar"
                  value={form.dasar}
                  onChange={(e) => setForm((f) => ({ ...f, dasar: e.target.value as KomisiDasar }))}
                >
                  <option value="omzet">{u("dasarOmzet")}</option>
                  <option value="laba">{u("dasarLaba")}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="ks-pemicu">{u("pemicuKomisi")}</Label>
                <Select
                  id="ks-pemicu"
                  value={form.pemicu}
                  onChange={(e) => setForm((f) => ({ ...f, pemicu: e.target.value as KomisiPemicu }))}
                >
                  <option value="pelunasan">{u("pemicuPelunasan")}</option>
                  <option value="faktur">{u("pemicuFaktur")}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="ks-tarif">{u("tarifPersen")}</Label>
                <Input
                  id="ks-tarif"
                  value={form.persen}
                  onChange={(e) => setForm((f) => ({ ...f, persen: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => buat.mutate()} disabled={buat.isPending || form.name.trim().length < 2}>
                {buat.isPending ? <Spinner /> : null} {u("buatSkema")}
              </Button>
            </div>

            {schemesQuery.isLoading ? (
              <Spinner />
            ) : schemes.length === 0 ? (
              <EmptyState
                icon={<Percent className="size-6" aria-hidden />}
                title={u("belumAdaSkemaKomisi")}
                description={u("descBelumAdaSkemaKomisi")}
              />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>{u("namaSkema")}</Th>
                    <Th>{u("dasarKomisiLabel")}</Th>
                    <Th>{u("pemicuKomisi")}</Th>
                    <Th numeric>{u("tarifPersen")}</Th>
                    <Th numeric>{u("dipakaiOleh")}</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {schemes.map((s) => (
                    <Tr key={s.id}>
                      <Td label={u("namaSkema")}>{s.name}</Td>
                      <Td label={u("dasarKomisiLabel")}>{s.dasar === "omzet" ? u("dasarOmzet") : u("dasarLaba")}</Td>
                      <Td label={u("pemicuKomisi")}>
                        {s.pemicu === "faktur" ? u("pemicuFaktur") : u("pemicuPelunasan")}
                      </Td>
                      <Td label={u("tarifPersen")} numeric>
                        {bpKePersen(s.rateBp)}%
                      </Td>
                      <Td label={u("dipakaiOleh")} numeric>
                        {s.dipakai}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={u("laporanKomisi")} />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="kr-dari">{u("dari")}</Label>
              <Input id="kr-dari" type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="kr-sampai">{u("sampai")}</Label>
              <Input id="kr-sampai" type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
            </div>
          </div>

          {laporan && laporan.tanpaSkema > 0 ? (
            <Alert tone="warning">{isi(u("fakturTanpaSkema"), String(laporan.tanpaSkema))}</Alert>
          ) : null}

          {reportQuery.isLoading ? (
            <Spinner />
          ) : !laporan || laporan.rows.length === 0 ? (
            <EmptyState
              icon={<Percent className="size-6" aria-hidden />}
              title={u("belumAdaKomisi")}
              description={u("descBelumAdaKomisi")}
            />
          ) : (
            <div className="space-y-3">
              {laporan.rows.map((r) => (
                <div key={r.salespersonId} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{r.salespersonName}</span>
                    <Badge tone="brand">
                      {r.schemeName} · {bpKePersen(r.rateBp)}%
                    </Badge>
                    <span className="text-xs text-ink-muted">
                      {r.dasar === "omzet" ? u("dasarOmzet") : u("dasarLaba")} ·{" "}
                      {r.pemicu === "faktur" ? u("pemicuFaktur") : u("pemicuPelunasan")}
                    </span>
                    <span className="ml-auto text-sm">
                      {u("komisi")} <strong className="tabular-nums">{formatIDR(r.total)}</strong>
                    </span>
                  </div>
                  <Table className="mt-3">
                    <Thead>
                      <Tr>
                        <Th>{u("faktur")}</Th>
                        <Th>{u("pelanggan")}</Th>
                        <Th numeric>{u("dasarKomisiLabel")}</Th>
                        <Th numeric>{u("porsiTerbayar")}</Th>
                        <Th numeric>{u("komisi")}</Th>
                      </Tr>
                    </Thead>
                    <tbody>
                      {r.lines.map((l) => (
                        <Tr key={l.invoiceId}>
                          <Td label={u("faktur")}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm">{l.invoiceNo}</span>
                              {l.voidedAt ? <Badge tone="red">{u("dibatalkan")}</Badge> : null}
                              {l.returnedAmount > 0 ? <Badge tone="amber">{u("retur")}</Badge> : null}
                            </div>
                          </Td>
                          <Td label={u("pelanggan")}>{l.contactName}</Td>
                          <Td label={u("dasarKomisiLabel")} numeric>
                            {formatIDR(l.dasarNilai)}
                          </Td>
                          <Td label={u("porsiTerbayar")} numeric>
                            {Math.round(l.porsi * 100)}%
                          </Td>
                          <Td label={u("komisi")} numeric>
                            <strong>{formatIDR(l.amount)}</strong>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ))}
              <div className="flex justify-end border-t border-line pt-3 text-sm">
                {u("total")} <strong className="ml-2 tabular-nums">{formatIDR(laporan.total)}</strong>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * Pesangon & kompensasi PKWT — PP 35/2021 (Fase 47).
 *
 * Layarnya sengaja menampilkan **rinciannya**, bukan satu angka total. Pesangon
 * adalah angka yang diperselisihkan orang, dan yang menyelesaikan perselisihan
 * bukan totalnya melainkan cara sampainya: berapa bulan upah, dikali berapa,
 * karena alasan apa. Total tanpa rincian tidak bisa dibantah maupun dibenarkan.
 */
function SeveranceCard({ tenantId, employees }: { tenantId: string; employees: ApiEmployee[] }) {
  const u = useUi();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [galat, setGalat] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: "",
    endDate: today(),
    alasan: ALASAN_PHK[0].code as string,
    sisaCutiHari: "",
    uangPisah: "",
    note: "",
  });

  const listQuery = useQuery({
    queryKey: ["severance", tenantId],
    queryFn: () => api.severanceList(tenantId),
  });
  const aktif = employees.filter((e) => e.isActive);

  const hitung = useMutation({
    mutationFn: () =>
      api.createSeverance(tenantId, {
        employeeId: form.employeeId || aktif[0]?.id || "",
        endDate: form.endDate,
        alasan: form.alasan,
        sisaCutiHari: form.sisaCutiHari === "" ? undefined : Number(form.sisaCutiHari),
        uangPisah: form.uangPisah === "" ? undefined : Number(form.uangPisah),
        note: form.note || undefined,
      }),
    onSuccess: (res) => {
      setGalat(null);
      toast("success", isi(u("toastPesangonDihitung"), res.docNo, formatIDR(res.total)));
      setForm((f) => ({ ...f, sisaCutiHari: "", uangPisah: "", note: "" }));
      queryClient.invalidateQueries({ queryKey: ["severance", tenantId] });
    },
    onError: (err) => setGalat((err as Error).message),
  });

  const items: ApiSeverance[] = listQuery.data?.items ?? [];
  const dipilih = aktif.find((e) => e.id === (form.employeeId || aktif[0]?.id));

  return (
    <div className="space-y-4">
      <Alert tone="info">{u("descPesangonDasarHukum")}</Alert>

      <Card>
        <CardHeader title={u("hitungPesangon")} description={u("descHitungPesangon")} />
        <CardBody className="space-y-4">
          {galat ? <Alert tone="error">{galat}</Alert> : null}
          {dipilih && !dipilih.joinDate ? (
            <Alert tone="warning">{isi(u("pesangonTanpaTanggalMasuk"), dipilih.name)}</Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="psg-karyawan">{u("karyawan")}</Label>
              <Select
                id="psg-karyawan"
                value={form.employeeId || aktif[0]?.id || ""}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              >
                {aktif.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.employmentType === "pkwt" ? " · PKWT" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="psg-tanggal">{u("tanggalBerakhir")}</Label>
              <Input
                id="psg-tanggal"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="psg-alasan">{u("alasanBerakhir")}</Label>
              <Select
                id="psg-alasan"
                value={form.alasan}
                onChange={(e) => setForm({ ...form, alasan: e.target.value })}
              >
                {ALASAN_PHK.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="psg-cuti">{u("sisaCutiHari")}</Label>
              <Input
                id="psg-cuti"
                type="number"
                min={0}
                value={form.sisaCutiHari}
                onChange={(e) => setForm({ ...form, sisaCutiHari: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="psg-pisah">{u("uangPisahOpsional")}</Label>
              <Input
                id="psg-pisah"
                type="number"
                min={0}
                value={form.uangPisah}
                onChange={(e) => setForm({ ...form, uangPisah: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="psg-catatan">{u("keterangan")}</Label>
              <Input
                id="psg-catatan"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-ink-muted">{u("descUangPisahDiaturPerjanjian")}</p>
          <div className="flex justify-end">
            <Button onClick={() => hitung.mutate()} disabled={hitung.isPending || aktif.length === 0}>
              {hitung.isPending ? <Spinner /> : null} {u("hitungPesangon")}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={u("riwayatPesangon")} />
        <CardBody>
          {listQuery.isLoading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="size-6" aria-hidden />}
              title={u("belumAdaPesangon")}
              description={u("descBelumAdaPesangon")}
            />
          ) : (
            <div className="space-y-3">
              {items.map((s) => (
                <div key={s.id} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-sm">{s.docNo}</span>
                    <span className="font-medium">{s.employeeName}</span>
                    <Badge tone="brand">{ALASAN_LABEL[s.alasan] ?? s.alasan}</Badge>
                    {s.kompensasiPkwt > 0 ? <Badge tone="amber">PKWT</Badge> : null}
                    <span className="text-xs text-ink-muted">
                      {s.endDate} · {s.masaKerjaTahun.toFixed(1)} {u("tahunSatuan")}
                    </span>
                    <span className="ml-auto text-sm">
                      <strong className="tabular-nums">{formatIDR(s.total)}</strong>
                    </span>
                  </div>
                  {/* Rinciannya selalu terbuka: pesangon adalah angka yang
                      diperselisihkan, dan yang menyelesaikan perselisihan
                      adalah cara sampainya, bukan totalnya. */}
                  <Table className="mt-3">
                    <Thead>
                      <Tr>
                        <Th>{u("komponen")}</Th>
                        <Th>{u("dasarPerhitungan")}</Th>
                        <Th numeric>{u("jumlah")}</Th>
                      </Tr>
                    </Thead>
                    <tbody>
                      <Tr>
                        <Td label={u("komponen")}>{u("uangPesangon")}</Td>
                        <Td label={u("dasarPerhitungan")}>
                          {s.bulanUp} × {s.pengaliUp} × {formatIDR(s.upahSebulan)}
                        </Td>
                        <Td label={u("jumlah")} numeric>
                          {formatIDR(s.up)}
                        </Td>
                      </Tr>
                      <Tr>
                        <Td label={u("komponen")}>{u("uangPenghargaan")}</Td>
                        <Td label={u("dasarPerhitungan")}>
                          {s.bulanUpmk} × {s.pengaliUpmk} × {formatIDR(s.upahSebulan)}
                        </Td>
                        <Td label={u("jumlah")} numeric>
                          {formatIDR(s.upmk)}
                        </Td>
                      </Tr>
                      <Tr>
                        <Td label={u("komponen")}>{u("uangPenggantianCuti")}</Td>
                        <Td label={u("dasarPerhitungan")}>
                          {s.sisaCutiHari} {u("hariSatuan")} × {formatIDR(Math.round(s.upahSebulan / PEMBAGI_UPAH_HARIAN))}
                        </Td>
                        <Td label={u("jumlah")} numeric>
                          {formatIDR(s.uphCuti)}
                        </Td>
                      </Tr>
                      {s.uangPisah > 0 ? (
                        <Tr>
                          <Td label={u("komponen")}>{u("uangPisah")}</Td>
                          <Td label={u("dasarPerhitungan")}>{u("diaturPerjanjian")}</Td>
                          <Td label={u("jumlah")} numeric>
                            {formatIDR(s.uangPisah)}
                          </Td>
                        </Tr>
                      ) : null}
                      {s.kompensasiPkwt > 0 ? (
                        <Tr>
                          <Td label={u("komponen")}>{u("kompensasiPkwtLabel")}</Td>
                          <Td label={u("dasarPerhitungan")}>
                            {s.masaKerjaTahun.toFixed(2)} × {formatIDR(s.upahSebulan)}
                          </Td>
                          <Td label={u("jumlah")} numeric>
                            {formatIDR(s.kompensasiPkwt)}
                          </Td>
                        </Tr>
                      ) : null}
                    </tbody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
