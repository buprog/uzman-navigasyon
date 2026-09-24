# Uzman Navigasyon (v1 iskelet)

Tur operatörleri için harita merkezli çok günlük tur planlayıcı + hafif operatör katmanı (kalkış, paylaşım linki, rezervasyon talebi).

Geçici ad: **Uzman Navigasyon** · UI: Türkçe · Ödeme yok (freemium stub).

## Özellikler (dikey dilim)

| Kod | Ekran | Rota |
|-----|--------|------|
| E0 | Landing | `/` |
| E1 | Giriş | `/giris` |
| E2 | Kayıt | `/kayit` |
| E3 | Turlarım | `/turlar` |
| E4 | Yeni tur (konum arama + otomatik gün) | `/turlar/yeni` |
| E5 | Planlayıcı (MapLibre + PLAN) | `/planlayici/[turId]` |
| E6 | Durak çekmecesi | planlayıcı içinde |
| E7–E8 | Kalkışlar + paylaşım kodu | `/turlar/[turId]/kalkislar` |
| E9 | Müşteri itinerary | `/p/[shareCode]` |
| E10 | Rezervasyon talebi | E9 modal |
| E11 | Rezervasyon onay/iptal + kontenjan | `/rezervasyonlar` |
| E14 | Ayarlar (plan stub) | `/ayarlar` |

Seed: **Kapadokya Keşif Turu** (3 gün, Türkiye).

## Freemium (Basic / Premium)

Ödeme entegrasyonu **yok**. `User.plan` alanı: `basic` (varsayılan) | `premium`.

| | Basic (ücretsiz) | Premium |
|--|------------------|---------|
| Tur | en fazla 3 | sınırsız |
| Aktif kalkış (yayın/dolu) | en fazla 2 | sınırsız |
| Rezervasyon talebi / ay | en fazla 20 | sınırsız |
| Planlayıcı + paylaşım + yazdır | ✓ | ✓ |
| Örnek tur kopyalama | ✗ | ✓ |
| Rozet | Basic | Premium |

Limit aşımında API `403` + Türkçe mesaj ve **«Premium'a geç»** CTA döner.  
Demo yükseltme: **Ayarlar → Premium'a geç (demo)** (`POST /api/account/plan`).

## Araç / sürücü profili (stub — KAPSAM §13)

Ayarlar (`/ayarlar`) üzerinden:
- Marka/model dropdown (`src/lib/vehicleCatalog.ts` — TR popüler markalar)
- Yakıt tipi, tüketim (L veya kWh/100 km), km saati, lastik diş derinliği (mm)
- Kan grubu, acil telefon, paralı yol tercihi
- API: `GET/PATCH /api/account/vehicle` (oturum gerekli)

Planlayıcıda:
- **Yol maliyeti** kartı: duraklar arası haversine × tüketim × örnek birim fiyat (`src/lib/fuelEstimate.ts` — canlı pompa fiyatı değil)
- Elektrikli ise haritada örnek şarj pinleri («örnek / yakında»)
- **Yola çıkmadan izle**: örnek brifing video kartları (CDN yok)
- Lastik/servis **öneriler** stub (düşük diş / yüksek km)
- **112’ye konum SMS (yakında)** — disabled stub

Gerçek 112 SMS, canlı trafik, ücretli harita API’si, partner teklifi **yok**.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- MapLibre GL + ücretsiz OSM karoları
- Ücretsiz geocoding: OpenStreetMap Nominatim (sunucu proxy `/api/geo/search` + `/api/geo/reverse`; ücretli API yok)
- **PostgreSQL** + Prisma (Production: Neon/Vercel Postgres; Local dev: SQLite veya PostgreSQL)
- Cookie oturum + bcrypt (e-posta/şifre)

## Production Deployment

**Vercel'e deploy etmek için:** [DEPLOY.md](./DEPLOY.md) dosyasını okuyun.

Vercel production ortamı için PostgreSQL gereklidir (SQLite dosya tabanlı olduğu için serverless ortamda çalışmaz).

Önerilen: **Neon** (ücretsiz PostgreSQL) + Vercel.

## Kurulum

Zip’ten açtıktan sonra:

```bash
cd uzman-navigasyon-app

# .env yoksa örnekten kopyalayın (zip’te genelde .env hazır gelir)
cp -n .env.example .env

npm install
npx prisma db push
npm run db:seed   # zorunlu — demo kullanıcı + Kapadokya örnek turu
npm run dev
```

**Önemli:** `npm run db:seed` çalıştırılmazsa giriş ve örnek tur çalışmaz.
`DATABASE_URL` / `.env` eksikse Prisma hata verir ve giriş «Veritabanı hazır değil…» döner.

Tarayıcı: [http://localhost:3000](http://localhost:3000)

Demo hesap: `operator@demo.com` / `demo1234` (Basic) — seed sonrası geçerli; `db:seed` şifreyi yeniden yazar.

**Not:** Lokal development'ta SQLite kullanmak için `.env` dosyasını manuel oluşturun:
```bash
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
AUTH_SECRET="dev-secret-change-in-production"
EOF
```

Production deployment için PostgreSQL gereklidir. Detaylı bilgi: [DEPLOY.md](./DEPLOY.md)

## Kapsam dışı (v1)

Ödeme, GPX, otel API, filo, GitHub push, ücretli harita/geocoding API.

## Lisans

Özel / dahili iskelet — üretim kullanımı için gözden geçirin.

## Yol haritası (henüz uygulanmadı)

1. **Mobil uygulama** — mevcut web App Router + JSON tur modeli üzerine (Capacitor/React Native adayı).
2. **Google Drive yedek** — kullanıcı Google bağladığında turların şifreli yedeği ve geri yükleme.
   - Veri modeli JSON-dostu (`GET /api/tours/[id]/export`, `schemaVersion: 1`).
   - Auth genişletilebilir: `User.authProvider`, `User.googleSub`, `passwordHash` opsiyonel (gelecek Google OAuth).
   - v1’de OAuth, Drive API veya mobil paket **yok**.
