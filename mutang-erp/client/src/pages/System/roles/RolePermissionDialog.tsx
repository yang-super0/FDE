import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  RolePermissionSaveDto,
  SystemRole,
} from '@shared/api.interface';
import {
  getRolePermissions,
  saveRolePermissions,
} from '@client/src/api/system-enhance/roles';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';
import { ROLE_DATA_SCOPE_OPTIONS } from './RolesColumns';

/* ============ 权限配置常量 ============ */

export const ROLE_MENU_MODULES: string[] = [
  '工作台',
  '客户管理',
  '公海线索',
  '广告投放',
  '视频业务',
  '合同管理',
  '财务管理',
  '人资管理',
  '行政管理',
  '任务中心',
  '系统管理',
  '支持中心',
];

export const ROLE_BUTTON_ACTIONS: string[] = [
  '新增',
  '编辑',
  '删除',
  '导出',
  '审批',
];

export const ROLE_FIELD_PERMISSIONS: string[] = [
  '薪资',
  '成本',
  '利润',
  '余额',
  '提成',
];

interface RolePermissionState {
  menus: string[];
  buttons: string[];
  dataScope: string;
  fields: string[];
}

const EMPTY_PERMISSIONS: RolePermissionState = {
  menus: [],
  buttons: [],
  dataScope: ROLE_DATA_SCOPE_OPTIONS[0],
  fields: [],
};

