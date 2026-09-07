import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type Key, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { ReportCard, SectionHeader } from '@client/src/components/blueprint';
import { ColumnSettingsButton } from '@client/src/components/column-settings-button';
import { useColumnSettings } from '@client/src/hooks/useColumnSettings';
import { cn } from '@client/src/lib/utils';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/src/components/ui/select';
import type { CreateFinanceInvoiceRequest, FinanceInvoice } from '@shared/api.interface';
import {
  batchIssueFinanceInvoices, batchSendFinanceInvoices, createFinanceInvoice,
  deleteFinanceInvoiceCore, fetchFinanceInvoices, issueFinanceInvoice,
  receiveFinanceInvoice, sendFinanceInvoice, updateFinanceInvoice, voidFinanceInvoice,
} from '@client/src/api/finance-core';
import { AdsConfirmDialog } from '@client/src/pages/AdsBusiness/AdsConfirmDialog';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';
import { FinanceCoreTabs } from './FinanceCoreTabs';
import {
  FINANCE_FILTER_ALL, FinanceFormField, FinanceStatusBadge, formatFinanceAmount,
  INVOICE_STATUS_BADGE, INVOICE_TYPE_OPTIONS, toFinanceErrorText,
} from './finance-constants';

const PAGE_SIZE: number = 10;
const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;
const INVOICE_STATUS_OPTIONS: string[] = Object.keys(INVOICE_STATUS_BADGE);

interface InvoiceFormState {
  title: string; amount: string; taxAmount: string; invoiceType: string;
  taxNumber: string; customerName: string; invoiceDate: string; remark: string;
}

const EMPTY_FORM: InvoiceFormState = {
  title: '', amount: '', taxAmount: '0', invoiceType: INVOICE_TYPE_OPTIONS[0],
  taxNumber: '', customerName: '', invoiceDate: '', remark: '',
};

function ActionBtn({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={cn('h-7 rounded-none px-2 text-xs', danger && 'text-destructive hover:text-destructive')}>
      {children}
    </Button>
  );
}

function buildDetailRows(invoice: FinanceInvoice): Array<[string, string]> {
  return [
    ['发票号码', invoice.invoiceNo], ['发票类型', invoice.invoiceType],
    ['发票抬头', invoice.title], ['税号', invoice.taxNumber || '-'],
    ['客户名称', invoice.customerName || '-'], ['金额', formatFinanceAmount(invoice.amount)],
    ['税额', formatFinanceAmount(invoice.taxAmount)], ['价税合计', formatFinanceAmount(invoice.totalAmount)],
    ['开票日期', dayjs(invoice.invoiceDate).format('YYYY-MM-DD')], ['状态', invoice.status],
    ['开票人', invoice.drawer || '-'], ['快递单号', invoice.expressNo || '-'],
    ['寄出日期', invoice.expressDate ? dayjs(invoice.expressDate).format('YYYY-MM-DD') : '-'],
    ['创建时间', dayjs(invoice.createdAt).format('YYYY-MM-DD HH:mm')], ['备注', invoice.remark || '-'],
  ];
}

const renderSelectOptions = (options: string[]): ReactNode =>
  options.map((option: string): ReactNode => <SelectItem key={option} value={option}>{option}</SelectItem>);

