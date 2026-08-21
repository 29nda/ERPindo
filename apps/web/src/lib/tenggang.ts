/**
 * Masa tenggang sisi web (Fase 20c, disatukan pada Fase 38q).
 *
 * Berkas ini dulu memuat SALINAN rumus dari `apps/api/src/lib/dunning.ts`,
 * dengan alasan yang ditulis terus terang di komentarnya: web tidak bisa
 * mengimpor dari `apps/api`. Alasan itu benar — tetapi ia hanya menuntut
 * rumusnya berada di tempat ketiga yang bisa diimpor keduanya, dan tempat itu
 * `@erpindo/shared`, yang sudah menyediakan `GRACE_DAYS` sejak awal.
 *
 * Berkas ini dipertahankan sebagai jalan masuk agar ±6 pemanggilnya tidak
 * perlu disunting; isinya kini penerusan.
 */
export { dalamTenggang, sisaTenggang } from "@erpindo/shared";
