import dayjs from 'dayjs';
import { BadgeCheck, Eye, Pencil, Trash2 } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import type { AdApplication } from '@shared/api.interface';
import { AdStatusBadge } from './ads-constants';

interface ApplicationColumnHandlers {
  onDetail: (item: AdApplication) => void;
  onApprove: (item: AdApplication) => void;
  onEdit: (item: AdApplication) => void;
  onDelete: (item: AdApplication) => void;
}

export function buildApplicationColumns(
  handlers: ApplicationColumnHandlers,
): TableColumnsType<AdApplication> {
  return [
    {
      title: '申请编号',
      dataIndex: 'applicationNo',
      fixed: 'left',
      width: 150,
      render: (value: string) => (
        <span className="font-mono font-bold text-primary">{value}</span>
      ),
    },
    { title: '集团', dataIndex: 'groupName', width: 150 },
    { title: '主体', dataIndex: 'subjectName', width: 150 },
    { title: '平台', dataIndex: 'platform', width: 100 },
    { title: '端口', dataIndex: 'portType', width: 80 },
    { title: '类型', dataIndex: 'accountType', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: AdApplication['status']) => (
        <AdStatusBadge status={value} />
      ),
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
      width: 230,
      render: (_: unknown, record: AdApplication) => (
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
          {record.status === '待审批' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onEdit(record)}
            >
              <Pencil className="h-3.5 w-3.5" />
              编辑
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
