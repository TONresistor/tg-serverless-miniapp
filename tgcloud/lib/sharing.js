import { api } from 'sdk';
import { contentRow } from './content/read.js';
import { miniAppURL } from './config.js';

async function prepared(user, id, title, message, buttonText, url) {
  const result = await api.savePreparedInlineMessage({
    user_id: user.id,
    allow_user_chats: true,
    allow_bot_chats: false,
    allow_group_chats: true,
    allow_channel_chats: true,
    result: {
      type: 'article',
      id,
      title,
      input_message_content: { message_text: message },
      reply_markup: {
        inline_keyboard: [[{ text: buttonText, url, style: 'primary' }]],
      },
    },
  });
  return { prepared_message_id: result.id };
}
export async function prepareInvite(_input, { user, config }) {
  return prepared(
    user,
    'mtonga_invite',
    'Join the MTONGA Mouvement',
    'Join the MTONGA Mouvement',
    'Open App',
    miniAppURL(config) + '?startapp',
  );
}
export async function prepareContent(input, { user, config }) {
  const row = await contentRow(input.kind, input.id, user.id);
  const summary =
    row.kind === 'issue' ? row.issue_description : row.what_we_want;
  return prepared(
    user,
    `${row.kind}_${row.id}`,
    row.title,
    `${row.title}\n\n${summary || row.body}`,
    `Open ${row.kind}`,
    `${miniAppURL(config)}?startapp=${row.kind}_${row.id}`,
  );
}
