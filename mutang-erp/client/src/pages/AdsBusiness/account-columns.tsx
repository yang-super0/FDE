import dayjs from 'dayjs';
import { Eye, Pencil, Trash2, Wallet } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import { cn } from '@client/src/lib/utils';
import type { AdAccount } from '@shared/api.interface';
import {
  AdStatusBadge,
  formatMoney,
  LOW_BALANCE_THRESHOLD,
} from './ads-constants';

interface AccountColumnHandlers {
  onDetail: (item: AdAccount) => void;
  onRecharge: (item: AdAccount) => void;
  onEdit: (item: AdAccount) => void;
  onDelete: (item: AdAccount) => void;
}

export function buildAccountColumns(
  handlers: AccountColumnHandlers,
): TableColumnsType<AdAccount> {
  return [
    {
      title: '账户编号',
      dataIndex: 'accountNo',
      fixed: 'left',
      width: 140,
      render: (value: string) => (
        <span className="font-mono font-bold text-primary">{value}</span>
      ),
    },
    {
      title: '账户名称',
      dataIndex: 'accountName',
      fixed: 'left',
      width: 160,
      render: (value: string) => <span className="font-bold">{value}</span>,
    },
    { title: '集团', dataIndex: 'groupName', width: 140 },
    { title: '主体', dataIndex: 'subjectName', width: 140 },
    { title: '平台', dataIndex: 'platform', width: 100 },
    { title: '端口', dataIndex: 'portType', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: AdAccount['status']) => <AdStatusBadge status={value} />,
    },
    {
      title: '余额',
      dataIndex: 'balance',
      width: 120,
      render: (value: number) => (
        <span
          className={cn(
            'font-mono font-bold',
            value < LOW_BALANCE_THRESHOLD && 'text-destructive',
          )}
        >
          {formatMoney(value)}
        </span>
      ),
    },
    {
      title: '累计充值',
      dataIndex: 'totalRecharge',
      width: 120,
      render: (value: number) => (
        <span className="font-mono">{formatMoney(value)}</span>
      ),
    },
    {
      title: '累计消耗',
      dataIndex: 'totalConsume',
      width: 120,
      render: (value: number) => (
        <span className="font-mono">{formatMoney(value)}</span>
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
      title: '开户时间',
      dataIndex: 'openedAt',
      width: 150,
      render: (value: string | null) => (
        <span className="font-mono text-xs">
          {value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 240,
      render: (_: unknown, record: AdAccount) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onDetail(record)}
          >
            <Eye className="h-3.5 w-3.5" />
            详情
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onRecharge(record)}
          >
            <Wallet className="h-3.5 w-3.5" />
            充值
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onEdit(record)}
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
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
