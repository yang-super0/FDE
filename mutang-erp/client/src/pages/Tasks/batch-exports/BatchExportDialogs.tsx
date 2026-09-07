import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  BatchExport,
  BatchExportCreateDto,
  BatchExportFinishDto,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  createBatchExport,
  finishBatchExport,
} from '@client/src/api/task-enhance/batch-exports';
import {
  TASK_EXPORT_TYPES,
  TaskEnhanceFormField,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';

/** 常用导出字段选项（至少选 1） */
export const BATCH_EXPORT_FIELD_OPTIONS: string[] = [
  '编号',
  '名称',
  '状态',
  '创建人',
  '创建时间',
  '备注',
];

/* ============ 新建导出任务 ============ */

interface BatchExportCreateFormState {
  exportType: string;
  exportName: string;
  fields: string[];
  totalCount: string;
  expireDays: string;
  remark: string;
}

const EMPTY_CREATE_FORM: BatchExportCreateFormState = {
  exportType: '',
  exportName: '',
  fields: [],
  totalCount: '',
  expireDays: '7',
  remark: '',
};

interface BatchExportCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const BatchExportCreateDialog = ({
  open,
  onOpenChange,
  onCreated,
}: BatchExportCreateDialogProps) => {
  const [form, setForm] = useState<BatchExportCreateFormState>(
    EMPTY_CREATE_FORM,
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setForm(EMPTY_CREATE_FORM);
  }, [open]);

  const updateField = (
    key: keyof Omit<BatchExportCreateFormState, 'fields'>,
    value: string,
  ) => {
    setForm((prev: BatchExportCreateFormState) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleField = (field: string, checked: boolean) => {
    setForm((prev: BatchExportCreateFormState) => ({
      ...prev,
      fields: checked
        ? [...prev.fields, field]
        : prev.fields.filter((item: string) => item !== field),
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    const totalCount: number = Number(form.totalCount);
    const expireDays: number = Number(form.expireDays);
    if (!form.exportType) {
      toast.error('请选择导出类型');
      return;
    }
    if (!form.exportName.trim()) {
      toast.error('请输入导出名称');
      return;
    }
    if (form.fields.length === 0) {
      toast.error('请至少选择 1 个导出字段');
      return;
    }
    if (
      form.totalCount.trim() !== '' &&
      (!Number.isInteger(totalCount) || totalCount < 0)
    ) {
      toast.error('总条数必须是不小于 0 的整数');
      return;
    }
    if (!Number.isInteger(expireDays) || expireDays <= 0) {
      toast.error('有效期天数必须是大于 0 的整数');
      return;
    }
    setSubmitting(true);
    try {
      const dto: BatchExportCreateDto = {
        exportType: form.exportType,
        exportName: form.exportName.trim(),
        fields: form.fields,
        expireDays,
      };
      if (form.totalCount.trim() !== '') dto.totalCount = totalCount;
      if (form.remark.trim()) dto.remark = form.remark.trim();
      await createBatchExport(dto);
      toast.success('导出任务已创建');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      logger.error('创建导出任务失败', String(error));
      toast.error(toTaskEnhanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>新建导出任务</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="导出类型" required>
              <Select
                value={form.exportType}
                onValueChange={(value: string) => updateField('exportType', value)}
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择导出类型" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_EXPORT_TYPES.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="导出名称" required>
              <Input
                className="rounded-none"
                placeholder="请输入导出名称"
                value={form.exportName}
                onChange={(event) => updateField('exportName', event.target.value)}
              />
            </TaskEnhanceFormField>
          </div>
          <TaskEnhanceFormField label="导出字段" required>
            <div className="flex flex-wrap items-center gap-4 rounded-none border border-border p-3">
              {BATCH_EXPORT_FIELD_OPTIONS.map((field: string) => (
                <label
                  key={field}
                  className="flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <Checkbox
                    checked={form.fields.includes(field)}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      toggleField(field, checked === true)
                    }
                  />
                  {field}
                </label>
              ))}
            </div>
          </TaskEnhanceFormField>
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="总条数（可选）">
              <Input
                className="rounded-none font-mono"
                type="number"
                min={0}
                placeholder="留空则完成后填写"
                value={form.totalCount}
                onChange={(event) => updateField('totalCount', event.target.value)}
              />
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="有效期天数" required>
              <Input
                className="rounded-none font-mono"
                type="number"
                min={1}
                value={form.expireDays}
                onChange={(event) => updateField('expireDays', event.target.value)}
              />
            </TaskEnhanceFormField>
          </div>
          <TaskEnhanceFormField label="备注">
            <Textarea
              rows={2}
              placeholder="请输入备注（可选）"
              value={form.remark}
              onChange={(event) => updateField('remark', event.target.value)}
            />
          </TaskEnhanceFormField>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            className="rounded-none"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '创建中...' : '创建任务'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============ 完成导出（填写文件 URL / 总条数 / 标记失败） ============ */

interface BatchExportFinishFormState {
  fileUrl: string;
  totalCount: string;
  failed: boolean;
}

const EMPTY_FINISH_FORM: BatchExportFinishFormState = {
  fileUrl: '',
  totalCount: '',
  failed: false,
};

interface BatchExportFinishDialogProps {
  open: boolean;
  target: BatchExport | null;
  onOpenChange: (open: boolean) => void;
  onFinished: () => void;
}

export const BatchExportFinishDialog = ({
  open,
  target,
  onOpenChange,
  onFinished,
}: BatchExportFinishDialogProps) => {
  const [form, setForm] = useState<BatchExportFinishFormState>(
    EMPTY_FINISH_FORM,
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setForm(EMPTY_FINISH_FORM);
  }, [open]);

  const updateField = (
    key: keyof Omit<BatchExportFinishFormState, 'failed'>,
    value: string,
  ) => {
    setForm((prev: BatchExportFinishFormState) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    const totalCount: number = Number(form.totalCount);
    if (
      !form.failed &&
      form.totalCount.trim() !== '' &&
      (!Number.isInteger(totalCount) || totalCount < 0)
    ) {
      toast.error('总条数必须是不小于 0 的整数');
      return;
    }
    if (!form.failed && !form.fileUrl.trim()) {
      toast.error('请填写导出文件 URL，或勾选「标记为失败」');
      return;
    }
    setSubmitting(true);
    try {
      const dto: BatchExportFinishDto = {};
      if (form.failed) {
        dto.failed = true;
      } else {
        dto.fileUrl = form.fileUrl.trim();
        if (form.totalCount.trim() !== '') dto.totalCount = totalCount;
      }
      await finishBatchExport(target.id, dto);
      toast.success(
        form.failed
          ? `导出任务「${target.exportNo}」已标记为失败`
          : `导出任务「${target.exportNo}」已完成`,
      );
      onOpenChange(false);
      onFinished();
    } catch (error) {
      logger.error('完成导出任务失败', String(error));
      toast.error(toTaskEnhanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>完成导出「{target?.exportNo ?? '—'}」</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            填写导出文件地址后任务将标记为已完成；如导出失败可勾选「标记为失败」。
          </p>
          <TaskEnhanceFormField label="导出文件 URL">
            <Input
              className="rounded-none"
              placeholder="请输入导出文件下载地址"
              disabled={form.failed}
              value={form.fileUrl}
              onChange={(event) => updateField('fileUrl', event.target.value)}
            />
          </TaskEnhanceFormField>
          <TaskEnhanceFormField label="总条数（可选）">
            <Input
              className="rounded-none font-mono"
              type="number"
              min={0}
              placeholder="请输入实际导出条数"
              disabled={form.failed}
              value={form.totalCount}
              onChange={(event) => updateField('totalCount', event.target.value)}
            />
          </TaskEnhanceFormField>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={form.failed}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                setForm((prev: BatchExportFinishFormState) => ({
                  ...prev,
                  failed: checked === true,
                }))
              }
            />
            标记为失败
          </label>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            className="rounded-none"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? '提交中...' : '确认完成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
