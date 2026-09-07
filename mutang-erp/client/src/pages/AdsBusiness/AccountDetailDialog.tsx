import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import type {
  AdAccountDetail,
  AdFilingBrief,
  AdTransferBrief,
} from '@shared/api.interface';
import { fetchAdAccount } from '@client/src/api/ad-business';
import { AdStatusBadge, formatMoney, toErrorText } from './ads-constants';

interface AccountDetailDialogProps {
  accountId: string | null;
  onOpenChange: (open: boolean) => void;
}

function MoneyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border border-t-[3px] border-t-primary bg-card p-4 shadow-md">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-black">
        ￥{formatMoney(value)}
      </div>
    </div>
  );
}

export function AccountDetailDialog({
  accountId,
  onOpenChange,
}: AccountDetailDialogProps) {
  const [detail, setDetail] = useState<AdAccountDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!accountId) {
      setDetail(null);
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    fetchAdAccount(accountId)
      .then((result: AdAccountDetail) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: unknown) => {
        logger.error(`加载账户详情失败: ${toErrorText(error)}`);
        toast.error('加载账户详情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const chartOption = useMemo((): EChartsOption | null => {
    if (!detail) return null;
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', top: '8%', bottom: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['累计充值', '累计消耗', '当前余额'],
        boundaryGap: true,
      },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          barWidth: 42,
          itemStyle: { borderRadius: [2, 2, 0, 0] },
          data: [
            { value: detail.totalRecharge, itemStyle: { color: '#0033A0' } },
            { value: detail.totalConsume, itemStyle: { color: '#2B5FC7' } },
            { value: detail.balance, itemStyle: { color: '#5B8DEF' } },
          ],
        },
      ],
    };
  }, [detail]);

  return (
    <Dialog
      open={accountId !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="rounded-none sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            广告账户详情
            {detail ? (
              <span className="ml-2 font-mono text-sm text-primary">
                {detail.accountNo}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        {loading || !detail ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        ) : (
          <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
            {/* 基本信息 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                01. 基本信息
              </div>
              <div className="grid grid-cols-2 gap-4 border border-border p-4 md:grid-cols-4">
                <div className="text-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">账户名称</div>
                  <div className="mt-1 font-medium">{detail.accountName}</div>
                </div>
                <div className="text-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">集团 / 主体</div>
                  <div className="mt-1 font-medium">
                    {detail.groupName || '-'} / {detail.subjectName || '-'}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">平台 / 端口</div>
                  <div className="mt-1 font-medium">
                    {detail.platform} / {detail.portType}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">状态</div>
                  <div className="mt-1">
                    <AdStatusBadge status={detail.status} />
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">商务</div>
                  <div className="mt-1">
                    {detail.salesperson ? (
                      <UserDisplay value={[detail.salesperson]} size="small" />
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">开户时间</div>
                  <div className="mt-1 font-mono text-xs">
                    {detail.openedAt
                      ? dayjs(detail.openedAt).format('YYYY-MM-DD HH:mm')
                      : '-'}
                  </div>
                </div>
                <div className="col-span-2 text-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">备注</div>
                  <div className="mt-1">{detail.remark || '-'}</div>
                </div>
              </div>
            </section>

            {/* 资金概览 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                02. 资金概览
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MoneyStat label="当前余额" value={detail.balance} />
                <MoneyStat label="累计充值" value={detail.totalRecharge} />
                <MoneyStat label="累计消耗" value={detail.totalConsume} />
              </div>
              {chartOption ? (
                <ReactECharts option={chartOption} theme="ud" className="h-[300px] w-full" />
              ) : null}
            </section>

            {/* 关联报备 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                03. 关联报备（{detail.filings.length}）
              </div>
              {detail.filings.length === 0 ? (
                <div className="border border-border p-4 text-xs text-muted-foreground">
                  暂无关联报备
                </div>
              ) : (
                <div className="divide-y divide-border border border-border">
                  {detail.filings.map((filing: AdFilingBrief) => (
                    <div key={filing.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-primary">
                          {filing.filingNo}
                        </span>
                        <span>{filing.productName || '未填产品'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <AdStatusBadge status={filing.status} />
                        <span className="font-mono text-xs text-muted-foreground">
                          {dayjs(filing.createdAt).format('YYYY-MM-DD')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 关联转户 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                04. 关联转户（{detail.transfers.length}）
              </div>
              {detail.transfers.length === 0 ? (
                <div className="border border-border p-4 text-xs text-muted-foreground">
                  暂无关联转户
                </div>
              ) : (
                <div className="divide-y divide-border border border-border">
                  {detail.transfers.map((transfer: AdTransferBrief) => (
                    <div key={transfer.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-primary">
                          {transfer.transferNo}
                        </span>
                        <span>转入：{transfer.toSubject}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <AdStatusBadge status={transfer.status} />
                        <span className="font-mono text-xs text-muted-foreground">
                          {dayjs(transfer.createdAt).format('YYYY-MM-DD')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
