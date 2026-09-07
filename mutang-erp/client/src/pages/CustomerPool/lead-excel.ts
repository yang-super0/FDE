import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import type { CreateLeadRequest, Lead } from '@shared/api.interface';
import { LEAD_EXPORT_HEADERS } from './constants';

export async function exportLeadsToExcel(items: Lead[]): Promise<number> {
  const rows: Record<string, string>[] = items.map((lead: Lead) => ({
    线索名称: lead.leadName,
    联系人: lead.contactPerson,
    联系电话: lead.contactPhone,
    行业: lead.industry,
    来源: lead.source,
    状态: lead.status,
    下次跟进时间: lead.nextFollowUpAt
      ? dayjs(lead.nextFollowUpAt).format('YYYY-MM-DD HH:mm')
      : '',
    创建时间: dayjs(lead.createdAt).format('YYYY-MM-DD HH:mm'),
    备注: lead.remark,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: LEAD_EXPORT_HEADERS,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '线索');
  XLSX.writeFile(workbook, `线索_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
  return rows.length;
}

export async function parseLeadImportFile(
  file: File,
): Promise<CreateLeadRequest[]> {
  const buffer: ArrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName: string | undefined = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[firstSheetName],
  );
  return rawRows
    .map((row: Record<string, unknown>): CreateLeadRequest | null => {
      const name: string = String(row['线索名称'] ?? '').trim();
      if (!name) return null;
      return {
        leadName: name,
        contactPerson: String(row['联系人'] ?? '').trim() || undefined,
        contactPhone: String(row['联系电话'] ?? '').trim() || undefined,
        industry: String(row['行业'] ?? '').trim() || undefined,
        source: String(row['来源'] ?? '').trim() || undefined,
        remark: String(row['备注'] ?? '').trim() || undefined,
      };
    })
    .filter((item: CreateLeadRequest | null): boolean => item !== null);
}
