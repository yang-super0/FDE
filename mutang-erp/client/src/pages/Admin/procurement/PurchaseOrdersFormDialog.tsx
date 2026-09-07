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
  AdminPurchaseOrder, CreateAdminPurchaseOrderDto, UpdateAdminPurchaseOrderDto,
} from '@shared/api.interface';
import {
  createPurchaseOrder, shipPurchaseOrder, updatePurchaseOrder,
} from '@client/src/api/admin-enhance/purchase';
import { AdminFormField, ADMIN_ITEM_TYPE_OPTIONS } from '../admin-enhance-constants';
import {
  isPositiveIntText, isValidProcureDate, reportProcurementError,
} from './procurement-shared';

interface PurchaseOrderFormState {
  requestId: string;
  supplierName: string;
  itemName: string;
  itemType: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  orderDate: string;
  expectedDate: string;
  logisticsNo: string;
  remark: string;
}

interface PurchaseOrdersFormDialogProps {
  open: boolean;
  editing: AdminPurchaseOrder | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): PurchaseOrderFormState => ({
  requestId: '',
  supplierName: '',
  itemName: '',
  itemType: ADMIN_ITEM_TYPE_OPTIONS[0],
  quantity: '1',
  unit: '件',
  unitPrice: '',
  orderDate: '',
  expectedDate: '',
  logisticsNo: '',
  remark: '',
});

const buildFormFromItem = (item: AdminPurchaseOrder): PurchaseOrderFormState => ({
  requestId: item.requestId === null ? '' : String(item.requestId),
  supplierName: item.supplierName,
  itemName: item.itemName,
  itemType: item.itemType,
  quantity: String(item.quantity),
  unit: item.unit,
  unitPrice: String(item.unitPrice),
  orderDate: item.orderDate,
  expectedDate: item.expectedDate ?? '',
  logisticsNo: item.logisticsNo,
  remark: item.remark,
});

export function PurchaseOrdersFormDialog({
  open, editing, onSaved, onOpenChange,
}: PurchaseOrdersFormDialogProps) {
  const [form, setForm] = useState<PurchaseOrderFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof PurchaseOrderFormState>(
    key: K,
    value: PurchaseOrderFormState[K],
  ): void => setForm((prev: PurchaseOrderFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (form.requestId.trim() !== '' && !isPositiveIntText(form.requestId.trim())) {
      toast.error('关联申请 ID 必须为正整数');
      return;
    }
    if (!form.supplierName.trim()) { toast.error('请输入供应商'); return; }
    if (!form.itemName.trim()) { toast.error('请输入物品名称'); return; }
    if (!isPositiveIntText(form.quantity.trim())) {
      toast.error('数量必须为正整数');
      return;
    }
    const unitPrice: number = Number(form.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      toast.error('单价必须为大于 0 的数字');
      return;
    }
    if (!isValidProcureDate(form.orderDate.trim()) || form.orderDate.trim() === '') {
      toast.error('请输入正确的订单日期（YYYY-MM-DD）');
      return;
    }
    if (!isValidProcureDate(form.expectedDate.trim())) {
      toast.error('预计到货日期格式应为 YYYY-MM-DD');
      return;
    }
    setSubmitting(true);
    try {
      const requestId: number | null = form.requestId.trim() === ''
        ? null
        : Number(form.requestId.trim());
      const base = {
        requestId,
        supplierName: form.supplierName.trim(),
        itemName: form.itemName.trim(),
        itemType: form.itemType,
        quantity: Number(form.quantity.trim()),
        unit: form.unit.trim() || '件',
        unitPrice,
        orderDate: form.orderDate.trim(),
        expectedDate: form.expectedDate.trim() || null,
        logisticsNo: form.logisticsNo.trim(),
        remark: form.remark.trim(),
      };
      if (editing) {
        const body: UpdateAdminPurchaseOrderDto = base;
        await updatePurchaseOrder(editing.id, body);
        toast.success('采购订单已更新');
      } else {
        const body: CreateAdminPurchaseOrderDto = base;
        await createPurchaseOrder(body);
        toast.success('采购订单已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportProcurementError('保存采购订单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑采购订单' : '新建采购订单'}</DialogTitle>
          <DialogDescription>
            {editing
              ? `订单编号：${editing.orderNo}`
              : '填写采购订单；关联申请 ID 填写已通过的采购申请编号数字，可将该申请转为已采购'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminFormField label="关联申请 ID">
            <Input className="rounded-none" type="number" min="1" value={form.requestId}
              placeholder="从申请生成订单时填写"
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('requestId', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="供应商" required>
            <Input className="rounded-none" value={form.supplierName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('supplierName', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="物品名称" required>
            <Input className="rounded-none" value={form.itemName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('itemName', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="物品类型" required>
            <Select value={form.itemType} onValueChange={(value: string) => patch('itemType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="物品类型" /></SelectTrigger>
              <SelectContent>
                {ADMIN_ITEM_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="数量" required>
            <Input className="rounded-none" type="number" min="1" value={form.quantity}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('quantity', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="单位">
            <Input className="rounded-none" value={form.unit}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('unit', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="单价" required>
            <Input className="rounded-none" type="number" min="0.01" step="0.01" value={form.unitPrice}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('unitPrice', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="订单日期" required>
            <Input className="rounded-none" placeholder="YYYY-MM-DD" value={form.orderDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('orderDate', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="预计到货日期">
            <Input className="rounded-none" placeholder="YYYY-MM-DD" value={form.expectedDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('expectedDate', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="物流单号">
            <Input className="rounded-none" value={form.logisticsNo}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('logisticsNo', event.target.value)} />
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

/* ============ 发货弹窗：填写物流单号 ============ */

interface PurchaseShipDialogProps {
  open: boolean;
  target: AdminPurchaseOrder | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseShipDialog({
  open, target, onSaved, onOpenChange,
}: PurchaseShipDialogProps) {
  const [logisticsNo, setLogisticsNo] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setLogisticsNo(target?.logisticsNo ?? '');
  }, [open, target]);

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    if (logisticsNo.trim() === '') {
      toast.error('请填写物流单号');
      return;
    }
    setSubmitting(true);
    try {
      await shipPurchaseOrder(target.id, { logisticsNo: logisticsNo.trim() });
      toast.success('采购订单已发货');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportProcurementError('发货失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>订单发货</DialogTitle>
          <DialogDescription>
            {target ? `订单 ${target.orderNo} · ${target.itemName} · 数量 ${target.quantity}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            物流单号 <span className="text-destructive">*</span>
          </label>
          <Input className="rounded-none" value={logisticsNo}
            placeholder="请填写物流单号"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setLogisticsNo(event.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '确认发货'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
