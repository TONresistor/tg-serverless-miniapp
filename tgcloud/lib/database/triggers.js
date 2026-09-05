import { db } from 'sdk';

// Each content write is one SQLite statement. Triggers keep its cooldown,
// subscription and durable notification fan-out in the same atomic statement.
// Installed explicitly by the CLI after schema migration, never on user requests.
const admins = `SELECT CAST(value AS INTEGER) AS value FROM json_each(
  (SELECT json_extract(value,'$.admin_ids') FROM settings WHERE key='app'))`;
export const triggers = [
  `CREATE TRIGGER IF NOT EXISTS content_insert_guard BEFORE INSERT ON suggestions BEGIN
    SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM devs WHERE id=NEW.author_dev_id)
      THEN RAISE(ABORT,'MTONGA_NOT_FOUND') END;
    SELECT CASE WHEN EXISTS(SELECT 1 FROM suggestions WHERE author_dev_id=NEW.author_dev_id
      AND created_at>unixepoch()*1000-60000) THEN RAISE(ABORT,'MTONGA_COOLDOWN') END;
  END`,
  `CREATE TRIGGER IF NOT EXISTS content_insert_effects AFTER INSERT ON suggestions BEGIN
    INSERT INTO suggestion_subscriptions(suggestion_id,dev_id) VALUES(NEW.id,NEW.author_dev_id);
    INSERT INTO notification_deliveries(event_key,content_id,recipient_dev_id,audience,text)
      SELECT NEW.kind||'.created.'||NEW.id,NEW.id,value,'admin',
        'New '||NEW.kind||': "'||NEW.title||'"'||char(10)||'"'||
        substr(CASE NEW.kind WHEN 'issue' THEN NEW.issue_description ELSE NEW.what_we_want END,1,120)||'"'
      FROM (${admins}) AS a;
  END`,
  `CREATE TRIGGER IF NOT EXISTS comment_insert_guard BEFORE INSERT ON suggestion_comments BEGIN
    SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM suggestions WHERE id=NEW.suggestion_id AND deleted_at IS NULL)
      OR NOT EXISTS(SELECT 1 FROM devs WHERE id=NEW.author_dev_id)
      THEN RAISE(ABORT,'MTONGA_NOT_FOUND') END;
    SELECT CASE WHEN NEW.reply_to_comment_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM suggestion_comments WHERE id=NEW.reply_to_comment_id AND suggestion_id=NEW.suggestion_id
      AND deleted_at IS NULL) THEN RAISE(ABORT,'MTONGA_NOT_FOUND') END;
    SELECT CASE WHEN EXISTS(SELECT 1 FROM suggestion_comments WHERE author_dev_id=NEW.author_dev_id
      AND created_at>unixepoch()*1000-30000) THEN RAISE(ABORT,'MTONGA_COOLDOWN') END;
  END`,
  `CREATE TRIGGER IF NOT EXISTS comment_insert_effects AFTER INSERT ON suggestion_comments BEGIN
    INSERT INTO notification_deliveries(event_key,content_id,comment_id,recipient_dev_id,audience,text)
    SELECT 'comment.'||NEW.id,NEW.suggestion_id,NEW.id,recipients.id,
      CASE WHEN recipients.id=(SELECT author_dev_id FROM suggestion_comments WHERE id=NEW.reply_to_comment_id)
        THEN 'direct' WHEN recipients.id IN (${admins}) THEN
          CASE WHEN EXISTS(SELECT 1 FROM suggestion_subscriptions WHERE suggestion_id=NEW.suggestion_id AND dev_id=recipients.id)
            THEN 'subscriber_admin' ELSE 'admin' END ELSE 'subscriber' END,
      CASE WHEN recipients.id=(SELECT author_dev_id FROM suggestion_comments WHERE id=NEW.reply_to_comment_id)
        THEN 'New reply to your comment:' ELSE 'New comment on "'||s.title||'":' END
        ||char(10)||'"'||substr(NEW.body,1,120)||'"'
    FROM suggestions s JOIN (
      SELECT dev_id AS id FROM suggestion_subscriptions WHERE suggestion_id=NEW.suggestion_id
      UNION SELECT * FROM (${admins})
      UNION SELECT author_dev_id FROM suggestion_comments WHERE id=NEW.reply_to_comment_id
    ) recipients ON (recipients.id<>NEW.author_dev_id OR recipients.id IN (${admins})) WHERE s.id=NEW.suggestion_id;
  END`,
  `CREATE TRIGGER IF NOT EXISTS vote_insert_guard BEFORE INSERT ON suggestion_votes BEGIN
    SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM suggestions WHERE id=NEW.suggestion_id AND deleted_at IS NULL)
      OR NOT EXISTS(SELECT 1 FROM devs WHERE id=NEW.dev_id) THEN RAISE(ABORT,'MTONGA_NOT_FOUND') END;
  END`,
  `CREATE TRIGGER IF NOT EXISTS subscription_insert_guard BEFORE INSERT ON suggestion_subscriptions BEGIN
    SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM suggestions WHERE id=NEW.suggestion_id AND deleted_at IS NULL)
      OR NOT EXISTS(SELECT 1 FROM devs WHERE id=NEW.dev_id) THEN RAISE(ABORT,'MTONGA_NOT_FOUND') END;
  END`,
  `CREATE TRIGGER IF NOT EXISTS content_delete_effects AFTER UPDATE OF deleted_at ON suggestions
    WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL BEGIN
    INSERT INTO admin_actions(admin_dev_id,action,entity_type,entity_id)
      VALUES(NEW.deleted_by,'delete_'||NEW.kind,NEW.kind,NEW.id);
    UPDATE notification_deliveries SET status='cancelled',lease_token=''
      WHERE content_id=NEW.id AND status IN ('pending','processing');
  END`,
  `CREATE TRIGGER IF NOT EXISTS comment_delete_effects AFTER UPDATE OF deleted_at ON suggestion_comments
    WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL BEGIN
    INSERT INTO admin_actions(admin_dev_id,action,entity_type,entity_id)
      VALUES(NEW.deleted_by,'delete_comment','comment',NEW.id);
    UPDATE notification_deliveries SET status='cancelled',lease_token=''
      WHERE comment_id=NEW.id AND status IN ('pending','processing');
  END`,
  `CREATE TRIGGER IF NOT EXISTS subscription_delete_effects AFTER DELETE ON suggestion_subscriptions BEGIN
    UPDATE notification_deliveries SET status='cancelled',lease_token=''
      WHERE content_id=OLD.suggestion_id AND recipient_dev_id=OLD.dev_id AND audience='subscriber'
      AND status IN ('pending','processing');
  END`,
];

function comparableSQL(sql) {
  return sql
    .replace(/^CREATE TRIGGER IF NOT EXISTS\s+/i, 'CREATE TRIGGER ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function installTriggers({ update = false } = {}) {
  for (const statement of triggers) {
    const name = /EXISTS (\w+)/.exec(statement)[1];
    const installed = await db.get(
      "SELECT sql FROM sqlite_master WHERE type='trigger' AND name=:name",
      { ':name': name },
    );
    if (!installed) {
      await db.run(statement);
      continue;
    }
    if (comparableSQL(installed.sql) === comparableSQL(statement)) continue;
    if (!update)
      throw new Error(
        `Trigger ${name} differs; rerun setup with update_triggers: true`,
      );
    await db.run(`DROP TRIGGER ${name}`);
    await db.run(statement);
  }
}
