import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import {
  createTicket,
  type CreateTicketPayload,
} from '@client/src/api/support';
import { TICKET_CATEGORIES } from './support-constants';

const submitTicketSchema = z.object({
  category: z.string().min(1, '请选择问题分类'),
  title: z.string().min(1, '请输入工单标题'),
  description: z.string().min(1, '请输入问题描述'),
});

type SubmitTicketFormData = z.infer<typeof submitTicketSchema>;

interface SubmitTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

const SubmitTicketDialog = ({
  open,
  onOpenChange,
  onSubmitted,
}: SubmitTicketDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<SubmitTicketFormData>({
    resolver: zodResolver(submitTicketSchema),
    defaultValues: { category: '', title: '', description: '' },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      const payload: CreateTicketPayload = {
        category: data.category,
        title: data.title,
        description: data.description,
      };
      await createTicket(payload);
      toast.success('工单提交成功');
      form.reset();
      onOpenChange(false);
      onSubmitted();
    } catch (error) {
      logger.error('提交工单失败', error);
      toast.error('提交工单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>提交工单</DialogTitle>
          <DialogDescription>
            描述你遇到的问题，支持团队将尽快跟进处理
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    问题分类 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择问题分类" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TICKET_CATEGORIES.map((category: string) => (
                        <SelectItem key={category} value={category}>
                          {category}
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    标题 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入工单标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    描述 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="请详细描述问题现象、发生场景等信息"
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
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '提交'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { SubmitTicketDialog };
export type { SubmitTicketDialogProps };
