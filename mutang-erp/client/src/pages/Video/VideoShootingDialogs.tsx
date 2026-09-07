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
import type { ShootingExpense, VideoCoreProject } from '@shared/api.interface';
import {
  batchApproveShootingExpenses, createShootingExpense, updateShootingExpense,
} from '@client/src/api/video-core/shooting';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import {
  EXPENSE_TYPE_OPTIONS, formatVideoAmount, INVOICE_STATUS_OPTIONS,
  toVideoErrorText, VideoFormField, VideoStatusBadge,
} from './video-constants';

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

/* ============ 新建 / 编辑费用 ============ */

interface ExpenseFormState {
  projectId: string;
  expenseType: string;
  expenseCategory: string;
  amount: string;
  expenseDate: Date;
  invoiceStatus: string;
  remark: string;
}

const buildEmptyForm = (): ExpenseFormState => ({
  projectId: '', expenseType: EXPENSE_TYPE_OPTIONS[0], expenseCategory: '',
  amount: '', expenseDate: new Date(), invoiceStatus: INVOICE_STATUS_OPTIONS[0], remark: '',
});

interface ShootingFormDialogProps {
  open: boolean;
  editing: ShootingExpense | null;
  projects: VideoCoreProject[];
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ShootingFormDialog({
  open, editing, projects, onSaved, onOpenChange,
}: ShootingFormDialogProps) {
  const [form, setForm] = useState<ExpenseFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        projectId: editing.projectId === null ? '' : String(editing.projectId),
        expenseType: editing.expenseType,
        expenseCategory: editing.expenseCategory,
        amount: String(editing.amount),
        expenseDate: editing.expenseDate ? new Date(editing.expenseDate) : new Date(),
        invoiceStatus: editing.invoiceStatus || INVOICE_STATUS_OPTIONS[0],
        remark: editing.remark,
      });
    } else setForm(buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof ExpenseFormState>(key: K, value: ExpenseFormState[K]): void =>
    setForm((prev: ExpenseFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!editing && !form.projectId) { toast.error('请选择关联项目'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('金额必须为大于 0 的数字'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await updateShootingExpense(editing.id, {
          expenseType: form.expenseType,
          expenseCategory: form.expenseCategory.trim() || undefined,
          amount,
          expenseDate: dayjs(form.expenseDate).format('YYYY-MM-DD'),
          invoiceStatus: form.invoiceStatus,
          remark: form.remark.trim() || undefined,
        });
        toast.success('费用单已更新');
      } else {
        await createShootingExpense({
          projectId: Number(form.projectId),
          expenseType: form.expenseType,
          expenseCategory: form.expenseCategory.trim() || undefined,
          amount,
          expenseDate: dayjs(form.expenseDate).format('YYYY-MM-DD'),
          invoiceStatus: form.invoiceStatus,
          remark: form.remark.trim() || undefined,
        });
        toast.success('费用单已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存费用单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑费用单' : '新建费用单'}</DialogTitle>
          <DialogDescription>
            {editing ? `费用单号：${editing.expenseNo}` : '登记一笔拍摄费用'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <VideoFormField label="关联项目" required>
            <Select value={form.projectId} disabled={editing !== null}
              onValueChange={(value: string) => patch('projectId', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="关联项目" /></SelectTrigger>
              <SelectContent>
                {projects.map((project: VideoCoreProject) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {`${project.projectNo} ${project.projectName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
          <VideoFormField label="费用类型" required>
            <Select value={form.expenseType} onValueChange={(value: string) => patch('expenseType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="费用类型" /></SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
          <VideoFormField label="费用分类">
            <Input className="rounded-none" value={form.expenseCategory}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('expenseCategory', event.target.value)} />
          </VideoFormField>
          <VideoFormField label="金额" required>
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </VideoFormField>
          <VideoFormField label="费用日期">
            <AdsDatePickerButton value={form.expenseDate} placeholder="费用日期"
              onChange={(date: Date | undefined) => { if (date) patch('expenseDate', date); }} />
          </VideoFormField>
          <VideoFormField label="发票状态">
            <Select value={form.invoiceStatus} onValueChange={(value: string) => patch('invoiceStatus', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="发票状态" /></SelectTrigger>
              <SelectContent>
                {INVOICE_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
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

/* ============ 审批（通过 / 驳回，驳回原因必填） ============ */

interface ShootingApproveDialogProps {
  open: boolean;
  ids: number[];
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ShootingApproveDialog({ open, ids, onDone, onOpenChange }: ShootingApproveDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => { if (open) setReason(''); }, [open]);

  const handle = async (approved: boolean): Promise<void> => {
    if (!approved && !reason.trim()) { toast.error('驳回时必须填写驳回原因'); return; }
    setSubmitting(true);
    try {
      await batchApproveShootingExpenses({
        ids, approved, rejectReason: approved ? undefined : reason.trim(),
      });
      toast.success(approved ? `已通过 ${ids.length} 条费用单` : `已驳回 ${ids.length} 条费用单`);
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('审批费用单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>费用审批</DialogTitle>
          <DialogDescription>共 {ids.length} 条费用单待处理，请选择通过或驳回</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">驳回原因（驳回时必填）</label>
          <Textarea className="rounded-none" rows={3} value={reason}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="outline" disabled={submitting} className="border-destructive text-destructive"
            onClick={() => void handle(false)}>
            驳回
          </Button>
          <Button disabled={submitting} onClick={() => void handle(true)}>通过</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ 费用详情 ============ */

interface ShootingDetailDialogProps {
  open: boolean;
  expense: ShootingExpense | null;
  onOpenChange: (open: boolean) => void;
}

export function ShootingDetailDialog({ open, expense, onOpenChange }: ShootingDetailDialogProps) {
  const detailRows: Array<[string, ReactNode]> = expense ? [
    ['费用单号', expense.expenseNo],
    ['关联项目号', expense.projectNo],
    ['费用类型', expense.expenseType],
    ['费用分类', expense.expenseCategory],
    ['金额', formatVideoAmount(expense.amount)],
    ['费用日期', expense.expenseDate],
    ['申请人', expense.applicant],
    ['状态', <VideoStatusBadge key="status" status={expense.status} />],
    ['审批人', expense.approver],
    ['审批时间', expense.approvedAt ? dayjs(expense.approvedAt).format('YYYY-MM-DD HH:mm') : ''],
    ['驳回原因', expense.rejectReason],
    ['发票状态', expense.invoiceStatus],
    ['备注', expense.remark],
    ['创建时间', dayjs(expense.createdAt).format('YYYY-MM-DD HH:mm')],
  ] : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>费用详情</DialogTitle>
          <DialogDescription>{expense?.expenseNo ?? ''}</DialogDescription>
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
