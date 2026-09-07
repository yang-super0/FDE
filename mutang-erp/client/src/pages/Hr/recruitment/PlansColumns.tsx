import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { HrRecruitmentPlan } from '@shared/api.interface';
import { HrStatusBadge } from '../hr-enhance-constants';
import {
  RecruitActionLink, formatHrDate, formatHrDateTime,
} from './recruitment-shared';

export type PlanAction = 'start' | 'complete' | 'cancel' | 'delete';

export const PLAN_ACTION_TEXT: Record<PlanAction, string> = {
  start: '开始招聘', complete: '完成', cancel: '取消', delete: '删除',
};

export const PLAN_ACTION_STATUS: Record<PlanAction, string> = {
  start: '招聘中', complete: '已完成', cancel: '已取消', delete: '',
};

interface PlansColumnHandlers {
  onEdit: (record: HrRecruitmentPlan) => void;
  onAction: (record: HrRecruitmentPlan, action: PlanAction) => void;
}

export function buildPlansColumns(
  handlers: PlansColumnHandlers,
): TableColumnsType<HrRecruitmentPlan> {
  return [
    {
      key: 'hr-plans-no', title: '计划编号', dataIndex: 'planNo', width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'hr-plans-name', title: '计划名称', dataIndex: 'planName', width: 160 },
    { key: 'hr-plans-department', title: '部门', dataIndex: 'department', width: 110 },
    { key: 'hr-plans-position', title: '职位', dataIndex: 'position', width: 110 },
    {
      key: 'hr-plans-headcount', title: '需求人数', dataIndex: 'headcount',
      width: 90, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'hr-plans-hiredCount', title: '已入职', dataIndex: 'hiredCount',
      width: 80, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    { key: 'hr-plans-priority', title: '优先级', dataIndex: 'priority', width: 80 },
    {
      key: 'hr-plans-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <HrStatusBadge status={value} />,
    },
    {
      key: 'hr-plans-startDate', title: '开始日期', dataIndex: 'startDate', width: 110,
      render: (value: string | null) => formatHrDate(value),
    },
    {
      key: 'hr-plans-endDate', title: '结束日期', dataIndex: 'endDate', width: 110,
      render: (value: string | null) => formatHrDate(value),
    },
    { key: 'hr-plans-description', title: '需求描述', dataIndex: 'requirementDescription', width: 200 },
    {
      key: 'hr-plans-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (value: string) => formatHrDateTime(value),
    },
    {
      key: 'hr-plans-actions', title: '操作', width: 230, fixed: 'right',
      render: (_: unknown, record: HrRecruitmentPlan) => (
        <div className="flex flex-wrap items-center gap-1">
          {record.status === '规划中' ? (
            <RecruitActionLink onClick={() => handlers.onAction(record, 'start')}>
              开始招聘
            </RecruitActionLink>
          ) : null}
          {record.status === '招聘中' ? (
            <RecruitActionLink onClick={() => handlers.onAction(record, 'complete')}>
              完成
            </RecruitActionLink>
          ) : null}
          {record.status === '规划中' || record.status === '招聘中' ? (
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
