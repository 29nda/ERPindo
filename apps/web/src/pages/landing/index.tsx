import { ASSUMED_PER_USER_PRICE, perUserMonthlyCost, PLAN_LIMITS } from "@erpindo/shared";
import { Link } from "@tanstack/react-router";
import { Check, Eye, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Button } from "../../components/ui";
import { PublicFooter, PublicHeader, PublicShell } from "../../components/publik";
import { Peragaan, PERAGAAN } from "../../peragaan";
import { pick, useLang, type Lang } from "../../i18n";
import { KEGAGALAN_ERP,
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
                  "Demo sedang disiapkan. Sementara ini Anda dapat langsung mendaftar, dan akunnya bisa dipakai saat itu juga.",
                  "The demo is being prepared. In the meantime, just sign up — your account works right away.",
                ),
              );
              setBusy(false);
            });
        }}
      >
        <Eye className="size-4" aria-hidden /> {busy ? L(lang, "Menyiapkan demo…", "Preparing demo…") : L(lang, "Lihat Demo", "View Demo")}
      </Button>
      {error ? <span className="mt-1 text-xs text-galat-ink">{error}</span> : null}
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
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(to bottom, black, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 78%)",
        }}
        aria-hidden
      />
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14">
        {/* Fase 35a — badge pil DIBUANG.
        
            Ia penanda paling khas landing SaaS mana pun, memakan 60px di layar
            pertama, dan isinya ("Dibuat untuk usaha di Indonesia") sudah
            dinyatakan lebih baik oleh nama produk dan seluruh naskahnya. */}

        {/* Judul dipendekkan dari tiga baris menjadi dua, dan diturunkan dari
            4,25rem ke 3,25rem. Bukan demi kerapian: setiap piksel di sini
            menentukan apakah PERAGAAN ikut terlihat di layar pertama, dan
            peragaan itulah satu-satunya hal di halaman ini yang membuktikan
            klaimnya sendiri. */}
        {/* Fase 37b — halaman ini menyasar PERUSAHAAN, bukan UMKM.
        
            Untuk pembeli perusahaan, harga bukan keberatan pertama. Yang
            pertama adalah "proyeknya akan gagal seperti yang dulu" — dan itu
            bukan ketakutan yang mengada-ada: 68% proyek ERP gagal memenuhi
            tujuan awalnya, dengan biaya rata-rata membengkak 189%.
            
            Sudut itu belum dipakai siapa pun di pasar ini, dan ERPindo memang
            berhak memakainya: ia tidak punya proyek implementasi. Bagan akun,
            tarif pajak, dan seluruh modul sudah terpasang saat perusahaan
            dibuat.
            
            Layar pertama melayani DUA pembeli sekaligus (lihat
            docs/posisi-produk.md): angka dan sumber untuk yang menyetujui,
            peragaan hidup di bawahnya untuk yang menilai. */}
        {/* Fase 40a — judul lama berbunyi "ERP untuk perusahaan, tanpa proyek
            implementasi", dan itu kalimat Inggris yang dialihkata: "Enterprise
            ERP, without the implementation project". Kalimat penjelasnya lebih
            jauh lagi — "ERPindo tidak punya proyek" praktis tidak bermakna
            tanpa kerangka Inggris di belakangnya.

            Yang menggantikannya berbentuk Indonesia: klaim produk lebih dulu,
            lalu buktinya. Angka kegagalan ERP TETAP ada karena pembeli yang
            menyetujui anggaran memakainya, tetapi ia turun menjadi pembanding
            di bawah, bukan kalimat pertama yang menyambut pengunjung. Membuka
            halaman jualan dengan statistik kegagalan industri adalah kebiasaan
            B2B Inggris, bukan Indonesia. */}
        <h1 className="judul-hero max-w-3xl text-[2.25rem] sm:text-[3.25rem]">
          {L(lang, "ERP siap pakai untuk perusahaan Indonesia,", "ERP that is ready to use,")}{" "}
          <span className="text-brand-ink">
            {L(lang, "tanpa proyek pemasangan.", "with no rollout project.")}
          </span>
        </h1>
        {/* Fase 40b — kalimat ini dulu membuka dengan daftar istilah pajak
            ("bagan akun", "PPh 21 metode TER") sebelum pernah menyebutkan
            aplikasinya BISA DIPAKAI UNTUK APA.

            Itu cacat yang lebih besar daripada alih-kata Fase 40a. Pengunjung
            datang bertanya "ini aplikasi apa", dan tiga blok pertama halaman
            menjawab posisi produk, istilah pajak, lalu statistik kegagalan
            industri. Pembaca yang belum tahu arti "bagan akun" sudah hilang di
            kalimat pertama, padahal dialah yang menandatangani langganan.

            Sekarang kalimat pertama memakai kata kerja yang dipahami siapa pun
            di perusahaan: catat, kelola, hitung, susun. Istilah pajaknya
            menyusul di kalimat kedua, tempat ia menjadi bukti, bukan sambutan. */}
        <p className="mt-5 max-w-[40rem] text-lg leading-[1.65] text-ink-soft">
          {L(
            lang,
            "Catat penjualan, kelola stok, hitung gaji, dan susun laporan keuangan perusahaan Anda dalam satu aplikasi. Bagan akun standar Indonesia, PPN, PPh 21 metode TER, dan BPJS sudah terpasang sejak hari pertama, jadi tidak ada tim konsultan yang perlu didatangkan.",
            "Record sales, manage stock, run payroll, and produce your financial statements in one application. The Indonesian chart of accounts, VAT, PPh 21 (TER method), and BPJS are in place from day one, so there is no consulting team to bring in.",
          )}
        </p>
        {/* Fase 40b — angka kegagalan ERP (68% / 189%) DIPINDAHKAN, bukan
            dibuang. Ia tampil lengkap beserta sumbernya di seksi "Empat sebab
            proyek ERP gagal" lebih bawah, tempat keempat persentasenya memang
            diuraikan.

            Menyebutnya dua kali membuat halaman terbaca seperti ceramah
            tentang kegagalan industri alih-alih penjelasan tentang produk —
            dan yang pertama muncul justru sebelum pembaca sempat tahu produk
            ini apa. Pembeli yang menyetujui anggaran tetap mendapat angka dan
            sumbernya; ia hanya tidak lagi menjadi hal ketiga yang dibacanya. */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <DemoButton />
          <Link to="/daftar">
            <Button variant="secondary" size="lg">
              {L(lang, "Daftar & Berlangganan", "Sign up & subscribe")}
            </Button>
          </Link>
          {/* Harga dan syaratnya dirapatkan menjadi SATU baris di samping
              tombol. Sebelumnya dua paragraf terpisah di bawahnya, dan keduanya
              mendorong peragaan keluar dari layar pertama. */}
          <p className="text-sm text-ink-muted">
            <span className="num font-semibold text-ink">
              {formatRupiah(PLAN_LIMITS.lengkap.pricePerMonth)}
            </span>{" "}
            {L(
              lang,
              "/bulan/perusahaan · pengguna tak terbatas · tanpa lisensi per orang",
              "/month/company · unlimited users · no per-seat licence",
            )}
          </p>
        </div>
      </div>

      {/* Fase 35a — tangkapan layar MATI diganti PERAGAAN HIDUP.
          
          Yang lama: gambar dasbor di bawah lipatan, terpotong, dan tidak
          membuktikan apa pun. Ia meminta pengunjung mempercayai klaim "catat
          sekali, sisanya otomatis" begitu saja.
          
          Padahal itu satu-satunya klaim di halaman ini yang bisa DIPERAGAKAN.
          Jadi diperagakan — dan angkanya dibuat benar-benar seimbang, karena
          pembeli yang paham pembukuan akan memeriksanya. */}
      <div className="mx-auto mt-10 max-w-6xl px-4 sm:mt-14 sm:px-6">
        <Peragaan naskah={PERAGAAN["faktur-berantai"]} tinggi="tinggi" />
      </div>
    </section>
  );
}

