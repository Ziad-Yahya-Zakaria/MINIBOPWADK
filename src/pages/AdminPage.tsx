import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded';
import { useLiveQuery } from 'dexie-react-hooks';

import { useAppContext } from '../context/AppContext';
import { ACCESS_PROFILES, getAccessProfile } from '../lib/accessProfiles';
import { appDb, pushNotification } from '../lib/db';
import { exportProductsTemplate, importProductsWorkbook } from '../lib/exporters';
import type { CustomFieldType, IntegrationAuthMode, IntegrationProvider } from '../lib/types';
import { ALL_PERMISSIONS } from '../lib/types';
import { uid } from '../lib/utils';

type AdminTab =
  | 'users'
  | 'shifts'
  | 'brands'
  | 'products'
  | 'reports'
  | 'control'
  | 'settings';

interface CustomFieldFormState {
  label: string;
  kind: CustomFieldType;
  unit: string;
  placeholder: string;
  showInFinalApproval: boolean;
}

interface IntegrationFormState {
  name: string;
  provider: IntegrationProvider;
  authMode: IntegrationAuthMode;
  baseUrl: string;
  mappingProfile: string;
  notes: string;
  enabled: boolean;
}

export function AdminPage() {
  const { currentUser, createUser, settings, saveSettings } = useAppContext();
  const users = useLiveQuery(() => appDb.users.toArray(), [], []);
  const shifts = useLiveQuery(() => appDb.shifts.toArray(), [], []);
  const brands = useLiveQuery(() => appDb.brands.toArray(), [], []);
  const products = useLiveQuery(() => appDb.products.toArray(), [], []);
  const reports = useLiveQuery(() => appDb.reportDefinitions.toArray(), [], []);
  const [tab, setTab] = useState<AdminTab>('users');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userForm, setUserForm] = useState({
    profileId: 'operations-user',
    username: '',
    displayName: '',
    password: '',
    isAdmin: false,
    roles: ['Operator'],
    permissions: ['DASHBOARD_VIEW', 'PRODUCTION_EDIT'],
    signatureSvg: ''
  });

  const [shiftForm, setShiftForm] = useState({
    name: '',
    hours: 8
  });

  const [brandForm, setBrandForm] = useState({
    name: '',
    type: 'fresh',
    productIds: [] as string[]
  });

  const [productForm, setProductForm] = useState({
    name: '',
    code: '',
    unit: 'عبوة',
    factor: 1,
    state: '',
    subgroup: '',
    group: '',
    customGroup: '',
    packageWeightKg: 1,
    brandIds: [] as string[]
  });

  const [reportForm, setReportForm] = useState({
    name: '',
    productIds: [] as string[]
  });
  const [customFieldForm, setCustomFieldForm] = useState<CustomFieldFormState>({
    label: '',
    kind: 'text',
    unit: '',
    placeholder: '',
    showInFinalApproval: true
  });
  const [integrationForm, setIntegrationForm] = useState<IntegrationFormState>({
    name: '',
    provider: 'custom',
    authMode: 'token',
    baseUrl: '',
    mappingProfile: '',
    notes: '',
    enabled: true
  });

  const approverOptions = useMemo(
    () => users.filter((user) => user.isAdmin || user.permissions.includes('APPROVE_BATCH')),
    [users]
  );
  const customFields = settings?.customFields ?? [];
  const integrations = settings?.integrations ?? [];

  if (!currentUser?.isAdmin) {
    return <Alert severity="warning">لوحة الإدارة متاحة للادمن فقط.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">لوحة إدارة الادمن</Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable">
            <Tab value="users" label="المستخدمون" />
            <Tab value="shifts" label="الورديات" />
            <Tab value="brands" label="البراندات" />
            <Tab value="products" label="الأصناف" />
            <Tab value="reports" label="التقارير" />
            <Tab value="control" label="مركز التحكم" />
            <Tab value="settings" label="الإعدادات" />
          </Tabs>
        </CardContent>
      </Card>

      {tab === 'users' ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">إنشاء مستخدم</Typography>
                  <TextField
                    select
                    label="قالب الحساب"
                    value={userForm.profileId}
                    onChange={(event) => {
                      const profile = getAccessProfile(event.target.value);
                      if (!profile) {
                        return;
                      }
                      setUserForm((current) => ({
                        ...current,
                        profileId: profile.id,
                        isAdmin: profile.isAdmin,
                        roles: profile.roles,
                        permissions: profile.permissions
                      }));
                    }}
                  >
                    {ACCESS_PROFILES.filter((profile) => profile.packageKind !== 'bootstrap').map((profile) => (
                      <MenuItem key={profile.id} value={profile.id}>
                        {profile.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="اسم المستخدم"
                    value={userForm.username}
                    onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
                  />
                  <TextField
                    label="الاسم الظاهر"
                    value={userForm.displayName}
                    onChange={(event) => setUserForm((current) => ({ ...current, displayName: event.target.value }))}
                  />
                  <TextField
                    label="كلمة المرور الأولية"
                    type="password"
                    value={userForm.password}
                    onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={userForm.isAdmin}
                        onChange={(event) =>
                          setUserForm((current) => ({
                            ...current,
                            isAdmin: event.target.checked,
                            permissions: event.target.checked ? ['*'] : current.permissions
                          }))
                        }
                      />
                    }
                    label="صلاحية Admin كاملة"
                  />
                  <TextField
                    label="الأدوار"
                    value={userForm.roles.join(', ')}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        roles: event.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                      }))
                    }
                  />
                  <Typography variant="subtitle2">الصلاحيات</Typography>
                  <FormGroup>
                    {ALL_PERMISSIONS.map((permission) => (
                      <FormControlLabel
                        key={permission}
                        control={
                          <Checkbox
                            checked={
                              userForm.permissions.includes('*') ||
                              userForm.permissions.includes(permission)
                            }
                            disabled={userForm.isAdmin}
                            onChange={(event) => {
                              setUserForm((current) => ({
                                ...current,
                                permissions: event.target.checked
                                  ? [...current.permissions, permission]
                                  : current.permissions.filter((item) => item !== permission)
                              }));
                            }}
                          />
                        }
                        label={permission}
                      />
                    ))}
                  </FormGroup>
                  <TextField
                    label="توقيع SVG"
                    multiline
                    minRows={4}
                    value={userForm.signatureSvg}
                    onChange={(event) => setUserForm((current) => ({ ...current, signatureSvg: event.target.value }))}
                  />
                  <Button
                    variant="contained"
                    startIcon={<PersonAddRoundedIcon />}
                    onClick={async () => {
                      const result = await createUser(userForm);
                      if (result.ok) {
                        setMessage(result.message);
                        setError(null);
                        setUserForm({
                          profileId: 'operations-user',
                          username: '',
                          displayName: '',
                          password: '',
                          isAdmin: false,
                          roles: ['Operator'],
                          permissions: ['DASHBOARD_VIEW', 'PRODUCTION_EDIT'],
                          signatureSvg: ''
                        });
                      } else {
                        setError(result.message);
                      }
                    }}
                  >
                    إنشاء المستخدم
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  المستخدمون الحاليون
                </Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>اسم المستخدم</TableCell>
                      <TableCell>الاسم الظاهر</TableCell>
                      <TableCell>النوع</TableCell>
                      <TableCell>الأدوار</TableCell>
                      <TableCell>الصلاحيات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.displayName}</TableCell>
                        <TableCell>{user.isAdmin ? 'Admin' : 'User'}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {(user.roles ?? []).slice(0, 3).map((role) => (
                              <Chip key={role} size="small" color="secondary" label={role} />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {(user.permissions.slice(0, 4) || []).map((permission) => (
                              <Chip key={permission} size="small" label={permission} />
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 'shifts' ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">إضافة وردية</Typography>
                  <TextField
                    label="اسم الوردية"
                    value={shiftForm.name}
                    onChange={(event) => setShiftForm((current) => ({ ...current, name: event.target.value }))}
                  />
                  <TextField
                    type="number"
                    label="عدد الساعات"
                    value={shiftForm.hours}
                    onChange={(event) => setShiftForm((current) => ({ ...current, hours: Number(event.target.value) }))}
                  />
                  <Button
                    variant="contained"
                    onClick={async () => {
                      await appDb.shifts.put({
                        id: uid('shift'),
                        name: shiftForm.name,
                        hours: shiftForm.hours,
                        labels: Array.from({ length: shiftForm.hours }, (_, index) => `الساعة ${index + 1}`)
                      });
                      setMessage('تمت إضافة الوردية.');
                      setShiftForm({ name: '', hours: 8 });
                    }}
                  >
                    حفظ الوردية
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>اسم الوردية</TableCell>
                      <TableCell>عدد الساعات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell>{shift.name}</TableCell>
                        <TableCell>{shift.hours}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 'brands' ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">إضافة براند</Typography>
                  <TextField
                    label="اسم البراند"
                    value={brandForm.name}
                    onChange={(event) => setBrandForm((current) => ({ ...current, name: event.target.value }))}
                  />
                  <TextField
                    label="النوع"
                    value={brandForm.type}
                    onChange={(event) => setBrandForm((current) => ({ ...current, type: event.target.value }))}
                    helperText="fresh أو frozen"
                  />
                  <Autocomplete
                    multiple
                    options={products}
                    getOptionLabel={(option) => option.name}
                    value={products.filter((product) => brandForm.productIds.includes(product.id))}
                    onChange={(_, value) => setBrandForm((current) => ({ ...current, productIds: value.map((item) => item.id) }))}
                    renderInput={(params) => <TextField {...params} label="الأصناف المرتبطة" />}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddBusinessRoundedIcon />}
                    onClick={async () => {
                      const brandId = uid('brand');
                      await appDb.brands.put({
                        id: brandId,
                        name: brandForm.name,
                        type: brandForm.type === 'frozen' ? 'frozen' : 'fresh',
                        icon: brandForm.type === 'frozen' ? 'ac_unit' : 'eco',
                        productIds: brandForm.productIds
                      });
                      for (const productId of brandForm.productIds) {
                        const product = await appDb.products.get(productId);
                        if (product && !product.brandIds.includes(brandId)) {
                          await appDb.products.put({
                            ...product,
                            brandIds: [...product.brandIds, brandId]
                          });
                        }
                      }
                      setMessage('تمت إضافة البراند.');
                      setBrandForm({ name: '', type: 'fresh', productIds: [] });
                    }}
                  >
                    إضافة براند
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card>
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>البراند</TableCell>
                      <TableCell>النوع</TableCell>
                      <TableCell>عدد الأصناف</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {brands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell>{brand.name}</TableCell>
                        <TableCell>{brand.type}</TableCell>
                        <TableCell>{brand.productIds.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">مركز التحكم في التكاملات</Typography>
                  <TextField
                    label="اسم نقطة التكامل"
                    value={integrationForm.name}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                  />
                  <TextField
                    select
                    label="المزود"
                    value={integrationForm.provider}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        provider: event.target.value as IntegrationProvider
                      }))
                    }
                  >
                    <MenuItem value="jdedwards">JD Edwards</MenuItem>
                    <MenuItem value="salesforce">Salesforce</MenuItem>
                    <MenuItem value="custom">Custom API</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="نمط التوثيق"
                    value={integrationForm.authMode}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        authMode: event.target.value as IntegrationAuthMode
                      }))
                    }
                  >
                    <MenuItem value="token">Token</MenuItem>
                    <MenuItem value="oauth2">OAuth 2.0</MenuItem>
                    <MenuItem value="basic">Basic Auth</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </TextField>
                  <TextField
                    label="Base URL"
                    value={integrationForm.baseUrl}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        baseUrl: event.target.value
                      }))
                    }
                  />
                  <TextField
                    label="Mapping Profile"
                    value={integrationForm.mappingProfile}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        mappingProfile: event.target.value
                      }))
                    }
                  />
                  <TextField
                    label="ملاحظات"
                    multiline
                    minRows={3}
                    value={integrationForm.notes}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        notes: event.target.value
                      }))
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={integrationForm.enabled}
                        onChange={(event) =>
                          setIntegrationForm((current) => ({
                            ...current,
                            enabled: event.target.checked
                          }))
                        }
                      />
                    }
                    label="تفعيل التكامل"
                  />
                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (!integrationForm.name.trim() || !integrationForm.baseUrl.trim()) {
                        setError('اسم نقطة التكامل وBase URL مطلوبان.');
                        return;
                      }

                      await saveSettings({
                        integrations: [
                          ...integrations,
                          {
                            id: uid('integration'),
                            name: integrationForm.name.trim(),
                            provider: integrationForm.provider,
                            enabled: integrationForm.enabled,
                            authMode: integrationForm.authMode,
                            baseUrl: integrationForm.baseUrl.trim(),
                            mappingProfile: integrationForm.mappingProfile.trim(),
                            notes: integrationForm.notes.trim()
                          }
                        ]
                      });

                      setIntegrationForm({
                        name: '',
                        provider: 'custom',
                        authMode: 'token',
                        baseUrl: '',
                        mappingProfile: '',
                        notes: '',
                        enabled: true
                      });
                      setError(null);
                      setMessage('تمت إضافة نقطة تكامل جديدة.');
                    }}
                  >
                    إضافة نقطة تكامل
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  التكاملات الحالية
                </Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الاسم</TableCell>
                      <TableCell>المزود</TableCell>
                      <TableCell>التوثيق</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>إجراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {integrations.map((integration) => (
                      <TableRow key={integration.id}>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography fontWeight={700}>{integration.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {integration.baseUrl}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{integration.provider}</TableCell>
                        <TableCell>{integration.authMode}</TableCell>
                        <TableCell>{integration.enabled ? 'مفعل' : 'متوقف'}</TableCell>
                        <TableCell>
                          <Button
                            color="error"
                            onClick={async () => {
                              await saveSettings({
                                integrations: integrations.filter(
                                  (item) => item.id !== integration.id
                                )
                              });
                              setMessage(`تم حذف التكامل ${integration.name}.`);
                            }}
                          >
                            حذف
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {integrations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>لا توجد تكاملات معرفة بعد.</TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 'products' ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">إضافة صنف</Typography>
                  <TextField label="اسم الصنف" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
                  <TextField label="الكود" value={productForm.code} onChange={(event) => setProductForm((current) => ({ ...current, code: event.target.value }))} />
                  <TextField label="الوحدة" value={productForm.unit} onChange={(event) => setProductForm((current) => ({ ...current, unit: event.target.value }))} />
                  <TextField type="number" label="المعامل" value={productForm.factor} onChange={(event) => setProductForm((current) => ({ ...current, factor: Number(event.target.value) }))} />
                  <TextField label="الحالة" value={productForm.state} onChange={(event) => setProductForm((current) => ({ ...current, state: event.target.value }))} />
                  <TextField label="مجموعة فرعية" value={productForm.subgroup} onChange={(event) => setProductForm((current) => ({ ...current, subgroup: event.target.value }))} />
                  <TextField label="مجموعة رئيسية" value={productForm.group} onChange={(event) => setProductForm((current) => ({ ...current, group: event.target.value }))} />
                  <TextField label="مجموعة مخصصة" value={productForm.customGroup} onChange={(event) => setProductForm((current) => ({ ...current, customGroup: event.target.value }))} />
                  <TextField type="number" label="وزن العبوة بالكيلو" value={productForm.packageWeightKg} onChange={(event) => setProductForm((current) => ({ ...current, packageWeightKg: Number(event.target.value) }))} />
                  <Autocomplete
                    multiple
                    options={brands}
                    getOptionLabel={(option) => option.name}
                    value={brands.filter((brand) => productForm.brandIds.includes(brand.id))}
                    onChange={(_, value) => setProductForm((current) => ({ ...current, brandIds: value.map((item) => item.id) }))}
                    renderInput={(params) => <TextField {...params} label="البراندات" />}
                  />
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                    <Button
                      variant="contained"
                      startIcon={<Inventory2RoundedIcon />}
                      onClick={async () => {
                        const productId = uid('product');
                        await appDb.products.put({
                          id: productId,
                          name: productForm.name,
                          code: productForm.code,
                          unit: productForm.unit,
                          factor: productForm.factor,
                          state: productForm.state,
                          subgroup: productForm.subgroup,
                          group: productForm.group,
                          customGroup: productForm.customGroup,
                          weightKg: productForm.packageWeightKg,
                          packageWeightKg: productForm.packageWeightKg,
                          brandIds: productForm.brandIds
                        });
                        for (const brandId of productForm.brandIds) {
                          const brand = await appDb.brands.get(brandId);
                          if (brand && !brand.productIds.includes(productId)) {
                            await appDb.brands.put({
                              ...brand,
                              productIds: [...brand.productIds, productId]
                            });
                          }
                        }
                        setMessage('تمت إضافة الصنف.');
                      }}
                    >
                      إضافة الصنف
                    </Button>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={exportProductsTemplate}>
                      قالب XLSX
                    </Button>
                    <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />}>
                      استيراد XLSX
                      <input
                        hidden
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }
                          const imported = await importProductsWorkbook(file, brands);
                          await appDb.products.bulkPut(imported);
                          setMessage(`تم استيراد ${imported.length} صنف.`);
                          event.target.value = '';
                        }}
                      />
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card>
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الصنف</TableCell>
                      <TableCell>الكود</TableCell>
                      <TableCell>الوحدة</TableCell>
                      <TableCell>وزن العبوة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.code}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>{product.packageWeightKg}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 'reports' ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">تعريف تقرير</Typography>
                  <TextField
                    label="اسم التقرير"
                    value={reportForm.name}
                    onChange={(event) => setReportForm((current) => ({ ...current, name: event.target.value }))}
                  />
                  <Autocomplete
                    multiple
                    options={products}
                    getOptionLabel={(option) => option.name}
                    value={products.filter((product) => reportForm.productIds.includes(product.id))}
                    onChange={(_, value) => setReportForm((current) => ({ ...current, productIds: value.map((item) => item.id) }))}
                    renderInput={(params) => <TextField {...params} label="الأصناف" />}
                  />
                  <Button
                    variant="contained"
                    startIcon={<QueryStatsRoundedIcon />}
                    onClick={async () => {
                      await appDb.reportDefinitions.put({
                        id: uid('report'),
                        name: reportForm.name,
                        productIds: reportForm.productIds
                      });
                      setMessage('تم حفظ تعريف التقرير.');
                      setReportForm({ name: '', productIds: [] });
                    }}
                  >
                    حفظ التقرير
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card>
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>اسم التقرير</TableCell>
                      <TableCell>عدد الأصناف</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.name}</TableCell>
                        <TableCell>{report.productIds.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 'control' ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">مركز التحكم في الحقول</Typography>
                  <TextField
                    label="اسم الخانة"
                    value={customFieldForm.label}
                    onChange={(event) =>
                      setCustomFieldForm((current) => ({
                        ...current,
                        label: event.target.value
                      }))
                    }
                  />
                  <TextField
                    select
                    label="نوع الخانة"
                    value={customFieldForm.kind}
                    onChange={(event) =>
                      setCustomFieldForm((current) => ({
                        ...current,
                        kind: event.target.value === 'number' ? 'number' : 'text'
                      }))
                    }
                  >
                    <MenuItem value="text">نصي</MenuItem>
                    <MenuItem value="number">رقمي</MenuItem>
                  </TextField>
                  <TextField
                    label="الوحدة"
                    value={customFieldForm.unit}
                    onChange={(event) =>
                      setCustomFieldForm((current) => ({
                        ...current,
                        unit: event.target.value
                      }))
                    }
                  />
                  <TextField
                    label="نص إرشادي"
                    value={customFieldForm.placeholder}
                    onChange={(event) =>
                      setCustomFieldForm((current) => ({
                        ...current,
                        placeholder: event.target.value
                      }))
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={customFieldForm.showInFinalApproval}
                        onChange={(event) =>
                          setCustomFieldForm((current) => ({
                            ...current,
                            showInFinalApproval: event.target.checked
                          }))
                        }
                      />
                    }
                    label="إظهار الخانة في الإذن النهائي"
                  />
                  <Button
                    variant="contained"
                    startIcon={<ViewColumnRoundedIcon />}
                    onClick={async () => {
                      const label = customFieldForm.label.trim();
                      if (!label) {
                        setError('اسم الخانة مطلوب.');
                        return;
                      }

                      if (
                        customFields.some(
                          (field) => field.label.trim().toLowerCase() === label.toLowerCase()
                        )
                      ) {
                        setError('هذه الخانة موجودة بالفعل.');
                        return;
                      }

                      await saveSettings({
                        customFields: [
                          ...customFields,
                          {
                            id: uid('field'),
                            label,
                            kind: customFieldForm.kind,
                            unit: customFieldForm.unit.trim(),
                            placeholder: customFieldForm.placeholder.trim(),
                            showInFinalApproval: customFieldForm.showInFinalApproval
                          }
                        ]
                      });

                      setCustomFieldForm({
                        label: '',
                        kind: 'text',
                        unit: '',
                        placeholder: '',
                        showInFinalApproval: true
                      });
                      setError(null);
                      setMessage('تمت إضافة الخانة إلى مركز التحكم.');
                    }}
                  >
                    إضافة خانة
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  الخانات الحالية
                </Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الخانة</TableCell>
                      <TableCell>النوع</TableCell>
                      <TableCell>الوحدة</TableCell>
                      <TableCell>الإذن النهائي</TableCell>
                      <TableCell>إجراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customFields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>{field.label}</TableCell>
                        <TableCell>{field.kind === 'number' ? 'رقمي' : 'نصي'}</TableCell>
                        <TableCell>{field.unit || '-'}</TableCell>
                        <TableCell>
                          <Checkbox
                            checked={field.showInFinalApproval}
                            onChange={async (event) => {
                              await saveSettings({
                                customFields: customFields.map((item) =>
                                  item.id === field.id
                                    ? {
                                        ...item,
                                        showInFinalApproval: event.target.checked
                                      }
                                    : item
                                )
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            color="error"
                            onClick={async () => {
                              await saveSettings({
                                customFields: customFields.filter(
                                  (item) => item.id !== field.id
                                )
                              });
                              setMessage(`تم حذف الخانة ${field.label}.`);
                            }}
                          >
                            حذف
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {customFields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          لا توجد خانات مخصصة بعد.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {tab === 'settings' ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">إعدادات النظام العامة</Typography>
              <TextField
                label="اسم المؤسسة"
                value={settings?.companyName ?? ''}
                onChange={(event) => saveSettings({ companyName: event.target.value })}
              />
              <TextField
                label="Instance ID"
                value={settings?.instanceId ?? ''}
                onChange={(event) => saveSettings({ instanceId: event.target.value })}
              />
              <Autocomplete
                multiple
                options={approverOptions}
                getOptionLabel={(option) => option.displayName}
                value={approverOptions.filter((user) => settings?.requiredApproverIds.includes(user.id))}
                onChange={(_, value) => saveSettings({ requiredApproverIds: value.map((item) => item.id) })}
                renderInput={(params) => <TextField {...params} label="المعتمدون الافتراضيون" />}
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="مدة صلاحية التوكن بالساعات"
                    value={settings?.sessionTtlHours ?? 12}
                    onChange={(event) =>
                      saveSettings({ sessionTtlHours: Number(event.target.value) || 12 })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="مهلة الخمول بالدقائق"
                    value={settings?.sessionIdleMinutes ?? 90}
                    onChange={(event) =>
                      saveSettings({ sessionIdleMinutes: Number(event.target.value) || 90 })
                    }
                  />
                </Grid>
              </Grid>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings?.soundEnabled ?? true}
                    onChange={(event) => saveSettings({ soundEnabled: event.target.checked })}
                  />
                }
                label="تشغيل صوت الإشعارات"
              />
              <Alert severity="info">
                تسجيل الدخول الآن يعتمد على توكن جلسة لكل مستخدم مع مدة صلاحية ومراقبة
                خمول قابلة للتخصيص من هذه الشاشة.
              </Alert>
              <Button
                variant="contained"
                startIcon={<SaveRoundedIcon />}
                onClick={async () => {
                  await pushNotification('الإعدادات', 'تم حفظ الإعدادات العامة.', 'success');
                  setMessage('تم حفظ الإعدادات.');
                }}
              >
                حفظ الإعدادات
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
