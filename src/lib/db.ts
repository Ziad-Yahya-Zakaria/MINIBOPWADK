import Dexie, { type Table } from 'dexie';

import type {
  AppSettings,
  BrandDefinition,
  BulkPackageRecord,
  ConsumedBootstrapPackage,
  NotificationItem,
  ProductDefinition,
  ProductionBatch,
  ReportDefinition,
  ShiftDefinition,
  UserSession,
  UserAccount
} from './types';
import { nowIso, uid } from './utils';

class MiniboDatabase extends Dexie {
  users!: Table<UserAccount, string>;
  shifts!: Table<ShiftDefinition, string>;
  brands!: Table<BrandDefinition, string>;
  products!: Table<ProductDefinition, string>;
  reportDefinitions!: Table<ReportDefinition, string>;
  batches!: Table<ProductionBatch, string>;
  notifications!: Table<NotificationItem, string>;
  settings!: Table<AppSettings, 'global'>;
  consumedBootstrapPackages!: Table<ConsumedBootstrapPackage, string>;
  bulkPackages!: Table<BulkPackageRecord, string>;
  sessions!: Table<UserSession, string>;

  public constructor() {
    super('minibo-systems-db');
    this.version(1).stores({
      users: '&id,&username,createdAt',
      shifts: '&id,name',
      brands: '&id,name,type',
      products: '&id,&code,name',
      reportDefinitions: '&id,name',
      batches: '&id,date,shiftId,brandId,createdByUserId,status,imported,sourcePackageId',
      notifications: '&id,createdAt,read',
      settings: '&id',
      consumedBootstrapPackages: '&packageId,consumedAt',
      bulkPackages: '&packageId,kind,createdAt,status'
    });
    this.version(2).stores({
      users: '&id,&username,createdAt',
      shifts: '&id,name',
      brands: '&id,name,type',
      products: '&id,&code,name',
      reportDefinitions: '&id,name',
      batches: '&id,date,shiftId,brandId,createdByUserId,status,imported,sourcePackageId',
      notifications: '&id,createdAt,read',
      settings: '&id',
      consumedBootstrapPackages: '&packageId,consumedAt',
      bulkPackages: '&packageId,kind,createdAt,status',
      sessions: '&id,userId,expiresAt,revokedAt,lastSeenAt'
    });
  }
}

export const appDb = new MiniboDatabase();

export async function ensureBaseData(instanceId: string): Promise<void> {
  const settings = await appDb.settings.get('global');
  if (!settings) {
    await appDb.settings.put({
      id: 'global',
      companyName: 'Minibo Systems',
      instanceId,
      themeMode: 'light',
      soundEnabled: true,
      requiredApproverIds: [],
      customFields: [],
      sessionTtlHours: 12,
      sessionIdleMinutes: 90,
      integrations: []
    });
  } else if (
    !Array.isArray(settings.customFields) ||
    typeof settings.sessionTtlHours !== 'number' ||
    typeof settings.sessionIdleMinutes !== 'number' ||
    !Array.isArray(settings.integrations)
  ) {
    await appDb.settings.put({
      ...settings,
      customFields: Array.isArray(settings.customFields) ? settings.customFields : [],
      sessionTtlHours:
        typeof settings.sessionTtlHours === 'number' ? settings.sessionTtlHours : 12,
      sessionIdleMinutes:
        typeof settings.sessionIdleMinutes === 'number'
          ? settings.sessionIdleMinutes
          : 90,
      integrations: Array.isArray(settings.integrations) ? settings.integrations : []
    });
  }

  if ((await appDb.shifts.count()) === 0) {
    await appDb.shifts.bulkPut([
      {
        id: uid('shift'),
        name: 'الوردية الصباحية',
        hours: 8,
        labels: Array.from({ length: 8 }, (_, index) => `الساعة ${index + 1}`)
      },
      {
        id: uid('shift'),
        name: 'الوردية المسائية',
        hours: 8,
        labels: Array.from({ length: 8 }, (_, index) => `الساعة ${index + 1}`)
      }
    ]);
  }

  if ((await appDb.products.count()) === 0 && (await appDb.brands.count()) === 0) {
    const freshBrandId = uid('brand');
    const frozenBrandId = uid('brand');
    const products: ProductDefinition[] = [
      {
        id: uid('product'),
        name: 'شيش طاووق 500',
        code: 'FR-1001',
        unit: 'عبوة',
        factor: 1,
        state: 'فريش',
        subgroup: 'دواجن',
        group: 'فريش',
        customGroup: 'خط 1',
        weightKg: 0.5,
        packageWeightKg: 0.5,
        brandIds: [freshBrandId]
      },
      {
        id: uid('product'),
        name: 'برجر بقري 1 كجم',
        code: 'FRZ-2001',
        unit: 'عبوة',
        factor: 1,
        state: 'مجمد',
        subgroup: 'لحوم',
        group: 'فروزن',
        customGroup: 'خط 2',
        weightKg: 1,
        packageWeightKg: 1,
        brandIds: [frozenBrandId]
      },
      {
        id: uid('product'),
        name: 'كفتة مشكلة 750',
        code: 'FRZ-2002',
        unit: 'عبوة',
        factor: 1,
        state: 'مجمد',
        subgroup: 'لحوم',
        group: 'فروزن',
        customGroup: 'خط 2',
        weightKg: 0.75,
        packageWeightKg: 0.75,
        brandIds: [frozenBrandId]
      }
    ];

    await appDb.products.bulkPut(products);
    await appDb.brands.bulkPut([
      {
        id: freshBrandId,
        name: 'Fresh',
        type: 'fresh',
        icon: 'eco',
        productIds: products.filter((item) => item.brandIds.includes(freshBrandId)).map((item) => item.id)
      },
      {
        id: frozenBrandId,
        name: 'Frozen',
        type: 'frozen',
        icon: 'ac_unit',
        productIds: products.filter((item) => item.brandIds.includes(frozenBrandId)).map((item) => item.id)
      }
    ]);

    await appDb.reportDefinitions.bulkPut([
      {
        id: uid('report'),
        name: 'تقرير التشغيل اليومي',
        productIds: products.map((item) => item.id)
      },
      {
        id: uid('report'),
        name: 'تقرير الفروزن',
        productIds: products.filter((item) => item.group === 'فروزن').map((item) => item.id)
      }
    ]);
  }
}

export async function pushNotification(
  title: string,
  message: string,
  kind: NotificationItem['kind'] = 'info'
): Promise<void> {
  await appDb.notifications.put({
    id: uid('notify'),
    title,
    message,
    kind,
    read: false,
    createdAt: nowIso()
  });
}
