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
import type {
  HrAttendance, HrAttendanceLeaveApplyBody,
} from '@shared/api.interface';
import {
  applyHrAttendanceLeave, rejectHrAttendanceLeave,
} from '@client/src/api/hr-enhance/attendance';
import {
  HR_LEAVE_TYPE_OPTIONS, HrFormField, toHrErrorText,
} from '../hr-enhance-constants';

/* ============ 请假申请弹窗 ============ */

interface LeaveApplyDialogProps {
  target: HrAttendance | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function LeaveApplyDialog({ target, onSaved, onOpenChange }: LeaveApplyDialogProps) {
  const [leaveType, setLeaveType] = useState<string>(HR_LEAVE_TYPE_OPTIONS[0]);
  const [leaveHours, setLeaveHours] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (target) {
      setLeaveType(target.leaveType || HR_LEAVE_TYPE_OPTIONS[0]);
      setLeaveHours(target.leaveHours && Number(target.leaveHours) > 0 ? target.leaveHours : '');
      setRemark('');
    }
  }, [target]);

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    const hours: number = Number(leaveHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      toast.error('请假时长必须为大于 0 的数字');
      return;
    }
    const body: HrAttendanceLeaveApplyBody = {
      leaveType,
      leaveHours: String(hours),
      remark: remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await applyHrAttendanceLeave(target.id, body);
      toast.success('请假申请已提交');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>请假申请</DialogTitle>
          <DialogDescription>
            {target ? `为「${target.employeeName}」${target.attendanceDate} 的考勤提交请假` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <HrFormField label="请假类型" required>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="请假类型" />
              </SelectTrigger>
              <SelectContent>
                {HR_LEAVE_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="请假时长（h）" required>
            <Input
              className="rounded-none" type="number" min="0" step="0.5" value={leaveHours}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLeaveHours(event.target.value)}
            />
          </HrFormField>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">备注</label>
            <Textarea
              className="rounded-none" rows={2} value={remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setRemark(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ 请假驳回弹窗（原因必填） ============ */

interface LeaveRejectDialogProps {
  target: HrAttendance | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function LeaveRejectDialog({ target, onSaved, onOpenChange }: LeaveRejectDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (target) setReason('');
  }, [target]);

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    if (!reason.trim()) { toast.error('请填写驳回原因'); return; }
    setSubmitting(true);
    try {
      await rejectHrAttendanceLeave(target.id, { reason: reason.trim() });
      toast.success('请假已驳回');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>驳回请假</DialogTitle>
          <DialogDescription>
            {target ? `驳回「${target.employeeName}」${target.attendanceDate} 的请假申请` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            驳回原因 <span className="text-destructive">*</span>
          </label>
          <Textarea
            className="rounded-none" rows={3} value={reason}
            placeholder="请填写驳回原因"
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '驳回'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
