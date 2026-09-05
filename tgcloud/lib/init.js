import { db } from 'sdk';
import { miniAppURL, isAdmin } from './config.js';

export async function init(_input, { user, config, initData }) {
  const row = await db.get('SELECT bot_write_allowed FROM devs WHERE id=:id', {
    ':id': user.id,
  });
  return {
    user: { ...user, allows_write_to_pm: !!row.bot_write_allowed },
    start_param: initData.start_param ?? '',
    mini_app_url: miniAppURL(config),
    is_admin: isAdmin(config, user.id),
  };
}
