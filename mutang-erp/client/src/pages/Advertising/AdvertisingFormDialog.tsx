import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Customer } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
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
import { Input } from '@client/src/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { cn } from '@client/src/lib/utils';
import {
  createCampaign,
  listCustomersForSelect,
  type CreateCampaignPayload,
} from '@client/src/api/advertising';

export const PLATFORM_OPTIONS: string[] = [
  '抖音',
  '微信朋友圈',
  '小红书',
  '快手',
  '百度',
];

const campaignFormSchema = z
  .object({
    name: z.string().min(1, '请输入项目名称'),
    customerId: z.string().min(1, '请选择关联客户'),
    platform: z.string().min(1, '请选择投放平台'),
    budget: z.coerce.number().positive('预算需大于 0'),
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: '结束日期不能早于开始日期',
    path: ['endDate'],
  });

type CampaignFormData = z.infer<typeof campaignFormSchema>;

interface AdvertisingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const DateFieldPicker = ({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <FormControl>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal rounded-none',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? dayjs(value).format('YYYY-MM-DD') : placeholder}
        </Button>
      </FormControl>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" selected={value} onSelect={onChange} />
    </PopoverContent>
  </Popover>
);

const AdvertisingFormDialog = ({
  open,
  onOpenChange,
  onCreated,
}: AdvertisingFormDialogProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      customerId: '',
      platform: '',
      budget: 0,
      startDate: new Date(),
      endDate: dayjs().add(30, 'day').toDate(),
    },
  });

  const loadCustomers = useCallback(async (): Promise<void> => {
    try {
      const result = await listCustomersForSelect();
      setCustomers(result.items ?? []);
    } catch (error) {
      logger.error('加载客户列表失败', error);
      toast.error('客户列表加载失败');
    }
  }, []);

  useEffect(() => {
    if (open) {
      form.reset();
      loadCustomers();
    }
  }, [open, form, loadCustomers]);

  const handleSubmit = form.handleSubmit(async (data: CampaignFormData) => {
    setSubmitting(true);
    try {
      const payload: CreateCampaignPayload = {
        name: data.name,
        customerId: data.customerId,
        platform: data.platform,
        budget: data.budget,
        startDate: dayjs(data.startDate).format('YYYY-MM-DD'),
        endDate: dayjs(data.endDate).format('YYYY-MM-DD'),
      };
      await createCampaign(payload);
      toast.success('投放项目创建成功');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      logger.error('创建投放项目失败', error);
      toast.error('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            新建投放项目
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    项目名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入项目名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      关联客户 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择客户" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((c: Customer) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
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
                name="platform"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      投放平台 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择平台" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((p: string) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    预算（元） <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="请输入投放预算"
                      value={field.value === 0 ? '' : field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      开始日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <DateFieldPicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="请选择开始日期"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      结束日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <DateFieldPicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="请选择结束日期"
                    />
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
              <Button type="submit" disabled={submitting}>
                {submitting ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AdvertisingFormDialog;
