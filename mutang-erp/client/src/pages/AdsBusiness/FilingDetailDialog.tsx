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
import type { AdFiling } from '@shared/api.interface';
import { fetchAdFiling } from '@client/src/api/ad-business';
import { AdStatusBadge, toErrorText } from './ads-constants';

interface FilingDetailDialogProps {
  filingId: string | null;
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

export function FilingDetailDialog({
  filingId,
  onOpenChange,
}: FilingDetailDialogProps) {
  const [detail, setDetail] = useState<AdFiling | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!filingId) {
      setDetail(null);
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    fetchAdFiling(filingId)
      .then((result: AdFiling) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: unknown) => {
        logger.error(`加载报备详情失败: ${toErrorText(error)}`);
        toast.error('加载报备详情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filingId]);

  return (
    <Dialog
      open={filingId !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="rounded-none sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            报备详情
            {detail ? (
              <span className="ml-2 font-mono text-sm text-primary">
                {detail.filingNo}
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
                <DetailItem label="关联账户" value={detail.accountName} />
                <DetailItem label="集团名称" value={detail.groupName} />
                <DetailItem label="主体名称" value={detail.subjectName} />
                <DetailItem label="投放平台" value={detail.platform} />
                <DetailItem label="行业" value={detail.industry} />
                <DetailItem label="产品名称" value={detail.productName} />
                <DetailItem
                  label="状态"
                  value={<AdStatusBadge status={detail.status} />}
                />
                <DetailItem label="材料说明" value={detail.filingMaterial} />
                <DetailItem label="备注" value={detail.remark} />
              </div>
            </section>

            {/* 审核信息时间线 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                02. 审核信息
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
                {detail.reviewedAt ? (
                  <div className="pb-4">
                    <div className="text-xs font-bold">
                      审核结果：
                      <AdStatusBadge status={detail.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {detail.reviewer ? (
                        <UserDisplay value={[detail.reviewer]} size="small" />
                      ) : (
                        <span>-</span>
                      )}
                      <span className="font-mono">
                        {dayjs(detail.reviewedAt).format('YYYY-MM-DD HH:mm')}
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
                    等待审核中...
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
