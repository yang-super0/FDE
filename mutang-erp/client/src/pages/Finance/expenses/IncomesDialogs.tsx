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
import type { CreateFinanceIncomeRequest } from '@shared/api.interface';
import { createFinanceIncome } from '@client/src/api/finance-enhance/expenses';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { FinanceFormField } from '../finance-constants';
import { AccountSelect, reportError } from './expenses-shared';

const INCOME_TYPE_OPTIONS: string[] = ['服务费', '返点差', '利息', '其他'];

interface IncomeFormDialogProps {
  open: boolean; onSaved: () => void; onOpenChange: (open: boolean) => void;
}

interface IncomeFormState {
  incomeType: string; customerName: string; amount: string;
  accountId: string; incomeDate: Date | undefined;
  relatedOrderNo: string; remark: string;
}

const buildEmptyForm = (): IncomeFormState => ({
  incomeType: INCOME_TYPE_OPTIONS[0], customerName: '', amount: '',
  accountId: '', incomeDate: new Date(), relatedOrderNo: '', remark: '',
});

export function IncomeFormDialog({ open, onSaved, onOpenChange }: IncomeFormDialogProps) {
  const [form, setForm] = useState<IncomeFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) setForm(buildEmptyForm());
  }, [open]);
  const patch = <K extends keyof IncomeFormState>(key: K, value: IncomeFormState[K]): void =>
    setForm((prev: IncomeFormState) => ({ ...prev, [key]: value }));
  const handleSubmit = async (): Promise<void> => {
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('金额必须为大于 0 的数字'); return; }
    if (!form.accountId) { toast.error('请选择资金账户'); return; }
    const body: CreateFinanceIncomeRequest = {
      incomeType: form.incomeType,
      customerName: form.customerName.trim() || undefined,
      amount,
      accountId: Number(form.accountId),
      incomeDate: form.incomeDate ? dayjs(form.incomeDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      relatedOrderNo: form.relatedOrderNo.trim() || undefined,
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await createFinanceIncome(body);
      toast.success('收入已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存收入失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建收入</DialogTitle>
          <DialogDescription>登记一笔新的收入记录</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="收入类型">
            <Select value={form.incomeType} onValueChange={(value: string) => patch('incomeType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="收入类型" /></SelectTrigger>
              <SelectContent>
                {INCOME_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="客户名称">
            <Input className="rounded-none" value={form.customerName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('customerName', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="金额" required>
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="资金账户" required>
            <AccountSelect value={form.accountId}
              onChange={(value: string) => patch('accountId', value)} placeholder="选择资金账户" />
          </FinanceFormField>
          <FinanceFormField label="收入日期" required>
            <AdsDatePickerButton value={form.incomeDate} placeholder="收入日期"
              onChange={(date: Date | undefined) => { if (date) patch('incomeDate', date); }} />
          </FinanceFormField>
          <FinanceFormField label="关联订单号">
            <Input className="rounded-none" value={form.relatedOrderNo}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('relatedOrderNo', event.target.value)} />
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
