import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import dayjs from 'dayjs';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { StatCard } from '../components/StatCard';
import { appDb } from '../lib/db';
import { exportDashboardWorkbook } from '../lib/exporters';
import { formatNumber, inDateRange } from '../lib/utils';

const palette = ['#155eef', '#0f766e', '#16a34a', '#f59e0b', '#d946ef', '#ef4444'];

export function DashboardPage() {
  const products = useLiveQuery(() => appDb.products.toArray(), [], []);
  const batches = useLiveQuery(() => appDb.batches.toArray(), [], []);
  const shifts = useLiveQuery(() => appDb.shifts.toArray(), [], []);
  const reports = useLiveQuery(() => appDb.reportDefinitions.toArray(), [], []);
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedProductId, setSelectedProductId] = useState('all');

  const filteredBatches = useMemo(
    () =>
      batches.filter(
        (batch) => batch.status !== 'draft' && inDateRange(batch.date, fromDate, toDate)
      ),
    [batches, fromDate, toDate]
  );

  const metrics = useMemo(() => {
    const productMap = new Map(products.map((item) => [item.id, item]));
    const shiftMap = new Map(shifts.map((item) => [item.id, item]));
    const productAggregates = new Map<
      string,
      { productName: string; productCode: string; packages: number; kg: number }
    >();
    const reportAggregates = new Map<
      string,
      { reportName: string; packages: number; kg: number; matchedProducts: number }
    >();
    let totalKg = 0;
    let totalHours = 0;

    for (const report of reports) {
      reportAggregates.set(report.id, {
        reportName: report.name,
        packages: 0,
        kg: 0,
        matchedProducts:
          selectedProductId === 'all'
            ? report.productIds.length
            : report.productIds.includes(selectedProductId)
              ? 1
              : 0
      });
    }

    for (const batch of filteredBatches) {
      const shift = shiftMap.get(batch.shiftId);
      totalHours += shift?.hours ?? 0;

      for (const entry of batch.entries) {
        if (selectedProductId !== 'all' && entry.productId !== selectedProductId) {
          continue;
        }

        const product = productMap.get(entry.productId);
        const totalPackages = entry.hourValues.reduce((sum, value) => sum + value, 0);
        const totalProductKg = totalPackages * (product?.packageWeightKg ?? 0);
        totalKg += totalProductKg;

        const currentProduct = productAggregates.get(entry.productId) ?? {
          productName: product?.name ?? 'منتج',
          productCode: product?.code ?? '-',
          packages: 0,
          kg: 0
        };
        currentProduct.packages += totalPackages;
        currentProduct.kg += totalProductKg;
        productAggregates.set(entry.productId, currentProduct);

        for (const report of reports) {
          if (!report.productIds.includes(entry.productId)) {
            continue;
          }
          const currentReport = reportAggregates.get(report.id);
          if (!currentReport) {
            continue;
          }
          currentReport.packages += totalPackages;
          currentReport.kg += totalProductKg;
        }
      }
    }

    const rows = Array.from(productAggregates.values()).sort(
      (left, right) => right.kg - left.kg
    );
    const reportRows = Array.from(reportAggregates.values())
      .filter((item) => item.packages > 0 || item.matchedProducts > 0)
      .sort((left, right) => right.kg - left.kg);

    return {
      rows,
      reportRows,
      totalKg,
      totalHours,
      totalPackages: rows.reduce((sum, item) => sum + item.packages, 0),
      pendingApprovals: filteredBatches.filter((batch) => batch.status === 'submitted').length,
      topProduct: rows[0]?.productName ?? 'لا يوجد'
    };
  }, [filteredBatches, products, reports, selectedProductId, shifts]);

  return (
    <Stack spacing={3}>
      <Typography variant="h4">لوحة التحكم</Typography>

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
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel id="dashboard-product-label">منتج محدد</InputLabel>
                <Select
                  labelId="dashboard-product-label"
                  label="منتج محدد"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                >
                  <MenuItem value="all">كل المنتجات</MenuItem>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<FileDownloadRoundedIcon />}
                onClick={() =>
                  exportDashboardWorkbook(
                    metrics.rows,
                    metrics.reportRows,
                    `dashboard-${fromDate}-${toDate}.xlsx`
                  )
                }
              >
                XLSX
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="وزن الإنتاج الفعلي"
            value={`${formatNumber(metrics.totalKg)} كجم`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="إجمالي ساعات التشغيل"
            value={`${formatNumber(metrics.totalHours)} ساعة`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard title="إجمالي العبوات" value={formatNumber(metrics.totalPackages)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard
            title="الاعتمادات المعلقة"
            value={formatNumber(metrics.pendingApprovals)}
            hint={`أعلى منتج: ${metrics.topProduct}`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                إنتاج كل منتج
              </Typography>
              <Box sx={{ width: '100%', height: 380 }}>
                <ResponsiveContainer>
                  <BarChart data={metrics.rows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="productName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="kg" name="كيلو">
                      {metrics.rows.map((row, index) => (
                        <Cell key={row.productCode} fill={palette[index % palette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                لمحة KPI
              </Typography>
              <Stack spacing={1.5}>
                {metrics.rows.slice(0, 5).map((row) => (
                  <Box
                    key={row.productCode}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: 'action.hover'
                    }}
                  >
                    <div>
                      <Typography variant="subtitle2">{row.productName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.productCode}
                      </Typography>
                    </div>
                    <Typography variant="subtitle2">{formatNumber(row.kg)} كجم</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            جدول المنتجات
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>اسم المنتج</TableCell>
                <TableCell>كود المنتج</TableCell>
                <TableCell>كمية الإنتاج بالعبوة</TableCell>
                <TableCell>كمية الإنتاج بالكيلو</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metrics.rows.map((row) => (
                <TableRow key={row.productCode}>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell>{row.productCode}</TableCell>
                  <TableCell>{formatNumber(row.packages)}</TableCell>
                  <TableCell>{formatNumber(row.kg)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            ربط الإنتاج بالتقارير النهائية
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>اسم التقرير</TableCell>
                <TableCell>عدد المنتجات المشمولة</TableCell>
                <TableCell>العبوات المجمعة</TableCell>
                <TableCell>الكيلو المجمع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metrics.reportRows.map((row) => (
                <TableRow key={row.reportName}>
                  <TableCell>{row.reportName}</TableCell>
                  <TableCell>{formatNumber(row.matchedProducts)}</TableCell>
                  <TableCell>{formatNumber(row.packages)}</TableCell>
                  <TableCell>{formatNumber(row.kg)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
