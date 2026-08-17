/**
 * Pemindai barcode lewat kamera (Fase 20i, cadangan wasm Fase 21g).
 *
 * Memakai `BarcodeDetector` bawaan peramban bila ada — di Android/Chrome itu
 * gratis dan paling cepat. Safari/WebKit iOS **tidak** punya API itu, dan
 * pemilik warung yang memakai iPhone adalah pengguna nyata, jadi Fase 21g
 * menambahkan pengurai cadangan berbasis WebAssembly (`barcode-detector` di
 * atas `zxing-wasm`).
 *
 * Cadangannya dimuat lewat `import()` DINAMIS dan hanya saat API bawaan absen.
 * Pengguna Android — mayoritas UKM Indonesia — tidak mengunduh satu byte pun
 * dari 1 MB wasm itu.
 *
 * Yang WAJIB benar tetap degradasinya: peramban tanpa kamera, yang izinnya
 * ditolak, atau yang gagal memuat pengurai cadangan harus mendapat penjelasan
 * yang berbeda-beda dan tetap bisa berjualan lewat kotak pencarian biasa.
 */

/** Kenapa pemindaian tidak bisa dijalankan; `siap` berarti bisa. */
export type DukunganPindai = "siap" | "pengurai-gagal" | "tanpa-kamera" | "tanpa-izin";

type BarcodeHasil = { rawValue: string };
type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<BarcodeHasil[]> };
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

function ctorBawaan(): BarcodeDetectorCtor | null {
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  return typeof w.BarcodeDetector === "function" ? w.BarcodeDetector : null;
}

let cadangan: Promise<BarcodeDetectorCtor> | null = null;

/**
 * Muat pengurai wasm sekali saja, lalu pakai ulang hasilnya.
 *
 * Kegagalan sengaja MENGHAPUS cache promise-nya: penyebab paling mungkin
 * adalah perangkat sedang luring dan potongan wasm-nya belum ter-precache,
 * dan kasir yang mencoba lagi setelah sinyal kembali harus benar-benar
 * mencoba lagi — bukan menerima kegagalan yang tersimpan selamanya.
 */
async function ctorCadangan(): Promise<BarcodeDetectorCtor> {
  cadangan ??= (async () => {
    const [ponyfill, wasm] = await Promise.all([
      import("barcode-detector/ponyfill"),
      // Berkas wasm-nya disajikan dari origin sendiri, BUKAN CDN bawaan
      // zxing-wasm: CSP aplikasi memakai `default-src 'self'`, dan POS adalah
      // PWA yang harus tetap memindai saat internet warung mati.
      import("zxing-wasm/reader/zxing_reader.wasm?url"),
    ]);
    ponyfill.prepareZXingModule({ overrides: { locateFile: () => wasm.default } });
    return ponyfill.BarcodeDetector as unknown as BarcodeDetectorCtor;
  })().catch((e: unknown) => {
    cadangan = null;
    throw e;
  });
  return cadangan;
}

/**
 * Apa yang bisa dilakukan peramban ini — diperiksa SEBELUM tombol pindai
 * ditawarkan, supaya kasir tidak menekan tombol yang memang tak akan bekerja.
 *
 * Sejak Fase 21g ketiadaan `BarcodeDetector` bawaan BUKAN lagi alasan menolak:
 * ada cadangannya. Yang tersisa sebagai penghalang di tahap ini hanya kamera.
 *
 * Tidak meminta izin kamera; itu baru terjadi saat pemindaian dimulai.
 */
export function dukunganPindai(): DukunganPindai {
  if (!navigator.mediaDevices?.getUserMedia) return "tanpa-kamera";
  return "siap";
}

/** Format yang dipakai ritel Indonesia; QR ikut karena banyak dipakai UKM. */
const FORMAT = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"];

export type PemindaiAktif = {
  /** Hentikan pemindaian dan matikan kamera. */
  hentikan: () => void;
};

/**
 * Mulai memindai dari kamera belakang ke `video`, memanggil `onKode` sekali
 * untuk tiap kode yang terbaca.
 *
 * Melempar `DukunganPindai` (bukan `Error`) bila gagal dimulai, supaya
 * pemanggil bisa memilih pesan yang tepat tanpa mengurai teks galat peramban —
 * teks itu berbeda-beda antarperamban dan berubah antarversi.
 */
export async function mulaiPindai(
  video: HTMLVideoElement,
  onKode: (kode: string) => void,
): Promise<PemindaiAktif> {
  if (!navigator.mediaDevices?.getUserMedia) throw "tanpa-kamera" satisfies DukunganPindai;

  // Pengurainya disiapkan SEBELUM kamera dinyalakan. Urutan ini disengaja:
  // menyalakan lampu kamera lalu mengaku gagal memuat mesin pemindai adalah
  // cara terburuk untuk gagal.
  let Ctor = ctorBawaan();
  if (!Ctor) {
    try {
      Ctor = await ctorCadangan();
    } catch {
      throw "pengurai-gagal" satisfies DukunganPindai;
    }
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
  } catch {
    // Ditolak, dipakai aplikasi lain, atau tidak ada perangkatnya — dari sudut
    // pandang kasir ketiganya sama: kamera tidak bisa dipakai sekarang.
    throw "tanpa-izin" satisfies DukunganPindai;
  }

  video.srcObject = stream;
  await video.play().catch(() => undefined);

  const detektor = new Ctor({ formats: FORMAT });
  let berjalan = true;
  // Kode yang sudah dilaporkan tidak dilaporkan lagi: satu barcode terbaca
  // puluhan kali per detik selama masih di depan lensa, dan tanpa penyaring ini
  // satu kali pindai akan memasukkan barang yang sama berulang ke keranjang.
  const sudah = new Set<string>();

  const putar = async () => {
    while (berjalan) {
      try {
        const hasil = await detektor.detect(video);
        for (const h of hasil) {
          if (h.rawValue && !sudah.has(h.rawValue)) {
            sudah.add(h.rawValue);
            onKode(h.rawValue);
          }
        }
      } catch {
        /* bingkai gagal diurai — lanjut ke bingkai berikutnya */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  };
  void putar();

  return {
    hentikan: () => {
      berjalan = false;
      for (const t of stream.getTracks()) t.stop();
      video.srcObject = null;
    },
  };
}
