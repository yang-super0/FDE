import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import type { Lead, LeadDetail, LeadFollowUp } from '@shared/api.interface';
import { fetchLead } from '@client/src/api/customer-pool';
import { LeadStatusBadge, toErrorText } from './constants';

const ITEM_LABEL_CLASS: string =
  'text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground';

interface LeadDetailDrawerProps {
  leadId: string | null;
  onOpenChange: (open: boolean) => void;
  onFollowUp: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onAbandon: (lead: Lead) => void;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-1.5">
      <span className={ITEM_LABEL_CLASS}>{label}</span>
      <span className="break-words text-sm font-medium">{value || '-'}</span>
    </div>
  );
}

function SectionLabel({ no, text }: { no: string; text: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
      <span className="text-primary">{no}.</span>
      <span>{text}</span>
    </div>
  );
}

export function LeadDetailDrawer({
  leadId,
  onOpenChange,
  onFollowUp,
  onConvert,
  onAbandon,
}: LeadDetailDrawerProps) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      return;
    }
    let cancelled: boolean = false;
    setLoading(true);
    setError(null);
    fetchLead(leadId)
      .then((detail: LeadDetail) => {
        if (!cancelled) setLead(detail);
      })
      .catch((err: unknown) => {
        const message: string = toErrorText(err);
        logger.error(`加载线索详情失败: ${message}`);
        if (!cancelled) setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const sortedFollowUps: LeadFollowUp[] = useMemo(() => {
    if (!lead) return [];
    return [...lead.followUps].sort(
      (a: LeadFollowUp, b: LeadFollowUp) =>
        dayjs(b.followUpAt).valueOf() - dayjs(a.followUpAt).valueOf(),
    );
  }, [lead]);

  const closed: boolean =
    lead !== null && (lead.status === '已转化' || lead.status === '已放弃');

  return (
    <Dialog
      open={leadId !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>线索详情</DialogTitle>
          <DialogDescription>{lead?.leadName ?? '加载中...'}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-destructive">
            加载失败：{error}
          </div>
        ) : lead ? (
          <div className="space-y-5">
            <div>
              <SectionLabel no="01" text="BASIC INFO / 基本信息" />
              <div className="grid grid-cols-2 gap-x-6">
                <DetailItem label="线索名称" value={lead.leadName} />
                <div className="flex flex-col gap-1 py-1.5">
                  <span className={ITEM_LABEL_CLASS}>状态</span>
                  <span>
                    <LeadStatusBadge status={lead.status} />
                  </span>
                </div>
                <DetailItem label="联系人" value={lead.contactPerson} />
                <DetailItem label="联系电话" value={lead.contactPhone} />
                <DetailItem label="行业" value={lead.industry} />
                <DetailItem label="来源" value={lead.source} />
                <DetailItem
                  label="下次跟进时间"
                  value={
                    lead.nextFollowUpAt
                      ? dayjs(lead.nextFollowUpAt).format('YYYY-MM-DD HH:mm')
                      : ''
                  }
                />
                <DetailItem
                  label="创建时间"
                  value={dayjs(lead.createdAt).format('YYYY-MM-DD HH:mm')}
                />
                <div className="flex flex-col gap-1 py-1.5">
                  <span className={ITEM_LABEL_CLASS}>负责人</span>
                  {lead.owner ? (
                    <UserDisplay value={[lead.owner]} size="small" />
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>
              {lead.remark ? (
                <div className="mt-1">
                  <span className={ITEM_LABEL_CLASS}>备注</span>
                  <p className="mt-1 break-words text-sm">{lead.remark}</p>
                </div>
              ) : null}
            </div>
            {lead.status === '已转化' ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border border-border bg-accent px-3 py-2 text-xs">
                <span className="font-black uppercase tracking-[0.15em] text-primary">
                  转化记录
                </span>
                <span>
                  转化时间：
                  {lead.convertedAt
                    ? dayjs(lead.convertedAt).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </span>
                <span className="break-words">
                  客户 ID：{lead.convertedCustomerId || '-'}
                </span>
              </div>
            ) : null}
            <div>
              <SectionLabel no="02" text="FOLLOW-UPS / 跟进记录" />
              {sortedFollowUps.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  暂无跟进记录
                </div>
              ) : (
                <div>
                  {sortedFollowUps.map((item: LeadFollowUp) => (
                    <div
                      key={item.id}
                      className="relative border-l border-border pb-4 pl-4 last:pb-0"
                    >
                      <span className="absolute -left-[4px] top-1 size-2 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-[2px] bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-bold text-[#0033A0]">
                          {item.followUpType}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {dayjs(item.followUpAt).format('YYYY-MM-DD HH:mm')}
                        </span>
                        {item.followUpBy ? (
                          <UserDisplay value={[item.followUpBy]} size="small" />
                        ) : null}
                      </div>
                      <div className="mt-1 break-words text-sm">
                        {item.content}
                      </div>
                      {item.nextAction ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          下一步：{item.nextAction}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
        {lead ? (
          <DialogFooter>
            <Button
              data-ai-section-type="button"
              disabled={closed}
              onClick={() => onFollowUp(lead)}
            >
              跟进
            </Button>
            <Button
              variant="outline"
              disabled={closed}
              onClick={() => onConvert(lead)}
            >
              转化
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              disabled={closed}
              onClick={() => onAbandon(lead)}
            >
              放弃
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
