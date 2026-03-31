/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from 'react';

import { useLiveQuery } from 'dexie-react-hooks';

import {
  createPasswordHash,
  sha256Base64,
  verifyAccountPackage,
  verifyPassword
} from '../lib/crypto';
import { appDb, ensureBaseData, pushNotification } from '../lib/db';
import type {
  AccountPackage,
  AppSettings,
  SessionState,
  ThemeMode,
  UserAccount
} from '../lib/types';
import { SESSION_STORAGE_KEY } from '../lib/types';
import { clampSvg, nowIso, uid } from '../lib/utils';

const DEFAULT_SESSION_TTL_HOURS = 12;
const DEFAULT_SESSION_IDLE_MINUTES = 90;

interface AppContextValue {
  isReady: boolean;
  instanceId: string;
  settings?: AppSettings;
  currentUser: UserAccount | null;
  hasUsers: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  changePassword: (password: string) => Promise<void>;
  bootstrapFromFile: (file: File) => Promise<{ ok: boolean; message: string }>;
  importUserAccountFile: (file: File) => Promise<{ ok: boolean; message: string }>;
  createUser: (input: {
    username: string;
    displayName: string;
    password: string;
    permissions: string[];
    roles?: string[];
    isAdmin: boolean;
    signatureSvg?: string;
  }) => Promise<{ ok: boolean; message: string }>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  can: (permission: string) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function readStoredSession(): SessionState {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return { userId: null };
    }
    const parsed = JSON.parse(raw) as SessionState;
    return {
      userId: parsed.userId ?? null,
      sessionId: parsed.sessionId ?? null,
      accessToken: parsed.accessToken ?? null,
      expiresAt: parsed.expiresAt ?? null
    };
  } catch {
    return { userId: null };
  }
}

function getSessionFingerprint(): string {
  return [
    window.navigator.userAgent,
    window.navigator.language,
    window.navigator.platform,
    window.screen.width,
    window.screen.height
  ].join('|');
}

function createAccessToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let token = '';
  for (const value of bytes) {
    token += value.toString(16).padStart(2, '0');
  }
  return `${crypto.randomUUID()}-${token}`;
}

