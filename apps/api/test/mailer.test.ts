import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/env";
import { getMailer, kirimEmail } from "../src/lib/mailer";

/**
 * Fase 23c — email yang gagal harus MENINGGALKAN JEJAK.
 *
 * `ResendMailer` dulu menelan kegagalan: non-2xx hanya dicatat `console.error`
 * lalu fungsinya kembali normal, sehingga pemanggilnya percaya email terkirim.
 * Pengguna melihat "email verifikasi terkirim" padahal tidak pernah terkirim.
 *
 * Penyebab paling lazim justru yang paling sunyi — domain pengirim belum
 * diverifikasi di Resend, yaitu keadaan normal pada hari pertama sebuah kunci
 * dipasang. Persis hari peluncuran.
 */

const MAIL = { to: "budi@contoh.id", subject: "Verifikasi email", text: "halo" };

/** Env tiruan dengan control-plane yang merekam INSERT audit_logs. */
function envUji(opts: { resendKey?: string } = {}) {
  const auditTercatat: unknown[][] = [];
  const env = {
    RESEND_API_KEY: opts.resendKey,
    DB: {
      prepare: () => ({
        bind: (...v: unknown[]) => ({
          run: async () => {
            auditTercatat.push(v);
            return {};
          },
        }),
      }),
    },
  } as unknown as Env;
  return { env, auditTercatat };
}

afterEach(() => vi.unstubAllGlobals());

describe("ResendMailer — kegagalan tidak boleh sunyi", () => {
  it("Resend membalas non-2xx → MELEMPAR (bukan kembali normal)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("The erpindo.id domain is not verified", { status: 403 })),
    );
    const { env } = envUji({ resendKey: "re_palsu" });
    await expect(getMailer(env).send(MAIL)).rejects.toThrow(/Resend menolak \(403\)/);
  });

  it("Resend sukses → tidak melempar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"id":"x"}', { status: 200 })));
    const { env } = envUji({ resendKey: "re_palsu" });
    await expect(getMailer(env).send(MAIL)).resolves.toBeUndefined();
  });

  it("tanpa RESEND_API_KEY → ConsoleMailer, tetap tidak melempar (degradasi anggun utuh)", async () => {
    const { env } = envUji();
    await expect(getMailer(env).send(MAIL)).resolves.toBeUndefined();
  });
});

describe("kirimEmail — gagal tanpa menggagalkan pemanggil, tetapi tercatat", () => {
  it("gagal → mengembalikan false DAN menulis audit email.gagal", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("domain not verified", { status: 403 })));
    const { env, auditTercatat } = envUji({ resendKey: "re_palsu" });

    const terkirim = await kirimEmail(env, MAIL, "auth.verifikasi_email");

    // Pendaftaran TIDAK boleh batal hanya karena email gagal…
    expect(terkirim).toBe(false);
    // …tetapi kegagalannya juga tidak boleh hilang.
    const aksi = auditTercatat.map((v) => v[3]);
    expect(aksi).toContain("email.gagal");
    const detail = String(auditTercatat.find((v) => v[3] === "email.gagal")?.[4]);
    expect(detail).toContain("auth.verifikasi_email");
    expect(detail).toContain("budi@contoh.id");
  });

  it("berhasil → true dan TIDAK menulis audit kegagalan", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"id":"x"}', { status: 200 })));
    const { env, auditTercatat } = envUji({ resendKey: "re_palsu" });

    expect(await kirimEmail(env, MAIL, "auth.verifikasi_email")).toBe(true);
    expect(auditTercatat.map((v) => v[3])).not.toContain("email.gagal");
  });

  it("jaringan mati (fetch melempar) tetap tertangkap — bukan cuma status non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network error");
      }),
    );
    const { env, auditTercatat } = envUji({ resendKey: "re_palsu" });

    expect(await kirimEmail(env, MAIL, "cron.rekap_bulanan")).toBe(false);
    expect(auditTercatat.map((v) => v[3])).toContain("email.gagal");
  });
});
