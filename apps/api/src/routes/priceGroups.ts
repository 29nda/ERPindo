import { priceGroupItemSchema, type ApiPriceGroupItem } from "@erpindo/shared";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { audit } from "../lib/audit";
import { getTenantDb } from "../lib/tenantDb";
import { requireAuth, requireTenantRole } from "../middleware/auth";
import { clientIp } from "./auth";

/**
 * Daftar harga per grup pelanggan (Fase 23a).
 *
 * CRUD grupnya sendiri memakai pabrik `crudRoutes()` di `masterdata.ts` — yang
 * ada di sini hanya ISI daftar harganya, karena bentuknya (kunci gabungan
 * grup+produk, tanpa arsip) tidak muat di pabrik itu.
 *
 * Harga di sini DISARANKAN, bukan ditegakkan: tidak ada satu pun jalur tulis
 * transaksi yang memeriksanya. Keputusan itu diambil sadar — seluruh alur di
 * repo ini menerima harga nego dari layar, dan menegakkan harga berarti
 * menyentuh faktur, kasir, pesanan penjualan, penawaran, kontrak, dan API
 * publik sekaligus.
 */
export const priceGroupRoutes = new Hono<AppEnv>()

  .get(
    "/:tenantId/price-groups/:groupId/items",
    requireAuth,
    requireTenantRole("viewer"),
    async (c) => {
      const db = getTenantDb(c.env, c.get("tenant").dbRef);
      const { results } = await db
        .prepare(
          `SELECT i.product_id, i.unit_price, p.sku, p.name, p.unit, p.sell_price
             FROM price_group_items i
             JOIN products p ON p.id = i.product_id
            WHERE i.group_id = ?
            ORDER BY p.name`,
        )
        .bind(c.req.param("groupId"))
        .all<{
          product_id: string;
          unit_price: number;
          sku: string;
          name: string;
          unit: string;
          sell_price: number;
        }>();

      const items: ApiPriceGroupItem[] = results.map((r) => ({
        productId: r.product_id,
        sku: r.sku,
        name: r.name,
        unit: r.unit,
        sellPrice: r.sell_price,
        unitPrice: r.unit_price,
      }));
      return c.json({ items });
    },
  )

  .put(
    "/:tenantId/price-groups/:groupId/items/:productId",
    requireAuth,
    requireTenantRole("admin"),
    async (c) => {
      const parsed = priceGroupItemSchema.safeParse(await c.req.json().catch(() => ({})));
      if (!parsed.success) {
        return c.json({ error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors }, 400);
      }
      const tenant = c.get("tenant");
      const db = getTenantDb(c.env, tenant.dbRef);
      const groupId = c.req.param("groupId");
      const productId = c.req.param("productId");

      // Grup & produk diperiksa lebih dulu supaya pesannya menyebut MANA yang
      // salah. Foreign key SQLite hanya akan melempar "constraint failed", yang
      // tak bisa ditindaklanjuti siapa pun yang membacanya.
      const grup = await db
        .prepare(`SELECT id FROM price_groups WHERE id = ? AND is_archived = 0`)
        .bind(groupId)
        .first<{ id: string }>();
      if (!grup) return c.json({ error: "Grup harga tidak ditemukan atau sudah diarsip" }, 404);

      const produk = await db
        .prepare(`SELECT id FROM products WHERE id = ? AND is_archived = 0`)
        .bind(productId)
        .first<{ id: string }>();
      if (!produk) return c.json({ error: "Produk tidak ditemukan atau sudah diarsip" }, 404);

      await db
        .prepare(
          `INSERT INTO price_group_items (id, group_id, product_id, unit_price)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (group_id, product_id) DO UPDATE SET unit_price = excluded.unit_price`,
        )
        .bind(crypto.randomUUID(), groupId, productId, parsed.data.unitPrice)
        .run();

      await audit(c.env, {
        action: "masterdata.priceGroup.setItem",
        tenantId: tenant.id,
        detail: { groupId, productId, unitPrice: parsed.data.unitPrice },
        ip: clientIp(c),
      });
      return c.json({ ok: true });
    },
  )

  /**
   * Kembalikan satu produk ke harga dasar.
   *
   * Barisnya DIHAPUS, bukan disetel 0 — di daftar harga, 0 berarti gratis
   * (barang bonus) dan "belum diatur" hanya diwakili oleh ketiadaan baris.
   * Lihat komentar migrasi `0046` dan `hargaUntukGrup()`.
   */
  .delete(
    "/:tenantId/price-groups/:groupId/items/:productId",
    requireAuth,
    requireTenantRole("admin"),
    async (c) => {
      const tenant = c.get("tenant");
      const db = getTenantDb(c.env, tenant.dbRef);
      const groupId = c.req.param("groupId");
      const productId = c.req.param("productId");

      await db
        .prepare(`DELETE FROM price_group_items WHERE group_id = ? AND product_id = ?`)
        .bind(groupId, productId)
        .run();

      await audit(c.env, {
        action: "masterdata.priceGroup.clearItem",
        tenantId: tenant.id,
        detail: { groupId, productId },
        ip: clientIp(c),
      });
      return c.json({ ok: true });
    },
  )

  /**
   * Daftar harga yang berlaku untuk seorang pelanggan — dipakai layar faktur.
   *
   * Mengembalikan `{}` (bukan 404) untuk pelanggan tanpa grup, grup yang
   * diarsip, atau pelanggan yang tak ada: ketiganya berarti hal yang sama bagi
   * layar — pakai harga dasar. Membedakannya hanya akan memaksa layar menangani
   * tiga cabang yang berakhir sama.
   */
  .get(
    "/:tenantId/price-groups/resolve",
    requireAuth,
    requireTenantRole("viewer"),
    async (c) => {
      const db = getTenantDb(c.env, c.get("tenant").dbRef);
      const contactId = (c.req.query("contactId") ?? "").trim();
      const kosong = { groupId: null, groupName: null, prices: {} as Record<string, number> };
      if (!contactId) return c.json(kosong);

      const grup = await db
        .prepare(
          `SELECT g.id, g.name
             FROM contacts k
             JOIN price_groups g ON g.id = k.price_group_id
            WHERE k.id = ? AND g.is_archived = 0`,
        )
        .bind(contactId)
        .first<{ id: string; name: string }>();
      if (!grup) return c.json(kosong);

      const { results } = await db
        .prepare(`SELECT product_id, unit_price FROM price_group_items WHERE group_id = ?`)
        .bind(grup.id)
        .all<{ product_id: string; unit_price: number }>();

      const prices: Record<string, number> = {};
      for (const r of results) prices[r.product_id] = r.unit_price;

      return c.json({ groupId: grup.id, groupName: grup.name, prices });
    },
  );
