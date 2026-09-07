import type { MouseEvent } from 'react';
import {
  Table,
  type TableProps,
} from '@lark-apaas/client-toolkit/antd-table';
import type { Contract, ContractStatus } from '@shared/api.interface';
import { StatusBadge } from '@client/src/components/blueprint';
import { useFieldPermissions } from '@client/src/hooks/useFieldPermissions';
import { Button } from '@client/src/components/ui/button';
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  formatAmount,
  formatDate,
} from './contract-ui';

interface ContractTableProps {
  items: Contract[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  approving: boolean;
  onPageChange: (page: number) => void;
  onDetail: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
  rowSelection?: TableProps<Contract>['rowSelection'];
}

const ContractTable = ({
  items,
  total,
  loading,
  page,
  pageSize,
  approving,
  onPageChange,
  onDetail,
  onApprove,
  onReject,
  onDelete,
  rowSelection,
}: ContractTableProps) => {
  const { fields: permFields } = useFieldPermissions('合同');
  const columns: TableProps<Contract>['columns'] = [
    {
      title: '合同编号',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      render: (code: string, record: Contract) => (
        <button
          type="button"
          className="text-left font-bold text-primary hover:underline"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onDetail(record.id);
          }}
        >
          {code}
        </button>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 120,
    },
    ...(permFields.get('contract_amount')?.visible !== false
      ? [{
          title: '金额（元）',
          dataIndex: 'amount',
          key: 'amount',
          width: 160,
          align: 'right' as const,
          render: (amount: number | string | null) => (
            <span className="font-mono">
              {amount == null
                ? '-'
                : typeof amount === 'string'
                  ? amount
                  : formatAmount(amount)}
            </span>
          ),
        }]
      : []),
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (status: ContractStatus, record: Contract) => (
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge tone={CONTRACT_STATUS_TONE[status]}>
            {CONTRACT_STATUS_LABEL[status]}
          </StatusBadge>
          {record.expiringSoon ? (
            <StatusBadge tone="warning">即将到期</StatusBadge>
          ) : null}
        </div>
      ),
    },
    {
      title: '到期日',
      dataIndex: 'expireDate',
      key: 'expireDate',
      width: 120,
      render: (expireDate: string) => formatDate(expireDate),
    },
    {
      title: '操作',
      key: 'action',
      width: 210,
      fixed: 'right',
      render: (_: unknown, record: Contract) => (
        <div
          className="flex gap-2"
          onClick={(event: MouseEvent<HTMLDivElement>) =>
            event.stopPropagation()
          }
        >
          {record.status === 'pending' ? (
            <>
              <Button
                size="sm"
                disabled={approving}
                onClick={() => onApprove(record.id)}
              >
                通过
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={approving}
                onClick={() => onReject(record)}
              >
                驳回
              </Button>
            </>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(record)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={items}
      loading={loading}
      rowKey="id"
      rowSelection={rowSelection}
      scroll={{ x: 1060, y: 520 }}
      onRow={(record: Contract) => ({
        onClick: () => onDetail(record.id),
        className: 'cursor-pointer',
      })}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        onChange: onPageChange,
      }}
    />
  );
};

export { ContractTable };
