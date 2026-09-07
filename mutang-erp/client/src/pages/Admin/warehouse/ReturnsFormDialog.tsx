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
  AdminReturnRecord, CreateAdminReturnRecordDto, UpdateAdminReturnRecordDto,
} from '@shared/api.interface';
import { createReturn, updateReturn } from '@client/src/api/admin-enhance/warehouse';
import {
  ADMIN_RETURN_CONDITION_OPTIONS, AdminFormField,
} from '../admin-enhance-constants';
import {
  formatWarehouseDate, reportWarehouseError, WarehouseDatePicker,
} from './warehouse-shared';

interface ReturnsFormState {
  requisitionId: string;
  quantity: string;
  condition: string;
  returnDate: Date | undefined;
  damageRemark: string;
  remark: string;
}

interface ReturnsFormDialogProps {
  open: boolean;
  editing: AdminReturnRecord | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): ReturnsFormState => ({
  requisitionId: '',
  quantity: '1',
  condition: ADMIN_RETURN_CONDITION_OPTIONS[0],
  returnDate: undefined,
  damageRemark: '',
  remark: '',
});

const buildFormFromItem = (item: AdminReturnRecord): ReturnsFormState => ({
  requisitionId: String(item.requisitionId),
  quantity: String(item.quantity ?? 0),
  condition: item.condition || ADMIN_RETURN_CONDITION_OPTIONS[0],
  returnDate: item.returnDate ? new Date(item.returnDate) : undefined,
  damageRemark: item.damageRemark ?? '',
  remark: item.remark ?? '',
});

export function ReturnsFormDialog({
  open, editing, onSaved, onOpenChange,
}: ReturnsFormDialogProps) {
  const [form, setForm] = useState<ReturnsFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof ReturnsFormState>(
    key: K,
    value: ReturnsFormState[K],
  ): void => setForm((prev: ReturnsFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    const requisitionId: number = Number(form.requisitionId);
    if (!form.requisitionId.trim() || !Number.isInteger(requisitionId)) {
      toast.error('请输入有效的领用单 ID（整数）');
      return;
    }
    const quantity: number = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('归还数量必须为大于 0 的数字');
      return;
    }
    if (form.condition === '损坏' && !form.damageRemark.trim()) {
      toast.error('物品状况为损坏时请填写损坏说明');
      return;
    }
    setSubmitting(true);
    try {
      const base = {
        requisitionId,
        quantity,
        condition: form.condition,
        returnDate: form.returnDate
          ? formatWarehouseDate(form.returnDate.toISOString())
          : undefined,
        damageRemark: form.damageRemark.trim(),
        remark: form.remark.trim(),
      };
      if (editing) {
        const body: UpdateAdminReturnRecordDto = base;
        await updateReturn(editing.id, body);
        toast.success('归还单已更新');
      } else {
        const body: CreateAdminReturnRecordDto = base;
        await createReturn(body);
        toast.success('归还单已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportWarehouseError('保存归还单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑归还单' : '新建归还单'}</DialogTitle>
          <DialogDescription>
            {editing
              ? `归还单号：${editing.returnNo}`
              : '根据领用单登记物品归还，物品名称、规格、单位等信息将根据领用单自动带出'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminFormField label="领用单 ID" required>
            <Input className="rounded-none" placeholder="必填，整数" value={form.requisitionId}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('requisitionId', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="归还数量" required>
            <Input className="rounded-none" type="number" min="1" value={form.quantity}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('quantity', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="物品状况">
            <Select value={form.condition} onValueChange={(value: string) => patch('condition', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="物品状况" /></SelectTrigger>
              <SelectContent>
                {ADMIN_RETURN_CONDITION_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="归还日期">
            <WarehouseDatePicker
              value={form.returnDate} placeholder="选填" full
              onChange={(value: Date | undefined) => patch('returnDate', value)}
            />
          </AdminFormField>
          {form.condition === '损坏' ? (
            <AdminFormField label="损坏说明" required>
              <Input className="rounded-none" value={form.damageRemark}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  patch('damageRemark', event.target.value)} />
            </AdminFormField>
          ) : null}
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
