import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { AdminPurchaseDetail } from '@shared/api.interface';
import { AdminStatusBadge, formatAdminAmount } from '../admin-enhance-constants';
import {
  AdminProcureActionLink, formatProcureDateTime, PD_DELETABLE_STATUSES,
  PD_EDITABLE_STATUSES, PD_RECEIVABLE_STATUSES,
} from './procurement-shared';

interface PurchaseDetailsColumnHandlers {
  onEdit: (record: AdminPurchaseDetail) => void;
  onDelete: (record: AdminPurchaseDetail) => void;
  onReceive: (record: AdminPurchaseDetail) => void;
}

export function buildPurchaseDetailsColumns(
  handlers: PurchaseDetailsColumnHandlers,
): TableColumnsType<AdminPurchaseDetail> {
  return [
    {
      key: 'pd-no', title: '明细编号', dataIndex: 'detailNo', width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    {
      key: 'pd-orderId', title: '订单ID', dataIndex: 'orderId', width: 90, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    { key: 'pd-itemName', title: '物品名称', dataIndex: 'itemName', width: 140 },
    { key: 'pd-specification', title: '规格', dataIndex: 'specification', width: 140 },
    {
      key: 'pd-quantity', title: '采购数量', dataIndex: 'quantity', width: 100, align: 'right',
      render: (value: number, record: AdminPurchaseDetail) => (
        <span className="font-mono">{value} {record.unit}</span>
      ),
    },
    {
      key: 'pd-receivedQuantity', title: '已收数量', dataIndex: 'receivedQuantity',
      width: 100, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'pd-unitPrice', title: '单价', dataIndex: 'unitPrice', width: 110, align: 'right',
      render: (value: number) => <span className="font-mono">{formatAdminAmount(value)}</span>,
    },
    {
      key: 'pd-totalPrice', title: '总金额', dataIndex: 'totalPrice', width: 120, align: 'right',
      render: (value: number) => <span className="font-mono">{formatAdminAmount(value)}</span>,
    },
    {
      key: 'pd-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    {
      key: 'pd-receiveDate', title: '收货日期', dataIndex: 'receiveDate', width: 110,
      render: (value: string | null) => value ?? '—',
    },
    {
      key: 'pd-qualityCheck', title: '质检结果', dataIndex: 'qualityCheck', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    { key: 'pd-remark', title: '备注', dataIndex: 'remark', width: 160 },
    {
      key: 'pd-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (value: string) => formatProcureDateTime(value),
    },
    {
      key: 'pd-actions', title: '操作', width: 130, fixed: 'right',
      render: (_: unknown, record: AdminPurchaseDetail) => (
        <div className="flex flex-wrap items-center gap-1">
          {PD_EDITABLE_STATUSES.includes(record.status) ? (
            <AdminProcureActionLink onClick={() => handlers.onEdit(record)}>
              编辑
            </AdminProcureActionLink>
          ) : null}
          {PD_RECEIVABLE_STATUSES.includes(record.status) ? (
            <AdminProcureActionLink onClick={() => handlers.onReceive(record)}>
              收货
            </AdminProcureActionLink>
          ) : null}
          {PD_DELETABLE_STATUSES.includes(record.status) ? (
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

export const PURCHASE_DETAIL_EXPORT_HEADERS: string[] = [
  '明细编号', '订单ID', '物品名称', '规格', '采购数量', '单位', '已收数量',
  '单价', '总金额', '状态', '收货日期', '质检结果', '备注', '创建时间',
];

export function buildPurchaseDetailsExportRows(
  items: AdminPurchaseDetail[],
): Record<string, string>[] {
  return items.map((item: AdminPurchaseDetail) => ({
    明细编号: item.detailNo,
    订单ID: String(item.orderId),
    物品名称: item.itemName,
    规格: item.specification,
    采购数量: String(item.quantity),
    单位: item.unit,
    已收数量: String(item.receivedQuantity),
    单价: String(item.unitPrice),
    总金额: String(item.totalPrice),
    状态: item.status,
    收货日期: item.receiveDate ?? '',
    质检结果: item.qualityCheck,
    备注: item.remark,
    创建时间: item.createdAt,
  }));
}
