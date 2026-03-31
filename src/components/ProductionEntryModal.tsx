import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import type {
  CustomFieldDefinition,
  ProductDefinition
} from '../lib/types';
import { formatNumber } from '../lib/utils';

interface ProductionEntryModalProps {
  open: boolean;
  products: ProductDefinition[];
  shiftLabels: string[];
  customFields: CustomFieldDefinition[];
  onClose: () => void;
  onSubmit: (payload: {
    productId: string;
    hourValues: number[];
    hourNotes: string[];
    customFieldValues: Record<string, string>;
  }) => Promise<boolean>;
}

interface EntryFormState {
  productId: string;
  hourValues: string[];
  hourNotes: string[];
  customFieldValues: Record<string, string>;
}

function createInitialFormState(
  hoursCount: number,
  customFields: CustomFieldDefinition[]
): EntryFormState {
  return {
    productId: '',
    hourValues: Array.from({ length: hoursCount }, () => ''),
    hourNotes: Array.from({ length: hoursCount }, () => ''),
    customFieldValues: Object.fromEntries(customFields.map((field) => [field.id, '']))
  };
}

function validateFormState(
  form: EntryFormState,
  products: ProductDefinition[],
  customFields: CustomFieldDefinition[]
): string | null {
  if (!form.productId) {
    return 'اختر الصنف أولاً قبل حفظ الصف الجديد.';
  }

  if (!products.some((product) => product.id === form.productId)) {
    return 'الصنف المحدد لم يعد متاحًا لهذه الجلسة.';
  }

  if (!form.hourValues.some((value) => Number(value || 0) > 0)) {
    return 'أدخل كمية في ساعة واحدة على الأقل.';
  }

  for (const value of form.hourValues) {
    if (!value) {
      continue;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 'تأكد أن كل الكميات أرقام صحيحة أكبر من أو تساوي صفر.';
    }
  }

  for (const field of customFields) {
    if (field.kind !== 'number') {
      continue;
    }

    const rawValue = form.customFieldValues[field.id];
    if (!rawValue) {
      continue;
    }

    if (!Number.isFinite(Number(rawValue))) {
      return `الحقل الإضافي "${field.label}" يجب أن يكون رقمًا.`;
    }
  }

  return null;
}

export function ProductionEntryModal({
  open,
  products,
  shiftLabels,
  customFields,
  onClose,
  onSubmit
}: ProductionEntryModalProps) {
  const [form, setForm] = useState<EntryFormState>(() =>
    createInitialFormState(shiftLabels.length, customFields)
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId) ?? null,
    [form.productId, products]
  );
  const totalPackages = useMemo(
    () => form.hourValues.reduce((sum, value) => sum + Number(value || 0), 0),
    [form.hourValues]
  );
  const totalKg = totalPackages * (selectedProduct?.packageWeightKg ?? 0);

  function updateHourValue(hourIndex: number, value: string) {
    setError(null);
    setForm((current) => ({
      ...current,
      hourValues: current.hourValues.map((item, index) =>
        index === hourIndex ? value : item
      )
    }));
  }

  function updateHourNote(hourIndex: number, value: string) {
    setError(null);
    setForm((current) => ({
      ...current,
      hourNotes: current.hourNotes.map((item, index) =>
        index === hourIndex ? value : item
      )
    }));
  }

  function updateCustomField(fieldId: string, value: string) {
    setError(null);
    setForm((current) => ({
      ...current,
      customFieldValues: {
        ...current.customFieldValues,
        [fieldId]: value
      }
    }));
  }

  async function handleSubmit() {
    const validationError = validateFormState(form, products, customFields);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const isSaved = await onSubmit({
        productId: form.productId,
        hourValues: form.hourValues.map((value) => {
          const parsed = Number(value || 0);
          return Number.isFinite(parsed) ? parsed : 0;
        }),
        hourNotes: form.hourNotes,
        customFieldValues: form.customFieldValues
      });

      if (isSaved) {
        onClose();
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'تعذر حفظ الصنف داخل الجدول.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle>نموذج إضافة صنف جديد</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            هذا نموذج إدخال مُدار بالكامل من حالة واحدة داخل React. أدخل الصنف
            والكميات والملاحظات، ثم سيتم إضافة الصف دفعة واحدة إلى جدول الإنتاج.
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {products.length === 0 ? (
            <Alert severity="warning">
              لا توجد أصناف متاحة للإضافة في البراند الحالي. أضف براندًا آخر أو
              استخدم الأصناف الحالية داخل الجدول.
            </Alert>
          ) : null}

          <Autocomplete
            options={products}
            value={selectedProduct}
            getOptionLabel={(option) => `${option.name} - ${option.code}`}
            onChange={(_, value) => {
              setError(null);
              setForm((current) => ({
                ...current,
                productId: value?.id ?? ''
              }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                label="اسم الصنف"
                placeholder="ابحث باسم الصنف أو الكود"
              />
            )}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              color="primary"
              variant="outlined"
              label={`إجمالي العبوات: ${formatNumber(totalPackages)}`}
            />
            <Chip
              color="secondary"
              variant="outlined"
              label={`الوزن المتوقع: ${formatNumber(totalKg)} كجم`}
            />
            {selectedProduct ? (
              <Chip
                variant="outlined"
                label={`وزن العبوة: ${formatNumber(
                  selectedProduct.packageWeightKg
                )} كجم`}
              />
            ) : null}
          </Stack>

          {customFields.length > 0 ? (
            <Stack spacing={1.5}>
              <Typography variant="h6">الحقول الإضافية</Typography>
              <Grid container spacing={2}>
                {customFields.map((field) => (
                  <Grid key={field.id} size={{ xs: 12, md: 6, xl: 4 }}>
                    <TextField
                      fullWidth
                      type={field.kind === 'number' ? 'number' : 'text'}
                      label={field.label}
                      placeholder={field.placeholder ?? field.label}
                      value={form.customFieldValues[field.id] ?? ''}
                      onChange={(event) =>
                        updateCustomField(field.id, event.target.value)
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          ) : null}

          <Stack spacing={1.5}>
            <Typography variant="h6">التوزيع بالساعة</Typography>
            <Grid container spacing={2}>
              {shiftLabels.map((label, hourIndex) => (
                <Grid key={`${label}-${hourIndex}`} size={{ xs: 12, md: 6 }}>
                  <Stack
                    spacing={1.25}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 4,
                      p: 2
                    }}
                  >
                    <Typography variant="subtitle2">{label}</Typography>
                    <TextField
                      fullWidth
                      type="number"
                      label="الكمية"
                      value={form.hourValues[hourIndex] ?? ''}
                      onChange={(event) =>
                        updateHourValue(hourIndex, event.target.value)
                      }
                      inputProps={{ min: 0, step: 1 }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      label="ملاحظة الساعة"
                      value={form.hourNotes[hourIndex] ?? ''}
                      onChange={(event) =>
                        updateHourNote(hourIndex, event.target.value)
                      }
                      placeholder={`ملاحظة مرتبطة بـ ${label}`}
                    />
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={isSubmitting || products.length === 0}
        >
          إضافة الصف إلى الجدول
        </Button>
      </DialogActions>
    </Dialog>
  );
}
