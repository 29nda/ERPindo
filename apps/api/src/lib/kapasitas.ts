/**
 * Penegakan batas kapasitas paket (Fase 53c).
 *
 * ## Kenapa berkas ini ada, dan kenapa ia SATU tempat
 *
 * Fase 53a mendefinisikan tiga paket yang dibedakan kapasitas — badan usaha,
 * lokasi, karyawan penggajian — lalu sengaja TIDAK menampilkan angkanya di
 * halaman harga. Alasannya tercatat di `PLAN_LIMITS`: Fase 30 menghapus
 * `maxEntities` justru karena ia diumumkan di landing tanpa satu baris pun yang
 * memeriksanya, dan batas yang tidak ditegakkan bukan kode menganggur melainkan
 * janji yang bisa dibantah pelanggan.
 *
 * Berkas ini yang menutup jarak itu. Ia sengaja menjadi satu titik pemeriksaan,
 * bukan tiga cek yang tersebar: batas kapasitas akan bertambah (pengguna
 * bersamaan, kuota lampiran, jumlah cabang POS), dan pemeriksaan yang tersebar
 * adalah cara paling mudah kehilangan salah satunya diam-diam.
 *
 * ## Bentuk penolakannya
 *
 * Mengikuti pola `binding-absent`: penolakan bukan galat mentah melainkan
 * balasan terstruktur yang cukup untuk merender ajakan naik paket — jenis
 * kuotanya, batasnya, pemakaian sekarang, paket saat ini, dan paket terkecil
 * yang memuatnya. Layar yang menerima ini tidak perlu tahu apa pun tentang
 * daftar harga.
 */
import {
  batasEfektif,
  PLAN_LABELS,
  PLAN_LIMITS,
  PLANS,
  takTerbatas,
  type BatasPaket,
  type Plan,
} from "@erpindo/shared";
import type { SqlExecutor } from "@erpindo/db";
import type { AppEnv } from "../env";

export type JenisKapasitas = "badanUsaha" | "lokasi" | "karyawan";

/** Nama kolom `BatasPaket` untuk tiap jenis kuota. */
const FIELD: Record<JenisKapasitas, keyof BatasPaket> = {
  badanUsaha: "maxBadanUsaha",
  lokasi: "maxLokasi",
  karyawan: "karyawanTermasuk",
};

const SEBUTAN: Record<JenisKapasitas, string> = {
  badanUsaha: "badan usaha",
  lokasi: "lokasi",
  karyawan: "karyawan penggajian",
};

export type TolakanKapasitas = {
  error: string;
  detail: "kuota-paket";
  jenis: JenisKapasitas;
  batas: number;
  terpakai: number;
  paketSekarang: Plan;
  /** Paket terkecil yang memuat pemakaian ini; `null` bila tidak ada. */
  paketSaran: Plan | null;
};

export type HasilKapasitas = { boleh: true } | { boleh: false; tolakan: TolakanKapasitas };

const BOLEH: HasilKapasitas = { boleh: true };

/**
 * Karyawan penggajian TIDAK memakai fungsi ini untuk menolak.
 *
 * Jatahnya bukan pagar melainkan titik mulai penagihan: kelebihannya ditagih
 * per kepala. Menolak karyawan ke-51 akan mendorong perusahaan menggaji
 * sisanya di luar sistem, dan sejak saat itu laporan PPh 21 yang dihasilkan
 * ERPindo salah — kerugian yang jauh lebih besar daripada tagihan yang
 * diselamatkan.
 */
export const KUOTA_MENOLAK: JenisKapasitas[] = ["badanUsaha", "lokasi"];

/** Paket terkecil yang memuat `terpakai` untuk jenis kuota ini. */
function paketTerkecilMemuat(jenis: JenisKapasitas, terpakai: number): Plan | null {
  const field = FIELD[jenis];
  return PLANS.find((p) => (PLAN_LIMITS[p][field] as number) >= terpakai) ?? null;
}

function tolak(
  jenis: JenisKapasitas,
  batas: number,
  terpakai: number,
  plan: Plan,
): HasilKapasitas {
  return {
    boleh: false,
    tolakan: {
      error:
        `Paket ${PLAN_LABELS[plan]} memuat ${batas} ${SEBUTAN[jenis]}, ` +
        `dan seluruhnya sudah terpakai.`,
      detail: "kuota-paket",
      jenis,
      batas,
      terpakai,
      paketSekarang: plan,
      paketSaran: paketTerkecilMemuat(jenis, terpakai + 1),
    },
  };
}

