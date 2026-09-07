import dayjs from 'dayjs';
import { Banknote, Eye, Trash2 } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import type { CommissionRecord } from '@shared/api.interface';
import { AdStatusBadge, formatMoney } from './ads-constants';

interface RecordColumnHandlers {
  onDetail: (item: CommissionRecord) => void;
  onPay: (item: CommissionRecord) => void;
  onDelete: (item: CommissionRecord) => void;
}

function formatDateTime(value: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';
}

export function buildRecordColumns(
  handlers: RecordColumnHandlers,
): TableColumnsType<CommissionRecord> {
  return [
    {
      title: '记录编号',
      dataIndex: 'recordNo',
      fixed: 'left',
      width: 150,
      render: (value: string) => (
        <span className="font-mono font-bold text-primary">{value}</span>
      ),
    },
    {
      title: '商务',
      dataIndex: 'salesperson',
      width: 130,
      render: (value: string) =>
        value ? <UserDisplay value={[value]} size="small" /> : '-',
    },
    {
      title: '账户',
      dataIndex: 'accountName',
      width: 160,
      render: (value: string) => <span className="font-bold">{value}</span>,
    },
    { title: '集团', dataIndex: 'groupName', width: 140 },
    { title: '平台', dataIndex: 'platform', width: 100 },
    {
      title: '周期',
      dataIndex: 'period',
      width: 100,
      render: (value: string) => (
        <span className="font-mono text-xs">{value}</span>
      ),
    },
    {
      title: '消耗金额',
      dataIndex: 'consumeAmount',
      width: 130,
      render: (value: number) => (
        <span className="font-mono">¥{formatMoney(value)}</span>
      ),
    },
    {
      title: '提成金额',
      dataIndex: 'commissionAmount',
      width: 130,
      render: (value: number) => (
        <span className="font-mono font-bold text-primary">
          ¥{formatMoney(value)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: CommissionRecord['status']) => (
        <AdStatusBadge status={value} />
      ),
    },
    {
      title: '计算时间',
      dataIndex: 'calculatedAt',
      width: 150,
      render: (value: string | null) => (
        <span className="font-mono text-xs">{formatDateTime(value)}</span>
      ),
    },
    {
      title: '发放时间',
      dataIndex: 'paidAt',
      width: 150,
      render: (value: string | null) => (
        <span className="font-mono text-xs">{formatDateTime(value)}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_: unknown, record: CommissionRecord) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onDetail(record)}
          >
            <Eye className="h-3.5 w-3.5" />
            详情
          </Button>
          {record.status === '待发放' ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => handlers.onPay(record)}
            >
              <Banknote className="h-3.5 w-3.5" />
              发放
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => handlers.onDelete(record)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </Button>
        </div>
      ),
    },
  ];
}
