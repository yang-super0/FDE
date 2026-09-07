import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { HrEmployee } from '@shared/api.interface';
import {
  leaveApplyHrEmployee, regularHrEmployee,
  transferApplyHrEmployee, transferConfirmHrEmployee,
} from '@client/src/api/hr-enhance/staff';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { HrFormField, toHrErrorText } from '../hr-enhance-constants';

export type HrEmployeeFlowAction =
  | 'regular'
  | 'transfer-apply'
  | 'transfer-confirm'
  | 'leave-apply';

export interface HrEmployeeFlowPending {
  item: HrEmployee;
  action: HrEmployeeFlowAction;
}

interface FlowFormState {
  regularDate: string;
  reason: string;
  department: string;
  position: string;
  leaveReason: string;
  leaveDate: string;
}

interface EmployeeFlowDialogProps {
  pending: HrEmployeeFlowPending | null;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
}

const FLOW_META: Record<HrEmployeeFlowAction, {
  title: string; description: string; confirmText: string; danger: boolean;
}> = {
  regular: {
    title: '员工转正',
    description: '登记转正日期，试用期员工将转为正式员工',
    confirmText: '确认转正', danger: false,
  },
  'transfer-apply': {
    title: '调岗申请',
    description: '提交调岗申请，员工将进入「调岗中」状态',
    confirmText: '提交申请', danger: false,
  },
  'transfer-confirm': {
    title: '调岗确认',
    description: '确认新部门与新岗位，完成本次调岗',
    confirmText: '确认调岗', danger: false,
  },
  'leave-apply': {
    title: '离职申请',
    description: '登记离职原因与离职日期，员工将进入「离职中」状态',
    confirmText: '提交申请', danger: true,
  },
};

const EMPTY_FORM: FlowFormState = {
  regularDate: '', reason: '', department: '', position: '',
  leaveReason: '', leaveDate: '',
};

const isDateInputValid = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/u.test(value) && dayjs(value).isValid();

export function EmployeeFlowDialog({
  pending, onDone, onOpenChange,
}: EmployeeFlowDialogProps) {
  const [form, setForm] = useState<FlowFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const action: HrEmployeeFlowAction | undefined = pending?.action;
  const meta = action ? FLOW_META[action] : null;

  useEffect(() => {
    if (pending) {
      setForm({
        ...EMPTY_FORM,
        department: pending.item.department,
        position: pending.item.position,
      });
      setConfirmOpen(false);
    }
  }, [pending]);

  const patch = <K extends keyof FlowFormState>(
    key: K,
    value: FlowFormState[K],
  ): void => setForm((prev: FlowFormState) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (!action) return null;
    if (action === 'regular' && !isDateInputValid(form.regularDate)) {
      return '请输入正确的转正日期（YYYY-MM-DD）';
    }
    if (action === 'transfer-confirm') {
      if (!form.department.trim()) return '请输入新部门';
      if (!form.position.trim()) return '请输入新岗位';
    }
    if (action === 'leave-apply') {
      if (!form.leaveReason.trim()) return '请输入离职原因';
      if (!isDateInputValid(form.leaveDate)) {
        return '请输入正确的离职日期（YYYY-MM-DD）';
      }
    }
    return null;
  };

  const handleSubmitClick = (): void => {
    const error: string | null = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setConfirmOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!pending || !action) return;
    setSubmitting(true);
    try {
      if (action === 'regular') {
        await regularHrEmployee(pending.item.id, { regularDate: form.regularDate });
      } else if (action === 'transfer-apply') {
        await transferApplyHrEmployee(pending.item.id, {
          reason: form.reason.trim() || undefined,
        });
      } else if (action === 'transfer-confirm') {
        await transferConfirmHrEmployee(pending.item.id, {
          department: form.department.trim(),
          position: form.position.trim(),
        });
      } else {
        await leaveApplyHrEmployee(pending.item.id, {
          leaveReason: form.leaveReason.trim(),
          leaveDate: form.leaveDate,
        });
      }
      toast.success(`${meta?.title ?? '操作'}已完成`);
      setConfirmOpen(false);
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (!pending || !meta || !action) return null;

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>{meta.title}</DialogTitle>
            <DialogDescription>{meta.description}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div className="border border-border p-3 text-sm">
              <span className="mr-2 text-xs font-bold text-muted-foreground">员工</span>
              {pending.item.employeeNo} · {pending.item.name} · {pending.item.department}
            </div>
            {action === 'regular' ? (
              <HrFormField label="转正日期" required>
                <Input
                  className="rounded-none" value={form.regularDate} placeholder="YYYY-MM-DD"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => patch('regularDate', event.target.value)}
                />
              </HrFormField>
            ) : null}
            {action === 'transfer-apply' ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">调岗原因</label>
                <Textarea
                  className="rounded-none" rows={3} value={form.reason}
                  placeholder="请说明调岗原因（选填）"
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('reason', event.target.value)}
                />
              </div>
            ) : null}
            {action === 'transfer-confirm' ? (
              <>
                <HrFormField label="新部门" required>
                  <Input
                    className="rounded-none" value={form.department}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => patch('department', event.target.value)}
                  />
                </HrFormField>
                <HrFormField label="新岗位" required>
                  <Input
                    className="rounded-none" value={form.position}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => patch('position', event.target.value)}
                  />
                </HrFormField>
              </>
            ) : null}
            {action === 'leave-apply' ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    离职原因 <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    className="rounded-none" rows={3} value={form.leaveReason}
                    placeholder="请输入离职原因"
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('leaveReason', event.target.value)}
                  />
                </div>
                <HrFormField label="离职日期" required>
                  <Input
                    className="rounded-none" value={form.leaveDate} placeholder="YYYY-MM-DD"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => patch('leaveDate', event.target.value)}
                  />
                </HrFormField>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button disabled={submitting} onClick={handleSubmitClick}>
              下一步
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AdsConfirmDialog
        open={confirmOpen}
        title={`确认执行「${meta.title}」？`}
        description={`即将对员工「${pending.item.name}」执行${meta.title}操作，提交后状态将更新。`}
        confirmText={meta.confirmText}
        destructive={meta.danger}
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmOpen(false);
        }}
        onConfirm={() => void handleSubmit()}
      />
    </>
  );
}
