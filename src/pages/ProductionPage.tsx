import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
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

import { ProductionEntryTable } from '../components/ProductionEntryTable';
import { useAppContext } from '../context/AppContext';
import { appDb, pushNotification } from '../lib/db';
import type {
  BrandDefinition,
  EntryLine,
  ProductDefinition,
  ProductionBatch
} from '../lib/types';
import {
  batchSummary,
  emptyHourNotes,
  emptyHourValues,
  formatNumber,
  getShiftLabels,
  nowIso,
  todayIsoDate,
  uid
} from '../lib/utils';

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
    () =>
      batches.filter(
        (batch) => batch.createdByUserId === currentUser?.id && batch.date === today
      ),
    [batches, currentUser?.id, today]
  );

  const effectiveShiftId = selectedShiftId || shifts[0]?.id || '';
  const effectiveBrandId =
    activeBrandId && selectedBrandIds.includes(activeBrandId)
      ? activeBrandId
      : selectedBrandIds[0] || '';

  const activeShift = shifts.find((shift) => shift.id === effectiveShiftId);
  const shiftLabels = getShiftLabels(activeShift);
  const activeBrand = brands.find((brand) => brand.id === effectiveBrandId);
  const activeBatch =
    userBatches.find(
      (batch) =>
        batch.brandId === effectiveBrandId &&
        batch.shiftId === effectiveShiftId &&
        batch.status === 'draft'
    ) ??
    userBatches.find(
      (batch) =>
        batch.brandId === effectiveBrandId && batch.shiftId === effectiveShiftId
    );
  const isReadOnly = activeBatch?.status !== 'draft';
  const customFields = settings?.customFields ?? [];

  const activeProducts = products.filter((product) =>
    activeBrand?.productIds.includes(product.id)
  );
  const availableProducts = activeProducts.filter(
    (product) =>
      !activeBatch?.entries.some((entry) => entry.productId === product.id)
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
      (await appDb.batches.toArray()).find(
        (batch) =>
          batch.brandId === brandId &&
          batch.shiftId === effectiveShiftId &&
          batch.createdByUserId === currentUser?.id &&
          batch.date === today &&
          batch.status === 'draft'
      );

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
    if (!activeBatch?.id) {
      return;
    }

    const latest = await appDb.batches.get(activeBatch.id);
    if (!latest) {
      return;
    }

    await appDb.batches.put(update(latest));
  }

  async function addProduct(product: ProductDefinition | null) {
    if (!product || !effectiveBrandId) {
      return;
    }

    const draft = await ensureDraft(effectiveBrandId);
    const line: EntryLine = {
      id: uid('line'),
      productId: product.id,
      hourValues: emptyHourValues(shiftLabels.length),
      hourNotes: emptyHourNotes(shiftLabels.length),
      customFieldValues: Object.fromEntries(
        customFields.map((field) => [field.id, ''])
      )
    };

    await appDb.batches.put({
      ...draft,
      entries: [...draft.entries, line],
      lastUpdatedAt: nowIso()
    });
  }

  async function updateEntry(
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
        const parsed = Number(rawValue || 0);
        nextValues[hourIndex] = Number.isFinite(parsed) ? parsed : 0;
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
  }

  async function updateCustomField(
    entryId: string,
    fieldId: string,
    rawValue: string
  ) {
    await mutateBatch((batch) => ({
      ...batch,
      entries: batch.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              customFieldValues: {
                ...entry.customFieldValues,
                [fieldId]: rawValue
              }
            }
          : entry
      ),
      lastUpdatedAt: nowIso()
    }));
  }

  async function pasteHours(
    entryId: string,
    startHourIndex: number,
    text: string
  ) {
    const cells = text
      .trim()
      .split(/\t|\r?\n/)
      .map((item) => {
        const parsed = Number(item.trim() || 0);
        return Number.isFinite(parsed) ? parsed : 0;
      });

    await mutateBatch((batch) => ({
      ...batch,
      entries: batch.entries.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        const nextValues = [...entry.hourValues];
        cells.forEach((cell, cellIndex) => {
          if (startHourIndex + cellIndex < nextValues.length) {
            nextValues[startHourIndex + cellIndex] = cell;
          }
        });

        return {
          ...entry,
          hourValues: nextValues
        };
      }),
      lastUpdatedAt: nowIso()
    }));
  }

  function playInputTone() {
    if (typeof window.AudioContext === 'undefined') {
      return;
    }

    const audioContext = new window.AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.frequency.value = 540;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.015;
    oscillator.onended = () => {
      void audioContext.close();
    };
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
    await pushNotification(
      'إنتاج جديد',
      `تم إرسال إنتاج البراند ${
        brands.find((item) => item.id === batch.brandId)?.name ?? ''
      } للاعتماد.`,
      'info'
    );
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
                  } else {
                    setActiveBrandId('');
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="البراندات"
                    placeholder="اختر البراندات"
                  />
                )}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {selectedBrandIds.length > 0 ? (
        <Card>
          <CardContent>
            <Tabs
              value={activeBrandId}
              onChange={(_, value) => setActiveBrandId(value)}
              variant="scrollable"
            >
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
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={2}
                alignItems={{ lg: 'center' }}
              >
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={availableProducts}
                  getOptionLabel={(option) => `${option.name} - ${option.code}`}
                  onChange={(_, value) => {
                    void addProduct(value);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="إضافة منتج" />
                  )}
                />
                <Button
                  variant="outlined"
                  startIcon={<SaveRoundedIcon />}
                  onClick={() =>
                    setMessage('تم حفظ المسودة محلياً داخل قاعدة بيانات المتصفح.')
                  }
                >
                  حفظ مسودة
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<SendRoundedIcon />}
                  disabled={
                    !activeBatch ||
                    activeBatch.entries.length === 0 ||
                    activeBatch.status !== 'draft'
                  }
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
                  شبكة إدخال الإنتاج المبنية على TanStack Table - {activeBrand.name}
                </Typography>
                {customFields.length > 0 ? (
                  <Alert severity="info">
                    تم تفعيل {customFields.length} حقل إضافي، والحقول المعلّمة
                    ستظهر في الإذن النهائي بعد الاعتماد.
                  </Alert>
                ) : null}
                {activeBatch?.status && activeBatch.status !== 'draft' ? (
                  <Alert severity="info">
                    هذا البراند تم إرساله للاعتماد، لذا يظهر هنا للقراءة فقط.
                  </Alert>
                ) : null}
                <ProductionEntryTable
                  entries={activeBatch?.entries ?? []}
                  products={products}
                  shiftLabels={shiftLabels}
                  isReadOnly={isReadOnly}
                  customFields={customFields}
                  perHourSummary={summary.perHour}
                  totalPackages={summary.totalPackages}
                  totalKg={summary.totalKg}
                  onHourCommit={async ({ entryId, hourIndex, note, value }) => {
                    await updateEntry(entryId, hourIndex, note, value);
                  }}
                  onCustomFieldCommit={updateCustomField}
                  onPasteHours={pasteHours}
                />
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
                    {shiftLabels[index]}: {formatNumber(value)}
                  </div>
                ))}
                <div className="metric-chip">
                  الإجمالي: {formatNumber(summary.totalPackages)} عبوة
                </div>
                <div className="metric-chip">
                  الإجمالي: {formatNumber(summary.totalKg)} كجم
                </div>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      ) : (
        <Alert severity="info">
          اختر وردية وبراند واحد على الأقل لبدء إدخال الإنتاج.
        </Alert>
      )}
    </Stack>
  );
}
