import { text, reject } from '../validation.js';
const allowedTags = [
  'defi',
  'gifts',
  'telegram',
  'web3',
  'stars',
  'cocoon',
  'foundation',
  'fragment',
];
export function kind(value) {
  if (value !== 'suggestion' && value !== 'issue')
    reject('invalid content kind');
  return value;
}
export function contentInput(input) {
  const type = kind(input.kind);
  const title = text(input.title, 140, true, 'title');
  const why = text(input.why_it_matters, 2400, true, 'why it matters');
  const what =
    type === 'suggestion'
      ? text(input.what_we_want, 2400, true, 'what we want')
      : '';
  const how =
    type === 'suggestion'
      ? text(input.how_to_achieve, 2400, true, 'how to achieve')
      : '';
  const problem =
    type === 'issue' ? text(input.problem, 2400, true, 'problem') : '';
  if (!Array.isArray(input.tags) || input.tags.length > 32)
    reject('invalid tags');
  const tags = [
    ...new Set(input.tags.map((tag) => text(tag, 32).toLowerCase())),
  ];
  if (!tags.length || tags.some((tag) => !allowedTags.includes(tag)))
    reject('invalid tag');
  return {
    kind: type,
    title,
    what_we_want: what,
    how_to_achieve: how,
    why_it_matters: why,
    issue_description: problem,
    body:
      type === 'issue'
        ? `${problem}\n\nWhy it matters\n${why}`
        : `${what}\n\nWhy it matters\n${why}\n\nHow it could be achieved\n${how}`,
    tags: JSON.stringify(tags),
  };
}
