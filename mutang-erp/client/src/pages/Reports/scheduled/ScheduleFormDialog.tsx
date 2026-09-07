import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CustomReportRecord,
  ReportTemplateRecord,
  ScheduledReportCreateInput,
  ScheduledReportRecord,
  ScheduledReportUpdateInput,
} from '@shared/api.interface';
import {
  createSchedule,
  fetchCustomReports,
  fetchReportTemplates,
  updateSchedule,
} from '@client/src/api/report-center';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Switch } from '@client/src/components/ui/switch';
import {
  Dialog,
  DialogContent,
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
import {
  FILE_FORMATS,
  FREQUENCIES,
  RcFormField,
  SCHEDULE_TARGET_TYPES,
  toRcErrorText,
  WEEK_DAY_OPTIONS,
} from '../report-center-constants';
import { RcFormSelect } from '../custom-reports/ReportFormFields';

const HOURS: string[] = Array.from({ length: 24 }, (_: unknown, i: number) =>
  String(i).padStart(2, '0'),
);
const MINUTES: string[] = ['00', '15', '30', '45'];
const MONTH_DAYS: string[] = Array.from(
  { length: 31 },
  (_: unknown, i: number) => String(i + 1),
);

const scheduleSchema = z
  .object({
    scheduleName: z.string().min(1, '任务名称不能为空'),
    reportId: z.string(),
    reportTemplateId: z.string(),
    frequency: z.enum(['每日', '每周', '每月', '每季度', '每年']),
    dayOfWeek: z.string(),
    dayOfMonth: z.string(),
    hour: z.string(),
    minute: z.string(),
    targetType: z.enum(['飞书群', '飞书用户', '邮件']),
    targetId: z.string(),
    targetName: z.string(),
    fileFormat: z.enum(['Excel', 'PDF', '图片']),
    includeChart: z.boolean(),
    remark: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.reportId && !data.reportTemplateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reportId'],
        message: '请至少选择一个关联报表或模板',
      });
    }
    if (data.frequency === '每周' && !data.dayOfWeek) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dayOfWeek'],
        message: '请选择星期几',
      });
    }
    if (data.frequency === '每月' && !data.dayOfMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dayOfMonth'],
        message: '请选择几号',
      });
    }
  });

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleFormDialogProps {
  open: boolean;
  initial: ScheduledReportRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const DEFAULT_VALUES: ScheduleFormData = {
  scheduleName: '',
  reportId: '',
  reportTemplateId: '',
  frequency: '每日',
  dayOfWeek: '',
  dayOfMonth: '',
  hour: '09',
  minute: '00',
  targetType: '飞书群',
  targetId: '',
  targetName: '',
  fileFormat: 'Excel',
  includeChart: true,
  remark: '',
};

const ScheduleFormDialog = ({
  open,
  initial,
  onOpenChange,
  onSaved,
}: ScheduleFormDialogProps) => {
  const [saving, setSaving] = useState<boolean>(false);
  const [reports, setReports] = useState<CustomReportRecord[]>([]);
  const [templates, setTemplates] = useState<ReportTemplateRecord[]>([]);

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    const loadOptions = async (): Promise<void> => {
      try {
        const [reportRes, templateRes] = await Promise.all([
          fetchCustomReports({ page: '1', pageSize: '100' }),
          fetchReportTemplates({ page: '1', pageSize: '100' }),
        ]);
        setReports(reportRes.items);
        setTemplates(templateRes.items);
      } catch (error) {
        logger.error('获取关联报表/模板列表失败', error);
        toast.error('获取关联报表/模板列表失败');
      }
    };
    void loadOptions();
    if (initial) {
      const [hour, minute] = (initial.scheduleTime ?? '09:00').split(':');
      form.reset({
        scheduleName: initial.scheduleName,
        reportId: initial.reportId !== null ? String(initial.reportId) : '',
        reportTemplateId:
          initial.reportTemplateId !== null
            ? String(initial.reportTemplateId)
            : '',
        frequency: FREQUENCIES.includes(initial.frequency)
          ? (initial.frequency as ScheduleFormData['frequency'])
          : '每日',
        dayOfWeek:
          initial.dayOfWeek !== null ? String(initial.dayOfWeek) : '',
        dayOfMonth:
          initial.dayOfMonth !== null ? String(initial.dayOfMonth) : '',
        hour: hour ?? '09',
        minute: minute ?? '00',
        targetType: SCHEDULE_TARGET_TYPES.includes(initial.targetType)
          ? (initial.targetType as ScheduleFormData['targetType'])
          : '飞书群',
        targetId: initial.targetId ?? '',
        targetName: initial.targetName ?? '',
        fileFormat: FILE_FORMATS.includes(initial.fileFormat)
          ? (initial.fileFormat as ScheduleFormData['fileFormat'])
          : 'Excel',
        includeChart: initial.includeChart,
        remark: initial.remark ?? '',
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, initial, form]);

  const frequency = form.watch('frequency');

  const onSubmit = form.handleSubmit(async (data: ScheduleFormData) => {
    setSaving(true);
    try {
      const payload: ScheduledReportCreateInput = {
        scheduleName: data.scheduleName.trim(),
        reportId: data.reportId ? Number(data.reportId) : undefined,
        reportTemplateId: data.reportTemplateId
          ? Number(data.reportTemplateId)
          : undefined,
        frequency: data.frequency,
        scheduleTime: `${data.hour}:${data.minute}`,
        dayOfWeek:
          data.frequency === '每周' ? Number(data.dayOfWeek) : undefined,
        dayOfMonth:
          data.frequency === '每月' ? Number(data.dayOfMonth) : undefined,
        targetType: data.targetType,
        targetId: data.targetId || undefined,
        targetName: data.targetName || undefined,
        fileFormat: data.fileFormat,
        includeChart: data.includeChart,
        remark: data.remark || undefined,
      };
      if (initial) {
        await updateSchedule(initial.id, payload as ScheduledReportUpdateInput);
        toast.success('任务已更新');
      } else {
        await createSchedule(payload);
        toast.success('任务已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      logger.error('保存定时任务失败', error);
      toast.error(toRcErrorText(error));
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑任务' : '新建任务'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="scheduleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>任务名称 *</FormLabel>
                    <FormControl>
                      <Input className="rounded-none" placeholder="请输入任务名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reportId"
                render={({ field }) => (
                  <RcFormSelect
                    label="关联报表"
                    value={field.value}
                    onChange={field.onChange}
                    options={reports.map(
                      (item: CustomReportRecord) => `${item.id}:${item.reportName}`,
                    )}
                    optional
                  />
                )}
              />
              <FormField
                control={form.control}
                name="reportTemplateId"
                render={({ field }) => (
                  <RcFormSelect
                    label="关联模板"
                    value={field.value}
                    onChange={field.onChange}
                    options={templates.map(
                      (item: ReportTemplateRecord) => `${item.id}:${item.templateName}`,
                    )}
                    optional
                  />
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <RcFormSelect
                    label="频率"
                    value={field.value}
                    onChange={field.onChange}
                    options={FREQUENCIES}
                  />
                )}
              />
              {frequency === '每周' ? (
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <RcFormSelect
                      label="星期几"
                      value={field.value}
                      onChange={field.onChange}
                      options={WEEK_DAY_OPTIONS.map((opt) => opt.value)}
                    />
                  )}
                />
              ) : null}
              {frequency === '每月' ? (
                <FormField
                  control={form.control}
                  name="dayOfMonth"
                  render={({ field }) => (
                    <RcFormSelect
                      label="几号"
                      value={field.value}
                      onChange={field.onChange}
                      options={MONTH_DAYS}
                    />
                  )}
                />
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <FormField
                control={form.control}
                name="hour"
                render={({ field }) => (
                  <RcFormSelect label="时" value={field.value} onChange={field.onChange} options={HOURS} />
                )}
              />
              <FormField
                control={form.control}
                name="minute"
                render={({ field }) => (
                  <RcFormSelect label="分" value={field.value} onChange={field.onChange} options={MINUTES} />
                )}
              />
              <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                  <RcFormSelect
                    label="目标类型"
                    value={field.value}
                    onChange={field.onChange}
                    options={SCHEDULE_TARGET_TYPES}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="fileFormat"
                render={({ field }) => (
                  <RcFormSelect
                    label="文件格式"
                    value={field.value}
                    onChange={field.onChange}
                    options={FILE_FORMATS}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="targetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目标 ID</FormLabel>
                    <FormControl>
                      <Input className="rounded-none" placeholder="群 ID / 用户 ID / 邮箱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目标名称</FormLabel>
                    <FormControl>
                      <Input className="rounded-none" placeholder="目标名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="includeChart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>包含图表</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                      <span className="text-sm text-muted-foreground">
                        {field.value ? '包含' : '不包含'}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <RcFormField label="备注">
              <Textarea
                className="rounded-none resize-none"
                rows={2}
                placeholder="选填"
                {...form.register('remark')}
              />
            </RcFormField>

            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-none" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" className="rounded-none" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleFormDialog;
