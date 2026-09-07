import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { HrInterview } from '@shared/api.interface';
import { HrStatusBadge } from '../hr-enhance-constants';
import {
  RecruitActionLink, formatHrDateTime,
} from './recruitment-shared';

interface InterviewsColumnHandlers {
  onEdit: (record: HrInterview) => void;
  onEvaluate: (record: HrInterview) => void;
  onOffer: (record: HrInterview) => void;
  onDelete: (record: HrInterview) => void;
}

export function buildInterviewsColumns(
  handlers: InterviewsColumnHandlers,
): TableColumnsType<HrInterview> {
  return [
    {
      key: 'hr-interviews-no', title: '面试编号', dataIndex: 'interviewNo',
      width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'hr-interviews-candidate', title: '候选人', dataIndex: 'candidateName', width: 100 },
    { key: 'hr-interviews-position', title: '职位', dataIndex: 'position', width: 110 },
    { key: 'hr-interviews-interviewer', title: '面试官', dataIndex: 'interviewer', width: 100 },
    { key: 'hr-interviews-round', title: '面试轮次', dataIndex: 'interviewRound', width: 90 },
    {
      key: 'hr-interviews-time', title: '面试时间', dataIndex: 'interviewTime', width: 170,
      render: (value: string | null) => formatHrDateTime(value),
    },
    {
      key: 'hr-interviews-result', title: '结果', dataIndex: 'result', width: 90,
      render: (value: string) => (value ? <HrStatusBadge status={value} /> : '—'),
    },
    {
      key: 'hr-interviews-scoreProfessional', title: '专业分', dataIndex: 'scoreProfessional',
      width: 80, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'hr-interviews-scoreCommunication', title: '沟通分', dataIndex: 'scoreCommunication',
      width: 80, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'hr-interviews-scoreGeneral', title: '综合分', dataIndex: 'scoreGeneral',
      width: 80, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'hr-interviews-offerStatus', title: 'offer状态', dataIndex: 'offerStatus', width: 100,
      render: (value: string) => (value ? <HrStatusBadge status={value} /> : '—'),
    },
    { key: 'hr-interviews-evaluation', title: '评价', dataIndex: 'evaluation', width: 180 },
    { key: 'hr-interviews-remark', title: '备注', dataIndex: 'remark', width: 120 },
    {
      key: 'hr-interviews-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (value: string) => formatHrDateTime(value),
    },
    {
      key: 'hr-interviews-actions', title: '操作', width: 230, fixed: 'right',
      render: (_: unknown, record: HrInterview) => (
        <div className="flex flex-wrap items-center gap-1">
          <RecruitActionLink onClick={() => handlers.onEvaluate(record)}>
            评价
          </RecruitActionLink>
          <RecruitActionLink onClick={() => handlers.onOffer(record)}>
            offer
          </RecruitActionLink>
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
