import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CustomerAccount, LoginLog } from '@shared/api.interface';
import { listCustomerAccountLoginLogs } from '@client/src/api/system-enhance/customer-accounts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  formatSystemEnhanceDateTime,
  toSystemEnhanceErrorText,
} from '../system-enhance-shared';
import {
  LoginRiskFlagBadge,
  LoginStatusBadge,
} from '../login-logs/LoginLogColumns';

interface CustomerAccountLoginLogsDialogProps {
  open: boolean;
  target: CustomerAccount | null;
  onOpenChange: (open: boolean) => void;
}

export const CustomerAccountLoginLogsDialog = ({
  open,
  target,
  onOpenChange,
}: CustomerAccountLoginLogsDialogProps) => {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !target) return;
    let cancelled: boolean = false;
    setLoading(true);
    setLogs([]);
    listCustomerAccountLoginLogs(target.id)
      .then((result: LoginLog[]) => {
        if (!cancelled) setLogs(result);
      })
      .catch((error: unknown) => {
        logger.error('加载客户账户登录记录失败', String(error));
        if (!cancelled) toast.error(toSystemEnhanceErrorText(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, target]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            登录记录 · {target?.username ?? '—'}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {target?.customerName ?? ''}
            </span>
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            加载中…
          </p>
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            暂无登录记录
          </p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto rounded-none border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-bold">登录时间</th>
                  <th className="px-3 py-2 font-bold">IP地址</th>
                  <th className="px-3 py-2 font-bold">状态</th>
                  <th className="px-3 py-2 font-bold">风险标记</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: LoginLog) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">
                      {formatSystemEnhanceDateTime(log.createdAt)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {log.ipAddress ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <LoginStatusBadge status={log.loginStatus} />
                    </td>
                    <td className="px-3 py-2">
                      {log.riskFlags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {log.riskFlags.map((flag: string) => (
                            <LoginRiskFlagBadge key={flag} flag={flag} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
