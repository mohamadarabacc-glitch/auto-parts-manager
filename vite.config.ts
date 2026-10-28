/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// `npm run build:pages` builds into dist-pages/ for GitHub Pages, where the app lives under /auto-parts-manager/ instead of /.
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/auto-parts-manager/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      // Keep the font files too, so the app looks the same with no internet.
      workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] },
      manifest: {
        // The name under the icon on the phone. Inside the app the title stays 'إدارة قطع السيارات'.
        name: 'Fayad',
        short_name: 'Fayad',
        description: 'إدارة مخزون قطع الغيار والكاراج',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#115e59',
        background_color: '#f1f5f9',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
}))
