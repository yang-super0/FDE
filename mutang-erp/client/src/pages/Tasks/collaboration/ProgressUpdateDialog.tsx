import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CollaborationTask } from '@shared/api.interface';
import { updateCollaborationTask } from '@client/src/api/task-enhance/collaboration-tasks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  TaskEnhanceFormField,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';

interface ProgressUpdateDialogProps {
  open: boolean;
  task: CollaborationTask | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ProgressUpdateDialog({
  open,
  task,
  onOpenChange,
  onSaved,
}: ProgressUpdateDialogProps) {
  const [progressText, setProgressText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setProgressText(task ? String(task.progress) : '');
  }, [open, task]);

  const parsedProgress: number = Number(progressText);
  const isValid: boolean =
    progressText.trim() !== '' &&
    Number.isFinite(parsedProgress) &&
    Number.isInteger(parsedProgress) &&
    parsedProgress >= 0 &&
    parsedProgress <= 100;

  const handleSubmit = async (): Promise<void> => {
    if (!task || !isValid) return;
    setSubmitting(true);
    try {
      const updated = await updateCollaborationTask(task.id, {
        progress: parsedProgress,
      });
      const statusText: string =
        updated.status === '待开始'
          ? '（待开始）'
          : updated.status === '进行中'
            ? '（进行中）'
            : updated.status === '已完成'
              ? '（已完成）'
              : '';
      toast.success(`进度已更新为 ${parsedProgress}%${statusText}`);
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`更新进度失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`更新进度失败：${toTaskEnhanceErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">进度更新</DialogTitle>
          <DialogDescription>
            {task ? `任务「${task.title}」当前进度 ${task.progress}%` : ''}
            ，进度 0 为待开始，1-99 为进行中，100 为已完成
          </DialogDescription>
        </DialogHeader>
        <TaskEnhanceFormField label="进度（%）" required>
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            placeholder="请输入 0-100 的整数"
            className="rounded-none"
            value={progressText}
            onChange={(event) => setProgressText(event.target.value)}
          />
        </TaskEnhanceFormField>
        {!isValid && progressText.trim() !== '' ? (
          <p className="text-xs text-destructive">
            进度必须为 0-100 的整数
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
            disabled={submitting || !isValid}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '提交中...' : '提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
