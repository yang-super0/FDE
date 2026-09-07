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
import type { FinanceIncentive, IncentiveIssueRequest } from '@shared/api.interface';
import {
  createFinanceIncentive, issueFinanceIncentive,
} from '@client/src/api/finance-enhance/advances';
import { FinanceFormField } from '../finance-constants';
import { AccountSelect, reportError } from './advances-shared';
import { INCENTIVE_TYPE_OPTIONS } from './incentive-options';

interface IncentiveFormDialogProps {
  open: boolean; onSaved: () => void; onOpenChange: (open: boolean) => void;
}

interface IncentiveFormState {
  employeeName: string; department: string; incentiveType: string;
  amount: string; reason: string;
}

const buildEmptyForm = (): IncentiveFormState => ({
  employeeName: '', department: '', incentiveType: INCENTIVE_TYPE_OPTIONS[0],
  amount: '', reason: '',
});

export function IncentiveFormDialog({ open, onSaved, onOpenChange }: IncentiveFormDialogProps) {
  const [form, setForm] = useState<IncentiveFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) setForm(buildEmptyForm());
  }, [open]);
  const patch = <K extends keyof IncentiveFormState>(key: K, value: IncentiveFormState[K]): void =>
    setForm((prev: IncentiveFormState) => ({ ...prev, [key]: value }));
  const handleSubmit = async (): Promise<void> => {
    if (!form.employeeName.trim()) { toast.error('请输入员工姓名'); return; }
    if (!form.reason.trim()) { toast.error('请输入激励事由'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('金额必须为大于 0 的数字'); return; }
    setSubmitting(true);
    try {
      await createFinanceIncentive({
        employeeName: form.employeeName.trim(),
        department: form.department.trim() || undefined,
        incentiveType: form.incentiveType,
        amount,
        reason: form.reason.trim(),
      });
      toast.success('激励已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存激励失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建激励</DialogTitle>
          <DialogDescription>登记一笔新的员工激励记录</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="员工姓名" required>
            <Input className="rounded-none" value={form.employeeName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('employeeName', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="部门">
            <Input className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('department', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="激励类型">
            <Select value={form.incentiveType} onValueChange={(value: string) => patch('incentiveType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="激励类型" /></SelectTrigger>
              <SelectContent>
                {INCENTIVE_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="金额" required>
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </FinanceFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              激励事由 <span className="text-destructive">*</span>
            </label>
            <Textarea className="rounded-none" rows={2} value={form.reason}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('reason', event.target.value)} />
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

interface IncentiveIssueDialogProps {
  open: boolean; incentive: FinanceIncentive | null;
  onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function IncentiveIssueDialog({ open, incentive, onDone, onOpenChange }: IncentiveIssueDialogProps) {
  const [accountId, setAccountId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) {
      setAccountId('');
      setSubmitting(false);
    }
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (!incentive) return;
    if (!accountId) { toast.error('请选择资金账户'); return; }
    const body: IncentiveIssueRequest = { accountId: Number(accountId) };
    setSubmitting(true);
    try {
      await issueFinanceIncentive(incentive.id, body);
      toast.success('激励发放成功');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('激励发放失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>激励发放</DialogTitle>
          <DialogDescription>
            {incentive
              ? `${incentive.incentiveNo} · ${incentive.employeeName} · ${incentive.incentiveType}，请选择发放使用的资金账户`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <FinanceFormField label="资金账户" required>
          <AccountSelect value={accountId} onChange={setAccountId} placeholder="选择资金账户" />
        </FinanceFormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '发放中...' : '确认发放'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
