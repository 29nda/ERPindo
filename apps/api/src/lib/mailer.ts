import type { Env } from "../env";
import { audit } from "./audit";

export type Mail = {
  to: string;
  subject: string;
  text: string;
};

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Dev/test: email dicetak ke log wrangler sehingga link bisa diambil manual. */
class ConsoleMailer implements Mailer {
  async send(mail: Mail): Promise<void> {
    console.log(`[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
  }
}

/** Produksi: kirim via Resend bila RESEND_API_KEY tersedia. */
class ResendMailer implements Mailer {
  constructor(
    private apiKey: string,
    private from: string,
  ) {}

  async send(mail: Mail): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: this.from, to: [mail.to], subject: mail.subject, text: mail.text }),
    });
    // MELEMPAR, bukan sekadar mencatat ke console. Versi sebelumnya menelan
    // kegagalan dan tetap kembali normal, sehingga pemanggilnya percaya email
    // terkirim: pengguna melihat "email verifikasi terkirim" padahal tidak
    // pernah terkirim. Penyebab paling lazim justru yang paling sunyi — domain
    // pengirim belum diverifikasi di Resend, yaitu keadaan normal pada hari
    // pertama sebuah kunci dipasang.
    if (!res.ok) {
      throw new Error(`Resend menolak (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
  }
}

export function getMailer(env: Env): Mailer {
  if (env.RESEND_API_KEY) {
    return new ResendMailer(env.RESEND_API_KEY, env.MAIL_FROM ?? "ERPindo <no-reply@erpindo.id>");
  }
  return new ConsoleMailer();
}

/**
 * Kirim email tanpa pernah menggagalkan alur pemanggilnya, tetapi **selalu
 * meninggalkan jejak** bila gagal.
 *
 * Ini pemisahan yang penting: `Mailer.send` jujur (melempar saat gagal), dan
 * keputusan "boleh gagal atau tidak" diambil di sini, satu tempat. Pendaftaran
 * tidak boleh batal hanya karena email tak terkirim — tetapi kegagalannya juga
 * tidak boleh hilang, karena "email tidak sampai" adalah keluhan hari pertama
 * yang paling sulit didiagnosa bila tak ada catatannya sama sekali.
 *
 * Mengembalikan `true` bila terkirim.
 */
export async function kirimEmail(env: Env, mail: Mail, konteks: string): Promise<boolean> {
  try {
    await getMailer(env).send(mail);
    return true;
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    console.error(`[mail] GAGAL (${konteks}) ke=${mail.to}: ${pesan}`);
    await audit(env, {
      action: "email.gagal",
      detail: { konteks, tujuan: mail.to, subjek: mail.subject, pesan },
    });
    return false;
  }
}
