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
import type {
  CreateFinanceDepositRequest, DepositReturnRequest, FinanceDeposit,
} from '@shared/api.interface';
import {
  createFinanceDeposit, returnFinanceDeposit,
} from '@client/src/api/finance-enhance/expenses';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { FinanceFormField, formatFinanceAmount } from '../finance-constants';
import { AccountSelect, reportError } from './expenses-shared';

export const DEPOSIT_TYPE_OPTIONS: string[] = ['保证金', '押金'];

interface DepositFormDialogProps {
  open: boolean; onSaved: () => void; onOpenChange: (open: boolean) => void;
}

interface DepositFormState {
  customerId: string; customerName: string; depositType: string;
  amount: string; collectDate: Date | undefined; collectAccount: string; remark: string;
}

const buildEmptyForm = (): DepositFormState => ({
  customerId: '', customerName: '', depositType: DEPOSIT_TYPE_OPTIONS[0],
  amount: '', collectDate: new Date(), collectAccount: '', remark: '',
});

export function DepositFormDialog({ open, onSaved, onOpenChange }: DepositFormDialogProps) {
  const [form, setForm] = useState<DepositFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) setForm(buildEmptyForm());
  }, [open]);
  const patch = <K extends keyof DepositFormState>(key: K, value: DepositFormState[K]): void =>
    setForm((prev: DepositFormState) => ({ ...prev, [key]: value }));
  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId.trim()) { toast.error('请输入客户 ID'); return; }
    if (!form.customerName.trim()) { toast.error('请输入客户名称'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('金额必须为大于 0 的数字'); return; }
    if (!form.collectAccount.trim()) { toast.error('请输入收款账户'); return; }
    const body: CreateFinanceDepositRequest = {
      customerId: form.customerId.trim(),
      customerName: form.customerName.trim(),
      depositType: form.depositType,
      amount,
      collectDate: form.collectDate ? dayjs(form.collectDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      collectAccount: form.collectAccount.trim(),
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await createFinanceDeposit(body);
      toast.success('保证金/押金已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存保证金/押金失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建保证金/押金</DialogTitle>
          <DialogDescription>登记一笔新的保证金或押金收取记录</DialogDescription>
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
          <FinanceFormField label="类型">
            <Select value={form.depositType} onValueChange={(value: string) => patch('depositType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="类型" /></SelectTrigger>
              <SelectContent>
                {DEPOSIT_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="金额" required>
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="收取日期" required>
            <AdsDatePickerButton value={form.collectDate} placeholder="收取日期"
              onChange={(date: Date | undefined) => { if (date) patch('collectDate', date); }} />
          </FinanceFormField>
          <FinanceFormField label="收款账户" required>
            <Input className="rounded-none" value={form.collectAccount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('collectAccount', event.target.value)} />
          </FinanceFormField>
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

interface DepositReturnDialogProps {
  open: boolean; deposit: FinanceDeposit | null;
  onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function DepositReturnDialog({ open, deposit, onDone, onOpenChange }: DepositReturnDialogProps) {
  const [returnAmount, setReturnAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const remaining: number = deposit ? deposit.amount - deposit.returnedAmount : 0;
  useEffect(() => {
    if (open) {
      setReturnAmount('');
      setAccountId('');
      setReturnDate(undefined);
      setSubmitting(false);
    }
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (!deposit) return;
    const amount: number = Number(returnAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('退还金额必须为大于 0 的数字'); return; }
    if (amount > remaining) { toast.error(`退还金额不能超过剩余可退金额 ${formatFinanceAmount(remaining)}`); return; }
    if (!accountId) { toast.error('请选择资金账户'); return; }
    const body: DepositReturnRequest = {
      returnAmount: amount,
      accountId: Number(accountId),
      returnDate: returnDate ? dayjs(returnDate).format('YYYY-MM-DD') : undefined,
    };
    setSubmitting(true);
    try {
      await returnFinanceDeposit(deposit.id, body);
      toast.success('退还登记成功');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('退还登记失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>保证金/押金退还登记</DialogTitle>
          <DialogDescription>
            {deposit
              ? `${deposit.depositNo} · ${deposit.customerName} · 剩余可退 ${formatFinanceAmount(remaining)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="退还金额" required>
            <Input className="rounded-none" type="number" min="0" value={returnAmount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setReturnAmount(event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="资金账户" required>
            <AccountSelect value={accountId} onChange={setAccountId} placeholder="选择资金账户" />
          </FinanceFormField>
          <FinanceFormField label="退还日期">
            <AdsDatePickerButton value={returnDate} placeholder="退还日期"
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
