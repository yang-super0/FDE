import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CustomReportCreateInput,
  CustomReportRecord,
  CustomReportUpdateInput,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Switch } from '@client/src/components/ui/switch';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  createCustomReport,
  updateCustomReport,
} from '@client/src/api/report-center/custom-reports';
import {
  CHART_TYPES,
  REPORT_DIMENSIONS,
  REPORT_METRICS,
  REPORT_TYPES,
  TIME_RANGES,
  RcDatePicker,
  toRcErrorText,
} from '../report-center-constants';

const REPORT_NONE_VALUE = '__none__';
const CUSTOM_TIME_RANGE = '自定义';

const reportFormSchema = z
  .object({
    reportName: z.string().min(1, '报表名称不能为空'),
    reportType: z.string().min(1, '请选择报表类型'),
    dimensions: z.array(z.string()).min(1, '至少选择一个维度'),
    metrics: z.array(z.string()).min(1, '至少选择一个指标'),
    chartType: z.string().min(1, '请选择图表类型'),
    timeRange: z.string().min(1, '请选择时间范围'),
    customStartDate: z.string(),
    customEndDate: z.string(),
    groupBy: z.string(),
    sortBy: z.string(),
    sortOrder: z.string().min(1, '请选择排序方向'),
    isPublic: z.boolean(),
    remark: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.timeRange === CUSTOM_TIME_RANGE) {
      if (!val.customStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customStartDate'],
          message: '请选择开始日期',
        });
      }
      if (!val.customEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customEndDate'],
          message: '请选择结束日期',
        });
      }
    }
  });

type ReportFormData = z.infer<typeof reportFormSchema>;

const SORT_ORDER_OPTIONS: string[] = ['降序', '升序'];

function toFormDefaults(initial: CustomReportRecord | null): ReportFormData {
  if (!initial) {
    return {
      reportName: '',
      reportType: REPORT_TYPES[0] ?? '自定义',
      dimensions: [],
      metrics: [],
      chartType: CHART_TYPES[0] ?? '',
      timeRange: TIME_RANGES[0] ?? '',
      customStartDate: '',
      customEndDate: '',
      groupBy: REPORT_NONE_VALUE,
      sortBy: REPORT_NONE_VALUE,
      sortOrder: SORT_ORDER_OPTIONS[0],
      isPublic: false,
      remark: '',
    };
  }
  return {
    reportName: initial.reportName,
    reportType: initial.reportType || REPORT_TYPES[0] || '自定义',
    dimensions: initial.dimensions,
    metrics: initial.metrics,
    chartType: initial.chartType || CHART_TYPES[0] || '',
    timeRange: initial.timeRange || TIME_RANGES[0] || '',
    customStartDate: initial.customStartDate ?? '',
    customEndDate: initial.customEndDate ?? '',
    groupBy: initial.groupBy || REPORT_NONE_VALUE,
    sortBy: initial.sortBy || REPORT_NONE_VALUE,
    sortOrder: initial.sortOrder || SORT_ORDER_OPTIONS[0],
    isPublic: initial.isPublic,
    remark: initial.remark ?? '',
  };
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v: string) => v !== value)
    : [...list, value];
}

interface ReportConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: CustomReportRecord | null;
}

