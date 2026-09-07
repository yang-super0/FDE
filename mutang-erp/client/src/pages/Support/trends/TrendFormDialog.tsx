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
  IndustryTrendCreateDto,
  IndustryTrendRecord,
} from '@shared/api.interface';
import {
  createIndustryTrendRecord,
  updateIndustryTrendRecord,
} from '@client/src/api/support-enhance';
import {
  SE_INDUSTRY_OPTIONS,
  SE_PLATFORM_OPTIONS,
  SE_TREND_DATA_SOURCE_OPTIONS,
  SeFormField,
  toSeErrorText,
} from '../support-enhance-constants';

const PLATFORM_UNSET = '__unset__';

interface TrendFormState {
  industry: string;
  subIndustry: string;
  platform: string;
  statDate: string;
  totalConsumption: string;
  consumptionGrowth: string;
  avgCpc: string;
  cpcChange: string;
  avgCpm: string;
  cpmChange: string;
  avgConversionRate: string;
  conversionChange: string;
  activeAdvertisers: string;
  trafficIndex: string;
  competitionIndex: string;
  dataSource: string;
  remark: string;
}

const EMPTY_TREND_FORM: TrendFormState = {
  industry: '',
  subIndustry: '',
  platform: PLATFORM_UNSET,
  statDate: '',
  totalConsumption: '',
  consumptionGrowth: '',
  avgCpc: '',
  cpcChange: '',
  avgCpm: '',
  cpmChange: '',
  avgConversionRate: '',
  conversionChange: '',
  activeAdvertisers: '',
  trafficIndex: '',
  competitionIndex: '',
  dataSource: SE_TREND_DATA_SOURCE_OPTIONS[0],
  remark: '',
};

function numOrUndef(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const num: number = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function toFormState(record: IndustryTrendRecord | null): TrendFormState {
  if (!record) return { ...EMPTY_TREND_FORM };
  const str = (v: number | null | undefined): string =>
    v === null || v === undefined ? '' : String(v);
  return {
    industry: record.industry,
    subIndustry: record.subIndustry ?? '',
    platform: record.platform ?? PLATFORM_UNSET,
    statDate: record.statDate ?? '',
    totalConsumption: str(record.totalConsumption),
    consumptionGrowth: str(record.consumptionGrowth),
    avgCpc: str(record.avgCpc),
    cpcChange: str(record.cpcChange),
    avgCpm: str(record.avgCpm),
    cpmChange: str(record.cpmChange),
    avgConversionRate: str(record.avgConversionRate),
    conversionChange: str(record.conversionChange),
    activeAdvertisers: str(record.activeAdvertisers),
    trafficIndex: str(record.trafficIndex),
    competitionIndex: str(record.competitionIndex),
    dataSource: record.dataSource || SE_TREND_DATA_SOURCE_OPTIONS[0],
    remark: record.remark ?? '',
  };
}

interface TrendFormDialogProps {
  open: boolean;
  record: IndustryTrendRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const TrendFormDialog = ({
  open,
  record,
  onOpenChange,
  onSaved,
}: TrendFormDialogProps) => {
  const [form, setForm] = useState<TrendFormState>({ ...EMPTY_TREND_FORM });
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setForm(toFormState(record));
  }, [open, record]);

  const setField = (key: keyof TrendFormState, value: string): void => {
    setForm((prev: TrendFormState) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.industry) {
      toast.error('请选择行业');
      return;
    }
    if (form.statDate.trim() === '') {
      toast.error('请输入统计日期（YYYY-MM-DD）');
      return;
    }
    setSubmitting(true);
    try {
      const dto: IndustryTrendCreateDto = {
        industry: form.industry,
        subIndustry: form.subIndustry.trim() || undefined,
        platform: form.platform === PLATFORM_UNSET ? undefined : form.platform,
        statDate: form.statDate.trim(),
        totalConsumption: numOrUndef(form.totalConsumption),
        consumptionGrowth: numOrUndef(form.consumptionGrowth),
        avgCpc: numOrUndef(form.avgCpc),
        cpcChange: numOrUndef(form.cpcChange),
        avgCpm: numOrUndef(form.avgCpm),
        cpmChange: numOrUndef(form.cpmChange),
        avgConversionRate: numOrUndef(form.avgConversionRate),
        conversionChange: numOrUndef(form.conversionChange),
        activeAdvertisers: numOrUndef(form.activeAdvertisers),
        trafficIndex: numOrUndef(form.trafficIndex),
        competitionIndex: numOrUndef(form.competitionIndex),
        dataSource: form.dataSource,
        remark: form.remark.trim() || undefined,
      };
      if (record) {
        await updateIndustryTrendRecord(record.id, dto);
        toast.success('大盘记录已更新');
      } else {
        await createIndustryTrendRecord(dto);
        toast.success('大盘记录已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      logger.error('保存大盘记录失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const numberField = (
    label: string,
    key: keyof TrendFormState,
    placeholder: string,
  ) => (
    <SeFormField label={label}>
      <Input
        className="rounded-none font-mono"
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        placeholder={placeholder}
      />
    </SeFormField>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? '编辑大盘记录' : '新建大盘记录'}</DialogTitle>
          <DialogDescription>
            行业大盘数据，标 * 为必填项，数值字段选填
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
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
          <SeFormField label="平台">
            <Select
              value={form.platform}
              onValueChange={(v: string) => setField('platform', v)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="选填" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {SE_PLATFORM_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
                <SelectItem value={PLATFORM_UNSET}>不限平台</SelectItem>
              </SelectContent>
            </Select>
          </SeFormField>
          <SeFormField label="统计日期" required>
            <Input
              className="rounded-none font-mono"
              value={form.statDate}
              onChange={(e) => setField('statDate', e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </SeFormField>
          {numberField('总消耗（元）', 'totalConsumption', '如 125000.50')}
          {numberField('消耗增长率（%）', 'consumptionGrowth', '如 12.5')}
          {numberField('平均CPC（元）', 'avgCpc', '如 1.85')}
          {numberField('CPC变化（%）', 'cpcChange', '如 -3.2')}
          {numberField('平均CPM（元）', 'avgCpm', '如 25.6')}
          {numberField('CPM变化（%）', 'cpmChange', '如 4.1')}
          {numberField('平均转化率（%）', 'avgConversionRate', '如 3.5')}
          {numberField('转化变化（%）', 'conversionChange', '如 0.8')}
          {numberField('活跃广告主', 'activeAdvertisers', '如 1200')}
          {numberField('流量指数', 'trafficIndex', '如 86.5')}
          {numberField('竞争指数', 'competitionIndex', '如 72.3')}
          <SeFormField label="数据来源">
            <Select
              value={form.dataSource}
              onValueChange={(v: string) => setField('dataSource', v)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="请选择数据来源" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {SE_TREND_DATA_SOURCE_OPTIONS.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

export { TrendFormDialog };
