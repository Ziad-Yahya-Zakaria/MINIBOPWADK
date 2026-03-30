import { pbkdf2Sync, createHash, randomBytes } from 'node:crypto';
import nacl from 'tweetnacl';

export const DEMO_PRIVATE_KEY_BASE64 =
  'ZvWW5wn3VJlpZ2+q2gA/aAwmS4oFF6pbJqhi/jUSB9eOIAc37agc1Zt4uky5U98xzlLtfnEaoWP36AupJqE06w==';
export const DEMO_PUBLIC_KEY_BASE64 = 'jiAHN+2oHNWbeLpMuVPfMc5S7X5xGqFj9+gLqSahNOs=';

export function createAccountPackage({
  packageKind,
  username,
  displayName,
  password,
  targetInstance,
  operator = 'DevOps Team',
  expiresDays = 7,
  roles,
  permissions,
  signatureSvg = null
}) {
  const issuedAtUtc = new Date().toISOString();
  const expiresAtUtc = new Date(Date.now() + Number(expiresDays) * 24 * 60 * 60 * 1000).toISOString();
  const salt = randomBytes(16).toString('base64');
  const passwordHash = createPasswordHash(password, salt);

  const payload = {
    schemaVersion: '1.0',
    packageKind,
    packageId: crypto.randomUUID(),
    issuedAtUtc,
    expiresAtUtc,
    targetInstance,
    issuer: {
      tool: 'Minibo Systems Developer Portal',
      operator
    },
    account: {
      username,
      displayName,
      passwordHash,
      mustChangePassword: true,
      roles,
      permissions,
      signatureSvg
    }
  };

  const serialized = stableStringify(payload);
  const payloadSha256 = createHash('sha256').update(serialized, 'utf8').digest('base64');
  const privateKey = Buffer.from(process.env.MINIBO_BOOTSTRAP_PRIVATE_KEY || DEMO_PRIVATE_KEY_BASE64, 'base64');
  const keyPair = nacl.sign.keyPair.fromSecretKey(new Uint8Array(privateKey));
  const signature = Buffer.from(
    nacl.sign.detached(Buffer.from(serialized, 'utf8'), keyPair.secretKey)
  ).toString('base64');

  return {
    ...payload,
    integrity: {
      payloadSha256,
      signature
    }
  };
}

export function stableStringify(value) {
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
  const hash = pbkdf2Sync(
    rawPassword,
    Buffer.from(saltBase64, 'base64'),
    210000,
    32,
    'sha256'
  ).toString('base64');
  return `pbkdf2$210000$${saltBase64}$${hash}`;
}
