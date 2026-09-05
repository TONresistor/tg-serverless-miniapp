import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runMaintenanceModule } from './lib/tgcloud.js';

const modules = {
  setup: 'database/setup',
  status: 'database/status',
  resume: 'notifications/resume',
};
export async function runMaintenance(name, input = {}) {
  if (!Object.hasOwn(modules, name))
    throw new Error('Unknown maintenance operation');
  return runMaintenanceModule(modules[name], input);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(await runMaintenance(process.argv[2]));
