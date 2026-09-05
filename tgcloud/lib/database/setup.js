import { db, api } from 'sdk';
import { triggers, installTriggers } from './triggers.js';

// CLI-only module: lib/ is not exposed as a Mini App endpoint.
export default async function (input = {}) {
  if (input.config) {
    const c = input.config;
    if (
      !Array.isArray(c.admin_ids) ||
      !c.admin_ids.every((id) => Number.isSafeInteger(id) && id > 0)
    )
      throw new Error('admin_ids must be an array of positive Telegram IDs');
    if (!['interactions', 'external'].includes(c.notification_mode))
      throw new Error('Choose notification_mode: interactions or external');
    const me = await api.getMe();
    const config = {
      bot_username: me.username,
      admin_ids: [...new Set(c.admin_ids)],
      app_url: c.app_url ?? '',
      welcome_message: c.welcome_message ?? '',
      notification_mode: c.notification_mode,
    };
    await db.run(
      `INSERT INTO settings(key,value) VALUES('app',:value)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      { ':value': JSON.stringify(config) },
    );
    for (const id of config.admin_ids)
      await db.run(
        "INSERT OR IGNORE INTO devs(id,first_name) VALUES(:id,'Admin')",
        { ':id': id },
      );
  }
  const configured = await db.get("SELECT key FROM settings WHERE key='app'");
  if (!configured) throw new Error('Configure app before installing triggers');
  await db.run(
    "INSERT OR IGNORE INTO settings(key,value) VALUES('notification_send_after','0')",
  );
  if (input.update_triggers === true)
    await db.run("UPDATE settings SET value='0' WHERE key='database_version'");
  await installTriggers({ update: input.update_triggers === true });
  await db.run(
    `INSERT INTO settings(key,value) VALUES('database_version','1') ON CONFLICT(key) DO UPDATE SET value='1'`,
  );
  return { ready: true, triggers: triggers.length };
}
