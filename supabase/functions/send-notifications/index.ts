// Supabase Edge Function: send-notifications
// Queries tasks due today or tomorrow, sends push notifications to all subscribers.
// Triggered by pg_cron daily at 8 AM.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore — web-push types not available via esm.sh but runtime works fine
import webpush from 'https://esm.sh/web-push@3.6.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

Deno.serve(async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

    // Fetch tasks due today or tomorrow that aren't completed
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, due_date, category_id, categories(name)')
      .in('due_date', [today, tomorrow])
      .neq('status', 'completed');

    if (tasksError) throw tasksError;
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No due tasks' }), { status: 200 });
    }

    // Fetch all push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth');

    if (subsError) throw subsError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscribers' }), { status: 200 });
    }

    const staleIds: string[] = [];
    let sent = 0;

    for (const task of tasks) {
      const isToday = task.due_date === today;
      const categoryName = (task.categories as { name: string } | null)?.name ?? 'No category';
      const payload = JSON.stringify({
        title: isToday ? `Due Today: ${task.title}` : `Due Tomorrow: ${task.title}`,
        body: `${categoryName} · ${isToday ? 'today' : 'tomorrow'}`,
        tag: task.id,
        url: '/'
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            payload
          );
          sent++;
        } catch (err: unknown) {
          // 410 Gone = subscription expired, clean it up
          if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
            staleIds.push(sub.id);
          } else {
            console.error('Push failed for', sub.endpoint, err);
          }
        }
      }
    }

    // Remove expired subscriptions
    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds);
    }

    return new Response(JSON.stringify({ sent, staleRemoved: staleIds.length }), { status: 200 });
  } catch (err) {
    console.error('send-notifications error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
