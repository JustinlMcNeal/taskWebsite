// ============================================
// SERVICE WORKER — TaskTracker
// Handles push notifications and app install
// ============================================

const CACHE_NAME = 'tasktracker-v1';

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
    // Activate immediately without waiting for old SW to die
    self.skipWaiting();
});

// ---------- ACTIVATE ----------
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// ---------- PUSH ----------
self.addEventListener('push', (event) => {
    let data = { title: 'TaskTracker', body: 'You have a task due soon.' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag || 'tasktracker-notification',
        renotify: true,
        data: { url: data.url || '/' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ---------- NOTIFICATION CLICK ----------
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If app is already open, focus it
            for (const client of windowClients) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
