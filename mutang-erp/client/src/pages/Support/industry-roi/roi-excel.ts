import * as XLSX from 'xlsx';
import type {
  IndustryRoiBenchmark,
  IndustryRoiImportRow,
} from '@shared/api.interface';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';

function cellText(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? '').trim();
}

function cellNumber(
  row: Record<string, unknown>,
  key: string,
): number | undefined {
  const text: string = cellText(row, key);
  if (text === '') return undefined;
  const num: number = Number(text);
  return Number.isFinite(num) ? num : undefined;
}

export async function parseRoiImportFile(
  file: File,
): Promise<IndustryRoiImportRow[]> {
  const buffer: ArrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName: string | undefined = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[firstSheetName],
  );
  return rows.map((row: Record<string, unknown>) => ({
    industry: cellText(row, '行业'),
    platform: cellText(row, '平台'),
    roiBenchmark: cellNumber(row, 'ROI基准') ?? cellText(row, 'ROI基准'),
    effectiveDate: cellText(row, '生效日期'),
    subIndustry: cellText(row, '二级行业') || undefined,
    roiMin: cellNumber(row, '最低ROI'),
    roiMax: cellNumber(row, '最高ROI'),
    cpcBenchmark: cellNumber(row, 'CPC基准'),
    cpmBenchmark: cellNumber(row, 'CPM基准'),
    conversionRate: cellNumber(row, '转化率'),
    expireDate: cellText(row, '失效日期') || undefined,
    remark: cellText(row, '备注') || undefined,
  }));
}

export async function exportIndustryRoiBenchmarks(
  items: IndustryRoiBenchmark[],
): Promise<number> {
  const rows: Record<string, string>[] = items.map(
    (item: IndustryRoiBenchmark) => ({
      编号: item.roiNo,
      行业: item.industry,
      二级行业: item.subIndustry ?? '',
      平台: item.platform,
      ROI基准: String(item.roiBenchmark),
      最低ROI: item.roiMin === null || item.roiMin === undefined ? '' : String(item.roiMin),
      最高ROI: item.roiMax === null || item.roiMax === undefined ? '' : String(item.roiMax),
      CPC基准: item.cpcBenchmark === null || item.cpcBenchmark === undefined ? '' : String(item.cpcBenchmark),
      CPM基准: item.cpmBenchmark === null || item.cpmBenchmark === undefined ? '' : String(item.cpmBenchmark),
      转化率: item.conversionRate === null || item.conversionRate === undefined ? '' : String(item.conversionRate),
      生效日期: item.effectiveDate,
      失效日期: item.expireDate ?? '',
      状态: item.status,
      版本: String(item.version),
      备注: item.remark ?? '',
    }),
  );
  return exportRowsToExcel(
    rows,
    [
      '编号', '行业', '二级行业', '平台', 'ROI基准', '最低ROI', '最高ROI',
      'CPC基准', 'CPM基准', '转化率', '生效日期', '失效日期', '状态', '版本', '备注',
    ],
    '行业ROI基准',
    '行业ROI基准',
  );
}
