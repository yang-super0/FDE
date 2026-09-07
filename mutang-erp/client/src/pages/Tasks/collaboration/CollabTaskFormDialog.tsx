import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CollaborationTask,
  CollaborationTaskCreateDto,
  CollaborationTaskUpdateDto,
} from '@shared/api.interface';
import {
  createCollaborationTask,
  updateCollaborationTask,
} from '@client/src/api/task-enhance/collaboration-tasks';
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
  TASK_COLLAB_TYPES,
  TASK_PRIORITY_OPTIONS,
  TASK_TODO_SOURCE_MODULES,
  TaskEnhanceFormField,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';

const NONE_VALUE: string = 'none';

interface CollabTaskFormDialogProps {
  open: boolean;
  editing: CollaborationTask | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function CollabTaskFormDialog({
  open,
  editing,
  onOpenChange,
  onSaved,
}: CollabTaskFormDialogProps) {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [taskType, setTaskType] = useState<string>('日常工作');
  const [priority, setPriority] = useState<string>('中');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [department, setDepartment] = useState<string>('');
  const [sourceModule, setSourceModule] = useState<string>(NONE_VALUE);
  const [sourceNo, setSourceNo] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? '');
      setTaskType(editing.taskType);
      setPriority(editing.priority);
      setAssignee(editing.assignee);
      setParticipants(editing.participants ?? []);
      setDepartment(editing.department ?? '');
      setSourceModule(editing.sourceModule ?? NONE_VALUE);
      setSourceNo(editing.sourceNo ?? '');
      setStartDate(editing.startDate ?? '');
      setDueDate(editing.dueDate ?? '');
      setRemark(editing.remark ?? '');
    } else {
      setTitle('');
      setDescription('');
      setTaskType('日常工作');
      setPriority('中');
      setAssignee(null);
      setParticipants([]);
      setDepartment('');
      setSourceModule(NONE_VALUE);
      setSourceNo('');
      setStartDate('');
      setDueDate('');
      setRemark('');
    }
  }, [open, editing]);

  const handleSubmit = async (): Promise<void> => {
    const trimmedTitle: string = title.trim();
    if (!trimmedTitle) {
      toast.error('请输入任务标题');
      return;
    }
    if (startDate && dueDate && dayjs(dueDate).isBefore(dayjs(startDate))) {
      toast.error('截止日期不能早于开始日期');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const payload: CollaborationTaskUpdateDto = {
          title: trimmedTitle,
          description: description.trim() || undefined,
          taskType,
          priority,
          assignee,
          participants,
          department: department.trim() || undefined,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
          remark: remark.trim() || undefined,
        };
        await updateCollaborationTask(editing.id, payload);
        toast.success('协作任务已更新');
      } else {
        const payload: CollaborationTaskCreateDto = {
          title: trimmedTitle,
          description: description.trim() || undefined,
          taskType,
          priority,
          assignee: assignee ?? undefined,
          participants: participants.length > 0 ? participants : undefined,
          department: department.trim() || undefined,
          sourceModule:
            sourceModule === NONE_VALUE ? undefined : sourceModule,
          sourceNo: sourceNo.trim() || undefined,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
          remark: remark.trim() || undefined,
        };
        await createCollaborationTask(payload);
        toast.success('协作任务已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存协作任务失败: ${toTaskEnhanceErrorText(error)}`);
      toast.error(`保存失败：${toTaskEnhanceErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editing ? '编辑协作任务' : '新建协作任务'}
          </DialogTitle>
          <DialogDescription>
            协作任务支持多人参与、进度跟踪与评论协作
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="标题" required>
              <Input
                placeholder="请输入任务标题"
                className="rounded-none"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </TaskEnhanceFormField>
          </div>
          <TaskEnhanceFormField label="任务描述">
            <Textarea
              placeholder="选填，描述任务目标与要求"
              className="rounded-none resize-none"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </TaskEnhanceFormField>
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="任务类型">
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择任务类型" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_COLLAB_TYPES.map((option: string) => (
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
            <TaskEnhanceFormField label="负责人">
              <UserSelect
                value={assignee}
                onChange={setAssignee}
                placeholder="请选择负责人"
              />
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="部门">
              <Input
                placeholder="选填，如：市场部"
                className="rounded-none"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              />
            </TaskEnhanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="参与人">
              <UserSelect
                multiple
                value={participants}
                onChange={setParticipants}
                placeholder="请选择参与人"
              />
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="关联模块">
              <Select
                value={sourceModule}
                onValueChange={setSourceModule}
                disabled={editing !== null}
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择关联模块" />
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
                placeholder="选填，如 HT-2026-0001"
                className="rounded-none"
                disabled={editing !== null}
                value={sourceNo}
                onChange={(event) => setSourceNo(event.target.value)}
              />
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="开始日期">
              <AdsDatePickerButton
                value={startDate ? new Date(startDate) : undefined}
                onChange={(date: Date | undefined) =>
                  setStartDate(date ? dayjs(date).format('YYYY-MM-DD') : '')
                }
                placeholder="请选择开始日期"
              />
            </TaskEnhanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
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
