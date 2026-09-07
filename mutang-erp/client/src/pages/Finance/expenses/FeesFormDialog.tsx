import { useEffect, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
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
import type { FinanceFee } from '@shared/api.interface';
import { createFinanceFee, updateFinanceFee, type UpdateFinanceFeeBody } from '@client/src/api/finance-enhance/expenses';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { FinanceFormField } from '../finance-constants';
import { reportError } from './expenses-shared';

export const FEE_TYPE_OPTIONS: string[] = ['交通费', '住宿费', '餐饮费', '通讯费', '其他'];

interface FeeFormDialogProps {
  open: boolean; editing: FinanceFee | null;
  onSaved: () => void; onOpenChange: (open: boolean) => void;
}

interface FeeFormState {
  feeType: string; applicant: string; department: string; amount: string;
  expenseDate: Date | undefined; invoiceNo: string; attachmentUrl: string; remark: string;
}

const buildEmptyForm = (): FeeFormState => ({
  feeType: FEE_TYPE_OPTIONS[0], applicant: '', department: '', amount: '',
  expenseDate: new Date(), invoiceNo: '', attachmentUrl: '', remark: '',
});

const buildFormFromItem = (item: FinanceFee): FeeFormState => ({
  feeType: item.feeType, applicant: item.applicant, department: item.department,
  amount: String(item.amount),
  expenseDate: item.expenseDate ? new Date(item.expenseDate) : new Date(),
  invoiceNo: item.invoiceNo, attachmentUrl: item.attachmentUrl, remark: item.remark,
});

export function FeeFormDialog({ open, editing, onSaved, onOpenChange }: FeeFormDialogProps) {
  const [form, setForm] = useState<FeeFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);
  const patch = <K extends keyof FeeFormState>(key: K, value: FeeFormState[K]): void =>
    setForm((prev: FeeFormState) => ({ ...prev, [key]: value }));
  const handleSubmit = async (): Promise<void> => {
    if (!form.applicant.trim()) { toast.error('请输入申请人'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('金额必须为大于 0 的数字'); return; }
    const expenseDate: string = form.expenseDate
      ? dayjs(form.expenseDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateFinanceFeeBody = {
          feeType: form.feeType,
          applicant: form.applicant.trim(),
          department: form.department.trim() || undefined,
          amount,
          expenseDate,
          invoiceNo: form.invoiceNo.trim() || undefined,
          attachmentUrl: form.attachmentUrl.trim() || undefined,
          remark: form.remark.trim() || undefined,
        };
        await updateFinanceFee(editing.id, body);
        toast.success('费用已更新');
      } else {
        await createFinanceFee({
          feeType: form.feeType,
          applicant: form.applicant.trim(),
          department: form.department.trim() || undefined,
          amount,
          expenseDate,
          invoiceNo: form.invoiceNo.trim() || undefined,
          attachmentUrl: form.attachmentUrl.trim() || undefined,
          remark: form.remark.trim() || undefined,
        });
        toast.success('费用已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存费用失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑费用' : '新建费用'}</DialogTitle>
          <DialogDescription>
            {editing ? `费用单号：${editing.feeNo}` : '登记一笔新的费用报销记录'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="费用类型">
            <Select value={form.feeType} onValueChange={(value: string) => patch('feeType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="费用类型" /></SelectTrigger>
              <SelectContent>
                {FEE_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="申请人" required>
            <Input className="rounded-none" value={form.applicant}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('applicant', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="部门">
            <Input className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('department', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="金额" required>
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="费用日期" required>
            <AdsDatePickerButton value={form.expenseDate} placeholder="费用日期"
              onChange={(date: Date | undefined) => { if (date) patch('expenseDate', date); }} />
          </FinanceFormField>
          <FinanceFormField label="发票号">
            <Input className="rounded-none" value={form.invoiceNo}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('invoiceNo', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="附件地址">
            <Input className="rounded-none" value={form.attachmentUrl}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('attachmentUrl', event.target.value)} />
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
