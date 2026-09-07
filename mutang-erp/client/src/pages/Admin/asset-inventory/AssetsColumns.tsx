import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { AdminAsset } from '@shared/api.interface';
import { AdminStatusBadge, formatAdminAmount } from '../admin-enhance-constants';
import { AdminActionLink, formatAdminDate, formatAdminDepreciation } from './asset-inventory-shared';

interface AssetsColumnHandlers {
  onEdit: (record: AdminAsset) => void;
  onDelete: (record: AdminAsset) => void;
  onInventoryCheck: (record: AdminAsset) => void;
}

export function buildAssetsColumns(
  handlers: AssetsColumnHandlers,
): TableColumnsType<AdminAsset> {
  return [
    {
      key: 'admin-asset-no', title: '资产编号', dataIndex: 'assetNo',
      width: 130, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'admin-asset-name', title: '资产名称', dataIndex: 'assetName', width: 140 },
    { key: 'admin-asset-type', title: '资产类型', dataIndex: 'assetType', width: 100 },
    { key: 'admin-asset-spec', title: '规格型号', dataIndex: 'specification', width: 130 },
    {
      key: 'admin-asset-purchase-date', title: '采购日期', dataIndex: 'purchaseDate',
      width: 110, render: (value: string) => formatAdminDate(value),
    },
    {
      key: 'admin-asset-purchase-price', title: '采购价格', dataIndex: 'purchasePrice',
      width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatAdminAmount(value)}</span>,
    },
    {
      key: 'admin-asset-current-value', title: '当前净值', dataIndex: 'currentValue',
      width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatAdminAmount(value)}</span>,
    },
    {
      key: 'admin-asset-depreciation', title: '年折旧率', dataIndex: 'depreciationRate',
      width: 90, align: 'right',
      render: (value: number) => <span className="font-mono">{formatAdminDepreciation(value)}</span>,
    },
    { key: 'admin-asset-department', title: '部门', dataIndex: 'department', width: 100 },
    { key: 'admin-asset-user', title: '使用人', dataIndex: 'userName', width: 90 },
    { key: 'admin-asset-location', title: '存放地点', dataIndex: 'location', width: 110 },
    {
      key: 'admin-asset-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    {
      key: 'admin-asset-last-inventory', title: '最近盘点日期', dataIndex: 'lastInventoryDate',
      width: 120, render: (value: string | null) => formatAdminDate(value),
    },
    {
      key: 'admin-asset-actions', title: '操作', width: 160, fixed: 'right',
      render: (_: unknown, record: AdminAsset) => (
        <div className="flex flex-wrap items-center gap-1">
          <AdminActionLink onClick={() => handlers.onEdit(record)}>
            编辑
          </AdminActionLink>
          <AdminActionLink onClick={() => handlers.onInventoryCheck(record)}>
            盘点登记
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

export const ASSET_EXPORT_HEADERS: string[] = [
  '资产编号', '资产名称', '资产类型', '规格型号', '采购日期', '采购价格',
  '当前净值', '年折旧率', '部门', '使用人', '存放地点', '状态', '最近盘点日期',
];

export function buildAssetExportRows(
  items: AdminAsset[],
): Record<string, string>[] {
  return items.map((item: AdminAsset) => ({
    资产编号: item.assetNo,
    资产名称: item.assetName,
    资产类型: item.assetType,
    规格型号: item.specification,
    采购日期: item.purchaseDate,
    采购价格: formatAdminAmount(item.purchasePrice),
    当前净值: formatAdminAmount(item.currentValue),
    年折旧率: formatAdminDepreciation(item.depreciationRate),
    部门: item.department,
    使用人: item.userName,
    存放地点: item.location,
    状态: item.status,
    最近盘点日期: formatAdminDate(item.lastInventoryDate),
  }));
}
