import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { AdminReturnRecord } from '@shared/api.interface';
import { AdminStatusBadge } from '../admin-enhance-constants';
import {
  formatWarehouseDate, WarehouseActionLink,
} from './warehouse-shared';

interface ReturnsColumnHandlers {
  onConfirm: (record: AdminReturnRecord) => void;
  onDelete: (record: AdminReturnRecord) => void;
}

export function buildReturnsColumns(
  handlers: ReturnsColumnHandlers,
): TableColumnsType<AdminReturnRecord> {
  return [
    {
      key: 'wh-return-no', title: '归还单号', dataIndex: 'returnNo',
      width: 140, fixed: 'left',
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    {
      key: 'wh-return-req', title: '领用单ID', dataIndex: 'requisitionId',
      width: 100, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    { key: 'wh-return-item', title: '物品名称', dataIndex: 'itemName', width: 130 },
    { key: 'wh-return-type', title: '类型', dataIndex: 'itemType', width: 90 },
    { key: 'wh-return-spec', title: '规格', dataIndex: 'specification', width: 110 },
    {
      key: 'wh-return-qty', title: '归还数量', dataIndex: 'quantity',
      width: 90, align: 'right',
      render: (value: number, record: AdminReturnRecord) => (
        <span className="font-mono">{value} {record.unit}</span>
      ),
    },
    {
      key: 'wh-return-date', title: '归还日期', dataIndex: 'returnDate',
      width: 110,
      render: (value: string | null) => formatWarehouseDate(value),
    },
    { key: 'wh-return-operator', title: '经办人', dataIndex: 'operator', width: 90 },
    {
      key: 'wh-return-condition', title: '物品状况', dataIndex: 'condition',
      width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    {
      key: 'wh-return-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <AdminStatusBadge status={value} />,
    },
    { key: 'wh-return-damage', title: '损坏说明', dataIndex: 'damageRemark', width: 130 },
    { key: 'wh-return-remark', title: '备注', dataIndex: 'remark', width: 130 },
    {
      key: 'wh-return-actions', title: '操作', width: 130, fixed: 'right',
      render: (_: unknown, record: AdminReturnRecord) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待确认' ? (
            <WarehouseActionLink onClick={() => handlers.onConfirm(record)}>
              确认归还
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
