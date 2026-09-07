import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { useFieldPermissions } from '@client/src/hooks/useFieldPermissions';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/src/components/ui/select';
import { cn } from '@client/src/lib/utils';
import type { CreateFinancePaymentRequest, FinanceAccount, FinancePayment } from '@shared/api.interface';
import {
  approveFinancePayment, batchApproveFinancePayments, createFinancePayment, deleteFinancePaymentCore,
  fetchFinanceAccounts, fetchFinancePayments, payFinancePayment, updateFinancePayment,
} from '@client/src/api/finance-core';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FinanceCoreTabs } from './FinanceCoreTabs';
import {
  FINANCE_FILTER_ALL, FinanceFormField, FinanceStatusBadge, formatFinanceAmount,
  PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS, PAYMENT_TYPE_OPTIONS, toFinanceErrorText,
  toFinanceNumber,
} from './finance-constants';

const PAGE_SIZE: number = 10;
const EDITABLE_STATUSES: string[] = ['待审批', '审批驳回'];

const renderMoney = (value: number | string | null): string =>
  value == null ? '-' : typeof value === 'string' ? value : formatFinanceAmount(value);

interface PaymentFormState {
  payeeName: string; amount: string; paymentType: string; paymentMethod: string;
  accountId: string; paymentDate: string; remark: string;
}

const buildEmptyForm = (): PaymentFormState => ({
  payeeName: '', amount: '', paymentType: PAYMENT_TYPE_OPTIONS[0], paymentMethod: PAYMENT_METHOD_OPTIONS[0],
  accountId: '', paymentDate: dayjs().format('YYYY-MM-DD'), remark: '',
});

interface OptionSelectProps {
  value: string; onChange: (value: string) => void; options: string[];
  placeholder: string; allLabel?: string; className?: string;
}

function OptionSelect({ value, onChange, options, placeholder, allLabel, className }: OptionSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('rounded-none', className)}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {allLabel ? <SelectItem value={FINANCE_FILTER_ALL}>{allLabel}</SelectItem> : null}
        {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function ActionBtn({ destructive, onClick, children }: { destructive?: boolean; onClick: () => void; children: string }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className={cn('h-auto p-0 px-1 text-xs', destructive && 'text-destructive')}>
      {children}
    </Button>
  );
}
function DetailItem({ label, span, children }: { label: string; span?: boolean; children: ReactNode }) {
  return (
    <p className={span ? 'col-span-2' : undefined}>
      <span className="text-muted-foreground">{label}：</span>{children}
    </p>
  );
}
interface FormFieldTextProps {
  label: string; required?: boolean; value: string; placeholder: string;
  onChange: (value: string) => void;
}

function FormInput({ label, required, value, placeholder, onChange }: FormFieldTextProps) {
  return (
    <FinanceFormField label={label} required={required}>
      <Input className="rounded-none" placeholder={placeholder} value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} />
    </FinanceFormField>
  );
}
function FormSelect({ label, required, value, placeholder, options, onChange }: FormFieldTextProps & { options: string[] }) {
  return (
    <FinanceFormField label={label} required={required}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="rounded-none"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </FinanceFormField>
  );
}

