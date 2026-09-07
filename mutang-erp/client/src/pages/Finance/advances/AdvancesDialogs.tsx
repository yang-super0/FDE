import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { AdvanceReturnRequest, FinanceAdvance } from '@shared/api.interface';
import { createFinanceAdvance, returnFinanceAdvance } from '@client/src/api/finance-enhance/advances';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { FinanceFormField, formatFinanceAmount } from '../finance-constants';
import { AccountSelect, reportError } from './advances-shared';

interface AdvanceFormDialogProps {
  open: boolean; onSaved: () => void; onOpenChange: (open: boolean) => void;
}

interface AdvanceFormState {
  customerId: string; customerName: string; amount: string;
  reason: string; expectedReturnDate: Date | undefined; remark: string;
}

const buildEmptyForm = (): AdvanceFormState => ({
  customerId: '', customerName: '', amount: '',
  reason: '', expectedReturnDate: undefined, remark: '',
});

export function AdvanceFormDialog({ open, onSaved, onOpenChange }: AdvanceFormDialogProps) {
  const [form, setForm] = useState<AdvanceFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) setForm(buildEmptyForm());
  }, [open]);
  const patch = <K extends keyof AdvanceFormState>(key: K, value: AdvanceFormState[K]): void =>
    setForm((prev: AdvanceFormState) => ({ ...prev, [key]: value }));
  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId.trim()) { toast.error('请输入客户 ID'); return; }
    if (!form.customerName.trim()) { toast.error('请输入客户名称'); return; }
    if (!form.reason.trim()) { toast.error('请输入垫款事由'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('金额必须为大于 0 的数字'); return; }
    setSubmitting(true);
    try {
      await createFinanceAdvance({
        customerId: form.customerId.trim(),
        customerName: form.customerName.trim(),
        amount,
        reason: form.reason.trim(),
        expectedReturnDate: form.expectedReturnDate
          ? dayjs(form.expectedReturnDate).format('YYYY-MM-DD') : undefined,
        remark: form.remark.trim() || undefined,
      });
      toast.success('垫款已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存垫款失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建垫款</DialogTitle>
          <DialogDescription>登记一笔新的客户垫款记录</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="客户 ID" required>
            <Input className="rounded-none" value={form.customerId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('customerId', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="客户名称" required>
            <Input className="rounded-none" value={form.customerName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('customerName', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="金额" required>
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="预计归还日期">
            <AdsDatePickerButton value={form.expectedReturnDate} placeholder="预计归还日期"
              onChange={(date: Date | undefined) => patch('expectedReturnDate', date)} />
          </FinanceFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              垫款事由 <span className="text-destructive">*</span>
            </label>
            <Textarea className="rounded-none" rows={2} value={form.reason}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('reason', event.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('remark', event.target.value)} />
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

interface AdvanceReturnDialogProps {
  open: boolean; advance: FinanceAdvance | null;
  onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function AdvanceReturnDialog({ open, advance, onDone, onOpenChange }: AdvanceReturnDialogProps) {
  const [returnAmount, setReturnAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const remaining: number = advance ? advance.amount - advance.returnedAmount : 0;
  useEffect(() => {
    if (open) {
      setReturnAmount('');
      setAccountId('');
      setReturnDate(undefined);
      setSubmitting(false);
    }
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (!advance) return;
    const amount: number = Number(returnAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('收回金额必须为大于 0 的数字'); return; }
    if (amount > remaining) { toast.error(`收回金额不能超过剩余未收回金额 ${formatFinanceAmount(remaining)}`); return; }
    if (!accountId) { toast.error('请选择资金账户'); return; }
    const body: AdvanceReturnRequest = {
      returnAmount: amount,
      accountId: Number(accountId),
      returnDate: returnDate ? dayjs(returnDate).format('YYYY-MM-DD') : undefined,
    };
    setSubmitting(true);
    try {
      await returnFinanceAdvance(advance.id, body);
      toast.success('垫款收回登记成功');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('垫款收回登记失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>垫款收回登记</DialogTitle>
          <DialogDescription>
            {advance ? `${advance.advanceNo} · ${advance.customerName} · 剩余未收回 ${formatFinanceAmount(remaining)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="收回金额" required>
            <Input className="rounded-none" type="number" min="0" value={returnAmount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setReturnAmount(event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="资金账户" required>
            <AccountSelect value={accountId} onChange={setAccountId} placeholder="选择资金账户" />
          </FinanceFormField>
          <FinanceFormField label="收回日期">
            <AdsDatePickerButton value={returnDate} placeholder="收回日期"
              onChange={(date: Date | undefined) => setReturnDate(date)} />
          </FinanceFormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '确认登记'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
