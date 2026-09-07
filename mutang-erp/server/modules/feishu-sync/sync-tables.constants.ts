import type { PgTable } from 'drizzle-orm/pg-core';
import {
  actors,
  adAccountApplications,
  adAccounts,
  adminAssets,
  adminInventory,
  contract,
  contractExpenses,
  creativeMaterials,
  customer,
  dailyConsumptionSummary,
  departmentTargets,
  financeConsumptions,
  financeInvoices,
  financePayments,
  financeReceipts,
  hrEmployees,
  industryRoiBenchmarks,
  industryTrends,
  leads,
  outsourcingVendors,
  publicPoolLeads,
  videoOrders,
  videoProjects,
} from '@server/database/schema';

export interface SyncTableEntry {
  tableName: string;
  displayName: string;
  table: PgTable;
}

/** 多维表格字段值（写入 bitable 时仅允许基础标量） */
export type SyncFieldValues = Record<string, string | number | boolean>;

export const SYNC_TABLES: SyncTableEntry[] = [
  { tableName: 'customer', displayName: '客户档案', table: customer },
  { tableName: 'contract', displayName: '合同管理', table: contract },
  { tableName: 'ad_accounts', displayName: '广告账户', table: adAccounts },
  {
    tableName: 'ad_account_applications',
    displayName: '开户申请',
    table: adAccountApplications,
  },
  {
    tableName: 'finance_consumptions',
    displayName: '消耗明细',
    table: financeConsumptions,
  },
  {
    tableName: 'finance_receipts',
    displayName: '收款记录',
    table: financeReceipts,
  },
  {
    tableName: 'finance_payments',
    displayName: '付款记录',
    table: financePayments,
  },
  { tableName: 'finance_invoices', displayName: '发票管理', table: financeInvoices },
  {
    tableName: 'contract_expenses',
    displayName: '合同费用',
    table: contractExpenses,
  },
  { tableName: 'video_orders', displayName: '视频订单', table: videoOrders },
  { tableName: 'video_projects', displayName: '视频项目', table: videoProjects },
  { tableName: 'actors', displayName: '演员/达人库', table: actors },
  {
    tableName: 'outsourcing_vendors',
    displayName: '外包供应商',
    table: outsourcingVendors,
  },
  { tableName: 'hr_employees', displayName: '员工档案', table: hrEmployees },
  { tableName: 'leads', displayName: '销售线索', table: leads },
  { tableName: 'public_pool_leads', displayName: '公海客资', table: publicPoolLeads },
  {
    tableName: 'daily_consumption_summary',
    displayName: '日消耗汇总',
    table: dailyConsumptionSummary,
  },
  {
    tableName: 'department_targets',
    displayName: '部门目标',
    table: departmentTargets,
  },
  { tableName: 'admin_assets', displayName: '固定资产', table: adminAssets },
  { tableName: 'admin_inventory', displayName: '库存管理', table: adminInventory },
  {
    tableName: 'industry_roi_benchmarks',
    displayName: '行业ROI基准',
    table: industryRoiBenchmarks,
  },
  { tableName: 'industry_trends', displayName: '行业大盘', table: industryTrends },
  {
    tableName: 'creative_materials',
    displayName: '素材库',
    table: creativeMaterials,
  },
];

export const SYNC_TABLE_MAP: Map<string, SyncTableEntry> = new Map<
  string,
  SyncTableEntry
>(
  SYNC_TABLES.map(
    (entry: SyncTableEntry): [string, SyncTableEntry] => [entry.tableName, entry],
  ),
);
