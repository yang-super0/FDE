import { cn } from '@client/src/lib/utils';

export const FILTER_ALL: string = 'all';

export function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* ============ 选项 ============ */

export const PLATFORM_OPTIONS: string[] = [
  '巨量千川',
  '抖音',
  '快手',
  '微信',
  '其他',
];

export const PORT_TYPE_OPTIONS: string[] = ['内部', '外部', '集团'];

export const ACCOUNT_TYPE_OPTIONS: string[] = ['普通户', '特殊户'];

export const INDUSTRY_OPTIONS: string[] = [
  '互联网',
  '零售消费',
  '教育培训',
  '金融服务',
  '智能制造',
  '医疗健康',
  '房地产',
  '其他',
];

export const APPLICATION_STATUS_OPTIONS: string[] = [
  '待审批',
  '通过',
  '驳回',
  '已开户',
  '取消',
];

export const ACCOUNT_STATUS_OPTIONS: string[] = [
  '正常',
  '暂停',
  '欠费',
  '注销',
];

export const FILING_STATUS_OPTIONS: string[] = [
  '待审核',
  '通过',
  '驳回',
  '已报备',
];

export const TRANSFER_STATUS_OPTIONS: string[] = [
  '待审批',
  '通过',
  '驳回',
  '已转户',
  '取消',
];

export const RULE_TYPE_OPTIONS: string[] = ['按比例', '固定金额', '阶梯'];

export const RULE_STATUS_OPTIONS: string[] = ['启用', '停用'];

export const RECORD_STATUS_OPTIONS: string[] = ['待发放', '已发放', '取消'];

/* 余额低于该阈值时红色高亮 */
export const LOW_BALANCE_THRESHOLD: number = 500;

/* ============ 状态徽章：零圆角 + 语义浅底文字色 ============ */

const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

/* 待审批/待审核/待发放=灰；通过/正常/已报备/已开户/已发放/启用=绿；
   驳回/欠费/取消/停用/注销=红；已转户/暂停=蓝或橙浅底 */
const AD_STATUS_CLASS: Record<string, string> = {
  待审批: 'bg-slate-100 text-slate-500',
  待审核: 'bg-slate-100 text-slate-500',
  待发放: 'bg-slate-100 text-slate-500',
  通过: 'bg-[#ECFDF5] text-[#10B981]',
  正常: 'bg-[#ECFDF5] text-[#10B981]',
  已报备: 'bg-[#ECFDF5] text-[#10B981]',
  已开户: 'bg-[#ECFDF5] text-[#10B981]',
  已发放: 'bg-[#ECFDF5] text-[#10B981]',
  启用: 'bg-[#ECFDF5] text-[#10B981]',
  驳回: 'bg-[#FEF2F2] text-[#EF4444]',
  欠费: 'bg-[#FEF2F2] text-[#EF4444]',
  取消: 'bg-[#FEF2F2] text-[#EF4444]',
  停用: 'bg-[#FEF2F2] text-[#EF4444]',
  注销: 'bg-[#FEF2F2] text-[#EF4444]',
  已转户: 'bg-[#EFF6FF] text-[#0033A0]',
  暂停: 'bg-[#FFF7ED] text-[#F97316]',
};

export function AdStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        BADGE_BASE,
        AD_STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-500',
      )}
    >
      {status}
    </span>
  );
}

/* 金额格式化 */
export function formatMoney(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