export const ReportConfigDialog: React.FC<ReportConfigDialogProps> = ({
  open,
  onClose,
  onSaved,
  initial,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: toFormDefaults(null),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(toFormDefaults(initial ?? null));
  }, [open, initial, form]);

  const watchDimensions: string[] = form.watch('dimensions');
  const watchMetrics: string[] = form.watch('metrics');
  const watchTimeRange: string = form.watch('timeRange');

  const groupSortOptions: string[] = [
    ...watchDimensions,
    ...watchMetrics,
  ];

  const onSubmit = async (data: ReportFormData): Promise<void> => {
    setSubmitting(true);
    try {
      const isCustomRange: boolean = data.timeRange === CUSTOM_TIME_RANGE;
      if (initial) {
        const input: CustomReportUpdateInput = {
          reportName: data.reportName,
          reportType: data.reportType,
          dimensions: data.dimensions,
          metrics: data.metrics,
          chartType: data.chartType,
          timeRange: data.timeRange,
          customStartDate: isCustomRange ? data.customStartDate || null : null,
          customEndDate: isCustomRange ? data.customEndDate || null : null,
          groupBy: data.groupBy === REPORT_NONE_VALUE ? null : data.groupBy,
          sortBy: data.sortBy === REPORT_NONE_VALUE ? null : data.sortBy,
          sortOrder: data.sortOrder,
          isPublic: data.isPublic,
          sharedWith: [],
          remark: data.remark.trim() || null,
        };
        await updateCustomReport(initial.id, input);
        toast.success('报表已更新');
      } else {
        const input: CustomReportCreateInput = {
          reportName: data.reportName,
          reportType: data.reportType,
          dimensions: data.dimensions,
          metrics: data.metrics,
          chartType: data.chartType,
          timeRange: data.timeRange,
          customStartDate: isCustomRange ? data.customStartDate || undefined : undefined,
          customEndDate: isCustomRange ? data.customEndDate || undefined : undefined,
          groupBy: data.groupBy === REPORT_NONE_VALUE ? undefined : data.groupBy,
          sortBy: data.sortBy === REPORT_NONE_VALUE ? undefined : data.sortBy,
          sortOrder: data.sortOrder,
          isPublic: data.isPublic,
          sharedWith: [],
          remark: data.remark.trim() || undefined,
        };
        await createCustomReport(input);
        toast.success('报表已创建');
      }
      onSaved();
      onClose();
    } catch (error) {
      logger.error('保存自定义报表失败', error);
      toast.error(toRcErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const renderSelectField = (
    name: 'reportType' | 'chartType' | 'timeRange' | 'groupBy' | 'sortBy' | 'sortOrder',
    label: string,
    options: string[],
    required: boolean,
  ): React.ReactNode => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-[180px] flex-1">
          <FormLabel>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder={`请选择${label}`} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="rounded-none">
              {name === 'groupBy' || name === 'sortBy' ? (
                <SelectItem value={REPORT_NONE_VALUE}>不指定</SelectItem>
              ) : null}
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="rounded-none max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑自定义报表' : '新建自定义报表'}</DialogTitle>
          <DialogDescription>配置维度、指标与图表展示，标 * 为必填项</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="reportName"
                render={({ field }) => (
                  <FormItem className="min-w-[240px] flex-1">
                    <FormLabel>
                      报表名称<span className="text-destructive"> *</span>
                    </FormLabel>
                    <FormControl>
                      <Input className="rounded-none" placeholder="请输入报表名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderSelectField('reportType', '报表类型', REPORT_TYPES, true)}
              {renderSelectField('chartType', '图表类型', CHART_TYPES, true)}
              {renderSelectField('timeRange', '时间范围', TIME_RANGES, true)}
              {watchTimeRange === CUSTOM_TIME_RANGE ? (
                <FormField
                  control={form.control}
                  name="customStartDate"
                  render={({ field }) => (
                    <FormItem className="min-w-[180px] flex-1">
                      <FormLabel>开始日期</FormLabel>
                      <FormControl>
                        <RcDatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="开始日期"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              {watchTimeRange === CUSTOM_TIME_RANGE ? (
                <FormField
                  control={form.control}
                  name="customEndDate"
                  render={({ field }) => (
                    <FormItem className="min-w-[180px] flex-1">
                      <FormLabel>结束日期</FormLabel>
                      <FormControl>
                        <RcDatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="结束日期"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              {renderSelectField('groupBy', '分组字段', groupSortOptions, false)}
              {renderSelectField('sortBy', '排序字段', groupSortOptions, false)}
              {renderSelectField('sortOrder', '排序方向', SORT_ORDER_OPTIONS, true)}
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="min-w-[140px] flex-1">
                    <FormLabel>是否公开</FormLabel>
                    <FormControl>
                      <div className="flex h-9 items-center gap-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked: boolean | 'indeterminate') =>
                            field.onChange(checked === true)
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? '公开' : '私有'}
                        </span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    分析维度<span className="text-destructive"> *</span>
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2 rounded-none border border-border p-3 md:grid-cols-5">
                      {REPORT_DIMENSIONS.map((dim: string) => (
                        <label key={dim} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={field.value.includes(dim)}
                            onCheckedChange={(checked: boolean | 'indeterminate') => {
                              if (checked === 'indeterminate') return;
                              field.onChange(
                                checked
                                  ? [...field.value, dim]
                                  : field.value.filter((v: string) => v !== dim),
                              );
                            }}
                          />
                          {dim}
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metrics"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    统计指标<span className="text-destructive"> *</span>
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2 rounded-none border border-border p-3 md:grid-cols-5">
                      {REPORT_METRICS.map((metric: string) => (
                        <label key={metric} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={field.value.includes(metric)}
                            onCheckedChange={(checked: boolean | 'indeterminate') => {
                              if (checked === 'indeterminate') return;
                              field.onChange(
                                checked
                                  ? [...field.value, metric]
                                  : field.value.filter((v: string) => v !== metric),
                              );
                            }}
                          />
                          {metric}
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      className="rounded-none"
                      placeholder="选填"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-none"
                type="button"
                onClick={onClose}
              >
                取消
              </Button>
              <Button
                data-ai-section-type="button"
                className="rounded-none"
                type="submit"
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
