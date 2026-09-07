import type { OperationLogEnhance } from '@shared/api.interface';
import { cn } from '@client/src/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { formatSystemEnhanceDateTime } from '../system-enhance-shared';
import { OperationLogRiskBadge } from './OperationLogColumns';

/* ============ before / after 数据对比（差异字段高亮） ============ */

interface DiffRow {
  key: string;
  before: string;
  after: string;
  changed: boolean;
  added: boolean;
  removed: boolean;
}

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 1);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const buildDiffRows = (
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): DiffRow[] => {
  const beforeKeys: string[] = before ? Object.keys(before) : [];
  const afterKeys: string[] = after ? Object.keys(after) : [];
  const keys: string[] = [
    ...new Set([...beforeKeys, ...afterKeys]),
  ];
  return keys.map((key: string) => {
    const hasBefore: boolean = beforeKeys.includes(key);
    const hasAfter: boolean = afterKeys.includes(key);
    const beforeValue: string = hasBefore
      ? stringifyValue(before?.[key])
      : '(无)';
    const afterValue: string = hasAfter ? stringifyValue(after?.[key]) : '(无)';
    return {
      key,
      before: beforeValue,
      after: afterValue,
      changed:
        hasBefore &&
        hasAfter &&
        stringifyValue(before?.[key]) !== stringifyValue(after?.[key]),
      added: !hasBefore && hasAfter,
      removed: hasBefore && !hasAfter,
    };
  });
};

interface OperationLogDetailDialogProps {
  open: boolean;
  target: OperationLogEnhance | null;
  onOpenChange: (open: boolean) => void;
}

export const OperationLogDetailDialog = ({
  open,
  target,
  onOpenChange,
}: OperationLogDetailDialogProps) => {
  const diffRows: DiffRow[] = target
    ? buildDiffRows(target.beforeData, target.afterData)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>操作日志详情</DialogTitle>
        </DialogHeader>
        {target ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-none border border-border px-4 py-3 text-sm">
              <div>
                <span className="text-muted-foreground">日志编号：</span>
                <span className="font-bold text-primary">
                  {target.logNo}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">风险等级：</span>
                <OperationLogRiskBadge riskLevel={target.riskLevel} />
              </div>
              <div>
                <span className="text-muted-foreground">用户：</span>
                {target.username}
              </div>
              <div>
                <span className="text-muted-foreground">模块/操作：</span>
                {target.module} / {target.operation}
              </div>
              <div>
                <span className="text-muted-foreground">对象：</span>
                {target.targetName ?? '—'}（{target.targetType}
                {target.targetId ? ` #${target.targetId}` : ''}）
              </div>
              <div>
                <span className="text-muted-foreground">IP地址：</span>
                <span className="font-mono text-xs">
                  {target.ipAddress ?? '—'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">操作时间：</span>
                <span className="font-mono text-xs">
                  {formatSystemEnhanceDateTime(target.createdAt)}
                </span>
              </div>
            </div>
            <div className="rounded-none border border-border">
              <div className="grid grid-cols-[160px_1fr_1fr] border-b border-border bg-accent text-xs font-bold text-muted-foreground">
                <div className="px-3 py-2">字段</div>
                <div className="px-3 py-2">变更前（BEFORE）</div>
                <div className="px-3 py-2">变更后（AFTER）</div>
              </div>
              {diffRows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  无变更数据快照
                </p>
              ) : (
                diffRows.map((row: DiffRow) => (
                  <div
                    key={row.key}
                    className={cn(
                      'grid grid-cols-[160px_1fr_1fr] border-b border-border text-xs last:border-0',
                      row.changed &&
                        'bg-[#FEF2F2] font-bold text-[#EF4444]',
                      row.added && 'bg-[#ECFDF5] text-[#10B981]',
                      row.removed && 'bg-slate-100 text-slate-500',
                    )}
                  >
                    <div className="break-words px-3 py-2 font-mono">
                      {row.key}
                    </div>
                    <div className="break-words px-3 py-2 font-mono">
                      {row.before}
                    </div>
                    <div className="break-words px-3 py-2 font-mono">
                      {row.after}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              红色行表示字段值发生变化，绿色行表示新增字段，灰色行表示删除字段。
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无数据</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
