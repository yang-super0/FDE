import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
import { Textarea } from '@client/src/components/ui/textarea';
import type { AddFollowUpRequest, Lead } from '@shared/api.interface';
import { addLeadFollowUp } from '@client/src/api/customer-pool';
import { DatePickerButton } from './DatePickerButton';
import { FOLLOW_UP_TYPE_OPTIONS, toErrorText } from './constants';

const followUpFormSchema = z.object({
  followUpType: z.string(),
  content: z.string().min(1, '跟进内容不能为空'),
  nextAction: z.string(),
});

type FollowUpFormData = z.infer<typeof followUpFormSchema>;

interface LeadFollowUpDialogProps {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function LeadFollowUpDialog({
  lead,
  onOpenChange,
  onSaved,
}: LeadFollowUpDialogProps) {
  const [nextFollowUpAt, setNextFollowUpAt] = useState<Date | undefined>(
    undefined,
  );

  const form = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpFormSchema),
    defaultValues: {
      followUpType: FOLLOW_UP_TYPE_OPTIONS[0],
      content: '',
      nextAction: '',
    },
  });

  useEffect(() => {
    if (!lead) return;
    form.reset({
      followUpType: FOLLOW_UP_TYPE_OPTIONS[0],
      content: '',
      nextAction: '',
    });
    setNextFollowUpAt(dayjs().add(1, 'day').startOf('day').toDate());
  }, [lead, form]);

  const handleSubmit = form.handleSubmit(async (data: FollowUpFormData) => {
    if (!lead) return;
    try {
      const payload: AddFollowUpRequest = {
        followUpType: data.followUpType,
        content: data.content,
        followUpAt: new Date().toISOString(),
        nextAction: data.nextAction || undefined,
        nextFollowUpAt: nextFollowUpAt
          ? dayjs(nextFollowUpAt).toISOString()
          : undefined,
      };
      await addLeadFollowUp(lead.id, payload);
      toast.success('跟进记录已添加');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      const message: string = toErrorText(error);
      logger.error(`添加跟进记录失败: ${message}`);
      toast.error(`跟进失败：${message}`);
    }
  });

  return (
    <Dialog
      open={lead !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>添加跟进记录</DialogTitle>
          <DialogDescription>
            为线索「{lead?.leadName}」记录本次跟进情况
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="followUpType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>跟进方式</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="请选择跟进方式" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FOLLOW_UP_TYPE_OPTIONS.map((option: string) => (
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
                      placeholder="请输入跟进内容"
                      className="rounded-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>下一步行动</FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-none"
                      placeholder="请输入下一步行动"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>下次跟进时间</FormLabel>
              <DatePickerButton
                value={nextFollowUpAt}
                onChange={(date: Date | undefined) => setNextFollowUpAt(date)}
                placeholder="选择日期"
              />
            </FormItem>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" data-ai-section-type="button">
                保存
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
