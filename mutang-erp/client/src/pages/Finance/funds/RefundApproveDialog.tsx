import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { FinanceRefund } from '@shared/api.interface';
import { approveFinanceRefund } from '@client/src/api/finance-enhance/funds';
import { FinanceFormField, formatFinanceAmount } from '../finance-constants';
import { reportFundsError } from './funds-shared';

const APPROVE_DECISIONS: string[] = ['通过', '驳回'];

interface RefundApproveDialogProps {
  open: boolean;
  refund: FinanceRefund | null;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
}

export function RefundApproveDialog({
  open, refund, onDone, onOpenChange,
}: RefundApproveDialogProps) {
  const [decision, setDecision] = useState<string>(APPROVE_DECISIONS[0]);
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setDecision(APPROVE_DECISIONS[0]);
      setRemark('');
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    if (!refund) return;
    const approved: boolean = decision === '通过';
    if (!approved && !remark.trim()) {
      toast.error('驳回时必须填写驳回原因');
      return;
    }
    setSubmitting(true);
    try {
      await approveFinanceRefund(refund.id, {
        approved,
        approveRemark: remark.trim() || undefined,
      });
      toast.success(approved ? '退款申请已通过' : '退款申请已驳回');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportFundsError('审批退款失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>退款审批</DialogTitle>
          <DialogDescription>
            {refund
              ? `退款单「${refund.refundNo}」· ${refund.customerName} · ${formatFinanceAmount(refund.amount)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="审批结论" required>
            <Select value={decision} onValueChange={(value: string) => setDecision(value)}>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="审批结论" />
              </SelectTrigger>
              <SelectContent>
                {APPROVE_DECISIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              审批备注
              {decision === '驳回' ? <span className="text-destructive">（驳回时必填）</span> : null}
            </label>
            <Textarea
              className="rounded-none" rows={3} value={remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRemark(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            disabled={submitting}
            variant={decision === '驳回' ? 'destructive' : 'default'}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '提交中...' : '提交审批'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
