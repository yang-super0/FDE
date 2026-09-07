import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import type { AdTransfer } from '@shared/api.interface';
import { fetchAdTransfer } from '@client/src/api/ad-business';
import { AdStatusBadge, toErrorText } from './ads-constants';

interface TransferDetailDialogProps {
  transferId: string | null;
  onOpenChange: (open: boolean) => void;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium">{value || '-'}</div>
    </div>
  );
}

export function TransferDetailDialog({
  transferId,
  onOpenChange,
}: TransferDetailDialogProps) {
  const [detail, setDetail] = useState<AdTransfer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!transferId) {
      setDetail(null);
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    fetchAdTransfer(transferId)
      .then((result: AdTransfer) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: unknown) => {
        logger.error(`加载转户详情失败: ${toErrorText(error)}`);
        toast.error('加载转户详情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transferId]);

  return (
    <Dialog
      open={transferId !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="rounded-none sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            转户详情
            {detail ? (
              <span className="ml-2 font-mono text-sm text-primary">
                {detail.transferNo}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        {loading || !detail ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
            {/* 基本信息 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                01. 基本信息
              </div>
              <div className="grid grid-cols-2 gap-4 border border-border p-4 md:grid-cols-3">
                <DetailItem label="转户账户" value={detail.accountName} />
                <DetailItem label="原主体" value={detail.fromSubject} />
                <DetailItem label="目标主体" value={detail.toSubject} />
                <DetailItem label="原端口" value={detail.fromPort} />
                <DetailItem label="目标端口" value={detail.toPort} />
                <DetailItem
                  label="状态"
                  value={<AdStatusBadge status={detail.status} />}
                />
                <DetailItem label="转户原因" value={detail.transferReason} />
                <DetailItem label="备注" value={detail.remark} />
              </div>
            </section>

            {/* 审批时间线 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                02. 审批信息
              </div>
              <div className="space-y-0 border-l-2 border-border pl-4">
                <div className="pb-4">
                  <div className="text-xs font-bold">提交申请</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {detail.applicant ? (
                      <UserDisplay value={[detail.applicant]} size="small" />
                    ) : null}
                    <span className="font-mono">
                      {dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                </div>
                {detail.approvedAt ? (
                  <div className="pb-4">
                    <div className="text-xs font-bold">
                      审批结果：
                      <AdStatusBadge status={detail.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {detail.approver ? (
                        <UserDisplay value={[detail.approver]} size="small" />
                      ) : (
                        <span>-</span>
                      )}
                      <span className="font-mono">
                        {dayjs(detail.approvedAt).format('YYYY-MM-DD HH:mm')}
                      </span>
                    </div>
                    {detail.status === '驳回' && detail.rejectReason ? (
                      <div className="mt-2 border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                        驳回原因：{detail.rejectReason}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="pb-1 text-xs text-muted-foreground">
                    等待审批中...
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
