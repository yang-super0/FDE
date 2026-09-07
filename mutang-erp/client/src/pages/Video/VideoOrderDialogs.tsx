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
import type { CreateVideoOrderRequest, VideoOrder } from '@shared/api.interface';
import { batchApproveVideoOrders, createVideoOrder, updateVideoOrder } from '@client/src/api/video-core/orders';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import {
  formatVideoAmount, toVideoErrorText, VIDEO_TYPE_OPTIONS, VideoFormField, VideoStatusBadge,
} from './video-constants';

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};
/* 新建 / 编辑表单弹窗 */
interface VideoOrderFormState {
  groupName: string; subjectName: string; videoType: string;
  quantity: string; unitPrice: string; totalAmount: string;
  salesperson: string; projectManager: string;
  orderDate: Date | undefined; deliveryDate: Date | undefined; remark: string;
}
type FormTextFieldKey = 'groupName' | 'subjectName' | 'quantity' | 'unitPrice'
  | 'totalAmount' | 'salesperson' | 'projectManager';
type FormTextFieldDef = { key: FormTextFieldKey; label: string; required?: boolean; number?: boolean };

const FORM_TEXT_FIELDS: FormTextFieldDef[] = [
  { key: 'groupName', label: '集团名称', required: true }, { key: 'subjectName', label: '主体名称' },
  { key: 'quantity', label: '数量（条）', number: true }, { key: 'unitPrice', label: '单价', number: true },
  { key: 'totalAmount', label: '总金额', number: true },
  { key: 'salesperson', label: '商务负责人' },
  { key: 'projectManager', label: '项目负责人' },
];

const buildEmptyForm = (): VideoOrderFormState => ({
  groupName: '', subjectName: '', videoType: VIDEO_TYPE_OPTIONS[0], quantity: '', unitPrice: '',
  totalAmount: '', salesperson: '', projectManager: '', orderDate: new Date(),
  deliveryDate: undefined, remark: '',
});

const parsePositive = (raw: string): number | undefined => {
  const value: number = Number(raw);
  return raw !== '' && Number.isFinite(value) && value > 0 ? value : undefined;
};

interface VideoOrderFormProps {
  open: boolean; editing: VideoOrder | null; onSaved: () => void; onOpenChange: (open: boolean) => void;
}