function TrustBar() {
  const lang = useLang();
  // Fase 35b — dulu EMPAT kolom berisi ikon + judul serif + paragraf, tepat di
  // bawah peragaan yang baru saja membuktikan hal yang sama. Ia memakan hampir
  // satu layar penuh untuk mengulang.
  //
  // Kini satu bilah rapat: judulnya saja, dipisah titik tengah. Isi lengkapnya
  // tetap ada di seksi Harga, Keamanan, dan FAQ — yang memang tempatnya.
  return (
    <section className="border-b border-line bg-surface">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 text-[13px] sm:px-6">
        {TRUST_POINTS.map((s) => (
          <li key={s.label.id} className="flex items-center gap-2 text-ink-soft">
            <s.icon className="size-4 shrink-0 text-brand-ink" aria-hidden />
            <span className="font-medium text-ink">{pick(s.value, lang)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Showcase() {
  const lang = useLang();
  const [active, setActive] = useState("pos");
  const item = SHOWCASE.find((s) => s.id === active) ?? SHOWCASE[0]!;
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20 sm:px-6">
      {/* Fase 38b — judul lama berbunyi "Ini tampilan aslinya. Bukan gambar
          rekaan." dan sublinenya "difoto langsung dari aplikasinya". Keduanya
          menjadi tidak benar begitu tangkapan layar diganti peragaan, dan
          naskah yang tidak benar di halaman yang menjual kejujuran adalah
          harga yang tidak sepadan.
          
          Yang menggantikannya bukan klaim yang lebih lunak, melainkan klaim
          yang LEBIH kuat — dan kali ini bisa diperiksa pembacanya sendiri di
          layar yang sama. */}
      <h2 className="judul text-[2rem] sm:text-[2.5rem]">{L(lang, "Jangan percaya. Periksa angkanya.", "Do not take our word for it. Check the figures.")}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
        {L(lang, "Lima pekerjaan yang paling menyita waktu, diperagakan langkah demi langkah. Angkanya benar-benar dihitung, bukan gambar. Pilih salah satu untuk melihatnya berjalan.", "The five jobs that consume the most time, demonstrated step by step. The journals are genuine double-entry, and the debits equal the credits. Pick one.")}
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
        {/* Fase 38b — tangkapan layar diganti PERAGAAN.
        
            Gambar `.webp` di sini menjanjikan "ini tampilan aslinya" dan
            meminta pengunjung mempercayainya. Peragaan tidak meminta apa pun:
            ia memainkan alurnya, angkanya benar, dan jurnalnya seimbang di
            depan mata. Ia juga tidak bisa basi — isinya dirakit dari primitif
            UI yang sama dengan aplikasinya. */}
        <Peragaan key={item.peragaan} naskah={PERAGAAN[item.peragaan]} tinggi="tinggi" />
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
    /* Fase 35b — PITA KONTRAS, dan ini satu-satunya di halaman.
    
       Keluhan "membosankan" bukan hanya soal kata: delapan seksi berturut-turut
       memakai bentuk yang sama persis (judul + grid kartu) di atas krem yang
       sama, dari atas sampai bawah. Tidak ada satu pun momen yang membuat mata
       berhenti.
       
       Seksi inilah tempatnya: ia berisi pertentangan — cara lama vs cara ini —
       dan pertentangan pantas terlihat berbeda. `bg-ink text-ink-invert`
       membalik sendiri mengikuti tema, jadi ia gelap di tema terang dan terang
       di tema gelap tanpa satu pun kelas `dark:`. */
    <section className="bg-ink text-ink-invert">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <h2 className="judul text-[2rem] sm:text-[2.5rem]">{L(lang, "Masih pakai buku & Excel?", "Still using ledgers & Excel?")}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-invert/75">
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
        {/* `text-ink` MEMULIHKAN warna teks normal di dalam tabel.
          
              Tanpa baris ini, sel mewarisi `text-ink-invert` dari pita gelap
              sementara latarnya sendiri tetap terang — dan kolom pertama
              (nama pekerjaan) menjadi putih di atas putih. Tidak ada gerbang
              yang bisa melihatnya: kontras bukan sesuatu yang diperiksa
              asersi teks. Ia hanya terlihat karena halamannya dipotret. */}
        <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-card border border-line text-[13px] text-ink max-md:block max-md:border-0 md:min-w-[640px] max-md:[&>tbody]:block">
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
                <td className="bg-brand-surface px-3 py-2 text-ink max-md:mt-2 max-md:block max-md:rounded-control max-md:px-3 max-md:py-2">
                  <span className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" aria-hidden /> {pick(row.erpindo, lang)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          <div className="text-[11px] text-ink-faint">{L(lang, `Sistem per-pengguna (± ${formatRupiah(ASSUMED_PER_USER_PRICE)}/user)`, `Per-user system (± ${formatRupiah(ASSUMED_PER_USER_PRICE)}/user)`)}</div>
          <div className="num mt-1 text-xl font-bold text-ink-muted line-through">{formatRupiah(perUser)}</div>
          <div className="text-[11px] text-ink-faint">{L(lang, "per bulan", "per month")}</div>
        </div>
        <div className="rounded border border-brand-500 bg-brand-surface p-3">
          <div className="text-[11px] text-brand-ink">{L(lang, "Dengan ERPindo", "With ERPindo")}</div>
          <div className="num mt-1 text-xl font-bold text-brand-ink">{formatRupiah(PLAN_LIMITS.lengkap.pricePerMonth)}</div>
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
            <span className="num font-bold text-ok-ink">{formatRupiah(hemat)}</span>
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

/**
 * "Kenapa proyek ERP gagal" (Fase 37c) — seksi terpenting di halaman ini bagi
 * pembeli perusahaan.
 *
 * Ia menjawab keberatan NOMOR SATU, dan keberatan itu bukan harga. Pembeli
 * perusahaan hampir selalu punya cerita proyek ERP yang gagal — miliknya
 * sendiri atau milik kenalannya. Halaman yang tidak menyinggungnya sama sekali
 * terbaca seperti halaman yang tidak tahu apa yang dibelinya orang.
 *
 * Bentuknya sengaja BUKAN grid kartu: dua kolom bersebelahan, sebab di kiri dan
 * jawabannya di kanan, supaya pasangannya terbaca sebagai pasangan.
 */
function KenapaGagal() {
  const lang = useLang();
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="judul max-w-3xl text-[2rem] sm:text-[2.5rem]">
          {L(
            lang,
            "Empat sebab proyek ERP gagal, dan cara ERPindo menghindarinya",
            "What makes ERP projects fail — and what replaces it here",
          )}
        </h2>
        <ul className="mt-10 divide-y divide-line">
          {KEGAGALAN_ERP.map((k) => (
            <li key={k.sebab.id} className="grid gap-2 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-10">
              <div>
                <h3 className="text-base font-semibold text-ink">{pick(k.sebab, lang)}</h3>
                <p className="num mt-1 text-[12px] uppercase tracking-wide text-brand-ink">
                  {pick(k.angka, lang)}
                </p>
              </div>
              <p className="text-[15px] leading-relaxed text-ink-soft">{pick(k.jawaban, lang)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-ink-faint">
          {L(
            lang,
            "Persentase dari Panorama Consulting Solutions, ERP Report 2025.",
            "Percentages from Panorama Consulting Solutions, ERP Report 2025.",
          )}
        </p>
      </div>
    </section>
  );
}

function Pricing() {
  const lang = useLang();
  return (
    <section id="harga" className="scroll-mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20 sm:px-6">
        <h2 className="judul text-[2rem] sm:text-[2.5rem]">
          {L(lang, "Satu harga. Tidak ada paket yang lebih mahal.", "One price. There is no pricier tier.")}
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
            {/* Fase 35a — klaim "seluruh modul terbuka" dikembalikan ke sini.
            
                Ia dulu ikut di baris harga hero, dan hilang saat baris itu
                dirapatkan agar peragaan masuk layar pertama. Kehilangan itu
                nyata: klaim tersebut adalah seluruh isi argumen harga tunggal —
                tanpa paket yang lebih mahal, tidak ada fitur yang terkunci.
                
                Seksi Harga memang tempatnya yang benar, dan asersi ui-sim F15
                menangkap hilangnya dalam satu kali jalan. */}
            <p className="mt-0.5 text-xs text-ink-muted">
              {L(
                lang,
                "Seluruh modul terbuka dan pengguna tak terbatas, dari satu badan usaha sampai grup perusahaan",
                "Every module unlocked, unlimited users — from your first shop to a group of companies",
              )}
            </p>
            <div className="mt-3 flex items-end gap-1">
              <span className="num text-3xl font-bold">{formatRupiah(PLAN_LIMITS.lengkap.pricePerMonth)}</span>
              <span className="pb-1 text-[13px] font-normal text-ink-faint">
                {L(lang, "/bulan/perusahaan", "/month/company")}
              </span>
            </div>
            <ul className="mt-4 flex-1 divide-y divide-line text-[13px]">
              {PAKET_FITUR.map((f) => (
                <li key={f.id} className="flex items-start gap-2 py-1.5">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-ok-ink" aria-hidden /> {f[lang]}
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
              "Kelola beberapa badan usaha dalam satu akun, lengkap dengan laporan konsolidasi lintas perusahaan dan dimensi per cabang. Tidak ada paket khusus untuk ini, karena memang tidak ada paket khusus. Tiap perusahaan berlangganan sendiri dengan harga yang sama.",
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
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20 sm:px-6">
      <h2 className="judul text-[2rem] sm:text-[2.5rem]">{L(lang, "Data Anda tetap milik Anda, termasuk setelah berhenti berlangganan.", "Your data stays yours, including after you leave.")}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
        {L(lang, "Keamanan saja belum cukup. Perusahaan Anda dapat berhenti kapan saja dan membawa seluruh datanya.", "Secure is necessary, but not enough. You should also be able to leave whenever you want — and take all your data with you.")}
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {SECURITY_POINTS.map((s) => (
          <div key={s.title.id} className="flex items-start gap-3.5 rounded-card border border-line bg-surface p-5 shadow-card">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ok-surface text-ok-ink">
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
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-14 sm:py-20 sm:px-6">
      <h2 className="judul text-[2rem] sm:text-[2.5rem]">{L(lang, "Pertanyaan umum", "Frequently asked questions")}</h2>
      {/* Daftar menyatu berpembatas garis, bukan tumpukan kartu terpisah. */}
      <div className="mt-10 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
        {FAQ.map((item) => (
          <details key={item.q.id} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
              {pick(item.q, lang)}
              <Plus className="ml-4 size-4 shrink-0 text-ink-faint transition-transform group-open:rotate-45" aria-hidden />
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
          <h2 className="judul text-[1.75rem] sm:text-[2rem]">{L(lang, "Jangan percaya halaman ini. Buka demonya.", "Do not take this page\u2019s word for it. Open the demo.")}</h2>
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

/**
 * Kompatibilitas & kepatuhan (Fase 14e) — bukti sosial faktual (bukan testimoni
 * karangan): alat & standar yang benar-benar didukung produk.
 */
/** CTA lengket di bawah layar mobile (Fase 14e) — konversi di perangkat kecil. */
function StickyMobileCta() {
  const lang = useLang();
  // Fase 35a — bilah ini dulu tampil SEJAK layar pertama, sementara tombol yang
  // sama persis sudah ada di dalam hero tepat di atasnya. Hasilnya empat tombol
  // di satu layar 390px, dua di antaranya duplikat — dan keduanya menekan
  // peragaan turun.
  //
  // Sekarang ia muncul setelah hero terlewati: saat tombol aslinya sudah tidak
  // terlihat, dan pengunjung memang butuh jalan pintas.
  const [terlihat, setTerlihat] = useState(false);
  useEffect(() => {
    const cek = () => setTerlihat(window.scrollY > 560);
    cek();
    window.addEventListener("scroll", cek, { passive: true });
    return () => window.removeEventListener("scroll", cek);
  }, []);
  if (!terlihat) return null;
  return (
    /* Fase 27a: dulu berisi "Daftar & Berlangganan" + "Hubungi" (ke formulir),
       sehingga demo — ajakan utama sejak Fase 24 — sama sekali tak terjangkau di
       layar kecil, dan "Hubungi" tidak memberi tahu apa yang akan terjadi. */
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-line bg-surface/95 p-2 backdrop-blur sm:hidden">
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
    <PublicShell>
      <PublicHeader beranda />
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
        <KenapaGagal />
        <Pricing />
        <Security />
        <Faq />
        <CtaBand />
      </main>
      <PublicFooter />
      <StickyMobileCta />
    </PublicShell>
  );
}
