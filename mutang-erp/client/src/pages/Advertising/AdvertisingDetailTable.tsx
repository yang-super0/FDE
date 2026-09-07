import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Table, type TableProps } from '@lark-apaas/client-toolkit/antd-table';
import type { PerformanceDetailItem } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { StatusBadge } from '@client/src/components/blueprint';
import { getPerformanceDetail } from '@client/src/api/advertising';

interface AdvertisingDetailTableProps {
  campaignId: string;
  campaignName: string;
}

const EXPORT_PAGE_SIZE: number = 100;

const AdvertisingDetailTable = ({
  campaignId,
  campaignName,
}: AdvertisingDetailTableProps) => {
  const [items, setItems] = useState<PerformanceDetailItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const fetchData = useCallback(
    async (nextPage: number, nextPageSize: number): Promise<void> => {
      setLoading(true);
      try {
        const result = await getPerformanceDetail(
          campaignId,
          nextPage,
          nextPageSize,
        );
        setItems(result.items ?? []);
        setTotal(result.total ?? 0);
      } catch (error) {
        logger.error('加载效果明细失败', error);
        toast.error('明细数据加载失败');
      } finally {
        setLoading(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    fetchData(page, pageSize);
  }, [fetchData, page, pageSize]);

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const all: PerformanceDetailItem[] = [];
      let currentPage: number = 1;
      let totalCount: number = 0;
      do {
        const result = await getPerformanceDetail(
          campaignId,
          currentPage,
          EXPORT_PAGE_SIZE,
        );
        all.push(...(result.items ?? []));
        totalCount = result.total ?? 0;
        currentPage += 1;
      } while (all.length < totalCount);

      const header: string = '日期,曝光,点击,点击率(%),转化,消耗(元)';
      const lines: string[] = all.map((item: PerformanceDetailItem) =>
        [
          item.statDate,
          String(item.impressions),
          String(item.clicks),
          String(item.ctr),
          String(item.conversions),
          String(item.cost),
        ].join(','),
      );
      const csv: string = '\uFEFF' + [header, ...lines].join('\n');
      const blob: Blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8;',
      });
      const url: string = URL.createObjectURL(blob);
      const anchor: HTMLAnchorElement = document.createElement('a');
      anchor.href = url;
      anchor.download = `${campaignName}-效果明细-${dayjs().format('YYYYMMDD')}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('明细导出成功');
    } catch (error) {
      logger.error('导出明细失败', error);
      toast.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const columns: TableProps<PerformanceDetailItem>['columns'] = [
    {
      title: '日期',
      dataIndex: 'statDate',
      fixed: 'left',
      width: 140,
      render: (date: string, record: PerformanceDetailItem) => (
        <span className="flex items-center gap-2 font-mono text-xs">
          {date}
          {record.overThreshold ? (
            <StatusBadge tone="danger">超阈值</StatusBadge>
          ) : null}
        </span>
      ),
    },
    {
      title: '曝光',
      dataIndex: 'impressions',
      width: 120,
      render: (value: number) => (
        <span className="font-mono">{value.toLocaleString()}</span>
      ),
    },
    {
      title: '点击',
      dataIndex: 'clicks',
      width: 120,
      render: (value: number) => (
        <span className="font-mono">{value.toLocaleString()}</span>
      ),
    },
    {
      title: '点击率',
      dataIndex: 'ctr',
      width: 110,
      render: (value: number) => <span className="font-mono">{value}%</span>,
    },
    {
      title: '转化',
      dataIndex: 'conversions',
      width: 110,
      render: (value: number) => (
        <span className="font-mono">{value.toLocaleString()}</span>
      ),
    },
    {
      title: '消耗（元）',
      dataIndex: 'cost',
      width: 140,
      render: (value: number) => (
        <span className="font-mono">{value.toLocaleString()}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold">效果明细</div>
        <Button
          data-ai-section-type="button"
          variant="outline"
          size="sm"
          disabled={exporting || total === 0}
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? '导出中...' : '导出明细'}
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        scroll={{ x: 900, y: 500 }}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (nextPage: number, nextPageSize: number) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
      />
    </div>
  );
};

export default AdvertisingDetailTable;
