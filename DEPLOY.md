# Vercel Production Deployment Guide

Bu döküman, **Uzman Navigasyon** uygulamasını Vercel production ortamına deploy etme adımlarını içerir.

## Ön Gereksinimler

1. [Vercel hesabı](https://vercel.com) (GitHub ile bağlanabilir)
2. PostgreSQL veritabanı (önerilen: [Neon](https://neon.tech) ücretsiz tier)
3. GitHub repository'nin Vercel'e bağlanması

## 1. PostgreSQL Veritabanı Kurulumu (Neon)

### Neon ile ücretsiz PostgreSQL:

1. [neon.tech](https://neon.tech) adresine gidin ve ücretsiz kayıt olun
2. Yeni bir proje oluşturun (örn: `uzman-navigasyon-prod`)
3. **Connection String**'i kopyalayın:
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

**Alternatif PostgreSQL sağlayıcıları:**
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase](https://supabase.com) (ücretsiz tier)
- [Railway](https://railway.app)

## 2. Vercel Projesi Oluşturma

### GitHub'dan deploy:

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project**
2. GitHub repository'nizi seçin (`buprog/uzman-navigasyon`)
3. **Framework Preset** otomatik olarak **Next.js** seçilecek
4. **Root Directory**: `.` (varsayılan)

## 3. Environment Variables (Ortam Değişkenleri)

Vercel proje ayarlarında **Settings → Environment Variables** bölümüne gidin ve aşağıdaki değişkenleri ekleyin:

### Gerekli değişkenler:

#### `DATABASE_URL`
```
postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```
- **Value**: Neon'dan aldığınız PostgreSQL connection string
- **Environment**: Production, Preview, Development (hepsini seçin)

#### `AUTH_SECRET`
```bash
# Güçlü bir random string oluşturun:
openssl rand -base64 32
```
- **Value**: 32+ karakter rastgele string
- **Environment**: Production, Preview, Development (hepsini seçin)

**⚠️ Önemli:** Gerçek production secret'larını asla git'e commit etmeyin!

## 4. İlk Deployment

### Vercel'de build ve deploy:

1. Vercel Dashboard'da **Deploy** butonuna basın
2. Build log'larını takip edin:
   ```
   ✓ Installing dependencies
   ✓ Running prisma generate
   ✓ Building Next.js app
   ✓ Deployment ready
   ```

3. Deployment başarılı olduktan sonra URL'inizi alacaksınız:
   ```
   https://uzman-navigasyon-xxx.vercel.app
   ```

## 5. Veritabanı Kurulumu (İlk Defa)

İlk deployment'tan sonra veritabanı tablolarını oluşturmanız ve demo datayı seed etmeniz gerekiyor.

### Option A: Vercel CLI ile (önerilen)

```bash
# Vercel CLI kurulumu
npm i -g vercel

# Vercel'e login
vercel login

# Projenizi link edin
vercel link

# Veritabanı tablolarını oluşturun
vercel env pull .env.production
npx prisma db push

# Demo datayı seed edin
npm run db:seed
```

### Option B: Lokal seed sonra production'a push

Eğer lokal'de PostgreSQL kullanıyorsanız:

```bash
# .env dosyasını production DATABASE_URL ile güncelleyin
DATABASE_URL="postgresql://..." npm run setup
```

**Demo hesap bilgileri:**
- Email: `operator@demo.com`
- Şifre: `demo1234`
- Plan: Basic
- Örnek tur: **Kapadokya Keşif Turu** (3 gün)

## 6. Production'da Seed (İsteğe Bağlı API Yöntemi)

Alternatif olarak, güvenli bir seed endpoint'i ekleyebilirsiniz:

```typescript
// src/app/api/seed/route.ts (örnek)
export async function POST(req: Request) {
  const { secret } = await req.json();
  
  if (secret !== process.env.SEED_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // seed logic buraya
  // ...
  
  return Response.json({ success: true });
}
```

Environment variable ekleyin:
```
SEED_SECRET=your-secure-seed-secret
```

Seed için:
```bash
curl -X POST https://your-app.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-secure-seed-secret"}'
```

## 7. PWA Özelliklerini Test Etme

Uygulama PWA (Progressive Web App) desteğine sahiptir:

1. Production URL'inizi mobil tarayıcıda açın
2. "Ana ekrana ekle" veya "Install" seçeneğini kullanın
3. Uygulamayı native gibi kullanabilirsiniz

## 8. Sonraki Deploymentlar

Her `main` (veya `cursor/vercel-prod-ready`) branch'ine push, otomatik olarak Vercel'de yeni bir deployment tetikler:

```bash
git add .
git commit -m "feat: yeni özellik"
git push origin main
```

Vercel otomatik olarak:
- ✓ Dependencies yükler
- ✓ Prisma client oluşturur (`prisma generate`)
- ✓ Next.js build yapar
- ✓ Production'a deploy eder

## 9. Preview Deployments

Pull request'ler otomatik olarak preview URL'leri oluşturur:

```
https://uzman-navigasyon-git-feature-xxx.vercel.app
```

Her PR için ayrı preview environment ve URL alırsınız.

## 10. Domain Bağlama (İsteğe Bağlı)

Kendi domain'inizi bağlamak için:

1. Vercel Dashboard → **Settings → Domains**
2. Domain'inizi ekleyin (örn: `turplanlayici.com`)
3. DNS kayıtlarını Vercel'in talimatlarına göre güncelleyin
4. SSL otomatik olarak yapılandırılır

## Troubleshooting

### Build hatası: "prisma generate" fails

```bash
# package.json'da postinstall script'inin olduğundan emin olun:
"postinstall": "prisma generate"
```

### Database connection error

- DATABASE_URL'in doğru olduğunu kontrol edin
- Neon dashboard'dan connection string'i yeniden kopyalayın
- SSL mode eklemeyi unutmayın: `?sslmode=require`

### Seed işlemi çalışmıyor

```bash
# Lokal'de test edin:
DATABASE_URL="postgresql://..." npm run db:seed

# Hata mesajlarını kontrol edin:
# - Email unique constraint hatası: demo user zaten var
# - Connection hatası: DATABASE_URL yanlış
```

### Prisma schema değişikliği sonrası

```bash
# Development'ta:
npx prisma db push
npm run db:seed

# Production'da:
# 1. Vercel'den .env çekin
vercel env pull
# 2. Migration yapın
npx prisma db push
```

## Güvenlik Notları

1. **Asla** gerçek DATABASE_URL veya AUTH_SECRET'ları git'e commit etmeyin
2. `.env.example` sadece placeholder değerler içermeli
3. Production secret'ları sadece Vercel Dashboard'dan yönetin
4. SEED_SECRET kullanıyorsanız, bunu da güvenli tutun

## Ek Kaynaklar

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Neon Documentation](https://neon.tech/docs/introduction)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Destek:** Sorun yaşıyorsanız, `operator@demo.com` ile test edin ve build log'larını kontrol edin.
