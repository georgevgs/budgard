// Push notification handlers — injected into the Workbox-generated SW via importScripts.

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
