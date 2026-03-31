import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useHotkeys } from 'react-hotkeys-hook';
import { useLiveQuery } from 'dexie-react-hooks';

import { ProductionEntryTable } from '../components/ProductionEntryTable';
import { ProductionEntryModal } from '../components/ProductionEntryModal';
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
import {
  Card as UiCard,
  CardContent as UiCardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../components/ui/card';
import { HeaderBadge, PageHeader } from '../components/ui/page-header';

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
  const [error, setError] = useState<string | null>(null);
  const [shiftMenuOpen, setShiftMenuOpen] = useState(false);
  const [brandsSearchOpen, setBrandsSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
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
  const themeMode = settings?.themeMode ?? 'light';

  const activeProducts = products.filter((product) =>
    activeBrand?.productIds.includes(product.id)
  );
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
      return false;
    }

    const latest = await appDb.batches.get(activeBatch.id);
    if (!latest) {
      return;
    }

    await appDb.batches.put(update(latest));
  }

  function buildEntry(productId: string): EntryLine {
    return {
      id: uid('line'),
      productId,
      hourValues: emptyHourValues(shiftLabels.length),
      hourNotes: emptyHourNotes(shiftLabels.length),
      customFieldValues: Object.fromEntries(customFields.map((field) => [field.id, '']))
    };
  }

  async function quickSaveDraft() {
    if (!effectiveBrandId) {
      setError('اختر براند أولاً قبل الحفظ السريع.');
      return;
    }

    const draft = activeBatch?.status === 'draft' ? activeBatch : await ensureDraft(effectiveBrandId);
    await appDb.batches.update(draft.id, { lastUpdatedAt: nowIso() });
    setError(null);
    setMessage('تم الحفظ السريع للمسودة. اختصار لوحة المفاتيح: Ctrl+S');
  }

  async function addEntryFromModal(payload: {
    productId: string;
    hourValues: number[];
    hourNotes: string[];
    customFieldValues: Record<string, string>;
  }): Promise<boolean> {
    if (!effectiveBrandId) {
      setError('اختر براندًا أولًا قبل إضافة الصف.');
      return false;
    }

    const product = activeProducts.find((item) => item.id === payload.productId);
    if (!product) {
      setError('الصنف المحدد غير متاح داخل البراند الحالي.');
      return false;
    }

    const draft = await ensureDraft(effectiveBrandId);
    if (draft.entries.some((entry) => entry.productId === product.id)) {
      setError(`الصنف ${product.name} موجود بالفعل داخل الجدول.`);
      return false;
    }

    const entry = buildEntry(product.id);
    entry.hourValues = payload.hourValues;
    entry.hourNotes = payload.hourNotes;
    entry.customFieldValues = {
      ...entry.customFieldValues,
      ...payload.customFieldValues
    };

    await appDb.batches.put({
      ...draft,
      entries: [...draft.entries, entry],
      lastUpdatedAt: nowIso()
    });

    if (settings?.soundEnabled && payload.hourValues.some((value) => value > 0)) {
      playInputTone();
    }

    setError(null);
    setMessage(`تمت إضافة الصنف ${product.name} إلى الجدول بنجاح.`);
    return true;
  }

  async function addProduct(product: ProductDefinition | null) {
    if (!product || !effectiveBrandId) {
      return;
    }

    const draft = await ensureDraft(effectiveBrandId);
    if (draft.entries.some((entry) => entry.productId === product.id)) {
      setError(`الصنف ${product.name} موجود بالفعل داخل الجدول.`);
      return;
    }

    await appDb.batches.put({
      ...draft,
      entries: [...draft.entries, buildEntry(product.id)],
      lastUpdatedAt: nowIso()
    });
    setError(null);
    setMessage(`تمت إضافة الصنف ${product.name} كصف فارغ داخل الجدول.`);
  }

  async function assignProduct(entryId: string | null, productId: string) {
    if (!effectiveBrandId) {
      return;
    }

    const product = activeProducts.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const draft = await ensureDraft(effectiveBrandId);
    const duplicated = draft.entries.find(
      (entry) => entry.productId === productId && entry.id !== entryId
    );
    if (duplicated) {
      setError(`الصنف ${product.name} موجود بالفعل، اختر صنفًا آخر.`);
      return;
    }

    if (!entryId) {
      await appDb.batches.put({
        ...draft,
        entries: [...draft.entries, buildEntry(productId)],
        lastUpdatedAt: nowIso()
      });
      setError(null);
      return;
    }

    await appDb.batches.put({
      ...draft,
      entries: draft.entries.map((entry) =>
        entry.id === entryId ? { ...entry, productId } : entry
      ),
      lastUpdatedAt: nowIso()
    });
    setError(null);
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

    if (settings?.soundEnabled && !note) {
      playInputTone();
    }
  }

  async function updateCustomField(entryId: string, fieldId: string, rawValue: string) {
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

  useHotkeys(
    'ctrl+s',
    (event) => {
      event.preventDefault();
      void quickSaveDraft();
    },
    { enableOnFormTags: true },
    [quickSaveDraft]
  );

  useHotkeys(
    'alt+w',
    (event) => {
      event.preventDefault();
      setShiftMenuOpen(true);
    },
    { enableOnFormTags: true },
    []
  );

  useHotkeys(
    'alt+b',
    (event) => {
      event.preventDefault();
      setBrandsSearchOpen(true);
      window.setTimeout(() => {
        document.getElementById('brand-picker-input')?.focus();
      }, 0);
    },
    { enableOnFormTags: true },
    []
  );

  useHotkeys(
    'alt+p',
    (event) => {
      event.preventDefault();
      if (!activeBrand || isReadOnly || availableProducts.length === 0) {
        return;
      }
      setEntryModalOpen(true);
    },
    { enableOnFormTags: true },
    [activeBrand, availableProducts.length, isReadOnly]
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="وحدة إدخال البيانات"
        description="واجهة Excel-like مبنية على AG Grid مع بحث حي للأصناف، صفوف مستمرة، واختصارات لوحة مفاتيح للحفظ والتنقل السريع."
        actions={
          <>
            <HeaderBadge>Ctrl+S حفظ سريع</HeaderBadge>
            <HeaderBadge>Alt+W الوردية</HeaderBadge>
            <HeaderBadge>Alt+B البراند</HeaderBadge>
            <HeaderBadge>Alt+P نموذج إضافة</HeaderBadge>
          </>
        }
      />

      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <UiCard>
            <CardHeader>
              <CardTitle>تهيئة الجلسة الحالية</CardTitle>
              <CardDescription>
                استخدم الاختصارات أو القوائم المباشرة لتجهيز الوردية والبراند قبل الدخول إلى الجدول.
              </CardDescription>
            </CardHeader>
            <UiCardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id="shift-select">الوردية</InputLabel>
                    <Select
                      open={shiftMenuOpen}
                      onClose={() => setShiftMenuOpen(false)}
                      onOpen={() => setShiftMenuOpen(true)}
                      labelId="shift-select"
                      label="الوردية"
                      value={effectiveShiftId}
                      onChange={(event) => {
                        setSelectedShiftId(event.target.value);
                        setShiftMenuOpen(false);
                      }}
                    >
                      {shifts.map((shift) => (
                        <MenuItem key={shift.id} value={shift.id}>
                          {shift.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Autocomplete
                    multiple
                    open={brandsSearchOpen}
                    onOpen={() => setBrandsSearchOpen(true)}
                    onClose={() => setBrandsSearchOpen(false)}
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
                        placeholder="ابحث واختر البراندات"
                        inputProps={{
                          ...params.inputProps,
                          id: 'brand-picker-input'
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </UiCardContent>
          </UiCard>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <UiCard className="h-full">
            <CardHeader>
              <CardTitle>اختصارات وسرعة</CardTitle>
              <CardDescription>
                الأسهم للتنقل داخل AG Grid، و Enter لإكمال التحرير والنزول للسطر التالي.
              </CardDescription>
            </CardHeader>
            <UiCardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="ag-shortcut-chip">Arrow Keys تنقل</span>
                <span className="ag-shortcut-chip">Enter اعتماد الخلية</span>
                <span className="ag-shortcut-chip">Ctrl+S حفظ فوري</span>
                <span className="ag-shortcut-chip">Alt+B فتح البراندات</span>
                <span className="ag-shortcut-chip">Alt+P نموذج إضافة</span>
              </div>
              <Typography variant="body2" color="text.secondary">
                الجدول يدعم صفوفًا فارغة مستمرة، واختيار الصنف من داخل الخلية مباشرة.
              </Typography>
            </UiCardContent>
          </UiCard>
        </Grid>
      </Grid>

      {selectedBrandIds.length > 0 ? (
        <UiCard>
          <UiCardContent className="pt-6">
            <Tabs
              value={activeBrandId}
              onChange={(_, value) => setActiveBrandId(value)}
              variant="scrollable"
            >
              {brands
                .filter((brand) => selectedBrandIds.includes(brand.id))
                .map((brand) => (
                  <Tab key={brand.id} value={brand.id} label={brand.name} />
                ))}
            </Tabs>
          </UiCardContent>
        </UiCard>
      ) : null}

      {activeBrand ? (
        <Stack spacing={2}>
          {entryModalOpen ? (
            <ProductionEntryModal
              open={entryModalOpen}
              products={availableProducts}
              shiftLabels={shiftLabels}
              customFields={customFields}
              onClose={() => setEntryModalOpen(false)}
              onSubmit={addEntryFromModal}
            />
          ) : null}

          <UiCard>
            <CardHeader>
              <CardTitle>أدوات التشغيل السريع</CardTitle>
              <CardDescription>
                أضف صنفًا يدويًا من الأعلى أو اختره مباشرة من خلية اسم الصنف داخل الجدول.
              </CardDescription>
            </CardHeader>
            <UiCardContent>
              <Stack
                direction={{ xs: 'column', xl: 'row' }}
                spacing={2}
                alignItems={{ xl: 'center' }}
              >
                <Button
                  sx={{ minWidth: { xs: '100%', xl: 220 } }}
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  disabled={isReadOnly || availableProducts.length === 0}
                  onClick={() => setEntryModalOpen(true)}
                >
                  إضافة عبر النموذج
                </Button>
                <Autocomplete
                  sx={{ flex: 1 }}
                  open={productSearchOpen}
                  onOpen={() => setProductSearchOpen(true)}
                  onClose={() => setProductSearchOpen(false)}
                  options={availableProducts}
                  getOptionLabel={(option) => `${option.name} - ${option.code}`}
                  onChange={(_, value) => {
                    void addProduct(value);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="إضافة صنف سريع"
                      placeholder="Alt+P"
                      inputProps={{
                        ...params.inputProps,
                        id: 'product-picker-input'
                      }}
                    />
                  )}
                />
                <Button
                  variant="outlined"
                  startIcon={<SaveRoundedIcon />}
                  onClick={() => {
                    void quickSaveDraft();
                  }}
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
            </UiCardContent>
          </UiCard>

          <UiCard>
            <CardHeader>
              <CardTitle>AG Grid - {activeBrand.name}</CardTitle>
              <CardDescription>
                إدخال جدولي حي مع اختيار صنف searchable، صفوف إضافية مستمرة، وملاحظات مرتبطة بالساعة المحددة.
              </CardDescription>
            </CardHeader>
            <UiCardContent className="space-y-4">
              {customFields.length > 0 ? (
                <Alert severity="info">
                  تم تفعيل {customFields.length} حقل إضافي، وستنتقل الحقول المعلّمة إلى الإذن النهائي
                  بعد الاعتماد.
                </Alert>
              ) : null}
              {activeBatch?.status && activeBatch.status !== 'draft' ? (
                <Alert severity="info">
                  هذا البراند تم إرساله للاعتماد، لذلك أصبحت شبكة الإدخال للقراءة فقط.
                </Alert>
              ) : null}
              <ProductionEntryTable
                entries={activeBatch?.entries ?? []}
                products={activeProducts}
                shiftLabels={shiftLabels}
                isReadOnly={isReadOnly}
                customFields={customFields}
                perHourSummary={summary.perHour}
                totalPackages={summary.totalPackages}
                totalKg={summary.totalKg}
                themeMode={themeMode}
                onHourCommit={async ({ entryId, hourIndex, note, value }) => {
                  await updateEntry(entryId, hourIndex, note, value);
                }}
                onCustomFieldCommit={updateCustomField}
                onAssignProduct={assignProduct}
              />
            </UiCardContent>
          </UiCard>

          <UiCard>
            <CardHeader>
              <CardTitle>ملخص التشغيل المباشر</CardTitle>
              <CardDescription>تحديث لحظي لإجمالي كل ساعة وإجمالي الدفعة كاملة.</CardDescription>
            </CardHeader>
            <UiCardContent>
              <div className="flex flex-wrap gap-2">
                {summary.perHour.map((value, index) => (
                  <span className="ag-shortcut-chip" key={`hour-total-${index}`}>
                    {shiftLabels[index]}: {formatNumber(value)}
                  </span>
                ))}
                <span className="ag-shortcut-chip">
                  الإجمالي: {formatNumber(summary.totalPackages)} عبوة
                </span>
                <span className="ag-shortcut-chip">
                  الوزن: {formatNumber(summary.totalKg)} كجم
                </span>
              </div>
            </UiCardContent>
          </UiCard>
        </Stack>
      ) : (
        <Alert severity="info">
          اختر وردية وبراند واحد على الأقل لبدء إدخال الإنتاج.
        </Alert>
      )}
    </Stack>
  );
}
