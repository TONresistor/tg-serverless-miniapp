import type { SuggestionCategory } from '../../api/index'
import type { TKey } from '../../i18n/index'

export function suggestionCategoryKey(category: SuggestionCategory): TKey {
  return `mtonga_cat_${category}` as TKey
}
