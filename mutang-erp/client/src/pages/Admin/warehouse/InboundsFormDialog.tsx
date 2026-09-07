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
  AdminInbound, CreateAdminInboundDto, UpdateAdminInboundDto,
} from '@shared/api.interface';
import { createInbound, updateInbound } from '@client/src/api/admin-enhance/warehouse';
import {
  ADMIN_ITEM_TYPE_OPTIONS, AdminFormField,
} from '../admin-enhance-constants';
import { reportWarehouseError } from './warehouse-shared';

interface InboundsFormState {
  purchaseOrderId: string;
  itemName: string;
  itemType: string;
  specification: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  supplierName: string;
  remark: string;
}

interface InboundsFormDialogProps {
  open: boolean;
  editing: AdminInbound | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): InboundsFormState => ({
  purchaseOrderId: '',
  itemName: '',
  itemType: ADMIN_ITEM_TYPE_OPTIONS[0],
  specification: '',
  quantity: '1',
  unit: '',
  unitPrice: '0',
  supplierName: '',
  remark: '',
});

const buildFormFromItem = (item: AdminInbound): InboundsFormState => ({
  purchaseOrderId: item.purchaseOrderId != null ? String(item.purchaseOrderId) : '',
  itemName: item.itemName,
  itemType: item.itemType || ADMIN_ITEM_TYPE_OPTIONS[0],
  specification: item.specification ?? '',
  quantity: String(item.quantity ?? 0),
  unit: item.unit ?? '',
  unitPrice: String(item.unitPrice ?? 0),
  supplierName: item.supplierName ?? '',
  remark: item.remark ?? '',
});

export function InboundsFormDialog({
  open, editing, onSaved, onOpenChange,
}: InboundsFormDialogProps) {
  const [form, setForm] = useState<InboundsFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof InboundsFormState>(
    key: K,
    value: InboundsFormState[K],
  ): void => setForm((prev: InboundsFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.itemName.trim()) { toast.error('请输入物品名称'); return; }
    const quantity: number = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('数量必须为大于 0 的数字');
      return;
    }
    const unitPrice: number = Number(form.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error('单价必须为不小于 0 的数字');
      return;
    }
    const purchaseOrderId: number | null = form.purchaseOrderId.trim()
      ? Number(form.purchaseOrderId)
      : null;
    if (purchaseOrderId != null && !Number.isInteger(purchaseOrderId)) {
      toast.error('关联采购单 ID 必须为整数');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateAdminInboundDto = {
          purchaseOrderId,
          itemName: form.itemName.trim(),
          itemType: form.itemType,
          specification: form.specification.trim(),
          quantity,
          unit: form.unit.trim(),
          unitPrice,
          supplierName: form.supplierName.trim(),
          remark: form.remark.trim(),
        };
        await updateInbound(editing.id, body);
        toast.success('入库单已更新');
      } else {
        const body: CreateAdminInboundDto = {
          purchaseOrderId,
          itemName: form.itemName.trim(),
          itemType: form.itemType,
          specification: form.specification.trim(),
          quantity,
          unit: form.unit.trim(),
          unitPrice,
          supplierName: form.supplierName.trim(),
          remark: form.remark.trim(),
        };
        await createInbound(body);
        toast.success('入库单已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportWarehouseError('保存入库单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑入库单' : '新建入库单'}</DialogTitle>
          <DialogDescription>
            {editing ? `入库单号：${editing.inboundNo}` : '登记一笔物品入库（可选择关联采购单）'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminFormField label="关联采购单ID">
            <Input className="rounded-none" placeholder="选填" value={form.purchaseOrderId}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('purchaseOrderId', event.target.value)} />
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
          <AdminFormField label="单价（元）">
            <Input className="rounded-none" type="number" min="0" value={form.unitPrice}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('unitPrice', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="供应商">
            <Input className="rounded-none" value={form.supplierName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('supplierName', event.target.value)} />
          </AdminFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea className="rounded-none" rows={3} value={form.remark}
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
