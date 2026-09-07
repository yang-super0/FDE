import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import { createFinanceCustomerAdjustment } from '@client/src/api/finance-enhance/funds';
import { FinanceFormField } from '../finance-constants';
import {
  FundsAccountSelect, FundsCustomerSelect, reportFundsError,
  useFundAccountOptions, useFundCustomerOptions,
} from './funds-shared';

interface AdjustmentFormState {
  customerId: string;
  customerName: string;
  accountId: string;
  amount: string;
  remark: string;
}

interface AdjustmentFormDialogProps {
  open: boolean;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): AdjustmentFormState => ({
  customerId: '', customerName: '', accountId: '', amount: '', remark: '',
});

export function AdjustmentFormDialog({ open, onSaved, onOpenChange }: AdjustmentFormDialogProps) {
  const [form, setForm] = useState<AdjustmentFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const customers = useFundCustomerOptions();
  const accounts = useFundAccountOptions();

  useEffect(() => {
    if (open) setForm(buildEmptyForm());
  }, [open]);

  const patch = <K extends keyof AdjustmentFormState>(
    key: K,
    value: AdjustmentFormState[K],
  ): void => setForm((prev: AdjustmentFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId) { toast.error('请选择客户'); return; }
    if (!form.accountId) { toast.error('请选择资金账户'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('金额必须为大于 0 的数字');
      return;
    }
    setSubmitting(true);
    try {
      await createFinanceCustomerAdjustment({
        customerId: form.customerId,
        customerName: form.customerName,
        accountId: Number(form.accountId),
        transactionType: '调账',
        amount,
        remark: form.remark.trim() || undefined,
      });
      toast.success('调账记录已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportFundsError('保存调账失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建调账</DialogTitle>
          <DialogDescription>登记一笔客户资金调账记录</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="客户" required>
            <FundsCustomerSelect
              value={form.customerId}
              customers={customers}
              onChange={(customerId: string, customerName: string) => {
                setForm((prev: AdjustmentFormState) => ({
                  ...prev, customerId, customerName,
                }));
              }}
            />
          </FinanceFormField>
          <FinanceFormField label="资金账户" required>
            <FundsAccountSelect
              value={form.accountId}
              accounts={accounts}
              onChange={(accountId: string) => patch('accountId', accountId)}
            />
          </FinanceFormField>
          <FinanceFormField label="金额" required>
            <Input
              className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)}
            />
          </FinanceFormField>
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
