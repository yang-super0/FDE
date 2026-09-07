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
  CreateFinanceExpenseRequest, ExpensePayRequest, FinanceExpense,
} from '@shared/api.interface';
import { createFinanceExpense, payFinanceExpense } from '@client/src/api/finance-enhance/expenses';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { FinanceFormField, formatFinanceAmount } from '../finance-constants';
import { AccountSelect, reportError } from './expenses-shared';

const EXPENSE_TYPE_OPTIONS: string[] = ['办公费', '差旅费', '招待费', '工资', '社保', '其他'];

interface ExpenseFormDialogProps {
  open: boolean; onSaved: () => void; onOpenChange: (open: boolean) => void;
}

interface ExpenseFormState {
  expenseType: string; amount: string; applicant: string;
  applyDate: Date | undefined; remark: string;
}

const buildEmptyForm = (): ExpenseFormState => ({
  expenseType: EXPENSE_TYPE_OPTIONS[0], amount: '', applicant: '',
  applyDate: new Date(), remark: '',
});

export function ExpenseFormDialog({ open, onSaved, onOpenChange }: ExpenseFormDialogProps) {
  const [form, setForm] = useState<ExpenseFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) setForm(buildEmptyForm());
  }, [open]);
  const patch = <K extends keyof ExpenseFormState>(key: K, value: ExpenseFormState[K]): void =>
    setForm((prev: ExpenseFormState) => ({ ...prev, [key]: value }));
  const handleSubmit = async (): Promise<void> => {
    if (!form.applicant.trim()) { toast.error('请输入申请人'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('金额必须为大于 0 的数字'); return; }
    const body: CreateFinanceExpenseRequest = {
      expenseType: form.expenseType,
      amount,
      applicant: form.applicant.trim(),
      applyDate: form.applyDate ? dayjs(form.applyDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await createFinanceExpense(body);
      toast.success('支出已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存支出失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建支出</DialogTitle>
          <DialogDescription>登记一笔新的支出记录</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="支出类型">
            <Select value={form.expenseType} onValueChange={(value: string) => patch('expenseType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="支出类型" /></SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="金额" required>
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="申请人" required>
            <Input className="rounded-none" value={form.applicant}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('applicant', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="申请日期" required>
            <AdsDatePickerButton value={form.applyDate} placeholder="申请日期"
              onChange={(date: Date | undefined) => { if (date) patch('applyDate', date); }} />
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

interface ExpensePayDialogProps {
  open: boolean; expense: FinanceExpense | null;
  onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function ExpensePayDialog({ open, expense, onDone, onOpenChange }: ExpensePayDialogProps) {
  const [accountId, setAccountId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) {
      setAccountId('');
      setSubmitting(false);
    }
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (!expense) return;
    if (!accountId) { toast.error('请选择资金账户'); return; }
    const body: ExpensePayRequest = { accountId: Number(accountId) };
    setSubmitting(true);
    try {
      await payFinanceExpense(expense.id, body);
      toast.success('支出支付成功');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('支出支付失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>支出支付</DialogTitle>
          <DialogDescription>
            {expense
              ? `${expense.expenseNo} · ${expense.expenseType} · ${formatFinanceAmount(expense.amount)}，请选择支付使用的资金账户`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <FinanceFormField label="资金账户" required>
          <AccountSelect value={accountId} onChange={setAccountId} placeholder="选择资金账户" />
        </FinanceFormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '支付中...' : '确认支付'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
