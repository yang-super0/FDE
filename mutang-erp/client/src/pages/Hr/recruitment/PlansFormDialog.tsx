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
import type {
  CreateHrRecruitmentPlanBody, HrRecruitmentPlan, UpdateHrRecruitmentPlanBody,
} from '@shared/api.interface';
import {
  createRecruitmentPlan, updateRecruitmentPlan,
} from '@client/src/api/hr-enhance/recruitment';
import {
  HR_PLAN_PRIORITY_OPTIONS, HR_PLAN_STATUS_OPTIONS, HrFormField,
} from '../hr-enhance-constants';
import { isValidHrDate, reportRecruitError } from './recruitment-shared';

interface PlansFormState {
  planName: string;
  department: string;
  position: string;
  requirementDescription: string;
  headcount: string;
  hiredCount: string;
  priority: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface PlansFormDialogProps {
  open: boolean;
  editing: HrRecruitmentPlan | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): PlansFormState => ({
  planName: '',
  department: '',
  position: '',
  requirementDescription: '',
  headcount: '1',
  hiredCount: '0',
  priority: HR_PLAN_PRIORITY_OPTIONS[1],
  status: HR_PLAN_STATUS_OPTIONS[0],
  startDate: '',
  endDate: '',
});

const buildFormFromItem = (item: HrRecruitmentPlan): PlansFormState => ({
  planName: item.planName,
  department: item.department,
  position: item.position,
  requirementDescription: item.requirementDescription,
  headcount: String(item.headcount ?? 1),
  hiredCount: String(item.hiredCount ?? 0),
  priority: item.priority || HR_PLAN_PRIORITY_OPTIONS[1],
  status: item.status || HR_PLAN_STATUS_OPTIONS[0],
  startDate: item.startDate ?? '',
  endDate: item.endDate ?? '',
});

export function PlansFormDialog({
  open, editing, onSaved, onOpenChange,
}: PlansFormDialogProps) {
  const [form, setForm] = useState<PlansFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof PlansFormState>(
    key: K,
    value: PlansFormState[K],
  ): void => setForm((prev: PlansFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.planName.trim()) { toast.error('请输入计划名称'); return; }
    if (!form.department.trim()) { toast.error('请输入部门'); return; }
    if (!form.position.trim()) { toast.error('请输入职位'); return; }
    if (!form.requirementDescription.trim()) { toast.error('请输入需求描述'); return; }
    const headcount: number = Number(form.headcount);
    if (!Number.isInteger(headcount) || headcount <= 0) {
      toast.error('需求人数必须为正整数');
      return;
    }
    const hiredCount: number = Number(form.hiredCount);
    if (!Number.isInteger(hiredCount) || hiredCount < 0) {
      toast.error('已入职人数必须为不小于 0 的整数');
      return;
    }
    if (!isValidHrDate(form.startDate.trim()) || !isValidHrDate(form.endDate.trim())) {
      toast.error('日期格式须为 YYYY-MM-DD');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateHrRecruitmentPlanBody = {
          planName: form.planName.trim(),
          department: form.department.trim(),
          position: form.position.trim(),
          requirementDescription: form.requirementDescription.trim(),
          headcount,
          hiredCount,
          priority: form.priority,
          status: form.status,
          startDate: form.startDate.trim() || null,
          endDate: form.endDate.trim() || null,
        };
        await updateRecruitmentPlan(editing.id, body);
        toast.success('招聘计划已更新');
      } else {
        const body: CreateHrRecruitmentPlanBody = {
          planName: form.planName.trim(),
          department: form.department.trim(),
          position: form.position.trim(),
          requirementDescription: form.requirementDescription.trim(),
          headcount,
          hiredCount,
          priority: form.priority,
          status: form.status,
          startDate: form.startDate.trim() || null,
          endDate: form.endDate.trim() || null,
        };
        await createRecruitmentPlan(body);
        toast.success('招聘计划已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRecruitError('保存招聘计划失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑招聘计划' : '新建招聘计划'}</DialogTitle>
          <DialogDescription>
            {editing ? `计划编号：${editing.planNo}` : '创建一条部门招聘计划'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrFormField label="计划名称" required>
            <Input className="rounded-none" value={form.planName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('planName', event.target.value)} />
          </HrFormField>
          <HrFormField label="部门" required>
            <Input className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('department', event.target.value)} />
          </HrFormField>
          <HrFormField label="职位" required>
            <Input className="rounded-none" value={form.position}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('position', event.target.value)} />
          </HrFormField>
          <HrFormField label="需求人数" required>
            <Input className="rounded-none" type="number" min="1" value={form.headcount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('headcount', event.target.value)} />
          </HrFormField>
          <HrFormField label="已入职人数">
            <Input className="rounded-none" type="number" min="0" value={form.hiredCount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('hiredCount', event.target.value)} />
          </HrFormField>
          <HrFormField label="优先级">
            <Select value={form.priority} onValueChange={(value: string) => patch('priority', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="优先级" /></SelectTrigger>
              <SelectContent>
                {HR_PLAN_PRIORITY_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="状态">
            <Select value={form.status} onValueChange={(value: string) => patch('status', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                {HR_PLAN_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="开始日期">
            <Input className="rounded-none" value={form.startDate}
              placeholder="YYYY-MM-DD"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('startDate', event.target.value)} />
          </HrFormField>
          <HrFormField label="结束日期">
            <Input className="rounded-none" value={form.endDate}
              placeholder="YYYY-MM-DD"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('endDate', event.target.value)} />
          </HrFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              需求描述 <span className="text-destructive">*</span>
            </label>
            <Textarea className="rounded-none" rows={3} value={form.requirementDescription}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('requirementDescription', event.target.value)} />
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
