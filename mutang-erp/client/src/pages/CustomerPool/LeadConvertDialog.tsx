import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
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
import type {
  AbandonLeadRequest,
  ConvertLeadRequest,
  Lead,
} from '@shared/api.interface';
import { abandonLead, convertLead } from '@client/src/api/customer-pool';
import { FILTER_ALL, INDUSTRY_OPTIONS, toErrorText } from './constants';

const convertFormSchema = z.object({
  customerName: z.string().min(1, '客户名称不能为空'),
  industry: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
});

type ConvertFormData = z.infer<typeof convertFormSchema>;

interface LeadConvertDialogProps {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function LeadConvertDialog({
  lead,
  onOpenChange,
  onSaved,
}: LeadConvertDialogProps) {
  const form = useForm<ConvertFormData>({
    resolver: zodResolver(convertFormSchema),
    defaultValues: {
      customerName: '',
      industry: FILTER_ALL,
      contactName: '',
      contactPhone: '',
    },
  });

  useEffect(() => {
    if (!lead) return;
    form.reset({
      customerName: lead.leadName,
      industry: lead.industry || FILTER_ALL,
      contactName: lead.contactPerson,
      contactPhone: lead.contactPhone,
    });
  }, [lead, form]);

  const industryOptions: string[] = useMemo(() => {
    if (lead && lead.industry && !INDUSTRY_OPTIONS.includes(lead.industry)) {
      return [...INDUSTRY_OPTIONS, lead.industry];
    }
    return INDUSTRY_OPTIONS;
  }, [lead]);

  const handleSubmit = form.handleSubmit(async (data: ConvertFormData) => {
    if (!lead) return;
    try {
      const payload: ConvertLeadRequest = {
        customerName: data.customerName,
        industry: data.industry === FILTER_ALL ? undefined : data.industry,
        contactName: data.contactName || undefined,
        contactPhone: data.contactPhone || undefined,
      };
      await convertLead(lead.id, payload);
      toast.success('线索已成功转化为客户');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      const message: string = toErrorText(error);
      logger.error(`线索转化失败: ${message}`);
      toast.error(`转化失败：${message}`);
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
          <DialogTitle>线索转化</DialogTitle>
          <DialogDescription>
            将线索「{lead?.leadName}」转化为正式客户
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    客户名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input className="rounded-none" placeholder="请输入客户名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>行业</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="请选择行业" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={FILTER_ALL}>未设置</SelectItem>
                      {industryOptions.map((option: string) => (
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系人</FormLabel>
                    <FormControl>
                      <Input className="rounded-none" placeholder="请输入联系人" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系电话</FormLabel>
                    <FormControl>
                      <Input className="rounded-none" placeholder="请输入联系电话" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" data-ai-section-type="button">
                确认转化
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface AbandonLeadDialogProps {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AbandonLeadDialog({
  lead,
  onOpenChange,
  onSaved,
}: AbandonLeadDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (): Promise<void> => {
    if (!lead) return;
    if (!reason.trim()) {
      toast.error('请填写放弃原因');
      return;
    }
    setSubmitting(true);
    try {
      const payload: AbandonLeadRequest = { reason: reason.trim() };
      await abandonLead(lead.id, payload);
      toast.success('线索已放弃');
      setReason('');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      const message: string = toErrorText(error);
      logger.error(`放弃线索失败: ${message}`);
      toast.error(`放弃失败：${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog
      open={lead !== null}
      onOpenChange={(open: boolean) => {
        if (!open) {
          setReason('');
          onOpenChange(false);
        }
      }}
    >
      <AlertDialogContent className="rounded-none">
        <AlertDialogHeader>
          <AlertDialogTitle>确认放弃线索？</AlertDialogTitle>
          <AlertDialogDescription>
            即将放弃线索「{lead?.leadName}」，放弃后不可恢复，请填写放弃原因。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          className="rounded-none"
          placeholder="请输入放弃原因"
          value={reason}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '提交中...' : '确认放弃'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
