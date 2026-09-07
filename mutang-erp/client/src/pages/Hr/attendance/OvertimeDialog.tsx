import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { HrAttendance, HrAttendanceOvertimeBody } from '@shared/api.interface';
import { registerHrAttendanceOvertime } from '@client/src/api/hr-enhance/attendance';
import { HrFormField, toHrErrorText } from '../hr-enhance-constants';

interface OvertimeDialogProps {
  target: HrAttendance | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function OvertimeDialog({ target, onSaved, onOpenChange }: OvertimeDialogProps) {
  const [hours, setHours] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (target) setHours('');
  }, [target]);

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    const value: number = Number(hours);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('加班时长必须为大于 0 的数字');
      return;
    }
    const body: HrAttendanceOvertimeBody = { overtimeHours: String(value) };
    setSubmitting(true);
    try {
      await registerHrAttendanceOvertime(target.id, body);
      toast.success('加班登记成功');
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
          <DialogTitle>加班登记</DialogTitle>
          <DialogDescription>
            {target ? `为「${target.employeeName}」${target.attendanceDate} 的考勤登记加班` : ''}
          </DialogDescription>
        </DialogHeader>
        <HrFormField label="加班时长（h）" required>
          <Input
            className="rounded-none" type="number" min="0" step="0.5" value={hours}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setHours(event.target.value)}
          />
        </HrFormField>
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
