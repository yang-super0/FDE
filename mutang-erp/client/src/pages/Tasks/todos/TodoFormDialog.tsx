import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { MyTodoCreateDto } from '@shared/api.interface';
import { createMyTodo } from '@client/src/api/task-enhance/my-todos';
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
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_TODO_SOURCE_MODULES,
  TASK_TODO_TYPES,
  TaskEnhanceFormField,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';

const NONE_VALUE: string = 'none';

interface TodoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function TodoFormDialog({
  open,
  onOpenChange,
  onSaved,
}: TodoFormDialogProps) {
  const [title, setTitle] = useState<string>('');
  const [todoType, setTodoType] = useState<string>('任务');
  const [sourceModule, setSourceModule] = useState<string>(NONE_VALUE);
  const [sourceNo, setSourceNo] = useState<string>('');
  const [priority, setPriority] = useState<string>('中');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setTodoType('任务');
    setSourceModule(NONE_VALUE);
    setSourceNo('');
    setPriority('中');
    setAssignee(null);
    setDueDate('');
    setRemark('');
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    const trimmedTitle: string = title.trim();
    if (!trimmedTitle) {
      toast.error('请输入待办标题');
      return;
    }
    setSubmitting(true);
    try {
      const payload: MyTodoCreateDto = {
        title: trimmedTitle,
        todoType,
        sourceModule:
          sourceModule === NONE_VALUE ? undefined : sourceModule,
        sourceNo: sourceNo.trim() || undefined,
        priority,
        assignee: assignee ?? undefined,
        dueDate: dueDate || undefined,
        remark: remark.trim() || undefined,
      };
      await createMyTodo(payload);
      toast.success('待办已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`创建待办失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`创建待办失败：${toTaskEnhanceErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">新建待办</DialogTitle>
          <DialogDescription>
            创建个人待办事项，支持关联来源单据与处理人
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="标题" required>
              <Input
                placeholder="请输入待办标题"
                className="rounded-none"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </TaskEnhanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="类型">
              <Select value={todoType} onValueChange={setTodoType}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TODO_TYPES.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="来源模块">
              <Select value={sourceModule} onValueChange={setSourceModule}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择来源模块" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>无</SelectItem>
                  {TASK_TODO_SOURCE_MODULES.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskEnhanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="来源单据编号">
              <Input
                placeholder="选填，如 KH-2026-0001"
                className="rounded-none"
                value={sourceNo}
                onChange={(event) => setSourceNo(event.target.value)}
              />
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="优先级">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择优先级" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_OPTIONS.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskEnhanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="处理人">
              <UserSelect
                value={assignee}
                onChange={setAssignee}
                placeholder="请选择处理人"
              />
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="截止日期">
              <AdsDatePickerButton
                value={dueDate ? new Date(dueDate) : undefined}
                onChange={(date: Date | undefined) =>
                  setDueDate(date ? dayjs(date).format('YYYY-MM-DD') : '')
                }
                placeholder="请选择截止日期"
              />
            </TaskEnhanceFormField>
          </div>
          <TaskEnhanceFormField label="备注">
            <Textarea
              placeholder="选填，补充说明"
              className="rounded-none resize-none"
              rows={3}
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
            />
          </TaskEnhanceFormField>
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
            disabled={submitting || !title.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
