import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import { useLiveQuery } from 'dexie-react-hooks';

import { useAppContext } from '../context/AppContext';
import { appDb, pushNotification } from '../lib/db';
import { exportApprovalPdf, exportBatchWorkbook } from '../lib/exporters';
import { formatNumber, nowIso } from '../lib/utils';

export function ApprovalsPage() {
  const { currentUser, can, settings } = useAppContext();
  const batches = useLiveQuery(() => appDb.batches.toArray(), [], []);
  const brands = useLiveQuery(() => appDb.brands.toArray(), [], []);
  const shifts = useLiveQuery(() => appDb.shifts.toArray(), [], []);
  const products = useLiveQuery(() => appDb.products.toArray(), [], []);
  const reports = useLiveQuery(() => appDb.reportDefinitions.toArray(), [], []);
  const users = useLiveQuery(() => appDb.users.toArray(), [], []);
  const [message, setMessage] = useState<string | null>(null);

  const items = useMemo(
    () => batches.filter((batch) => batch.status !== 'draft').sort((left, right) => right.date.localeCompare(left.date)),
    [batches]
  );

  return (
    <Stack spacing={3}>
      <Typography variant="h4">لوحة الاعتماد</Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}

      <Grid container spacing={2}>
        {items.map((batch) => {
          const brand = brands.find((item) => item.id === batch.brandId);
          const shift = shifts.find((item) => item.id === batch.shiftId);
          const creator = users.find((item) => item.id === batch.createdByUserId);
          const canApproveThis =
            !!currentUser &&
            batch.status === 'submitted' &&
            !batch.approvals.some((item) => item.userId === currentUser.id) &&
            (currentUser.isAdmin ||
              batch.requiredApproverIds.includes(currentUser.id) ||
              can('APPROVE_BATCH'));
          const approvedCount = batch.approvals.length;
          const requiredCount = batch.requiredApproverIds.length;
          const totalPackages = batch.entries.reduce(
            (sum, entry) => sum + entry.hourValues.reduce((line, value) => line + value, 0),
            0
          );
          const totalKg = batch.entries.reduce((sum, entry) => {
            const product = products.find((item) => item.id === entry.productId);
            return sum + entry.hourValues.reduce((line, value) => line + value, 0) * (product?.packageWeightKg ?? 0);
          }, 0);

          return (
            <Grid key={batch.id} size={{ xs: 12, lg: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <div>
                        <Typography variant="h6">{brand?.name ?? 'براند'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {batch.date} | {shift?.name}
                        </Typography>
                      </div>
                      <Chip
                        color={batch.status === 'approved' ? 'success' : 'warning'}
                        label={batch.status === 'approved' ? 'معتمد بالكامل' : 'قيد الاعتماد'}
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      المدخل: {creator?.displayName ?? creator?.username ?? '-'}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <div className="metric-chip">الموافقات: {approvedCount}/{requiredCount}</div>
                      <div className="metric-chip">العبوات: {formatNumber(totalPackages)}</div>
                      <div className="metric-chip">الكيلو: {formatNumber(totalKg)}</div>
                    </Stack>

                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>المنتج</TableCell>
                          <TableCell>العبوات</TableCell>
                          <TableCell>الكيلو</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {batch.entries.map((entry) => {
                          const product = products.find((item) => item.id === entry.productId);
                          const totalEntryPackages = entry.hourValues.reduce((sum, value) => sum + value, 0);
                          const totalEntryKg = totalEntryPackages * (product?.packageWeightKg ?? 0);
                          return (
                            <TableRow key={entry.id}>
                              <TableCell>{product?.name}</TableCell>
                              <TableCell>{formatNumber(totalEntryPackages)}</TableCell>
                              <TableCell>{formatNumber(totalEntryKg)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                      {canApproveThis ? (
                        <Button
                          variant="contained"
                          startIcon={<TaskAltRoundedIcon />}
                          onClick={async () => {
                            const approvals = [...batch.approvals, { userId: currentUser!.id, approvedAt: nowIso() }];
                            const approved = approvals.length >= batch.requiredApproverIds.length;
                            await appDb.batches.put({
                              ...batch,
                              approvals,
                              status: approved ? 'approved' : 'submitted',
                              lastUpdatedAt: nowIso()
                            });
                            await pushNotification(
                              'الاعتمادات',
                              approved
                                ? `تم اكتمال اعتماد براند ${brand?.name ?? ''}.`
                                : `تم تسجيل اعتماد ${currentUser?.displayName ?? ''} على براند ${brand?.name ?? ''}.`,
                              'success'
                            );
                            setMessage(approved ? 'تم اكتمال الاعتماد بنجاح.' : 'تم تسجيل الاعتماد.');
                          }}
                        >
                          اعتماد الآن
                        </Button>
                      ) : null}

                      <Button
                        variant="outlined"
                        startIcon={<FileDownloadRoundedIcon />}
                        disabled={batch.status !== 'approved'}
                        onClick={() =>
                          exportBatchWorkbook(
                            batch,
                            products,
                            `production-${brand?.name ?? 'brand'}-${batch.date}.xlsx`,
                            {
                              settings,
                              shift,
                              reports
                            }
                          )
                        }
                      >
                        XLSX
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PictureAsPdfRoundedIcon />}
                        disabled={batch.status !== 'approved'}
                        onClick={() =>
                          exportApprovalPdf(batch, {
                            brand,
                            shift,
                            products,
                            reports,
                            users,
                            settings
                          })
                        }
                      >
                        PDF
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
