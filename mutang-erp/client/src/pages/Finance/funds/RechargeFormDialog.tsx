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
import type { CreateFinanceRechargeRequest } from '@shared/api.interface';
import { createFinanceRecharge } from '@client/src/api/finance-enhance/funds';
import { FinanceFormField } from '../finance-constants';
import {
  FundsAccountSelect, FundsCustomerSelect, FUNDS_PAYMENT_METHOD_OPTIONS,
  reportFundsError, useFundAccountOptions, useFundCustomerOptions,
} from './funds-shared';

interface RechargeFormState {
  customerId: string;
  customerName: string;
  adAccountId: string;
  accountId: string;
  amount: string;
  paymentMethod: string;
  remark: string;
}

interface RechargeFormDialogProps {
  open: boolean;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): RechargeFormState => ({
  customerId: '',
  customerName: '',
  adAccountId: '',
  accountId: '',
  amount: '',
  paymentMethod: FUNDS_PAYMENT_METHOD_OPTIONS[0],
  remark: '',
});

export function RechargeFormDialog({ open, onSaved, onOpenChange }: RechargeFormDialogProps) {
  const [form, setForm] = useState<RechargeFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const customers = useFundCustomerOptions();
  const accounts = useFundAccountOptions();

  useEffect(() => {
    if (open) setForm(buildEmptyForm());
  }, [open]);

  const patch = <K extends keyof RechargeFormState>(
    key: K,
    value: RechargeFormState[K],
  ): void => setForm((prev: RechargeFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId) { toast.error('请选择客户'); return; }
    if (!form.accountId) { toast.error('请选择资金账户'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('金额必须为大于 0 的数字');
      return;
    }
    const body: CreateFinanceRechargeRequest = {
      customerId: form.customerId,
      customerName: form.customerName,
      adAccountId: form.adAccountId.trim() || undefined,
      accountId: Number(form.accountId),
      amount,
      paymentMethod: form.paymentMethod,
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await createFinanceRecharge(body);
      toast.success('充值单已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportFundsError('保存充值单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建充值</DialogTitle>
          <DialogDescription>登记一笔客户充值记录</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="客户" required>
            <FundsCustomerSelect
              value={form.customerId}
              customers={customers}
              onChange={(customerId: string, customerName: string) => {
                setForm((prev: RechargeFormState) => ({
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
          <FinanceFormField label="广告账户ID">
            <Input
              className="rounded-none" value={form.adAccountId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('adAccountId', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="金额" required>
            <Input
              className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="付款方式">
            <Select
              value={form.paymentMethod}
              onValueChange={(value: string) => patch('paymentMethod', value)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="付款方式" />
              </SelectTrigger>
              <SelectContent>
                {FUNDS_PAYMENT_METHOD_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
