import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { HrPerformance, HrPerformanceAppealBody } from '@shared/api.interface';
import { appealHrPerformance } from '@client/src/api/hr-enhance/compensation';
import { HrFormField } from '../hr-enhance-constants';
import { reportCompError } from './compensation-shared';

interface AppealDialogProps {
  open: boolean;
  item: HrPerformance | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function AppealDialog({ open, item, onSaved, onOpenChange }: AppealDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    if (!item) return;
    if (!reason.trim()) { toast.error('请填写申诉原因'); return; }
    const body: HrPerformanceAppealBody = { reason: reason.trim() };
    setSubmitting(true);
    try {
      await appealHrPerformance(item.id, body);
      toast.success('申诉已提交');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportCompError('提交申诉失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>绩效申诉{item ? ` · ${item.performanceNo}` : ''}</DialogTitle>
          <DialogDescription>请说明对绩效结果的异议，申诉后将重新进入评估流程</DialogDescription>
        </DialogHeader>
        <HrFormField label="申诉原因" required>
          <Textarea
            className="rounded-none" rows={4} value={reason}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)}
          />
        </HrFormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '提交申诉'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
