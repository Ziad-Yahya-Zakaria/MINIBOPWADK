import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createAccountPackage, DEMO_PUBLIC_KEY_BASE64 } from '../shared/account-package.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const permissions = (args.permissions || 'DASHBOARD_VIEW')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const roles = (args.roles || 'User')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const output = createAccountPackage({
  packageKind: 'user',
  username: args.username || 'user1',
  displayName: args.displayName || 'New User',
  password: args.password || '1234',
  targetInstance: args.targetInstance || 'minibo-vercel-main',
  operator: args.operator || 'DevOps Team',
  expiresDays: Number(args.expiresDays || 7),
  roles,
  permissions
});

const fileName = `${(args.username || 'user1').replace(/[^\w.-]+/g, '_')}-user-account.json`;
const outputPath = resolve(process.cwd(), fileName);
writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`user account written to ${outputPath}`);
console.log(`public key: ${process.env.MINIBO_BOOTSTRAP_PUBLIC_KEY || DEMO_PUBLIC_KEY_BASE64}`);
