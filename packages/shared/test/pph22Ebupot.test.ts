import { describe, expect, it } from "vitest";
import { csvEBupot, KOLOM_EBUPOT, nilaiPungutan, PPH22_OBJECTS, type BarisEBupot } from "../src/accounting";

/**
 * PPh 22 & bahan pengisian e-Bupot (Fase 46).
 */
describe("nilaiPungutan", () => {
  it("menghitung tarif pecahan yang lazim di PPh 22", () => {
    // 0,25% dari 400 juta = 1 juta. Tarif pecahan inilah alasan `rate` tetap
    // persen, bukan basis poin bilangan bulat seperti komisi.
    expect(nilaiPungutan(400_000_000, 0.25)).toBe(1_000_000);
    expect(nilaiPungutan(100_000_000, 0.1)).toBe(100_000);
  });

  it("membulatkan ke rupiah terdekat", () => {
    expect(Number.isInteger(nilaiPungutan(333_333_333, 0.45))).toBe(true);
  });

  it("tarif nol berarti tanpa pungutan", () => {
    expect(nilaiPungutan(100_000_000, 0)).toBe(0);
  });

  it("dasar nol tidak melempar", () => {
    expect(nilaiPungutan(0, 2.5)).toBe(0);
  });
});

describe("daftar objek PPh 22", () => {
  it("kodenya unik", () => {
    const kode = PPH22_OBJECTS.map((o) => o.code);
    expect(kode.length).toBe(new Set(kode).size);
  });

  it("impor tanpa API bertarif lebih tinggi daripada yang punya API", () => {
    // Bukan sekadar mencocokkan angka: urutan inilah yang bermakna, dan
    // membaliknya berarti salah membaca peraturannya.
    const api = PPH22_OBJECTS.find((o) => o.code === "impor-api")!.rate;
    const nonApi = PPH22_OBJECTS.find((o) => o.code === "impor-nonapi")!.rate;
    expect(nonApi).toBeGreaterThan(api);
  });

  it("seluruh tarif berada di rentang yang masuk akal", () => {
    for (const o of PPH22_OBJECTS) {
      expect(o.rate, o.code).toBeGreaterThan(0);
      expect(o.rate, o.code).toBeLessThanOrEqual(10);
    }
  });
});

describe("csvEBupot", () => {
  const baris = (o: Partial<BarisEBupot> = {}): BarisEBupot => ({
    masa: "2026-10",
    jenis: "pph23",
    noBukti: "BP-0001",
    tanggal: "2026-10-05",
    npwp: "01.234.567.8-901.000",
    nama: "PT Rekanan",
    objek: "jasa",
    dpp: 10_000_000,
    tarif: 2,
    pph: 200_000,
    ...o,
  });

  it("baris judulnya persis kolom yang dijanjikan", () => {
    const csv = csvEBupot([baris()]);
    expect(csv.split("\n")[0]).toBe(KOLOM_EBUPOT.join(","));
  });

  it("tiap baris data menghasilkan satu baris berkas", () => {
    const csv = csvEBupot([baris(), baris({ noBukti: "BP-0002" })]);
    expect(csv.split("\n")).toHaveLength(3);
  });

  it("NPWP kosong ditulis kosong, BUKAN diisi nomor palsu", () => {
    // Mengisinya dengan 00.000.000.0-000.000 supaya kolomnya terisi akan
    // membuat berkasnya tampak lengkap padahal datanya belum ada — dan yang
    // memeriksanya baru tahu setelah ditolak DJP.
    const csv = csvEBupot([baris({ npwp: "" })]);
    expect(csv).not.toContain("00.000.000.0-000.000");
    expect(csv.split("\n")[1]).toContain(",,");
  });

  it("nama bertanda koma tidak merusak kolom", () => {
    const csv = csvEBupot([baris({ nama: "PT Maju, Jaya" })]);
    expect(csv).toContain('"PT Maju, Jaya"');
    expect(csv.split("\n")).toHaveLength(2);
  });

  it("tanda kutip di dalam nama digandakan sesuai kaidah CSV", () => {
    const csv = csvEBupot([baris({ nama: 'PT "Bintang"' })]);
    expect(csv).toContain('"PT ""Bintang"""');
  });

  it("daftar kosong tetap menghasilkan baris judul", () => {
    // Berkas tanpa judul akan terbaca sebagai berkas rusak, bukan sebagai
    // "tidak ada data".
    expect(csvEBupot([])).toBe(KOLOM_EBUPOT.join(","));
  });

  it("memuat ketiga jenis PPh dalam satu berkas", () => {
    const csv = csvEBupot([
      baris({ jenis: "pph21", noBukti: "GAJI-01" }),
      baris({ jenis: "pph22", noBukti: "P22-01" }),
      baris({ jenis: "pphFinal", noBukti: "FIN-01" }),
    ]);
    expect(csv).toContain("pph21");
    expect(csv).toContain("pph22");
    expect(csv).toContain("pphFinal");
  });
});
