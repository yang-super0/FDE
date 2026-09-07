import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type { Customer } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
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
  createContract,
  listCustomerOptions,
  type CreateContractRequest,
} from '@client/src/api/contracts';
import { CONTRACT_TYPE_OPTIONS, formatDate } from './contract-ui';

const createContractSchema = z.object({
  code: z.string().min(1, '请输入合同编号'),
  customerId: z.string().min(1, '请选择关联客户'),
  contractType: z.string().min(1, '请选择合同类型'),
  amount: z.coerce
    .number({ invalid_type_error: '请输入合同金额' })
    .min(0, '金额不能为负数'),
  signDate: z.date({ required_error: '请选择签订日期' }),
  expireDate: z.date({ required_error: '请选择到期日期' }),
  content: z.string().optional(),
});

type CreateContractFormData = z.infer<typeof createContractSchema>;

interface ContractCreateInitial {
  contractType?: string;
  content?: string;
}

interface ContractCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initial?: ContractCreateInitial;
}

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const ContractCreateDialog = ({
  open,
  onOpenChange,
  onCreated,
  initial,
}: ContractCreateDialogProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<CreateContractFormData>({
    resolver: zodResolver(createContractSchema),
    defaultValues: {
      code: '',
      customerId: '',
      contractType: '',
      amount: 0,
      signDate: new Date(),
      expireDate: dayjs().add(1, 'year').toDate(),
      content: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.setValue('contractType', initial?.contractType ?? '');
    form.setValue('content', initial?.content ?? '');
  }, [open, initial, form]);

  const typeOptions: string[] =
    initial?.contractType &&
    !CONTRACT_TYPE_OPTIONS.includes(initial.contractType)
      ? [...CONTRACT_TYPE_OPTIONS, initial.contractType]
      : CONTRACT_TYPE_OPTIONS;

  useEffect(() => {
    if (!open) return;
    let cancelled: boolean = false;
    setCustomersLoading(true);
    listCustomerOptions()
      .then((items: Customer[]) => {
        if (!cancelled) setCustomers(items);
      })
      .catch((error: unknown) => {
        logger.error(`加载客户列表失败: ${toErrorText(error)}`);
        if (!cancelled) toast.error('加载客户列表失败');
      })
      .finally(() => {
        if (!cancelled) setCustomersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = form.handleSubmit(
    async (data: CreateContractFormData) => {
      const request: CreateContractRequest & { content?: string } = {
        code: data.code,
        customerId: data.customerId,
        contractType: data.contractType,
        amount: data.amount,
        signDate: data.signDate.toISOString(),
        expireDate: data.expireDate.toISOString(),
        content: data.content?.trim() || undefined,
      };
      setSubmitting(true);
      try {
        await createContract(request);
        toast.success('合同创建成功');
        form.reset();
        onOpenChange(false);
        onCreated();
      } catch (error: unknown) {
        logger.error(`创建合同失败: ${toErrorText(error)}`);
        toast.error('创建合同失败，请重试');
      } finally {
        setSubmitting(false);
      }
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>新建合同</DialogTitle>
          <DialogDescription>
            填写合同基础信息，提交后进入待审批状态
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      合同编号 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入合同编号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      合同金额（元）{' '}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="请输入金额"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      关联客户 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-none">
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
                            暂无可选客户
                          </div>
                        ) : null}
                        {customers.map((item: Customer) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
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
                name="contractType"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      合同类型 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择合同类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((option: string) => (
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
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="signDate"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      签订日期 <span className="text-destructive">*</span>
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
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value
                              ? formatDate(field.value.toISOString())
                              : '请选择日期'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expireDate"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      到期日期 <span className="text-destructive">*</span>
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
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value
                              ? formatDate(field.value.toISOString())
                              : '请选择日期'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>合同内容（选填）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入合同内容，可由模板自动填充"
                      rows={4}
                      {...field}
                      value={field.value ?? ''}
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

export { ContractCreateDialog };
