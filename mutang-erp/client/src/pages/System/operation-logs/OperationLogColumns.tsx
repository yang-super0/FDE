import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { OperationLogEnhance } from '@shared/api.interface';
import { cn } from '@client/src/lib/utils';
import { WarehouseActionLink } from '@client/src/pages/Admin/warehouse/warehouse-shared';
import { ROLE_MENU_MODULES } from '../roles/RolePermissionDialog';
import { formatSystemEnhanceDateTime } from '../system-enhance-shared';

export const OPERATION_LOG_MODULE_OPTIONS: string[] = ROLE_MENU_MODULES;

export const OPERATION_LOG_OPERATION_OPTIONS: string[] = [
  '新增',
  '编辑',
  '删除',
  '导入',
  '导出',
  '审批',
  '归档',
  '登录',
];

export const OPERATION_LOG_RISK_OPTIONS: string[] = ['普通', '高风险'];

export const OPERATION_LOG_EXPORT_HEADERS: string[] = [
  '日志编号',
  '用户',
  '模块',
  '操作',
  '对象类型',
  '对象名称',
  '风险等级',
  'IP地址',
  '是否归档',
  '操作时间',
];

/* ============ 风险等级徽章（高风险红 / 中风险黄 / 低风险绿） ============ */

const RISK_CLASS: Record<string, string> = {
  高风险: 'bg-[#FEF2F2] text-[#EF4444]',
  普通: 'bg-slate-100 text-slate-500',
};

export function OperationLogRiskBadge({ riskLevel }: { riskLevel: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold',
        RISK_CLASS[riskLevel] ?? 'bg-slate-100 text-slate-500',
      )}
    >
      {riskLevel}
    </span>
  );
}

export function buildOperationLogExportRows(
  items: OperationLogEnhance[],
): Record<string, string>[] {
  return items.map((item: OperationLogEnhance) => ({
    日志编号: item.logNo,
    用户: item.username,
    模块: item.module,
    操作: item.operation,
    对象类型: item.targetType,
    对象名称: item.targetName ?? '',
    风险等级: item.riskLevel,
    IP地址: item.ipAddress ?? '',
    是否归档: item.archived ? '已归档' : '未归档',
    操作时间: item.createdAt,
  }));
}

interface OperationLogColumnHandlers {
  onView: (record: OperationLogEnhance) => void;
  onDelete: (record: OperationLogEnhance) => void;
}

export function buildOperationLogColumns(
  handlers: OperationLogColumnHandlers,
): TableColumnsType<OperationLogEnhance> {
  return [
    {
      key: 'ol-log-no',
      title: '日志编号',
      dataIndex: 'logNo',
      width: 150,
      fixed: 'left',
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    {
      key: 'ol-username',
      title: '用户',
      dataIndex: 'username',
      width: 110,
    },
    {
      key: 'ol-module',
      title: '模块',
      dataIndex: 'module',
      width: 100,
    },
    {
      key: 'ol-operation',
      title: '操作',
      dataIndex: 'operation',
      width: 80,
    },
    {
      key: 'ol-target',
      title: '对象',
      dataIndex: 'targetName',
      width: 170,
      render: (value: string | null, record: OperationLogEnhance) => (
        <div className="min-w-0">
          <div className="truncate">{value ?? '—'}</div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {record.targetType}
            {record.targetId ? ` #${record.targetId}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'ol-risk-level',
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 90,
      render: (value: string) => <OperationLogRiskBadge riskLevel={value} />,
    },
    {
      key: 'ol-ip',
      title: 'IP地址',
      dataIndex: 'ipAddress',
      width: 130,
      render: (value: string | null) => (
        <span className="font-mono text-xs">{value ?? '—'}</span>
      ),
    },
    {
      key: 'ol-created-at',
      title: '操作时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (value: string) => (
        <span className="font-mono text-xs">
          {formatSystemEnhanceDateTime(value)}
        </span>
      ),
    },
    {
      key: 'ol-archived',
      title: '归档',
      dataIndex: 'archived',
      width: 80,
      render: (value: boolean) =>
        value ? (
          <span className="inline-flex items-center rounded-[2px] bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            已归档
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'ol-actions',
      title: '操作',
      width: 110,
      fixed: 'right',
      render: (_: unknown, record: OperationLogEnhance) => (
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