interface RolePermissionDialogProps {
  open: boolean;
  target: SystemRole | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const toggleInList = (
  list: string[],
  value: string,
  checked: boolean,
): string[] =>
  checked
    ? [...new Set([...list, value])]
    : list.filter((item: string) => item !== value);

export const RolePermissionDialog = ({
  open,
  target,
  onOpenChange,
  onSaved,
}: RolePermissionDialogProps) => {
  const [state, setState] = useState<RolePermissionState>(
    EMPTY_PERMISSIONS,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !target) return;
    setSubmitting(false);
    setLoading(true);
    setState(EMPTY_PERMISSIONS);
    let cancelled: boolean = false;
    getRolePermissions(target.id)
      .then((items) => {
        if (cancelled) return;
        const next: RolePermissionState = {
          menus: [],
          buttons: [],
          dataScope: ROLE_DATA_SCOPE_OPTIONS[0],
          fields: [],
        };
        for (const item of items) {
          if (item.permissionType === 'menu') next.menus.push(item.permissionKey);
          else if (item.permissionType === 'button')
            next.buttons.push(item.permissionKey);
          else if (item.permissionType === 'data')
            next.dataScope = item.permissionKey;
          else if (item.permissionType === 'field')
            next.fields.push(item.permissionKey);
        }
        setState(next);
      })
      .catch((error: unknown) => {
        logger.error('加载角色权限失败', String(error));
        toast.error(toSystemEnhanceErrorText(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, target]);

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    setSubmitting(true);
    try {
      const dto: RolePermissionSaveDto = {
        permissions: [
          ...state.menus.map((menu: string) => ({
            permissionType: 'menu',
            permissionKey: menu,
          })),
          ...state.buttons.map((button: string) => ({
            permissionType: 'button',
            permissionKey: button,
          })),
          { permissionType: 'data', permissionKey: state.dataScope },
          ...state.fields.map((field: string) => ({
            permissionType: 'field',
            permissionKey: field,
            permissionValue: { visible: true },
          })),
        ],
      };
      const result = await saveRolePermissions(target.id, dto);
      toast.success(
        `角色「${target.roleName}」权限已保存（共 ${result.count} 项）`,
      );
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error('保存角色权限失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const menuButtonKeys: string[] = useMemo(
    () =>
      ROLE_MENU_MODULES.flatMap((module: string) =>
        ROLE_BUTTON_ACTIONS.map((action: string) => `${module}:${action}`),
      ),
    [],
  );

  const renderToolbar = (
    allKeys: string[],
    current: string[],
    apply: (next: string[]) => void,
  ): React.ReactNode => (
    <div className="mb-3 flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="rounded-none"
        onClick={() => apply(allKeys)}
      >
        全选
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="rounded-none"
        onClick={() =>
          apply(
            allKeys.filter((key: string) => !current.includes(key)),
          )
        }
      >
        反选
      </Button>
      <span className="text-xs text-muted-foreground">
        已选 {current.filter((key: string) => allKeys.includes(key)).length} /
        {allKeys.length}
      </span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            权限配置 · {target?.roleName ?? '—'}
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {target?.roleCode ?? ''}
            </span>
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            加载中…
          </p>
        ) : (
          <Tabs defaultValue="menu">
            <TabsList className="rounded-none bg-accent p-1">
              <TabsTrigger
                value="menu"
                className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
              >
                菜单权限
              </TabsTrigger>
              <TabsTrigger
                value="button"
                className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
              >
                按钮权限
              </TabsTrigger>
              <TabsTrigger
                value="data"
                className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
              >
                数据权限
              </TabsTrigger>
              <TabsTrigger
                value="field"
                className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
              >
                字段权限
              </TabsTrigger>
            </TabsList>
            <TabsContent value="menu" className="pt-3">
              {renderToolbar(
                ROLE_MENU_MODULES,
                state.menus,
                (next: string[]) =>
                  setState((prev: RolePermissionState) => ({
                    ...prev,
                    menus: next,
                  })),
              )}
              <div className="grid grid-cols-3 gap-2">
                {ROLE_MENU_MODULES.map((module: string) => (
                  <label
                    key={module}
                    className="flex items-center gap-2 rounded-none border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={state.menus.includes(module)}
                      onCheckedChange={(checked: boolean | 'indeterminate') =>
                        setState((prev: RolePermissionState) => ({
                          ...prev,
                          menus: toggleInList(
                            prev.menus,
                            module,
                            checked === true,
                          ),
                        }))
                      }
                    />
                    {module}
                  </label>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="button" className="pt-3">
              {renderToolbar(
                menuButtonKeys,
                state.buttons,
                (next: string[]) =>
                  setState((prev: RolePermissionState) => ({
                    ...prev,
                    buttons: next,
                  })),
              )}
              <div className="max-h-[360px] space-y-1 overflow-y-auto">
                {ROLE_MENU_MODULES.map((module: string) => (
                  <div
                    key={module}
                    className="flex items-center gap-4 rounded-none border border-border px-3 py-2"
                  >
                    <span className="w-20 shrink-0 text-sm font-bold">
                      {module}
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {ROLE_BUTTON_ACTIONS.map((action: string) => {
                        const key: string = `${module}:${action}`;
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-1.5 text-sm"
                          >
                            <Checkbox
                              checked={state.buttons.includes(key)}
                              onCheckedChange={(
                                checked: boolean | 'indeterminate',
                              ) =>
                                setState((prev: RolePermissionState) => ({
                                  ...prev,
                                  buttons: toggleInList(
                                    prev.buttons,
                                    key,
                                    checked === true,
                                  ),
                                }))
                              }
                            />
                            {action}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="data" className="pt-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">数据权限范围</label>
                <Select
                  value={state.dataScope || undefined}
                  onValueChange={(value: string) =>
                    setState((prev: RolePermissionState) => ({
                      ...prev,
                      dataScope: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-64 rounded-none">
                    <SelectValue placeholder="选择数据权限范围" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {ROLE_DATA_SCOPE_OPTIONS.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  控制该角色可查询的数据范围：全部数据 / 本部门及下级 / 本部门 / 仅本人
                </p>
              </div>
            </TabsContent>
            <TabsContent value="field" className="pt-3">
              {renderToolbar(
                ROLE_FIELD_PERMISSIONS,
                state.fields,
                (next: string[]) =>
                  setState((prev: RolePermissionState) => ({
                    ...prev,
                    fields: next,
                  })),
              )}
              <div className="grid grid-cols-2 gap-2">
                {ROLE_FIELD_PERMISSIONS.map((field: string) => (
                  <label
                    key={field}
                    className="flex items-center gap-2 rounded-none border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={state.fields.includes(field)}
                      onCheckedChange={(checked: boolean | 'indeterminate') =>
                        setState((prev: RolePermissionState) => ({
                          ...prev,
                          fields: toggleInList(
                            prev.fields,
                            field,
                            checked === true,
                          ),
                        }))
                      }
                    />
                    {field}（可见）
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                勾选后该角色可见对应敏感字段，未勾选字段将在页面中隐藏或脱敏展示。
              </p>
            </TabsContent>
          </Tabs>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="rounded-none"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '保存中…' : '保存权限'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
