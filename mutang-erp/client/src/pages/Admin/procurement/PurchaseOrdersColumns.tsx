import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { AdminPurchaseOrder } from '@shared/api.interface';
import { AdminStatusBadge, formatAdminAmount } from '../admin-enhance-constants';
import {
  AdminProcureActionLink, formatProcureDateTime, PO_CANCELLABLE_STATUSES,
  PO_DELETABLE_STATUSES, PO_EDITABLE_STATUSES, PO_SHIPPABLE_STATUSES,
} from './procurement-shared';

interface PurchaseOrdersColumnHandlers {
  onEdit: (record: AdminPurchaseOrder) => void;
  onDelete: (record: AdminPurchaseOrder) => void;
  onShip: (record: AdminPurchaseOrder) => void;
  onCancel: (record: AdminPurchaseOrder) => void;
}

export function buildPurchaseOrdersColumns(
  handlers: PurchaseOrdersColumnHandlers,
): TableColumnsType<AdminPurchaseOrder> {
  return [
    {
      key: 'po-no', title: '订单编号', dataIndex: 'orderNo', width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    {
      key: 'po-requestId', title: '关联申请', dataIndex: 'requestId', width: 90, align: 'right',
      render: (value: number | null) => (
        <span className="font-mono">{value ?? '—'}</span>
      ),
    },
    { key: 'po-supplier', title: '供应商', dataIndex: 'supplierName', width: 140 },
    { key: 'po-itemName', title: '物品名称', dataIndex: 'itemName', width: 140 },
    { key: 'po-itemType', title: '物品类型', dataIndex: 'itemType', width: 100 },
    {
      key: 'po-quantity', title: '数量', dataIndex: 'quantity', width: 90, align: 'right',
      render: (value: number, record: AdminPurchaseOrder) => (
        <span className="font-mono">{value} {record.unit}</span>
      ),
    },
    {
      key: 'po-unitPrice', title: '单价', dataIndex: 'unitPrice', width: 110, align: 'right',
      render: (value: number) => <span className="font-mono">{formatAdminAmount(value)}</span>,
    },
    {
      key: 'po-totalPrice', title: '总金额', dataIndex: 'totalPrice', width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatAdminAmount(value)}</span>,
    },
    { key: 'po-orderDate', title: '订单日期', dataIndex: 'orderDate', width: 110 },
    {
      key: 'po-expectedDate', title: '预计到货', dataIndex: 'expectedDate', width: 110,
      render: (value: string | null) => value ?? '—',
    },
    {
      key: 'po-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    { key: 'po-logisticsNo', title: '物流单号', dataIndex: 'logisticsNo', width: 140 },
    { key: 'po-remark', title: '备注', dataIndex: 'remark', width: 160 },
    {
      key: 'po-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (value: string) => formatProcureDateTime(value),
    },
    {
      key: 'po-actions', title: '操作', width: 170, fixed: 'right',
      render: (_: unknown, record: AdminPurchaseOrder) => (
        <div className="flex flex-wrap items-center gap-1">
          {PO_EDITABLE_STATUSES.includes(record.status) ? (
            <AdminProcureActionLink onClick={() => handlers.onEdit(record)}>
              编辑
            </AdminProcureActionLink>
          ) : null}
          {PO_SHIPPABLE_STATUSES.includes(record.status) ? (
            <AdminProcureActionLink onClick={() => handlers.onShip(record)}>
              发货
            </AdminProcureActionLink>
          ) : null}
          {PO_CANCELLABLE_STATUSES.includes(record.status) ? (
            <AdminProcureActionLink onClick={() => handlers.onCancel(record)}>
              取消
            </AdminProcureActionLink>
          ) : null}
          {PO_DELETABLE_STATUSES.includes(record.status) ? (
            <AdminProcureActionLink danger onClick={() => handlers.onDelete(record)}>
              删除
            </AdminProcureActionLink>
          ) : null}
        </div>
      ),
    },
  ];
}

/* ============ 导出 Excel ============ */

export const PURCHASE_ORDER_EXPORT_HEADERS: string[] = [
  '订单编号', '关联申请ID', '供应商', '物品名称', '物品类型', '数量', '单位',
  '单价', '总金额', '订单日期', '预计到货', '状态', '物流单号', '备注', '创建时间',
];

export function buildPurchaseOrdersExportRows(
  items: AdminPurchaseOrder[],
): Record<string, string>[] {
  return items.map((item: AdminPurchaseOrder) => ({
    订单编号: item.orderNo,
    关联申请ID: item.requestId === null ? '' : String(item.requestId),
    供应商: item.supplierName,
    物品名称: item.itemName,
    物品类型: item.itemType,
    数量: String(item.quantity),
    单位: item.unit,
    单价: String(item.unitPrice),
    总金额: String(item.totalPrice),
    订单日期: item.orderDate,
    预计到货: item.expectedDate ?? '',
    状态: item.status,
    物流单号: item.logisticsNo,
    备注: item.remark,
    创建时间: item.createdAt,
  }));
}
