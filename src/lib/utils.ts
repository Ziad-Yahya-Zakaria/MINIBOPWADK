import type { EntryLine, ProductDefinition, ShiftDefinition } from './types';

export function uid(prefix = 'id'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function dataUrlToBlob(text: string, type = 'application/json'): Blob {
  return new Blob([text], { type });
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 2
  }).format(value);
}

export function getShiftLabels(shift: ShiftDefinition | undefined): string[] {
  if (!shift) {
    return [];
  }

  return shift.labels.length > 0
    ? shift.labels
    : Array.from({ length: shift.hours }, (_, index) => `الساعة ${index + 1}`);
}

export function emptyHourValues(length: number): number[] {
  return Array.from({ length }, () => 0);
}

export function emptyHourNotes(length: number): string[] {
  return Array.from({ length }, () => '');
}

export function computeEntryTotals(
  entry: EntryLine,
  productsMap: Map<string, ProductDefinition>
): {
  packages: number;
  kg: number;
} {
  const product = productsMap.get(entry.productId);
  const packages = entry.hourValues.reduce((sum, value) => sum + Number(value || 0), 0);
  const kg = packages * (product?.packageWeightKg ?? 0);
  return { packages, kg };
}

export function getCellIndex(productIndex: number, hourIndex: number, note = false): string {
  return `${productIndex}:${hourIndex}:${note ? 'n' : 'q'}`;
}

export function clampSvg(svg: string | null | undefined): string | null {
  if (!svg) {
    return null;
  }

  const lowered = svg.toLowerCase();
  if (
    lowered.includes('<script') ||
    lowered.includes('foreignobject') ||
    lowered.includes('onload=') ||
    lowered.includes('onclick=')
  ) {
    return null;
  }

  return svg;
}

export function batchSummary(
  entries: EntryLine[],
  products: ProductDefinition[],
  shift: ShiftDefinition | undefined
): {
  perHour: number[];
  totalPackages: number;
  totalKg: number;
} {
  const labels = getShiftLabels(shift);
  const perHour = labels.map((_, hourIndex) =>
    entries.reduce((sum, entry) => sum + Number(entry.hourValues[hourIndex] || 0), 0)
  );

  const productMap = new Map(products.map((item) => [item.id, item]));
  const totalPackages = perHour.reduce((sum, value) => sum + value, 0);
  const totalKg = entries.reduce((sum, entry) => {
    const product = productMap.get(entry.productId);
    return sum + entry.hourValues.reduce((line, value) => line + value, 0) * (product?.packageWeightKg ?? 0);
  }, 0);

  return {
    perHour,
    totalPackages,
    totalKg
  };
}

export function inDateRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}
