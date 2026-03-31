import {
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';
import { Button, Chip, Stack, TextField, Typography } from '@mui/material';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import { AgGridReact } from 'ag-grid-react';
import type {
  CellFocusedEvent,
  CellValueChangedEvent,
  ColDef,
  ICellEditorParams
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import type { CustomFieldDefinition, EntryLine, ProductDefinition, ThemeMode } from '../lib/types';
import { formatNumber } from '../lib/utils';

interface ProductionEntryTableProps {
  entries: EntryLine[];
  products: ProductDefinition[];
  shiftLabels: string[];
  isReadOnly: boolean;
  customFields: CustomFieldDefinition[];
  perHourSummary: number[];
  totalPackages: number;
  totalKg: number;
  themeMode: ThemeMode;
  onHourCommit: (params: {
    rowIndex: number;
    entryId: string;
    hourIndex: number;
    note: boolean;
    value: string;
  }) => Promise<void>;
  onCustomFieldCommit: (entryId: string, fieldId: string, value: string) => Promise<void>;
  onAssignProduct: (entryId: string | null, productId: string) => Promise<void>;
}

type GridRowType = 'entry' | 'placeholder' | 'summary';

interface GridRow {
  id: string;
  rowType: GridRowType;
  entryId: string | null;
  productId: string;
  hourValues: number[];
  hourNotes: string[];
  customFieldValues: Record<string, string>;
}

interface ProductCellEditorParams extends ICellEditorParams<GridRow, string> {
  products: ProductDefinition[];
  selectedProductIds: string[];
}

const PLACEHOLDER_ROWS = 6;

function productSearchLabel(product: ProductDefinition) {
  return `${product.name} - ${product.code}`;
}

function HourValueRenderer(props: { value: number; data?: GridRow; hourIndex?: number }) {
  const hasNote =
    typeof props.hourIndex === 'number' &&
    !!props.data?.hourNotes?.[props.hourIndex]?.trim();

  return (
    <div className="ag-hour-cell">
      <span>{props.value ? formatNumber(props.value) : ''}</span>
      {hasNote ? <span className="ag-note-dot" /> : null}
    </div>
  );
}

function ProductCellRenderer(props: {
  value: string;
  data?: GridRow;
  productsMap?: Map<string, ProductDefinition>;
}) {
  if (props.data?.rowType === 'summary') {
    return <strong>الإجماليات</strong>;
  }

  if (props.data?.rowType === 'placeholder') {
    return <span className="text-xs font-bold text-emerald-900/45 dark:text-emerald-50/45">ابحث عن صنف أو اكتب الكود</span>;
  }

  const product = props.productsMap?.get(props.value);
  return (
    <div className="ag-product-cell">
      <span>{product?.name ?? '-'}</span>
      <code>{product?.code ?? '-'}</code>
    </div>
  );
}

const ProductCellEditor = forwardRef<{ getValue: () => string; afterGuiAttached: () => void }, ProductCellEditorParams>(
  function ProductCellEditor(props, ref) {
    const listId = useId();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const selectedProductIds = props.selectedProductIds.filter((id) => id !== props.value);
    const options = useMemo(
      () =>
        props.products.filter(
          (product) => !selectedProductIds.includes(product.id) || product.id === props.value
        ),
      [props.products, props.value, selectedProductIds]
    );
    const [value, setValue] = useState(() => {
      const current = props.products.find((product) => product.id === props.value);
      return current ? productSearchLabel(current) : '';
    });

    useImperativeHandle(ref, () => ({
      getValue() {
        const normalized = value.trim().toLowerCase();
        const match = props.products.find((product) => {
          const targets = [
            product.name,
            product.code,
            productSearchLabel(product)
          ].map((item) => item.trim().toLowerCase());
          return targets.includes(normalized);
        });
        return match?.id ?? String(props.value ?? '');
      },
      afterGuiAttached() {
        window.setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 0);
      }
    }));

    return (
      <div className="w-full">
        <input
          ref={inputRef}
          className="ag-inline-editor"
          list={listId}
          value={value}
          placeholder="ابحث عن صنف..."
          onChange={(event) => setValue(event.target.value)}
        />
        <datalist id={listId}>
          {options.map((product) => (
            <option key={product.id} value={productSearchLabel(product)} />
          ))}
        </datalist>
      </div>
    );
  }
);

export function ProductionEntryTable({
  entries,
  products,
  shiftLabels,
  isReadOnly,
  customFields,
  perHourSummary,
  totalPackages,
  totalKg,
  themeMode,
  onHourCommit,
  onCustomFieldCommit,
  onAssignProduct
}: ProductionEntryTableProps) {
  const productsMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const selectedProductIds = useMemo(() => entries.map((entry) => entry.productId), [entries]);
  const [selectedNoteCell, setSelectedNoteCell] = useState<{
    entryId: string;
    hourIndex: number;
    label: string;
  } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const rowData = useMemo<GridRow[]>(
    () => [
      ...entries.map((entry) => ({
        id: entry.id,
        rowType: 'entry' as const,
        entryId: entry.id,
        productId: entry.productId,
        hourValues: [...entry.hourValues],
        hourNotes: [...entry.hourNotes],
        customFieldValues: { ...(entry.customFieldValues ?? {}) }
      })),
      ...Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => ({
        id: `placeholder-${index}`,
        rowType: 'placeholder' as const,
        entryId: null,
        productId: '',
        hourValues: Array.from({ length: shiftLabels.length }, () => 0),
        hourNotes: Array.from({ length: shiftLabels.length }, () => ''),
        customFieldValues: Object.fromEntries(customFields.map((field) => [field.id, '']))
      }))
    ],
    [customFields, entries, shiftLabels.length]
  );

  const pinnedBottomRowData = useMemo<GridRow[]>(
    () => [
      {
        id: 'summary-row',
        rowType: 'summary',
        entryId: null,
        productId: '',
        hourValues: perHourSummary,
        hourNotes: Array.from({ length: shiftLabels.length }, () => ''),
        customFieldValues: Object.fromEntries(customFields.map((field) => [field.id, '']))
      }
    ],
    [customFields, perHourSummary, shiftLabels.length]
  );

  async function handleCellValueChanged(event: CellValueChangedEvent<GridRow>) {
    const row = event.data;
    const columnId = event.colDef.colId ?? '';
    if (!row || row.rowType === 'summary') {
      return;
    }

    if (columnId === 'productId') {
      const nextProductId = String(event.newValue ?? '').trim();
      if (!nextProductId || nextProductId === event.oldValue) {
        return;
      }
      await onAssignProduct(row.entryId, nextProductId);
      return;
    }

    if (row.rowType !== 'entry' || !row.entryId) {
      return;
    }

    if (columnId.startsWith('hour-')) {
      const hourIndex = Number(columnId.replace('hour-', ''));
      const rowIndex = entries.findIndex((entry) => entry.id === row.entryId);
      await onHourCommit({
        rowIndex,
        entryId: row.entryId,
        hourIndex,
        note: false,
        value: String(event.newValue ?? 0)
      });
      return;
    }

    if (columnId.startsWith('custom-')) {
      const fieldId = columnId.replace('custom-', '');
      await onCustomFieldCommit(row.entryId, fieldId, String(event.newValue ?? ''));
    }
  }

  async function saveSelectedNote() {
    if (!selectedNoteCell) {
      return;
    }
    const rowIndex = entries.findIndex((entry) => entry.id === selectedNoteCell.entryId);
    await onHourCommit({
      rowIndex,
      entryId: selectedNoteCell.entryId,
      hourIndex: selectedNoteCell.hourIndex,
      note: true,
      value: noteDraft
    });
  }

  const columnDefs = useMemo<ColDef<GridRow>[]>(
    () => [
      {
        headerName: 'اسم الصنف',
        field: 'productId',
        colId: 'productId',
        pinned: 'left',
        minWidth: 280,
        flex: 1.5,
        editable: !isReadOnly,
        singleClickEdit: true,
        cellEditor: ProductCellEditor as never,
        cellEditorParams: {
          products,
          selectedProductIds
        },
        cellRenderer: ProductCellRenderer as never,
        cellRendererParams: {
          productsMap
        }
      },
      ...customFields.map<ColDef<GridRow>>((field) => ({
        headerName: field.label,
        field: `customFieldValues.${field.id}`,
        colId: `custom-${field.id}`,
        minWidth: 170,
        editable: (params) => !isReadOnly && params.data?.rowType === 'entry',
        valueGetter: (params) => params.data?.customFieldValues?.[field.id] ?? '',
        valueSetter: (params) => {
          if (!params.data) {
            return false;
          }
          params.data.customFieldValues[field.id] = String(params.newValue ?? '');
          return true;
        }
      })),
      ...shiftLabels.map<ColDef<GridRow>>((label, hourIndex) => ({
        headerName: label,
        field: `hourValues.${hourIndex}`,
        colId: `hour-${hourIndex}`,
        minWidth: 124,
        maxWidth: 150,
        editable: (params) =>
          !isReadOnly &&
          params.data?.rowType === 'entry' &&
          Boolean(params.data.productId),
        valueGetter: (params) => params.data?.hourValues?.[hourIndex] ?? 0,
        valueSetter: (params) => {
          if (!params.data) {
            return false;
          }
          const parsed = Number(params.newValue ?? 0);
          params.data.hourValues[hourIndex] = Number.isFinite(parsed) ? parsed : 0;
          return true;
        },
        valueParser: (params) => {
          const parsed = Number(params.newValue ?? 0);
          return Number.isFinite(parsed) ? parsed : 0;
        },
        cellRenderer: HourValueRenderer as never,
        cellRendererParams: {
          hourIndex
        }
      })),
      {
        headerName: 'الإجمالي',
        colId: 'total-packages',
        pinned: 'right',
        minWidth: 120,
        valueGetter: (params) =>
          params.data?.hourValues?.reduce((sum, value) => sum + Number(value || 0), 0) ?? 0,
        valueFormatter: (params) => formatNumber(Number(params.value ?? 0))
      },
      {
        headerName: 'الكيلو',
        colId: 'total-kg',
        pinned: 'right',
        minWidth: 120,
        valueGetter: (params) => {
          const product = params.data ? productsMap.get(params.data.productId) : null;
          const packages =
            params.data?.hourValues?.reduce((sum, value) => sum + Number(value || 0), 0) ?? 0;
          return packages * (product?.packageWeightKg ?? 0);
        },
        valueFormatter: (params) => formatNumber(Number(params.value ?? 0))
      }
    ],
    [customFields, isReadOnly, products, productsMap, selectedProductIds, shiftLabels]
  );

  const defaultColDef = useMemo<ColDef<GridRow>>(
    () => ({
      sortable: false,
      resizable: true,
      suppressHeaderMenuButton: true,
      editable: false
    }),
    []
  );

  const activeNoteLabel =
    selectedNoteCell && entries.find((item) => item.id === selectedNoteCell.entryId)
      ? `${productsMap.get(entries.find((item) => item.id === selectedNoteCell.entryId)?.productId ?? '')?.name ?? 'صنف'} - ${selectedNoteCell.label}`
      : null;

  return (
    <Stack spacing={2.5}>
      <div className="ag-grid-shell">
        <div className={themeMode === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'} style={{ height: 560, width: '100%' }}>
          <AgGridReact<GridRow>
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pinnedBottomRowData={pinnedBottomRowData}
            stopEditingWhenCellsLoseFocus
            singleClickEdit
            enterNavigatesVertically
            enterNavigatesVerticallyAfterEdit
            undoRedoCellEditing
            undoRedoCellEditingLimit={12}
            getRowId={(params) => params.data.id}
            suppressMovableColumns
            onCellValueChanged={(event) => {
              void handleCellValueChanged(event);
            }}
            onCellFocused={(event: CellFocusedEvent<GridRow>) => {
              const row = event.api.getDisplayedRowAtIndex(event.rowIndex ?? -1)?.data;
              const columnId =
                typeof event.column === 'string' ? event.column : event.column?.getColId() ?? '';
              if (!row || row.rowType !== 'entry' || !columnId.startsWith('hour-') || !row.entryId) {
                return;
              }
              const hourIndex = Number(columnId.replace('hour-', ''));
              setNoteDraft(row.hourNotes[hourIndex] ?? '');
              setSelectedNoteCell({
                entryId: row.entryId,
                hourIndex,
                label: shiftLabels[hourIndex] ?? 'ساعة'
              });
            }}
          />
        </div>
      </div>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip color="primary" variant="outlined" label={`الإجمالي: ${formatNumber(totalPackages)} عبوة`} />
        <Chip color="secondary" variant="outlined" label={`الوزن: ${formatNumber(totalKg)} كجم`} />
        <Chip variant="outlined" label={`الصفوف النشطة: ${entries.length}`} />
      </Stack>

      {selectedNoteCell ? (
        <Stack spacing={1.5} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 2.5, bgcolor: 'background.paper' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <StickyNote2OutlinedIcon color="primary" />
            <Typography variant="h6">ملاحظات الخلية المحددة</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {activeNoteLabel}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="اكتب ملاحظة مرتبطة بهذه الساعة..."
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => void saveSelectedNote()}>
              حفظ الملاحظة
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setSelectedNoteCell(null);
                setNoteDraft('');
              }}
            >
              إخفاء
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
