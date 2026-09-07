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
import type {
  CreateVenueExpenseRequest, UpdateVenueExpenseRequest, VenueExpense,
} from '@shared/api.interface';
import {
  approveVenueExpense, createVenueExpense, fetchVenueProjectOptions, updateVenueExpense,
} from '@client/src/api/video-core/venues';

type VenueProjectOption = Awaited<ReturnType<typeof fetchVenueProjectOptions>>[number];
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import {
  VENUE_TYPE_OPTIONS, VideoFormField, VideoStatusBadge, formatVideoAmount, toVideoErrorText,
} from './video-constants';

const NO_PROJECT: string = 'none';

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

interface VenueFormState {
  venueName: string; address: string; contactPerson: string; phone: string;
  venueType: string; projectId: string; rentalDate: Date;
  rentalDuration: string; rentalFee: string; deposit: string; remark: string;
}

type VenueTextKey = 'venueName' | 'address' | 'contactPerson' | 'phone' | 'rentalDuration';
type VenueTextDef = { key: VenueTextKey; label: string; required?: boolean };

const TEXT_FIELDS: VenueTextDef[] = [
  { key: 'venueName', label: '场地名称', required: true },
  { key: 'address', label: '场地地址' },
  { key: 'contactPerson', label: '联系人' },
  { key: 'phone', label: '联系电话' },
  { key: 'rentalDuration', label: '租赁时长' },
];
const NUMBER_FIELDS: Array<{ key: 'rentalFee' | 'deposit'; label: string }> = [
  { key: 'rentalFee', label: '租赁费' }, { key: 'deposit', label: '押金' },
];

const buildEmptyForm = (): VenueFormState => ({
  venueName: '', address: '', contactPerson: '', phone: '',
  venueType: VENUE_TYPE_OPTIONS[0], projectId: NO_PROJECT, rentalDate: new Date(),
  rentalDuration: '', rentalFee: '', deposit: '', remark: '',
});

const parseAmount = (text: string): number | undefined => {
  const trimmed: string = text.trim();
  if (!trimmed) return undefined;
  const value: number = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
};

