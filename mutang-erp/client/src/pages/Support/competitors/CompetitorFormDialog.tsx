import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CompetitorCreateDto,
  CompetitorMonitoring,
  CompetitorUpdateDto,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  SE_COMPETITOR_DATA_SOURCE_OPTIONS,
  SE_CONFIDENCE_OPTIONS,
  SE_FILTER_ALL,
  SE_INDUSTRY_OPTIONS,
  SE_PLATFORM_OPTIONS,
  SeFormField,
  toSeErrorText,
} from '../support-enhance-constants';
import {
  createCompetitorMonitoring,
  updateCompetitorMonitoring,
} from '@client/src/api/support-enhance/competitors';

interface CompetitorFormDialogProps {
  open: boolean;
  initial: CompetitorMonitoring | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface CompetitorFormState {
  competitorName: string;
  competitorIndustry: string;
  platform: string;
  monitorDate: string;
  estimatedConsumption: string;
  estimatedRoi: string;
  adCount: string;
  creativeCount: string;
  mainProducts: string;
  targetAudience: string;
  landingPageType: string;
  keywords: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
  dataSource: string;
  confidence: string;
  remark: string;
}

const EMPTY_FORM: CompetitorFormState = {
  competitorName: '',
  competitorIndustry: '',
  platform: '',
  monitorDate: '',
  estimatedConsumption: '',
  estimatedRoi: '',
  adCount: '',
  creativeCount: '',
  mainProducts: '',
  targetAudience: '',
  landingPageType: '',
  keywords: '',
  strengths: '',
  weaknesses: '',
  opportunities: '',
  threats: '',
  dataSource: '',
  confidence: '',
  remark: '',
};

const splitTags = (text: string): string[] =>
  text
    .split(/[,，]/u)
    .map((item: string) => item.trim())
    .filter((item: string) => item !== '');

const numOrUndefined = (text: string): number | undefined => {
  if (text.trim() === '') return undefined;
  const num: number = Number(text);
  return Number.isFinite(num) ? num : undefined;
};

const CompetitorFormDialog = ({
  open,
  initial,
  onOpenChange,
  onSaved,
}: CompetitorFormDialogProps) => {
  const [form, setForm] = useState<CompetitorFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setErrorText('');
    if (initial) {
      setForm({
        competitorName: initial.competitorName,
        competitorIndustry: initial.competitorIndustry ?? '',
        platform: initial.platform ?? '',
        monitorDate: initial.monitorDate?.slice(0, 10) ?? '',
        estimatedConsumption:
          initial.estimatedConsumption != null
            ? String(initial.estimatedConsumption)
            : '',
        estimatedRoi:
          initial.estimatedRoi != null ? String(initial.estimatedRoi) : '',
        adCount: initial.adCount != null ? String(initial.adCount) : '',
        creativeCount:
          initial.creativeCount != null ? String(initial.creativeCount) : '',
        mainProducts: initial.mainProducts ?? '',
        targetAudience: initial.targetAudience ?? '',
        landingPageType: initial.landingPageType ?? '',
        keywords: (initial.keywords ?? []).join(','),
        strengths: initial.strengths ?? '',
        weaknesses: initial.weaknesses ?? '',
        opportunities: initial.opportunities ?? '',
        threats: initial.threats ?? '',
        dataSource: initial.dataSource,
        confidence: initial.confidence,
        remark: initial.remark ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, initial]);

  const setField = (key: keyof CompetitorFormState, value: string): void => {
    setForm((prev: CompetitorFormState) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (form.competitorName.trim() === '' || form.monitorDate.trim() === '') {
      setErrorText('请填写竞品名称与监控日期（必填项）');
      return;
    }
    const dto: CompetitorCreateDto = {
      competitorName: form.competitorName.trim(),
      competitorIndustry: form.competitorIndustry || undefined,
      platform: form.platform || undefined,
      monitorDate: form.monitorDate.trim(),
      estimatedConsumption: numOrUndefined(form.estimatedConsumption),
      estimatedRoi: numOrUndefined(form.estimatedRoi),
      adCount: numOrUndefined(form.adCount),
      creativeCount: numOrUndefined(form.creativeCount),
      mainProducts: form.mainProducts || undefined,
      targetAudience: form.targetAudience || undefined,
      landingPageType: form.landingPageType || undefined,
      keywords: splitTags(form.keywords),
      strengths: form.strengths || undefined,
      weaknesses: form.weaknesses || undefined,
      opportunities: form.opportunities || undefined,
      threats: form.threats || undefined,
      dataSource: form.dataSource || undefined,
      confidence: form.confidence || undefined,
      remark: form.remark || undefined,
    };
    setSaving(true);
    try {
      if (initial) {
        await updateCompetitorMonitoring(initial.id, dto as CompetitorUpdateDto);
        toast.success('竞品监控记录已更新');
      } else {
        await createCompetitorMonitoring(dto);
        toast.success('竞品监控记录已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const text: string = toSeErrorText(error);
      logger.error('保存竞品监控记录失败', error);
      setErrorText(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? '编辑竞品监控记录' : '新建竞品监控记录'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SeFormField label="竞品名称" required>
            <Input
              className="rounded-none"
              value={form.competitorName}
              onChange={(e) => setField('competitorName', e.target.value)}
              placeholder="请输入竞品名称"
            />
          </SeFormField>
          <SeFormField label="行业">
            <Select
              value={form.competitorIndustry || SE_FILTER_ALL}
              onValueChange={(v: string) =>
                setField('competitorIndustry', v === SE_FILTER_ALL ? '' : v)
              }
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="选择行业" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={SE_FILTER_ALL}>不限</SelectItem>
                {SE_INDUSTRY_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SeFormField>
          <SeFormField label="平台">
            <Select
              value={form.platform || SE_FILTER_ALL}
              onValueChange={(v: string) =>
                setField('platform', v === SE_FILTER_ALL ? '' : v)
              }
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={SE_FILTER_ALL}>不限</SelectItem>
                {SE_PLATFORM_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SeFormField>
          <SeFormField label="监控日期" required>
            <Input
              className="rounded-none"
              value={form.monitorDate}
              onChange={(e) => setField('monitorDate', e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </SeFormField>
          <SeFormField label="预估消耗">
            <Input
              className="rounded-none"
              value={form.estimatedConsumption}
              onChange={(e) => setField('estimatedConsumption', e.target.value)}
              placeholder="数字，元"
            />
          </SeFormField>
          <SeFormField label="预估ROI">
            <Input
              className="rounded-none"
              value={form.estimatedRoi}
              onChange={(e) => setField('estimatedRoi', e.target.value)}
              placeholder="数字"
            />
          </SeFormField>
          <SeFormField label="广告数">
            <Input
              className="rounded-none"
              value={form.adCount}
              onChange={(e) => setField('adCount', e.target.value)}
              placeholder="数字"
            />
          </SeFormField>
          <SeFormField label="素材数">
            <Input
              className="rounded-none"
              value={form.creativeCount}
              onChange={(e) => setField('creativeCount', e.target.value)}
              placeholder="数字"
            />
          </SeFormField>
          <SeFormField label="主推产品">
            <Input
              className="rounded-none"
              value={form.mainProducts}
              onChange={(e) => setField('mainProducts', e.target.value)}
            />
          </SeFormField>
          <SeFormField label="目标人群">
            <Input
              className="rounded-none"
              value={form.targetAudience}
              onChange={(e) => setField('targetAudience', e.target.value)}
            />
          </SeFormField>
          <SeFormField label="落地页类型">
            <Input
              className="rounded-none"
              value={form.landingPageType}
              onChange={(e) => setField('landingPageType', e.target.value)}
            />
          </SeFormField>
          <SeFormField label="关键词（逗号分隔）">
            <Input
              className="rounded-none"
              value={form.keywords}
              onChange={(e) => setField('keywords', e.target.value)}
              placeholder="如：保湿,美白,新品"
            />
          </SeFormField>
          <SeFormField label="数据来源">
            <Select
              value={form.dataSource || SE_FILTER_ALL}
              onValueChange={(v: string) =>
                setField('dataSource', v === SE_FILTER_ALL ? '' : v)
              }
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="选择数据来源" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={SE_FILTER_ALL}>未指定</SelectItem>
                {SE_COMPETITOR_DATA_SOURCE_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SeFormField>
          <SeFormField label="可信度">
            <Select
              value={form.confidence || SE_FILTER_ALL}
              onValueChange={(v: string) =>
                setField('confidence', v === SE_FILTER_ALL ? '' : v)
              }
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="选择可信度" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value={SE_FILTER_ALL}>未指定</SelectItem>
                {SE_CONFIDENCE_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SeFormField>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SeFormField label="SWOT · 优势">
            <Textarea
              className="rounded-none"
              value={form.strengths}
              onChange={(e) => setField('strengths', e.target.value)}
              placeholder="竞品优势分析"
            />
          </SeFormField>
          <SeFormField label="SWOT · 劣势">
            <Textarea
              className="rounded-none"
              value={form.weaknesses}
              onChange={(e) => setField('weaknesses', e.target.value)}
              placeholder="竞品劣势分析"
            />
          </SeFormField>
          <SeFormField label="SWOT · 机会点">
            <Textarea
              className="rounded-none"
              value={form.opportunities}
              onChange={(e) => setField('opportunities', e.target.value)}
              placeholder="我方机会点"
            />
          </SeFormField>
          <SeFormField label="SWOT · 威胁点">
            <Textarea
              className="rounded-none"
              value={form.threats}
              onChange={(e) => setField('threats', e.target.value)}
              placeholder="我方威胁点"
            />
          </SeFormField>
          <SeFormField label="备注">
            <Textarea
              className="rounded-none"
              value={form.remark}
              onChange={(e) => setField('remark', e.target.value)}
            />
          </SeFormField>
        </div>
        {errorText ? (
          <p className="text-sm text-destructive">{errorText}</p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="rounded-none"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompetitorFormDialog;
