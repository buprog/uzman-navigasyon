# Yetkili Servis ve Çevremde Ne Var — Mimari Dokümantasyon

## Genel Bakış

Uzman Navigasyon uygulamasına, kullanıcıların mevcut konumlarına göre yakınlarındaki servisleri, şarj istasyonlarını ve POI'leri (lokanta, otel, eğlence, sağlık) bulabilmeleri için yeni bir altyapı eklenmiştir.

## Özellikler

### 1. "Çevremde ne var" Ana Özellik

**Erişim:** Ana sayfa üzerinde kalıcı buton (`/cevremde`)

**İşlevsellik:**
- Kullanıcının mevcut konumunu alır (geolocation API)
- Konum kartı gösterir: İl/İlçe (reverse geocode), lat/lng, "Paylaş" butonu
- Harita üzerinde kullanıcının konumunu belirgin kırmızı pin ile gösterir
- 6 kategori için akordeon bölümleri:
  - 🍽️ Lokanta
  - 🏨 Otel
  - 🎭 Eğlence
  - 🏥 Sağlık (alt-filtre: "Sadece acil sağlık" — 112/ER)
  - 🔧 Servis (araç markası bazlı, ayarlardan belirlenen marka)
  - ⚡ Şarj (tüm şarj istasyonları)

**Acil/Arıza Modu:**
- Konum kartını ön plana çıkarır (vurgulu, ring efekti)
- POI listelerini arka plana iter (opaklık azaltılır)
- Hızlı konum paylaşımı için optimize edilmiştir

**Konum Paylaşımı:**
- "Paylaş" butonu: Web Share API (varsa) veya clipboard kopyalama
- Format: `lat, lng` (navigasyon uygulamalarında kullanılabilir)
- Il/ilçe bilgisi de mesajda yer alır

### 2. Oto-Duruş Bildirimleri

**Ayarlar:** `Ayarlar > Araç ve sürücü profili > Oto-duruş bildirimleri`
- **Varsayılan:** AÇIK
- **Açıkken:** Araç durduğunda (GPS hız ≈ 0 ve N saniye bekleme), "Çevremde ne var" otomatik gösterilir veya bildirim gönderilir
- **Kapalıyken:** Sadece manuel buton çalışır

**Not:** Bu sürümde oto-duruş algılama stub olarak eklenmiştir. Gerçek GPS hız izleme ve bildirim sistemi ileride entegre edilecektir.

### 3. Veri Modelleri

#### AuthorizedService (Yetkili Servis)
```typescript
{
  id: string
  brand: string        // Toyota, Volkswagen, Renault, Ford, Hyundai, vb.
  models: string       // boş = tüm modeller; virgülle ayrılmış model listesi
  name: string
  address: string
  city: string
  province: string     // il
  phone: string
  website: string
  lat: number
  lng: number
  notes: string
  source: string       // veri kaynağı URL (dokümantasyon)
}
```

#### ChargingStation (Şarj İstasyonu)
```typescript
{
  id: string
  name: string
  network: string      // ZES, Trugo, Eşarj, vb.
  address: string
  city: string
  province: string
  lat: number
  lng: number
  connectors: string   // Type 2, CCS, CHAdeMO, vb.
  phone: string
  notes: string
  source: string
}
```

#### POI (İlgi Çekici Nokta)
```typescript
{
  id: string
  category: string     // restaurant | hotel | entertainment | health
  name: string
  address: string
  city: string
  province: string
  phone: string
  lat: number
  lng: number
  isEmergency: boolean // acil servis / 112 (sadece health kategorisi)
  notes: string
  source: string
}
```

### 4. API Endpoint'leri

#### `GET /api/services/nearest`
Kullanıcının konumuna göre en yakın yetkili servisleri bulur (marka filtreleme ile).

**Query Parametreleri:**
- `lat` (required): Kullanıcı enlemi
- `lng` (required): Kullanıcı boylamı
- `brand` (optional): Araç markası (örn. "Toyota")
- `limit` (optional): Sonuç sayısı (varsayılan: 5)

**Response:**
```json
{
  "nearest": [
    {
      "id": "...",
      "brand": "Toyota",
      "name": "Toyota Plaza Ankara",
      "address": "...",
      "city": "Yenimahalle",
      "province": "Ankara",
      "phone": "+90 312 ...",
      "website": "https://...",
      "lat": 39.9667,
      "lng": 32.7833,
      "distanceKm": 2.5
    }
  ]
}
```

#### `GET /api/charging/nearest`
Kullanıcının konumuna göre en yakın şarj istasyonlarını bulur.

