import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { HrCheckin } from '@shared/api.interface';
import { HrStatusBadge } from '../hr-enhance-constants';
import {
  RecruitActionLink, formatHrDateTime,
} from './recruitment-shared';

interface CheckinsColumnHandlers {
  onEdit: (record: HrCheckin) => void;
  onCheckin: (record: HrCheckin) => void;
  onDelete: (record: HrCheckin) => void;
}

export function buildCheckinsColumns(
  handlers: CheckinsColumnHandlers,
): TableColumnsType<HrCheckin> {
  return [
    {
      key: 'hr-checkins-no', title: '签到编号', dataIndex: 'checkinNo',
      width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'hr-checkins-candidate', title: '候选人', dataIndex: 'candidateName', width: 110 },
    { key: 'hr-checkins-type', title: '类型', dataIndex: 'type', width: 100 },
    {
      key: 'hr-checkins-checkinTime', title: '签到时间', dataIndex: 'checkinTime', width: 170,
      render: (value: string | null) => formatHrDateTime(value),
    },
    { key: 'hr-checkins-location', title: '地点', dataIndex: 'location', width: 150 },
    {
      key: 'hr-checkins-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <HrStatusBadge status={value} />,
    },
    {
      key: 'hr-checkins-relatedId', title: '关联ID', dataIndex: 'relatedId',
      width: 90, align: 'right',
      render: (value: number | null) => <span className="font-mono">{value ?? '—'}</span>,
    },
    { key: 'hr-checkins-remark', title: '备注', dataIndex: 'remark', width: 140 },
    {
      key: 'hr-checkins-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (value: string) => formatHrDateTime(value),
    },
    {
      key: 'hr-checkins-actions', title: '操作', width: 150, fixed: 'right',
      render: (_: unknown, record: HrCheckin) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '未签到' ? (
            <RecruitActionLink onClick={() => handlers.onCheckin(record)}>
              签到
            </RecruitActionLink>
          ) : null}
          <RecruitActionLink onClick={() => handlers.onEdit(record)}>
            编辑
          </RecruitActionLink>
          <RecruitActionLink danger onClick={() => handlers.onDelete(record)}>
            删除
          </RecruitActionLink>
        </div>
      ),
    },
  ];
}
