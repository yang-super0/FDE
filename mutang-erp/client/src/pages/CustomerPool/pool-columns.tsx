import dayjs from 'dayjs';
import { Ban, Eye, Hand, Pencil, Trash2, UserPlus } from 'lucide-react';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import type { PoolLead } from '@shared/api.interface';
import { PoolStatusBadge } from './constants';

interface PoolColumnHandlers {
  onDetail: (lead: PoolLead) => void;
  onEdit: (lead: PoolLead) => void;
  onClaim: (lead: PoolLead) => void;
  onAssign: (lead: PoolLead) => void;
  onInvalidate: (lead: PoolLead) => void;
  onDelete: (lead: PoolLead) => void;
}

export function buildPoolColumns(
  handlers: PoolColumnHandlers,
): TableColumnsType<PoolLead> {
  return [
    {
      title: '主体名称',
      dataIndex: 'subjectName',
      fixed: 'left',
      width: 180,
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    { title: '客资分层', dataIndex: 'leadLevel', width: 90 },
    { title: '一级行业', dataIndex: 'industry1', width: 100 },
    { title: '二级行业', dataIndex: 'industry2', width: 100 },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      width: 130,
      render: (value: string) => (
        <span className="font-mono">{value || '-'}</span>
      ),
    },
    {
      title: '分配状态',
      dataIndex: 'status',
      width: 90,
      render: (value: PoolLead['status']) => <PoolStatusBadge status={value} />,
    },
    {
      title: '分配给',
      dataIndex: 'assignedTo',
      width: 130,
      render: (value: string) =>
        value ? <UserDisplay value={[value]} size="small" /> : '-',
    },
    {
      title: '调入时间',
      dataIndex: 'createdAt',
      width: 150,
      render: (value: string) => (
        <span className="font-mono text-xs">
          {dayjs(value).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      width: 130,
      render: (value: string) =>
        value ? <UserDisplay value={[value]} size="small" /> : '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 230,
      render: (_: unknown, record: PoolLead) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onDetail(record)}
          >
            <Eye className="h-3.5 w-3.5" />
            查看
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onEdit(record)}
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
          {record.status === '未分配' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onClaim(record)}
            >
              <Hand className="h-3.5 w-3.5" />
              领取
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.onAssign(record)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            分配
          </Button>
          {record.status === '未分配' ||
          record.status === '已领取' ||
          record.status === '已分配' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlers.onInvalidate(record)}
            >
              <Ban className="h-3.5 w-3.5" />
              标记无效
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
