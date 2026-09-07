import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { extractErrorMessage } from '@client/src/utils/extract-error-message';
import type { ContractTemplate, ContractTemplateStatus } from '@shared/api.interface';
import {
  createContractTemplate,
  updateContractTemplate,
} from '@client/src/api/contract-enhance';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export const TEMPLATE_CATEGORY_OPTIONS: string[] = [
  '广告投放合同',
  '视频制作合同',
  '服务合同',
  '其他',
];

export const TEMPLATE_INDUSTRY_OPTIONS: string[] = [
  '互联网',
  '快消零售',
  '汽车',
  '金融',
  '教育',
  '医疗健康',
  '餐饮',
  '制造业',
  '文娱传媒',
  '其他',
];

export const TEMPLATE_STATUS_OPTIONS: ContractTemplateStatus[] = ['启用', '停用'];

export const TEMPLATE_FILTER_ALL = '__ALL__';

export function toTemplateErrorText(error: unknown): string {
  return extractErrorMessage(error);
}

interface ContractTemplateFormDialogProps {
  open: boolean;
  editing: ContractTemplate | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}

/** 新建 / 编辑合同模板弹窗表单 */
export function ContractTemplateFormDialog({
  open,
  editing,
  onSaved,
  onOpenChange,
}: ContractTemplateFormDialogProps) {
  const [templateName, setTemplateName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [status, setStatus] = useState<ContractTemplateStatus>('启用');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTemplateName(editing.templateName);
      setCategory(editing.category);
      setContent(editing.content);
      setIndustries(editing.applicableIndustry ?? []);
      setStatus(editing.status);
    } else {
      setTemplateName('');
      setCategory('');
      setContent('');
      setIndustries([]);
      setStatus('启用');
    }
  }, [open, editing]);

  const toggleIndustry = (option: string, checked: boolean): void => {
    setIndustries((prev: string[]) => (
      checked ? [...prev, option] : prev.filter((item: string) => item !== option)
    ));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!templateName.trim()) {
      toast.error('请输入模板名称');
      return;
    }
    if (!category) {
      toast.error('请选择模板分类');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入模板内容');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updateContractTemplate(editing.id, {
          templateName: templateName.trim(),
          category,
          content: content.trim(),
          applicableIndustry: industries,
          status,
        });
        toast.success('合同模板已更新');
      } else {
        await createContractTemplate({
          templateName: templateName.trim(),
          category,
          content: content.trim(),
          applicableIndustry: industries,
          status,
        });
        toast.success('合同模板已创建');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error(`保存合同模板失败: ${toTemplateErrorText(error)}`);
      toast.error(toTemplateErrorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑合同模板' : '新建合同模板'}</DialogTitle>
          <DialogDescription>
            模板内容支持 {'{{客户名称}}'}、{'{{合同金额}}'}、{'{{签订日期}}'} 等占位符
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <label className="text-sm font-medium">
                模板名称 <span className="text-destructive">*</span>
              </label>
              <Input
                className="rounded-none"
                placeholder="请输入模板名称"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </div>
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <label className="text-sm font-medium">
                分类 <span className="text-destructive">*</span>
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full rounded-none">
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORY_OPTIONS.map((option: string) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              模板内容 <span className="text-destructive">*</span>
            </label>
            <Textarea
              className="min-h-[160px] rounded-none font-mono text-sm"
              placeholder="甲方：{{客户名称}}&#10;合同金额：{{合同金额}}&#10;签订日期：{{签订日期}}&#10;……"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">适用行业（可多选）</label>
            <div className="grid grid-cols-3 gap-2 rounded-none border border-border p-3">
              {TEMPLATE_INDUSTRY_OPTIONS.map((option: string) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 text-sm transition-colors hover:text-primary"
                >
                  <Checkbox
                    checked={industries.includes(option)}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      toggleIndustry(option, checked === true)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
          <div className="w-40 space-y-1.5">
            <label className="text-sm font-medium">状态</label>
            <Select
              value={status}
              onValueChange={(value: string) => setStatus(value as ContractTemplateStatus)}
            >
              <SelectTrigger className="w-full rounded-none">
                <SelectValue placeholder="请选择状态" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_STATUS_OPTIONS.map((option: ContractTemplateStatus) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
