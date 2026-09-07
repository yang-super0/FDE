import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { Switch } from '@client/src/components/ui/switch';
import { Textarea } from '@client/src/components/ui/textarea';
import type {
  ReportTemplateCreateInput, ReportTemplateRecord, ReportTemplateUpdateInput,
} from '@shared/api.interface';
import {
  createReportTemplate, updateReportTemplate,
} from '@client/src/api/report-center/templates';
import {
  CHART_TYPES, REPORT_DIMENSIONS, REPORT_METRICS, TEMPLATE_CATEGORIES, toRcErrorText,
} from '../report-center-constants';

const toErrText = (error: unknown): string =>
  error instanceof Error ? error.message : toRcErrorText(error);

const templateSchema = z.object({
  templateName: z.string().min(1, '请输入模板名称'),
  templateCategory: z.string().min(1, '请选择模板分类'),
  description: z.string(),
  dimensions: z.array(z.string()).min(1, '请至少选择一个维度'),
  metrics: z.array(z.string()).min(1, '请至少选择一个指标'),
  chartType: z.string().min(1, '请选择图表类型'),
  isPublic: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

const EMPTY_VALUES: TemplateFormValues = {
  templateName: '', templateCategory: '', description: '',
  dimensions: [], metrics: [], chartType: '', isPublic: false,
};

function toValues(record: ReportTemplateRecord | undefined): TemplateFormValues {
  if (!record) return { ...EMPTY_VALUES, dimensions: [], metrics: [] };
  return {
    templateName: record.templateName,
    templateCategory: record.templateCategory,
    description: record.description ?? '',
    dimensions: [...record.dimensions],
    metrics: [...record.metrics],
    chartType: record.chartType,
    isPublic: record.isPublic,
  };
}

interface TemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: ReportTemplateRecord;
}

const TemplateFormDialog: React.FC<TemplateFormDialogProps> = ({
  open, onClose, onSaved, initial,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const locked: boolean = initial?.isSystem === true;

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: toValues(initial),
  });

  useEffect(() => {
    if (open) form.reset(toValues(initial));
  }, [open, initial, form]);

  const toggleArrayValue = (
    list: string[],
    item: string,
    checked: boolean | 'indeterminate',
  ): string[] =>
    checked ? [...list, item] : list.filter((v: string) => v !== item);

  const handleSubmit = form.handleSubmit(async (values: TemplateFormValues): Promise<void> => {
    setSubmitting(true);
    try {
      if (initial) {
        const input: ReportTemplateUpdateInput = {
          templateName: values.templateName,
          templateCategory: values.templateCategory,
          description: values.description.trim() || null,
          isPublic: values.isPublic,
        };
        if (!locked) {
          input.dimensions = values.dimensions;
          input.metrics = values.metrics;
          input.chartType = values.chartType;
        }
        await updateReportTemplate(initial.id, input);
        toast.success('模板已更新');
      } else {
        const input: ReportTemplateCreateInput = {
          templateName: values.templateName,
          templateCategory: values.templateCategory,
          description: values.description.trim() || undefined,
          dimensions: values.dimensions,
          metrics: values.metrics,
          chartType: values.chartType,
          isPublic: values.isPublic,
        };
        await createReportTemplate(input);
        toast.success('模板已创建');
      }
      onClose();
      onSaved();
    } catch (error) {
      logger.error('保存报表模板失败', error);
      toast.error(toErrText(error));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen: boolean) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="rounded-none max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑模板' : '新建模板'}</DialogTitle>
          <DialogDescription>
            {locked ? '系统内置模板的维度、指标与图表类型不可修改' : '标 * 为必填项'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => { void handleSubmit(event); }}
            className="flex flex-wrap gap-4"
          >
            <FormField
              control={form.control}
              name="templateName"
              render={({ field }) => (
                <FormItem className="min-w-[200px] flex-1">
                  <FormLabel>模板名称 *</FormLabel>
                  <FormControl>
                    <Input className="rounded-none" placeholder="请输入模板名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="templateCategory"
              render={({ field }) => (
                <FormItem className="min-w-[200px] flex-1">
                  <FormLabel>模板分类 *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="请选择分类" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none">
                      {TEMPLATE_CATEGORIES.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dimensions"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>分析维度 *{locked ? '（内置模板不可修改）' : ''}</FormLabel>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {REPORT_DIMENSIONS.map((dim: string) => (
                      <label key={dim} className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          disabled={locked}
                          checked={field.value.includes(dim)}
                          onCheckedChange={(checked: boolean | 'indeterminate') =>
                            field.onChange(toggleArrayValue(field.value, dim, checked))}
                        />
                        {dim}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metrics"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>统计指标 *{locked ? '（内置模板不可修改）' : ''}</FormLabel>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {REPORT_METRICS.map((metric: string) => (
                      <label key={metric} className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          disabled={locked}
                          checked={field.value.includes(metric)}
                          onCheckedChange={(checked: boolean | 'indeterminate') =>
                            field.onChange(toggleArrayValue(field.value, metric, checked))}
                        />
                        {metric}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chartType"
              render={({ field }) => (
                <FormItem className="min-w-[200px] flex-1">
                  <FormLabel>图表类型 *{locked ? '（内置模板不可修改）' : ''}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={locked}>
                    <FormControl>
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="请选择图表类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none">
                      {CHART_TYPES.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>模板说明</FormLabel>
                  <FormControl>
                    <Textarea className="rounded-none" placeholder="选填" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>公开模板</FormLabel>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked: boolean) => field.onChange(checked)}
                    />
                    公开后所有人可见
                  </label>
                </FormItem>
              )}
            />
            <DialogFooter className="w-full">
              <Button type="button" variant="outline" className="rounded-none" onClick={onClose}>
                取消
              </Button>
              <Button data-ai-section-type="button" type="submit" className="rounded-none" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { TemplateFormDialog };
