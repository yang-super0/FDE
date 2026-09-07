import React, { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { z } from 'zod';
import type {
  BitableSelectOptions,
  UpdateVideoMaterialRequest,
  UpdateVideoMaterialResponse,
  VideoMaterialDetail,
} from '@shared/video-material';
import {
  getBitableSelectOptions,
  updateVideoMaterial,
} from '@client/src/api/video-material';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';

export interface EditMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: VideoMaterialDetail;
  onSaved: () => void;
}

interface EditMaterialForm {
  videoLink: string;
  videoType: string;
  targetPlatform: string;
  subtitleStyle: string;
  cameraMovementPreference: string;
  colorAtmosphere: string;
  visualStyle: string;
  aspectRatio: string;
  storyboardFineness: string;
  sceneSetting: string;
  protagonistSetting: string;
}

const videoLinkSchema = z.object({
  videoLink: z
    .string()
    .trim()
    .min(1, '视频链接不能为空')
    .refine((value: string) => /^https?:\/\//u.test(value), '链接必须以 http 开头'),
});

const EMPTY_OPTIONS: BitableSelectOptions = {
  videoTypes: [],
  targetPlatforms: [],
  subtitleStyles: [],
  cameraMovements: [],
  colorAtmospheres: [],
  visualStyles: [],
  aspectRatios: [],
  storyboardFinenessOptions: [],
};

function buildForm(material: VideoMaterialDetail): EditMaterialForm {
  return {
    videoLink: material.videoLink ?? '',
    videoType: '',
    targetPlatform: '',
    subtitleStyle: material.subtitleStyle ?? '',
    cameraMovementPreference:
      material.cameraMovementPreference.length > 0
        ? material.cameraMovementPreference[0]
        : '',
    colorAtmosphere: material.colorAtmosphere ?? '',
    visualStyle: material.visualStyle ?? '',
    aspectRatio: material.aspectRatio ?? '',
    storyboardFineness: material.storyboardFineness ?? '',
    sceneSetting: material.sceneSetting ?? '',
    protagonistSetting: material.protagonistSetting ?? '',
  };
}

function getErrorMessage(err: unknown, fallback: string): string {
  const message: string | undefined = (
    err as { response?: { data?: { message?: string } } }
  )?.response?.data?.message;
  return message ?? fallback;
}

interface FieldSelectProps {
  label: string;
  value: string;
  optionList: string[];
  onChange: (value: string) => void;
}

const FieldSelect: React.FC<FieldSelectProps> = ({
  label,
  value,
  optionList,
  onChange,
}) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-foreground">{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-full rounded-sm">
        <SelectValue placeholder="请选择" />
      </SelectTrigger>
      <SelectContent>
        {optionList.map((option: string) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export const EditMaterialDialog: React.FC<EditMaterialDialogProps> = ({
  open,
  onOpenChange,
  material,
  onSaved,
}) => {
  const [form, setForm] = useState<EditMaterialForm>(() => buildForm(material));
  const [selectOptions, setSelectOptions] =
    useState<BitableSelectOptions>(EMPTY_OPTIONS);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setForm(buildForm(material));
    setSelectOptions(EMPTY_OPTIONS);
    getBitableSelectOptions()
      .then((result: BitableSelectOptions) => setSelectOptions(result))
      .catch((err: unknown) => {
        logger.error('获取多维表格候选项失败', err);
      });
  }, [open, material]);

  const setField =
    (key: keyof EditMaterialForm) =>
    (value: string): void => {
      setForm((prev: EditMaterialForm) => ({ ...prev, [key]: value }));
    };

  const handleSubmit = async (): Promise<void> => {
    const parsed = videoLinkSchema.safeParse({ videoLink: form.videoLink });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '视频链接格式不正确');
      return;
    }
    const defaults: EditMaterialForm = buildForm(material);
    const patch: UpdateVideoMaterialRequest = {};
    const fieldKeys: (keyof EditMaterialForm)[] = [
      'videoLink', 'videoType', 'targetPlatform', 'subtitleStyle',
      'cameraMovementPreference', 'colorAtmosphere', 'visualStyle',
      'aspectRatio', 'storyboardFineness', 'sceneSetting',
      'protagonistSetting',
    ];
    fieldKeys.forEach((key: keyof EditMaterialForm) => {
      const value: string =
        key === 'videoLink' ? form.videoLink.trim() : form[key];
      if (value !== defaults[key]) {
        patch[key] = value;
      }
    });
    if (Object.keys(patch).length === 0) {
      toast.error('没有需要保存的修改');
      return;
    }
    setSubmitting(true);
    try {
      const result: UpdateVideoMaterialResponse = await updateVideoMaterial(
        material.id,
        patch,
      );
      toast.success(result.bitableSynced
        ? '已保存并同步到多维表格'
        : '已保存，多维表格同步失败');
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      logger.error('保存素材失败', err);
      toast.error(getErrorMessage(err, '保存失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-xl rounded-sm">
        <DialogHeader>
          <DialogTitle>编辑素材</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              视频链接 <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.videoLink}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setField('videoLink')(e.target.value)
              }
              placeholder="https://..."
              className="rounded-sm"
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldSelect label="视频类型" value={form.videoType}
              optionList={selectOptions.videoTypes}
              onChange={setField('videoType')} />
            <FieldSelect label="目标平台" value={form.targetPlatform}
              optionList={selectOptions.targetPlatforms}
              onChange={setField('targetPlatform')} />
            <FieldSelect label="字幕样式" value={form.subtitleStyle}
              optionList={selectOptions.subtitleStyles}
              onChange={setField('subtitleStyle')} />
            <FieldSelect label="运镜偏好" value={form.cameraMovementPreference}
              optionList={selectOptions.cameraMovements}
              onChange={setField('cameraMovementPreference')} />
            <FieldSelect label="色彩氛围" value={form.colorAtmosphere}
              optionList={selectOptions.colorAtmospheres}
              onChange={setField('colorAtmosphere')} />
            <FieldSelect label="视觉风格" value={form.visualStyle}
              optionList={selectOptions.visualStyles}
              onChange={setField('visualStyle')} />
            <FieldSelect label="画面比例" value={form.aspectRatio}
              optionList={selectOptions.aspectRatios}
              onChange={setField('aspectRatio')} />
            <FieldSelect label="分镜精细度" value={form.storyboardFineness}
              optionList={selectOptions.storyboardFinenessOptions}
              onChange={setField('storyboardFineness')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">场景设定</label>
            <Textarea
              value={form.sceneSetting}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setField('sceneSetting')(e.target.value)}
              rows={3}
              className="rounded-sm"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">主角设定</label>
            <Textarea
              value={form.protagonistSetting}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setField('protagonistSetting')(e.target.value)}
              rows={3}
              className="rounded-sm"
              disabled={submitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            size="sm"
            className="rounded-sm"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
