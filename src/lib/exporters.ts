import { appDb, pushNotification } from './db';
import type {
  AppSettings,
  BrandDefinition,
  BulkManifest,
  BulkPackageRecord,
  CustomFieldDefinition,
  ProductDefinition,
  ProductionBatch,
  ReportDefinition,
  ShiftDefinition,
  UserAccount
} from './types';
import {
  batchSummary,
  clampSvg,
  downloadBlob,
  formatNumber,
  getShiftLabels,
  nowIso,
  stableStringify,
  uid
} from './utils';
import { sha256Base64 } from './crypto';

type ExcelJsModule = typeof import('exceljs');
type Html2PdfFactory = (typeof import('html2pdf.js'))['default'];
type JsZipFactory = typeof import('jszip');

let excelJsPromise: Promise<ExcelJsModule> | null = null;
let html2PdfPromise: Promise<typeof import('html2pdf.js')> | null = null;
let jsZipPromise: Promise<unknown> | null = null;

async function loadExcelJs(): Promise<ExcelJsModule> {
  return excelJsPromise ??= import('exceljs');
}

async function loadHtml2Pdf(): Promise<Html2PdfFactory> {
  const module = await (html2PdfPromise ??= import('html2pdf.js'));
  return module.default;
}

async function loadJsZip(): Promise<JsZipFactory> {
  const module = await (jsZipPromise ??= import('jszip'));
  return (module as { default?: JsZipFactory }).default ?? (module as JsZipFactory);
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getFinalApprovalFields(
  settings?: AppSettings
): CustomFieldDefinition[] {
  return (settings?.customFields ?? []).filter((field) => field.showInFinalApproval);
}

function getCustomFieldDisplayValue(
  entry: ProductionBatch['entries'][number],
  field: CustomFieldDefinition
): string {
  const value = entry.customFieldValues?.[field.id];
  if (!value) {
    return '-';
  }
  return field.unit ? `${value} ${field.unit}` : value;
}

function buildReportTotals(
  entries: ProductionBatch['entries'],
  reports: ReportDefinition[] | undefined,
  products: ProductDefinition[]
) {
  if (!reports?.length) {
    return [];
  }

  const productsMap = new Map(products.map((product) => [product.id, product]));
  return reports
    .map((report) => {
      let packages = 0;
      let kg = 0;
      for (const entry of entries) {
        if (!report.productIds.includes(entry.productId)) {
          continue;
        }
        const product = productsMap.get(entry.productId);
        const totalPackages = entry.hourValues.reduce((sum, value) => sum + value, 0);
        packages += totalPackages;
        kg += totalPackages * (product?.packageWeightKg ?? 0);
      }

      return {
        reportName: report.name,
        packages,
        kg,
        matchedProducts: report.productIds.length
      };
    })
    .filter((item) => item.packages > 0);
}

function isBulkPayload(
  payload: unknown
): payload is {
  batches: ProductionBatch[];
  products: ProductDefinition[];
  brands: BrandDefinition[];
  shifts: ShiftDefinition[];
  reports: ReportDefinition[];
} {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  return (
    Array.isArray(candidate.batches) &&
    Array.isArray(candidate.products) &&
    Array.isArray(candidate.brands) &&
    Array.isArray(candidate.shifts) &&
    Array.isArray(candidate.reports)
  );
}

async function recordBulkFailure(manifest: BulkManifest, note: string) {
  const record: BulkPackageRecord = {
    packageId: manifest.packageId,
    kind: 'import',
    manifest,
    createdAt: nowIso(),
    status: 'failed',
    note
  };
  await appDb.bulkPackages.put(record);
}

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

export async function importProductsWorkbook(
  file: File,
  brands: BrandDefinition[]
): Promise<ProductDefinition[]> {
  const ExcelJs = await loadExcelJs();
  const workbook = new ExcelJs.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values)
    ? headerRow.values.slice(1)
    : [];
  const headers = headerValues.map((value: unknown) => String(value ?? '').trim());

  const data: Array<Record<string, string>> = [];
  worksheet.eachRow((row: { getCell: (index: number) => { value: unknown } }, rowNumber: number) => {
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
      const factor = Number(row['المعامل'] || 1);
      return {
        id: uid('product'),
        name: row['الصنف'],
        code: row['الكود'],
        unit: row['الوحدة'] || 'عبوة',
        factor,
        state: row['الحالة'] || '',
        subgroup: row['مجموعة فرعية'] || '',
        group: row['مجموعة رئيسية'] || '',
        customGroup: row['مجموعة مخصصة'] || '',
        weightKg: factor,
        packageWeightKg: factor,
        brandIds: brand ? [brand.id] : []
      };
    });
}

