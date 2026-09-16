/**
 * 押し出された知らせを受けて、端末に出す係。
 *
 * ブラウザは閉じていても、この係だけは起こされる。
 * 起こす側は .github/workflows/push.yml（10分おきに走る）。
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || '伝書鳩';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      // 同じ鳩の知らせが二度来ても、重ならずに上書きされる
      tag: payload.tag || title,
      data: { url: payload.url || './' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })()
  );
});
