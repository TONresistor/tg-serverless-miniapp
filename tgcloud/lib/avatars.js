import { db, api } from 'sdk';
import { positiveID, reject } from './validation.js';
import { contentRow } from './content/read.js';

const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encodeBase64(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1] ?? 0,
      c = bytes[i + 2] ?? 0,
      n = (a << 16) | (b << 8) | c;
    result +=
      alphabet[(n >>> 18) & 63] +
      alphabet[(n >>> 12) & 63] +
      (i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : '=') +
      (i + 2 < bytes.length ? alphabet[n & 63] : '=');
  }
  return result;
}
export async function getAvatar(input, { user }) {
  const id = input.user_id == null ? user.id : positiveID(input.user_id);
  if (id !== user.id) {
    await contentRow(input.kind, input.content_id, user.id);
    const participant = await db.get(
      `SELECT 1 AS found FROM suggestions WHERE id=:content AND author_dev_id=:user AND deleted_at IS NULL
      UNION SELECT 1 FROM suggestion_comments WHERE suggestion_id=:content AND author_dev_id=:user AND deleted_at IS NULL`,
      { ':content': input.content_id, ':user': id },
    );
    if (!participant) reject('not found', 'NOT_FOUND');
  }
  const photos = await api.getUserProfilePhotos({ user_id: id, limit: 1 });
  const sizes = photos.photos?.[0];
  if (!sizes?.length) reject('no photo', 'NOT_FOUND');
  // Use Telegram's small profile rendition to bound JSON payload size.
  const bytes = await api.getFileContent(sizes[0].file_id);
  if (bytes.length > 256 * 1024) reject('photo is too large');
  return { base64: encodeBase64(bytes), content_type: 'image/jpeg' };
}
