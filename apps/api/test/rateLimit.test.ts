import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { AppEnv } from "../src/env";
import { rateLimit, rateLimitUser } from "../src/middleware/rateLimit";

/**
 * Penghitung in-memory yang meniru Durable Object (Fase 30e).
 *
 * Menggantikan tiruan KV. Perilaku yang diuji SENGAJA tidak berubah satu pun:
 * seluruh asersi di bawah ini sama persis dengan sebelum pergantian backend —
 * itulah buktinya bahwa yang berpindah adalah tempat menyimpan angkanya, bukan
 * aturan pembatasannya.
 *
 * `tulis` menghitung berapa kali status disimpan. Dipakai satu uji khusus untuk
 * mengunci sifat yang menjadi ALASAN fase ini ada: penghitungan tidak lagi
 * memakan kuota tulis KV, dan request yang DITOLAK tidak menulis apa-apa.
 */
function makePenghitung() {
  const store = new Map<string, number>();
  let tulis = 0;
  return {
    tulis: () => tulis,
    penghitung: {
      async bolehLanjut(kunci: string, limit: number) {
        const n = store.get(kunci) ?? 0;
        if (n >= limit) return false;
        store.set(kunci, n + 1);
        tulis++;
        return true;
      },
    },
  };
}

function appWith(mw: ReturnType<typeof rateLimit>, user?: { id: string }) {
  const app = new Hono<AppEnv>();
  if (user) app.use(async (c, next) => {
    c.set("user", user as never);
    await next();
  });
  app.get("/x", mw, (c) => c.json({ ok: true }));
  return app;
}

const env = () => ({ __penghitungBatas: makePenghitung().penghitung }) as unknown as AppEnv["Bindings"];

describe("rateLimit per-IP", () => {
  it("melewati batas → 429; di bawah batas → 200", async () => {
    const app = appWith(rateLimit({ key: "t", limit: 2, windowSeconds: 60 }));
    const e = env();
    const req = () => app.request("/x", { headers: { "cf-connecting-ip": "1.2.3.4" } }, e);
    expect((await req()).status).toBe(200);
    expect((await req()).status).toBe(200);
    expect((await req()).status).toBe(429);
  });

  it("IP berbeda punya bucket sendiri", async () => {
    const app = appWith(rateLimit({ key: "t", limit: 1, windowSeconds: 60 }));
    const e = env();
    expect((await app.request("/x", { headers: { "cf-connecting-ip": "1.1.1.1" } }, e)).status).toBe(200);
    expect((await app.request("/x", { headers: { "cf-connecting-ip": "2.2.2.2" } }, e)).status).toBe(200);
    expect((await app.request("/x", { headers: { "cf-connecting-ip": "1.1.1.1" } }, e)).status).toBe(429);
  });

  it("tanpa header IP → pembatasan dilewati (tidak lagi berbagi bucket 'unknown')", async () => {
    const app = appWith(rateLimit({ key: "t", limit: 1, windowSeconds: 60 }));
    const e = env();
    expect((await app.request("/x", {}, e)).status).toBe(200);
    expect((await app.request("/x", {}, e)).status).toBe(200);
    expect((await app.request("/x", {}, e)).status).toBe(200);
  });
});

describe("backend Durable Object (Fase 30e)", () => {
  it("request yang DITOLAK tidak menulis status apa pun", async () => {
    // Inti alasan fase ini ada. Versi KV menulis pada setiap request terjaga
    // termasuk yang ditolak, sehingga penyerang yang membanjiri endpoint login
    // justru MEMPERCEPAT habisnya kuota tulis 1.000/hari paket gratis —
    // pembatas yang seharusnya melindungi malah menjadi jalur menjatuhkannya.
    const h = makePenghitung();
    const e = { __penghitungBatas: h.penghitung } as unknown as AppEnv["Bindings"];
    const app = appWith(rateLimit({ key: "t", limit: 2, windowSeconds: 60 }));
    const req = () => app.request("/x", { headers: { "cf-connecting-ip": "5.5.5.5" } }, e);
    await req();
    await req();
    expect(h.tulis()).toBe(2);
    await req(); // ditolak
    await req(); // ditolak
    expect(h.tulis()).toBe(2);
  });

  it("tanpa binding penghitung → pembatasan DILEWATI, bukan menggagalkan request", async () => {
    // Degradasi anggun, pola yang sudah baku di repo ini. Menggagalkan seluruh
    // request karena pembatas tidak terpasang akan mengubah fitur pelindung
    // menjadi titik kegagalan tunggal.
    const app = appWith(rateLimit({ key: "t", limit: 1, windowSeconds: 60 }));
    const kosong = {} as unknown as AppEnv["Bindings"];
    const req = () => app.request("/x", { headers: { "cf-connecting-ip": "7.7.7.7" } }, kosong);
    expect((await req()).status).toBe(200);
    expect((await req()).status).toBe(200);
  });

  it("TIDAK menyentuh RATE_KV sama sekali", async () => {
    // Penegak pencabutan: bila seseorang mengembalikan jalur KV, uji ini gagal.
    let disentuh = false;
    const e = {
      __penghitungBatas: makePenghitung().penghitung,
      RATE_KV: {
        get: async () => {
          disentuh = true;
          return null;
        },
        put: async () => {
          disentuh = true;
        },
      },
    } as unknown as AppEnv["Bindings"];
    const app = appWith(rateLimit({ key: "t", limit: 5, windowSeconds: 60 }));
    await app.request("/x", { headers: { "cf-connecting-ip": "8.8.8.8" } }, e);
    expect(disentuh).toBe(false);
  });
});

describe("rateLimitUser per-pengguna", () => {
  it("kunci = user id: melewati batas → 429", async () => {
    const app = appWith(rateLimitUser({ key: "reports", limit: 2, windowSeconds: 60 }), { id: "user-a" });
    const e = env();
    expect((await app.request("/x", {}, e)).status).toBe(200);
    expect((await app.request("/x", {}, e)).status).toBe(200);
    const blocked = await app.request("/x", {}, e);
    expect(blocked.status).toBe(429);
    expect(((await blocked.json()) as { error: string }).error).toMatch(/Terlalu banyak permintaan/);
  });

  it("tanpa konteks user → fallback IP", async () => {
    const app = appWith(rateLimitUser({ key: "reports", limit: 1, windowSeconds: 60 }));
    const e = env();
    const req = () => app.request("/x", { headers: { "cf-connecting-ip": "9.9.9.9" } }, e);
    expect((await req()).status).toBe(200);
    expect((await req()).status).toBe(429);
  });
});
