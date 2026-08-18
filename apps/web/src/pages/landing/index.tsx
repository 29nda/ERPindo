import { ASSUMED_PER_USER_PRICE, perUserMonthlyCost, PLAN_LIMITS } from "@erpindo/shared";
import { Link } from "@tanstack/react-router";
import { Check, Eye, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { BrandWordmark, Button } from "../../components/ui";
import { PublicHeader, TAUTAN_BERANDA } from "../../components/publik";
import { pick, useLang, type Lang } from "../../i18n";
import {
  COMPARISON,
  FAQ,
  formatRupiah,
  SECURITY_POINTS,
  SHOWCASE,
  SINGLE_PLAN_MODULES,
  TRUST_POINTS,
} from "./sections";

/**
 * Landing page marketing — halaman konversi utama. Konten di sections.ts;
 * gambar produk asli (WebP) dilayani statis dari /landing/*.
 */

/** Helper pilih string sesuai bahasa aktif (landing). */
function L(lang: Lang, id: string, en: string): string {
  return lang === "en" ? en : id;
}

/**
 * Tombol "Lihat Demo" — membuat sesi baca-saja di perusahaan demo tanpa
 * mendaftar (POST /api/auth/demo), lalu pindah ke aplikasi. Navigasi keras
 * agar sesi & /me dimuat segar.
 */
/**
 * Fase 27a: `variant` bisa disetel. Sebelumnya tombol ini SELALU `secondary`,
 * sama dengan tombol daftar di sebelahnya — jadi hero punya dua kotak putih
 * identik dan tidak ada satu pun ajakan yang menonjol. Fase 24 memutuskan demo
 * menjadi ajakan utama (tanpa masa coba, "lihat" mendahului "daftar"); di sinilah
 * keputusan itu akhirnya terlihat.
 */
function DemoButton({ size = "lg", variant = "primary" }: { size?: "md" | "lg"; variant?: "primary" | "secondary" }) {
  const lang = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="inline-flex flex-col items-center">
      <Button
        variant={variant}
        size={size}
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError("");
          api
            .demoLogin()
            .then(() => window.location.assign("/app"))
            .catch(() => {
              // Fase 31g: pesan galat server SENGAJA tidak diteruskan apa adanya.
              //
              // Sebelumnya `err.message` ditampilkan langsung, sehingga calon
              // pelanggan membaca "Akun demo belum disiapkan." — kalimat yang
              // ditulis untuk operator, bukan pengunjung. Bagi mereka itu
              // terbaca seperti aplikasi yang rusak, tepat pada satu-satunya
              // ajakan utama halaman ini.
              //
              // Sekarang kalimatnya jujur tanpa membocorkan keadaan internal,
              // dan menawarkan langkah berikutnya alih-alih berhenti. Sisi
              // operator tidak kehilangan apa pun: /app/admin → Infra kini
              // menyatakan persis apa yang kurang dan cara memperbaikinya.
              setError(
                L(
                  lang,
                  "Demo sedang disiapkan. Sementara ini, daftar saja — akun langsung bisa dipakai.",
                  "The demo is being prepared. In the meantime, just sign up — your account works right away.",
                ),
              );
              setBusy(false);
            });
        }}
      >
        <Eye className="size-4" aria-hidden /> {busy ? L(lang, "Menyiapkan demo…", "Preparing demo…") : L(lang, "Lihat Demo", "View Demo")}
      </Button>
      {error ? <span className="mt-1 text-xs text-red-500">{error}</span> : null}
    </span>
  );
}

