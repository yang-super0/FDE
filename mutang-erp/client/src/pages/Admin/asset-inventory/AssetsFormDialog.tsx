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
  AdminAsset, CreateAdminAssetDto, UpdateAdminAssetDto,
} from '@shared/api.interface';
import { createAsset, updateAsset } from '@client/src/api/admin-enhance/asset-inventory';
import {
  AdminFormField, ADMIN_ASSET_STATUS_OPTIONS, ADMIN_ASSET_TYPE_OPTIONS,
} from '../admin-enhance-constants';
import { isValidAdminDate, reportAssetInventoryError } from './asset-inventory-shared';

interface AssetsFormState {
  assetName: string;
  assetType: string;
  specification: string;
  purchaseDate: string;
  purchasePrice: string;
  depreciationRate: string;
  department: string;
  userName: string;
  location: string;
  status: string;
  remark: string;
}

interface AssetsFormDialogProps {
  open: boolean;
  editing: AdminAsset | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): AssetsFormState => ({
  assetName: '',
  assetType: ADMIN_ASSET_TYPE_OPTIONS[0],
  specification: '',
  purchaseDate: '',
  purchasePrice: '',
  depreciationRate: '',
  department: '',
  userName: '',
  location: '',
  status: ADMIN_ASSET_STATUS_OPTIONS[0],
  remark: '',
});

const buildFormFromItem = (item: AdminAsset): AssetsFormState => ({
  assetName: item.assetName,
  assetType: item.assetType || ADMIN_ASSET_TYPE_OPTIONS[0],
  specification: item.specification,
  purchaseDate: item.purchaseDate,
  purchasePrice: String(item.purchasePrice ?? ''),
  depreciationRate: String(item.depreciationRate ?? ''),
  department: item.department,
  userName: item.userName,
  location: item.location,
  status: item.status || ADMIN_ASSET_STATUS_OPTIONS[0],
  remark: item.remark,
});

export function AssetsFormDialog({
  open, editing, onSaved, onOpenChange,
}: AssetsFormDialogProps) {
  const [form, setForm] = useState<AssetsFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof AssetsFormState>(
    key: K,
    value: AssetsFormState[K],
  ): void => setForm((prev: AssetsFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.assetName.trim()) { toast.error('请输入资产名称'); return; }
    if (!form.purchaseDate.trim()) { toast.error('请输入采购日期'); return; }
    if (!isValidAdminDate(form.purchaseDate.trim())) {
      toast.error('采购日期格式应为 YYYY-MM-DD');
      return;
    }
    const purchasePrice: number = Number(form.purchasePrice);
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      toast.error('采购价格必须为不小于 0 的数字');
      return;
    }
    const depreciationRate: number = Number(form.depreciationRate);
    if (!Number.isFinite(depreciationRate) || depreciationRate < 0 || depreciationRate > 1) {
      toast.error('年折旧率必须为 0-1 之间的数字（如 0.1 表示 10%）');
      return;
    }
    setSubmitting(true);
    try {
      const common = {
        assetName: form.assetName.trim(),
        assetType: form.assetType,
        specification: form.specification.trim(),
        purchaseDate: form.purchaseDate.trim(),
        purchasePrice,
        depreciationRate,
        department: form.department.trim(),
        userName: form.userName.trim(),
        location: form.location.trim(),
        status: form.status,
        remark: form.remark.trim(),
      };
      if (editing) {
        const body: UpdateAdminAssetDto = common;
        await updateAsset(editing.id, body);
        toast.success('资产已更新');
      } else {
        const body: CreateAdminAssetDto = common;
        await createAsset(body);
        toast.success('资产已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportAssetInventoryError('保存资产失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑资产' : '新建资产'}</DialogTitle>
          <DialogDescription>
            {editing ? `资产编号：${editing.assetNo}` : '登记一条固定资产档案'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminFormField label="资产名称" required>
            <Input className="rounded-none" value={form.assetName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('assetName', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="资产类型" required>
            <Select value={form.assetType} onValueChange={(value: string) => patch('assetType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="资产类型" /></SelectTrigger>
              <SelectContent>
                {ADMIN_ASSET_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AdminFormField>
          <AdminFormField label="规格型号">
            <Input className="rounded-none" value={form.specification}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('specification', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="采购日期" required>
            <Input className="rounded-none" placeholder="YYYY-MM-DD" value={form.purchaseDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('purchaseDate', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="采购价格" required>
            <Input className="rounded-none" type="number" min="0" step="0.01" value={form.purchasePrice}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('purchasePrice', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="年折旧率" required>
            <Input className="rounded-none" type="number" min="0" max="1" step="0.01" value={form.depreciationRate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('depreciationRate', event.target.value)} />
            <p className="text-xs text-muted-foreground">
              0-1 之间的小数，如 0.1 表示年折旧率 10%
            </p>
          </AdminFormField>
          <AdminFormField label="部门">
            <Input className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('department', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="使用人">
            <Input className="rounded-none" value={form.userName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('userName', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="存放地点">
            <Input className="rounded-none" value={form.location}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('location', event.target.value)} />
          </AdminFormField>
          <AdminFormField label="状态">
            <Select value={form.status} onValueChange={(value: string) => patch('status', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                {ADMIN_ASSET_STATUS_OPTIONS.map((option: string) => (
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
