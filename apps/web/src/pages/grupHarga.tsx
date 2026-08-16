import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tags } from "lucide-react";
import { useState } from "react";
import { api, formatIDR } from "../api/client";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  PageHeading,
  SearchSelect,
  Select,
  Spinner,
  Table,
  Td,
  Th,
  Thead,
  Tr,
  useToast,
} from "../components/ui";
import { useUi } from "../i18n/ui";
import { useWorkspace } from "./app";

type GroupRow = { id: string; name: string };
type ProductRow = { id: string; sku: string; name: string; unit: string; sell_price: number };

/**
 * Grup harga pelanggan & daftar harganya (Fase 23a).
 *
 * Halaman tersendiri, bukan tab di Master Data: berkas `masterdata.tsx` sudah
 * 1.300 baris dan tidak bertab, jadi menumpangkannya di sana berarti memecah
 * berkas itu lebih dulu — pekerjaan yang tak ada hubungannya dengan fitur ini.
 */
export function GrupHargaPage() {
  const u = useUi();
  const { tenant } = useWorkspace();
  const isAdmin = tenant.role !== "viewer";
  const toast = useToast();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ["price-groups", tenant.tenantId],
    queryFn: () => api.listItems<GroupRow>(tenant.tenantId, "price-groups", { limit: 200 }),
  });
  const groups = groupsQuery.data?.items ?? [];

  const [groupId, setGroupId] = useState("");
  // Grup terpilih efektif: pilihan pengguna, atau grup pertama selama ia belum
  // memilih. Tanpa ini daftar harga tampil kosong padahal grupnya ada, dan itu
  // terbaca seperti data hilang.
  const activeGroupId = groupId || groups[0]?.id || "";

  const [namaGrup, setNamaGrup] = useState("");
  const [errorGrup, setErrorGrup] = useState<string | null>(null);

  const buatGrup = useMutation({
    mutationFn: () => api.createItem(tenant.tenantId, "price-groups", { name: namaGrup.trim() }),
    onSuccess: () => {
      toast("success", u("ghToastGrupDibuat"));
      setNamaGrup("");
      setErrorGrup(null);
      queryClient.invalidateQueries({ queryKey: ["price-groups", tenant.tenantId] });
    },
    onError: (err) => setErrorGrup((err as Error).message),
  });

  const itemsQuery = useQuery({
    queryKey: ["price-group-items", tenant.tenantId, activeGroupId],
    queryFn: () => api.priceGroupItems(tenant.tenantId, activeGroupId),
    enabled: !!activeGroupId,
  });
  const items = itemsQuery.data?.items ?? [];

  const [produkId, setProdukId] = useState("");
  const [produkLabel, setProdukLabel] = useState("");
  const [harga, setHarga] = useState("");
  const [errorHarga, setErrorHarga] = useState<string | null>(null);

  async function cariProduk(q: string) {
    const res = await api.listItems<ProductRow>(tenant.tenantId, "products", { q, limit: 20 });
    return res.items.map((p) => ({
      value: p.id,
      label: `${p.sku} · ${p.name}`,
      hint: formatIDR(p.sell_price || 0),
    }));
  }

  function segarkanDaftar() {
    queryClient.invalidateQueries({
      queryKey: ["price-group-items", tenant.tenantId, activeGroupId],
    });
  }

  const simpanHarga = useMutation({
    mutationFn: () =>
      api.setPriceGroupItem(tenant.tenantId, activeGroupId, produkId, Number(harga) || 0),
    onSuccess: () => {
      toast("success", u("ghToastHargaDisimpan"));
      setProdukId("");
      setProdukLabel("");
      setHarga("");
      setErrorHarga(null);
      segarkanDaftar();
    },
    onError: (err) => setErrorHarga((err as Error).message),
  });

  const hapusHarga = useMutation({
    mutationFn: (productId: string) =>
      api.clearPriceGroupItem(tenant.tenantId, activeGroupId, productId),
    onSuccess: () => {
      toast("success", u("ghToastHargaDihapus"));
      segarkanDaftar();
    },
    onError: (err) => setErrorHarga((err as Error).message),
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <PageHeading k="grupHarga" />
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader title={u("ghGrupBaru")} />
          <CardBody className="space-y-4">
            {errorGrup ? <Alert tone="error">{errorGrup}</Alert> : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label htmlFor="gh-nama">{u("ghNamaGrup")}</Label>
                <Input
                  id="gh-nama"
                  placeholder={u("ghPhNamaGrup")}
                  value={namaGrup}
                  onChange={(e) => setNamaGrup(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => buatGrup.mutate()}
                  disabled={buatGrup.isPending || namaGrup.trim().length < 2}
                >
                  {buatGrup.isPending ? <Spinner /> : null} {u("ghTambahGrup")}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={u("ghDaftarHarga")} description={u("ghSatuanDasarInfo")} />
        <CardBody className="space-y-4">
          {groupsQuery.isLoading ? (
            <Spinner />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<Tags className="size-6" aria-hidden />}
              title={u("ghDaftarGrup")}
              description={u("ghBelumAdaGrup")}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="gh-grup">{u("ghPilihGrup")}</Label>
                  <Select
                    id="gh-grup"
                    value={activeGroupId}
                    onChange={(e) => setGroupId(e.target.value)}
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <Alert tone="info">{u("ghNolItuGratis")}</Alert>

              {isAdmin ? (
                <div className="grid items-end gap-3 sm:grid-cols-4">
                  {errorHarga ? (
                    <div className="sm:col-span-4">
                      <Alert tone="error">{errorHarga}</Alert>
                    </div>
                  ) : null}
                  <div className="sm:col-span-2">
                    <Label htmlFor="gh-produk">{u("ghProduk")}</Label>
                    <SearchSelect
                      id="gh-produk"
                      value={produkId}
                      valueLabel={produkLabel}
                      placeholder={`${u("cari")} ${u("ghProduk").toLowerCase()}…`}
                      fetchOptions={cariProduk}
                      onSelect={(opt) => {
                        setProdukId(opt.value);
                        setProdukLabel(opt.label);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gh-harga">{u("ghHargaKhusus")}</Label>
                    <Input
                      id="gh-harga"
                      type="number"
                      min={0}
                      value={harga}
                      onChange={(e) => setHarga(e.target.value)}
                    />
                  </div>
                  <div>
                    <Button
                      onClick={() => simpanHarga.mutate()}
                      disabled={simpanHarga.isPending || !produkId || harga.trim() === ""}
                    >
                      {simpanHarga.isPending ? <Spinner /> : null} {u("ghSimpanHarga")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {itemsQuery.isLoading ? (
                <Spinner />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={<Tags className="size-6" aria-hidden />}
                  title={u("ghDaftarHarga")}
                  description={u("ghBelumAdaHarga")}
                />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>{u("ghProduk")}</Th>
                      <Th numeric>{u("ghHargaDasar")}</Th>
                      <Th numeric>{u("ghHargaKhusus")}</Th>
                      {isAdmin ? <Th>{u("aksiLabel")}</Th> : null}
                    </tr>
                  </Thead>
                  <tbody>
                    {items.map((it) => (
                      <Tr key={it.productId}>
                        <Td label={u("ghProduk")}>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {it.sku}
                          </span>{" "}
                          {it.name}
                        </Td>
                        <Td numeric label={u("ghHargaDasar")}>
                          {formatIDR(it.sellPrice)}
                        </Td>
                        <Td numeric label={u("ghHargaKhusus")} data-testid="gh-harga-khusus">
                          {formatIDR(it.unitPrice)}
                        </Td>
                        {isAdmin ? (
                          <Td label={u("aksiLabel")}>
                            <Button
                              variant="ghost"
                              onClick={() => hapusHarga.mutate(it.productId)}
                              disabled={hapusHarga.isPending}
                            >
                              {u("ghHapusHarga")}
                            </Button>
                          </Td>
                        ) : null}
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
