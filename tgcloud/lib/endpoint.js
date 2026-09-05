import { authenticated } from './users.js';
import { configuration, isAdmin } from './config.js';
import { drain } from './notifications/queue.js';
import { reject } from './validation.js';

export function endpoint(
  action,
  { admin = false, drainNotifications = true } = {},
) {
  return async function (input, ctx) {
    const config = await configuration();
    const user = await authenticated(ctx);
    if (admin && !isAdmin(config, user.id)) reject('forbidden', 'FORBIDDEN');
    const result = await action(input, {
      user,
      config,
      initData: ctx.initData,
    });
    if (drainNotifications && config.notification_mode === 'interactions') {
      try {
        await drain(config);
      } catch (error) {
        console.error('Notification batch failed', error);
      }
    }
    return result;
  };
}
