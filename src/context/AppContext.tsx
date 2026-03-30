/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';

import { useLiveQuery } from 'dexie-react-hooks';

import { createPasswordHash, verifyAccountPackage, verifyPassword } from '../lib/crypto';
import { appDb, ensureBaseData, pushNotification } from '../lib/db';
import type { AccountPackage, AppSettings, ThemeMode, UserAccount } from '../lib/types';
import { SESSION_STORAGE_KEY } from '../lib/types';
import { clampSvg, nowIso, uid } from '../lib/utils';

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
    isAdmin: boolean;
    signatureSvg?: string;
  }) => Promise<{ ok: boolean; message: string }>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  can: (permission: string) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const instanceId =
    import.meta.env.VITE_INSTANCE_ID || window.location.host || 'minibo-local-instance';
  const settings = useLiveQuery(() => appDb.settings.get('global'), [], undefined);
  const users = useLiveQuery(() => appDb.users.toArray(), [], []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return saved ? JSON.parse(saved).userId : null;
  });
  const [isReady, setIsReady] = useState(false);
  const currentUser = users.find((user) => user.id === currentUserId) ?? null;

  useEffect(() => {
    let active = true;
    ensureBaseData(instanceId).finally(() => {
      if (active) {
        setIsReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [instanceId]);

  const setSession = useCallback((userId: string | null) => {
    setCurrentUserId(userId);
    if (userId) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId }));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const user = await appDb.users.where('username').equalsIgnoreCase(username.trim()).first();
    if (!user) {
      return { ok: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { ok: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }

    setSession(user.id);
    return { ok: true };
  }, [setSession]);

  const logout = useCallback(() => {
    setSession(null);
  }, [setSession]);

  const changePassword = useCallback(async (password: string) => {
    if (!currentUser) {
      return;
    }

    await appDb.users.update(currentUser.id, {
      passwordHash: await createPasswordHash(password),
      forcePasswordChange: false
    });
    await pushNotification('الأمان', 'تم تحديث كلمة المرور بنجاح.', 'success');
  }, [currentUser]);

  const importAccountPackage = useCallback(async (
    file: File,
    expectedKind: 'bootstrap' | 'user'
  ) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as AccountPackage;
      const packageKind = payload.packageKind ?? 'bootstrap';

      if (packageKind !== expectedKind) {
        return {
          ok: false,
          message: expectedKind === 'bootstrap' ? 'هذا الملف ليس ملف تأسيس bootstrap.' : 'هذا الملف ليس ملف مستخدم.'
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

      const existingUser = await appDb.users.where('username').equalsIgnoreCase(payload.account.username.trim()).first();
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
        setSession(userId);
      }

      return {
        ok: true,
        message: expectedKind === 'bootstrap' ? 'تم استيراد الحساب التأسيسي بنجاح.' : 'تم استيراد ملف المستخدم بنجاح.'
      };
    } catch {
      return { ok: false, message: 'تعذر قراءة ملف الحساب.' };
    }
  }, [instanceId, setSession]);

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
      permissions: input.isAdmin ? ['*'] : input.permissions,
      signatureSvg: clampSvg(input.signatureSvg),
      createdAt: nowIso()
    });

    await pushNotification('المستخدمون', `تم إنشاء المستخدم ${username}.`, 'success');
    return { ok: true, message: 'تم إنشاء المستخدم بنجاح.' };
  }, []);

  const saveSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const current = (await appDb.settings.get('global')) ?? {
      id: 'global' as const,
      companyName: 'Minibo Systems',
      instanceId,
      themeMode: 'light' as ThemeMode,
      soundEnabled: true,
      requiredApproverIds: []
    };
    await appDb.settings.put({ ...current, ...patch, id: 'global' });
  }, [instanceId]);

  const can = useCallback((permission: string) => {
    if (!currentUser) {
      return false;
    }
    return currentUser.isAdmin || currentUser.permissions.includes('*') || currentUser.permissions.includes(permission);
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
