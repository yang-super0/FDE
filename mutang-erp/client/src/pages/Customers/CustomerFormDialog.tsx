import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Customer, CustomerStatus } from '@shared/api.interface';
import * as customerApi from '@client/src/api/customers';
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
import { INDUSTRY_OPTIONS, SOURCE_OPTIONS, STATUS_META } from './constants';

const customerSchema = z.object({
  name: z.string().min(1, '请输入客户名称'),
  industry: z.string().min(1, '请选择行业'),
  contactName: z.string().min(1, '请输入联系人'),
  contactPhone: z.string().min(1, '请输入联系电话'),
  source: z.string().min(1, '请选择客户来源'),
  status: z.enum(['potential', 'active', 'churned']),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const DEFAULT_VALUES: CustomerFormData = {
  name: '',
  industry: '',
  contactName: '',
  contactPhone: '',
  source: '',
  status: 'potential',
};

interface CustomerFormDialogProps {
  open: boolean;
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const CustomerFormDialog = ({
  open,
  customer,
  onOpenChange,
  onSaved,
}: CustomerFormDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        customer
          ? {
              name: customer.name,
              industry: customer.industry,
              contactName: customer.contactName,
              contactPhone: customer.contactPhone,
              source: customer.source,
              status: customer.status,
            }
          : DEFAULT_VALUES,
      );
    }
  }, [open, customer, form]);

  const handleSubmit = form.handleSubmit(async (data: CustomerFormData) => {
    setSubmitting(true);
    try {
      const payload: customerApi.CustomerPayload = {
        name: data.name,
        industry: data.industry,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        source: data.source,
        status: data.status,
      };
      if (customer) {
        await customerApi.updateCustomer(customer.id, payload);
        toast.success('客户已更新');
      } else {
        await customerApi.createCustomer(payload);
        toast.success('客户已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      logger.error(`保存客户失败: ${message}`);
      toast.error('保存客户失败');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? '编辑客户' : '新建客户'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      客户名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入客户名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      行业 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择行业" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      联系人 <span className="text-destructive">*</span>
                    </FormLabel>
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
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      联系电话 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入联系电话" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      客户来源 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择客户来源" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((option: string) => (
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
                name="status"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>
                      状态 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(value: string) =>
                        field.onChange(value as CustomerStatus)
                      }
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.keys(STATUS_META) as CustomerStatus[]
                        ).map((key: CustomerStatus) => (
                          <SelectItem key={key} value={key}>
                            {STATUS_META[key].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { CustomerFormDialog };
export type { CustomerFormDialogProps };
