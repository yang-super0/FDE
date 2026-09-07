import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Textarea } from '@client/src/components/ui/textarea';
import { Label } from '@client/src/components/ui/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@client/src/components/ui/radio-group';

interface AdsApproveDialogProps {
  open: boolean;
  title: string;
  targetName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (approved: boolean, rejectReason?: string) => Promise<void>;
}

export function AdsApproveDialog({
  open,
  title,
  targetName,
  onOpenChange,
  onConfirm,
}: AdsApproveDialogProps) {
  const [action, setAction] = useState<string>('approved');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setAction('approved');
      setReason('');
    }
  }, [open]);

  const handleConfirm = async (): Promise<void> => {
    const approved: boolean = action === 'approved';
    if (!approved && !reason.trim()) {
      toast.error('请填写驳回原因');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(approved, approved ? undefined : reason.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          <DialogDescription>
            审批对象：{targetName}，审批结果将立即生效且不可撤销。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup
            value={action}
            onValueChange={(value: string) => setAction(value)}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="approved" id="approve-pass" />
              <Label htmlFor="approve-pass">通过</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="rejected" id="approve-reject" />
              <Label htmlFor="approve-reject">驳回</Label>
            </div>
          </RadioGroup>
          {action === 'rejected' ? (
            <div className="space-y-2">
              <Label>
                驳回原因 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                className="rounded-none resize-none"
                rows={3}
                placeholder="请填写驳回原因"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={submitting} onClick={() => void handleConfirm()}>
            {submitting ? '提交中...' : '确认提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
