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

/**
 * Membuang kode warna ANSI sebelum mencocokkan.
 *
 * WAJIB, dan bukan kehati-hatian berlebihan: vitest mematikan warna ketika
 * keluarannya dipipa, jadi di mesin lokal ringkasannya polos dan polanya cocok.
 * Di CI warna tetap menyala, sehingga baris yang sama menjadi
 * `Tests \x1b[22m \x1b[1m\x1b[32m353 passed` — "Tests" dan angkanya tidak lagi
 * bersebelahan, dan pencarian menemukan NOL.
 *
 * Persis itu yang terjadi pada jalannya CI pertama Fase 50a: seluruh 1.131 uji
 * lulus, lalu skrip ini menggagalkan pekerjaannya sendiri. Warnanya sengaja
 * TIDAK dimatikan di anak proses — keluaran berwarna itu untuk manusia yang
 * membacanya; yang butuh teks polos hanya pencocokan di bawah ini.
 */
// ESC (`\u001b`) memang yang dicari di sini: `no-control-regex` menjaring
// karakter kontrol yang TIDAK disengaja, sedangkan awalan setiap urutan warna
// justru karakter itu. Pengecualiannya sesempit satu baris.
// eslint-disable-next-line no-control-regex
const tanpaWarna = (t) => t.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");

// vitest menutup tiap paket dengan "Tests  412 passed (412)". Bila ada yang
// di-skip bentuknya "Tests  410 passed | 2 skipped (412)" — yang dihitung tetap
// yang LULUS, sama seperti smoke dan ui-sim menghitung ✓-nya.
const polos = tanpaWarna(terkumpul);
const jumlahUji = [...polos.matchAll(/Tests\s+(\d+) passed/g)].map((m) => Number(m[1]));
const jumlahBerkas = [...polos.matchAll(/Test Files\s+\d+ passed/g)].length;

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
