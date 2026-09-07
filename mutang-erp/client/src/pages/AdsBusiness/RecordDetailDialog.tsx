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
import type {
  CommissionRecordDetail,
  CommissionRule,
} from '@shared/api.interface';
import { fetchCommissionRecord } from '@client/src/api/ad-business';
import { AdStatusBadge, formatMoney, toErrorText } from './ads-constants';

interface RecordDetailDialogProps {
  recordId: string | null;
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

function formatDateTime(value: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';
}

function formatRuleValue(rule: CommissionRule): string {
  if (rule.ruleType === '固定金额') {
    return rule.fixedAmount !== null
      ? `固定金额 ¥${formatMoney(rule.fixedAmount)}`
      : '-';
  }
  return rule.rate !== null ? `${rule.rate}%` : '-';
}

function formatRulePeriod(rule: CommissionRule): string {
  const start: string = rule.effectiveDate
    ? dayjs(rule.effectiveDate).format('YYYY-MM-DD')
    : '不限';
  const end: string = rule.expireDate
    ? dayjs(rule.expireDate).format('YYYY-MM-DD')
    : '不限';
  return `${start} 至 ${end}`;
}

export function RecordDetailDialog({
  recordId,
  onOpenChange,
}: RecordDetailDialogProps) {
  const [detail, setDetail] = useState<CommissionRecordDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!recordId) {
      setDetail(null);
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    fetchCommissionRecord(recordId)
      .then((result: CommissionRecordDetail) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: unknown) => {
        logger.error(`加载提成记录详情失败: ${toErrorText(error)}`);
        toast.error('加载提成记录详情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  const rule: CommissionRule | null = detail?.rule ?? null;
  const isFixedAmount: boolean = rule !== null && rule.ruleType === '固定金额';

  return (
    <Dialog
      open={recordId !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="rounded-none sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            提成记录详情
            {detail ? (
              <span className="ml-2 font-mono text-sm text-primary">
                {detail.recordNo}
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
            {/* 01 基本信息 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                01. 基本信息
              </div>
              <div className="grid grid-cols-2 gap-4 border border-border p-4 md:grid-cols-3">
                <DetailItem label="记录编号" value={detail.recordNo} />
                <DetailItem
                  label="商务"
                  value={
                    detail.salesperson ? (
                      <UserDisplay value={[detail.salesperson]} size="small" />
                    ) : (
                      '-'
                    )
                  }
                />
                <DetailItem label="账户" value={detail.accountName} />
                <DetailItem label="集团" value={detail.groupName} />
                <DetailItem label="平台" value={detail.platform} />
                <DetailItem label="周期" value={detail.period} />
                <DetailItem
                  label="状态"
                  value={<AdStatusBadge status={detail.status} />}
                />
                <DetailItem
                  label="计算时间"
                  value={formatDateTime(detail.calculatedAt)}
                />
                <DetailItem
                  label="发放时间"
                  value={formatDateTime(detail.paidAt)}
                />
                <DetailItem
                  label="发放人"
                  value={
                    detail.paidBy ? (
                      <UserDisplay value={[detail.paidBy]} size="small" />
                    ) : (
                      '-'
                    )
                  }
                />
                <DetailItem label="备注" value={detail.remark} />
              </div>
            </section>

            {/* 02 规则说明 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                02. 规则说明
              </div>
              {rule ? (
                <div className="grid grid-cols-2 gap-4 border border-border p-4 md:grid-cols-3">
                  <DetailItem label="规则名称" value={rule.ruleName} />
                  <DetailItem label="规则类型" value={rule.ruleType} />
                  <DetailItem label="提成方式" value={formatRuleValue(rule)} />
                  <DetailItem
                    label="有效期"
                    value={formatRulePeriod(rule)}
                  />
                  <DetailItem label="平台" value={rule.platform || '全部'} />
                  <DetailItem label="端口" value={rule.portType || '全部'} />
                  {rule.minAmount !== null || rule.maxAmount !== null ? (
                    <DetailItem
                      label="消耗区间"
                      value={`¥${formatMoney(rule.minAmount ?? 0)} 起${
                        rule.maxAmount !== null
                          ? `，至 ¥${formatMoney(rule.maxAmount)}`
                          : ''
                      }`}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="border border-border p-4 text-sm text-muted-foreground">
                  未匹配规则
                </div>
              )}
            </section>

            {/* 03 计算明细 */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                03. 计算明细
              </div>
              <div className="border border-border p-4">
                {isFixedAmount ? (
                  <div className="text-sm font-medium">
                    固定金额{' '}
                    <span className="font-mono font-bold text-primary">
                      ¥{formatMoney(rule.fixedAmount ?? 0)}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
                    <span className="text-muted-foreground">消耗金额</span>
                    <span className="font-bold">
                      ¥{formatMoney(detail.consumeAmount)}
                    </span>
                    {rule && rule.rate !== null ? (
                      <>
                        <span className="text-muted-foreground">×</span>
                        <span className="font-bold">{rule.rate}%</span>
                      </>
                    ) : null}
                    <span className="text-muted-foreground">=</span>
                    <span className="text-muted-foreground">提成金额</span>
                    <span className="font-bold text-primary">
                      ¥{formatMoney(detail.commissionAmount)}
                    </span>
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
