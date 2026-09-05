import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import * as schema from '../../tgcloud/schema.js';
import { reset, db, sqlite, api } from './sdk.js';
import setup from '../../tgcloud/lib/database/setup.js';
import create from '../../tgcloud/endpoints/createContent.js';
import comment from '../../tgcloud/endpoints/createComment.js';
import remove from '../../tgcloud/endpoints/deleteContent.js';
import removeComment from '../../tgcloud/endpoints/deleteComment.js';
import list from '../../tgcloud/endpoints/listContent.js';
import vote from '../../tgcloud/endpoints/voteContent.js';
import subscribe from '../../tgcloud/endpoints/subscribeContent.js';
import init from '../../tgcloud/endpoints/init.js';
import avatar from '../../tgcloud/endpoints/getAvatar.js';

const ctx = (id = 42) => ({
  initData: {
    user: { id, first_name: 'User', allows_write_to_pm: true },
    auth_date: Math.floor(Date.now() / 1000),
  },
});
const input = {
  kind: 'suggestion',
  title: 'Better TON',
  what_we_want: 'What',
  why_it_matters: 'Why',
  how_to_achieve: 'How',
  tags: ['telegram'],
};
beforeEach(async () => {
  reset(schema);
  await setup({ config: { admin_ids: [99], notification_mode: 'external' } });
});
test('identity and admin authorization come only from verified context', async () => {
  await assert.rejects(create({ ...input, user_id: 99 }, {}), /unauthorized/);
  const result = await create({ ...input, user_id: 99 }, ctx());
  assert.equal(result.suggestion.author_id, 42);
  await assert.rejects(
    remove(
      { kind: 'suggestion', id: result.suggestion.id, user_id: 99 },
      ctx(),
    ),
    /forbidden/,
  );
  assert.equal((await init({}, ctx(99))).is_admin, true);
});
test('test SDK rejects Telegram methods that are not implemented', async () => {
  await assert.rejects(
    api.unimplementedMethod({}),
    /Unsupported Telegram API method/,
  );
});
test('publication atomically creates subscription and durable notification; failed effects roll it back', async () => {
  sqlite.exec(
    "CREATE TRIGGER fail_delivery BEFORE INSERT ON notification_deliveries BEGIN SELECT RAISE(ABORT,'injected failure'); END",
  );
  await assert.rejects(create(input, ctx()), /injected failure/);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM suggestions')).n, 0);
  assert.equal(
    (await db.get('SELECT COUNT(*) AS n FROM suggestion_subscriptions')).n,
    0,
  );
  sqlite.exec('DROP TRIGGER fail_delivery');
  const { suggestion } = await create(input, ctx());
  assert.equal(suggestion.subscribed, true);
  assert.equal(
    (await db.get('SELECT COUNT(*) AS n FROM notification_deliveries')).n,
    1,
  );
  await assert.rejects(create(input, ctx()), /too many requests/);
});
test('concurrent submissions cannot bypass cooldown', async () => {
  const results = await Promise.allSettled([
    create(input, ctx()),
    create(input, ctx()),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM suggestions')).n, 1);
});
test('replies cannot target another content item or a deleted comment', async () => {
  const a = (await create(input, ctx())).suggestion;
  const b = (
    await create({ ...input, kind: 'issue', problem: 'Problem' }, ctx(43))
  ).issue;
  const first = (
    await comment({ kind: 'suggestion', id: a.id, body: 'first' }, ctx(44))
  ).comment;
  await assert.rejects(
    comment(
      {
        kind: 'issue',
        id: b.id,
        body: 'invalid',
        reply_to_comment_id: first.id,
      },
      ctx(45),
    ),
    /not found/,
  );
  const reply = (
    await comment(
      {
        kind: 'suggestion',
        id: a.id,
        body: 'reply',
        reply_to_comment_id: first.id,
      },
      ctx(45),
    )
  ).comment;
  assert.equal(reply.reply_to.id, first.id);
  await removeComment({ id: first.id }, ctx(99));
  await assert.rejects(
    comment(
      {
        kind: 'suggestion',
        id: a.id,
        body: 'invalid',
        reply_to_comment_id: first.id,
      },
      ctx(46),
    ),
    /not found/,
  );
});
test('votes, ownership filters and keyset pagination keep deterministic order', async () => {
  const a = (await create(input, ctx(42))).suggestion;
  const b = (
    await create({ ...input, kind: 'issue', problem: 'Problem' }, ctx(43))
  ).issue;
  const c = (await create({ ...input, title: 'Latest' }, ctx(44))).suggestion;
  await vote({ kind: 'suggestion', id: a.id, value: 1 }, ctx(43));
  await vote({ kind: 'suggestion', id: c.id, value: 1 }, ctx(43));
  const first = await list({ kind: 'all', limit: 1 }, ctx());
  assert.equal(first.items[0].id, c.id);
  const second = await list(
    { kind: 'all', limit: 1, cursor: first.next_cursor },
    ctx(),
  );
  assert.equal(second.items[0].id, a.id);
  const third = await list(
    { kind: 'all', limit: 1, cursor: second.next_cursor },
    ctx(),
  );
  assert.equal(third.items[0].id, b.id);
  assert.equal(third.next_cursor, undefined);
  await assert.rejects(
    list({ kind: 'all', mine: true, cursor: first.next_cursor }, ctx()),
    /invalid cursor/,
  );
  assert.equal(
    (await list({ kind: 'all', mine: true, user_id: 43 }, ctx())).items[0].id,
    a.id,
  );
});
test('admin deletion and unsubscribe cancel queued deliveries in the same statement', async () => {
  const a = (await create(input, ctx())).suggestion;
  await subscribe({ kind: 'suggestion', id: a.id, subscribed: true }, ctx(43));
  await comment({ kind: 'suggestion', id: a.id, body: 'Comment' }, ctx(44));
  await subscribe({ kind: 'suggestion', id: a.id, subscribed: false }, ctx(43));
  assert.equal(
    (
      await db.get(
        'SELECT status FROM notification_deliveries WHERE recipient_dev_id=43',
      )
    ).status,
    'cancelled',
  );
  await remove({ kind: 'suggestion', id: a.id }, ctx(99));
  assert.equal(
    (
      await db.get(
        "SELECT COUNT(*) AS n FROM notification_deliveries WHERE status='pending'",
      )
    ).n,
    0,
  );
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM admin_actions')).n, 1);
});
test('avatars are restricted to self or participants and returned without a bot token', async () => {
  const result = await avatar({}, ctx());
  assert.equal(result.base64, '/9j/2Q==');
  const a = (await create(input, ctx())).suggestion;
  await assert.rejects(
    avatar({ kind: 'suggestion', content_id: a.id, user_id: 98 }, ctx(43)),
    /not found/,
  );
  assert.equal(
    (
      await avatar(
        { kind: 'suggestion', content_id: a.id, user_id: 42 },
        ctx(43),
      )
    ).content_type,
    'image/jpeg',
  );
});

test('Russian search remains case-insensitive with SQLite', async () => {
  await create({ ...input, title: 'КОШЕЛЬКИ' }, ctx());
  assert.equal((await list({ kind: 'all', q: 'кошельки' }, ctx())).total, 1);
  await assert.rejects(
    list({ kind: 'all', cursor: 'null' }, ctx()),
    /invalid cursor/,
  );
});