interface VenueFormDialogProps {
  open: boolean; editing: VenueExpense | null; onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function VenueFormDialog({ open, editing, onSaved, onOpenChange }: VenueFormDialogProps) {
  const [form, setForm] = useState<VenueFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [projects, setProjects] = useState<VenueProjectOption[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      venueName: editing.venueName, address: editing.address,
      contactPerson: editing.contactPerson, phone: editing.phone,
      venueType: editing.venueType || VENUE_TYPE_OPTIONS[0],
      projectId: editing.projectId === null ? NO_PROJECT : String(editing.projectId),
      rentalDate: editing.rentalDate ? new Date(editing.rentalDate) : new Date(),
      rentalDuration: editing.rentalDuration, rentalFee: String(editing.rentalFee ?? ''),
      deposit: String(editing.deposit ?? ''), remark: editing.remark,
    } : buildEmptyForm());
    fetchVenueProjectOptions()
      .then((list: VenueProjectOption[]) => setProjects(list))
      .catch((error: unknown) => reportError('加载项目列表失败', error));
  }, [open, editing]);

  const patch = <K extends keyof VenueFormState>(key: K, value: VenueFormState[K]): void =>
    setForm((prev: VenueFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.venueName.trim()) { toast.error('请输入场地名称'); return; }
    const payload = {
      venueName: form.venueName.trim(),
      venueType: form.venueType,
      address: form.address.trim() || undefined,
      contactPerson: form.contactPerson.trim() || undefined,
      phone: form.phone.trim() || undefined,
      projectId: form.projectId === NO_PROJECT ? undefined : Number(form.projectId),
      rentalDate: dayjs(form.rentalDate).format('YYYY-MM-DD'),
      rentalDuration: form.rentalDuration.trim() || undefined,
      rentalFee: parseAmount(form.rentalFee),
      deposit: parseAmount(form.deposit),
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateVenueExpenseRequest = { ...payload };
        await updateVenueExpense(editing.id, body);
        toast.success('场地单已更新');
      } else {
        const body: CreateVenueExpenseRequest = { ...payload };
        await createVenueExpense(body);
        toast.success('场地单已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存场地单失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑场地单' : '新建场地单'}</DialogTitle>
          <DialogDescription>
            {editing ? `场地单号：${editing.venueNo}` : '登记一笔新的场地租赁费用'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-4">
          {TEXT_FIELDS.map((field: VenueTextDef) => (
            <VideoFormField key={field.key} label={field.label} required={field.required}>
              <Input className="rounded-none" value={form[field.key]}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch(field.key, event.target.value)} />
            </VideoFormField>
          ))}
          <VideoFormField label="场地类型">
            <Select value={form.venueType} onValueChange={(value: string) => patch('venueType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="场地类型" /></SelectTrigger>
              <SelectContent>
                {VENUE_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
          <VideoFormField label="关联项目">
            <Select value={form.projectId} onValueChange={(value: string) => patch('projectId', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="关联项目" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>不关联项目</SelectItem>
                {projects.map((project: VenueProjectOption) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {`${project.projectNo}（${project.projectName}）`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
          <VideoFormField label="租赁日期">
            <AdsDatePickerButton value={form.rentalDate} placeholder="租赁日期"
              onChange={(date: Date | undefined) => { if (date) patch('rentalDate', date); }} />
          </VideoFormField>
          {NUMBER_FIELDS.map((field: { key: 'rentalFee' | 'deposit'; label: string }) => (
            <VideoFormField key={field.key} label={field.label}>
              <Input className="rounded-none" type="number" min="0" value={form[field.key]}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch(field.key, event.target.value)} />
            </VideoFormField>
          ))}
          <div className="w-full space-y-1.5">
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

interface VenueApproveDialogProps {
  open: boolean; venue: VenueExpense | null; onDone: () => void;
  onOpenChange: (open: boolean) => void;
}

export function VenueApproveDialog({ open, venue, onDone, onOpenChange }: VenueApproveDialogProps) {
  const [approved, setApproved] = useState<boolean>(true);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) { setApproved(true); setRejectReason(''); }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    if (!venue) return;
    if (!approved && !rejectReason.trim()) { toast.error('请填写驳回原因'); return; }
    setSubmitting(true);
    try {
      await approveVenueExpense(venue.id, {
        approved,
        rejectReason: approved ? undefined : rejectReason.trim(),
      });
      toast.success(approved ? '审批通过' : '已驳回');
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
      <DialogContent className="max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>场地费用审批</DialogTitle>
          <DialogDescription>{`场地单号：${venue?.venueNo ?? ''} · ${venue?.venueName ?? ''}`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={approved ? 'default' : 'outline'} className="rounded-none flex-1"
              onClick={() => setApproved(true)}>通过</Button>
            <Button variant={approved ? 'outline' : 'destructive'} className="rounded-none flex-1"
              onClick={() => setApproved(false)}>驳回</Button>
          </div>
          {!approved ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">驳回原因 <span className="text-destructive">*</span></label>
              <Textarea className="rounded-none" rows={3} value={rejectReason} placeholder="请填写驳回原因"
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRejectReason(event.target.value)} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '提交审批'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface VenueDetailDialogProps {
  open: boolean; venue: VenueExpense | null; onOpenChange: (open: boolean) => void;
}

export function VenueDetailDialog({ open, venue, onOpenChange }: VenueDetailDialogProps) {
  const detailRows: Array<[string, ReactNode]> = venue ? [
    ['场地单号', venue.venueNo], ['场地名称', venue.venueName],
    ['场地类型', venue.venueType], ['地址', venue.address],
    ['联系人', venue.contactPerson], ['联系电话', venue.phone],
    ['关联项目', venue.projectNo], ['租赁日期', venue.rentalDate],
    ['租赁时长', venue.rentalDuration],
    ['租赁费', formatVideoAmount(venue.rentalFee)], ['押金', formatVideoAmount(venue.deposit)],
    ['押金状态', <VideoStatusBadge key="deposit" status={venue.depositStatus} />],
    ['押金处理时间', venue.depositReturnedAt ? dayjs(venue.depositReturnedAt).format('YYYY-MM-DD HH:mm') : ''],
    ['状态', <VideoStatusBadge key="status" status={venue.status} />],
    ['申请人', venue.applicant], ['审批人', venue.approver],
    ['审批时间', venue.approvedAt ? dayjs(venue.approvedAt).format('YYYY-MM-DD HH:mm') : ''],
    ['备注', venue.remark],
    ['创建时间', dayjs(venue.createdAt).format('YYYY-MM-DD HH:mm')],
  ] : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>场地费用详情</DialogTitle>
          <DialogDescription>{venue?.venueNo ?? ''}</DialogDescription>
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
