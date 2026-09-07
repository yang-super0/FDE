import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
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
  CreateFinanceReceiptRequest, FinanceAccount, FinanceReceipt, FinanceSettlement,
  FinanceSettlementListResult,
} from '@shared/api.interface';
import {
  batchWriteOffFinanceReceipts, createFinanceReceipt, fetchFinanceAccounts,
  fetchFinanceSettlements, updateFinanceReceipt, writeOffFinanceReceipt,
} from '@client/src/api/finance-core';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import {
  FinanceFormField, FinanceStatusBadge, formatFinanceAmount, RECEIPT_METHOD_OPTIONS,
  RECEIPT_TYPE_OPTIONS, toFinanceErrorText, toFinanceNumber,
} from './finance-constants';

const NO_ACCOUNT: string = 'none';

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toFinanceErrorText(error)}`); toast.error(toFinanceErrorText(error));
};

interface ReceiptFormState {
  customerName: string; amount: string; groupName: string;
  receiptType: string; paymentMethod: string; accountId: string;
  receiptDate: Date; relatedContract: string; remark: string;
}

type TextFieldKey = 'customerName' | 'amount' | 'groupName' | 'relatedContract';
type SelectFieldKey = 'receiptType' | 'paymentMethod';
type TextFieldDef = { key: TextFieldKey; label: string; required?: boolean; number?: boolean };
type SelectFieldDef = { key: SelectFieldKey; label: string; options: string[] };

const TEXT_FIELDS: TextFieldDef[] = [
  { key: 'customerName', label: '客户名称', required: true },
  { key: 'amount', label: '金额', required: true, number: true },
  { key: 'groupName', label: '集团名称' }, { key: 'relatedContract', label: '关联合同' },
];
const SELECT_FIELDS: SelectFieldDef[] = [
  { key: 'receiptType', label: '收款类型', options: RECEIPT_TYPE_OPTIONS },
  { key: 'paymentMethod', label: '收款方式', options: RECEIPT_METHOD_OPTIONS },
];

const buildEmptyForm = (): ReceiptFormState => ({
  customerName: '', amount: '', groupName: '', receiptType: RECEIPT_TYPE_OPTIONS[0],
  paymentMethod: RECEIPT_METHOD_OPTIONS[0], accountId: NO_ACCOUNT, receiptDate: new Date(),
  relatedContract: '', remark: '',
});

interface ReceiptFormDialogProps {
  open: boolean; editing: FinanceReceipt | null; onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptFormDialog({ open, editing, onSaved, onOpenChange }: ReceiptFormDialogProps) {
  const [form, setForm] = useState<ReceiptFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);

  const loadAccounts = async (): Promise<void> => {
    try {
      const result = await fetchFinanceAccounts({ page: 1, pageSize: 200 });
      setAccounts(result.items.filter((account: FinanceAccount) => account.status === '启用'));
    } catch (error: unknown) {
      reportError('加载收款账户失败', error);
    }
  };
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        customerName: editing.customerName, amount: String(editing.amount),
        groupName: editing.groupName, receiptType: editing.receiptType,
        paymentMethod: editing.paymentMethod, remark: editing.remark,
        accountId: editing.accountId === null ? NO_ACCOUNT : String(editing.accountId),
        receiptDate: editing.receiptDate ? new Date(editing.receiptDate) : new Date(),
        relatedContract: editing.relatedContract,
      });
    } else setForm(buildEmptyForm());
    void loadAccounts();
  }, [open, editing]);
  const patch = <K extends keyof ReceiptFormState>(key: K, value: ReceiptFormState[K]): void =>
    setForm((prev: ReceiptFormState) => ({ ...prev, [key]: value }));
  const handleSubmit = async (): Promise<void> => {
    if (!form.customerName.trim()) { toast.error('请输入客户名称'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('金额必须为大于 0 的数字'); return; }
    const payload = {
      customerName: form.customerName.trim(), amount,
      receiptType: form.receiptType, paymentMethod: form.paymentMethod,
      groupName: form.groupName.trim() || undefined, remark: form.remark.trim() || undefined,
      accountId: form.accountId === NO_ACCOUNT ? null : Number(form.accountId),
      receiptDate: dayjs(form.receiptDate).format('YYYY-MM-DD'),
      relatedContract: form.relatedContract.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updateFinanceReceipt(editing.id, payload);
        toast.success('收款单已更新');
      } else {
        const body: CreateFinanceReceiptRequest = { ...payload };
        await createFinanceReceipt(body);
        toast.success('收款单已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存收款单失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑收款单' : '新建收款单'}</DialogTitle>
          <DialogDescription>{editing ? `收款单号：${editing.receiptNo}` : '登记一笔新的收款记录'}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TEXT_FIELDS.map((field: TextFieldDef) => (
            <FinanceFormField key={field.key} label={field.label} required={field.required}>
              <Input className="rounded-none" type={field.number ? 'number' : 'text'}
                min={field.number ? '0' : undefined} value={form[field.key]}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch(field.key, event.target.value)} />
            </FinanceFormField>
          ))}
          {SELECT_FIELDS.map((field: SelectFieldDef) => (
            <FinanceFormField key={field.key} label={field.label}>
              <Select value={form[field.key]} onValueChange={(value: string) => patch(field.key, value)}>
                <SelectTrigger className="rounded-none"><SelectValue placeholder={field.label} /></SelectTrigger>
                <SelectContent>
                  {field.options.map((option: string) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FinanceFormField>
          ))}
          <FinanceFormField label="收款账户">
            <Select value={form.accountId} onValueChange={(value: string) => patch('accountId', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="收款账户" /></SelectTrigger>
              <SelectContent position="popper" className="max-h-60 rounded-none">
                <SelectItem value={NO_ACCOUNT}>不关联账户</SelectItem>
                {accounts.map((account: FinanceAccount) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {`${account.accountName}（${formatFinanceAmount(toFinanceNumber(account.balance))}）`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="收款日期">
            <AdsDatePickerButton value={form.receiptDate} placeholder="收款日期"
              onChange={(date: Date | undefined) => { if (date) patch('receiptDate', date); }} />
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

interface ReceiptWriteOffDialogProps {
  open: boolean; receiptIds: number[]; onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function ReceiptWriteOffDialog({ open, receiptIds, onDone, onOpenChange }: ReceiptWriteOffDialogProps) {
  const [settlements, setSettlements] = useState<FinanceSettlement[]>([]);
  const [settlementLoading, setSettlementLoading] = useState<boolean>(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (!open) return;
    setSelectedSettlementId(null);
    let cancelled: boolean = false;
    setSettlementLoading(true);
    fetchFinanceSettlements({ page: 1, pageSize: 20 })
      .then((result: FinanceSettlementListResult) => { if (!cancelled) setSettlements(result.items); })
      .catch((error: unknown) => { if (!cancelled) reportError('加载结算单失败', error); })
      .finally(() => { if (!cancelled) setSettlementLoading(false); });
    return () => { cancelled = true; };
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (selectedSettlementId === null) { toast.error('请选择要核销的结算单'); return; }
    setSubmitting(true);
    try {
      await (receiptIds.length === 1
        ? writeOffFinanceReceipt(receiptIds[0], { settlementId: selectedSettlementId })
        : batchWriteOffFinanceReceipts(receiptIds, selectedSettlementId));
      toast.success('核销成功');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('核销失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>收款核销</DialogTitle>
          <DialogDescription>共 {receiptIds.length} 条收款单，请选择要核销的结算单</DialogDescription>
        </DialogHeader>
        <div className="max-h-[320px] overflow-y-auto border border-border">
          {settlementLoading ? (
            <div className="p-4 text-sm text-muted-foreground">加载结算单中...</div>
          ) : settlements.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">暂无可核销的结算单</div>
          ) : (
            settlements.map((settlement: FinanceSettlement) => (
              <div key={settlement.id} onClick={() => setSelectedSettlementId(settlement.id)}
                className={`flex cursor-pointer items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-sm transition-colors ${
                  selectedSettlementId === settlement.id ? 'bg-accent' : 'hover:bg-accent/50'
                }`}>
                <div className="min-w-0">
                  <div className="font-medium text-primary">{settlement.settlementNo}</div>
                  <div className="text-xs text-muted-foreground">{settlement.customerName} · {settlement.period}</div>
                </div>
                <FinanceStatusBadge status={settlement.status} />
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>确认核销</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReceiptDetailDialogProps {
  open: boolean; receipt: FinanceReceipt | null; onOpenChange: (open: boolean) => void;
}

export function ReceiptDetailDialog({ open, receipt, onOpenChange }: ReceiptDetailDialogProps) {
  const detailRows: Array<[string, ReactNode]> = receipt ? [
    ['收款单号', receipt.receiptNo], ['客户名称', receipt.customerName],
    ['集团名称', receipt.groupName], ['金额', formatFinanceAmount(toFinanceNumber(receipt.amount))],
    ['收款类型', receipt.receiptType], ['收款方式', receipt.paymentMethod],
    ['收款账户', receipt.accountName],
    ['状态', <FinanceStatusBadge key="status" status={receipt.status} />],
    ['收款日期', receipt.receiptDate], ['确认人', receipt.confirmedBy],
    ['确认时间', receipt.confirmedAt ? dayjs(receipt.confirmedAt).format('YYYY-MM-DD HH:mm') : ''],
    ['结算单号', receipt.settlementNo], ['关联合同', receipt.relatedContract],
    ['备注', receipt.remark], ['创建时间', dayjs(receipt.createdAt).format('YYYY-MM-DD HH:mm')],
  ] : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>收款详情</DialogTitle>
          <DialogDescription>{receipt?.receiptNo ?? ''}</DialogDescription>
        </DialogHeader>
        <div>
          {detailRows.map(([label, value]: [string, ReactNode]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm">
              <span className="shrink-0 text-muted-foreground">{label}</span>
              <span className="break-words text-right font-medium">{value || '—'}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
