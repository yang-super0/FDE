import { useEffect, useMemo, useState, type ChangeEvent, type Key, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@client/src/components/ui/dialog';
import type { VideoCommission, VideoOrder } from '@shared/api.interface';
import { calculateVideoCommissions, fetchCompletedVideoOrders } from '@client/src/api/video-core/commissions';
import { formatVideoAmount, toVideoErrorText, VideoFormField, VideoStatusBadge } from './video-constants';

const reportError = (context: string, error: unknown): void => {
  logger.error(`${context}: ${toVideoErrorText(error)}`);
  toast.error(toVideoErrorText(error));
};

/* ============ 计算提成：已完成订单多选 + 提成比例 ============ */

interface CommissionCalculateDialogProps {
  open: boolean;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
}

export function CommissionCalculateDialog({
  open, onDone, onOpenChange,
}: CommissionCalculateDialogProps) {
  const [orders, setOrders] = useState<VideoOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [rate, setRate] = useState<string>('10');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setSelectedKeys([]);
    setRate('10');
    let cancelled: boolean = false;
    setLoading(true);
    fetchCompletedVideoOrders()
      .then((list: VideoOrder[]) => { if (!cancelled) setOrders(list); })
      .catch((error: unknown) => { if (!cancelled) reportError('加载已完成订单失败', error); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const columns = useMemo((): TableColumnsType<VideoOrder> => [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 150,
      render: (value: string) => <span className="font-bold text-primary">{value}</span>,
    },
    { title: '集团名称', dataIndex: 'groupName', width: 150 },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      width: 130,
      align: 'right',
      render: (value: number) => <span className="font-mono">{formatVideoAmount(value)}</span>,
    },
  ], []);

  const handleSubmit = async (): Promise<void> => {
    const ids: number[] = selectedKeys.map((key: Key) => Number(key));
    if (ids.length === 0) { toast.error('请选择至少一个已完成订单'); return; }
    const rateValue: number = Number(rate);
    if (!Number.isFinite(rateValue) || rateValue <= 0 || rateValue > 100) {
      toast.error('提成比例必须为 0-100 之间的数字');
      return;
    }
    setSubmitting(true);
    try {
      const result = await calculateVideoCommissions({
        orderIds: ids, commissionRate: rateValue,
      });
      toast.success(`已生成 ${result.created} 条提成，跳过 ${result.skipped} 条`);
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      reportError('计算提成失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>计算提成</DialogTitle>
          <DialogDescription>选择已完成订单，按指定比例生成提成单</DialogDescription>
        </DialogHeader>
        <div className="max-h-[360px] overflow-y-auto border border-border">
          <Table<VideoOrder>
            columns={columns}
            dataSource={orders}
            loading={loading}
            rowKey="id"
            scroll={{ x: 500, y: 300 }}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: (keys: Key[]) => setSelectedKeys(keys),
            }}
            locale={{ emptyText: '暂无可计算的已完成订单' }}
          />
        </div>
        <div className="mt-4">
          <VideoFormField label="提成比例（%）">
            <Input className="rounded-none" type="number" min="0" max="100"
              value={rate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setRate(event.target.value)} />
          </VideoFormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting || selectedKeys.length === 0} onClick={() => void handleSubmit()}>
            {submitting ? '计算中...' : `计算提成（已选 ${selectedKeys.length} 单）`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ 提成详情 ============ */

interface CommissionDetailDialogProps {
  open: boolean;
  commission: VideoCommission | null;
  onOpenChange: (open: boolean) => void;
}

export function CommissionDetailDialog({
  open, commission, onOpenChange,
}: CommissionDetailDialogProps) {
  const detailRows: Array<[string, ReactNode]> = commission ? [
    ['提成单号', commission.commissionNo],
    ['关联订单号', commission.orderNo],
    ['关联项目号', commission.projectNo],
    ['商务', commission.salesperson],
    ['项目负责人', commission.projectManager],
    ['订单金额', formatVideoAmount(commission.orderAmount)],
    ['成本', formatVideoAmount(commission.costAmount)],
    ['利润', formatVideoAmount(commission.profitAmount)],
    ['提成比例', `${commission.commissionRate}%`],
    ['提成金额', formatVideoAmount(commission.commissionAmount)],
    ['状态', <VideoStatusBadge key="status" status={commission.status} />],
    ['归属周期', commission.period],
    ['计算人', commission.calculatedBy],
    ['计算时间', commission.calculatedAt ? dayjs(commission.calculatedAt).format('YYYY-MM-DD HH:mm') : ''],
    ['发放时间', commission.paidAt ? dayjs(commission.paidAt).format('YYYY-MM-DD HH:mm') : ''],
    ['备注', commission.remark],
    ['创建时间', dayjs(commission.createdAt).format('YYYY-MM-DD HH:mm')],
  ] : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>提成详情</DialogTitle>
          <DialogDescription>{commission?.commissionNo ?? ''}</DialogDescription>
        </DialogHeader>
        <div>
          {detailRows.map(([label, value]: [string, ReactNode]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm">
              <span className="shrink-0 text-muted-foreground">{label}</span>
              <span className="break-words text-right font-medium">{value || '—'}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
