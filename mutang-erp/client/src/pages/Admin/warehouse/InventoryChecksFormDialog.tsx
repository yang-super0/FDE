import { useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type {
  AdminInventoryCheck, CreateAdminInventoryCheckDto,
  UpdateAdminInventoryCheckDto,
} from '@shared/api.interface';
import {
  createInventoryCheck, updateInventoryCheck,
} from '@client/src/api/admin-enhance/warehouse';
import { AdminFormField } from '../admin-enhance-constants';
import {
  formatWarehouseDate, reportWarehouseError, WarehouseDatePicker,
} from './warehouse-shared';

interface ChecksFormState {
  checkDate: Date | undefined;
  checker: string;
  department: string;
  location: string;
  remark: string;
}

interface InventoryChecksFormDialogProps {
  open: boolean;
  editing: AdminInventoryCheck | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): ChecksFormState => ({
  checkDate: new Date(),
  checker: '',
  department: '',
  location: '',
  remark: '',
});

const buildFormFromItem = (item: AdminInventoryCheck): ChecksFormState => ({
  checkDate: item.checkDate ? new Date(item.checkDate) : new Date(),
  checker: item.checker,
  department: item.department ?? '',
  location: item.location ?? '',
  remark: item.remark ?? '',
});

export function InventoryChecksFormDialog({
  open, editing, onSaved, onOpenChange,
}: InventoryChecksFormDialogProps) {
  const [form, setForm] = useState<ChecksFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof ChecksFormState>(
    key: K,
    value: ChecksFormState[K],
  ): void => setForm((prev: ChecksFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.checkDate) { toast.error('请选择盘点日期'); return; }
    if (!form.checker.trim()) { toast.error('请输入盘点人'); return; }
    setSubmitting(true);
    try {
      const base = {
        checkDate: formatWarehouseDate(form.checkDate.toISOString()),
        checker: form.checker.trim(),
        department: form.department.trim(),
        location: form.location.trim(),
        remark: form.remark.trim(),
      };
      if (editing) {
        const body: UpdateAdminInventoryCheckDto = base;
        await updateInventoryCheck(editing.id, body);
        toast.success('盘点单已更新');
      } else {
        const body: CreateAdminInventoryCheckDto = base;
        await createInventoryCheck(body);
        toast.success(
          `盘点单已创建（盘点日期 ${dayjs(form.checkDate).format('YYYY-MM-DD')}）`,
        );
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportWarehouseError('保存盘点单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑盘点单' : '新建盘点单'}</DialogTitle>
          <DialogDescription>
            {editing
              ? `盘点单号：${editing.inventoryCheckNo}`
              : '创建盘点任务后，可通过「登记明细」录入盘点结果'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminFormField label="盘点日期" required>
            <WarehouseDatePicker
              value={form.checkDate} placeholder="盘点日期" full
              onChange={(value: Date | undefined) => patch('checkDate', value)}
            />
          </AdminFormField>
          <AdminFormField label="盘点人" required>
            <Input className="rounded-none" value={form.checker}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('checker', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="部门">
            <Input className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('department', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="库位">
            <Input className="rounded-none" value={form.location}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                patch('location', event.target.value)} />
          </AdminFormField>
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
