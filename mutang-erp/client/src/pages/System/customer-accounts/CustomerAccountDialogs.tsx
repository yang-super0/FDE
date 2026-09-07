import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  Customer,
  CustomerAccount,
  CustomerAccountCreateDto,
} from '@shared/api.interface';
import { listCustomersForSelect } from '@client/src/api/advertising';
import {
  createCustomerAccount,
  updateCustomerAccount,
} from '@client/src/api/system-enhance/customer-accounts';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { toSystemEnhanceErrorText } from '../system-enhance-shared';

/* ============ 密码强度校验：至少8位，含大小写字母和数字 ============ */

export const isCustomerAccountPasswordValid = (value: string): boolean =>
  value.length >= 8 &&
  /[a-z]/u.test(value) &&
  /[A-Z]/u.test(value) &&
  /\d/u.test(value);

interface CustomerAccountFormState {
  customerId: string;
  username: string;
  password: string;
  phone: string;
  email: string;
  remark: string;
}

const EMPTY_FORM: CustomerAccountFormState = {
  customerId: '',
  username: '',
  password: '',
  phone: '',
  email: '',
  remark: '',
};

interface CustomerAccountFormDialogProps {
  open: boolean;
  target: CustomerAccount | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const CustomerAccountFormDialog = ({
  open,
  target,
  onOpenChange,
  onSaved,
}: CustomerAccountFormDialogProps) => {
  const [form, setForm] = useState<CustomerAccountFormState>(EMPTY_FORM);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLoadFailed, setCustomerLoadFailed] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setCustomerLoadFailed(false);
    if (target) {
      setForm({
        customerId: target.customerId,
        username: target.username,
        password: '',
        phone: target.phone ?? '',
        email: target.email ?? '',
        remark: target.remark ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    listCustomersForSelect()
      .then((result: { items: Customer[] }) => setCustomers(result.items))
      .catch(() => {
        setCustomers([]);
        setCustomerLoadFailed(true);
      });
  }, [open, target]);

  const updateField = (
    key: keyof CustomerAccountFormState,
    value: string,
  ): void => {
    setForm((prev: CustomerAccountFormState) => ({
      ...prev,
      [key]: value,
    }));
  };

  const passwordValid: boolean = isCustomerAccountPasswordValid(
    form.password,
  );

  const handleSubmit = async (): Promise<void> => {
    if (!target) {
      if (!form.customerId.trim()) {
        toast.error('请选择所属客户');
        return;
      }
      if (!form.username.trim()) {
        toast.error('请输入用户名');
        return;
      }
      if (!passwordValid) {
        toast.error('密码需至少8位且包含大小写字母和数字');
        return;
      }
    }
    setSubmitting(true);
    try {
      if (target) {
        await updateCustomerAccount(target.id, {
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          remark: form.remark.trim() || undefined,
        });
        toast.success(`账户「${target.username}」已更新`);
      } else {
        const dto: CustomerAccountCreateDto = {
          customerId: form.customerId,
          username: form.username.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          remark: form.remark.trim() || undefined,
        };
        await createCustomerAccount(dto);
        toast.success(`账户「${dto.username}」已创建`);
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error('保存客户账户失败', String(error));
      toast.error(toSystemEnhanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit: boolean = target !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑客户账户' : '新建客户账户'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {customerLoadFailed ? (
            <div className="col-span-1 space-y-1.5">
              <label className="text-sm font-medium">客户ID</label>
              <Input
                className="rounded-none"
                value={form.customerId}
                disabled={isEdit}
                placeholder="客户加载失败，请输入客户ID"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('customerId', e.target.value)
                }
              />
            </div>
          ) : (
            <div className="col-span-1 space-y-1.5">
              <label className="text-sm font-medium">
                所属客户 {!isEdit ? <span className="text-destructive">*</span> : null}
              </label>
              <Select
                value={form.customerId || undefined}
                disabled={isEdit}
                onValueChange={(value: string) =>
                  updateField('customerId', value)
                }
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="选择客户" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {customers.map((customer: Customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="col-span-1 space-y-1.5">
            <label className="text-sm font-medium">
              用户名 {!isEdit ? <span className="text-destructive">*</span> : null}
            </label>
            <Input
              className="rounded-none"
              value={form.username}
              disabled={isEdit}
              placeholder="登录用户名"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('username', e.target.value)
              }
            />
          </div>
          {!isEdit ? (
            <div className="col-span-1 space-y-1.5">
              <label className="text-sm font-medium">
                密码 <span className="text-destructive">*</span>
              </label>
              <Input
                className="rounded-none"
                type="password"
                value={form.password}
                placeholder="至少8位含大小写字母和数字"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('password', e.target.value)
                }
              />
            </div>
          ) : null}
          <div className="col-span-1 space-y-1.5">
            <label className="text-sm font-medium">手机号</label>
            <Input
              className="rounded-none"
              value={form.phone}
              placeholder="手机号"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('phone', e.target.value)
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">邮箱</label>
            <Input
              className="rounded-none"
              value={form.email}
              placeholder="邮箱"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('email', e.target.value)
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">备注</label>
            <Textarea
              className="rounded-none"
              value={form.remark}
              placeholder="备注"
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateField('remark', e.target.value)
              }
            />
          </div>
          {!isEdit ? (
            <p
              className={`col-span-2 text-xs ${
                form.password && !passwordValid
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              密码强度要求：至少8位且包含大写字母、小写字母和数字
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="rounded-none"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============ 重置密码结果弹窗（一次性展示新密码） ============ */

interface ResetPasswordResultDialogProps {
  open: boolean;
  password: string;
  onOpenChange: (open: boolean) => void;
}

export const ResetPasswordResultDialog = ({
  open,
  password,
  onOpenChange,
}: ResetPasswordResultDialogProps) => {
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('新密码已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动选择复制');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>重置密码成功</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          新密码仅本次展示，请立即复制并妥善保存：
        </p>
        <div className="flex items-center justify-between gap-3 rounded-none border border-border bg-accent px-4 py-3">
          <span className="break-all font-mono text-lg font-bold text-primary">
            {password || '—'}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={() => void handleCopy()}
          >
            <Copy className="h-3.5 w-3.5" />
            复制
          </Button>
        </div>
        <DialogFooter>
          <Button className="rounded-none" onClick={() => onOpenChange(false)}>
            我已保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
