import { PLAN_LIMITS } from "@erpindo/shared";
import { Link } from "@tanstack/react-router";
import { Check, Mail, Minus, ShieldCheck } from "lucide-react";
import { L, PublicFooter, PublicHeader, PublicShell } from "../../components/publik";
import { Button } from "../../components/ui";
import { pick, useLang, type Dual } from "../../i18n";
import { formatRupiah } from "../landing/sections";
import {
  BULAN_TIGA_TAHUN,
  SUREL_KONTAK,
  T_HARGA,
  T_KEAMANAN,
  T_KONTAK,
  T_TAMPILAN,
  T_TENTANG,
  TANGKAPAN,
} from "./teks";
import { TANGKAPAN_KOMIT, TANGKAPAN_TANGGAL } from "./tangkapanMeta";
import { BERLAKU_SEJAK, PRIVASI, SYARAT, T_LEGAL, type BagianLegal } from "./legalTeks";

/**
 * Enam halaman publik baru (Fase 38d).
 *
 * Sampai fase ini situs publik hanya punya beranda, `/fitur`, `/panduan`, dan
 * `/blog`. Harga hanyalah seksi di beranda, dan tidak ada satu pun halaman yang
 * bisa dikirim ke bagian pengadaan atau bagian hukum calon pelanggan.
 *
 * Itu masalah nyata untuk pembeli yang disasar `docs/posisi-produk.md`: pada
 * pembelian perangkat lunak perusahaan, yang menilai dan yang menyetujui adalah
 * orang berbeda — dan yang menilai bekerja dengan cara **meneruskan tautan**.
 * `/#harga` bukan tautan yang layak diteruskan.
 *
 * ## Kenapa seksi harga TIDAK dipindahkan dari beranda
 *
 * Rencana awalnya memindahkan `Pricing` dan kalkulator ke `/harga`. Itu
 * dibatalkan setelah membaca asersinya: F30b menguji bahwa harga muncul di hero
 * **sebelum** judul seksi harga, dan satu asersi lain menguji kesimpulan
 * kalkulator terbaca tanpa menggeser slider. Keduanya keputusan Fase 30b dan
 * 35c yang masih berlaku dan masih benar.
 *
 * Jadi `/harga` menjadi versi MENDALAM, bukan pemindahan: biaya kepemilikan
 * tiga tahun, batas yang memang ada, dan apa yang terjadi bila pembayaran
 * terlambat. Beranda tetap menjadi tempat harga pertama kali terbaca.
 */

/** Kepala halaman publik yang seragam untuk keenamnya. */
function Kepala({ judul, pengantar }: { judul: Dual; pengantar: Dual }) {
  const lang = useLang();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="judul-hero text-[2.25rem] sm:text-[3rem]">{pick(judul, lang)}</h1>
        <p className="mt-5 text-lg leading-[1.65] text-ink-soft">{pick(pengantar, lang)}</p>
      </div>
    </header>
  );
}

