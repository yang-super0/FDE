import {
  useCallback,
  useEffect,
  useState,
  type Key,
} from 'react';
import dayjs from 'dayjs';
import { BellRing, CalendarIcon, FileStack, Plus } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type {
  ApplyContractTemplateResult,
  Contract,
  ContractStatus,
  ContractSummary,
} from '@shared/api.interface';
import {
  ReportCard,
  SectionHeader,
  StatusBadge,
} from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';
import { cn } from '@client/src/lib/utils';
import {
  approveContract,
  deleteContract,
  getContractSummary,
  listContracts,
  type ContractListParams,
} from '@client/src/api/contracts';
import { ContractCreateDialog } from './ContractCreateDialog';
import { ContractDetailDialog } from './ContractDetailDialog';
import { ContractRemindDialog } from './ContractRemindDialog';
import { ContractTable } from './ContractTable';
import { ContractTemplatePickerDialog } from './ContractTemplatePickerDialog';
import { formatDate } from './contract-ui';

const PAGE_SIZE: number = 20;
const ALL_STATUS: string = 'all';

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const Contracts = () => {
  const [summary, setSummary] = useState<ContractSummary | null>(null);
  const [summaryError, setSummaryError] = useState<boolean>(false);
  const [items, setItems] = useState<Contract[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
  const [expireFrom, setExpireFrom] = useState<Date | undefined>(undefined);
  const [expireTo, setExpireTo] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [listError, setListError] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Contract | null>(null);
  const [rejectComment, setRejectComment] = useState<string>('');
  const [approving, setApproving] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Key[]>([]);
  const [remindOpen, setRemindOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [templateOpen, setTemplateOpen] = useState<boolean>(false);
  const [createInitial, setCreateInitial] = useState<
    { contractType?: string; content?: string } | undefined
  >(undefined);

  const fetchSummary = useCallback(async () => {
    try {
      const data: ContractSummary = await getContractSummary();
      setSummary(data);
      setSummaryError(false);
    } catch (error: unknown) {
      logger.error(`加载合同概览失败: ${toErrorText(error)}`);
      setSummaryError(true);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setListError(false);
    try {
      const params: ContractListParams = { page, pageSize: PAGE_SIZE };
      if (statusFilter !== ALL_STATUS) {
        params.status = statusFilter as ContractStatus;
      }
      if (expireFrom) {
        params.expireFrom = dayjs(expireFrom).startOf('day').toISOString();
      }
      if (expireTo) {
        params.expireTo = dayjs(expireTo).endOf('day').toISOString();
      }
      const data = await listContracts(params);
      setItems(data.items);
      setTotal(data.total);
    } catch (error: unknown) {
      logger.error(`加载合同列表失败: ${toErrorText(error)}`);
      setListError(true);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, expireFrom, expireTo]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary, reloadKey]);

  useEffect(() => {
    void fetchList();
  }, [fetchList, reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((key: number) => key + 1);
  }, []);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    setSelectedIds([]);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setSelectedIds([]);
  };

  const selectedContracts: Contract[] = items.filter(
    (item: Contract) => selectedIds.includes(item.id),
  );

  const handleTemplateApplied = (result: ApplyContractTemplateResult) => {
    setTemplateOpen(false);
    setCreateInitial({
      contractType: result.category,
      content: result.content,
    });
    setCreateOpen(true);
  };

  const handleExpireFromChange = (date: Date | undefined) => {
    setExpireFrom(date);
    setPage(1);
  };

  const handleExpireToChange = (date: Date | undefined) => {
    setExpireTo(date);
    setPage(1);
  };

  const hasActiveFilter: boolean =
    statusFilter !== ALL_STATUS || Boolean(expireFrom) || Boolean(expireTo);

  const handleResetFilters = () => {
    setStatusFilter(ALL_STATUS);
    setExpireFrom(undefined);
    setExpireTo(undefined);
    setPage(1);
  };

  const handleApprove = async (id: string) => {
    setApproving(true);
    try {
      await approveContract(id, { action: 'approved' });
      toast.success('审批已通过');
      refresh();
    } catch (error: unknown) {
      logger.error(`审批失败: ${toErrorText(error)}`);
      toast.error('审批失败，请重试');
    } finally {
      setApproving(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContract(deleteTarget.id);
      toast.success('合同已删除');
      setDeleteTarget(null);
      refresh();
    } catch (error: unknown) {
      logger.error(`删除合同失败: ${toErrorText(error)}`);
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : '删除合同失败，请重试',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenReject = (contract: Contract) => {
    setRejectTarget(contract);
    setRejectComment('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    const comment: string = rejectComment.trim();
    if (!comment) {
      toast.error('请填写驳回原因');
      return;
    }
    setApproving(true);
    try {
      await approveContract(rejectTarget.id, {
        action: 'rejected',
        comment,
      });
      toast.success('已驳回该合同');
      setRejectTarget(null);
      setRejectComment('');
      refresh();
    } catch (error: unknown) {
      logger.error(`驳回失败: ${toErrorText(error)}`);
      toast.error('驳回失败，请重试');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-8">
      <section>
        <SectionHeader no="01" label="SUMMARY" subtitle="合同概览" />
        {summaryError ? (
          <ReportCard>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                概览加载失败
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void fetchSummary()}
              >
                重试
              </Button>
            </div>
          </ReportCard>
        ) : (
          <div
            className="grid grid-cols-1 gap-8 md:grid-cols-3"
            data-ai-section-type="card-stat"
          >
            <ReportCard>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                合同总数
              </div>
              <div className="mt-2 font-mono text-4xl font-black">
                {summary ? summary.total : '-'}
              </div>
            </ReportCard>
            <ReportCard>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                执行中
              </div>
              <div className="mt-2 font-mono text-4xl font-black text-primary">
                {summary ? summary.active : '-'}
              </div>
            </ReportCard>
            <ReportCard>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                即将到期
              </div>
              <div className="mt-3">
                {summary ? (
                  <StatusBadge tone="warning" className="px-3 py-1 text-base">
                    {summary.expiring}
                  </StatusBadge>
                ) : (
                  <span className="font-mono text-4xl font-black">-</span>
                )}
              </div>
            </ReportCard>
          </div>
        )}
      </section>

      <section>
        <SectionHeader no="02" label="CONTRACTS" subtitle="合同台账与审批" />
        <ReportCard>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px] rounded-none">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS}>全部状态</SelectItem>
                  <SelectItem value="pending">待审批</SelectItem>
                  <SelectItem value="active">执行中</SelectItem>
                  <SelectItem value="expired">已到期</SelectItem>
                  <SelectItem value="terminated">已终止</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  到期时间
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-[130px] justify-start rounded-none text-left font-normal',
                        !expireFrom && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-1 size-3.5" />
                      {expireFrom
                        ? formatDate(expireFrom.toISOString())
                        : '开始日期'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expireFrom}
                      onSelect={handleExpireFromChange}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">至</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-[130px] justify-start rounded-none text-left font-normal',
                        !expireTo && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-1 size-3.5" />
                      {expireTo
                        ? formatDate(expireTo.toISOString())
                        : '结束日期'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expireTo}
                      onSelect={handleExpireToChange}
                    />
                  </PopoverContent>
                </Popover>
                {hasActiveFilter ? (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                    重置
                  </Button>
                ) : null}
              </div>
            </div>
            <div
              data-ai-section-type="button"
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                variant="outline"
                disabled={selectedIds.length === 0}
                onClick={() => setRemindOpen(true)}
              >
                <BellRing className="mr-1 size-4" />
                一键提醒
                {selectedIds.length > 0 ? `（${selectedIds.length}）` : ''}
              </Button>
              <Button variant="outline" onClick={() => setTemplateOpen(true)}>
                <FileStack className="mr-1 size-4" />
                套用模板
              </Button>
              <Button
                onClick={() => {
                  setCreateInitial(undefined);
                  setCreateOpen(true);
                }}
              >
                <Plus className="mr-1 size-4" />
                新建合同
              </Button>
            </div>
          </div>

          {listError ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <p className="text-sm text-muted-foreground">
                合同列表加载失败
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchList()}
              >
                重试
              </Button>
            </div>
          ) : (
            <ContractTable
              items={items}
              total={total}
              loading={loading}
              page={page}
              pageSize={PAGE_SIZE}
              approving={approving}
              onPageChange={handlePageChange}
              onDetail={setDetailId}
              onApprove={(id: string) => void handleApprove(id)}
              onReject={handleOpenReject}
              onDelete={setDeleteTarget}
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: (keys: Key[]) => {
                  setSelectedIds(keys);
                },
              }}
            />
          )}
        </ReportCard>
      </section>

      <ContractCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
        initial={createInitial}
      />
      <ContractRemindDialog
        open={remindOpen}
        onOpenChange={setRemindOpen}
        contracts={selectedContracts}
        onDone={() => {
          refresh();
          setSelectedIds([]);
        }}
      />
      <ContractTemplatePickerDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onApplied={handleTemplateApplied}
      />
      <ContractDetailDialog
        contractId={detailId}
        onClose={() => setDetailId(null)}
      />

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="rounded-none sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>驳回合同</DialogTitle>
            <DialogDescription>
              合同编号：{rejectTarget?.code ?? ''}，驳回后合同将终止
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="请填写驳回原因（必填）"
            value={rejectComment}
            onChange={(event) => setRejectComment(event.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              取消
            </Button>
            <Button
              disabled={approving || !rejectComment.trim()}
              onClick={() => void handleRejectSubmit()}
            >
              {approving ? '提交中...' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="rounded-none sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>删除合同</DialogTitle>
            <DialogDescription>
              确认删除合同「{deleteTarget?.code ?? ''}」？删除后不可恢复。
              若合同已有关联费用、付款记录或提成申请，将无法删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeleteSubmit()}
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contracts;
