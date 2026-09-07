import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { CreateFinanceRefundRequest } from '@shared/api.interface';
import { createFinanceRefund } from '@client/src/api/finance-enhance/funds';
import { FinanceFormField } from '../finance-constants';
import {
  FundsAccountSelect, FundsCustomerSelect, reportFundsError,
  useFundAccountOptions, useFundCustomerOptions,
} from './funds-shared';

interface RefundFormState {
  customerId: string;
  customerName: string;
  accountId: string;
  amount: string;
  reason: string;
}

interface RefundFormDialogProps {
  open: boolean;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): RefundFormState => ({
  customerId: '', customerName: '', accountId: '', amount: '', reason: '',
});

export function RefundFormDialog({ open, onSaved, onOpenChange }: RefundFormDialogProps) {
  const [form, setForm] = useState<RefundFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const customers = useFundCustomerOptions();
  const accounts = useFundAccountOptions();

  useEffect(() => {
    if (open) setForm(buildEmptyForm());
  }, [open]);

  const patch = <K extends keyof RefundFormState>(
    key: K,
    value: RefundFormState[K],
  ): void => setForm((prev: RefundFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId) { toast.error('请选择客户'); return; }
    if (!form.accountId) { toast.error('请选择资金账户'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('金额必须为大于 0 的数字');
      return;
    }
    if (!form.reason.trim()) { toast.error('请填写退款原因'); return; }
    const body: CreateFinanceRefundRequest = {
      customerId: form.customerId,
      customerName: form.customerName,
      accountId: Number(form.accountId),
      amount,
      reason: form.reason.trim(),
    };
    setSubmitting(true);
    try {
      await createFinanceRefund(body);
      toast.success('退款单已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportFundsError('保存退款单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建退款</DialogTitle>
          <DialogDescription>登记一笔客户退款申请，提交后进入审批流程</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="客户" required>
            <FundsCustomerSelect
              value={form.customerId}
              customers={customers}
              onChange={(customerId: string, customerName: string) => {
                setForm((prev: RefundFormState) => ({
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
            <label className="text-sm font-medium">
              退款原因 <span className="text-destructive">*</span>
            </label>
            <Textarea
              className="rounded-none" rows={2} value={form.reason}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('reason', event.target.value)}
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
