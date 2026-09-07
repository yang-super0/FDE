import type { CustomerStatus, OpportunityStage } from '@shared/api.interface';
import type { StatusTone } from '@client/src/components/blueprint';

export const INDUSTRY_OPTIONS: string[] = [
  '互联网',
  '制造业',
  '教育培训',
  '金融',
  '零售电商',
  '医疗健康',
  '房地产',
  '其他',
];

export const SOURCE_OPTIONS: string[] = [
  '广告投放',
  '客户转介绍',
  '展会活动',
  '电话开发',
  '渠道合作',
  '其他',
];

export const FOLLOW_METHOD_OPTIONS: string[] = [
  '电话',
  '微信',
  '拜访',
  '会议',
  '邮件',
  '其他',
];

export const STATUS_META: Record<
  CustomerStatus,
  { label: string; tone: StatusTone }
> = {
  potential: { label: '潜在', tone: 'info' },
  active: { label: '活跃', tone: 'success' },
  churned: { label: '流失', tone: 'danger' },
};

export const STAGE_COLUMNS: Array<{
  value: OpportunityStage;
  label: string;
}> = [
  { value: 'contact', label: '初步接触' },
  { value: 'requirement', label: '需求确认' },
  { value: 'quotation', label: '方案报价' },
  { value: 'closed', label: '签约成交' },
];
