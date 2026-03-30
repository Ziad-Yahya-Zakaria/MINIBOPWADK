import { pbkdf2Sync, createHash, randomBytes } from 'node:crypto';
import nacl from 'tweetnacl';

const DEFAULT_DEVELOPER_NAME = 'زياد يحي زكريا';
const DEFAULT_DEVELOPER_BIRTH_DATE = '2005/17/9';
const DEFAULT_KEY_PAIR = deriveDeveloperKeyPair(
  DEFAULT_DEVELOPER_NAME,
  DEFAULT_DEVELOPER_BIRTH_DATE
);

export const DEMO_PUBLIC_KEY_BASE64 = Buffer.from(DEFAULT_KEY_PAIR.publicKey).toString('base64');

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
  const signature = Buffer.from(
    nacl.sign.detached(Buffer.from(serialized, 'utf8'), DEFAULT_KEY_PAIR.secretKey)
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

function deriveDeveloperKeyPair(fullName, birthDate) {
  const normalizedName = normalizeDeveloperName(fullName);
  const normalizedBirthDate = normalizeBirthDate(birthDate);
  const seed = createHash('sha256')
    .update(`${normalizedName}|${normalizedBirthDate}`, 'utf8')
    .digest();
  return nacl.sign.keyPair.fromSeed(new Uint8Array(seed));
}

function normalizeDeveloperName(value) {
  return normalizeArabicText(value).replace(/[^\p{L}\p{N}]+/gu, '');
}

function normalizeBirthDate(value) {
  const parts = normalizeArabicDigits(value).split(/[^0-9]+/).filter(Boolean);
  if (parts.length !== 3) {
    throw new Error('invalid developer birth date');
  }

  let year;
  let month;
  let day;

  if (parts[0].length === 4) {
    year = Number(parts[0]);
    const second = Number(parts[1]);
    const third = Number(parts[2]);
    if (second > 12 && third <= 12) {
      day = second;
      month = third;
    } else {
      month = second;
      day = third;
    }
  } else if (parts[2].length === 4) {
    day = Number(parts[0]);
    month = Number(parts[1]);
    year = Number(parts[2]);
  } else {
    throw new Error('invalid developer birth date');
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeArabicText(value) {
  return normalizeArabicDigits(value)
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

function normalizeArabicDigits(value) {
  return value.replace(/[٠-٩]/g, (char) =>
    String(char.charCodeAt(0) - 1632)
  );
}
