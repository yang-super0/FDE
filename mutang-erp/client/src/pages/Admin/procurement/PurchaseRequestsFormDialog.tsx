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
  AdminPurchaseRequest, CreateAdminPurchaseRequestDto, UpdateAdminPurchaseRequestDto,
} from '@shared/api.interface';
import {
  approvePurchaseRequest, createPurchaseRequest, updatePurchaseRequest,
} from '@client/src/api/admin-enhance/purchase';
import {
  AdminFormField, ADMIN_ITEM_TYPE_OPTIONS,
} from '../admin-enhance-constants';
import { isPositiveIntText, reportProcurementError } from './procurement-shared';

interface PurchaseRequestFormState {
  applicant: string;
  department: string;
  itemName: string;
  itemType: string;
  quantity: string;
  unit: string;
  estimatedPrice: string;
  reason: string;
}

interface PurchaseRequestsFormDialogProps {
  open: boolean;
  editing: AdminPurchaseRequest | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): PurchaseRequestFormState => ({
  applicant: '',
  department: '',
  itemName: '',
  itemType: ADMIN_ITEM_TYPE_OPTIONS[0],
  quantity: '1',
  unit: '件',
  estimatedPrice: '',
  reason: '',
});

const buildFormFromItem = (item: AdminPurchaseRequest): PurchaseRequestFormState => ({
  applicant: item.applicant,
  department: item.department,
  itemName: item.itemName,
  itemType: item.itemType,
  quantity: String(item.quantity),
  unit: item.unit,
  estimatedPrice: String(item.estimatedPrice),
  reason: item.reason,
});

export function PurchaseRequestsFormDialog({
  open, editing, onSaved, onOpenChange,
}: PurchaseRequestsFormDialogProps) {
  const [form, setForm] = useState<PurchaseRequestFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof PurchaseRequestFormState>(
    key: K,
    value: PurchaseRequestFormState[K],
  ): void => setForm((prev: PurchaseRequestFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.applicant.trim()) { toast.error('请输入申请人'); return; }
    if (!form.department.trim()) { toast.error('请输入部门'); return; }
    if (!form.itemName.trim()) { toast.error('请输入物品名称'); return; }
    if (!form.unit.trim()) { toast.error('请输入单位'); return; }
    if (!isPositiveIntText(form.quantity.trim())) {
      toast.error('数量必须为正整数');
      return;
    }
    const estimatedPrice: number = Number(form.estimatedPrice);
    if (!Number.isFinite(estimatedPrice) || estimatedPrice <= 0) {
      toast.error('预计单价必须为大于 0 的数字');
      return;
    }
    if (!form.reason.trim()) { toast.error('请输入申请事由'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateAdminPurchaseRequestDto = {
          applicant: form.applicant.trim(),
          department: form.department.trim(),
          itemName: form.itemName.trim(),
          itemType: form.itemType,
          quantity: Number(form.quantity.trim()),
          unit: form.unit.trim(),
          estimatedPrice,
          reason: form.reason.trim(),
        };
        await updatePurchaseRequest(editing.id, body);
        toast.success('采购申请已更新');
      } else {
        const body: CreateAdminPurchaseRequestDto = {
          applicant: form.applicant.trim(),
          department: form.department.trim(),
          itemName: form.itemName.trim(),
          itemType: form.itemType,
          quantity: Number(form.quantity.trim()),
          unit: form.unit.trim(),
          estimatedPrice,
          reason: form.reason.trim(),
        };
        await createPurchaseRequest(body);
        toast.success('采购申请已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportProcurementError('保存采购申请失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑采购申请' : '新建采购申请'}</DialogTitle>
          <DialogDescription>
            {editing ? `申请编号：${editing.requestNo}` : '登记一条待审批的采购申请'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminFormField label="申请人" required>
            <Input className="rounded-none" value={form.applicant}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('applicant', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="部门" required>
            <Input className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('department', event.target.value)} />
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
          <AdminFormField label="单位" required>
            <Input className="rounded-none" value={form.unit}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('unit', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="预计单价" required>
            <Input className="rounded-none" type="number" min="0.01" step="0.01" value={form.estimatedPrice}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('estimatedPrice', event.target.value)} />
          </AdminFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              申请事由 <span className="text-destructive">*</span>
            </label>
            <Textarea className="rounded-none" rows={3} value={form.reason}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('reason', event.target.value)} />
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

/* ============ 审批弹窗：通过 / 驳回（驳回原因必填） ============ */

interface PurchaseApproveDialogProps {
  open: boolean;
  target: AdminPurchaseRequest | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseApproveDialog({
  open, target, onSaved, onOpenChange,
}: PurchaseApproveDialogProps) {
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setRemark('');
  }, [open]);

  const submit = async (approve: boolean): Promise<void> => {
    if (!target) return;
    if (!approve && remark.trim() === '') {
      toast.error('驳回时必须填写原因');
      return;
    }
    setSubmitting(true);
    try {
      await approvePurchaseRequest(target.id, {
        approve, remark: remark.trim(),
      });
      toast.success(approve ? '采购申请已通过' : '采购申请已驳回');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportProcurementError('审批采购申请失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>审批采购申请</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.requestNo} · ${target.itemName} · ${target.department} ${target.applicant} 申请`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            审批原因 <span className="text-destructive">（驳回时必填）</span>
          </label>
          <Textarea className="rounded-none" rows={3} value={remark}
            placeholder="请填写审批意见，驳回时必填"
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRemark(event.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" className="text-destructive" disabled={submitting}
            onClick={() => void submit(false)}>
            驳回
          </Button>
          <Button disabled={submitting} onClick={() => void submit(true)}>
            {submitting ? '提交中...' : '通过'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
