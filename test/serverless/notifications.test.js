import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import * as schema from '../../tgcloud/schema.js';
import { reset, db, sent, overrideAPI } from './sdk.js';
import setup from '../../tgcloud/lib/database/setup.js';
import create from '../../tgcloud/endpoints/createContent.js';
import init from '../../tgcloud/endpoints/init.js';
import { drain } from '../../tgcloud/lib/notifications/queue.js';
const input = {
  kind: 'suggestion',
  title: 'TON',
  what_we_want: 'What',
  why_it_matters: 'Why',
  how_to_achieve: 'How',
  tags: ['telegram'],
};
const config = {
  admin_ids: [99],
  bot_username: 'MTONGAtestbot',
  notification_mode: 'external',
};
beforeEach(async () => {
  reset(schema);
  await setup({ config });
  await create(input, { initData: { user: { id: 42, first_name: 'Author' } } });
});
test('overlapping invocations claim and send a delivery only once', async () => {
  await Promise.all([drain(config), drain(config)]);
  assert.equal(sent.length, 1);
  assert.equal(
    (await db.get('SELECT status FROM notification_deliveries')).status,
    'sent',
  );
});
test('init leaves interaction notifications queued for a later interaction', async () => {
  const interactionConfig = { ...config, notification_mode: 'interactions' };
  await setup({ config: interactionConfig });
  const result = await init(
    {},
    {
      initData: {
        user: { id: 42, first_name: 'Author' },
        auth_date: Math.floor(Date.now() / 1000),
      },
    },
  );
  assert.equal(result.user.id, 42);
  assert.equal(
    (await db.get('SELECT status FROM notification_deliveries')).status,
    'pending',
  );
  assert.equal(sent.length, 0);
});
test('429 persists future retry and prevents another invocation from flooding Telegram', async () => {
  overrideAPI({
    sendMessage: async () => {
      throw Object.assign(new Error('Too many requests'), {
        code: 429,
        parameters: { retry_after: 60 },
      });
    },
  });
  const before = Date.now();
  await drain(config);
  const row = await db.get('SELECT * FROM notification_deliveries');
  assert.equal(row.status, 'pending');
  assert.equal(row.attempts, 0);
  assert.ok(row.available_at >= before + 60000);
  overrideAPI({});
  await drain(config);
  assert.equal(sent.length, 0);
  await db.run('UPDATE notification_deliveries SET available_at=0; ');
  await db.run(
    "UPDATE settings SET value='0' WHERE key='notification_send_after'",
  );
  await drain(config);
  assert.equal(sent.length, 1);
});
test('expired leases recover after an interrupted invocation', async () => {
  await db.run(
    "UPDATE notification_deliveries SET status='processing',lease_until=1,lease_token='old'",
  );
  await drain(config);
  assert.equal(sent.length, 1);
});
test('revoked admin eligibility cancels a queued admin notification', async () => {
  await drain({ ...config, admin_ids: [] });
  assert.equal(sent.length, 0);
  assert.equal(
    (await db.get('SELECT status FROM notification_deliveries')).status,
    'cancelled',
  );
});
test('blocked bot recipients become dead without an endless retry loop', async () => {
  overrideAPI({
    sendMessage: async () => {
      throw Object.assign(new Error('blocked'), { code: 403 });
    },
  });
  await drain(config);
  assert.equal(
    (await db.get('SELECT status FROM notification_deliveries')).status,
    'dead',
  );
  assert.equal(
    (await db.get('SELECT bot_write_allowed FROM devs WHERE id=99'))
      .bot_write_allowed,
    0,
  );
});
