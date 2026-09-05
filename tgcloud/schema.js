import {
  table,
  integer,
  text,
  json,
  index,
  uniqueIndex,
  check,
  sql,
} from 'sdk/db';

// Milliseconds keep imported timestamps and cursor ordering intact.
const id = () => integer('id').primaryKey({ autoIncrement: true });
const timestamp = (name) =>
  integer(name)
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
const string = (name) => text(name).notNull().default('');

export const settings = table('settings', {
  key: text('key').primaryKey(),
  value: json('value').notNull(),
});
export const devs = table('devs', {
  id: integer('id').primaryKey(),
  username: string('username'),
  first_name: string('first_name'),
  last_name: string('last_name'),
  photo_url: string('photo_url'),
  bot_write_allowed: integer('bot_write_allowed').notNull().default(0),
  bot_write_observed_at: integer('bot_write_observed_at').notNull().default(0),
  created_at: timestamp('created_at'),
  updated_at: timestamp('updated_at'),
});
export const suggestions = table(
  'suggestions',
  {
    id: id(),
    author_dev_id: integer('author_dev_id').notNull(),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    title_search: string('title_search'),
    body_search: string('body_search'),
    what_we_want: string('what_we_want'),
    issue_description: string('issue_description'),
    why_it_matters: string('why_it_matters'),
    how_to_achieve: string('how_to_achieve'),
    tags: json('tags').notNull().default([]),
    category: text('category').notNull().default('general'),
    status: text('status').notNull().default('open'),
    deleted_at: integer('deleted_at'),
    deleted_by: integer('deleted_by'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
  },
  (t) => ({
    feed: index('content_feed').on(t.kind, t.created_at, t.id),
    author: index('content_author').on(t.author_dev_id),
    validKind: check('content_kind', sql`kind IN ('suggestion','issue')`),
  }),
);
export const votes = table(
  'suggestion_votes',
  {
    suggestion_id: integer('suggestion_id').notNull(),
    dev_id: integer('dev_id').notNull(),
    value: integer('value').notNull(),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
  },
  (t) => ({
    pair: uniqueIndex('votes_pair').on(t.suggestion_id, t.dev_id),
    value: check('vote_value', sql`value IN (-1,1)`),
  }),
);
export const subscriptions = table(
  'suggestion_subscriptions',
  {
    suggestion_id: integer('suggestion_id').notNull(),
    dev_id: integer('dev_id').notNull(),
    created_at: timestamp('created_at'),
  },
  (t) => ({
    pair: uniqueIndex('subscriptions_pair').on(t.suggestion_id, t.dev_id),
  }),
);
export const comments = table(
  'suggestion_comments',
  {
    id: id(),
    suggestion_id: integer('suggestion_id').notNull(),
    author_dev_id: integer('author_dev_id').notNull(),
    reply_to_comment_id: integer('reply_to_comment_id'),
    body: text('body').notNull(),
    deleted_at: integer('deleted_at'),
    deleted_by: integer('deleted_by'),
    created_at: timestamp('created_at'),
  },
  (t) => ({
    content: index('comments_content').on(t.suggestion_id, t.created_at, t.id),
    author: index('comments_author_time').on(t.author_dev_id, t.created_at),
  }),
);
export const adminActions = table('admin_actions', {
  id: id(),
  admin_dev_id: integer('admin_dev_id').notNull(),
  action: text('action').notNull(),
  entity_type: text('entity_type').notNull(),
  entity_id: integer('entity_id').notNull(),
  created_at: timestamp('created_at'),
});
export const deliveries = table(
  'notification_deliveries',
  {
    id: id(),
    event_key: text('event_key').notNull(),
    content_id: integer('content_id').notNull(),
    comment_id: integer('comment_id'),
    recipient_dev_id: integer('recipient_dev_id').notNull(),
    audience: text('audience').notNull(),
    text: text('text').notNull(),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    available_at: timestamp('available_at'),
    lease_until: integer('lease_until').notNull().default(0),
    lease_token: string('lease_token'),
    last_error: string('last_error'),
    created_at: timestamp('created_at'),
  },
  (t) => ({
    pair: uniqueIndex('delivery_recipient').on(t.event_key, t.recipient_dev_id),
    ready: index('deliveries_ready').on(t.status, t.available_at),
  }),
);
