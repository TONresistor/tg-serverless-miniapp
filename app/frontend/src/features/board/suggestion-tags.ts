import type { SuggestionTag } from '../../api/index'
import type { TelegramIconName } from '../../components/TelegramIcon'

export type SuggestionTagDefinition = {
  id: SuggestionTag
  label: string
  icon: TelegramIconName
}

export const SUGGESTION_TAGS: ReadonlyArray<SuggestionTagDefinition> = [
  { id: 'defi', label: 'DeFi', icon: 'tag-defi' },
  { id: 'gifts', label: 'Gifts', icon: 'tag-gifts' },
  { id: 'telegram', label: 'Telegram', icon: 'tag-telegram' },
  { id: 'web3', label: 'Web3', icon: 'tag-web3' },
  { id: 'stars', label: 'Stars', icon: 'tag-stars' },
  { id: 'cocoon', label: 'Cocoon', icon: 'tag-cocoon' },
  { id: 'foundation', label: 'Foundation', icon: 'tag-foundation' },
  { id: 'fragment', label: 'Fragment', icon: 'tag-fragment' },
]

export function suggestionTagDefinition(
  tag: SuggestionTag,
): SuggestionTagDefinition | undefined {
  return SUGGESTION_TAGS.find((item) => item.id === tag)
}

export function suggestionTagLabel(tag: SuggestionTag): string {
  return suggestionTagDefinition(tag)?.label ?? tag
}
