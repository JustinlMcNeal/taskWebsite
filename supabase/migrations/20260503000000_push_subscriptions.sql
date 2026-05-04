create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "insert own" on push_subscriptions for insert with check (true);
create policy "delete own" on push_subscriptions for delete using (true);
create policy "select own" on push_subscriptions for select using (true);