**Query Parametreleri:**
- `lat` (required)
- `lng` (required)
- `limit` (optional, varsayılan: 5)

**Response:**
```json
{
  "nearest": [
    {
      "id": "...",
      "name": "ZES Ankara Macunköy",
      "network": "ZES",
      "address": "...",
      "city": "Yenimahalle",
      "province": "Ankara",
      "phone": "+90 850 ...",
      "connectors": "Type 2, CCS",
      "lat": 39.9911,
      "lng": 32.7544,
      "distanceKm": 1.8
    }
  ]
}
```

#### `GET /api/pois/nearest`
Kullanıcının konumuna göre en yakın POI'leri bulur.

**Query Parametreleri:**
- `lat` (required)
- `lng` (required)
- `category` (optional): restaurant | hotel | entertainment | health
- `emergencyOnly` (optional): "true" ise sadece isEmergency=true POI'ler döner
- `limit` (optional, varsayılan: 10)

**Response:**
```json
{
  "nearest": [
    {
      "id": "...",
      "category": "health",
      "name": "Ankara Şehir Hastanesi",
      "address": "...",
      "city": "Çankaya",
      "province": "Ankara",
      "phone": "+90 312 ...",
      "lat": 39.8778,
      "lng": 32.7456,
      "distanceKm": 3.2,
      "isEmergency": true
    }
  ]
}
```

#### `GET /api/geo/location`
Koordinatları il/ilçe bilgisine çevirir (reverse geocode).

**Query Parametreleri:**
- `lat` (required)
- `lng` (required)

**Response:**
```json
{
  "lat": 39.9667,
  "lng": 32.7833,
  "il": "Ankara",
  "ilce": "Yenimahalle",
  "success": true
}
```

### 5. Mesafe Hesaplama

**Haversine Formülü:** `src/lib/fuelEstimate.ts:haversineKm()`
- Kuş bakışı mesafe hesaplar (iki koordinat arası)
- Sonuç km cinsinden döner
- En yakın sonuçlar için mesafeye göre sıralama yapılır

**Kullanım:** `src/lib/locationQueries.ts:findNearest()`
- Verilen liste içinden en yakın N öğeyi bulur
- Her öğeye `distanceKm` alanı ekleyerek döner

### 6. Seed Verileri

#### Yetkili Servisler (21 adet)
Markalar: Toyota (3), Volkswagen (3), Renault (3), Ford (3), Hyundai (3), Fiat (3), BMW (3)

**Kaynak:** Marka web siteleri ve Google Maps verileri
**Koridor:** İstanbul, Ankara, Antalya odaklı

#### Şarj İstasyonları (8 adet)
Ağlar: ZES, Trugo, Eşarj

**Kaynak:** Şarj ağları web siteleri
**Koridor:** İstanbul–Ankara–Bolu–Afyon–Antalya

#### POI'ler (30 adet)
- Lokantalar: 6 adet
- Oteller: 6 adet
- Eğlence: 6 adet
- Sağlık: 12 adet (3 acil servisli hastane, 3 devlet hastanesi, 3 sağlık ocağı)

**Kaynak:** Google Maps ve T.C. Sağlık Bakanlığı verileri

### 7. Harita Entegrasyonu

**MapView Bileşeni:** `src/components/MapView.tsx`

**Yeni Özellik: Kullanıcı Konumu**
- `userLocation` prop'u ile kullanıcı konumu alınır
- Kırmızı, belirgin, büyük pin ile gösterilir (📍 emoji)
- Harita sınırları (bounds) kullanıcı konumu + POI'leri içerecek şekilde ayarlanır
- Diğer markerlardan farklı stil (gradient, shadow, ring efekti)

### 8. Genişletme Noktaları

#### Yeni Marka/Servis Ekleme
1. `prisma/seed.ts` dosyasına yeni servis objeleri ekleyin
2. `brand`, `name`, `address`, `city`, `province`, `phone`, `lat`, `lng`, `source` alanlarını doldurun
3. `npm run db:seed` komutu ile veritabanını güncelleyin

#### Yeni Şarj İstasyonu Ekleme
1. `prisma/seed.ts` içinde `chargers` dizisine yeni obje ekleyin
2. `network`, `connectors` gibi alanları doldurun
3. Seed komutunu çalıştırın

#### Yeni POI Ekleme
1. `prisma/seed.ts` içinde `pois` dizisine yeni obje ekleyin
2. `category` değerini doğru seçin: `restaurant | hotel | entertainment | health`
3. Sağlık kategorisi için `isEmergency: true/false` belirleyin
4. Seed komutunu çalıştırın

