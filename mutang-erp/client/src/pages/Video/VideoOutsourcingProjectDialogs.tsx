import { useEffect, useState, type ChangeEvent } from 'react';
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
  CreateOutsourcingProjectRequest, OutsourcingProject, OutsourcingVendor,
  VideoCoreProject,
} from '@shared/api.interface';
import { approveOutsourcingProject, createOutsourcingProject, fetchInternalProjects, settleOutsourcingProject } from '@client/src/api/video-core/outsourcing';
import { fetchOutsourcingVendors } from '@client/src/api/video-core/vendors';
import { AdsDatePickerButton } from '@client/src/pages/AdsBusiness/AdsDatePickerButton';
import { formatVideoAmount, toVideoErrorText, VideoFormField } from './video-constants';

const NO_SELECTION: string = 'none';

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

/* ============ 外包项目：新建 ============ */

interface ProjectFormState {
  projectName: string; vendorId: string; relatedProjectId: string;
  serviceContent: string; amount: string;
  startDate: Date | undefined; endDate: Date | undefined; remark: string;
}

interface ProjectFormDialogProps {
  open: boolean; onSaved: () => void; onOpenChange: (open: boolean) => void;
}

export function ProjectFormDialog({ open, onSaved, onOpenChange }: ProjectFormDialogProps) {
  const [form, setForm] = useState<ProjectFormState>({
    projectName: '', vendorId: NO_SELECTION, relatedProjectId: NO_SELECTION,
    serviceContent: '', amount: '', startDate: undefined, endDate: undefined, remark: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [vendors, setVendors] = useState<OutsourcingVendor[]>([]);
  const [projects, setProjects] = useState<VideoCoreProject[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm({
      projectName: '', vendorId: NO_SELECTION, relatedProjectId: NO_SELECTION,
      serviceContent: '', amount: '', startDate: undefined, endDate: undefined, remark: '',
    });
    let cancelled: boolean = false;
    fetchOutsourcingVendors({ page: 1, pageSize: 200 })
      .then((result) => { if (!cancelled) setVendors(result.items); })
      .catch((error: unknown) => { if (!cancelled) reportError('加载供应商失败', error); });
    fetchInternalProjects()
      .then((result) => { if (!cancelled) setProjects(result.items); })
      .catch((error: unknown) => { if (!cancelled) reportError('加载内部项目失败', error); });
    return () => { cancelled = true; };
  }, [open]);

  const patch = <K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]): void =>
    setForm((prev: ProjectFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.projectName.trim()) { toast.error('请输入项目名称'); return; }
    const amount: number | undefined = form.amount.trim() === '' ? undefined : Number(form.amount);
    if (amount !== undefined && !Number.isFinite(amount)) {
      toast.error('金额必须为数字'); return;
    }
    const body: CreateOutsourcingProjectRequest = {
      projectName: form.projectName.trim(),
      vendorId: form.vendorId === NO_SELECTION ? undefined : Number(form.vendorId),
      relatedProjectId: form.relatedProjectId === NO_SELECTION
        ? undefined : Number(form.relatedProjectId),
      serviceContent: form.serviceContent.trim() || undefined,
      amount,
      startDate: form.startDate ? dayjs(form.startDate).format('YYYY-MM-DD') : undefined,
      endDate: form.endDate ? dayjs(form.endDate).format('YYYY-MM-DD') : undefined,
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await createOutsourcingProject(body);
      toast.success('外包项目已创建');
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存外包项目失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>新建外包项目</DialogTitle>
          <DialogDescription>登记一项外包服务，创建后进入待审批</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <VideoFormField label="项目名称" required>
            <Input className="rounded-none" value={form.projectName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('projectName', event.target.value)} />
          </VideoFormField>
          <VideoFormField label="金额">
            <Input className="rounded-none" type="number" min="0" value={form.amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('amount', event.target.value)} />
          </VideoFormField>
          <VideoFormField label="供应商">
            <Select value={form.vendorId} onValueChange={(value: string) => patch('vendorId', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="选择供应商" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SELECTION}>不关联供应商</SelectItem>
                {vendors.map((vendor: OutsourcingVendor) => (
                  <SelectItem key={vendor.id} value={String(vendor.id)}>
                    {`${vendor.vendorName}（${vendor.vendorType}）`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
          <VideoFormField label="关联内部项目">
            <Select value={form.relatedProjectId}
              onValueChange={(value: string) => patch('relatedProjectId', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="选择内部项目" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SELECTION}>不关联</SelectItem>
                {projects.map((project: VideoCoreProject) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {`${project.projectNo} ${project.projectName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
          <VideoFormField label="开始日期">
            <AdsDatePickerButton value={form.startDate} placeholder="开始日期"
              onChange={(date: Date | undefined) => patch('startDate', date)} />
          </VideoFormField>
          <VideoFormField label="结束日期">
            <AdsDatePickerButton value={form.endDate} placeholder="结束日期"
              onChange={(date: Date | undefined) => patch('endDate', date)} />
          </VideoFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">服务内容</label>
            <Textarea className="rounded-none" rows={3} value={form.serviceContent}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('serviceContent', event.target.value)} />
          </div>
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

/* ============ 外包项目：审批 ============ */

interface ProjectApproveDialogProps {
  open: boolean; project: OutsourcingProject | null; onDone: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ProjectApproveDialog({ open, project, onDone, onOpenChange }: ProjectApproveDialogProps) {
  const [approved, setApproved] = useState<boolean>(true);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) { setApproved(true); setRejectReason(''); }
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (!approved && !rejectReason.trim()) { toast.error('驳回时必须填写驳回原因'); return; }
    if (!project) return;
    setSubmitting(true);
    try {
      await approveOutsourcingProject(project.id, {
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
          <DialogTitle>外包项目审批</DialogTitle>
          <DialogDescription>{`${project?.projectNo ?? ''} ${project?.projectName ?? ''}`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={approved ? 'default' : 'outline'} className="rounded-none"
              onClick={() => setApproved(true)}>通过</Button>
            <Button variant={!approved ? 'destructive' : 'outline'} className="rounded-none"
              onClick={() => setApproved(false)}>驳回</Button>
          </div>
          {!approved ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">驳回原因 <span className="text-destructive">*</span></label>
              <Textarea className="rounded-none" rows={3} value={rejectReason}
                placeholder="请填写驳回原因"
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

/* ============ 外包项目：结算登记 ============ */

interface ProjectSettleDialogProps {
  open: boolean; project: OutsourcingProject | null; onDone: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettleDialog({ open, project, onDone, onOpenChange }: ProjectSettleDialogProps) {
  const [amount, setAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) setAmount('');
  }, [open]);
  const remaining: number = project ? (project.amount ?? 0) - (project.settledAmount ?? 0) : 0;
  const handleSubmit = async (): Promise<void> => {
    const value: number = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { toast.error('结算金额必须为大于 0 的数字'); return; }
    if (!project) return;
    setSubmitting(true);
    try {
      await settleOutsourcingProject(project.id, { amount: value });
      toast.success('结算登记成功');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('结算登记失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>结算登记</DialogTitle>
          <DialogDescription>{`${project?.projectNo ?? ''} ${project?.projectName ?? ''}`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between border-b border-border pb-2 text-sm">
            <span className="text-muted-foreground">剩余可结算金额</span>
            <span className="font-mono font-bold text-primary">{formatVideoAmount(Math.max(remaining, 0))}</span>
          </div>
          <VideoFormField label="本次结算金额" required>
            <Input className="rounded-none" type="number" min="0" value={amount}
              placeholder="大于 0"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setAmount(event.target.value)} />
          </VideoFormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '确认结算'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
