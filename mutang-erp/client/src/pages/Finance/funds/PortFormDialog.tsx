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
  CreateFinancePortRequest, FinancePort, UpdateFinancePortRequest,
} from '@shared/api.interface';
import {
  createFinancePort, updateFinancePort,
} from '@client/src/api/finance-enhance/funds';
import { FinanceFormField } from '../finance-constants';
import {
  FUNDS_PLATFORM_OPTIONS, FUNDS_PORT_TYPE_OPTIONS, reportFundsError,
} from './funds-shared';

interface PortFormState {
  portName: string;
  portType: string;
  platform: string;
  balance: string;
  contactPerson: string;
  contactPhone: string;
  remark: string;
}

interface PortFormDialogProps {
  open: boolean;
  editing: FinancePort | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const buildEmptyForm = (): PortFormState => ({
  portName: '',
  portType: FUNDS_PORT_TYPE_OPTIONS[0],
  platform: FUNDS_PLATFORM_OPTIONS[0],
  balance: '',
  contactPerson: '',
  contactPhone: '',
  remark: '',
});

const fromPort = (port: FinancePort): PortFormState => ({
  portName: port.portName,
  portType: port.portType,
  platform: port.platform || FUNDS_PLATFORM_OPTIONS[0],
  balance: String(port.balance),
  contactPerson: port.contactPerson,
  contactPhone: port.contactPhone,
  remark: port.remark,
});

export function PortFormDialog({ open, editing, onSaved, onOpenChange }: PortFormDialogProps) {
  const [form, setForm] = useState<PortFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? fromPort(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof PortFormState>(
    key: K,
    value: PortFormState[K],
  ): void => setForm((prev: PortFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.portName.trim()) { toast.error('请输入端口名称'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateFinancePortRequest = {
          portName: form.portName.trim(),
          portType: form.portType,
          platform: form.platform,
          contactPerson: form.contactPerson.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          remark: form.remark.trim() || undefined,
        };
        await updateFinancePort(editing.id, body);
        toast.success('端口已更新');
      } else {
        const balance: number = Number(form.balance);
        const body: CreateFinancePortRequest = {
          portName: form.portName.trim(),
          portType: form.portType,
          platform: form.platform,
          balance: form.balance.trim() !== '' && Number.isFinite(balance) ? balance : undefined,
          contactPerson: form.contactPerson.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          remark: form.remark.trim() || undefined,
        };
        await createFinancePort(body);
        toast.success('端口已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportFundsError('保存端口失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑端口' : '新建端口'}</DialogTitle>
          <DialogDescription>
            {editing ? `端口编号：${editing.portNo}` : '登记一个新的媒体端口'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FinanceFormField label="端口名称" required>
            <Input
              className="rounded-none" value={form.portName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('portName', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="端口类型" required>
            <Select
              value={form.portType}
              onValueChange={(value: string) => patch('portType', value)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="端口类型" />
              </SelectTrigger>
              <SelectContent>
                {FUNDS_PORT_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          <FinanceFormField label="平台">
            <Select
              value={form.platform}
              onValueChange={(value: string) => patch('platform', value)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="平台" />
              </SelectTrigger>
              <SelectContent>
                {FUNDS_PLATFORM_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FinanceFormField>
          {editing ? null : (
            <FinanceFormField label="初始余额">
              <Input
                className="rounded-none" type="number" value={form.balance}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch('balance', event.target.value)}
              />
            </FinanceFormField>
          )}
          <FinanceFormField label="联系人">
            <Input
              className="rounded-none" value={form.contactPerson}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('contactPerson', event.target.value)}
            />
          </FinanceFormField>
          <FinanceFormField label="联系电话">
            <Input
              className="rounded-none" value={form.contactPhone}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('contactPhone', event.target.value)}
            />
          </FinanceFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea
              className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('remark', event.target.value)}
            />
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
