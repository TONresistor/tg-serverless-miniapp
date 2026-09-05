import { db } from 'sdk';
import { positiveID, text, reject, databaseError } from '../validation.js';
import { contentInput, kind } from './validation.js';
import { contentRow, contentDTO, commentsFor } from './read.js';

export async function createContent(input, { user }) {
  const data = contentInput(input);
  data.title_search = data.title.toLowerCase();
  data.body_search = data.body.toLowerCase();
  let result;
  try {
    result = await db.run(
      `INSERT INTO suggestions(author_dev_id,kind,title,body,what_we_want,issue_description,why_it_matters,how_to_achieve,tags,title_search,body_search)
      VALUES(:author,:kind,:title,:body,:what_we_want,:issue_description,:why_it_matters,:how_to_achieve,:tags,:title_search,:body_search) RETURNING id`,
      Object.fromEntries([
        [':author', user.id],
        ...Object.entries(data).map(([key, value]) => [':' + key, value]),
      ]),
    );
  } catch (error) {
    databaseError(error);
  }
  return {
    [data.kind]: contentDTO(
      await contentRow(data.kind, result.rows[0].id, user.id),
    ),
  };
}
export async function voteContent(input, { user }) {
  await contentRow(input.kind, input.id, user.id);
  if (![0, -1, 1].includes(input.value)) reject('invalid vote');
  if (input.value === 0)
    await db.run(
      'DELETE FROM suggestion_votes WHERE suggestion_id=:id AND dev_id=:user',
      { ':id': input.id, ':user': user.id },
    );
  else {
    try {
      await db.run(
        `INSERT INTO suggestion_votes(suggestion_id,dev_id,value) VALUES(:id,:user,:value)
        ON CONFLICT(suggestion_id,dev_id) DO UPDATE SET value=excluded.value,updated_at=unixepoch()*1000`,
        { ':id': input.id, ':user': user.id, ':value': input.value },
      );
    } catch (error) {
      databaseError(error);
    }
  }
  return {
    [input.kind]: contentDTO(await contentRow(input.kind, input.id, user.id)),
  };
}
export async function subscribeContent(input, { user }) {
  const row = await contentRow(input.kind, input.id, user.id);
  if (typeof input.subscribed !== 'boolean') reject('invalid subscription');
  if (!input.subscribed && row.author_dev_id === user.id)
    return { [input.kind]: contentDTO(row) };
  try {
    await db.run(
      input.subscribed
        ? `INSERT INTO suggestion_subscriptions(suggestion_id,dev_id)
      VALUES(:id,:user) ON CONFLICT(suggestion_id,dev_id) DO NOTHING`
        : 'DELETE FROM suggestion_subscriptions WHERE suggestion_id=:id AND dev_id=:user',
      { ':id': input.id, ':user': user.id },
    );
  } catch (error) {
    databaseError(error);
  }
  return {
    [input.kind]: contentDTO(await contentRow(input.kind, input.id, user.id)),
  };
}
export async function createComment(input, { user }) {
  await contentRow(input.kind, input.id, user.id);
  const body = text(input.body, 1000, true, 'comment');
  const reply =
    input.reply_to_comment_id == null
      ? null
      : positiveID(input.reply_to_comment_id);
  let result;
  try {
    result = await db.run(
      `INSERT INTO suggestion_comments(suggestion_id,author_dev_id,body,reply_to_comment_id)
      VALUES(:id,:user,:body,:reply) RETURNING id`,
      { ':id': input.id, ':user': user.id, ':body': body, ':reply': reply },
    );
  } catch (error) {
    databaseError(error);
  }
  return {
    comment: (await commentsFor(input.id)).find(
      (comment) => comment.id === result.rows[0].id,
    ),
  };
}
export async function deleteContent(input, { user }) {
  kind(input.kind);
  positiveID(input.id);
  const result = await db.run(
    `UPDATE suggestions SET deleted_at=unixepoch()*1000,deleted_by=:user,updated_at=unixepoch()*1000
    WHERE id=:id AND kind=:kind AND deleted_at IS NULL RETURNING id`,
    { ':id': input.id, ':kind': input.kind, ':user': user.id },
  );
  if (!result.rows.length) reject('not found', 'NOT_FOUND');
  return { ok: true };
}
export async function deleteComment(input, { user }) {
  positiveID(input.id);
  const result = await db.run(
    `UPDATE suggestion_comments SET deleted_at=unixepoch()*1000,deleted_by=:user
    WHERE id=:id AND deleted_at IS NULL RETURNING suggestion_id`,
    { ':id': input.id, ':user': user.id },
  );
  if (!result.rows.length) reject('not found', 'NOT_FOUND');
  return { ok: true, suggestion_id: result.rows[0].suggestion_id };
}
