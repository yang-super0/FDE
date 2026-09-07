import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type {
  CreateFinanceBankAccountRequest, FinanceBankAccount,
  UpdateFinanceBankAccountRequest,
} from '@shared/api.interface';
import {
  createFinanceBankAccount, updateFinanceBankAccount,
} from '@client/src/api/finance-enhance/funds';
import { FinanceFormField } from '../finance-constants';
import {
  FUNDS_ACCOUNT_TYPE_OPTIONS, reportFundsError,
} from './funds-shared';

interface BankAccountFormState {
  bankName: string;
  accountName: string;
  accountNo: string;
  branch: string;
  accountType: string;
  balance: string;
  remark: string;
}

interface BankAccountFormDialogProps {
  open: boolean;
  editing: FinanceBankAccount | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): BankAccountFormState => ({
  bankName: '',
  accountName: '',
  accountNo: '',
  branch: '',
  accountType: FUNDS_ACCOUNT_TYPE_OPTIONS[0],
  balance: '',
  remark: '',
});

const fromAccount = (account: FinanceBankAccount): BankAccountFormState => ({
  bankName: account.bankName,
  accountName: account.accountName,
  accountNo: account.accountNo,
  branch: account.branch,
  accountType: account.accountType || FUNDS_ACCOUNT_TYPE_OPTIONS[0],
  balance: String(account.balance),
  remark: account.remark,
});

export function BankAccountFormDialog({
  open, editing, onSaved, onOpenChange,
}: BankAccountFormDialogProps) {
  const [form, setForm] = useState<BankAccountFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? fromAccount(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof BankAccountFormState>(
    key: K,
    value: BankAccountFormState[K],
  ): void => setForm((prev: BankAccountFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.bankName.trim()) { toast.error('请输入银行名称'); return; }
    if (!form.accountName.trim()) { toast.error('请输入账户名称'); return; }
    if (!form.accountNo.trim()) { toast.error('请输入银行账号'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateFinanceBankAccountRequest = {
          bankName: form.bankName.trim(),
          accountName: form.accountName.trim(),
          accountNo: form.accountNo.trim(),
          branch: form.branch.trim() || undefined,
          accountType: form.accountType,
          remark: form.remark.trim() || undefined,
        };
        await updateFinanceBankAccount(editing.id, body);
        toast.success('银行账户已更新');
      } else {
        const balance: number = Number(form.balance);
        const body: CreateFinanceBankAccountRequest = {
          bankName: form.bankName.trim(),
          accountName: form.accountName.trim(),
          accountNo: form.accountNo.trim(),
          branch: form.branch.trim() || undefined,
          accountType: form.accountType,
          balance: form.balance.trim() !== '' && Number.isFinite(balance) ? balance : undefined,
          remark: form.remark.trim() || undefined,
        };
        await createFinanceBankAccount(body);
        toast.success('银行账户已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportFundsError('保存银行账户失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑银行账户' : '新建银行账户'}</DialogTitle>
          <DialogDescription>
            {editing ? `账户编号：${editing.bankNo}` : '登记一个新的银行资金账户'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="银行名称" required>
            <Input
              className="rounded-none" value={form.bankName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('bankName', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="账户名称" required>
            <Input
              className="rounded-none" value={form.accountName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('accountName', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="银行账号" required>
            <Input
              className="rounded-none" value={form.accountNo}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('accountNo', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="开户支行">
            <Input
              className="rounded-none" value={form.branch}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('branch', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="账户类型" required>
            <Select
              value={form.accountType}
              onValueChange={(value: string) => patch('accountType', value)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="账户类型" />
              </SelectTrigger>
              <SelectContent>
                {FUNDS_ACCOUNT_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          {editing ? null : (
            <FinanceFormField label="初始余额">
              <Input
                className="rounded-none" type="number" value={form.balance}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch('balance', event.target.value)}
              />
            </FinanceFormField>
          )}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea
              className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('remark', event.target.value)}
            />
          </div>
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
