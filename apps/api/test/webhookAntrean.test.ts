import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { giliranAdil } from "../src/lib/webhooks";

/**
 * Antrean webhook keluar harus maju, dan majunya harus adil (Fase 57b).
 *
 * ## Cacat yang ditutup uji ini
 *
 * `runWebhookDeliveries` mengambil seratus pengiriman yang jatuh tempo lalu
 * mengirimnya berurutan. Tiap pengiriman boleh menghabiskan sampai sepuluh
 * detik (batas waktu di `deliverOne`), jadi satu batch yang seluruh tujuannya
 * menggantung menuntut hampir tiga jam — dan penangan cron dimatikan jauh
 * sebelum itu.
 *
 * Yang membuatnya buruk bukan pekerjaan yang tertunda, melainkan apa yang TIDAK
 * tercatat. Baris yang penangannya mati sebelum sempat di-UPDATE tetap
 * `pending`, dengan `next_attempt_at` DAN `attempts` yang sama persis. Ia jatuh
 * tempo lagi seketika, terurut paling depan lagi (`ORDER BY next_attempt_at`),
 * lalu menggantung lagi. Percobaannya tidak pernah bertambah, jadi
 * `WEBHOOK_MAX_ATTEMPTS` tidak pernah tercapai: satu tujuan yang menggantung
 * memblokir antrean SELURUH platform, selamanya, tanpa satu baris log pun.
 *
 * Cacat kedua sejenis: batch diambil urut waktu jatuh tempo, jadi satu tenant
 * yang memancarkan ratusan peristiwa sekaligus mengisi seluruh seratusnya dan
 * pelanggan lain menunggu di belakangnya — setiap batch.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src/lib/webhooks.ts");
const KODE = readFileSync(SRC, "utf8");

describe("giliran adil antar pelanggan", () => {
  const baris = (id: string, n: number) =>
    Array.from({ length: n }, (_, i) => ({ webhook_id: id, id: `${id}-${i}` }));

  it("tidak kehilangan maupun menggandakan satu kiriman pun", () => {
    const asal = [...baris("a", 5), ...baris("b", 3), ...baris("c", 1)];
    const hasil = giliranAdil(asal);
    expect(hasil).toHaveLength(asal.length);
    expect(new Set(hasil.map((h) => h.id)).size).toBe(asal.length);
  });

  /** Inti perbaikannya: pelanggan yang ramai tidak boleh memborong gilirannya. */
  it("menyelang-nyeling pelanggan alih-alih menghabiskan satu per satu", () => {
    const hasil = giliranAdil([...baris("a", 3), ...baris("b", 2)]);
    expect(hasil.map((h) => h.webhook_id)).toEqual(["a", "b", "a", "b", "a"]);
  });

  /**
   * Kalau anggarannya habis di tengah, yang sudah terlayani harus tersebar —
   * bukan menumpuk pada satu pelanggan. Inilah yang membuat penyelangan berarti.
   */
  it("potongan awal batch sudah menyentuh semua pelanggan", () => {
    const hasil = giliranAdil([...baris("ramai", 50), ...baris("sepi", 1)]);
    expect(hasil.slice(0, 2).map((h) => h.webhook_id)).toEqual(["ramai", "sepi"]);
  });

  it("urutan tunggu tetap dihormati: yang paling lama menunggu duluan", () => {
    // `baris` disusun sesuai urutan kueri (next_attempt_at ASC), dan Map
    // mempertahankan urutan sisip.
    const hasil = giliranAdil([...baris("lama", 1), ...baris("baru", 1)]);
    expect(hasil.map((h) => h.webhook_id)).toEqual(["lama", "baru"]);
  });

  it("larik kosong tidak menggantung", () => {
    expect(giliranAdil([])).toEqual([]);
  });
});

describe("anggaran waktu batch", () => {
  it("gelung pengiriman berhenti ketika anggarannya habis", () => {
    expect(KODE).toMatch(/Date\.now\(\) - mulai > budgetMs/);
  });

  /**
   * Berhenti dengan `continue`, bukan `break`: keduanya sama-sama berhenti
   * mengirim, tetapi `continue` tetap menghitung sisanya sehingga jumlah yang
   * ditunda bisa dilaporkan. Antrean yang diam tanpa angka adalah antrean yang
   * tak seorang pun tahu sedang tersendat.
   */
  it("jumlah yang ditunda dilaporkan, bukan didiamkan", () => {
    expect(KODE).toMatch(/ditunda\+\+/);
    expect(KODE).toMatch(/anggaran waktu habis — \$\{ditunda\} pengiriman ditunda/);
  });

  it("anggarannya bisa disetel pemanggil, dengan bawaan yang wajar", () => {
    expect(KODE).toMatch(/budgetMs = 20_000/);
  });

  /**
   * Blok webhook berjalan PALING AKHIR di cron, jadi jatah waktunya adalah apa
   * yang tersisa — bukan angka tetap yang mengabaikan berapa lama blok
   * sebelumnya memakai jatahnya.
   */
  it("cron memberi sisa anggarannya, bukan angka tetap", () => {
    const INDEX = readFileSync(join(dirname(SRC), "..", "index.ts"), "utf8");
    expect(INDEX).toMatch(/runWebhookDeliveries\(env, 100, sisaMs\)/);
    expect(INDEX).toMatch(/Math\.max\(5_000, 25_000 - \(Date\.now\(\) - startedMs\)\)/);
  });
});

describe("waktu percobaan yang dilaporkan jujur", () => {
  /**
   * `last_attempt_at` dulu memakai waktu batch DIMULAI. Pada batch panjang
   * keduanya berselisih menit, dan yang dibaca pemilik di layar adalah "kapan
   * terakhir dicoba" — bukan "kapan cron bangun".
   */
  it("last_attempt_at diambil saat percobaan, bukan saat batch dimulai", () => {
    const blok = KODE.slice(KODE.indexOf("UPDATE webhooks SET last_status"));
    expect(blok.slice(0, 200)).toMatch(/\.bind\(lastStatus, nowIso\(\), d\.webhook_id\)/);
  });
});
