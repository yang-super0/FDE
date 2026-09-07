import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/src/components/ui/select';
import type { CreateFinanceCostRequest, FinanceCost } from '@shared/api.interface';
import { createFinanceCost, updateFinanceCost } from '@client/src/api/finance-core';
import { COST_TYPE_OPTIONS, FinanceFormField, toFinanceErrorText } from './finance-constants';

const PERIOD_PATTERN: RegExp = /^\d{4}-\d{2}$/;

interface CostFormState {
  costType: string;
  amount: string;
  costCategory: string;
  relatedAccount: string;
  relatedCustomer: string;
  costDate: string;
  period: string;
  remark: string;
}

const buildEmptyForm = (): CostFormState => ({
  costType: COST_TYPE_OPTIONS[0],
  amount: '',
  costCategory: '',
  relatedAccount: '',
  relatedCustomer: '',
  costDate: dayjs().format('YYYY-MM-DD'),
  period: dayjs().format('YYYY-MM'),
  remark: '',
});

interface FinanceCostFormDialogProps {
  open: boolean;
  editing: FinanceCost | null;
  onClose: () => void;
  onSaved: () => void;
}

export function FinanceCostFormDialog({ open, editing, onClose, onSaved }: FinanceCostFormDialogProps) {
  const [form, setForm] = useState<CostFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setForm(editing ? {
      costType: editing.costType,
      amount: String(editing.amount),
      costCategory: editing.costCategory,
      relatedAccount: editing.relatedAccount,
      relatedCustomer: editing.relatedCustomer,
      costDate: dayjs(editing.costDate).format('YYYY-MM-DD'),
      period: editing.period,
      remark: editing.remark,
    } : buildEmptyForm());
  }, [open, editing]);

  const patchForm = (patch: Partial<CostFormState>): void =>
    setForm((prev: CostFormState) => ({ ...prev, ...patch }));

  const handleSubmit = async (): Promise<void> => {
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('金额必须为大于 0 的数字');
      return;
    }
    if (!PERIOD_PATTERN.test(form.period.trim())) {
      toast.error('归属周期格式不合法，应为 YYYY-MM');
      return;
    }
    setSubmitting(true);
    try {
      const sharedFields = {
        costType: form.costType,
        amount,
        costCategory: form.costCategory.trim() || undefined,
        relatedAccount: form.relatedAccount.trim() || undefined,
        relatedCustomer: form.relatedCustomer.trim() || undefined,
        costDate: form.costDate || undefined,
        period: form.period.trim(),
        remark: form.remark.trim() || undefined,
      };
      if (editing) {
        await updateFinanceCost(editing.id, sharedFields);
        toast.success('成本已更新');
      } else {
        const payload: CreateFinanceCostRequest = { ...sharedFields };
        await createFinanceCost(payload);
        toast.success('成本已创建');
      }
      onClose();
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存成本失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen: boolean) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{editing ? '编辑成本' : '新建成本'}</DialogTitle>
          <DialogDescription>{editing ? '修改成本信息后保存' : '登记一笔新的成本记录'}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-4">
          <FinanceFormField label="成本类型" required>
            <Select value={form.costType} onValueChange={(value: string) => patchForm({ costType: value })}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="请选择成本类型" /></SelectTrigger>
              <SelectContent>
                {COST_TYPE_OPTIONS.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="金额" required>
            <Input className="rounded-none font-mono" type="number" placeholder="0.00" value={form.amount} onChange={(event: ChangeEvent<HTMLInputElement>) => patchForm({ amount: event.target.value })} />
          </FinanceFormField>
          <FinanceFormField label="成本分类">
            <Input className="rounded-none" placeholder="选填，如 投放/服务" value={form.costCategory} onChange={(event: ChangeEvent<HTMLInputElement>) => patchForm({ costCategory: event.target.value })} />
          </FinanceFormField>
          <FinanceFormField label="关联账户">
            <Input className="rounded-none" placeholder="选填" value={form.relatedAccount} onChange={(event: ChangeEvent<HTMLInputElement>) => patchForm({ relatedAccount: event.target.value })} />
          </FinanceFormField>
          <FinanceFormField label="关联客户">
            <Input className="rounded-none" placeholder="选填" value={form.relatedCustomer} onChange={(event: ChangeEvent<HTMLInputElement>) => patchForm({ relatedCustomer: event.target.value })} />
          </FinanceFormField>
          <FinanceFormField label="成本日期">
            <Input className="rounded-none font-mono" placeholder="YYYY-MM-DD" value={form.costDate} onChange={(event: ChangeEvent<HTMLInputElement>) => patchForm({ costDate: event.target.value })} />
          </FinanceFormField>
          <FinanceFormField label="归属周期">
            <Input className="rounded-none font-mono" placeholder="YYYY-MM" value={form.period} onChange={(event: ChangeEvent<HTMLInputElement>) => patchForm({ period: event.target.value })} />
          </FinanceFormField>
          <FinanceFormField label="备注">
            <Textarea className="rounded-none resize-none" rows={3} placeholder="选填，补充说明成本信息" value={form.remark} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patchForm({ remark: event.target.value })} />
          </FinanceFormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>{submitting ? '保存中...' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
