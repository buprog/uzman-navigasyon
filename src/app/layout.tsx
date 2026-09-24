import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AdBanner } from "@/components/AdBanner";
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
  searchParams?: { previewTheme?: string };
}) {
  // Resolve theme server-side to prevent flash
  const user = await getSessionUser();
  const previewTheme = searchParams?.previewTheme;
  
  const theme = getServerTheme(
    user ? {
      gender: user.gender as "MALE" | "FEMALE" | "UNSPECIFIED",
      themePreference: user.themePreference as "neutral" | "female" | "male" | null,
    } : undefined,
    previewTheme
  );

  return (
    <html lang="tr" data-theme={theme}>
      <body>
        <Nav />
        <InstallPrompt />
        <main className="min-h-[calc(100vh-57px)] pb-24">{children}</main>
        <AdBanner hideOnPages={["/navigasyon", "/__console"]} />
      </body>
    </html>
  );
}
