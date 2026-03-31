import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';

import { useAppContext } from '../context/AppContext';
import {
  createDeveloperSignedAccountPackage,
  isDeveloperVaultAnswerValid,
  type DeveloperVaultChallenge
} from '../lib/developerVault';
import { ACCESS_PROFILES, getAccessProfile } from '../lib/accessProfiles';
import type { AccountPackage, AccountPackageKind } from '../lib/types';
import { ALL_PERMISSIONS } from '../lib/types';
import { downloadBlob } from '../lib/utils';

interface VaultFormState {
  profileId: string;
  packageKind: AccountPackageKind;
  username: string;
  displayName: string;
  password: string;
  targetInstance: string;
  expiresDays: string;
  operator: string;
  roles: string;
  permissions: string;
  signatureSvg: string;
}

function createPreset(kind: AccountPackageKind, instanceId: string): VaultFormState {
  if (kind === 'bootstrap') {
    return {
      profileId: 'bootstrap-admin',
      packageKind: 'bootstrap',
      username: 'admin',
      displayName: 'Primary Administrator',
      password: '1234',
      targetInstance: instanceId,
      expiresDays: '7',
      operator: 'Developer Vault',
      roles: 'SuperAdmin',
      permissions: '*',
      signatureSvg: ''
    };
  }

  return {
    profileId: 'operations-user',
    packageKind: 'user',
    username: 'user1',
    displayName: 'New User',
    password: '1234',
    targetInstance: instanceId,
    expiresDays: '7',
    operator: 'Developer Vault',
    roles: 'User',
    permissions: 'DASHBOARD_VIEW,PRODUCTION_EDIT',
    signatureSvg: ''
  };
}

