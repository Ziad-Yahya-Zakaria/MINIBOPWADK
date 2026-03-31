import { Card, CardContent, Stack, Typography } from '@mui/material';

export function StatCard({
  title,
  value,
  hint
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card
      sx={{
        height: '100%',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(60,199,158,.16), rgba(241,178,75,.10))'
            : 'linear-gradient(135deg, rgba(15,122,93,.10), rgba(201,133,18,.08))'
      }}
    >
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
