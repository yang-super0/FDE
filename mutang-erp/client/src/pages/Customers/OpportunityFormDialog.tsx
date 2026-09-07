import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import type { Customer, OpportunityStage } from '@shared/api.interface';
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
import { Input } from '@client/src/components/ui/input';
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
import { STAGE_COLUMNS } from './constants';

const opportunitySchema = z.object({
  name: z.string().min(1, '请输入商机名称'),
  customerId: z.string().min(1, '请选择客户'),
  stage: z.enum(['contact', 'requirement', 'quotation', 'closed']),
  amount: z.coerce.number().min(0, '请输入有效金额（不小于 0）'),
  expectedCloseAt: z.string().optional(),
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

const DEFAULT_VALUES: OpportunityFormData = {
  name: '',
  customerId: '',
  stage: 'contact',
  amount: 0,
  expectedCloseAt: '',
};

interface OpportunityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const OpportunityFormDialog = ({
  open,
  onOpenChange,
  onCreated,
}: OpportunityFormDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState<boolean>(false);
  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(DEFAULT_VALUES);
    setCustomersLoading(true);
    customerApi
      .fetchCustomers({ page: 1, pageSize: 100 })
      .then((result) => {
        setCustomers(result.items);
      })
      .catch((error: unknown) => {
        const message: string =
          error instanceof Error ? error.message : String(error);
        logger.error(`加载客户列表失败: ${message}`);
        toast.error('加载客户列表失败');
      })
      .finally(() => {
        setCustomersLoading(false);
      });
  }, [open, form]);

  const handleSubmit = form.handleSubmit(
    async (data: OpportunityFormData) => {
      setSubmitting(true);
      try {
        const payload: customerApi.CreateOpportunityPayload = {
          name: data.name,
          customerId: data.customerId,
          stage: data.stage,
          amount: data.amount,
        };
        if (data.expectedCloseAt) {
          payload.expectedCloseAt = data.expectedCloseAt;
        }
        await customerApi.createOpportunity(payload);
        toast.success('商机已创建');
        onOpenChange(false);
        onCreated();
      } catch (error) {
        const message: string =
          error instanceof Error ? error.message : String(error);
        logger.error(`创建商机失败: ${message}`);
        toast.error('创建商机失败');
      } finally {
        setSubmitting(false);
      }
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建商机</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    商机名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入商机名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    关联客户 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            customersLoading ? '加载中...' : '请选择客户'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.length === 0 && !customersLoading ? (
                        <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                          暂无客户，请先创建客户
                        </div>
                      ) : (
                        customers.map((item: Customer) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[180px]">
                    <FormLabel>
                      阶段 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(value: string) =>
                        field.onChange(value as OpportunityStage)
                      }
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择阶段" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAGE_COLUMNS.map((column) => (
                          <SelectItem key={column.value} value={column.value}>
                            {column.label}
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
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[180px]">
                    <FormLabel>
                      预计金额 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="请输入预计金额"
                        value={
                          Number.isNaN(field.value) ? '' : String(field.value)
                        }
                        onChange={(event) =>
                          field.onChange(event.target.value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="expectedCloseAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>预计成交时间（可选）</FormLabel>
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

export { OpportunityFormDialog };
export type { OpportunityFormDialogProps };
