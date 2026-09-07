import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import type {
  IndustryRoiBenchmark,
  IndustryRoiCorrectDto,
} from '@shared/api.interface';
import { correctIndustryRoiBenchmark } from '@client/src/api/support-enhance';
import { SeFormField, toSeErrorText } from '../support-enhance-constants';
import { numOrUndef } from './RoiFormDialog';

interface RoiCorrectFormState {
  roiBenchmark: string;
  roiMin: string;
  roiMax: string;
  cpcBenchmark: string;
  cpmBenchmark: string;
  conversionRate: string;
  expireDate: string;
  correctReason: string;
}

interface RoiCorrectDialogProps {
  open: boolean;
  record: IndustryRoiBenchmark | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const RoiCorrectDialog = ({
  open,
  record,
  onOpenChange,
  onSaved,
}: RoiCorrectDialogProps) => {
  const [form, setForm] = useState<RoiCorrectFormState>({
    roiBenchmark: '',
    roiMin: '',
    roiMax: '',
    cpcBenchmark: '',
    cpmBenchmark: '',
    conversionRate: '',
    expireDate: '',
    correctReason: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open && record) {
      setForm({
        roiBenchmark: String(record.roiBenchmark ?? ''),
        roiMin: record.roiMin === null || record.roiMin === undefined ? '' : String(record.roiMin),
        roiMax: record.roiMax === null || record.roiMax === undefined ? '' : String(record.roiMax),
        cpcBenchmark: record.cpcBenchmark === null || record.cpcBenchmark === undefined ? '' : String(record.cpcBenchmark),
        cpmBenchmark: record.cpmBenchmark === null || record.cpmBenchmark === undefined ? '' : String(record.cpmBenchmark),
        conversionRate: record.conversionRate === null || record.conversionRate === undefined ? '' : String(record.conversionRate),
        expireDate: record.expireDate ?? '',
        correctReason: '',
      });
    }
  }, [open, record]);

  const setField = (key: keyof RoiCorrectFormState, value: string): void => {
    setForm((prev: RoiCorrectFormState) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    const roi: number = Number(form.roiBenchmark);
    if (form.roiBenchmark.trim() === '' || !Number.isFinite(roi)) {
      toast.error('请输入有效的ROI基准值');
      return;
    }
    if (form.correctReason.trim() === '') {
      toast.error('请输入修正原因');
      return;
    }
    if (!record) return;
    setSubmitting(true);
    try {
      const dto: IndustryRoiCorrectDto = {
        roiBenchmark: roi,
        roiMin: numOrUndef(form.roiMin),
        roiMax: numOrUndef(form.roiMax),
        cpcBenchmark: numOrUndef(form.cpcBenchmark),
        cpmBenchmark: numOrUndef(form.cpmBenchmark),
        conversionRate: numOrUndef(form.conversionRate),
        expireDate: form.expireDate.trim() || undefined,
        correctReason: form.correctReason.trim(),
      };
      await correctIndustryRoiBenchmark(record.id, dto);
      toast.success('ROI基准已修正，并生成新版本');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      logger.error('修正ROI基准失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>修正ROI基准</DialogTitle>
          <DialogDescription>
            {record ? `${record.industry} · ${record.platform} · 当前版本 v${record.version}` : ''}
            ，修正后将生成新版本记录
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-4">
          <SeFormField label="ROI基准" required>
            <Input
              className="rounded-none font-mono"
              value={form.roiBenchmark}
              onChange={(e) => setField('roiBenchmark', e.target.value)}
              placeholder="必填"
            />
          </SeFormField>
          <SeFormField label="修正原因" required>
            <Textarea
              className="rounded-none"
              value={form.correctReason}
              onChange={(e) => setField('correctReason', e.target.value)}
              placeholder="必填，将记入版本历史"
            />
          </SeFormField>
          <SeFormField label="最低ROI">
            <Input
              className="rounded-none font-mono"
              value={form.roiMin}
              onChange={(e) => setField('roiMin', e.target.value)}
              placeholder="可空"
            />
          </SeFormField>
          <SeFormField label="最高ROI">
            <Input
              className="rounded-none font-mono"
              value={form.roiMax}
              onChange={(e) => setField('roiMax', e.target.value)}
              placeholder="可空"
            />
          </SeFormField>
          <SeFormField label="CPC基准（元）">
            <Input
              className="rounded-none font-mono"
              value={form.cpcBenchmark}
              onChange={(e) => setField('cpcBenchmark', e.target.value)}
              placeholder="可空"
            />
          </SeFormField>
          <SeFormField label="CPM基准（元）">
            <Input
              className="rounded-none font-mono"
              value={form.cpmBenchmark}
              onChange={(e) => setField('cpmBenchmark', e.target.value)}
              placeholder="可空"
            />
          </SeFormField>
          <SeFormField label="转化率（%）">
            <Input
              className="rounded-none font-mono"
              value={form.conversionRate}
              onChange={(e) => setField('conversionRate', e.target.value)}
              placeholder="可空"
            />
          </SeFormField>
          <SeFormField label="失效日期">
            <Input
              className="rounded-none font-mono"
              value={form.expireDate}
              onChange={(e) => setField('expireDate', e.target.value)}
              placeholder="YYYY-MM-DD，可空"
            />
          </SeFormField>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            data-ai-section-type="button"
            className="rounded-none"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '提交中...' : '确认修正'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { RoiCorrectDialog };
