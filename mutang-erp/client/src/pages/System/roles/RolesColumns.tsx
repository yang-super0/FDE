import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { SystemRole } from '@shared/api.interface';
import { WarehouseActionLink } from '@client/src/pages/Admin/warehouse/warehouse-shared';
import {
  SystemEnhanceStatusBadge,
  SystemEnhanceSystemFlagBadge,
} from '../system-enhance-shared';

export const ROLE_STATUS_OPTIONS: string[] = ['启用', '停用'];

export const ROLE_DATA_SCOPE_OPTIONS: string[] = [
  '全部数据',
  '本部门及下级',
  '本部门',
  '仅本人',
];

export const ROLE_EXPORT_HEADERS: string[] = [
  '角色编号',
  '角色名称',
  '角色编码',
  '数据权限',
  '权限数',
  '状态',
  '是否系统内置',
  '描述',
];

export function buildRoleExportRows(
  items: SystemRole[],
): Record<string, string>[] {
  return items.map((item: SystemRole) => ({
    角色编号: item.roleNo,
    角色名称: item.roleName,
    角色编码: item.roleCode,
    数据权限: item.dataScope,
    权限数: String(item.permissionCount),
    状态: item.status,
    是否系统内置: item.isSystem ? '系统内置' : '自定义',
    描述: item.description ?? '',
  }));
}

interface RoleColumnHandlers {
  onEdit: (record: SystemRole) => void;
  onPermissions: (record: SystemRole) => void;
  onCopy: (record: SystemRole) => void;
  onToggleStatus: (record: SystemRole) => void;
  onDelete: (record: SystemRole) => void;
}

export function buildRoleColumns(
  handlers: RoleColumnHandlers,
): TableColumnsType<SystemRole> {
  return [
    {
      key: 'sr-role-no',
      title: '角色编号',
      dataIndex: 'roleNo',
      width: 130,
      fixed: 'left',
      render: (value: string) => (
        <span className="font-bold text-primary">{value}</span>
      ),
    },
    {
      key: 'sr-role-name',
      title: '角色名称',
      dataIndex: 'roleName',
      width: 150,
    },
    {
      key: 'sr-role-code',
      title: '角色编码',
      dataIndex: 'roleCode',
      width: 130,
      render: (value: string) => (
        <span className="font-mono text-xs">{value}</span>
      ),
    },
    {
      key: 'sr-data-scope',
      title: '数据权限',
      dataIndex: 'dataScope',
      width: 110,
    },
    {
      key: 'sr-permission-count',
      title: '权限数',
      dataIndex: 'permissionCount',
      width: 80,
      align: 'right',
      render: (value: number) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'sr-status',
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value: string) => <SystemEnhanceStatusBadge status={value} />,
    },
    {
      key: 'sr-is-system',
      title: '内置角色',
      dataIndex: 'isSystem',
      width: 90,
      render: (value: boolean) => (
        <SystemEnhanceSystemFlagBadge isSystem={value} />
      ),
    },
    {
      key: 'sr-description',
      title: '描述',
      dataIndex: 'description',
      width: 180,
      render: (value: string | null) => (
        <span className="break-words">{value ?? '—'}</span>
      ),
    },
    {
      key: 'sr-actions',
      title: '操作',
      width: 300,
      fixed: 'right',
      render: (_: unknown, record: SystemRole) => (
        <div className="flex flex-wrap items-center gap-1">
          <WarehouseActionLink onClick={() => handlers.onEdit(record)}>
            编辑
          </WarehouseActionLink>
          <WarehouseActionLink
            onClick={() => handlers.onPermissions(record)}
          >
            权限配置
          </WarehouseActionLink>
          <WarehouseActionLink onClick={() => handlers.onCopy(record)}>
            复制
          </WarehouseActionLink>
          <WarehouseActionLink
            onClick={() => handlers.onToggleStatus(record)}
          >
            {record.status === '启用' ? '停用' : '启用'}
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
