import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { AdminInventoryCheck } from '@shared/api.interface';
import { AdminStatusBadge } from '../admin-enhance-constants';
import {
  formatWarehouseDate, WarehouseActionLink,
} from './warehouse-shared';

/* ============ 导出 Excel 行构造 ============ */

export const CHECKS_EXPORT_HEADERS: string[] = [
  '盘点单号', '盘点日期', '盘点人', '部门', '库位', '盘点项',
  '账实相符', '差异项', '差异摘要', '状态', '备注',
];

export const buildChecksExportRows = (
  items: AdminInventoryCheck[],
): Record<string, string>[] => items.map((item: AdminInventoryCheck) => ({
  盘点单号: item.inventoryCheckNo,
  盘点日期: formatWarehouseDate(item.checkDate),
  盘点人: item.checker,
  部门: item.department,
  库位: item.location,
  盘点项: String(item.totalItems),
  账实相符: String(item.matchedItems),
  差异项: String(item.differenceItems),
  差异摘要: item.differenceSummary,
  状态: item.status,
  备注: item.remark,
}));

/* ============ 表格列定义 ============ */

interface InventoryChecksColumnHandlers {
  onEditDetails: (record: AdminInventoryCheck) => void;
  onViewDetails: (record: AdminInventoryCheck) => void;
  onComplete: (record: AdminInventoryCheck) => void;
  onDelete: (record: AdminInventoryCheck) => void;
}

export function buildInventoryChecksColumns(
  handlers: InventoryChecksColumnHandlers,
): TableColumnsType<AdminInventoryCheck> {
  return [
    {
      key: 'wh-check-no', title: '盘点单号', dataIndex: 'inventoryCheckNo',
      width: 150, fixed: 'left',
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    {
      key: 'wh-check-date', title: '盘点日期', dataIndex: 'checkDate',
      width: 110,
      render: (value: string) => formatWarehouseDate(value),
    },
    { key: 'wh-check-checker', title: '盘点人', dataIndex: 'checker', width: 90 },
    { key: 'wh-check-department', title: '部门', dataIndex: 'department', width: 110 },
    { key: 'wh-check-location', title: '库位', dataIndex: 'location', width: 110 },
    {
      key: 'wh-check-total', title: '盘点项', dataIndex: 'totalItems',
      width: 90, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'wh-check-matched', title: '账实相符', dataIndex: 'matchedItems',
      width: 90, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'wh-check-diff', title: '差异项', dataIndex: 'differenceItems',
      width: 90, align: 'right',
      render: (value: number) => (
        <span className={`font-mono font-bold ${value > 0 ? 'text-destructive' : ''}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'wh-check-summary', title: '差异摘要', dataIndex: 'differenceSummary',
      width: 180,
      render: (value: string) => value || '—',
    },
    {
      key: 'wh-check-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    { key: 'wh-check-remark', title: '备注', dataIndex: 'remark', width: 130 },
    {
      key: 'wh-check-actions', title: '操作', width: 240, fixed: 'right',
      render: (_: unknown, record: AdminInventoryCheck) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '盘点中' ? (
            <WarehouseActionLink onClick={() => handlers.onEditDetails(record)}>
              登记明细
            </WarehouseActionLink>
          ) : null}
          {record.status === '盘点中' ? (
            <WarehouseActionLink onClick={() => handlers.onComplete(record)}>
              完成盘点
            </WarehouseActionLink>
          ) : null}
          <WarehouseActionLink onClick={() => handlers.onViewDetails(record)}>
            查看明细
          </WarehouseActionLink>
          <WarehouseActionLink danger onClick={() => handlers.onDelete(record)}>
            删除
          </WarehouseActionLink>
        </div>
      ),
    },
  ];
}
