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
  HrInterview, HrInterviewEvaluateBody,
} from '@shared/api.interface';
import { evaluateInterviewAction } from '@client/src/api/hr-enhance/recruitment';
import {
  HR_INTERVIEW_RESULT_OPTIONS, HrFormField,
} from '../hr-enhance-constants';
import { reportRecruitError } from './recruitment-shared';

interface InterviewEvaluateDialogProps {
  target: HrInterview | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

interface EvaluateFormState {
  result: string;
  scoreProfessional: string;
  scoreCommunication: string;
  scoreGeneral: string;
  evaluation: string;
}

const parseScore = (value: string): number | undefined => {
  const score: number = Number(value);
  if (!Number.isFinite(score) || score < 1 || score > 10) return undefined;
  return score;
};

export function InterviewEvaluateDialog({
  target, onSaved, onOpenChange,
}: InterviewEvaluateDialogProps) {
  const open: boolean = target !== null;
  const [form, setForm] = useState<EvaluateFormState>({
    result: HR_INTERVIEW_RESULT_OPTIONS[1],
    scoreProfessional: '',
    scoreCommunication: '',
    scoreGeneral: '',
    evaluation: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!target) return;
    setForm({
      result: target.result || HR_INTERVIEW_RESULT_OPTIONS[1],
      scoreProfessional: String(target.scoreProfessional ?? ''),
      scoreCommunication: String(target.scoreCommunication ?? ''),
      scoreGeneral: String(target.scoreGeneral ?? ''),
      evaluation: target.evaluation ?? '',
    });
  }, [target]);

  const patch = <K extends keyof EvaluateFormState>(
    key: K,
    value: EvaluateFormState[K],
  ): void => setForm((prev: EvaluateFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    const scores: number[] = [
      parseScore(form.scoreProfessional), parseScore(form.scoreCommunication),
      parseScore(form.scoreGeneral),
    ];
    if (scores.some((score: number | undefined) => score === undefined)) {
      toast.error('各项分数必须为 1-10 的整数');
      return;
    }
    if (!form.evaluation.trim()) {
      toast.error('请填写面试评价');
      return;
    }
    const body: HrInterviewEvaluateBody = {
      result: form.result,
      scoreProfessional: scores[0],
      scoreCommunication: scores[1],
      scoreGeneral: scores[2],
      evaluation: form.evaluation.trim(),
    };
    setSubmitting(true);
    try {
      await evaluateInterviewAction(target.id, body);
      toast.success('面试评价已提交');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRecruitError('提交面试评价失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>面试评价</DialogTitle>
          <DialogDescription>
            {target ? `${target.candidateName} · ${target.interviewRound} · ${target.interviewNo}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrFormField label="面试结果" required>
            <Select value={form.result} onValueChange={(value: string) => patch('result', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="面试结果" /></SelectTrigger>
              <SelectContent>
                {HR_INTERVIEW_RESULT_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="专业分（1-10）" required>
            <Input className="rounded-none" type="number" min="1" max="10" value={form.scoreProfessional}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('scoreProfessional', event.target.value)} />
          </HrFormField>
          <HrFormField label="沟通分（1-10）" required>
            <Input className="rounded-none" type="number" min="1" max="10" value={form.scoreCommunication}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('scoreCommunication', event.target.value)} />
          </HrFormField>
          <HrFormField label="综合分（1-10）" required>
            <Input className="rounded-none" type="number" min="1" max="10" value={form.scoreGeneral}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('scoreGeneral', event.target.value)} />
          </HrFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              面试评价 <span className="text-destructive">*</span>
            </label>
            <Textarea className="rounded-none" rows={3} value={form.evaluation}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('evaluation', event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '提交评价'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
