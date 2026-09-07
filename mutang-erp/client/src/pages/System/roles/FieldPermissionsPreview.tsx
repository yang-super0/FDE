import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  MyFieldPermissionItem,
  MyFieldPermissionsResponse,
  SensitiveFieldCatalogItem,
  SystemRole,
} from '@shared/api.interface';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { getMyFieldPermissions } from '@client/src/api/field-permission';
import { fieldPermKey, fieldPermModuleLabel } from './field-permission-shared';

interface FieldPermissionsPreviewProps {
  roles: SystemRole[];
  catalog: SensitiveFieldCatalogItem[];
}

interface PreviewBadgeProps {
  label: string;
  tone: 'on' | 'off' | 'warn';
}

const PREVIEW_BADGE_TONE_CLASS: Record<PreviewBadgeProps['tone'], string> = {
  on: 'bg-[#EFF6FF] text-[#0033A0]',
  off: 'bg-[#F1F5F9] text-[#94A3B8]',
  warn: 'bg-[#FFFBEB] text-[#B45309]',
};

const PreviewBadge: FC<PreviewBadgeProps> = ({ label, tone }) => (
  <span
    className={`inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold ${PREVIEW_BADGE_TONE_CLASS[tone]}`}
  >
    {label}
  </span>
);

const FieldPermissionsPreview: FC<FieldPermissionsPreviewProps> = ({
  roles,
  catalog,
}) => {
  const [previewRoleCode, setPreviewRoleCode] = useState<string | undefined>(
    undefined,
  );
  const [previewResult, setPreviewResult] =
    useState<MyFieldPermissionsResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  const loadPreview = useCallback(async (roleCode: string): Promise<void> => {
    setPreviewLoading(true);
    try {
      const result = await getMyFieldPermissions(roleCode);
      setPreviewResult(result);
    } catch (error: unknown) {
      logger.error(`加载角色预览权限失败: ${String(error)}`);
      toast.error(`加载角色预览权限失败：${String(error)}`);
      setPreviewResult(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (previewRoleCode) {
      void loadPreview(previewRoleCode);
    } else {
      setPreviewResult(null);
    }
  }, [previewRoleCode, loadPreview]);

  const catalogLabels = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    catalog.forEach((entry: SensitiveFieldCatalogItem) => {
      map.set(fieldPermKey(entry.module, entry.fieldName), entry.fieldLabel);
    });
    return map;
  }, [catalog]);

  const groupedFields = useMemo((): Array<
    [string, MyFieldPermissionItem[]]
  > => {
    const groups = new Map<string, MyFieldPermissionItem[]>();
    (previewResult?.fields ?? []).forEach((item: MyFieldPermissionItem) => {
      const list: MyFieldPermissionItem[] = groups.get(item.module) ?? [];
      list.push(item);
      groups.set(item.module, list);
    });
    return Array.from(groups.entries());
  }, [previewResult]);

  const labelOf = (module: string, fieldName: string): string =>
    catalogLabels.get(fieldPermKey(module, fieldName)) ?? fieldName;

  return (
    <ReportCard>
      <SectionHeader
        no="03"
        label="ROLE PREVIEW"
        subtitle="以某角色身份预览 · 字段权限生效结果"
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={previewRoleCode} onValueChange={setPreviewRoleCode}>
          <SelectTrigger className="h-9 w-56 rounded-none">
            <SelectValue placeholder="请选择预览角色" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role: SystemRole) => (
              <SelectItem key={role.id} value={role.roleCode}>
                {role.roleName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {previewResult ? (
          <span className="text-xs text-muted-foreground">
            当前生效角色：{previewResult.roleName ?? previewResult.roleCode}
          </span>
        ) : null}
      </div>
      {previewLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : !previewResult ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          选择角色后展示该角色的字段权限生效结果
        </div>
      ) : groupedFields.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          该角色暂无字段权限限制（默认全部可见）
        </div>
      ) : (
        <div className="space-y-6">
          {groupedFields.map(([module, entries]: [string, MyFieldPermissionItem[]]) => (
            <div key={module} className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                {fieldPermModuleLabel(module)}
              </div>
              <div className="divide-y divide-border border-y border-border">
                {entries.map((field: MyFieldPermissionItem) => (
                  <div
                    key={field.fieldName}
                    className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
                  >
                    <span className="w-28 font-medium">
                      {labelOf(module, field.fieldName)}
                    </span>
                    <span className="w-44 break-all font-mono text-xs text-muted-foreground">
                      {field.fieldName}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PreviewBadge
                        label={field.visible ? '可见' : '不可见'}
                        tone={field.visible ? 'on' : 'off'}
                      />
                      <PreviewBadge
                        label={field.editable ? '可编辑' : '只读'}
                        tone={field.editable ? 'on' : 'off'}
                      />
                      <PreviewBadge
                        label={field.masked ? '脱敏' : '明文'}
                        tone={field.masked ? 'warn' : 'off'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ReportCard>
  );
};

export { FieldPermissionsPreview };
