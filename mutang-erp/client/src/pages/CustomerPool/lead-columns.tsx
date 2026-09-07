import dayjs from 'dayjs';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import type { Lead, LeadStatus } from '@shared/api.interface';
import { LeadStatusBadge } from './constants';

interface LeadColumnHandlers {
  onDetail: (lead: Lead) => void;
  onFollowUp: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onAbandon: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

export function buildLeadColumns(
  handlers: LeadColumnHandlers,
): TableColumnsType<Lead> {
  return [
    {
      title: '线索名称',
      dataIndex: 'leadName',
      fixed: 'left',
      width: 180,
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      width: 100,
      render: (value: string) => value || '-',
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      width: 130,
      render: (value: string) => (
        <span className="font-mono">{value || '-'}</span>
      ),
    },
    {
      title: '行业',
      dataIndex: 'industry',
      width: 100,
      render: (value: string) => value || '-',
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 100,
      render: (value: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: LeadStatus) => <LeadStatusBadge status={value} />,
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      width: 130,
      render: (value: string) =>
        value ? <UserDisplay value={[value]} size="small" /> : '-',
    },
    {
      title: '下次跟进',
      dataIndex: 'nextFollowUpAt',
      width: 150,
      render: (value: string | null) => (
        <span className="font-mono text-xs">
          {value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'}
        </span>
      ),
    },
    {
      title: '创建时间',
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
      width: 280,
      render: (_: unknown, record: Lead) => {
        const closed: boolean =
          record.status === '已转化' || record.status === '已放弃';
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onDetail(record)}
            >
              查看
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={closed}
              onClick={() => handlers.onFollowUp(record)}
            >
              跟进
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={closed}
              onClick={() => handlers.onConvert(record)}
            >
              转化
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={closed}
              onClick={() => handlers.onAbandon(record)}
            >
              放弃
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => handlers.onDelete(record)}
            >
              删除
            </Button>
          </div>
        );
      },
    },
  ];
}
