import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import type { CreatePoolLeadRequest, PoolLead } from '@shared/api.interface';
import { POOL_EXPORT_HEADERS } from './constants';

export async function exportPoolLeadsToExcel(
  items: PoolLead[],
): Promise<number> {
  const rows: Record<string, string>[] = items.map((lead: PoolLead) => ({
    主体名称: lead.subjectName,
    客资分层: lead.leadLevel,
    一级行业: lead.industry1,
    二级行业: lead.industry2,
    联系人: lead.contactPerson,
    联系电话: lead.contactPhone,
    分配状态: lead.status,
    调入时间: dayjs(lead.createdAt).format('YYYY-MM-DD HH:mm'),
    备注: lead.remark,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: POOL_EXPORT_HEADERS,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '公海客资');
  XLSX.writeFile(
    workbook,
    `公海客资_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`,
  );
  return rows.length;
}

export async function parsePoolImportFile(
  file: File,
): Promise<CreatePoolLeadRequest[]> {
  const buffer: ArrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName: string | undefined = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[firstSheetName],
  );
  return rawRows
    .map((row: Record<string, unknown>): CreatePoolLeadRequest | null => {
      const name: string = String(row['主体名称'] ?? '').trim();
      if (!name) return null;
      return {
        subjectName: name,
        leadLevel: String(row['客资分层'] ?? '').trim() || undefined,
        industry1: String(row['一级行业'] ?? '').trim() || undefined,
        industry2: String(row['二级行业'] ?? '').trim() || undefined,
        contactPerson: String(row['联系人'] ?? '').trim() || undefined,
        contactPhone: String(row['联系电话'] ?? '').trim() || undefined,
        remark: String(row['备注'] ?? '').trim() || undefined,
      };
    })
    .filter((item: CreatePoolLeadRequest | null): boolean => item !== null);
}
