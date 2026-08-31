/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-512-maskable.png',
      ],
      manifest: {
        name: 'Agilearn',
        short_name: 'Agilearn',
        description: 'School management platform for teachers and administrators.',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#faf5ec',
        background_color: '#faf5ec',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            // Logo alone fills icon-512.png edge-to-edge, which Android's
            // adaptive-icon mask would crop — this is the same artwork
            // scaled to ~70% on a solid canvas so it survives any mask shape.
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Without this, the workbox default covers js/css/html only, so an
        // offline launch renders with no self-hosted fonts at all — app.css
        // pulls JetBrains Mono and Dancing Script from /fonts. They are small
        // and immutable, so precaching them is the right trade.
        //
        // Deliberately no "png": the dashboard illustration alone is 2.4 MB,
        // which would more than double the install payload for every teacher
        // to protect an image that degrades gracefully. The app icons are
        // precached anyway via includeAssets above, and /images is handled by
        // the runtime rule below.
        globPatterns: ['**/*.{js,css,html,woff2,svg,ico,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/auth/, /supabase\.co/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Same-origin artwork: too large to precache, but worth keeping
            // after the first view so a revisit offline still looks right.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin === true && url.pathname.startsWith('/images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'agilearn-images',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The Google Fonts stylesheet: revalidate in the background so a
            // cold launch never waits on the network for it.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // The woff2 files themselves — immutable, so cache-first for a year.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // host: true binds the dev server to 0.0.0.0 so it's reachable on the LAN
  // (prints a Network URL) — equivalent to `vite --host`, no package.json change.
  server: {
    host: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
