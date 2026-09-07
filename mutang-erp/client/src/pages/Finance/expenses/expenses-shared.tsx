import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { cn } from '@client/src/lib/utils';
import { Button } from '@client/src/components/ui/button';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import type { FinanceAccount } from '@shared/api.interface';
import { fetchFinanceAccounts } from '@client/src/api/finance-core';
import {
  FINANCE_FILTER_ALL, formatFinanceAmount, toFinanceErrorText, toFinanceNumber,
} from '../finance-constants';

export const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toFinanceErrorText(error)}`);
  toast.error(toFinanceErrorText(error));
};

const BADGE_BASE: string =
  'inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold';

export function FinanceEnhanceStatusBadge({
  status, map,
}: { status: string; map: Record<string, string> }): ReactNode {
  return (
    <span className={cn(BADGE_BASE, map[status] ?? 'bg-slate-100 text-slate-500')}>
      {status}
    </span>
  );
}

export function FilterSelect({
  value, placeholder, options, allLabel, onChange,
}: {
  value: string; placeholder: string; options: string[]; allLabel: string;
  onChange: (value: string) => void;
}): ReactNode {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32 rounded-none"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={FINANCE_FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option: string) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ActionLink({
  danger, onClick, children,
}: {
  danger?: boolean; onClick: () => void; children: string;
}): ReactNode {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}
      className={`h-auto px-1 text-xs ${danger ? 'text-destructive' : 'text-primary'}`}>
      {children}
    </Button>
  );
}

export function AccountSelect({
  value, onChange, placeholder,
}: { value: string; onChange: (value: string) => void; placeholder: string }): ReactNode {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  useEffect(() => {
    let cancelled: boolean = false;
    fetchFinanceAccounts({ page: 1, pageSize: 100 })
      .then((result: { items: FinanceAccount[] }) => {
        if (!cancelled) {
          setAccounts(result.items.filter((account: FinanceAccount) => account.status === '启用'));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) reportError('加载资金账户失败', error);
      });
    return () => { cancelled = true; };
  }, []);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="rounded-none"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent position="popper" className="max-h-60 rounded-none">
        {accounts.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">暂无可用资金账户</div>
        ) : null}
        {accounts.map((account: FinanceAccount) => (
          <SelectItem key={account.id} value={String(account.id)}>
            {`${account.accountName}（${formatFinanceAmount(toFinanceNumber(account.balance))}）`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const APPROVE_PASS: string = 'pass';
const APPROVE_REJECT: string = 'reject';

export function ApproveDialog({
  open, title, description, onOpenChange, onSubmit,
}: {
  open: boolean; title: string; description: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (approved: boolean, rejectReason?: string) => Promise<void>;
}): ReactNode {
  const [decision, setDecision] = useState<string>(APPROVE_PASS);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  useEffect(() => {
    if (open) {
      setDecision(APPROVE_PASS);
      setRejectReason('');
      setSubmitting(false);
    }
  }, [open]);
  const handleSubmit = async (): Promise<void> => {
    if (decision === APPROVE_REJECT && !rejectReason.trim()) {
      toast.error('驳回时必须填写驳回原因');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(
        decision === APPROVE_PASS,
        decision === APPROVE_REJECT ? rejectReason.trim() : undefined,
      );
      onOpenChange(false);
    } catch (error: unknown) {
      reportError('审批操作失败', error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant={decision === APPROVE_PASS ? 'default' : 'outline'}
              className="rounded-none flex-1"
              onClick={() => setDecision(APPROVE_PASS)}
            >
              通过
            </Button>
            <Button
              variant={decision === APPROVE_REJECT ? 'destructive' : 'outline'}
              className="rounded-none flex-1"
              onClick={() => setDecision(APPROVE_REJECT)}
            >
              驳回
            </Button>
          </div>
          {decision === APPROVE_REJECT ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                驳回原因 <span className="text-destructive">*</span>
              </label>
              <Textarea
                className="rounded-none"
                rows={3}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="请填写驳回原因（必填）"
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中...' : '提交审批'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
