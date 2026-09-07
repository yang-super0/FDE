import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { cn } from '@client/src/lib/utils';
import type { Customer, PageResult } from '@shared/api.interface';
import { fetchCustomers } from '@client/src/api/customers';
import {
  fetchFinanceAccountsOptions, type FinanceAccountOption,
} from '@client/src/api/finance-enhance/funds';
import { FINANCE_FILTER_ALL } from '../finance-constants';

/* ============ 常量 ============ */

export const FUNDS_PAGE_SIZE: number = 10;
export const FUNDS_EXPORT_LIMIT: number = 100;

export const FUNDS_TRANSACTION_TYPE_OPTIONS: string[] = [
  '充值', '消耗', '退款', '返点', '扣减', '调账',
];

export const FUNDS_RECHARGE_STATUS_OPTIONS: string[] = [
  '待确认', '已确认', '已取消',
];

export const FUNDS_REFUND_STATUS_OPTIONS: string[] = [
  '待审批', '已通过', '已驳回', '已退款',
];

export const FUNDS_COIN_STATUS_OPTIONS: string[] = [
  '待处理', '处理中', '已完成', '失败',
];

export const FUNDS_ENABLE_STATUS_OPTIONS: string[] = ['启用', '停用'];

export const FUNDS_PAYMENT_METHOD_OPTIONS: string[] = [
  '对公转账', '支付宝', '微信', '现金', '其他',
];

export const FUNDS_PLATFORM_OPTIONS: string[] = ['巨量千川', '其他'];

export const FUNDS_PORT_TYPE_OPTIONS: string[] = ['内部端口', '外部端口', '集团'];

export const FUNDS_ACCOUNT_TYPE_OPTIONS: string[] = ['基本户', '一般户', '专用户'];

/* ============ 状态徽章：零圆角 + 语义浅底文字色 ============ */

const FUNDS_BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

const FUNDS_BADGE_CLASS: Record<string, string> = {
  待确认: 'bg-[#FFF7ED] text-[#F97316]',
  已确认: 'bg-[#ECFDF5] text-[#10B981]',
  已取消: 'bg-[#FEF2F2] text-[#EF4444]',
  待审批: 'bg-[#FFF7ED] text-[#F97316]',
  已通过: 'bg-[#EFF6FF] text-[#0033A0]',
  已驳回: 'bg-[#FEF2F2] text-[#EF4444]',
  已退款: 'bg-[#ECFDF5] text-[#10B981]',
  待处理: 'bg-[#FFF7ED] text-[#F97316]',
  处理中: 'bg-[#EFF6FF] text-[#0033A0]',
  已完成: 'bg-[#ECFDF5] text-[#10B981]',
  失败: 'bg-[#FEF2F2] text-[#EF4444]',
  启用: 'bg-[#ECFDF5] text-[#10B981]',
  停用: 'bg-slate-100 text-slate-500',
  充值: 'bg-[#EFF6FF] text-[#0033A0]',
  消耗: 'bg-slate-100 text-slate-500',
  退款: 'bg-[#FFF7ED] text-[#F97316]',
  返点: 'bg-[#ECFDF5] text-[#10B981]',
  扣减: 'bg-[#FEF2F2] text-[#EF4444]',
  调账: 'bg-[#EFF6FF] text-[#0033A0]',
};

export function FundsStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        FUNDS_BADGE_BASE,
        FUNDS_BADGE_CLASS[status] ?? 'bg-slate-100 text-slate-500',
      )}
    >
      {status}
    </span>
  );
}

/* ============ 错误处理 ============ */

interface FundsApiErrorData {
  message?: string;
}

export function toFundsErrorText(error: unknown): string {
  const maybe = error as { response?: { data?: FundsApiErrorData } };
  return maybe.response?.data?.message ?? '操作失败';
}

export function reportFundsError(context: string, error: unknown): void {
  const text: string = toFundsErrorText(error);
  logger.error(`${context}: ${text}`);
  toast.error(text);
}

/* ============ 通用小组件 ============ */

export function FundsActionLink({ danger, onClick, children }: {
  danger?: boolean; onClick: () => void; children: string;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

export function FundsFilterSelect({ value, placeholder, options, allLabel, onChange }: {
  value: string; placeholder: string; options: string[]; allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={FINANCE_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ============ 数据选项 Hooks ============ */

export function useFundCustomerOptions(): Customer[] {
  const [customers, setCustomers] = useState<Customer[]>([]);
  useEffect(() => {
    let cancelled: boolean = false;
    fetchCustomers({ page: 1, pageSize: 200 })
      .then((result: PageResult<Customer>) => {
        if (!cancelled) setCustomers(result.items);
      })
      .catch((error: unknown) => {
        if (!cancelled) reportFundsError('加载客户列表失败', error);
      });
    return () => { cancelled = true; };
  }, []);
  return customers;
}

export function useFundAccountOptions(): FinanceAccountOption[] {
  const [accounts, setAccounts] = useState<FinanceAccountOption[]>([]);
  useEffect(() => {
    let cancelled: boolean = false;
    fetchFinanceAccountsOptions()
      .then((options: FinanceAccountOption[]) => {
        if (!cancelled) setAccounts(options);
      })
      .catch((error: unknown) => {
        if (!cancelled) reportFundsError('加载资金账户失败', error);
      });
    return () => { cancelled = true; };
  }, []);
  return accounts;
}

/* ============ 选择组件 ============ */

export function FundsCustomerSelect({ value, customers, placeholder, onChange }: {
  value: string; customers: Customer[]; placeholder?: string;
  onChange: (customerId: string, customerName: string) => void;
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(next: string) => {
        const customer: Customer | undefined = customers.find(
          (item: Customer) => item.id === next,
        );
        onChange(next, customer?.name ?? '');
      }}
    >
      <SelectTrigger className="rounded-none">
        <SelectValue placeholder={placeholder ?? '选择客户'} />
      </SelectTrigger>
      <SelectContent className="max-h-60 rounded-none">
        {customers.map((customer: Customer) => (
          <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FundsAccountSelect({ value, accounts, placeholder, onChange }: {
  value: string; accounts: FinanceAccountOption[]; placeholder?: string;
  onChange: (accountId: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="rounded-none">
        <SelectValue placeholder={placeholder ?? '选择资金账户'} />
      </SelectTrigger>
      <SelectContent className="max-h-60 rounded-none">
        {accounts.map((account: FinanceAccountOption) => (
          <SelectItem key={account.id} value={String(account.id)}>
            {account.accountName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============ 余额登记弹窗（端口 / 银行账户共用） ============ */

interface FundsBalanceDialogProps {
  open: boolean;
  title: string;
  description: string;
  onSubmit: (balance: number) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function FundsBalanceDialog({
  open, title, description, onSubmit, onOpenChange,
}: FundsBalanceDialogProps) {
  const [balance, setBalance] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setBalance('');
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    const value: number = Number(balance);
    if (!Number.isFinite(value)) {
      toast.error('请输入有效的余额数字');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(value);
      onOpenChange(false);
    } catch (error: unknown) {
      reportFundsError('保存余额失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            登记余额 <span className="text-destructive">*</span>
          </label>
          <Input
            className="rounded-none"
            type="number"
            value={balance}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setBalance(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
