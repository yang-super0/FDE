import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/src/components/ui/select';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import type { ContractExpense, ContractExpenseDetail, ContractPaymentRecord } from '@shared/api.interface';
import { createPaymentRecord, deletePaymentRecord, getContractExpense } from '@client/src/api/contract-enhance';
import { PAYMENT_METHOD_OPTIONS, toContractErrorText } from './ContractExpenseDialogs';

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }): ReactNode {
  return (
    <div className="w-[calc(33.33%-11px)] min-w-[180px] space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
    </div>
  );
}

interface PaymentRecordsDialogProps {
  open: boolean;
  expense: ContractExpense | null;
  focusForm: boolean;
  onChanged: () => void;
  onOpenChange: (open: boolean) => void;
}

export function PaymentRecordsDialog({ open, expense, focusForm, onChanged, onOpenChange }: PaymentRecordsDialogProps): ReactNode {
  const [detail, setDetail] = useState<ContractExpenseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingRecord, setDeletingRecord] = useState<ContractPaymentRecord | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const loadDetail = useCallback(async (): Promise<void> => {
    if (!expense) return;
    setLoading(true);
    try {
      const result = await getContractExpense(expense.id);
      setDetail(result);
    } catch (error: unknown) {
      logger.error(`加载付款记录失败: ${toContractErrorText(error)}`);
      toast.error(toContractErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [expense]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setAmount('');
      setPaymentDate(undefined);
      setPaymentMethod('');
      setBankAccount('');
      setVoucherNo('');
      setRemark('');
      setDeletingRecord(null);
      return;
    }
    void loadDetail();
  }, [open, loadDetail]);

  useEffect(() => {
    if (!open || !focusForm) return;
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 150);
    return () => clearTimeout(timer);
  }, [open, focusForm]);

  const currentAmount: number = detail ? detail.amount : (expense?.amount ?? 0);
  const paidAmount: number = detail ? detail.paidAmount : (expense?.paidAmount ?? 0);
  const unpaidAmount: number = Math.max(
    Math.round((currentAmount - paidAmount) * 100) / 100, 0,
  );
  const fullyPaid: boolean = unpaidAmount <= 0;

  const handleSubmit = async (): Promise<void> => {
    if (!expense) return;
    const amountValue: number = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error('付款金额必须大于 0');
      return;
    }
    if (amountValue > unpaidAmount + 1e-9) {
      toast.error(`付款金额不能超过未付金额 ${unpaidAmount}`);
      return;
    }
    if (!paymentDate) {
      toast.error('请选择付款日期');
      return;
    }
    if (!paymentMethod) {
      toast.error('请选择付款方式');
      return;
    }
    setSubmitting(true);
    try {
      await createPaymentRecord(expense.id, {
        amount: amountValue,
        paymentDate: dayjs(paymentDate).format('YYYY-MM-DD'),
        paymentMethod,
        bankAccount: bankAccount.trim() || undefined,
        voucherNo: voucherNo.trim() || undefined,
        remark: remark.trim() || undefined,
      });
      toast.success('付款记录已登记');
      setAmount('');
      setPaymentDate(undefined);
      setPaymentMethod('');
      setBankAccount('');
      setVoucherNo('');
      setRemark('');
      await loadDetail();
      onChanged();
    } catch (error: unknown) {
      logger.error(`登记付款记录失败: ${toContractErrorText(error)}`);
      toast.error(toContractErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = async (): Promise<void> => {
    if (!deletingRecord) return;
    try {
      await deletePaymentRecord(deletingRecord.id);
      toast.success('付款记录已删除');
      setDeletingRecord(null);
      await loadDetail();
      onChanged();
    } catch (error: unknown) {
      logger.error(`删除付款记录失败: ${toContractErrorText(error)}`);
      toast.error(toContractErrorText(error));
    }
  };

  const columns = useMemo((): TableColumnsType<ContractPaymentRecord> => [
    {
      title: '付款记录编号', dataIndex: 'recordNo', width: 150, fixed: 'left',
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    {
      title: '金额', dataIndex: 'amount', width: 100, align: 'right',
      render: (value: number) => <span className="font-mono">{value.toLocaleString()}</span>,
    },
    {
      title: '付款日期', dataIndex: 'paymentDate', width: 100,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD') : ''),
    },
    { title: '付款方式', dataIndex: 'paymentMethod', width: 90 },
    { title: '银行账户', dataIndex: 'bankAccount', width: 130 },
    { title: '凭证号', dataIndex: 'voucherNo', width: 120 },
    { title: '备注', dataIndex: 'remark', width: 120 },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 130,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : ''),
    },
    {
      title: '操作', key: 'actions', width: 70, fixed: 'right',
      render: (_: unknown, record: ContractPaymentRecord) => (
        <Button variant="ghost" size="sm" onClick={() => setDeletingRecord(record)}
          className="h-auto px-1 text-xs text-destructive">
          删除
        </Button>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const records: ContractPaymentRecord[] = detail?.paymentRecords ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl rounded-none">
          <DialogHeader>
            <DialogTitle>付款记录</DialogTitle>
            <DialogDescription>
              {expense ? `费用编号：${expense.expenseNo}（${expense.expenseType}）` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
            {/* 上半部：记录列表 + 未付金额 */}
            <div className="space-y-3">              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <span className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
                  已登记付款 {records.length} 笔
                </span>
                <div className="flex items-center gap-4 text-sm">
                  <span>费用金额：<span className="font-mono font-bold">{currentAmount.toLocaleString()}</span></span>
                  <span>已付金额：<span className="font-mono font-bold">{paidAmount.toLocaleString()}</span></span>
                  <span className={fullyPaid ? 'text-emerald-600' : 'text-amber-600'}>
                    未付金额：<span className="font-mono font-bold">{unpaidAmount.toLocaleString()}</span>
                  </span>
                </div>
              </div>
              {records.length === 0 && !loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  暂无付款记录，可在下方登记首笔付款
                </div>
              ) : (
                <Table<ContractPaymentRecord>
                  columns={columns}
                  dataSource={records}
                  loading={loading}
                  rowKey="id"
                  size="small"
                  scroll={{ x: 1000 }}
                  pagination={false}
                />
              )}
            </div>
            {/* 下半部：新增付款记录表单 */}
            <div ref={formRef} className="space-y-3 border-t border-border pt-4">
              <div className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
                登记付款
              </div>
              {fullyPaid ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  该笔费用已全部付清，无需继续登记付款
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  <Field label="付款金额" required>
                    <Input className="rounded-none" type="number" min="0" step="0.01"
                      value={amount} placeholder={`≤ 未付金额 ${unpaidAmount}`}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setAmount(event.target.value)} />
                  </Field>
                  <Field label="付款日期" required>
                    <AdsDatePickerButton value={paymentDate} placeholder="付款日期" onChange={setPaymentDate} />
                  </Field>
                  <Field label="付款方式" required>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="w-full rounded-none">
                        <SelectValue placeholder="选择付款方式" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS.map((option: string) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="银行账户">
                    <Input className="rounded-none" value={bankAccount} placeholder="收款银行账户"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setBankAccount(event.target.value)} />
                  </Field>
                  <Field label="凭证号">
                    <Input className="rounded-none" value={voucherNo} placeholder="付款凭证号"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setVoucherNo(event.target.value)} />
                  </Field>
                  <div className="w-full space-y-1.5">
                    <label className="text-sm font-medium">备注</label>
                    <Textarea className="rounded-none" rows={2} value={remark} placeholder="付款备注信息"
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRemark(event.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
            {!fullyPaid ? (
              <Button disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? '登记中...' : '登记付款'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除付款记录二次确认 */}
      <AdsConfirmDialog open={deletingRecord !== null}
        title="确认删除付款记录？"
        description={`即将删除付款记录「${deletingRecord?.recordNo ?? ''}」，删除后相关费用的已付金额与付款状态将回退。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(openNext: boolean) => { if (!openNext) setDeletingRecord(null); }}
        onConfirm={() => void handleDeleteRecord()}
      />
    </>
  );
}
