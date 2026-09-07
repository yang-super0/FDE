import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import type { ScheduledRunLog } from '@shared/api.interface';
import { fetchScheduleRunLogs } from '@client/src/api/report-center';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { formatDateTime, toRcErrorText } from '../report-center-constants';

interface RunHistoryDialogProps {
  open: boolean;
  scheduleNo: string;
  scheduleName: string;
  onClose: () => void;
}

const RunStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-bold ${
      status === '成功' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'
    }`}
  >
    {status}
  </span>
);

const RunHistoryDialog: React.FC<RunHistoryDialogProps> = ({
  open,
  scheduleNo,
  scheduleName,
  onClose,
}) => {
  const [logs, setLogs] = useState<ScheduledRunLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchScheduleRunLogs()
      .then((res: ScheduledRunLog[]) => {
        if (!cancelled) {
          setLogs(res.filter((log: ScheduledRunLog) => log.scheduleNo === scheduleNo));
        }
      })
      .catch((error: unknown) => {
        logger.error('获取运行记录失败', error);
        toast.error(error instanceof Error ? error.message : toRcErrorText(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, scheduleNo]);

  const columns: TableColumnsType<ScheduledRunLog> = [
    { title: '编号', dataIndex: 'scheduleNo', width: 130 },
    { title: '任务名', dataIndex: 'scheduleName', width: 170 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => <RunStatusBadge status={v} />,
    },
    {
      title: '详情',
      dataIndex: 'detail',
      ellipsis: true,
      render: (v: string) => (
        <span className="text-xs text-muted-foreground" title={v}>
          {v || '—'}
        </span>
      ),
    },
    {
      title: '运行时间',
      dataIndex: 'runAt',
      width: 150,
      render: (v: string) => (
        <span className="font-mono text-xs">{formatDateTime(v)}</span>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle>运行记录</DialogTitle>
          <DialogDescription>「{scheduleName}」的定时执行记录</DialogDescription>
        </DialogHeader>
        <Table
          columns={columns}
          dataSource={logs}
          loading={loading}
          rowKey="id"
          scroll={{ x: 700, y: 400 }}
          locale={{ emptyText: '暂无运行记录' }}
          pagination={false}
        />
      </DialogContent>
    </Dialog>
  );
};

export { RunHistoryDialog };
