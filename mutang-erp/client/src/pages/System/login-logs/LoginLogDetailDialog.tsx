import type { LoginLog } from '@shared/api.interface';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { formatSystemEnhanceDateTime } from '../system-enhance-shared';
import { LoginRiskFlagBadge, LoginStatusBadge } from './LoginLogColumns';

interface LoginLogDetailDialogProps {
  open: boolean;
  target: LoginLog | null;
  onOpenChange: (open: boolean) => void;
}

interface LoginLogFieldRow {
  label: string;
  value: string | null;
}

const buildFieldRows = (target: LoginLog): LoginLogFieldRow[] => [
  { label: '日志编号', value: target.logNo },
  { label: '用户ID', value: target.userId },
  { label: '用户名', value: target.username },
  { label: '登录方式', value: target.loginType },
  { label: '失败原因', value: target.failReason },
  { label: 'IP地址', value: target.ipAddress },
  { label: '归属地', value: target.ipLocation },
  { label: '设备信息', value: target.deviceInfo },
  { label: 'User-Agent', value: target.userAgent },
  { label: '备注', value: target.remark },
];

export const LoginLogDetailDialog = ({
  open,
  target,
  onOpenChange,
}: LoginLogDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>登录日志详情</DialogTitle>
        </DialogHeader>
        {target ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">登录状态：</span>
              <LoginStatusBadge status={target.loginStatus} />
              <span className="text-sm text-muted-foreground">
                登录时间：
                <span className="font-mono text-foreground">
                  {formatSystemEnhanceDateTime(target.createdAt)}
                </span>
              </span>
            </div>
            {target.riskFlags.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">风险标记：</span>
                <div className="flex flex-wrap gap-1">
                  {target.riskFlags.map((flag: string) => (
                    <LoginRiskFlagBadge key={flag} flag={flag} />
                  ))}
                </div>
              </div>
            ) : null}
            <div className="divide-y divide-border rounded-none border border-border">
              {buildFieldRows(target).map((row: LoginLogFieldRow) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[110px_1fr] gap-2 px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="break-words">{row.value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无数据</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
