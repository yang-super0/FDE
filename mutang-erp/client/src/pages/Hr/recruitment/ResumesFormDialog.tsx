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
  CreateHrResumeBody, HrResume, UpdateHrResumeBody,
} from '@shared/api.interface';
import {
  createResume, updateResume,
} from '@client/src/api/hr-enhance/recruitment';
import {
  HR_EDUCATION_OPTIONS, HR_GENDER_OPTIONS, HR_RESUME_SOURCE_OPTIONS,
  HR_RESUME_STATUS_OPTIONS, HrFormField,
} from '../hr-enhance-constants';
import { reportRecruitError } from './recruitment-shared';

interface ResumesFormState {
  candidateName: string;
  phone: string;
  email: string;
  positionApplied: string;
  department: string;
  resumeContent: string;
  gender: string;
  source: string;
  workYears: string;
  education: string;
  tags: string;
  status: string;
  rating: string;
}

interface ResumesFormDialogProps {
  open: boolean;
  editing: HrResume | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

const RATING_OPTIONS: string[] = ['未评分', '1', '2', '3', '4', '5'];

const buildEmptyForm = (): ResumesFormState => ({
  candidateName: '',
  phone: '',
  email: '',
  positionApplied: '',
  department: '',
  resumeContent: '',
  gender: HR_GENDER_OPTIONS[0],
  source: HR_RESUME_SOURCE_OPTIONS[0],
  workYears: '0',
  education: HR_EDUCATION_OPTIONS[1],
  tags: '',
  status: HR_RESUME_STATUS_OPTIONS[0],
  rating: RATING_OPTIONS[0],
});

const buildFormFromItem = (item: HrResume): ResumesFormState => ({
  candidateName: item.candidateName,
  phone: item.phone,
  email: item.email,
  positionApplied: item.positionApplied,
  department: item.department,
  resumeContent: item.resumeContent,
  gender: item.gender || HR_GENDER_OPTIONS[0],
  source: item.source || HR_RESUME_SOURCE_OPTIONS[0],
  workYears: String(item.workYears ?? 0),
  education: item.education || HR_EDUCATION_OPTIONS[1],
  tags: item.tags ?? '',
  status: item.status || HR_RESUME_STATUS_OPTIONS[0],
  rating: item.rating > 0 ? String(item.rating) : RATING_OPTIONS[0],
});

export function ResumesFormDialog({
  open, editing, onSaved, onOpenChange,
}: ResumesFormDialogProps) {
  const [form, setForm] = useState<ResumesFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? buildFormFromItem(editing) : buildEmptyForm());
  }, [open, editing]);

  const patch = <K extends keyof ResumesFormState>(
    key: K,
    value: ResumesFormState[K],
  ): void => setForm((prev: ResumesFormState) => ({ ...prev, [key]: value }));

  const handleSubmit = async (): Promise<void> => {
    if (!form.candidateName.trim()) { toast.error('请输入候选人姓名'); return; }
    if (!form.phone.trim()) { toast.error('请输入联系电话'); return; }
    if (!form.email.trim()) { toast.error('请输入邮箱'); return; }
    if (!form.positionApplied.trim()) { toast.error('请输入应聘职位'); return; }
    if (!form.department.trim()) { toast.error('请输入部门'); return; }
    if (!form.resumeContent.trim()) { toast.error('请输入简历内容'); return; }
    const workYears: number = Number(form.workYears);
    if (!Number.isFinite(workYears) || workYears < 0) {
      toast.error('工作年限必须为不小于 0 的数字');
      return;
    }
    const rating: number = form.rating === RATING_OPTIONS[0] ? 0 : Number(form.rating);
    setSubmitting(true);
    try {
      if (editing) {
        const body: UpdateHrResumeBody = {
          candidateName: form.candidateName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          positionApplied: form.positionApplied.trim(),
          department: form.department.trim(),
          resumeContent: form.resumeContent.trim(),
          gender: form.gender,
          source: form.source,
          workYears,
          education: form.education,
          tags: form.tags.trim(),
          status: form.status,
          rating: rating > 0 ? rating : undefined,
        };
        await updateResume(editing.id, body);
        toast.success('简历已更新');
      } else {
        const body: CreateHrResumeBody = {
          candidateName: form.candidateName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          positionApplied: form.positionApplied.trim(),
          department: form.department.trim(),
          resumeContent: form.resumeContent.trim(),
          gender: form.gender,
          source: form.source,
          workYears,
          education: form.education,
          tags: form.tags.trim() || undefined,
          status: form.status,
          rating: rating > 0 ? rating : undefined,
        };
        await createResume(body);
        toast.success('简历已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      reportRecruitError('保存简历失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑简历' : '新建简历'}</DialogTitle>
          <DialogDescription>
            {editing ? `简历编号：${editing.resumeNo}` : '登记一份候选人简历'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HrFormField label="候选人姓名" required>
            <Input className="rounded-none" value={form.candidateName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('candidateName', event.target.value)} />
          </HrFormField>
          <HrFormField label="联系电话" required>
            <Input className="rounded-none" value={form.phone}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('phone', event.target.value)} />
          </HrFormField>
          <HrFormField label="邮箱" required>
            <Input className="rounded-none" value={form.email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('email', event.target.value)} />
          </HrFormField>
          <HrFormField label="应聘职位" required>
            <Input className="rounded-none" value={form.positionApplied}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('positionApplied', event.target.value)} />
          </HrFormField>
          <HrFormField label="部门" required>
            <Input className="rounded-none" value={form.department}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('department', event.target.value)} />
          </HrFormField>
          <HrFormField label="性别">
            <Select value={form.gender} onValueChange={(value: string) => patch('gender', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="性别" /></SelectTrigger>
              <SelectContent>
                {HR_GENDER_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="来源">
            <Select value={form.source} onValueChange={(value: string) => patch('source', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="来源" /></SelectTrigger>
              <SelectContent>
                {HR_RESUME_SOURCE_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="学历">
            <Select value={form.education} onValueChange={(value: string) => patch('education', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="学历" /></SelectTrigger>
              <SelectContent>
                {HR_EDUCATION_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="工作年限">
            <Input className="rounded-none" type="number" min="0" value={form.workYears}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('workYears', event.target.value)} />
          </HrFormField>
          <HrFormField label="状态">
            <Select value={form.status} onValueChange={(value: string) => patch('status', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                {HR_RESUME_STATUS_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="评分">
            <Select value={form.rating} onValueChange={(value: string) => patch('rating', value)}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="评分" /></SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrFormField>
          <HrFormField label="标签">
            <Input className="rounded-none" value={form.tags}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patch('tags', event.target.value)} />
          </HrFormField>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              简历内容 <span className="text-destructive">*</span>
            </label>
            <Textarea className="rounded-none" rows={4} value={form.resumeContent}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch('resumeContent', event.target.value)} />
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