export async function exportRowsToWorkbook(
  rows: Array<Record<string, string | number>>,
  fileName: string
): Promise<void> {
  const ExcelJs = await loadExcelJs();
  const workbook = new ExcelJs.Workbook();
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
    reports?: ReportDefinition[];
    users: UserAccount[];
    settings?: AppSettings;
  }
): Promise<void> {
  const html2pdf = await loadHtml2Pdf();
  const wrapper = document.createElement('div');
  wrapper.dir = 'rtl';
  wrapper.style.cssText =
    'font-family:Cairo, sans-serif; padding:24px; color:#111827; width: 1000px; background:#fff;';

  const productsMap = new Map(context.products.map((item) => [item.id, item]));
  const summary = batchSummary(batch.entries, context.products, context.shift);
  const finalFields = getFinalApprovalFields(context.settings);
  const shiftLabels = getShiftLabels(context.shift);
  const reportRows = buildReportTotals(batch.entries, context.reports, context.products);

  const approvalsMarkup = batch.approvals
    .map((approval) => {
      const user = context.users.find((item) => item.id === approval.userId);
      return `
        <div style="border:1px solid #e5e7eb;border-radius:16px;padding:12px;min-height:120px;">
          <div style="font-weight:700;margin-bottom:8px;">${escapeHtml(user?.displayName ?? 'معتمد')}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">${escapeHtml(
            new Date(approval.approvedAt).toLocaleString('ar-EG')
          )}</div>
          <div>${clampSvg(user?.signatureSvg) ?? '<div style="color:#9ca3af">لا يوجد توقيع SVG</div>'}</div>
        </div>
      `;
    })
    .join('');

  const customHeaders = finalFields
    .map(
      (field) =>
        `<th style="padding:12px;text-align:right;">${escapeHtml(field.label)}</th>`
    )
    .join('');

  const rows = batch.entries
    .map((entry) => {
      const product = productsMap.get(entry.productId);
      const packages = entry.hourValues.reduce((sum, value) => sum + value, 0);
      const kg = packages * (product?.packageWeightKg ?? 0);
      const customColumns = finalFields
        .map(
          (field) =>
            `<td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
              getCustomFieldDisplayValue(entry, field)
            )}</td>`
        )
        .join('');
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(product?.name ?? '-')}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(product?.code ?? '-')}</td>
          ${customColumns}
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatNumber(packages)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatNumber(kg)}</td>
        </tr>
      `;
    })
    .join('');

  const perHourMarkup = shiftLabels
    .map(
      (label, index) => `
        <div style="background:#f8fafc;padding:12px 14px;border-radius:14px;border:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#6b7280;">${escapeHtml(label)}</div>
          <div style="font-weight:800;margin-top:6px;">${formatNumber(summary.perHour[index] ?? 0)}</div>
        </div>
      `
    )
    .join('');

  const reportMarkup = reportRows.length
    ? `
      <div style="margin-top:24px;">
        <div style="font-weight:800;margin-bottom:12px;">ربط التقارير النهائية</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <thead>
            <tr style="background:#f0fdf4;">
              <th style="padding:12px;text-align:right;">التقرير</th>
              <th style="padding:12px;text-align:right;">عدد المنتجات</th>
              <th style="padding:12px;text-align:right;">العبوات</th>
              <th style="padding:12px;text-align:right;">الكيلو</th>
            </tr>
          </thead>
          <tbody>
            ${reportRows
              .map(
                (row) => `
                  <tr>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(row.reportName)}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatNumber(row.matchedProducts)}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatNumber(row.packages)}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatNumber(row.kg)}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
    : '';

  wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;gap:16px;">
      <div>
        <div style="font-size:28px;font-weight:800;">${escapeHtml(
          context.settings?.companyName ?? 'Minibo Systems'
        )}</div>
        <div style="font-size:14px;color:#6b7280;">الإذن النهائي لاعتماد الإنتاج</div>
      </div>
      <div style="text-align:left;">
        <div>البراند: ${escapeHtml(context.brand?.name ?? '-')}</div>
        <div>الوردية: ${escapeHtml(context.shift?.name ?? '-')}</div>
        <div>التاريخ: ${escapeHtml(batch.date)}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
      <thead>
        <tr style="background:#eff6ff;">
          <th style="padding:12px;text-align:right;">اسم المنتج</th>
          <th style="padding:12px;text-align:right;">كود المنتج</th>
          ${customHeaders}
          <th style="padding:12px;text-align:right;">كمية الإنتاج بالعبوة</th>
          <th style="padding:12px;text-align:right;">كمية الإنتاج بالكيلو</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:12px;margin-top:20px;">
      ${perHourMarkup}
    </div>
    <div style="display:flex;gap:16px;margin-top:20px;">
      <div style="background:#f8fafc;padding:16px;border-radius:16px;flex:1;">إجمالي العبوات: ${formatNumber(summary.totalPackages)}</div>
      <div style="background:#f8fafc;padding:16px;border-radius:16px;flex:1;">إجمالي الكيلو: ${formatNumber(summary.totalKg)}</div>
    </div>
    ${reportMarkup}
    <div style="margin-top:24px;">
      <div style="font-weight:800;margin-bottom:12px;">التوقيعات</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">${approvalsMarkup}</div>
    </div>
  `;

  document.body.appendChild(wrapper);
  await html2pdf()
    .from(wrapper)
    .set({
      margin: 10,
      filename: `approval-${batch.date}-${context.brand?.name ?? 'brand'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    })
    .save();
  wrapper.remove();
}

export async function exportBulkPackage(payload: {
  periodFrom: string;
  periodTo: string;
  batches: ProductionBatch[];
  products: ProductDefinition[];
  brands: BrandDefinition[];
  shifts: ShiftDefinition[];
  reports: ReportDefinition[];
  settings?: AppSettings;
}): Promise<void> {
  const JsZip = await loadJsZip();
  const zip = new JsZip();
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

export async function importBulkPackage(
  file: File
): Promise<{ ok: boolean; message: string }> {
  let manifest: BulkManifest | null = null;

  try {
    const JsZip = await loadJsZip();
    const zip = await JsZip.loadAsync(await file.arrayBuffer());
    const manifestContent = await zip.file('manifest.json')?.async('string');
    const payloadContent = await zip.file('data/payload.json')?.async('string');

    if (!manifestContent || !payloadContent) {
      return { ok: false, message: 'الحزمة لا تحتوي الملفات المطلوبة.' };
    }

    manifest = JSON.parse(manifestContent) as BulkManifest;
    if (
      !manifest.packageId ||
      manifest.schemaVersion !== '1.0' ||
      !manifest.checksum
    ) {
      return { ok: false, message: 'بيانات manifest غير صالحة.' };
    }
    const safeManifest = manifest;

    const existing = await appDb.bulkPackages.get(safeManifest.packageId);
    if (existing?.status === 'completed') {
      return { ok: false, message: 'تم استيراد هذه الحزمة سابقاً.' };
    }

    const rawPayload = JSON.parse(payloadContent);
    if (!isBulkPayload(rawPayload)) {
      await recordBulkFailure(safeManifest, 'صيغة payload غير صالحة.');
      return { ok: false, message: 'محتوى الحزمة غير متوافق مع النظام.' };
    }

    const checksum = await sha256Base64(stableStringify(rawPayload));
    if (checksum !== safeManifest.checksum) {
      await recordBulkFailure(safeManifest, 'فشل التحقق من checksum.');
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
        for (const product of rawPayload.products) {
          await appDb.products.put(product);
        }
        for (const brand of rawPayload.brands) {
          await appDb.brands.put(brand);
        }
        for (const shift of rawPayload.shifts) {
          await appDb.shifts.put(shift);
        }
        for (const report of rawPayload.reports) {
          await appDb.reportDefinitions.put(report);
        }
        for (const batch of rawPayload.batches) {
          await appDb.batches.put({
            ...batch,
            imported: true,
            sourceInstanceId: safeManifest.sourceInstanceId,
            sourcePackageId: safeManifest.packageId
          });
        }

        await appDb.bulkPackages.put({
          packageId: safeManifest.packageId,
          kind: 'import',
          manifest: safeManifest,
          createdAt: nowIso(),
          status: 'completed'
        });
      }
    );

    await pushNotification('Free Engine Bulk', 'تم استيراد الحزمة بنجاح.', 'success');
    return { ok: true, message: 'تم استيراد الحزمة بنجاح.' };
  } catch {
    if (manifest) {
      await recordBulkFailure(manifest, 'تعذر قراءة ملف الحزمة أو تحليله.');
    }
    return {
      ok: false,
      message: 'تعذر قراءة ملف الحزمة. تأكد من أنه ZIP صالح وصادر من النظام.'
    };
  }
}

export async function exportBatchWorkbook(
  batch: ProductionBatch,
  products: ProductDefinition[],
  fileName: string,
  options?: {
    settings?: AppSettings;
    shift?: ShiftDefinition;
    reports?: ReportDefinition[];
  }
): Promise<void> {
  const ExcelJs = await loadExcelJs();
  const workbook = new ExcelJs.Workbook();
  const productMap = new Map(products.map((item) => [item.id, item]));
  const finalFields = getFinalApprovalFields(options?.settings);
  const shiftLabels = getShiftLabels(options?.shift);
  const reportRows = buildReportTotals(batch.entries, options?.reports, products);
  const rows: Array<
    {
      productName: string;
      productCode: string;
      totalPackages: number;
      totalKg: number;
    } & Record<string, string | number>
  > = batch.entries.map((entry) => {
    const product = productMap.get(entry.productId);
    const totalPackages = entry.hourValues.reduce((sum, value) => sum + value, 0);
    const totalKg = totalPackages * (product?.packageWeightKg ?? 0);

    return {
      productName: product?.name ?? '',
      productCode: product?.code ?? '',
      ...Object.fromEntries(
        finalFields.map((field) => [field.label, getCustomFieldDisplayValue(entry, field)])
      ),
      totalPackages,
      totalKg
    };
  });

  const summarySheet = workbook.addWorksheet('Summary');
  const dataSheet = workbook.addWorksheet('Production Matrix');
  const reportsSheet = workbook.addWorksheet('Reports');

  summarySheet.columns = [
    { header: 'البند', key: 'label', width: 28 },
    { header: 'القيمة', key: 'value', width: 32 }
  ];
  summarySheet.addRows([
    { label: 'تاريخ التشغيل', value: batch.date },
    { label: 'حالة الدفعة', value: batch.status },
    { label: 'إجمالي البنود', value: batch.entries.length },
    {
      label: 'إجمالي العبوات',
      value: batch.entries.reduce(
        (sum, entry) => sum + entry.hourValues.reduce((line, value) => line + value, 0),
        0
      )
    },
    {
      label: 'إجمالي الكيلو',
      value: batch.entries.reduce((sum, entry) => {
        const product = productMap.get(entry.productId);
        return sum + entry.hourValues.reduce((line, value) => line + value, 0) * (product?.packageWeightKg ?? 0);
      }, 0)
    }
  ]);

  const dataHeaders = [
    'اسم المنتج',
    'كود المنتج',
    ...finalFields.map((field) => field.label),
    ...shiftLabels,
    'الإجمالي عبوات',
    'الإجمالي كجم'
  ];
  dataSheet.columns = dataHeaders.map((header) => ({
    header,
    key: header,
    width: 20
  }));
  rows.forEach((row, rowIndex) => {
    const entry = batch.entries[rowIndex];
    dataSheet.addRow({
      'اسم المنتج': row.productName,
      'كود المنتج': row.productCode,
      ...Object.fromEntries(finalFields.map((field) => [field.label, row[field.label] ?? '-'])),
      ...Object.fromEntries(
        shiftLabels.map((label, hourIndex) => [label, entry.hourValues[hourIndex] ?? 0])
      ),
      'الإجمالي عبوات': row.totalPackages,
      'الإجمالي كجم': row.totalKg
    });
  });

  reportsSheet.columns = [
    { header: 'التقرير', key: 'reportName', width: 28 },
    { header: 'عدد المنتجات', key: 'matchedProducts', width: 18 },
    { header: 'العبوات', key: 'packages', width: 16 },
    { header: 'الكيلو', key: 'kg', width: 16 }
  ];
  reportRows.forEach((row) => reportsSheet.addRow(row));

  summarySheet.getRow(1).font = { bold: true };
  dataSheet.getRow(1).font = { bold: true };
  reportsSheet.getRow(1).font = { bold: true };
  dataSheet.views = [{ state: 'frozen', ySplit: 1 }];
  reportsSheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer]), fileName);
}

export async function exportDashboardWorkbook(
  rows: Array<{
    productName: string;
    productCode: string;
    packages: number;
    kg: number;
  }>,
  reportRows: Array<{
    reportName: string;
    packages: number;
    kg: number;
    matchedProducts: number;
  }>,
  fileName: string
): Promise<void> {
  const ExcelJs = await loadExcelJs();
  const workbook = new ExcelJs.Workbook();
  const productsSheet = workbook.addWorksheet('Products');
  const reportsSheet = workbook.addWorksheet('Reports');

  productsSheet.columns = [
    { header: 'اسم المنتج', key: 'productName', width: 28 },
    { header: 'كود المنتج', key: 'productCode', width: 18 },
    { header: 'كمية الإنتاج بالعبوة', key: 'packages', width: 22 },
    { header: 'كمية الإنتاج بالكيلو', key: 'kg', width: 22 }
  ];
  rows.forEach((row) => productsSheet.addRow(row));

  reportsSheet.columns = [
    { header: 'اسم التقرير', key: 'reportName', width: 28 },
    { header: 'عدد المنتجات المشمولة', key: 'matchedProducts', width: 22 },
    { header: 'العبوات المجمعة', key: 'packages', width: 20 },
    { header: 'الكيلو المجمع', key: 'kg', width: 20 }
  ];
  reportRows.forEach((row) => reportsSheet.addRow(row));

  productsSheet.getRow(1).font = { bold: true };
  reportsSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer]), fileName);
}
