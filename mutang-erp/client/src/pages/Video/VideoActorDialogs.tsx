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
  Actor, CreateActorRequest, UpdateActorRequest,
} from '@shared/api.interface';
import { createActor, updateActor } from '@client/src/api/video-core/actors';
import {
  ACTOR_TYPE_OPTIONS, formatVideoAmount, toVideoErrorText, VideoFormField, VideoStatusBadge,
} from './video-constants';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const GENDER_OPTIONS: string[] = ['男', '女'];

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

const splitList = (value: string): string[] =>
  value.split(/[,，、\n]/).map((item: string) => item.trim()).filter(Boolean);

const joinList = (value: string[] | undefined): string => (value ?? []).join('、');

interface ActorFormState {
  actorName: string; actorType: string; gender: string; age: string; phone: string;
  wechat: string; email: string; dailyRate: string; halfDayRate: string;
  skills: string; styleTags: string; schedule: string; portfolio: string; remark: string;
}

type TextFieldKey =
  | 'actorName' | 'phone' | 'wechat' | 'email' | 'age'
  | 'dailyRate' | 'halfDayRate' | 'skills' | 'styleTags' | 'schedule' | 'portfolio';
type TextFieldDef = {
  key: TextFieldKey; label: string; required?: boolean; number?: boolean; placeholder?: string;
};

const TEXT_FIELDS: TextFieldDef[] = [
  { key: 'actorName', label: '演员名称', required: true, placeholder: '必填' },
  { key: 'age', label: '年龄', number: true },
  { key: 'phone', label: '电话' },
  { key: 'wechat', label: '微信' },
  { key: 'email', label: '邮箱' },
  { key: 'dailyRate', label: '日报价', number: true },
  { key: 'halfDayRate', label: '半天报价', number: true },
  { key: 'skills', label: '特长标签', placeholder: '逗号分隔，如：古装,武打' },
  { key: 'styleTags', label: '风格标签', placeholder: '逗号分隔，如：文艺,搞笑' },
  { key: 'schedule', label: '档期', placeholder: '逗号分隔日期，如：2026-09-01,2026-10-01' },
  { key: 'portfolio', label: '作品集链接', placeholder: 'https://...' },
];

const buildEmptyForm = (): ActorFormState => ({
  actorName: '', actorType: ACTOR_TYPE_OPTIONS[0], gender: GENDER_OPTIONS[0], age: '',
  phone: '', wechat: '', email: '', dailyRate: '', halfDayRate: '', skills: '',
  styleTags: '', schedule: '', portfolio: '', remark: '',
});

const buildEditForm = (editing: Actor): ActorFormState => ({
  actorName: editing.actorName, actorType: editing.actorType, gender: editing.gender,
  age: editing.age === null ? '' : String(editing.age), phone: editing.phone,
  wechat: editing.wechat, email: editing.email,
  dailyRate: String(editing.dailyRate ?? ''), halfDayRate: String(editing.halfDayRate ?? ''),
  skills: joinList(editing.skills), styleTags: joinList(editing.styleTags),
  schedule: joinList(editing.schedule), portfolio: editing.portfolio, remark: editing.remark,
});