export function AppProvider({ children }: PropsWithChildren) {
  const instanceId =
    import.meta.env.VITE_INSTANCE_ID || window.location.host || 'minibo-local-instance';
  const settings = useLiveQuery(() => appDb.settings.get('global'), [], undefined);
  const users = useLiveQuery(() => appDb.users.toArray(), [], []);
  const [sessionState, setSessionState] = useState<SessionState>(() => readStoredSession());
  const [isReady, setIsReady] = useState(false);
  const currentUser = users.find((user) => user.id === sessionState.userId) ?? null;
  const fingerprint = useMemo(() => getSessionFingerprint(), []);
  const activityMarkRef = useRef(0);

  const persistSession = useCallback((nextSession: SessionState | null) => {
    const normalized = nextSession ?? { userId: null };
    setSessionState(normalized);
    if (normalized.userId && normalized.sessionId && normalized.accessToken) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  const buildDefaultSettings = useCallback(() => ({
    id: 'global' as const,
    companyName: 'Minibo Systems',
    instanceId,
    themeMode: 'light' as ThemeMode,
    soundEnabled: true,
    requiredApproverIds: [],
    customFields: [],
    sessionTtlHours: DEFAULT_SESSION_TTL_HOURS,
    sessionIdleMinutes: DEFAULT_SESSION_IDLE_MINUTES,
    integrations: []
  }), [instanceId]);

  const createAuthenticatedSession = useCallback(async (userId: string) => {
    const activeSettings = (await appDb.settings.get('global')) ?? buildDefaultSettings();
    const token = createAccessToken();
    const createdAt = nowIso();
    const expiresAt = new Date(
      Date.now() + activeSettings.sessionTtlHours * 60 * 60 * 1000
    ).toISOString();
    const sessionId = uid('session');

    await appDb.sessions.put({
      id: sessionId,
      userId,
      tokenHash: await sha256Base64(token),
      fingerprint,
      createdAt,
      lastSeenAt: createdAt,
      expiresAt,
      revokedAt: null
    });

    persistSession({
      userId,
      sessionId,
      accessToken: token,
      expiresAt
    });
  }, [buildDefaultSettings, fingerprint, persistSession]);

  const invalidateSession = useCallback(async (state: SessionState | null) => {
    if (state?.sessionId) {
      await appDb.sessions.update(state.sessionId, { revokedAt: nowIso() });
    }
    persistSession(null);
  }, [persistSession]);

  const validateStoredSession = useCallback(async (state: SessionState | null) => {
    if (!state?.userId || !state.sessionId || !state.accessToken) {
      persistSession(null);
      return;
    }

    const activeSettings = (await appDb.settings.get('global')) ?? buildDefaultSettings();
    const session = await appDb.sessions.get(state.sessionId);
    if (!session) {
      persistSession(null);
      return;
    }

    const now = Date.now();
    const idleExpiresAt =
      new Date(session.lastSeenAt).getTime() +
      activeSettings.sessionIdleMinutes * 60 * 1000;
    const tokenHash = await sha256Base64(state.accessToken);
    const invalid =
      session.userId !== state.userId ||
      session.revokedAt ||
      session.fingerprint !== fingerprint ||
      session.tokenHash !== tokenHash ||
      new Date(session.expiresAt).getTime() <= now ||
      idleExpiresAt <= now;

    if (invalid) {
      await invalidateSession(state);
      return;
    }

    persistSession({
      userId: session.userId,
      sessionId: session.id,
      accessToken: state.accessToken,
      expiresAt: session.expiresAt
    });
  }, [buildDefaultSettings, fingerprint, invalidateSession, persistSession]);

  useEffect(() => {
    let active = true;

    void (async () => {
      await ensureBaseData(instanceId);
      await validateStoredSession(readStoredSession());
      if (active) {
        setIsReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [instanceId, validateStoredSession]);

  useEffect(() => {
    if (!sessionState.sessionId || !sessionState.accessToken) {
      return;
    }

    const touchSession = async () => {
      const now = Date.now();
      if (now - activityMarkRef.current < 30_000) {
        return;
      }
      activityMarkRef.current = now;
      const session = await appDb.sessions.get(sessionState.sessionId!);
      if (!session || session.revokedAt) {
        persistSession(null);
        return;
      }
      await appDb.sessions.update(session.id, { lastSeenAt: nowIso() });
    };

    const validateInterval = window.setInterval(() => {
      void validateStoredSession(readStoredSession());
    }, 60_000);

    const activityHandler = () => {
      void touchSession();
    };

    window.addEventListener('pointerdown', activityHandler);
    window.addEventListener('keydown', activityHandler);
    window.addEventListener('visibilitychange', activityHandler);

    return () => {
      window.clearInterval(validateInterval);
      window.removeEventListener('pointerdown', activityHandler);
      window.removeEventListener('keydown', activityHandler);
      window.removeEventListener('visibilitychange', activityHandler);
    };
  }, [persistSession, sessionState.accessToken, sessionState.sessionId, validateStoredSession]);

  const login = useCallback(async (username: string, password: string) => {
    const user = await appDb.users.where('username').equalsIgnoreCase(username.trim()).first();
    if (!user) {
      return { ok: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { ok: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }

    await createAuthenticatedSession(user.id);
    return { ok: true };
  }, [createAuthenticatedSession]);

  const logout = useCallback(() => {
    void invalidateSession(sessionState);
  }, [invalidateSession, sessionState]);

  const changePassword = useCallback(async (password: string) => {
    if (!currentUser) {
      return;
    }

    const revokedAt = nowIso();
    await appDb.users.update(currentUser.id, {
      passwordHash: await createPasswordHash(password),
      forcePasswordChange: false
    });

    const userSessions = await appDb.sessions.where('userId').equals(currentUser.id).toArray();
    for (const session of userSessions) {
      await appDb.sessions.update(session.id, { revokedAt });
    }

    await createAuthenticatedSession(currentUser.id);
    await pushNotification('الأمان', 'تم تحديث كلمة المرور وتجديد الجلسة بنجاح.', 'success');
  }, [createAuthenticatedSession, currentUser]);

  const importAccountPackage = useCallback(async (
    file: File,
    expectedKind: 'bootstrap' | 'user'
  ) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as AccountPackage;
      if (
        !payload ||
        typeof payload !== 'object' ||
        !payload.packageId ||
        !payload.account?.username ||
        !payload.integrity?.signature
      ) {
        return { ok: false, message: 'ملف الحساب غير مكتمل أو غير مدعوم.' };
      }
      const packageKind = payload.packageKind ?? 'bootstrap';

      if (packageKind !== expectedKind) {
        return {
          ok: false,
          message:
            expectedKind === 'bootstrap'
              ? 'هذا الملف ليس ملف تأسيس bootstrap.'
              : 'هذا الملف ليس ملف مستخدم.'
        };
      }

      const verify = await verifyAccountPackage(payload, instanceId);
      if (!verify.ok) {
        return { ok: false, message: verify.message ?? 'ملف الحساب غير صالح.' };
      }

      const consumed = await appDb.consumedBootstrapPackages.get(payload.packageId);
      if (consumed) {
        return { ok: false, message: 'تم استهلاك ملف الحساب سابقاً.' };
      }

      const existingUser = await appDb.users
        .where('username')
        .equalsIgnoreCase(payload.account.username.trim())
        .first();
      if (existingUser) {
        return { ok: false, message: 'اسم المستخدم الموجود داخل الملف موجود بالفعل.' };
      }

      const now = nowIso();
      const userId = uid('user');
      await appDb.transaction(
        'rw',
        appDb.users,
        appDb.consumedBootstrapPackages,
        appDb.notifications,
        async () => {
          await appDb.users.put({
            id: userId,
            username: payload.account.username.trim(),
            displayName: payload.account.displayName.trim(),
            passwordHash: payload.account.passwordHash,
            forcePasswordChange: payload.account.mustChangePassword,
            isAdmin: payload.account.roles.includes('SuperAdmin'),
            roles: payload.account.roles,
            permissions: payload.account.permissions,
            signatureSvg: clampSvg(payload.account.signatureSvg),
            createdAt: now
          });
          await appDb.consumedBootstrapPackages.put({
            packageId: payload.packageId,
            consumedAt: now
          });
        }
      );

      await pushNotification(
        expectedKind === 'bootstrap' ? 'Bootstrap Access' : 'ملفات المستخدمين',
        expectedKind === 'bootstrap'
          ? 'تم إنشاء الحساب الإداري الأول بنجاح.'
          : `تم استيراد ملف المستخدم ${payload.account.username}.`,
        'success'
      );

      if (expectedKind === 'bootstrap') {
        await createAuthenticatedSession(userId);
      }

      return {
        ok: true,
        message:
          expectedKind === 'bootstrap'
            ? 'تم استيراد الحساب التأسيسي بنجاح.'
            : 'تم استيراد ملف المستخدم بنجاح.'
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { ok: false, message: 'ملف الحساب ليس JSON صالحاً.' };
      }
      return { ok: false, message: 'تعذر قراءة ملف الحساب.' };
    }
  }, [createAuthenticatedSession, instanceId]);

  const bootstrapFromFile = useCallback(
    (file: File) => importAccountPackage(file, 'bootstrap'),
    [importAccountPackage]
  );

  const importUserAccountFile = useCallback(
    (file: File) => importAccountPackage(file, 'user'),
    [importAccountPackage]
  );

  const createUser = useCallback(async (input: {
    username: string;
    displayName: string;
    password: string;
    permissions: string[];
    roles?: string[];
    isAdmin: boolean;
    signatureSvg?: string;
  }) => {
    const username = input.username.trim();
    if (!username || !input.displayName.trim() || !input.password.trim()) {
      return { ok: false, message: 'كل الحقول الأساسية مطلوبة.' };
    }

    const exists = await appDb.users.where('username').equalsIgnoreCase(username).first();
    if (exists) {
      return { ok: false, message: 'اسم المستخدم مستخدم بالفعل.' };
    }

    await appDb.users.put({
      id: uid('user'),
      username,
      displayName: input.displayName.trim(),
      passwordHash: await createPasswordHash(input.password),
      forcePasswordChange: true,
      isAdmin: input.isAdmin,
      roles: input.roles?.length ? input.roles : input.isAdmin ? ['PlatformAdmin'] : ['User'],
      permissions: input.isAdmin ? ['*'] : input.permissions,
      signatureSvg: clampSvg(input.signatureSvg),
      createdAt: nowIso()
    });

    await pushNotification('المستخدمون', `تم إنشاء المستخدم ${username}.`, 'success');
    return { ok: true, message: 'تم إنشاء المستخدم بنجاح.' };
  }, []);

  const saveSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const current = (await appDb.settings.get('global')) ?? buildDefaultSettings();
    await appDb.settings.put({ ...current, ...patch, id: 'global' });
  }, [buildDefaultSettings]);

  const can = useCallback((permission: string) => {
    if (!currentUser) {
      return false;
    }
    return (
      currentUser.isAdmin ||
      currentUser.permissions.includes('*') ||
      currentUser.permissions.includes(permission)
    );
  }, [currentUser]);

  const value = useMemo<AppContextValue>(() => ({
    isReady,
    instanceId,
    settings,
    currentUser,
    hasUsers: users.length > 0,
    login,
    logout,
    changePassword,
    bootstrapFromFile,
    importUserAccountFile,
    createUser,
    saveSettings,
    can
  }), [
    isReady,
    instanceId,
    settings,
    currentUser,
    users.length,
    login,
    logout,
    changePassword,
    bootstrapFromFile,
    importUserAccountFile,
    createUser,
    saveSettings,
    can
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
