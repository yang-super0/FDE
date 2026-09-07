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
  AdminInventoryItem, CreateAdminInventoryItemDto, UpdateAdminInventoryItemDto,
} from '@shared/api.interface';
import {
  createInventoryItem, updateInventoryItem,
} from '@client/src/api/admin-enhance/asset-inventory';
import {
  AdminFormField, ADMIN_INVENTORY_STATUS_OPTIONS, ADMIN_ITEM_TYPE_OPTIONS,
} from '../admin-enhance-constants';
import { reportAssetInventoryError } from './asset-inventory-shared';

interface InventoryFormState {
  itemName: string;
  itemType: string;
  specification: string;
  unit: string;
  quantity: string;
  minStock: string;
  maxStock: string;
  location: string;
  status: string;
  remark: string;
}

interface InventoryFormDialogProps {
  open: boolean;
  editing: AdminInventoryItem | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): InventoryFormState => ({
  itemName: '',
  itemType: ADMIN_ITEM_TYPE_OPTIONS[0],
  specification: '',
  unit: '',
  quantity: '0',
  minStock: '0',
  maxStock: '0',
  location: '',
  status: ADMIN_INVENTORY_STATUS_OPTIONS[0],
  remark: '',
});

const buildFormFromItem = (item: AdminInventoryItem): InventoryFormState => ({
  itemName: item.itemName,
  itemType: item.itemType || ADMIN_ITEM_TYPE_OPTIONS[0],
  specification: item.specification,
  unit: item.unit,
  quantity: String(item.quantity ?? 0),
  minStock: String(item.minStock ?? 0),
  maxStock: String(item.maxStock ?? 0),
  location: item.location,
  status: item.status || ADMIN_INVENTORY_STATUS_OPTIONS[0],
  remark: item.remark,
});

const parseNonNegative = (value: string, label: string): number | null => {
  const num: number = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    toast.error(`${label}必须为不小于 0 的数字`);
    return null;
  }
  return num;
};

export function InventoryFormDialog({
  open, editing, onSaved, onOpenChange,
}: InventoryFormDialogProps) {
  const [form, setForm] = useState<InventoryFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof InventoryFormState>(
    key: K,
    value: InventoryFormState[K],
  ): void => setForm((prev: InventoryFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.itemName.trim()) { toast.error('请输入物品名称'); return; }
    if (!form.location.trim()) { toast.error('请输入存放地点'); return; }
    const quantity: number | null = parseNonNegative(form.quantity, '库存数量');
    if (quantity === null) return;
    const minStock: number | null = parseNonNegative(form.minStock, '最低库存');
    if (minStock === null) return;
    const maxStock: number | null = parseNonNegative(form.maxStock, '最高库存');
    if (maxStock === null) return;
    if (maxStock < minStock) {
      toast.error('最高库存不能低于最低库存');
      return;
    }
    setSubmitting(true);
    try {
      const common = {
        itemName: form.itemName.trim(),
        itemType: form.itemType,
        specification: form.specification.trim(),
        unit: form.unit.trim(),
        quantity,
        minStock,
        maxStock,
        location: form.location.trim(),
        status: form.status,
        remark: form.remark.trim(),
      };
      if (editing) {
        const body: UpdateAdminInventoryItemDto = common;
        await updateInventoryItem(editing.id, body);
        toast.success('库存物品已更新');
      } else {
        const body: CreateAdminInventoryItemDto = common;
        await createInventoryItem(body);
        toast.success('库存物品已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportAssetInventoryError('保存库存物品失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑库存物品' : '新建库存物品'}</DialogTitle>
          <DialogDescription>
            {editing ? `库存编号：${editing.inventoryNo}` : '登记一条物资库存记录'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminFormField label="物品名称" required>
            <Input className="rounded-none" value={form.itemName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('itemName', event.target.value)} />
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
          <AdminFormField label="规格型号">
            <Input className="rounded-none" value={form.specification}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('specification', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="单位">
            <Input className="rounded-none" placeholder="如：件 / 盒 / 箱" value={form.unit}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('unit', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="库存数量" required>
            <Input className="rounded-none" type="number" min="0" value={form.quantity}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('quantity', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="存放地点" required>
            <Input className="rounded-none" value={form.location}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('location', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="最低库存">
            <Input className="rounded-none" type="number" min="0" value={form.minStock}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('minStock', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="最高库存">
            <Input className="rounded-none" type="number" min="0" value={form.maxStock}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('maxStock', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="状态">
            <Select value={form.status} onValueChange={(value: string) => patch('status', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                {ADMIN_INVENTORY_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AdminFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea className="rounded-none" rows={3} value={form.remark}
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
