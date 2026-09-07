import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { LoginLog } from '@shared/api.interface';
import { cn } from '@client/src/lib/utils';
import { WarehouseActionLink } from '@client/src/pages/Admin/warehouse/warehouse-shared';
import { formatSystemEnhanceDateTime } from '../system-enhance-shared';

export const LOGIN_LOG_STATUS_OPTIONS: string[] = ['成功', '失败'];

export const LOGIN_LOG_TYPE_OPTIONS: string[] = [
  '账号密码',
  '短信验证码',
  '飞书扫码',
];

export const LOGIN_LOG_EXPORT_HEADERS: string[] = [
  '日志编号',
  '用户',
  '登录方式',
  '状态',
  '失败原因',
  'IP地址',
  '归属地',
  '设备',
  '风险标记',
  '登录时间',
];

/* ============ 登录状态徽章（成功绿 / 失败红 / 其他灰） ============ */

const LOGIN_STATUS_CLASS: Record<string, string> = {
  成功: 'bg-[#ECFDF5] text-[#10B981]',
  失败: 'bg-[#FEF2F2] text-[#EF4444]',
};

export function LoginStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold',
        LOGIN_STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-500',
      )}
    >
      {status}
    </span>
  );
}

/* ============ 风险标记小徽章（红/黄） ============ */

const RISK_RED_KEYWORDS: string[] = ['异地', '暴力', '锁定', '异常'];

export function LoginRiskFlagBadge({ flag }: { flag: string }) {
  const isRed: boolean = RISK_RED_KEYWORDS.some((keyword: string) =>
    flag.includes(keyword),
  );
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold',
        isRed
          ? 'bg-[#FEF2F2] text-[#EF4444]'
          : 'bg-[#FFFBEB] text-[#D97706]',
      )}
    >
      {flag}
    </span>
  );
}

export function buildLoginLogExportRows(
  items: LoginLog[],
): Record<string, string>[] {
  return items.map((item: LoginLog) => ({
    日志编号: item.logNo,
    用户: item.username,
    登录方式: item.loginType,
    状态: item.loginStatus,
    失败原因: item.failReason ?? '',
    IP地址: item.ipAddress ?? '',
    归属地: item.ipLocation ?? '',
    设备: item.deviceInfo ?? '',
    风险标记: item.riskFlags.join('、'),
    登录时间: item.createdAt,
  }));
}

interface LoginLogColumnHandlers {
  onView: (record: LoginLog) => void;
  onDelete: (record: LoginLog) => void;
}

export function buildLoginLogColumns(
  handlers: LoginLogColumnHandlers,
): TableColumnsType<LoginLog> {
  return [
    {
      key: 'll-log-no',
      title: '日志编号',
      dataIndex: 'logNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    {
      key: 'll-username',
      title: '用户',
      dataIndex: 'username',
      width: 110,
    },
    {
      key: 'll-login-type',
      title: '登录方式',
      dataIndex: 'loginType',
      width: 100,
    },
    {
      key: 'll-login-status',
      title: '状态',
      dataIndex: 'loginStatus',
      width: 80,
      render: (value: string) => <LoginStatusBadge status={value} />,
    },
    {
      key: 'll-fail-reason',
      title: '失败原因',
      dataIndex: 'failReason',
      width: 130,
      render: (value: string | null) => value ?? '—',
    },
    {
      key: 'll-ip',
      title: 'IP地址',
      dataIndex: 'ipAddress',
      width: 130,
      render: (value: string | null) => (
        <span className="font-mono text-xs">{value ?? '—'}</span>
      ),
    },
    {
      key: 'll-location',
      title: '归属地',
      dataIndex: 'ipLocation',
      width: 110,
      render: (value: string | null) => value ?? '—',
    },
    {
      key: 'll-device',
      title: '设备',
      dataIndex: 'deviceInfo',
      width: 140,
      render: (value: string | null) => (
        <span className="break-words">{value ?? '—'}</span>
      ),
    },
    {
      key: 'll-risk-flags',
      title: '风险标记',
      dataIndex: 'riskFlags',
      width: 160,
      render: (value: string[]) =>
        value.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {value.map((flag: string) => (
              <LoginRiskFlagBadge key={flag} flag={flag} />
            ))}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'll-created-at',
      title: '登录时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (value: string) => (
        <span className="font-mono text-xs">
          {formatSystemEnhanceDateTime(value)}
        </span>
      ),
    },
    {
      key: 'll-actions',
      title: '操作',
      width: 110,
      fixed: 'right',
      render: (_: unknown, record: LoginLog) => (
        <div className="flex items-center gap-1">
          <WarehouseActionLink onClick={() => handlers.onView(record)}>
            详情
          </WarehouseActionLink>
          <WarehouseActionLink
            danger
            onClick={() => handlers.onDelete(record)}
          >
            删除
          </WarehouseActionLink>
        </div>
      ),
    },
  ];
}
