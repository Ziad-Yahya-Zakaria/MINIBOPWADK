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
import { useNavigate } from 'react-router-dom';

import { useAppContext } from '../context/AppContext';

export function LoginPage() {
  const { login, hasUsers } = useAppContext();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hasUsers) {
      navigate('/bootstrap', { replace: true });
    }
  }, [hasUsers, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at top right, rgba(21,94,239,.18), transparent 25%), radial-gradient(circle at bottom left, rgba(15,118,110,.16), transparent 24%)'
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 6, overflow: 'hidden' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2.5}>
              <Typography variant="h4">Minibo Systems</Typography>
              <Typography color="text.secondary">
                إدارة خطوط الإنتاج واعتمادها داخل متصفحك، مع جاهزية رفع مباشرة على Vercel.
              </Typography>
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
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
