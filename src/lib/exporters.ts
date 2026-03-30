import html2pdf from 'html2pdf.js';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

import { appDb, pushNotification } from './db';
import type {
  AppSettings,
  BrandDefinition,
  BulkManifest,
  BulkPackageRecord,
  ProductDefinition,
  ProductionBatch,
  ReportDefinition,
  ShiftDefinition,
  UserAccount
} from './types';
import { batchSummary, clampSvg, downloadBlob, formatNumber, nowIso, stableStringify, uid } from './utils';
import { sha256Base64 } from './crypto';

export function exportProductsTemplate(): void {
  const rows = [
    {
      الصنف: '',
      الكود: '',
      الوحدة: '',
      المعامل: '',
      البراند: '',
      الحالة: '',
      'مجموعة فرعية': '',
      'مجموعة رئيسية': '',
      'مجموعة مخصصة': ''
    }
  ];
  void exportRowsToWorkbook(rows, 'minibo-products-template.xlsx');
}

export async function importProductsWorkbook(file: File, brands: BrandDefinition[]): Promise<ProductDefinition[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
  const headers = headerValues.map((value) => String(value ?? '').trim());

  const data: Array<Record<string, string>> = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const record: Record<string, string> = {};
    headers.forEach((header: string, index: number) => {
      record[header] = String(row.getCell(index + 1).value ?? '').trim();
    });

    if (Object.values(record).some(Boolean)) {
      data.push(record);
    }
  });

  return data
    .filter((row) => row['الصنف'] && row['الكود'])
    .map((row) => {
      const brand = brands.find((item) => item.name === row['البراند']);
      return {
        id: uid('product'),
        name: row['الصنف'],
        code: row['الكود'],
        unit: row['الوحدة'] || 'عبوة',
        factor: Number(row['المعامل'] || 1),
        state: row['الحالة'] || '',
        subgroup: row['مجموعة فرعية'] || '',
        group: row['مجموعة رئيسية'] || '',
        customGroup: row['مجموعة مخصصة'] || '',
        weightKg: Number(row['المعامل'] || 1),
        packageWeightKg: Number(row['المعامل'] || 1),
        brandIds: brand ? [brand.id] : []
      };
    });
}

export async function exportRowsToWorkbook(
  rows: Array<Record<string, string | number>>,
  fileName: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  if (rows.length === 0) {
    worksheet.addRow([]);
  } else {
    const headers = Object.keys(rows[0]);
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: 24
    }));
    rows.forEach((row) => {
      worksheet.addRow(row);
    });
  }

  worksheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer]), fileName);
}