export function DeveloperVaultPage() {
  const { instanceId } = useAppContext();
  const [challenge, setChallenge] = useState<DeveloperVaultChallenge>({
    fullName: '',
    birthDate: ''
  });
  const [unlocked, setUnlocked] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [form, setForm] = useState<VaultFormState>(() => createPreset('bootstrap', instanceId));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AccountPackage | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      targetInstance: current.targetInstance || instanceId
    }));
  }, [instanceId]);

  const fileName = useMemo(() => {
    if (form.packageKind === 'bootstrap') {
      return 'bootstrap-account.json';
    }

    return `${form.username.trim().replace(/[^\w.-]+/g, '_') || 'user'}-user-account.json`;
  }, [form.packageKind, form.username]);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        py: 5,
        background:
          'radial-gradient(circle at top right, rgba(21,94,239,.18), transparent 25%), radial-gradient(circle at bottom left, rgba(15,118,110,.16), transparent 24%)'
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Card sx={{ borderRadius: 6 }}>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <SecurityRoundedIcon color="primary" />
                  <Typography variant="h4">Developer Vault</Typography>
                  {unlocked ? <Chip color="success" label="Unlocked" /> : null}
                </Stack>
                <Typography color="text.secondary">
                  هذه البوابة مدمجة داخل النسخة الأساسية ولكنها غير ظاهرة في التنقل العام. افتحها بحل لغز
                  المطور: ما اسمه الكامل وما تاريخ ميلاده؟
                </Typography>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    label="اسم المطور"
                    value={challenge.fullName}
                    onChange={(event) => {
                      setAccessError(null);
                      setChallenge((current) => ({
                        ...current,
                        fullName: event.target.value
                      }));
                    }}
                  />
                  <TextField
                    fullWidth
                    label="تاريخ الميلاد"
                    placeholder="2005/17/9"
                    value={challenge.birthDate}
                    onChange={(event) => {
                      setAccessError(null);
                      setChallenge((current) => ({
                        ...current,
                        birthDate: event.target.value
                      }));
                    }}
                  />
                </Stack>

                {accessError ? <Alert severity="error">{accessError}</Alert> : null}

                <Button
                  variant="contained"
                  startIcon={<LockOpenRoundedIcon />}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const ok = await isDeveloperVaultAnswerValid(challenge).catch(() => false);
                    setBusy(false);
                    if (!ok) {
                      setUnlocked(false);
                      setAccessError('إجابة اللغز غير صحيحة.');
                      return;
                    }
                    setUnlocked(true);
                    setAccessError(null);
                  }}
                >
                  فتح الخزنة
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {unlocked ? (
            <Card sx={{ borderRadius: 6 }}>
              <CardContent sx={{ p: 4 }}>
                <Stack spacing={3}>
                  <Tabs
                    value={form.packageKind}
                    onChange={(_, value: AccountPackageKind) => {
                      setResult(null);
                      setResultMessage(null);
                      setForm(createPreset(value, instanceId));
                    }}
                  >
                    <Tab value="bootstrap" label="Bootstrap Account" />
                    <Tab value="user" label="User Account" />
                  </Tabs>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="اسم المستخدم"
                      value={form.username}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, username: event.target.value }))
                      }
                    />
                    <TextField
                      fullWidth
                      label="الاسم الظاهر"
                      value={form.displayName}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, displayName: event.target.value }))
                      }
                    />
                  </Stack>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="كلمة المرور الأولية"
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                    <TextField
                      fullWidth
                      label="Target Instance"
                      value={form.targetInstance}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, targetInstance: event.target.value }))
                      }
                    />
                  </Stack>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="مدة الصلاحية بالأيام"
                      value={form.expiresDays}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, expiresDays: event.target.value }))
                      }
                    />
                    <TextField
                      fullWidth
                      label="اسم المشغل"
                      value={form.operator}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, operator: event.target.value }))
                      }
                    />
                  </Stack>

                  <TextField
                    select
                    fullWidth
                    label="قالب الحساب"
                    value={form.profileId}
                    onChange={(event) => {
                      const profile = getAccessProfile(event.target.value);
                      if (!profile) {
                        return;
                      }
                      setForm((current) => ({
                        ...current,
                        profileId: profile.id,
                        packageKind: profile.packageKind ?? current.packageKind,
                        roles: profile.roles.join(', '),
                        permissions: profile.permissions.join(', ')
                      }));
                    }}
                  >
                    {ACCESS_PROFILES.filter((profile) =>
                      profile.packageKind ? profile.packageKind === form.packageKind : true
                    ).map((profile) => (
                      <MenuItem key={profile.id} value={profile.id}>
                        {profile.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    fullWidth
                    label="Roles"
                    value={form.roles}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, roles: event.target.value }))
                    }
                  />

                  <TextField
                    fullWidth
                    label="Permissions"
                    value={form.permissions}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, permissions: event.target.value }))
                    }
                  />
                  <FormGroup>
                    {ALL_PERMISSIONS.map((permission) => (
                      <FormControlLabel
                        key={permission}
                        control={
                          <Checkbox
                            checked={
                              form.permissions.includes('*') ||
                              form.permissions.split(',').map((item) => item.trim()).includes(permission)
                            }
                            onChange={(event) => {
                              const currentPermissions = form.permissions
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean)
                                .filter((item) => item !== '*');
                              const nextPermissions = event.target.checked
                                ? [...new Set([...currentPermissions, permission])]
                                : currentPermissions.filter((item) => item !== permission);
                              setForm((current) => ({
                                ...current,
                                permissions: nextPermissions.join(', ')
                              }));
                            }}
                          />
                        }
                        label={permission}
                      />
                    ))}
                  </FormGroup>

                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="توقيع SVG اختياري"
                    value={form.signatureSvg}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, signatureSvg: event.target.value }))
                    }
                  />

                  {resultMessage ? <Alert severity="success">{resultMessage}</Alert> : null}

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <Button
                      variant="contained"
                      startIcon={<DownloadRoundedIcon />}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setResultMessage(null);
                        try {
                          const accountPackage = await createDeveloperSignedAccountPackage(
                            {
                              packageKind: form.packageKind,
                              username: form.username,
                              displayName: form.displayName,
                              password: form.password,
                              targetInstance: form.targetInstance.trim() || instanceId,
                              operator: form.operator,
                              expiresDays: Number(form.expiresDays || 7),
                              roles: form.roles.split(',').map((item) => item.trim()).filter(Boolean),
                              permissions: form.permissions
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean),
                              signatureSvg: form.signatureSvg
                            },
                            challenge
                          );

                          downloadBlob(
                            new Blob([JSON.stringify(accountPackage, null, 2)], {
                              type: 'application/json'
                            }),
                            fileName
                          );

                          setResult(accountPackage);
                          setResultMessage(`تم إنشاء ${fileName} بنجاح.`);
                        } catch (error) {
                          setResultMessage(null);
                          setAccessError(
                            error instanceof Error ? error.message : 'تعذر إنشاء الملف.'
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      إنشاء الملف
                    </Button>

                    <Chip
                      variant="outlined"
                      label={`Instance: ${form.targetInstance.trim() || instanceId}`}
                    />
                  </Stack>

                  {result ? (
                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        p: 2,
                        borderRadius: 4,
                        overflow: 'auto',
                        backgroundColor: 'rgba(15,23,42,.08)',
                        direction: 'ltr',
                        textAlign: 'left'
                      }}
                    >
                      {JSON.stringify(result, null, 2)}
                    </Box>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
