import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table';

import type { CustomFieldDefinition, EntryLine, ProductDefinition } from '../lib/types';
import { formatNumber, getCellIndex } from '../lib/utils';

interface ProductionEntryTableProps {
  entries: EntryLine[];
  products: ProductDefinition[];
  shiftLabels: string[];
  isReadOnly: boolean;
  customFields: CustomFieldDefinition[];
  perHourSummary: number[];
  totalPackages: number;
  totalKg: number;
  onHourCommit: (params: {
    rowIndex: number;
    entryId: string;
    hourIndex: number;
    note: boolean;
    value: string;
  }) => Promise<void>;
  onCustomFieldCommit: (entryId: string, fieldId: string, value: string) => Promise<void>;
  onPasteHours: (entryId: string, startHourIndex: number, text: string) => Promise<void>;
}

interface HourCellEditorProps {
  entry: EntryLine;
  rowIndex: number;
  hourIndex: number;
  hourCount: number;
  label: string;
  isReadOnly: boolean;
  onCommit: ProductionEntryTableProps['onHourCommit'];
  onPasteHours: ProductionEntryTableProps['onPasteHours'];
}

interface CustomFieldEditorProps {
  entry: EntryLine;
  field: CustomFieldDefinition;
  isReadOnly: boolean;
  onCommit: ProductionEntryTableProps['onCustomFieldCommit'];
}

function focusHourTarget(rowIndex: number, hourIndex: number) {
  const target = document.querySelector<HTMLInputElement>(
    `[data-cell="${getCellIndex(rowIndex, hourIndex)}"]`
  );
  target?.focus();
  target?.select();
}

function HourCellEditor({
  entry,
  rowIndex,
  hourIndex,
  hourCount,
  label,
  isReadOnly,
  onCommit,
  onPasteHours
}: HourCellEditorProps) {
  const [value, setValue] = useState(String(entry.hourValues[hourIndex] ?? 0));
  const [note, setNote] = useState(entry.hourNotes[hourIndex] ?? '');
  const [noteDraft, setNoteDraft] = useState(entry.hourNotes[hourIndex] ?? '');
  const [noteOpen, setNoteOpen] = useState(false);

  async function commitQuantity() {
    await onCommit({
      rowIndex,
      entryId: entry.id,
      hourIndex,
      note: false,
      value
    });
  }

  async function saveNote() {
    setNote(noteDraft);
    await onCommit({
      rowIndex,
      entryId: entry.id,
      hourIndex,
      note: true,
      value: noteDraft
    });
    setNoteOpen(false);
  }

  const hasNote = note.trim().length > 0;

  return (
    <>
      <Stack spacing={0.75} className="grid-cell-stack">
        <input
          className="grid-cell-input"
          type="number"
          min="0"
          inputMode="numeric"
          value={value}
          data-cell={getCellIndex(rowIndex, hourIndex)}
          readOnly={isReadOnly}
          aria-label={`كمية ${label}`}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' && hourIndex + 1 < hourCount) {
              event.preventDefault();
              focusHourTarget(rowIndex, hourIndex + 1);
            }
            if (event.key === 'ArrowRight' && hourIndex > 0) {
              event.preventDefault();
              focusHourTarget(rowIndex, hourIndex - 1);
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              focusHourTarget(rowIndex + 1, hourIndex);
            }
            if (event.key === 'ArrowUp' && rowIndex > 0) {
              event.preventDefault();
              focusHourTarget(rowIndex - 1, hourIndex);
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              void commitQuantity().then(() => focusHourTarget(rowIndex + 1, hourIndex));
            }
          }}
          onPaste={async (event) => {
            const text = event.clipboardData.getData('text');
            if (!text.includes('\t') && !text.includes('\n')) {
              return;
            }
            event.preventDefault();
            await onPasteHours(entry.id, hourIndex, text);
          }}
          onBlur={() => {
            void commitQuantity();
          }}
        />
        <div className="grid-cell-meta">
          <button
            type="button"
            className={`grid-note-button${hasNote ? ' has-note' : ''}`}
            disabled={isReadOnly}
            onClick={() => setNoteOpen(true)}
          >
            <StickyNote2OutlinedIcon sx={{ fontSize: 16 }} />
            ملاحظة
            {hasNote ? <span className="grid-note-count">1</span> : null}
          </button>
          <span className="grid-unit-hint">{label}</span>
        </div>
      </Stack>

      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{label}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={4}
            autoFocus
            label="ملاحظات الخلية"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteOpen(false)}>إغلاق</Button>
          <Button variant="contained" onClick={() => void saveNote()}>
            حفظ الملاحظة
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function CustomFieldEditor({
  entry,
  field,
  isReadOnly,
  onCommit
}: CustomFieldEditorProps) {
  const [value, setValue] = useState(entry.customFieldValues?.[field.id] ?? '');

  return (
    <Stack spacing={0.75} className="grid-cell-stack">
      <input
        className="grid-cell-input"
        type={field.kind === 'number' ? 'number' : 'text'}
        value={value}
        readOnly={isReadOnly}
        placeholder={field.placeholder || field.label}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          void onCommit(entry.id, field.id, value);
        }}
      />
      <span className="grid-unit-hint">
        {field.unit || (field.showInFinalApproval ? 'يظهر بالإذن النهائي' : 'داخلي فقط')}
      </span>
    </Stack>
  );
}

