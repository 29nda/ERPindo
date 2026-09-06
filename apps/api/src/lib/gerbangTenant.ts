import { ipAllowed } from "@erpindo/shared";
import type { AppEnv } from "../env";
import { ensureTenantMigrated, TANPA_DB, TENANT_SCHEMA_VERSION } from "./tenantDb";

/**
 * Gerbang tenant (Fase 54e) — satu tempat untuk aturan yang berlaku pada
 * SETIAP pintu masuk konteks tenant.
 *
 * ## Kenapa harus satu tempat
 *
 * Ada dua pintu masuk, dan keduanya menyematkan konteks tenant yang sama
 * persis: `requireTenantRole` (sesi cookie, dipakai aplikasi web) dan
 * `requireApiKey` (Bearer erpk_…, dipakai API publik). Yang membedakan
 * hanyalah cara membuktikan siapa pemanggilnya — dan itu satu-satunya hal yang
 * memang boleh berbeda.
 *
 * Empat aturan di bawah ini tidak ada hubungannya dengan cara membuktikan itu.
 * Semuanya tentang KEADAAN PERUSAHAANNYA: ditangguhkan, belum punya database,
 * skemanya tertinggal, atau langganannya menunggak. Sebelum fase ini keempatnya
 * hanya ditulis di pintu sesi, dan pintu API key melewatkan tiga di antaranya —
 * bukan karena diputuskan begitu, melainkan karena tidak ada satu tempat yang
 * memaksa keduanya sepakat.
 *
 * Yang paling terasa: **mode baca-saja saat menunggak**. Halaman aplikasi
 * memblokir setiap perubahan dengan 402, sementara API key berskop tulis milik
 * perusahaan yang sama tetap bisa membuat faktur tanpa batas waktu. Aturan yang
 * ditegakkan di satu pintu dan tidak di pintu lain bukan aturan; itu saran.
 *
 * Dua aturan yang SENGAJA tidak ada di sini — pembatasan IP dan kewajiban 2FA —
 * memang bergantung pada siapa pemanggilnya (keduanya tentang manusia dan
 * perangkatnya, bukan tentang perusahaan), jadi tempatnya di pintu sesi.
 */
export type BarisGerbang = {
  id: string;
  db_ref: string;
  status: string;
  schema_version: number;
};

export type TolakGerbang = { pesan: string; detail?: string; status: 402 };

export async function gerbangTenant(
  env: AppEnv["Bindings"],
  row: BarisGerbang,
  metode: string,
): Promise<TolakGerbang | null> {
  if (row.status === "suspended") {
    return { pesan: "Langganan perusahaan ini sedang ditangguhkan.", detail: "suspended", status: 402 };
  }

  /**
   * Fase 24 — perusahaan yang belum berlangganan belum punya database.
   *
   * Penjaganya sengaja menguji `db_ref`, BUKAN status. Status bisa sudah
   * `active` sementara databasenya belum sempat dibuat (webhook tiba saat pool
   * penuh), dan justru keadaan itulah yang paling berbahaya: blok auto-migrasi
   * di bawah memanggil `ensureTenantMigrated` yang akan meledak pada `db_ref`
   * kosong, sehingga pelanggan melihat 500 alih-alih penjelasan.
   *
   * Karena itu penjaga ini WAJIB berada di atas blok migrasi, dan menolak SEMUA
   * method termasuk GET — tidak ada data untuk dibaca.
   */
  if (row.db_ref === TANPA_DB) {
    const belumBayar = row.status === "provisioning";
    return {
      pesan: belumBayar
        ? "Perusahaan ini belum berlangganan. Aktifkan langganan untuk mulai mencatat transaksi."
        : "Perusahaan ini sedang disiapkan. Buka halaman Langganan sebentar lagi.",
      detail: belumBayar ? "belum-berlangganan" : "sedang-disiapkan",
      status: 402,
    };
  }

  // Auto-migrasi malas: bila database tenant ini tertinggal skema (mis. baru
  // saja rilis migrasi baru), terapkan sebelum modul menyentuhnya. Idempoten &
  // hanya bekerja saat versi tertinggal. Kegagalan migrasi tidak boleh memutus
  // akses total — dicatat lalu request lanjut (versi tetap tertinggal → dicoba
  // ulang pada request berikutnya), sehingga bersifat swasembuh.
  if (row.schema_version < TENANT_SCHEMA_VERSION) {
    try {
      await ensureTenantMigrated(env, { id: row.id, dbRef: row.db_ref, schemaVersion: row.schema_version });
    } catch (err) {
      console.error(`[db] auto-migrasi tenant ${row.id} gagal:`, err);
    }
  }

  // Menunggak (trial berakhir / tagihan lewat jatuh tempo): data tetap bisa
  // dibaca, tetapi semua perubahan diblokir sampai langganan aktif kembali.
  if (row.status === "past_due" && metode !== "GET") {
    return {
      pesan: "Masa trial/langganan telah berakhir — akun dalam mode baca-saja. Silakan aktifkan langganan.",
      detail: "baca-saja",
      status: 402,
    };
  }

  return null;
}

