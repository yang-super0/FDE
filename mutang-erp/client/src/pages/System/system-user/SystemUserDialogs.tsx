import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { OrgDepartment, Role, SystemUser } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Label } from '@client/src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { systemApi } from '@client/src/api';
import { UserSelect } from '@client/src/components/business-ui/user-select';

export const getSystemUserErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (
      error as { response?: { data?: { message?: string } } }
    ).response;
    if (resp?.data?.message) return resp.data.message;
  }
  return fallback;
};

interface SystemUserFormDialogProps {
  open: boolean;
  user: SystemUser | null;
  roles: Role[];
  departments: OrgDepartment[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SystemUserFormDialog({
  open,
  user,
  roles,
  departments,
  onOpenChange,
  onSaved,
}: SystemUserFormDialogProps) {
  const isEdit: boolean = user !== null;
  const [memberId, setMemberId] = useState<string | null>(null);
  const [department, setDepartment] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setMemberId(user?.memberId ?? null);
      setDepartment(user?.department ?? '');
      setRoleId(user?.roleId ?? '');
    }
  }, [open, user]);

  const deptOptions: { value: string; label: string }[] = departments.map(
    (item: OrgDepartment) => ({
      value: item.deptName,
      label: `${'　'.repeat(Math.max(item.deptLevel - 1, 0))}${item.deptName}`,
    }),
  );
  const hasCurrentDept: boolean = departments.some(
    (item: OrgDepartment) => item.deptName === department,
  );
  if (department && !hasCurrentDept) {
    deptOptions.unshift({ value: department, label: `（原）${department}` });
  }

  const handleSubmit = async () => {
    if (!isEdit && !memberId) {
      toast.warning('请选择成员');
      return;
    }
    if (!department.trim()) {
      toast.warning('请选择部门');
      return;
    }
    if (!isEdit && !roleId) {
      toast.warning('请选择角色');
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && user) {
        await systemApi.updateSystemUser(user.id, {
          department: department.trim(),
          roleId: roleId || null,
        });
        toast.success('用户信息已更新');
      } else {
        await systemApi.createSystemUser({
          memberId: memberId as string,
          department: department.trim(),
          roleId,
        });
        toast.success('新增用户成功');
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      logger.error('保存系统用户失败', error);
      toast.error(getSystemUserErrorMessage(error, '保存失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? '修改用户的部门与角色，保存后立即生效'
              : '选择成员并填写部门与角色信息'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>
              成员 <span className="text-destructive">*</span>
            </Label>
            {isEdit ? (
              <div className="border border-border bg-accent px-3 py-2 text-sm font-bold text-foreground">
                {user?.memberName || user?.memberId}
              </div>
            ) : (
              <UserSelect
                value={memberId}
                onChange={setMemberId}
                placeholder="请选择成员"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>
              部门 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={department || undefined}
              onValueChange={(value: string) => setDepartment(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择部门（来自组织架构）" />
              </SelectTrigger>
              <SelectContent>
                {deptOptions.map((item: { value: string; label: string }) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              角色{' '}
              {isEdit ? (
                <span className="text-muted-foreground">
                  （不选择则清除角色绑定）
                </span>
              ) : (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <Select
              value={roleId || undefined}
              onValueChange={(value: string) => setRoleId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择角色" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((item: Role) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中...' : '确认保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteUserConfirmDialogProps {
  user: SystemUser | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteUserConfirmDialog({
  user,
  onOpenChange,
  onDeleted,
}: DeleteUserConfirmDialogProps) {
  const [deleting, setDeleting] = useState<boolean>(false);

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await systemApi.deleteSystemUser(user.id);
      toast.success('已删除该用户');
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      logger.error('删除系统用户失败', error);
      toast.error(getSystemUserErrorMessage(error, '删除失败'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>删除用户</DialogTitle>
          <DialogDescription>
            确定删除用户「{user?.memberName || user?.memberId}」吗？删除后该用户的角色绑定将被移除，重新进入应用时按默认商务角色处理。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