export function ProductionEntryTable({
  entries,
  products,
  shiftLabels,
  isReadOnly,
  customFields,
  perHourSummary,
  totalPackages,
  totalKg,
  onHourCommit,
  onCustomFieldCommit,
  onPasteHours
}: ProductionEntryTableProps) {
  const productsMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const columns = useMemo<ColumnDef<EntryLine>[]>(
    () => [
      {
        id: 'product',
        header: 'المنتج',
        footer: () => 'تجميع الساعة',
        cell: ({ row }) => {
          const product = productsMap.get(row.original.productId);
          return (
            <Stack spacing={0.5} sx={{ minWidth: 250 }}>
              <Typography fontWeight={800}>{product?.name ?? '-'}</Typography>
              <Typography variant="caption" color="text.secondary">
                {product?.code ?? '-'} | وزن العبوة: {formatNumber(product?.packageWeightKg ?? 0)} كجم
              </Typography>
            </Stack>
          );
        }
      },
      ...customFields.map<ColumnDef<EntryLine>>((field) => ({
        id: `custom-${field.id}`,
        header: field.label,
        footer: () => (field.showInFinalApproval ? 'يظهر بالإذن' : 'داخلي فقط'),
        cell: ({ row }) => (
          <CustomFieldEditor
            key={`${row.original.id}:${field.id}:${row.original.customFieldValues?.[field.id] ?? ''}`}
            entry={row.original}
            field={field}
            isReadOnly={isReadOnly}
            onCommit={onCustomFieldCommit}
          />
        )
      })),
      ...shiftLabels.map<ColumnDef<EntryLine>>((label, hourIndex) => ({
        id: `hour-${hourIndex}`,
        header: label,
        footer: () => formatNumber(perHourSummary[hourIndex] ?? 0),
        cell: ({ row }) => (
          <HourCellEditor
            key={`${row.original.id}:${hourIndex}:${row.original.hourValues[hourIndex] ?? 0}:${row.original.hourNotes[hourIndex] ?? ''}`}
            entry={row.original}
            rowIndex={row.index}
            hourIndex={hourIndex}
            hourCount={shiftLabels.length}
            label={label}
            isReadOnly={isReadOnly}
            onCommit={onHourCommit}
            onPasteHours={onPasteHours}
          />
        )
      })),
      {
        id: 'total-packages',
        header: 'الإجمالي',
        footer: () => `${formatNumber(totalPackages)} عبوة`,
        cell: ({ row }) => {
          const packages = row.original.hourValues.reduce(
            (sum, current) => sum + Number(current || 0),
            0
          );
          return <Typography fontWeight={800}>{formatNumber(packages)}</Typography>;
        }
      },
      {
        id: 'total-kg',
        header: 'الكيلو',
        footer: () => `${formatNumber(totalKg)} كجم`,
        cell: ({ row }) => {
          const product = productsMap.get(row.original.productId);
          const packages = row.original.hourValues.reduce(
            (sum, current) => sum + Number(current || 0),
            0
          );
          return (
            <Typography fontWeight={800}>
              {formatNumber(packages * (product?.packageWeightKg ?? 0))}
            </Typography>
          );
        }
      }
    ],
    [
      customFields,
      isReadOnly,
      onCustomFieldCommit,
      onHourCommit,
      onPasteHours,
      perHourSummary,
      productsMap,
      shiftLabels,
      totalKg,
      totalPackages
    ]
  );

  // TanStack Table manages internal table factories that React Compiler flags conservatively.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <Box className="tanstack-grid-shell">
      <table className="tanstack-grid">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} data-sticky={header.column.id === 'product' ? 'start' : undefined}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} data-sticky={cell.column.id === 'product' ? 'start' : undefined}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map((header, index) => (
                <td key={header.id} data-sticky={header.column.id === 'product' ? 'start' : undefined}>
                  {index === 0 ? (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography fontWeight={800}>
                        {flexRender(header.column.columnDef.footer, header.getContext())}
                      </Typography>
                      <Chip size="small" label={`عدد البنود: ${entries.length}`} />
                    </Stack>
                  ) : (
                    flexRender(header.column.columnDef.footer, header.getContext())
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
    </Box>
  );
}
