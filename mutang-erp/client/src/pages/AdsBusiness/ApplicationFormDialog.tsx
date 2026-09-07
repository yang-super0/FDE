import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AdApplication,
  CreateAdApplicationRequest,
} from '@shared/api.interface';
import {
  createAdApplication,
  updateAdApplication,
} from '@client/src/api/ad-business';
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
import {
  ACCOUNT_TYPE_OPTIONS,
  PLATFORM_OPTIONS,
  PORT_TYPE_OPTIONS,
  toErrorText,
} from './ads-constants';

const applicationSchema = z.object({
  groupName: z.string().trim().min(1, '请输入集团名称'),
  subjectName: z.string().trim().min(1, '请输入主体名称'),
  platform: z.string().min(1, '请选择投放平台'),
  portType: z.string().min(1, '请选择端口'),
  accountType: z.string().min(1, '请选择账户类型'),
  remark: z.string(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

const DEFAULT_VALUES: ApplicationFormData = {
  groupName: '',
  subjectName: '',
  platform: '巨量千川',
  portType: '内部',
  accountType: '普通户',
  remark: '',
};

interface ApplicationFormDialogProps {
  open: boolean;
  editing: AdApplication | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ApplicationFormDialog({
  open,
  editing,
  onOpenChange,
  onSaved,
}: ApplicationFormDialogProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        groupName: editing.groupName,
        subjectName: editing.subjectName,
        platform: editing.platform,
        portType: editing.portType,
        accountType: editing.accountType,
        remark: editing.remark,
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (data: ApplicationFormData) => {
    setSubmitting(true);
    try {
      const payload: CreateAdApplicationRequest = {
        groupName: data.groupName,
        subjectName: data.subjectName,
        platform: data.platform,
        portType: data.portType,
        accountType: data.accountType,
        remark: data.remark || undefined,
      };
      if (editing) {
        await updateAdApplication(editing.id, payload);
        toast.success('开户申请已更新');
      } else {
        await createAdApplication(payload);
        toast.success('开户申请已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存开户申请失败: ${toErrorText(error)}`);
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
            {editing ? '编辑开户申请' : '新建开户申请'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? '修改申请信息后保存，仅待审批状态的申请可编辑'
              : '填写开户信息后提交，申请将进入审批流程'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="groupName"
                render={({ field }) => (
                  <FormItem className="min-w-[220px] flex-1">
                    <FormLabel>
                      集团名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入集团名称"
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
                name="subjectName"
                render={({ field }) => (
                  <FormItem className="min-w-[220px] flex-1">
                    <FormLabel>
                      主体名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入主体名称"
                        className="rounded-none"
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
                name="platform"
                render={({ field }) => (
                  <FormItem className="min-w-[140px] flex-1">
                    <FormLabel>
                      投放平台 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择平台" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((option: string) => (
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
                name="portType"
                render={({ field }) => (
                  <FormItem className="min-w-[140px] flex-1">
                    <FormLabel>端口</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择端口" />
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
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem className="min-w-[140px] flex-1">
                    <FormLabel>账户类型</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="请选择类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACCOUNT_TYPE_OPTIONS.map((option: string) => (
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
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="选填，补充说明开户需求"
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
