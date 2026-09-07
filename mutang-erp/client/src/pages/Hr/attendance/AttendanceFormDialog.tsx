import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
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
  CreateHrAttendanceBody, HrAttendance, UpdateHrAttendanceBody,
} from '@shared/api.interface';
import {
  createHrAttendance, updateHrAttendance,
} from '@client/src/api/hr-enhance/attendance';
import {
  HR_ATTENDANCE_STATUS_OPTIONS, HR_LEAVE_TYPE_OPTIONS, HrFormField, toHrErrorText,
} from '../hr-enhance-constants';

const LEAVE_NONE: string = '无';

interface AttendanceFormDialogProps {
  open: boolean;
  editing: HrAttendance | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): Record<string, string> => ({
  employeeId: '',
  employeeName: '',
  department: '',
  attendanceDate: '',
  checkInTime: '',
  checkOutTime: '',
  status: HR_ATTENDANCE_STATUS_OPTIONS[0],
  leaveType: LEAVE_NONE,
  leaveHours: '',
  overtimeHours: '',
  remark: '',
});

export function AttendanceFormDialog({
  open, editing, onSaved, onOpenChange,
}: AttendanceFormDialogProps) {
  const [form, setForm] = useState<Record<string, string>>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        employeeId: String(editing.employeeId),
        employeeName: editing.employeeName,
        department: editing.department,
        attendanceDate: dayjs(editing.attendanceDate).format('YYYY-MM-DD'),
        checkInTime: editing.checkInTime
          ? dayjs(editing.checkInTime).format('YYYY-MM-DD HH:mm:ss') : '',
        checkOutTime: editing.checkOutTime
          ? dayjs(editing.checkOutTime).format('YYYY-MM-DD HH:mm:ss') : '',
        status: editing.status,
        leaveType: editing.leaveType || LEAVE_NONE,
        leaveHours: editing.leaveHours ?? '',
        overtimeHours: editing.overtimeHours ?? '',
        remark: editing.remark,
      });
    } else {
      setForm(buildEmptyForm());
    }
  }, [open, editing]);

  const patch = (key: string, value: string): void => {
    setForm((prev: Record<string, string>) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.employeeId.trim()) { toast.error('请输入员工ID'); return; }
    if (!form.employeeName.trim()) { toast.error('请输入员工姓名'); return; }
    if (!form.department.trim()) { toast.error('请输入部门'); return; }
    if (!form.attendanceDate.trim()) { toast.error('请输入考勤日期'); return; }

    const leaveType: string = form.leaveType === LEAVE_NONE ? '' : form.leaveType;
    if (editing) {
      const body: UpdateHrAttendanceBody = {
        employeeId: Number(form.employeeId),
        employeeName: form.employeeName.trim(),
        department: form.department.trim(),
        attendanceDate: form.attendanceDate.trim(),
        checkInTime: form.checkInTime.trim(),
        checkOutTime: form.checkOutTime.trim(),
        status: form.status,
        leaveType,
        leaveHours: form.leaveHours.trim(),
        overtimeHours: form.overtimeHours.trim(),
        remark: form.remark.trim(),
      };
      setSubmitting(true);
      try {
        await updateHrAttendance(editing.id, body);
        toast.success('考勤记录已更新');
        onOpenChange(false);
        onSaved();
      } catch (error: unknown) {
        toast.error(toHrErrorText(error));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const body: CreateHrAttendanceBody = {
      employeeId: Number(form.employeeId),
      employeeName: form.employeeName.trim(),
      department: form.department.trim(),
      attendanceDate: form.attendanceDate.trim(),
      checkInTime: form.checkInTime.trim(),
      checkOutTime: form.checkOutTime.trim(),
      status: form.status,
      leaveType,
      leaveHours: form.leaveHours.trim(),
      overtimeHours: form.overtimeHours.trim(),
      remark: form.remark.trim(),
    };
    setSubmitting(true);
    try {
      await createHrAttendance(body);
      toast.success('考勤记录已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      toast.error(toHrErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑考勤记录' : '新建考勤记录'}</DialogTitle>
          <DialogDescription>
            {editing ? `修改考勤编号「${editing.attendanceNo}」` : '登记一条员工考勤记录'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrFormField label="员工ID" required>
            <Input
              className="rounded-none" type="number" value={form.employeeId}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('employeeId', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="员工姓名" required>
            <Input
              className="rounded-none" value={form.employeeName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('employeeName', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="部门" required>
            <Input
              className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('department', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="考勤日期" required>
            <Input
              className="rounded-none" placeholder="YYYY-MM-DD" value={form.attendanceDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('attendanceDate', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="签到时间">
            <Input
              className="rounded-none" placeholder="YYYY-MM-DD HH:mm:ss" value={form.checkInTime}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('checkInTime', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="签退时间">
            <Input
              className="rounded-none" placeholder="YYYY-MM-DD HH:mm:ss" value={form.checkOutTime}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('checkOutTime', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="状态">
            <Select
              value={form.status}
              onValueChange={(value: string) => patch('status', value)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                {HR_ATTENDANCE_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="请假类型">
            <Select
              value={form.leaveType}
              onValueChange={(value: string) => patch('leaveType', value)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="请假类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LEAVE_NONE}>{LEAVE_NONE}</SelectItem>
                {HR_LEAVE_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="请假时长（h）">
            <Input
              className="rounded-none" type="number" min="0" value={form.leaveHours}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('leaveHours', event.target.value)}
            />
          </HrFormField>
          <HrFormField label="加班时长（h）">
            <Input
              className="rounded-none" type="number" min="0" value={form.overtimeHours}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('overtimeHours', event.target.value)}
            />
          </HrFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea
              className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                patch('remark', event.target.value)}
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
