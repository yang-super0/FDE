import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { AdminInbound } from '@shared/api.interface';
import { AdminStatusBadge, formatAdminAmount } from '../admin-enhance-constants';
import {
  formatWarehouseDate, WarehouseActionLink,
} from './warehouse-shared';

interface InboundsColumnHandlers {
  onConfirm: (record: AdminInbound) => void;
  onCancel: (record: AdminInbound) => void;
  onDelete: (record: AdminInbound) => void;
}

export function buildInboundsColumns(
  handlers: InboundsColumnHandlers,
): TableColumnsType<AdminInbound> {
  return [
    {
      key: 'wh-inbound-no', title: '入库单号', dataIndex: 'inboundNo',
      width: 140, fixed: 'left',
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    { key: 'wh-inbound-item', title: '物品名称', dataIndex: 'itemName', width: 130 },
    { key: 'wh-inbound-type', title: '类型', dataIndex: 'itemType', width: 90 },
    { key: 'wh-inbound-spec', title: '规格', dataIndex: 'specification', width: 110 },
    {
      key: 'wh-inbound-qty', title: '数量', dataIndex: 'quantity',
      width: 80, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    { key: 'wh-inbound-unit', title: '单位', dataIndex: 'unit', width: 70 },
    {
      key: 'wh-inbound-price', title: '单价', dataIndex: 'unitPrice',
      width: 110, align: 'right',
      render: (value: number) => (
        <span className="font-mono">{formatAdminAmount(value)}</span>
      ),
    },
    {
      key: 'wh-inbound-total', title: '总金额', dataIndex: 'totalPrice',
      width: 120, align: 'right',
      render: (value: number) => (
        <span className="font-mono font-bold">{formatAdminAmount(value)}</span>
      ),
    },
    { key: 'wh-inbound-supplier', title: '供应商', dataIndex: 'supplierName', width: 140 },
    {
      key: 'wh-inbound-po', title: '采购单ID', dataIndex: 'purchaseOrderId',
      width: 100, align: 'right',
      render: (value: number | null) => (
        <span className="font-mono">{value ?? '—'}</span>
      ),
    },
    {
      key: 'wh-inbound-date', title: '入库日期', dataIndex: 'inboundDate',
      width: 110,
      render: (value: string | null) => formatWarehouseDate(value),
    },
    { key: 'wh-inbound-operator', title: '经办人', dataIndex: 'operator', width: 90 },
    {
      key: 'wh-inbound-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    { key: 'wh-inbound-remark', title: '备注', dataIndex: 'remark', width: 130 },
    {
      key: 'wh-inbound-actions', title: '操作', width: 170, fixed: 'right',
      render: (_: unknown, record: AdminInbound) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待入库' ? (
            <WarehouseActionLink onClick={() => handlers.onConfirm(record)}>
              确认入库
            </WarehouseActionLink>
          ) : null}
          {record.status === '待入库' ? (
            <WarehouseActionLink onClick={() => handlers.onCancel(record)}>
              取消
            </WarehouseActionLink>
          ) : null}
          <WarehouseActionLink danger onClick={() => handlers.onDelete(record)}>
            删除
          </WarehouseActionLink>
        </div>
      ),
    },
  ];
}

/* ============ 导出 Excel 行构造 ============ */

export const INBOUNDS_EXPORT_HEADERS: string[] = [
  '入库单号', '物品名称', '类型', '规格', '数量', '单位', '单价', '总金额',
  '供应商', '采购单ID', '入库日期', '经办人', '状态', '备注',
];

export const buildInboundsExportRows = (
  items: AdminInbound[],
): Record<string, string>[] => items.map((item: AdminInbound) => ({
  入库单号: item.inboundNo,
  物品名称: item.itemName,
  类型: item.itemType,
  规格: item.specification,
  数量: String(item.quantity),
  单位: item.unit,
  单价: formatAdminAmount(item.unitPrice),
  总金额: formatAdminAmount(item.totalPrice),
  供应商: item.supplierName,
  采购单ID: item.purchaseOrderId != null ? String(item.purchaseOrderId) : '—',
  入库日期: formatWarehouseDate(item.inboundDate),
  经办人: item.operator,
  状态: item.status,
  备注: item.remark,
}));
