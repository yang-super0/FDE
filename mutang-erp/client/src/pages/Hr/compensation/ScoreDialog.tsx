import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type {
  HrPerformance, HrPerformanceLeaderScoreBody, HrPerformanceSelfScoreBody,
} from '@shared/api.interface';
import {
  leaderScoreHrPerformance, selfScoreHrPerformance,
} from '@client/src/api/hr-enhance/compensation';
import { HrFormField } from '../hr-enhance-constants';
import { reportCompError } from './compensation-shared';

interface ScoreDialogProps {
  open: boolean;
  item: HrPerformance | null;
  mode: 'self' | 'leader';
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const SCORE_MODE_TEXT: Record<'self' | 'leader', {
  title: string;
  description: string;
  label: string;
  action: string;
}> = {
  self: {
    title: '员工自评',
    description: '请根据目标完成情况进行自评打分（1-100 分）',
    label: '自评分',
    action: '提交自评',
  },
  leader: {
    title: '上级评分',
    description: '最终得分 = 自评分 × 0.4 + 上级评分 × 0.6，请综合评估后打分（1-100 分）',
    label: '上级评分',
    action: '提交评分',
  },
};

export function ScoreDialog({ open, item, mode, onSaved, onOpenChange }: ScoreDialogProps) {
  const [score, setScore] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setScore('');
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    if (!item) return;
    const value: number = Number(score);
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      toast.error('评分必须为 1-100 之间的数字');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'self') {
        const body: HrPerformanceSelfScoreBody = { selfScore: value };
        await selfScoreHrPerformance(item.id, body);
      } else {
        const body: HrPerformanceLeaderScoreBody = { leaderScore: value };
        await leaderScoreHrPerformance(item.id, body);
      }
      toast.success(mode === 'self' ? '自评已提交' : '上级评分已提交');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportCompError('提交评分失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  const text = SCORE_MODE_TEXT[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>{text.title}{item ? ` · ${item.employeeName}` : ''}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>
        <HrFormField label={text.label} required>
          <Input
            className="rounded-none" type="number" min="1" max="100" value={score}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setScore(event.target.value)}
          />
        </HrFormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : text.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
