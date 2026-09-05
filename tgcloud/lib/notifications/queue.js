import { db, api } from 'sdk';
import { isAdmin, miniAppURL } from '../config.js';

// No timers or background promises. A caller awaits one small bounded batch.
// The DB is the source of truth; a lease prevents overlapping invocations from
// claiming the same delivery. Bot API delivery remains at-least-once on crashes.
export async function drain(config, { limit = 8, budgetMs = 4000 } = {}) {
  const started = Date.now();
  let sent = 0;
  for (let i = 0; i < limit && Date.now() - started < budgetMs; i++) {
    const slot = await db.run(
      `UPDATE settings SET value=:next WHERE key='notification_send_after'
      AND CAST(value AS INTEGER)<=:now RETURNING key`,
      { ':next': String(Date.now() + 50), ':now': Date.now() },
    );
    if (!slot.rows.length) break;
    const token = `${Date.now()}-${Math.random()}-${Math.random()}`;
    const result = await db.run(
      `UPDATE notification_deliveries SET status='processing',lease_until=:lease,lease_token=:token
      WHERE id=(SELECT id FROM notification_deliveries WHERE
        (status='pending' AND available_at<=:now OR status='processing' AND lease_until<=:now)
        ORDER BY available_at,id LIMIT 1) RETURNING *`,
      { ':now': Date.now(), ':lease': Date.now() + 120000, ':token': token },
    );
    const delivery = result.rows[0];
    if (!delivery) break;
    const row = await db.get(
      `SELECT s.kind,s.deleted_at,
      d.bot_write_allowed,
      EXISTS(SELECT 1 FROM suggestion_subscriptions WHERE suggestion_id=s.id AND dev_id=:user) AS subscribed,
      EXISTS(SELECT 1 FROM suggestion_comments WHERE id=:comment AND suggestion_id=s.id AND deleted_at IS NULL) AS comment_exists,
      EXISTS(SELECT 1 FROM suggestion_comments c JOIN suggestion_comments r ON r.id=c.reply_to_comment_id
        WHERE c.id=:comment AND r.author_dev_id=:user AND r.deleted_at IS NULL) AS direct_reply
      FROM suggestions s LEFT JOIN devs d ON d.id=:user WHERE s.id=:id`,
      {
        ':id': delivery.content_id,
        ':user': delivery.recipient_dev_id,
        ':comment': delivery.comment_id,
      },
    );
    const admin = isAdmin(config, delivery.recipient_dev_id);
    const allowed =
      row &&
      row.deleted_at == null &&
      (delivery.comment_id == null || row.comment_exists) &&
      (admin || row.bot_write_allowed) &&
      (delivery.audience === 'admin'
        ? admin
        : delivery.audience === 'direct'
          ? row.direct_reply
          : row.subscribed || admin);
    if (!allowed) {
      await finish(delivery, 'cancelled');
      continue;
    }
    // Recheck cancellation just before the transport call. An in-flight send
    // cannot be recalled if a concurrent unsubscribe/delete follows this read.
    const current = await db.get(
      "SELECT id FROM notification_deliveries WHERE id=:id AND status='processing' AND lease_token=:token",
      { ':id': delivery.id, ':token': delivery.lease_token },
    );
    if (!current) continue;
    try {
      await api.sendMessage({
        chat_id: delivery.recipient_dev_id,
        text: delivery.text,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Open App',
                url: `${miniAppURL(config)}?startapp=${row.kind}_${delivery.content_id}`,
                style: 'primary',
              },
            ],
          ],
        },
      });
      await finish(delivery, 'sent');
      sent++;
    } catch (error) {
      const permanent = error.code === 403 || error.code === 400;
      const attempts = delivery.attempts + (error.code === 429 ? 0 : 1);
      const retry = Math.max(
        1,
        Number(error.parameters?.retry_after) ||
          Math.min(21600, 5 * 3 ** attempts),
      );
      await db.run(
        `UPDATE notification_deliveries SET status=:status,attempts=:attempts,
        available_at=:at,lease_until=0,lease_token='',last_error=:error WHERE id=:id AND lease_token=:token AND status='processing'`,
        {
          ':status': permanent || attempts >= 8 ? 'dead' : 'pending',
          ':attempts': attempts,
          ':at': Date.now() + retry * 1000,
          ':error': String(error.description ?? error.message).slice(0, 500),
          ':id': delivery.id,
          ':token': delivery.lease_token,
        },
      );
      if (error.code === 429)
        await db.run(
          `UPDATE settings SET value=:at WHERE key='notification_send_after'
        AND CAST(value AS INTEGER)<:at`,
          { ':at': String(Date.now() + retry * 1000) },
        );
      if (error.code === 403)
        await db.run(
          'UPDATE devs SET bot_write_allowed=0,bot_write_observed_at=:at WHERE id=:id',
          { ':at': Date.now(), ':id': delivery.recipient_dev_id },
        );
      // Stop on failures instead of generating more throttled Bot API calls.
      break;
    }
  }
  return { sent };
}
async function finish(delivery, status) {
  await db.run(
    `UPDATE notification_deliveries SET status=:status,lease_until=0,lease_token=''
    WHERE id=:id AND lease_token=:token AND status='processing'`,
    { ':status': status, ':id': delivery.id, ':token': delivery.lease_token },
  );
}
export async function notificationStats() {
  return db.get(`SELECT COALESCE(SUM(status IN ('pending','processing')),0) AS pending,
    COALESCE(SUM(status='dead'),0) AS dead FROM notification_deliveries`);
}
