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
  CreateHrInterviewBody, HrInterview, UpdateHrInterviewBody,
} from '@shared/api.interface';
import {
  createInterview, updateInterview,
} from '@client/src/api/hr-enhance/recruitment';
import {
  HR_INTERVIEW_RESULT_OPTIONS, HR_INTERVIEW_ROUND_OPTIONS,
  HR_OFFER_STATUS_OPTIONS, HrFormField,
} from '../hr-enhance-constants';
import { isValidHrDateTime, reportRecruitError } from './recruitment-shared';

interface InterviewsFormState {
  resumeId: string;
  candidateName: string;
  position: string;
  interviewer: string;
  invitationId: string;
  interviewRound: string;
  interviewTime: string;
  result: string;
  offerStatus: string;
  scoreProfessional: string;
  scoreCommunication: string;
  scoreGeneral: string;
  evaluation: string;
  remark: string;
}

interface InterviewsFormDialogProps {
  open: boolean;
  editing: HrInterview | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): InterviewsFormState => ({
  resumeId: '',
  candidateName: '',
  position: '',
  interviewer: '',
  invitationId: '',
  interviewRound: HR_INTERVIEW_ROUND_OPTIONS[0],
  interviewTime: '',
  result: HR_INTERVIEW_RESULT_OPTIONS[1],
  offerStatus: HR_OFFER_STATUS_OPTIONS[0],
  scoreProfessional: '0',
  scoreCommunication: '0',
  scoreGeneral: '0',
  evaluation: '',
  remark: '',
});

const buildFormFromItem = (item: HrInterview): InterviewsFormState => ({
  resumeId: String(item.resumeId),
  candidateName: item.candidateName,
  position: item.position,
  interviewer: item.interviewer,
  invitationId: item.invitationId === null ? '' : String(item.invitationId),
  interviewRound: item.interviewRound || HR_INTERVIEW_ROUND_OPTIONS[0],
  interviewTime: item.interviewTime ?? '',
  result: item.result || HR_INTERVIEW_RESULT_OPTIONS[1],
  offerStatus: item.offerStatus || HR_OFFER_STATUS_OPTIONS[0],
  scoreProfessional: String(item.scoreProfessional ?? 0),
  scoreCommunication: String(item.scoreCommunication ?? 0),
  scoreGeneral: String(item.scoreGeneral ?? 0),
  evaluation: item.evaluation ?? '',
  remark: item.remark ?? '',
});

const parseScore = (value: string): number | undefined => {
  const score: number = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 10) return undefined;
  return score;
};

export function InterviewsFormDialog({
  open, editing, onSaved, onOpenChange,
}: InterviewsFormDialogProps) {
  const [form, setForm] = useState<InterviewsFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof InterviewsFormState>(
    key: K,
    value: InterviewsFormState[K],
  ): void => setForm((prev: InterviewsFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    const resumeId: number = Number(form.resumeId);
    if (!Number.isInteger(resumeId) || resumeId <= 0) {
      toast.error('关联简历 ID 必须为正整数');
      return;
    }
    if (!form.candidateName.trim()) { toast.error('请输入候选人姓名'); return; }
    if (!form.position.trim()) { toast.error('请输入职位'); return; }
    if (!form.interviewer.trim()) { toast.error('请输入面试官'); return; }
    if (!isValidHrDateTime(form.interviewTime.trim())) {
      toast.error('面试时间格式须为 YYYY-MM-DD HH:mm:ss');
      return;
    }
    const scores: number[] = [
      parseScore(form.scoreProfessional), parseScore(form.scoreCommunication),
      parseScore(form.scoreGeneral),
    ];
    if (scores.some((score: number | undefined) => score === undefined)) {
      toast.error('各项分数必须为 0-10 的数字');
      return;
    }
    const invitationId: number | null = form.invitationId.trim() === ''
      ? null : Number(form.invitationId);
    if (invitationId !== null && (!Number.isInteger(invitationId) || invitationId <= 0)) {
      toast.error('关联邀约 ID 必须为正整数');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateHrInterviewBody = {
          resumeId,
          candidateName: form.candidateName.trim(),
          position: form.position.trim(),
          interviewer: form.interviewer.trim(),
          invitationId,
          interviewRound: form.interviewRound,
          interviewTime: form.interviewTime.trim() || undefined,
          result: form.result,
          scoreProfessional: scores[0],
          scoreCommunication: scores[1],
          scoreGeneral: scores[2],
          evaluation: form.evaluation.trim(),
          offerStatus: form.offerStatus,
          remark: form.remark.trim(),
        };
        await updateInterview(editing.id, body);
        toast.success('面试记录已更新');
      } else {
        const body: CreateHrInterviewBody = {
          resumeId,
          candidateName: form.candidateName.trim(),
          position: form.position.trim(),
          interviewer: form.interviewer.trim(),
          invitationId,
          interviewRound: form.interviewRound,
          interviewTime: form.interviewTime.trim() || undefined,
          result: form.result,
          scoreProfessional: scores[0],
          scoreCommunication: scores[1],
          scoreGeneral: scores[2],
          evaluation: form.evaluation.trim() || undefined,
          offerStatus: form.offerStatus,
          remark: form.remark.trim() || undefined,
        };
        await createInterview(body);
        toast.success('面试记录已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRecruitError('保存面试记录失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑面试记录' : '新建面试记录'}</DialogTitle>
          <DialogDescription>
            {editing ? `面试编号：${editing.interviewNo}` : '登记一条面试记录'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrFormField label="关联简历 ID" required>
            <Input className="rounded-none" type="number" min="1" value={form.resumeId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('resumeId', event.target.value)} />
          </HrFormField>
          <HrFormField label="关联邀约 ID">
            <Input className="rounded-none" type="number" min="1" value={form.invitationId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('invitationId', event.target.value)} />
          </HrFormField>
          <HrFormField label="候选人姓名" required>
            <Input className="rounded-none" value={form.candidateName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('candidateName', event.target.value)} />
          </HrFormField>
          <HrFormField label="职位" required>
            <Input className="rounded-none" value={form.position}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('position', event.target.value)} />
          </HrFormField>
          <HrFormField label="面试官" required>
            <Input className="rounded-none" value={form.interviewer}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('interviewer', event.target.value)} />
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
            <Input className="rounded-none" value={form.interviewTime}
              placeholder="YYYY-MM-DD HH:mm:ss"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('interviewTime', event.target.value)} />
          </HrFormField>
          <HrFormField label="面试结果">
            <Select value={form.result} onValueChange={(value: string) => patch('result', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="面试结果" /></SelectTrigger>
              <SelectContent>
                {HR_INTERVIEW_RESULT_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="专业分（0-10）">
            <Input className="rounded-none" type="number" min="0" max="10" value={form.scoreProfessional}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('scoreProfessional', event.target.value)} />
          </HrFormField>
          <HrFormField label="沟通分（0-10）">
            <Input className="rounded-none" type="number" min="0" max="10" value={form.scoreCommunication}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('scoreCommunication', event.target.value)} />
          </HrFormField>
          <HrFormField label="综合分（0-10）">
            <Input className="rounded-none" type="number" min="0" max="10" value={form.scoreGeneral}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('scoreGeneral', event.target.value)} />
          </HrFormField>
          <HrFormField label="offer状态">
            <Select value={form.offerStatus} onValueChange={(value: string) => patch('offerStatus', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="offer状态" /></SelectTrigger>
              <SelectContent>
                {HR_OFFER_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">面试评价</label>
            <Textarea className="rounded-none" rows={2} value={form.evaluation}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('evaluation', event.target.value)} />
          </div>
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
