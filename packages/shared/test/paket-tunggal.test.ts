import { describe, expect, it } from "vitest";
import * as shared from "../src/index";
import { izinRute, PERMISSION_KEYS, PLANS, TENANT_ROUTE_ACCESS } from "../src/index";

/**
 * Penegak pencabutan paket bertingkat (Fase 30).
 *
 * Menggantikan `prorata.test.ts`. Berkas lama menguji `hitungProrata()` —
 * rumus selisih harga saat pelanggan naik/turun paket. Dengan satu paket,
 * fungsi itu tidak punya arti dan sudah dihapus, jadi ujinya ikut hilang.
 *
 * Yang menggantikannya BUKAN uji rumus, melainkan uji **bahwa konsepnya tetap
 * tercabut**. Ini disengaja: Fase 24 mencatat bagaimana paket `trial` yang
 * "sudah dihapus" terus muncul kembali di lencana, harga, dan penegakan modul
 * karena tidak ada satu pun cek yang menjaganya tetap hilang. Kelas kesalahan
 * itu tidak dicegah dengan mengingat, melainkan dengan gerbang.
 */
describe("pencabutan paket bertingkat tetap tercabut", () => {
  const dicabut = [
    "MODULE_MIN_PLAN",
    "MODULE_KEYS",
    "MODULE_LABELS",
    "planIncludesModule",
    "minPlanForModule",
    "modulesForPlan",
    "hitungProrata",
    "BILLING_CYCLE_DAYS",
    "changePlanSchema",
    "SINGLE_PLAN",
    "EXTRA_ENTITY_PRICE",
  ];

  it.each(dicabut)("`%s` tidak diekspor lagi", (nama) => {
    expect(shared).not.toHaveProperty(nama);
  });

  it("nama paket lama tidak bisa dipakai lagi", () => {
    for (const lama of ["starter", "business", "enterprise", "trial"]) {
      expect(PLANS).not.toContain(lama);
    }
  });
});

describe("registri RBAC tetap menjadi batas keamanan", () => {
  it("tidak ada entri yang menyimpan field `modul`", () => {
    // Penguncian per paket dicabut; menyisakan field yang tidak menggerbang
    // apa pun akan menipu pembaca berikutnya bahwa gerbangnya masih ada.
    for (const [segmen, akses] of Object.entries(TENANT_ROUTE_ACCESS)) {
      expect(akses, `${segmen} masih menyimpan modul`).not.toHaveProperty("modul");
    }
  });

  it("seluruh nilai izin baca/tulis valid", () => {
    for (const [segmen, akses] of Object.entries(TENANT_ROUTE_ACCESS)) {
      if (akses.baca !== null) expect(PERMISSION_KEYS, `${segmen}.baca`).toContain(akses.baca);
      if (akses.tulis !== null) expect(PERMISSION_KEYS, `${segmen}.tulis`).toContain(akses.tulis);
    }
  });

  it("modul yang DULU terkunci paket tetap dijaga IZIN", () => {
    // Inti pembedaan Fase 30: yang dibongkar adalah paywall, BUKAN keamanan.
    // Penggajian dulu butuh paket Business; kini terbuka untuk semua paket,
    // tetapi tetap menuntut izin `hr` — kasir tidak boleh membuka slip gaji
    // hanya karena perusahaannya berhenti membayar paket yang lebih mahal.
    expect(izinRute("employees", "GET")?.izin).toBe("hr");
    expect(izinRute("employees", "POST")?.izin).toBe("hr");
    expect(izinRute("api-keys", "POST")?.izin).toBe("pengaturan");
    expect(izinRute("currencies", "POST")?.izin).toBe("keuangan");
  });

  it("segmen tak dikenal tetap dilewatkan (perilaku lama dipertahankan)", () => {
    expect(izinRute("segmen-yang-tidak-ada", "GET")).toBeNull();
  });

  it("pemisahan baca/tulis tidak ikut terbawa perubahan", () => {
    // `products` dan `settings` dibaca kasir (pindai barcode, footer struk)
    // tetapi hanya boleh diubah pemegang izin. Menyamakan keduanya akan
    // mematikan POS bagi peran kasir.
    expect(izinRute("products", "GET")?.izin).toBeNull();
    expect(izinRute("products", "POST")?.izin).toBe("stok");
    expect(izinRute("settings", "GET")?.izin).toBeNull();
    expect(izinRute("settings", "PATCH")?.izin).toBe("pengaturan");
  });
});
