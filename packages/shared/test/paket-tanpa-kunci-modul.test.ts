import { describe, expect, it } from "vitest";
import * as shared from "../src/index";
import { izinRute, PERMISSION_KEYS, PLAN_LIMITS, PLANS, TENANT_ROUTE_ACCESS } from "../src/index";

/**
 * Penegak pencabutan PENGUNCIAN MODUL (Fase 30, dipertegas Fase 53a).
 *
 * Berkas ini dulu bernama `paket-tunggal.test.ts` dan menjaga dua hal
 * sekaligus: bahwa penguncian modul per paket tercabut, DAN bahwa hanya ada
 * satu paket. Fase 53a memisahkan keduanya, karena ternyata hanya satu di
 * antaranya yang merupakan keputusan.
 *
 * Yang tercabut permanen adalah **membedakan paket lewat modul**. Itu yang
 * menjebak pembeli: UKM membeli Starter, menemukan penggajian terkunci di
 * bulan kedua, lalu merasa ditipu. Nama paketnya sendiri tidak pernah menjadi
 * masalah — dan Fase 53a memakainya kembali untuk membedakan KAPASITAS
 * (badan usaha, lokasi, karyawan), sesuatu yang bisa dinilai calon pelanggan
 * sebelum membeli.
 *
 * Karena itu uji "nama paket lama tidak boleh dipakai" DIHAPUS: ia menjaga
 * ejaannya, bukan keputusannya. Yang menggantikannya menjaga hal yang benar —
 * tidak ada satu pun mekanisme penguncian modul yang boleh hidup lagi.
 *
 * Catatan untuk pembaca berikutnya: `hitungProrata` dan `changePlanSchema`
 * tetap ada di daftar tercabut. Dengan tiga paket, naik paket menjadi punya
 * arti lagi, jadi keduanya BOLEH kembali — tetapi lewat keputusan sadar yang
 * mengubah berkas ini, bukan diam-diam.
 */
describe("pencabutan penguncian modul tetap tercabut", () => {
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

  it("paket gratis tetap tidak ada", () => {
    // `trial` dihapus di Fase 24: "belum berlangganan" adalah STATUS tenant
    // (`provisioning`), bukan paket. Ini satu-satunya nama paket lama yang
    // memang menyatakan keputusan, jadi hanya ini yang tetap dijaga.
    expect(PLANS).not.toContain("trial");
  });

  it("tidak ada paket yang membedakan diri lewat modul", () => {
    // Sumbu pembeda yang sah hanyalah kapasitas. Begitu ada field bernama
    // modul/fitur di definisi paket, paywall Fase 13a hidup kembali.
    for (const plan of PLANS) {
      const kunci = Object.keys(PLAN_LIMITS[plan]);
      expect(kunci.filter((k) => /modul|module|fitur|feature/i.test(k)), plan).toEqual([]);
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
    // Penggajian dulu butuh paket Business; kini terbuka di semua paket,
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
