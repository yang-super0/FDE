import { useEffect, useState, type ReactElement } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CreativeMaterial,
  MaterialCreateDto,
  MaterialUpdateDto,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  SE_FILTER_ALL,
  SE_INDUSTRY_OPTIONS,
  SE_MATERIAL_SOURCE_OPTIONS,
  SE_MATERIAL_STATUS_OPTIONS,
  SE_MATERIAL_TYPE_OPTIONS,
  SE_PLATFORM_OPTIONS,
  SeFormField,
  toSeErrorText,
} from '../support-enhance-constants';
import {
  createCreativeMaterial,
  updateCreativeMaterial,
} from '@client/src/api/support-enhance/materials';

interface MaterialFormDialogProps {
  open: boolean;
  initial: CreativeMaterial | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface MaterialFormState {
  materialName: string;
  materialType: string;
  industry: string;
  platform: string;
  tags: string;
  description: string;
  targetAudience: string;
  sellingPoints: string;
  creativeStyle: string;
  author: string;
  source: string;
  rating: string;
  status: string;
  fileUrl: string;
  thumbnailUrl: string;
}

const EMPTY_FORM: MaterialFormState = {
  materialName: '',
  materialType: '',
  industry: '',
  platform: '',
  tags: '',
  description: '',
  targetAudience: '',
  sellingPoints: '',
  creativeStyle: '',
  author: '',
  source: '',
  rating: '',
  status: '',
  fileUrl: '',
  thumbnailUrl: '',
};

const splitTags = (text: string): string[] =>
  text
    .split(/[,，]/u)
    .map((item: string) => item.trim())
    .filter((item: string) => item !== '');

const MaterialFormDialog = ({
  open,
  initial,
  onOpenChange,
  onSaved,
}: MaterialFormDialogProps) => {
  const [form, setForm] = useState<MaterialFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setErrorText('');
    if (initial) {
      setForm({
        materialName: initial.materialName,
        materialType: initial.materialType,
        industry: initial.industry ?? '',
        platform: initial.platform ?? '',
        tags: (initial.tags ?? []).join(','),
        description: initial.description ?? '',
        targetAudience: initial.targetAudience ?? '',
        sellingPoints: (initial.sellingPoints ?? []).join(','),
        creativeStyle: initial.creativeStyle ?? '',
        author: initial.author ?? '',
        source: initial.source,
        rating: String(initial.rating ?? ''),
        status: initial.status,
        fileUrl: initial.fileUrl ?? '',
        thumbnailUrl: initial.thumbnailUrl ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, initial]);

  const setField = (key: keyof MaterialFormState, value: string): void => {
    setForm((prev: MaterialFormState) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (form.materialName.trim() === '') {
      setErrorText('请填写素材名称（必填项）');
      return;
    }
    const ratingNum: number = Number(form.rating);
    const dto: MaterialCreateDto = {
      materialName: form.materialName.trim(),
      materialType: form.materialType || undefined,
      industry: form.industry || undefined,
      platform: form.platform || undefined,
      tags: splitTags(form.tags),
      description: form.description || undefined,
      targetAudience: form.targetAudience || undefined,
      sellingPoints: splitTags(form.sellingPoints),
      creativeStyle: form.creativeStyle || undefined,
      author: form.author || undefined,
      source: form.source || undefined,
      rating: form.rating ? ratingNum : undefined,
      status: form.status || undefined,
      fileUrl: form.fileUrl.trim() || undefined,
      thumbnailUrl: form.thumbnailUrl.trim() || undefined,
    };
    setSaving(true);
    try {
      if (initial) {
        await updateCreativeMaterial(initial.id, dto as MaterialUpdateDto);
        toast.success('素材已更新');
      } else {
        await createCreativeMaterial(dto);
        toast.success('素材已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const text: string = toSeErrorText(error);
      logger.error('保存素材失败', error);
      setErrorText(text);
    } finally {
      setSaving(false);
    }
  };

  const buildSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: string[],
    allLabel: string,
  ): ReactElement => (
    <SeFormField label={label}>
      <Select value={value || SE_FILTER_ALL} onValueChange={onChange}>
        <SelectTrigger className="rounded-none">
          <SelectValue placeholder={`选择${label}`} />
        </SelectTrigger>
        <SelectContent className="rounded-none">
          <SelectItem value={SE_FILTER_ALL}>{allLabel}</SelectItem>
          {options.map((opt: string) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SeFormField>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑素材' : '新建素材'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SeFormField label="素材名称" required>
            <Input
              className="rounded-none"
              value={form.materialName}
              onChange={(e) => setField('materialName', e.target.value)}
              placeholder="请输入素材名称"
            />
          </SeFormField>
          {buildSelect('类型', form.materialType, (v: string) => setField('materialType', v === SE_FILTER_ALL ? '' : v), SE_MATERIAL_TYPE_OPTIONS, '未指定')}
          {buildSelect('行业', form.industry, (v: string) => setField('industry', v === SE_FILTER_ALL ? '' : v), SE_INDUSTRY_OPTIONS, '未指定')}
          {buildSelect('平台', form.platform, (v: string) => setField('platform', v === SE_FILTER_ALL ? '' : v), SE_PLATFORM_OPTIONS, '未指定')}
          <SeFormField label="标签（逗号分隔）">
            <Input
              className="rounded-none"
              value={form.tags}
              onChange={(e) => setField('tags', e.target.value)}
              placeholder="如：节日,促销,新品"
            />
          </SeFormField>
          <SeFormField label="目标人群">
            <Input
              className="rounded-none"
              value={form.targetAudience}
              onChange={(e) => setField('targetAudience', e.target.value)}
            />
          </SeFormField>
          <SeFormField label="卖点（逗号分隔）">
            <Input
              className="rounded-none"
              value={form.sellingPoints}
              onChange={(e) => setField('sellingPoints', e.target.value)}
              placeholder="如：高性价比,明星同款"
            />
          </SeFormField>
          <SeFormField label="创意风格">
            <Input
              className="rounded-none"
              value={form.creativeStyle}
              onChange={(e) => setField('creativeStyle', e.target.value)}
            />
          </SeFormField>
          <SeFormField label="作者">
            <Input
              className="rounded-none"
              value={form.author}
              onChange={(e) => setField('author', e.target.value)}
            />
          </SeFormField>
          {buildSelect('来源', form.source, (v: string) => setField('source', v === SE_FILTER_ALL ? '' : v), SE_MATERIAL_SOURCE_OPTIONS, '未指定')}
          {buildSelect('评分', form.rating, (v: string) => setField('rating', v === SE_FILTER_ALL ? '' : v), ['1', '2', '3', '4', '5'], '未评分')}
          {buildSelect('状态', form.status, (v: string) => setField('status', v === SE_FILTER_ALL ? '' : v), SE_MATERIAL_STATUS_OPTIONS, '未指定')}
          <SeFormField label="文件 URL">
            <Input
              className="rounded-none"
              value={form.fileUrl}
              onChange={(e) => setField('fileUrl', e.target.value)}
              placeholder="模拟上传，粘贴文件 URL"
            />
          </SeFormField>
          <SeFormField label="缩略图 URL">
            <Input
              className="rounded-none"
              value={form.thumbnailUrl}
              onChange={(e) => setField('thumbnailUrl', e.target.value)}
              placeholder="模拟上传，粘贴缩略图 URL"
            />
          </SeFormField>
        </div>
        <SeFormField label="描述">
          <Textarea
            className="rounded-none"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="素材描述"
          />
        </SeFormField>
        {errorText ? (
          <p className="text-sm text-destructive">{errorText}</p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="rounded-none"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialFormDialog;
