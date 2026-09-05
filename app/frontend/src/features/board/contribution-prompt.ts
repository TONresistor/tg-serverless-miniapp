export function contributionPromptMode({
  query,
  search,
  loading,
  nextCursor,
}: {
  query: string
  search: string
  loading: boolean
  nextCursor: string | null
}): 'contribute' | 'buttons' | null {
  const currentQuery = query.trim()
  if (loading || currentQuery !== search) return null
  if (!currentQuery) return 'contribute'
  return nextCursor ? null : 'buttons'
}
