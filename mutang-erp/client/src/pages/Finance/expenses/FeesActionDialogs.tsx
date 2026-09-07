import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { FeeReimburseRequest, FinanceFee } from '@shared/api.interface';
import { reimburseFinanceFee } from '@client/src/api/finance-enhance/expenses';
import { FinanceFormField, formatFinanceAmount } from '../finance-constants';
import { AccountSelect, reportError } from './expenses-shared';

interface FeeReimburseDialogProps {
  open: boolean; fee: FinanceFee | null;
  onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function FeeReimburseDialog({ open, fee, onDone, onOpenChange }: FeeReimburseDialogProps) {
  const [accountId, setAccountId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) {
      setAccountId('');
      setSubmitting(false);
    }
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (!fee) return;
    if (!accountId) { toast.error('请选择资金账户'); return; }
    const body: FeeReimburseRequest = { accountId: Number(accountId) };
    setSubmitting(true);
    try {
      await reimburseFinanceFee(fee.id, body);
      toast.success('费用报销成功');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('费用报销失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>费用报销</DialogTitle>
          <DialogDescription>
            {fee
              ? `${fee.feeNo} · ${fee.feeType} · ${formatFinanceAmount(fee.amount)}，请选择报销使用的资金账户`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <FinanceFormField label="资金账户" required>
          <AccountSelect value={accountId} onChange={setAccountId} placeholder="选择资金账户" />
        </FinanceFormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '报销中...' : '确认报销'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
