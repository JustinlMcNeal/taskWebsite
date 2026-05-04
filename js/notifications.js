// ============================================
// NOTIFICATIONS — Web Push API
// ============================================
const VAPID_PUBLIC_KEY = 'BHtZGp7K9HDEHUQKm3K8BBTLmmJj0H3NdHj5ExuWsYkJyf9fePlxVlZVCqJo-0GA5cvw5fmfx_IV3iLGdoIMwz4';

const Notifications = {
    _supported() {
        return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    },

    _urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
    },

    async _getRegistration() {
        return navigator.serviceWorker.ready;
    },

    async _getSubscription() {
        const reg = await this._getRegistration();
        return reg.pushManager.getSubscription();
    },

    async init() {
        if (!this._supported()) return;
        const btn = document.getElementById('notif-bell');
        if (!btn) return;
        btn.classList.remove('hidden');
        const sub = await this._getSubscription();
        this._updateBell(!!sub);
        btn.addEventListener('click', () => this.toggle());
    },

    _updateBell(subscribed) {
        const btn = document.getElementById('notif-bell');
        if (!btn) return;
        localStorage.setItem('notif_subscribed', subscribed ? '1' : '0');
        if (subscribed) {
            btn.title = 'Notifications on — click to turn off';
            btn.classList.add('text-indigo-400');
            btn.classList.remove('text-gray-400');
        } else {
            btn.title = 'Turn on notifications';
            btn.classList.remove('text-indigo-400');
            btn.classList.add('text-gray-400');
        }
    },

    async subscribe() {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        const reg = await this._getRegistration();
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this._urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        const key = sub.getKey('p256dh');
        const auth = sub.getKey('auth');
        const { error } = await db.from('push_subscriptions').insert({
            user_id: this._deviceId(),
            endpoint: sub.endpoint,
            p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
            auth: btoa(String.fromCharCode(...new Uint8Array(auth)))
        });
        if (error) console.error('Failed to save subscription:', error);
        this._updateBell(true);
    },

    async unsubscribe() {
        const sub = await this._getSubscription();
        if (sub) {
            await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            await sub.unsubscribe();
        }
        this._updateBell(false);
    },

    async toggle() {
        const sub = await this._getSubscription();
        if (sub) {
            await this.unsubscribe();
        } else {
            await this.subscribe();
        }
    },

    _deviceId() {
        let id = localStorage.getItem('device_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('device_id', id);
        }
        return id;
    }
};
