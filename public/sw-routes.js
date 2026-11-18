/* Service Worker static routing (Chrome 123+, Safari 27 / iOS 27).
 * Loaded into the generated Workbox worker via `importScripts`. Requests the
 * worker would only pass through anyway go straight to the network, so the
 * browser doesn't have to wake the worker for them: Supabase API/auth/storage
 * calls (RLS-checked, never cached) and the crawler text files. Browsers
 * without addRoutes keep using the normal fetch handler. */
self.addEventListener('install', (event) => {
  if (!('addRoutes' in event)) return
  // Separate calls: if an engine rejects one rule set (e.g. no cross-origin
  // URLPattern), the other still applies. Rejection = fetch handler as before.
  const ignore = () => {}
  event
    .addRoutes({
      condition: { urlPattern: 'https://*.supabase.co/*' },
      source: 'network',
    })
    .catch(ignore)
  event
    .addRoutes({
      condition: {
        or: [
          { urlPattern: '/robots.txt' },
          { urlPattern: '/sitemap.txt' },
          { urlPattern: '/llms.txt' },
        ],
      },
      source: 'network',
    })
    .catch(ignore)
})
