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
      // Регистрируем вручную в main.tsx (чтобы не было двойной регистрации).
      injectRegister: null,
      // autoUpdate: при появлении нового SW он self.skipWaiting + clientsClaim,
      // страница перезагружается тем же URL и остаётся в standalone.
      registerType: 'autoUpdate',
      // Кастомный Service Worker (injectManifest): вручную добавляем обработчики
      // push/notificationclick, при этом оставляем кеширование app-shell.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: [
        'icons/icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-192.png',
        'icons/maskable-512.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        id: '/',
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
        dir: 'ltr',
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
        screenshots: [
          {
            src: '/icons/splash-390x844.png',
            sizes: '1170x2532',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Keep Coin — учёт финансов',
          },
          {
            src: '/icons/splash-428x926.png',
            sizes: '1284x2778',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Keep Coin — счета и операции',
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
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
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