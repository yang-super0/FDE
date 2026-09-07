import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
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
import type { CreateHrEmployeeBody, HrEmployee, UpdateHrEmployeeBody } from '@shared/api.interface';
import { createHrEmployee, updateHrEmployee } from '@client/src/api/hr-enhance/staff';
import { HR_GENDER_OPTIONS, HrFormField, toHrErrorText } from '../hr-enhance-constants';

interface EmployeeFormState {
  name: string;
  gender: string;
  phone: string;
  email: string;
  idCard: string;
  department: string;
  position: string;
  level: string;
  entryDate: string;
  emergencyContact: string;
  emergencyPhone: string;
  bankName: string;
  bankAccount: string;
  remark: string;
}

interface EmployeeFormDialogProps {
  open: boolean;
  employee: HrEmployee | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const isDateInputValid = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/u.test(value) && dayjs(value).isValid();

const buildEmptyForm = (): EmployeeFormState => ({
  name: '', gender: '', phone: '', email: '', idCard: '', department: '',
  position: '', level: '', entryDate: '', emergencyContact: '',
  emergencyPhone: '', bankName: '', bankAccount: '', remark: '',
});

const buildFormFromEmployee = (employee: HrEmployee): EmployeeFormState => ({
  name: employee.name,
  gender: employee.gender,
  phone: employee.phone,
  email: employee.email,
  idCard: employee.idCard,
  department: employee.department,
  position: employee.position,
  level: employee.level,
  entryDate: employee.entryDate ? dayjs(employee.entryDate).format('YYYY-MM-DD') : '',
  emergencyContact: employee.emergencyContact,
  emergencyPhone: employee.emergencyPhone,
  bankName: employee.bankName,
  bankAccount: employee.bankAccount,
  remark: employee.remark,
});

export function EmployeeFormDialog({
  open, employee, onSaved, onOpenChange,
}: EmployeeFormDialogProps) {
  const [form, setForm] = useState<EmployeeFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setForm(employee ? buildFormFromEmployee(employee) : buildEmptyForm());
    }
  }, [open, employee]);

  const patch = <K extends keyof EmployeeFormState>(
    key: K,
    value: EmployeeFormState[K],
  ): void => setForm((prev: EmployeeFormState) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return '请输入姓名';
    if (!form.gender) return '请选择性别';
    if (!form.phone.trim()) return '请输入手机号';
    if (!form.email.trim()) return '请输入邮箱';
    if (!form.idCard.trim()) return '请输入身份证号';
    if (!form.department.trim()) return '请输入部门';
    if (!form.position.trim()) return '请输入岗位';
    if (!form.level.trim()) return '请输入职级';
    if (!isDateInputValid(form.entryDate)) return '请输入正确的入职日期（YYYY-MM-DD）';
    return null;
  };

  const handleSubmit = async (): Promise<void> => {
    const error: string | null = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setSubmitting(true);
    try {
      if (employee) {
        const body: UpdateHrEmployeeBody = {
          name: form.name.trim(),
          gender: form.gender,
          phone: form.phone.trim(),
          email: form.email.trim(),
          idCard: form.idCard.trim(),
          department: form.department.trim(),
          position: form.position.trim(),
          level: form.level.trim(),
          entryDate: form.entryDate,
          emergencyContact: form.emergencyContact.trim() || undefined,
          emergencyPhone: form.emergencyPhone.trim() || undefined,
          bankName: form.bankName.trim() || undefined,
          bankAccount: form.bankAccount.trim() || undefined,
          remark: form.remark.trim() || undefined,
        };
        await updateHrEmployee(employee.id, body);
        toast.success('员工档案已更新');
      } else {
        const body: CreateHrEmployeeBody = {
          name: form.name.trim(),
          gender: form.gender,
          phone: form.phone.trim(),
          email: form.email.trim(),
          idCard: form.idCard.trim(),
          department: form.department.trim(),
          position: form.position.trim(),
          level: form.level.trim(),
          entryDate: form.entryDate,
          emergencyContact: form.emergencyContact.trim() || undefined,
          emergencyPhone: form.emergencyPhone.trim() || undefined,
          bankName: form.bankName.trim() || undefined,
          bankAccount: form.bankAccount.trim() || undefined,
          remark: form.remark.trim() || undefined,
        };
        await createHrEmployee(body);
        toast.success('员工已入职登记');
      }
      onOpenChange(false);
      onSaved();
    } catch (submitError: unknown) {
      toast.error(toHrErrorText(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{employee ? '编辑员工档案' : '员工入职登记'}</DialogTitle>
          <DialogDescription>
            {employee
              ? `更新员工「${employee.name}」的档案信息`
              : '登记新员工的入职档案信息，带 * 为必填项'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrFormField label="姓名" required>
            <Input
              className="rounded-none" value={form.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('name', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="性别" required>
            <Select value={form.gender || undefined} onValueChange={(value: string) => patch('gender', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="选择性别" /></SelectTrigger>
              <SelectContent>
                {HR_GENDER_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="手机号" required>
            <Input
              className="rounded-none" value={form.phone}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('phone', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="邮箱" required>
            <Input
              className="rounded-none" value={form.email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('email', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="身份证号" required>
            <Input
              className="rounded-none" value={form.idCard}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('idCard', event.target.value)}
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
          <HrFormField label="职级" required>
            <Input
              className="rounded-none" value={form.level} placeholder="如 P5 / M2"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('level', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="入职日期" required>
            <Input
              className="rounded-none" value={form.entryDate} placeholder="YYYY-MM-DD"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('entryDate', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="紧急联系人">
            <Input
              className="rounded-none" value={form.emergencyContact}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('emergencyContact', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="紧急联系电话">
            <Input
              className="rounded-none" value={form.emergencyPhone}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('emergencyPhone', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="开户银行">
            <Input
              className="rounded-none" value={form.bankName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('bankName', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="银行账号">
            <Input
              className="rounded-none" value={form.bankAccount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('bankAccount', event.target.value)}
            />
          </HrFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea
              className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('remark', event.target.value)}
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
