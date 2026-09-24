# Canlı Turn-by-Turn Navigasyon

Uzman Navigasyon uygulamasına eklenen gerçek zamanlı navigasyon özelliği.

## Özellikler

### 1. Adım Adım Sesli Yönlendirme
- **Web Speech API** (TTS) kullanılarak Türkçe sesli talimatlar
- Her manevra için otomatik ses duyurusu
- Dil: `tr-TR` (Türkçe)
- Kullanıcı etkileşimi sonrası TTS aktif olur (tarayıcı güvenlik politikası)

### 2. Gerçek Zamanlı Konum Takibi
- **Geolocation API** `watchPosition` ile sürekli konum güncellemesi
- Yüksek doğruluk modu (`enableHighAccuracy: true`)
- Haritada mavi nokta ile canlı konum gösterimi
- Anlık hız göstergesi (km/h)

### 3. Sapma Durumunda Yeniden Rota Hesaplama
- Rotadan ~50 metre sapma algılandığında otomatik yeniden hesaplama
- Debounce mekanizması ile gereksiz hesaplama spam'i önlenir (2 saniye bekleme)
- OSRM ile dinamik rota güncelleme
- Görsel uyarı: rotadan çıkınca rota çizgisi kırmızıya döner

### 4. Çok Duraklı Navigasyon
- Tur planlayıcıdaki tüm aktif durakları sırayla ziyaret eder
- Her durağa ulaşıldığında otomatik olarak bir sonraki durağa yönlendirir
- Durak sayacı: "Durak 2 / 5" gibi ilerleme gösterir

## Kullanım

### Navigasyonu Başlatma

1. **Planlayıcıdan Başlatma:**
   - `/planlayici/[turId]` sayfasındaki **"🧭 Navigasyonu Başlat"** butonuna tıklayın
   - En az 2 aktif (atlanmamış) durak gereklidir

2. **Konum İzni:**
   - İlk başlatmada tarayıcı konum izni isteyecektir
   - İzin verilmezse navigasyon başlatılamaz
   - **Not:** HTTPS veya localhost üzerinden çalışmalıdır (güvenlik gereksinimi)

3. **Navigasyon Modu:**
   - Tam ekran harita görünümü
   - Üstte: Sonraki manevra kartı (mesafe + talimat)
   - Altta: Hız göstergesi, yeniden hesapla, bitir butonları
   - Durak ilerleme sayacı

### Test Etme

#### Gerçek Cihazda Test
1. Uygulamayı HTTPS üzerinden erişilebilir yapın (örn: ngrok, Vercel)
2. Mobil cihazda açın
3. Konum iznini verin
4. Hareket ederek gerçek navigasyonu test edin

#### Emülatör/Geliştirme Ortamında Test
1. Chrome DevTools → Sensors → Location
2. Manuel olarak GPS koordinatları girin veya route simülasyonu seçin
3. Konum değiştirerek navigasyon akışını test edin

**Alternatif:** Geolocation simülasyon araçları:
- Chrome uzantıları (Location Guard, GPS Emulator)
- Firefox Developer Edition konum simülasyonu

## Teknik Detaylar

### OSRM Rota API
- **Endpoint:** `https://router.project-osrm.org/route/v1/driving/`
- Mevcut konum + kalan duraklar ile multi-stop rota hesaplanır
- Her rota `steps` içerir (manevralar + mesafeler)
- Koordinatlar GeoJSON format (`geometries=geojson`)

### Konum İzleme Parametreleri
```typescript
{
  enableHighAccuracy: true,  // GPS kullan
  timeout: 5000,             // 5 saniye timeout
  maximumAge: 0              // Her zaman güncel konum
}
```

### Off-Route Eşiği
- **50 metre** sapma eşiği
- Rota koordinatlarına minimum mesafe hesaplanır (Haversine)
- Eşik aşıldığında 2 saniye sonra yeniden hesaplama başlar

### Sesli Talimat Örnekleri
- "Yola çıkın"
- "Dönün sağa"
- "Dönel kavşağa girin"
- "Hedefe ulaştınız"
- "Rota yeniden hesaplanıyor"

## Kısıtlamalar

### Tarayıcı Gereksinimleri
- **Geolocation API** desteği gerekli (tüm modern tarayıcılarda var)
- **Web Speech API** (TTS) desteği (Chrome, Edge, Safari destekler; Firefox kısıtlı)
- **HTTPS** veya `localhost` gerekli (güvenlik politikası)

### OSRM Limitleri
- Public OSRM API kullanılır (ücretsiz, ama rate limit var)
- Çok sık istek yapılırsa geçici engellenebilir
- Üretim için kendi OSRM sunucusu önerilir

### Bilinen Sorunlar
1. **TTS İlk Kullanımda Sessiz:**
   - Tarayıcı güvenlik politikası gereği ilk ses kullanıcı etkileşimi sonrası çalışır
   - İlk tıklamadan sonra sesler aktif olur

