import { PERMISSION_KEYS, TENANT_ROUTE_ACCESS, izinRute } from "@erpindo/shared";
import { describe, expect, it } from "vitest";
import { app } from "../src/index";

/**
 * Uji kelengkapan registri akses rute (Fase 26a).
 *
 * Ini uji terpenting dari seluruh Fase 26a, dan alasannya bukan soal RBAC
 * melainkan soal **cara cacatnya lahir**. Temuan audit A bukan "satu route lupa
 * dipasangi `requirePermission`" — 39 dari 40 berkas route tidak memakainya sama
 * sekali, selama berbulan-bulan, tanpa satu pun gerbang yang bisa melihatnya.
 * Penjaga per-endpoint mustahil dibuktikan lengkap: yang bisa dilihat hanyalah
 * yang ditulis, bukan yang dilupakan.
 *
 * Uji ini membalik arahnya: ia membaca **router Hono sungguhan** (`app.routes`,
 * daftar path yang benar-benar terpasang saat modul dimuat — termasuk route yang
 * dibangun dari template seperti di `masterdata.ts`, yang tidak akan tertangkap
 * grep), lalu menuntut setiap segmen punya entri di `TENANT_ROUTE_ACCESS`.
 *
 * Menambah route baru tanpa menyatakan izinnya karena itu membuat suite MERAH,
 * bukan membuat lubang senyap. Jawaban "tidak dijaga izin" tetap boleh — asal
 * ditulis (`{ baca: null, tulis: null }`), sehingga menjadi keputusan sadar yang
 * bisa ditinjau, bukan kelalaian yang tak terlihat.
 */

/** Segmen pertama setelah `/api/tenants/:tenantId/` untuk semua route terpasang. */
function segmenRuteTenant(): string[] {
  const set = new Set<string>();
  for (const r of app.routes) {
    const m = /^\/api\/tenants\/:tenantId\/([^/]+)/.exec(r.path);
    if (!m) continue;
    const segmen = m[1]!;
    // Parameter (mis. `/:tenantId/:sesuatu`) bukan segmen tetap — dilewati.
    if (segmen.startsWith(":") || segmen === "*") continue;
    set.add(segmen);
  }
  return [...set].sort();
}

describe("registri akses rute tenant", () => {
  it("SETIAP segmen route terpasang punya entri registri", () => {
    const segmen = segmenRuteTenant();
    // Kalau ini kosong, uji di bawah akan lulus palsu — router gagal dimuat.
    expect(segmen.length).toBeGreaterThan(50);

    const tanpaEntri = segmen.filter((s) => !TENANT_ROUTE_ACCESS[s]);
    expect(
      tanpaEntri,
      `Segmen route berikut belum dinyatakan di TENANT_ROUTE_ACCESS (packages/shared/src/core.ts). ` +
        `Tambahkan entrinya — memakai { baca: null, tulis: null } bila memang sengaja tidak dijaga izin:\n  ` +
        tanpaEntri.join("\n  "),
    ).toEqual([]);
  });

  it("tidak ada entri registri yang menunjuk segmen yang sudah tidak ada", () => {
    const segmen = new Set(segmenRuteTenant());
    const yatim = Object.keys(TENANT_ROUTE_ACCESS).filter((s) => !segmen.has(s));
    expect(yatim, `Entri registri tanpa route: ${yatim.join(", ")}`).toEqual([]);
  });

  it("seluruh nilai izin valid", () => {
    for (const [segmen, akses] of Object.entries(TENANT_ROUTE_ACCESS)) {
      if (akses.baca !== null) expect(PERMISSION_KEYS, `${segmen}.baca`).toContain(akses.baca);
      if (akses.tulis !== null) expect(PERMISSION_KEYS, `${segmen}.tulis`).toContain(akses.tulis);
    }
  });
});

describe("izinRute — pemisahan baca/tulis", () => {
  it("GET memakai izin baca, mutasi memakai izin tulis", () => {
    // `products`: kasir HARUS bisa membaca (pindai barcode) tetapi tidak boleh
    // mengubah katalog. Menyamakan keduanya akan mematikan POS bagi peran kasir.
    expect(izinRute("products", "GET")?.izin).toBeNull();
    expect(izinRute("products", "POST")?.izin).toBe("stok");
    // `settings` dibaca POS/cetak/dasbor; hanya penulisannya yang dijaga.
    expect(izinRute("settings", "GET")?.izin).toBeNull();
    expect(izinRute("settings", "PATCH")?.izin).toBe("pengaturan");
  });

  it("HEAD diperlakukan sebagai baca", () => {
    expect(izinRute("accounts", "HEAD")?.izin).toBe("keuangan");
    expect(izinRute("accounts", "DELETE")?.izin).toBe("keuangan");
  });

  it("segmen tak dikenal → null (dilewatkan; kelengkapannya dijaga uji di atas)", () => {
    expect(izinRute("segmen-yang-tidak-ada", "GET")).toBeNull();
  });

  it("penguncian paket tidak tersisa di satu entri pun (Fase 30)", () => {
    // Temuan audit G dulu memasang `roles: { modul: "customRoles" }` supaya
    // tenant Starter tidak bisa membuat peran kustom. Paketnya sudah tidak ada,
    // jadi field itu harus ikut hilang — bukan tertinggal sebagai gerbang mati
    // yang membuat pembaca berikutnya mengira akses masih dijaga paket.
    for (const [segmen, akses] of Object.entries(TENANT_ROUTE_ACCESS)) {
      expect(akses, `${segmen}`).not.toHaveProperty("modul");
    }
    // Peran kustom kini terbuka untuk semua pelanggan, tetapi tetap dijaga
    // PERAN (owner/admin) di route-nya — lihat catatan `roles` di registri.
    expect(TENANT_ROUTE_ACCESS.roles).toBeDefined();
  });
});
