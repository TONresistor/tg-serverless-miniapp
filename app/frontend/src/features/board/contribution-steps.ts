import type { ContentKind } from '../../api/index'
import type { TKey } from '../../i18n/index'

export type StepID =
  | 'kind'
  | 'duplicates'
  | 'title'
  | 'what'
  | 'problem'
  | 'why'
  | 'how'
  | 'tags'
  | 'confirm'
type Step = { id: StepID; question: TKey }

const KIND_STEP: Step = { id: 'kind', question: 'contribution_question_kind' }
const DUPLICATES_STEP: Step = {
  id: 'duplicates',
  question: 'contribution_question_duplicates',
}
const SUGGESTION_STEPS: readonly Step[] = [
  { id: 'what', question: 'suggestion_question_what' },
  { id: 'why', question: 'suggestion_question_why' },
  { id: 'how', question: 'suggestion_question_how' },
  { id: 'title', question: 'suggestion_question_title' },
  { id: 'tags', question: 'suggestion_question_tags' },
  { id: 'confirm', question: 'suggestion_confirm_intro' },
]
const ISSUE_STEPS: readonly Step[] = [
  { id: 'problem', question: 'issue_question_problem' },
  { id: 'why', question: 'issue_question_why' },
  { id: 'title', question: 'issue_question_title' },
  { id: 'tags', question: 'suggestion_question_tags' },
  { id: 'confirm', question: 'issue_confirm_intro' },
]

export function contributionSteps(
  kind: ContentKind | null,
  askKind: boolean,
): readonly Step[] {
  const questions =
    kind === null ? [] : kind === 'issue' ? ISSUE_STEPS : SUGGESTION_STEPS
  const contentSteps = kind === null ? [] : [DUPLICATES_STEP, ...questions]
  return askKind ? [KIND_STEP, ...contentSteps] : contentSteps
}
