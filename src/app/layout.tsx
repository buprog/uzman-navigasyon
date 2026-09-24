import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AdBanner } from "@/components/AdBanner";
import { getSessionUser } from "@/lib/auth";
import { getServerTheme, getServerMode } from "@/lib/theme.server";

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
  // Resolve theme and mode server-side to prevent flash
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

  const mode = getServerMode(
    user ? {
      colorModePreference: user.colorModePreference as "light" | "dark" | null,
    } : undefined,
    previewMode
  );

  return (
    <html lang="tr" data-theme={theme} data-mode={mode || undefined}>
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
