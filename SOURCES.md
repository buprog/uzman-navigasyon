# Veri Kaynakları — Yetkili Servis, Şarj, POI

Bu dosya, seed veritabanında kullanılan tüm verilerin kaynaklarını listeler.

## Yetkili Servis Noktaları

### Toyota (3 nokta)
- **Kaynak:** https://www.toyota.com.tr yetkili servis ağı sayfası
- **Doğrulama:** Google Maps + Toyota resmi web sitesi
- **Şehirler:** İstanbul (Kartal), Ankara (Yenimahalle), Antalya (Kepez)
- **Not:** Adres ve telefon bilgileri 2026 itibariyle doğrulanabilir public listingslerden alınmıştır.

### Volkswagen (3 nokta)
- **Kaynak:** https://www.volkswagen.com.tr (Doğuş Otomotiv yetkili servisleri)
- **Doğrulama:** Google Maps + VW resmi web sitesi
- **Şehirler:** İstanbul (Ümraniye), Ankara (Çankaya/Söğütözü), Antalya (Kepez)

### Renault (3 nokta)
- **Kaynak:** https://www.renault.com.tr (Mais Otomotiv yetkili servisleri)
- **Doğrulama:** Google Maps + Renault/Mais resmi web siteleri
- **Şehirler:** İstanbul (Pendik), Ankara (Macunköy), Antalya (Kepez)

### Ford (3 nokta)
- **Kaynak:** https://www.ford.com.tr yetkili servis ağı
- **Doğrulama:** Google Maps + Ford resmi web sitesi
- **Şehirler:** İstanbul (Kartal), Ankara (Macunköy), Antalya (Kepez)

### Hyundai (3 nokta)
- **Kaynak:** https://www.hyundai.com.tr (Hyundai Assan yetkili servisleri)
- **Doğrulama:** Google Maps + Hyundai resmi web sitesi
- **Şehirler:** İstanbul (Ümraniye), Ankara (Macunköy), Antalya (Kepez)

### Fiat (3 nokta)
- **Kaynak:** https://www.fiat.com.tr yetkili servis ağı
- **Doğrulama:** Google Maps + Fiat resmi web sitesi
- **Şehirler:** İstanbul (Kartal), Ankara (Çankaya/Öveçler), Antalya (Kepez)

### BMW (3 nokta)
- **Kaynak:** https://www.bmw.com.tr (Borusan Otomotiv yetkili servisleri)
- **Doğrulama:** Google Maps + BMW/Borusan resmi web siteleri
- **Şehirler:** İstanbul (Ümraniye), Ankara (Çankaya/Söğütözü), Antalya (Kepez)

## Şarj İstasyonları

### ZES (3 istasyon)
- **Kaynak:** https://www.zes.energy şarj noktaları haritası
- **Doğrulama:** ZES mobil uygulaması + Google Maps
- **Lokasyonlar:** Ankara (Macunköy, Söğütözü), Afyonkarahisar (Merkez)
- **Konektör Tipleri:** Type 2, CCS

### Trugo (3 istasyon)
- **Kaynak:** https://www.trugo.com.tr şarj istasyonları
- **Doğrulama:** Trugo mobil uygulaması + Google Maps
- **Lokasyonlar:** İstanbul (Kartal, Ümraniye), Bolu (Merkez/D100)
- **Konektör Tipleri:** Type 2, CCS, CHAdeMO

### Eşarj (2 istasyon)
- **Kaynak:** https://www.esarj.com.tr şarj noktaları
- **Doğrulama:** Eşarj mobil uygulaması + Google Maps
- **Lokasyonlar:** Antalya (Kepez, Konyaaltı)
- **Konektör Tipleri:** Type 2, CCS

**Not:** Şarj istasyonu sayıları ve konumları hızla değişebilir. Gerçek zamanlı bilgi için ilgili şarj ağının mobil uygulamasını kullanın.

## POI (İlgi Çekici Noktalar)

### Lokantalar (6 adet)
- **Kaynak:** Google Maps (doğrulanabilir public business listings)
- **Şehirler:** Ankara (2), İstanbul (2), Antalya (2)
- **Örnekler:**
  - Trilye Restaurant (Ankara/Kavaklıdere) — Google Maps
  - Kanaat Lokantası (İstanbul/Üsküdar) — Google Maps, tarihi restoran
  - 7 Mehmet (Antalya/Muratpaşa) — Google Maps

**Not:** Tüm lokanta verileri Google Maps'te public olarak listelenmiş, telefon ve adres bilgileri olan işletmelerden alınmıştır.

### Oteller (6 adet)
- **Kaynak:** Google Maps + otel web siteleri
- **Şehirler:** Ankara (2), İstanbul (2), Antalya (2)
- **Örnekler:**
  - Sheraton Ankara Hotel — Google Maps + sheraton.com
  - Rixos Pera Istanbul — Google Maps + rixos.com
  - Rixos Downtown Antalya — Google Maps + rixos.com

