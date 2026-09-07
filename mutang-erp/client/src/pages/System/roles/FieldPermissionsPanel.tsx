import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  FieldPermissionItem,
  FieldPermissionUpsertDto,
  SensitiveFieldCatalogItem,
  SystemRole,
} from '@shared/api.interface';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Switch } from '@client/src/components/ui/switch';
import {
  batchUpsertFieldPermissions,
  deleteFieldPermission,
  getFieldPermissionCatalog,
  getFieldPermissions,
} from '@client/src/api/field-permission';
import { listSystemRoles } from '@client/src/api/system-enhance/roles';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import {
  FIELD_PERM_DEFAULT,
  type FieldPermState,
  fieldPermKey,
  fieldPermModuleLabel,
} from './field-permission-shared';
import { FieldPermissionsPreview } from './FieldPermissionsPreview';

const ROLE_LOAD_PAGE_SIZE: string = '200';
const PERM_LOAD_PAGE_SIZE: string = '500';

type PermToggleKey = 'visible' | 'editable' | 'masked';

const reportError = (context: string, error: unknown): void => {
  const text: string = error instanceof Error ? error.message : String(error);
  logger.error(`${context}: ${text}`);
  toast.error(`${context}：${text}`);
};

const FieldPermissionsPanel: FC = () => {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [catalog, setCatalog] = useState<SensitiveFieldCatalogItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(
    undefined,
  );
  const [perms, setPerms] = useState<Record<string, FieldPermState>>({});
  const [initialJson, setInitialJson] = useState<string>('{}');
  const [dbItems, setDbItems] = useState<Map<string, FieldPermissionItem>>(
    new Map(),
  );
  const [rolesLoading, setRolesLoading] = useState<boolean>(false);
  const [permsLoading, setPermsLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setRolesLoading(true);
      try {
        const [roleResult, catalogResult] = await Promise.all([
          listSystemRoles({ page: '1', pageSize: ROLE_LOAD_PAGE_SIZE }),
          getFieldPermissionCatalog(),
        ]);
        setRoles(roleResult.items);
        setCatalog(catalogResult.items);
      } catch (error: unknown) {
        reportError('加载角色与字段目录失败', error);
      } finally {
        setRolesLoading(false);
      }
    };
    void load();
  }, []);

  const loadRolePerms = useCallback(async (roleId: number): Promise<void> => {
    setPermsLoading(true);
    try {
      const result = await getFieldPermissions({
        roleId: String(roleId),
        page: '1',
        pageSize: PERM_LOAD_PAGE_SIZE,
      });
      const nextPerms: Record<string, FieldPermState> = {};
      const nextDbItems = new Map<string, FieldPermissionItem>();
      result.items.forEach((item: FieldPermissionItem) => {
        const key: string = fieldPermKey(item.module, item.fieldName);
        nextPerms[key] = {
          visible: item.visible,
          editable: item.editable,
          masked: item.masked,
        };
        nextDbItems.set(key, item);
      });
      setPerms(nextPerms);
      setDbItems(nextDbItems);
      setInitialJson(JSON.stringify(nextPerms));
    } catch (error: unknown) {
      reportError('加载角色字段权限失败', error);
    } finally {
      setPermsLoading(false);
    }
  }, []);

  const handleRoleChange = (value: string): void => {
    if (selectedRoleId !== undefined && JSON.stringify(perms) !== initialJson) {
      toast.warning('已丢弃当前角色未保存的字段权限修改');
    }
    setSelectedRoleId(value);
    const roleId: number = Number(value);
    if (Number.isInteger(roleId) && roleId > 0) {
      void loadRolePerms(roleId);
    } else {
      setPerms({});
      setDbItems(new Map());
      setInitialJson('{}');
    }
  };

  const dirty: boolean =
    selectedRoleId !== undefined && JSON.stringify(perms) !== initialJson;

  const updatePerm = (
    key: string,
    prop: PermToggleKey,
    value: boolean,
  ): void => {
    setPerms((prev: Record<string, FieldPermState>) => ({
      ...prev,
      [key]: { ...(prev[key] ?? FIELD_PERM_DEFAULT), [prop]: value },
    }));
  };

  const groupedCatalog = useMemo((): Array<
    [string, SensitiveFieldCatalogItem[]]
  > => {
    const groups = new Map<string, SensitiveFieldCatalogItem[]>();
    catalog.forEach((entry: SensitiveFieldCatalogItem) => {
      const list: SensitiveFieldCatalogItem[] =
        groups.get(entry.module) ?? [];
      list.push(entry);
      groups.set(entry.module, list);
    });
    return Array.from(groups.entries());
  }, [catalog]);

  const selectedRole: SystemRole | undefined = roles.find(
    (role: SystemRole) => String(role.id) === selectedRoleId,
  );

  const handleSave = async (): Promise<void> => {
    if (!selectedRole) {
      toast.error('请先选择角色');
      return;
    }
    const items: FieldPermissionUpsertDto[] = catalog.map(
      (entry: SensitiveFieldCatalogItem) => {
        const key: string = fieldPermKey(entry.module, entry.fieldName);
        const state: FieldPermState = perms[key] ?? FIELD_PERM_DEFAULT;
        return {
          roleId: selectedRole.id,
          module: entry.module,
          fieldName: entry.fieldName,
          fieldLabel: entry.fieldLabel,
          visible: state.visible,
          editable: state.editable,
          masked: state.masked,
        };
      },
    );
    if (items.length === 0) {
      toast.error('字段目录为空，无法保存');
      return;
    }
    setSaving(true);
    try {
      await batchUpsertFieldPermissions({ items });
      toast.success(`已保存角色「${selectedRole.roleName}」的字段权限配置`);
      await loadRolePerms(selectedRole.id);
    } catch (error: unknown) {
      reportError('保存字段权限失败', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async (): Promise<void> => {
    const key: string | null = deleteKey;
    setDeleteKey(null);
    const item: FieldPermissionItem | undefined = key
      ? dbItems.get(key)
      : undefined;
    if (!item) return;
    try {
      await deleteFieldPermission(item.id);
      toast.success(
        `已删除字段「${item.fieldLabel}」的自定义配置，恢复默认全开`,
      );
      const roleId: number = Number(selectedRoleId);
      if (Number.isInteger(roleId) && roleId > 0) {
        await loadRolePerms(roleId);
      }
    } catch (error: unknown) {
      reportError('删除字段配置失败', error);
    }
  };

  return (
    <div className="space-y-6">
      <ReportCard>
        <SectionHeader
          no="02"
          label="FIELD PERMISSIONS"
          subtitle="字段级数据权限 · 敏感字段可见 / 可编辑 / 脱敏配置"
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select value={selectedRoleId} onValueChange={handleRoleChange}>
            <SelectTrigger className="h-9 w-56 rounded-none">
              <SelectValue placeholder="请选择角色" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role: SystemRole) => (
                <SelectItem key={role.id} value={String(role.id)}>
                  {role.roleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dirty ? (
            <span className="text-xs font-bold text-[#B45309]">
              ● 有未保存的修改
            </span>
          ) : null}
          <Button
            data-ai-section-type="button"
            className="ml-auto"
            disabled={!selectedRole || saving}
            onClick={() => void handleSave()}
          >
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </div>
        {rolesLoading || permsLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : !selectedRole ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            请先选择角色，未配置的字段默认全部开放
          </div>
        ) : catalog.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            暂无敏感字段目录
          </div>
        ) : (
          <div className="space-y-6">
            {groupedCatalog.map(
              ([module, entries]: [string, SensitiveFieldCatalogItem[]]) => (
                <div key={module} className="space-y-1 overflow-x-auto">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {fieldPermModuleLabel(module)}
                  </div>
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-y border-border text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">字段</th>
                        <th className="px-3 py-2 font-medium">字段名</th>
                        <th className="px-3 py-2 text-center font-medium">
                          可见
                        </th>
                        <th className="px-3 py-2 text-center font-medium">
                          可编辑
                        </th>
                        <th className="px-3 py-2 text-center font-medium">
                          脱敏
                        </th>
                        <th className="px-3 py-2 text-center font-medium">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(
                        (entry: SensitiveFieldCatalogItem) => {
                          const key: string = fieldPermKey(
                            entry.module,
                            entry.fieldName,
                          );
                          const state: FieldPermState =
                            perms[key] ?? FIELD_PERM_DEFAULT;
                          const dbItem: FieldPermissionItem | undefined =
                            dbItems.get(key);
                          return (
                            <tr
                              key={key}
                              className="border-b border-border/60 hover:bg-accent/50"
                            >
                              <td className="px-3 py-2 font-medium">
                                {entry.fieldLabel}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                                {entry.fieldName}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Switch
                                  checked={state.visible}
                                  onCheckedChange={(value: boolean) =>
                                    updatePerm(key, 'visible', value)
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Switch
                                  checked={state.editable}
                                  onCheckedChange={(value: boolean) =>
                                    updatePerm(key, 'editable', value)
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Switch
                                  checked={state.masked}
                                  onCheckedChange={(value: boolean) =>
                                    updatePerm(key, 'masked', value)
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                {dbItem ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto px-1 text-xs text-destructive"
                                    onClick={() => setDeleteKey(key)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    删除
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    默认
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              ),
            )}
          </div>
        )}
      </ReportCard>
      <FieldPermissionsPreview roles={roles} catalog={catalog} />
      <AdsConfirmDialog
        open={deleteKey !== null}
        title="删除字段自定义配置？"
        description="删除后该字段将恢复默认（可见 / 可编辑 / 不脱敏）。"
        confirmText="删除"
        destructive
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteKey(null);
        }}
        onConfirm={() => void handleDeleteConfirmed()}
      />
    </div>
  );
};

export default FieldPermissionsPanel;
