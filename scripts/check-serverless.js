import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { importsFor } from './lib/serverless-source.js';

const root = resolve('tgcloud');
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? files(resolve(directory, e.name))
          : resolve(directory, e.name),
      ),
    )
  ).flat();
}
let count = 0;
for (const file of await files(root)) {
  if (!file.endsWith('.js')) continue;
  const check = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });
  if (check.status !== 0) throw new Error(check.stderr);
  const imports = importsFor(await readFile(file, 'utf8'));
  for (const name of imports) {
    if (['sdk', 'sdk/db', 'sdk/api', 'sdk/fetch'].includes(name)) continue;
    if (!name.startsWith('.') || !name.endsWith('.js'))
      throw new Error(`Unsupported import in ${relative(root, file)}: ${name}`);
    const target = resolve(dirname(file), name);
    if (!target.startsWith(root + '/'))
      throw new Error('Import escapes tgcloud');
    await readFile(target);
  }
  count++;
}
console.log(
  `Checked ${count} Serverless modules: syntax, imports and runtime globals valid.`,
);
