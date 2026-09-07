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
import type {
  CreateFinanceConsumptionRequest, FinanceConsumption, FinancePort,
} from '@shared/api.interface';
import {
  createFinanceConsumption, fetchFinanceEnhancePorts, updateFinanceConsumption,
} from '@client/src/api/finance-enhance/rebates';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { FinanceFormField } from '../finance-constants';
import { reportRebateError } from './shared';

const NO_PORT: string = 'none';

interface ConsumptionFormState {
  customerId: string; adAccountId: string; portId: string;
  consumptionDate: Date; amount: string; platformData: string;
  systemData: string; remark: string;
}

const buildEmptyConsumptionForm = (): ConsumptionFormState => ({
  customerId: '', adAccountId: '', portId: NO_PORT, consumptionDate: new Date(),
  amount: '', platformData: '', systemData: '', remark: '',
});

interface ConsumptionFormDialogProps {
  open: boolean; editing: FinanceConsumption | null;
  onSaved: () => void; onOpenChange: (open: boolean) => void;
}

export function ConsumptionFormDialog({
  open, editing, onSaved, onOpenChange,
}: ConsumptionFormDialogProps) {
  const [form, setForm] = useState<ConsumptionFormState>(buildEmptyConsumptionForm());
  const [ports, setPorts] = useState<FinancePort[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        customerId: editing.customerId,
        adAccountId: editing.adAccountId,
        portId: editing.portId === null ? NO_PORT : String(editing.portId),
        consumptionDate: editing.consumptionDate ? new Date(editing.consumptionDate) : new Date(),
        amount: String(editing.amount),
        platformData: String(editing.platformData),
        systemData: String(editing.systemData),
        remark: editing.remark,
      });
    } else {
      setForm(buildEmptyConsumptionForm());
    }
    let cancelled: boolean = false;
    fetchFinanceEnhancePorts()
      .then((result: { items: FinancePort[] }) => {
        if (!cancelled) setPorts(result.items);
      })
      .catch((error: unknown) => reportRebateError('加载端口失败', error));
    return () => { cancelled = true; };
  }, [open, editing]);

  const patch = <K extends keyof ConsumptionFormState>(
    key: K, value: ConsumptionFormState[K],
  ): void => setForm((prev: ConsumptionFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.customerId.trim()) { toast.error('请输入客户ID'); return; }
    const amount: number = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('消耗金额必须为大于 0 的数字'); return;
    }
    const parseOptionalNumber = (text: string): number | undefined => {
      if (text.trim() === '') return undefined;
      const parsed: number = Number(text);
      if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
      return parsed;
    };
    const platformData: number | undefined = parseOptionalNumber(form.platformData);
    if (platformData !== undefined && Number.isNaN(platformData)) {
      toast.error('平台数据必须为不小于 0 的数字'); return;
    }
    const systemData: number | undefined = parseOptionalNumber(form.systemData);
    if (systemData !== undefined && Number.isNaN(systemData)) {
      toast.error('系统数据必须为不小于 0 的数字'); return;
    }
    const payload = {
      customerId: form.customerId.trim(),
      adAccountId: form.adAccountId.trim() || undefined,
      portId: form.portId === NO_PORT ? undefined : Number(form.portId),
      consumptionDate: dayjs(form.consumptionDate).format('YYYY-MM-DD'),
      amount,
      platformData,
      systemData,
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updateFinanceConsumption(editing.id, payload);
        toast.success('消耗记录已更新');
      } else {
        const body: CreateFinanceConsumptionRequest = { ...payload };
        await createFinanceConsumption(body);
        toast.success('消耗记录已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRebateError('保存消耗记录失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑消耗记录' : '新建消耗记录'}</DialogTitle>
          <DialogDescription>
            {editing ? `消耗单号：${editing.consumptionNo}` : '登记一笔端口消耗记录'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="客户ID" required>
            <Input className="rounded-none" value={form.customerId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('customerId', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="广告账户ID">
            <Input className="rounded-none" value={form.adAccountId}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('adAccountId', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="端口">
            <Select value={form.portId} onValueChange={(value: string) => patch('portId', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="选择端口" /></SelectTrigger>
              <SelectContent position="popper" className="max-h-60 rounded-none">
                <SelectItem value={NO_PORT}>不关联端口</SelectItem>
                {ports.map((port: FinancePort) => (
                  <SelectItem key={port.id} value={String(port.id)}>{port.portName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="消耗日期" required>
            <AdsDatePickerButton value={form.consumptionDate} placeholder="消耗日期"
              onChange={(date: Date | undefined) => { if (date) patch('consumptionDate', date); }} />
          </FinanceFormField>
          <FinanceFormField label="消耗金额（¥）" required>
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="平台数据（¥）">
            <Input className="rounded-none" type="number" min="0" value={form.platformData}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('platformData', event.target.value)} />
          </FinanceFormField>
          <FinanceFormField label="系统数据（¥）">
            <Input className="rounded-none" type="number" min="0" value={form.systemData}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('systemData', event.target.value)} />
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
