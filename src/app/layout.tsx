import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AdBanner } from "@/components/AdBanner";
import { DayNightDetector } from "@/components/DayNightDetector";
import { getSessionUser } from "@/lib/auth";
import { getServerTheme } from "@/lib/theme.server";

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
  searchParams?: { previewTheme?: string; previewMode?: string };
}) {
  // Resolve theme server-side to prevent flash
  const user = await getSessionUser();
  const previewTheme = searchParams?.previewTheme;
  const previewMode = searchParams?.previewMode;
  
  const theme = getServerTheme(
    user ? {
      gender: user.gender as "MALE" | "FEMALE" | "UNSPECIFIED",
      themePreference: user.themePreference as "neutral" | "female" | "male" | null,
    } : undefined,
    previewTheme
  );

  // For preview mode, set explicit day/night
  const explicitMode = previewMode === "day" || previewMode === "night" ? previewMode : undefined;

  return (
    <html 
      lang="tr" 
      data-theme={theme}
      data-mode={explicitMode}
    >
      <head>
        {/* Inline script for day/night mode detection - prevents flash */}
        {!explicitMode && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    // Check cache first for today's sunrise/sunset
                    const cached = localStorage.getItem('un_daynight_cache');
                    const now = new Date();
                    const today = now.toISOString().split('T')[0];
                    
                    if (cached) {
                      try {
                        const data = JSON.parse(cached);
                        if (data.date === today) {
                          // Use cached sunrise/sunset
                          const sunrise = new Date(data.sunrise);
                          const sunset = new Date(data.sunset);
                          const time = now.getTime();
                          const mode = time >= sunrise.getTime() && time < sunset.getTime() ? 'day' : 'night';
                          document.documentElement.setAttribute('data-mode', mode);
                          
                          // Schedule re-check at next transition
                          const nextCheck = mode === 'day' ? sunset : 
                            (time < sunrise.getTime() ? sunrise : new Date(sunrise.getTime() + 24*60*60*1000));
                          const delay = Math.max(1000, nextCheck.getTime() - time);
                          setTimeout(() => location.reload(), delay);
                          return;
                        }
                      } catch (e) {}
                    }
                    
                    // Fallback: Use time-based 07:00-19:00 local
                    const hours = now.getHours();
                    const mode = hours >= 7 && hours < 19 ? 'day' : 'night';
                    document.documentElement.setAttribute('data-mode', mode);
                  } catch (e) {
                    // Ultimate fallback
                    document.documentElement.setAttribute('data-mode', 'day');
                  }
                })();
              `,
            }}
          />
        )}
      </head>
      <body>
        <DayNightDetector />
        <Nav />
        <InstallPrompt />
        <main className="min-h-[calc(100vh-57px)] pb-24">{children}</main>
        <AdBanner hideOnPages={["/navigasyon", "/__console"]} />
      </body>
    </html>
  );
}
