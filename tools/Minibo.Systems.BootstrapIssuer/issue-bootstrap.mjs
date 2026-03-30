import { webcrypto, pbkdf2Sync, createHash, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import nacl from 'tweetnacl';

const crypto = webcrypto;

const DEMO_PRIVATE_KEY_BASE64 =
  'QG8cNdk97Pe60nlc8Qa35pKqJ+7UjfzA6nvkg9nknTvSmvzKUPqZbpGRbXeuoEcSn3Y7bXCTSz0DUfTGUb iPNA=='.replaceAll(' ', '');
const DEMO_PUBLIC_KEY_BASE64 = '0pr82lD6mW6RkW13rqBHEp92O21wk0s9A1H0xlG4jzQ=';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const username = args.username || 'admin';
const displayName = args.displayName || 'Primary Administrator';
const password = args.password || '1234';
const targetInstance = args.targetInstance || 'minibo-vercel-main';
const expiresDays = Number(args.expiresDays || 7);
const operator = args.operator || 'DevOps Team';

const issuedAtUtc = new Date().toISOString();
const expiresAtUtc = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

const salt = randomBytes(16).toString('base64');
const passwordHash = createPasswordHash(password, salt);

const payload = {
  schemaVersion: '1.0',
  packageId: crypto.randomUUID(),
  issuedAtUtc,
  expiresAtUtc,
  targetInstance,
  issuer: {
    tool: 'Minibo.Systems.BootstrapIssuer',
    operator
  },
  account: {
    username,
    displayName,
    passwordHash,
    mustChangePassword: true,
    roles: ['SuperAdmin'],
    permissions: ['*'],
    signatureSvg: null
  }
};

const serialized = stableStringify(payload);
const payloadSha256 = createHash('sha256').update(serialized, 'utf8').digest('base64');
const privateKey = Buffer.from(process.env.MINIBO_BOOTSTRAP_PRIVATE_KEY || DEMO_PRIVATE_KEY_BASE64, 'base64');
const keyPair = nacl.sign.keyPair.fromSecretKey(new Uint8Array(privateKey));
const signature = Buffer.from(
  nacl.sign.detached(Buffer.from(serialized, 'utf8'), keyPair.secretKey)
).toString('base64');

const finalPackage = {
  ...payload,
  integrity: {
    payloadSha256,
    signature
  }
};

const outputPath = resolve(process.cwd(), 'bootstrap-account.json');
writeFileSync(outputPath, JSON.stringify(finalPackage, null, 2), 'utf8');

console.log(`bootstrap account written to ${outputPath}`);
console.log(`public key: ${process.env.MINIBO_BOOTSTRAP_PUBLIC_KEY || DEMO_PUBLIC_KEY_BASE64}`);

function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function createPasswordHash(rawPassword, saltBase64) {
  const hash = pbkdf2Sync(rawPassword, Buffer.from(saltBase64, 'base64'), 210000, 32, 'sha256').toString('base64');
  return `pbkdf2$210000$${saltBase64}$${hash}`;
}
