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
  CreateOutsourcingVendorRequest, OutsourcingProject, OutsourcingVendor,
  UpdateOutsourcingVendorRequest,
} from '@shared/api.interface';
import { createOutsourcingVendor, updateOutsourcingVendor } from '@client/src/api/video-core/vendors';
import {
  COOPERATION_LEVEL_OPTIONS, formatVideoAmount, SETTLEMENT_METHOD_OPTIONS,
  toVideoErrorText, VideoFormField, VideoStatusBadge, VENDOR_TYPE_OPTIONS,
} from './video-constants';

const VENDOR_STATUS_OPTIONS: string[] = ['合作中', '已停用'];

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

/* ============ 供应商：新建 / 编辑 ============ */

interface VendorFormState {
  vendorName: string; vendorType: string; contactPerson: string; phone: string;
  wechat: string; email: string; address: string; cooperationLevel: string;
  settlementMethod: string; taxRate: string; bankAccount: string; bankName: string;
  status: string; remark: string;
}

type VendorTextKey =
  | 'vendorName' | 'contactPerson' | 'phone' | 'wechat' | 'email'
  | 'address' | 'bankAccount' | 'bankName';
type VendorTextField = { key: VendorTextKey; label: string; required?: boolean };

const TEXT_FIELDS: VendorTextField[] = [
  { key: 'vendorName', label: '供应商名称', required: true },
  { key: 'contactPerson', label: '联系人' },
  { key: 'phone', label: '电话' },
  { key: 'wechat', label: '微信' },
  { key: 'email', label: '邮箱' },
  { key: 'address', label: '地址' },
  { key: 'bankAccount', label: '银行账号' },
  { key: 'bankName', label: '开户行' },
];

const buildEmptyForm = (): VendorFormState => ({
  vendorName: '', vendorType: VENDOR_TYPE_OPTIONS[0], contactPerson: '', phone: '',
  wechat: '', email: '', address: '', cooperationLevel: COOPERATION_LEVEL_OPTIONS[2],
  settlementMethod: SETTLEMENT_METHOD_OPTIONS[0], taxRate: '', bankAccount: '',
  bankName: '', status: VENDOR_STATUS_OPTIONS[0], remark: '',
});

