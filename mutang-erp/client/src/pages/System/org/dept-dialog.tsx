import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  OrgDepartment,
  OrgDepartmentCreateDto,
  OrgDepartmentUpdateDto,
} from '@shared/api.interface';
import {
  createOrgDepartment,
  updateOrgDepartment,
} from '@client/src/api/system-enhance/org';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  ORG_STATUS_OPTIONS,
  SystemEnhanceFormField,
  toSystemEnhanceErrorText,
} from '../system-enhance-shared';

const PARENT_NONE: string = 'none';

export interface DeptDialogState {
  mode: 'create' | 'edit';
  dept: OrgDepartment | null;
}

interface DeptDialogProps {
  open: boolean;
  state: DeptDialogState;
  flatDepartments: OrgDepartment[];
  defaultParentId: number | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const DeptDialog: React.FC<DeptDialogProps> = ({
  open,
  state,
  flatDepartments,
  defaultParentId,
  onOpenChange,
  onSaved,
}) => {
  const { mode, dept } = state;
  const [deptName, setDeptName] = useState<string>('');
  const [parentId, setParentId] = useState<string>(PARENT_NONE);
  const [manager, setManager] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string>('');
  const [status, setStatus] = useState<string>('启用');
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && dept) {
      setDeptName(dept.deptName);
      setParentId(
        dept.parentId === null ? PARENT_NONE : String(dept.parentId),
      );
      setManager(dept.deptManager);
      setSortOrder(String(dept.sortOrder));
      setStatus(dept.status);
      setRemark(dept.remark ?? '');
      return;
    }
    setDeptName('');
    setParentId(
      defaultParentId === null ? PARENT_NONE : String(defaultParentId),
    );
    setManager(null);
    setSortOrder('');
    setStatus('启用');
    setRemark('');
  }, [open, mode, dept, defaultParentId]);

  const parseSortOrder = (): number | undefined => {
    if (sortOrder.trim() === '') return undefined;
    const parsed: number = Number(sortOrder);
    if (Number.isNaN(parsed)) {
      toast.error('排序必须为有效数字');
      return undefined;
    }
    return parsed;
  };

  const handleSubmit = async (): Promise<void> => {
    const trimmedName: string = deptName.trim();
    if (!trimmedName) {
      toast.error('请输入部门名称');
      return;
    }
    const parsedSort: number | undefined = parseSortOrder();
    if (sortOrder.trim() !== '' && parsedSort === undefined) return;
    setSubmitting(true);
    try {
      if (mode === 'edit' && dept) {
        const payload: OrgDepartmentUpdateDto = {
          deptName: trimmedName,
          deptManager: manager,
          sortOrder: parsedSort,
          status,
          remark: remark.trim() || undefined,
        };
        await updateOrgDepartment(dept.id, payload);
        toast.success('部门已更新');
      } else {
        const payload: OrgDepartmentCreateDto = {
          deptName: trimmedName,
          parentId:
            parentId === PARENT_NONE ? undefined : Number(parentId),
          deptManager: manager ?? undefined,
          sortOrder: parsedSort,
          status,
          remark: remark.trim() || undefined,
        };
        await createOrgDepartment(payload);
        toast.success('部门已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存部门失败: ${toSystemEnhanceErrorText(error)}`);
      toast.error(`保存失败：${toSystemEnhanceErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit: boolean = mode === 'edit' && dept !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {isEdit ? '编辑部门' : '新增部门'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? '编辑部门名称、负责人、排序与状态'
              : '选择上级部门并录入部门信息'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <SystemEnhanceFormField label="部门名称" required>
              <Input
                placeholder="请输入部门名称"
                className="rounded-none"
                value={deptName}
                onChange={(event) => setDeptName(event.target.value)}
              />
            </SystemEnhanceFormField>
            <SystemEnhanceFormField label="上级部门">
              {isEdit ? (
                <Input
                  value={dept?.parentName ?? '顶级部门'}
                  disabled
                  className="rounded-none"
                />
              ) : (
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger className="rounded-none">
                    <SelectValue placeholder="请选择上级部门" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PARENT_NONE}>顶级部门</SelectItem>
                    {flatDepartments.map((item: OrgDepartment) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {`${item.deptNo} ${item.deptName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </SystemEnhanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <SystemEnhanceFormField label="负责人">
              <UserSelect
                value={manager}
                onChange={setManager}
                placeholder="请选择负责人"
              />
            </SystemEnhanceFormField>
            <SystemEnhanceFormField label="排序">
              <Input
                type="number"
                placeholder="数字越小越靠前"
                className="rounded-none"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </SystemEnhanceFormField>
            <SystemEnhanceFormField label="状态">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {ORG_STATUS_OPTIONS.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SystemEnhanceFormField>
          </div>
          <SystemEnhanceFormField label="备注">
            <Textarea
              className="rounded-none resize-none"
              rows={2}
              placeholder="选填，补充说明"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
            />
          </SystemEnhanceFormField>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={submitting || deptName.trim() === ''}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
