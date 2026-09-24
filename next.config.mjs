import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    {
      // Authenticated app routes: daha uzun timeout, offline fallback'i minimize et
      urlPattern: ({ request, url }) => {
        const isSameOrigin = self.location.origin === url.origin;
        const isNavigate = request.mode === "navigate";
        const pathname = url.pathname;
        const isAuthRoute = [
          "/planlayici/",
          "/turlar/",
          "/ayarlar",
          "/rezervasyonlar",
        ].some((p) => pathname.startsWith(p));
        return isSameOrigin && isNavigate && isAuthRoute;
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "auth-pages-cache",
        networkTimeoutSeconds: 30, // Çok uzun timeout: emulator için
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 12 * 60 * 60, // 12 hours
        },
        cacheWillUpdate: async ({ response }) => {
          return response && response.status === 200 ? response : null;
        },
      },
    },
    {
      // Diğer same-origin navigations (public routes)
      urlPattern: ({ request, url }) => {
        const isSameOrigin = self.location.origin === url.origin;
        const isNavigate = request.mode === "navigate";
        return isSameOrigin && isNavigate;
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
        cacheWillUpdate: async ({ response }) => {
          return response && response.status === 200 ? response : null;
        },
      },
    },
    {
      urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "maptiler-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "images-cache",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
  ],
})(nextConfig);
