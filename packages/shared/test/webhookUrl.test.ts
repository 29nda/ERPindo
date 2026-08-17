import { describe, expect, it } from "vitest";
import { alasanTolakUrlWebhook, webhookSchema, webhookUrlAman } from "../src/publicApi";

/**
 * Kebijakan tujuan webhook keluar (Fase 26d, temuan audit E).
 *
 * Sebelum ini validasinya hanya `z.string().url()` — pemeriksaan **bentuk**,
 * bukan jaringan. Ia meloloskan `http://localhost`, `http://10.0.0.1`,
 * `http://[::1]`, dan `http://169.254.169.254`.
 *
 * Batasnya dinyatakan apa adanya: runtime-nya Cloudflare Workers, yang tidak
 * punya jaringan internal maupun endpoint metadata, jadi pivot SSRF ala VM
 * memang tidak berlaku. Yang benar-benar ditutup di sini: payload berisi data
 * bisnis pelanggan tidak lagi bisa dikirim lewat `http://` polos, tujuan
 * internal ditolak sejak disimpan, dan kredensial tidak ikut mengendap di
 * database.
 */

const ditolak = [
  ["http polos ke domain publik", "http://contoh.id/hook"],
  ["localhost", "http://localhost/hook"],
  ["localhost https", "https://localhost/hook"],
  ["subdomain .localhost", "https://api.localhost/hook"],
  ["mDNS .local", "https://nas.local/hook"],
  ["loopback IPv4", "https://127.0.0.1/hook"],
  ["loopback IPv4 lain", "https://127.9.9.9/hook"],
  ["IPv6 loopback", "https://[::1]/hook"],
  ["IPv6 unspecified", "https://[::]/hook"],
  ["IPv6 link-local", "https://[fe80::1]/hook"],
  ["IPv6 unique-local", "https://[fd00::1]/hook"],
  ["IPv4-mapped ke loopback", "https://[::ffff:127.0.0.1]/hook"],
  ["privat 10/8", "https://10.0.0.1/hook"],
  ["privat 172.16/12", "https://172.20.1.5/hook"],
  ["privat 192.168/16", "https://192.168.1.1/hook"],
  ["link-local / metadata", "https://169.254.169.254/latest/meta-data"],
  ["CGNAT 100.64/10", "https://100.64.0.1/hook"],
  ["0.0.0.0", "https://0.0.0.0/hook"],
  ["multicast", "https://239.1.1.1/hook"],
  ["kredensial di URL", "https://pengguna:sandi@contoh.id/hook"],
  ["skema bukan http(s)", "ftp://contoh.id/hook"],
  ["bukan URL", "bukan-url"],
  ["kosong", ""],
] as const;

const diterima = [
  ["https publik", "https://contoh.id/hook"],
  ["https dengan porta", "https://contoh.id:8443/hook"],
  ["https subdomain + query", "https://api.contoh.id/erp/hook?src=erpindo"],
  ["IP publik", "https://8.8.8.8/hook"],
  ["IPv6 publik", "https://[2001:db8::1]/hook"],
] as const;

describe("webhookUrlAman", () => {
  for (const [nama, url] of ditolak) {
    it(`TOLAK ${nama}`, () => {
      expect(webhookUrlAman(url)).toBe(false);
    });
  }

  for (const [nama, url] of diterima) {
    it(`TERIMA ${nama}`, () => {
      expect(webhookUrlAman(url)).toBe(true);
    });
  }

  it("alasan penolakan spesifik — untuk pesan yang bisa ditindaklanjuti", () => {
    expect(alasanTolakUrlWebhook("http://contoh.id")).toBe("skema");
    expect(alasanTolakUrlWebhook("https://a:b@contoh.id")).toBe("kredensial");
    expect(alasanTolakUrlWebhook("https://10.0.0.1")).toBe("host-internal");
    expect(alasanTolakUrlWebhook("ngawur")).toBe("bentuk");
    expect(alasanTolakUrlWebhook("https://contoh.id")).toBeNull();
  });
});

describe("webhookSchema", () => {
  it("menolak tujuan internal beserta pesannya, bukan sekadar 'tidak valid'", () => {
    const hasil = webhookSchema.safeParse({ url: "http://127.0.0.1/hook", events: ["invoice.created"] });
    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      // Pesan harus menyebut https, karena itulah yang harus diperbaiki pengguna.
      expect(hasil.error.flatten().fieldErrors.url?.join(" ")).toMatch(/https/i);
    }
  });

  it("menerima tujuan https publik", () => {
    expect(webhookSchema.safeParse({ url: "https://contoh.id/hook", events: ["invoice.created"] }).success).toBe(true);
  });
});
