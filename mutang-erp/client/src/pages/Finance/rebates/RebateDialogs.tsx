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
  CreateFinanceRebateRequest, FinanceAccount, FinancePort, FinanceRebate,
} from '@shared/api.interface';
import {
  createFinanceRebate, fetchRebateAccountOptions, fetchFinanceEnhancePorts,
  issueFinanceRebate, updateFinanceRebate,
} from '@client/src/api/finance-enhance/rebates';
import { FinanceFormField, formatFinanceAmount, toFinanceNumber } from '../finance-constants';
import { reportRebateError } from './shared';

const NO_PORT: string = 'none';

interface RebateFormState {
  customerId: string; customerName: string; portId: string; period: string;
  consumptionBase: string; rebateRatePercent: string; remark: string;
}

const buildEmptyRebateForm = (): RebateFormState => ({
  customerId: '', customerName: '', portId: NO_PORT, period: '',
  consumptionBase: '', rebateRatePercent: '', remark: '',
});

interface RebateFormDialogProps {
  open: boolean; editing: FinanceRebate | null;
  onSaved: () => void; onOpenChange: (open: boolean) => void;
}

export function RebateFormDialog({ open, editing, onSaved, onOpenChange }: RebateFormDialogProps) {
  const [form, setForm] = useState<RebateFormState>(buildEmptyRebateForm());
  const [ports, setPorts] = useState<FinancePort[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        customerId: editing.customerId,
        customerName: editing.customerName,
        portId: String(editing.portId),
        period: editing.period,
        consumptionBase: String(editing.consumptionBase),
        rebateRatePercent: String(editing.rebateRate * 100),
        remark: editing.remark,
      });
    } else {
      setForm(buildEmptyRebateForm());
    }
    let cancelled: boolean = false;
    fetchFinanceEnhancePorts()
      .then((result: { items: FinancePort[] }) => {
        if (!cancelled) setPorts(result.items);
      })
      .catch((error: unknown) => reportRebateError('加载端口失败', error));
    return () => { cancelled = true; };
  }, [open, editing]);

  const patch = <K extends keyof RebateFormState>(key: K, value: RebateFormState[K]): void =>
    setForm((prev: RebateFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId.trim()) { toast.error('请输入客户ID'); return; }
    if (!form.customerName.trim()) { toast.error('请输入客户名称'); return; }
    if (form.portId === NO_PORT) { toast.error('请选择端口'); return; }
    if (!form.period.trim()) { toast.error('请输入期间（如 2026-08）'); return; }
    const consumptionBase: number = Number(form.consumptionBase);
    if (!Number.isFinite(consumptionBase) || consumptionBase <= 0) {
      toast.error('消耗基数必须为大于 0 的数字'); return;
    }
    const ratePercent: number = Number(form.rebateRatePercent);
    if (!Number.isFinite(ratePercent) || ratePercent <= 0 || ratePercent > 100) {
      toast.error('返点比例必须为 0-100 之间的百分数'); return;
    }
    const payload = {
      customerId: form.customerId.trim(),
      customerName: form.customerName.trim(),
      portId: Number(form.portId),
      period: form.period.trim(),
      consumptionBase,
      rebateRate: ratePercent / 100,
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updateFinanceRebate(editing.id, payload);
        toast.success('后返记录已更新');
      } else {
        const body: CreateFinanceRebateRequest = { ...payload };
        await createFinanceRebate(body);
        toast.success('后返记录已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRebateError('保存后返记录失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑后返记录' : '新建后返记录'}</DialogTitle>
          <DialogDescription>
            {editing ? `后返单号：${editing.rebateNo}` : '登记一笔客户后返记录'}
          </DialogDescription>
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
          <FinanceFormField label="端口" required>
            <Select value={form.portId} onValueChange={(value: string) => patch('portId', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="选择端口" /></SelectTrigger>
              <SelectContent position="popper" className="max-h-60 rounded-none">
                <SelectItem value={NO_PORT}>请选择端口</SelectItem>
                {ports.map((port: FinancePort) => (
                  <SelectItem key={port.id} value={String(port.id)}>{port.portName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="期间（如 2026-08）" required>
            <Input className="rounded-none" placeholder="YYYY-MM" value={form.period}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('period', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="消耗基数（¥）" required>
            <Input className="rounded-none" type="number" min="0" value={form.consumptionBase}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('consumptionBase', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="返点比例（%，输入 5 表示 5%）" required>
            <Input className="rounded-none" type="number" min="0" max="100" step="0.01" value={form.rebateRatePercent}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('rebateRatePercent', event.target.value)} />
          </FinanceFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('remark', event.target.value)} />
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

interface RebateIssueDialogProps {
  open: boolean; rebate: FinanceRebate | null;
  onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function RebateIssueDialog({ open, rebate, onDone, onOpenChange }: RebateIssueDialogProps) {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setAccountId('');
    let cancelled: boolean = false;
    fetchRebateAccountOptions()
      .then((result: { items: FinanceAccount[] }) => {
        if (cancelled) return;
        setAccounts(result.items.filter((account: FinanceAccount) => account.status === '启用'));
      })
      .catch((error: unknown) => reportRebateError('加载资金账户失败', error));
    return () => { cancelled = true; };
  }, [open]);

  const handleConfirm = async (): Promise<void> => {
    if (!rebate) return;
    if (!accountId) { toast.error('请选择发放资金账户'); return; }
    setSubmitting(true);
    try {
      await issueFinanceRebate(rebate.id, Number(accountId));
      toast.success('后返已发放');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportRebateError('发放后返失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>发放后返</DialogTitle>
          <DialogDescription>
            {rebate
              ? `后返单号：${rebate.rebateNo}，返点金额 ${formatFinanceAmount(rebate.rebateAmount)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <FinanceFormField label="资金账户" required>
          <Select value={accountId || undefined} onValueChange={setAccountId}>
            <SelectTrigger className="rounded-none"><SelectValue placeholder="选择资金账户" /></SelectTrigger>
            <SelectContent position="popper" className="max-h-60 rounded-none">
              {accounts.map((account: FinanceAccount) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  {`${account.accountName}（${formatFinanceAmount(toFinanceNumber(account.balance))}）`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FinanceFormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleConfirm()}>
            {submitting ? '发放中...' : '确认发放'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
