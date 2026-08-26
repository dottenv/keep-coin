import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // Dev-сервис-воркер кэширует чанки со старыми хэшами и ломает Hot-reload
      // (и даёт «две React» → белый экран). В разработке PWA не нужен.
      devOptions: { enabled: false },
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-192.png',
        'icons/maskable-512.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        name: 'Keep Coin',
        short_name: 'Keep Coin',
        description: 'Учёт личных и семейных финансов',
        theme_color: '#059669',
        background_color: '#ecfdf5',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ru',
        categories: ['finance', 'productivity', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'Добавить операцию',
            short_name: 'Операция',
            url: '/add?type=expense',
          },
          {
            name: 'Счета',
            short_name: 'Счета',
            url: '/accounts',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Навигация: сначала свежий HTML (чтобы не было «старого» index.html
            // со ссылками на отсутствующие ассеты), при медленном/офлайн — из кеша.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'keep-coin-pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // CSS/JS/шрифты (хешированные имена): отдаём из кеша мгновенно,
            // в фоне обновляем — исключает «черно-белый» UI при сбое сети.
            urlPattern: ({ request, destination }) =>
              destination === 'style' || destination === 'script' || destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'keep-coin-static',
              expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Картинки: CacheFirst (не менять, не перезапрашивать).
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'keep-coin-images',
              expiration: { maxEntries: 32, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    // Dev-туннель через CloudPub: Vite прилетает Host произвольного поддомена
    // *.cloudpub.ru, поэтому отключаем проверку Host целиком, чтобы сервер
    // не блокировал запросы (403 Blocked request).
    allowedHosts: true,
    proxy: {
      '/api': {
        // В docker-compose переопределяется через VITE_PROXY_TARGET → http://backend:5000
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
}) satisfies UserConfig