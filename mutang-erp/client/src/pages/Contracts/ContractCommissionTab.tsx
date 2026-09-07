import { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type {
  ContractCommissionApplication,
  ContractCommissionApplicationStatus,
} from '@shared/api.interface';
import type { StatusTone } from '@client/src/components/blueprint';
import { StatusBadge } from '@client/src/components/blueprint';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Table,
  type TableProps,
} from '@lark-apaas/client-toolkit/antd-table';
import {
  approveCommissionApplication,
  listCommissionApplications,
  rejectCommissionApplication,
} from '@client/src/api/contract-enhance';
import { formatAmount, formatDateTime } from './contract-ui';

const COMMISSION_PAGE_SIZE: number = 10;

const COMMISSION_STATUS_TONE: Record<
  ContractCommissionApplicationStatus,
  StatusTone
> = {
  待审批: 'info',
  已通过: 'success',
  已驳回: 'danger',
};

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ContractCommissionTabProps {
  contractId: string;
  refreshKey: number;
}

const ContractCommissionTab = ({
  contractId,
  refreshKey,
}: ContractCommissionTabProps) => {
  const [items, setItems] = useState<ContractCommissionApplication[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] =
    useState<ContractCommissionApplication | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await listCommissionApplications({
        page,
        pageSize: COMMISSION_PAGE_SIZE,
        contractId,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (fetchError: unknown) {
      logger.error(`加载提成申请失败: ${toErrorText(fetchError)}`);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, contractId]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications, refreshKey]);

  const handleApprove = async (id: number) => {
    setActionBusy(true);
    try {
      await approveCommissionApplication(id);
      toast.success('已通过该提成申请');
      await fetchApplications();
    } catch (approveError: unknown) {
      logger.error(`通过提成申请失败: ${toErrorText(approveError)}`);
      toast.error(`通过提成申请失败：${toErrorText(approveError)}`);
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenReject = (record: ContractCommissionApplication) => {
    setRejectTarget(record);
    setRejectReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    const reason: string = rejectReason.trim();
    if (!reason) {
      toast.error('请填写驳回原因');
      return;
    }
    setActionBusy(true);
    try {
      await rejectCommissionApplication(rejectTarget.id, { reason });
      toast.success('已驳回该提成申请');
      setRejectTarget(null);
      setRejectReason('');
      await fetchApplications();
    } catch (rejectError: unknown) {
      logger.error(`驳回提成申请失败: ${toErrorText(rejectError)}`);
      toast.error(`驳回提成申请失败：${toErrorText(rejectError)}`);
    } finally {
      setActionBusy(false);
    }
  };

  const columns: TableProps<ContractCommissionApplication>['columns'] = [
    {
      title: '申请编号',
      dataIndex: 'applicationNo',
      key: 'applicationNo',
      width: 140,
      render: (applicationNo: string) => (
        <span className="font-mono text-primary font-bold">{applicationNo}</span>
      ),
    },
    {
      title: '提成比例',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      width: 90,
      align: 'right',
      render: (commissionRate: number) => `${commissionRate}%`,
    },
    {
      title: '提成金额（元）',
      dataIndex: 'commissionAmount',
      key: 'commissionAmount',
      width: 130,
      align: 'right',
      render: (commissionAmount: number) => (
        <span className="font-mono">{formatAmount(commissionAmount)}</span>
      ),
    },
    {
      title: '申请人',
      dataIndex: 'applicant',
      key: 'applicant',
      width: 110,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: ContractCommissionApplicationStatus) => (
        <StatusBadge tone={COMMISSION_STATUS_TONE[status]}>{status}</StatusBadge>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
    {
      title: '审批意见',
      key: 'opinion',
      width: 150,
      render: (_: unknown, record: ContractCommissionApplication) =>
        record.status === '已驳回'
          ? record.rejectReason || '-'
          : record.approver
            ? `${record.approver}${
                record.approvedAt ? ` ${formatDateTime(record.approvedAt)}` : ''
              }`
            : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_: unknown, record: ContractCommissionApplication) =>
        record.status === '待审批' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={actionBusy}
              onClick={() => void handleApprove(record.id)}
            >
              通过
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionBusy}
              onClick={() => handleOpenReject(record)}
            >
              驳回
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-muted-foreground">提成申请加载失败</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchApplications()}
          >
            重试
          </Button>
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 980 }}
          pagination={{
            current: page,
            pageSize: COMMISSION_PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: setPage,
          }}
        />
      )}

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="rounded-none sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>驳回提成申请</DialogTitle>
            <DialogDescription>
              申请编号：{rejectTarget?.applicationNo ?? ''}，驳回后不可恢复
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="请填写驳回原因（必填）"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              取消
            </Button>
            <Button
              disabled={actionBusy || !rejectReason.trim()}
              onClick={() => void handleRejectSubmit()}
            >
              {actionBusy ? '提交中...' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { ContractCommissionTab };
