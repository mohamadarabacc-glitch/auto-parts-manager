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
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'إدارة قطع السيارات',
        short_name: 'قطع السيارات',
        description: 'إدارة مخزون قطع الغيار والكاراج',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#0f172a',
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
