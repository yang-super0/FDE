import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Table, type TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import type { IndustryRoiBenchmark } from '@shared/api.interface';
import { getIndustryRoiVersionHistory } from '@client/src/api/support-enhance';
import { formatSeNumber, toSeErrorText } from '../support-enhance-constants';

interface RoiVersionHistoryDialogProps {
  open: boolean;
  record: IndustryRoiBenchmark | null;
  onOpenChange: (open: boolean) => void;
}

const RoiVersionHistoryDialog = ({
  open,
  record,
  onOpenChange,
}: RoiVersionHistoryDialogProps) => {
  const [versions, setVersions] = useState<IndustryRoiBenchmark[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadVersions = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    try {
      const data: IndustryRoiBenchmark[] = await getIndustryRoiVersionHistory(id);
      setVersions(data);
    } catch (error) {
      logger.error('获取版本历史失败', error);
      toast.error(toSeErrorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && record) {
      void loadVersions(record.id);
    } else {
      setVersions([]);
    }
  }, [open, record, loadVersions]);

  const columns: TableColumnsType<IndustryRoiBenchmark> = [
    {
      title: '版本',
      dataIndex: 'version',
      width: 70,
      render: (v: number) => <span className="font-mono">v{v}</span>,
    },
    { title: '编号', dataIndex: 'roiNo', width: 140 },
    {
      title: 'ROI基准',
      dataIndex: 'roiBenchmark',
      width: 100,
      render: (v: number) => (
        <span className="font-mono">{formatSeNumber(v)}</span>
      ),
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      width: 110,
      render: (v: string) => (
        <span className="font-mono text-xs">{v}</span>
      ),
    },
    {
      title: '修正原因',
      dataIndex: 'correctReason',
      render: (v?: string | null) => v || '—',
    },
    {
      title: '当前版本',
      dataIndex: 'isCurrent',
      width: 90,
      render: (v: boolean) =>
        v ? (
          <span className="text-xs font-bold text-[#0033A0]">当前</span>
        ) : (
          <span className="text-xs text-muted-foreground">历史</span>
        ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none max-w-3xl">
        <DialogHeader>
          <DialogTitle>版本历史</DialogTitle>
          <DialogDescription>
            {record ? `${record.industry} · ${record.platform} 的全部版本` : ''}
          </DialogDescription>
        </DialogHeader>
        <Table
          columns={columns}
          dataSource={versions}
          loading={loading}
          rowKey="id"
          scroll={{ x: 800, y: 400 }}
          pagination={false}
          locale={{ emptyText: '暂无版本记录' }}
        />
      </DialogContent>
    </Dialog>
  );
};

export { RoiVersionHistoryDialog };
