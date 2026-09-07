import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AdAccount,
  AdAccountListResult,
  CreateAdFilingRequest,
} from '@shared/api.interface';
import { createAdFiling, fetchAdAccounts } from '@client/src/api/ad-business';
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
import { INDUSTRY_OPTIONS, toErrorText } from './ads-constants';

const filingSchema = z.object({
  accountId: z.string().min(1, '请选择关联账户'),
  industry: z.string().min(1, '请选择行业'),
  productName: z.string(),
  filingMaterial: z.string(),
  remark: z.string(),
});

type FilingFormData = z.infer<typeof filingSchema>;

const DEFAULT_VALUES: FilingFormData = {
  accountId: '',
  industry: '互联网',
  productName: '',
  filingMaterial: '',
  remark: '',
};

interface FilingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function FilingFormDialog({
  open,
  onOpenChange,
  onSaved,
}: FilingFormDialogProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState<boolean>(false);

  const form = useForm<FilingFormData>({
    resolver: zodResolver(filingSchema),
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

  const onSubmit = form.handleSubmit(async (data: FilingFormData) => {
    setSubmitting(true);
    try {
      const payload: CreateAdFilingRequest = {
        accountId: data.accountId,
        industry: data.industry,
        productName: data.productName.trim() || undefined,
        filingMaterial: data.filingMaterial.trim() || undefined,
        remark: data.remark.trim() || undefined,
      };
      await createAdFiling(payload);
      toast.success('报备已创建，等待审核');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存报备失败: ${toErrorText(error)}`);
      toast.error(`保存失败：${toErrorText(error)}`);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">新建报备</DialogTitle>
          <DialogDescription>
            选择已开户的广告账户并填写产品信息，提交后将进入审核流程
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
                    关联账户 <span className="text-destructive">*</span>
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
                name="industry"
                render={({ field }) => (
                  <FormItem className="min-w-[220px] flex-1">
                    <FormLabel>
                      行业 <span className="text-destructive">*</span>
                    </FormLabel>
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
                name="productName"
                render={({ field }) => (
                  <FormItem className="min-w-[220px] flex-1">
                    <FormLabel>产品名称</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入产品名称"
                        className="rounded-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="filingMaterial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>材料说明</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="选填，说明报备所需材料"
                      className="rounded-none resize-none"
                      rows={3}
                      {...field}
                    />
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
                    <Textarea
                      placeholder="选填，补充说明报备需求"
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
