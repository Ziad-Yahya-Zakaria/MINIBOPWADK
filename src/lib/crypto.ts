import nacl from 'tweetnacl';

import type { AccountPackage } from './types';
import { stableStringify } from './utils';

const DEFAULT_BOOTSTRAP_PUBLIC_KEY =
  'jiAHN+2oHNWbeLpMuVPfMc5S7X5xGqFj9+gLqSahNOs=';

export async function createPasswordHash(password: string, saltBase64?: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = saltBase64 ? base64ToBytes(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const saltBuffer = salt as unknown as BufferSource;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 210000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  const hashBytes = new Uint8Array(bits);
  return `pbkdf2$210000$${bytesToBase64(salt)}$${bytesToBase64(hashBytes)}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [scheme, iterations, saltBase64, hashBase64] = passwordHash.split('$');
  if (scheme !== 'pbkdf2' || !iterations || !saltBase64 || !hashBase64) {
    return false;
  }

  const calculated = await createPasswordHash(password, saltBase64);
  return timingSafeEqual(calculated, passwordHash);
}

export async function sha256Base64(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(buffer));
}

export async function verifyAccountPackage(
  pkg: AccountPackage,
  instanceId: string
): Promise<{ ok: boolean; message?: string }> {
  if (pkg.schemaVersion !== '1.0') {
    return { ok: false, message: 'نسخة ملف الحساب غير مدعومة.' };
  }

  if (new Date(pkg.expiresAtUtc).getTime() < Date.now()) {
    return { ok: false, message: 'ملف الحساب منتهي الصلاحية.' };
  }

  if (!(pkg.targetInstance === '*' || pkg.targetInstance === instanceId)) {
    return {
      ok: false,
      message: `ملف الحساب غير مخصص لهذه النسخة. المطلوب: ${instanceId} | الموجود داخل الملف: ${pkg.targetInstance}`
    };
  }

  const payload = {
    schemaVersion: pkg.schemaVersion,
    packageKind: pkg.packageKind ?? 'bootstrap',
    packageId: pkg.packageId,
    issuedAtUtc: pkg.issuedAtUtc,
    expiresAtUtc: pkg.expiresAtUtc,
    targetInstance: pkg.targetInstance,
    issuer: pkg.issuer,
    account: pkg.account
  };

  const serialized = stableStringify(payload);
  const digest = await sha256Base64(serialized);
  if (digest !== pkg.integrity.payloadSha256) {
    return { ok: false, message: 'بصمة الملف غير مطابقة.' };
  }

  const signature = base64ToBytes(pkg.integrity.signature);
  const candidateKeys = Array.from(
    new Set(
      [import.meta.env.VITE_BOOTSTRAP_PUBLIC_KEY, DEFAULT_BOOTSTRAP_PUBLIC_KEY].filter(Boolean) as string[]
    )
  );
  const verified = candidateKeys.some((key) =>
    nacl.sign.detached.verify(
      new TextEncoder().encode(serialized),
      signature,
      base64ToBytes(key)
    )
  );

  if (!verified) {
    return { ok: false, message: 'توقيع ملف الحساب غير صالح.' };
  }

  return { ok: true };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}