export function VideoOrderFormDialog({ open, editing, onSaved, onOpenChange }: VideoOrderFormProps) {
  const [form, setForm] = useState<VideoOrderFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      groupName: editing.groupName, subjectName: editing.subjectName,
      videoType: editing.videoType, quantity: String(editing.quantity), remark: editing.remark,
      unitPrice: String(editing.unitPrice), totalAmount: String(editing.totalAmount),
      salesperson: editing.salesperson, projectManager: editing.projectManager,
      orderDate: editing.orderDate ? new Date(editing.orderDate) : new Date(),
      deliveryDate: editing.deliveryDate ? new Date(editing.deliveryDate) : undefined,
    } : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof VideoOrderFormState>(key: K, value: VideoOrderFormState[K]): void =>
    setForm((prev: VideoOrderFormState) => ({ ...prev, [key]: value }));

  /* 数量/单价变化时自动计算总金额（仍可手动修改） */
  const patchAmountSource = (key: 'quantity' | 'unitPrice', raw: string): void => {
    setForm((prev: VideoOrderFormState): VideoOrderFormState => {
      const next: VideoOrderFormState = key === 'quantity'
        ? { ...prev, quantity: raw } : { ...prev, unitPrice: raw };
      const quantity: number = Number(next.quantity);
      const unitPrice: number = Number(next.unitPrice);
      if (next.quantity !== '' && next.unitPrice !== '' && Number.isFinite(quantity) && Number.isFinite(unitPrice)) {
        next.totalAmount = String(Math.round(quantity * unitPrice * 100) / 100);
      }
      return next;
    });
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.groupName.trim()) { toast.error('请输入集团名称'); return; }
    const payload: CreateVideoOrderRequest = {
      groupName: form.groupName.trim(), subjectName: form.subjectName.trim() || undefined,
      videoType: form.videoType, quantity: parsePositive(form.quantity),
      unitPrice: parsePositive(form.unitPrice), totalAmount: parsePositive(form.totalAmount),
      salesperson: form.salesperson.trim() || undefined, projectManager: form.projectManager.trim() || undefined,
      orderDate: form.orderDate ? dayjs(form.orderDate).format('YYYY-MM-DD') : undefined,
      deliveryDate: form.deliveryDate ? dayjs(form.deliveryDate).format('YYYY-MM-DD') : undefined,
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updateVideoOrder(editing.id, payload);
        toast.success('订单已更新');
      } else {
        await createVideoOrder(payload);
        toast.success('订单已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存订单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑订单' : '新建订单'}</DialogTitle>
          <DialogDescription>{editing ? `订单号：${editing.orderNo}` : '登记一条新的视频订单'}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FORM_TEXT_FIELDS.map((field: FormTextFieldDef) => (
            <VideoFormField key={field.key} label={field.label} required={field.required}>
              <Input className="rounded-none" type={field.number ? 'number' : 'text'}
                min={field.number ? '0' : undefined} value={form[field.key]}
                onChange={(event: ChangeEvent<HTMLInputElement>) => (field.key === 'quantity'
                  || field.key === 'unitPrice' ? patchAmountSource(field.key, event.target.value)
                  : patch(field.key, event.target.value))} />
            </VideoFormField>
          ))}
          <VideoFormField label="视频类型">
            <Select value={form.videoType} onValueChange={(value: string) => patch('videoType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="视频类型" /></SelectTrigger>
              <SelectContent>
                {VIDEO_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
          <VideoFormField label="下单日期">
            <AdsDatePickerButton value={form.orderDate} placeholder="下单日期"
              onChange={(date: Date | undefined) => patch('orderDate', date)} />
          </VideoFormField>
          <VideoFormField label="交付日期">
            <AdsDatePickerButton value={form.deliveryDate} placeholder="交付日期"
              onChange={(date: Date | undefined) => patch('deliveryDate', date)} />
          </VideoFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Textarea className="rounded-none" rows={2} value={form.remark}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('remark', event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>{submitting ? '保存中...' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* 单条审批弹窗（通过 / 驳回，驳回原因必填） */
interface VideoOrderApproveDialogProps {
  open: boolean; order: VideoOrder | null; onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function VideoOrderApproveDialog({ open, order, onDone, onOpenChange }: VideoOrderApproveDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => { if (open) setReason(''); }, [open]);

  const submit = async (approved: boolean): Promise<void> => {
    if (!order) return;
    if (!approved && !reason.trim()) { toast.error('请填写驳回原因'); return; }
    setSubmitting(true);
    try {
      await batchApproveVideoOrders({ ids: [order.id], approved, rejectReason: approved ? undefined : reason.trim() });
      toast.success(approved ? '订单已通过' : '订单已驳回');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('审批失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>订单审批</DialogTitle>
          <DialogDescription>订单号：{order?.orderNo ?? ''} · {order?.groupName ?? ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">驳回原因（驳回时必填）</label>
          <Textarea className="rounded-none" rows={3} value={reason} placeholder="请填写驳回原因"
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="outline" disabled={submitting}
            className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void submit(false)}>驳回</Button>
          <Button disabled={submitting} onClick={() => void submit(true)}>通过</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* 批量驳回弹窗（原因必填） */
interface VideoOrderRejectDialogProps {
  open: boolean; ids: number[]; onDone: () => void; onOpenChange: (open: boolean) => void;
}

export function VideoOrderRejectDialog({ open, ids, onDone, onOpenChange }: VideoOrderRejectDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => { if (open) setReason(''); }, [open]);

  const handleSubmit = async (): Promise<void> => {
    if (!reason.trim()) { toast.error('请填写驳回原因'); return; }
    setSubmitting(true);
    try {
      const result = await batchApproveVideoOrders({ ids, approved: false, rejectReason: reason.trim() });
      toast.success(`已驳回 ${result.updated} 条`);
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('批量驳回失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none">
        <DialogHeader>
          <DialogTitle>批量驳回订单</DialogTitle>
          <DialogDescription>共 {ids.length} 条订单，驳回后不可撤销，请填写原因</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">驳回原因 <span className="text-destructive">*</span></label>
          <Textarea className="rounded-none" rows={3} value={reason} placeholder="请填写驳回原因"
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="destructive" disabled={submitting} onClick={() => void handleSubmit()}>确认驳回</Button>        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* 详情弹窗 */
interface VideoOrderDetailDialogProps {
  open: boolean; order: VideoOrder | null; onOpenChange: (open: boolean) => void;
}

export function VideoOrderDetailDialog({ open, order, onOpenChange }: VideoOrderDetailDialogProps) {
  const detailRows: Array<[string, ReactNode]> = order ? [
    ['订单号', order.orderNo], ['集团名称', order.groupName], ['主体名称', order.subjectName],
    ['视频类型', order.videoType], ['数量', String(order.quantity)],
    ['单价', formatVideoAmount(order.unitPrice)], ['总金额', formatVideoAmount(order.totalAmount)],
    ['状态', <VideoStatusBadge key="status" status={order.status} />],
    ['商务负责人', order.salesperson], ['项目负责人', order.projectManager],
    ['下单日期', order.orderDate], ['交付日期', order.deliveryDate],
    ['驳回原因', order.rejectReason], ['备注', order.remark],
    ['创建时间', dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')],
  ] : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>订单详情</DialogTitle>
          <DialogDescription>{order?.orderNo ?? ''}</DialogDescription>
        </DialogHeader>
        <div>
          {detailRows.map(([label, value]: [string, ReactNode]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm">
              <span className="shrink-0 text-muted-foreground">{label}</span>
              <span className="break-words text-right font-medium">{value || '—'}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
