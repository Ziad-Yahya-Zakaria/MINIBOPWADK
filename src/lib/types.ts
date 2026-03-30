export type ThemeMode = 'light' | 'dark';
export type BrandType = 'fresh' | 'frozen';
export type BatchStatus = 'draft' | 'submitted' | 'approved';

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  forcePasswordChange: boolean;
  isAdmin: boolean;
  permissions: string[];
  signatureSvg?: string | null;
  createdAt: string;
}

export interface ShiftDefinition {
  id: string;
  name: string;
  hours: number;
  labels: string[];
}

export interface ProductDefinition {
  id: string;
  name: string;
  code: string;
  unit: string;
  factor: number;
  state: string;
  subgroup: string;
  group: string;
  customGroup: string;
  weightKg: number;
  packageWeightKg: number;
  brandIds: string[];
}

export interface BrandDefinition {
  id: string;
  name: string;
  type: BrandType;
  icon: string;
  productIds: string[];
}

export interface ReportDefinition {
  id: string;
  name: string;
  productIds: string[];
}

export interface EntryLine {
  id: string;
  productId: string;
  hourValues: number[];
  hourNotes: string[];
}

export interface ApprovalDecision {
  userId: string;
  approvedAt: string;
}

export interface ProductionBatch {
  id: string;
  date: string;
  shiftId: string;
  brandId: string;
  createdByUserId: string;
  entries: EntryLine[];
  status: BatchStatus;
  approvals: ApprovalDecision[];
  requiredApproverIds: string[];
  lastUpdatedAt: string;
  imported?: boolean;
  sourceInstanceId?: string;
  sourcePackageId?: string;
}

export interface NotificationItem {
  id: string;
  kind: 'info' | 'success' | 'warning';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AppSettings {
  id: 'global';
  companyName: string;
  instanceId: string;
  themeMode: ThemeMode;
  soundEnabled: boolean;
  requiredApproverIds: string[];
}

export interface ConsumedBootstrapPackage {
  packageId: string;
  consumedAt: string;
}

export interface BulkManifest {
  schemaVersion: string;
  packageId: string;
  sourceInstanceId: string;
  sourceInstanceName: string;
  periodFrom: string;
  periodTo: string;
  exportedAtUtc: string;
  entityCounts: Record<string, number>;
  checksum: string;
}

export interface BulkPackageRecord {
  packageId: string;
  kind: 'import' | 'export';
  manifest: BulkManifest;
  createdAt: string;
  status: 'completed' | 'failed';
  note?: string;
}

export type AccountPackageKind = 'bootstrap' | 'user';

export interface AccountPackage {
  schemaVersion: '1.0';
  packageKind?: AccountPackageKind;
  packageId: string;
  issuedAtUtc: string;
  expiresAtUtc: string;
  targetInstance: string;
  issuer: {
    tool: string;
    operator: string;
  };
  account: {
    username: string;
    displayName: string;
    passwordHash: string;
    mustChangePassword: boolean;
    roles: string[];
    permissions: string[];
    signatureSvg?: string | null;
  };
  integrity: {
    payloadSha256: string;
    signature: string;
  };
}

export type BootstrapPackage = AccountPackage;

export interface SessionState {
  userId: string | null;
}

export const ALL_PERMISSIONS = [
  'DASHBOARD_VIEW',
  'PRODUCTION_EDIT',
  'APPROVE_BATCH',
  'EXPORT_REPORTS',
  'MANAGE_USERS',
  'MANAGE_MASTER_DATA',
  'BULK_EXPORT',
  'BULK_IMPORT'
] as const;

export const SESSION_STORAGE_KEY = 'minibo.session';
