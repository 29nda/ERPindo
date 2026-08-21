import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  type ApiTicket,
  type TicketPriority,
  type TicketStatus,
} from "@erpindo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";
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
  Select,
  Spinner,
  useToast,
} from "../components/ui";
import { DaftarDetail, Halaman, Lembar } from "../components/kerangka";
import { useUi } from "../i18n/ui";
import { useWorkspace } from "./app";

type ContactRow = { id: string; name: string; type: string };

const PRIORITY_TONE: Record<TicketPriority, "neutral" | "amber" | "red"> = {
  low: "neutral",
  medium: "neutral",
  high: "amber",
  urgent: "red",
};
const STATUS_TONE: Record<TicketStatus, "amber" | "brand" | "green" | "neutral"> = {
  open: "amber",
  in_progress: "brand",
  resolved: "green",
  closed: "neutral",
};

/**
 * Umur tiket yang masih terbuka: hijau <24 jam, kuning 24–72 jam, merah >72 jam.
 * Tiket yang sudah selesai/ditutup tidak diberi label umur.
 */
function ticketAge(t: ApiTicket): { label: string; tone: "green" | "amber" | "red" } | null {
  if (t.status === "resolved" || t.status === "closed") return null;
  const hours = (Date.now() - Date.parse(t.createdAt)) / 3_600_000;
  const label =
    hours < 24 ? `${Math.max(1, Math.round(hours))} jam` : `${Math.round(hours / 24)} hari`;
  const tone = hours > 72 ? "red" : hours > 24 ? "amber" : "green";
  return { label, tone };
}

