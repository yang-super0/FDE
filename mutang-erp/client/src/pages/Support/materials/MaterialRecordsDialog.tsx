import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CreativeMaterial,
  MaterialPerformanceRecord,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
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
  SE_FILTER_ALL,
  SE_PLATFORM_OPTIONS,
  SeFormField,
  formatSeNumber,
  toSeErrorText,
} from '../support-enhance-constants';
import {
  createMaterialPerformanceRecord,
  listMaterialPerformanceRecords,
} from '@client/src/api/support-enhance/materials';

interface MaterialRecordsDialogProps {
  open: boolean;
  record: CreativeMaterial | null;
  onOpenChange: (open: boolean) => void;
  onRecordAdded: () => void;
}

interface RecordFormState {
  platform: string;
  statDate: string;
  consumption: string;
  conversions: string;
  roi: string;
  ctr: string;
  conversionRate: string;
}

const EMPTY_RECORD: RecordFormState = {
  platform: '',
  statDate: '',
  consumption: '',
  conversions: '',
  roi: '',
  ctr: '',
  conversionRate: '',
};

const numOrUndefined = (text: string): number | undefined => {
  if (text.trim() === '') return undefined;
  const num: number = Number(text);
  return Number.isFinite(num) ? num : undefined;
};

const MaterialRecordsDialog = ({
  open,
  record,
  onOpenChange,
  onRecordAdded,
}: MaterialRecordsDialogProps) => {
  const [records, setRecords] = useState<MaterialPerformanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [form, setForm] = useState<RecordFormState>(EMPTY_RECORD);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');

  const loadRecords = useCallback(async (materialId: number): Promise<void> => {
    setLoading(true);
    try {
      const data = await listMaterialPerformanceRecords(materialId);
      setRecords(data);
    } catch (error) {
      logger.error('加载素材效果记录失败', error);
      toast.error('效果记录加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && record) {
      setForm(EMPTY_RECORD);
      setErrorText('');
      void loadRecords(record.id);
    }
  }, [open, record, loadRecords]);

  const setField = (key: keyof RecordFormState, value: string): void => {
    setForm((prev: RecordFormState) => ({ ...prev, [key]: value }));
  };

  const handleAdd = async (): Promise<void> => {
    if (!record) return;
    if (form.statDate.trim() === '') {
      setErrorText('请填写统计日期（必填项）');
      return;
    }
    setSaving(true);
    try {
      await createMaterialPerformanceRecord(record.id, {
        materialId: record.id,
        platform: form.platform || undefined,
        statDate: form.statDate.trim(),
        consumption: numOrUndefined(form.consumption),
        conversions: numOrUndefined(form.conversions),
        roi: numOrUndefined(form.roi),
        ctr: numOrUndefined(form.ctr),
        conversionRate: numOrUndefined(form.conversionRate),
      });
      toast.success('效果记录已添加，素材平均指标已重算');
      setForm(EMPTY_RECORD);
      setErrorText('');
      void loadRecords(record.id);
      onRecordAdded();
    } catch (error) {
      logger.error('添加效果记录失败', error);
      setErrorText(toSeErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  if (!record) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-none" />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>效果记录 · {record.materialName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
              ADD RECORD · 添加效果记录
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                    <SelectItem value={SE_FILTER_ALL}>未指定</SelectItem>
                    {SE_PLATFORM_OPTIONS.map((opt: string) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SeFormField>
              <SeFormField label="统计日期" required>
                <Input
                  className="rounded-none"
                  value={form.statDate}
                  onChange={(e) => setField('statDate', e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </SeFormField>
              <SeFormField label="消耗">
                <Input
                  className="rounded-none"
                  value={form.consumption}
                  onChange={(e) => setField('consumption', e.target.value)}
                  placeholder="数字，元"
                />
              </SeFormField>
              <SeFormField label="转化数">
                <Input
                  className="rounded-none"
                  value={form.conversions}
                  onChange={(e) => setField('conversions', e.target.value)}
                  placeholder="数字"
                />
              </SeFormField>
              <SeFormField label="ROI">
                <Input
                  className="rounded-none"
                  value={form.roi}
                  onChange={(e) => setField('roi', e.target.value)}
                  placeholder="数字"
                />
              </SeFormField>
              <SeFormField label="CTR">
                <Input
                  className="rounded-none"
                  value={form.ctr}
                  onChange={(e) => setField('ctr', e.target.value)}
                  placeholder="数字，%"
                />
              </SeFormField>
              <SeFormField label="转化率">
                <Input
                  className="rounded-none"
                  value={form.conversionRate}
                  onChange={(e) => setField('conversionRate', e.target.value)}
                  placeholder="数字，%"
                />
              </SeFormField>
              <div className="flex items-end">
                <Button
                  data-ai-section-type="button"
                  className="rounded-none w-full"
                  disabled={saving}
                  onClick={() => void handleAdd()}
                >
                  {saving ? '添加中...' : '添加效果记录'}
                </Button>
              </div>
            </div>
            {errorText ? (
              <p className="text-sm text-destructive">{errorText}</p>
            ) : null}
          </div>
          <div className="space-y-3">
            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
              RECORDS · 效果记录列表
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">加载中...</p>
            ) : records.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无效果记录</p>
            ) : (
              <div className="space-y-2">
                {records.map((item: MaterialPerformanceRecord) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border pb-2 text-sm"
                  >
                    <span className="font-mono text-xs">{item.statDate}</span>
                    <span className="text-muted-foreground">
                      {item.platform || '未指定平台'}
                    </span>
                    <span className="font-mono">
                      消耗 {formatSeNumber(item.consumption ?? 0)}
                    </span>
                    <span className="font-mono">
                      转化 {formatSeNumber(item.conversions ?? 0, 0)}
                    </span>
                    <span className="font-mono">
                      ROI {formatSeNumber(item.roi ?? 0)}
                    </span>
                    <span className="font-mono">
                      CTR {formatSeNumber(item.ctr ?? 0)}
                    </span>
                    <span className="font-mono">
                      转化率 {formatSeNumber(item.conversionRate ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialRecordsDialog;
