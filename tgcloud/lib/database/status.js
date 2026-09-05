import { db } from 'sdk';
import { triggers } from './triggers.js';
export default async function () {
  const installed = await db.all(
    "SELECT name FROM sqlite_master WHERE type='trigger'",
  );
  const expected = triggers.map(
    (statement) => /EXISTS (\w+)/.exec(statement)[1],
  );
  const missing = expected.filter(
    (name) => !installed.some((row) => row.name === name),
  );
  const ready = await db.get(
    "SELECT value FROM settings WHERE key='database_version'",
  );
  const config = await db.get("SELECT value FROM settings WHERE key='app'");
  if (ready?.value !== '1' || !config || missing.length)
    throw new Error('Database setup incomplete');
  const indexes = await db.all(
    "SELECT name FROM sqlite_master WHERE type='index'",
  );
  const requiredIndexes = [
    'content_feed',
    'content_author',
    'votes_pair',
    'subscriptions_pair',
    'comments_content',
    'comments_author_time',
    'delivery_recipient',
    'deliveries_ready',
  ];
  if (requiredIndexes.some((name) => !indexes.some((row) => row.name === name)))
    throw new Error('Database indexes missing');
  return {
    bot_username: JSON.parse(config.value).bot_username,
    indexes: requiredIndexes.length,
    ready: true,
    triggers: expected.length,
    content: (await db.get('SELECT COUNT(*) AS n FROM suggestions')).n,
    comments: (await db.get('SELECT COUNT(*) AS n FROM suggestion_comments')).n,
  };
}