### Eğlence (6 adet)
- **Kaynak:** Google Maps + OpenStreetMap
- **Şehirler:** Ankara (2), İstanbul (2), Antalya (2)
- **Örnekler:**
  - Gençlik Parkı (Ankara) — OSM + Google Maps
  - İstanbul Akvaryum — Google Maps + istanbulakvaryum.com
  - Antalya Aquarium — Google Maps + antalyaaquarium.com

### Sağlık (12 adet)

#### Hastaneler (Acil Servisli — isEmergency: true)
- **Kaynak:** T.C. Sağlık Bakanlığı + Google Maps
- **Şehirler:** Ankara (3), İstanbul (3), Antalya (3)
- **Örnekler:**
  - Ankara Şehir Hastanesi — T.C. Sağlık Bakanlığı resmi web sitesi
  - İstanbul Şehir Hastanesi — T.C. Sağlık Bakanlığı resmi web sitesi
  - Kartal Dr. Lütfi Kırdar Şehir Hastanesi — T.C. Sağlık Bakanlığı
  - Antalya Şehir Hastanesi — T.C. Sağlık Bakanlığı

**Acil Not:** Tüm şehir hastaneleri ve büyük devlet hastaneleri 7/24 acil servis hizmetine sahiptir. Koordinatlar ve telefon numaraları doğrulanmıştır.

#### Sağlık Ocakları (isEmergency: false)
- **Kaynak:** T.C. Sağlık Bakanlığı + Google Maps
- **Şehirler:** Ankara (1), İstanbul (1), Antalya (1)
- **Örnekler:**
  - Çankaya Sağlık Ocağı (Ankara)
  - Kartal Aile Sağlığı Merkezi (İstanbul)
  - Muratpaşa Toplum Sağlığı Merkezi (Antalya)

## Koordinat ve Adres Doğrulaması

### Metodoloji
1. **İlk Kaynak:** Resmi web siteleri (marka, kuruluş, devlet)
2. **Doğrulama:** Google Maps business listings
3. **Koordinat Belirleme:** Google Maps lat/lng picker + OpenStreetMap
4. **Çapraz Kontrol:** En az 2 farklı kaynakla doğrulanmış

### Seed Veri Niteliği
- **Gerçek Veriler:** Evet, tüm veriler public kaynaklardan alınmıştır
- **Tamlık:** Hayır, kapsamlı değil — demo ve koridor (İstanbul–Ankara–Antalya) odaklıdır
- **Güncellik:** 2026 Q1 itibariyle doğrulanmıştır; değişebilir
- **Üretim Kullanımı:** Ek doğrulama ve güncel veri kaynakları entegrasyonu gerektirir

## Reverse Geocoding (İl/İlçe Bilgisi)

- **Kaynak:** Nominatim (OpenStreetMap Reverse Geocoding API)
- **Endpoint:** https://nominatim.openstreetmap.org/reverse
- **Lisans:** ODbL (Open Database License)
- **Kullanım Politikası:** Fair use (1 req/sec limit)
- **User-Agent:** "UzmanNavigasyon/1.0 (tour planner)"

## Haversine Mesafe Hesaplama

- **Algoritma:** Haversine formülü
- **Kaynak:** Public domain matematiksel formül
- **Doğruluk:** ~99.5% doğru kuş bakışı mesafe
- **Not:** Yol mesafesi değil, dünya yüzeyi üzerinde iki nokta arası en kısa mesafe

## Telif Hakları ve Sorumluluk Reddi

### Marka İsimleri
Tüm marka isimleri (Toyota, Volkswagen, Renault, vb.) ilgili şirketlerin tescilli markalarıdır. Bu projede bilgilendirme amaçlı kullanılmıştır.

### Veri Doğruluğu
Seed verileri en iyi çaba ile public kaynaklardan derlenmiştir. Ancak:
- Adresler değişebilir
- Telefonlar güncellenebilir
- İşletmeler kapanabilir
- Yeni lokasyonlar açılabilir

**Kullanıcılar, kritik durumlarda (özellikle acil sağlık) resmi kaynakları kontrol etmelidir.**

### 112 Acil Çağrı
Bu uygulama 112 ile entegre DEĞİLDİR. Acil durumda doğrudan 112'yi arayın.

## Veri Ekleme / Güncelleme Talebi

Yeni servis, şarj veya POI eklemek isterseniz:
1. Resmi kaynak URL'sini belirtin
2. Koordinatları Google Maps'ten alın
3. `prisma/seed.ts` dosyasına ekleyin
4. Pull request açın (varsa repository)

## Referanslar

1. T.C. Sağlık Bakanlığı — https://www.saglik.gov.tr
2. OpenStreetMap — https://www.openstreetmap.org
3. Nominatim API — https://nominatim.org
4. Google Maps Platform — https://maps.google.com
5. Marka Resmi Web Siteleri (yukarıda listelenmiştir)

---

**Son Güncelleme:** 24 Eylül 2026
**Veri Sürümü:** v1.0-seed
**Toplam Kayıt:** 21 servis + 8 şarj + 30 POI = 59 adet
