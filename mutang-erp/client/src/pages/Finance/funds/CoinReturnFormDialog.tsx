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
import type { CreateFinanceCoinReturnRequest } from '@shared/api.interface';
import { createFinanceCoinReturn } from '@client/src/api/finance-enhance/funds';
import { FinanceFormField } from '../finance-constants';
import {
  FUNDS_PLATFORM_OPTIONS, FundsCustomerSelect, reportFundsError,
  useFundCustomerOptions,
} from './funds-shared';

interface CoinReturnFormState {
  customerId: string;
  adAccountId: string;
  platform: string;
  coinAmount: string;
  rmbEquivalent: string;
  remark: string;
}

interface CoinReturnFormDialogProps {
  open: boolean;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): CoinReturnFormState => ({
  customerId: '',
  adAccountId: '',
  platform: FUNDS_PLATFORM_OPTIONS[0],
  coinAmount: '',
  rmbEquivalent: '',
  remark: '',
});

export function CoinReturnFormDialog({ open, onSaved, onOpenChange }: CoinReturnFormDialogProps) {
  const [form, setForm] = useState<CoinReturnFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const customers = useFundCustomerOptions();

  useEffect(() => {
    if (open) setForm(buildEmptyForm());
  }, [open]);

  const patch = <K extends keyof CoinReturnFormState>(
    key: K,
    value: CoinReturnFormState[K],
  ): void => setForm((prev: CoinReturnFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId) { toast.error('请选择客户'); return; }
    const coinAmount: number = Number(form.coinAmount);
    if (!Number.isFinite(coinAmount) || coinAmount <= 0) {
      toast.error('退币数量必须为大于 0 的数字');
      return;
    }
    const rmbEquivalent: number = Number(form.rmbEquivalent);
    if (!Number.isFinite(rmbEquivalent) || rmbEquivalent <= 0) {
      toast.error('人民币等值必须为大于 0 的数字');
      return;
    }
    const body: CreateFinanceCoinReturnRequest = {
      customerId: form.customerId,
      adAccountId: form.adAccountId.trim() || undefined,
      platform: form.platform,
      coinAmount,
      rmbEquivalent,
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await createFinanceCoinReturn(body);
      toast.success('退币单已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportFundsError('保存退币单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建退币</DialogTitle>
          <DialogDescription>登记一笔媒体退币记录</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="客户" required>
            <FundsCustomerSelect
              value={form.customerId}
              customers={customers}
              onChange={(customerId: string) => patch('customerId', customerId)}
            />
          </FinanceFormField>
          <FinanceFormField label="广告账户ID">
            <Input
              className="rounded-none" value={form.adAccountId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('adAccountId', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="平台">
            <Select
              value={form.platform}
              onValueChange={(value: string) => patch('platform', value)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="平台" />
              </SelectTrigger>
              <SelectContent>
                {FUNDS_PLATFORM_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="退币数量" required>
            <Input
              className="rounded-none" type="number" min="0" value={form.coinAmount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('coinAmount', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="人民币等值" required>
            <Input
              className="rounded-none" type="number" min="0" value={form.rmbEquivalent}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('rmbEquivalent', event.target.value)}
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
