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
  CreateHrInvitationBody, HrInvitation, UpdateHrInvitationBody,
} from '@shared/api.interface';
import {
  createInvitation, updateInvitation,
} from '@client/src/api/hr-enhance/recruitment';
import {
  HR_INTERVIEW_ROUND_OPTIONS, HR_INTERVIEW_TYPE_OPTIONS,
  HR_INVITATION_STATUS_OPTIONS, HrFormField,
} from '../hr-enhance-constants';
import { isValidHrDateTime, reportRecruitError } from './recruitment-shared';

interface InvitationsFormState {
  resumeId: string;
  candidateName: string;
  position: string;
  department: string;
  interviewer: string;
  location: string;
  interviewType: string;
  interviewRound: string;
  scheduledTime: string;
  status: string;
  remark: string;
}

interface InvitationsFormDialogProps {
  open: boolean;
  editing: HrInvitation | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): InvitationsFormState => ({
  resumeId: '',
  candidateName: '',
  position: '',
  department: '',
  interviewer: '',
  location: '',
  interviewType: HR_INTERVIEW_TYPE_OPTIONS[0],
  interviewRound: HR_INTERVIEW_ROUND_OPTIONS[0],
  scheduledTime: '',
  status: HR_INVITATION_STATUS_OPTIONS[0],
  remark: '',
});

const buildFormFromItem = (item: HrInvitation): InvitationsFormState => ({
  resumeId: String(item.resumeId),
  candidateName: item.candidateName,
  position: item.position,
  department: item.department,
  interviewer: item.interviewer,
  location: item.location,
  interviewType: item.interviewType || HR_INTERVIEW_TYPE_OPTIONS[0],
  interviewRound: item.interviewRound || HR_INTERVIEW_ROUND_OPTIONS[0],
  scheduledTime: item.scheduledTime ?? '',
  status: item.status || HR_INVITATION_STATUS_OPTIONS[0],
  remark: item.remark ?? '',
});

export function InvitationsFormDialog({
  open, editing, onSaved, onOpenChange,
}: InvitationsFormDialogProps) {
  const [form, setForm] = useState<InvitationsFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof InvitationsFormState>(
    key: K,
    value: InvitationsFormState[K],
  ): void => setForm((prev: InvitationsFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    const resumeId: number = Number(form.resumeId);
    if (!Number.isInteger(resumeId) || resumeId <= 0) {
      toast.error('关联简历 ID 必须为正整数');
      return;
    }
    if (!form.candidateName.trim()) { toast.error('请输入候选人姓名'); return; }
    if (!form.position.trim()) { toast.error('请输入应聘职位'); return; }
    if (!form.department.trim()) { toast.error('请输入部门'); return; }
    if (!form.interviewer.trim()) { toast.error('请输入面试官'); return; }
    if (!form.location.trim()) { toast.error('请输入面试地点'); return; }
    if (!isValidHrDateTime(form.scheduledTime.trim())) {
      toast.error('面试时间格式须为 YYYY-MM-DD HH:mm:ss');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateHrInvitationBody = {
          resumeId,
          candidateName: form.candidateName.trim(),
          position: form.position.trim(),
          department: form.department.trim(),
          interviewer: form.interviewer.trim(),
          location: form.location.trim(),
          interviewType: form.interviewType,
          interviewRound: form.interviewRound,
          scheduledTime: form.scheduledTime.trim() || undefined,
          status: form.status,
          remark: form.remark.trim(),
        };
        await updateInvitation(editing.id, body);
        toast.success('邀约已更新');
      } else {
        const body: CreateHrInvitationBody = {
          resumeId,
          candidateName: form.candidateName.trim(),
          position: form.position.trim(),
          department: form.department.trim(),
          interviewer: form.interviewer.trim(),
          location: form.location.trim(),
          interviewType: form.interviewType,
          interviewRound: form.interviewRound,
          scheduledTime: form.scheduledTime.trim() || undefined,
          status: form.status,
          remark: form.remark.trim() || undefined,
        };
        await createInvitation(body);
        toast.success('邀约已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRecruitError('保存邀约失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑邀约' : '新建邀约'}</DialogTitle>
          <DialogDescription>
            {editing ? `邀约编号：${editing.invitationNo}` : '创建一条面试邀约记录'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrFormField label="关联简历 ID" required>
            <Input className="rounded-none" type="number" min="1" value={form.resumeId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('resumeId', event.target.value)} />
          </HrFormField>
          <HrFormField label="候选人姓名" required>
            <Input className="rounded-none" value={form.candidateName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('candidateName', event.target.value)} />
          </HrFormField>
          <HrFormField label="应聘职位" required>
            <Input className="rounded-none" value={form.position}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('position', event.target.value)} />
          </HrFormField>
          <HrFormField label="部门" required>
            <Input className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('department', event.target.value)} />
          </HrFormField>
          <HrFormField label="面试官" required>
            <Input className="rounded-none" value={form.interviewer}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('interviewer', event.target.value)} />
          </HrFormField>
          <HrFormField label="面试地点" required>
            <Input className="rounded-none" value={form.location}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('location', event.target.value)} />
          </HrFormField>
          <HrFormField label="面试形式">
            <Select value={form.interviewType} onValueChange={(value: string) => patch('interviewType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="面试形式" /></SelectTrigger>
              <SelectContent>
                {HR_INTERVIEW_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="面试轮次">
            <Select value={form.interviewRound} onValueChange={(value: string) => patch('interviewRound', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="面试轮次" /></SelectTrigger>
              <SelectContent>
                {HR_INTERVIEW_ROUND_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="面试时间">
            <Input className="rounded-none" value={form.scheduledTime}
              placeholder="YYYY-MM-DD HH:mm:ss"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('scheduledTime', event.target.value)} />
          </HrFormField>
          <HrFormField label="状态">
            <Select value={form.status} onValueChange={(value: string) => patch('status', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                {HR_INVITATION_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
