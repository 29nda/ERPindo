#!/usr/bin/env node
// Pembungkus `pnpm -r test` (Fase 50a).
//
// ## Kenapa ada pembungkus, bukan gerbang terpisah
//
// Angka unit test diumumkan ke pemilik di `docs/STATUS.md` dan
// `docs/05-runbook-go-live.md`. Yang tahu angka itu sebenarnya hanya vitest,
// dan hanya setelah ia selesai berjalan. Gerbang terpisah berarti menjalankan
// seluruh suite DUA KALI hanya untuk membaca satu angka — jadi pemeriksaannya
// ditempelkan pada satu-satunya kali suite itu memang dijalankan.
//
// Skrip ini tidak mengubah apa pun soal cara uji berjalan: keluarannya
// diteruskan apa adanya, kode keluarnya diteruskan apa adanya. Yang ditambahkan
// hanya satu hal di ujung — mencocokkan jumlah yang lulus dengan yang tertulis.
import { spawn } from "node:child_process";
import { laporAngkaGerbang } from "./lib/angka-gerbang.mjs";

const anak = spawn("pnpm", ["-r", "test"], {
  stdio: ["inherit", "pipe", "pipe"],
  shell: process.platform === "win32",
});

let terkumpul = "";
for (const [aliran, tujuan] of [
  [anak.stdout, process.stdout],
  [anak.stderr, process.stderr],
]) {
  aliran.on("data", (d) => {
    terkumpul += d.toString();
    tujuan.write(d);
  });
}

const kode = await new Promise((resolve) => {
  anak.on("error", (e) => {
    console.error("Gagal menjalankan `pnpm -r test`:", e.message);
    resolve(1);
  });
  anak.on("close", resolve);
});

// Uji yang gagal adalah beritanya; angka dokumen tidak relevan sampai hijau.
if (kode !== 0) process.exit(kode ?? 1);

// vitest menutup tiap paket dengan "Tests  412 passed (412)". Bila ada yang
// di-skip bentuknya "Tests  410 passed | 2 skipped (412)" — yang dihitung tetap
// yang LULUS, sama seperti smoke dan ui-sim menghitung ✓-nya.
const jumlahUji = [...terkumpul.matchAll(/Tests\s+(\d+) passed/g)].map((m) => Number(m[1]));
const jumlahBerkas = [...terkumpul.matchAll(/Test Files\s+\d+ passed/g)].length;

// Penjaga bagi penjaganya: kalau vitest mengubah bentuk ringkasannya, parsing
// ini akan diam-diam menemukan nol dan meloloskan angka apa pun. Tiga paket
// (`packages/shared`, `apps/web`, `apps/api`) masing-masing harus menyumbang
// satu ringkasan.
if (jumlahUji.length < 3 || jumlahUji.length !== jumlahBerkas) {
  console.error(
    `\n✗ Ringkasan vitest tidak terbaca: ${jumlahUji.length} baris "Tests N passed" ` +
      `vs ${jumlahBerkas} baris "Test Files N passed" (minimal 3, harus sama).\n` +
      `  Bentuk keluaran vitest berubah — perbarui scripts/uji-unit.mjs.\n`,
  );
  process.exit(1);
}

const unit = jumlahUji.reduce((a, b) => a + b, 0);
process.exit(laporAngkaGerbang({ unit }) > 0 ? 1 : 0);
