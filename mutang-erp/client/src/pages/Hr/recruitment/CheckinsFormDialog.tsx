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
  CreateHrCheckinBody, HrCheckin, UpdateHrCheckinBody,
} from '@shared/api.interface';
import {
  createCheckin, updateCheckin,
} from '@client/src/api/hr-enhance/recruitment';
import {
  HR_CHECKIN_STATUS_OPTIONS, HR_CHECKIN_TYPE_OPTIONS, HrFormField,
} from '../hr-enhance-constants';
import { isValidHrDateTime, reportRecruitError } from './recruitment-shared';

interface CheckinsFormState {
  candidateName: string;
  location: string;
  type: string;
  status: string;
  checkinTime: string;
  relatedId: string;
  remark: string;
}

interface CheckinsFormDialogProps {
  open: boolean;
  editing: HrCheckin | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): CheckinsFormState => ({
  candidateName: '',
  location: '',
  type: HR_CHECKIN_TYPE_OPTIONS[0],
  status: HR_CHECKIN_STATUS_OPTIONS[1],
  checkinTime: '',
  relatedId: '',
  remark: '',
});

const buildFormFromItem = (item: HrCheckin): CheckinsFormState => ({
  candidateName: item.candidateName,
  location: item.location,
  type: item.type || HR_CHECKIN_TYPE_OPTIONS[0],
  status: item.status || HR_CHECKIN_STATUS_OPTIONS[1],
  checkinTime: item.checkinTime ?? '',
  relatedId: item.relatedId === null ? '' : String(item.relatedId),
  remark: item.remark ?? '',
});

export function CheckinsFormDialog({
  open, editing, onSaved, onOpenChange,
}: CheckinsFormDialogProps) {
  const [form, setForm] = useState<CheckinsFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof CheckinsFormState>(
    key: K,
    value: CheckinsFormState[K],
  ): void => setForm((prev: CheckinsFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.candidateName.trim()) { toast.error('请输入候选人姓名'); return; }
    if (!form.location.trim()) { toast.error('请输入签到地点'); return; }
    if (!isValidHrDateTime(form.checkinTime.trim())) {
      toast.error('签到时间格式须为 YYYY-MM-DD HH:mm:ss');
      return;
    }
    const relatedId: number | null = form.relatedId.trim() === ''
      ? null : Number(form.relatedId);
    if (relatedId !== null && (!Number.isInteger(relatedId) || relatedId <= 0)) {
      toast.error('关联 ID 必须为正整数');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateHrCheckinBody = {
          candidateName: form.candidateName.trim(),
          location: form.location.trim(),
          type: form.type,
          status: form.status,
          checkinTime: form.checkinTime.trim() || null,
          relatedId,
          remark: form.remark.trim(),
        };
        await updateCheckin(editing.id, body);
        toast.success('签到记录已更新');
      } else {
        const body: CreateHrCheckinBody = {
          candidateName: form.candidateName.trim(),
          location: form.location.trim(),
          type: form.type,
          status: form.status,
          checkinTime: form.checkinTime.trim() || null,
          relatedId,
          remark: form.remark.trim() || undefined,
        };
        await createCheckin(body);
        toast.success('签到记录已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRecruitError('保存签到记录失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑签到记录' : '新建签到记录'}</DialogTitle>
          <DialogDescription>
            {editing ? `签到编号：${editing.checkinNo}` : '登记一条候选人签到记录'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrFormField label="候选人姓名" required>
            <Input className="rounded-none" value={form.candidateName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('candidateName', event.target.value)} />
          </HrFormField>
          <HrFormField label="签到地点" required>
            <Input className="rounded-none" value={form.location}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('location', event.target.value)} />
          </HrFormField>
          <HrFormField label="类型">
            <Select value={form.type} onValueChange={(value: string) => patch('type', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="类型" /></SelectTrigger>
              <SelectContent>
                {HR_CHECKIN_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="状态">
            <Select value={form.status} onValueChange={(value: string) => patch('status', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                {HR_CHECKIN_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="签到时间">
            <Input className="rounded-none" value={form.checkinTime}
              placeholder="YYYY-MM-DD HH:mm:ss"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('checkinTime', event.target.value)} />
          </HrFormField>
          <HrFormField label="关联 ID">
            <Input className="rounded-none" type="number" min="1" value={form.relatedId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('relatedId', event.target.value)} />
          </HrFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('remark', event.target.value)} />
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
