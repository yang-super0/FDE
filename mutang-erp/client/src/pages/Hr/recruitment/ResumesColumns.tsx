import { type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { HrResume } from '@shared/api.interface';
import { HrStatusBadge } from '../hr-enhance-constants';
import {
  RecruitActionLink, RecruitRatingEditor, RecruitRatingStars, formatHrDateTime,
} from './recruitment-shared';

interface ResumesColumnHandlers {
  onEdit: (record: HrResume) => void;
  onDelete: (record: HrResume) => void;
  onRating: (id: number, rating: number) => void;
}

export function buildResumesColumns(
  handlers: ResumesColumnHandlers,
): TableColumnsType<HrResume> {
  return [
    {
      key: 'hr-resumes-no', title: '简历编号', dataIndex: 'resumeNo', width: 140, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { key: 'hr-resumes-name', title: '候选人', dataIndex: 'candidateName', width: 100 },
    { key: 'hr-resumes-gender', title: '性别', dataIndex: 'gender', width: 70 },
    { key: 'hr-resumes-phone', title: '电话', dataIndex: 'phone', width: 120 },
    { key: 'hr-resumes-email', title: '邮箱', dataIndex: 'email', width: 170 },
    { key: 'hr-resumes-position', title: '应聘职位', dataIndex: 'positionApplied', width: 120 },
    { key: 'hr-resumes-department', title: '部门', dataIndex: 'department', width: 110 },
    { key: 'hr-resumes-source', title: '来源', dataIndex: 'source', width: 90 },
    {
      key: 'hr-resumes-workYears', title: '工作年限', dataIndex: 'workYears',
      width: 90, align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    { key: 'hr-resumes-education', title: '学历', dataIndex: 'education', width: 100 },
    { key: 'hr-resumes-tags', title: '标签', dataIndex: 'tags', width: 130 },
    {
      key: 'hr-resumes-status', title: '状态', dataIndex: 'status', width: 90,
      render: (value: string) => <HrStatusBadge status={value} />,
    },
    {
      key: 'hr-resumes-rating', title: '评分', dataIndex: 'rating', width: 150,
      render: (value: number, record: HrResume) => (
        <div className="flex flex-col gap-0.5">
          <RecruitRatingStars value={value} />
          <RecruitRatingEditor
            value={value}
            onSelect={(rating: number) => handlers.onRating(record.id, rating)}
          />
        </div>
      ),
    },
    {
      key: 'hr-resumes-createdAt', title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (value: string) => formatHrDateTime(value),
    },
    {
      key: 'hr-resumes-actions', title: '操作', width: 110, fixed: 'right',
      render: (_: unknown, record: HrResume) => (
        <div className="flex flex-wrap items-center gap-1">
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
