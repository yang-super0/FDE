import { useCallback, useEffect, useState } from 'react';
import { BadgePercent } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ContractApprovalRecord,
  ContractDetail,
} from '@shared/api.interface';
import { StatusBadge } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import { cn } from '@client/src/lib/utils';
import { getContractDetail } from '@client/src/api/contracts';
import { ContractCommissionDialog } from './ContractCommissionDialog';
import { ContractCommissionTab } from './ContractCommissionTab';
import { ContractExpensesTab, ContractRemindersTab } from './ContractDetailTabs';
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  formatAmount,
  formatDate,
  formatDateTime,
} from './contract-ui';

interface ContractDetailDialogProps {
  contractId: string | null;
  onClose: () => void;
}

interface InfoFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

const InfoField = ({ label, value, mono }: InfoFieldProps) => (
  <div>
    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
      {label}
    </div>
    <div
      className={cn('break-words text-sm font-medium', mono && 'font-mono')}
    >
      {value || '-'}
    </div>
  </div>
);

const TAB_TRIGGER_CLASS: string = 'rounded-none';

const toNum = (v: number | string | null | undefined): number =>
  typeof v === 'number' ? v : Number(v) || 0;

const ContractDetailDialog = ({
  contractId,
  onClose,
}: ContractDetailDialogProps) => {
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [commissionOpen, setCommissionOpen] = useState<boolean>(false);
  const [commissionRefreshKey, setCommissionRefreshKey] = useState<number>(0);

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(false);
    setDetail(null);
    try {
      const data: ContractDetail = await getContractDetail(id);
      setDetail(data);
    } catch (fetchError: unknown) {
      logger.error(
        `加载合同详情失败: ${
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        }`,
      );
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!contractId) return;
    void fetchDetail(contractId);
  }, [contractId, fetchDetail]);

  const canApplyCommission: boolean =
    detail !== null &&
    (detail.status === 'expired' || detail.status === 'terminated');

  return (
    <Dialog
      open={contractId !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-none sm:max-w-[760px]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle>合同详情</DialogTitle>
              <DialogDescription>
                合同完整信息、审批记录与关联业务
              </DialogDescription>
            </div>
            {canApplyCommission ? (
              <Button size="sm" onClick={() => setCommissionOpen(true)}>
                <BadgePercent className="mr-1 size-4" />
                申请提成
              </Button>
            ) : null}
          </div>
        </DialogHeader>
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            加载失败，请关闭后重试
          </div>
        ) : detail ? (
          <Tabs defaultValue="info">
            <TabsList className="rounded-none">
              <TabsTrigger value="info" className={TAB_TRIGGER_CLASS}>
                基本信息
              </TabsTrigger>
              <TabsTrigger value="expenses" className={TAB_TRIGGER_CLASS}>
                费用
              </TabsTrigger>
              <TabsTrigger value="reminders" className={TAB_TRIGGER_CLASS}>
                提醒记录
              </TabsTrigger>
              <TabsTrigger value="commission" className={TAB_TRIGGER_CLASS}>
                提成申请
              </TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <InfoField label="合同编号" value={detail.code} mono />
                  <InfoField label="关联客户" value={detail.customerName} />
                  <InfoField label="合同类型" value={detail.contractType} />
                  <InfoField
                    label="合同金额（元）"
                    value={formatAmount(toNum(detail.amount))}
                    mono
                  />
                  <InfoField
                    label="签订日期"
                    value={formatDate(detail.signDate)}
                  />
                  <InfoField
                    label="到期日期"
                    value={formatDate(detail.expireDate)}
                  />
                </div>
                {detail.content ? (
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                      合同内容
                    </div>
                    <p className="break-words text-sm text-foreground">
                      {detail.content}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">状态</span>
                  <StatusBadge tone={CONTRACT_STATUS_TONE[detail.status]}>
                    {CONTRACT_STATUS_LABEL[detail.status]}
                  </StatusBadge>
                  {detail.expiringSoon ? (
                    <StatusBadge tone="warning">即将到期</StatusBadge>
                  ) : null}
                </div>
                {detail.rejectReason ? (
                  <div className="border border-[#FECACA] bg-[#FEF2F2] p-4">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#EF4444]">
                      驳回原因
                    </div>
                    <p className="break-words text-sm text-foreground">
                      {detail.rejectReason}
                    </p>
                  </div>
                ) : null}
                <div>
                  <div className="mb-4 text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                    审批记录
                  </div>
                  {detail.approvals.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      暂无审批记录
                    </div>
                  ) : (
                    <div>
                      {detail.approvals.map(
                        (item: ContractApprovalRecord, index: number) => (
                          <div
                            key={`${item.createdAt}-${index}`}
                            className="relative border-l border-border pb-5 pl-5 last:pb-0"
                          >
                            <span
                              className={cn(
                                'absolute -left-[5px] top-1.5 size-2.5 rounded-full',
                                item.action === 'approved'
                                  ? 'bg-[#10B981]'
                                  : 'bg-[#EF4444]',
                              )}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge
                                tone={
                                  item.action === 'approved'
                                    ? 'success'
                                    : 'danger'
                                }
                              >
                                {item.action === 'approved' ? '通过' : '驳回'}
                              </StatusBadge>
                              <span className="text-sm font-medium">
                                {item.approverName || '未知审批人'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(item.createdAt)}
                              </span>
                            </div>
                            {item.comment ? (
                              <p className="mt-1 break-words text-sm text-muted-foreground">
                                {item.comment}
                              </p>
                            ) : null}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="expenses" className="mt-4">
              <ContractExpensesTab contractId={detail.id} />
            </TabsContent>
            <TabsContent value="reminders" className="mt-4">
              <ContractRemindersTab contract={detail} />
            </TabsContent>
            <TabsContent value="commission" className="mt-4">
              <ContractCommissionTab
                contractId={detail.id}
                refreshKey={commissionRefreshKey}
              />
            </TabsContent>
          </Tabs>
        ) : null}

        {detail ? (
          <ContractCommissionDialog
            open={commissionOpen}
            onOpenChange={setCommissionOpen}
            contract={detail}
            onApplied={() => {
              setCommissionRefreshKey((key: number) => key + 1);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export { ContractDetailDialog };
