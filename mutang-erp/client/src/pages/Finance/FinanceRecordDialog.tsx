import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { FinanceRecord } from '@shared/api.interface';
import {
  createFinanceRecord,
  updateFinanceRecord,
  type FinanceRecordPayload,
} from '@client/src/api/finance';
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
import { Textarea } from '@client/src/components/ui/textarea';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { cn } from '@client/src/lib/utils';

const recordSchema = z.object({
  recordType: z.enum(['income', 'expense']),
  relatedType: z.enum(['contract', 'campaign', 'other']),
  relatedName: z.string().trim().min(1, '请输入关联名称'),
  amount: z.coerce
    .number({ invalid_type_error: '请输入金额' })
    .positive('金额必须大于 0'),
  recordDate: z.string().min(1, '请选择日期'),
  remark: z.string(),
});

type FinanceRecordFormData = z.infer<typeof recordSchema>;

interface FinanceRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FinanceRecord | null;
  onSubmitted: () => void;
}

const defaultValues: FinanceRecordFormData = {
  recordType: 'income',
  relatedType: 'contract',
  relatedName: '',
  amount: 0,
  recordDate: dayjs().format('YYYY-MM-DD'),
  remark: '',
};

const FinanceRecordDialog = ({
  open,
  onOpenChange,
  editing,
  onSubmitted,
}: FinanceRecordDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<FinanceRecordFormData>({
    resolver: zodResolver(recordSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (editing) {
      form.reset({
        recordType: editing.recordType,
        relatedType: editing.relatedType,
        relatedName: editing.relatedName,
        amount: editing.amount,
        recordDate: editing.recordDate,
        remark: editing.remark,
      });
    } else {
      form.reset(defaultValues);
    }
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (data: FinanceRecordFormData) => {
    setSubmitting(true);
    try {
      const payload: FinanceRecordPayload = {
        recordType: data.recordType,
        relatedType: data.relatedType,
        relatedName: data.relatedName,
        amount: data.amount,
        recordDate: data.recordDate,
        remark: data.remark,
      };
      if (editing) {
        await updateFinanceRecord(editing.id, payload);
        toast.success('收支记录已更新');
      } else {
        await createFinanceRecord(payload);
        toast.success('收支记录已创建');
      }
      onOpenChange(false);
      onSubmitted();
    } catch (error) {
      logger.error('保存收支记录失败', error);
      toast.error('保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editing ? '编辑收支记录' : '新建收支记录'}
          </DialogTitle>
          <DialogDescription>
            {editing ? '修改后保存，将同步更新汇总与趋势数据' : '填写收支信息后保存，将同步更新汇总与趋势数据'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="recordType"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      类型 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">收入</SelectItem>
                        <SelectItem value="expense">支出</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="relatedType"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      关联类型 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择关联类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="contract">合同</SelectItem>
                        <SelectItem value="campaign">投放项目</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="relatedName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    关联名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入关联对象名称"
                      className="rounded-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      金额 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="请输入金额"
                        className="rounded-none font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recordDate"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full justify-start rounded-none text-left font-normal',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? dayjs(field.value).format('YYYY-MM-DD')
                              : '请选择日期'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto rounded-none p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          defaultMonth={field.value ? new Date(field.value) : undefined}
                          onSelect={(date: Date | undefined) =>
                            field.onChange(date ? date.toISOString() : '')
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="选填，补充说明该笔收支"
                      className="rounded-none resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" className="rounded-none" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { FinanceRecordDialog };
