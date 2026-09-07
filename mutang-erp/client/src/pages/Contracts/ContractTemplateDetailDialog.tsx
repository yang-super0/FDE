import { useEffect, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ContractTemplate } from '@shared/api.interface';
import { getContractTemplate } from '@client/src/api/contract-enhance';
import { StatusBadge } from '@client/src/components/blueprint';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { toTemplateErrorText } from './ContractTemplateDialogs';

const PLACEHOLDER_SPLIT_PATTERN = /(\{\{[^}]+\}\})/g;

/** 将模板内容中的 {{xxx}} 占位符渲染为蓝色小标签 */
function renderTemplateContent(content: string): ReactNode[] {
  return content
    .split(PLACEHOLDER_SPLIT_PATTERN)
    .map((part: string, index: number): ReactNode => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return (
          <code
            key={index}
            className="mx-0.5 rounded-[2px] bg-primary/10 px-1 py-0.5 font-mono text-[13px] font-semibold text-primary"
          >
            {part}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
}

function IndustryTagList({ industries }: { industries: string[] }) {
  if (!industries || industries.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {industries.map((item: string) => (
        <span
          key={item}
          className="rounded-[2px] bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
        >
          {item}
        </span>
      ))}
    </span>
  );
}

interface ContractTemplateDetailDialogProps {
  open: boolean;
  templateId: number | null;
  onOpenChange: (open: boolean) => void;
}

/** 合同模板详情预览弹窗：全量信息 + 占位符高亮内容渲染 */
export function ContractTemplateDetailDialog({
  open,
  templateId,
  onOpenChange,
}: ContractTemplateDetailDialogProps) {
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!open || templateId === null) return;
    let cancelled: boolean = false;
    setLoading(true);
    setTemplate(null);
    getContractTemplate(templateId)
      .then((data: ContractTemplate) => {
        if (!cancelled) setTemplate(data);
      })
      .catch((error: unknown) => {
        logger.error(`加载模板详情失败: ${toTemplateErrorText(error)}`);
        if (!cancelled) toast.error(toTemplateErrorText(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, templateId]);

  const rows: Array<[string, ReactNode]> = template ? [
    ['模板编号', template.templateNo],
    ['模板名称', template.templateName],
    ['分类', template.category],
    ['适用行业', <IndustryTagList key="industries" industries={template.applicableIndustry ?? []} />],
    ['版本', template.version],
    [
      '状态',
      <StatusBadge key="status" tone={template.status === '启用' ? 'success' : 'neutral'}>
        {template.status}
      </StatusBadge>,
    ],
    ['创建人', template.createdBy],
    ['创建时间', dayjs(template.createdAt).format('YYYY-MM-DD HH:mm')],
    ['更新时间', dayjs(template.updatedAt).format('YYYY-MM-DD HH:mm')],
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>模板详情</DialogTitle>
          <DialogDescription>
            {loading ? '加载中...' : (template?.templateNo ?? '')}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            正在加载模板详情...
          </div>
        ) : !template ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <>
            <div>
              {rows.map(([label, value]: [string, ReactNode]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm"
                >
                  <span className="shrink-0 text-muted-foreground">{label}</span>
                  <span className="break-words text-right font-medium">{value || '—'}</span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
                模板内容
              </div>
              <div className="whitespace-pre-wrap break-words rounded-none border border-border bg-background p-4 font-mono text-sm leading-7">
                {renderTemplateContent(template.content)}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