interface VendorFormDialogProps {
  open: boolean; editing: OutsourcingVendor | null; onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function VendorFormDialog({ open, editing, onSaved, onOpenChange }: VendorFormDialogProps) {
  const [form, setForm] = useState<VendorFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      vendorName: editing.vendorName, vendorType: editing.vendorType,
      contactPerson: editing.contactPerson, phone: editing.phone,
      wechat: editing.wechat, email: editing.email, address: editing.address,
      cooperationLevel: editing.cooperationLevel,
      settlementMethod: editing.settlementMethod,
      taxRate: String(editing.taxRate ?? ''), bankAccount: editing.bankAccount,
      bankName: editing.bankName, status: editing.status, remark: editing.remark,
    } : buildEmptyForm());
  }, [open, editing]);
  const patch = (key: keyof VendorFormState, value: string): void =>
    setForm((prev: VendorFormState) => ({ ...prev, [key]: value }));
  const handleSubmit = async (): Promise<void> => {
    if (!form.vendorName.trim()) { toast.error('请输入供应商名称'); return; }
    const taxRate: number | undefined = form.taxRate.trim() === ''
      ? undefined : Number(form.taxRate);
    if (taxRate !== undefined && (!Number.isFinite(taxRate) || taxRate < 0)) {
      toast.error('税率必须为不小于 0 的数字'); return;
    }
    const payload = {
      vendorName: form.vendorName.trim(), vendorType: form.vendorType,
      contactPerson: form.contactPerson.trim() || undefined,
      phone: form.phone.trim() || undefined, wechat: form.wechat.trim() || undefined,
      email: form.email.trim() || undefined, address: form.address.trim() || undefined,
      cooperationLevel: form.cooperationLevel, settlementMethod: form.settlementMethod,
      taxRate, bankAccount: form.bankAccount.trim() || undefined,
      bankName: form.bankName.trim() || undefined, status: form.status,
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateOutsourcingVendorRequest = { ...payload };
        await updateOutsourcingVendor(editing.id, body);
        toast.success('供应商已更新');
      } else {
        const body: CreateOutsourcingVendorRequest = { ...payload };
        await createOutsourcingVendor(body);
        toast.success('供应商已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存供应商失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  const selectField = (key: keyof VendorFormState, label: string, options: string[]): ReactNode => (
    <VideoFormField key={`${key}-${label}`} label={label}>
      <Select value={String(form[key])} onValueChange={(value: string) => patch(key, value)}>
        <SelectTrigger className="rounded-none"><SelectValue placeholder={label} /></SelectTrigger>
        <SelectContent>
          {options.map((option: string) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </VideoFormField>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑供应商' : '新建供应商'}</DialogTitle>
          <DialogDescription>
            {editing ? `维护供应商「${editing.vendorName}」的信息` : '登记一名新的外包供应商'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TEXT_FIELDS.map((field: VendorTextField) => (
            <VideoFormField key={field.key} label={field.label} required={field.required}>
              <Input className="rounded-none" value={form[field.key]}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch(field.key, event.target.value)} />
            </VideoFormField>
          ))}
          <VideoFormField label="税率（%）">
            <Input className="rounded-none" type="number" min="0" value={form.taxRate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('taxRate', event.target.value)} />
          </VideoFormField>
          {selectField('vendorType', '类型', VENDOR_TYPE_OPTIONS)}
          {selectField('cooperationLevel', '合作等级', COOPERATION_LEVEL_OPTIONS)}
          {selectField('settlementMethod', '结算方式', SETTLEMENT_METHOD_OPTIONS)}
          {selectField('status', '状态', VENDOR_STATUS_OPTIONS)}
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

/* ============ 详情行 ============ */

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="break-words text-right font-medium">{children || '—'}</span>
    </div>
  );
}

/* ============ 供应商详情 ============ */

interface VendorDetailDialogProps {
  open: boolean; vendor: OutsourcingVendor | null; onOpenChange: (open: boolean) => void;
}

export function VendorDetailDialog({ open, vendor, onOpenChange }: VendorDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>供应商详情</DialogTitle>
          <DialogDescription>{vendor?.vendorName ?? ''}</DialogDescription>
        </DialogHeader>
        {vendor ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">01. 基本信息</div>
              <DetailRow label="类型">{vendor.vendorType}</DetailRow>
              <DetailRow label="合作等级">{vendor.cooperationLevel}</DetailRow>
              <DetailRow label="结算方式">{vendor.settlementMethod}</DetailRow>
              <DetailRow label="税率">{vendor.taxRate === null ? '—' : `${vendor.taxRate}%`}</DetailRow>
              <DetailRow label="状态"><VideoStatusBadge status={vendor.status} /></DetailRow>
            </div>
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">02. 联系方式</div>
              <DetailRow label="联系人">{vendor.contactPerson}</DetailRow>
              <DetailRow label="电话">{vendor.phone}</DetailRow>
              <DetailRow label="微信">{vendor.wechat}</DetailRow>
              <DetailRow label="邮箱">{vendor.email}</DetailRow>
              <DetailRow label="地址">{vendor.address}</DetailRow>
            </div>
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">03. 结算账户</div>
              <DetailRow label="开户行">{vendor.bankName}</DetailRow>
              <DetailRow label="银行账号">{vendor.bankAccount}</DetailRow>
              <DetailRow label="备注">{vendor.remark}</DetailRow>
              <div className="pt-2 text-xs text-muted-foreground">
                创建时间：{dayjs(vendor.createdAt).format('YYYY-MM-DD HH:mm')}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ============ 外包项目详情 ============ */

interface ProjectDetailDialogProps {
  open: boolean; project: OutsourcingProject | null; onOpenChange: (open: boolean) => void;
}

export function ProjectDetailDialog({ open, project, onOpenChange }: ProjectDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>外包项目详情</DialogTitle>
          <DialogDescription>{project?.projectNo ?? ''}</DialogDescription>
        </DialogHeader>
        {project ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">01. 基本信息</div>
              <DetailRow label="项目名称">{project.projectName}</DetailRow>
              <DetailRow label="供应商">{project.vendorName}</DetailRow>
              <DetailRow label="关联内部项目">{project.relatedProjectNo || '—'}</DetailRow>
              <DetailRow label="服务内容">{project.serviceContent}</DetailRow>
            </div>
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">02. 金额与结算</div>
              <DetailRow label="外包金额">
                <span className="font-mono">{formatVideoAmount(project.amount ?? 0)}</span>
              </DetailRow>
              <DetailRow label="已结算金额">
                <span className="font-mono">{formatVideoAmount(project.settledAmount ?? 0)}</span>
              </DetailRow>
              <DetailRow label="结算状态"><VideoStatusBadge status={project.settlementStatus} /></DetailRow>
            </div>
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">03. 状态与审批</div>
              <DetailRow label="状态"><VideoStatusBadge status={project.status} /></DetailRow>
              <DetailRow label="申请人">{project.applicant}</DetailRow>
              <DetailRow label="审批人">{project.approver}</DetailRow>
              <DetailRow label="审批时间">
                {project.approvedAt ? dayjs(project.approvedAt).format('YYYY-MM-DD HH:mm') : '—'}
              </DetailRow>
              <DetailRow label="驳回原因">{project.rejectReason}</DetailRow>
              <DetailRow label="开始日期">{project.startDate}</DetailRow>
              <DetailRow label="结束日期">{project.endDate}</DetailRow>
              <DetailRow label="备注">{project.remark}</DetailRow>
              <div className="pt-2 text-xs text-muted-foreground">
                创建时间：{dayjs(project.createdAt).format('YYYY-MM-DD HH:mm')}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
