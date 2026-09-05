import { db } from 'sdk';
import { positiveID, reject, text } from '../validation.js';
import { kind } from './validation.js';

const projection = `SELECT s.*,d.first_name AS author_name,d.username AS author_handle,
  COALESCE(v.upvotes,0) AS upvotes,COALESCE(v.downvotes,0) AS downvotes,
  COALESCE(v.score,0) AS score,
  (SELECT COUNT(*) FROM suggestion_comments c WHERE c.suggestion_id=s.id AND c.deleted_at IS NULL) AS comment_count,
  COALESCE((SELECT value FROM suggestion_votes WHERE suggestion_id=s.id AND dev_id=:viewer),0) AS user_vote,
  (s.author_dev_id=:viewer OR EXISTS(SELECT 1 FROM suggestion_subscriptions WHERE suggestion_id=s.id AND dev_id=:viewer)) AS subscribed
  FROM suggestions s JOIN devs d ON d.id=s.author_dev_id
  LEFT JOIN (SELECT suggestion_id,SUM(value=1) AS upvotes,SUM(value=-1) AS downvotes,SUM(value) AS score
    FROM suggestion_votes GROUP BY suggestion_id) v ON v.suggestion_id=s.id`;
export function contentDTO(row) {
  return {
    id: row.id,
    author_id: row.author_dev_id,
    author_name: row.author_name,
    author_handle: row.author_handle,
    kind: row.kind,
    title: row.title,
    body: row.body,
    what_we_want: row.what_we_want,
    problem: row.issue_description,
    why_it_matters: row.why_it_matters,
    how_to_achieve: row.how_to_achieve,
    tags: JSON.parse(row.tags),
    category: row.category,
    status: row.status,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    score: row.score,
    comment_count: row.comment_count,
    user_vote: row.user_vote,
    subscribed: !!row.subscribed,
    created_at: new Date(row.created_at).toISOString(),
  };
}
export async function contentRow(type, id, viewer) {
  kind(type);
  positiveID(id);
  const row = await db.get(
    `${projection} WHERE s.id=:id AND s.kind=:kind AND s.deleted_at IS NULL`,
    { ':id': id, ':kind': type, ':viewer': viewer },
  );
  if (!row) reject('not found', 'NOT_FOUND');
  return row;
}
function commentDTO(row) {
  const result = {
    id: row.id,
    suggestion_id: row.suggestion_id,
    author_id: row.author_dev_id,
    author_name: row.author_name,
    author_handle: row.author_handle,
    body: row.body,
    created_at: new Date(row.created_at).toISOString(),
  };
  if (row.reply_id)
    result.reply_to = {
      id: row.reply_id,
      author_id: row.reply_author_id,
      author_name: row.reply_author_name,
      author_handle: row.reply_author_handle,
      body: row.reply_body,
    };
  return result;
}
export async function commentsFor(id) {
  const rows = await db.all(
    `SELECT c.*,d.first_name AS author_name,d.username AS author_handle,
    r.id AS reply_id,r.author_dev_id AS reply_author_id,r.body AS reply_body,
    rd.first_name AS reply_author_name,rd.username AS reply_author_handle
    FROM suggestion_comments c JOIN devs d ON d.id=c.author_dev_id
    LEFT JOIN suggestion_comments r ON r.id=c.reply_to_comment_id AND r.deleted_at IS NULL
    LEFT JOIN devs rd ON rd.id=r.author_dev_id
    WHERE c.suggestion_id=:id AND c.deleted_at IS NULL ORDER BY c.created_at,c.id`,
    { ':id': id },
  );
  return rows.map(commentDTO);
}
export async function getContent(input, { user }) {
  const row = await contentRow(input.kind, input.id, user.id);
  return { [input.kind]: contentDTO(row), comments: await commentsFor(row.id) };
}
export async function listContent(input, { user }) {
  const type = input.kind ?? 'all';
  if (type !== 'all') kind(type);
  if (input.mine !== undefined && typeof input.mine !== 'boolean')
    reject('invalid ownership filter');
  const mine = input.mine === true;
  const sort = input.sort ?? 'rating';
  if (!['rating', 'newest'].includes(sort)) reject('invalid sort');
  const search = text(input.q ?? '', 120, false, 'search');
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    reject('invalid limit');
  const params = {
    ':viewer': user.id,
    ':kind': type,
    ':author': mine ? user.id : 0,
    ':q': search,
    ':q_normalized': search.toLowerCase(),
  };
  const filter = `s.deleted_at IS NULL AND (:kind='all' OR s.kind=:kind) AND (:author=0 OR s.author_dev_id=:author)
    AND (:q='' OR instr(s.title_search,:q_normalized)>0 OR instr(s.body_search,:q_normalized)>0)`;
  let after = '';
  if (input.cursor) {
    let cursor;
    try {
      if (typeof input.cursor !== 'string' || input.cursor.length > 2048)
        throw new Error();
      cursor = JSON.parse(input.cursor);
    } catch {
      reject('invalid cursor');
    }
    if (
      !cursor ||
      typeof cursor !== 'object' ||
      Array.isArray(cursor) ||
      cursor.sort !== sort ||
      cursor.q !== search ||
      cursor.kind !== type ||
      cursor.owner !== (mine ? user.id : 0) ||
      !Number.isSafeInteger(cursor.id) ||
      cursor.id <= 0 ||
      !Number.isSafeInteger(cursor.created_at) ||
      !Number.isSafeInteger(cursor.score) ||
      !Number.isSafeInteger(cursor.upvotes)
    )
      reject('invalid cursor');
    Object.assign(params, { ':time': cursor.created_at, ':id': cursor.id });
    after = `(s.created_at,s.id)<(:time,:id)`;
    if (sort === 'rating') {
      Object.assign(params, {
        ':score': cursor.score,
        ':upvotes': cursor.upvotes,
      });
      after = `(COALESCE(v.score,0),COALESCE(v.upvotes,0),s.created_at,s.id)<(:score,:upvotes,:time,:id)`;
    }
  }
  const count = await db.get(
    `SELECT COUNT(*) AS total FROM suggestions s WHERE ${filter}`,
    {
      ':kind': type,
      ':author': mine ? user.id : 0,
      ':q': search,
      ':q_normalized': search.toLowerCase(),
    },
  );
  const totals = await db.get(
    `SELECT COALESCE(SUM(kind='suggestion'),0) AS suggestions,COALESCE(SUM(kind='issue'),0) AS issues
    FROM suggestions WHERE deleted_at IS NULL AND (:author=0 OR author_dev_id=:author)`,
    { ':author': params[':author'] },
  );
  const order =
    sort === 'newest'
      ? 's.created_at DESC,s.id DESC'
      : 'score DESC,upvotes DESC,s.created_at DESC,s.id DESC';
  const rows = await db.all(
    `${projection} WHERE ${filter}${after ? ` AND ${after}` : ''} ORDER BY ${order} LIMIT :limit`,
    { ...params, ':limit': limit + 1 },
  );
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  const result = {
    [type === 'all' ? 'items' : type === 'issue' ? 'issues' : 'suggestions']:
      page.map(contentDTO),
    total: count.total,
    totals,
  };
  if (more) {
    const last = page.at(-1);
    result.next_cursor = JSON.stringify({
      sort,
      q: search,
      kind: type,
      owner: mine ? user.id : 0,
      id: last.id,
      created_at: last.created_at,
      score: last.score,
      upvotes: last.upvotes,
    });
  }
  return result;
}
