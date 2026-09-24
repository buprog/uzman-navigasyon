# Progressive Web App (PWA) Özellikleri

Uzman Navigasyon artık Progressive Web App (PWA) özelliklerine sahiptir. Bu, uygulamanın cihazınıza yüklenebilmesini, çevrimdışı çalışabilmesini ve native uygulama benzeri bir deneyim sunmasını sağlar.

## 🚀 Özellikler

### ✅ Web App Manifest
- Uygulama adı, simgeler, tema renkleri yapılandırılmış
- Standalone display modu (adres çubuğu olmadan)
- Portrait-primary oryantasyon
- Marka renklerine uyumlu tema (Teal #0f766e)

### ✅ Service Worker
- Otomatik kayıt ve aktivasyon
- **Navigation caching**: HTML sayfaları için NetworkFirst stratejisi (3sn timeout)
- **Offline fallback**: İnternet yokken `/offline` sayfası gösterilir
- Harita tile'ları için CacheFirst stratejisi
- API istekleri için NetworkFirst stratejisi
- Statik dosyalar için akıllı önbellekleme
- Standalone mod düzgün çalışıyor (Android emulator'da test edildi)

### ✅ Ana Ekrana Ekleme (A2HS)
- Android/Chrome: Otomatik "Yükle" prompt'ı
- iOS Safari: Kullanıcı dostu talimatlar
- LocalStorage ile kullanıcı tercihlerini hatırlama

### ✅ Standalone Mod
- Tam ekran deneyim
- iOS Safari uyumlu meta etiketleri
- Tema rengi desteği

## 🧪 Test Etme

### Chrome/Edge (Desktop ve Android)

1. **Development Modu**
   ```bash
   npm run dev
   ```
   Not: Development'ta service worker devre dışıdır.

2. **Production Build**
   ```bash
   npm run build
   npm start
   ```

3. **Manifest Kontrolü**
   - Chrome DevTools açın (F12)
   - Application sekmesine gidin
   - Sol menüden "Manifest" seçin
   - Tüm alanların doğru göründüğünden emin olun

4. **Service Worker Kontrolü**
   - Application > Service Workers
   - Service worker'ın "activated and is running" durumunda olduğunu kontrol edin
   - "Update on reload" işaretleyerek geliştirme sırasında otomatik güncelleme yapabilirsiniz

5. **Cache Storage Kontrolü**
   - Application > Cache Storage
   - `workbox-precache-*` ve diğer cache'leri görmelisiniz

6. **Ana Ekrana Ekleme**
   - Localhost'ta: Chrome adres çubuğunda "Yükle" butonu görünür
   - Sayfada: Sağ alt köşede "Uygulamayı Yükle" banner'ı belirir
   - Butona tıklayın ve kurulumu tamamlayın
   - Masaüstünde/uygulama çekmecesinde ikon görünecektir

7. **Standalone Mod Test (Android Emulator)**
   - Uygulamayı ana ekrana ekleyin
   - Ana ekran icon'undan açın
   - ✅ Normal ana sayfa görünmeli (Türkçe içerik)
   - ✅ Adres çubuğu olmamalı
   - ✅ Kırık/boş "page" ekranı görmemelisiniz

8. **Offline Mod Test**
   - DevTools > Network > "Offline" seçin
   - Sayfayı yenileyin veya yeni bir route'a gidin
   - `/offline` fallback sayfası görünmeli
   - "Yeniden Dene" butonu çalışmalı

### iOS Safari

1. **Tarayıcıda Aç**
   - Safari'de uygulamayı açın
   - Birkaç saniye sonra sağ alt köşede talimat kartı görünür

2. **Manuel Kurulum**
   - Safari'de Paylaş butonuna (⬆️) dokunun
   - Aşağı kaydırarak "Ana Ekrana Ekle" seçin
   - İsmi onaylayın ve "Ekle" düğmesine dokunun

3. **Ana Ekrandan Açma**
   - Ana ekranda görünen ikona dokunun
   - Uygulama standalone modda açılır (adres çubuğu yok)

### Firefox

1. **Production Build Çalıştırın**
2. **Adres Çubuğu**
   - Sağ tarafta "Ana ekrana ekle" ikonu görünür
   - İkona tıklayın ve kurulumu tamamlayın

## 📱 HTTPS Gereksinimleri

PWA özellikleri (özellikle service worker) yalnızca güvenli bağlamlarda çalışır:

- ✅ `https://` üzerinden sunulan siteler
- ✅ `localhost` (geliştirme için istisna)
- ❌ `http://` (localhost dışında çalışmaz)

### Production Deployment

Uygulamayı aşağıdaki platformlardan birinde deploy edin:

- **Vercel** (önerilen): Otomatik HTTPS
- **Netlify**: Otomatik HTTPS
- **Cloudflare Pages**: Otomatik HTTPS
- **Kendi sunucunuz**: Let's Encrypt ile HTTPS sertifikası

## 🎨 İkonlar

Mevcut ikonlar placeholder'dır. Production için değiştirin:

1. **İkon Boyutları**
   - `public/icons/icon-192.png` (192x192)
   - `public/icons/icon-512.png` (512x512)
   - `public/icons/icon-192-maskable.png` (maskable)
   - `public/icons/icon-512-maskable.png` (maskable)

2. **İkon Tasarımı**
   - Marka renklerini kullanın (Teal #0f766e)
   - Maskable ikonlar için güvenli alan bırakın
   - SVG veya yüksek çözünürlüklü PNG

3. **İkon Oluşturma Araçları**
   - [Maskable.app](https://maskable.app/) - Maskable ikon test
   - [PWA Asset Generator](https://www.pwabuilder.com/) - Otomatik ikon seti
   - Adobe Illustrator / Figma / Inkscape

## 🔧 Yapılandırma

### Manifest Düzenleme

`public/manifest.webmanifest` dosyasını düzenleyin:

```json
{
  "name": "Uzman Navigasyon",
  "short_name": "Uzman Nav",
  "theme_color": "#0f766e",
  ...
}
```

### Service Worker Stratejileri

`next.config.mjs` içinde cache stratejilerini özelleştirin:

```javascript
runtimeCaching: [
  {
    urlPattern: /\/api\/.*/i,
    handler: "NetworkFirst", // veya "CacheFirst", "StaleWhileRevalidate"
    options: { ... }
  }
]
```

### Development'ta SW Aktif Etme

Geliştirme sırasında test için `next.config.mjs`:

```javascript
disable: false, // process.env.NODE_ENV === "development" yerine
```

## 🐛 Sorun Giderme

### Service Worker Kayıtlı Değil
- Production build (`npm run build && npm start`) çalıştırın
- HTTPS veya localhost kullandığınızdan emin olun
- Console'da hata mesajlarını kontrol edin

### Manifest Yüklenmiyor
- `public/manifest.webmanifest` dosyasının var olduğunu kontrol edin
- JSON formatının geçerli olduğunu doğrulayın
- Network sekmesinde manifest isteğini kontrol edin

### İkonlar Görünmüyor
- İkon dosyalarının `public/icons/` altında olduğunu kontrol edin
- Dosya isimlerinin manifest'te belirtildiği gibi olduğunu doğrulayın
- Tarayıcı cache'ini temizleyin

### "Yükle" Butonu Çıkmıyor
- Production build kullanın (dev modda PWA kapalı)
- HTTPS veya localhost üzerinde olduğunuzu kontrol edin
- Zaten yüklü değilse: Settings > Apps'tan kaldırın

### iOS'ta Çalışmıyor
- iOS Safari manifest desteği sınırlıdır
- Manuel kurulum talimatlarını izleyin
- Standalone meta etiketlerinin `layout.tsx`'te olduğunu kontrol edin

### Standalone Modda Kırık/Boş Sayfa (Android)
**Sorun**: Ana ekran icon'undan açıldığında "page" yazısı veya boş ekran

**Çözüm** (artık düzeltildi):
- Navigation için cache stratejisi eklendi
- Offline fallback sayfası (`/offline`) oluşturuldu
- Manifest'te `scope: "/"` açıkça belirtildi
- `start_url: "/?source=pwa"` ile tracking eklendi

**Test**:
- Service Worker > Application > Cache Storage'da `pages-cache` görünmeli
- DevTools Console'da hata olmamalı
- Standalone açılışta normal ana sayfa gelmelidir

## 📚 Ek Kaynaklar

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Next PWA Documentation](https://ducanh-next-pwa.vercel.app/)
- [Can I Use: Service Workers](https://caniuse.com/serviceworkers)

## ✨ Gelecek İyileştirmeler

- [ ] Özel offline sayfası
- [ ] Background sync için notification
- [ ] Yüksek kalite ikonlar
- [ ] Splash screen özelleştirme
- [ ] Push notification desteği (opsiyonel)
- [ ] Offline-first veri yönetimi
