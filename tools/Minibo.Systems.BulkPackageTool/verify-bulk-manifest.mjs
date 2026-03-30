import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const filePath = process.argv[2];
if (!filePath) {
  console.error('usage: npm run verify:bulk -- path/to/manifest.json');
  process.exit(1);
}

const content = readFileSync(filePath, 'utf8');
const manifest = JSON.parse(content);
const required = [
  'schemaVersion',
  'packageId',
  'sourceInstanceId',
  'sourceInstanceName',
  'periodFrom',
  'periodTo',
  'exportedAtUtc',
  'entityCounts',
  'checksum'
];

const missing = required.filter((key) => !(key in manifest));
if (missing.length > 0) {
  console.error(`missing keys: ${missing.join(', ')}`);
  process.exit(2);
}

const digest = createHash('sha256').update(content, 'utf8').digest('hex');
console.log('manifest ok');
console.log(`sha256: ${digest}`);
