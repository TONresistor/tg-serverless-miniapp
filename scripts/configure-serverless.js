import { readFileSync } from 'node:fs';
import { runMaintenance } from './serverless-maintenance.js';
// Configuration contains Telegram IDs, not the Bot API token. Credentials are
// resolved by the pinned CLI and never printed by this script.
const config = JSON.parse(
  readFileSync(process.argv[2] ?? 'serverless-settings.json', 'utf8'),
);
console.log(
  await runMaintenance('setup', {
    config,
    update_triggers: process.argv.includes('--update-triggers'),
  }),
);
