import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import type { SystemRole } from '@shared/api.interface';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import {
  WarehouseFilterSelect,
} from '@client/src/pages/Admin/warehouse/warehouse-shared';
import {
  deleteSystemRole,
  listSystemRoles,
  updateSystemRoleStatus,
} from '@client/src/api/system-enhance/roles';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';
import {
  ROLE_EXPORT_HEADERS,
  ROLE_STATUS_OPTIONS,
  buildRoleColumns,
  buildRoleExportRows,
} from './RolesColumns';
import { RoleCopyDialog, RoleFormDialog } from './RoleDialogs';
import { RolePermissionDialog } from './RolePermissionDialog';

const ROLE_PAGE_SIZE: number = 10;
const ROLE_EXPORT_LIMIT: number = 100;
const ROLE_FILTER_ALL: string = '__all__';

const RolesPanel = () => {
  const [status, setStatus] = useState<string>(ROLE_FILTER_ALL);
  const [roleName, setRoleName] = useState<string>('');
  const [roleCode, setRoleCode] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<SystemRole[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<SystemRole | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<SystemRole | null>(
    null,
  );
  const [copyTarget, setCopyTarget] = useState<SystemRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemRole | null>(null);

  const filterParams = useMemo(
    () => ({
      status: status !== ROLE_FILTER_ALL ? status : undefined,
      roleName: roleName.trim() || undefined,
      roleCode: roleCode.trim() || undefined,
    }),
    [status, roleName, roleCode],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listSystemRoles({
        ...filterParams,
        page: String(page),
        pageSize: String(ROLE_PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error('加载角色列表失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    void loadList();
  }, [loadList]);

  const handleReset = (): void => {
    setStatus(ROLE_FILTER_ALL);
    setRoleName('');
    setRoleCode('');
    setPage(1);
  };

  const handleTableChange: TableProps<SystemRole>['onChange'] = (
    pagination,
  ) => {
    const next: number = pagination.current ?? page;
    if (next !== page) setPage(next);
  };

  const handleToggleStatus = async (record: SystemRole): Promise<void> => {
    const nextStatus: string = record.status === '启用' ? '停用' : '启用';
    try {
      await updateSystemRoleStatus(record.id, nextStatus);
      toast.success(`角色「${record.roleName}」已${nextStatus}`);
      refresh();
    } catch (error: unknown) {
      logger.error('切换角色状态失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
      refresh();
    }
  };

  const handleDeleteConfirmed = async (): Promise<void> => {
    const target: SystemRole | null = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await deleteSystemRole(target.id);
      toast.success(`角色「${target.roleName}」已删除`);
      refresh();
    } catch (error: unknown) {
      logger.error('删除角色失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
      refresh();
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const result = await listSystemRoles({
        ...filterParams,
        page: '1',
        pageSize: String(ROLE_EXPORT_LIMIT),
      });
      const count: number = await exportRowsToExcel(
        buildRoleExportRows(result.items),
        ROLE_EXPORT_HEADERS,
        '角色权限',
        '角色权限',
      );
      toast.success(`已导出 ${count} 个角色`);
    } catch (error: unknown) {
      logger.error('导出角色失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    }
  };

  const columns = useMemo(
    () =>
      buildRoleColumns({
        onEdit: (record: SystemRole) => setEditTarget(record),
        onPermissions: (record: SystemRole) => setPermissionTarget(record),
        onCopy: (record: SystemRole) => setCopyTarget(record),
        onToggleStatus: (record: SystemRole) => void handleToggleStatus(record),
        onDelete: (record: SystemRole) => setDeleteTarget(record),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadList],
  );

  const {
    visibleColumns,
    columnMetas,
    hiddenIds,
    toggleColumn,
    resetColumns,
    setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="space-y-6">
      <ReportCard>
        <SectionHeader
          no="02"
          label="ROLE PERMISSIONS"
          subtitle="角色权限管理 · 角色定义与菜单/按钮/数据/字段四级权限"
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <WarehouseFilterSelect
            value={status}
            placeholder="状态"
            allLabel="全部状态"
            options={ROLE_STATUS_OPTIONS}
            onChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Input
            className="h-9 w-40 rounded-none"
            value={roleName}
            placeholder="角色名称"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setRoleName(e.target.value);
              setPage(1);
            }}
          />
          <Input
            className="h-9 w-40 rounded-none"
            value={roleCode}
            placeholder="角色编码"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setRoleCode(e.target.value);
              setPage(1);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            data-ai-section-type="button"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="h-4 w-4" />
            新建角色
          </Button>
          <Button variant="outline" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" />
            导出Excel
          </Button>
          <ColumnSettingsButton
            columnMetas={columnMetas}
            hiddenIds={hiddenIds}
            onToggle={toggleColumn}
            onReset={resetColumns}
            onSetAll={setAllColumns}
          />
        </div>
        <Table<SystemRole>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300, y: 500 }}
          pagination={{
            current: page,
            pageSize: ROLE_PAGE_SIZE,
            total,
            showSizeChanger: false,
          }}
          onChange={handleTableChange}
        />
      </ReportCard>

      <RoleFormDialog
        open={formOpen || editTarget !== null}
        target={editTarget}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setFormOpen(false);
            setEditTarget(null);
          }
        }}
        onSaved={refresh}
      />
      <RolePermissionDialog
        open={permissionTarget !== null}
        target={permissionTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setPermissionTarget(null);
        }}
        onSaved={refresh}
      />
      <RoleCopyDialog
        open={copyTarget !== null}
        target={copyTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setCopyTarget(null);
        }}
        onCopied={refresh}
      />
      <AdsConfirmDialog
        open={deleteTarget !== null}
        title="删除角色？"
        description={`即将删除角色「${deleteTarget?.roleName ?? '—'}」，删除后不可恢复；已被引用的角色将删除失败。`}
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteConfirmed()}
      />
    </div>
  );
};

export default RolesPanel;
