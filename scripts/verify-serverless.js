import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cloudParity } from './lib/tgcloud.js';

const { moduleCount, source, url } = await cloudParity();
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const response = await fetch(new URL('/index.html', url), {
  signal: AbortSignal.timeout(15000),
  cache: 'no-store',
});
if (
  !response.ok ||
  sha(new Uint8Array(await response.arrayBuffer())) !==
    sha(readFileSync(`${source}/index.html`))
)
  throw new Error('Public index.html checksum mismatch');
console.log(
  `Verified ${moduleCount} modules, static manifest parity and public HTTP checksum: ${url}`,
);