export default function FinanceInvoicesPage() {
  const [draftNo, setDraftNo] = useState<string>('');
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftCustomer, setDraftCustomer] = useState<string>('');
  const [appliedNo, setAppliedNo] = useState<string>('');
  const [appliedTitle, setAppliedTitle] = useState<string>('');
  const [appliedCustomer, setAppliedCustomer] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>(FINANCE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(FINANCE_FILTER_ALL);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<FinanceInvoice[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<InvoiceFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [detail, setDetail] = useState<FinanceInvoice | null>(null);
  const [issueTarget, setIssueTarget] = useState<FinanceInvoice | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<FinanceInvoice | null>(null);
  const [voidTarget, setVoidTarget] = useState<FinanceInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceInvoice | null>(null);
  const [sendTarget, setSendTarget] = useState<FinanceInvoice | null>(null);
  const [expressNo, setExpressNo] = useState<string>('');
  const [batchSendOpen, setBatchSendOpen] = useState<boolean>(false);
  const [batchExpressNo, setBatchExpressNo] = useState<string>('');

  const textChange =
    (setter: (value: string) => void) =>
    (event: ChangeEvent<HTMLInputElement>): void => setter(event.target.value);

  const patchChange = (key: keyof InvoiceFormState) =>
    (value: string): void => setForm((prev: InvoiceFormState) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setAppliedNo(draftNo.trim());
      setAppliedTitle(draftTitle.trim());
      setAppliedCustomer(draftCustomer.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [draftNo, draftTitle, draftCustomer]);

  const filterParams = useMemo(() => ({
    invoiceNo: appliedNo || undefined, title: appliedTitle || undefined,
    customerName: appliedCustomer || undefined,
    invoiceType: typeFilter === FINANCE_FILTER_ALL ? undefined : typeFilter,
    status: statusFilter === FINANCE_FILTER_ALL ? undefined : statusFilter,
    startDate: DATE_PATTERN.test(startDate) ? startDate : undefined,
    endDate: DATE_PATTERN.test(endDate) ? endDate : undefined,
  }), [appliedNo, appliedTitle, appliedCustomer, typeFilter, statusFilter, startDate, endDate]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFinanceInvoices({ ...filterParams, page, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      logger.error(`加载发票列表失败: ${toFinanceErrorText(error)}`);
      toast.error('加载发票列表失败');
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refresh = useCallback((): void => {
    setSelectedKeys([]);
    void loadList();
  }, [loadList]);

  /** 通用操作执行器：成功 toast + 关闭 + 刷新，失败统一错误提示 */
  const runAction = async (fn: () => Promise<string>, close: () => void): Promise<void> => {
    try {
      toast.success(await fn());
      close();
      refresh();
    } catch (error: unknown) {
      logger.error(`发票操作失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    }
  };

  /** 生成单张状态机操作（开具/收讫/作废/删除）的确认回调 */
  const makeConfirm = (
    target: FinanceInvoice | null,
    close: () => void,
    action: (id: number) => Promise<unknown>,
    doneText: string,
  ) => (): void => {
    if (!target) return;
    const targetId: number = target.id;
    void runAction(async () => {
      await action(targetId);
      return doneText;
    }, close);
  };

  const openCreate = (): void => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, invoiceDate: dayjs().format('YYYY-MM-DD') });
    setFormOpen(true);
  };

  const openEdit = (record: FinanceInvoice): void => {
    setEditingId(record.id);
    setForm({
      title: record.title, amount: String(record.amount), taxAmount: String(record.taxAmount),
      invoiceType: record.invoiceType, taxNumber: record.taxNumber, customerName: record.customerName,
      invoiceDate: dayjs(record.invoiceDate).format('YYYY-MM-DD'), remark: record.remark });
    setFormOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    const trimmedTitle: string = form.title.trim();
    const amount: number = Number(form.amount);
    const taxAmount: number = form.taxAmount.trim() === '' ? 0 : Number(form.taxAmount);
    if (!trimmedTitle) return void toast.error('请输入发票抬头');
    if (!Number.isFinite(amount) || amount <= 0) return void toast.error('金额必须为大于 0 的数字');
    if (!Number.isFinite(taxAmount) || taxAmount < 0) return void toast.error('税额不能为负数');
    if (!DATE_PATTERN.test(form.invoiceDate)) return void toast.error('开票日期格式应为 YYYY-MM-DD');
    const payload: CreateFinanceInvoiceRequest = {
      title: trimmedTitle, amount, taxAmount, invoiceType: form.invoiceType,
      taxNumber: form.taxNumber.trim() || undefined, customerName: form.customerName.trim() || undefined,
      invoiceDate: form.invoiceDate, remark: form.remark.trim() || undefined };
    const isEdit: boolean = editingId !== null;
    const editId: number = editingId ?? 0;
    setSaving(true);
    try {
      if (isEdit) await updateFinanceInvoice(editId, payload); else await createFinanceInvoice(payload);
      toast.success(isEdit ? '已保存' : '已新建发票');
      setFormOpen(false);
      setEditingId(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`保存发票失败: ${toFinanceErrorText(error)}`);
      toast.error(toFinanceErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  const selectedIds: number[] = selectedKeys.map((key: Key) => Number(key));
  const pickSelectedIds = (status: string): number[] =>
    items
      .filter((item: FinanceInvoice) => selectedIds.includes(item.id) && item.status === status)
      .map((item: FinanceInvoice) => item.id);
  const pendingIds: number[] = pickSelectedIds('待开具');
  const issuedIds: number[] = pickSelectedIds('已开具');

  const handleBatchIssue = (): void => {
    if (pendingIds.length === 0) return void toast.error('选中的发票中没有待开具的发票');
    const ids: number[] = pendingIds;
    void runAction(async () => {
      const result = await batchIssueFinanceInvoices(ids);
      return `已开具 ${result.issued} 张`;
    }, () => {});
  };

  /** 寄出（单张 / 批量共用）：快递单号必填非空 */
  const confirmSend = (ids: number[], rawExpressNo: string, isBatch: boolean): void => {
    const trimmed: string = rawExpressNo.trim();
    if (!trimmed) return void toast.error('请输入快递单号');
    void runAction(async () => {
      if (isBatch) {
        const result = await batchSendFinanceInvoices(ids, trimmed);
        return `已寄出 ${result.sent} 张`;
      }
      await sendFinanceInvoice(ids[0], { expressNo: trimmed });
      return '已寄出';
    }, isBatch
      ? () => {
        setBatchSendOpen(false);
        setBatchExpressNo('');
      }
      : () => setSendTarget(null));
  };

  const handleExport = async (): Promise<void> => {
    try {
      const rows: Record<string, string>[] = items.map((item: FinanceInvoice) => ({
        发票号码: item.invoiceNo, 发票类型: item.invoiceType, 发票抬头: item.title,
        税号: item.taxNumber, 客户名称: item.customerName, 金额: String(item.amount),
        税额: String(item.taxAmount), 价税合计: String(item.totalAmount),
        开票日期: dayjs(item.invoiceDate).format('YYYY-MM-DD'), 状态: item.status,
        开票人: item.drawer, 快递单号: item.expressNo, 备注: item.remark,
      }));
      const count: number = await exportRowsToExcel(rows, Object.keys(rows[0] ?? { 发票号码: '' }), '发票管理', '发票');
      toast.success(`已导出 ${count} 条发票`);
    } catch (error: unknown) {
      logger.error(`导出失败: ${toFinanceErrorText(error)}`);
      toast.error(`导出失败：${toFinanceErrorText(error)}`);
    }
  };

  const handleReset = (): void => {
    setDraftNo(''); setDraftTitle(''); setDraftCustomer('');
    setAppliedNo(''); setAppliedTitle(''); setAppliedCustomer('');
    setTypeFilter(FINANCE_FILTER_ALL); setStatusFilter(FINANCE_FILTER_ALL);
    setStartDate(''); setEndDate(''); setPage(1);
  };

  const previewAmount: number = Number(form.amount || '0');
  const previewTax: number = Number(form.taxAmount || '0');
  const previewTotal: number =
    (Number.isFinite(previewAmount) ? previewAmount : 0) + (Number.isFinite(previewTax) ? previewTax : 0);
  const startInvalid: boolean = startDate !== '' && !DATE_PATTERN.test(startDate);
  const endInvalid: boolean = endDate !== '' && !DATE_PATTERN.test(endDate);

  const renderActions = (_: unknown, record: FinanceInvoice): ReactNode => {
    const isPending: boolean = record.status === '待开具';
    const isIssued: boolean = record.status === '已开具';
    const isSent: boolean = record.status === '已寄出';
    return (
      <div className="flex flex-wrap items-center gap-1">
        <ActionBtn onClick={() => setDetail(record)}>查看</ActionBtn>
        {isPending && <ActionBtn onClick={() => openEdit(record)}>编辑</ActionBtn>}
        {isPending && <ActionBtn onClick={() => setIssueTarget(record)}>开具</ActionBtn>}
        {isIssued && <ActionBtn onClick={() => { setExpressNo(''); setSendTarget(record); }}>寄出</ActionBtn>}
        {isSent && <ActionBtn onClick={() => setReceiveTarget(record)}>收讫</ActionBtn>}
        {(isPending || isIssued || isSent) && <ActionBtn danger onClick={() => setVoidTarget(record)}>作废</ActionBtn>}
        {isPending && <ActionBtn danger onClick={() => setDeleteTarget(record)}>删除</ActionBtn>}
      </div>
    );
  };

  const moneyRender = (bold: boolean) => (value: number): ReactNode => (
    <span className={cn('font-mono', bold && 'font-bold')}>{formatFinanceAmount(value)}</span>
  );
  const textRender = (value: string): string => value || '-';

  const columns = useMemo<TableColumnsType<FinanceInvoice>>(() => [
    { title: '发票号码', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 150,
      render: (value: string): ReactNode => <span className="font-bold text-primary">{value}</span> },
    { title: '抬头', dataIndex: 'title', key: 'title', width: 170, ellipsis: true },
    { title: '税号', dataIndex: 'taxNumber', key: 'taxNumber', width: 150, render: textRender },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, align: 'right', render: moneyRender(false) },
    { title: '税额', dataIndex: 'taxAmount', key: 'taxAmount', width: 110, align: 'right', render: moneyRender(false) },
    { title: '价税合计', dataIndex: 'totalAmount', key: 'totalAmount', width: 130, align: 'right', render: moneyRender(true) },
    { title: '类型', dataIndex: 'invoiceType', key: 'invoiceType', width: 130 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 140, render: textRender },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (value: string): ReactNode => <FinanceStatusBadge status={value} /> },
    { title: '开票日期', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 110,
      render: (value: string): string => dayjs(value).format('YYYY-MM-DD') },
    { title: '操作', key: 'actions', fixed: 'right', width: 250, render: renderActions },
  ], []);

  const {
    visibleColumns, columnMetas, hiddenIds,
    toggleColumn, resetColumns, setAllColumns,
  } = useColumnSettings(columns);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <FinanceCoreTabs active="invoices" />
      <ReportCard>
        <SectionHeader no="05" label="INVOICE MANAGEMENT" subtitle="发票管理 / 开具 / 寄出 / 收讫 / 作废" />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input className="w-36 rounded-none" placeholder="发票号码" value={draftNo} onChange={textChange(setDraftNo)} />
          <Input className="w-36 rounded-none" placeholder="发票抬头" value={draftTitle} onChange={textChange(setDraftTitle)} />
          <Input className="w-36 rounded-none" placeholder="客户名称" value={draftCustomer} onChange={textChange(setDraftCustomer)} />
          <Select value={typeFilter} onValueChange={(value: string) => { setTypeFilter(value); setPage(1); }}>
            <SelectTrigger className="w-36 rounded-none"><SelectValue placeholder="发票类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={FINANCE_FILTER_ALL}>全部类型</SelectItem>
              {renderSelectOptions(INVOICE_TYPE_OPTIONS)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value: string) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={FINANCE_FILTER_ALL}>全部状态</SelectItem>
              {renderSelectOptions(INVOICE_STATUS_OPTIONS)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">开票日期</span>
            <Input className={cn('w-32 rounded-none', startInvalid && 'border-destructive')} placeholder="开始 YYYY-MM-DD"
              value={startDate} onChange={textChange((value: string) => { setStartDate(value); setPage(1); })} />
            <span className="text-xs text-muted-foreground">至</span>
            <Input className={cn('w-32 rounded-none', endInvalid && 'border-destructive')} placeholder="结束 YYYY-MM-DD"
              value={endDate} onChange={textChange((value: string) => { setEndDate(value); setPage(1); })} />
          </div>
          <Button variant="outline" onClick={handleReset}>重置</Button>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button data-ai-section-type="button" onClick={openCreate}><Plus className="h-4 w-4" />新建发票</Button>
            <Button variant="outline" disabled={pendingIds.length === 0} onClick={handleBatchIssue}>批量开具</Button>
            <Button variant="outline" disabled={issuedIds.length === 0}
              onClick={() => { setBatchExpressNo(''); setBatchSendOpen(true); }}>批量寄出</Button>
            <Button variant="outline" onClick={() => void handleExport()}><Download className="h-4 w-4" />导出Excel</Button>
            <ColumnSettingsButton
              columnMetas={columnMetas} hiddenIds={hiddenIds}
              onToggle={toggleColumn} onReset={resetColumns} onSetAll={setAllColumns}
            />
          </div>
          {selectedKeys.length > 0 && (
            <span className="text-xs text-muted-foreground">已选 {selectedKeys.length} 条（待开具 {pendingIds.length} / 已开具 {issuedIds.length}）</span>
          )}
        </div>
        <Table<FinanceInvoice>
          columns={visibleColumns} dataSource={items} loading={loading} rowKey="id" scroll={{ x: 1600, y: 500 }}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: (keys: Key[]) => setSelectedKeys(keys) }}
          pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: (nextPage: number) => setPage(nextPage) }}
        />
      </ReportCard>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-none sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{editingId !== null ? '编辑发票' : '新建发票'}</DialogTitle>
            <DialogDescription>价税合计由金额与税额自动计算</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <FinanceFormField label="发票抬头" required>
                <Input className="rounded-none" placeholder="请输入发票抬头" value={form.title} onChange={textChange(patchChange('title'))} />
              </FinanceFormField>
              <FinanceFormField label="发票类型">
                <Select value={form.invoiceType} onValueChange={patchChange('invoiceType')}>
                  <SelectTrigger className="rounded-none"><SelectValue placeholder="请选择类型" /></SelectTrigger>
                  <SelectContent>{renderSelectOptions(INVOICE_TYPE_OPTIONS)}</SelectContent>
                </Select>
              </FinanceFormField>
            </div>
            <div className="flex flex-wrap gap-4">
              <FinanceFormField label="金额" required>
                <Input className="rounded-none" type="number" placeholder="请输入金额" value={form.amount} onChange={textChange(patchChange('amount'))} />
              </FinanceFormField>
              <FinanceFormField label="税额">
                <Input className="rounded-none" type="number" placeholder="默认 0" value={form.taxAmount} onChange={textChange(patchChange('taxAmount'))} />
              </FinanceFormField>
              <FinanceFormField label="价税合计（预览）">
                <Input className="rounded-none bg-muted" readOnly value={formatFinanceAmount(previewTotal)} />
              </FinanceFormField>
            </div>
            <div className="flex flex-wrap gap-4">
              <FinanceFormField label="税号">
                <Input className="rounded-none" placeholder="请输入税号" value={form.taxNumber} onChange={textChange(patchChange('taxNumber'))} />
              </FinanceFormField>
              <FinanceFormField label="客户名称">
                <Input className="rounded-none" placeholder="请输入客户名称" value={form.customerName} onChange={textChange(patchChange('customerName'))} />
              </FinanceFormField>
              <FinanceFormField label="开票日期">
                <Input className="rounded-none" placeholder="YYYY-MM-DD" value={form.invoiceDate} onChange={textChange(patchChange('invoiceDate'))} />
              </FinanceFormField>
            </div>
            <FinanceFormField label="备注">
              <Textarea className="rounded-none" rows={2} placeholder="请输入备注" value={form.remark}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patchChange('remark')(event.target.value)} />
            </FinanceFormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button disabled={saving} onClick={() => void handleSave()}>{saving ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={detail !== null} onOpenChange={(open: boolean) => { if (!open) setDetail(null); }}>
        <DialogContent className="rounded-none sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">发票详情</DialogTitle>
            <DialogDescription>发票号码 {detail?.invoiceNo ?? ''}</DialogDescription>
          </DialogHeader>
          {detail !== null && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {buildDetailRows(detail).map(([label, value]: [string, string]) => (
                <div key={label} className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
                  <div className="break-words text-sm">{value}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={sendTarget !== null} onOpenChange={(open: boolean) => { if (!open) setSendTarget(null); }}>
        <DialogContent className="rounded-none sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>寄出发票</DialogTitle><DialogDescription>{sendTarget?.invoiceNo ?? ''}</DialogDescription>
          </DialogHeader>
          <FinanceFormField label="快递单号" required>
            <Input className="rounded-none" placeholder="请输入快递单号" value={expressNo} onChange={textChange(setExpressNo)} />
          </FinanceFormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendTarget(null)}>取消</Button>
            <Button onClick={() => sendTarget && confirmSend([sendTarget.id], expressNo, false)}>确认寄出</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={batchSendOpen} onOpenChange={setBatchSendOpen}>
        <DialogContent className="rounded-none sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>批量寄出</DialogTitle>
            <DialogDescription>已选 {issuedIds.length} 张已开具发票，使用同一快递单号寄出</DialogDescription>
          </DialogHeader>
          <FinanceFormField label="快递单号" required>
            <Input className="rounded-none" placeholder="请输入快递单号" value={batchExpressNo} onChange={textChange(setBatchExpressNo)} />
          </FinanceFormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchSendOpen(false)}>取消</Button>
            <Button onClick={() => confirmSend(issuedIds, batchExpressNo, true)}>确认寄出</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AdsConfirmDialog open={issueTarget !== null} title="确认开具？" confirmText="确认开具"
        description={`即将开具发票「${issueTarget?.invoiceNo ?? ''}」，开具后抬头与金额不可再编辑。`}
        onOpenChange={(open: boolean) => { if (!open) setIssueTarget(null); }}
        onConfirm={makeConfirm(issueTarget, () => setIssueTarget(null), issueFinanceInvoice, '已开具')} />
      <AdsConfirmDialog open={receiveTarget !== null} title="确认收讫？" confirmText="确认收讫"
        description={`即将确认收讫发票「${receiveTarget?.invoiceNo ?? ''}」。`}
        onOpenChange={(open: boolean) => { if (!open) setReceiveTarget(null); }}
        onConfirm={makeConfirm(receiveTarget, () => setReceiveTarget(null), receiveFinanceInvoice, '已收讫')} />
      <AdsConfirmDialog open={voidTarget !== null} title="确认作废该发票？" confirmText="确认作废" destructive
        description={`即将作废发票「${voidTarget?.invoiceNo ?? ''}」。作废后不可恢复，请谨慎操作。`}
        onOpenChange={(open: boolean) => { if (!open) setVoidTarget(null); }}
        onConfirm={makeConfirm(voidTarget, () => setVoidTarget(null), voidFinanceInvoice, '已作废')} />
      <AdsConfirmDialog open={deleteTarget !== null} title="确认删除？" confirmText="确认删除" destructive
        description={`即将删除发票「${deleteTarget?.invoiceNo ?? ''}」，删除后不可恢复。`}
        onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}
        onConfirm={makeConfirm(deleteTarget, () => setDeleteTarget(null), deleteFinanceInvoiceCore, '已删除')} />
    </div>
  );
}
