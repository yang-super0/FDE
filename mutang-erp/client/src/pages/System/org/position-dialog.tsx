import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  OrgPosition,
  OrgPositionCreateDto,
  OrgPositionUpdateDto,
} from '@shared/api.interface';
import {
  createOrgPosition,
  updateOrgPosition,
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

export interface PositionDialogState {
  mode: 'create' | 'edit';
  position: OrgPosition | null;
}

interface PositionDialogProps {
  open: boolean;
  state: PositionDialogState;
  deptId: number | null;
  deptName: string;
  siblingPositions: OrgPosition[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const PositionDialog: React.FC<PositionDialogProps> = ({
  open,
  state,
  deptId,
  deptName,
  siblingPositions,
  onOpenChange,
  onSaved,
}) => {
  const { mode, position } = state;
  const [positionName, setPositionName] = useState<string>('');
  const [positionLevel, setPositionLevel] = useState<string>('');
  const [parentPositionId, setParentPositionId] = useState<string>(PARENT_NONE);
  const [sortOrder, setSortOrder] = useState<string>('');
  const [status, setStatus] = useState<string>('启用');
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && position) {
      setPositionName(position.positionName);
      setPositionLevel(position.positionLevel ?? '');
      setParentPositionId(
        position.parentPositionId === null
          ? PARENT_NONE
          : String(position.parentPositionId),
      );
      setSortOrder(String(position.sortOrder));
      setStatus(position.status);
      setRemark(position.remark ?? '');
      return;
    }
    setPositionName('');
    setPositionLevel('');
    setParentPositionId(PARENT_NONE);
    setSortOrder('');
    setStatus('启用');
    setRemark('');
  }, [open, mode, position]);

  const parentOptions: OrgPosition[] = siblingPositions.filter(
    (item: OrgPosition) => item.id !== position?.id,
  );

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
    const trimmedName: string = positionName.trim();
    if (!trimmedName) {
      toast.error('请输入岗位名称');
      return;
    }
    if (deptId === null) {
      toast.error('请先选择部门');
      return;
    }
    const parsedSort: number | undefined = parseSortOrder();
    if (sortOrder.trim() !== '' && parsedSort === undefined) return;
    setSubmitting(true);
    try {
      if (mode === 'edit' && position) {
        const payload: OrgPositionUpdateDto = {
          positionName: trimmedName,
          positionLevel: positionLevel.trim() || undefined,
          parentPositionId:
            parentPositionId === PARENT_NONE
              ? null
              : Number(parentPositionId),
          sortOrder: parsedSort,
          status,
          remark: remark.trim() || undefined,
        };
        await updateOrgPosition(position.id, payload);
        toast.success('岗位已更新');
      } else {
        const payload: OrgPositionCreateDto = {
          positionName: trimmedName,
          deptId,
          positionLevel: positionLevel.trim() || undefined,
          parentPositionId:
            parentPositionId === PARENT_NONE
              ? undefined
              : Number(parentPositionId),
          sortOrder: parsedSort,
          status,
          remark: remark.trim() || undefined,
        };
        await createOrgPosition(payload);
        toast.success('岗位已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存岗位失败: ${toSystemEnhanceErrorText(error)}`);
      toast.error(`保存失败：${toSystemEnhanceErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit: boolean = mode === 'edit' && position !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {isEdit ? '编辑岗位' : '新增岗位'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? '编辑岗位名称、等级、上级岗位与状态'
              : `在「${deptName || '未选择部门'}」下创建岗位`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <SystemEnhanceFormField label="岗位名称" required>
              <Input
                placeholder="请输入岗位名称"
                className="rounded-none"
                value={positionName}
                onChange={(event) => setPositionName(event.target.value)}
              />
            </SystemEnhanceFormField>
            <SystemEnhanceFormField label="岗位等级">
              <Input
                placeholder="选填，如 一级 / 二级"
                className="rounded-none"
                value={positionLevel}
                onChange={(event) => setPositionLevel(event.target.value)}
              />
            </SystemEnhanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <SystemEnhanceFormField label="所属部门">
              <Input value={deptName} disabled className="rounded-none" />
            </SystemEnhanceFormField>
            <SystemEnhanceFormField label="上级岗位">
              <Select
                value={parentPositionId}
                onValueChange={setParentPositionId}
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择上级岗位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PARENT_NONE}>无</SelectItem>
                  {parentOptions.map((item: OrgPosition) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {`${item.positionNo} ${item.positionName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          <div className="flex flex-wrap gap-4">
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
            disabled={submitting || positionName.trim() === ''}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