function Hero() {
  const lang = useLang();
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Kisi tipis menggantikan "orb" gradien buram khas landing SaaS. Gaya
          alat: garis, bukan kabut. Digambar dengan gradien CSS (tanpa aset). */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(to bottom, black, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 78%)",
        }}
        aria-hidden
      />
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-24 lg:pt-32">
        {/* `uppercase` aman di sini: tak satu pun asersi membaca kalimat ini.
            Aturannya (lihat log 17d): JANGAN pakai `uppercase` pada teks yang
            dibaca asersi innerText — `text-transform` ikut mengubah nilainya. */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
          <Sparkles className="size-3.5" aria-hidden />{" "}
          {L(lang, "Dibuat untuk usaha di Indonesia", "Built for businesses in Indonesia")}
        </div>
        {/* Rata kiri, bukan rata tengah: halaman ini menjual alat kerja, dan
            teks rata tengah membuat semuanya terbaca seperti brosur. */}
        <h1 className="judul-hero max-w-4xl text-[2.75rem] sm:text-[4.25rem]">
          {L(lang, "Pembukuan, stok, gaji, dan pajak —", "Accounting, stock, payroll, and tax —")}{" "}
          <span className="text-brand-600 dark:text-brand-400">
            {L(lang, "beres dalam satu aplikasi", "all in one app")}
          </span>
        </h1>
        <p className="mt-7 max-w-[34rem] text-lg leading-[1.7] text-ink-soft">
          {L(
            lang,
            "Catat penjualan sekali saja. Stok langsung berkurang, laporan keuangan terisi, dan pajaknya ikut terhitung. Tidak perlu dipindah lagi ke Excel.",
            "Record a sale once. Stock drops, the financial reports fill in, and the tax is worked out too. Nothing needs copying into Excel afterwards.",
          )}
        </p>
        {/* Fase 24: urutannya SENGAJA dibalik. Tanpa trial, hal pertama yang
            bisa dilakukan pengunjung bukan lagi "coba" melainkan "lihat" —
            jadi demo yang berisi data nyata naik jadi ajakan utama,
            dan mendaftar menyusul setelah ia melihat isinya. */}
        <div className="mt-9 flex flex-wrap items-start gap-3">
          <DemoButton />
          <Link to="/daftar">
            <Button variant="secondary" size="lg">
              {L(lang, "Daftar & Berlangganan", "Sign up & subscribe")}
            </Button>
          </Link>
        </div>
        {/* Fase 30b: harga dinyatakan DI HERO, bukan hanya di seksi harga yang
            harus digulir dulu. Sebelum paket tunggal, menyebut harga di sini
            mustahil — ada tiga angka dan yang mana pun dipilih akan menyesatkan.
            Dengan satu harga, angkanya justru menjadi kalimat penjualan terkuat
            dan menahannya sampai bawah halaman hanya membuang perhatian. */}
        <p className="mt-6 text-base text-ink">
          <span className="num font-bold text-ink">
            {formatRupiah(PLAN_LIMITS.lengkap.pricePerMonth)}
          </span>{" "}
          <span className="text-ink-muted">{L(lang, "/bulan/perusahaan", "/month/company")}</span>
          {" — "}
          {L(
            lang,
            "satu harga, seluruh modul terbuka, pengguna tak terbatas.",
            "one price, every module unlocked, unlimited users.",
          )}
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          {L(
            lang,
            "Tanpa kartu kredit. Daftar akun standar Indonesia sudah terisi. Demo bisa dibuka tanpa mendaftar.",
            "No credit card. A standard Indonesian chart of accounts is already set up. The demo opens without signing up.",
          )}
        </p>
      </div>

      {/* Screenshot produk nyata. Bingkainya bukan lagi jendela macOS bertitik
          tiga (klise landing SaaS) melainkan bilah alat rapat dengan jalur rute
          bergaya mono — sama seperti aplikasinya sendiri. */}
      <div className="mx-auto mt-12 max-w-6xl px-4 sm:mt-20 sm:px-6">
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] text-ink-muted">
              ERPindo / dashboard
            </span>
          </div>
          <img
            src="/landing/hero-dashboard.webp"
            alt="Dashboard ERPindo dengan grafik penjualan 30 hari dan ringkasan keuangan"
            width={1400}
            height={875}
            className="w-full"
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const lang = useLang();
  // Angka memakai utilitas `num` (mono + tabular) — di sinilah font angka yang
  // ditambahkan Fase 17a terbayar: deretan statistik jadi berbaris rapi.
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-line px-4 sm:px-6 lg:grid-cols-4 lg:divide-x">
        {TRUST_POINTS.map((s) => (
          <div key={s.label.id} className="px-4 py-6 first:pl-0 lg:last:pr-0">
            <s.icon className="size-5 text-brand-600 dark:text-brand-400" aria-hidden />
            {/* Fase 32e: `num` (mono + tabular) DIBUANG. Utilitas itu ada untuk angka —
                dan bilah ini memang dulu berisi angka. Sejak isinya menjadi kalimat
                pendek, mono berukuran 2xl memecahnya jadi tiga baris di layar 390px.
                Serif memberi bobot yang sama tanpa memaksa lebar per karakter. */}
            <div className="judul mt-3 text-lg text-ink">{pick(s.value, lang)}</div>
            <div className="mt-1 text-[13px] text-ink-muted">{pick(s.label, lang)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Showcase() {
  const lang = useLang();
  const [active, setActive] = useState("pos");
  const item = SHOWCASE.find((s) => s.id === active) ?? SHOWCASE[0]!;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:py-32 sm:px-6">
      <h2 className="judul text-[2rem] sm:text-[2.5rem]">{L(lang, "Lihat cara kerjanya", "See how it works")}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
        {L(lang, "Lima pekerjaan yang paling menyita waktu. Pilih satu untuk melihat tampilan aslinya.", "The five jobs that eat the most time. Pick one to see what it actually looks like.")}
      </p>
      {/* Tab bergaya bilah alat: sudut tegas, berdempetan dalam satu bingkai —
          bukan pil melayang berbayang. */}
      <div className="mt-8 flex flex-wrap gap-2">
        {SHOWCASE.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              s.id === active
                ? "bg-brand-600 text-white shadow-sm"
                : "border border-line bg-surface text-ink-soft hover:bg-surface-sunken"
            }`}
          >
            <s.icon className="size-4" aria-hidden /> {pick(s.label, lang)}
          </button>
        ))}
      </div>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <img
            key={item.image}
            src={item.image}
            alt={`${L(lang, "Tampilan", "View of")} ${pick(item.title, lang)} — ${pick(item.benefits[0]!, lang)}`}
            width={1100}
            height={688}
            loading="lazy"
            decoding="async"
            className="w-full"
          />
        </div>
        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <h3 className="text-lg font-semibold">{pick(item.title, lang)}</h3>
          <ul className="mt-3 divide-y divide-line">
            {item.benefits.map((b) => (
              <li key={b.id} className="flex items-start gap-2.5 py-2.5 text-sm leading-relaxed text-ink-soft">
                <Check className="mt-0.5 size-3.5 shrink-0 text-accent-500" aria-hidden />
                {pick(b, lang)}
              </li>
            ))}
          </ul>
          <Link to="/daftar" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">{L(lang, "Mulai pakai alur ini →", "Start using this flow →")}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  const lang = useLang();
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:py-32 sm:px-6">
      <h2 className="judul text-[2rem] sm:text-[2.5rem]">{L(lang, "Masih pakai buku & Excel?", "Still using ledgers & Excel?")}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
        {L(lang, "Bukan soal rapi atau berantakan. Soal berapa jam yang habis tiap bulan, dan selisih yang baru ketahuan waktu tutup buku.", "It is not about being tidy. It is about the hours that disappear each month, and the gaps you only find at closing.")}
      </p>
      {/* Fase 32e — di layar kecil tabel ini MENUMPUK jadi kartu.
          Sebelumnya ia `min-w-[640px]` di dalam wadah bergulir: tidak memecah
          halaman, tetapi kolom ketiga — satu-satunya kolom yang menjual —
          berada DI LUAR layar sampai pengunjung tahu harus menggeser tabel ke
          samping. Kebanyakan tidak tahu.
          Tekniknya sama dengan `<Table>` di components/ui.tsx (Fase 18d):
          seluruh elemen tabel jadi `block`, kepala tabel disembunyikan, dan
          tiap baris berdiri sebagai kartu. */}
      <div className="mt-6 md:overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-card border border-line text-[13px] max-md:block max-md:border-0 md:min-w-[640px] max-md:[&>tbody]:block">
          <thead className="max-md:hidden">
            <tr className="bg-surface-muted text-left">
              <th className="px-3 py-2 text-[11px] font-semibold tracking-wider">{L(lang, "Pekerjaan", "Task")}</th>
              <th className="px-3 py-2 text-[11px] font-semibold tracking-wider text-ink-muted">{L(lang, "Manual / Excel", "Manual / Excel")}</th>
              <th className="bg-brand-600 px-3 py-2 text-[11px] font-semibold tracking-wider text-white">{L(lang, "Dengan ERPindo", "With ERPindo")}</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row, i) => (
              <tr
                key={row.topic.id}
                className={`max-md:mb-3 max-md:block max-md:rounded-card max-md:border max-md:border-line max-md:bg-surface max-md:p-4 ${i % 2 === 0 ? "bg-surface" : "bg-surface-sunken"}`}
              >
                <td className="px-3 py-2 font-medium max-md:block max-md:px-0 max-md:pb-3 max-md:pt-0 max-md:text-[15px]">
                  {pick(row.topic, lang)}
                </td>
                <td className="px-3 py-2 text-ink-muted max-md:block max-md:px-0 max-md:py-1">
                  <span className="flex items-start gap-2">
                    <X className="mt-0.5 size-3.5 shrink-0 text-red-400" aria-hidden /> {pick(row.manual, lang)}
                  </span>
                </td>
                <td className="bg-brand-50/60 px-3 py-2 text-ink max-md:mt-2 max-md:block max-md:rounded-control max-md:px-3 max-md:py-2 dark:bg-brand-950/40">
                  <span className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" aria-hidden /> {pick(row.erpindo, lang)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Isi paket tunggal (Fase 30). Dulu tiga `TierInfo` — Starter/Business/
 * Enterprise — yang masing-masing menahan sebagian modul. Pemaketan itu
 * dibubarkan: satu harga, seluruh modul.
 *
 * Daftar ini karena itu berhenti menjadi "apa yang TIDAK Anda dapat di paket
 * murah" dan menjadi "apa yang Anda dapat", yang jauh lebih mudah dipercaya
 * calon pelanggan karena tidak ada yang perlu dicurigai tersembunyi.
 */
const PAKET_FITUR: { id: string; en: string }[] = [
  { id: "Akuntansi double-entry, penjualan & pembelian", en: "Double-entry accounting, sales & purchasing" },
  { id: "Kasir (POS) + stok multi-gudang & FEFO", en: "POS + multi-warehouse stock & FEFO" },
  { id: "Pajak: PPN, PPh final, e-Faktur & Coretax", en: "Tax: VAT, final income tax, e-Faktur & Coretax" },
  { id: "HR & Payroll (PPh 21 TER + BPJS)", en: "HR & Payroll (income tax TER + social security)" },
  { id: "Proyek, manufaktur, pengadaan & CRM", en: "Projects, manufacturing, procurement & CRM" },
  { id: "Multi-entitas + laporan konsolidasi", en: "Multi-entity + consolidated reports" },
  { id: "API publik, webhook & keamanan lanjutan", en: "Public API, webhooks & advanced security" },
  { id: "Pengguna tak terbatas — selamanya", en: "Unlimited users — always" },
];

/** Kalkulator perbandingan implisit: biaya sistem per-pengguna vs ERPindo tetap. */
function PerUserCalculator() {
  const lang = useLang();
  const [users, setUsers] = useState(20);
  const perUser = perUserMonthlyCost(users);
  const hemat = Math.max(0, perUser - PLAN_LIMITS.lengkap.pricePerMonth);
  // Pengguna pertama yang membuat ERPindo lebih murah — dihitung dari fungsi
  // biaya yang sama, bukan angka yang ditulis tangan lalu basi saat harga bergeser.
  const impas = (() => {
    for (let n = 1; n <= 100; n++) if (perUserMonthlyCost(n) > PLAN_LIMITS.lengkap.pricePerMonth) return n;
    return 100;
  })();
  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-card border border-line bg-surface-sunken p-4">
      <h3 className="text-sm font-semibold">{L(lang, "Bandingkan dengan sistem yang menagih per pengguna", "Compare with systems that charge per user")}</h3>
      {/* Kesimpulan kalkulator dinyatakan TERBUKA (Fase 30b). Sebelumnya angka
          titik impas hanya muncul bila pengunjung kebetulan menggeser slider ke
          bawah titik itu — padahal inilah akibat paling langsung dari keputusan
          harga tunggal, dan pengunjung yang tidak menggeser apa pun tidak pernah
          membacanya. Angkanya dihitung dari fungsi biaya yang sama, jadi ia ikut
          bergerak sendiri bila harga berubah. */}
      <p className="mt-1 text-[13px] text-ink-soft">
        {L(
          lang,
          `Mulai ${impas} pengguna, ERPindo sudah lebih murah — dan tagihannya berhenti naik di situ, berapa pun tim Anda bertambah.`,
          `From ${impas} users on, ERPindo already costs less — and the bill stops rising there, however much your team grows.`,
        )}
      </p>
      <label className="mt-3 block text-[13px] text-ink-soft">
        {L(lang, "Jumlah pengguna di tim Anda:", "Number of users on your team:")}{" "}
        <span className="num font-semibold text-ink">{users}</span>
        <input
          type="range"
          min={1}
          max={100}
          value={users}
          onChange={(e) => setUsers(Number(e.target.value))}
          aria-label={L(lang, "Jumlah pengguna", "Number of users")}
          className="mt-2 w-full accent-brand-600"
        />
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-line bg-surface p-3">
          <div className="text-[11px] text-slate-400">{L(lang, `Sistem per-pengguna (± ${formatRupiah(ASSUMED_PER_USER_PRICE)}/user)`, `Per-user system (± ${formatRupiah(ASSUMED_PER_USER_PRICE)}/user)`)}</div>
          <div className="num mt-1 text-xl font-bold text-slate-500 line-through">{formatRupiah(perUser)}</div>
          <div className="text-[11px] text-slate-400">{L(lang, "per bulan", "per month")}</div>
        </div>
        <div className="rounded border border-brand-500 bg-brand-50/60 p-3 dark:bg-brand-950/40">
          <div className="text-[11px] text-brand-700 dark:text-brand-300">{L(lang, "Dengan ERPindo", "With ERPindo")}</div>
          <div className="num mt-1 text-xl font-bold text-brand-700 dark:text-brand-300">{formatRupiah(PLAN_LIMITS.lengkap.pricePerMonth)}</div>
          <div className="text-[11px] text-ink-muted">{L(lang, "satu harga, berapa pun jumlah tim", "one price, whatever your team size")}</div>
        </div>
      </div>
      {/* Fase 27a: di bawah titik impas, rumus lama menampilkan "Hemat sekitar
          Rp 0" — kalkulator yang berdebat melawan halamannya sendiri. Sekarang
          ia menyebut mulai berapa pengguna ERPindo menjadi lebih murah, yang
          justru informasi yang dicari orang di ujung slider itu. */}
      <p className="mt-3 border-t border-line pt-3 text-[13px]">
        {hemat > 0 ? (
          <>
            <span className="text-ink-soft">{L(lang, "Hemat sekitar ", "Save about ")}</span>
            <span className="num font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(hemat)}</span>
            <span className="text-ink-soft">{L(lang, ` per bulan untuk ${users} pengguna.`, ` per month for ${users} users.`)}</span>
          </>
        ) : (
          <span className="text-ink-soft">
            {L(
              lang,
              `Di bawah ${impas} pengguna, sistem per-pengguna memang lebih murah. Mulai ${impas} pengguna ke atas, ERPindo lebih hemat — dan harganya tidak naik lagi setelah itu.`,
              `Below ${impas} users, a per-user system is cheaper. From ${impas} users up, ERPindo costs less — and its price stops rising after that.`,
            )}
          </span>
        )}
      </p>
    </div>
  );
}

function Pricing() {
  const lang = useLang();
  return (
    <section id="harga" className="scroll-mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:py-32 sm:px-6">
        <h2 className="judul text-[2rem] sm:text-[2.5rem]">
          {L(lang, "Satu sistem, dari toko pertama sampai grup perusahaan", "One system, from your first shop to a group of companies")}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
          {L(lang, "Pengguna", "Users are")} <span className="font-semibold">{L(lang, "selalu tak terbatas", "always unlimited")}</span>{" "}
          {L(lang, "dan semua fitur terbuka. Tidak dihitung per orang, tidak ada yang dikunci. Lihat dulu demonya sebelum memutuskan.", "and every feature is open. Not charged per person, nothing locked away. Look at the demo first before you decide.")}
        </p>

        {/* Satu kartu, di tengah (Fase 30). Kisi tiga kolom dibubarkan bersama
            paketnya: tanpa paket lain untuk dibandingkan, membiarkan kartu
            tunggal melebar penuh membuatnya terbaca seperti spanduk, bukan
            seperti harga. Lebar dijepit dan dipusatkan agar tetap terbaca
            sebagai satu penawaran yang tegas. */}
        <div className="mt-10 flex justify-center">
          <div className="relative flex w-full max-w-md flex-col rounded-card border border-brand-500 bg-surface p-6 shadow-md ring-1 ring-brand-500/20">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{PLAN_LIMITS.lengkap.label}</h3>
              {/* Lencana TANPA `uppercase`: asersi ui-sim membaca innerText, dan
                  `text-transform` ikut mengubah nilainya. */}
              <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                {L(lang, "Satu paket untuk semua", "One plan for everything")}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              {L(lang, "Dari toko pertama sampai grup perusahaan", "From your first shop to a group of companies")}
            </p>
            <div className="mt-3 flex items-end gap-1">
              <span className="num text-3xl font-bold">{formatRupiah(PLAN_LIMITS.lengkap.pricePerMonth)}</span>
              <span className="pb-1 text-[13px] font-normal text-slate-400">
                {L(lang, "/bulan/perusahaan", "/month/company")}
              </span>
            </div>
            <ul className="mt-4 flex-1 divide-y divide-line text-[13px]">
              {PAKET_FITUR.map((f) => (
                <li key={f.id} className="flex items-start gap-2 py-1.5">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden /> {f[lang]}
                </li>
              ))}
            </ul>
            {/* Tautan biasa (bukan <Link>): repo ini belum memakai
                `validateSearch` di rute mana pun. Navigasi keras tidak merugikan
                — ini langkah pindah halaman, bukan interaksi dalam halaman. */}
            <a href="/daftar" className="mt-4">
              <Button variant="primary" className="w-full">
                {L(lang, "Mulai Berlangganan", "Start subscribing")}
              </Button>
            </a>
          </div>
        </div>

        <p className="mt-4 text-[13px] text-ink-muted">
          {L(lang, "Termasuk:", "Included:")} {SINGLE_PLAN_MODULES.slice(0, 6).map((m) => pick(m, lang)).join(" · ")}
          {L(lang, ", dan banyak lagi. Harga belum termasuk PPN.", ", and much more. Prices exclude VAT.")}
        </p>

        <PerUserCalculator />

        {/* Fase 27b: blok ini dulu berisi DUA kartu. Kartu "Layanan
            pendampingan" dihapus bersama formulir "Jadwalkan demo": seluruh
            isinya ajakan menghubungi ("hubungi kami untuk penawaran") menuju
            formulir yang sudah tidak ada, dan menjanjikan percakapan tanpa satu
            pun cara memulainya adalah persis cacat yang dibersihkan Fase 27a.
            Kartu "Untuk grup & holding" tetap — ia menjelaskan apa yang bisa
            dikerjakan, bukan mengajak menghubungi siapa pun. */}
        <div className="mt-12 rounded-card border border-line bg-surface-sunken p-5">
          <h3 className="text-base font-semibold">{L(lang, "Untuk grup & holding", "For groups & holdings")}</h3>
          <p className="mt-2 max-w-3xl text-[13px] text-ink-soft">
            {L(
              lang,
              "Kelola beberapa badan usaha dalam satu akun dengan laporan konsolidasi lintas perusahaan dan dimensi per cabang — tanpa paket khusus, karena tidak ada paket khusus. Tiap perusahaan berlangganan sendiri dengan harga yang sama.",
              "Manage several entities from one account with cross-company consolidated reports and per-branch dimensions — no special plan needed, because there is no special plan. Each company subscribes on its own at the same price.",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function Security() {
  const lang = useLang();
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:py-32 sm:px-6">
      <h2 className="judul text-[2rem] sm:text-[2.5rem]">{L(lang, "Data bisnis Anda, aman di tangan Anda", "Your business data, safe in your hands")}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
        {L(lang, "Aman saja tidak cukup. Anda juga harus bisa berhenti kapan saja dan membawa seluruh data Anda.", "Secure is necessary, but not enough. You should also be able to leave whenever you want — and take all your data with you.")}
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {SECURITY_POINTS.map((s) => (
          <div key={s.title.id} className="flex items-start gap-3.5 rounded-card border border-line bg-surface p-5 shadow-card">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
              <s.icon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-base font-semibold">{pick(s.title, lang)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{pick(s.desc, lang)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const lang = useLang();
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-16 sm:py-24 lg:py-32 sm:px-6">
      <h2 className="judul text-[2rem] sm:text-[2.5rem]">{L(lang, "Pertanyaan umum", "Frequently asked questions")}</h2>
      {/* Daftar menyatu berpembatas garis, bukan tumpukan kartu terpisah. */}
      <div className="mt-10 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
        {FAQ.map((item) => (
          <details key={item.q.id} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
              {pick(item.q, lang)}
              <Plus className="ml-4 size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-45" aria-hidden />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{pick(item.a, lang)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CtaBand() {
  const lang = useLang();
  return (
    <section className="px-4 pb-24 sm:px-6">
      {/* Gradien dua-warna diganti bidang merek datar berbingkai — pita CTA
          bergradien adalah salah satu penanda paling khas "SaaS umum". */}
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-card bg-brand-600 px-8 py-12 text-white shadow-lg sm:flex-row sm:items-center">
        <div>
          <h2 className="judul text-[1.75rem] sm:text-[2rem]">{L(lang, "Siap merapikan bisnis Anda?", "Ready to tidy up your business?")}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-50">
            {L(
              lang,
              "Buka demonya tanpa mendaftar. Isinya data satu perusahaan sungguhan, dari penjualan sampai laporan keuangan.",
              "Open the demo without signing up. It holds one real company, from sales all the way through to the financial statements.",
            )}
          </p>
        </div>
        {/* Fase 27a: kalimat di kiri menjanjikan "telusuri demo tanpa
            mendaftar", tetapi tombolnya dulu menuju formulir pendaftaran.
            Sekarang tombol utamanya benar-benar membuka demo, dan mendaftar
            tetap tersedia sebagai langkah kedua. */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <DemoButton variant="secondary" />
          <Link to="/daftar">
            <span className="text-sm font-semibold text-white underline underline-offset-4">
              {L(lang, "atau daftar sekarang", "or sign up now")}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const lang = useLang();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <BrandWordmark className="h-7" />
          </div>
          <p className="mt-1 text-xs">{L(lang, "Integrate. Automate. Grow. — ERP untuk UMKM Indonesia.", "Integrate. Automate. Grow. — ERP for Indonesian SMEs.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href="/fitur" className="hover:text-ink">{L(lang, "Fitur", "Features")}</a>
          <a href="#harga" className="hover:text-ink">{L(lang, "Harga", "Pricing")}</a>
          <a href="/panduan" className="hover:text-ink">{L(lang, "Panduan", "Guide")}</a>
          {/* Blog dilayani server-side (SEO) — navigasi keras, bukan rute SPA. */}
          <a href="/blog" className="hover:text-ink">Blog</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
          <Link to="/masuk" className="hover:text-ink">{L(lang, "Masuk", "Sign in")}</Link>
          <Link to="/daftar" className="hover:text-ink">{L(lang, "Daftar", "Sign up")}</Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-5 text-xs text-slate-400 sm:px-6">© {new Date().getFullYear()} ERPindo</div>
    </footer>
  );
}

/**
 * Kompatibilitas & kepatuhan (Fase 14e) — bukti sosial faktual (bukan testimoni
 * karangan): alat & standar yang benar-benar didukung produk.
 */
/** CTA lengket di bawah layar mobile (Fase 14e) — konversi di perangkat kecil. */
function StickyMobileCta() {
  const lang = useLang();
  return (
    /* Fase 27a: dulu berisi "Daftar & Berlangganan" + "Hubungi" (ke formulir),
       sehingga demo — ajakan utama sejak Fase 24 — sama sekali tak terjangkau di
       layar kecil, dan "Hubungi" tidak memberi tahu apa yang akan terjadi. */
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-line bg-white/95 p-2 backdrop-blur sm:hidden dark:bg-slate-900/95">
      <span className="flex-1 [&>span]:w-full [&_button]:w-full">
        <DemoButton size="md" />
      </span>
      <Link to="/daftar" className="shrink-0">
        <Button variant="secondary">{L(lang, "Daftar", "Sign up")}</Button>
      </Link>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-surface-sunken text-ink">
      <PublicHeader tautan={TAUTAN_BERANDA} beranda />
      {/* pb ekstra di mobile agar CTA lengket tak menutup konten akhir */}
      <main className="flex-1 pb-20 sm:pb-0">
        {/* Fase 32c — 12 bagian diringkas menjadi 8.
            Yang dibuang: pita integrasi (PINDAH ke /fitur, bukan dihapus),
            grid 11 kartu fitur, dan tabel perbandingan kategori. Ketiganya
            mengulang isi /fitur yang sudah ditautkan dari bilah atas, dan
            bersama-sama membentuk urutan hero → bukti → fitur → banding →
            banding → harga yang menjadi kerangka halaman SaaS mana pun.
            Bukti nyata (tangkapan layar produk) kini mendahului argumen. */}
        <Hero />
        <TrustBar />
        <Showcase />
        <Comparison />
        <Pricing />
        <Security />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
      <StickyMobileCta />
    </div>
  );
}