2. **Emülatörde Gerçek GPS Yok:**
   - Chrome DevTools Sensors kullanarak manuel konum simüle edin
   - Gerçek test için mobil cihaz gerekli

3. **Kapalı Alanda GPS Zayıf:**
   - Bina içinde GPS sinyali zayıflayabilir
   - Dışarıda test edin veya pencere kenarında deneyin

## Güvenlik Notları

⚠️ **Sürüş Güvenliği:**
- Navigasyon başlatmadan önce telefonu güvenli bir tutucu ile sabitleyin
- Hareket halinde telefona dokunmayın
- Sesli talimatları dinleyin, ekrana bakmak zorunda değilsiniz

🔒 **Gizlilik:**
- Konum verileri sadece tarayıcıda işlenir, sunucuya gönderilmez
- OSRM API'sine sadece rota hesaplama için koordinatlar gönderilir

## Geliştirme Notları

### Dosya Yapısı
```
src/
├── lib/
│   └── navigation.ts         # Navigasyon yardımcı fonksiyonları
├── components/
│   └── NavigationView.tsx    # Ana navigasyon bileşeni
└── app/
    └── navigasyon/
        └── [turId]/
            └── page.tsx       # Navigasyon sayfası
```

### Eklenen Bağımlılıklar
- Hiçbir yeni npm paketi eklenmedi
- Mevcut MapLibre GL ve Next.js App Router kullanıldı
- Tamamen tarayıcı API'leri (Geolocation, Web Speech API)

### Gelecek İyileştirmeler
- [ ] Offline harita desteği (Service Worker + cache)
- [ ] Trafik bilgisi entegrasyonu (ücretli API gerekir)
- [ ] Alternatif rotalar öneri
- [ ] Geçmiş rotaları kaydetme
- [ ] Ses seviyesi ayarı
- [ ] Karanlık mod harita stili
- [ ] PWA bildirim desteği (arka planda uyarı)

## Test Senaryosu

### Başarı Kriterleri
✅ Planlayıcıdan "Navigasyonu Başlat" butonu görülüyor  
✅ Konum izni isteniyor ve veriliyor  
✅ Haritada rota çizimi görünüyor  
✅ Mavi nokta ile kullanıcı konumu takip ediliyor  
✅ Sonraki manevra kartı görünüyor (mesafe + talimat)  
✅ Konum değişiminde mesafe güncellenmeye başlıyor  
✅ En az bir manevra sesli olarak duyuruluyor (TTS)  
✅ Rotadan sapma simüle edilince "Rota yeniden hesaplanıyor" uyarısı ve kırmızı çizgi  
✅ Yeniden hesaplama sonrası mavi rota dönüyor  
✅ "Bitir" butonu ile navigasyon sonlandırılıyor ve planlayıcıya dönülüyor  

### Test Adımları
1. Uygulamayı başlatın: `npm run dev`
2. Tarayıcıda `http://localhost:3000` açın
3. `operator@demo.com` / `demo1234` ile giriş yapın
4. Kapadokya Keşif Turu'nu açın (veya yeni tur oluşturun)
5. Planlayıcıda en az 2 durak olduğundan emin olun
6. "🧭 Navigasyonu Başlat" butonuna tıklayın
7. Konum iznini verin
8. Chrome DevTools → Sensors → Location üzerinden konum simüle edin
9. Konumu değiştirerek mesafe güncellemesini gözlemleyin
10. Rotadan uzak bir konum seçerek yeniden hesaplamayı test edin

## Sorun Giderme

### "Konum izni reddedildi"
- Tarayıcı ayarlarından siteye konum izni verin
- Chrome: Adres çubuğundaki kilit simgesi → İzinler → Konum

### "Tarayıcınız konum özelliğini desteklemiyor"
- Modern bir tarayıcı kullanın (Chrome, Edge, Safari, Firefox)
- HTTP yerine HTTPS veya localhost kullandığınızdan emin olun

### Sesler çalışmıyor
- İlk kullanımda bir butona tıkladıktan sonra TTS aktif olur
- Tarayıcı ses ayarlarını kontrol edin
- Firefox'ta TTS desteği sınırlı, Chrome kullanın

### GPS sinyali alınamıyor
- Dışarı çıkın veya pencere kenarına gidin
- WiFi + GPS kombinasyonunu etkinleştirin (mobil cihazlarda)
- Uçak modunu kapatın

### Rota çizilmiyor
- İnternet bağlantınızı kontrol edin (OSRM API'sine erişim gerekli)
- Tarayıcı konsolunu kontrol edin (F12 → Console)
- Public OSRM API'si aşırı yükte olabilir, biraz bekleyip tekrar deneyin

## Katkı

Bu özellik Uzman Navigasyon v1 iskeletine eklenmiştir. Öneriler ve iyileştirmeler için:
- Issue açın veya PR gönderin
- Test sonuçlarınızı paylaşın
- Gerçek kullanım senaryolarınızı bildirin

---

**Son Güncelleme:** 24 Eylül 2026  
**Versiyon:** 1.0.0  
**Durum:** ✅ Çalışır durumda
