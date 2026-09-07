import dayjs from 'dayjs';
import type { HrResume } from '@shared/api.interface';

export const RESUME_EXPORT_HEADERS: string[] = [
  '简历编号', '候选人', '性别', '电话', '邮箱', '应聘职位', '部门', '来源',
  '工作年限', '学历', '标签', '状态', '评分', '创建时间',
];

export function buildResumeExportRows(
  items: HrResume[],
): Record<string, string>[] {
  return items.map((item: HrResume) => ({
    简历编号: item.resumeNo,
    候选人: item.candidateName,
    性别: item.gender,
    电话: item.phone,
    邮箱: item.email,
    应聘职位: item.positionApplied,
    部门: item.department,
    来源: item.source,
    工作年限: String(item.workYears),
    学历: item.education,
    标签: item.tags,
    状态: item.status,
    评分: String(item.rating),
    创建时间: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  }));
}
