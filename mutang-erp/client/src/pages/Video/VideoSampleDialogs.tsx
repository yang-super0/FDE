import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { CreateSampleRequest, Sample, UpdateSampleRequest } from '@shared/api.interface';
import {
  batchMailSamples, createSample, fetchSampleOrderOptions, fetchSampleProjectOptions,
  mailSample, returnSample, updateSample,
  type SampleOrderOption, type SampleProjectOption,
} from '@client/src/api/video-core/samples';
import { VideoFormField, toVideoErrorText } from './video-constants';

const NO_RELATION: string = 'none';
const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

interface SampleFormState {
  productName: string; productModel: string; quantity: string; unit: string;
  customerName: string; projectId: string; orderId: string;
  sender: string; senderPhone: string; senderAddress: string;
  receiver: string; receiverPhone: string; receiverAddress: string; remark: string;
}

type SampleTextKey = 'productName' | 'productModel' | 'unit' | 'customerName' | 'sender'
  | 'senderPhone' | 'senderAddress' | 'receiver' | 'receiverPhone' | 'receiverAddress';
type SampleTextDef = { key: SampleTextKey; label: string; required?: boolean };

const TEXT_FIELDS: SampleTextDef[] = [
  { key: 'productName', label: '产品名称', required: true },
  { key: 'productModel', label: '型号' }, { key: 'unit', label: '单位' },
  { key: 'customerName', label: '客户名称' }, { key: 'sender', label: '寄件人' },
  { key: 'senderPhone', label: '寄件电话' }, { key: 'senderAddress', label: '寄件地址' },
  { key: 'receiver', label: '收件人' }, { key: 'receiverPhone', label: '收件电话' },
  { key: 'receiverAddress', label: '收件地址' },
];

const buildEmptyForm = (): SampleFormState => ({
  productName: '', productModel: '', quantity: '', unit: '', customerName: '',
  projectId: NO_RELATION, orderId: NO_RELATION, sender: '', senderPhone: '',
  senderAddress: '', receiver: '', receiverPhone: '', receiverAddress: '', remark: '',
});

interface SampleFormDialogProps { open: boolean; editing: Sample | null; onSaved: () => void; onOpenChange: (open: boolean) => void; }

