import { db } from 'sdk';
import { reject, positiveID } from './validation.js';

async function upsertUser(user) {
  positiveID(user?.id);
  await db.run(
    `INSERT INTO devs (id,username,first_name,last_name,photo_url)
    VALUES (:id,:username,:first,:last,:photo) ON CONFLICT(id) DO UPDATE SET
    username=excluded.username, first_name=excluded.first_name, last_name=excluded.last_name,
    photo_url=CASE WHEN excluded.photo_url<>'' THEN excluded.photo_url ELSE devs.photo_url END,
    updated_at=unixepoch()*1000`,
    {
      ':id': user.id,
      ':username': user.username ?? '',
      ':first': user.first_name ?? '',
      ':last': user.last_name ?? '',
      ':photo': user.photo_url ?? '',
    },
  );
}
export async function observeWriteAccess(user, allowed, observedAt) {
  await upsertUser(user);
  await db.run(
    `UPDATE devs SET bot_write_allowed=:allowed,bot_write_observed_at=:at
    WHERE id=:id AND bot_write_observed_at<=:at`,
    { ':id': user.id, ':allowed': allowed ? 1 : 0, ':at': observedAt },
  );
}
export async function authenticated(ctx) {
  const user = ctx?.initData?.user;
  if (!user?.id) reject('unauthorized', 'UNAUTHORIZED');
  await upsertUser(user);
  if (user.allows_write_to_pm)
    await observeWriteAccess(user, true, Number(ctx.initData.auth_date) * 1000);
  return user;
}
