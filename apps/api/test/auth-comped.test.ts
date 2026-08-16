import { describe, expect, it } from "vitest";
import type { Env } from "../src/env";
import { isComped } from "../src/routes/auth";

/**
 * `COMPED_EMAILS` — daftar email "akun rumah" yang kebal paywall (Fase 4a).
 *
 * Aturan parsingnya menentukan hal-hal besar: perusahaan lahir `active` +
 * paket `enterprise` atau `provisioning` + `starter`, dan pagar "aktifkan
 * langganan dulu sebelum menambah perusahaan" dilewati atau tidak. Sampai
 * Fase 25c aturan itu **tidak pernah diuji sama sekali**, padahal satu spasi
 * atau satu huruf kapital yang tak tertangani cukup membuat pemilik
 * diperlakukan sebagai pendaftar biasa — persis yang terjadi saat penyemaian
 * demo 14 Agustus menghasilkan perusahaan berpaket `starter`.
 */
const env = (comped?: string) => ({ COMPED_EMAILS: comped }) as Env;

describe("isComped (COMPED_EMAILS)", () => {
  it("cocok persis", () => {
    expect(isComped(env("pemilik@contoh.com"), "pemilik@contoh.com")).toBe(true);
    expect(isComped(env("pemilik@contoh.com"), "orang.lain@contoh.com")).toBe(false);
  });

  it("tidak peduli besar-kecil huruf di kedua sisi", () => {
    expect(isComped(env("Pemilik@Contoh.COM"), "pemilik@contoh.com")).toBe(true);
    expect(isComped(env("pemilik@contoh.com"), "PEMILIK@CONTOH.COM")).toBe(true);
  });

  it("memangkas spasi di sekitar entri dan menerima banyak email", () => {
    const daftar = " satu@contoh.com , dua@contoh.com ,tiga@contoh.com";
    expect(isComped(env(daftar), "dua@contoh.com")).toBe(true);
    expect(isComped(env(daftar), "tiga@contoh.com")).toBe(true);
    expect(isComped(env(daftar), "empat@contoh.com")).toBe(false);
  });

  it("entri kosong diabaikan — koma nyasar tidak membuat semua orang comped", () => {
    // Tanpa `.filter(Boolean)`, string kosong hasil ",," akan cocok dengan
    // email kosong; yang lebih berbahaya, var berisi "," saja menjadi daftar
    // berisi satu entri kosong.
    expect(isComped(env("satu@contoh.com,,"), "")).toBe(false);
    expect(isComped(env(",,"), "")).toBe(false);
    expect(isComped(env(",,"), "siapa@pun.com")).toBe(false);
  });

  it("var tidak terpasang → tidak ada yang comped", () => {
    expect(isComped(env(undefined), "pemilik@contoh.com")).toBe(false);
    expect(isComped(env(""), "pemilik@contoh.com")).toBe(false);
  });
});
