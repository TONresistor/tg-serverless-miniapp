import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importsFor } from '../../scripts/lib/serverless-source.js';

test('import scanning includes side effects, re-exports and nested dynamic imports', () => {
  assert.deepEqual(
    importsFor(
      "import './side.js'; export { x } from './lib.js'; async function run() { return await import('./dynamic.js'); }",
    ),
    ['./side.js', './lib.js', './dynamic.js'],
  );
});
test('computed imports and unsupported globals fail validation, not SQL strings or comments', () => {
  assert.throws(
    () => importsFor('function run(path) { return import(path); }'),
    /literal/,
  );
  assert.throws(
    () => importsFor('function run() { return process.env; }'),
    /Unsupported/,
  );
  assert.deepEqual(importsFor("// process.env\nconst sql = 'setTimeout';"), []);
});
