import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import * as customerApi from '@client/src/api/customers';
import { cn } from '@client/src/lib/utils';
import {
  Dialog,
  DialogContent,
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
import { FOLLOW_METHOD_OPTIONS } from './constants';

const followSchema = z.object({
  method: z.string().min(1, '请选择跟进方式'),
  content: z.string().min(1, '请输入跟进内容'),
  nextFollowAt: z.string().optional(),
});

type FollowFormData = z.infer<typeof followSchema>;

const DEFAULT_VALUES: FollowFormData = {
  method: '',
  content: '',
  nextFollowAt: '',
};

interface FollowRecordDialogProps {
  open: boolean;
  customerId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const FollowRecordDialog = ({
  open,
  customerId,
  onOpenChange,
  onCreated,
}: FollowRecordDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const form = useForm<FollowFormData>({
    resolver: zodResolver(followSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (data: FollowFormData) => {
    setSubmitting(true);
    try {
      const payload: customerApi.CreateFollowRecordPayload = {
        method: data.method,
        content: data.content,
      };
      if (data.nextFollowAt) {
        payload.nextFollowAt = data.nextFollowAt;
      }
      await customerApi.createFollowRecord(customerId, payload);
      toast.success('跟进记录已添加');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      logger.error(`添加跟进记录失败: ${message}`);
      toast.error('添加跟进记录失败');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加跟进</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    跟进方式 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择跟进方式" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FOLLOW_METHOD_OPTIONS.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    跟进内容 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="请输入跟进内容"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextFollowAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>下次跟进时间（可选）</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal rounded-none',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value
                            ? dayjs(field.value).format('YYYY-MM-DD')
                            : '选择日期'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '提交'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { FollowRecordDialog };
export type { FollowRecordDialogProps };
