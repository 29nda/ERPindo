import { afterEach, describe, expect, it, vi } from "vitest";
import { dukunganPindai, mulaiPindai } from "../src/lib/barcode";

/**
 * Pemindai barcode (Fase 20i). Yang diuji di sini adalah **degradasinya**:
 * tiap sebab kegagalan harus dibedakan, karena tiap sebab menuntut kalimat
 * yang berbeda ke kasir.
 *
 * Fase 21g mengubah kontraknya: ketiadaan `BarcodeDetector` bawaan tidak lagi
 * membatalkan pemindaian — ada pengurai cadangan wasm. Penguraiannya sendiri
 * diuji di `barcode-cadangan.test.ts`.
 */

class DetektorPalsu {
  static hasil: { rawValue: string }[] = [];
  detect() {
    return Promise.resolve(DetektorPalsu.hasil);
  }
}

function pasangLingkungan(opts: { detektor?: boolean; kamera?: boolean | "tolak" }) {
  const w = globalThis as unknown as Record<string, unknown>;
  if (opts.detektor) w.BarcodeDetector = DetektorPalsu;
  else delete w.BarcodeDetector;

  const nav = { mediaDevices: undefined as unknown } as { mediaDevices: unknown };
  if (opts.kamera === true) {
    nav.mediaDevices = {
      getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop: () => {} }] } as unknown),
    };
  } else if (opts.kamera === "tolak") {
    nav.mediaDevices = { getUserMedia: () => Promise.reject(new Error("NotAllowedError")) };
  }
  vi.stubGlobal("navigator", nav);
  vi.stubGlobal("window", w);
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as unknown as Record<string, unknown>).BarcodeDetector;
});

describe("dukunganPindai (Fase 20i, kontrak diperbarui 21g)", () => {
  it("peramban tanpa BarcodeDetector bawaan TETAP 'siap' — cadangannya ada", () => {
    // Inilah perubahan inti Fase 21g. Sebelumnya keadaan ini dijawab
    // "tanpa-detektor" dan tombol pindainya menyerah di tempat; itu persis
    // yang dialami setiap pengguna iPhone.
    pasangLingkungan({ detektor: false, kamera: true });
    expect(dukunganPindai()).toBe("siap");
  });

  it("ada detektor tetapi tanpa akses kamera dilaporkan 'tanpa-kamera'", () => {
    pasangLingkungan({ detektor: true, kamera: false });
    expect(dukunganPindai()).toBe("tanpa-kamera");
  });

  it("keduanya ada dilaporkan 'siap'", () => {
    pasangLingkungan({ detektor: true, kamera: true });
    expect(dukunganPindai()).toBe("siap");
  });

  it("pemeriksaan dukungan TIDAK meminta izin kamera", async () => {
    const getUserMedia = vi.fn();
    (globalThis as unknown as Record<string, unknown>).BarcodeDetector = DetektorPalsu;
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal("window", globalThis);
    expect(dukunganPindai()).toBe("siap");
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe("mulaiPindai (Fase 20i)", () => {
  const videoPalsu = () =>
    ({ srcObject: null, play: () => Promise.resolve() }) as unknown as HTMLVideoElement;

  it("izin kamera ditolak dilempar sebagai 'tanpa-izin', bukan galat peramban", async () => {
    pasangLingkungan({ detektor: true, kamera: "tolak" });
    // Sengaja BUKAN Error: pesan galat peramban berbeda antarperamban dan
    // berubah antarversi, jadi tidak boleh jadi dasar pemilihan kalimat.
    await expect(mulaiPindai(videoPalsu(), () => {})).rejects.toBe("tanpa-izin");
  });

  it("tanpa akses kamera dilempar 'tanpa-kamera' sebelum pengurai dimuat", async () => {
    delete (globalThis as unknown as Record<string, unknown>).BarcodeDetector;
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", globalThis);
    await expect(mulaiPindai(videoPalsu(), () => {})).rejects.toBe("tanpa-kamera");
  });

  it("pengurai cadangan gagal dimuat dilempar 'pengurai-gagal', kamera tak dinyalakan", async () => {
    // Keadaan nyata yang diwakili: iPhone luring dengan potongan wasm belum
    // ter-precache. Lampu kamera TIDAK boleh menyala hanya untuk kemudian
    // mengaku gagal — karena itu `getUserMedia` diperiksa tidak terpanggil.
    //
    // Kegagalannya HARUS dipalsukan, dan itu diperiksa: tanpa `doMock` di
    // bawah, impor cadangannya justru BERHASIL di vitest (Vite ikut
    // menyelesaikan `?url`, dan wasm-nya baru benar-benar diambil saat
    // `detect()` dipanggil). Uji ini sempat hijau-palsu karena dugaan
    // sebaliknya; yang membuktikan ia kini mengukur sesuatu adalah pengamatan
    // bahwa tanpa mock hasilnya `{ hentikan }`, bukan penolakan.
    const getUserMedia = vi.fn();
    delete (globalThis as unknown as Record<string, unknown>).BarcodeDetector;
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal("window", globalThis);
    vi.doMock("barcode-detector/ponyfill", () => {
      throw new Error("potongan wasm tidak bisa diunduh");
    });
    // Modul dimuat ulang supaya cache `cadangan` di dalamnya kosong.
    vi.resetModules();
    const segar = await import("../src/lib/barcode");
    await expect(segar.mulaiPindai(videoPalsu(), () => {})).rejects.toBe("pengurai-gagal");
    expect(getUserMedia).not.toHaveBeenCalled();
    // Kegagalan tidak boleh tersimpan: percobaan kedua harus benar-benar
    // mencoba lagi, bukan mengembalikan promise gagal yang sama.
    await expect(segar.mulaiPindai(videoPalsu(), () => {})).rejects.toBe("pengurai-gagal");
    vi.doUnmock("barcode-detector/ponyfill");
  });
});
