import { describe, expect, it } from "vitest";
import { ApiRequestError } from "../src/api/client";
import { buatPeredam, perluDitoast, pesanGalat, STATUS_TANPA_TOAST } from "../src/lib/galatQuery";

/**
 * Fase 51b — penyaring galat query.
 *
 * Kelas cacat yang ditutup: 140 dari 201 `useQuery` memakai
 * `query.data?.xxx ?? []` tanpa pernah membaca `.isError`, sehingga GAGAL
 * MEMUAT tidak bisa dibedakan dari TIDAK ADA DATA. Halaman Faktur yang gagal
 * memuat berbunyi "Belum ada faktur".
 *
 * Yang diuji di sini bukan toast-nya, melainkan KEPUTUSANNYA — bagian yang
 * kalau salah justru merusak: menoast 503 akan menyebut degradasi anggun
 * (Workers AI/Resend/Xendit belum dipasang) sebagai kerusakan, di setiap
 * halaman yang menyentuhnya.
 */
describe("perluDitoast — kegagalan mana yang layak mengganggu pengguna", () => {
  it("galat biasa diberitahukan", () => {
    expect(perluDitoast(new ApiRequestError(500, "Server bermasalah"))).toBe(true);
    expect(perluDitoast(new ApiRequestError(0, "Gagal terhubung ke server."))).toBe(true);
    expect(perluDitoast(new ApiRequestError(408, "Permintaan terlalu lama — coba lagi."))).toBe(true);
    expect(perluDitoast(new ApiRequestError(429, "Terlalu sering."))).toBe(true);
    expect(perluDitoast(new Error("apa saja"))).toBe(true);
  });

  it("401 dilewati — AppShell sudah memindahkan pengguna ke halaman masuk", () => {
    expect(perluDitoast(new ApiRequestError(401, "Sesi habis"))).toBe(false);
  });

  it("403 dilewati — layarnya sudah menjelaskan di tempatnya sendiri", () => {
    expect(perluDitoast(new ApiRequestError(403, "Tanpa izin"))).toBe(false);
  });

  it("503 dilewati — degradasi anggun adalah rancangan, bukan kerusakan", () => {
    expect(perluDitoast(new ApiRequestError(503, "binding-absent"))).toBe(false);
    // Penjaga niat: kalau seseorang membuang 503 dari daftar, uji ini merah dan
    // menyebut alasannya, bukan sekadar angka yang berubah.
    expect(STATUS_TANPA_TOAST.has(503)).toBe(true);
  });
});

describe("pesanGalat", () => {
  it("memakai pesan aslinya bila ada", () => {
    expect(pesanGalat(new Error("Kontak tersebut bukan pemasok"))).toBe("Kontak tersebut bukan pemasok");
  });
  it("galat tanpa pesan tetap punya kalimat yang bisa dibaca", () => {
    expect(pesanGalat(new Error(""))).toBe("Gagal memuat data.");
    expect(pesanGalat("bukan Error")).toBe("Gagal memuat data.");
    expect(pesanGalat(undefined)).toBe("Gagal memuat data.");
  });
});

describe("buatPeredam — delapan query gagal bersamaan tetap satu pesan", () => {
  it("pesan sama diredam dalam jeda, lalu boleh lagi sesudahnya", () => {
    const boleh = buatPeredam(5_000);
    expect(boleh("Gagal terhubung ke server.", 1_000)).toBe(true);
    expect(boleh("Gagal terhubung ke server.", 1_500)).toBe(false);
    expect(boleh("Gagal terhubung ke server.", 5_999)).toBe(false);
    expect(boleh("Gagal terhubung ke server.", 6_001)).toBe(true);
  });

  it("pesan berbeda tidak saling meredam", () => {
    const boleh = buatPeredam(5_000);
    expect(boleh("A", 0)).toBe(true);
    expect(boleh("B", 10)).toBe(true);
  });
});
