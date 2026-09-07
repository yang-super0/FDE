import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import dayjs from 'dayjs';
import type { Customer, CustomerStatus } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { StatusBadge } from '@client/src/components/blueprint';
import { STATUS_META } from './constants';

interface CustomerTableProps {
  data: Customer[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRowClick: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
}

const CustomerTable = ({
  data,
  total,
  loading,
  page,
  pageSize,
  onPageChange,
  onRowClick,
  onEdit,
}: CustomerTableProps) => {
  const columns: TableColumnsType<Customer> = [
    {
      title: '客户名称',
      dataIndex: 'name',
      width: 200,
      fixed: 'left',
      render: (name: string) => (
        <span className="font-bold text-primary">{name}</span>
      ),
    },
    { title: '行业', dataIndex: 'industry', width: 130 },
    { title: '联系人', dataIndex: 'contactName', width: 120 },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      width: 150,
      render: (phone: string) => <span className="font-mono">{phone}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: CustomerStatus) => (
        <StatusBadge tone={STATUS_META[status]?.tone ?? 'neutral'}>
          {STATUS_META[status]?.label ?? status}
        </StatusBadge>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (value: string) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_: unknown, record: Customer) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(record);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      scroll={{ x: 960, y: 500 }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: onPageChange,
      }}
      onRow={(record: Customer) => ({
        onClick: () => onRowClick(record),
        className: 'cursor-pointer',
      })}
    />
  );
};

export { CustomerTable };
export type { CustomerTableProps };
