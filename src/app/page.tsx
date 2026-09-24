import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-teal-100">
            Tur operatörleri için
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Harita üzerinde çok günlük tur planlayın, paylaşın, rezervasyon alın
          </h1>
          <p className="mt-4 max-w-xl text-lg text-teal-50">
            Uzman Navigasyon ile güzergâhınızı durak durak çizin, kalkış açın ve
            müşterilerinize tek linkle program sunun. Basic ücretsiz; Premium
            sınırsız.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/kayit" className="btn bg-white text-teal-900 hover:bg-teal-50">
              Ücretsiz başla (Basic)
            </Link>
            <Link href="/giris" className="btn border border-teal-200 text-white hover:bg-teal-600">
              Giriş yap
            </Link>
          </div>
          <div className="mt-6 pt-6 border-t border-teal-600/30">
            <Link
              href="/cevremde"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white shadow-lg hover:bg-amber-600 transition-colors"
            >
              <span className="text-xl">📍</span>
              Çevremde ne var
            </Link>
            <p className="mt-2 text-sm text-teal-100">
              Acil durum, arıza, konum paylaşımı — yakınımda servis, şarj, sağlık, lokanta
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900">Nasıl çalışır?</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { t: "1. Turu planla", d: "Haritada durak ekleyin, günlere bölün, not yazın." },
            { t: "2. Kalkış aç", d: "Tarih ve kontenjan belirleyin, paylaşım linki kopyalayın." },
            { t: "3. Rezervasyon al", d: "Müşteri talebi bırakır; siz onaylarsınız, kontenjan güncellenir." },
          ].map((x) => (
            <div key={x.t} className="card">
              <h3 className="font-semibold text-teal-800">{x.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold">Örnek: Kapadokya 3 Gün</h2>
          <p className="mt-2 text-slate-600">
            Seed verisinde Türkiye odaklı örnek tur bulunur. Kayıt olduktan sonra
            Turlarım ekranında görürsünüz. Örnek tur kopyalama Premium özelliğidir.
          </p>
          <div className="mt-6 card max-w-md">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Kapadokya Keşif Turu</h3>
                <p className="text-sm text-slate-500">3 gün · Göreme · Uçhisar · Derinkuyu</p>
              </div>
              <span className="badge-basic">Örnek</span>
            </div>
            <Link href="/kayit" className="btn-primary mt-4 !w-full">
              Tur planlamaya başla
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold">Planlar</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="card">
            <span className="badge-basic">Basic</span>
            <h3 className="mt-2 text-xl font-semibold">Ücretsiz</h3>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              <li>· En fazla 3 tur</li>
              <li>· En fazla 2 aktif kalkış</li>
              <li>· Ayda 20 rezervasyon talebi</li>
              <li>· Planlayıcı + paylaşım linki + yazdır</li>
            </ul>
          </div>
          <div className="card border-amber-200 bg-amber-50/40">
            <span className="badge-premium">Premium</span>
            <h3 className="mt-2 text-xl font-semibold">Yakında ücretli</h3>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              <li>· Sınırsız tur / kalkış / rezervasyon</li>
              <li>· Örnek tur kopyalama</li>
              <li>· Premium rozeti</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Ödeme yok — Ayarlar&apos;dan demo olarak Premium&apos;a geçebilirsiniz.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
