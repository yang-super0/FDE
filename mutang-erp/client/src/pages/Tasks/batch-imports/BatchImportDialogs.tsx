import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  BatchImport,
  BatchImportCreateDto,
  BatchImportFinishDto,
} from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
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
  createBatchImport,
  finishBatchImport,
} from '@client/src/api/task-enhance/batch-imports';
import {
  formatTaskEnhanceDateTime,
  TASK_IMPORT_TYPES,
  TaskEnhanceFormField,
  toTaskEnhanceErrorText,
} from '../task-enhance-shared';

/* ============ 新建导入任务 ============ */

interface BatchImportCreateFormState {
  importType: string;
  fileName: string;
  fileUrl: string;
  totalCount: string;
  remark: string;
}

const EMPTY_CREATE_FORM: BatchImportCreateFormState = {
  importType: '',
  fileName: '',
  fileUrl: '',
  totalCount: '',
  remark: '',
};

interface BatchImportCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const BatchImportCreateDialog = ({
  open,
  onOpenChange,
  onCreated,
}: BatchImportCreateDialogProps) => {
  const [form, setForm] = useState<BatchImportCreateFormState>(
    EMPTY_CREATE_FORM,
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setForm(EMPTY_CREATE_FORM);
  }, [open]);

  const updateField = (key: keyof BatchImportCreateFormState, value: string) => {
    setForm((prev: BatchImportCreateFormState) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    const totalCount: number = Number(form.totalCount);
    if (!form.importType) {
      toast.error('请选择导入类型');
      return;
    }
    if (!form.fileName.trim()) {
      toast.error('请输入文件名');
      return;
    }
    if (form.totalCount.trim() === '' || !Number.isInteger(totalCount) || totalCount < 0) {
      toast.error('总条数必须是不小于 0 的整数');
      return;
    }
    setSubmitting(true);
    try {
      const dto: BatchImportCreateDto = {
        importType: form.importType,
        fileName: form.fileName.trim(),
        totalCount,
      };
      if (form.fileUrl.trim()) dto.fileUrl = form.fileUrl.trim();
      if (form.remark.trim()) dto.remark = form.remark.trim();
      await createBatchImport(dto);
      toast.success('导入任务已创建');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      logger.error('创建导入任务失败', String(error));
      toast.error(toTaskEnhanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>新建导入任务</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="导入类型" required>
              <Select
                value={form.importType}
                onValueChange={(value: string) => updateField('importType', value)}
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="请选择导入类型" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_IMPORT_TYPES.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="文件名" required>
              <Input
                className="rounded-none"
                placeholder="请输入文件名，如 客户导入_0918.xlsx"
                value={form.fileName}
                onChange={(event) => updateField('fileName', event.target.value)}
              />
            </TaskEnhanceFormField>
          </div>
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="文件 URL（可选，模拟上传）">
              <Input
                className="rounded-none"
                placeholder="请输入文件下载地址"
                value={form.fileUrl}
                onChange={(event) => updateField('fileUrl', event.target.value)}
              />
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="总条数" required>
              <Input
                className="rounded-none font-mono"
                type="number"
                min={0}
                placeholder="请输入导入总条数"
                value={form.totalCount}
                onChange={(event) => updateField('totalCount', event.target.value)}
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

/* ============ 完成导入（填写成功/失败数） ============ */

interface BatchImportFinishFormState {
  successCount: string;
  failCount: string;
  errorLog: string;
}

const EMPTY_FINISH_FORM: BatchImportFinishFormState = {
  successCount: '',
  failCount: '',
  errorLog: '',
};

interface BatchImportFinishDialogProps {
  open: boolean;
  target: BatchImport | null;
  onOpenChange: (open: boolean) => void;
  onFinished: () => void;
}

export const BatchImportFinishDialog = ({
  open,
  target,
  onOpenChange,
  onFinished,
}: BatchImportFinishDialogProps) => {
  const [form, setForm] = useState<BatchImportFinishFormState>(
    EMPTY_FINISH_FORM,
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) setForm(EMPTY_FINISH_FORM);
  }, [open]);

  const updateField = (key: keyof BatchImportFinishFormState, value: string) => {
    setForm((prev: BatchImportFinishFormState) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!target) return;
    const successCount: number = Number(form.successCount);
    const failCount: number = Number(form.failCount);
    if (form.successCount.trim() === '' || !Number.isInteger(successCount) || successCount < 0) {
      toast.error('成功数必须是不小于 0 的整数');
      return;
    }
    if (form.failCount.trim() === '' || !Number.isInteger(failCount) || failCount < 0) {
      toast.error('失败数必须是不小于 0 的整数');
      return;
    }
    setSubmitting(true);
    try {
      const dto: BatchImportFinishDto = { successCount, failCount };
      if (form.errorLog.trim()) dto.errorLog = form.errorLog.trim();
      await finishBatchImport(target.id, dto);
      toast.success(`导入任务「${target.importNo}」已完成`);
      onOpenChange(false);
      onFinished();
    } catch (error) {
      logger.error('完成导入任务失败', String(error));
      toast.error(toTaskEnhanceErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            完成导入「{target?.importNo ?? '—'}」
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            总条数 {target?.totalCount ?? 0} 条，请填写实际处理结果（成功数 + 失败数 不应超过总条数）。
          </p>
          <div className="flex flex-wrap gap-4">
            <TaskEnhanceFormField label="成功数" required>
              <Input
                className="rounded-none font-mono"
                type="number"
                min={0}
                placeholder="请输入成功条数"
                value={form.successCount}
                onChange={(event) => updateField('successCount', event.target.value)}
              />
            </TaskEnhanceFormField>
            <TaskEnhanceFormField label="失败数" required>
              <Input
                className="rounded-none font-mono"
                type="number"
                min={0}
                placeholder="请输入失败条数"
                value={form.failCount}
                onChange={(event) => updateField('failCount', event.target.value)}
              />
            </TaskEnhanceFormField>
          </div>
          <TaskEnhanceFormField label="错误日志（可选）">
            <Textarea
              rows={3}
              placeholder="请输入失败原因或错误日志"
              value={form.errorLog}
              onChange={(event) => updateField('errorLog', event.target.value)}
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
            {submitting ? '提交中...' : '确认完成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============ 查看结果 ============ */

interface BatchImportResultDialogProps {
  open: boolean;
  target: BatchImport | null;
  onOpenChange: (open: boolean) => void;
}

export const BatchImportResultDialog = ({
  open,
  target,
  onOpenChange,
}: BatchImportResultDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>导入结果「{target?.importNo ?? '—'}」</DialogTitle>
        </DialogHeader>
        {target ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  总条数
                </div>
                <div className="font-mono text-lg font-bold">{target.totalCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  成功数
                </div>
                <div className="font-mono text-lg font-bold text-[#10B981]">
                  {target.successCount}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  失败数
                </div>
                <div className="font-mono text-lg font-bold text-[#EF4444]">
                  {target.failCount}
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                完成时间
              </div>
              <div className="font-mono text-xs">
                {formatTaskEnhanceDateTime(target.completedAt)}
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                错误日志
              </div>
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {target.errorLog ?? '—'}
              </div>
            </div>
            {target.remark ? (
              <div className="border-t border-border pt-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  备注
                </div>
                <div className="break-words text-xs">{target.remark}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">暂无数据</div>
        )}
      </DialogContent>
    </Dialog>
  );
};
