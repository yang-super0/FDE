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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';
import type {
  IndustryRoiBenchmark,
  IndustryRoiCreateDto,
} from '@shared/api.interface';
import {
  createIndustryRoiBenchmark,
  updateIndustryRoiBenchmark,
} from '@client/src/api/support-enhance';
import {
  SE_INDUSTRY_OPTIONS,
  SE_PLATFORM_OPTIONS,
  SeFormField,
  toSeErrorText,
} from '../support-enhance-constants';

export function numOrUndef(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const num: number = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

interface RoiFormState {
  industry: string;
  subIndustry: string;
  platform: string;
  roiBenchmark: string;
  roiMin: string;
  roiMax: string;
  cpcBenchmark: string;
  cpmBenchmark: string;
  conversionRate: string;
  effectiveDate: string;
  expireDate: string;
  remark: string;
}

const EMPTY_ROI_FORM: RoiFormState = {
  industry: '',
  subIndustry: '',
  platform: '',
  roiBenchmark: '',
  roiMin: '',
  roiMax: '',
  cpcBenchmark: '',
  cpmBenchmark: '',
  conversionRate: '',
  effectiveDate: '',
  expireDate: '',
  remark: '',
};

function toFormState(record: IndustryRoiBenchmark | null): RoiFormState {
  if (!record) return { ...EMPTY_ROI_FORM };
  return {
    industry: record.industry,
    subIndustry: record.subIndustry ?? '',
    platform: record.platform,
    roiBenchmark: String(record.roiBenchmark ?? ''),
    roiMin: record.roiMin === null || record.roiMin === undefined ? '' : String(record.roiMin),
    roiMax: record.roiMax === null || record.roiMax === undefined ? '' : String(record.roiMax),
    cpcBenchmark: record.cpcBenchmark === null || record.cpcBenchmark === undefined ? '' : String(record.cpcBenchmark),
    cpmBenchmark: record.cpmBenchmark === null || record.cpmBenchmark === undefined ? '' : String(record.cpmBenchmark),
    conversionRate: record.conversionRate === null || record.conversionRate === undefined ? '' : String(record.conversionRate),
    effectiveDate: record.effectiveDate ?? '',
    expireDate: record.expireDate ?? '',
    remark: record.remark ?? '',
  };
}

interface RoiFormDialogProps {
  open: boolean;
  record: IndustryRoiBenchmark | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const RoiFormDialog = ({
  open,
  record,
  onOpenChange,
  onSaved,
}: RoiFormDialogProps) => {
  const [form, setForm] = useState<RoiFormState>({ ...EMPTY_ROI_FORM });
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setForm(toFormState(record));
  }, [open, record]);

  const setField = (key: keyof RoiFormState, value: string): void => {
    setForm((prev: RoiFormState) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.industry) {
      toast.error('请选择行业');
      return;
    }
    if (!form.platform) {
      toast.error('请选择平台');
      return;
    }
    const roi: number = Number(form.roiBenchmark);
    if (form.roiBenchmark.trim() === '' || !Number.isFinite(roi)) {
      toast.error('请输入有效的ROI基准值');
      return;
    }
    if (form.effectiveDate.trim() === '') {
      toast.error('请输入生效日期（YYYY-MM-DD）');
      return;
    }
    setSubmitting(true);
    try {
      const dto: IndustryRoiCreateDto = {
        industry: form.industry,
        subIndustry: form.subIndustry.trim() || undefined,
        platform: form.platform,
        roiBenchmark: roi,
        roiMin: numOrUndef(form.roiMin),
        roiMax: numOrUndef(form.roiMax),
        cpcBenchmark: numOrUndef(form.cpcBenchmark),
        cpmBenchmark: numOrUndef(form.cpmBenchmark),
        conversionRate: numOrUndef(form.conversionRate),
        effectiveDate: form.effectiveDate.trim(),
        expireDate: form.expireDate.trim() || undefined,
        remark: form.remark.trim() || undefined,
      };
      if (record) {
        await updateIndustryRoiBenchmark(record.id, dto);
        toast.success('ROI基准已更新');
      } else {
        await createIndustryRoiBenchmark(dto);
        toast.success('ROI基准已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      logger.error('保存ROI基准失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? '编辑ROI基准' : '新建ROI基准'}</DialogTitle>
          <DialogDescription>
            行业ROI基准数据，标 * 为必填项
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-4">
          <SeFormField label="行业" required>
            <Select
              value={form.industry}
              onValueChange={(v: string) => setField('industry', v)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="请选择行业" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {SE_INDUSTRY_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SeFormField>
          <SeFormField label="二级行业">
            <Input
              className="rounded-none"
              value={form.subIndustry}
              onChange={(e) => setField('subIndustry', e.target.value)}
              placeholder="选填"
            />
          </SeFormField>
          <SeFormField label="平台" required>
            <Select
              value={form.platform}
              onValueChange={(v: string) => setField('platform', v)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="请选择平台" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {SE_PLATFORM_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SeFormField>
          <SeFormField label="ROI基准值" required>
            <Input
              className="rounded-none font-mono"
              value={form.roiBenchmark}
              onChange={(e) => setField('roiBenchmark', e.target.value)}
              placeholder="如 2.5"
            />
          </SeFormField>
          <SeFormField label="最低ROI">
            <Input
              className="rounded-none font-mono"
              value={form.roiMin}
              onChange={(e) => setField('roiMin', e.target.value)}
              placeholder="选填"
            />
          </SeFormField>
          <SeFormField label="最高ROI">
            <Input
              className="rounded-none font-mono"
              value={form.roiMax}
              onChange={(e) => setField('roiMax', e.target.value)}
              placeholder="选填"
            />
          </SeFormField>
          <SeFormField label="CPC基准（元）">
            <Input
              className="rounded-none font-mono"
              value={form.cpcBenchmark}
              onChange={(e) => setField('cpcBenchmark', e.target.value)}
              placeholder="选填"
            />
          </SeFormField>
          <SeFormField label="CPM基准（元）">
            <Input
              className="rounded-none font-mono"
              value={form.cpmBenchmark}
              onChange={(e) => setField('cpmBenchmark', e.target.value)}
              placeholder="选填"
            />
          </SeFormField>
          <SeFormField label="转化率（%）">
            <Input
              className="rounded-none font-mono"
              value={form.conversionRate}
              onChange={(e) => setField('conversionRate', e.target.value)}
              placeholder="选填"
            />
          </SeFormField>
          <SeFormField label="生效日期" required>
            <Input
              className="rounded-none font-mono"
              value={form.effectiveDate}
              onChange={(e) => setField('effectiveDate', e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </SeFormField>
          <SeFormField label="失效日期">
            <Input
              className="rounded-none font-mono"
              value={form.expireDate}
              onChange={(e) => setField('expireDate', e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </SeFormField>
          <SeFormField label="备注">
            <Textarea
              className="rounded-none"
              value={form.remark}
              onChange={(e) => setField('remark', e.target.value)}
              placeholder="选填"
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
            {submitting ? '提交中...' : '提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { RoiFormDialog };