#### Toplu Import Script (Gelecek)
Mevcut yapı manuel seed ile çalışır. İleride:
- Marka dealer API'leri ile otomatik senkronizasyon
- OSM POI import script'i
- Şarj ağları API entegrasyonu
eklenebilir.

**Script Stub Yeri:** `scripts/import-services.ts` (oluşturulacak)

### 9. Test ve Kullanım

#### Manuel Test
1. Ana sayfaya gidin
2. "Çevremde ne var" butonuna tıklayın
3. Tarayıcı konum iznini verin
4. Konum kartının il/ilçe bilgisini kontrol edin
5. Kategori akordeonlarını açarak yakındaki yerleri görün
6. "Paylaş" butonu ile koordinatları kopyalayın/paylaşın
7. Acil modu açarak konum kartının vurgulandığını görün

#### Ayarlar Testi
1. `/ayarlar` sayfasına gidin
2. Araç markası ve modeli seçin
3. "Oto-duruş bildirimleri" checkbox'ını test edin
4. Ayarları kaydedin
5. "Çevremde ne var" sayfasında Servis kategorisinin marka bazlı filtreleme yaptığını kontrol edin

#### Geliştirme Sunucusu
```bash
npm run dev
```

Uygulama `http://localhost:3000` üzerinde çalışacaktır.

## Teknik Detaylar

### Reverse Geocoding
- **Provider:** Nominatim (OpenStreetMap)
- **User-Agent:** "UzmanNavigasyon/1.0 (tour planner)"
- **Dil:** Türkçe (`accept-language=tr`)
- **Fallback:** Koordinat başarısız olursa "Bilinmeyen İl/İlçe" gösterilir

### Geolocation
- **Browser API:** `navigator.geolocation.getCurrentPosition()`
- **Timeout:** Tarayıcı varsayılanı
- **Hata Durumu:** Kullanıcıya hata mesajı gösterilir, konum alınamaz

### Akordeon UX
- **Varsayılan:** Tüm kategoriler kapalı
- **Multi-Open:** Kullanıcı birden fazla kategoriyi aynı anda açabilir
- **Lazy Load:** Kategori açıldığında ilgili veriler API'den çekilir
- **Cache:** Client-side state, sayfa refresh'te sıfırlanır

## Gelecek Geliştirmeler

1. **Oto-duruş algılama gerçek implementasyonu:**
   - GPS hız izleme
   - Background service (mobile)
   - Push notification entegrasyonu

2. **Canlı veri entegrasyonları:**
   - Marka dealer API'leri
   - Şarj ağları gerçek zamanlı durum
   - Google Places API (POI için)

3. **Navigasyon linkleri:**
   - Google Maps deep link
   - Apple Maps deep link
   - Waze deep link

4. **Telefon araması:**
   - `tel:` protokolü ile doğrudan arama
   - Click-to-call butonları

5. **Gelişmiş filtreler:**
   - Mesafe yarıçapı belirleme
   - Açık/kapalı durumu (restoranlar için)
   - Fiyat aralığı (oteller için)

## Kaynaklar ve Atıflar

### Yetkili Servis Verileri
- Toyota: https://www.toyota.com.tr (yetkili servis ağı)
- Volkswagen: https://www.volkswagen.com.tr (Doğuş Otomotiv)
- Renault: https://www.renault.com.tr (Mais Otomotiv)
- Ford: https://www.ford.com.tr
- Hyundai: https://www.hyundai.com.tr (Hyundai Assan)
- Fiat: https://www.fiat.com.tr
- BMW: https://www.bmw.com.tr (Borusan Otomotiv)

### Şarj İstasyonları
- ZES: https://www.zes.energy
- Trugo: https://www.trugo.com.tr
- Eşarj: https://www.esarj.com.tr

### POI ve Sağlık
- Google Maps (verifiable public listings)
- T.C. Sağlık Bakanlığı (hastaneler ve acil servisler)
- OpenStreetMap (POI veritabanı)

## Lisans ve Uyarılar

**Veri Doğruluğu:** Seed verileri gerçek/doğrulanabilir kaynaklardan alınmıştır, ancak değişebilir. Güncel veriler için marka ve kuruluşların resmi web sitelerini ziyaret edin.

**Acil Durum:** 112 entegrasyonu yoktur. Gerçek acil durumda doğrudan 112'yi arayın.

**Ödeme/Ticari Kullanım:** Bu uygulama demo/eğitim amaçlıdır. Gerçek ödeme veya ticari kullanım için ek entegrasyonlar gereklidir.
