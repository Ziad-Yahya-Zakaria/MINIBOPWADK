import type { AccountPackageKind } from './types';

export interface AccessProfile {
  id: string;
  label: string;
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
  packageKind?: AccountPackageKind;
}

export const ACCESS_PROFILES: AccessProfile[] = [
  {
    id: 'bootstrap-admin',
    label: 'Bootstrap Admin',
    isAdmin: true,
    roles: ['SuperAdmin'],
    permissions: ['*'],
    packageKind: 'bootstrap'
  },
  {
    id: 'operations-user',
    label: 'مشغل إنتاج',
    isAdmin: false,
    roles: ['Operator'],
    permissions: ['DASHBOARD_VIEW', 'PRODUCTION_EDIT', 'EXPORT_REPORTS'],
    packageKind: 'user'
  },
  {
    id: 'approver',
    label: 'معتمد',
    isAdmin: false,
    roles: ['Approver'],
    permissions: ['DASHBOARD_VIEW', 'APPROVE_BATCH', 'EXPORT_REPORTS'],
    packageKind: 'user'
  },
  {
    id: 'senior-approver',
    label: 'المعتمد الثاني',
    isAdmin: false,
    roles: ['SeniorApprover'],
    permissions: [
      'DASHBOARD_VIEW',
      'APPROVE_BATCH',
      'EXPORT_REPORTS',
      'MANAGE_APPROVAL_MATRIX'
    ],
    packageKind: 'user'
  },
  {
    id: 'master-data-admin',
    label: 'مسؤول البيانات الرئيسية',
    isAdmin: false,
    roles: ['MasterDataAdmin'],
    permissions: [
      'DASHBOARD_VIEW',
      'MANAGE_MASTER_DATA',
      'BULK_EXPORT',
      'BULK_IMPORT'
    ],
    packageKind: 'user'
  },
  {
    id: 'integration-manager',
    label: 'مسؤول التكامل',
    isAdmin: false,
    roles: ['IntegrationManager'],
    permissions: [
      'DASHBOARD_VIEW',
      'EXPORT_REPORTS',
      'MANAGE_INTEGRATIONS',
      'BULK_EXPORT',
      'BULK_IMPORT'
    ],
    packageKind: 'user'
  },
  {
    id: 'platform-admin',
    label: 'Platform Admin',
    isAdmin: true,
    roles: ['PlatformAdmin'],
    permissions: ['*'],
    packageKind: 'user'
  }
];

export function getAccessProfile(profileId: string): AccessProfile | undefined {
  return ACCESS_PROFILES.find((profile) => profile.id === profileId);
}