interface ActorFormDialogProps {
  open: boolean; editing: Actor | null; onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ActorFormDialog({ open, editing, onSaved, onOpenChange }: ActorFormDialogProps) {
  const [form, setForm] = useState<ActorFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildEditForm(editing) : buildEmptyForm());
  }, [open, editing]);
  const patch = (key: keyof ActorFormState, value: string): void =>
    setForm((prev: ActorFormState) => ({ ...prev, [key]: value }));
  const toAmount = (value: string): number | undefined => {
    if (value.trim() === '') return undefined;
    const num: number = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };
  const handleSubmit = async (): Promise<void> => {
    if (!form.actorName.trim()) { toast.error('请输入演员名称'); return; }
    const payload = {
      actorName: form.actorName.trim(), actorType: form.actorType, gender: form.gender,
      age: toAmount(form.age), phone: form.phone.trim() || undefined,
      wechat: form.wechat.trim() || undefined, email: form.email.trim() || undefined,
      dailyRate: toAmount(form.dailyRate), halfDayRate: toAmount(form.halfDayRate),
      skills: splitList(form.skills), styleTags: splitList(form.styleTags),
      schedule: splitList(form.schedule),
      portfolio: form.portfolio.trim() || undefined,
      remark: form.remark.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateActorRequest = { ...payload };
        await updateActor(editing.id, body);
        toast.success('演员已更新');
      } else {
        const body: CreateActorRequest = { ...payload };
        await createActor(body);
        toast.success('演员已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportError('保存演员失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑演员' : '新建演员'}</DialogTitle>
          <DialogDescription>
            {editing ? `维护演员「${editing.actorName}」的信息` : '登记一名新的演员'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TEXT_FIELDS.map((field: TextFieldDef) => (
            <VideoFormField key={field.key} label={field.label} required={field.required}>
              <Input className="rounded-none" type={field.number ? 'number' : 'text'}
                min={field.number ? '0' : undefined} placeholder={field.placeholder ?? ''}
                value={form[field.key]}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch(field.key, event.target.value)} />
            </VideoFormField>
          ))}
          <VideoFormField label="类型">
            <Select value={form.actorType} onValueChange={(value: string) => patch('actorType', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="类型" /></SelectTrigger>
              <SelectContent>
                {ACTOR_TYPE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
          <VideoFormField label="性别">
            <Select value={form.gender} onValueChange={(value: string) => patch('gender', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="性别" /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </VideoFormField>
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

interface ActorDetailDialogProps {
  open: boolean; actor: Actor | null; onOpenChange: (open: boolean) => void;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="break-words text-right font-medium">{children || '—'}</span>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <span>—</span>;
  return (
    <span className="inline-flex flex-wrap justify-end gap-1">
      {items.map((tag: string) => (
        <span key={tag} className="bg-accent px-1.5 py-0.5 text-[10px] font-medium">{tag}</span>
      ))}
    </span>
  );
}

export function ActorDetailDialog({ open, actor, onOpenChange }: ActorDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>演员详情</DialogTitle>
          <DialogDescription>{actor?.actorName ?? ''}</DialogDescription>
        </DialogHeader>
        {actor ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">01. 基本信息</div>
              <DetailRow label="类型">{actor.actorType}</DetailRow>
              <DetailRow label="性别">{actor.gender}</DetailRow>
              <DetailRow label="年龄">{actor.age === null ? '—' : String(actor.age)}</DetailRow>
              <DetailRow label="状态"><VideoStatusBadge status={actor.status} /></DetailRow>
            </div>
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">02. 联系方式</div>
              <DetailRow label="电话">{actor.phone}</DetailRow>
              <DetailRow label="微信">{actor.wechat}</DetailRow>
              <DetailRow label="邮箱">{actor.email}</DetailRow>
            </div>
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">03. 报价</div>
              <DetailRow label="日报价">
                <span className="font-mono">{formatVideoAmount(actor.dailyRate ?? 0)}</span>
              </DetailRow>
              <DetailRow label="半天报价">
                <span className="font-mono">{formatVideoAmount(actor.halfDayRate ?? 0)}</span>
              </DetailRow>
            </div>
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">04. 标签与档期</div>
              <DetailRow label="特长"><TagList items={actor.skills} /></DetailRow>
              <DetailRow label="风格"><TagList items={actor.styleTags} /></DetailRow>
              <DetailRow label="档期"><TagList items={actor.schedule} /></DetailRow>
            </div>
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">05. 其他</div>
              <DetailRow label="作品集链接">
                {actor.portfolio ? (
                  <UniversalLink className="text-primary underline" to={actor.portfolio}
                    target="_blank" rel="noreferrer">{actor.portfolio}</UniversalLink>
                ) : '—'}
              </DetailRow>
              <DetailRow label="备注">{actor.remark}</DetailRow>
            </div>
            <div>
              <div className="mb-1 text-xs font-black tracking-[0.15em] text-primary">06. 合作历史</div>
              <div className="border border-border p-4 text-sm text-muted-foreground">暂无合作记录</div>
            </div>
            <div className="text-xs text-muted-foreground">
              创建时间：{dayjs(actor.createdAt).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
