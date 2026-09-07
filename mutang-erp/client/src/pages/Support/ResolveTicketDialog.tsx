import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Ticket } from '@shared/api.interface';
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
import { Textarea } from '@client/src/components/ui/textarea';
import { updateTicket } from '@client/src/api/support';

const resolveSchema = z.object({
  resolution: z.string().min(1, '请填写处理结果'),
});

type ResolveFormData = z.infer<typeof resolveSchema>;

interface ResolveTicketDialogProps {
  ticket: Ticket | null;
  onClose: () => void;
  onResolved: () => void;
}

const ResolveTicketDialog = ({
  ticket,
  onClose,
  onResolved,
}: ResolveTicketDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<ResolveFormData>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { resolution: '' },
  });

  useEffect(() => {
    form.reset({ resolution: '' });
  }, [ticket?.id, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!ticket) {
      return;
    }
    setSubmitting(true);
    try {
      await updateTicket(ticket.id, {
        status: 'resolved',
        resolution: data.resolution,
      });
      toast.success('工单已解决');
      onResolved();
    } catch (error) {
      logger.error('解决工单失败', error);
      toast.error('解决工单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={ticket !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>填写结果并解决</DialogTitle>
          <DialogDescription>
            {ticket ? `工单：${ticket.title}` : ''}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    处理结果 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="请填写问题的处理过程与结果"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '确认解决'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { ResolveTicketDialog };
export type { ResolveTicketDialogProps };