export function HelpdeskPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const isAdmin = tenant.role !== "viewer";
  const toast = useToast();
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ["tickets", tenant.tenantId],
    queryFn: () => api.tickets(tenant.tenantId),
  });
  const contactsQuery = useQuery({
    queryKey: ["contacts", tenant.tenantId],
    queryFn: () => api.listItems<ContactRow>(tenant.tenantId, "contacts"),
  });
  const membersQuery = useQuery({
    queryKey: ["members", tenant.tenantId],
    queryFn: () => api.members(tenant.tenantId),
    enabled: isAdmin,
  });

  const contacts = ((contactsQuery.data?.items ?? []) as ContactRow[]).filter((k) =>
    ["customer", "both"].includes(k.type)
  );
  const members = membersQuery.data?.members ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailQuery = useQuery({
    queryKey: ["ticket", tenant.tenantId, selectedId],
    queryFn: () => api.ticket(tenant.tenantId, selectedId!),
    enabled: Boolean(selectedId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tickets", tenant.tenantId] });
    if (selectedId)
      queryClient.invalidateQueries({ queryKey: ["ticket", tenant.tenantId, selectedId] });
  };

  // --- Form tiket ------------------------------------------------------------
  const [form, setForm] = useState({
    contactId: "",
    subject: "",
    description: "",
    priority: "medium" as TicketPriority,
  });
  const [formError, setFormError] = useState<string | null>(null);
  // Fase 38h — formulir pembuatan pindah dari atas daftar ke dalam Lembar.
  // Hal pertama yang dilihat pengguna saat membuka halaman kini datanya,
  // bukan formulir kosong.
  const [lembarBuka, setLembarBuka] = useState(false);

  const createTicket = useMutation({
    mutationFn: () =>
      api.createTicket(tenant.tenantId, {
        contactId: form.contactId,
        subject: form.subject.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
      }),
    onSuccess: () => {
      toast("success", u("toastTiketDibuat"));
      setForm({ contactId: "", subject: "", description: "", priority: "medium" });
      setFormError(null);
      setLembarBuka(false);
      invalidate();
    },
    onError: (err) => setFormError((err as Error).message),
  });

  const [reply, setReply] = useState("");
  const [replyInternal, setReplyInternal] = useState(false);
  const sendReply = useMutation({
    mutationFn: () =>
      api.replyTicket(tenant.tenantId, selectedId!, {
        body: reply.trim(),
        internal: replyInternal,
      }),
    onSuccess: () => {
      setReply("");
      setReplyInternal(false);
      invalidate();
    },
    onError: (err) => toast("error", (err as Error).message),
  });

  const update = useMutation({
    mutationFn: (input: { status?: string; assignedTo?: string | null }) =>
      api.updateTicket(tenant.tenantId, selectedId!, input),
    onSuccess: () => invalidate(),
    onError: (err) => toast("error", (err as Error).message),
  });

  const tickets = ticketsQuery.data?.tickets ?? [];
  const detail = detailQuery.data;

  return (
    <Halaman
      k="helpdesk"
      ikon={LifeBuoy}
      aksi={
        isAdmin ? (
          <Button onClick={() => setLembarBuka(true)}>
            <Plus className="size-4" aria-hidden /> {u("hdTiketBaru")}
          </Button>
        ) : null
      }
    >
      <Lembar
        terbuka={lembarBuka}
        tutup={() => setLembarBuka(false)}
        judul={u("hdTiketBaru")}
        aksi={
          <>
            <Button variant="secondary" onClick={() => setLembarBuka(false)}>
              {u("batal")}
            </Button>
            <Button
              onClick={() => createTicket.mutate()}
              disabled={createTicket.isPending || !form.contactId || form.subject.trim().length < 3}
            >
              {createTicket.isPending ? <Spinner /> : <Plus className="size-4" aria-hidden />}{" "}
              {u("buatTiket")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="tk-contact">{u("pelanggan")}</Label>
                <Select
                  id="tk-contact"
                  value={form.contactId}
                  onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                >
                  <option value="">{u("pilihOpsi")}</option>
                  {contacts.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="tk-subject">Subjek</Label>
                <Input
                  id="tk-subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tk-desc">Deskripsi</Label>
              <textarea
                id="tk-desc"
                rows={3}
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="sm:w-44">
              <Label htmlFor="tk-priority">Prioritas</Label>
              <Select
                id="tk-priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TICKET_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            {formError ? <Alert tone="error">{formError}</Alert> : null}
        </div>
      </Lembar>

      <DaftarDetail
        adaPilihan={Boolean(selectedId)}
        kembali={() => setSelectedId(null)}
        daftar={
        <Card>
          <CardHeader title={u("daftarTiket")} />
          <CardBody>
            {ticketsQuery.isLoading ? (
              <Spinner />
            ) : tickets.length === 0 ? (
              <EmptyState
                icon={<LifeBuoy className="size-6" aria-hidden />}
                title={u("belumAdaTiket")}
                description={u("descBelumAdaTiket")}
              />
            ) : (
              <div className="space-y-2">
                {tickets.map((t: ApiTicket) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedId === t.id
                        ? "border-brand-line bg-brand-surface"
                        : "border-line hover:border-line-strong"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-ink-muted">{t.ticketNo}</span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {(() => {
                          const age = ticketAge(t);
                          return age ? <Badge tone={age.tone}>umur {age.label}</Badge> : null;
                        })()}
                        <Badge tone={PRIORITY_TONE[t.priority]}>
                          {TICKET_PRIORITY_LABELS[t.priority]}
                        </Badge>
                        <Badge tone={STATUS_TONE[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
                      </div>
                    </div>
                    <div className="mt-1 font-medium">{t.subject}</div>
                    <div className="text-xs text-ink-muted">
                      {t.contactName}
                      {t.assignedName ? ` ${u("ditugaskanKeSuffix")} ${t.assignedName}` : ""}
                      {t.replyCount > 0 ? ` · ${t.replyCount} ${u("balasanSuffix")}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
        }
        detail={
        <Card>
          <CardHeader title={detail ? `${detail.ticketNo} — ${detail.subject}` : "Detail tiket"} />
          <CardBody>
            {!selectedId ? (
              <p className="text-sm text-ink-muted">
                {u("pilihTiketDetail")}
              </p>
            ) : detailQuery.isLoading || !detail ? (
              <Spinner />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={PRIORITY_TONE[detail.priority]}>
                    {TICKET_PRIORITY_LABELS[detail.priority]}
                  </Badge>
                  <Badge tone={STATUS_TONE[detail.status]}>
                    {TICKET_STATUS_LABELS[detail.status]}
                  </Badge>
                  <Badge>{detail.contactName}</Badge>
                </div>
                {detail.description ? (
                  <p className="whitespace-pre-wrap rounded-lg bg-surface-sunken p-3 text-sm">
                    {detail.description}
                  </p>
                ) : null}

                {isAdmin ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-40">
                      <Label htmlFor="tk-status">{u("status")}</Label>
                      <Select
                        id="tk-status"
                        value={detail.status}
                        onChange={(e) => update.mutate({ status: e.target.value })}
                      >
                        {TICKET_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {TICKET_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-48">
                      <Label htmlFor="tk-assign">{u("ditugaskanKe")}</Label>
                      <Select
                        id="tk-assign"
                        value={detail.assignedTo ?? ""}
                        onChange={(e) => update.mutate({ assignedTo: e.target.value || null })}
                      >
                        <option value="">{u("belumDitugaskanOpsi")}</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-ink-muted">
                    Balasan
                  </h3>
                  {detail.replies.length === 0 ? (
                    <p className="text-sm text-ink-muted">{u("belumAdaBalasan")}</p>
                  ) : (
                    detail.replies.map((r) => (
                      <div
                        key={r.id}
                        className={`rounded-lg p-3 text-sm ${
                          r.internal
                            ? "border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
                            : "bg-surface-sunken"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 text-xs text-ink-muted">
                          <span className="font-medium">{r.authorName}</span>
                          {r.internal ? <Badge tone="amber">{u("catatanInternalKecil")}</Badge> : null}
                          <span>{r.createdAt.slice(0, 16).replace("T", " ")}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{r.body}</p>
                      </div>
                    ))
                  )}
                </div>

                {isAdmin ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder={u("hdPhBalasan")}
                      className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-ink-muted">
                        <input
                          type="checkbox"
                          checked={replyInternal}
                          onChange={(e) => setReplyInternal(e.target.checked)}
                        />
                        {u("catatanInternalLabel")}
                      </label>
                      <Button
                        onClick={() => sendReply.mutate()}
                        disabled={sendReply.isPending || reply.trim().length === 0}
                      >
                        {sendReply.isPending ? <Spinner /> : null} Kirim
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardBody>
        </Card>
        }
      />
    </Halaman>
  );
}
