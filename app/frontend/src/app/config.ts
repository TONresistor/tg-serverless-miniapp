function telegramUsername(value: string | undefined, fallback: string): string {
  const username = value?.trim().replace(/^@/, '') || fallback
  if (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) {
    throw new Error(`Invalid Telegram username: ${username}`)
  }
  return username
}

export const appConfig = {
  botUsername: telegramUsername(
    import.meta.env?.VITE_BOT_USERNAME,
    'MTONGA2bot',
  ),
  supportUsername: telegramUsername(
    import.meta.env?.VITE_SUPPORT_USERNAME,
    'zkproof',
  ),
  groupUsername: telegramUsername(
    import.meta.env?.VITE_GROUP_USERNAME,
    'resistanceforum',
  ),
}

export const telegramLinks = {
  miniApp: `https://t.me/${appConfig.botUsername}?startapp`,
  support: `https://t.me/${appConfig.supportUsername}`,
  group: `https://t.me/${appConfig.groupUsername}`,
}
