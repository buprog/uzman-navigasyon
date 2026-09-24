import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AdBanner } from "@/components/AdBanner";
import { getSessionUser } from "@/lib/auth";
import { getServerTheme, getServerMode } from "@/lib/theme.server";
import { getServerWeatherCondition } from "@/lib/weather.server";

export const metadata: Metadata = {
  title: "Uzman Navigasyon",
  description: "Tur operatörleri için harita merkezli çok günlük tur planlayıcı",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Uzman Nav",
  },
  applicationName: "Uzman Navigasyon",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ 
  children,
  params,
  searchParams,
}: { 
  children: React.ReactNode;
  params?: any;
  searchParams?: { previewTheme?: string; previewMode?: string; previewWeather?: string };
}) {
  // Resolve theme and mode server-side to prevent flash
  const user = await getSessionUser();
  const previewTheme = searchParams?.previewTheme;
  const previewMode = searchParams?.previewMode;
  const previewWeather = searchParams?.previewWeather;
  
  const theme = getServerTheme(
    user ? {
      gender: user.gender as "MALE" | "FEMALE" | "UNSPECIFIED",
      themePreference: user.themePreference as "neutral" | "female" | "male" | null,
    } : undefined,
    previewTheme
  );

  const mode = getServerMode(
    user ? {
      colorModePreference: user.colorModePreference as "light" | "dark" | null,
    } : undefined,
    previewMode
  );

  // Get weather condition for preview mode
  const weatherCondition = getServerWeatherCondition(previewWeather);

  return (
    <html 
      lang="tr" 
      data-theme={theme} 
      data-mode={mode || undefined}
      data-weather={weatherCondition || undefined}
    >
      <head>
        {/* Inline script to detect system color scheme and prevent flash */}
        {!mode && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
                    const applyMode = (isDark) => {
                      document.documentElement.setAttribute('data-mode', isDark ? 'dark' : 'light');
                    };
                    applyMode(darkQuery.matches);
                    darkQuery.addEventListener('change', (e) => applyMode(e.matches));
                  } catch (e) {}
                })();
              `,
            }}
          />
        )}
        {/* Inline script for client-side weather detection */}
        {!weatherCondition && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    // Check if weather theme is enabled
                    const user = ${user ? `{weatherThemeEnabled: ${user.weatherThemeEnabled}}` : 'null'};
                    const guestEnabled = document.cookie.split(';').find(c => c.trim().startsWith('un_weather_theme='))?.split('=')[1] === 'true';
                    const enabled = user ? user.weatherThemeEnabled : guestEnabled;
                    
                    if (!enabled) return;
                    
                    // Check cache first
                    try {
                      const cached = localStorage.getItem('un_weather_cache');
                      if (cached) {
                        const data = JSON.parse(cached);
                        const age = Date.now() - data.timestamp;
                        if (age < 30 * 60 * 1000) { // 30 min
                          document.documentElement.setAttribute('data-weather', data.condition);
                          return;
                        }
                      }
                    } catch (e) {}
                    
                    // Fetch weather if geolocation is already granted
                    if (navigator.permissions) {
                      navigator.permissions.query({name: 'geolocation'}).then(result => {
                        if (result.state === 'granted') {
                          navigator.geolocation.getCurrentPosition(
                            pos => {
                              const lat = Math.round(pos.coords.latitude * 100) / 100;
                              const lng = Math.round(pos.coords.longitude * 100) / 100;
                              fetch('/api/hava?lat=' + lat + '&lng=' + lng)
                                .then(r => r.json())
                                .then(data => {
                                  if (data.condition) {
                                    document.documentElement.setAttribute('data-weather', data.condition);
                                    try {
                                      localStorage.setItem('un_weather_cache', JSON.stringify({
                                        condition: data.condition,
                                        timestamp: Date.now(),
                                        lat: lat,
                                        lng: lng
                                      }));
                                    } catch (e) {}
                                  }
                                })
                                .catch(() => {});
                            },
                            () => {},
                            { timeout: 5000, maximumAge: 30 * 60 * 1000 }
                          );
                        }
                      }).catch(() => {});
                    }
                  } catch (e) {}
                })();
              `,
            }}
          />
        )}
      </head>
      <body>
        <Nav />
        <InstallPrompt />
        <main className="min-h-[calc(100vh-57px)] pb-24">{children}</main>
        <AdBanner hideOnPages={["/navigasyon", "/__console"]} />
      </body>
    </html>
  );
}
