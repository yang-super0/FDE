import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AdAccount,
  AdAccountListResult,
  CreateAdTransferRequest,
} from '@shared/api.interface';
import { createAdTransfer, fetchAdAccounts } from '@client/src/api/ad-business';
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
import { PORT_TYPE_OPTIONS, toErrorText } from './ads-constants';

const transferSchema = z.object({
  accountId: z.string().min(1, '请选择转户账户'),
  toSubject: z.string().min(1, '请输入目标主体'),
  toPort: z.string().min(1, '请选择目标端口'),
  transferReason: z.string(),
});

type TransferFormData = z.infer<typeof transferSchema>;

const DEFAULT_VALUES: TransferFormData = {
  accountId: '',
  toSubject: '',
  toPort: '',
  transferReason: '',
};

interface TransferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function TransferFormDialog({
  open,
  onOpenChange,
  onSaved,
}: TransferFormDialogProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState<boolean>(false);

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(DEFAULT_VALUES);
    let cancelled: boolean = false;
    setAccountsLoading(true);
    fetchAdAccounts({ page: 1, pageSize: 1000 })
      .then((result: AdAccountListResult) => {
        if (!cancelled) setAccounts(result.items);
      })
      .catch((error: unknown) => {
        logger.error(`加载广告账户失败: ${toErrorText(error)}`);
        if (!cancelled) toast.error('加载广告账户失败');
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (data: TransferFormData) => {
    setSubmitting(true);
    try {
      const payload: CreateAdTransferRequest = {
        accountId: data.accountId,
        toSubject: data.toSubject.trim(),
        toPort: data.toPort,
        transferReason: data.transferReason.trim() || undefined,
      };
      await createAdTransfer(payload);
      toast.success('转户申请已创建，等待审批');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存转户申请失败: ${toErrorText(error)}`);
      toast.error(`保存失败：${toErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">新建转户</DialogTitle>
          <DialogDescription>
            选择需要转户的广告账户并填写目标主体与端口，审批通过后将同步更新广告账户的主体与端口
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    转户账户 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    disabled={accountsLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-none">
                        <SelectValue
                          placeholder={
                            accountsLoading ? '加载中...' : '请选择广告账户'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account: AdAccount) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName}（{account.accountNo}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="toSubject"
                render={({ field }) => (
                  <FormItem className="min-w-[220px] flex-1">
                    <FormLabel>
                      目标主体 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入目标主体名称"
                        className="rounded-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toPort"
                render={({ field }) => (
                  <FormItem className="min-w-[220px] flex-1">
                    <FormLabel>
                      目标端口 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择目标端口" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PORT_TYPE_OPTIONS.map((option: string) => (
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
            <FormField
              control={form.control}
              name="transferReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>转户原因</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="选填，说明转户原因"
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
