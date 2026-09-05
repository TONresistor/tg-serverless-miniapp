#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

validate_and_build() {
  [[ "${1:-serverless}" == serverless ]] || return 2
  (cd "$DEPLOY_ROOT" && git diff --check && npm run check && npm test &&
    pnpm --dir app/frontend test && pnpm --dir app/frontend build)
}

deploy_selected() {
  [[ "${1:-serverless}" == serverless ]] || return 2
  (cd "$DEPLOY_ROOT" && node scripts/deploy-serverless.js --prepared)
}

main() {
  if [[ "${1:-}" == --help || "${1:-}" == -h ]]; then
    echo "Usage: $0 [serverless]"
    return
  fi
  [[ "$#" -le 1 && "${1:-serverless}" == serverless ]] || return 2
  validate_and_build serverless
  deploy_selected serverless
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then main "$@"; fi