/** Satu bagian isi: judul kecil serif + isinya. */
function Bagian({
  judul,
  children,
}: {
  judul: Dual;
  children: React.ReactNode;
}) {
  const lang = useLang();
  return (
    <section className="border-b border-line py-8 last:border-0">
      <h2 className="judul text-2xl">{pick(judul, lang)}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Daftar butir bercentang — dipakai halaman harga dan keamanan. */
function Butir({ isi, ikon = "centang" }: { isi: readonly Dual[]; ikon?: "centang" | "perisai" }) {
  const lang = useLang();
  const Ikon = ikon === "perisai" ? ShieldCheck : Check;
  return (
    <ul className="space-y-3">
      {isi.map((b) => (
        <li key={b.id} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink-soft">
          <Ikon className="mt-1 size-4 shrink-0 text-ok-ink" aria-hidden />
          <span>{pick(b, lang)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Kerangka isi yang sama untuk keenam halaman. */
function Isi({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6">{children}</main>;
}

// --- /harga -----------------------------------------------------------------

export function HargaPage() {
  const lang = useLang();
  const bulanan = PLAN_LIMITS.lengkap.pricePerMonth;
  return (
    <PublicShell>
      <PublicHeader />
      <Kepala judul={T_HARGA.judul} pengantar={T_HARGA.pengantar} />
      <Isi>
        <section className="py-8">
          <div className="rounded-card border border-brand-line bg-brand-surface p-6">
            <p className="text-sm font-medium text-ink-muted">{pick(T_HARGA.kartuJudul, lang)}</p>
            <p className="num mt-2 text-4xl font-bold text-ink">{formatRupiah(bulanan)}</p>
            <p className="mt-1 text-sm text-ink-soft">{pick(T_HARGA.kartuSatuan, lang)}</p>
            <p className="mt-4 text-[13px] text-ink-muted">{pick(T_HARGA.kartuCatatan, lang)}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/daftar">
                <Button>{L(lang, "Daftar & Berlangganan", "Sign up & subscribe")}</Button>
              </Link>
              <a href="/#harga">
                <Button variant="secondary">
                  {L(lang, "Bandingkan dengan biaya per pengguna", "Compare against per-user pricing")}
                </Button>
              </a>
            </div>
          </div>
        </section>

        <Bagian judul={T_HARGA.termasukJudul}>
          <Butir isi={T_HARGA.termasuk} />
        </Bagian>

        <Bagian judul={T_HARGA.batasJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            {pick(T_HARGA.batasPengantar, lang)}
          </p>
          <p className="mt-3 flex items-start gap-3 text-[15px] leading-relaxed text-ink-soft">
            <Minus className="mt-1 size-4 shrink-0 text-awas-ink" aria-hidden />
            <span>{pick(T_HARGA.batasAi, lang)}</span>
          </p>
        </Bagian>

        <Bagian judul={T_HARGA.tigaTahunJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            {pick(T_HARGA.tigaTahunPengantar, lang)}
          </p>
          <div className="mt-4 rounded-card border border-line bg-surface p-5">
            <p className="text-sm text-ink-muted">{pick(T_HARGA.tigaTahunBaris, lang)}</p>
            <p className="num mt-1.5 text-3xl font-bold text-ink">
              {formatRupiah(bulanan * BULAN_TIGA_TAHUN)}
            </p>
          </div>
          <p className="mt-3 text-[13px] text-ink-muted">{pick(T_HARGA.tigaTahunCatatan, lang)}</p>
        </Bagian>

        <Bagian judul={T_HARGA.bandingJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_HARGA.bandingIsi, lang)}</p>
          <p className="mt-3 text-[13px] text-ink-muted">{pick(T_HARGA.bandingSumber, lang)}</p>
        </Bagian>

        <Bagian judul={T_HARGA.cobaJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_HARGA.cobaIsi, lang)}</p>
        </Bagian>

        <Bagian judul={T_HARGA.tenggangJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_HARGA.tenggangIsi, lang)}</p>
        </Bagian>
      </Isi>
      <PublicFooter />
    </PublicShell>
  );
}

// --- /keamanan --------------------------------------------------------------

export function KeamananPage() {
  const lang = useLang();
  return (
    <PublicShell>
      <PublicHeader />
      <Kepala judul={T_KEAMANAN.judul} pengantar={T_KEAMANAN.pengantar} />
      <Isi>
        <Bagian judul={T_KEAMANAN.isolasiJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_KEAMANAN.isolasiIsi, lang)}</p>
        </Bagian>
        <Bagian judul={T_KEAMANAN.aksesJudul}>
          <Butir isi={T_KEAMANAN.aksesButir} ikon="perisai" />
        </Bagian>
        <Bagian judul={T_KEAMANAN.masukJudul}>
          <Butir isi={T_KEAMANAN.masukButir} ikon="perisai" />
        </Bagian>
        <Bagian judul={T_KEAMANAN.integritasJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            {pick(T_KEAMANAN.integritasIsi, lang)}
          </p>
        </Bagian>
        <Bagian judul={T_KEAMANAN.jaringanJudul}>
          <Butir isi={T_KEAMANAN.jaringanButir} ikon="perisai" />
        </Bagian>
        <Bagian judul={T_KEAMANAN.keluarJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_KEAMANAN.keluarIsi, lang)}</p>
        </Bagian>
        {/* Seksi ini yang membuat halaman keamanan layak dipercaya. Halaman
            keamanan yang hanya memuat hal baik terbaca sebagai brosur; yang
            menyebut batasnya sendiri terbaca sebagai laporan. */}
        <Bagian judul={T_KEAMANAN.belumJudul}>
          <p className="rounded-card border border-awas-line bg-awas-surface p-4 text-[15px] leading-relaxed text-awas-ink">
            {pick(T_KEAMANAN.belumIsi, lang)}
          </p>
        </Bagian>
      </Isi>
      <PublicFooter />
    </PublicShell>
  );
}

// --- /tentang ---------------------------------------------------------------

export function TentangPage() {
  const lang = useLang();
  return (
    <PublicShell>
      <PublicHeader />
      <Kepala judul={T_TENTANG.judul} pengantar={T_TENTANG.pengantar} />
      <Isi>
        <Bagian judul={T_TENTANG.angkaJudul}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-surface p-5">
              <p className="num text-4xl font-bold text-brand-ink">68%</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {pick(T_TENTANG.angkaGagal, lang)}
              </p>
            </div>
            <div className="rounded-card border border-line bg-surface p-5">
              <p className="num text-4xl font-bold text-brand-ink">189%</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {pick(T_TENTANG.angkaBiaya, lang)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-faint">{pick(T_TENTANG.angkaSumber, lang)}</p>
        </Bagian>
        <Bagian judul={T_TENTANG.masalahJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_TENTANG.masalahIsi, lang)}</p>
        </Bagian>
        <Bagian judul={T_TENTANG.keputusanJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            {pick(T_TENTANG.keputusanIsi, lang)}
          </p>
        </Bagian>
        <Bagian judul={T_TENTANG.konsekuensiJudul}>
          <Butir isi={T_TENTANG.konsekuensi} />
        </Bagian>
        <Bagian judul={T_TENTANG.janjiJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_TENTANG.janjiIsi, lang)}</p>
        </Bagian>
      </Isi>
      <PublicFooter />
    </PublicShell>
  );
}

// --- /kontak ----------------------------------------------------------------

export function KontakPage() {
  const lang = useLang();
  return (
    <PublicShell>
      <PublicHeader />
      <Kepala judul={T_KONTAK.judul} pengantar={T_KONTAK.pengantar} />
      <Isi>
        <Bagian judul={T_KONTAK.demoJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_KONTAK.demoIsi, lang)}</p>
          <a href="/" className="mt-4 inline-block">
            <Button variant="secondary">{L(lang, "Buka demo di halaman depan", "Open the demo on the home page")}</Button>
          </a>
        </Bagian>

        <Bagian judul={T_KONTAK.surelJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_KONTAK.surelIsi, lang)}</p>
          <a
            href={`mailto:${SUREL_KONTAK}`}
            className="mt-4 inline-flex items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 text-[15px] font-medium text-ink hover:border-brand-line"
          >
            <Mail className="size-4 text-brand-ink" aria-hidden />
            {SUREL_KONTAK}
          </a>
        </Bagian>

        <Bagian judul={T_KONTAK.dukunganJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_KONTAK.dukunganIsi, lang)}</p>
        </Bagian>

        {/* Fase 27a membuang formulir "Jadwalkan demo" karena ia menjanjikan
            percakapan tanpa satu pun cara memulainya, dan asersi F48 menjaga
            keputusan itu. Halaman ini tidak membangunnya kembali — ia menyebut
            ketiadaannya sebagai sikap, karena memang begitu. */}
        <Bagian judul={T_KONTAK.jujurJudul}>
          <p className="text-[15px] leading-relaxed text-ink-soft">{pick(T_KONTAK.jujurIsi, lang)}</p>
        </Bagian>
      </Isi>
      <PublicFooter />
    </PublicShell>
  );
}

// --- /syarat & /privasi -----------------------------------------------------


/**
 * `/tampilan` (Fase 39d) — tangkapan layar aplikasi.
 *
 * Alasan halaman ini ada beserta hubungannya dengan keputusan Fase 38 ditulis
 * lengkap di atas `T_TAMPILAN` (`./teks.ts`). Yang perlu diketahui saat membaca
 * komponen ini: gambarnya dihasilkan `scripts/tangkap-layar.mjs`, bukan ditulis
 * tangan, dan umurnya sengaja ditampilkan.
 */
export function TampilanPage() {
  const lang = useLang();
  return (
    <PublicShell>
      <PublicHeader />
      <Kepala judul={T_TAMPILAN.judul} pengantar={T_TAMPILAN.pengantar} />
      <Isi>
        {/* Umur tangkapan disebut di ATAS gambarnya, bukan di kaki halaman.
            Pembaca yang menilai produk berhak tahu seberapa baru yang
            dilihatnya sebelum ia menilainya, bukan sesudah. */}
        <p className="pt-2 text-[13px] text-ink-muted">
          {pick(T_TAMPILAN.umurAwalan, lang)}{" "}
          <span className="num">{TANGKAPAN_TANGGAL}</span>{" "}
          {pick(T_TAMPILAN.umurAkhiran, lang)} <span className="num">{TANGKAPAN_KOMIT}</span>.
        </p>

        <div className="space-y-12 py-8">
          {TANGKAPAN.map((t) => (
            <figure key={t.berkas}>
              <figcaption className="mb-3">
                <h2 className="judul text-xl text-ink">{pick(t.judul, lang)}</h2>
                <p className="mt-1.5 max-w-[46rem] text-[15px] leading-relaxed text-ink-soft">
                  {pick(t.isi, lang)}
                </p>
              </figcaption>
              {/* `loading="lazy"` + width/height: sepuluh gambar sekaligus akan
                  menahan muat halaman pertama, dan dimensi yang disebutkan
                  mencegah tata letak melompat saat tiap gambar tiba. */}
              <img
                src={`/tampilan/${t.berkas}.webp`}
                alt={pick(t.judul, lang)}
                width={1200}
                height={750}
                loading="lazy"
                decoding="async"
                className="w-full rounded-card border border-line shadow-card"
              />
            </figure>
          ))}
        </div>

        <section className="border-t border-line py-8">
          <h2 className="judul text-xl text-ink">{pick(T_TAMPILAN.peragaanJudul, lang)}</h2>
          <p className="mt-2 max-w-[46rem] text-[15px] leading-relaxed text-ink-soft">
            {pick(T_TAMPILAN.peragaanIsi, lang)}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/">
              <Button>{L(lang, "Lihat demo berisi data", "Open the demo with real data")}</Button>
            </a>
            <Link to="/daftar">
              <Button variant="secondary">{L(lang, "Daftar & Berlangganan", "Sign up & subscribe")}</Button>
            </Link>
          </div>
        </section>
      </Isi>
      <PublicFooter />
    </PublicShell>
  );
}

function HalamanLegal({ judul, bagian }: { judul: Dual; bagian: BagianLegal[] }) {
  const lang = useLang();
  return (
    <PublicShell>
      <PublicHeader />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="judul-hero text-[2rem] sm:text-[2.5rem]">{pick(judul, lang)}</h1>
          <p className="mt-3 text-sm text-ink-muted">
            {pick(T_LEGAL.berlakuLabel, lang)}: {BERLAKU_SEJAK}
          </p>
          {/* Spanduk draf, dan sengaja mencolok. Dokumen ini akan dibaca bagian
              hukum calon pelanggan; penampung identitas yang terlewat jauh
              lebih mahal daripada spanduk yang terlalu terlihat. */}
          <p className="mt-5 rounded-card border border-awas-line bg-awas-surface p-4 text-sm leading-relaxed text-awas-ink">
            <strong>{pick(T_LEGAL.spandukJudul, lang)}.</strong> {pick(T_LEGAL.spandukIsi, lang)}
          </p>
          <p className="mt-3 text-[13px] text-ink-muted">{pick(T_LEGAL.bahasaCatatan, lang)}</p>
        </div>
      </header>
      <Isi>
        <div className="py-8">
          {bagian.map((b) => (
            <section key={b.judul} className="border-b border-line py-6 first:pt-0 last:border-0">
              <h2 className="text-base font-semibold text-ink">{b.judul}</h2>
              {b.paragraf.map((p, i) => (
                <p key={i} className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </Isi>
      <PublicFooter />
    </PublicShell>
  );
}

export function SyaratPage() {
  return <HalamanLegal judul={{ id: "Syarat Layanan", en: "Terms of Service" }} bagian={SYARAT} />;
}

export function PrivasiPage() {
  return (
    <HalamanLegal judul={{ id: "Kebijakan Privasi", en: "Privacy Policy" }} bagian={PRIVASI} />
  );
}
