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
    <Card sx={{ height: '100%', background: 'linear-gradient(135deg, rgba(21,94,239,.10), rgba(15,118,110,.06))' }}>
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
