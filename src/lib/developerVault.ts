import nacl from 'tweetnacl';

import { ACCOUNT_PACKAGE_PUBLIC_KEY } from './accountPackageConstants';
import {
  base64ToBytes,
  bytesToBase64,
  createPasswordHash,
  sha256Base64
} from './crypto';
import type { AccountPackage, AccountPackageKind } from './types';
import { stableStringify } from './utils';

const NORMALIZED_DEVELOPER_NAME = 'زياديحيزكريا';
const NORMALIZED_DEVELOPER_BIRTH_DATE = '2005-09-17';

export interface DeveloperVaultChallenge {
  fullName: string;
  birthDate: string;
}

export interface DeveloperAccountPackageInput {
  packageKind: AccountPackageKind;
  username: string;
  displayName: string;
  password: string;
  targetInstance: string;
  operator?: string;
  expiresDays?: number;
  roles: string[];
  permissions: string[];
  signatureSvg?: string | null;
}

export async function isDeveloperVaultAnswerValid(
  challenge: DeveloperVaultChallenge
): Promise<boolean> {
  const keyPair = await deriveDeveloperKeyPair(challenge);
  return bytesToBase64(keyPair.publicKey) === ACCOUNT_PACKAGE_PUBLIC_KEY;
}

export async function createDeveloperSignedAccountPackage(
  input: DeveloperAccountPackageInput,
  challenge: DeveloperVaultChallenge
): Promise<AccountPackage> {
  const keyPair = await deriveDeveloperKeyPair(challenge);
  if (bytesToBase64(keyPair.publicKey) !== ACCOUNT_PACKAGE_PUBLIC_KEY) {
    throw new Error('إجابة اللغز غير صحيحة.');
  }

  const payload = {
    schemaVersion: '1.0' as const,
    packageKind: input.packageKind,
    packageId: crypto.randomUUID(),
    issuedAtUtc: new Date().toISOString(),
    expiresAtUtc: new Date(
      Date.now() + Number(input.expiresDays ?? 7) * 24 * 60 * 60 * 1000
    ).toISOString(),
    targetInstance: input.targetInstance,
    issuer: {
      tool: 'Minibo Systems Developer Vault',
      operator: input.operator?.trim() || 'Developer Vault'
    },
    account: {
      username: input.username.trim(),
      displayName: input.displayName.trim(),
      passwordHash: await createPasswordHash(input.password),
      mustChangePassword: true,
      roles: input.roles,
      permissions: input.permissions,
      signatureSvg: input.signatureSvg?.trim() || null
    }
  };

  const serialized = stableStringify(payload);
  const signature = nacl.sign.detached(
    new TextEncoder().encode(serialized),
    keyPair.secretKey
  );

  return {
    ...payload,
    integrity: {
      payloadSha256: await sha256Base64(serialized),
      signature: bytesToBase64(signature)
    }
  };
}

export function normalizeDeveloperName(value: string): string {
  return normalizeArabicText(value).replace(/[^\p{L}\p{N}]+/gu, '');
}

export function normalizeDeveloperBirthDate(value: string): string | null {
  const parts = normalizeArabicDigits(value).split(/[^0-9]+/).filter(Boolean);
  if (parts.length !== 3) {
    return null;
  }

  let year: number;
  let month: number;
  let day: number;

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
    return null;
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getDeveloperVaultHint(): string {
  return `${NORMALIZED_DEVELOPER_NAME} | ${NORMALIZED_DEVELOPER_BIRTH_DATE}`;
}

async function deriveDeveloperKeyPair(
  challenge: DeveloperVaultChallenge
): Promise<nacl.SignKeyPair> {
  const normalizedName = normalizeDeveloperName(challenge.fullName);
  const normalizedBirthDate = normalizeDeveloperBirthDate(challenge.birthDate);

  if (!normalizedName || !normalizedBirthDate) {
    throw new Error('بيانات اللغز غير مكتملة.');
  }

  const phrase = `${normalizedName}|${normalizedBirthDate}`;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(phrase)
  );

  return nacl.sign.keyPair.fromSeed(new Uint8Array(digest));
}

function normalizeArabicText(value: string): string {
  return normalizeArabicDigits(value)
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

function normalizeArabicDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (char) =>
    String(char.charCodeAt(0) - 1632)
  );
}

export function verifyEmbeddedAccountPublicKey(): boolean {
  const publicKeyBytes = base64ToBytes(ACCOUNT_PACKAGE_PUBLIC_KEY);
  return publicKeyBytes.length === nacl.sign.publicKeyLength;
}