/** Baris paket sebuah tenant di control-plane. */
async function batasTenant(
  env: AppEnv["Bindings"],
  tenantId: string,
): Promise<{ plan: Plan; batas: BatasPaket }> {
  const row = await env.DB.prepare(`SELECT plan, plan_overrides FROM tenants WHERE id = ?`)
    .bind(tenantId)
    .first<{ plan: string; plan_overrides: string | null }>();
  const plan = ((PLANS as readonly string[]).includes(row?.plan ?? "")
    ? row?.plan
    : "starter") as Plan;
  return { plan, batas: batasEfektif(plan, row?.plan_overrides) };
}

/**
 * Kuota lokasi (gudang/outlet) sebuah tenant.
 *
 * `is_archived = 0` sengaja: gudang yang diarsipkan tidak lagi dipakai, dan
 * menghitungnya akan menghukum perusahaan yang merapikan datanya.
 */
export async function periksaKuotaLokasi(
  env: AppEnv["Bindings"],
  tenantId: string,
  db: SqlExecutor,
  tambahan = 1,
): Promise<HasilKapasitas> {
  const { plan, batas } = await batasTenant(env, tenantId);
  if (takTerbatas(batas.maxLokasi)) return BOLEH;
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM warehouses WHERE is_archived = 0`)
    .first<{ n: number }>();
  const terpakai = row?.n ?? 0;
  if (terpakai + tambahan <= batas.maxLokasi) return BOLEH;
  return tolak("lokasi", batas.maxLokasi, terpakai, plan);
}

/**
 * Kuota badan usaha: berapa perusahaan yang dimiliki satu akun.
 *
 * Dihitung dari keanggotaan berperan `owner`, bukan dari kolom di tenant:
 * "berapa badan usaha yang saya punya" adalah pertanyaan tentang akun, dan
 * jawabannya hanya ada di tabel keanggotaan.
 */
export async function periksaKuotaBadanUsaha(
  env: AppEnv["Bindings"],
  userId: string,
): Promise<HasilKapasitas> {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.plan, t.plan_overrides FROM memberships m
     JOIN tenants t ON t.id = m.tenant_id
     WHERE m.user_id = ? AND m.role = 'owner'`,
  )
    .bind(userId)
    .all<{ id: string; plan: string; plan_overrides: string | null }>();

  const terpakai = results.length;
  if (terpakai === 0) return BOLEH;

  /**
   * Paket yang dipakai adalah yang PALING LONGGAR di antara perusahaan yang
   * dimiliki akun ini, bukan paket perusahaan pertamanya.
   *
   * Sebabnya praktis: pemilik yang menaikkan salah satu perusahaannya ke
   * Enterprise justru sedang bersiap menambah badan usaha. Memakai paket
   * perusahaan pertama akan menolaknya tepat setelah ia membayar untuk itu.
   */
  const terlonggar = results.reduce<{ plan: Plan; batas: BatasPaket }>(
    (maks, r) => {
      const plan = ((PLANS as readonly string[]).includes(r.plan) ? r.plan : "starter") as Plan;
      const batas = batasEfektif(plan, r.plan_overrides);
      return batas.maxBadanUsaha > maks.batas.maxBadanUsaha ? { plan, batas } : maks;
    },
    { plan: "starter", batas: PLAN_LIMITS.starter },
  );

  if (takTerbatas(terlonggar.batas.maxBadanUsaha)) return BOLEH;
  if (terpakai + 1 <= terlonggar.batas.maxBadanUsaha) return BOLEH;
  return tolak("badanUsaha", terlonggar.batas.maxBadanUsaha, terpakai, terlonggar.plan);
}

/**
 * Karyawan penggajian di atas jatah: TIDAK menolak, hanya melaporkan.
 *
 * Dipakai kartu langganan untuk menampilkan tagihan tambahan yang akan datang,
 * supaya pelanggan melihatnya sebelum tagihannya terbit — bukan sesudah.
 */
export async function hitungKaryawanDiAtasJatah(
  env: AppEnv["Bindings"],
  tenantId: string,
  db: SqlExecutor,
): Promise<{ terpakai: number; termasuk: number; kelebihan: number }> {
  const { batas } = await batasTenant(env, tenantId);
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM employees WHERE is_active = 1`)
    .first<{ n: number }>();
  const terpakai = row?.n ?? 0;
  return {
    terpakai,
    termasuk: batas.karyawanTermasuk,
    kelebihan: Math.max(0, terpakai - batas.karyawanTermasuk),
  };
}
