import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { CreateHrPerformanceBody, HrPerformance } from '@shared/api.interface';
import {
  createHrPerformance, updateHrPerformance,
} from '@client/src/api/hr-enhance/compensation';
import { HrFormField, HR_PERF_GRADE_OPTIONS, HR_PERF_MODE_OPTIONS, HR_PERF_PERIOD_OPTIONS } from '../hr-enhance-constants';
import { reportCompError } from './compensation-shared';

interface PerformanceFormState {
  employeeId: string;
  employeeName: string;
  department: string;
  period: string;
  mode: string;
  grade: string;
  goals: string;
}

interface PerformanceFormDialogProps {
  open: boolean;
  item: HrPerformance | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): PerformanceFormState => ({
  employeeId: '',
  employeeName: '',
  department: '',
  period: HR_PERF_PERIOD_OPTIONS[0],
  mode: HR_PERF_MODE_OPTIONS[0],
  grade: 'B',
  goals: '',
});

const buildFormFrom = (item: HrPerformance): PerformanceFormState => ({
  employeeId: String(item.employeeId),
  employeeName: item.employeeName,
  department: item.department,
  period: item.period,
  mode: item.mode,
  grade: item.grade,
  goals: item.goals,
});

export function PerformanceFormDialog({
  open, item, onSaved, onOpenChange,
}: PerformanceFormDialogProps) {
  const [form, setForm] = useState<PerformanceFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setForm(item ? buildFormFrom(item) : buildEmptyForm());
  }, [open, item]);

  const patch = <K extends keyof PerformanceFormState>(
    key: K,
    value: PerformanceFormState[K],
  ): void => setForm((prev: PerformanceFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.employeeName.trim()) { toast.error('请输入员工姓名'); return; }
    if (!form.department.trim()) { toast.error('请输入部门'); return; }
    const employeeId: number = Number(form.employeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      toast.error('员工ID必须为正整数');
      return;
    }
    if (!form.goals.trim()) {
      toast.error('请输入目标内容（KPI 指标或 OKR 目标）');
      return;
    }
    const body: CreateHrPerformanceBody = {
      employeeId,
      employeeName: form.employeeName.trim(),
      department: form.department.trim(),
      goals: form.goals.trim(),
      grade: form.grade,
      period: form.period,
      mode: form.mode,
    };
    setSubmitting(true);
    try {
      if (item) {
        await updateHrPerformance(item.id, body);
        toast.success('绩效记录已更新');
      } else {
        await createHrPerformance(body);
        toast.success('绩效记录已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportCompError('保存绩效记录失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{item ? '编辑绩效' : '新建绩效'}</DialogTitle>
          <DialogDescription>设定考核周期与目标（KPI 指标或 OKR 目标）</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrFormField label="员工姓名" required>
            <Input
              className="rounded-none" value={form.employeeName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('employeeName', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="员工ID" required>
            <Input
              className="rounded-none" type="number" min="1" value={form.employeeId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('employeeId', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="部门" required>
            <Input
              className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('department', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="考核周期">
            <Select value={form.period} onValueChange={(value: string) => patch('period', value)}>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="考核周期" />
              </SelectTrigger>
              <SelectContent>
                {HR_PERF_PERIOD_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="考核模式">
            <Select value={form.mode} onValueChange={(value: string) => patch('mode', value)}>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="考核模式" />
              </SelectTrigger>
              <SelectContent>
                {HR_PERF_MODE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="等级">
            <Select value={form.grade} onValueChange={(value: string) => patch('grade', value)}>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="等级" />
              </SelectTrigger>
              <SelectContent>
                {HR_PERF_GRADE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <div className="min-w-[200px] flex-1 space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              目标内容（KPI 指标或 OKR 目标） <span className="text-destructive">*</span>
            </label>
            <Textarea
              className="rounded-none" rows={4} value={form.goals}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('goals', event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
