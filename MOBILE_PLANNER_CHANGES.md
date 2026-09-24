# Mobil Planlayıcı Geliştirmeleri

Branch: `cursor/mobile-bottom-sheet-8782`
PR: https://github.com/buprog/uzman-navigasyon/pull/13

## Yapılan Değişiklikler

### 1. InstallPrompt - OS/Tarayıcı Nötr Banner
**Dosya:** `src/components/InstallPrompt.tsx`

- **Öncesi:** "Safari'de Paylaş düğmesine dokunun"
- **Sonrası:** "Tarayıcınızdaki Paylaş düğmesine (veya ⋮ menüsüne) dokunun"
- Daha kompakt tasarım (daha az padding, küçük ikonlar)
- Standalone modda otomatik gizlenme (`display-mode: standalone` + `navigator.standalone`)
- localStorage ile dismiss durumu hatırlanır

### 2. BottomSheet Komponenti (YENİ)
**Dosya:** `src/components/BottomSheet.tsx`

Özellikler:
- **3 snap noktası:** 
  - Collapsed: 120px (özet görünümü)
  - Half: 50vh (yarı genişlik)
  - Expanded: 90vh (tam içerik, scroll)
- **Drag mekanizması:** Pointer Events + touch fallback
- **Handle:** Görünür tutamaç (drag veya tap-to-cycle)
- **Smooth animasyon:** `transform: translateY` + CSS transition
- **Güvenli alan desteği:** `env(safe-area-inset-bottom)`
- **Scroll yönetimi:** İçerik expanded modda scroll, `overscroll-behavior: contain`

### 3. MapView Güncellemeleri
**Dosya:** `src/components/MapView.tsx`

Yeni özellikler:
- **Compact AttributionControl:** 
  - `compact: true` ile başlar (küçük ⓘ butonu)
  - Bottom-left konumlandırma
  - Tap ile genişler
- **Custom attribution:** "Rota: OSRM (yoksa kuş bakışı)"
- **Tap detection:** 
  - mousedown/touchstart pozisyonu kaydedilir
  - click event'te 10px threshold kontrolü (drag vs tap ayırımı)
  - 500ms timeout
- **onMapTap callback:** Yeni prop, chrome toggle için
- **mapRef prop:** Parent'tan map.resize() çağırabilme
- **showAttribution prop:** Attribution kontrolünü açma/kapama

### 4. Planlayıcı Sayfası - Mobil Layout
**Dosya:** `src/app/planlayici/[turId]/page.tsx`

#### Mobil (< lg breakpoint):
```
┌─────────────────────────────────┐
│ Top Toolbar (gizlenebilir)      │ ← fullScreenMap ? hidden : visible
├─────────────────────────────────┤
│                                 │
│         Harita (tam ekran)      │ ← absolute inset-0
│                                 │
│                                 │ ← tap → toggle chrome
│                                 │
└─────────────────────────────────┘
      ┌───────────────────┐
      │ Bottom Sheet      │ ← draggable, 3 snaps
      │ (Plan + Duraklar) │
      └───────────────────┘
           [112] ← floating button (full-screen modda)
```

**Yeni State:**
- `fullScreenMap`: Chrome gizlenme durumu
- `addStopMode`: Durak ekleme modu toggle
- `mapRef`: Map instance'a referans

**Davranışlar:**
- **Tap map:** Chrome toggle (tap vs drag ayırımı)
- **Durak ekleme:** "Durak ekle" butonu → mode aktif → haritaya tap
- **Floating 112:** Tam ekran modda görünür (top-right, z-40)
- **Bottom sheet:** Plan paneli içinde (collapsed/half/expanded)

#### Desktop (≥ lg breakpoint):
- **Değişiklik yok:** Side panel + harita düzeni korundu
- Toolbar her zaman görünür
- 112 butonu inline

## Manuel Test Adımları

### Gereksinimler
1. PostgreSQL database (veya demo mode)
2. Dev server: `npm run dev`
3. Mobile viewport: Chrome DevTools veya gerçek cihaz

### Test Senaryoları

#### A. Mobil (390x844 - iPhone 12 Pro)
1. **Default görünüm:**
   - Bottom sheet collapsed (120px peek)
   - Top toolbar görünür
   - Harita altında

2. **Bottom sheet interactions:**
   - Handle'ı drag up → half snap (50vh)
   - Handle'a tap → expanded snap (90vh)
   - Handle'a tap → collapsed snap (döngü)
   - Expanded modda içerik scroll

3. **Full-screen mode:**
   - Haritaya tap (marker/control değil)
   - Top toolbar kaybolur (-translate-y-full)
   - Bottom sheet kaybolur
   - Floating 112 butonu görünür (top-right)
   - Haritaya tekrar tap → geri döner

4. **Durak ekleme:**
   - "Durak ekle" butonu → mod aktif (yeşil)
   - Haritaya tap → durak eklenir
   - Drawer açılır → durak düzenle

#### B. Küçük Mobil (360x740)
- Tüm fonksiyonlar çalışmalı
- Bottom sheet snap yükseklikleri viewport'a göre ayarlanır
- Horizontal overflow yok

#### C. Desktop (1280x800)
- Side panel + harita düzeni
- Bottom sheet yok (desktop: side panel)
- Toolbar her zaman görünür
- Tap-to-toggle çalışmaz (≥ lg)

### Attribution Kontrolü
1. **Collapsed (default):**
   - Bottom-left'te küçük ⓘ butonu (opacity ~0.6)
   - Hover → opacity artar

2. **Expanded:**
   - Tap ⓘ → "© OpenStreetMap | MapLibre | Rota: OSRM"
   - Tekrar tap → collapse

3. **Full-screen modda:**
   - ⓘ butonu görünür kalır
   - Floating 112 ile çakışmaz

## Build & Lint

```bash
npm run build  # ✅ Başarılı
npm run lint   # (varsa)
```

## Notlar

- **Küçük footprint:** payment, admin, Prisma schema, env, theme değişmedi
- **Geriye uyumlu:** Desktop kullanıcılar etkilenmedi
- **OSM lisansı:** Attribution compact ama erişilebilir (ODbL gereksinimi)
- **Emergency access:** 112 her zaman erişilebilir
- **No heavy dependencies:** Vanilla Pointer Events + CSS transitions

## İlgili PR'lar

- PR #12: Mobile responsive (Nav, hamburger, xs breakpoint) - merged
- PR #13: Bu PR (bottom sheet, tap-to-toggle, attribution)
