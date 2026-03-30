import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import dayjs from 'dayjs';
import { useLiveQuery } from 'dexie-react-hooks';

import { useAppContext } from '../context/AppContext';
import { appDb } from '../lib/db';
import { exportBulkPackage, importBulkPackage } from '../lib/exporters';
import { inDateRange } from '../lib/utils';

export function BulkPage() {
  const { settings } = useAppContext();
  const batches = useLiveQuery(() => appDb.batches.toArray(), [], []);
  const products = useLiveQuery(() => appDb.products.toArray(), [], []);
  const brands = useLiveQuery(() => appDb.brands.toArray(), [], []);
  const shifts = useLiveQuery(() => appDb.shifts.toArray(), [], []);
  const reports = useLiveQuery(() => appDb.reportDefinitions.toArray(), [], []);
  const packages = useLiveQuery(() => appDb.bulkPackages.toArray(), [], []);

  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Free Engine Bulk</Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="من تاريخ"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="إلى تاريخ"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<DownloadRoundedIcon />}
                onClick={async () => {
                  await exportBulkPackage({
                    periodFrom: fromDate,
                    periodTo: toDate,
                    batches: batches.filter((batch) => batch.status !== 'draft' && inDateRange(batch.date, fromDate, toDate)),
                    products,
                    brands,
                    shifts,
                    reports,
                    settings
                  });
                  setMessage('تم إنشاء وتنزيل الحزمة بنجاح.');
                }}
              >
                إنشاء حزمة وتصديرها
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                fullWidth
                component="label"
                size="large"
                variant="outlined"
                startIcon={<UploadRoundedIcon />}
              >
                استيراد حزمة
                <input
                  hidden
                  type="file"
                  accept=".zip,application/zip"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    const result = await importBulkPackage(file);
                    if (result.ok) {
                      setMessage(result.message);
                      setError(null);
                    } else {
                      setError(result.message);
                    }
                    event.target.value = '';
                  }}
                />
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            سجل الحزم
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>نوع العملية</TableCell>
                <TableCell>معرّف الحزمة</TableCell>
                <TableCell>المصدر</TableCell>
                <TableCell>الفترة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>التاريخ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages
                .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                .map((pkg) => (
                  <TableRow key={pkg.packageId}>
                    <TableCell>{pkg.kind === 'export' ? 'تصدير' : 'استيراد'}</TableCell>
                    <TableCell>{pkg.packageId}</TableCell>
                    <TableCell>{pkg.manifest.sourceInstanceName}</TableCell>
                    <TableCell>
                      {pkg.manifest.periodFrom} - {pkg.manifest.periodTo}
                    </TableCell>
                    <TableCell>{pkg.status === 'completed' ? 'مكتمل' : 'فشل'}</TableCell>
                    <TableCell>{new Date(pkg.createdAt).toLocaleString('ar-EG')}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
