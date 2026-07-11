import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// `--mode artifact` produces a fully inlined single-file build (hash routing,
// everything embedded, no service worker) for running as a self-contained page.
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'artifact'
      ? [viteSingleFile()]
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['bemore.svg', 'icon-180.png'],
            manifest: {
              name: 'Be More — Your Personal AI Coach',
              short_name: 'Be More',
              description:
                'Your AI gym buddy for life: motivation, encouragement and daily accountability towards any goal.',
              theme_color: '#f5f5f7',
              background_color: '#f5f5f7',
              display: 'standalone',
              scope: './',
              start_url: './',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
          }),
        ]),
  ],
  base: mode === 'artifact' ? './' : '/',
}))
