# Contributing

See [README.md](README.md) for setup. Use a development Telegram bot and never
commit credentials or user data.

- Keep changes focused and follow the existing structure.
- Preserve existing behavior and UI unless the change requires otherwise.
- Keep English, Russian and Chinese translations aligned.

## Checks

Run `git diff --check`, `npm run lint` and `npm run format:check` and `npm run check:unused`, then check
the parts you changed:

```sh
# Frontend
pnpm --dir app/frontend test && pnpm --dir app/frontend build

# Serverless backend
npm run check && npm test

# Deployment script
bash -n deploy/deploy.sh
```

Use `npm run format` to apply the shared formatting rules.
Describe what changed and which checks passed. Visual checks are manual.
See the [official Telegram Serverless documentation](https://core.telegram.org/bots/serverless)
for deployment. Project-specific commands are in README.md.
