import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { AdminPurchaseRequest } from '@shared/api.interface';
import { AdminStatusBadge, formatAdminAmount } from '../admin-enhance-constants';
import {
  AdminProcureActionLink, formatProcureDateTime, PR_APPROVABLE_STATUSES,
  PR_CANCELLABLE_STATUSES, PR_DELETABLE_STATUSES, PR_EDITABLE_STATUSES,
} from './procurement-shared';

interface PurchaseRequestsColumnHandlers {
  onEdit: (record: AdminPurchaseRequest) => void;
  onDelete: (record: AdminPurchaseRequest) => void;
  onApprove: (record: AdminPurchaseRequest) => void;
  onCancel: (record: AdminPurchaseRequest) => void;
}

export function buildPurchaseRequestsColumns(
  handlers: PurchaseRequestsColumnHandlers,
): TableColumnsType<AdminPurchaseRequest> {
  return [
    {
      key: 'pr-no', title: '申请编号', dataIndex: 'requestNo', width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'pr-applicant', title: '申请人', dataIndex: 'applicant', width: 100 },
    { key: 'pr-department', title: '部门', dataIndex: 'department', width: 110 },
    { key: 'pr-itemName', title: '物品名称', dataIndex: 'itemName', width: 140 },
    { key: 'pr-itemType', title: '物品类型', dataIndex: 'itemType', width: 100 },
    {
      key: 'pr-quantity', title: '数量', dataIndex: 'quantity', width: 80, align: 'right',
      render: (value: number, record: AdminPurchaseRequest) => (
        <span className="font-mono">{value} {record.unit}</span>
      ),
    },
    {
      key: 'pr-estimatedPrice', title: '预计单价', dataIndex: 'estimatedPrice',
      width: 110, align: 'right',
      render: (value: number) => (
        <span className="font-mono">{formatAdminAmount(value)}</span>
      ),
    },
    {
      key: 'pr-totalPrice', title: '预计总价', dataIndex: 'totalPrice',
      width: 110, align: 'right',
      render: (value: number) => (
        <span className="font-mono">{formatAdminAmount(value)}</span>
      ),
    },
    {
      key: 'pr-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    { key: 'pr-reason', title: '申请事由', dataIndex: 'reason', width: 180 },
    { key: 'pr-approver', title: '审批人', dataIndex: 'approver', width: 100 },
    {
      key: 'pr-approveTime', title: '审批时间', dataIndex: 'approveTime', width: 170,
      render: (value: string | null) => formatProcureDateTime(value),
    },
    { key: 'pr-approveRemark', title: '审批意见', dataIndex: 'approveRemark', width: 160 },
    {
      key: 'pr-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (value: string) => formatProcureDateTime(value),
    },
    {
      key: 'pr-actions', title: '操作', width: 170, fixed: 'right',
      render: (_: unknown, record: AdminPurchaseRequest) => (
        <div className="flex flex-wrap items-center gap-1">
          {PR_EDITABLE_STATUSES.includes(record.status) ? (
            <AdminProcureActionLink onClick={() => handlers.onEdit(record)}>
              编辑
            </AdminProcureActionLink>
          ) : null}
          {PR_APPROVABLE_STATUSES.includes(record.status) ? (
            <AdminProcureActionLink onClick={() => handlers.onApprove(record)}>
              审批
            </AdminProcureActionLink>
          ) : null}
          {PR_CANCELLABLE_STATUSES.includes(record.status) ? (
            <AdminProcureActionLink onClick={() => handlers.onCancel(record)}>
              取消
            </AdminProcureActionLink>
          ) : null}
          {PR_DELETABLE_STATUSES.includes(record.status) ? (
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

export const PURCHASE_REQUEST_EXPORT_HEADERS: string[] = [
  '申请编号', '申请人', '部门', '物品名称', '物品类型', '数量', '单位',
  '预计单价', '预计总价', '状态', '申请事由', '审批人', '审批时间', '审批意见', '创建时间',
];

export function buildPurchaseRequestsExportRows(
  items: AdminPurchaseRequest[],
): Record<string, string>[] {
  return items.map((item: AdminPurchaseRequest) => ({
    申请编号: item.requestNo,
    申请人: item.applicant,
    部门: item.department,
    物品名称: item.itemName,
    物品类型: item.itemType,
    数量: String(item.quantity),
    单位: item.unit,
    预计单价: String(item.estimatedPrice),
    预计总价: String(item.totalPrice),
    状态: item.status,
    申请事由: item.reason,
    审批人: item.approver,
    审批时间: item.approveTime ?? '',
    审批意见: item.approveRemark,
    创建时间: item.createdAt,
  }));
}
