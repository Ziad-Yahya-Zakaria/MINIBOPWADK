import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useAppContext } from '../context/AppContext';
import { useDeveloperVaultTrigger } from '../hooks/useDeveloperVaultTrigger';

export function BootstrapPage() {
  const { bootstrapFromFile, instanceId, hasUsers } = useAppContext();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openDeveloperVault = useDeveloperVaultTrigger();

  useEffect(() => {
    if (hasUsers) {
      navigate('/login', { replace: true });
    }
  }, [hasUsers, navigate]);

  return (
    <Box
      className="auth-screen"
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center'
      }}
    >
      <Container maxWidth="sm">
        <Card className="auth-card" sx={{ borderRadius: 6, overflow: 'hidden' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2.5}>
              <Typography
                variant="h4"
                sx={{ cursor: 'default', userSelect: 'none' }}
                onClick={openDeveloperVault}
              >
                Bootstrap Access
              </Typography>
              <Typography color="text.secondary">
                هذه النسخة لا تحتوي أي مستخدمين حالياً. ارفع ملف الحساب التأسيسي
                <strong> bootstrap-account.json </strong>
                لبدء التشغيل.
              </Typography>
              <Alert severity="info">معرّف النسخة الحالية: {instanceId}</Alert>
              {message ? <Alert icon={<CheckCircleRoundedIcon />} severity="success">{message}</Alert> : null}
              {error ? <Alert severity="error">{error}</Alert> : null}
              <Button
                component="label"
                variant="contained"
                size="large"
                startIcon={<UploadFileRoundedIcon />}
                disabled={busy}
              >
                رفع ملف التأسيس
                <input
                  hidden
                  type="file"
                  accept=".json,application/json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    setBusy(true);
                    setError(null);
                    setMessage(null);
                    const result = await bootstrapFromFile(file);
                    setBusy(false);
                    if (result.ok) {
                      setMessage(result.message);
                      navigate('/change-password', { replace: true });
                    } else {
                      setError(result.message);
                    }
                    event.target.value = '';
                  }}
                />
              </Button>
              <Button
                component={RouterLink}
                to="/about"
                variant="text"
                startIcon={<InfoRoundedIcon />}
              >
                عن البرنامج
              </Button>
              <Typography variant="body2" color="text.secondary">
                بعد الاستيراد الناجح، سيتم إجبار المستخدم الأول على تغيير كلمة المرور قبل الوصول إلى بقية النظام.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
