export interface MessageTypeOption {
  value: string;
  label: string;
}

/** 消息类型 Tab（value=all 表示不过滤） */
export const MESSAGE_TYPE_TABS: MessageTypeOption[] = [
  { value: 'all', label: '全部' },
  { value: 'approval', label: '审批提醒' },
  { value: 'warning', label: '预警通知' },
  { value: 'system', label: '系统通知' },
  { value: 'task', label: '任务提醒' },
];

/** 状态筛选（value=all 表示不过滤） */
export const MESSAGE_STATUS_OPTIONS: MessageTypeOption[] = [
  { value: 'all', label: '全部状态' },
  { value: 'unread', label: '未读' },
  { value: 'read', label: '已读' },
];

/** 推送状态筛选 */
export const PUSH_STATUS_OPTIONS: MessageTypeOption[] = [
  { value: 'all', label: '全部推送状态' },
  { value: 'pending', label: '待推送' },
  { value: 'pushed', label: '已推送' },
  { value: 'failed', label: '推送失败' },
];

/** 优先级选项（发送系统通知表单用） */
export const PRIORITY_OPTIONS: MessageTypeOption[] = [
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
  { value: 'low', label: '低' },
];

export const MESSAGE_TYPE_ALL = 'all';
export const MESSAGE_STATUS_UNREAD = 'unread';
export const MESSAGE_STATUS_READ = 'read';
export const PUSH_STATUS_PENDING = 'pending';
export const PUSH_STATUS_PUSHED = 'pushed';
export const PUSH_STATUS_FAILED = 'failed';
export const PRIORITY_HIGH = 'high';
export const PRIORITY_LOW = 'low';

/** 手动发送系统通知的目标类型（全员） */
export const NOTIFY_TARGET_ALL = 'ALL';
/** 手动发送系统通知使用的消息类型 */
export const NOTIFY_MSG_TYPE_SYSTEM = 'system';
/** 推送重试上限 */
export const PUSH_RETRY_MAX_ATTEMPTS = 3;

export function getMessageTypeLabel(msgType: string): string {
  const found = MESSAGE_TYPE_TABS.find(
    (opt: MessageTypeOption) => opt.value === msgType,
  );
  return found ? found.label : msgType;
}

export function getMessageStatusLabel(status: string): string {
  return status === MESSAGE_STATUS_READ ? '已读' : '未读';
}

export function getPriorityLabel(priority: string): string {
  if (priority === PRIORITY_HIGH) return '高';
  if (priority === PRIORITY_LOW) return '低';
  return '普通';
}

export function getPushStatusLabel(pushStatus: string): string {
  const found = PUSH_STATUS_OPTIONS.find(
    (opt: MessageTypeOption) => opt.value === pushStatus,
  );
  return found ? found.label : pushStatus;
}

/** 按 relatedModule 关键词解析跳转路由，无映射返回 null */
export function resolveRelatedRoute(relatedModule: string | null): string | null {
  if (!relatedModule) return null;
  const lower = relatedModule.toLowerCase();
  if (relatedModule.includes('合同') || lower.includes('contract')) {
    return '/contracts';
  }
  if (relatedModule.includes('客户') || relatedModule.includes('开户') || lower.includes('customer')) {
    return '/customers';
  }
  if (relatedModule.includes('采购') || lower.includes('procurement')) {
    return '/admin';
  }
  if (relatedModule.includes('报销') || lower.includes('expense')) {
    return '/finance/expenses';
  }
  if (relatedModule.includes('退款') || lower.includes('refund')) {
    return '/finance/payments';
  }
  if (relatedModule.includes('财务') || lower.includes('finance')) {
    return '/finance';
  }
  if (relatedModule.includes('任务') || lower.includes('task')) {
    return '/tasks';
  }
  return null;
}
