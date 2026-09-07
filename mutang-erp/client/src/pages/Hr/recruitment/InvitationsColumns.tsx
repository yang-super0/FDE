import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { HrInvitation } from '@shared/api.interface';
import { HrStatusBadge } from '../hr-enhance-constants';
import {
  RecruitActionLink, formatHrDateTime,
} from './recruitment-shared';

export type InvitationAction =
  'confirm' | 'complete' | 'cancel' | 'no-show' | 'delete';

export const INVITATION_ACTION_TEXT: Record<InvitationAction, string> = {
  confirm: '确认', complete: '完成', cancel: '取消', 'no-show': '未到场', delete: '删除',
};

export const INVITATION_ACTION_STATUS: Record<InvitationAction, string> = {
  confirm: '已确认', complete: '已完成', cancel: '已取消', 'no-show': '未到场', delete: '',
};

interface InvitationsColumnHandlers {
  onEdit: (record: HrInvitation) => void;
  onAction: (record: HrInvitation, action: InvitationAction) => void;
}

export function buildInvitationsColumns(
  handlers: InvitationsColumnHandlers,
): TableColumnsType<HrInvitation> {
  return [
    {
      key: 'hr-invitations-no', title: '邀约编号', dataIndex: 'invitationNo',
      width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'hr-invitations-candidate', title: '候选人', dataIndex: 'candidateName', width: 100 },
    { key: 'hr-invitations-position', title: '应聘职位', dataIndex: 'position', width: 110 },
    { key: 'hr-invitations-department', title: '部门', dataIndex: 'department', width: 110 },
    { key: 'hr-invitations-interviewer', title: '面试官', dataIndex: 'interviewer', width: 100 },
    { key: 'hr-invitations-type', title: '面试形式', dataIndex: 'interviewType', width: 90 },
    { key: 'hr-invitations-round', title: '面试轮次', dataIndex: 'interviewRound', width: 90 },
    {
      key: 'hr-invitations-scheduledTime', title: '面试时间', dataIndex: 'scheduledTime',
      width: 170,
      render: (value: string | null) => formatHrDateTime(value),
    },
    { key: 'hr-invitations-location', title: '地点', dataIndex: 'location', width: 130 },
    {
      key: 'hr-invitations-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <HrStatusBadge status={value} />,
    },
    { key: 'hr-invitations-remark', title: '备注', dataIndex: 'remark', width: 130 },
    {
      key: 'hr-invitations-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (value: string) => formatHrDateTime(value),
    },
    {
      key: 'hr-invitations-actions', title: '操作', width: 200, fixed: 'right',
      render: (_: unknown, record: HrInvitation) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '待确认' ? (
            <RecruitActionLink onClick={() => handlers.onAction(record, 'confirm')}>
              确认
            </RecruitActionLink>
          ) : null}
          {record.status === '已确认' ? (
            <>
              <RecruitActionLink onClick={() => handlers.onAction(record, 'complete')}>
                完成
              </RecruitActionLink>
              <RecruitActionLink onClick={() => handlers.onAction(record, 'no-show')}>
                未到场
              </RecruitActionLink>
            </>
          ) : null}
          {record.status === '待确认' || record.status === '已确认' ? (
            <RecruitActionLink onClick={() => handlers.onAction(record, 'cancel')}>
              取消
            </RecruitActionLink>
          ) : null}
          <RecruitActionLink onClick={() => handlers.onEdit(record)}>
            编辑
          </RecruitActionLink>
          <RecruitActionLink danger onClick={() => handlers.onAction(record, 'delete')}>
            删除
          </RecruitActionLink>
        </div>
      ),
    },
  ];
}
