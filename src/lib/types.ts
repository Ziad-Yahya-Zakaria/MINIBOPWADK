export type ThemeMode = 'light' | 'dark';
export type BrandType = 'fresh' | 'frozen';
export type BatchStatus = 'draft' | 'submitted' | 'approved';
export type CustomFieldType = 'text' | 'number';
export type IntegrationProvider = 'jdedwards' | 'salesforce' | 'custom';
export type IntegrationAuthMode = 'token' | 'basic' | 'oauth2' | 'none';

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  forcePasswordChange: boolean;
  isAdmin: boolean;
  roles?: string[];
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

export interface CustomFieldDefinition {
  id: string;
  label: string;
  kind: CustomFieldType;
  unit?: string;
  placeholder?: string;
  showInFinalApproval: boolean;
}

export interface EntryLine {
  id: string;
  productId: string;
  hourValues: number[];
  hourNotes: string[];
  customFieldValues?: Record<string, string>;
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

export interface IntegrationEndpoint {
  id: string;
  name: string;
  provider: IntegrationProvider;
  enabled: boolean;
  authMode: IntegrationAuthMode;
  baseUrl: string;
  mappingProfile: string;
  notes?: string;
}

export interface AppSettings {
  id: 'global';
  companyName: string;
  instanceId: string;
  themeMode: ThemeMode;
  soundEnabled: boolean;
  requiredApproverIds: string[];
  customFields: CustomFieldDefinition[];
  sessionTtlHours: number;
  sessionIdleMinutes: number;
  integrations: IntegrationEndpoint[];
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
  sessionId?: string | null;
  accessToken?: string | null;
  expiresAt?: string | null;
}

export interface UserSession {
  id: string;
  userId: string;
  tokenHash: string;
  fingerprint: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string | null;
}

export const ALL_PERMISSIONS = [
  'DASHBOARD_VIEW',
  'PRODUCTION_EDIT',
  'APPROVE_BATCH',
  'EXPORT_REPORTS',
  'MANAGE_USERS',
  'MANAGE_MASTER_DATA',
  'BULK_EXPORT',
  'BULK_IMPORT',
  'MANAGE_APPROVAL_MATRIX',
  'MANAGE_INTEGRATIONS',
  'DEVELOPER_VAULT_ACCESS'
] as const;

export const SESSION_STORAGE_KEY = 'minibo.session';
