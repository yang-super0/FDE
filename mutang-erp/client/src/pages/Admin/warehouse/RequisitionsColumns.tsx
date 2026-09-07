import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { AdminRequisition } from '@shared/api.interface';
import { AdminStatusBadge } from '../admin-enhance-constants';
import {
  formatWarehouseDate, formatWarehouseDateTime, WarehouseActionLink,
} from './warehouse-shared';

/* ============ 导出 Excel 行构造 ============ */

export const REQUISITIONS_EXPORT_HEADERS: string[] = [
  '领用单号', '申请人', '部门', '物品名称', '类型', '规格', '数量', '单位',
  '用途', '预计归还', '状态', '审批人', '审批时间', '出库时间', '备注',
];

export const buildRequisitionsExportRows = (
  items: AdminRequisition[],
): Record<string, string>[] => items.map((item: AdminRequisition) => ({
  领用单号: item.requisitionNo,
  申请人: item.applicant,
  部门: item.department,
  物品名称: item.itemName,
  类型: item.itemType,
  规格: item.specification,
  数量: String(item.quantity),
  单位: item.unit,
  用途: item.purpose,
  预计归还: formatWarehouseDate(item.expectedReturnDate),
  状态: item.status,
  审批人: item.approver,
  审批时间: formatWarehouseDateTime(item.approveTime),
  出库时间: formatWarehouseDateTime(item.outboundDate),
  备注: item.remark,
}));

/* ============ 表格列定义 ============ */

interface RequisitionsColumnHandlers {
  onApprove: (record: AdminRequisition) => void;
  onIssue: (record: AdminRequisition) => void;
  onCancel: (record: AdminRequisition) => void;
  onDelete: (record: AdminRequisition) => void;
}

export function buildRequisitionsColumns(
  handlers: RequisitionsColumnHandlers,
): TableColumnsType<AdminRequisition> {
  return [
    {
      key: 'wh-req-no', title: '领用单号', dataIndex: 'requisitionNo',
      width: 140, fixed: 'left',
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    { key: 'wh-req-applicant', title: '申请人', dataIndex: 'applicant', width: 90 },
    { key: 'wh-req-department', title: '部门', dataIndex: 'department', width: 110 },
    { key: 'wh-req-item', title: '物品名称', dataIndex: 'itemName', width: 130 },
    { key: 'wh-req-type', title: '类型', dataIndex: 'itemType', width: 90 },
    { key: 'wh-req-spec', title: '规格', dataIndex: 'specification', width: 110 },
    {
      key: 'wh-req-qty', title: '数量', dataIndex: 'quantity',
      width: 80, align: 'right',
      render: (value: number, record: AdminRequisition) => (
        <span className="font-mono">{value} {record.unit}</span>
      ),
    },
    { key: 'wh-req-purpose', title: '用途', dataIndex: 'purpose', width: 130 },
    {
      key: 'wh-req-return', title: '预计归还', dataIndex: 'expectedReturnDate',
      width: 110,
      render: (value: string | null) => formatWarehouseDate(value),
    },
    {
      key: 'wh-req-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    { key: 'wh-req-approver', title: '审批人', dataIndex: 'approver', width: 90 },
    {
      key: 'wh-req-approveTime', title: '审批时间', dataIndex: 'approveTime',
      width: 170,
      render: (value: string | null) => formatWarehouseDateTime(value),
    },
    {
      key: 'wh-req-outbound', title: '出库时间', dataIndex: 'outboundDate',
      width: 170,
      render: (value: string | null) => formatWarehouseDateTime(value),
    },
    { key: 'wh-req-remark', title: '审批备注', dataIndex: 'approveRemark', width: 130 },
    {
      key: 'wh-req-actions', title: '操作', width: 200, fixed: 'right',
      render: (_: unknown, record: AdminRequisition) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待审批' ? (
            <WarehouseActionLink onClick={() => handlers.onApprove(record)}>
              审批
            </WarehouseActionLink>
          ) : null}
          {record.status === '已通过' ? (
            <WarehouseActionLink onClick={() => handlers.onIssue(record)}>
              领用确认
            </WarehouseActionLink>
          ) : null}
          {record.status === '待审批' || record.status === '已通过' ? (
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
