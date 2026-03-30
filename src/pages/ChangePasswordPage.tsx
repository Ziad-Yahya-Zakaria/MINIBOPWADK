import { useState } from 'react';
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
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import { useNavigate } from 'react-router-dom';

import { useAppContext } from '../context/AppContext';

export function ChangePasswordPage() {
  const { changePassword, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        <Card sx={{ borderRadius: 6 }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2.5}>
              <Typography variant="h4">تغيير كلمة المرور</Typography>
              <Typography color="text.secondary">
                المستخدم الحالي: {currentUser?.displayName}
              </Typography>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField
                type="password"
                label="كلمة المرور الجديدة"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <TextField
                type="password"
                label="تأكيد كلمة المرور"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <Button
                variant="contained"
                size="large"
                startIcon={<LockResetRoundedIcon />}
                disabled={busy}
                onClick={async () => {
                  if (password.trim().length < 6) {
                    setError('كلمة المرور يجب ألا تقل عن 6 أحرف.');
                    return;
                  }
                  if (password !== confirmPassword) {
                    setError('كلمتا المرور غير متطابقتين.');
                    return;
                  }
                  setBusy(true);
                  await changePassword(password);
                  setBusy(false);
                  navigate('/dashboard', { replace: true });
                }}
              >
                حفظ والمتابعة
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
