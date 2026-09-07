import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import { useFieldPermissions } from '@client/src/hooks/useFieldPermissions';
import type { CreateHrSalaryBody, HrSalary } from '@shared/api.interface';
import { createHrSalary, updateHrSalary } from '@client/src/api/hr-enhance/compensation';
import { HrFormField } from '../hr-enhance-constants';
import { reportCompError } from './compensation-shared';

interface SalaryFormState {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  salaryMonth: string;
  baseSalary: string;
  performanceSalary: string;
  allowance: string;
  deduction: string;
  tax: string;
  socialInsurance: string;
}

interface SalaryFormDialogProps {
  open: boolean;
  item: HrSalary | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const SALARY_AMOUNT_FIELDS: { key: keyof SalaryFormState; label: string; permField: string }[] = [
  { key: 'baseSalary', label: '基本工资', permField: 'base_salary' },
  { key: 'performanceSalary', label: '绩效工资', permField: 'performance_salary' },
  { key: 'allowance', label: '补贴', permField: 'allowance' },
  { key: 'deduction', label: '扣款', permField: 'deduction' },
  { key: 'tax', label: '个税', permField: 'tax' },
  { key: 'socialInsurance', label: '社保', permField: 'social_insurance' },
];

const buildEmptyForm = (): SalaryFormState => ({
  employeeId: '',
  employeeName: '',
  department: '',
  position: '',
  salaryMonth: dayjs().format('YYYY-MM'),
  baseSalary: '0',
  performanceSalary: '0',
  allowance: '0',
  deduction: '0',
  tax: '0',
  socialInsurance: '0',
});

const buildFormFrom = (item: HrSalary): SalaryFormState => ({
  employeeId: String(item.employeeId),
  employeeName: item.employeeName,
  department: item.department,
  position: item.position,
  salaryMonth: item.salaryMonth,
  baseSalary: item.baseSalary,
  performanceSalary: item.performanceSalary,
  allowance: item.allowance,
  deduction: item.deduction,
  tax: item.tax,
  socialInsurance: item.socialInsurance,
});

export function SalaryFormDialog({ open, item, onSaved, onOpenChange }: SalaryFormDialogProps) {
  const [form, setForm] = useState<SalaryFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { fields: permFields } = useFieldPermissions('人资');

  const isFieldEditable = (fieldName: string): boolean =>
    permFields.get(fieldName)?.editable !== false;

  useEffect(() => {
    if (open) setForm(item ? buildFormFrom(item) : buildEmptyForm());
  }, [open, item]);

  const patch = <K extends keyof SalaryFormState>(
    key: K,
    value: SalaryFormState[K],
  ): void => setForm((prev: SalaryFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.employeeName.trim()) { toast.error('请输入员工姓名'); return; }
    if (!form.department.trim()) { toast.error('请输入部门'); return; }
    if (!form.position.trim()) { toast.error('请输入岗位'); return; }
    const employeeId: number = Number(form.employeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      toast.error('员工ID必须为正整数');
      return;
    }
    if (!/^\d{4}-\d{2}$/u.test(form.salaryMonth.trim())) {
      toast.error('请输入正确的工资月份，格式 YYYY-MM');
      return;
    }
    for (const field of SALARY_AMOUNT_FIELDS) {
      if (!isFieldEditable(field.permField)) continue;
      const raw: string = form[field.key].trim() || '0';
      const value: number = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        toast.error(`${field.label}必须为不小于 0 的数字`);
        return;
      }
    }
    const body: CreateHrSalaryBody = {
      employeeId,
      employeeName: form.employeeName.trim(),
      department: form.department.trim(),
      position: form.position.trim(),
      salaryMonth: form.salaryMonth.trim(),
      baseSalary: form.baseSalary.trim() || '0',
      performanceSalary: form.performanceSalary.trim() || '0',
      allowance: form.allowance.trim() || '0',
      deduction: form.deduction.trim() || '0',
      tax: form.tax.trim() || '0',
      socialInsurance: form.socialInsurance.trim() || '0',
    };
    setSubmitting(true);
    try {
      if (item) {
        await updateHrSalary(item.id, body);
        toast.success('工资条已更新');
      } else {
        await createHrSalary(body);
        toast.success('工资条已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportCompError('保存工资条失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{item ? '编辑工资条' : '新建工资条'}</DialogTitle>
          <DialogDescription>登记员工月度工资明细</DialogDescription>
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
          <HrFormField label="岗位" required>
            <Input
              className="rounded-none" value={form.position}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('position', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="工资月份" required>
            <Input
              className="rounded-none" placeholder="YYYY-MM" value={form.salaryMonth}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('salaryMonth', event.target.value)}
            />
          </HrFormField>
          {SALARY_AMOUNT_FIELDS.map((field: { key: keyof SalaryFormState; label: string; permField: string }) => (
            <HrFormField key={field.key} label={field.label}>
              <Input
                className="rounded-none" type="number" min="0" step="0.01" value={form[field.key]}
                disabled={!isFieldEditable(field.permField)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch(field.key, event.target.value)}
              />
            </HrFormField>
          ))}
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
