import { useEffect } from 'react';
import dayjs from 'dayjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
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
  CreatePoolLeadRequest,
  PoolLead,
  UpdatePoolLeadRequest,
} from '@shared/api.interface';
import { createPoolLead, updatePoolLead } from '@client/src/api/customer-pool';
import {
  FILTER_ALL,
  INDUSTRY_OPTIONS,
  POOL_LEVEL_OPTIONS,
  PoolStatusBadge,
  toErrorText,
} from './constants';

const poolFormSchema = z.object({
  subjectName: z.string().min(1, '主体名称不能为空'),
  leadLevel: z.string(),
  industry1: z.string(),
  industry2: z.string(),
  contactPerson: z.string(),
  contactPhone: z.string(),
  remark: z.string(),
});

type PoolFormData = z.infer<typeof poolFormSchema>;

interface PoolLeadFormDialogProps {
  open: boolean;
  lead: PoolLead | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function PoolLeadFormDialog({
  open,
  lead,
  onOpenChange,
  onSaved,
}: PoolLeadFormDialogProps) {
  const form = useForm<PoolFormData>({
    resolver: zodResolver(poolFormSchema),
    defaultValues: {
      subjectName: '',
      leadLevel: FILTER_ALL,
      industry1: FILTER_ALL,
      industry2: '',
      contactPerson: '',
      contactPhone: '',
      remark: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      subjectName: lead?.subjectName ?? '',
      leadLevel: lead?.leadLevel || FILTER_ALL,
      industry1: lead?.industry1 || FILTER_ALL,
      industry2: lead?.industry2 ?? '',
      contactPerson: lead?.contactPerson ?? '',
      contactPhone: lead?.contactPhone ?? '',
      remark: lead?.remark ?? '',
    });
  }, [open, lead, form]);

  const handleSubmit = form.handleSubmit(async (data: PoolFormData) => {
    try {
      if (lead) {
        const payload: UpdatePoolLeadRequest = {
          subjectName: data.subjectName,
          leadLevel: data.leadLevel === FILTER_ALL ? '' : data.leadLevel,
          industry1: data.industry1 === FILTER_ALL ? '' : data.industry1,
          industry2: data.industry2,
          contactPerson: data.contactPerson,
          contactPhone: data.contactPhone,
          remark: data.remark,
        };
        await updatePoolLead(lead.id, payload);
        toast.success('客资已更新');
      } else {
        const payload: CreatePoolLeadRequest = {
          subjectName: data.subjectName,
          leadLevel: data.leadLevel === FILTER_ALL ? undefined : data.leadLevel,
          industry1: data.industry1 === FILTER_ALL ? undefined : data.industry1,
          industry2: data.industry2 || undefined,
          contactPerson: data.contactPerson || undefined,
          contactPhone: data.contactPhone || undefined,
          remark: data.remark || undefined,
        };
        await createPoolLead(payload);
        toast.success('客资已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      const message: string = toErrorText(error);
      logger.error(`保存公海客资失败: ${message}`);
      toast.error(`保存失败：${message}`);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{lead ? '编辑客资' : '新建客资'}</DialogTitle>
          <DialogDescription>
            {lead ? '修改公海客资基础信息' : '录入新的公海客资信息'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="subjectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    主体名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入主体名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leadLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>客资分层</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择分层" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={FILTER_ALL}>未设置</SelectItem>
                        {POOL_LEVEL_OPTIONS.map((option: string) => (
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
                name="industry1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>一级行业</FormLabel>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="industry2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>二级行业</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入二级行业" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>
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

interface PoolLeadDetailDialogProps {
  lead: PoolLead | null;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-sm font-medium break-words">
        {value || '-'}
      </span>
    </div>
  );
}

export function PoolLeadDetailDialog({
  lead,
  onOpenChange,
}: PoolLeadDetailDialogProps) {
  return (
    <Dialog
      open={lead !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="rounded-none sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>客资详情</DialogTitle>
          <DialogDescription>{lead?.subjectName}</DialogDescription>
        </DialogHeader>
        {lead ? (
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">分配状态</span>
              <PoolStatusBadge status={lead.status} />
            </div>
            <DetailRow label="客资分层" value={lead.leadLevel} />
            <DetailRow label="一级行业" value={lead.industry1} />
            <DetailRow label="二级行业" value={lead.industry2} />
            <DetailRow label="联系人" value={lead.contactPerson} />
            <DetailRow label="联系电话" value={lead.contactPhone} />
            <DetailRow
              label="调入时间"
              value={dayjs(lead.createdAt).format('YYYY-MM-DD HH:mm')}
            />
            <DetailRow
              label="分配时间"
              value={
                lead.assignedAt
                  ? dayjs(lead.assignedAt).format('YYYY-MM-DD HH:mm')
                  : ''
              }
            />
            <DetailRow label="备注" value={lead.remark} />
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-xs text-muted-foreground">分配给</span>
              {lead.assignedTo ? (
                <UserDisplay value={[lead.assignedTo]} size="small" />
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-xs text-muted-foreground">创建人</span>
              {lead.createdBy ? (
                <UserDisplay value={[lead.createdBy]} size="small" />
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
