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
import type { AdminRequisition } from '@shared/api.interface';
import { approveRequisition } from '@client/src/api/admin-enhance/warehouse';
import { reportWarehouseError } from './warehouse-shared';

const APPROVE_OPTIONS: string[] = ['通过', '驳回'];

interface RequisitionsApproveDialogProps {
  open: boolean;
  editing: AdminRequisition | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function RequisitionsApproveDialog({
  open, editing, onSaved, onOpenChange,
}: RequisitionsApproveDialogProps) {
  const [decision, setDecision] = useState<string>(APPROVE_OPTIONS[0]);
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setDecision(APPROVE_OPTIONS[0]);
    setRemark('');
  }, [open, editing]);

  const handleSubmit = async (): Promise<void> => {
    const approve: boolean = decision === '通过';
    if (!approve && !remark.trim()) {
      toast.error('驳回时原因必填');
      return;
    }
    if (!editing) return;
    setSubmitting(true);
    try {
      await approveRequisition(editing.id, { approve, remark: remark.trim() });
      toast.success(approve ? '领用单已审批通过' : '领用单已驳回');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportWarehouseError('审批领用单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>审批领用单</DialogTitle>
          <DialogDescription>
            {editing
              ? `领用单号：${editing.requisitionNo}（${editing.applicant} · ${editing.itemName} × ${editing.quantity}）`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              审批结论 <span className="text-destructive">*</span>
            </label>
            <Select value={decision} onValueChange={(value: string) => setDecision(value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="审批结论" /></SelectTrigger>
              <SelectContent>
                {APPROVE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {decision === '驳回' ? (
                <>驳回原因 <span className="text-destructive">*</span></>
              ) : '审批意见'}
            </label>
            <Textarea
              className="rounded-none" rows={3}
              placeholder={decision === '驳回' ? '请填写驳回原因（必填）' : '选填'}
              value={remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setRemark(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '提交审批'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
