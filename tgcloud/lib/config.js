import { db } from 'sdk';

// Configuration is in the bot's private DB, never in frontend assets.
export async function configuration() {
  const ready = await db.get(
    "SELECT value FROM settings WHERE key='database_version'",
  );
  if (ready?.value !== '1')
    throw new Error('Database setup or migration is incomplete');
  const row = await db.get("SELECT value FROM settings WHERE key = 'app'");
  if (!row)
    throw new Error(
      'Serverless configuration missing: run scripts/configure-serverless.js',
    );
  return JSON.parse(row.value);
}
export function isAdmin(config, id) {
  return config.admin_ids.includes(id);
}
export function miniAppURL(config) {
  return `https://t.me/${config.bot_username}`;
}
