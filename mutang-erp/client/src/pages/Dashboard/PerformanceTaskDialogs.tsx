import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
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
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import type { PerformanceTask } from '@shared/api.interface';
import {
  confirmPerformanceTask,
  createPerformanceTask,
  rejectPerformanceTask,
} from '@client/src/api/workbench-enhance';

export const PERFORMANCE_TASK_TYPE_OPTIONS: string[] = [
  '销售业绩',
  '客户开发',
  '内容制作',
  '投放优化',
  '协作支持',
  '其他',
];

export function toPerformanceErrorText(error: unknown): string {
  return extractErrorMessage(error);
}

function FormField({ label, required, children }: {
  label: string; required?: boolean; children: ReactNode;
}): ReactNode {
  return (
    <div className="w-[calc(50%-8px)] min-w-[220px] space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
    </div>
  );
}

interface PerformanceTaskFormDialogProps {
  open: boolean;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function PerformanceTaskFormDialog({
  open, onSaved, onOpenChange,
}: PerformanceTaskFormDialogProps): ReactNode {
  const [taskName, setTaskName] = useState<string>('');
  const [taskType, setTaskType] = useState<string>('销售业绩');
  const [department, setDepartment] = useState<string>('');
  const [personInCharge, setPersonInCharge] = useState<string>('');
  const [assignee, setAssignee] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('100');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setTaskName('');
    setTaskType('销售业绩');
    setDepartment('');
    setPersonInCharge('');
    setAssignee('');
    setMaxScore('100');
    setDueDate(undefined);
    setDescription('');
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    if (!taskName.trim() || !department.trim() || !personInCharge.trim() || !assignee.trim()) {
      toast.error('请填写任务名称、部门、负责人和员工');
      return;
    }
    setSubmitting(true);
    try {
      await createPerformanceTask({
        taskName: taskName.trim(),
        taskType,
        department: department.trim(),
        personInCharge: personInCharge.trim(),
        assignee: assignee.trim(),
        maxScore: Number(maxScore) || 100,
        dueDate: dueDate
          ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
          : undefined,
        description,
      });
      toast.success('绩效任务已创建');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(toPerformanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none max-w-xl">
        <DialogHeader>
          <DialogTitle>新建绩效任务</DialogTitle>
          <DialogDescription>创建后进入待确认状态</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-4">
          <FormField label="任务名称" required>
            <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="如：Q3 客户开发指标" className="rounded-none" />
          </FormField>
          <FormField label="任务类型" required>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className="rounded-none w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {PERFORMANCE_TASK_TYPE_OPTIONS.map((item: string): ReactNode => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="部门" required>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="如：销售部" className="rounded-none" />
          </FormField>
          <FormField label="绩效负责人" required>
            <Input value={personInCharge} onChange={(e) => setPersonInCharge(e.target.value)} placeholder="负责人姓名" className="rounded-none" />
          </FormField>
          <FormField label="员工" required>
            <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="员工姓名" className="rounded-none" />
          </FormField>
          <FormField label="满分">
            <Input
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              type="number"
              min={1}
              className="rounded-none"
            />
          </FormField>
          <FormField label="截止日期">
            <AdsDatePickerButton value={dueDate} onChange={setDueDate} placeholder="选择截止日期" />
          </FormField>
          <div className="w-full space-y-1.5">
            <label className="text-sm font-medium">描述</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="任务说明（选填）" className="rounded-none min-h-20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={(): void => onOpenChange(false)}>取消</Button>
          <Button className="rounded-none" disabled={submitting} onClick={(): Promise<void> => handleSubmit()}>
            {submitting ? '提交中…' : '创建任务'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmTaskDialogProps {
  task: PerformanceTask | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmTaskDialog({
  task, onSaved, onOpenChange,
}: ConfirmTaskDialogProps): ReactNode {
  const [score, setScore] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (task) {
      setScore('');
    }
  }, [task]);

  const handleSubmit = async (): Promise<void> => {
    if (!task) return;
    const scoreValue: number = Number(score);
    if (score === '' || !Number.isFinite(scoreValue) || scoreValue < 0 || scoreValue > task.maxScore) {
      toast.error(`分值必须在 0 到 ${task.maxScore} 之间`);
      return;
    }
    setSubmitting(true);
    try {
      await confirmPerformanceTask(task.id, scoreValue);
      toast.success('任务已确认');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(toPerformanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={task !== null} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none max-w-sm">
        <DialogHeader>
          <DialogTitle>确认绩效任务</DialogTitle>
          <DialogDescription>
            {task ? `${task.taskNo} · ${task.taskName}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            分值<span className="ml-0.5 text-destructive">*</span>
            <span className="ml-2 text-xs text-muted-foreground">（0 - {task?.maxScore ?? 100}）</span>
          </label>
          <Input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            type="number"
            min={0}
            max={task?.maxScore ?? 100}
            className="rounded-none"
            placeholder="请输入分值"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={(): void => onOpenChange(false)}>取消</Button>
          <Button className="rounded-none" disabled={submitting} onClick={(): Promise<void> => handleSubmit()}>
            {submitting ? '提交中…' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RejectTaskDialogProps {
  task: PerformanceTask | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function RejectTaskDialog({
  task, onSaved, onOpenChange,
}: RejectTaskDialogProps): ReactNode {
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (task) {
      setRemark('');
    }
  }, [task]);

  const handleSubmit = async (): Promise<void> => {
    if (!task) return;
    if (!remark.trim()) {
      toast.error('驳回原因不能为空');
      return;
    }
    setSubmitting(true);
    try {
      await rejectPerformanceTask(task.id, remark.trim());
      toast.success('任务已驳回');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(toPerformanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={task !== null} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none max-w-sm">
        <DialogHeader>
          <DialogTitle>驳回绩效任务</DialogTitle>
          <DialogDescription>
            {task ? `${task.taskNo} · ${task.taskName}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            驳回原因<span className="ml-0.5 text-destructive">*</span>
          </label>
          <Textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="请填写驳回原因"
            className="rounded-none min-h-20"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={(): void => onOpenChange(false)}>取消</Button>
          <Button variant="destructive" className="rounded-none" disabled={submitting} onClick={(): Promise<void> => handleSubmit()}>
            {submitting ? '提交中…' : '驳回'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
