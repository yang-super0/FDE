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
  CreateFinanceDeductionRequest, FinanceAccount, FinanceDeduction,
} from '@shared/api.interface';
import {
  approveFinanceDeduction, createFinanceDeduction, fetchRebateAccountOptions,
} from '@client/src/api/finance-enhance/rebates';
import { FinanceFormField, formatFinanceAmount, toFinanceNumber } from '../finance-constants';
import { DEDUCTION_TYPE_OPTIONS, reportRebateError } from './shared';

const NO_ACCOUNT: string = 'none';
const APPROVE_PASS: string = '通过';
const APPROVE_REJECT: string = '驳回';
const APPROVE_DECISIONS: string[] = [APPROVE_PASS, APPROVE_REJECT];

interface DeductionFormState {
  customerId: string; customerName: string; accountId: string;
  amount: string; deductionType: string; reason: string;
}

const buildEmptyDeductionForm = (): DeductionFormState => ({
  customerId: '', customerName: '', accountId: NO_ACCOUNT,
  amount: '', deductionType: DEDUCTION_TYPE_OPTIONS[0], reason: '',
});

interface DeductionFormDialogProps {
  open: boolean;
  onSaved: () => void; onOpenChange: (open: boolean) => void;
}

export function DeductionFormDialog({ open, onSaved, onOpenChange }: DeductionFormDialogProps) {
  const [form, setForm] = useState<DeductionFormState>(buildEmptyDeductionForm());
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(buildEmptyDeductionForm());
    let cancelled: boolean = false;
    fetchRebateAccountOptions()
      .then((result: { items: FinanceAccount[] }) => {
        if (cancelled) return;
        setAccounts(result.items.filter((account: FinanceAccount) => account.status === '启用'));
      })
      .catch((error: unknown) => reportRebateError('加载资金账户失败', error));
    return () => { cancelled = true; };
  }, [open]);

  const patch = <K extends keyof DeductionFormState>(key: K, value: DeductionFormState[K]): void =>
    setForm((prev: DeductionFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId.trim()) { toast.error('请输入客户ID'); return; }
    if (!form.customerName.trim()) { toast.error('请输入客户名称'); return; }
    if (form.accountId === NO_ACCOUNT) { toast.error('请选择扣减资金账户'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('扣减金额必须为大于 0 的数字'); return;
    }
    if (!form.reason.trim()) { toast.error('请输入扣减原因'); return; }
    const body: CreateFinanceDeductionRequest = {
      customerId: form.customerId.trim(),
      customerName: form.customerName.trim(),
      accountId: Number(form.accountId),
      amount,
      reason: form.reason.trim(),
      deductionType: form.deductionType,
    };
    setSubmitting(true);
    try {
      await createFinanceDeduction(body);
      toast.success('扣减记录已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRebateError('保存扣减记录失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建扣减记录</DialogTitle>
          <DialogDescription>登记一笔客户扣减，提交后进入待审批状态</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="客户ID" required>
            <Input className="rounded-none" value={form.customerId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('customerId', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="客户名称" required>
            <Input className="rounded-none" value={form.customerName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('customerName', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="扣减资金账户" required>
            <Select value={form.accountId} onValueChange={(value: string) => patch('accountId', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="选择资金账户" /></SelectTrigger>
              <SelectContent position="popper" className="max-h-60 rounded-none">
                <SelectItem value={NO_ACCOUNT}>请选择资金账户</SelectItem>
                {accounts.map((account: FinanceAccount) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {`${account.accountName}（${formatFinanceAmount(toFinanceNumber(account.balance))}）`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="扣减金额（¥）" required>
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="扣减类型" required>
            <Select value={form.deductionType} onValueChange={(value: string) => patch('deductionType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="扣减类型" /></SelectTrigger>
              <SelectContent>
                {DEDUCTION_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">扣减原因 <span className="text-destructive">*</span></label>
            <Textarea className="rounded-none" rows={2} value={form.reason}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('reason', event.target.value)} />
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

interface DeductionApproveDialogProps {
  open: boolean; deduction: FinanceDeduction | null;
  onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function DeductionApproveDialog({ open, deduction, onDone, onOpenChange }: DeductionApproveDialogProps) {
  const [decision, setDecision] = useState<string>(APPROVE_PASS);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setDecision(APPROVE_PASS);
    setRejectReason('');
  }, [open]);

  const handleConfirm = async (): Promise<void> => {
    if (!deduction) return;
    if (decision === APPROVE_REJECT && !rejectReason.trim()) {
      toast.error('驳回时必须填写驳回原因'); return;
    }
    setSubmitting(true);
    try {
      await approveFinanceDeduction(deduction.id, {
        approved: decision === APPROVE_PASS,
        rejectReason: decision === APPROVE_REJECT ? rejectReason.trim() : undefined,
      });
      toast.success(decision === APPROVE_PASS ? '扣减已通过审批' : '扣减已驳回');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportRebateError('审批扣减失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>审批扣减</DialogTitle>
          <DialogDescription>
            {deduction
              ? `扣减单号：${deduction.deductionNo}，扣减金额 ${formatFinanceAmount(deduction.amount)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <FinanceFormField label="审批结论" required>
          <Select value={decision} onValueChange={setDecision}>
            <SelectTrigger className="rounded-none"><SelectValue placeholder="审批结论" /></SelectTrigger>
            <SelectContent>
              {APPROVE_DECISIONS.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FinanceFormField>
        {decision === APPROVE_REJECT ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">驳回原因 <span className="text-destructive">*</span></label>
            <Textarea className="rounded-none" rows={2} value={rejectReason}
              placeholder="请填写驳回原因"
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRejectReason(event.target.value)} />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleConfirm()}>
            {submitting ? '提交中...' : '提交审批'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
