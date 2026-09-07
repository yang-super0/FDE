import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { CustomerAccount } from '@shared/api.interface';
import { WarehouseActionLink } from '@client/src/pages/Admin/warehouse/warehouse-shared';
import {
  formatSystemEnhanceDateTime,
  SystemEnhanceStatusBadge,
} from '../system-enhance-shared';

export const CUSTOMER_ACCOUNT_STATUS_OPTIONS: string[] = [
  '启用',
  '停用',
  '锁定',
];

export const CUSTOMER_ACCOUNT_EXPORT_HEADERS: string[] = [
  '账户编号',
  '客户名称',
  '用户名',
  '手机号',
  '邮箱',
  '状态',
  '最近登录时间',
  '登录次数',
  '备注',
];

export function buildCustomerAccountExportRows(
  items: CustomerAccount[],
): Record<string, string>[] {
  return items.map((item: CustomerAccount) => ({
    账户编号: item.accountNo,
    客户名称: item.customerName,
    用户名: item.username,
    手机号: item.phone ?? '',
    邮箱: item.email ?? '',
    状态: item.status,
    最近登录时间: item.lastLoginAt ?? '',
    登录次数: String(item.loginCount),
    备注: item.remark ?? '',
  }));
}

interface CustomerAccountColumnHandlers {
  onEdit: (record: CustomerAccount) => void;
  onResetPassword: (record: CustomerAccount) => void;
  onUnlock: (record: CustomerAccount) => void;
  onViewLoginLogs: (record: CustomerAccount) => void;
  onDelete: (record: CustomerAccount) => void;
}

export function buildCustomerAccountColumns(
  handlers: CustomerAccountColumnHandlers,
): TableColumnsType<CustomerAccount> {
  return [
    {
      key: 'ca-account-no',
      title: '账户编号',
      dataIndex: 'accountNo',
      width: 140,
      fixed: 'left',
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    {
      key: 'ca-customer-name',
      title: '客户名称',
      dataIndex: 'customerName',
      width: 160,
      render: (value: string) => (
        <span className="break-words">{value}</span>
      ),
    },
    {
      key: 'ca-username',
      title: '用户名',
      dataIndex: 'username',
      width: 120,
    },
    {
      key: 'ca-phone',
      title: '手机号',
      dataIndex: 'phone',
      width: 120,
      render: (value: string | null) => value ?? '—',
    },
    {
      key: 'ca-email',
      title: '邮箱',
      dataIndex: 'email',
      width: 170,
      render: (value: string | null) => (
        <span className="break-words">{value ?? '—'}</span>
      ),
    },
    {
      key: 'ca-status',
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value: string) => <SystemEnhanceStatusBadge status={value} />,
    },
    {
      key: 'ca-last-login-at',
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      width: 160,
      render: (value: string | null) => (
        <span className="font-mono text-xs">
          {formatSystemEnhanceDateTime(value)}
        </span>
      ),
    },
    {
      key: 'ca-login-count',
      title: '登录次数',
      dataIndex: 'loginCount',
      width: 90,
      align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'ca-remark',
      title: '备注',
      dataIndex: 'remark',
      width: 140,
      render: (value: string | null) => value ?? '—',
    },
    {
      key: 'ca-actions',
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_: unknown, record: CustomerAccount) => (
        <div className="flex flex-wrap items-center gap-1">
          <WarehouseActionLink onClick={() => handlers.onEdit(record)}>
            编辑
          </WarehouseActionLink>
          <WarehouseActionLink
            onClick={() => handlers.onResetPassword(record)}
          >
            重置密码
          </WarehouseActionLink>
          {record.status === '锁定' ? (
            <WarehouseActionLink onClick={() => handlers.onUnlock(record)}>
              解锁
            </WarehouseActionLink>
          ) : null}
          <WarehouseActionLink
            onClick={() => handlers.onViewLoginLogs(record)}
          >
            登录记录
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
