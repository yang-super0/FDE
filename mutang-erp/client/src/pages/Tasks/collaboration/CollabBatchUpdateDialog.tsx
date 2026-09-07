import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CollaborationTaskBatchUpdateDto } from '@shared/api.interface';
import { batchUpdateCollaborationTasks } from '@client/src/api/task-enhance/collaboration-tasks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import {
  TASK_PRIORITY_OPTIONS,
  TaskEnhanceFormField,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';
import { COLLAB_STATUS_OPTIONS } from './collaboration-columns';

const KEEP_VALUE: string = 'keep';

interface CollabBatchDialogProps {
  open: boolean;
  ids: number[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function CollabBatchUpdateDialog({
  open,
  ids,
  onOpenChange,
  onSaved,
}: CollabBatchDialogProps) {
  const [status, setStatus] = useState<string>(KEEP_VALUE);
  const [priority, setPriority] = useState<string>(KEEP_VALUE);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setStatus(KEEP_VALUE);
    setPriority(KEEP_VALUE);
    setAssignee(null);
  }, [open]);

  const hasAnyChange: boolean =
    status !== KEEP_VALUE || priority !== KEEP_VALUE || assignee !== null;

  const handleSubmit = async (): Promise<void> => {
    if (ids.length === 0 || !hasAnyChange) return;
    setSubmitting(true);
    try {
      const payload: CollaborationTaskBatchUpdateDto = {
        ids,
        status: status === KEEP_VALUE ? undefined : status,
        priority: priority === KEEP_VALUE ? undefined : priority,
        assignee: assignee ?? undefined,
      };
      const result = await batchUpdateCollaborationTasks(payload);
      toast.success(`已批量更新 ${result.updated} 条协作任务`);
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`批量更新失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`批量更新失败：${toTaskEnhanceErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">批量设置</DialogTitle>
          <DialogDescription>
            对已选中的 {ids.length} 条协作任务批量设置以下字段，未选择的字段保持不变
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TaskEnhanceFormField label="状态">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="请选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KEEP_VALUE}>不修改</SelectItem>
                {COLLAB_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TaskEnhanceFormField>
          <TaskEnhanceFormField label="优先级">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="请选择优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KEEP_VALUE}>不修改</SelectItem>
                {TASK_PRIORITY_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TaskEnhanceFormField>
          <TaskEnhanceFormField label="负责人">
            <UserSelect
              value={assignee}
              onChange={setAssignee}
              placeholder="不修改"
            />
          </TaskEnhanceFormField>
        </div>
        {!hasAnyChange ? (
          <p className="text-xs text-muted-foreground">
            请至少设置一项要批量修改的字段
          </p>
        ) : null}
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
            disabled={submitting || !hasAnyChange}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '提交中...' : '批量提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
