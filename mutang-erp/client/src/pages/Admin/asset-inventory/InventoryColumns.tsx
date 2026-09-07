import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { AdminInventoryItem } from '@shared/api.interface';
import { AdminStatusBadge } from '../admin-enhance-constants';
import { AdminActionLink, formatAdminDate } from './asset-inventory-shared';

interface InventoryColumnHandlers {
  onEdit: (record: AdminInventoryItem) => void;
  onDelete: (record: AdminInventoryItem) => void;
}

const QUANTITY_TONE_CLASS: Record<string, string> = {
  预警: 'text-[#F97316] font-bold',
  缺货: 'text-[#EF4444] font-bold',
};

export function buildInventoryColumns(
  handlers: InventoryColumnHandlers,
): TableColumnsType<AdminInventoryItem> {
  return [
    {
      key: 'admin-inventory-no', title: '库存编号', dataIndex: 'inventoryNo',
      width: 130, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'admin-inventory-name', title: '物品名称', dataIndex: 'itemName', width: 140 },
    { key: 'admin-inventory-type', title: '物品类型', dataIndex: 'itemType', width: 100 },
    { key: 'admin-inventory-spec', title: '规格型号', dataIndex: 'specification', width: 130 },
    { key: 'admin-inventory-unit', title: '单位', dataIndex: 'unit', width: 70 },
    {
      key: 'admin-inventory-quantity', title: '库存数量', dataIndex: 'quantity',
      width: 100, align: 'right',
      render: (value: number, record: AdminInventoryItem) => (
        <span className={`font-mono ${QUANTITY_TONE_CLASS[record.status] ?? ''}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'admin-inventory-min-stock', title: '最低库存', dataIndex: 'minStock',
      width: 90, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'admin-inventory-max-stock', title: '最高库存', dataIndex: 'maxStock',
      width: 90, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    { key: 'admin-inventory-location', title: '存放地点', dataIndex: 'location', width: 110 },
    {
      key: 'admin-inventory-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    {
      key: 'admin-inventory-last-in', title: '最近入库', dataIndex: 'lastInDate',
      width: 110, render: (value: string | null) => formatAdminDate(value),
    },
    {
      key: 'admin-inventory-last-out', title: '最近出库', dataIndex: 'lastOutDate',
      width: 110, render: (value: string | null) => formatAdminDate(value),
    },
    {
      key: 'admin-inventory-actions', title: '操作', width: 110, fixed: 'right',
      render: (_: unknown, record: AdminInventoryItem) => (
        <div className="flex flex-wrap items-center gap-1">
          <AdminActionLink onClick={() => handlers.onEdit(record)}>
            编辑
          </AdminActionLink>
          <AdminActionLink danger onClick={() => handlers.onDelete(record)}>
            删除
          </AdminActionLink>
        </div>
      ),
    },
  ];
}

/* ============ Excel 导出 ============ */

export const INVENTORY_EXPORT_HEADERS: string[] = [
  '库存编号', '物品名称', '物品类型', '规格型号', '单位', '库存数量',
  '最低库存', '最高库存', '存放地点', '状态', '最近入库', '最近出库',
];

export function buildInventoryExportRows(
  items: AdminInventoryItem[],
): Record<string, string>[] {
  return items.map((item: AdminInventoryItem) => ({
    库存编号: item.inventoryNo,
    物品名称: item.itemName,
    物品类型: item.itemType,
    规格型号: item.specification,
    单位: item.unit,
    库存数量: String(item.quantity),
    最低库存: String(item.minStock),
    最高库存: String(item.maxStock),
    存放地点: item.location,
    状态: item.status,
    最近入库: formatAdminDate(item.lastInDate),
    最近出库: formatAdminDate(item.lastOutDate),
  }));
}
