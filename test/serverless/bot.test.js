import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import * as schema from '../../tgcloud/schema.js';
import { reset, db } from './sdk.js';
import setup from '../../tgcloud/lib/database/setup.js';
import { membership, message } from '../../tgcloud/lib/bot.js';
beforeEach(async () => {
  reset(schema);
  await setup({ config: { admin_ids: [99], notification_mode: 'external' } });
});
test('private write-access observations preserve the newest grant/revocation', async () => {
  const at = Math.floor(Date.now() / 1000);
  await message({
    chat: { id: 42, type: 'private' },
    from: { id: 42, first_name: 'User' },
    date: at,
    text: 'Hello',
  });
  await membership({
    chat: { id: 42, type: 'private' },
    from: { id: 42 },
    date: at + 1,
    new_chat_member: { status: 'kicked' },
  });
  await message({
    chat: { id: 42, type: 'private' },
    from: { id: 42 },
    date: at - 1,
    text: 'Old message',
  });
  assert.equal(
    (await db.get('SELECT bot_write_allowed FROM devs WHERE id=42'))
      .bot_write_allowed,
    0,
  );
});