export async function exportApprovalPdf(
  batch: ProductionBatch,
  context: {
    brand?: BrandDefinition;
    shift?: ShiftDefinition;
    products: ProductDefinition[];
    users: UserAccount[];
    settings?: AppSettings;
  }
): Promise<void> {
  const wrapper = document.createElement('div');
  wrapper.dir = 'rtl';
  wrapper.style.cssText =
    'font-family:Cairo, sans-serif; padding:24px; color:#111827; width: 1000px; background:#fff;';

  const productsMap = new Map(context.products.map((item) => [item.id, item]));
  const summary = batchSummary(batch.entries, context.products, context.shift);
  const approvalsMarkup = batch.approvals
    .map((approval) => {
      const user = context.users.find((item) => item.id === approval.userId);
      return `
        <div style="border:1px solid #e5e7eb;border-radius:16px;padding:12px;min-height:120px;">
          <div style="font-weight:700;margin-bottom:8px;">${user?.displayName ?? 'معتمد'}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">${new Date(approval.approvedAt).toLocaleString('ar-EG')}</div>
          <div>${clampSvg(user?.signatureSvg) ?? '<div style="color:#9ca3af">لا يوجد توقيع SVG</div>'}</div>
        </div>
      `;
    })
    .join('');

  const rows = batch.entries
    .map((entry) => {
      const product = productsMap.get(entry.productId);
      const packages = entry.hourValues.reduce((sum, value) => sum + value, 0);
      const kg = packages * (product?.packageWeightKg ?? 0);
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${product?.name ?? '-'}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${product?.code ?? '-'}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatNumber(packages)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatNumber(kg)}</td>
        </tr>
      `;
    })
    .join('');

  wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <div>
        <div style="font-size:28px;font-weight:800;">${context.settings?.companyName ?? 'Minibo Systems'}</div>
        <div style="font-size:14px;color:#6b7280;">Production Approval Report</div>
      </div>
      <div style="text-align:left;">
        <div>البراند: ${context.brand?.name ?? '-'}</div>
        <div>الوردية: ${context.shift?.name ?? '-'}</div>
        <div>التاريخ: ${batch.date}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
      <thead>
        <tr style="background:#eff6ff;">
          <th style="padding:12px;text-align:right;">اسم المنتج</th>
          <th style="padding:12px;text-align:right;">كود المنتج</th>
          <th style="padding:12px;text-align:right;">كمية الإنتاج بالعبوة</th>
          <th style="padding:12px;text-align:right;">كمية الإنتاج بالكيلو</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;gap:16px;margin-top:20px;">
      <div style="background:#f8fafc;padding:16px;border-radius:16px;flex:1;">إجمالي العبوات: ${formatNumber(summary.totalPackages)}</div>
      <div style="background:#f8fafc;padding:16px;border-radius:16px;flex:1;">إجمالي الكيلو: ${formatNumber(summary.totalKg)}</div>
    </div>
    <div style="margin-top:24px;">
      <div style="font-weight:800;margin-bottom:12px;">التوقيعات</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">${approvalsMarkup}</div>
    </div>
  `;

  document.body.appendChild(wrapper);
  await html2pdf().from(wrapper).set({
    margin: 10,
    filename: `approval-${batch.date}-${context.brand?.name ?? 'brand'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save();
  wrapper.remove();
}

export async function exportBulkPackage(
  payload: {
    periodFrom: string;
    periodTo: string;
    batches: ProductionBatch[];
    products: ProductDefinition[];
    brands: BrandDefinition[];
    shifts: ShiftDefinition[];
    reports: ReportDefinition[];
    settings?: AppSettings;
  }
): Promise<void> {
  const zip = new JSZip();
  const data = {
    batches: payload.batches,
    products: payload.products,
    brands: payload.brands,
    shifts: payload.shifts,
    reports: payload.reports
  };

  const checksum = await sha256Base64(stableStringify(data));
  const manifest: BulkManifest = {
    schemaVersion: '1.0',
    packageId: uid('bulk'),
    sourceInstanceId: payload.settings?.instanceId ?? 'minibo',
    sourceInstanceName: payload.settings?.companyName ?? 'Minibo Systems',
    periodFrom: payload.periodFrom,
    periodTo: payload.periodTo,
    exportedAtUtc: nowIso(),
    entityCounts: {
      batches: payload.batches.length,
      products: payload.products.length,
      brands: payload.brands.length,
      shifts: payload.shifts.length,
      reports: payload.reports.length
    },
    checksum
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('data/payload.json', JSON.stringify(data, null, 2));

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, `minibo-bulk-${payload.periodFrom}-${payload.periodTo}.zip`);

  const packageRecord: BulkPackageRecord = {
    packageId: manifest.packageId,
    kind: 'export',
    manifest,
    createdAt: nowIso(),
    status: 'completed'
  };

  await appDb.bulkPackages.put(packageRecord);
  await pushNotification('Free Engine Bulk', 'تم إنشاء حزمة تبادل البيانات بنجاح.', 'success');
}

export async function importBulkPackage(file: File): Promise<{ ok: boolean; message: string }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const manifestContent = await zip.file('manifest.json')?.async('string');
  const payloadContent = await zip.file('data/payload.json')?.async('string');

  if (!manifestContent || !payloadContent) {
    return { ok: false, message: 'الحزمة لا تحتوي الملفات المطلوبة.' };
  }

  const manifest = JSON.parse(manifestContent) as BulkManifest;
  const existing = await appDb.bulkPackages.get(manifest.packageId);
  if (existing) {
    return { ok: false, message: 'تم استيراد هذه الحزمة سابقاً.' };
  }

  const payload = JSON.parse(payloadContent) as {
    batches: ProductionBatch[];
    products: ProductDefinition[];
    brands: BrandDefinition[];
    shifts: ShiftDefinition[];
    reports: ReportDefinition[];
  };

  const checksum = await sha256Base64(stableStringify(payload));
  if (checksum !== manifest.checksum) {
    return { ok: false, message: 'فشل التحقق من سلامة الحزمة.' };
  }

  await appDb.transaction(
    'rw',
    [
      appDb.products,
      appDb.brands,
      appDb.shifts,
      appDb.reportDefinitions,
      appDb.batches,
      appDb.bulkPackages
    ],
    async () => {
      for (const product of payload.products) {
        await appDb.products.put(product);
      }
      for (const brand of payload.brands) {
        await appDb.brands.put(brand);
      }
      for (const shift of payload.shifts) {
        await appDb.shifts.put(shift);
      }
      for (const report of payload.reports) {
        await appDb.reportDefinitions.put(report);
      }
      for (const batch of payload.batches) {
        await appDb.batches.put({
          ...batch,
          imported: true,
          sourceInstanceId: manifest.sourceInstanceId,
          sourcePackageId: manifest.packageId
        });
      }

      await appDb.bulkPackages.put({
        packageId: manifest.packageId,
        kind: 'import',
        manifest,
        createdAt: nowIso(),
        status: 'completed'
      });
    }
  );

  await pushNotification('Free Engine Bulk', 'تم استيراد الحزمة بنجاح.', 'success');
  return { ok: true, message: 'تم استيراد الحزمة بنجاح.' };
}

export async function exportBatchWorkbook(
  batch: ProductionBatch,
  products: ProductDefinition[],
  fileName: string
): Promise<void> {
  const productMap = new Map(products.map((item) => [item.id, item]));
  const rows = batch.entries.map((entry) => {
    const product = productMap.get(entry.productId);
    const totalPackages = entry.hourValues.reduce((sum, value) => sum + value, 0);
    const totalKg = totalPackages * (product?.packageWeightKg ?? 0);
    return {
      'اسم المنتج': product?.name ?? '',
      'كود المنتج': product?.code ?? '',
      'كمية الإنتاج بالعبوة': totalPackages,
      'كمية الإنتاج بالكيلو': totalKg
    };
  });
  await exportRowsToWorkbook(rows, fileName);
}

export async function exportDashboardWorkbook(
  rows: Array<{
    productName: string;
    productCode: string;
    packages: number;
    kg: number;
  }>,
  fileName: string
): Promise<void> {
  await exportRowsToWorkbook(
    rows.map((row) => ({
      'اسم المنتج': row.productName,
      'كود المنتج': row.productCode,
      'كمية الإنتاج بالعبوة': row.packages,
      'كمية الإنتاج بالكيلو': row.kg
    })),
    fileName
  );
}