export default function FinancePaymentsPage() {
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftPayee, setDraftPayee] = useState<string>('');
  const [paymentNo, setPaymentNo] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>(FINANCE_FILTER_ALL);
  const [status, setStatus] = useState<string>(FINANCE_FILTER_ALL);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinancePayment[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const { fields: permFields } = useFieldPermissions('财务');
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<FinancePayment | null>(null);
  const [form, setForm] = useState<PaymentFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [enabledAccounts, setEnabledAccounts] = useState<FinanceAccount[]>([]);
  const [approvingItem, setApprovingItem] = useState<FinancePayment | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [detailItem, setDetailItem] = useState<FinancePayment | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinancePayment | null>(null);
  const [payingItem, setPayingItem] = useState<FinancePayment | null>(null);
  const [batchApproveOpen, setBatchApproveOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setPaymentNo(draftNo.trim()); setPayeeName(draftPayee.trim()); setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftPayee]);

  const filterParams = useMemo(() => ({
    paymentNo: paymentNo || undefined,
    payeeName: payeeName || undefined,
    paymentType: paymentType === FINANCE_FILTER_ALL ? undefined : paymentType,
    status: status === FINANCE_FILTER_ALL ? undefined : status,
    startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
    endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
  }), [paymentNo, payeeName, paymentType, status, startDate, endDate]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinancePayments({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载付款列表失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);
  useEffect(() => { void loadList(); }, [loadList]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
  }, [loadList]);
  useEffect(() => {
    if (!formOpen) return;
    let cancelled: boolean = false;
    fetchFinanceAccounts({ page: 1, pageSize: 200, status: '启用' })
      .then((result) => { if (!cancelled) setEnabledAccounts(result.items); })
      .catch((error: unknown) => {
        logger.error(`加载付款账户失败: ${toFinanceErrorText(error)}`);
        toast.error(toFinanceErrorText(error));
      });
    return () => { cancelled = true; };
  }, [formOpen]);

  const patchForm = (patch: Partial<PaymentFormState>): void =>
    setForm((prev: PaymentFormState) => ({ ...prev, ...patch }));

  const openCreate = (): void => {
    setEditing(null);
    setForm(buildEmptyForm());
    setFormOpen(true);
  };
  const openEdit = (item: FinancePayment): void => {
    setEditing(item);
    setForm({
      payeeName: item.payeeName, amount: String(item.amount), paymentType: item.paymentType,
      paymentMethod: item.paymentMethod, accountId: item.accountId !== null ? String(item.accountId) : '',
      paymentDate: item.paymentDate, remark: item.remark,
    });
    setFormOpen(true);
  };

  const runGuarded = async (label: string, action: () => Promise<unknown>, successText: string, after?: () => void): Promise<void> => {
    try {
      await action();
      if (successText) toast.success(successText);
      after?.();
    } catch (error: unknown) {
      logger.error(`${label}失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    }
  };
  const handleSubmit = async (): Promise<void> => {
    if (!form.payeeName.trim()) { toast.error('请输入收款方名称'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('金额必须为大于 0 的数字'); return; }
    if (!form.accountId) { toast.error('请选择付款账户'); return; }
    const payload: CreateFinancePaymentRequest = {
      payeeName: form.payeeName.trim(), amount, paymentType: form.paymentType,
      paymentMethod: form.paymentMethod, accountId: Number(form.accountId),
      paymentDate: form.paymentDate, remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updateFinancePayment(editing.id, payload); toast.success('付款单已更新');
      } else {
        await createFinancePayment(payload); toast.success('付款单已创建');
      }
      setFormOpen(false);
      refresh();
    } catch (error: unknown) {
      logger.error(`保存付款单失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (approved: boolean): Promise<void> => {
    if (!approvingItem) return;
    if (!approved && !rejectReason.trim()) { toast.error('请填写驳回原因'); return; }
    await runGuarded(
      '审批',
      () => approveFinancePayment(approvingItem.id, {
        approved, rejectReason: approved ? undefined : rejectReason.trim(),
      }),
      approved ? '已通过该付款单' : '已驳回该付款单',
      () => { setApprovingItem(null); refresh(); },
    );
  };
  const pendingSelected: FinancePayment[] = useMemo(
    () => items.filter((item: FinancePayment) => item.status === '待审批' && selectedKeys.includes(item.id)),
    [items, selectedKeys],
  );
  const handleBatchApprove = async (): Promise<void> => {
    const ids: number[] = pendingSelected.map((item: FinancePayment) => item.id);
    if (ids.length === 0) return;
    await runGuarded('批量审批', async () => {
      const result = await batchApproveFinancePayments(ids, true);
      toast.success(`已审批 ${result.approved} 条`);
    }, '', () => { setBatchApproveOpen(false); refresh(); });
  };
  const handleDelete = async (): Promise<void> => {
    if (!deletingItem) return;
    await runGuarded('删除', () => deleteFinancePaymentCore(deletingItem.id), '已删除该付款单', () => {
      setDeletingItem(null);
      refresh();
    });
  };
  const handlePay = async (): Promise<void> => {
    if (!payingItem) return;
    await runGuarded('执行付款', () => payFinancePayment(payingItem.id), '付款已执行', () => {
      setPayingItem(null);
      refresh();
    });
  };
  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinancePayment) => ({
        付款单号: item.paymentNo, 收款方: item.payeeName, 金额: String(item.amount),
        付款类型: item.paymentType, 付款方式: item.paymentMethod, 付款账户: item.accountName,
        状态: item.status, 付款日期: item.paymentDate, 申请人: item.applicant,
      }));
      const count: number = await exportRowsToExcel(
        rows,
        ['付款单号', '收款方', '金额', '付款类型', '付款方式', '付款账户', '状态', '付款日期', '申请人'],
        '付款管理', '付款管理',
      );
      toast.success(`已导出 ${count} 条付款单`);
    } catch (error: unknown) {
      logger.error(`导出失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    }
  };
  const handleReset = (): void => {
    setDraftNo(''); setDraftPayee('');
    setPaymentType(FINANCE_FILTER_ALL); setStatus(FINANCE_FILTER_ALL);
    setStartDate(undefined); setEndDate(undefined); setPage(1);
  };
  const columns = useMemo((): TableColumnsType<FinancePayment> => [
    { title: '付款单号', dataIndex: 'paymentNo', width: 150, render: (value: string) => <span className="font-bold text-primary">{value}</span> },
    { title: '收款方', dataIndex: 'payeeName', width: 140 },
    ...(permFields.get('payment_amount')?.visible !== false
      ? [{
          title: '金额', dataIndex: 'amount', width: 140, align: 'right' as const,
          render: (value: number | string | null) => <span className="font-mono font-bold">{renderMoney(value)}</span>,
        }]
      : []),
    { title: '类型', dataIndex: 'paymentType', width: 100 },
    { title: '方式', dataIndex: 'paymentMethod', width: 100 },
    { title: '账户', dataIndex: 'accountName', width: 130 },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => <FinanceStatusBadge status={value} /> },
    { title: '付款日期', dataIndex: 'paymentDate', width: 110 },
    { title: '申请人', dataIndex: 'applicant', width: 100 },
    {
      title: '操作',
      key: 'actions',
      width: 230,
      fixed: 'right',
      render: (_value: unknown, record: FinancePayment) => {
        const editable: boolean = EDITABLE_STATUSES.includes(record.status);
        return (
          <div className="flex items-center gap-1">
            <ActionBtn onClick={() => setDetailItem(record)}>查看</ActionBtn>
            {editable ? <ActionBtn onClick={() => openEdit(record)}>编辑</ActionBtn> : null}
            {record.status === '待审批' ? <ActionBtn onClick={() => { setRejectReason(''); setApprovingItem(record); }}>审批</ActionBtn> : null}
            {record.status === '审批通过' ? <ActionBtn onClick={() => setPayingItem(record)}>执行付款</ActionBtn> : null}
            {editable ? <ActionBtn destructive onClick={() => setDeletingItem(record)}>删除</ActionBtn> : null}
          </div>
        );
      },
    },
  ], [permFields]);
  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <FinanceCoreTabs active="payments" />
      <ReportCard>
        <SectionHeader no="04" label="PAYMENTS" subtitle="付款管理 / 付款审批 / 执行付款" />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input className="w-36 rounded-none" placeholder="付款单号" value={draftNo} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftNo(event.target.value)} />
          <Input className="w-36 rounded-none" placeholder="收款方" value={draftPayee} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftPayee(event.target.value)} />
          <OptionSelect className="w-32" value={paymentType} allLabel="全部类型" placeholder="付款类型" options={PAYMENT_TYPE_OPTIONS}
            onChange={(value: string) => { setPaymentType(value); setPage(1); }} />
          <OptionSelect className="w-32" value={status} allLabel="全部状态" placeholder="状态" options={PAYMENT_STATUS_OPTIONS}
            onChange={(value: string) => { setStatus(value); setPage(1); }} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">付款日期</span>
            <AdsDatePickerButton value={startDate} placeholder="开始日期"
              onChange={(date: Date | undefined) => { setStartDate(date); setPage(1); }} />
            <span className="text-xs text-muted-foreground">至</span>
            <AdsDatePickerButton value={endDate} placeholder="结束日期"
              onChange={(date: Date | undefined) => { setEndDate(date); setPage(1); }} />
          </div>
          <Button variant="outline" onClick={handleReset}>重置</Button>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新建
            </Button>
            <Button variant="outline" disabled={pendingSelected.length === 0} onClick={() => setBatchApproveOpen(true)}>
              批量审批通过
            </Button>
            <Button variant="outline" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出Excel
            </Button>
            <ColumnSettingsButton
              columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
            />
          </div>
          {selectedKeys.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              已选 {selectedKeys.length} 条（待审批 {pendingSelected.length} 条）
            </span>
          ) : null}
        </div>
        <Table<FinancePayment>
          columns={visibleColumns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500 }}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: (keys: Key[]) => setSelectedKeys(keys) }}
          pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: (nextPage: number) => setPage(nextPage) }}
        />
      </ReportCard>
      <Dialog open={formOpen} onOpenChange={(open: boolean) => { if (!open) setFormOpen(false); }}>
        <DialogContent className="rounded-none sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑付款单' : '新建付款单'}</DialogTitle>
            <DialogDescription>新建的付款单默认为「待审批」状态</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormInput label="收款方名称" required value={form.payeeName} placeholder="请输入收款方名称" onChange={(value: string) => patchForm({ payeeName: value })} />
            <div className="flex flex-wrap gap-4">
              <FormInput label="金额" required value={form.amount} placeholder="请输入金额" onChange={(value: string) => patchForm({ amount: value })} />
              <FormInput label="付款日期" value={form.paymentDate} placeholder="YYYY-MM-DD" onChange={(value: string) => patchForm({ paymentDate: value })} />
            </div>
            <div className="flex flex-wrap gap-4">
              <FormSelect label="付款类型" value={form.paymentType} placeholder="请选择付款类型" options={PAYMENT_TYPE_OPTIONS} onChange={(value: string) => patchForm({ paymentType: value })} />
              <FormSelect label="付款方式" value={form.paymentMethod} placeholder="请选择付款方式" options={PAYMENT_METHOD_OPTIONS} onChange={(value: string) => patchForm({ paymentMethod: value })} />
            </div>
            <FinanceFormField label="付款账户" required>
              <Select value={form.accountId || undefined} onValueChange={(value: string) => patchForm({ accountId: value })}>
                <SelectTrigger className="rounded-none"><SelectValue placeholder="请选择付款账户" /></SelectTrigger>
                <SelectContent>
                  {enabledAccounts.map((account: FinanceAccount) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {`${account.accountName}（${formatFinanceAmount(toFinanceNumber(account.balance))}）`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FinanceFormField>
            <FinanceFormField label="备注">
              <Textarea className="rounded-none" placeholder="请输入备注" value={form.remark}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patchForm({ remark: event.target.value })} />
            </FinanceFormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={approvingItem !== null} onOpenChange={(open: boolean) => { if (!open) setApprovingItem(null); }}>
        <DialogContent className="rounded-none sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>付款审批</DialogTitle>
            <DialogDescription>审批通过后可执行付款，驳回需填写驳回原因</DialogDescription>
          </DialogHeader>
          {approvingItem ? (
            <div className="space-y-3">
              <div className="space-y-1 text-sm">
                <p>付款单号：<span className="font-bold text-primary">{approvingItem.paymentNo}</span></p>
                <p>收款方：{approvingItem.payeeName}</p>
                <p className="font-mono font-bold">{formatFinanceAmount(toFinanceNumber(approvingItem.amount))}</p>
              </div>
              <FinanceFormField label="驳回原因">
                <Textarea className="rounded-none" placeholder="驳回时必填" value={rejectReason}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRejectReason(event.target.value)} />
              </FinanceFormField>
              <div className="flex justify-end gap-2">
                <Button variant="destructive" onClick={() => void handleApprove(false)}>驳回</Button>
                <Button onClick={() => void handleApprove(true)}>通过</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={detailItem !== null} onOpenChange={(open: boolean) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="rounded-none sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>付款单详情</DialogTitle>
            <DialogDescription>{detailItem?.paymentNo ?? ''}</DialogDescription>
          </DialogHeader>
          {detailItem ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <DetailItem label="收款方">{detailItem.payeeName}</DetailItem>
              <DetailItem label="金额"><span className="font-mono">{formatFinanceAmount(toFinanceNumber(detailItem.amount))}</span></DetailItem>
              <DetailItem label="付款类型">{detailItem.paymentType}</DetailItem>
              <DetailItem label="付款方式">{detailItem.paymentMethod}</DetailItem>
              <DetailItem label="付款账户">{detailItem.accountName || '-'}</DetailItem>
              <DetailItem label="状态"><FinanceStatusBadge status={detailItem.status} /></DetailItem>
              <DetailItem label="付款日期">{detailItem.paymentDate}</DetailItem>
              <DetailItem label="申请人">{detailItem.applicant || '-'}</DetailItem>
              <DetailItem label="审批人">{detailItem.approver || '-'}</DetailItem>
              <DetailItem label="审批时间">
                {detailItem.approvedAt ? dayjs(detailItem.approvedAt).format('YYYY-MM-DD HH:mm') : '-'}
              </DetailItem>
              <DetailItem label="驳回原因" span>{detailItem.rejectReason || '-'}</DetailItem>
              <DetailItem label="备注" span>{detailItem.remark || '-'}</DetailItem>
              <DetailItem label="创建时间" span>{dayjs(detailItem.createdAt).format('YYYY-MM-DD HH:mm')}</DetailItem>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <AdsConfirmDialog
        open={batchApproveOpen}
        title="确认批量审批通过？"
        description={`将对已选中的 ${pendingSelected.length} 条待审批付款单执行审批通过操作。`}
        confirmText="确认通过"
        onOpenChange={(open: boolean) => { if (!open) setBatchApproveOpen(false); }}
        onConfirm={() => void handleBatchApprove()}
      />
      <AdsConfirmDialog
        open={payingItem !== null}
        title="确认执行付款？"
        description={`将从所选账户扣减相应金额。付款单「${payingItem?.paymentNo ?? ''}」，金额 ${payingItem ? formatFinanceAmount(toFinanceNumber(payingItem.amount)) : ''}。`}
        confirmText="确认付款"
        onOpenChange={(open: boolean) => { if (!open) setPayingItem(null); }}
        onConfirm={() => void handlePay()}
      />
      <AdsConfirmDialog
        open={deletingItem !== null}
        title="确认删除？"
        description={`即将删除付款单「${deletingItem?.paymentNo ?? ''}」，删除后不可恢复。`}
        confirmText="确认删除"
        destructive
        onOpenChange={(open: boolean) => { if (!open) setDeletingItem(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
