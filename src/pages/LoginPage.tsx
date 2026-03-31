import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useAppContext } from '../context/AppContext';
import { useDeveloperVaultTrigger } from '../hooks/useDeveloperVaultTrigger';

export function LoginPage() {
  const { login, hasUsers, importUserAccountFile } = useAppContext();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openDeveloperVault = useDeveloperVaultTrigger();

  useEffect(() => {
    if (!hasUsers) {
      navigate('/bootstrap', { replace: true });
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
                Minibo Systems
              </Typography>
              <Typography color="text.secondary">
                إدارة خطوط الإنتاج واعتمادها داخل متصفحك، مع إمكانية استيراد ملف مستخدم موقّع.
              </Typography>

              {message ? <Alert severity="success">{message}</Alert> : null}
              {error ? <Alert severity="error">{error}</Alert> : null}

              <TextField
                label="اسم المستخدم"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <TextField
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={async (event) => {
                  if (event.key === 'Enter') {
                    setBusy(true);
                    const result = await login(username, password);
                    setBusy(false);
                    if (result.ok) {
                      navigate('/dashboard', { replace: true });
                    } else {
                      setError(result.message ?? 'فشل تسجيل الدخول.');
                    }
                  }
                }}
              />
              <Button
                variant="contained"
                size="large"
                startIcon={<LoginRoundedIcon />}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const result = await login(username, password);
                  setBusy(false);
                  if (result.ok) {
                    navigate('/dashboard', { replace: true });
                  } else {
                    setError(result.message ?? 'فشل تسجيل الدخول.');
                  }
                }}
              >
                تسجيل الدخول
              </Button>

              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadFileRoundedIcon />}
              >
                استيراد ملف مستخدم
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
                    const result = await importUserAccountFile(file);
                    setBusy(false);
                    if (result.ok) {
                      setMessage(result.message);
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
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
