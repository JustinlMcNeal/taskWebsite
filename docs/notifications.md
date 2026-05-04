# Notifications — Implementation Plan

## Stack context
- **Frontend**: Vanilla JS, Tailwind, Supabase JS client (no build step, CDN scripts)
- **Backend**: Supabase (Postgres + Edge Functions + Scheduled Jobs)
- **Push transport**: Web Push API (VAPID) — works on Android Chrome, desktop Chrome/Firefox/Edge.
  iOS Safari requires the app to be installed as a PWA (Add to Home Screen).

---

## Phases

### Phase 1 — PWA foundation (required for iOS)
- [x] Add `manifest.json` (name, icons, `display: standalone`, `start_url`)
- [x] Link `<link rel="manifest">` in `index.html`
- [x] Register a service worker (`sw.js`) in `app.js` via `navigator.serviceWorker.register`
- [x] `sw.js`: listen for `push` event → call `self.registration.showNotification`
- [x] `sw.js`: listen for `notificationclick` event → `clients.openWindow` to the app URL
- [ ] Test: open app in Chrome mobile → "Add to Home Screen" prompt should appear

### Phase 2 — VAPID key generation & storage
- [x] Generate VAPID key pair (run once): `npx web-push generate-vapid-keys`
- [x] Store `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` as Supabase project secrets
- [x] Store `VAPID_PUBLIC_KEY` hardcoded in `js/notifications.js`

### Phase 3 — Supabase: push_subscriptions table
- [x] Create table in Supabase SQL editor:
  ```sql
  create table push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,          -- device fingerprint or auth uid
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamptz default now()
  );
  alter table push_subscriptions enable row level security;
  -- allow anon insert/delete for their own endpoint
  create policy "insert own" on push_subscriptions for insert with check (true);
  create policy "delete own" on push_subscriptions for delete using (true);
  ```

### Phase 4 — Frontend: js/notifications.js
- [ ] Create `js/notifications.js` with a `Notifications` object
- [ ] `Notifications.init()` — called from `app.js` after Store loads
  - Check `'Notification' in window && 'serviceWorker' in navigator`
  - Show a bell icon / banner in the header if not yet subscribed
- [ ] `Notifications.subscribe()` — triggered by user clicking the bell
  - Call `Notification.requestPermission()`
  - Get VAPID public key, call `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
  - POST subscription object (`endpoint`, `p256dh`, `auth`) to Supabase `push_subscriptions` table
  - Update bell icon to "subscribed" state
- [ ] `Notifications.unsubscribe()` — remove from Supabase + call `subscription.unsubscribe()`
- [ ] Add `<script src="js/notifications.js"></script>` to `index.html` after `app.js`

### Phase 5 — Bell icon in header
- [ ] Add bell button to the `<header>` in `index.html` (next to "New Task" button)
  - States: `unsubscribed` (outline bell), `subscribed` (filled bell + indigo), `unsupported` (hidden)
- [ ] Wire button click → `Notifications.subscribe()` / `Notifications.unsubscribe()` toggle
- [ ] Persist subscribed state in `localStorage` to remember UI state across page loads

### Phase 6 — Supabase Edge Function: send-notifications
- [ ] Create `supabase/functions/send-notifications/index.ts`
- [ ] Logic:
  1. Query all tasks where `due_date = today` OR `due_date = tomorrow` AND `status != 'completed'`
  2. For each matching task, look up all `push_subscriptions`
  3. For each subscription, call `web-push` npm library to send a push payload:
     ```json
     { "title": "Task Due: <task title>", "body": "Due <date> · <category>", "tag": "<task_id>" }
     ```
  4. On `410 Gone` response from push service → delete that subscription from DB
- [ ] Set environment variables in Supabase dashboard:
  - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

### Phase 7 — Supabase Cron job
- [ ] Enable `pg_cron` extension in Supabase (Database → Extensions)
- [ ] Schedule the edge function to run daily at 8 AM:
  ```sql
  select cron.schedule(
    'daily-task-notifications',
    '0 8 * * *',
    $$
    select net.http_post(
      url := 'https://<project-ref>.supabase.co/functions/v1/send-notifications',
      headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
    );
    $$
  );
  ```

### Phase 8 — iOS-specific PWA polish
- [ ] Add `apple-touch-icon` links in `index.html`
- [ ] Add `<meta name="apple-mobile-web-app-capable" content="yes">`
- [ ] Add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- [ ] Test: install on iOS 16.4+ → push should arrive when app is backgrounded

---

## Files to create / modify

| File | Action |
|---|---|
| `manifest.json` | Create |
| `sw.js` | Create |
| `js/notifications.js` | Create |
| `index.html` | Modify — add manifest link, apple meta tags, bell button, notifications script |
| `app.js` | Modify — register SW, call `Notifications.init()` |
| `supabase/functions/send-notifications/index.ts` | Create |
| `docs/notifications.md` | This file |

---

## Notes & gotchas
- iOS requires HTTPS and PWA install before push works (no workaround)
- `user_id` can be `localStorage` UUID for now (no auth required) — one device = one subscription
- `web-push` in the Edge Function needs Deno-compatible import: `import webpush from "npm:web-push"`
- The cron job fires once daily — for overdue reminders a second job at e.g. 9 AM on overdue tasks is optional
- Test push end-to-end with `web-push send-notification` CLI before wiring the cron


