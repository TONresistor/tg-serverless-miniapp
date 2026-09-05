import { drain, notificationStats } from './notifications/queue.js';
import { api } from 'sdk';
import { configuration, isAdmin, miniAppURL } from './config.js';
import { observeWriteAccess } from './users.js';

async function handleMessage(message) {
  const config = await configuration();
  const user = message.from;
  if (
    user &&
    message.chat?.type === 'private' &&
    message.chat.id === user.id &&
    message.date > 0
  )
    await observeWriteAccess(user, true, message.date * 1000);
  if (/^\/start(?:@\w+)?(?:\s|$)/.test(message.text ?? '')) {
    const russian = user?.language_code?.toLowerCase().startsWith('ru');
    const welcome = config.welcome_message
      ? config.welcome_message.replaceAll(
          '{first_name}',
          user?.first_name ?? '',
        )
      : russian
        ? `Добро пожаловать, ${user?.first_name ?? ''}, в MTONGA.`
        : `Welcome ${user?.first_name ?? ''} to MTONGA.`;
    await api.sendMessage({
      chat_id: message.chat.id,
      text: welcome,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: russian ? 'Открыть приложение' : 'Open App',
              style: 'primary',
              ...(config.app_url && message.chat.type === 'private'
                ? { web_app: { url: config.app_url } }
                : { url: miniAppURL(config) }),
            },
          ],
        ],
      },
    });
  } else if (
    /^\/notifications(?:@\w+)?(?:\s|$)/.test(message.text ?? '') &&
    isAdmin(config, user?.id)
  ) {
    await drain(config);
    const stats = await notificationStats();
    await api.sendMessage({
      chat_id: message.chat.id,
      text: `Notifications: ${stats.pending} pending, ${stats.dead} failed.`,
    });
  }
}
export async function message(input) {
  await handleMessage(input);
  await drainOnInteraction();
}
async function drainOnInteraction() {
  const config = await configuration();
  if (config.notification_mode === 'interactions') {
    try {
      await drain(config);
    } catch (error) {
      console.error('Notification batch failed', error);
    }
  }
}
export async function membership(update) {
  await configuration();
  if (
    !update.from ||
    update.chat?.type !== 'private' ||
    update.chat.id !== update.from.id ||
    update.date <= 0
  )
    return;
  const status = update.new_chat_member?.status;
  if (status === 'member' || status === 'kicked')
    await observeWriteAccess(
      update.from,
      status === 'member',
      update.date * 1000,
    );
  await drainOnInteraction();
}
