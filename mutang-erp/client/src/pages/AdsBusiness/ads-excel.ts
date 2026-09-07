import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import type {
  AdAccount,
  AdApplication,
  AdFiling,
  CreateAdAccountRequest,
  CreateAdApplicationRequest,
  CreateAdFilingRequest,
} from '@shared/api.interface';

/* ============ 通用导出 ============ */

export async function exportRowsToExcel(
  rows: Record<string, string>[],
  headers: string[],
  sheetName: string,
  filePrefix: string,
): Promise<number> {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, `${filePrefix}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
  return rows.length;
}

export async function exportAdApplications(
  items: AdApplication[],
): Promise<number> {
  const rows: Record<string, string>[] = items.map((item: AdApplication) => ({
    申请编号: item.applicationNo,
    集团名称: item.groupName,
    主体名称: item.subjectName,
    投放平台: item.platform,
    端口: item.portType,
    账户类型: item.accountType,
    状态: item.status,
    申请时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
    备注: item.remark,
  }));
  return exportRowsToExcel(
    rows,
    ['申请编号', '集团名称', '主体名称', '投放平台', '端口', '账户类型', '状态', '申请时间', '备注'],
    '开户申请',
    '开户申请',
  );
}

export async function exportAdAccounts(items: AdAccount[]): Promise<number> {
  const rows: Record<string, string>[] = items.map((item: AdAccount) => ({
    账户编号: item.accountNo,
    账户名称: item.accountName,
    集团名称: item.groupName,
    主体名称: item.subjectName,
    投放平台: item.platform,
    端口: item.portType,
    状态: item.status,
    余额: String(item.balance),
    累计充值: String(item.totalRecharge),
    累计消耗: String(item.totalConsume),
    开户时间: item.openedAt
      ? dayjs(item.openedAt).format('YYYY-MM-DD HH:mm')
      : '',
    备注: item.remark,
  }));
  return exportRowsToExcel(
    rows,
    ['账户编号', '账户名称', '集团名称', '主体名称', '投放平台', '端口', '状态', '余额', '累计充值', '累计消耗', '开户时间', '备注'],
    '广告账户',
    '广告账户',
  );
}

export async function exportAdFilings(items: AdFiling[]): Promise<number> {
  const rows: Record<string, string>[] = items.map((item: AdFiling) => ({
    报备编号: item.filingNo,
    关联账户: item.accountName,
    集团名称: item.groupName,
    主体名称: item.subjectName,
    投放平台: item.platform,
    行业: item.industry,
    产品名称: item.productName,
    状态: item.status,
    申请时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm'),
    备注: item.remark,
  }));
  return exportRowsToExcel(
    rows,
    ['报备编号', '关联账户', '集团名称', '主体名称', '投放平台', '行业', '产品名称', '状态', '申请时间', '备注'],
    '广告报备',
    '广告报备',
  );
}

/* ============ 通用导入解析 ============ */

async function readSheetRows(
  file: File,
): Promise<Record<string, unknown>[]> {
  const buffer: ArrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName: string | undefined = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
}

function cellText(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? '').trim();
}

export async function parseApplicationImportFile(
  file: File,
): Promise<CreateAdApplicationRequest[]> {
  const rawRows: Record<string, unknown>[] = await readSheetRows(file);
  return rawRows
    .map(
      (row: Record<string, unknown>): CreateAdApplicationRequest | null => {
        const groupName: string = cellText(row, '集团名称');
        const subjectName: string = cellText(row, '主体名称');
        const platform: string = cellText(row, '投放平台');
        if (!groupName || !subjectName || !platform) return null;
        return {
          groupName,
          subjectName,
          platform,
          portType: cellText(row, '端口') || undefined,
          accountType: cellText(row, '账户类型') || undefined,
          remark: cellText(row, '备注') || undefined,
        };
      },
    )
    .filter(
      (item: CreateAdApplicationRequest | null): boolean => item !== null,
    );
}

export async function parseAccountImportFile(
  file: File,
): Promise<CreateAdAccountRequest[]> {
  const rawRows: Record<string, unknown>[] = await readSheetRows(file);
  return rawRows
    .map((row: Record<string, unknown>): CreateAdAccountRequest | null => {
      const accountName: string = cellText(row, '账户名称');
      const platform: string = cellText(row, '投放平台');
      if (!accountName || !platform) return null;
      const balanceText: string = cellText(row, '初始余额');
      const balance: number = balanceText ? Number(balanceText) : 0;
      return {
        accountName,
        platform,
        groupName: cellText(row, '集团名称') || undefined,
        subjectName: cellText(row, '主体名称') || undefined,
        portType: cellText(row, '端口') || undefined,
        balance: Number.isFinite(balance) ? balance : undefined,
        remark: cellText(row, '备注') || undefined,
      };
    })
    .filter((item: CreateAdAccountRequest | null): boolean => item !== null);
}

/** 解析报备导入文件；通过「账户编号」列经 resolveAccountId 换取账户 ID */
export async function parseFilingImportFile(
  file: File,
  resolveAccountId: (accountNo: string) => string | null,
): Promise<CreateAdFilingRequest[]> {
  const rawRows: Record<string, unknown>[] = await readSheetRows(file);
  return rawRows
    .map((row: Record<string, unknown>): CreateAdFilingRequest | null => {
      const accountNo: string = cellText(row, '账户编号');
      const accountId: string | null = accountNo
        ? resolveAccountId(accountNo)
        : null;
      if (!accountId) return null;
      return {
        accountId,
        industry: cellText(row, '行业') || undefined,
        productName: cellText(row, '产品名称') || undefined,
        filingMaterial: cellText(row, '材料说明') || undefined,
        remark: cellText(row, '备注') || undefined,
      };
    })
    .filter((item: CreateAdFilingRequest | null): boolean => item !== null);
}
