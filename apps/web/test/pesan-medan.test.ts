import { describe, expect, it } from "vitest";
import { pesanDenganMedan } from "../src/api/client";

/**
 * Alasan per-medan ikut ke dalam pesan galat (Fase 54h).
 *
 * 113 endpoint API mengembalikan `issues` — peta medan → alasan, dalam kalimat
 * Indonesia yang bisa langsung dibaca. Tiga halaman dari sekitar empat puluh
 * benar-benar menampilkannya; sisanya membuang rinciannya dan hanya menoast
 * "Data tidak valid". Pengguna tahu formulirnya ditolak, tidak tahu di mana.
 */
describe("pesanDenganMedan", () => {
  it("menempelkan alasan yang benar-benar menjelaskan", () => {
    expect(pesanDenganMedan("Data tidak valid", { name: ["Nama akun minimal 2 karakter"] })).toBe(
      "Data tidak valid — Nama akun minimal 2 karakter",
    );
  });

  it("menempelkan paling banyak dua alasan", () => {
    // Tiga atau lebih membuat toast lebih panjang daripada yang sempat dibaca
    // orang sebelum ia menghilang.
    const hasil = pesanDenganMedan("Data tidak valid", {
      code: ["Kode wajib diisi"],
      name: ["Nama akun minimal 2 karakter"],
      type: ["Jenis akun wajib dipilih"],
    });
    expect(hasil).toBe("Data tidak valid — Kode wajib diisi; Nama akun minimal 2 karakter");
  });

  it("melewati bawaan zod berbahasa Inggris, bukan menampilkannya", () => {
    // "Data tidak valid — Required" lebih buruk daripada "Data tidak valid".
    for (const bawaan of ["Required", "Invalid input", "Expected number, received string", "Too small"]) {
      expect(pesanDenganMedan("Data tidak valid", { qty: [bawaan] })).toBe("Data tidak valid");
    }
  });

  it("tanpa issues, pesannya tidak berubah", () => {
    expect(pesanDenganMedan("Sesi berakhir. Silakan login kembali.")).toBe("Sesi berakhir. Silakan login kembali.");
    expect(pesanDenganMedan("Data tidak valid", {})).toBe("Data tidak valid");
  });

  it("titik di ujung pesan tidak menghasilkan 'valid. — alasan'", () => {
    expect(pesanDenganMedan("Data tidak valid.", { sku: ["SKU wajib diisi"] })).toBe(
      "Data tidak valid — SKU wajib diisi",
    );
  });

  it("alasan yang sama untuk beberapa medan tidak diulang", () => {
    expect(
      pesanDenganMedan("Data tidak valid", { a: ["Wajib diisi"], b: ["Wajib diisi"] }),
    ).toBe("Data tidak valid — Wajib diisi");
  });
});
