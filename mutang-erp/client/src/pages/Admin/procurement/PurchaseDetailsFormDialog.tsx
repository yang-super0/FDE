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
  AdminPurchaseDetail, CreateAdminPurchaseDetailDto, UpdateAdminPurchaseDetailDto,
} from '@shared/api.interface';
import {
  createPurchaseDetail, receivePurchaseDetail, updatePurchaseDetail,
} from '@client/src/api/admin-enhance/purchase';
import {
  AdminFormField, ADMIN_QUALITY_CHECK_OPTIONS,
} from '../admin-enhance-constants';
import { isPositiveIntText, reportProcurementError } from './procurement-shared';

interface PurchaseDetailFormState {
  orderId: string;
  itemName: string;
  specification: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  remark: string;
}

interface PurchaseDetailsFormDialogProps {
  open: boolean;
  editing: AdminPurchaseDetail | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): PurchaseDetailFormState => ({
  orderId: '',
  itemName: '',
  specification: '',
  quantity: '1',
  unit: '件',
  unitPrice: '',
  remark: '',
});

const buildFormFromItem = (item: AdminPurchaseDetail): PurchaseDetailFormState => ({
  orderId: String(item.orderId),
  itemName: item.itemName,
  specification: item.specification,
  quantity: String(item.quantity),
  unit: item.unit,
  unitPrice: String(item.unitPrice),
  remark: item.remark,
});

export function PurchaseDetailsFormDialog({
  open, editing, onSaved, onOpenChange,
}: PurchaseDetailsFormDialogProps) {
  const [form, setForm] = useState<PurchaseDetailFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof PurchaseDetailFormState>(
    key: K,
    value: PurchaseDetailFormState[K],
  ): void => setForm((prev: PurchaseDetailFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!isPositiveIntText(form.orderId.trim())) {
      toast.error('订单 ID 必须为正整数');
      return;
    }
    if (!form.itemName.trim()) { toast.error('请输入物品名称'); return; }
    if (!isPositiveIntText(form.quantity.trim())) {
      toast.error('数量必须为正整数');
      return;
    }
    const unitPrice: number = Number(form.unitPrice);
    if (form.unitPrice.trim() !== '' && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      toast.error('单价必须为不小于 0 的数字');
      return;
    }
    setSubmitting(true);
    try {
      const base = {
        orderId: Number(form.orderId.trim()),
        itemName: form.itemName.trim(),
        specification: form.specification.trim(),
        quantity: Number(form.quantity.trim()),
        unit: form.unit.trim() || '件',
        unitPrice: form.unitPrice.trim() === '' ? undefined : unitPrice,
        remark: form.remark.trim(),
      };
      if (editing) {
        const body: UpdateAdminPurchaseDetailDto = base;
        await updatePurchaseDetail(editing.id, body);
        toast.success('采购明细已更新');
      } else {
        const body: CreateAdminPurchaseDetailDto = base;
        await createPurchaseDetail(body);
        toast.success('采购明细已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportProcurementError('保存采购明细失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑采购明细' : '新建采购明细'}</DialogTitle>
          <DialogDescription>
            {editing ? `明细编号：${editing.detailNo}` : '为未取消的采购订单登记采购明细'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminFormField label="订单 ID" required>
            <Input className="rounded-none" type="number" min="1" value={form.orderId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('orderId', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="物品名称" required>
            <Input className="rounded-none" value={form.itemName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('itemName', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="规格">
            <Input className="rounded-none" value={form.specification}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('specification', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="数量" required>
            <Input className="rounded-none" type="number" min="1" value={form.quantity}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('quantity', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="单位">
            <Input className="rounded-none" value={form.unit}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('unit', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="单价">
            <Input className="rounded-none" type="number" min="0" step="0.01" value={form.unitPrice}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('unitPrice', event.target.value)} />
          </AdminFormField>
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

/* ============ 收货登记弹窗：收货数量 + 质检结果 ============ */

interface PurchaseReceiveDialogProps {
  open: boolean;
  target: AdminPurchaseDetail | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseReceiveDialog({
  open, target, onSaved, onOpenChange,
}: PurchaseReceiveDialogProps) {
  const [receivedQuantity, setReceivedQuantity] = useState<string>('0');
  const [qualityCheck, setQualityCheck] = useState<string>(ADMIN_QUALITY_CHECK_OPTIONS[2]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !target) return;
    setReceivedQuantity(String(target.quantity));
    setQualityCheck(ADMIN_QUALITY_CHECK_OPTIONS[2]);
  }, [open, target]);

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    if (!isPositiveIntText(receivedQuantity.trim())) {
      toast.error('收货数量必须为正整数');
      return;
    }
    const quantity: number = Number(receivedQuantity.trim());
    if (target && quantity > target.quantity) {
      toast.error('收货数量不能超过采购数量');
      return;
    }
    setSubmitting(true);
    try {
      await receivePurchaseDetail(target.id, {
        receivedQuantity: quantity, qualityCheck,
      });
      toast.success('收货登记已完成');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportProcurementError('收货登记失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>收货登记</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.detailNo} · ${target.itemName} · 采购数量 ${target.quantity} ${target.unit}，已收 ${target.receivedQuantity}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4">
          <AdminFormField label="收货数量" required>
            <Input className="rounded-none" type="number" min="1" value={receivedQuantity}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setReceivedQuantity(event.target.value)} />
          </AdminFormField>
          <AdminFormField label="质检结果" required>
            <Select value={qualityCheck} onValueChange={(value: string) => setQualityCheck(value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="质检结果" /></SelectTrigger>
              <SelectContent>
                {ADMIN_QUALITY_CHECK_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AdminFormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '确认收货'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
