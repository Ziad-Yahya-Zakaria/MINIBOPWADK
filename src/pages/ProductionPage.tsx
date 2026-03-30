import { Fragment, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useLiveQuery } from 'dexie-react-hooks';

import { useAppContext } from '../context/AppContext';
import { appDb, pushNotification } from '../lib/db';
import type { BrandDefinition, EntryLine, ProductDefinition, ProductionBatch } from '../lib/types';
import { batchSummary, emptyHourNotes, emptyHourValues, formatNumber, getCellIndex, getShiftLabels, nowIso, todayIsoDate, uid } from '../lib/utils';

export function ProductionPage() {
  const { currentUser, settings } = useAppContext();
  const shifts = useLiveQuery(() => appDb.shifts.toArray(), [], []);
  const brands = useLiveQuery(() => appDb.brands.toArray(), [], []);
  const products = useLiveQuery(() => appDb.products.toArray(), [], []);
  const batches = useLiveQuery(() => appDb.batches.toArray(), [], []);

  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [activeBrandId, setActiveBrandId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const today = todayIsoDate();

  const userBatches = useMemo(
    () => batches.filter((batch) => batch.createdByUserId === currentUser?.id && batch.date === today),
    [batches, currentUser?.id, today]
  );

  const effectiveShiftId = selectedShiftId || shifts[0]?.id || '';
  const effectiveBrandId =
    activeBrandId && selectedBrandIds.includes(activeBrandId) ? activeBrandId : selectedBrandIds[0] || '';

  const activeShift = shifts.find((shift) => shift.id === effectiveShiftId);
  const activeBrand = brands.find((brand) => brand.id === effectiveBrandId);
  const activeBatch =
    userBatches.find((batch) => batch.brandId === effectiveBrandId && batch.shiftId === effectiveShiftId && batch.status === 'draft') ??
    userBatches.find((batch) => batch.brandId === effectiveBrandId && batch.shiftId === effectiveShiftId);
  const isReadOnly = activeBatch?.status !== 'draft';

  const activeProducts = products.filter((product) => activeBrand?.productIds.includes(product.id));
  const availableProducts = activeProducts.filter(
    (product) => !activeBatch?.entries.some((entry) => entry.productId === product.id)
  );
  const summary = batchSummary(activeBatch?.entries ?? [], products, activeShift);

  async function ensureDraft(brandId: string): Promise<ProductionBatch> {
    const existing =
      userBatches.find(
        (batch) =>
          batch.brandId === brandId &&
          batch.shiftId === effectiveShiftId &&
          batch.status === 'draft'
      ) ??
      (await appDb.batches
        .toArray()
        .then((rows) =>
          rows.find(
            (batch) =>
              batch.brandId === brandId &&
              batch.shiftId === effectiveShiftId &&
              batch.createdByUserId === currentUser?.id &&
              batch.date === today &&
              batch.status === 'draft'
          )
        ));

    if (existing) {
      return existing;
    }

    const draft: ProductionBatch = {
      id: uid('batch'),
      date: today,
      shiftId: effectiveShiftId,
      brandId,
      createdByUserId: currentUser!.id,
      entries: [],
      status: 'draft',
      approvals: [],
      requiredApproverIds: settings?.requiredApproverIds.length
        ? settings.requiredApproverIds
        : [currentUser!.id],
      lastUpdatedAt: nowIso()
    };
    await appDb.batches.put(draft);
    return draft;
  }

  async function mutateBatch(update: (batch: ProductionBatch) => ProductionBatch) {
    if (!activeBatch) {
      return;
    }
    await appDb.batches.put(update(activeBatch));
  }

  async function addProduct(product: ProductDefinition | null) {
    if (!product || !activeBrandId) {
      return;
    }
    const draft = await ensureDraft(activeBrandId);
    const hourCount = getShiftLabels(activeShift).length;
    const line: EntryLine = {
      id: uid('line'),
      productId: product.id,
      hourValues: emptyHourValues(hourCount),
      hourNotes: emptyHourNotes(hourCount)
    };
    await appDb.batches.put({
      ...draft,
      entries: [...draft.entries, line],
      lastUpdatedAt: nowIso()
    });
  }

  function focusTarget(productIndex: number, hourIndex: number, note = false) {
    const target = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[data-cell="${getCellIndex(productIndex, hourIndex, note)}"]`
    );
    target?.focus();
  }

  async function updateEntry(
    productIndex: number,
    entryId: string,
    hourIndex: number,
    note: boolean,
    rawValue: string
  ) {
    await mutateBatch((batch) => ({
      ...batch,
      entries: batch.entries.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        if (note) {
          const nextNotes = [...entry.hourNotes];
          nextNotes[hourIndex] = rawValue;
          return {
            ...entry,
            hourNotes: nextNotes
          };
        }

        const nextValues = [...entry.hourValues];
        nextValues[hourIndex] = Number(rawValue || 0);
        return {
          ...entry,
          hourValues: nextValues
        };
      }),
      lastUpdatedAt: nowIso()
    }));

    if (settings?.soundEnabled) {
      playInputTone();
    }

    focusTarget(productIndex, hourIndex + 1);
  }

  function playInputTone() {
    const audioContext = new window.AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.frequency.value = 540;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.015;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
  }

  async function submitBatch(batch: ProductionBatch) {
    await appDb.batches.put({
      ...batch,
      status: 'submitted',
      lastUpdatedAt: nowIso(),
      requiredApproverIds: batch.requiredApproverIds.length
        ? batch.requiredApproverIds
        : settings?.requiredApproverIds.length
          ? settings.requiredApproverIds
          : [currentUser!.id]
    });
    await pushNotification('إنتاج جديد', `تم إرسال إنتاج البراند ${brands.find((item) => item.id === batch.brandId)?.name ?? ''} للاعتماد.`, 'info');
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">إدخال الإنتاج</Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="shift-select">الوردية</InputLabel>
                <Select
                  labelId="shift-select"
                  label="الوردية"
                    value={effectiveShiftId}
                  onChange={(event) => setSelectedShiftId(event.target.value)}
                >
                  {shifts.map((shift) => (
                    <MenuItem key={shift.id} value={shift.id}>
                      {shift.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Autocomplete
                multiple
                options={brands}
                getOptionLabel={(option: BrandDefinition) => option.name}
                value={brands.filter((brand) => selectedBrandIds.includes(brand.id))}
                onChange={async (_, newValue) => {
                  setSelectedBrandIds(newValue.map((item) => item.id));
                  if (newValue[0]) {
                    setActiveBrandId(newValue[0].id);
                    await ensureDraft(newValue[0].id);
                  }
                }}
                renderInput={(params) => <TextField {...params} label="البراندات" placeholder="اختر البراندات" />}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {selectedBrandIds.length > 0 ? (
        <Card>
          <CardContent>
            <Tabs value={activeBrandId} onChange={(_, value) => setActiveBrandId(value)} variant="scrollable">
              {brands
                .filter((brand) => selectedBrandIds.includes(brand.id))
                .map((brand) => (
                  <Tab
                    key={brand.id}
                    value={brand.id}
                    label={`${brand.type === 'frozen' ? '❄' : '🌿'} ${brand.name}`}
                  />
                ))}
            </Tabs>
          </CardContent>
        </Card>
      ) : null}

      {activeBrand ? (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={availableProducts}
                  getOptionLabel={(option) => `${option.name} - ${option.code}`}
                  onChange={(_, value) => {
                    addProduct(value);
                  }}
                  renderInput={(params) => <TextField {...params} label="إضافة منتج" />}
                />
                <Button
                  variant="outlined"
                  startIcon={<SaveRoundedIcon />}
                  onClick={() => setMessage('تم حفظ المسودة محلياً داخل قاعدة بيانات المتصفح.')}
                >
                  حفظ مسودة
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<SendRoundedIcon />}
                  disabled={!activeBatch || activeBatch.entries.length === 0 || activeBatch.status !== 'draft'}
                  onClick={async () => {
                    if (activeBatch) {
                      await submitBatch(activeBatch);
                      setMessage('تم إرسال البراند الحالي للاعتماد.');
                    }
                  }}
                >
                  اعتماد البراند الحالي
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CheckCircleRoundedIcon />}
                  onClick={async () => {
                    const drafts = userBatches.filter(
                      (batch) =>
                        batch.shiftId === effectiveShiftId &&
                        selectedBrandIds.includes(batch.brandId) &&
                        batch.status === 'draft'
                    );
                    for (const draft of drafts) {
                      await submitBatch(draft);
                    }
                    setMessage('تم إرسال كل البراندات المحددة للاعتماد.');
                  }}
                >
                  اعتماد الكل
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">
                  شبكة الإدخال الشبيهة بالإكسيل - {activeBrand.name}
                </Typography>
                {activeBatch?.status && activeBatch.status !== 'draft' ? (
                  <Alert severity="info">هذا البراند تم إرساله للاعتماد، لذا يظهر هنا للقراءة فقط.</Alert>
                ) : null}
                <Box sx={{ overflow: 'auto' }}>
                  <table className="production-grid">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 220 }}>المنتج</th>
                        {getShiftLabels(activeShift).map((label) => (
                          <th key={label} style={{ minWidth: 128 }}>
                            {label}
                          </th>
                        ))}
                        <th style={{ minWidth: 120 }}>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeBatch?.entries ?? []).map((entry, productIndex) => {
                        const product = products.find((item) => item.id === entry.productId);
                        const totalPackages = entry.hourValues.reduce((sum, value) => sum + value, 0);
                        return (
                          <Fragment key={entry.id}>
                            <tr key={`${entry.id}-qty`}>
                              <td>
                                <Stack spacing={0.5}>
                                  <Typography fontWeight={700}>{product?.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {product?.code} | وزن العبوة: {formatNumber(product?.packageWeightKg ?? 0)} كجم
                                  </Typography>
                                </Stack>
                              </td>
                              {entry.hourValues.map((value, hourIndex) => (
                                <td key={`${entry.id}-${hourIndex}`}>
                                  <input
                                    type="number"
                                    min="0"
                                    defaultValue={value}
                                    data-cell={getCellIndex(productIndex, hourIndex, false)}
                                    readOnly={isReadOnly}
                                    onKeyDown={(event) => {
                                      if (event.key === 'ArrowLeft') {
                                        event.preventDefault();
                                        focusTarget(productIndex, hourIndex + 1);
                                      }
                                      if (event.key === 'ArrowRight' && hourIndex > 0) {
                                        event.preventDefault();
                                        focusTarget(productIndex, hourIndex - 1);
                                      }
                                      if (event.key === 'ArrowDown') {
                                        event.preventDefault();
                                        focusTarget(productIndex, hourIndex, true);
                                      }
                                    }}
                                    onPaste={async (event) => {
                                      const text = event.clipboardData.getData('text');
                                      if (!text.includes('\t') && !text.includes('\n')) {
                                        return;
                                      }
                                      event.preventDefault();
                                      const cells = text
                                        .split(/\t|\n/)
                                        .map((item) => Number(item.trim() || 0))
                                        .filter((item) => !Number.isNaN(item));
                                      await mutateBatch((batch) => ({
                                        ...batch,
                                        entries: batch.entries.map((item) => {
                                          if (item.id !== entry.id) {
                                            return item;
                                          }
                                          const next = [...item.hourValues];
                                          cells.forEach((cell, cellIndex) => {
                                            if (hourIndex + cellIndex < next.length) {
                                              next[hourIndex + cellIndex] = cell;
                                            }
                                          });
                                          return { ...item, hourValues: next };
                                        })
                                      }));
                                    }}
                                    onBlur={async (event) => {
                                      await updateEntry(productIndex, entry.id, hourIndex, false, event.target.value);
                                    }}
                                  />
                                </td>
                              ))}
                              <td>{formatNumber(totalPackages)}</td>
                            </tr>
                            <tr key={`${entry.id}-notes`}>
                              <td>
                                <Chip label="ملاحظات كل ساعة" size="small" />
                              </td>
                              {entry.hourNotes.map((note, hourIndex) => (
                                <td key={`${entry.id}-${hourIndex}-note`}>
                                  <textarea
                                    rows={2}
                                    defaultValue={note}
                                    data-cell={getCellIndex(productIndex, hourIndex, true)}
                                    readOnly={isReadOnly}
                                    onKeyDown={(event) => {
                                      if (event.key === 'ArrowUp') {
                                        event.preventDefault();
                                        focusTarget(productIndex, hourIndex, false);
                                      }
                                    }}
                                    onBlur={async (event) => {
                                      await updateEntry(productIndex, entry.id, hourIndex, true, event.target.value);
                                    }}
                                  />
                                </td>
                              ))}
                              <td />
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                ملخص إنتاج كل ساعة
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {summary.perHour.map((value, index) => (
                  <div className="metric-chip" key={`hour-total-${index}`}>
                    {getShiftLabels(activeShift)[index]}: {formatNumber(value)}
                  </div>
                ))}
                <div className="metric-chip">الإجمالي: {formatNumber(summary.totalPackages)} عبوة</div>
                <div className="metric-chip">الإجمالي: {formatNumber(summary.totalKg)} كجم</div>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      ) : (
        <Alert severity="info">اختر وردية وبراند واحد على الأقل لبدء إدخال الإنتاج.</Alert>
      )}
    </Stack>
  );
}
