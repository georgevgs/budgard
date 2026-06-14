// Push notification handlers — injected into the Workbox-generated SW via importScripts.

// Update activation: claim clients ONLY when the user explicitly applies an
// update. Tapping "Update" posts {type:'SKIP_WAITING'} to the waiting worker;
// we flag that here and run clients.claim() in `activate` so control transfers
// to the new worker (→ controllerchange → the app reloads onto the new version).
// We deliberately do NOT claim on a background activation (e.g. the worker
// activating because all tabs closed), so the app never reloads itself without
// being asked. This replaces workbox's unconditional `clientsClaim: true`.
let claimOnActivate = false;

self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'SKIP_WAITING') return;

  claimOnActivate = true;
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (!claimOnActivate) return;

  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Budgard', body: event.data.text() };
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: payload.tag || 'budgard-notification',
    data: payload.data || { url: '/' },
    vibrate: [10, 40, 10],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Budgard', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.navigate(targetUrl);

            return;
          }
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});
