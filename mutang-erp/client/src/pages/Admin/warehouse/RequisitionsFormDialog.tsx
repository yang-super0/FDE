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
  AdminRequisition, CreateAdminRequisitionDto, UpdateAdminRequisitionDto,
} from '@shared/api.interface';
import {
  createRequisition, updateRequisition,
} from '@client/src/api/admin-enhance/warehouse';
import { ADMIN_ITEM_TYPE_OPTIONS, AdminFormField } from '../admin-enhance-constants';
import {
  formatWarehouseDate, reportWarehouseError, WarehouseDatePicker,
} from './warehouse-shared';

interface RequisitionsFormState {
  applicant: string;
  department: string;
  itemName: string;
  itemType: string;
  specification: string;
  quantity: string;
  unit: string;
  purpose: string;
  expectedReturnDate: Date | undefined;
  remark: string;
}

interface RequisitionsFormDialogProps {
  open: boolean;
  editing: AdminRequisition | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): RequisitionsFormState => ({
  applicant: '',
  department: '',
  itemName: '',
  itemType: ADMIN_ITEM_TYPE_OPTIONS[0],
  specification: '',
  quantity: '1',
  unit: '',
  purpose: '',
  expectedReturnDate: undefined,
  remark: '',
});

const buildFormFromItem = (item: AdminRequisition): RequisitionsFormState => ({
  applicant: item.applicant,
  department: item.department,
  itemName: item.itemName,
  itemType: item.itemType || ADMIN_ITEM_TYPE_OPTIONS[0],
  specification: item.specification ?? '',
  quantity: String(item.quantity ?? 0),
  unit: item.unit ?? '',
  purpose: item.purpose ?? '',
  expectedReturnDate: item.expectedReturnDate ? new Date(item.expectedReturnDate) : undefined,
  remark: item.remark ?? '',
});

export function RequisitionsFormDialog({
  open, editing, onSaved, onOpenChange,
}: RequisitionsFormDialogProps) {
  const [form, setForm] = useState<RequisitionsFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof RequisitionsFormState>(
    key: K,
    value: RequisitionsFormState[K],
  ): void => setForm((prev: RequisitionsFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.applicant.trim()) { toast.error('请输入申请人'); return; }
    if (!form.department.trim()) { toast.error('请输入部门'); return; }
    if (!form.itemName.trim()) { toast.error('请输入物品名称'); return; }
    if (!form.purpose.trim()) { toast.error('请输入用途'); return; }
    const quantity: number = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('数量必须为大于 0 的数字');
      return;
    }
    setSubmitting(true);
    try {
      const base = {
        applicant: form.applicant.trim(),
        department: form.department.trim(),
        itemName: form.itemName.trim(),
        itemType: form.itemType,
        specification: form.specification.trim(),
        quantity,
        unit: form.unit.trim(),
        purpose: form.purpose.trim(),
        expectedReturnDate: form.expectedReturnDate
          ? formatWarehouseDate(form.expectedReturnDate.toISOString())
          : null,
        remark: form.remark.trim(),
      };
      if (editing) {
        const body: UpdateAdminRequisitionDto = base;
        await updateRequisition(editing.id, body);
        toast.success('领用单已更新');
      } else {
        const body: CreateAdminRequisitionDto = base;
        await createRequisition(body);
        toast.success('领用单已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportWarehouseError('保存领用单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑领用单' : '新建领用单'}</DialogTitle>
          <DialogDescription>
            {editing ? `领用单号：${editing.requisitionNo}` : '登记一笔物品领用申请'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminFormField label="申请人" required>
            <Input className="rounded-none" value={form.applicant}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('applicant', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="部门" required>
            <Input className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('department', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="物品名称" required>
            <Input className="rounded-none" value={form.itemName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('itemName', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="物品类型">
            <Select value={form.itemType} onValueChange={(value: string) => patch('itemType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="物品类型" /></SelectTrigger>
              <SelectContent>
                {ADMIN_ITEM_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="规格">
            <Input className="rounded-none" value={form.specification}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('specification', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="数量" required>
            <Input className="rounded-none" type="number" min="1" value={form.quantity}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('quantity', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="单位">
            <Input className="rounded-none" placeholder="如：个 / 盒" value={form.unit}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('unit', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="预计归还日期">
            <WarehouseDatePicker
              value={form.expectedReturnDate} placeholder="选填" full
              onChange={(value: Date | undefined) => patch('expectedReturnDate', value)}
            />
          </AdminFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              用途 <span className="text-destructive">*</span>
            </label>
            <Textarea className="rounded-none" rows={3} value={form.purpose}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                patch('purpose', event.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                patch('remark', event.target.value)} />
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
