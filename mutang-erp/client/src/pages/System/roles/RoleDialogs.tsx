import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  RoleCopyDto,
  SystemRole,
  SystemRoleCreateDto,
} from '@shared/api.interface';
import {
  copySystemRole,
  createSystemRole,
  updateSystemRole,
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
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';
import { ROLE_DATA_SCOPE_OPTIONS } from './RolesColumns';

/* ============ 角色 新建/编辑 ============ */

interface RoleFormState {
  roleName: string;
  roleCode: string;
  dataScope: string;
  description: string;
  remark: string;
}

const EMPTY_ROLE_FORM: RoleFormState = {
  roleName: '',
  roleCode: '',
  dataScope: ROLE_DATA_SCOPE_OPTIONS[0],
  description: '',
  remark: '',
};

interface RoleFormDialogProps {
  open: boolean;
  target: SystemRole | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const RoleFormDialog = ({
  open,
  target,
  onOpenChange,
  onSaved,
}: RoleFormDialogProps) => {
  const [form, setForm] = useState<RoleFormState>(EMPTY_ROLE_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    if (target) {
      setForm({
        roleName: target.roleName,
        roleCode: target.roleCode,
        dataScope: target.dataScope,
        description: target.description ?? '',
        remark: target.remark ?? '',
      });
    } else {
      setForm(EMPTY_ROLE_FORM);
    }
  }, [open, target]);

  const updateField = (key: keyof RoleFormState, value: string): void => {
    setForm((prev: RoleFormState) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.roleName.trim()) {
      toast.error('请输入角色名称');
      return;
    }
    if (!target && !form.roleCode.trim()) {
      toast.error('请输入角色编码');
      return;
    }
    setSubmitting(true);
    try {
      if (target) {
        await updateSystemRole(target.id, {
          roleName: form.roleName.trim(),
          dataScope: form.dataScope,
          description: form.description.trim() || undefined,
          remark: form.remark.trim() || undefined,
        });
        toast.success(`角色「${target.roleName}」已更新`);
      } else {
        const dto: SystemRoleCreateDto = {
          roleName: form.roleName.trim(),
          roleCode: form.roleCode.trim(),
          dataScope: form.dataScope,
          description: form.description.trim() || undefined,
          remark: form.remark.trim() || undefined,
        };
        await createSystemRole(dto);
        toast.success(`角色「${dto.roleName}」已创建`);
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error('保存角色失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{target ? '编辑角色' : '新建角色'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1 space-y-1.5">
            <label className="text-sm font-medium">
              角色名称 <span className="text-destructive">*</span>
            </label>
            <Input
              className="rounded-none"
              value={form.roleName}
              placeholder="角色名称"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('roleName', e.target.value)
              }
            />
          </div>
          <div className="col-span-1 space-y-1.5">
            <label className="text-sm font-medium">
              角色编码{' '}
              {!target ? <span className="text-destructive">*</span> : null}
            </label>
            <Input
              className="rounded-none"
              value={form.roleCode}
              disabled={target !== null}
              placeholder="如 ads_operator"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('roleCode', e.target.value)
              }
            />
          </div>
          <div className="col-span-1 space-y-1.5">
            <label className="text-sm font-medium">数据权限</label>
            <Select
              value={form.dataScope || undefined}
              onValueChange={(value: string) => updateField('dataScope', value)}
            >
              <SelectTrigger className="rounded-none">
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
          </div>
          <div className="col-span-1 space-y-1.5">
            <label className="text-sm font-medium">描述</label>
            <Input
              className="rounded-none"
              value={form.description}
              placeholder="角色描述"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('description', e.target.value)
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">备注</label>
            <Textarea
              className="rounded-none"
              value={form.remark}
              placeholder="备注"
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateField('remark', e.target.value)
              }
            />
          </div>
        </div>
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
            {submitting ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============ 复制角色 ============ */

interface RoleCopyDialogProps {
  open: boolean;
  target: SystemRole | null;
  onOpenChange: (open: boolean) => void;
  onCopied: () => void;
}

export const RoleCopyDialog = ({
  open,
  target,
  onOpenChange,
  onCopied,
}: RoleCopyDialogProps) => {
  const [roleName, setRoleName] = useState<string>('');
  const [roleCode, setRoleCode] = useState<string>('');
  const [includePermissions, setIncludePermissions] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setRoleName(target ? `${target.roleName}-副本` : '');
    setRoleCode(target ? `${target.roleCode}_copy` : '');
    setIncludePermissions(true);
  }, [open, target]);

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    if (!roleName.trim()) {
      toast.error('请输入新角色名称');
      return;
    }
    if (!roleCode.trim()) {
      toast.error('请输入新角色编码');
      return;
    }
    setSubmitting(true);
    try {
      const dto: RoleCopyDto = {
        roleName: roleName.trim(),
        roleCode: roleCode.trim(),
        includePermissions,
      };
      const created: SystemRole = await copySystemRole(target.id, dto);
      toast.success(`角色「${created.roleName}」已复制创建`);
      onOpenChange(false);
      onCopied();
    } catch (error: unknown) {
      logger.error('复制角色失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            复制角色 · {target?.roleName ?? '—'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              新角色名称 <span className="text-destructive">*</span>
            </label>
            <Input
              className="rounded-none"
              value={roleName}
              placeholder="新角色名称"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRoleName(e.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              新角色编码 <span className="text-destructive">*</span>
            </label>
            <Input
              className="rounded-none"
              value={roleCode}
              placeholder="新角色编码"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRoleCode(e.target.value)
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includePermissions}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                setIncludePermissions(checked === true)
              }
            />
            同时复制权限配置
          </label>
        </div>
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
            {submitting ? '复制中…' : '复制角色'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