/**
 * Kebijakan keamanan perusahaan (Fase 13g, dipusatkan Fase 54e).
 *
 * Berbeda dari `gerbangTenant` di atas: yang ini tentang SIAPA yang memanggil
 * dan dari mana — bukan tentang keadaan perusahaannya. Karena itu ia tidak
 * berlaku untuk API key (kunci mesin, bukan orang) dan tidak dipanggil dari
 * gerbang.
 *
 * Ia dipisahkan menjadi fungsi tersendiri karena dua jalur yang memeriksa
 * keanggotaan secara manual — billing dan penagihan pelanggan — melewatkannya
 * seluruhnya. Perusahaan yang menyalakan "wajib 2FA" tetap melihat anggotanya
 * membuka data faktur lewat kedua jalur itu tanpa 2FA. Janji keamanan yang
 * ditegakkan di sebagian layar saja bukan janji.
 */
export type BarisKeamanan = {
  require_2fa: number;
  allowed_ips: string | null;
  totp_enabled: number;
};

export type TolakKeamanan = { pesan: string; detail: string; status: 403 };

export function kebijakanKeamanan(
  row: BarisKeamanan,
  opsi: {
    ip: string;
    /**
     * Pembatasan IP boleh dilewati untuk jalur yang HARUS tetap terjangkau dari
     * mana saja: halaman pengaturan keamanan itu sendiri (katup pengaman bagi
     * Owner yang salah mengetik CIDR) dan halaman pembayaran (pelanggan yang
     * sedang berusaha membayar tidak boleh terkunci di luar kasirnya sendiri).
     *
     * Kewajiban 2FA tidak punya pengecualian serupa di jalur pembayaran, dan
     * itu perbedaan yang disengaja: 2FA selalu bisa dipenuhi sendiri oleh yang
     * bersangkutan lewat Profil, sementara alamat IP tidak.
     */
    periksaIp?: boolean;
    periksa2fa?: boolean;
  },
): TolakKeamanan | null {
  if (opsi.periksaIp !== false && row.allowed_ips) {
    let daftar: string[] = [];
    try {
      daftar = JSON.parse(row.allowed_ips) as string[];
    } catch {
      daftar = [];
    }
    if (!ipAllowed(opsi.ip, daftar)) {
      return {
        pesan: "Akses dari alamat IP ini diblokir oleh kebijakan keamanan perusahaan.",
        detail: "ip-not-allowed",
        status: 403,
      };
    }
  }

  if (opsi.periksa2fa !== false && row.require_2fa === 1 && row.totp_enabled !== 1) {
    return {
      pesan: "Perusahaan ini mewajibkan verifikasi 2 langkah (2FA). Aktifkan 2FA di Profil untuk melanjutkan.",
      detail: "2fa-required",
      status: 403,
    };
  }

  return null;
}
