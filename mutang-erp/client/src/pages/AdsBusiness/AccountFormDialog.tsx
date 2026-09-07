import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Control } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import type { AdAccount, CreateAdAccountRequest } from '@shared/api.interface';
import { createAdAccount, updateAdAccount } from '@client/src/api/ad-business';
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
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { cn } from '@client/src/lib/utils';
import { PLATFORM_OPTIONS, PORT_TYPE_OPTIONS, toErrorText } from './ads-constants';

const accountSchema = z.object({
  accountName: z.string().trim().min(1, '请输入账户名称'),
  platform: z.string().min(1, '请选择投放平台'),
  groupName: z.string(),
  subjectName: z.string(),
  portType: z.string(),
  balance: z.coerce.number({ invalid_type_error: '请输入初始余额' }).min(0, '余额不能为负数'),
  remark: z.string(),
});

type AccountFormData = z.infer<typeof accountSchema>;

const DEFAULT_VALUES: AccountFormData = {
  accountName: '',
  platform: '巨量千川',
  groupName: '',
  subjectName: '',
  portType: '内部',
  balance: 0,
  remark: '',
};

interface TextControlProps {
  control: Control<AccountFormData>;
  name: keyof AccountFormData;
  label: string;
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
  type?: string;
}

function TextControl({ control, name, label, required, placeholder, mono, type }: TextControlProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-[200px] flex-1">
          <FormLabel>
            {label} {required ? <span className="text-destructive">*</span> : null}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              className={cn('rounded-none', mono && 'font-mono')}
              {...field}
              value={String(field.value ?? '')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface SelectControlProps {
  control: Control<AccountFormData>;
  name: keyof AccountFormData;
  label: string;
  required?: boolean;
  placeholder: string;
  options: string[];
}

function SelectControl({ control, name, label, required, placeholder, options }: SelectControlProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-[200px] flex-1">
          <FormLabel>
            {label} {required ? <span className="text-destructive">*</span> : null}
          </FormLabel>
          <Select onValueChange={field.onChange} value={String(field.value)}>
            <FormControl>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option: string) => (
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
  );
}

interface AccountFormDialogProps {
  open: boolean;
  editing: AdAccount | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AccountFormDialog({ open, editing, onOpenChange, onSaved }: AccountFormDialogProps) {
  const currentUser = useCurrentUserProfile();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [salesperson, setSalesperson] = useState<string | null>(null);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        accountName: editing.accountName,
        platform: editing.platform,
        groupName: editing.groupName,
        subjectName: editing.subjectName,
        portType: editing.portType,
        balance: editing.balance,
        remark: editing.remark,
      });
      setSalesperson(editing.salesperson || null);
    } else {
      form.reset(DEFAULT_VALUES);
      setSalesperson(currentUser?.user_id ?? null);
    }
  }, [open, editing, currentUser, form]);

  const onSubmit = form.handleSubmit(async (data: AccountFormData) => {
    setSubmitting(true);
    try {
      const payload: CreateAdAccountRequest = {
        accountName: data.accountName,
        platform: data.platform,
        groupName: data.groupName.trim() || undefined,
        subjectName: data.subjectName.trim() || undefined,
        portType: data.portType || undefined,
        balance: data.balance,
        salesperson: salesperson ?? undefined,
        remark: data.remark.trim() || undefined,
      };
      if (editing) {
        await updateAdAccount(editing.id, payload);
        toast.success('广告账户已更新');
      } else {
        await createAdAccount(payload);
        toast.success('广告账户已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存广告账户失败: ${toErrorText(error)}`);
      toast.error(`保存失败：${toErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editing ? '编辑广告账户' : '新增广告账户'}
          </DialogTitle>
          <DialogDescription>
            {editing ? '修改账户信息后保存' : '填写账户信息后保存，商务默认当前登录人'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <TextControl control={form.control} name="accountName" label="账户名称" required placeholder="请输入账户名称" />
              <SelectControl control={form.control} name="platform" label="投放平台" required placeholder="请选择平台" options={PLATFORM_OPTIONS} />
            </div>
            <div className="flex flex-wrap gap-4">
              <TextControl control={form.control} name="groupName" label="集团名称" placeholder="请输入集团名称" />
              <TextControl control={form.control} name="subjectName" label="主体名称" placeholder="请输入主体名称" />
            </div>
            <div className="flex flex-wrap gap-4">
              <SelectControl control={form.control} name="portType" label="端口" placeholder="请选择端口" options={PORT_TYPE_OPTIONS} />
              <TextControl control={form.control} name="balance" label="初始余额" placeholder="0.00" mono type="number" />
              <FormItem className="min-w-[200px] flex-1">
                <FormLabel>商务</FormLabel>
                <UserSelect
                  value={salesperson}
                  onChange={(value: string | null) => setSalesperson(value)}
                  placeholder="请选择商务"
                />
              </FormItem>
            </div>
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="选填，补充说明账户信息"
                      className="rounded-none resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
