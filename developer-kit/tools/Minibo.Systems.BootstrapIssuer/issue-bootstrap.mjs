import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createAccountPackage, DEMO_PUBLIC_KEY_BASE64 } from '../shared/account-package.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const output = createAccountPackage({
  packageKind: 'bootstrap',
  username: args.username || 'admin',
  displayName: args.displayName || 'Primary Administrator',
  password: args.password || '1234',
  targetInstance: args.targetInstance || 'minibo-vercel-main',
  operator: args.operator || 'DevOps Team',
  expiresDays: Number(args.expiresDays || 7),
  roles: ['SuperAdmin'],
  permissions: ['*']
});

const outputPath = resolve(process.cwd(), 'bootstrap-account.json');
writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`bootstrap account written to ${outputPath}`);
console.log(`public key: ${process.env.MINIBO_BOOTSTRAP_PUBLIC_KEY || DEMO_PUBLIC_KEY_BASE64}`);
