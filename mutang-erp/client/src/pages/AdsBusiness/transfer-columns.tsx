import dayjs from 'dayjs';
import { BadgeCheck, Eye, Trash2 } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import type { AdTransfer } from '@shared/api.interface';
import { AdStatusBadge } from './ads-constants';

interface TransferColumnHandlers {
  onDetail: (item: AdTransfer) => void;
  onApprove: (item: AdTransfer) => void;
  onDelete: (item: AdTransfer) => void;
}

export function buildTransferColumns(
  handlers: TransferColumnHandlers,
): TableColumnsType<AdTransfer> {
  return [
    {
      title: '转户编号',
      dataIndex: 'transferNo',
      fixed: 'left',
      width: 150,
      render: (value: string) => (
        <span className="font-mono font-bold text-primary">{value}</span>
      ),
    },
    {
      title: '账户',
      dataIndex: 'accountName',
      width: 160,
      render: (value: string) => <span className="font-bold">{value}</span>,
    },
    { title: '原主体', dataIndex: 'fromSubject', width: 140 },
    { title: '目标主体', dataIndex: 'toSubject', width: 140 },
    { title: '原端口', dataIndex: 'fromPort', width: 90 },
    { title: '目标端口', dataIndex: 'toPort', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: AdTransfer['status']) => <AdStatusBadge status={value} />,
    },
    {
      title: '申请人',
      dataIndex: 'applicant',
      width: 130,
      render: (value: string) =>
        value ? <UserDisplay value={[value]} size="small" /> : '-',
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 150,
      render: (value: string) => (
        <span className="font-mono text-xs">
          {dayjs(value).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_: unknown, record: AdTransfer) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onDetail(record)}
          >
            <Eye className="h-3.5 w-3.5" />
            详情
          </Button>
          {record.status === '待审批' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onApprove(record)}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              审批
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
