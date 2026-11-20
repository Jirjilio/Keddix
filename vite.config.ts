import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * La aplicación se publica en https://jirjilio.github.io/Keddix/, es decir,
 * dentro de una subcarpeta. En local se usa '/' y en GitHub Actions el workflow
 * inyecta VITE_BASE_PATH con el nombre del repositorio.
 */
const rutaBase = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base: rutaBase,
  plugins: [
    react(),

    /**
     * Converts the app into an installable PWA: adds a manifest and a service
     * worker that caches the application shell so it opens quickly offline.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Keddix — Planes con amigos',
        short_name: 'Keddix',
        description: 'Organiza quedadas y planes con tus grupos de amigos.',
        lang: 'es',
        start_url: rutaBase,
        scope: rutaBase,
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          {
            src: `${rutaBase}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${rutaBase}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `${rutaBase}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: `${rutaBase}index.html`,
      },
    }),
  ],
})
