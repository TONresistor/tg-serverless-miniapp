import type { CSSProperties } from 'react'
import commentReply from '../assets/telegram-icons/comment-reply.svg?raw'
import reply from '../assets/telegram-icons/reply.svg?raw'
import tagCocoon from '../assets/telegram-icons/tag-cocoon.svg?raw'
import tagDefi from '../assets/telegram-icons/tag-defi.svg?raw'
import tagFoundation from '../assets/telegram-icons/tag-foundation.svg?raw'
import tagFragment from '../assets/telegram-icons/tag-fragment.svg?raw'
import tagGifts from '../assets/telegram-icons/tag-gifts.svg?raw'
import tagStars from '../assets/telegram-icons/tag-stars.svg?raw'
import tagWeb3 from '../assets/telegram-icons/tag-web3.svg?raw'
import thumbDown from '../assets/telegram-icons/thumb-down.svg?raw'
import thumbUp from '../assets/telegram-icons/thumb-up.svg?raw'
import telegramLink from '../assets/telegram-link.svg?raw'
import telegramSend from '../assets/telegram-send.svg?raw'
import telegramShare from '../assets/telegram-share.svg?raw'
import telegramSubscribe from '../assets/telegram-subscribe.svg?raw'
import telegramUnsubscribe from '../assets/telegram-unsubscribe.svg?raw'

function normalizeInlineSVG(svg: string): string {
  return svg
    .replace(
      'preserveAspectRatio="none"',
      'preserveAspectRatio="xMidYMid meet"',
    )
    .replace(' overflow="visible"', '')
    .replace(' style="display: block;"', '')
    .replace(/ width="[0-9]+"/, ' width="100%"')
    .replace(/ height="[0-9]+"/, ' height="100%"')
}

const TELEGRAM_ICON_REGISTRY = {
  send: { svg: normalizeInlineSVG(telegramSend), nodeID: '6398:9056' },
  subscribe: {
    svg: normalizeInlineSVG(telegramSubscribe),
    nodeID: '6398:8633',
  },
  unsubscribe: {
    svg: normalizeInlineSVG(telegramUnsubscribe),
    nodeID: '6398:8635',
  },
  link: { svg: normalizeInlineSVG(telegramLink), nodeID: '6398:8617' },
  share: { svg: normalizeInlineSVG(telegramShare), nodeID: '6398:8813' },
  'thumb-up': { svg: normalizeInlineSVG(thumbUp), nodeID: '6398:8520' },
  'thumb-down': { svg: normalizeInlineSVG(thumbDown), nodeID: '6398:8521' },
  reply: { svg: normalizeInlineSVG(reply), nodeID: '6398:8864' },
  'comment-reply': {
    svg: normalizeInlineSVG(commentReply).replace(
      'viewBox="0 0 13 20"',
      'viewBox="0 4 13 13"',
    ),
    nodeID: '6398:9072',
  },
  'tag-defi': { svg: normalizeInlineSVG(tagDefi), nodeID: '6398:8530' },
  'tag-cocoon': { svg: normalizeInlineSVG(tagCocoon), nodeID: '2716:4839' },
  'tag-foundation': {
    svg: normalizeInlineSVG(tagFoundation),
    nodeID: '2689:950',
  },
  'tag-gifts': { svg: normalizeInlineSVG(tagGifts), nodeID: '6398:8882' },
  'tag-telegram': {
    svg: normalizeInlineSVG(telegramSend),
    nodeID: '6398:9056',
  },
  'tag-web3': { svg: normalizeInlineSVG(tagWeb3), nodeID: '6398:8449' },
  'tag-stars': { svg: normalizeInlineSVG(tagStars), nodeID: '6398:9083' },
  'tag-fragment': { svg: normalizeInlineSVG(tagFragment), nodeID: '6398:9075' },
} as const

export type TelegramIconName = keyof typeof TELEGRAM_ICON_REGISTRY

export function TelegramIcon({
  name,
  className,
  size = 28,
}: {
  name: TelegramIconName
  className?: string
  size?: number
}) {
  const icon = TELEGRAM_ICON_REGISTRY[name]
  return (
    <span
      className={['telegram-icon', className].filter(Boolean).join(' ')}
      style={{ '--telegram-icon-size': `${size}px` } as CSSProperties}
      aria-hidden="true"
      data-node-id={icon.nodeID}
      // Only static local SVG assets enter this registry.
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  )
}
