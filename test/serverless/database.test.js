import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import * as schema from '../../tgcloud/schema.js';
import { reset, db, sqlite } from './sdk.js';
import setup from '../../tgcloud/lib/database/setup.js';
import { triggers } from '../../tgcloud/lib/database/triggers.js';

const config = { admin_ids: [99], notification_mode: 'external' };
beforeEach(() => reset(schema));

test('setup leaves existing trigger SQL alone unless an update is explicit', async () => {
  await setup({ config });
  const original = await db.get(
    "SELECT sql FROM sqlite_master WHERE type='trigger' AND name='content_insert_guard'",
  );
  sqlite.exec('DROP TRIGGER content_insert_guard');
  sqlite.exec(
    "CREATE TRIGGER content_insert_guard BEFORE INSERT ON suggestions BEGIN SELECT RAISE(ABORT,'old guard'); END",
  );

  await assert.rejects(setup({}), /update_triggers: true/);
  assert.equal(
    (await db.get("SELECT value FROM settings WHERE key='database_version'"))
      .value,
    '1',
  );
  await setup({ update_triggers: true });
  assert.equal(
    (
      await db.get(
        "SELECT sql FROM sqlite_master WHERE type='trigger' AND name='content_insert_guard'",
      )
    ).sql,
    original.sql.replace(/^CREATE TRIGGER IF NOT EXISTS/i, 'CREATE TRIGGER'),
  );
});

test('failed explicit trigger update does not mark the database ready', async () => {
  await setup({ config });
  sqlite.exec('DROP TABLE suggestions');
  await assert.rejects(setup({ update_triggers: true }));
  assert.equal(
    (await db.get("SELECT value FROM settings WHERE key='database_version'"))
      .value,
    '0',
  );
  assert.equal(triggers.length, 9);
});
