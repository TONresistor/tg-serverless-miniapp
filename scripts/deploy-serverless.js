import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!process.argv.includes('--prepared')) {
  run('git', [
    'diff',
    '--check',
    '--',
    'app/frontend',
    'tgcloud',
    'scripts',
    'test',
    'package.json',
    'package-lock.json',
  ]);
  run('npm', ['run', 'lint']);
  run('npm', ['run', 'check:unused']);
  run('npm', ['run', 'format:check']);
  run(process.execPath, ['scripts/check-serverless.js']);
  run('npm', ['test']);
  run('pnpm', ['--dir', 'app/frontend', 'test']);
  run('pnpm', ['--dir', 'app/frontend', 'build']);
}
const status = spawnSync(
  'git',
  [
    'status',
    '--porcelain',
    '--untracked-files=all',
    '--',
    'app/frontend',
    'tgcloud',
    'tgcloud.jsonc',
    'package.json',
    'package-lock.json',
    'scripts',
  ],
  { encoding: 'utf8' },
);
if (status.status !== 0 || status.stdout.trim())
  throw new Error(
    'Commit the validated deployable source before deployment (unrelated documentation may remain in progress)',
  );
run(process.execPath, ['node_modules/@tgcloud/cli/bin/tgcloud.js', 'push']);
// Schema migrations and configuration remain explicit. First installation will
// intentionally reject app requests until setup has completed.
run(process.execPath, ['scripts/verify-serverless.js']);