export function SampleFormDialog({ open, editing, onSaved, onOpenChange }: SampleFormDialogProps) {
  const [form, setForm] = useState<SampleFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [projects, setProjects] = useState<SampleProjectOption[]>([]);
  const [orders, setOrders] = useState<SampleOrderOption[]>([]);
  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      productName: editing.productName, productModel: editing.productModel,
      quantity: String(editing.quantity ?? ''), unit: editing.unit, customerName: editing.customerName,
      projectId: editing.projectId === null ? NO_RELATION : String(editing.projectId),
      orderId: editing.orderId === null ? NO_RELATION : String(editing.orderId),
      sender: editing.sender, senderPhone: editing.senderPhone, senderAddress: editing.senderAddress,
      receiver: editing.receiver, receiverPhone: editing.receiverPhone, receiverAddress: editing.receiverAddress,
      remark: editing.remark,
    } : buildEmptyForm());
    fetchSampleProjectOptions()
      .then((list: SampleProjectOption[]) => setProjects(list))
      .catch((error: unknown) => reportError('加载项目列表失败', error));
    fetchSampleOrderOptions()
      .then((list: SampleOrderOption[]) => setOrders(list))
      .catch((error: unknown) => reportError('加载订单列表失败', error));
  }, [open, editing]);
  const patch = <K extends keyof SampleFormState>(key: K, value: SampleFormState[K]): void =>
    setForm((prev: SampleFormState) => ({ ...prev, [key]: value }));
  const handleSubmit = async (): Promise<void> => {
    if (!form.productName.trim()) { toast.error('请输入产品名称'); return; }
    const payload = {
      productName: form.productName.trim(), productModel: form.productModel.trim() || undefined,
      unit: form.unit.trim() || undefined, customerName: form.customerName.trim() || undefined,
      quantity: form.quantity.trim() === '' ? undefined : Number(form.quantity),
      sender: form.sender.trim() || undefined, senderPhone: form.senderPhone.trim() || undefined,
      senderAddress: form.senderAddress.trim() || undefined, remark: form.remark.trim() || undefined,
      receiver: form.receiver.trim() || undefined, receiverPhone: form.receiverPhone.trim() || undefined,
      receiverAddress: form.receiverAddress.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateSampleRequest = { ...payload };
        await updateSample(editing.id, body);
        toast.success('样品单已更新');
      } else {
        const body: CreateSampleRequest = {
          ...payload,
          projectId: form.projectId === NO_RELATION ? undefined : Number(form.projectId),
          orderId: form.orderId === NO_RELATION ? undefined : Number(form.orderId),
        };
        await createSample(body);
        toast.success('样品单已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存样品单失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑样品' : '新建样品'}</DialogTitle>
          <DialogDescription>
            {editing ? `样品单号：${editing.sampleNo}` : '登记一条新的样品记录'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-4">
            {TEXT_FIELDS.map((field: SampleTextDef) => (
              <VideoFormField key={field.key} label={field.label} required={field.required}>
                <Input className="rounded-none" value={form[field.key]}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => patch(field.key, event.target.value)} />
              </VideoFormField>
            ))}
            <VideoFormField label="数量">
              <Input className="rounded-none" type="number" min="0" value={form.quantity}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch('quantity', event.target.value)} />
            </VideoFormField>
            <VideoFormField label="关联项目">
              <Select value={form.projectId} onValueChange={(value: string) => patch('projectId', value)}>
                <SelectTrigger className="rounded-none"><SelectValue placeholder="关联项目" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_RELATION}>不关联项目</SelectItem>
                  {projects.map((project: SampleProjectOption) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {`${project.projectNo}（${project.projectName}）`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </VideoFormField>
            <VideoFormField label="关联订单">
              <Select value={form.orderId} onValueChange={(value: string) => patch('orderId', value)}>
                <SelectTrigger className="rounded-none"><SelectValue placeholder="关联订单" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_RELATION}>不关联订单</SelectItem>
                  {orders.map((order: SampleOrderOption) => (
                    <SelectItem key={order.id} value={String(order.id)}>
                      {`${order.orderNo}（${order.groupName}）`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </VideoFormField>
            <div className="w-full space-y-1.5">
              <label className="text-sm font-medium">备注</label>
              <Textarea className="rounded-none" rows={2} value={form.remark}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('remark', event.target.value)} />
            </div>
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

interface SampleMailDialogProps { open: boolean; ids: number[]; onDone: () => void; onOpenChange: (open: boolean) => void; }

export function SampleMailDialog({ open, ids, onDone, onOpenChange }: SampleMailDialogProps) {
  const [expressCompany, setExpressCompany] = useState<string>('');
  const [expressNo, setExpressNo] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (!open) { setExpressCompany(''); setExpressNo(''); }
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (!expressCompany.trim() || !expressNo.trim()) { toast.error('请填写快递公司和快递单号'); return; }
    setSubmitting(true);
    try {
      if (ids.length === 1) {
        await mailSample(ids[0], { expressCompany: expressCompany.trim(), expressNo: expressNo.trim() });
        toast.success('样品已登记邮寄');
      } else {
        const result = await batchMailSamples({
          ids, expressCompany: expressCompany.trim(), expressNo: expressNo.trim(),
        });
        toast.success(`已邮寄 ${result.updated} 条，跳过 ${result.skipped} 条`);
      }
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('邮寄登记失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>样品邮寄</DialogTitle>
          <DialogDescription>
            {ids.length > 1 ? `共 ${ids.length} 条待邮寄样品，统一填写快递信息` : '填写快递公司与快递单号'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <VideoFormField label="快递公司" required>
            <Input className="rounded-none" value={expressCompany} placeholder="如：顺丰速运"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setExpressCompany(event.target.value)} />
          </VideoFormField>
          <VideoFormField label="快递单号" required>
            <Input className="rounded-none" value={expressNo} placeholder="快递单号"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setExpressNo(event.target.value)} />
          </VideoFormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '确认邮寄'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SampleReturnDialogProps { open: boolean; sample: Sample | null; onDone: () => void; onOpenChange: (open: boolean) => void; }

export function SampleReturnDialog({ open, sample, onDone, onOpenChange }: SampleReturnDialogProps) {
  const [returnExpressNo, setReturnExpressNo] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (!open) setReturnExpressNo('');
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (!sample) return;
    if (!returnExpressNo.trim()) { toast.error('请填写归还快递单号'); return; }
    setSubmitting(true);
    try {
      await returnSample(sample.id, { returnExpressNo: returnExpressNo.trim() });
      toast.success('样品已登记归还');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('归还登记失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>样品归还</DialogTitle>
          <DialogDescription>{`样品单号：${sample?.sampleNo ?? ''}`}</DialogDescription>
        </DialogHeader>
        <VideoFormField label="归还快递单号" required>
          <Input className="rounded-none" value={returnExpressNo} placeholder="归还快递单号"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setReturnExpressNo(event.target.value)} />
        </VideoFormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '确认归还'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
