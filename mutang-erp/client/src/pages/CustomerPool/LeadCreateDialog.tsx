import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { UserSelect } from '@client/src/components/business-ui/user-select';
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
import type { CreateLeadRequest } from '@shared/api.interface';
import { createLead } from '@client/src/api/customer-pool';
import {
  FILTER_ALL,
  INDUSTRY_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  toErrorText,
} from './constants';

const leadFormSchema = z.object({
  leadName: z.string().min(1, '线索名称不能为空'),
  contactPerson: z.string(),
  contactPhone: z.string(),
  industry: z.string(),
  source: z.string(),
  remark: z.string(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function LeadCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: LeadCreateDialogProps) {
  const currentUser = useCurrentUserProfile();
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      leadName: '',
      contactPerson: '',
      contactPhone: '',
      industry: FILTER_ALL,
      source: FILTER_ALL,
      remark: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      leadName: '',
      contactPerson: '',
      contactPhone: '',
      industry: FILTER_ALL,
      source: FILTER_ALL,
      remark: '',
    });
    setOwnerId(currentUser?.user_id ?? null);
  }, [open, currentUser, form]);

  const handleSubmit = form.handleSubmit(async (data: LeadFormData) => {
    try {
      const payload: CreateLeadRequest = {
        leadName: data.leadName,
        contactPerson: data.contactPerson || undefined,
        contactPhone: data.contactPhone || undefined,
        industry: data.industry === FILTER_ALL ? undefined : data.industry,
        source: data.source === FILTER_ALL ? undefined : data.source,
        owner: ownerId ?? undefined,
        remark: data.remark || undefined,
      };
      await createLead(payload);
      toast.success('线索已创建');
      onOpenChange(false);
      onCreated();
    } catch (error: unknown) {
      const message: string = toErrorText(error);
      logger.error(`创建线索失败: ${message}`);
      toast.error(`创建失败：${message}`);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>新建线索</DialogTitle>
          <DialogDescription>录入新的销售线索信息</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="leadName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    线索名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入线索名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系人</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入联系人" {...field} />
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
                      <Input placeholder="请输入联系电话" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>行业</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择行业" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={FILTER_ALL}>未设置</SelectItem>
                        {INDUSTRY_OPTIONS.map((option: string) => (
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
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>来源</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择来源" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={FILTER_ALL}>未设置</SelectItem>
                        {LEAD_SOURCE_OPTIONS.map((option: string) => (
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
            </div>
            <FormItem>
              <FormLabel>负责人</FormLabel>
              <UserSelect
                value={ownerId}
                onChange={(value: string | null) => setOwnerId(value)}
                placeholder="请选择负责人"
              />
            </FormItem>
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea placeholder="请输入备注" {...field} />
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
