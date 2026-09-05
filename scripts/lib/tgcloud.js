// Private CLI APIs are deliberately confined to this adapter and pinned to 0.2.0.
// Upgrading the CLI requires reviewing this file, not changing every tool.
import { readFileSync } from 'node:fs';
import { syncCapabilities } from '../../node_modules/@tgcloud/cli/src/core/capabilities.js';
import { resolveToken } from '../../node_modules/@tgcloud/cli/src/core/credentials.js';
import { scanFiles } from '../../node_modules/@tgcloud/cli/src/core/scanner.js';
import { readWd } from '../../node_modules/@tgcloud/cli/src/core/workdir.js';
import { pathToModule } from '../../node_modules/@tgcloud/cli/src/core/snapshot.js';
import { runFunction } from '../../node_modules/@tgcloud/cli/src/api/endpoints.js';
import { syncSnapshot } from '../../node_modules/@tgcloud/cli/src/core/sync.js';
import { localDiff } from '../../node_modules/@tgcloud/cli/src/core/local-diff.js';
import { loadProjectConfig } from '../../node_modules/@tgcloud/cli/src/core/project-config.js';
import {
  scanStatic,
  staticDiff,
  loadStaticSnapshot,
} from '../../node_modules/@tgcloud/cli/src/core/static.js';

function checkVersion() {
  const { version } = JSON.parse(
    readFileSync(
      new URL('../../node_modules/@tgcloud/cli/package.json', import.meta.url),
      'utf8',
    ),
  );
  if (version !== '0.2.0')
    throw new Error(
      'Review the Telegram CLI adapter before upgrading @tgcloud/cli',
    );
}
export async function runMaintenanceModule(module, input) {
  checkVersion();
  await syncCapabilities();
  const sources = Object.fromEntries(
    scanFiles().map((path) => [pathToModule(path), readWd(path)]),
  );
  // This authenticated /run entry exists only in memory, never in a deployment.
  sources['endpoints/maintenance'] =
    `export { default } from '../lib/${module}.js';`;
  return (
    await runFunction(
      await resolveToken(),
      'endpoints/maintenance',
      sources,
      input,
      {},
    )
  ).result;
}
export async function cloudParity() {
  checkVersion();
  await syncSnapshot();
  const modules = localDiff();
  if (
    modules.modified.length ||
    modules.newLocal.length ||
    modules.remoteOnly.length
  )
    throw new Error('Deployed modules differ from local source');
  const block = loadProjectConfig().static,
    remote = loadStaticSnapshot();
  if (!block?.source) throw new Error('No frontend build configured');
  const local = scanStatic(block.source);
  if (!local || !remote?.url || staticDiff(local, block.config, remote).changed)
    throw new Error('Deployed static manifest differs from local build');
  return {
    moduleCount: modules.matched.length,
    source: block.source,
    url: remote.url,
  };
}
