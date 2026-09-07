import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { HrInterview } from '@shared/api.interface';
import { setInterviewOfferAction } from '@client/src/api/hr-enhance/recruitment';
import {
  HR_OFFER_STATUS_OPTIONS, HrFormField, HrStatusBadge,
} from '../hr-enhance-constants';
import { reportRecruitError } from './recruitment-shared';

interface InterviewOfferDialogProps {
  target: HrInterview | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function InterviewOfferDialog({
  target, onSaved, onOpenChange,
}: InterviewOfferDialogProps) {
  const open: boolean = target !== null;
  const [offerStatus, setOfferStatus] = useState<string>(HR_OFFER_STATUS_OPTIONS[0]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!target) return;
    setOfferStatus(target.offerStatus || HR_OFFER_STATUS_OPTIONS[0]);
  }, [target]);

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    setSubmitting(true);
    try {
      await setInterviewOfferAction(target.id, { offerStatus });
      toast.success(`offer 状态已更新为「${offerStatus}」`);
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRecruitError('更新 offer 状态失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>offer 状态</DialogTitle>
          <DialogDescription>
            {target ? `${target.candidateName} · ${target.interviewNo}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            当前状态：
            {target ? <HrStatusBadge status={target.offerStatus} /> : null}
          </div>
          <HrFormField label="目标状态" required>
            <Select value={offerStatus} onValueChange={(value: string) => setOfferStatus(value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="offer状态" /></SelectTrigger>
              <SelectContent>
                {HR_OFFER_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
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
