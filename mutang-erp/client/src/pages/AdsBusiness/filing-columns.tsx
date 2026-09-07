import dayjs from 'dayjs';
import { BadgeCheck, Eye, Trash2 } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import type { AdFiling } from '@shared/api.interface';
import { AdStatusBadge } from './ads-constants';

interface FilingColumnHandlers {
  onDetail: (item: AdFiling) => void;
  onReview: (item: AdFiling) => void;
  onDelete: (item: AdFiling) => void;
}

export function buildFilingColumns(
  handlers: FilingColumnHandlers,
): TableColumnsType<AdFiling> {
  return [
    {
      title: '报备编号',
      dataIndex: 'filingNo',
      fixed: 'left',
      width: 150,
      render: (value: string) => (
        <span className="font-mono font-bold text-primary">{value}</span>
      ),
    },
    {
      title: '关联账户',
      dataIndex: 'accountName',
      width: 160,
      render: (value: string) => <span className="font-bold">{value}</span>,
    },
    { title: '集团', dataIndex: 'groupName', width: 140 },
    { title: '主体', dataIndex: 'subjectName', width: 140 },
    { title: '平台', dataIndex: 'platform', width: 100 },
    { title: '行业', dataIndex: 'industry', width: 100 },
    { title: '产品名称', dataIndex: 'productName', width: 150 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: AdFiling['status']) => <AdStatusBadge status={value} />,
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
      width: 200,
      render: (_: unknown, record: AdFiling) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onDetail(record)}
          >
            <Eye className="h-3.5 w-3.5" />
            详情
          </Button>
          {record.status === '待审核' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onReview(record)}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              审核
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
